import mongoose from 'mongoose';

const ChatMessageSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, index: true },
  userMessage: { type: String, required: true },
  assistantMessage: { type: String, required: true },
  sources: { type: [Object], default: [] },
  entities: { type: [Object], default: [] },
  confidence: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  createdAt: { type: Date, default: Date.now }
}, { collection: 'repository_chat_messages' });

const ChatSessionSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  conversationId: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: 'New Conversation' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'repository_chat_sessions' });

export const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
export const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', ChatSessionSchema);
