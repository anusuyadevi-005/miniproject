import express from 'express';
import {
  publishDocumentationController,
  getVersionsController,
  exportDocumentController
} from '../controllers/publisherController.js';

const router = express.Router();

// POST /api/repository/:repositoryId/documentation/publish
router.post('/:repositoryId/documentation/publish', publishDocumentationController);

// GET /api/repository/:repositoryId/documentation/versions
router.get('/:repositoryId/documentation/versions', getVersionsController);

// GET /api/repository/:repositoryId/documentation/export/:format
router.get('/:repositoryId/documentation/export/:format', exportDocumentController);

// Explicit routes requested by API specifications
router.get('/:repositoryId/documentation/export/pdf', (req, res) => {
  req.params.format = 'pdf';
  return exportDocumentController(req, res);
});

router.get('/:repositoryId/documentation/export/html', (req, res) => {
  req.params.format = 'html';
  return exportDocumentController(req, res);
});

router.get('/:repositoryId/documentation/export/markdown', (req, res) => {
  req.params.format = 'markdown';
  return exportDocumentController(req, res);
});

router.get('/:repositoryId/documentation/export/docx', (req, res) => {
  req.params.format = 'docx';
  return exportDocumentController(req, res);
});

export default router;
