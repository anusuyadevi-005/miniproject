import express from 'express';
import { getRepositoryKnowledgeController } from '../controllers/knowledgeController.js';

const router = express.Router();

router.get('/:repositoryId/knowledge', getRepositoryKnowledgeController);

export default router;
