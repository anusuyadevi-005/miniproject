import { db } from '../db/store.js';
import { calculateImpactScore } from '../config/impactWeights.js';

export class DiagramImpactAnalyzer {
  static async findDiagramImpacts(repositoryId, affectedSdids) {
    // For this prototype, assume diagrams are stored in memory or a collection similar to docs
    // Fallback to checking DB mock for any diagrams containing affected SDIDs
    
    const diagramImpacts = [];
    const allDiagrams = db.diagrams || [];
    
    for (const diagram of allDiagrams) {
      if (diagram.repositoryId === repositoryId) {
        // Find intersection of diagram elements and affected SDIDs
        const intersection = diagram.elements.filter(el => affectedSdids.has(el));
        
        if (intersection.length > 0) {
          diagramImpacts.push({
            sdid: diagram.id,
            impactLevel: 'DIAGRAM',
            impactScore: calculateImpactScore('Diagram', 1, ['DESCRIBES']),
            reason: `Diagram contains ${intersection.length} affected entities`,
            relationshipPath: [intersection[0], diagram.id],
            confidence: 0.92
          });
        }
      }
    }

    return diagramImpacts;
  }
}
