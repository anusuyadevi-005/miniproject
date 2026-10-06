import { RepositoryInventory } from '../models/RepositoryInventory.js';
import { ASTSymbol } from '../models/ASTSymbol.js';
import { ClassRelationship } from '../models/ClassRelationship.js';
import { CallGraph } from '../models/CallGraph.js';
import { ComplexityMetric } from '../models/ComplexityMetric.js';
import { analyzeRepositoryAST } from '../services/astAnalyzer.js';

export async function analyzeAST(req, res) {
  try {
    const { repositoryId } = req.params;
    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId is required' });
    }

    const inventory = await RepositoryInventory.findOne({ repositoryId }).lean();
    if (!inventory) {
      return res.status(404).json({ success: false, error: 'Repository inventory not found' });
    }

    const analysis = await analyzeRepositoryAST(inventory);

    await ASTSymbol.findOneAndUpdate(
      { repositoryId },
      {
        repositoryId,
        fileName: repositoryId,
        language: 'AST',
        classes: analysis.classes,
        interfaces: analysis.interfaces,
        enums: analysis.enums,
        functions: analysis.functions,
        methods: analysis.methods,
        imports: analysis.imports,
        exports: analysis.exports,
        variables: analysis.variables,
        analyzedAt: new Date()
      },
      { upsert: true, new: true }
    );

    await ClassRelationship.findOneAndUpdate(
      { repositoryId },
      { repositoryId, relationships: analysis.relationships, analyzedAt: new Date() },
      { upsert: true, new: true }
    );

    await CallGraph.findOneAndUpdate(
      { repositoryId },
      { repositoryId, callGraph: analysis.callGraph, analyzedAt: new Date() },
      { upsert: true, new: true }
    );

    await ComplexityMetric.findOneAndUpdate(
      { repositoryId },
      { repositoryId, complexity: analysis.complexity, analyzedAt: new Date() },
      { upsert: true, new: true }
    );

    return res.json({
      success: true,
      symbols: {
        classes: analysis.classes,
        functions: analysis.functions,
        methods: analysis.methods,
        imports: analysis.imports,
        exports: analysis.exports,
        variables: analysis.variables
      },
      relationships: analysis.relationships,
      callGraph: analysis.callGraph,
      complexity: analysis.complexity
    });
  } catch (error) {
    console.error('AST analysis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
