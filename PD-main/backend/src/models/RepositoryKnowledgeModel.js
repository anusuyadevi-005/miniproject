import mongoose from 'mongoose';

const RepositoryKnowledgeSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true, index: true },
  knowledgeModel: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const RepositoryKnowledgeModel = mongoose.models.RepositoryKnowledgeModel || mongoose.model('RepositoryKnowledgeModel', RepositoryKnowledgeSchema);
