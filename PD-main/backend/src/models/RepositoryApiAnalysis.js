import mongoose from 'mongoose';

const RepositoryApiSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true, index: true },
  apis: { type: [Object], default: [] },
  openApi: { type: Object, default: {} },
  swagger: { type: Object, default: {} },
  analyzedAt: { type: Date, default: Date.now }
}, { timestamps: true });

export const RepositoryApiAnalysis = mongoose.models.RepositoryApiAnalysis || mongoose.model('RepositoryApiAnalysis', RepositoryApiSchema);
