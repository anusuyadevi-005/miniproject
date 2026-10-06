import mongoose from 'mongoose';

const SymbolSchema = new mongoose.Schema({
  repositoryId: { type: String, required: true, index: true },
  fileName: { type: String, required: true },
  language: { type: String, required: true },
  classes: { type: [Object], default: [] },
  interfaces: { type: [Object], default: [] },
  enums: { type: [Object], default: [] },
  functions: { type: [Object], default: [] },
  methods: { type: [Object], default: [] },
  imports: { type: [Object], default: [] },
  exports: { type: [Object], default: [] },
  variables: { type: [Object], default: [] },
  analyzedAt: { type: Date, default: Date.now }
});

export const ASTSymbol = mongoose.models.ASTSymbol || mongoose.model('ASTSymbol', SymbolSchema);
