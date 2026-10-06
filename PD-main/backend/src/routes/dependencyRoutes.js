import express from 'express';
import { analyzeRepositoryDependenciesController } from '../controllers/dependencyController.js';

const router = express.Router();

router.post('/:repositoryId/dependencies', analyzeRepositoryDependenciesController);

export default router;
