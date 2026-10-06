import express from 'express';
import { getRepositoryApisController } from '../controllers/apiController.js';

const router = express.Router();

router.get('/repository/:repositoryId/apis', getRepositoryApisController);

export default router;
