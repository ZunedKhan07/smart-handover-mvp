import mongoose from 'mongoose';
import Report from '../models/Report.model.js';
import { AppError, asyncHandler } from '../utils/errorHandler.js';

const PROJECT_FIELDS =
  'repoUrl owner name defaultBranch metadata signals contributorCount totalFiles createdAt expiresAt documentation.source documentation.filename documentation.truncated';
const ROLE_KEYS = ['frontend', 'backend', 'database', 'devops', 'general'];

const assertValidId = (id) => {
  if (!mongoose.isValidObjectId(id)) throw new AppError('Invalid report id.', 400);
};

const loadReport = async (id) => {
  const report = await Report.findById(id).populate('project', PROJECT_FIELDS).lean();
  if (!report) throw new AppError('Report not found.', 404);
  return report;
};

export const getReport = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  res.json({ success: true, report: await loadReport(req.params.id) });
});

export const approveReport = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  // Atomic: only a pending report can transition, so double-clicks cannot overwrite approvedAt.
  const updated = await Report.findOneAndUpdate(
    { _id: req.params.id, approvalStatus: 'pending' },
    { approvalStatus: 'approved', approvedAt: new Date() },
    { new: true }
  );
  if (!updated) {
    const exists = await Report.exists({ _id: req.params.id });
    throw exists ? new AppError('This report is already approved.', 409) : new AppError('Report not found.', 404);
  }
  res.json({ success: true, report: await loadReport(req.params.id) });
});

const cleanString = (value, field, max, { required = false } = {}) => {
  if (typeof value !== 'string') throw new AppError(`"${field}" must be a string.`, 400);
  const v = value.trim();
  if (required && !v) throw new AppError(`"${field}" cannot be empty.`, 400);
  if (v.length > max) throw new AppError(`"${field}" is too long (max ${max} characters).`, 400);
  return v;
};

const cleanList = (value, field) => {
  if (!Array.isArray(value) || value.length > 100) throw new AppError(`"${field}" must be a list of at most 100 items.`, 400);
  return value.map((item) => {
    if (typeof item !== 'string') throw new AppError(`"${field}" must only contain text.`, 400);
    if (item.length > 500) throw new AppError(`An item in "${field}" is too long (max 500 characters).`, 400);
    return item.trim();
  }).filter(Boolean);
};

export const updateReport = asyncHandler(async (req, res) => {
  assertValidId(req.params.id);
  const body = req.body || {};
  const set = {};
  const allowed = ['projectSummary', 'testingStatus', 'documentationStatus', 'deploymentStatus', 'completedTasks', 'pendingTasks', 'recommendations', 'roleBasedTasks'];
  const unknown = Object.keys(body).filter((k) => !allowed.includes(k));
  if (unknown.length) throw new AppError(`These fields cannot be edited: ${unknown.join(', ')}.`, 400);

  if ('projectSummary' in body) set.projectSummary = cleanString(body.projectSummary, 'projectSummary', 3000, { required: true });
  for (const f of ['testingStatus', 'documentationStatus', 'deploymentStatus']) {
    if (f in body) set[f] = cleanString(body[f], f, 1000);
  }
  for (const f of ['completedTasks', 'pendingTasks', 'recommendations']) {
    if (f in body) set[f] = cleanList(body[f], f);
  }
  if ('roleBasedTasks' in body) {
    const roles = body.roleBasedTasks;
    if (!roles || typeof roles !== 'object' || Array.isArray(roles)) throw new AppError('"roleBasedTasks" must be an object.', 400);
    for (const key of Object.keys(roles)) {
      if (!ROLE_KEYS.includes(key)) throw new AppError(`Unknown role "${key}".`, 400);
      set[`roleBasedTasks.${key}`] = cleanList(roles[key], `roleBasedTasks.${key}`);
    }
  }
  if (Object.keys(set).length === 0) throw new AppError('No editable fields were provided.', 400);

  // Approved reports are locked so an approval always refers to the content that was reviewed.
  const updated = await Report.findOneAndUpdate(
    { _id: req.params.id, approvalStatus: 'pending' },
    { $set: { ...set, isEdited: true, editedAt: new Date() } },
    { new: true, runValidators: true }
  );
  if (!updated) {
    const exists = await Report.exists({ _id: req.params.id });
    throw exists ? new AppError('Approved reports cannot be edited.', 409) : new AppError('Report not found.', 404);
  }
  res.json({ success: true, report: await loadReport(req.params.id) });
});
