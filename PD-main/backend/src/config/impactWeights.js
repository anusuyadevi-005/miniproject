export const ImpactWeights = {
  // Base weights for entities based on their perceived importance
  ENTITY_TYPES: {
    'API': 90,
    'Database Schema': 95,
    'Public Function': 80,
    'Internal Function': 50,
    'Utility': 30,
    'Documentation': 85,
    'Architecture Component': 90,
    'Workflow': 85,
    'Diagram': 75,
    'default': 50
  },

  // Multipliers based on the relationship distance (depth)
  DEPTH_DECAY: {
    0: 1.0,  // Direct (no decay)
    1: 0.9,  // 1 level away
    2: 0.7,
    3: 0.5,
    4: 0.3,
    5: 0.1
  },

  // Relationship types carry different implicit semantic weight
  RELATIONSHIP_STRENGTH: {
    'DOCUMENTED_BY': 1.0,
    'DESCRIBES': 1.0,
    'USES_DATABASE': 0.95,
    'USED_BY_API': 0.90,
    'USED_BY_WORKFLOW': 0.85,
    'USED_BY_ARCHITECTURE': 0.85,
    'DEPENDS_ON': 0.8,
    'CALLS': 0.7,
    'CALLED_BY': 0.7,
    'IMPLEMENTS': 0.8,
    'EXTENDS': 0.8,
    'BELONGS_TO': 0.5,
    'CONTAINS': 0.5,
    'default': 0.5
  },

  MAX_DEPTH: 5
};

export function getEntityWeight(entityType) {
  return ImpactWeights.ENTITY_TYPES[entityType] || ImpactWeights.ENTITY_TYPES['default'];
}

export function getRelationshipStrength(relType) {
  return ImpactWeights.RELATIONSHIP_STRENGTH[relType] || ImpactWeights.RELATIONSHIP_STRENGTH['default'];
}

export function calculateImpactScore(entityType, depth, pathTypes) {
  const baseScore = getEntityWeight(entityType);
  
  // Cap depth at MAX_DEPTH
  const effectiveDepth = Math.min(depth, ImpactWeights.MAX_DEPTH);
  const depthMultiplier = ImpactWeights.DEPTH_DECAY[effectiveDepth] || 0.1;
  
  let pathStrength = 1.0;
  for (const relType of pathTypes) {
    pathStrength *= getRelationshipStrength(relType);
  }

  // Calculate final score
  let score = baseScore * depthMultiplier * pathStrength;
  return Math.min(Math.round(score), 100);
}
