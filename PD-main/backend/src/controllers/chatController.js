import { RepositoryChatService } from '../services/repositoryChatService.js';

// POST /api/repository/:repositoryId/chat
export async function handleChatMessageController(req, res) {
  try {
    const { repositoryId } = req.params;
    const { message, conversationId } = req.body;

    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId parameter is required' });
    }
    if (!message) {
      return res.status(400).json({ success: false, error: 'message body field is required' });
    }

    const result = await RepositoryChatService.processChatMessage(repositoryId, message, conversationId);
    return res.status(201).json(result);
  } catch (error) {
    console.error('Chat processing error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// GET /api/repository/:repositoryId/chat/:conversationId
export async function getChatHistoryController(req, res) {
  try {
    const { repositoryId, conversationId } = req.params;

    if (!repositoryId || !conversationId) {
      return res.status(400).json({ success: false, error: 'repositoryId and conversationId parameters are required' });
    }

    const history = await RepositoryChatService.getConversationHistory(repositoryId, conversationId);
    return res.json({ success: true, data: history });
  } catch (error) {
    console.error('Chat history fetch error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

// DELETE /api/repository/:repositoryId/chat/:conversationId
export async function deleteChatSessionController(req, res) {
  try {
    const { repositoryId, conversationId } = req.params;

    if (!repositoryId || !conversationId) {
      return res.status(400).json({ success: false, error: 'repositoryId and conversationId parameters are required' });
    }

    const result = await RepositoryChatService.deleteConversation(repositoryId, conversationId);
    return res.json(result);
  } catch (error) {
    console.error('Delete chat session error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
