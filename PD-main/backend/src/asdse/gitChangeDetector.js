import path from 'path';
import fs from 'fs-extra';
import simpleGit from 'simple-git';
import { ASDSESyncEngine } from './syncEngine.js';
import { analysisStore } from '../routes/repomindV1Routes.js';

/**
 * GitBaselineTracker: Maintains synchronized baseline records for each tracked repository workspace.
 * Prevents cross-repository pollution and tracks previous/active commits safely.
 */
class GitBaselineTracker {
  constructor() {
    this.baselines = new Map();
  }

  registerBaseline({
    repositoryId,
    repoUrl = '',
    repoName = '',
    workspacePath = '',
    sourceType = 'git',
    branch = '',
    defaultBranch = '',
    commitHash = '',
    shortCommitHash = '',
    commitMessage = '',
    author = '',
    commitDate = ''
  }) {
    if (!repositoryId) return null;

    const hasGitMetadata = sourceType === 'git' && Boolean(commitHash && commitHash !== 'local_head' && commitHash !== 'zip_upload');

    const baselineRecord = {
      repositoryId,
      repoUrl: repoUrl || '',
      repoName: repoName || path.basename(repoUrl || workspacePath || 'repository', '.git'),
      workspacePath: workspacePath || '',
      sourceType: sourceType || 'git',
      hasGitMetadata,
      branch: branch || defaultBranch || (hasGitMetadata ? 'main' : ''),
      defaultBranch: defaultBranch || branch || '',
      baselineCommit: {
        fullSha: commitHash || (hasGitMetadata ? '' : 'non_git_snapshot'),
        shortSha: shortCommitHash || (commitHash ? commitHash.substring(0, 7) : (hasGitMetadata ? '' : 'local')),
        message: commitMessage || 'Initial repository baseline snapshot',
        author: author || 'Developer',
        date: commitDate || new Date().toISOString()
      },
      latestDetectedCommit: {
        fullSha: commitHash || '',
        shortSha: shortCommitHash || (commitHash ? commitHash.substring(0, 7) : ''),
        message: commitMessage || 'Initial repository baseline snapshot',
        author: author || 'Developer',
        date: commitDate || new Date().toISOString()
      },
      syncStatus: hasGitMetadata ? 'UP_TO_DATE' : 'UNAVAILABLE',
      lastCheckedAt: new Date().toISOString(),
      lastSyncedAt: new Date().toISOString(),
      history: []
    };

    this.baselines.set(repositoryId, baselineRecord);
    console.log(`[GitBaselineTracker] Baseline registered for ${repositoryId} (${baselineRecord.repoName}) [Branch: ${baselineRecord.branch}, Commit: ${baselineRecord.baselineCommit.shortSha}]`);
    return baselineRecord;
  }

  getBaseline(repositoryId) {
    if (!repositoryId) {
      if (this.baselines.size > 0) {
        const all = Array.from(this.baselines.values());
        return all[all.length - 1];
      }
      return null;
    }
    return this.baselines.get(repositoryId) || null;
  }

  getAllBaselines() {
    return Array.from(this.baselines.values());
  }

  clear() {
    this.baselines.clear();
  }
}

export const gitBaselineTracker = new GitBaselineTracker();

/**
 * GitChangeDetector:
 * Automatic Git change detection engine for ASDSE / RepoMind.
 * Automatically discovers remote repository default branch, detects new commits,
 * tracks previous baseline commit SHAs, and triggers the ASDSE selective synchronization pipeline.
 */
