import express from 'express';
import { analyzeAST } from '../controllers/astController.js';

const router = express.Router();

router.post('/:repositoryId/ast', analyzeAST);

export default router;
