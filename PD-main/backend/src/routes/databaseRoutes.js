import express from 'express';
import { getRepositoryDatabaseController } from '../controllers/databaseController.js';

const router = express.Router();

router.get('/:repositoryId/database', getRepositoryDatabaseController);

export default router;
