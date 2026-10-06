import mongoose from 'mongoose';

const semanticEntitySchema = new mongoose.Schema({
  sdid: { type: String, required: true, unique: true, index: true },
  repositoryId: { type: String, required: true, index: true },
  entityType: { type: String, required: true, index: true }, // FOLDER, FILE, CLASS, FUNC, etc.
  currentName: { type: String, required: true, index: true },
  currentPath: { type: String, index: true },
  parentId: { type: String, index: true },
  status: { type: String, enum: ['ACTIVE', 'MODIFIED', 'RENAMED', 'MOVED', 'DELETED', 'REVIEW_REQUIRED'], default: 'ACTIVE', index: true },
  confidence: { type: Number, min: 0, max: 100, default: 100 },
  fingerprint: { type: String, index: true },
  firstSeenCommit: { type: String, index: true },
  lastSeenCommit: { type: String, index: true }
}, { timestamps: true });

// Create compound index for repo scoped searches
semanticEntitySchema.index({ repositoryId: 1, sdid: 1 }, { unique: true });

const semanticEntityHistorySchema = new mongoose.Schema({
  sdid: { type: String, required: true, index: true },
  repositoryId: { type: String, required: true, index: true },
  entityType: { type: String },
  previousName: { type: String },
  currentName: { type: String },
  previousPath: { type: String },
  currentPath: { type: String },
  status: { type: String, enum: ['ACTIVE', 'MODIFIED', 'RENAMED', 'MOVED', 'DELETED', 'REVIEW_REQUIRED'] },
  confidence: { type: Number },
  commitHash: { type: String, index: true },
  fingerprint: { type: String }
}, { timestamps: true });

const semanticRelationshipSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  sourceSdid: { type: String, required: true, index: true },
  targetSdid: { type: String, required: true, index: true },
  relationshipType: { 
    type: String, 
    enum: ['DOCUMENTED_BY', 'DESCRIBES', 'BELONGS_TO', 'CALLS', 'CALLED_BY', 'DEPENDS_ON', 'USED_BY_API', 'USED_BY_WORKFLOW', 'USED_BY_ARCHITECTURE', 'USES_DATABASE', 'IMPLEMENTS', 'EXTENDS', 'CONTAINS'],
    required: true,
    index: true
  }
}, { timestamps: true });

// Compound index to prevent duplicate relationships
semanticRelationshipSchema.index({ repositoryId: 1, sourceSdid: 1, targetSdid: 1, relationshipType: 1 }, { unique: true });

const documentationMappingSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  sdid: { type: String, required: true, index: true },
  documentationId: { type: String, required: true, index: true }, // e.g., DOC-00012
  sectionType: { type: String } // e.g., 'API Flow', 'Authentication Flow'
}, { timestamps: true });

// Note: To keep things backward compatible with the local DB when Mongo is offline, 
// we will export the mongoose models but also handle local fallback in the engine.

export const SemanticEntity = mongoose.model('SemanticEntity', semanticEntitySchema);
export const SemanticEntityHistory = mongoose.model('SemanticEntityHistory', semanticEntityHistorySchema);
export const SemanticRelationship = mongoose.model('SemanticRelationship', semanticRelationshipSchema);
export const DocumentationMapping = mongoose.model('DocumentationMapping', documentationMappingSchema);
