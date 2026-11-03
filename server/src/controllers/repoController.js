import crypto from 'crypto';
import mongoose from 'mongoose';
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import Project from '../models/Project.model.js';
import Report from '../models/Report.model.js';
import { AppError, asyncHandler } from '../utils/errorHandler.js';
import { parseRepoUrl, fetchRepositoryData, buildSignals, buildVerifiedFacts } from '../services/githubService.js';
import { generateHandoverReport } from '../services/geminiService.js';
import { GEMINI_MODEL_NAME } from '../config/gemini.js';
import { maskSecrets, sanitizeCommits, sanitizeTree, prioritizePaths, sanitizeDocumentation } from '../services/anonymize.js';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_TREE_PATHS = 2000;
const MAX_DOC_TEXT = 60000; // raw chars accepted before sanitizing/truncating

// Combines pasted text and/or an uploaded TXT/MD/PDF into one sanitized string.
const resolveDocumentation = async (req) => {
  const parts = [];
  let source = 'none';
  const pasted = typeof req.body.documentation === 'string' ? req.body.documentation.trim() : '';
  if (pasted) {
    parts.push(pasted.slice(0, MAX_DOC_TEXT));
    source = 'text';
  }
  let filename = '';
  if (req.file) {
    filename = req.file.originalname.slice(0, 200);
    const isPdf = filename.toLowerCase().endsWith('.pdf');
    let text;
    if (isPdf) {
      if (req.file.buffer.subarray(0, 5).toString() !== '%PDF-') {
        throw new AppError('The uploaded file is not a valid PDF.', 400);
      }
      try {
        text = (await pdfParse(req.file.buffer)).text;
      } catch {
        throw new AppError('Could not read this PDF. It may be corrupted or password-protected.', 422);
      }
      if (!text || !text.trim()) {
        throw new AppError('No text found in this PDF. Scanned PDFs are not supported - paste the text instead.', 422);
      }
    } else {
      text = req.file.buffer.toString('utf8');
      if (text.includes('\u0000')) throw new AppError('The uploaded file does not look like a text file.', 400);
    }
    parts.push(text.slice(0, MAX_DOC_TEXT));
    source = source === 'text' ? 'both' : 'file';
  }
  const { content, truncated } = sanitizeDocumentation(parts.join('\n\n'));
  return { source, filename, content, truncated };
};

const sendReport = (res, status, project, report, cached) =>
  res.status(status).json({ success: true, cached, projectId: project._id, reportId: report._id, report });

export const analyzeRepository = asyncHandler(async (req, res) => {
  const { owner, name, repoUrl } = parseRepoUrl(req.body.repoUrl); // throws 400 if invalid
  const repoKey = `${owner}/${name}`.toLowerCase();
  const force = ['true', '1', true].includes(req.body.force);
  const doc = await resolveDocumentation(req);
  const docHash = crypto.createHash('sha256').update(doc.content).digest('hex');

  // 24h cache: same repo + same documentation, not expired, unless the user forces a refresh.
  if (!force) {
    const cachedProject = await Project.findOne({ repoKey, docHash, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
    if (cachedProject) {
      const cachedReport = await Report.findOne({ project: cachedProject._id }).sort({ createdAt: -1 });
      if (cachedReport) return sendReport(res, 200, cachedProject, cachedReport, true);
    }
  }

  // Fetch and sanitize BEFORE anything goes to Gemini.
  const raw = await fetchRepositoryData(repoUrl);
  const allPaths = raw.rawTree.filter((n) => n.type === 'blob').map((n) => n.path);
  if (allPaths.length === 0) throw new AppError('This repository has no files to analyze.', 422);

  const { commits, contributorCount } = sanitizeCommits(raw.rawCommits);
  const { paths, omittedSensitive } = sanitizeTree(allPaths);
  const fileTree = prioritizePaths(paths).slice(0, MAX_TREE_PATHS);
  const signals = buildSignals({ allPaths, cleanPaths: paths, commits, contributorCount, omittedSensitive, treeTruncated: raw.treeTruncated });
  const readme = maskSecrets(raw.readme);

  const analysis = await generateHandoverReport({
    owner: raw.owner,
    name: raw.name,
    defaultBranch: raw.defaultBranch,
    metadata: raw.metadata,
    commits,
    fileTree,
    readme,
    documentation: doc.content,
    signals,
  });

  const project = await Project.create({
    repoKey,
    repoUrl: raw.repoUrl,
    owner: raw.owner,
    name: raw.name,
    defaultBranch: raw.defaultBranch,
    metadata: raw.metadata,
    commits,
    contributorCount,
    fileTree,
    totalFiles: allPaths.length,
    treeTruncated: raw.treeTruncated,
    signals,
    documentation: { source: doc.source, filename: doc.filename, content: doc.content, truncated: doc.truncated },
    docHash,
    expiresAt: new Date(Date.now() + CACHE_TTL_MS),
  });

  let report;
  try {
    report = await Report.create({
      ...analysis,
      project: project._id,
      verifiedFacts: buildVerifiedFacts(signals, raw.defaultBranch, raw.metadata.pushedAt),
      approvalStatus: 'pending',
      generatedBy: GEMINI_MODEL_NAME,
    });
  } catch (err) {
    await Project.deleteOne({ _id: project._id }).catch(() => {}); // avoid orphaned projects
    throw err;
  }
  return sendReport(res, 201, project, report, false);
});

export const getProject = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError('Invalid project id.', 400);
  const project = await Project.findById(req.params.id).select('-documentation.content').lean();
  if (!project) throw new AppError('Project not found.', 404);
  res.json({ success: true, project });
});
