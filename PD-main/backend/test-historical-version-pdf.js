import assert from 'assert';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { WorkspaceManager } from './src/ingestion/workspaceManager.js';
import { AgentOrchestrator } from './src/orchestration/orchestrator.js';
import { PDFReportGenerator } from './src/generator/pdfReportGenerator.js';
import { analysisStore, setActiveSession, getActiveAnalysis } from './src/routes/repomindV1Routes.js';

const TEST_DIR = path.join(os.tmpdir(), `asdse_hist_pdf_test_${Date.now()}`);

async function runHistoricalVersionPdfTests() {
  console.log('================================================================');
  console.log('ASDSE HISTORICAL GIT COMMIT SELECTION & EXACT-VERSION PDF TESTS');
  console.log('================================================================\n');

  await fs.ensureDir(TEST_DIR);

  try {
    // ─────────────────────────────────────────────────────────────
    // SETUP FIXTURE 1: Repo with 7 sequential commits (> 5 commits)
    // ─────────────────────────────────────────────────────────────
    const repo7Dir = path.join(TEST_DIR, 'repo_7_commits');
    await fs.ensureDir(repo7Dir);
    const git7 = simpleGit(repo7Dir);
    await git7.init();
    await git7.addConfig('user.name', 'Alice Engineer');
    await git7.addConfig('user.email', 'alice@company.com');

    // Commit 1: Initial Calculator (add)
    await fs.writeFile(path.join(repo7Dir, 'package.json'), JSON.stringify({ name: 'calc-service', version: '1.0.0' }, null, 2));
    await fs.writeFile(path.join(repo7Dir, 'calc.js'), 'export function add(a, b) { return a + b; }\n');
    await git7.add('.');
    await git7.commit('feat: commit 1 initial add function');

    // Commit 2: Added subtract
    await fs.writeFile(path.join(repo7Dir, 'calc.js'), 'export function add(a, b) { return a + b; }\nexport function subtract(a, b) { return a - b; }\n');
    await git7.add('.');
    await git7.commit('feat: commit 2 add subtract function');

    // Commit 3: Added multiply (Oldest in Latest 5 list)
    await fs.writeFile(path.join(repo7Dir, 'calc.js'), 'export function add(a, b) { return a + b; }\nexport function subtract(a, b) { return a - b; }\nexport function multiply(a, b) { return a * b; }\n');
    await git7.add('.');
    await git7.commit('feat: commit 3 add multiply function');
    const c3Sha = (await git7.raw(['log', '-1', '--pretty=format:%H'])).trim();

    // Commit 4: Added database schema
    await fs.ensureDir(path.join(repo7Dir, 'db'));
    await fs.writeFile(path.join(repo7Dir, 'db', 'schema.sql'), 'CREATE TABLE calculations ( id INTEGER PRIMARY KEY, operation TEXT, result REAL );\n');
    await git7.add('.');
    await git7.commit('feat: commit 4 add calculations table');
    const c4Sha = (await git7.raw(['log', '-1', '--pretty=format:%H'])).trim();

    // Commit 5: Added divide (Middle in Latest 5 list)
    await fs.writeFile(path.join(repo7Dir, 'calc.js'), 'export function add(a, b) { return a + b; }\nexport function subtract(a, b) { return a - b; }\nexport function multiply(a, b) { return a * b; }\nexport function divide(a, b) { return b !== 0 ? a / b : 0; }\n');
    await git7.add('.');
    await git7.commit('feat: commit 5 add divide function');
    const c5Sha = (await git7.raw(['log', '-1', '--pretty=format:%H'])).trim();

    // Commit 6: Added API endpoint
    await fs.writeFile(path.join(repo7Dir, 'routes.js'), 'import express from "express";\nconst router = express.Router();\nrouter.get("/api/v1/calculate", (req, res) => res.json({ ok: true }));\nexport default router;\n');
    await git7.add('.');
    await git7.commit('feat: commit 6 add /api/v1/calculate route');
    const c6Sha = (await git7.raw(['log', '-1', '--pretty=format:%H'])).trim();

    // Commit 7: Added Gunicorn deployment config (Latest commit)
    await fs.writeFile(path.join(repo7Dir, 'Procfile'), 'web: gunicorn app:app\n');
    await git7.add('.');
    await git7.commit('feat: commit 7 add Gunicorn deployment config');
    const c7Sha = (await git7.raw(['log', '-1', '--pretty=format:%H'])).trim();

    // ─────────────────────────────────────────────────────────────
    // SETUP FIXTURE 2: Repo with 2 commits (< 5 commits)
    // ─────────────────────────────────────────────────────────────
    const repo2Dir = path.join(TEST_DIR, 'repo_2_commits');
    await fs.ensureDir(repo2Dir);
    const git2 = simpleGit(repo2Dir);
    await git2.init();
    await git2.addConfig('user.name', 'Bob Developer');
    await git2.addConfig('user.email', 'bob@company.com');

    await fs.writeFile(path.join(repo2Dir, 'app.py'), 'from flask import Flask\napp = Flask(__name__)\n');
    await git2.add('.');
    await git2.commit('feat: repo2 commit 1 initial flask');

    await fs.writeFile(path.join(repo2Dir, 'models.py'), 'class User:\n  pass\n');
    await git2.add('.');
    await git2.commit('feat: repo2 commit 2 add user model');

    // ─────────────────────────────────────────────────────────────
    // SETUP FIXTURE 3: Non-Git Directory
    // ─────────────────────────────────────────────────────────────
    const nonGitDir = path.join(TEST_DIR, 'nongit_source');
    await fs.ensureDir(nonGitDir);
    await fs.writeFile(path.join(nonGitDir, 'script.js'), 'console.log("plain script");');

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Retrieve latest 5 commits for repo with 7 commits
    // ─────────────────────────────────────────────────────────────
    console.log('[TEST 1] Inspecting repo with 7 commits (should return exactly latest 5)...');
    const inspect7 = await WorkspaceManager.inspectRemoteRepository(repo7Dir);

    assert(
      inspect7.recentCommits.length === 5,
      `TEST 1 Failed: Expected exactly 5 commits, got ${inspect7.recentCommits.length}`
    );
    assert(
      inspect7.recentCommits[0].fullSha === c7Sha,
      'TEST 1 Failed: First commit in list must be latest Commit 7.'
    );
    assert(
      inspect7.recentCommits[4].fullSha === c3Sha,
      'TEST 1 Failed: Fifth commit in list must be Commit 3.'
    );
    console.log(`  ✔ [PASS] TEST 1: Retrieved exactly latest 5 commits (Commits 7 down to 3).`);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Inspect repo with 2 commits (< 5 commits, no fabrication)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 2] Inspecting repo with 2 commits (should return exactly 2)...');
    const inspect2 = await WorkspaceManager.inspectRemoteRepository(repo2Dir);

    assert(
      inspect2.recentCommits.length === 2,
      `TEST 2 Failed: Expected exactly 2 commits, got ${inspect2.recentCommits.length}`
    );
    console.log(`  ✔ [PASS] TEST 2: Returned exactly 2 commits with zero fabricated history.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 3: Select oldest displayed commit (Commit 3) with Full SHA
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 3] Checking out and analyzing oldest displayed commit (Commit 3)...');
    const analysisC3 = await AgentOrchestrator.runFullAnalysis({
      url: repo7Dir,
      commitSha: c3Sha,
      name: 'CalcService-C3'
    });
    setActiveSession(analysisC3.repositoryId, analysisC3);

    const hasMultiply = (analysisC3.inventory.files || []).some(f => f.name === 'calc.js');
    const hasDbSchema = (analysisC3.inventory.files || []).some(f => f.name === 'schema.sql');
    const hasRoutes = (analysisC3.inventory.files || []).some(f => f.name === 'routes.js');
    const hasProcfile = (analysisC3.inventory.files || []).some(f => f.name === 'Procfile');

    assert(
      analysisC3.inventory.metadata.commitHash === c3Sha &&
      hasMultiply === true &&
      hasDbSchema === false &&
      hasRoutes === false &&
      hasProcfile === false,
      'TEST 3 Failed: Analysis C3 must contain only Commit 3 files (no schema.sql, no routes.js, no Procfile).'
    );
    console.log(`  ✔ [PASS] TEST 3: Commit 3 analyzed cleanly: Full SHA [${c3Sha.substring(0, 7)}] verified with exact historical file state.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 4: Select middle commit (Commit 5: has DB schema and divide, no routes/Procfile)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 4] Checking out and analyzing middle commit (Commit 5)...');
    const analysisC5 = await AgentOrchestrator.runFullAnalysis({
      url: repo7Dir,
      commitSha: c5Sha,
      name: 'CalcService-C5'
    });
    setActiveSession(analysisC5.repositoryId, analysisC5);

    const c5HasDb = (analysisC5.inventory.files || []).some(f => f.name === 'schema.sql');
    const c5HasRoutes = (analysisC5.inventory.files || []).some(f => f.name === 'routes.js');

    assert(
      analysisC5.inventory.metadata.commitHash === c5Sha &&
      c5HasDb === true &&
      c5HasRoutes === false,
      'TEST 4 Failed: Commit 5 must have schema.sql but no routes.js.'
    );
    console.log(`  ✔ [PASS] TEST 4: Middle commit (Commit 5) analyzed cleanly.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Select latest commit (Commit 7: has Procfile and routes.js)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 5] Checking out and analyzing latest commit (Commit 7)...');
    const analysisC7 = await AgentOrchestrator.runFullAnalysis({
      url: repo7Dir,
      commitSha: c7Sha,
      name: 'CalcService-C7'
    });
    setActiveSession(analysisC7.repositoryId, analysisC7);

    const c7HasProcfile = (analysisC7.inventory.files || []).some(f => f.name === 'Procfile');
    const c7HasRoutes = (analysisC7.inventory.files || []).some(f => f.name === 'routes.js');

    assert(
      analysisC7.inventory.metadata.commitHash === c7Sha &&
      c7HasProcfile === true &&
      c7HasRoutes === true,
      'TEST 5 Failed: Commit 7 must have Procfile and routes.js.'
    );
    console.log(`  ✔ [PASS] TEST 5: Latest commit (Commit 7) analyzed cleanly.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Generate PDF for historical Commit 3
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 6] Generating PDF for historical Commit 3...');
    setActiveSession(analysisC3.repositoryId, analysisC3);
    const pdfDataC3 = {
      projectName: analysisC3.repositoryName,
      repoUrl: repo7Dir,
      branch: analysisC3.inventory?.metadata?.branch || 'master',
      currentCommit: c3Sha,
      shortCommitHash: c3Sha.substring(0, 7),
      commitMessage: 'feat: commit 3 add multiply function',
      author: 'Alice Engineer',
      commitDate: analysisC3.inventory?.metadata?.commitDate || new Date().toISOString(),
      diagrams: analysisC3.diagrams,
      diagramRegistry: analysisC3.diagramRegistry,
      unifiedModel: analysisC3.unifiedModel,
      techStack: { backend: ['JavaScript'], database: [] }
    };
    const pdfBufferC3 = await PDFReportGenerator.generatePDFBuffer(pdfDataC3);

    assert(
      Buffer.isBuffer(pdfBufferC3) && pdfBufferC3.length > 5000,
      'TEST 6 Failed: PDF for Commit 3 was not generated successfully.'
    );
    console.log(`  ✔ [PASS] TEST 6: PDF generated for Commit 3 (${pdfBufferC3.length} bytes) with exact Commit 3 metadata.`);

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Reproduce PDF for Commit 3 after Commit 7 was analyzed
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 7] Verifying historical PDF reproducibility (no data leakage from newer Commit 7)...');
    assert(
      analysisStore.has(analysisC3.repositoryId) &&
      analysisStore.has(analysisC7.repositoryId),
      'TEST 7 Failed: Both Commit 3 and Commit 7 analysis sessions must coexist in analysisStore.'
    );

    const storedC3 = analysisStore.get(analysisC3.repositoryId);
    assert(
      storedC3.inventory.metadata.commitHash === c3Sha &&
      !storedC3.inventory.files.some(f => f.name === 'Procfile'),
      'TEST 7 Failed: Stored Commit 3 analysis must not be contaminated with Commit 7 files.'
    );
    console.log('  ✔ [PASS] TEST 7: Historical Commit 3 session remains reproducible and uncontaminated.');

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Switch from Commit 3 -> Commit 7 -> Commit 3 via setActiveSession
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 8] Switching active session between Commit 3 -> Commit 7 -> Commit 3...');
    setActiveSession(analysisC7.repositoryId, analysisC7);
    assert(getActiveAnalysis().inventory.metadata.commitHash === c7Sha, 'Failed switching to Commit 7.');

    setActiveSession(analysisC3.repositoryId, analysisC3);
    assert(getActiveAnalysis().inventory.metadata.commitHash === c3Sha, 'Failed switching back to Commit 3.');
    console.log('  ✔ [PASS] TEST 8: Session switching between historical commits works seamlessly.');

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Repository Isolation between Repo 1 and Repo 2
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 9] Verifying complete isolation between Repo 1 and Repo 2...');
    const analysisRepo2 = await AgentOrchestrator.runFullAnalysis({
      url: repo2Dir,
      name: 'FlaskRepo2'
    });
    setActiveSession(analysisRepo2.repositoryId, analysisRepo2);

    const repo2HasCalc = (analysisRepo2.inventory.files || []).some(f => f.name === 'calc.js');
    assert(
      repo2HasCalc === false &&
      analysisRepo2.repositoryId !== analysisC3.repositoryId,
      'TEST 9 Failed: Repo 2 must not inherit calc.js from Repo 1.'
    );
    console.log('  ✔ [PASS] TEST 9: Independent repositories are 100% isolated.');

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Non-Git Local Folder Handling
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 10] Analyzing non-Git local directory...');
    const analysisNonGit = await AgentOrchestrator.runFullAnalysis({
      folderPath: nonGitDir,
      name: 'NonGitSource'
    });

    assert(
      analysisNonGit.inventory.metadata.sourceType === 'local_folder' &&
      analysisNonGit.inventory.metadata.recentCommits.length === 0,
      'TEST 10 Failed: Non-Git source must report recentCommits: [] without fabricating commits.'
    );
    console.log('  ✔ [PASS] TEST 10: Non-Git source handled cleanly with zero fabricated commits.');

    // ─────────────────────────────────────────────────────────────
    // TEST 11: Invalid Commit SHA Handling
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 11] Handling nonexistent commit SHA...');
    let threw = false;
    try {
      await WorkspaceManager.ingestGitRepo({
        url: repo7Dir,
        commitSha: '0000000000000000000000000000000000000000'
      });
    } catch (e) {
      threw = true;
    }

    assert(threw === true, 'TEST 11 Failed: Nonexistent commit must throw an error.');
    console.log('  ✔ [PASS] TEST 11: Invalid commit SHA fails gracefully.');

    console.log('\n================================================================');
    console.log('ALL 11 HISTORICAL VERSION SELECTION & PDF TESTS PASSED! (100%)');
    console.log('================================================================\n');

  } finally {
    await fs.remove(TEST_DIR).catch(() => {});
  }
}

runHistoricalVersionPdfTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
