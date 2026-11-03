// Sanitization / anonymization helpers.
// IMPORTANT: regex masking is a best-effort safeguard, NOT complete secret protection.
// It reduces the chance of leaking credentials to the AI provider; it cannot guarantee it.

const SECRET_PATTERNS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, '[REDACTED_PRIVATE_KEY]'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*/g, '[REDACTED_PRIVATE_KEY]'],
  [/\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/g, '[REDACTED_AWS_KEY]'],
  [/\bgithub_pat_[A-Za-z0-9_]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]'],
  [/\bgh[pousr]_[A-Za-z0-9]{20,}\b/g, '[REDACTED_GITHUB_TOKEN]'],
  [/\bAIza[0-9A-Za-z_-]{30,}\b/g, '[REDACTED_GOOGLE_KEY]'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g, '[REDACTED_SLACK_TOKEN]'],
  [/\bsk-[A-Za-z0-9_-]{20,}\b/g, '[REDACTED_API_KEY]'],
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g, '[REDACTED_JWT]'],
  [/\b(mongodb(?:\+srv)?|postgres(?:ql)?|mysql|redis|amqps?):\/\/[^\s'"`]+/gi, '$1://[REDACTED_CONNECTION_STRING]'],
  [/\b([a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, '$1[REDACTED_CREDENTIALS]@'],
  [/\bBearer\s+[A-Za-z0-9._~+/-]{16,}=*/gi, 'Bearer [REDACTED_TOKEN]'],
  [
    /(\b[\w.-]*(?:password|passwd|pwd|secret|token|api[_-]?key|apikey|access[_-]?key|private[_-]?key|client[_-]?secret|credential)[\w.-]*["']?\s*[:=]\s*["']?)([^\s"',;]{6,})/gi,
    '$1[REDACTED]',
  ],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL]'],
];

export const maskSecrets = (text) => {
  if (typeof text !== 'string' || !text) return '';
  return SECRET_PATTERNS.reduce((acc, [re, replacement]) => acc.replace(re, replacement), text);
};

// Files whose contents/paths may hold secrets. They are removed from the tree entirely.
// .env.example / .env.sample / .env.template are kept (they are useful and hold no real values).
const SENSITIVE_PATHS = [
  /(^|\/)\.env(?:\.(?!(?:example|sample|template|dist)$)[^/]+)?$/i,
  /\.(pem|key|p12|pfx|jks|keystore)$/i,
  /(^|\/)id_(rsa|dsa|ecdsa|ed25519)(\.pub)?$/i,
  /(^|\/)\.(npmrc|pypirc|netrc|htpasswd|git-credentials)$/i,
  /(^|\/)(credentials?|secrets?)(\.[a-z0-9]+)?$/i,
  /service[-_]?account.*\.json$/i,
  /(^|\/)\.(aws|ssh)\//i,
  /\.tfstate(\.backup)?$/i,
  /\.tfvars$/i,
];

// Noise that wastes the AI's context budget.
const NOISE_PATHS = [
  /(^|\/)(node_modules|\.git|dist|build|\.next|coverage|vendor|__pycache__|\.venv|venv|\.idea|\.vscode)\//i,
  /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb|composer\.lock|Gemfile\.lock|poetry\.lock)$/i,
  /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|mp[34]|mov|zip|gz|tar|pdf)$/i,
];

export const isSensitivePath = (p) => SENSITIVE_PATHS.some((re) => re.test(p));
export const isNoisePath = (p) => NOISE_PATHS.some((re) => re.test(p));

export const sanitizeTree = (paths) => {
  let omittedSensitive = 0;
  let omittedNoise = 0;
  const clean = [];
  for (const p of paths) {
    if (isSensitivePath(p)) { omittedSensitive += 1; continue; }
    if (isNoisePath(p)) { omittedNoise += 1; continue; }
    clean.push(maskSecrets(p).slice(0, 200));
  }
  return { paths: clean, omittedSensitive, omittedNoise };
};

// Shallow paths first (they describe architecture best), then alphabetical.
export const prioritizePaths = (paths) =>
  [...paths].sort((a, b) => {
    const depth = a.split('/').length - b.split('/').length;
    return depth !== 0 ? depth : a.localeCompare(b);
  });

// Replaces real author identities with stable labels (Contributor 1, 2, ...).
export const sanitizeCommits = (rawCommits) => {
  const labels = new Map();
  const commits = rawCommits.map((c) => {
    const key = c.author?.login || c.commit?.author?.name || 'unknown';
    if (!labels.has(key)) labels.set(key, `Contributor ${labels.size + 1}`);
    return {
      sha: String(c.sha || '').slice(0, 7),
      message: maskSecrets(String(c.commit?.message || '')).slice(0, 300),
      author: labels.get(key),
      date: c.commit?.author?.date ? new Date(c.commit.author.date) : null,
    };
  });
  return { commits, contributorCount: labels.size };
};

export const sanitizeDocumentation = (text, limit = 30000) => {
  const masked = maskSecrets(text || '');
  return { content: masked.slice(0, limit), truncated: masked.length > limit };
};
