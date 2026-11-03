import { Router } from 'express';
import { getReport, approveReport, updateReport } from '../controllers/reportController.js';

const router = Router();
router.get('/:id', getReport);
router.patch('/:id/approve', approveReport);
router.patch('/:id', updateReport);

export default router;
