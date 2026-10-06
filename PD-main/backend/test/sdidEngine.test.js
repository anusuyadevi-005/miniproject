import assert from 'assert';
import { SDIDEngine } from '../src/sdid/sdidEngine.js';

// Mock DB for testing
import { db } from '../src/db/store.js';

describe('SDID Engine (Module 13)', () => {
  beforeEach(() => {
    db.semanticEntities = [];
    db.semanticEntityHistory = [];
    db.sdidCounters = {};
  });

  const REPO_ID = 'test_repo_1';

  it('1. Initial repository scan: assigns new SDIDs', async () => {
    const currentEntities = [
      { entityType: 'FUNC', currentName: 'UserService.login', currentPath: 'src/user.js', signature: 'login(email, pass)' }
    ];

    const results = await SDIDEngine.analyzeEntities(REPO_ID, currentEntities, 'commit_1');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].status, 'ADDED');
    assert.match(results[0].sdid, /^FUNC-000001$/);
    
    assert.strictEqual(db.semanticEntities.length, 1);
    assert.strictEqual(db.semanticEntities[0].sdid, 'FUNC-000001');
  });

  it('2. Unchanged function: retains SDID and ACTIVE status', async () => {
    // Initial scan
    await SDIDEngine.analyzeEntities(REPO_ID, [{ entityType: 'FUNC', currentName: 'UserService.login', currentPath: 'src/user.js', signature: 'login(email, pass)' }], 'commit_1');

    // Second scan, exact same entity
    const results = await SDIDEngine.analyzeEntities(REPO_ID, [{ entityType: 'FUNC', currentName: 'UserService.login', currentPath: 'src/user.js', signature: 'login(email, pass)' }], 'commit_2');
    
    assert.strictEqual(results[0].status, 'ACTIVE');
    assert.strictEqual(results[0].sdid, 'FUNC-000001');
  });

  it('3. Modified function: retains SDID but changes status to MODIFIED', async () => {
    await SDIDEngine.analyzeEntities(REPO_ID, [{ entityType: 'FUNC', currentName: 'UserService.login', currentPath: 'src/user.js', signature: 'login(email, pass)' }], 'commit_1');

    // Modified signature
    const results = await SDIDEngine.analyzeEntities(REPO_ID, [{ entityType: 'FUNC', currentName: 'UserService.login', currentPath: 'src/user.js', signature: 'login(email, pass, mfa)' }], 'commit_2');
    
    assert.strictEqual(results[0].status, 'MODIFIED');
    assert.strictEqual(results[0].sdid, 'FUNC-000001');
    assert.strictEqual(db.semanticEntityHistory.length, 1); // History recorded
  });

  it('6. Renamed function: preserves SDID based on AST/path', async () => {
    await SDIDEngine.analyzeEntities(REPO_ID, [{ entityType: 'FUNC', currentName: 'UserService.login', currentPath: 'src/user.js', parentId: 'CLASS-01', signature: 'login(email, pass)' }], 'commit_1');

    // Renamed but same parent, path, type
    const results = await SDIDEngine.analyzeEntities(REPO_ID, [{ entityType: 'FUNC', currentName: 'UserService.authenticate', currentPath: 'src/user.js', parentId: 'CLASS-01', signature: 'authenticate(email, pass)' }], 'commit_2');
    
    assert.strictEqual(results[0].status, 'RENAMED');
    assert.strictEqual(results[0].sdid, 'FUNC-000001');
  });

  it('7. Moved function: preserves SDID based on signature', async () => {
    await SDIDEngine.analyzeEntities(REPO_ID, [{ entityType: 'FUNC', currentName: 'UserService.login', currentPath: 'src/old_path.js', signature: 'login(email, pass)' }], 'commit_1');

    // Moved but same signature and name
    const results = await SDIDEngine.analyzeEntities(REPO_ID, [{ entityType: 'FUNC', currentName: 'UserService.login', currentPath: 'src/new_path.js', signature: 'login(email, pass)' }], 'commit_2');
    
    assert.strictEqual(results[0].status, 'MOVED');
    assert.strictEqual(results[0].sdid, 'FUNC-000001');
  });

  it('5. Deleted function: marks status as DELETED', async () => {
    await SDIDEngine.analyzeEntities(REPO_ID, [{ entityType: 'FUNC', currentName: 'UserService.login', currentPath: 'src/user.js', signature: 'login(email, pass)' }], 'commit_1');

    // Scan with empty entities
    const results = await SDIDEngine.analyzeEntities(REPO_ID, [], 'commit_2');
    
    assert.strictEqual(results[0].status, 'DELETED');
    assert.strictEqual(db.semanticEntities[0].status, 'DELETED');
  });
});
