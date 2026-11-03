const SENSITIVE_PATTERNS =
    /password|passwd|secret|api[_-]?key|token|auth|credential|private[_-]?key|access[_-]?key|client[_-]?secret|refresh[_-]?token/i;

const SENSITIVE_FILE_PATTERNS =
    /(^|\/)(\.env(?:\..*)?|credentials|secrets?|private|certificates?)(\/|$)/i;

const REDACTED_MESSAGE = '[REDACTED - Sensitive Information]';
const REDACTED_PATH = '[REDACTED_PATH]';

const sanitizeCommitMessage = (message = '') => {
    if (typeof message !== 'string') {
        return REDACTED_MESSAGE;
    }

    // Redact the complete message if sensitive keywords are detected.
    if (SENSITIVE_PATTERNS.test(message)) {
        return REDACTED_MESSAGE;
    }

    // Remove common secret/token formats even when the keyword
    // does not appear in the surrounding message.
    const sanitized = message
        .replace(
            /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
            REDACTED_MESSAGE
        )
        .replace(
            /\b(gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/g,
            REDACTED_MESSAGE
        );

    return sanitized;
};

const sanitizeFilePath = (filePath = '') => {
    if (typeof filePath !== 'string') {
        return REDACTED_PATH;
    }

    if (
        SENSITIVE_PATTERNS.test(filePath) ||
        SENSITIVE_FILE_PATTERNS.test(filePath)
    ) {
        return REDACTED_PATH;
    }

    return filePath;
};

export const anonymizeData = (commitLogs = [], fileTree = []) => {
    if (!Array.isArray(commitLogs) || !Array.isArray(fileTree)) {
        throw new TypeError('Commit logs and file tree must be arrays.');
    }

    const cleanedCommits = commitLogs.map((commit) => ({
        author: sanitizeCommitMessage(commit?.commit?.author?.name),
        date: commit?.commit?.author?.date || null,
        message: sanitizeCommitMessage(commit?.commit?.message)
    }));

    const cleanedFiles = fileTree
        .map((file) => sanitizeFilePath(file?.path))
        .filter(Boolean);

    return {
        cleanedCommits,
        cleanedFiles
    };
};