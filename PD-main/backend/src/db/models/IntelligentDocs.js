import mongoose from 'mongoose';

// 1. Repository Knowledge Schema
const KnowledgeItemSchema = new mongoose.Schema({
  reportId: { type: String, required: true, index: true },
  repoUrl: { type: String, required: true },
  projectName: { type: String, required: true },
  folders: [mongoose.Schema.Types.Mixed],
  files: [mongoose.Schema.Types.Mixed],
  classes: [mongoose.Schema.Types.Mixed],
  interfaces: [mongoose.Schema.Types.Mixed],
  enums: [mongoose.Schema.Types.Mixed],
  functions: [mongoose.Schema.Types.Mixed],
  variables: [mongoose.Schema.Types.Mixed],
  routes: [mongoose.Schema.Types.Mixed],
  models: [mongoose.Schema.Types.Mixed],
  schemas: [mongoose.Schema.Types.Mixed],
  dependencies: [mongoose.Schema.Types.Mixed],
  configurations: [mongoose.Schema.Types.Mixed],
  readme: { type: String, default: '' },
  envVars: [mongoose.Schema.Types.Mixed],
  dockerFiles: [mongoose.Schema.Types.Mixed],
  cicdWorkflows: [mongoose.Schema.Types.Mixed],
  createdAt: { type: Date, default: Date.now }
});

// 2. Folder Documentation Schema
const FolderDocSchema = new mongoose.Schema({
  reportId: { type: String, required: true, index: true },
  folderPath: { type: String, required: true },
  purpose: { type: String, required: true },
  responsibilities: [String],
  containsFiles: [String],
  dependencies: [String],
  usedBy: [String],
  architectureLayer: { type: String, required: true }
});

// 3. File Documentation Schema
const FileDocSchema = new mongoose.Schema({
  reportId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  filePath: { type: String, required: true },
  purpose: { type: String, required: true },
  responsibilities: [String],
  imports: [mongoose.Schema.Types.Mixed],
  exports: [mongoose.Schema.Types.Mixed],
  dependencies: [String],
  classes: [String],
  functions: [String],
  configuration: mongoose.Schema.Types.Mixed,
  securityNotes: [String],
  improvementSuggestions: [String]
});

// 4. Class Documentation Schema
const ClassDocSchema = new mongoose.Schema({
  reportId: { type: String, required: true, index: true },
  className: { type: String, required: true },
  filePath: { type: String, required: true },
  purpose: { type: String, required: true },
  constructor: mongoose.Schema.Types.Mixed,
  properties: [mongoose.Schema.Types.Mixed],
  methods: [mongoose.Schema.Types.Mixed],
  inheritance: { type: String, default: 'None' },
  composition: [String],
  relationships: [String],
  lifecycle: { type: String, default: 'Standard Node.js Event Loop / Singleton' },
  exampleUsage: { type: String, default: '' }
});

// 5. Function Documentation Schema
const FunctionDocSchema = new mongoose.Schema({
  reportId: { type: String, required: true, index: true },
  functionName: { type: String, required: true },
  filePath: { type: String, required: true },
  signature: { type: String, required: true },
  purpose: { type: String, required: true },
  parameters: [mongoose.Schema.Types.Mixed],
  returnType: { type: String, required: true },
  businessLogic: { type: String, required: true },
  algorithm: { type: String, required: true },
  pseudoCode: { type: String, default: '' },
  timeComplexity: { type: String, default: 'O(1) / O(N)' },
  calledBy: [String],
  calls: [String]
});

// 6. API Documentation Schema
const ApiDocSchema = new mongoose.Schema({
  reportId: { type: String, required: true, index: true },
  method: { type: String, required: true },
  route: { type: String, required: true },
  controller: { type: String, required: true },
  authentication: { type: String, required: true },
  headers: [mongoose.Schema.Types.Mixed],
  requestBody: mongoose.Schema.Types.Mixed,
  responseBody: mongoose.Schema.Types.Mixed,
  validation: [String],
  statusCodes: [mongoose.Schema.Types.Mixed],
  exampleRequest: { type: String, default: '' },
  exampleResponse: { type: String, default: '' }
});

// 7. Architecture Documentation Schema
const ArchitectureDocSchema = new mongoose.Schema({
  reportId: { type: String, required: true, index: true },
  highLevelDiagram: { type: String, required: true },
  componentDiagram: { type: String, required: true },
  packageDiagram: { type: String, required: true },
  sequenceDiagram: { type: String, required: true },
  classDiagram: { type: String, required: true },
  deploymentDiagram: { type: String, required: true },
  dependencyGraph: { type: String, required: true }
});

// 8. Deployment Documentation Schema
const DeploymentDocSchema = new mongoose.Schema({
  reportId: { type: String, required: true, index: true },
  installation: [String],
  requirements: [String],
  environmentVariables: [mongoose.Schema.Types.Mixed],
  dockerGuide: mongoose.Schema.Types.Mixed,
  runningCommands: [mongoose.Schema.Types.Mixed],
  testingCommands: [String],
  productionDeployment: [String]
});

export const RepositoryKnowledge = mongoose.models.RepositoryKnowledge || mongoose.model('RepositoryKnowledge', KnowledgeItemSchema);
export const FolderDoc = mongoose.models.FolderDoc || mongoose.model('FolderDoc', FolderDocSchema);
export const FileDoc = mongoose.models.FileDoc || mongoose.model('FileDoc', FileDocSchema);
export const ClassDoc = mongoose.models.ClassDoc || mongoose.model('ClassDoc', ClassDocSchema);
export const FunctionDoc = mongoose.models.FunctionDoc || mongoose.model('FunctionDoc', FunctionDocSchema);
export const ApiDoc = mongoose.models.ApiDoc || mongoose.model('ApiDoc', ApiDocSchema);
export const ArchitectureDoc = mongoose.models.ArchitectureDoc || mongoose.model('ArchitectureDoc', ArchitectureDocSchema);
export const DeploymentDoc = mongoose.models.DeploymentDoc || mongoose.model('DeploymentDoc', DeploymentDocSchema);
