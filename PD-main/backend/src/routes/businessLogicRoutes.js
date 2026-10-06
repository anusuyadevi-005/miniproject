import express from 'express';
import { getBusinessLogicController } from '../controllers/businessLogicController.js';

const router = express.Router();

router.get('/:repositoryId/business-logic', getBusinessLogicController);

export default router;
