import { SemanticRelationship, SemanticEntity } from '../models/SDIDModels.js';
import { db } from '../db/store.js';
import { getMongoStatus } from '../db/mongo.js';
import { ImpactWeights } from '../config/impactWeights.js';

export class ImpactGraphTraversal {
  
  static async getRelationships(repositoryId, sdid) {
    if (getMongoStatus().isConnected) {
      try {
        const rels = await SemanticRelationship.find({ 
          repositoryId, 
          sourceSdid: sdid 
        }).lean();
        
        // Also get relationships where this node is the target (reverse lookup)
        const reverseRels = await SemanticRelationship.find({
          repositoryId,
          targetSdid: sdid
        }).lean();
        
        return { outgoing: rels, incoming: reverseRels };
      } catch (e) {
        console.warn('MongoDB relationship fetch failed, using fallback.');
      }
    }
    
    const rels = (db.semanticRelationships || []).filter(r => r.repositoryId === repositoryId);
    return {
      outgoing: rels.filter(r => r.sourceSdid === sdid),
      incoming: rels.filter(r => r.targetSdid === sdid)
    };
  }

  static async getEntity(repositoryId, sdid) {
    if (getMongoStatus().isConnected) {
      try {
        const entity = await SemanticEntity.findOne({ repositoryId, sdid }).lean();
        if (entity) return entity;
      } catch(e) {}
    }
    return (db.semanticEntities || []).find(e => e.repositoryId === repositoryId && e.sdid === sdid);
  }

  /**
   * Traverses the graph starting from rootSdid up to MAX_DEPTH.
   * Returns a map of visited nodes with their depth, path, and path relationships.
   */
  static async traverse(repositoryId, rootSdid) {
    const maxDepth = ImpactWeights.MAX_DEPTH;
    const visited = new Map();
    const queue = [];

    // Initialize root
    queue.push({
      sdid: rootSdid,
      depth: 0,
      path: [rootSdid],
      pathTypes: []
    });

    while (queue.length > 0) {
      const current = queue.shift();
      
      // Keep shortest path to a node
      if (!visited.has(current.sdid) || visited.get(current.sdid).depth > current.depth) {
        // Fetch entity details to determine entity type later
        const entityDetails = await this.getEntity(repositoryId, current.sdid);
        
        visited.set(current.sdid, {
          depth: current.depth,
          path: current.path,
          pathTypes: current.pathTypes,
          entity: entityDetails || { sdid: current.sdid, entityType: 'Unknown' }
        });

        if (current.depth < maxDepth) {
          const { outgoing, incoming } = await this.getRelationships(repositoryId, current.sdid);

          // Follow outgoing relationships
          for (const rel of outgoing) {
            queue.push({
              sdid: rel.targetSdid,
              depth: current.depth + 1,
              path: [...current.path, rel.targetSdid],
              pathTypes: [...current.pathTypes, rel.relationshipType]
            });
          }
          
          // Some relationships should be traversed backwards (e.g. if A is DEPENDENT on B, and B changes, A is impacted)
          for (const rel of incoming) {
            let traverseBackwards = false;
            // E.g., if a route DEPENDS_ON a controller, and controller changes, route is impacted
            if (['DEPENDS_ON', 'CALLS', 'IMPLEMENTS', 'EXTENDS', 'CONTAINS'].includes(rel.relationshipType)) {
              traverseBackwards = true;
            }
            if (traverseBackwards) {
              queue.push({
                sdid: rel.sourceSdid,
                depth: current.depth + 1,
                path: [...current.path, rel.sourceSdid],
                pathTypes: [...current.pathTypes, `REVERSE_${rel.relationshipType}`]
              });
            }
          }
        }
      }
    }
    
    return visited;
  }
}