export class GitChangeDetector {
  /**
   * Checks if the tracked repository has newer commits on remote compared to the baseline commit SHA.
   */
  static async checkForChanges(repositoryId) {
    const baseline = gitBaselineTracker.getBaseline(repositoryId);
    if (!baseline) {
      return {
        hasChanges: false,
        status: 'NOT_FOUND',
        message: `No baseline registered for repository ID '${repositoryId}'.`
      };
    }

    if (!baseline.hasGitMetadata || baseline.sourceType !== 'git') {
      return {
        hasChanges: false,
        hasGitMetadata: false,
        status: 'UNAVAILABLE',
        repositoryId: baseline.repositoryId,
        repoName: baseline.repoName,
        sourceType: baseline.sourceType,
        message: 'Automatic Git synchronization is unavailable for this non-Git source.'
      };
    }

    if (!baseline.workspacePath || !await fs.pathExists(baseline.workspacePath)) {
      return {
        hasChanges: false,
        status: 'WORKSPACE_MISSING',
        repositoryId: baseline.repositoryId,
        message: 'Workspace directory does not exist or has been cleaned up.'
      };
    }

    const gitDir = path.join(baseline.workspacePath, '.git');
    if (!await fs.pathExists(gitDir)) {
      return {
        hasChanges: false,
        hasGitMetadata: false,
        status: 'UNAVAILABLE',
        repositoryId: baseline.repositoryId,
        message: 'Repository workspace does not contain Git metadata (.git folder missing).'
      };
    }

    const cleanUrl = baseline.repoUrl.trim();
    const branch = baseline.branch;
    const git = simpleGit(baseline.workspacePath);

    console.log(`[GitChangeDetector] Checking remote changes for ${baseline.repoName} [URL: ${cleanUrl}, Branch: ${branch}]...`);

    try {
      // 1. Query remote head for the tracked branch
      const rawHeads = await git.raw(['ls-remote', cleanUrl, `refs/heads/${branch}`]);
      let remoteCommitSha = null;

      const lines = (rawHeads || '').split('\n').filter(Boolean);
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        if (parts[0] && parts[1] && parts[1].includes(branch)) {
          remoteCommitSha = parts[0];
          break;
        }
      }

      // If branch head query returned nothing, query HEAD
      if (!remoteCommitSha && lines.length > 0 && lines[0]) {
        remoteCommitSha = lines[0].split(/\s+/)[0];
      }

      if (!remoteCommitSha) {
        // Safe check for HEAD
        try {
          const rawHead = await git.raw(['ls-remote', cleanUrl, 'HEAD']);
          if (rawHead) {
            remoteCommitSha = rawHead.trim().split(/\s+/)[0];
          }
        } catch (headErr) {
          // Ignore
        }
      }

      if (!remoteCommitSha) {
        console.warn(`[GitChangeDetector] Could not resolve remote commit SHA for branch '${branch}'.`);
        return {
          hasChanges: false,
          status: 'REMOTE_BRANCH_UNRESOLVED',
          repositoryId: baseline.repositoryId,
          branch,
          message: `Remote branch '${branch}' could not be resolved from upstream origin.`
        };
      }

      const baselineSha = baseline.baselineCommit.fullSha;
      baseline.lastCheckedAt = new Date().toISOString();

      if (baselineSha === remoteCommitSha) {
        console.log(`[GitChangeDetector] Repository ${baseline.repoName} is UP TO DATE with commit ${baselineSha.substring(0, 7)}.`);
        baseline.syncStatus = 'UP_TO_DATE';
        return {
          hasChanges: false,
          status: 'UP_TO_DATE',
          repositoryId: baseline.repositoryId,
          repoUrl: baseline.repoUrl,
          branch,
          baselineCommit: baseline.baselineCommit,
          latestCommit: baseline.baselineCommit,
          message: `Repository is up to date (Commit: ${baseline.baselineCommit.shortSha}).`
        };
      }

      // 2. New remote commit detected!
      console.log(`[GitChangeDetector] NEW COMMIT DETECTED for ${baseline.repoName}: ${baselineSha.substring(0, 7)} -> ${remoteCommitSha.substring(0, 7)}`);

      // Fetch remote metadata safely
      let newCommitDetails = {
        fullSha: remoteCommitSha,
        shortSha: remoteCommitSha.substring(0, 7),
        message: 'Remote Git Update',
        author: 'Git Author',
        date: new Date().toISOString()
      };

      try {
        await git.fetch('origin', branch, ['--depth', '5']);
        const logOut = await git.raw(['log', '-1', '--pretty=format:%H|%h|%s|%an|%ad|%aI', remoteCommitSha]);
        if (logOut) {
          const [fullSha, shortSha, message, author, date, isoDate] = logOut.split('|');
          newCommitDetails = {
            fullSha: fullSha || remoteCommitSha,
            shortSha: shortSha || remoteCommitSha.substring(0, 7),
            message: message || 'Remote Git Update',
            author: author || 'Git Author',
            date: date || isoDate || new Date().toISOString()
          };
        }
      } catch (fetchErr) {
        console.warn(`[GitChangeDetector] Note while fetching remote commit details:`, fetchErr.message);
      }

      baseline.latestDetectedCommit = newCommitDetails;
      baseline.syncStatus = 'NEW_COMMIT_DETECTED';

      return {
        hasChanges: true,
        status: 'NEW_COMMIT_DETECTED',
        repositoryId: baseline.repositoryId,
        repoUrl: baseline.repoUrl,
        branch,
        baselineCommit: baseline.baselineCommit,
        newCommit: newCommitDetails,
        message: `New commit detected: ${newCommitDetails.shortSha} ("${newCommitDetails.message}")`
      };

    } catch (err) {
      console.error(`[GitChangeDetector] Error checking for remote changes on ${cleanUrl}:`, err.message);
      return {
        hasChanges: false,
        status: 'ERROR',
        repositoryId: baseline.repositoryId,
        error: err.message,
        message: `Failed to query remote changes: ${err.message}`
      };
    }
  }

  /**
   * Executes the automated change detection and ASDSE synchronization pipeline:
   * 1. Detects remote changes against baseline commit.
   * 2. Checks out the exact new commit SHA in the isolated workspace.
   * 3. Extracts file-level diffs and modified code between baseline and new commit.
   * 4. Triggers ASDSESyncEngine (AST diff -> Semantic -> SDID -> Impact Radius -> Selective Regen -> Verification).
   * 5. Advances baseline ONLY if verification succeeds.
   */
  static async autoSyncRepository(repositoryId, options = {}) {
    console.log(`\n============================================================`);
    console.log(`[ASDSE Auto-Sync] Triggering automated change detection for: ${repositoryId || 'active'}`);
    console.log(`============================================================`);

    const baseline = gitBaselineTracker.getBaseline(repositoryId);
    if (!baseline) {
      throw new Error(`No baseline registered for repository ID '${repositoryId}'.`);
    }

    if (!baseline.hasGitMetadata || baseline.sourceType !== 'git') {
      return {
        success: false,
        status: 'UNAVAILABLE',
        message: 'Automatic Git synchronization is unavailable for non-Git sources (local folder or ZIP upload).'
      };
    }

    // Step 1: Detect changes
    const changeCheck = await this.checkForChanges(repositoryId);
    if (!changeCheck.hasChanges) {
      return {
        success: true,
        status: changeCheck.status,
        message: changeCheck.message || 'Repository is already up to date. No synchronization needed.',
        baseline: baseline.baselineCommit,
        changeCheck
      };
    }

    const previousCommitSha = baseline.baselineCommit.fullSha;
    const newCommitSha = changeCheck.newCommit.fullSha;
    const newCommitInfo = changeCheck.newCommit;
    const git = simpleGit(baseline.workspacePath);

    console.log(`[ASDSE Auto-Sync] Synchronizing ${baseline.repoName}: ${previousCommitSha.substring(0, 7)} -> ${newCommitSha.substring(0, 7)}...`);
    baseline.syncStatus = 'SYNCHRONIZING';

    try {
      // Step 2: Checkout the exact new commit in the workspace
      await git.checkout(newCommitSha);

      // Step 3: Compute exact modified files between baseline and new commit
      let modifiedFiles = [];
      try {
        const diffNameOnly = await git.raw(['diff', '--name-only', previousCommitSha, newCommitSha]);
        modifiedFiles = (diffNameOnly || '').split('\n').map(s => s.trim()).filter(Boolean);
      } catch (diffErr) {
        console.warn(`[ASDSE Auto-Sync] Note parsing diff --name-only:`, diffErr.message);
      }

      // Step 4: Extract old and new code snippets for AST analysis
      let oldCode = '';
      let newCode = '';
      const primaryFile = modifiedFiles[0] || '';

      if (primaryFile) {
        try {
          oldCode = await git.raw(['show', `${previousCommitSha}:${primaryFile}`]);
        } catch (oldCodeErr) {
          oldCode = '';
        }
        try {
          newCode = await git.raw(['show', `${newCommitSha}:${primaryFile}`]);
        } catch (newCodeErr) {
          const localPath = path.join(baseline.workspacePath, primaryFile);
          if (await fs.pathExists(localPath)) {
            newCode = await fs.readFile(localPath, 'utf8');
          }
        }
      }

      // Step 5: Connect to EXISTING ASDSE Pipeline
      const syncResult = await ASDSESyncEngine.syncCommitChanges({
        repositoryId: baseline.repositoryId,
        repoUrl: baseline.repoUrl,
        branch: baseline.branch,
        commitHash: newCommitSha,
        author: newCommitInfo.author,
        commitMessage: newCommitInfo.message,
        modifiedFiles: modifiedFiles.length > 0 ? modifiedFiles : ['src/index.js'],
        oldCode,
        newCode
      });

      // Step 6: Verify result and manage baseline advancement
      if (syncResult.status === 'SYNCHRONIZED' && syncResult.verification?.isVerified !== false) {
        // ADVANCE BASELINE ONLY ON SUCCESS
        baseline.baselineCommit = newCommitInfo;
        baseline.latestDetectedCommit = newCommitInfo;
        baseline.syncStatus = 'SYNCHRONIZED';
        baseline.lastSyncedAt = new Date().toISOString();

        // Record synchronization history
        baseline.history.unshift({
          previousCommitSha,
          newCommitSha,
          timestamp: new Date().toISOString(),
          status: 'SYNCHRONIZED',
          modifiedFiles,
          affectedSDIDs: syncResult.affectedSDIDs || [],
          affectedDiagrams: (syncResult.regeneratedDocs || []).flatMap(r => r.affectedDiagrams || []),
          regeneratedDocsCount: (syncResult.regeneratedDocs || []).length,
          preservedDocsCount: syncResult.unaffectedDocsPreservedCount || 0
        });

        // Update active session metadata in analysisStore if present
        const activeAnalysis = analysisStore.get(baseline.repositoryId);
        if (activeAnalysis && activeAnalysis.inventory?.metadata) {
          activeAnalysis.inventory.metadata.commitHash = newCommitSha;
          activeAnalysis.inventory.metadata.shortCommitHash = newCommitInfo.shortSha;
          activeAnalysis.inventory.metadata.commitMessage = newCommitInfo.message;
          activeAnalysis.inventory.metadata.author = newCommitInfo.author;
          activeAnalysis.inventory.metadata.commitDate = newCommitInfo.date;
          activeAnalysis.previousCommit = previousCommitSha;
        }

        console.log(`[ASDSE Auto-Sync] SUCCESS: Baseline advanced to ${newCommitInfo.shortSha}.`);
        return {
          success: true,
          status: 'SYNCHRONIZED',
          repositoryId: baseline.repositoryId,
          previousCommit: previousCommitSha,
          newCommit: newCommitInfo,
          syncResult
        };
      } else {
        // SYNCHRONIZATION OR VERIFICATION FAILED: DO NOT ADVANCE BASELINE
        console.warn(`[ASDSE Auto-Sync] Verification failed: Baseline remains at ${baseline.baselineCommit.shortSha}.`);
        baseline.syncStatus = 'SYNC_FAILED';

        return {
          success: false,
          status: 'SYNC_FAILED',
          repositoryId: baseline.repositoryId,
          baselineCommit: baseline.baselineCommit,
          failedTargetCommit: newCommitInfo,
          failures: syncResult.verification?.failures || ['Consistency verification checks failed.'],
          syncResult
        };
      }

    } catch (syncErr) {
      console.error(`[ASDSE Auto-Sync] Pipeline failure:`, syncErr.message);
      baseline.syncStatus = 'SYNC_FAILED';

      // Ensure baseline is preserved
      return {
        success: false,
        status: 'SYNC_FAILED',
        repositoryId: baseline.repositoryId,
        baselineCommit: baseline.baselineCommit,
        error: syncErr.message,
        message: `Automatic synchronization pipeline failed: ${syncErr.message}`
      };
    }
  }
}
