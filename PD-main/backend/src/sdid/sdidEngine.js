import crypto from 'crypto';
import { db } from '../db/store.js';
import { getMongoStatus } from '../db/mongo.js';
import { SemanticEntity, SemanticEntityHistory, SemanticRelationship, DocumentationMapping } from '../models/SDIDModels.js';

export class SDIDEngine {
  
  static generateFingerprint(entity) {
    const data = `${entity.repositoryId}|${entity.entityType}|${entity.normalizedName}|${entity.parentEntity || ''}|${entity.normalizedPath}|${entity.signature || ''}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  static generateNewSDID(repositoryId, entityType) {
    if (!db.sdidCounters) db.sdidCounters = {};
    const key = `${repositoryId}_${entityType}`;
    if (!db.sdidCounters[key]) db.sdidCounters[key] = 0;
    db.sdidCounters[key]++;
    
    const countStr = db.sdidCounters[key].toString().padStart(6, '0');
    return `${entityType}-${countStr}`;
  }

  static async getExistingEntities(repositoryId) {
    if (getMongoStatus().isConnected) {
      try {
        return await SemanticEntity.find({ repositoryId }).lean();
      } catch (e) {
        console.warn('MongoDB not available for SDIDEngine.getExistingEntities:', e.message);
      }
    }
    
    if (!db.semanticEntities) db.semanticEntities = [];
    return db.semanticEntities.filter(e => e.repositoryId === repositoryId);
  }

  static async saveEntity(entity) {
    if (getMongoStatus().isConnected) {
      try {
        await SemanticEntity.findOneAndUpdate(
          { repositoryId: entity.repositoryId, sdid: entity.sdid },
          entity,
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('MongoDB save error:', e.message);
      }
    }
    
    if (!db.semanticEntities) db.semanticEntities = [];
    const index = db.semanticEntities.findIndex(e => e.sdid === entity.sdid && e.repositoryId === entity.repositoryId);
    if (index >= 0) {
      db.semanticEntities[index] = entity;
    } else {
      db.semanticEntities.push(entity);
    }
  }

  static async saveHistory(historyRecord) {
    if (getMongoStatus().isConnected) {
      try {
        await SemanticEntityHistory.create(historyRecord);
      } catch(e) {
        console.warn('MongoDB history save error:', e.message);
      }
    }
    
    if (!db.semanticEntityHistory) db.semanticEntityHistory = [];
    db.semanticEntityHistory.unshift(historyRecord);
  }

  // 6-Level Matching Strategy
  static matchEntity(currentEntity, previousEntities) {
    // Level 1: Exact semantic identity (Fingerprint Match)
    const exactMatch = previousEntities.find(p => p.fingerprint === currentEntity.fingerprint);
    if (exactMatch) {
      return { match: exactMatch, confidence: 100, level: 'HIGH', strategy: 'exact_semantic_identity', reasons: ['Identical semantic fingerprint'] };
    }

    // Level 2: Same parent + same normalized symbol + same type
    const structuralMatch = previousEntities.find(p => 
      p.parentId === currentEntity.parentId && 
      p.currentName === currentEntity.currentName && 
      p.entityType === currentEntity.entityType
    );
    
    if (structuralMatch) {
      return { match: structuralMatch, confidence: 95, level: 'HIGH', strategy: 'parent_symbol_type', reasons: ['Same parent, name, and type'] };
    }

    // Level 3: Same structural AST characteristics (similar signature, same path)
    const astMatch = previousEntities.find(p => 
      p.currentPath === currentEntity.currentPath &&
      p.entityType === currentEntity.entityType &&
      p.signature === currentEntity.signature
    );
    if (astMatch) {
      return { match: astMatch, confidence: 90, level: 'HIGH', strategy: 'ast_structure', reasons: ['Same file path and AST signature'] };
    }

    // Level 5: Moved-file detection
    const moveMatch = previousEntities.find(p => 
      p.currentName === currentEntity.currentName &&
      p.entityType === currentEntity.entityType &&
      p.signature === currentEntity.signature &&
      p.currentPath !== currentEntity.currentPath
    );
    if (moveMatch) {
      return { match: moveMatch, confidence: 85, level: 'HIGH', strategy: 'moved_file_detection', reasons: ['Entity found in different path with identical signature'] };
    }

    // Level 6: Rename detection (same path, same parent, similar signature)
    const renameMatch = previousEntities.find(p => 
      p.currentPath === currentEntity.currentPath &&
      p.parentId === currentEntity.parentId &&
      p.entityType === currentEntity.entityType
    );
    
    if (renameMatch) {
      return { match: renameMatch, confidence: 75, level: 'MEDIUM', strategy: 'rename_detection', reasons: ['Same parent and file path, different name'] };
    }

    return null; // No match found -> NEW
  }

  static async analyzeEntities(repositoryId, currentEntities, commitHash = 'latest') {
    const previousEntities = await this.getExistingEntities(repositoryId);
    const processedSdids = new Set();
    const results = [];

    for (const current of currentEntities) {
      current.fingerprint = this.generateFingerprint(current);
      
      const matchResult = this.matchEntity(current, previousEntities);

      if (matchResult) {
        const { match, confidence, strategy, level, reasons } = matchResult;
        
        let status = 'ACTIVE';
        if (strategy === 'moved_file_detection') status = 'MOVED';
        else if (strategy === 'rename_detection') status = 'RENAMED';
        else if (strategy !== 'exact_semantic_identity') status = 'MODIFIED';

        if (level === 'LOW' || confidence < 60) {
          status = 'REVIEW_REQUIRED';
        }

        const updatedEntity = {
          ...match,
          currentName: current.currentName,
          currentPath: current.currentPath,
          parentId: current.parentId,
          signature: current.signature,
          fingerprint: current.fingerprint,
          status,
          confidence,
          lastSeenCommit: commitHash,
          updatedAt: new Date().toISOString()
        };

        if (status !== 'ACTIVE' && status !== 'REVIEW_REQUIRED') {
          await this.saveHistory({
            sdid: updatedEntity.sdid,
            repositoryId,
            entityType: updatedEntity.entityType,
            previousName: match.currentName,
            currentName: updatedEntity.currentName,
            previousPath: match.currentPath,
            currentPath: updatedEntity.currentPath,
            status,
            confidence,
            commitHash,
            fingerprint: updatedEntity.fingerprint
          });
        }

        await this.saveEntity(updatedEntity);
        processedSdids.add(updatedEntity.sdid);
        results.push({ sdid: updatedEntity.sdid, status, confidence, reasons });
      } else {
        // Create NEW
        const sdid = this.generateNewSDID(repositoryId, current.entityType);
        const newEntity = {
          sdid,
          repositoryId,
          entityType: current.entityType,
          currentName: current.currentName,
          currentPath: current.currentPath,
          parentId: current.parentId,
          signature: current.signature,
          status: 'ACTIVE',
          confidence: 100,
          fingerprint: current.fingerprint,
          firstSeenCommit: commitHash,
          lastSeenCommit: commitHash,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await this.saveEntity(newEntity);
        processedSdids.add(sdid);
        results.push({ sdid, status: 'ADDED', confidence: 100, reasons: ['New entity detected'] });
      }
    }

    // Mark missing entities as DELETED
    for (const prev of previousEntities) {
      if (!processedSdids.has(prev.sdid)) {
        const deletedEntity = { ...prev, status: 'DELETED', lastSeenCommit: commitHash, updatedAt: new Date().toISOString() };
        await this.saveEntity(deletedEntity);
        await this.saveHistory({
          sdid: deletedEntity.sdid,
          repositoryId,
          entityType: deletedEntity.entityType,
          previousName: deletedEntity.currentName,
          currentName: deletedEntity.currentName,
          previousPath: deletedEntity.currentPath,
          currentPath: deletedEntity.currentPath,
          status: 'DELETED',
          confidence: 100,
          commitHash,
          fingerprint: deletedEntity.fingerprint
        });
        results.push({ sdid: deletedEntity.sdid, status: 'DELETED', confidence: 100, reasons: ['Entity no longer exists in repository'] });
      }
    }

    return results;
  }
}
