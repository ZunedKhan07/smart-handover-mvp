import express from 'express';
import { getReportById, updateReportApproval } from '../controllers/report.controller.js';

const router = express.Router();

// GET: /api/reports/:id
router.get('/:id', getReportById);

// PATCH: /api/reports/:id/approval
router.patch('/:id/approval', updateReportApproval);

export default router;