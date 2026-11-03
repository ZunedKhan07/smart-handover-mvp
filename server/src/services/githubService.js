import { Octokit } from '@octokit/rest';
import { ErrorHandler } from '../utils/errorHandler.js';

const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN || undefined,
    userAgent: 'AI-Project-Handover-System',
    timeZone: 'UTC'
});

const MAX_COMMITS = 100;
const MAX_FILES = 1000;

const extractRepoDetails = (repoUrl) => {
    if (typeof repoUrl !== 'string' || !repoUrl.trim()) {
        throw new ErrorHandler('GitHub repository URL is required.', 400);
    }

    let url;

    try {
        url = new URL(repoUrl.trim());
    } catch {
        throw new ErrorHandler('Invalid GitHub repository URL.', 400);
    }

    if (
        url.protocol !== 'https:' ||
        !['github.com', 'www.github.com'].includes(url.hostname)
    ) {
        throw new ErrorHandler('Only valid HTTPS GitHub URLs are supported.', 400);
    }

    const parts = url.pathname
        .replace(/\/+$/, '')
        .replace(/\.git$/i, '')
        .split('/')
        .filter(Boolean);

    if (parts.length !== 2) {
        throw new ErrorHandler(
            'Invalid repository URL. Expected: github.com/owner/repo',
            400
        );
    }

    const [owner, repoName] = parts;

    if (
        !/^[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(owner) ||
        !/^[a-zA-Z0-9._-]+$/.test(repoName)
    ) {
        throw new ErrorHandler('Invalid GitHub owner or repository name.', 400);
    }

    return { owner, repoName };
};

export const fetchRepoDataFromGitHub = async (repoUrl) => {
    try {
        const { owner, repoName } = extractRepoDetails(repoUrl);

        // 1. Fetch repository metadata.
        const repoResponse = await octokit.repos.get({
            owner,
            repo: repoName
        });

        const repository = repoResponse.data;

        if (repository.empty) {
            throw new ErrorHandler('The GitHub repository is empty.', 400);
        }

        const defaultBranch = repository.default_branch;

        if (!defaultBranch) {
            throw new ErrorHandler('Repository default branch not found.', 404);
        }

        // 2. Fetch recent commit history.
        const commitsResponse = await octokit.repos.listCommits({
            owner,
            repo: repoName,
            sha: defaultBranch,
            per_page: 30
        });

        const commits = commitsResponse.data;

        // 3. Fetch the latest commit SHA.
        const latestCommitSha = commits[0]?.sha;

        if (!latestCommitSha) {
            throw new ErrorHandler('No commits found in repository.', 404);
        }

        // 4. Fetch the complete repository tree.
        const treeResponse = await octokit.git.getTree({
            owner,
            repo: repoName,
            tree_sha: latestCommitSha,
            recursive: 'true'
        });

        const fileTree = treeResponse.data.tree
            .filter((item) => item.type === 'blob' || item.type === 'tree')
            .slice(0, MAX_FILES);

        return {
            owner,
            repoName,

            repository: {
                name: repository.name,
                description: repository.description,
                defaultBranch,
                visibility: repository.visibility,
                language: repository.language,
                stars: repository.stargazers_count,
                forks: repository.forks_count,
                updatedAt: repository.updated_at,
                htmlUrl: repository.html_url
            },

            commits: commits.slice(0, MAX_COMMITS),

            fileTree,

            metadata: {
                totalCommitsFetched: commits.length,
                totalFilesFetched: fileTree.length,
                isTreeTruncated: treeResponse.data.truncated,
                latestCommitSha
            }
        };

    } catch (error) {
        console.error('GitHub API Error:', error.message);

        if (error instanceof ErrorHandler) {
            throw error;
        }

        if (error.status === 404) {
            throw new ErrorHandler(
                'Repository not found or you do not have access to it.',
                404
            );
        }

        if (error.status === 403 || error.status === 429) {
            throw new ErrorHandler(
                'GitHub API rate limit exceeded. Please try again later.',
                429
            );
        }

        throw new ErrorHandler(
            'Unable to fetch repository data from GitHub.',
            500
        );
    }
};