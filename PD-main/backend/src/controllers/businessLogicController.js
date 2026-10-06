import { buildAndStoreRepositoryKnowledge, getRepositoryKnowledge } from '../services/knowledgeModelService.js';
import { analyzeBusinessLogic } from '../services/businessLogicAnalyzer.js';
import { RepositoryBusinessLogic } from '../models/RepositoryBusinessLogic.js';

export async function getBusinessLogicController(req, res) {
  try {
    const { repositoryId } = req.params;
    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId is required' });
    }

    let existingKnowledge = await getRepositoryKnowledge(repositoryId);
    if (!existingKnowledge) {
      const saved = await buildAndStoreRepositoryKnowledge(repositoryId);
      existingKnowledge = saved.knowledgeModel;
    } else {
      existingKnowledge = existingKnowledge.knowledgeModel;
    }

    if (!existingKnowledge) {
      return res.status(404).json({ success: false, error: 'Repository knowledge model not found' });
    }

    const analysis = analyzeBusinessLogic(existingKnowledge);

    await RepositoryBusinessLogic.findOneAndUpdate(
      { repositoryId },
      { repositoryId, analysis },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ success: true, data: analysis });
  } catch (error) {
    console.error('Business logic analysis error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
