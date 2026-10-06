import mongoose from 'mongoose';

const ComplexityMetricSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  complexity: { type: [Object], default: [] },
  analyzedAt: { type: Date, default: Date.now }
});

export const ComplexityMetric = mongoose.models.ComplexityMetric || mongoose.model('ComplexityMetric', ComplexityMetricSchema);
