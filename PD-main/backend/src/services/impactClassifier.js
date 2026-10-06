import { calculateImpactScore } from '../config/impactWeights.js';

export class ImpactClassifier {
  /**
   * Classifies a visited node from the graph traversal into its impact level.
   */
  static classify(rootSdid, visitedNode) {
    const { sdid, depth, pathTypes, entity } = visitedNode;
    
    // Direct
    if (sdid === rootSdid || depth === 0) {
      return {
        level: 'DIRECT',
        score: calculateImpactScore(entity.entityType, 0, []),
        reason: 'The entity itself changed.'
      };
    }

    // Determine if documentation/diagram based on entity type or relationships
    if (entity.entityType === 'DOC_SECTION' || entity.entityType === 'Documentation') {
      return {
        level: 'DOCUMENTATION',
        score: calculateImpactScore('Documentation', depth, pathTypes),
        reason: 'A documentation section references affected entities.'
      };
    }

    if (entity.entityType === 'DIAGRAM') {
      return {
        level: 'DIAGRAM',
        score: calculateImpactScore('Diagram', depth, pathTypes),
        reason: 'A diagram references affected entities.'
      };
    }

    // Dependent vs Transitive
    if (depth === 1) {
      return {
        level: 'DEPENDENT',
        score: calculateImpactScore(entity.entityType, depth, pathTypes),
        reason: 'Entity directly depends on the changed entity.'
      };
    }

    return {
      level: 'TRANSITIVE',
      score: calculateImpactScore(entity.entityType, depth, pathTypes),
      reason: 'Entity is affected through transitive dependencies.'
    };
  }

  static generateClassifications(rootSdid, visitedMap) {
    const classifications = [];
    
    for (const [sdid, visitedNode] of visitedMap.entries()) {
      const classification = this.classify(rootSdid, visitedNode);
      classifications.push({
        sdid,
        entity: visitedNode.entity,
        impactLevel: classification.level,
        impactScore: classification.score,
        reason: classification.reason,
        relationshipPath: visitedNode.path,
        confidence: (classification.score / 100).toFixed(2)
      });
    }

    return classifications;
  }
}
