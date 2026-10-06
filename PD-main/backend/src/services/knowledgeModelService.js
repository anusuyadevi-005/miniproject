import { RepositoryInventory } from '../models/RepositoryInventory.js';
import { RepositoryTechnology } from '../models/RepositoryTechnology.js';
import { RepositoryDependencyAnalysis } from '../models/RepositoryDependencyAnalysis.js';
import { ASTSymbol } from '../models/ASTSymbol.js';
import { RepositoryKnowledgeModel } from '../models/RepositoryKnowledgeModel.js';
import { buildRepositoryKnowledgeModel } from './knowledgeModelBuilder.js';

export async function buildAndStoreRepositoryKnowledge(repositoryId) {
  const inventory = await RepositoryInventory.findOne({ repositoryId }).lean();
  if (!inventory) {
    throw new Error('Repository inventory not found');
  }

  const technology = await RepositoryTechnology.findOne({ repositoryId }).lean();
  if (!technology) {
    throw new Error('Repository technology analysis not found');
  }

  const dependencyAnalysis = await RepositoryDependencyAnalysis.findOne({ repositoryId }).lean();
  if (!dependencyAnalysis) {
    throw new Error('Repository dependency analysis not found');
  }

  const astAnalysis = await ASTSymbol.findOne({ repositoryId }).lean();
  if (!astAnalysis) {
    throw new Error('Repository AST analysis not found');
  }

  const knowledgeModel = buildRepositoryKnowledgeModel({ inventory, technology, astAnalysis, dependencyAnalysis });

  const saved = await RepositoryKnowledgeModel.findOneAndUpdate(
    { repositoryId },
    { repositoryId, knowledgeModel, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return saved;
}

export async function getRepositoryKnowledge(repositoryId) {
  return RepositoryKnowledgeModel.findOne({ repositoryId }).lean();
}
