import mongoose from 'mongoose';

const ClassRelationshipSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  relationships: { type: [Object], default: [] },
  analyzedAt: { type: Date, default: Date.now }
});

export const ClassRelationship = mongoose.models.ClassRelationship || mongoose.model('ClassRelationship', ClassRelationshipSchema);
