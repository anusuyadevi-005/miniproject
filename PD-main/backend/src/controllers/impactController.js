import { ImpactAnalyzer } from '../services/impactAnalyzer.js';

export const analyzeImpact = async (req, res) => {
  try {
    const { repositoryId } = req.params;
    const { sdids, changeType, commitHash } = req.body;

    if (!sdids || !Array.isArray(sdids) || sdids.length === 0) {
      return res.status(400).json({ error: 'Array of sdids is required' });
    }
    if (!changeType) {
      return res.status(400).json({ error: 'changeType is required' });
    }

    // Process first SDID for this prototype (can be extended to multiple)
    const rootSdid = sdids[0];
    
    const impactAnalysis = await ImpactAnalyzer.analyzeImpact(repositoryId, rootSdid, changeType, commitHash || 'latest');
    
    res.status(201).json({ success: true, impactAnalysis });
  } catch (error) {
    console.error('Error analyzing impact:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getImpactAnalysis = async (req, res) => {
  try {
    const { repositoryId, analysisId } = req.params;
    
    const analysis = await ImpactAnalyzer.getAnalysis(repositoryId, analysisId);
    
    if (!analysis) {
      return res.status(404).json({ error: 'Impact analysis not found' });
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('Error fetching impact analysis:', error);
    res.status(500).json({ error: error.message });
  }
};
