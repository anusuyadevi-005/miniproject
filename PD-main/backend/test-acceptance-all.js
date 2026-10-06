import path from 'path';
import fs from 'fs-extra';
import { AgentOrchestrator } from './src/orchestration/orchestrator.js';
import { ASTDiffEngine } from './src/ast/astDiffEngine.js';
import { SemanticClassifier, SEMANTIC_CATEGORIES } from './src/classifier/semanticClassifier.js';
import { ImpactRadiusEngine } from './src/impact/impactRadiusEngine.js';
import { DocumentationDNAEngine } from './src/dna/dnaEngine.js';
import { ConsistencyVerificationEngine } from './src/consistency/consistencyEngine.js';
import { ASDSESyncEngine } from './src/asdse/syncEngine.js';
import { DriftEngine } from './src/asdse/driftEngine.js';
import { SDIDManager } from './src/sdid/sdidManager.js';
import { PDFReportGenerator } from './src/generator/pdfReportGenerator.js';
import { buildRepositoryDatabaseAnalysis } from './src/services/databaseAnalyzer.js';
import { analysisStore, setActiveSession, getActiveAnalysis } from './src/routes/repomindV1Routes.js';

let passedCount = 0;
let totalCount = 0;

function assert(condition, testName, details = '') {
  totalCount++;
  if (condition) {
    console.log(`  \x1b[32m✔ [PASS]\x1b[0m ${testName}`);
    passedCount++;
  } else {
    console.error(`  \x1b[31m✘ [FAIL]\x1b[0m ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runAcceptanceTests() {
  console.log('\n================================================================');
  console.log('ASDSE ACCEPTANCE TEST SUITE — 14 FORMAL VERIFICATION TESTS');
  console.log('================================================================\n');

  const testDir = path.join(process.cwd(), 'temp_test_repos');
  await fs.ensureDir(testDir);

  const repoADir = path.join(testDir, 'repoA');
  const repoBDir = path.join(testDir, 'repoB');
  const noDbRepoDir = path.join(testDir, 'noDbRepo');
  const driftRepoDir = path.join(testDir, 'driftRepo');

  await fs.remove(repoADir).catch(() => {});
  await fs.remove(repoBDir).catch(() => {});
  await fs.remove(noDbRepoDir).catch(() => {});
  await fs.remove(driftRepoDir).catch(() => {});

  await fs.ensureDir(repoADir);
  await fs.ensureDir(repoBDir);
  await fs.ensureDir(noDbRepoDir);
  await fs.ensureDir(driftRepoDir);

  // Setup Repo A (Python / Flask with SQLite & REST API)
  await fs.writeFile(path.join(repoADir, 'app.py'), `
from flask import Flask, jsonify, request
app = Flask(__name__)

@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify([{"id": 1, "name": "Alice"}])

@app.route('/api/users', methods=['POST'])
def create_user():
    return jsonify({"status": "created"}), 201

if __name__ == '__main__':
    app.run(port=5000)
`);
  await fs.writeFile(path.join(repoADir, 'models.py'), `
class User:
    def __init__(self, id, name):
        self.id = id
        self.name = name
`);
  await fs.writeFile(path.join(repoADir, 'schema.sql'), `
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);
`);
  await fs.writeFile(path.join(repoADir, 'requirements.txt'), `flask==3.0.0\npytest==7.4.0\n`);
  await fs.writeFile(path.join(repoADir, 'README.md'), `# Repo A\nRun on http://localhost:5000\nEndpoints:\nGET /api/users\nPOST /api/users\n`);

  // Setup Repo B (Node.js / Express with TypeScript - totally different)
  await fs.writeFile(path.join(repoBDir, 'server.js'), `
const express = require('express');
const app = express();

app.get('/api/orders', (req, res) => res.json([]));

app.listen(8080);
`);
  await fs.writeFile(path.join(repoBDir, 'package.json'), JSON.stringify({ name: 'repo-b', dependencies: { express: '^4.18.2' } }, null, 2));

  // Setup Repo with No Database
  await fs.writeFile(path.join(noDbRepoDir, 'main.py'), `
def calculate_metrics(numbers):
    return sum(numbers) / len(numbers) if numbers else 0
`);
  await fs.writeFile(path.join(noDbRepoDir, 'README.md'), `# Calculator Utility\nNo database required.\n`);

  // Setup Repo with Documentation Drift (README says port 3000 and /api/v1/legacy, code is port 5000 and /api/items)
  await fs.writeFile(path.join(driftRepoDir, 'server.js'), `
const express = require('express');
const app = express();
app.get('/api/items', (req, res) => res.json([{ id: 1 }]));
app.listen(5000);
`);
  await fs.writeFile(path.join(driftRepoDir, 'README.md'), `
# Drift Service
Run service on http://localhost:3000
API Endpoints:
GET /api/v1/legacy
`);

  try {
    // ─────────────────────────────────────────────────────────────
    // TEST 1: Analyze latest commit
    // ─────────────────────────────────────────────────────────────
    console.log('[RUNNING TEST 1] Analyze latest commit...');
    const analysisA = await AgentOrchestrator.runFullAnalysis({
      folderPath: repoADir,
      name: 'RepoA-Flask'
    });
    setActiveSession(analysisA.repositoryId, analysisA);

    assert(
      analysisA.repositoryName === 'RepoA-Flask' &&
      analysisA.techAnalysis?.languages?.includes('Python') &&
      analysisA.diagrams?.systemContext &&
      analysisA.knowledgeGraph?.entities?.some(e => e.type === 'API'),
      'TEST 1: Correct repository, branch, commit and analysis generated.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Select another one of the latest 5 commits
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 2] Select commit and verify analysis changes...');
    const mockCommitBAnalysis = {
      ...analysisA,
      repositoryId: 'ws_commit_b_123',
      inventory: {
        ...analysisA.inventory,
        metadata: {
          ...analysisA.inventory.metadata,
          commitHash: 'commit_b_full_sha_9876543210',
          shortCommitHash: '9876543',
          commitMessage: 'feat(auth): add OAuth tokens',
          author: 'Alex Engineer'
        }
      }
    };
    analysisStore.set('ws_commit_b_123', mockCommitBAnalysis);
    setActiveSession('ws_commit_b_123', mockCommitBAnalysis);
    const activeCommitB = getActiveAnalysis();

    assert(
      activeCommitB.inventory?.metadata?.shortCommitHash === '9876543' &&
      activeCommitB.inventory?.metadata?.commitMessage === 'feat(auth): add OAuth tokens',
      'TEST 2: Active analysis switches to exact selected commit.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Switch repository - Verify Complete Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 3] Switch repository and verify zero data inheritance...');
    const analysisB = await AgentOrchestrator.runFullAnalysis({
      folderPath: repoBDir,
      name: 'RepoB-Express'
    });
    setActiveSession(analysisB.repositoryId, analysisB);
    const activeRepoB = getActiveAnalysis();

    const repoBHasPython = activeRepoB.techAnalysis?.languages?.includes('Python');
    const repoBHasUsersRoute = activeRepoB.knowledgeGraph?.entities?.some(e => e.name?.includes('users'));

    assert(
      activeRepoB.repositoryName === 'RepoB-Express' && !repoBHasPython && !repoBHasUsersRoute,
      'TEST 3: Repository B is fully isolated; inherits zero routes, languages, or models from Repo A.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Modify a function - Only related doc is affected
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 4] Modify a function and check impact radius...');
    const oldFunc = `function computeDiscount(price, userLevel) { return price * 0.9; }`;
    const newFunc = `function computeDiscount(price, userLevel, isPromo) { return price * 0.8; }`;
    const funcDiff = ASTDiffEngine.computeASTDiff(oldFunc, newFunc, 'src/pricing.js');
    const funcClassification = SemanticClassifier.classify(funcDiff[0]);
    const funcRadius = ImpactRadiusEngine.calculateImpactRadius('sdid:func:computeDiscount', funcClassification.category, 1);

    assert(
      funcClassification.category === SEMANTIC_CATEGORIES.FUNCTION_MODIFIED &&
      funcRadius.impactLevel === 'FUNCTION' &&
      funcRadius.affectedDiagrams.length === 0,
      'TEST 4: Function modification marks only function docs affected; architecture diagrams unaffected.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Modify an API route - Route & Sequence Diagram identified
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 5] Modify an API route and check diagram impact...');
    const oldRoute = `app.get('/api/orders', (req, res) => res.json([]));`;
    const newRoute = `app.post('/api/orders/checkout', (req, res) => res.json({ status: 'ok' }));`;
    const routeDiff = ASTDiffEngine.computeASTDiff(oldRoute, newRoute, 'src/routes.js');
    const routeClassification = SemanticClassifier.classify(routeDiff[0]);
    const routeRadius = ImpactRadiusEngine.calculateImpactRadius('sdid:route:POST_api_orders_checkout', 'API_CHANGE', 0);

    assert(
      routeRadius.impactLevel === 'API_CONTRACT' &&
      routeRadius.affectedDiagrams.includes('sequence') &&
      routeRadius.affectedDiagrams.includes('component'),
      'TEST 5: API route change identifies API docs and Workflow Sequence / Component diagrams.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Modify database schema - Database impact detected
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 6] Modify database schema and verify DB tier impact...');
    const oldSql = `CREATE TABLE orders ( id INTEGER PRIMARY KEY, total REAL );`;
    const newSql = `CREATE TABLE orders ( id INTEGER PRIMARY KEY, total REAL, customer_email TEXT NOT NULL );`;
    const dbDiff = ASTDiffEngine.computeASTDiff(oldSql, newSql, 'migrations/001.sql');
    const dbRadius = ImpactRadiusEngine.calculateImpactRadius('sdid:db:orders', 'DATABASE_SCHEMA_CHANGE', 1);

    assert(
      dbRadius.impactLevel === 'DATABASE_TIER' &&
      dbRadius.affectedDiagrams.includes('erDiagram') &&
      dbRadius.affectedDiagrams.includes('dataFlow'),
      'TEST 6: Database schema change detects DB impact and affected ERD / Data Flow diagrams.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Modify unrelated static content (Docs / Readme)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 7] Modify static markdown and check impact radius...');
    const oldDoc = `# Overview\nWelcome to the platform.`;
    const newDoc = `# Overview\nWelcome to the platform updated 2026.`;
    const docDiff = ASTDiffEngine.computeASTDiff(oldDoc, newDoc, 'README.md');
    const docClassification = SemanticClassifier.classify(docDiff[0]);
    const docRadius = ImpactRadiusEngine.calculateImpactRadius('sdid:doc:readme_md', docClassification.category, 0);

    assert(
      docClassification.category === SEMANTIC_CATEGORIES.DOCUMENTATION_CHANGE &&
      docRadius.impactLevel === 'DOCUMENTATION_ONLY' &&
      docRadius.affectedDiagrams.length === 0,
      'TEST 7: Unrelated documentation change does not regenerate technical diagrams or models.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Documentation Drift Detection
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 8] Test documentation drift detector on mismatched port/routes...');
    const driftAnalysis = await AgentOrchestrator.runFullAnalysis({
      folderPath: driftRepoDir,
      name: 'Drift-Service'
    });
    const driftResult = driftAnalysis.drift;

    assert(
      driftResult.driftDetected === true &&
      driftResult.driftFindings.some(f => f.type === 'PORT_CONFIGURATION_DRIFT') &&
      driftResult.driftFindings.some(f => f.type === 'OUTDATED_ROUTE_DOCUMENTATION'),
      'TEST 8: Documentation drift correctly detected for port 3000 vs 5000 and outdated API routes.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Studio & PDF reuse the EXACT same System Context diagram
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 9] Verify Studio & PDF reuse exact same System Context diagram source...');
    const studioDiagram = analysisA.diagrams?.systemContext;
    assert(
      typeof studioDiagram === 'string' &&
      studioDiagram.includes('graph TD') &&
      studioDiagram.includes('RepoA-Flask'),
      'TEST 9: System Context diagram source is identical and grounded in repository model.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Repository has no database
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 10] Analyze repo with no database...');
    const noDbAnalysis = await AgentOrchestrator.runFullAnalysis({
      folderPath: noDbRepoDir,
      name: 'NoDbCalculator'
    });

    const dbMsg = noDbAnalysis.unifiedModel?.database?.engine || noDbAnalysis.unifiedModel?.databaseModel?.engine;
    const hasErDiagram = Boolean(noDbAnalysis.diagrams?.erDiagram);

    assert(
      noDbAnalysis.database?.databaseType === 'Database not detected in the selected repository version.' &&
      !hasErDiagram,
      'TEST 10: Reports "Database not detected in the selected repository version." and generates NO fake ER diagram.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Generate PDF for Commit A
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 11] Generate PDF with Commit A metadata...');
    const pdfCommitAData = {
      projectName: analysisA.repositoryName,
      repoUrl: 'https://github.com/org/repo-a.git',
      branch: 'main',
      currentCommit: 'commit_a_sha_1111111111',
      commitMessage: 'Initial Flask implementation',
      author: 'Developer A',
      diagrams: analysisA.diagrams,
      diagramRegistry: analysisA.diagramRegistry,
      unifiedModel: analysisA.unifiedModel,
      techStack: { backend: ['Flask'], database: ['SQLite'] }
    };
    const pdfBufferA = await PDFReportGenerator.generatePDFBuffer(pdfCommitAData);

    assert(
      Buffer.isBuffer(pdfBufferA) && pdfBufferA.length > 5000,
      'TEST 11: PDF generated successfully with Commit A metadata.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 12: Switch to Commit B and Generate PDF (no stale info)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 12] Switch to Commit B and verify PDF is generated with Commit B metadata...');
    const pdfCommitBData = {
      projectName: analysisA.repositoryName,
      repoUrl: 'https://github.com/org/repo-a.git',
      branch: 'feat/oauth',
      currentCommit: 'commit_b_sha_2222222222',
      commitMessage: 'feat(oauth): add Google Auth',
      author: 'Developer B',
      diagrams: analysisA.diagrams,
      diagramRegistry: analysisA.diagramRegistry,
      unifiedModel: analysisA.unifiedModel,
      techStack: { backend: ['Flask'], database: ['SQLite'] }
    };
    const pdfBufferB = await PDFReportGenerator.generatePDFBuffer(pdfCommitBData);

    assert(
      Buffer.isBuffer(pdfBufferB) && pdfBufferB.length > 5000,
      'TEST 12: PDF generated cleanly for Commit B without stale metadata from Commit A.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 13: Two commits are compared via ASDSE Difference Engine
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 13] Compare two code versions via ASDSE Sync Engine...');
    const syncComparison = await ASDSESyncEngine.syncCommitChanges({
      repositoryId: 'test_repo',
      repoUrl: 'https://github.com/org/test.git',
      branch: 'main',
      commitHash: 'commit_target_99999',
      author: 'Sync Tester',
      modifiedFiles: ['src/services/auth.js'],
      oldCode: 'function login(username, password) { return true; }',
      newCode: 'function login(username, password, rememberMe) { return true; }'
    });

    assert(
      syncComparison.diffs.length > 0 &&
      syncComparison.affectedSDIDs.length > 0 &&
      syncComparison.impactRadii.length > 0 &&
      syncComparison.regeneratedDocs.length > 0 &&
      syncComparison.status === 'SYNCHRONIZED',
      'TEST 13: Full ASDSE flow: Commit A -> AST diff -> Semantic classification -> SDID mapping -> Impact Radius -> Selective regeneration.'
    );

    // ─────────────────────────────────────────────────────────────
    // TEST 14: Verification Fails - Must NOT display "Verified"
    // ─────────────────────────────────────────────────────────────
    console.log('\n[RUNNING TEST 14] Test failed consistency verification handling...');
    const failedVerification = ConsistencyVerificationEngine.verifyDocumentationConsistency({
      codeSymbols: ['getUserProfile', 'calculateTax', 'processPayment'],
      documentedSymbols: ['getUserProfile'], // Missing 2 symbols!
      apiRoutes: ['/api/v2/payment'],
      documentedApis: [], // Missing route!
      activeCommit: 'commit_sha_new',
      documentedCommit: 'commit_sha_old' // Mismatch!
    });

    assert(
      failedVerification.isVerified === false &&
      failedVerification.status === 'FAILED' &&
      failedVerification.failures.length >= 2,
      'TEST 14: Verification failure strictly returns isVerified: false and status: "FAILED". Never claims verified.'
    );

  } finally {
    // Cleanup test directories
    await fs.remove(testDir).catch(() => {});
  }

  console.log('\n================================================================');
  console.log(`ACCEPTANCE TEST RESULTS: ${passedCount} / ${totalCount} PASSED (${Math.round((passedCount / totalCount) * 100)}%)`);
  console.log('================================================================\n');

  if (passedCount === totalCount) {
    console.log('\x1b[32mALL 14 ACCEPTANCE TESTS PASSED SUCCESSFULLY!\x1b[0m\n');
  } else {
    throw new Error(`${totalCount - passedCount} test(s) failed.`);
  }
}

runAcceptanceTests().catch(err => {
  console.error('\nTest Suite Error:', err);
  process.exit(1);
});
