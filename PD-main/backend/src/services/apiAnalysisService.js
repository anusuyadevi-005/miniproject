import { RepositoryInventory } from '../models/RepositoryInventory.js';
import { RepositoryApiAnalysis } from '../models/RepositoryApiAnalysis.js';
import { analyzeApis } from './apiAnalyzer.js';
import { buildOpenApiSpec } from './apiModelBuilder.js';
import { RepositoryTechnology } from '../models/RepositoryTechnology.js';

export async function analyzeRepositoryApis(repositoryId) {
  const inventory = await RepositoryInventory.findOne({ repositoryId }).lean();
  if (!inventory) throw new Error('Repository inventory not found');

  const technology = await RepositoryTechnology.findOne({ repositoryId }).lean();
  const apis = await analyzeApis(inventory);
  const openApi = buildOpenApiSpec(repositoryId, apis, { projectName: technology?.projectName || inventory.metadata?.name || 'Repository APIs' });

  const saved = await RepositoryApiAnalysis.findOneAndUpdate(
    { repositoryId },
    { repositoryId, apis, openApi, swagger: openApi, analyzedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return saved;
}

export async function getRepositoryApis(repositoryId) {
  return RepositoryApiAnalysis.findOne({ repositoryId }).lean();
}
