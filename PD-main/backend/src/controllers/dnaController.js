import { RegenerationDecisionEngine } from '../services/regenerationDecisionEngine.js';

export const analyzeDna = async (req, res) => {
  try {
    const { repositoryId } = req.params;
    const { impactAnalysisId } = req.body;

    if (!impactAnalysisId) {
      return res.status(400).json({ error: 'impactAnalysisId is required' });
    }

    const decisions = await RegenerationDecisionEngine.analyze(repositoryId, impactAnalysisId);
    
    res.status(201).json({ success: true, decisions });
  } catch (error) {
    console.error('Error analyzing DNA:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getDna = async (req, res) => {
  try {
    const { repositoryId, docId } = req.params;
    const dna = await RegenerationDecisionEngine.getDNA(repositoryId, docId);
    
    if (!dna) {
      return res.status(404).json({ error: 'DNA not found for this documentation section' });
    }
    
    res.json(dna);
  } catch (error) {
    console.error('Error fetching DNA:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getDnaHistory = async (req, res) => {
  try {
    const { repositoryId, docId } = req.params;
    const history = await RegenerationDecisionEngine.getDNAHistory(repositoryId, docId);
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching DNA history:', error);
    res.status(500).json({ error: error.message });
  }
};
