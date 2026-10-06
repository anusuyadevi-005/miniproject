import { SDIDEngine } from '../sdid/sdidEngine.js';
import { SemanticEntity, SemanticEntityHistory, SemanticRelationship, DocumentationMapping } from '../models/SDIDModels.js';
import { getMongoStatus } from '../db/mongo.js';
import { db } from '../db/store.js';

export const generateSDIDs = async (req, res) => {
  try {
    const { repositoryId } = req.params;
    const { currentEntities, commitHash } = req.body;
    
    if (!currentEntities || !Array.isArray(currentEntities)) {
      return res.status(400).json({ error: 'currentEntities array is required' });
    }

    const results = await SDIDEngine.analyzeEntities(repositoryId, currentEntities, commitHash);
    res.status(201).json({ success: true, results });
  } catch (error) {
    console.error('Error generating SDIDs:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getAllSDIDs = async (req, res) => {
  try {
    const { repositoryId } = req.params;
    
    if (getMongoStatus().isConnected) {
      const entities = await SemanticEntity.find({ repositoryId }).lean();
      return res.json(entities);
    }
    
    const memoryEntities = (db.semanticEntities || []).filter(e => e.repositoryId === repositoryId);
    res.json(memoryEntities);
  } catch (error) {
    console.error('Error fetching SDIDs:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSDIDDetails = async (req, res) => {
  try {
    const { repositoryId, sdid } = req.params;
    
    let entity = null;
    if (getMongoStatus().isConnected) {
      entity = await SemanticEntity.findOne({ repositoryId, sdid }).lean();
    } else {
      entity = (db.semanticEntities || []).find(e => e.repositoryId === repositoryId && e.sdid === sdid);
    }

    if (!entity) {
      return res.status(404).json({ error: 'SDID not found' });
    }

    res.json(entity);
  } catch (error) {
    console.error('Error fetching SDID details:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSDIDRelationships = async (req, res) => {
  try {
    const { repositoryId, sdid } = req.params;
    
    let relationships = [];
    if (getMongoStatus().isConnected) {
      relationships = await SemanticRelationship.find({ 
        repositoryId, 
        $or: [{ sourceSdid: sdid }, { targetSdid: sdid }] 
      }).lean();
    } else {
      relationships = (db.semanticRelationships || []).filter(r => 
        r.repositoryId === repositoryId && (r.sourceSdid === sdid || r.targetSdid === sdid)
      );
    }

    res.json(relationships);
  } catch (error) {
    console.error('Error fetching relationships:', error);
    res.status(500).json({ error: error.message });
  }
};

export const getSDIDHistory = async (req, res) => {
  try {
    const { repositoryId, sdid } = req.params;
    
    let history = [];
    if (getMongoStatus().isConnected) {
      history = await SemanticEntityHistory.find({ repositoryId, sdid }).sort({ createdAt: -1 }).lean();
    } else {
      history = (db.semanticEntityHistory || []).filter(h => 
        h.repositoryId === repositoryId && h.sdid === sdid
      );
    }

    res.json(history);
  } catch (error) {
    console.error('Error fetching SDID history:', error);
    res.status(500).json({ error: error.message });
  }
};
