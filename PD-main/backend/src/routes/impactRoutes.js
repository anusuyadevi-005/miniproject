import express from 'express';
import { analyzeImpact, getImpactAnalysis } from '../controllers/impactController.js';

const router = express.Router({ mergeParams: true });

// Mounted at /api/repository/:repositoryId/impact
router.post('/analyze', analyzeImpact);
router.get('/:analysisId', getImpactAnalysis);

export default router;
