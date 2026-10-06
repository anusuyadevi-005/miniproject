import mongoose from 'mongoose';

const FieldSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  required: { type: Boolean, default: false },
  description: { type: String, default: '' }
}, { _id: false });

const TableOrCollectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  fields: [FieldSchema],
  indexes: [String],
  relationships: [String]
}, { _id: false });

const DatabaseStructureSchema = new mongoose.Schema({
  engine: { type: String, default: 'MongoDB / PostgreSQL' },
  tablesOrCollections: [TableOrCollectionSchema]
}, { _id: false });

const DirectoryItemSchema = new mongoose.Schema({
  path: { type: String, required: true },
  type: { type: String, default: 'File' },
  symbol: { type: String, default: '' },
  description: { type: String, default: '' }
}, { _id: false });

const ApiEndpointSchema = new mongoose.Schema({
  method: { type: String, required: true },
  path: { type: String, required: true },
  description: { type: String, default: '' },
  authRequired: { type: Boolean, default: false },
  requestBody: { type: String, default: '' },
  responseBody: { type: String, default: '' }
}, { _id: false });

const ReportSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  repoUrl: { type: String, required: true, index: true },
  branch: { type: String, default: 'main' },
  techStack: {
    frontend: [String],
    backend: [String],
    database: [String],
    orm: [String],
    auth: [String],
    devOps: [String]
  },
  directoryStructure: [DirectoryItemSchema],
  databaseStructure: DatabaseStructureSchema,
  apiEndpoints: [ApiEndpointSchema],
  architectureDiagram: { type: String, default: '' },
  securityConfig: {
    authStrategy: { type: String, default: 'JWT + Bearer Token' },
    corsPolicy: { type: String, default: 'Strict Origin Whitelist' },
    encryption: { type: String, default: 'bcrypt (salt round 10)' },
    middleware: [String]
  },
  fullReportMarkdown: { type: String, default: '' },
  sdidsCreated: [String],
  docCoverage: { type: Number, default: 98 },
  syncScore: { type: Number, default: 96 },
  createdAt: { type: Date, default: Date.now }
}, { strict: false });

export const Report = mongoose.models.Report || mongoose.model('Report', ReportSchema);
