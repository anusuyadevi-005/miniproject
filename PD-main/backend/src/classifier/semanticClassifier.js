export const SEMANTIC_CATEGORIES = {
  FILE_ADDED: 'FILE_ADDED',
  FILE_DELETED: 'FILE_DELETED',
  FUNCTION_ADDED: 'FUNCTION_ADDED',
  FUNCTION_MODIFIED: 'FUNCTION_MODIFIED',
  FUNCTION_DELETED: 'FUNCTION_DELETED',
  CLASS_ADDED: 'CLASS_ADDED',
  CLASS_MODIFIED: 'CLASS_MODIFIED',
  CLASS_DELETED: 'CLASS_DELETED',
  API_CHANGE: 'API_CHANGE',
  ROUTE_CHANGE: 'ROUTE_CHANGE',
  DATABASE_SCHEMA_CHANGE: 'DATABASE_SCHEMA_CHANGE',
  DEPENDENCY_CHANGE: 'DEPENDENCY_CHANGE',
  CONFIGURATION_CHANGE: 'CONFIGURATION_CHANGE',
  SECURITY_CHANGE: 'SECURITY_CHANGE',
  TEST_CHANGE: 'TEST_CHANGE',
  DOCUMENTATION_CHANGE: 'DOCUMENTATION_CHANGE',
  ARCHITECTURE_CHANGE: 'ARCHITECTURE_CHANGE'
};

