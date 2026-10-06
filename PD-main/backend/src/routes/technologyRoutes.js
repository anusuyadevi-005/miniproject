import express from 'express';
import { getRepositoryTechnology } from '../controllers/technologyController.js';

const router = express.Router();

router.get('/:repositoryId/technology', getRepositoryTechnology);

export default router;
