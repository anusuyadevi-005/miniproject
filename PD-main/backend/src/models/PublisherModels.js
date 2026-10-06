import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  commitHash: { type: String, default: 'HEAD' },
  version: { type: String, required: true },
  title: { type: String },
  generatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }
}, { collection: 'documents', timestamps: true });

const DocumentExportSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  commitHash: { type: String, default: 'HEAD' },
  version: { type: String, required: true },
  format: { type: String, enum: ['pdf', 'html', 'markdown', 'docx'], required: true },
  filePath: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'completed' }
}, { collection: 'document_exports', timestamps: true });

const DocumentationVersionSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  commitHash: { type: String, default: 'HEAD' },
  version: { type: String, required: true },
  generatedAt: { type: Date, default: Date.now },
  status: { type: String, default: 'completed' },
  metadata: { type: Object, default: {} }
}, { collection: 'documentation_versions', timestamps: true });

export const Document = mongoose.models.Document || mongoose.model('Document', DocumentSchema);
export const DocumentExport = mongoose.models.DocumentExport || mongoose.model('DocumentExport', DocumentExportSchema);
export const DocumentationVersion = mongoose.models.DocumentationVersion || mongoose.model('DocumentationVersion', DocumentationVersionSchema);
