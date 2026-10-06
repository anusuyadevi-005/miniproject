import mongoose from 'mongoose';

const impactAnalysisSchema = new mongoose.Schema({
  analysisId: { type: String, required: true, unique: true, index: true },
  repositoryId: { type: String, required: true, index: true },
  rootSDID: { type: String, required: true, index: true },
  changeType: { type: String, required: true },
  commitHash: { type: String, index: true },
  impactScore: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now, index: true }
}, { timestamps: true });

const impactEntitySchema = new mongoose.Schema({
  analysisId: { type: String, required: true, index: true },
  sdid: { type: String, required: true, index: true },
  impactLevel: { type: String, enum: ['DIRECT', 'DEPENDENT', 'TRANSITIVE', 'DOCUMENTATION', 'DIAGRAM'], required: true },
  impactScore: { type: Number, required: true },
  reason: { type: String },
  confidence: { type: Number },
}, { timestamps: true });

const impactRelationshipPathSchema = new mongoose.Schema({
  analysisId: { type: String, required: true, index: true },
  targetSdid: { type: String, required: true, index: true },
  path: [{ type: String }], // Array of SDIDs representing the path
}, { timestamps: true });

export const ImpactAnalysis = mongoose.model('ImpactAnalysis', impactAnalysisSchema);
export const ImpactEntity = mongoose.model('ImpactEntity', impactEntitySchema);
export const ImpactRelationshipPath = mongoose.model('ImpactRelationshipPath', impactRelationshipPathSchema);
