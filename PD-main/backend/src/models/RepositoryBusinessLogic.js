import mongoose from 'mongoose';

const RepositoryBusinessLogicSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true, index: true },
  analysis: { type: Object, required: true },
}, { timestamps: true });

export const RepositoryBusinessLogic = mongoose.models.RepositoryBusinessLogic || mongoose.model('RepositoryBusinessLogic', RepositoryBusinessLogicSchema);
