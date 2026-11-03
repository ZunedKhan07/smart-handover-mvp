import { Octokit } from '@octokit/rest';
import { AppError } from '../utils/errorHandler.js';

const MAX_COMMITS = 100;
let octokit;
const getOctokit = () =>
  (octokit ??= new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    userAgent: 'smart-handover-mvp',
  }));

export const parseRepoUrl = (input) => {
  if (typeof input !== 'string' || !input.trim()) {
    throw new AppError('A GitHub repository URL is required.', 400);
  }
  let value = input.trim();
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new AppError('That does not look like a valid URL.', 400);
  }
  if (!['github.com', 'www.github.com'].includes(url.hostname.toLowerCase())) {
    throw new AppError('Only github.com repository URLs are supported.', 400);
  }
  const [owner, rawName] = url.pathname.split('/').filter(Boolean);
  const name = rawName?.replace(/\.git$/i, '');
  const valid = (s) => s && /^[A-Za-z0-9_.-]{1,100}$/.test(s) && s !== '.' && s !== '..';
  if (!valid(owner) || !valid(name)) {
    throw new AppError('Use the format https://github.com/owner/repository.', 400);
  }
  return { owner, name, repoUrl: `https://github.com/${owner}/${name}` };
};

const mapGithubError = (err) => {
  if (err instanceof AppError) return err;
  const status = err.status;
  const headers = err.response?.headers || {};
  if (status === 403 || status === 429) {
    if (headers['x-ratelimit-remaining'] === '0' || status === 429 || /rate limit/i.test(err.message || '')) {
      const reset = headers['x-ratelimit-reset']
        ? ` The limit resets at ${new Date(Number(headers['x-ratelimit-reset']) * 1000).toISOString()}.`
        : '';
      return new AppError(`GitHub API rate limit exceeded.${reset} Set GITHUB_TOKEN to raise the limit.`, 429);
    }
    return new AppError('GitHub denied access. Only public repositories are supported.', 403);
  }
  if (status === 404) return new AppError('Repository not found. Check the URL - private repositories are not supported.', 404);
  if (status === 401) return new AppError('GitHub rejected the configured GITHUB_TOKEN. Check the server configuration.', 502);
  if (status === 409) return new AppError('This repository is empty - there is nothing to analyze.', 422);
  return new AppError('Could not fetch data from GitHub. Please try again.', 502);
};

const fetchReadme = async (gh, owner, repo) => {
  try {
    const { data } = await gh.repos.getReadme({ owner, repo, mediaType: { format: 'raw' } });
    return typeof data === 'string' ? data.slice(0, 8000) : '';
  } catch {
    return '';
  }
};

export const fetchRepositoryData = async (repoUrl) => {
  const { owner, name, repoUrl: normalizedUrl } = parseRepoUrl(repoUrl);
  const gh = getOctokit();
  try {
    const { data: repo } = await gh.repos.get({ owner, repo: name });
    if (repo.private) throw new AppError('Private repositories are not supported in this MVP.', 403);

    const branch = repo.default_branch;
    const [commits, tree, languages, readme] = await Promise.all([
      gh.repos.listCommits({ owner, repo: name, sha: branch, per_page: MAX_COMMITS }),
      gh.git.getTree({ owner, repo: name, tree_sha: branch, recursive: 'true' }),
      gh.repos.listLanguages({ owner, repo: name }).catch(() => ({ data: {} })),
      fetchReadme(gh, owner, name),
    ]);

    const langTotal = Object.values(languages.data).reduce((a, b) => a + b, 0) || 1;
    return {
      owner: repo.owner.login,
      name: repo.name,
      repoUrl: normalizedUrl,
      defaultBranch: branch,
      metadata: {
        description: repo.description || '',
        homepage: repo.homepage || '',
        language: repo.language || '',
        topics: repo.topics || [],
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        openIssues: repo.open_issues_count,
        license: repo.license?.spdx_id || '',
        archived: repo.archived,
        repoCreatedAt: repo.created_at,
        pushedAt: repo.pushed_at,
        languages: Object.entries(languages.data)
          .map(([n, bytes]) => ({ name: n, percent: Math.round((bytes / langTotal) * 100) }))
          .sort((a, b) => b.percent - a.percent)
          .slice(0, 6),
      },
      rawCommits: commits.data,
      rawTree: tree.data.tree || [],
      treeTruncated: Boolean(tree.data.truncated),
      readme,
    };
  } catch (err) {
    throw mapGithubError(err);
  }
};

// Deterministic facts computed from file names and commit data (no AI involved).
// These prove a file or folder EXISTS - not that the feature works.
export const buildSignals = ({ allPaths, cleanPaths, commits, contributorCount, omittedSensitive, treeTruncated }) => ({
  totalFiles: allPaths.length,
  analyzedFiles: cleanPaths.length,
  treeTruncated,
  sensitiveFilesOmitted: omittedSensitive,
  hasReadme: cleanPaths.some((p) => /^readme(\.\w+)?$/i.test(p)),
  hasTests: cleanPaths.some((p) =>
    /(^|\/)(tests?|__tests__|spec)\//i.test(p) || /\.(test|spec)\.[cm]?[jt]sx?$/i.test(p) || /_test\.(py|go)$/i.test(p)),
  hasCI: cleanPaths.some((p) => /^\.github\/workflows\//.test(p) || /^(\.gitlab-ci\.yml|Jenkinsfile)$/.test(p) || /^\.circleci\//.test(p)),
  hasDocker: cleanPaths.some((p) => /(^|\/)(Dockerfile|docker-compose\.ya?ml)$/i.test(p)),
  hasEnvExample: cleanPaths.some((p) => /(^|\/)\.env\.(example|sample|template)$/i.test(p)),
  hasLicense: cleanPaths.some((p) => /^(license|licence)(\.\w+)?$/i.test(p)),
  commitsAnalyzed: commits.length,
  contributorCount,
  lastCommitDate: commits[0]?.date || null,
});

const yn = (v) => (v ? 'found' : 'not found');

export const buildVerifiedFacts = (signals, defaultBranch, pushedAt) => {
  const facts = [
    `Default branch is "${defaultBranch}"${pushedAt ? `; last push was ${new Date(pushedAt).toISOString().slice(0, 10)}` : ''}.`,
    `The repository tree lists ${signals.totalFiles} files; ${signals.analyzedFiles} were analyzed after excluding dependencies, build output, assets and sensitive files${signals.treeTruncated ? ' (GitHub truncated the tree, so this is partial)' : ''}.`,
    `${signals.commitsAnalyzed} recent commits from ${signals.contributorCount} contributor(s) were analyzed.`,
    `README: ${yn(signals.hasReadme)}. LICENSE: ${yn(signals.hasLicense)}. .env example file: ${yn(signals.hasEnvExample)}.`,
    `Test files or folders (by file name): ${yn(signals.hasTests)}. This does not show whether tests pass.`,
    `CI configuration: ${yn(signals.hasCI)}. Docker files: ${yn(signals.hasDocker)}.`,
  ];
  if (signals.sensitiveFilesOmitted > 0) {
    facts.push(`${signals.sensitiveFilesOmitted} file(s) with sensitive-looking names (such as .env or key files) were excluded from analysis.`);
  }
  return facts;
};
