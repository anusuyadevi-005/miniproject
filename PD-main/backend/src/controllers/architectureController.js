import { analyzeArchitecture } from '../services/architectureAnalyzer.js';
import { getRepositoryKnowledge } from '../services/knowledgeModelService.js';
import { RepositoryKnowledgeModel } from '../models/RepositoryKnowledgeModel.js';
import { getMongoStatus } from '../db/mongo.js';

export async function getArchitectureController(req, res) {
  try {
    const { repositoryId } = req.params;
    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId is required' });
    }

    if (!getMongoStatus().isConnected) {
      return res.status(503).json({ success: false, error: 'Architecture query unavailable: MongoDB is not connected.' });
    }

    let result = await getRepositoryKnowledge(repositoryId);
    if (!result?.knowledgeModel) {
      result = await RepositoryKnowledgeModel.findOne().sort({ updatedAt: -1 }).lean();
    }

    if (!result?.knowledgeModel) {
      return res.status(404).json({ success: false, error: 'Repository knowledge model not found' });
    }

    const architecture = analyzeArchitecture(result.knowledgeModel);
    return res.json({ success: true, data: architecture });
  } catch (error) {
    console.error('Architecture analysis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
