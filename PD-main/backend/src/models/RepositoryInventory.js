import mongoose from 'mongoose';

const FileInventorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  extension: { type: String, default: '' },
  language: { type: String, default: 'Unknown' },
  relativePath: { type: String, required: true },
  size: { type: Number, required: true },
  lineCount: { type: Number, default: 0 },
  hash: { type: String, required: true },
  folder: { type: String, required: true },
  mimeType: { type: String, required: true },
  absolutePath: { type: String, required: true },
  createdDate: { type: String, required: true },
  modifiedDate: { type: String, required: true },
  characterCount: { type: Number, default: 0 },
  isBinary: { type: Boolean, default: false }
}, { _id: false });

const FolderInventorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  path: { type: String, required: true },
  absolutePath: { type: String, required: true },
  relativePath: { type: String, required: true },
  parentFolder: { type: String },
  depth: { type: Number, required: true },
  children: { type: [String], default: [] }
}, { _id: false });

const RepositoryMetadataSchema = new mongoose.Schema({
  name: { type: String, required: true },
  owner: { type: String, required: true },
  url: { type: String, required: true },
  branch: { type: String, default: 'HEAD' },
  languages: { type: [String], default: [] },
  totalFiles: { type: Number, default: 0 },
  totalFolders: { type: Number, default: 0 },
  repositorySizeBytes: { type: Number, default: 0 },
  totalSourceFiles: { type: Number, default: 0 },
  readmeExists: { type: Boolean, default: false },
  licenseExists: { type: Boolean, default: false },
  dockerExists: { type: Boolean, default: false },
  githubActionsExists: { type: Boolean, default: false },
  packageManagers: { type: [String], default: [] }
}, { _id: false });

const RepositoryInventorySchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true, index: true },
  repositoryUrl: { type: String, required: true, index: true },
  scannedAt: { type: Date, default: Date.now },
  repositoryHash: { type: String, required: true },
  metadata: { type: RepositoryMetadataSchema, required: true },
  folders: { type: [FolderInventorySchema], default: [] },
  files: { type: [FileInventorySchema], default: [] }
});

export const RepositoryInventory = mongoose.models.RepositoryInventory || mongoose.model('RepositoryInventory', RepositoryInventorySchema);