export class SemanticClassifier {
  /**
   * Classifies AST diffs into one of the 17 standard ASDSE semantic categories.
   */
  static classify(diffItem) {
    const rawCategory = diffItem.changeCategory || '';

    // 1. Database Schema Changes
    if (rawCategory === 'DATABASE_SCHEMA_CHANGE' || diffItem.symbolType === 'DatabaseTable' || diffItem.type === 'SchemaModified') {
      return {
        category: SEMANTIC_CATEGORIES.DATABASE_SCHEMA_CHANGE,
        severity: 'CRITICAL',
        riskScore: 0.95,
        description: `Database schema or table structure modified: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'DATABASE_TIER'
      };
    }

    // 2. API & Route Changes
    if (rawCategory === 'API_CHANGE' || rawCategory === 'ROUTE_CHANGE' || diffItem.symbolType === 'API' || diffItem.type === 'ApiModified') {
      return {
        category: rawCategory === 'API_CHANGE' ? SEMANTIC_CATEGORIES.API_CHANGE : SEMANTIC_CATEGORIES.ROUTE_CHANGE,
        severity: 'HIGH',
        riskScore: 0.85,
        description: `HTTP API route contract or handler modified: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'API_CONTRACT'
      };
    }

    // 3. Security Changes
    if (rawCategory === 'SECURITY_CHANGE') {
      return {
        category: SEMANTIC_CATEGORIES.SECURITY_CHANGE,
        severity: 'CRITICAL',
        riskScore: 0.95,
        description: `Security token, credential, or authentication guard modified: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'SECURITY_LAYER'
      };
    }

    // 4. Dependency Changes
    if (rawCategory === 'DEPENDENCY_CHANGE' || diffItem.symbolType === 'Dependency') {
      return {
        category: SEMANTIC_CATEGORIES.DEPENDENCY_CHANGE,
        severity: 'HIGH',
        riskScore: 0.7,
        description: `Package dependencies or runtime manifests updated: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'PACKAGE_TIER'
      };
    }

    // 5. Configuration Changes
    if (rawCategory === 'CONFIGURATION_CHANGE' || diffItem.symbolType === 'Configuration') {
      return {
        category: SEMANTIC_CATEGORIES.CONFIGURATION_CHANGE,
        severity: 'MEDIUM',
        riskScore: 0.5,
        description: `Deployment configuration or environment parameters modified: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'DEPLOYMENT_TIER'
      };
    }

    // 6. Test Changes
    if (rawCategory === 'TEST_CHANGE' || diffItem.symbolType === 'Test') {
      return {
        category: SEMANTIC_CATEGORIES.TEST_CHANGE,
        severity: 'LOW',
        riskScore: 0.25,
        description: `Automated test suite or test assertion updated: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'TEST_SUITE'
      };
    }

    // 7. Documentation Changes
    if (rawCategory === 'DOCUMENTATION_CHANGE' || diffItem.symbolType === 'Documentation') {
      return {
        category: SEMANTIC_CATEGORIES.DOCUMENTATION_CHANGE,
        severity: 'INFORMATIONAL',
        riskScore: 0.1,
        description: `Documentation or static markdown content updated: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'DOCUMENTATION_ONLY'
      };
    }

    // 8. Class Changes
    if (rawCategory === 'CLASS_ADDED' || (diffItem.type === 'NodeAdded' && diffItem.symbolType === 'Class')) {
      return {
        category: SEMANTIC_CATEGORIES.CLASS_ADDED,
        severity: 'MEDIUM',
        riskScore: 0.4,
        description: `New class declaration created: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'CLASS_LEVEL'
      };
    }
    if (rawCategory === 'CLASS_DELETED' || (diffItem.type === 'NodeDeleted' && diffItem.symbolType === 'Class')) {
      return {
        category: SEMANTIC_CATEGORIES.CLASS_DELETED,
        severity: 'CRITICAL',
        riskScore: 0.95,
        description: `Class removed from repository: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'MODULE_LEVEL'
      };
    }
    if (rawCategory === 'CLASS_MODIFIED' || diffItem.symbolType === 'Class') {
      return {
        category: SEMANTIC_CATEGORIES.CLASS_MODIFIED,
        severity: 'HIGH',
        riskScore: 0.65,
        description: `Class structure modified: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'CLASS_LEVEL'
      };
    }

    // 9. Function Changes
    if (rawCategory === 'FUNCTION_ADDED' || (diffItem.type === 'NodeAdded' && diffItem.symbolType === 'Function')) {
      return {
        category: SEMANTIC_CATEGORIES.FUNCTION_ADDED,
        severity: 'LOW',
        riskScore: 0.3,
        description: `New function declared: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'FUNCTION_LEVEL'
      };
    }
    if (rawCategory === 'FUNCTION_DELETED' || (diffItem.type === 'NodeDeleted' && diffItem.symbolType === 'Function')) {
      return {
        category: SEMANTIC_CATEGORIES.FUNCTION_DELETED,
        severity: 'CRITICAL',
        riskScore: 0.9,
        description: `Exported function removed: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'MODULE_LEVEL'
      };
    }
    if (diffItem.type === 'SignatureChanged' || rawCategory === 'FUNCTION_MODIFIED') {
      const isBreaking = diffItem.removedParams && diffItem.removedParams.length > 0;
      return {
        category: SEMANTIC_CATEGORIES.FUNCTION_MODIFIED,
        severity: isBreaking ? 'HIGH' : 'MEDIUM',
        riskScore: isBreaking ? 0.85 : 0.5,
        description: isBreaking
          ? `Parameters removed from ${diffItem.name}: ${diffItem.removedParams.join(', ')}`
          : `Signature updated for ${diffItem.name}: ${diffItem.details || 'parameters modified'}`,
        requiresDocRegen: true,
        blastRadius: isBreaking ? 'MODULE_LEVEL' : 'FUNCTION_LEVEL'
      };
    }

    // 10. File Additions / Deletions
    if (rawCategory === 'FILE_ADDED' || diffItem.type === 'NodeAdded') {
      return {
        category: SEMANTIC_CATEGORIES.FILE_ADDED,
        severity: 'LOW',
        riskScore: 0.3,
        description: `New source file added: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'FILE_LEVEL'
      };
    }
    if (rawCategory === 'FILE_DELETED' || diffItem.type === 'NodeDeleted') {
      return {
        category: SEMANTIC_CATEGORIES.FILE_DELETED,
        severity: 'HIGH',
        riskScore: 0.8,
        description: `Source file deleted: ${diffItem.name}`,
        requiresDocRegen: true,
        blastRadius: 'FILE_LEVEL'
      };
    }

    return {
      category: SEMANTIC_CATEGORIES.FUNCTION_MODIFIED,
      severity: 'INFORMATIONAL',
      riskScore: 0.1,
      description: diffItem.details || 'Internal logic refactor without public interface modification.',
      requiresDocRegen: false,
      blastRadius: 'INTERNAL_LOGIC'
    };
  }
}
