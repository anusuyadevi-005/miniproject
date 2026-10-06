import mongoose from 'mongoose';

const TechnologySchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true, index: true },
  projectType: { type: String, default: 'Unknown' },
  architectureStyle: { type: String, default: 'Unknown' },
  languages: { type: [String], default: [] },
  frontend: { type: Object, default: {} },
  backend: { type: Object, default: {} },
  database: { type: Object, default: {} },
  authentication: { type: Object, default: {} },
  deployment: { type: Object, default: {} },
  testing: { type: Object, default: {} },
  buildTools: { type: Object, default: {} },
  packageManagers: { type: [String], default: [] },
  dependencies: { type: [Object], default: [] },
  configuration: { type: Object, default: {} },
  confidenceScore: { type: Number, default: 0 },
  scanTime: { type: Date, default: Date.now }
});

export const RepositoryTechnology = mongoose.models.RepositoryTechnology || mongoose.model('RepositoryTechnology', TechnologySchema);
