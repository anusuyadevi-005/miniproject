import mongoose from 'mongoose';

// ─── Chapter Version History Schema ─────────────────────────────────────────

const ChapterVersionSchema = new mongoose.Schema({
  version: { type: Number, required: true },
  markdown: { type: String, default: '' },
  html: { type: String, default: '' },
  generatedBy: { type: String, enum: ['llm', 'deterministic', 'manual'], default: 'deterministic' },
  language: { type: String, default: 'en' },
  generatedAt: { type: Date, default: Date.now }
}, { _id: false });

// ─── Documentation Chapter Schema ──────────────────────────────────────────

const DocumentationChapterSchema = new mongoose.Schema({
  chapterId: { type: String, required: true },
  title: { type: String, required: true },
  summary: { type: String, default: '' },
  markdown: { type: String, default: '' },
  html: { type: String, default: '' },
  version: { type: Number, default: 1 },
  language: { type: String, default: 'en' },
  generatedBy: { type: String, enum: ['llm', 'deterministic', 'manual'], default: 'deterministic' },
  coverage: { type: Number, default: 100 },
  versionHistory: { type: [ChapterVersionSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: false });

// ─── Repository Documentation Schema ───────────────────────────────────────

const RepositoryDocumentationSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, unique: true, index: true },
  reportId: { type: String, required: true, index: true },
  repoUrl: { type: String, required: true },
  projectName: { type: String, required: true },
  repositoryName: { type: String },
  chapters: [DocumentationChapterSchema],
  language: { type: String, default: 'en' },
  llmProvider: { type: String, default: 'deterministic' },
  generatedAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { collection: 'repository_documentation', timestamps: true });

export const RepositoryDocumentation = mongoose.models.RepositoryDocumentation || mongoose.model('RepositoryDocumentation', RepositoryDocumentationSchema);
