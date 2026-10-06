import assert from 'assert';
import { ImpactAnalyzer } from '../src/services/impactAnalyzer.js';
import { ImpactWeights } from '../src/config/impactWeights.js';
import { db } from '../src/db/store.js';

describe('Impact Radius Engine (Module 14)', () => {
  beforeEach(() => {
    // Setup Mock Database Data
    db.semanticEntities = [
      { sdid: 'FUNC-001', repositoryId: 'test_repo', entityType: 'Public Function', currentName: 'login' },
      { sdid: 'SERVICE-001', repositoryId: 'test_repo', entityType: 'Architecture Component', currentName: 'AuthService' },
      { sdid: 'REPO-001', repositoryId: 'test_repo', entityType: 'Architecture Component', currentName: 'UserRepository' },
      { sdid: 'DB-001', repositoryId: 'test_repo', entityType: 'Database Schema', currentName: 'User Database' },
      { sdid: 'API-001', repositoryId: 'test_repo', entityType: 'API', currentName: 'Authentication API' },
      { sdid: 'WF-001', repositoryId: 'test_repo', entityType: 'Workflow', currentName: 'Authentication Workflow' }
    ];
    
    db.semanticRelationships = [
      { repositoryId: 'test_repo', sourceSdid: 'FUNC-001', targetSdid: 'SERVICE-001', relationshipType: 'CALLS' },
      { repositoryId: 'test_repo', sourceSdid: 'SERVICE-001', targetSdid: 'REPO-001', relationshipType: 'DEPENDS_ON' },
      { repositoryId: 'test_repo', sourceSdid: 'REPO-001', targetSdid: 'DB-001', relationshipType: 'USES_DATABASE' },
      { repositoryId: 'test_repo', sourceSdid: 'API-001', targetSdid: 'FUNC-001', relationshipType: 'CALLS' }, // reversed for dependency
      { repositoryId: 'test_repo', sourceSdid: 'WF-001', targetSdid: 'API-001', relationshipType: 'DEPENDS_ON' }
    ];

    db.documentationMappings = [
      { repositoryId: 'test_repo', sdid: 'WF-001', documentationId: 'DOC-A' },
      { repositoryId: 'test_repo', sdid: 'SERVICE-002', documentationId: 'DOC-B' }, // Booking
      { repositoryId: 'test_repo', sdid: 'SERVICE-003', documentationId: 'DOC-C' }  // Payment
    ];
    
    db.impactAnalyses = [];
  });

  it('Critical Test: Proper Classification of Impacts', async () => {
    const report = await ImpactAnalyzer.analyzeImpact('test_repo', 'FUNC-001', 'MODIFIED', 'latest');
    
    assert.strictEqual(report.rootSDID, 'FUNC-001');

    // Direct
    const direct = report.directImpacts.find(d => d.sdid === 'FUNC-001');
    assert.ok(direct, 'Root should be DIRECT impact');

    // Dependent
    const dependent = report.dependentImpacts.find(d => d.sdid === 'SERVICE-001');
    assert.ok(dependent, 'AuthService should be DEPENDENT');

    const dependentApi = report.dependentImpacts.find(d => d.sdid === 'API-001');
    assert.ok(dependentApi, 'Authentication API should be DEPENDENT since it CALLS login');

    // Transitive
    const transitiveRepo = report.transitiveImpacts.find(d => d.sdid === 'REPO-001');
    assert.ok(transitiveRepo, 'UserRepository should be TRANSITIVE');

    const transitiveDb = report.transitiveImpacts.find(d => d.sdid === 'DB-001');
    assert.ok(transitiveDb, 'User Database should be TRANSITIVE');
    
    const transitiveWf = report.transitiveImpacts.find(d => d.sdid === 'WF-001');
    assert.ok(transitiveWf, 'Authentication Workflow should be TRANSITIVE');

    // Documentation
    const docImpact = report.documentationImpacts.find(d => d.sdid === 'DOC-A');
    assert.ok(docImpact, 'Authentication Documentation (DOC-A) should be AFFECTED');

    // Not Affected
    const docBooking = report.documentationImpacts.find(d => d.sdid === 'DOC-B');
    assert.strictEqual(docBooking, undefined, 'Booking Documentation should NOT be affected');

    const docPayment = report.documentationImpacts.find(d => d.sdid === 'DOC-C');
    assert.strictEqual(docPayment, undefined, 'Payment Documentation should NOT be affected');
    
    // Check paths
    const docPath = report.relationshipPaths.find(p => p.targetSdid === 'DOC-A');
    assert.ok(docPath, 'Should have path for DOC-A');
  });

  it('Enforces Maximum Traversal Depth', async () => {
    // Temporarily reduce MAX_DEPTH
    const originalDepth = ImpactWeights.MAX_DEPTH;
    ImpactWeights.MAX_DEPTH = 1;
    
    const report = await ImpactAnalyzer.analyzeImpact('test_repo', 'FUNC-001', 'MODIFIED', 'latest');
    
    ImpactWeights.MAX_DEPTH = originalDepth; // Restore

    const transitiveRepo = report.transitiveImpacts.find(d => d.sdid === 'REPO-001');
    assert.strictEqual(transitiveRepo, undefined, 'UserRepository should NOT be traversed due to max depth');
  });
});
