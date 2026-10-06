import express from 'express';
import { analyzeDna, getDna, getDnaHistory } from '../controllers/dnaController.js';

const router = express.Router({ mergeParams: true });

// Mounted at /api/repository/:repositoryId/dna
router.post('/analyze', analyzeDna);
router.get('/:docId', getDna);
router.get('/:docId/history', getDnaHistory);

export default router;
