import express from 'express';
import { scanRepositoryController } from '../controllers/repositoryController.js';

const router = express.Router();

router.post('/scan', scanRepositoryController);

export default router;
