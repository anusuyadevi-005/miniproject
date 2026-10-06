import express from 'express';
import {
  generateSDIDs,
  getAllSDIDs,
  getSDIDDetails,
  getSDIDRelationships,
  getSDIDHistory
} from '../controllers/sdidController.js';

const router = express.Router({ mergeParams: true });

// Routes are mounted at /api/repository/:repositoryId/sdid
router.post('/generate', generateSDIDs);
router.get('/', getAllSDIDs);
router.get('/:sdid', getSDIDDetails);
router.get('/:sdid/relationships', getSDIDRelationships);
router.get('/:sdid/history', getSDIDHistory);

export default router;
