import express from 'express';
import {
  generateRepositoryDocumentationController,
  getDocumentationController,
  getLatestDocumentationController,
  regenerateDocumentationChapterController,
  getChapterVersionHistoryController,
  exportDocumentationController,
  exportChapterController,
  getLLMProviderStatusController,
  switchLLMProviderController
} from '../controllers/documentationController.js';

const router = express.Router();

// ── Full Documentation Generation & Retrieval ────────────────────────────────

// POST /api/repository/:repositoryId/documentation/generate
router.post('/:repositoryId/documentation/generate', generateRepositoryDocumentationController);

// GET /api/repository/documentation/latest
router.get('/documentation/latest', getLatestDocumentationController);

// GET /api/repository/:repositoryId/documentation/latest
router.get('/:repositoryId/documentation/latest', getLatestDocumentationController);

// GET /api/repository/documentation/providers
router.get('/documentation/providers', getLLMProviderStatusController);
router.post('/documentation/providers/switch', switchLLMProviderController);

// GET /api/repository/:repositoryId/documentation  (supports ?format=markdown|html|json)
router.get('/:repositoryId/documentation', getDocumentationController);

// ── Chapter Operations ───────────────────────────────────────────────────────

// POST /api/repository/:repositoryId/documentation/chapter/:chapterId/regenerate
router.post('/:repositoryId/documentation/chapter/:chapterId/regenerate', regenerateDocumentationChapterController);

// GET /api/repository/:repositoryId/documentation/chapter/:chapterId/versions
router.get('/:repositoryId/documentation/chapter/:chapterId/versions', getChapterVersionHistoryController);

// GET /api/repository/:repositoryId/documentation/chapter/:chapterId/export/:format
router.get('/:repositoryId/documentation/chapter/:chapterId/export/:format', exportChapterController);

// ── Full Documentation Export ────────────────────────────────────────────────

// GET /api/repository/:repositoryId/documentation/export/:format
router.get('/:repositoryId/documentation/export/:format', exportDocumentationController);

// ── Provider Status ──────────────────────────────────────────────────────────

// GET /api/repository/documentation/providers
router.get('/documentation/providers', getLLMProviderStatusController);

export default router;
