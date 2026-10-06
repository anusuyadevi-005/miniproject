import { buildAndStoreRepositoryKnowledge, getRepositoryKnowledge } from '../services/knowledgeModelService.js';

export async function getRepositoryKnowledgeController(req, res) {
  try {
    const { repositoryId } = req.params;
    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId is required' });
    }

    const existing = await getRepositoryKnowledge(repositoryId);
    if (!existing) {
      const saved = await buildAndStoreRepositoryKnowledge(repositoryId);
      return res.json({ success: true, knowledge: saved.knowledgeModel });
    }

    return res.json({ success: true, knowledge: existing.knowledgeModel });
  } catch (error) {
    console.error('Knowledge model fetch error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
