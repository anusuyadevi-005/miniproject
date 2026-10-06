import mongoose from 'mongoose';

const CallGraphSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  callGraph: { type: [Object], default: [] },
  analyzedAt: { type: Date, default: Date.now }
});

export const CallGraph = mongoose.models.CallGraph || mongoose.model('CallGraph', CallGraphSchema);
