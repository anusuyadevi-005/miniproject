import { RepositoryInventory } from '../models/RepositoryInventory.js';
import { RepositoryTechnology } from '../models/RepositoryTechnology.js';
import { analyzeTechnology } from '../services/technologyAnalyzer.js';

export async function getRepositoryTechnology(req, res) {
  try {
    const { repositoryId } = req.params;
    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId is required' });
    }

    const existingTechnology = await RepositoryTechnology.findOne({ repositoryId }).lean();
    if (existingTechnology) {
      return res.json({ success: true, technology: existingTechnology });
    }

    const repositoryInventory = await RepositoryInventory.findOne({ repositoryId }).lean();
    if (!repositoryInventory) {
      return res.status(404).json({ success: false, error: 'Repository inventory not found' });
    }

    const technology = await analyzeTechnology(repositoryInventory);
    const savedTechnology = await RepositoryTechnology.findOneAndUpdate(
      { repositoryId },
      { ...technology, scanTime: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();

    return res.json({ success: true, technology: savedTechnology });
  } catch (error) {
    console.error('Technology analysis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
