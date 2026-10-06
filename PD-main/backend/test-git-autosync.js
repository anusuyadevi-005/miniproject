import assert from 'assert';
import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { GitChangeDetector, gitBaselineTracker } from './src/asdse/gitChangeDetector.js';
import { WorkspaceManager } from './src/ingestion/workspaceManager.js';
import { AgentOrchestrator } from './src/orchestration/orchestrator.js';
import { ASDSESyncEngine } from './src/asdse/syncEngine.js';
import { SEMANTIC_CATEGORIES } from './src/classifier/semanticClassifier.js';
import { db } from './src/db/store.js';

const TEST_DIR = path.join(os.tmpdir(), `asdse_autosync_test_${Date.now()}`);

async function runAutoSyncTests() {
  console.log('================================================================');
  console.log('ASDSE AUTOMATIC GIT CHANGE DETECTION & SYNC TEST SUITE');
  console.log('================================================================\n');

  await fs.ensureDir(TEST_DIR);

  try {
    // ─────────────────────────────────────────────────────────────
    // SETUP FIXTURE 1: Remote-like Git Repo A with 2 sequential commits
    // ─────────────────────────────────────────────────────────────
    const repoARoot = path.join(TEST_DIR, 'origin_repo_a');
    await fs.ensureDir(repoARoot);
    const gitA = simpleGit(repoARoot);
    await gitA.init();
    await gitA.addConfig('user.name', 'RepoA Author');
    await gitA.addConfig('user.email', 'author@repoa.com');

    // Commit 1 (Baseline)
    await fs.writeFile(path.join(repoARoot, 'package.json'), JSON.stringify({ name: 'repo-a', version: '1.0.0' }));
    await fs.ensureDir(path.join(repoARoot, 'src'));
    await fs.writeFile(
      path.join(repoARoot, 'src', 'authService.js'),
      'export function authenticate(username, password) {\n  return username === "admin";\n}\n'
    );
    await gitA.add('.');
    await gitA.commit('feat(auth): initial authentication service');
    const commit1Log = await gitA.raw(['log', '-1', '--pretty=format:%H|%h|%s|%an|%ad']);
    const [commit1FullSha, commit1ShortSha, commit1Msg, commit1Author, commit1Date] = commit1Log.split('|');

    // ─────────────────────────────────────────────────────────────
    // SETUP FIXTURE 2: Non-Git Local Folder
    // ─────────────────────────────────────────────────────────────
    const nonGitDir = path.join(TEST_DIR, 'non_git_folder');
    await fs.ensureDir(nonGitDir);
    await fs.writeFile(path.join(nonGitDir, 'index.js'), 'console.log("no git here");');

    // ─────────────────────────────────────────────────────────────
    // SETUP FIXTURE 3: Isolated Repo B
    // ─────────────────────────────────────────────────────────────
    const repoBRoot = path.join(TEST_DIR, 'origin_repo_b');
    await fs.ensureDir(repoBRoot);
    const gitB = simpleGit(repoBRoot);
    await gitB.init();
    await gitB.addConfig('user.name', 'RepoB Author');
    await gitB.addConfig('user.email', 'author@repob.com');
    await fs.writeFile(path.join(repoBRoot, 'calculator.py'), 'def add(a, b): return a + b\n');
    await gitB.add('.');
    await gitB.commit('feat: calculator module');

    // ─────────────────────────────────────────────────────────────
    // TEST 1: Valid Git repository initialization & default branch detection
    // ─────────────────────────────────────────────────────────────
    console.log('[TEST 1] Valid Git repository initialization & default branch detection...');
    const analysisA = await AgentOrchestrator.runFullAnalysis({
      folderPath: repoARoot,
      name: 'RepoA'
    });

    assert(
      analysisA.success === true && analysisA.repositoryId,
      'TEST 1 Failed: Repository A was not initialized successfully.'
    );
    console.log('  ✔ [PASS] TEST 1: Repository initialized with ID: ' + analysisA.repositoryId);

    // ─────────────────────────────────────────────────────────────
    // TEST 2: Baseline Commit Storage
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 2] Baseline commit storage in GitBaselineTracker...');
    const baselineA = gitBaselineTracker.getBaseline(analysisA.repositoryId);

    assert(
      baselineA !== null &&
      baselineA.repositoryId === analysisA.repositoryId &&
      baselineA.baselineCommit.shortSha,
      'TEST 2 Failed: Baseline record was not properly stored.'
    );
    console.log(`  ✔ [PASS] TEST 2: Stored baseline commit [${baselineA.baselineCommit.shortSha}] for repo [${baselineA.repoName}].`);

    // ─────────────────────────────────────────────────────────────
    // TEST 3: No-Change Detection (Up to date)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 3] Checking repository with NO new commits...');
    const noChangeCheck = await GitChangeDetector.checkForChanges(analysisA.repositoryId);

    assert(
      noChangeCheck.hasChanges === false,
      'TEST 3 Failed: Should report no changes when commit SHA matches baseline.'
    );
    console.log('  ✔ [PASS] TEST 3: Correctly reports no changes when repository is at baseline commit.');

    // ─────────────────────────────────────────────────────────────
    // TEST 4: New Commit Detection
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 4] Introducing new commit and testing change detection...');
    // Create Commit 2 in Repo A
    await fs.writeFile(
      path.join(repoARoot, 'src', 'authService.js'),
      'export function authenticate(username, password, rememberMe = false) {\n  return username === "admin" && Boolean(password);\n}\n'
    );
    await gitA.add('.');
    await gitA.commit('feat(auth): add rememberMe parameter and password check');
    const commit2Log = await gitA.raw(['log', '-1', '--pretty=format:%H|%h|%s|%an|%ad']);
    const [commit2FullSha, commit2ShortSha, commit2Msg] = commit2Log.split('|');

    // Simulate baseline pointing to Commit 1 and remote having Commit 2
    baselineA.sourceType = 'git';
    baselineA.hasGitMetadata = true;
    baselineA.repoUrl = repoARoot;
    baselineA.workspacePath = repoARoot;
    baselineA.branch = 'master';
    baselineA.baselineCommit = {
      fullSha: commit1FullSha,
      shortSha: commit1ShortSha,
      message: commit1Msg,
      author: commit1Author,
      date: commit1Date
    };

    const changeDetected = await GitChangeDetector.checkForChanges(analysisA.repositoryId);

    assert(
      changeDetected.hasChanges === true &&
      changeDetected.status === 'NEW_COMMIT_DETECTED' &&
      changeDetected.newCommit.shortSha === commit2ShortSha,
      'TEST 4 Failed: New commit was not properly detected.'
    );
    console.log(`  ✔ [PASS] TEST 4: Detected new commit [${changeDetected.newCommit.shortSha}] ("${changeDetected.newCommit.message}").`);

    // ─────────────────────────────────────────────────────────────
    // TEST 5: Trigger Existing ASDSE Synchronization Pipeline Automatically
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 5] Executing automated ASDSE synchronization on new commit...');
    const autoSyncResult = await GitChangeDetector.autoSyncRepository(analysisA.repositoryId);

    assert(
      autoSyncResult.success === true &&
      autoSyncResult.status === 'SYNCHRONIZED' &&
      baselineA.baselineCommit.fullSha === commit2FullSha &&
      baselineA.syncStatus === 'SYNCHRONIZED',
      'TEST 5 Failed: Automated synchronization pipeline did not complete or advance baseline.'
    );
    console.log('  ✔ [PASS] TEST 5: ASDSE pipeline executed; baseline advanced to new commit: ' + commit2ShortSha);

    // ─────────────────────────────────────────────────────────────
    // TEST 6: Previous Commit -> New Commit Comparison Tracking
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 6] Verifying previous-version synchronization history...');
    assert(
      baselineA.history.length > 0 &&
      baselineA.history[0].previousCommitSha === commit1FullSha &&
      baselineA.history[0].newCommitSha === commit2FullSha &&
      baselineA.history[0].status === 'SYNCHRONIZED',
      'TEST 6 Failed: Synchronization history does not correctly link previous commit to new commit.'
    );
    console.log('  ✔ [PASS] TEST 6: Previous-version history verified (Commit 1 -> Commit 2 mapped).');

    // ─────────────────────────────────────────────────────────────
    // TEST 7: Synchronization Failure Safety (Baseline NOT Overwritten)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 7] Testing synchronization failure safety handling...');
    const fakeRepoId = 'ws_safety_test';
    const safetyBaseline = gitBaselineTracker.registerBaseline({
      repositoryId: fakeRepoId,
      repoUrl: repoARoot,
      repoName: 'SafetyTestRepo',
      workspacePath: repoARoot,
      sourceType: 'git',
      branch: 'master',
      commitHash: commit2FullSha,
      shortCommitHash: commit2ShortSha,
      commitMessage: 'Stable Baseline Commit',
      author: 'Author',
      commitDate: new Date().toISOString()
    });

    // Intentionally trigger sync with invalid verification state
    const originalVerify = ASDSESyncEngine.syncCommitChanges;
    ASDSESyncEngine.syncCommitChanges = async () => ({
      status: 'FAILED_VERIFICATION',
      verification: { isVerified: false, failures: ['Intentional consistency check failure for safety test'] },
      regeneratedDocs: [],
      affectedSDIDs: []
    });

    try {
      // Simulate new commit check
      safetyBaseline.baselineCommit = { fullSha: commit1FullSha, shortSha: commit1ShortSha };
      const failedSync = await GitChangeDetector.autoSyncRepository(fakeRepoId);

      assert(
        failedSync.success === false &&
        failedSync.status === 'SYNC_FAILED' &&
        safetyBaseline.baselineCommit.fullSha === commit1FullSha,
        'TEST 7 Failed: Failed synchronization must NEVER overwrite or advance baseline commit.'
      );
      console.log('  ✔ [PASS] TEST 7: Safety verified: Failed synchronization preserved previous baseline commit.');
    } finally {
      // Restore original method
      ASDSESyncEngine.syncCommitChanges = originalVerify;
    }

    // ─────────────────────────────────────────────────────────────
    // TEST 8: Multiple Repositories Isolation
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 8] Verifying repository isolation across distinct repositories...');
    const analysisB = await AgentOrchestrator.runFullAnalysis({
      folderPath: repoBRoot,
      name: 'RepoB'
    });

    const baselineB = gitBaselineTracker.getBaseline(analysisB.repositoryId);
    const baselineARefresh = gitBaselineTracker.getBaseline(analysisA.repositoryId);

    assert(
      baselineB.repositoryId !== baselineARefresh.repositoryId &&
      baselineB.repoName !== baselineARefresh.repoName,
      'TEST 8 Failed: Repository baselines must be isolated and never cross-pollinate.'
    );
    console.log('  ✔ [PASS] TEST 8: Repository A and Repository B baselines are strictly isolated.');

    // ─────────────────────────────────────────────────────────────
    // TEST 9: Repository Without Git Metadata (Local Folder / ZIP)
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 9] Handling non-Git source (Local folder / ZIP upload)...');
    const analysisNonGit = await AgentOrchestrator.runFullAnalysis({
      folderPath: nonGitDir,
      name: 'NonGitFolder'
    });

    const nonGitCheck = await GitChangeDetector.checkForChanges(analysisNonGit.repositoryId);
    assert(
      nonGitCheck.hasChanges === false &&
      nonGitCheck.status === 'UNAVAILABLE' &&
      nonGitCheck.hasGitMetadata === false,
      'TEST 9 Failed: Non-Git repository must report UNAVAILABLE with clear message.'
    );
    console.log('  ✔ [PASS] TEST 9: Non-Git source gracefully reports automatic sync unavailable.');

    // ─────────────────────────────────────────────────────────────
    // TEST 10: Invalid / Unavailable Repository URL Handling
    // ─────────────────────────────────────────────────────────────
    console.log('\n[TEST 10] Handling invalid or unreachable repository...');
    let threw = false;
    try {
      await WorkspaceManager.ingestGitRepo({
        url: 'https://invalid-host-domain-xyz-1234.com/not-exist/repo.git',
        branch: 'main'
      });
    } catch (e) {
      threw = true;
    }

    assert(threw === true, 'TEST 10 Failed: Invalid repository must fail gracefully.');
    console.log('  ✔ [PASS] TEST 10: Invalid/unreachable repository correctly handled with clear error.');

    console.log('\n================================================================');
    console.log('ALL 10 AUTOMATIC GIT CHANGE DETECTION & SYNC TESTS PASSED! (100%)');
    console.log('================================================================\n');

  } finally {
    await fs.remove(TEST_DIR).catch(() => {});
  }
}

runAutoSyncTests().catch(err => {
  console.error('Test suite execution failed:', err);
  process.exit(1);
});
