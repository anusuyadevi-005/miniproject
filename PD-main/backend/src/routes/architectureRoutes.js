import express from 'express';
import { getArchitectureController } from '../controllers/architectureController.js';

const router = express.Router();

router.get('/:repositoryId/architecture', getArchitectureController);

export default router;
