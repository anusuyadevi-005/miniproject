import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '../graph/knowledgeGraph.js';

export class TestingAgent {
  /**
   * Discovers automated tests, maps test cases to application features, and flags untested modules.
   */
  static analyzeTests(knowledgeGraph, inventory) {
    const files = inventory.files || [];
    const testFiles = files.filter(f => {
      const p = f.relativePath.toLowerCase();
      return p.includes('test') || p.includes('spec') || p.endsWith('.test.js') || p.endsWith('.spec.ts') || p.startsWith('test_');
    });

    const apis = knowledgeGraph.findEntitiesByType(ENTITY_TYPES.API);
    const services = knowledgeGraph.findEntitiesByType(ENTITY_TYPES.SERVICE);

    const testCategories = {
      unit: testFiles.filter(f => !f.relativePath.toLowerCase().includes('e2e') && !f.relativePath.toLowerCase().includes('integration')),
      integration: testFiles.filter(f => f.relativePath.toLowerCase().includes('integration')),
      e2e: testFiles.filter(f => f.relativePath.toLowerCase().includes('e2e') || f.relativePath.toLowerCase().includes('cypress') || f.relativePath.toLowerCase().includes('playwright'))
    };

    // Register Test entities in Knowledge Graph
    for (const tf of testFiles) {
      const testEntity = knowledgeGraph.addEntity({
        id: `TEST-${tf.name.replace(/[^A-Za-z0-9_]/g, '_')}`,
        name: tf.name,
        type: ENTITY_TYPES.TEST,
        path: tf.relativePath,
        confidence: 1.0,
        evidence: [tf.relativePath],
        metadata: {
          testType: tf.relativePath.toLowerCase().includes('e2e') ? 'E2E' : tf.relativePath.toLowerCase().includes('integration') ? 'Integration' : 'Unit'
        }
      });

      // Link test file to related source services
      const baseName = tf.name.replace(/\.(test|spec)\.(js|ts|jsx|tsx|py)$/, '');
      const matchedService = services.find(s => s.name.toLowerCase().includes(baseName.toLowerCase()));
      if (matchedService) {
        knowledgeGraph.addEdge(testEntity.id, matchedService.id, RELATIONSHIP_TYPES.TESTS);
      }
    }

    // Feature to Test mapping
    const featureMappings = [];
    const untestedFeatures = [];

    for (const api of apis) {
      const endpoint = api.metadata?.endpoint || api.name;
      const cleanTarget = endpoint.split('/').filter(p => p && !p.startsWith(':'))[1] || 'resource';

      const relatedTest = testFiles.find(tf => tf.relativePath.toLowerCase().includes(cleanTarget.toLowerCase()));

      if (relatedTest) {
        featureMappings.push({
          feature: `${api.metadata?.method || 'GET'} ${endpoint}`,
          testedBy: relatedTest.relativePath,
          status: 'Covered'
        });
      } else {
        untestedFeatures.push({
          feature: `${api.metadata?.method || 'GET'} ${endpoint}`,
          path: api.path,
          status: 'Untested (Missing Test Suite)'
        });
      }
    }

    const totalFeatures = apis.length || 1;
    const coveredCount = featureMappings.length;
    const estimatedCoverage = Math.round((coveredCount / totalFeatures) * 100);

    return {
      totalTestFiles: testFiles.length,
      categories: {
        unit: testCategories.unit.length,
        integration: testCategories.integration.length,
        e2e: testCategories.e2e.length
      },
      estimatedCoverageScore: estimatedCoverage,
      featureMappings,
      untestedFeatures: untestedFeatures.slice(0, 10),
      testFiles: testFiles.map(f => f.relativePath)
    };
  }
}
