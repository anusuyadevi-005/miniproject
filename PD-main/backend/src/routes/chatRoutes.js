import express from 'express';
import {
  handleChatMessageController,
  getChatHistoryController,
  deleteChatSessionController
} from '../controllers/chatController.js';

const router = express.Router();

// POST /api/repository/:repositoryId/chat
router.post('/:repositoryId/chat', handleChatMessageController);

// GET /api/repository/:repositoryId/chat/:conversationId
router.get('/:repositoryId/chat/:conversationId', getChatHistoryController);

// DELETE /api/repository/:repositoryId/chat/:conversationId
router.delete('/:repositoryId/chat/:conversationId', deleteChatSessionController);

export default router;
