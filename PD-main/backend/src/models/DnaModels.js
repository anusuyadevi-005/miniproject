import mongoose from 'mongoose';

// ─── Documentation DNA Schema ──────────────────────────────────────────────
const documentationDnaSchema = new mongoose.Schema({
  docId: { type: String, required: true, index: true },
  repositoryId: { type: String, required: true, index: true },
  documentationVersion: { type: Number, default: 1, index: true },
  semanticFingerprint: { type: String, index: true },
  contentHash: { type: String, index: true },
  relatedSDIDs: [{ type: String }],
  relatedAPIs: [{ type: String }],
  relatedWorkflows: [{ type: String }],
  relatedDatabaseEntities: [{ type: String }],
  relatedArchitectureComponents: [{ type: String }],
  relatedDependencies: [{ type: String }],
  semanticConcepts: [{ type: String }],
  keyFacts: [{ type: String }],
  entitySignatures: [{ type: String }],
  commitHash: { type: String, index: true }
}, { timestamps: true, collection: 'documentation_dna' });

documentationDnaSchema.index({ repositoryId: 1, docId: 1 });

// ─── Documentation DNA History Schema ──────────────────────────────────────
const documentationDnaHistorySchema = new mongoose.Schema({
  docId: { type: String, required: true, index: true },
  repositoryId: { type: String, required: true, index: true },
  previousVersion: { type: Number },
  previousSemanticFingerprint: { type: String },
  previousContentHash: { type: String },
  currentSemanticFingerprint: { type: String },
  currentContentHash: { type: String },
  changeScore: { type: Number },
  decisionId: { type: String, index: true },
  changedFacts: [{ type: String }],
  unchangedFacts: [{ type: String }],
  decision: { type: String },
  commitHash: { type: String, index: true }
}, { timestamps: true, collection: 'documentation_dna_history' });

documentationDnaHistorySchema.index({ repositoryId: 1, docId: 1 });

// ─── Regeneration Decision Schema ──────────────────────────────────────────
const regenerationDecisionSchema = new mongoose.Schema({
  decisionId: { type: String, required: true, unique: true, index: true },
  docId: { type: String, required: true, index: true },
  repositoryId: { type: String, required: true, index: true },
  analysisId: { type: String, index: true },
  decision: { 
    type: String, 
    enum: ['REGENERATE', 'DO_NOT_REGENERATE', 'REVIEW_REQUIRED'], 
    required: true,
    index: true
  },
  changeType: { 
    type: String, 
    enum: [
      'NO_CHANGE', 'TEXT_ONLY_CHANGE', 'SEMANTIC_CHANGE', 
      'DEPENDENCY_CHANGE', 'API_CHANGE', 'DATABASE_CHANGE', 
      'ARCHITECTURE_CHANGE', 'WORKFLOW_CHANGE', 'REVIEW_REQUIRED'
    ]
  },
  score: { type: Number, min: 0, max: 100 },
  confidence: { type: Number, min: 0, max: 1 },
  reasons: [{ type: String }],
  changedFacts: [{ type: String }],
  unchangedFacts: [{ type: String }]
}, { timestamps: true, collection: 'regeneration_decisions' });

regenerationDecisionSchema.index({ repositoryId: 1, docId: 1 });

export const DocumentationDNA = mongoose.model('DocumentationDNA', documentationDnaSchema);
export const DocumentationDNAHistory = mongoose.model('DocumentationDNAHistory', documentationDnaHistorySchema);
export const RegenerationDecision = mongoose.model('RegenerationDecision', regenerationDecisionSchema);
