import express from 'express';
import { analyzeRepository } from '../controllers/repo.controller.js';

const router = express.Router();

// POST: /api/repo/analyze
router.post('/analyze', analyzeRepository);

export default router;