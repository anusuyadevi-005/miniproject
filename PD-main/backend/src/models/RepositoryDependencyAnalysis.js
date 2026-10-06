import mongoose from 'mongoose';

const DependencyAnalysisSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true, index: true },
  dependencyGraph: { type: Object, default: {} },
  moduleGraph: { type: Object, default: {} },
  packageGraph: { type: Object, default: {} },
  moduleDependencies: { type: Object, default: {} },
  packageDependencies: { type: [Object], default: [] },
  circularDependencies: { type: [Object], default: [] },
  unusedImports: { type: [Object], default: [] },
  unusedPackages: { type: [Object], default: [] },
  unusedFiles: { type: [Object], default: [] },
  serviceRelationships: { type: Object, default: {} },
  analyzedAt: { type: Date, default: Date.now }
});

export const RepositoryDependencyAnalysis = mongoose.models.RepositoryDependencyAnalysis || mongoose.model('RepositoryDependencyAnalysis', DependencyAnalysisSchema);
