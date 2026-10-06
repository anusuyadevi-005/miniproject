import { db } from '../db/store.js';
import { getMongoStatus } from '../db/mongo.js';
import { DocumentationMapping } from '../models/SDIDModels.js';
import { calculateImpactScore } from '../config/impactWeights.js';

export class DocumentationImpactAnalyzer {
  static async findDocumentationImpacts(repositoryId, affectedSdids) {
    let mappings = [];
    
    if (getMongoStatus().isConnected) {
      try {
        mappings = await DocumentationMapping.find({
          repositoryId,
          sdid: { $in: Array.from(affectedSdids) }
        }).lean();
      } catch (e) {
        console.warn('Mongo connection failed in documentation impact analyzer');
      }
    } else {
      mappings = (db.documentationMappings || []).filter(m => 
        m.repositoryId === repositoryId && affectedSdids.has(m.sdid)
      );
    }

    const docImpacts = mappings.map(mapping => {
      return {
        sdid: mapping.documentationId,
        impactLevel: 'DOCUMENTATION',
        impactScore: calculateImpactScore('Documentation', 1, ['DOCUMENTED_BY']),
        reason: `Documentation section directly maps to affected SDID ${mapping.sdid}`,
        relationshipPath: [mapping.sdid, mapping.documentationId],
        confidence: 0.95
      };
    });

    return docImpacts;
  }
}
