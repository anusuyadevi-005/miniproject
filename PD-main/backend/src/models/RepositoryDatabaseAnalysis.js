import mongoose from 'mongoose';

const RepositoryDatabaseSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true, index: true },
  databaseType: { type: String, default: 'Unknown' },
  orm: { type: [String], default: [] },
  entities: { type: [Object], default: [] },
  relationships: { type: [Object], default: [] },
  indexes: { type: [Object], default: [] },
  constraints: { type: [Object], default: [] },
  views: { type: [Object], default: [] },
  triggers: { type: [Object], default: [] },
  migrations: { type: [Object], default: [] },
  diagrams: { type: Object, default: {} },
  analyzedAt: { type: Date, default: Date.now }
}, { collection: 'repository_database', timestamps: true });

export const RepositoryDatabaseAnalysis = mongoose.models.RepositoryDatabaseAnalysis || mongoose.model('RepositoryDatabaseAnalysis', RepositoryDatabaseSchema);
