import { Router } from 'express';
import { upload } from '../middleware/upload.js';
import { uploadCandidate, getCandidateById } from '../controllers/candidates.controller.js';

const router = Router();

// POST /api/candidates/upload - Multipart PDF upload
router.post('/upload', upload.single('resume'), uploadCandidate);

// GET /api/candidates/:id - Get candidate details
router.get('/:id', getCandidateById);

export default router;
