import { RepositoryInventory } from '../models/RepositoryInventory.js';
import { RepositoryDependencyAnalysis } from '../models/RepositoryDependencyAnalysis.js';
import { analyzeRepositoryDependencies } from '../services/repositoryDependencyAnalyzer.js';

export async function analyzeRepositoryDependenciesController(req, res) {
  try {
    const { repositoryId } = req.params;
    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId is required' });
    }

    const inventory = await RepositoryInventory.findOne({ repositoryId }).lean();
    if (!inventory) {
      return res.status(404).json({ success: false, error: 'Repository inventory not found' });
    }

    const analysis = await analyzeRepositoryDependencies(inventory);
    const savedAnalysis = await RepositoryDependencyAnalysis.findOneAndUpdate(
      { repositoryId },
      { ...analysis },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.status(200).json({ success: true, analysis: savedAnalysis });
  } catch (error) {
    console.error('Dependency analysis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
