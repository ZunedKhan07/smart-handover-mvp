import path from 'path';
import { Router } from 'express';
import multer from 'multer';
import { analyzeRepository, getProject } from '../controllers/repoController.js';
import { AppError } from '../utils/errorHandler.js';

const ALLOWED_EXTENSIONS = ['.txt', '.md', '.markdown', '.pdf'];

const upload = multer({
  storage: multer.memoryStorage(), // nothing is written to disk
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new AppError('Unsupported file type. Upload a .txt, .md or .pdf file.', 400));
    }
    return cb(null, true);
  },
});

const router = Router();
router.post('/analyze', upload.single('documentationFile'), analyzeRepository);
router.get('/:id', getProject);

export default router;
