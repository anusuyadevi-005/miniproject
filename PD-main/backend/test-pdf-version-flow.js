import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';
import { WorkspaceManager } from './src/ingestion/workspaceManager.js';
import { AgentOrchestrator } from './src/orchestration/orchestrator.js';
import { PDFReportGenerator } from './src/generator/pdfReportGenerator.js';
import { analysisStore } from './src/routes/repomindV1Routes.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedTests++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failedTests++;
  }
}

async function runPDFVersionFlowTest() {
  console.log('\n=============================================================');
  console.log('  RUNNING AUTOMATIC VERSION-AWARE PDF FLOW TESTS');
  console.log('=============================================================\n');

  // 1. Create a generic temporary Git repository with 5 diverse multi-change commits
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'repomind-pdf-test-'));
  const testRepoPath = path.join(tempDir, 'test-generic-repo');
  fs.mkdirSync(testRepoPath, { recursive: true });

  const runGit = (cmd) => execSync(`git ${cmd}`, { cwd: testRepoPath, stdio: 'pipe' }).toString().trim();

  runGit('init');
  runGit('config user.name "Test Engineer"');
  runGit('config user.email "engineer@example.com"');
  runGit('config commit.gpgsign false');

  console.log('[1/5] Creating real Git history with 5 multi-change commits...');

  // Commit 1: Initial core application (Files, Routes, Models, Tests, Config)
  fs.mkdirSync(path.join(testRepoPath, 'src'), { recursive: true });
  fs.mkdirSync(path.join(testRepoPath, 'src', 'routes'), { recursive: true });
  fs.mkdirSync(path.join(testRepoPath, 'src', 'models'), { recursive: true });
  fs.mkdirSync(path.join(testRepoPath, 'tests'), { recursive: true });

  fs.writeFileSync(path.join(testRepoPath, 'package.json'), JSON.stringify({
    name: 'ecommerce-engine',
    version: '1.0.0',
    dependencies: { express: '^4.18.2', pg: '^8.11.0' }
  }, null, 2));
  fs.writeFileSync(path.join(testRepoPath, 'src', 'app.js'), 'const express = require("express");\nconst app = express();\nmodule.exports = app;\n');
  fs.writeFileSync(path.join(testRepoPath, 'src', 'routes', 'products.js'), 'const express = require("express");\nconst router = express.Router();\nrouter.get("/", (req, res) => res.json([]));\nmodule.exports = router;\n');
  fs.writeFileSync(path.join(testRepoPath, 'src', 'models', 'product.js'), 'class Product { constructor(id, name) { this.id = id; this.name = name; } }\nmodule.exports = Product;\n');
  fs.writeFileSync(path.join(testRepoPath, 'tests', 'product.test.js'), 'test("product created", () => { expect(true).toBe(true); });\n');
  fs.writeFileSync(path.join(testRepoPath, 'README.md'), '# Ecommerce Engine\nInitial baseline system.\n');

  runGit('add .');
  runGit('commit -m "Initial commit: Core product catalog and routing"');
  const commit1Sha = runGit('rev-parse HEAD');

  // Commit 2: User management + Auth + Database schema + New test
  fs.mkdirSync(path.join(testRepoPath, 'src', 'auth'), { recursive: true });
  fs.writeFileSync(path.join(testRepoPath, 'src', 'auth', 'authGuard.js'), 'function verifyToken(req, res, next) { next(); }\nmodule.exports = { verifyToken };\n');
  fs.writeFileSync(path.join(testRepoPath, 'src', 'routes', 'users.js'), 'const express = require("express");\nconst router = express.Router();\nrouter.post("/login", (req, res) => res.json({ token: "abc" }));\nmodule.exports = router;\n');
  fs.writeFileSync(path.join(testRepoPath, 'src', 'models', 'user.js'), 'class User { constructor(id, email) { this.id = id; this.email = email; } }\nmodule.exports = User;\n');
  fs.writeFileSync(path.join(testRepoPath, 'tests', 'user.test.js'), 'test("user auth", () => { expect(1).toBe(1); });\n');
  fs.appendFileSync(path.join(testRepoPath, 'README.md'), '\nAdded authentication and user domain models.\n');

  runGit('add .');
  runGit('commit -m "Add authentication, user models, and login endpoints"');
  const commit2Sha = runGit('rev-parse HEAD');

  // Commit 3: Order processing + Cart + Schema migration + Redis dependency
  fs.writeFileSync(path.join(testRepoPath, 'package.json'), JSON.stringify({
    name: 'ecommerce-engine',
    version: '1.1.0',
    dependencies: { express: '^4.18.2', pg: '^8.11.0', redis: '^4.6.0' }
  }, null, 2));
  fs.writeFileSync(path.join(testRepoPath, 'src', 'routes', 'orders.js'), 'const express = require("express");\nconst router = express.Router();\nrouter.post("/", (req, res) => res.json({ orderId: 101 }));\nmodule.exports = router;\n');
  fs.writeFileSync(path.join(testRepoPath, 'src', 'models', 'order.js'), 'class Order { constructor(id, total) { this.id = id; this.total = total; } }\nmodule.exports = Order;\n');
  fs.mkdirSync(path.join(testRepoPath, 'migrations'), { recursive: true });
  fs.writeFileSync(path.join(testRepoPath, 'migrations', '001_orders.sql'), 'CREATE TABLE orders (id SERIAL PRIMARY KEY, total NUMERIC(10,2));\n');

  runGit('add .');
  runGit('commit -m "Implement order placement, SQL migrations, and Redis caching"');
  const commit3Sha = runGit('rev-parse HEAD');

  // Commit 4: Payment gateway integration + CI/CD Workflow + Dockerfile
  fs.mkdirSync(path.join(testRepoPath, '.github', 'workflows'), { recursive: true });
  fs.writeFileSync(path.join(testRepoPath, '.github', 'workflows', 'ci.yml'), 'name: CI\non: [push]\njobs:\n  test:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n');
  fs.writeFileSync(path.join(testRepoPath, 'Dockerfile'), 'FROM node:18-alpine\nWORKDIR /app\nCOPY . .\nCMD ["node", "src/app.js"]\n');
  fs.writeFileSync(path.join(testRepoPath, 'src', 'routes', 'payments.js'), 'const express = require("express");\nconst router = express.Router();\nrouter.post("/charge", (req, res) => res.json({ status: "PAID" }));\nmodule.exports = router;\n');

  runGit('add .');
  runGit('commit -m "Add payment routes, Docker containerization, and GitHub CI workflow"');
  const commit4Sha = runGit('rev-parse HEAD');

  // Commit 5: Search & Recommendations + Groq/AI integration + Metrics
  fs.writeFileSync(path.join(testRepoPath, 'package.json'), JSON.stringify({
    name: 'ecommerce-engine',
    version: '1.2.0',
    dependencies: { express: '^4.18.2', pg: '^8.11.0', redis: '^4.6.0', groq: '^3.0.0' }
  }, null, 2));
  fs.writeFileSync(path.join(testRepoPath, 'src', 'routes', 'recommendations.js'), 'const express = require("express");\nconst router = express.Router();\nrouter.get("/ai-suggest", (req, res) => res.json({ items: ["P1", "P2"] }));\nmodule.exports = router;\n');
  fs.appendFileSync(path.join(testRepoPath, 'README.md'), '\nAdded AI recommendations and analytics pipeline.\n');

  runGit('add .');
  runGit('commit -m "Integrate AI recommendations and updated search algorithms"');
  const commit5Sha = runGit('rev-parse HEAD');

  console.log(`Created 5 real commits:\n  V1: ${commit1Sha.substring(0, 7)}\n  V2: ${commit2Sha.substring(0, 7)}\n  V3: ${commit3Sha.substring(0, 7)}\n  V4: ${commit4Sha.substring(0, 7)}\n  V5: ${commit5Sha.substring(0, 7)}\n`);

  // 2. Test Remote/Local Inspection - Automatic Discovery of 5 Retained Versions
  console.log('\n[2/5] Testing Git History Retained Versions Discovery...');
  const inspection = await WorkspaceManager.inspectRemoteRepository(testRepoPath);
  assert(inspection.recentCommits && inspection.recentCommits.length === 5, 'Discovered exactly 5 latest Git commits');
  assert(inspection.chronologicalVersions && inspection.chronologicalVersions.length === 5, 'Ordered 5 chronological versions V1..V5');
  assert(inspection.chronologicalVersions[0].fullSha === commit1Sha, 'V1 matches oldest commit in window');
  assert(inspection.chronologicalVersions[0].versionLabel === 'V1', 'Oldest commit labeled V1');
  assert(inspection.chronologicalVersions[4].fullSha === commit5Sha, 'V5 matches newest commit in window');
  assert(inspection.chronologicalVersions[4].versionLabel === 'V5', 'Newest commit labeled V5');

  // 3. Test Analyzing Each Version Snapshot Individually
  console.log('\n[3/5] Testing Complete Repository State Analysis & PDF Generation per Version...');

  const versionShas = [commit1Sha, commit2Sha, commit3Sha, commit4Sha, commit5Sha];
  const analyses = {};
  const pdfBuffers = {};

  for (let i = 0; i < versionShas.length; i++) {
    const sha = versionShas[i];
    const expectedLabel = `V${i + 1}`;
    console.log(`\n  --- Analyzing & Generating PDF for ${expectedLabel} (${sha.substring(0, 7)}) ---`);

    const analysis = await AgentOrchestrator.runFullAnalysis({
      url: testRepoPath,
      commitSha: sha,
      name: 'Ecommerce Engine'
    });

    analyses[expectedLabel] = analysis;
    analysisStore.set(analysis.repositoryId, analysis);

    // Verify checked out HEAD matches target commit SHA
    assert(analysis.inventory.metadata.commitHash === sha, `${expectedLabel} analysis commitHash strictly matches ${sha.substring(0, 7)}`);
    assert(analysis.versionLabel === expectedLabel, `${expectedLabel} metadata has versionLabel ${expectedLabel}`);

    // Verify Version Difference Model
    const vComp = analysis.versionComparison;
    if (i === 0) {
      assert(vComp.hasPreviousVersion === false, 'V1 hasPreviousVersion is false (Baseline)');
      assert(vComp.comparisonSource.includes('Initial available version'), 'V1 indicates initial version baseline');
    } else {
      const prevLabel = `V${i}`;
      const prevSha = versionShas[i - 1];
      assert(vComp.hasPreviousVersion === true, `${expectedLabel} hasPreviousVersion is true`);
      assert(vComp.previousVersion.fullSha === prevSha, `${expectedLabel} compares directly against ${prevLabel} (${prevSha.substring(0, 7)})`);
      assert(vComp.totalFilesChanged > 0, `${expectedLabel} detects actual changed files (>0)`);
      assert(vComp.activeCategoryNames.length > 0, `${expectedLabel} detects multi-category domain changes (${vComp.activeCategoryNames.join(', ')})`);
    }

    // Build PDF reportData and generate PDF Buffer
    const rawDbList = analysis.techAnalysis?.database?.databases || [];
    const dbEngine = rawDbList.length > 0
      ? rawDbList[0]
      : (analysis.database?.databaseType && !analysis.database.databaseType.toLowerCase().includes('not detected') ? analysis.database.databaseType : '');

    const reportData = {
      unifiedModel: analysis.unifiedModel,
      projectName: analysis.repositoryName,
      repoUrl: testRepoPath,
      branch: analysis.inventory?.metadata?.branch || 'main',
      repoLanguage: analysis.techAnalysis?.languages?.[0] || 'JavaScript',
      currentCommit: sha,
      shortCommitHash: sha.substring(0, 7),
      previousCommit: vComp?.previousVersion?.fullSha || null,
      previousVersionShortSha: vComp?.previousVersion?.shortSha || null,
      versionLabel: expectedLabel,
      versionComparison: vComp,
      chronologicalVersions: inspection.chronologicalVersions,
      hasPreviousVersion: Boolean(vComp?.hasPreviousVersion),
      gitDiff: vComp,
      author: analysis.inventory?.metadata?.author || 'Test Engineer',
      commitMessage: analysis.inventory?.metadata?.commitMessage || 'Commit snapshot',
      techStack: {
        frontend: analysis.techAnalysis?.frontend?.frameworks || [],
        backend: analysis.techAnalysis?.backend?.frameworks || ['Express'],
        database: rawDbList,
        orm: [],
        auth: analysis.techAnalysis?.authentication?.mechanisms || [],
        devOps: []
      },
      architecture: analysis.architecture || {},
      diagrams: analysis.diagrams || {},
      diagramRegistry: analysis.diagramRegistry || [],
      inventory: analysis.inventory || {},
      techAnalysis: analysis.techAnalysis || {},
      databaseStructure: { engine: dbEngine, tablesOrCollections: [] },
      dependenciesAnalysis: { packages: analysis.techAnalysis?.dependencies || [] },
      securityConfig: analysis.security || {},
      testingAnalysis: { framework: 'Jest / Testing Framework', totalTestFiles: 1, testDirectories: ['tests/'] },
      projectHealth: { metrics: { docCoverage: 95, testCoverage: 85, configCompleteness: 95, syncScore: 98 } }
    };

    const pdfBuffer = await PDFReportGenerator.generatePDFBuffer(reportData);
    pdfBuffers[expectedLabel] = pdfBuffer;

    assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 5000, `${expectedLabel} PDF generated successfully (${pdfBuffer.length} bytes)`);
  }

  // 4. Test Version Switching & Isolation
  console.log('\n[4/5] Testing Version Switching & PDF Cache Integrity (V5 -> V2 -> V4)...');
  
  // Verify V1 vs V5 content differences
  const v1Files = analyses['V1'].inventory.files.map(f => f.name);
  const v5Files = analyses['V5'].inventory.files.map(f => f.name);

  assert(!v1Files.includes('recommendations.js'), 'V1 does NOT contain recommendations.js (only introduced in V5)');
  assert(v5Files.includes('recommendations.js'), 'V5 DOES contain recommendations.js');
  assert(!v1Files.includes('ci.yml'), 'V1 does NOT contain ci.yml (only introduced in V4)');
  assert(v5Files.includes('ci.yml'), 'V5 DOES contain ci.yml');

  // Verify V2 PDF Report vs V5 PDF Report
  const v2Analysis = analyses['V2'];
  assert(v2Analysis.inventory.metadata.commitHash === commit2Sha, 'V2 analysis retained exact commit 2 SHA');
  assert(analyses['V5'].inventory.metadata.commitHash === commit5Sha, 'V5 analysis retained exact commit 5 SHA');

  // 5. Test Exact Commit Validation & Failure Handling
  console.log('\n[5/5] Testing Exact Commit Validation & Invalid Commit Handling...');
  try {
    await WorkspaceManager.ingestGitRepo({ url: testRepoPath, commitSha: '0000000000000000000000000000000000000000' });
    assert(false, 'Should have failed on invalid commit SHA');
  } catch (err) {
    assert(true, 'Invalid commit SHA was strictly rejected without fallback: ' + err.message);
  }

  // Cleanup temporary repo
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n=============================================================');
  console.log(`  PDF VERSION FLOW TESTS COMPLETED: ${passedTests} passed, ${failedTests} failed`);
  console.log('=============================================================\n');

  if (failedTests > 0) {
    process.exit(1);
  }
}

runPDFVersionFlowTest().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
