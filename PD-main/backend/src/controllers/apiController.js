import { analyzeRepositoryApis, getRepositoryApis } from '../services/apiAnalysisService.js';

export async function getRepositoryApisController(req, res) {
  const { repositoryId } = req.params;
  try {
    let analysis = await getRepositoryApis(repositoryId);
    if (!analysis) {
      analysis = await analyzeRepositoryApis(repositoryId);
    }

    if (!analysis) {
      return res.status(404).json({ error: 'API analysis not found' });
    }

    res.json(analysis);
  } catch (error) {
    console.error('API analysis fetch error:', error);
    res.status(500).json({ error: error.message });
  }
}
