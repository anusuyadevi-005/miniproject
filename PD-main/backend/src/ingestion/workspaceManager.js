import path from 'path';
import os from 'os';
import fs from 'fs-extra';
import crypto from 'crypto';
import simpleGit from 'simple-git';
import { extractZipSafely } from './archiveExtractor.js';
import { VersionDiffEngine } from '../versioning/versionDiffEngine.js';

const WORKSPACE_BASE = path.join(os.tmpdir(), 'repomind_workspaces');

export class WorkspaceManager {
  static getBaseDirectory() {
    return WORKSPACE_BASE;
  }

  static async init() {
    await fs.ensureDir(WORKSPACE_BASE);
  }

  static generateWorkspaceId(sourceIdentifier = '') {
    const hash = crypto.createHash('sha256').update(sourceIdentifier + Date.now().toString()).digest('hex').substring(0, 16);
    return `ws_${hash}`;
  }

  static getWorkspacePath(workspaceId) {
    // Prevent traversal
    const safeId = path.basename(workspaceId);
    return path.join(WORKSPACE_BASE, safeId);
  }

  static parseGitDiffOutput(rawNameStatus = '', rawNumstat = '') {
    const numstatMap = new Map();
    const numstatLines = (rawNumstat || '').split('\n').filter(Boolean);
    for (const line of numstatLines) {
      const parts = line.split('\t');
      if (parts.length >= 3) {
        const adds = parts[0] === '-' ? 0 : parseInt(parts[0], 10) || 0;
        const dels = parts[1] === '-' ? 0 : parseInt(parts[1], 10) || 0;
        const filePath = parts.slice(2).join('\t').trim();
        numstatMap.set(filePath, { additions: adds, deletions: dels });
      }
    }

    const filesAdded = [];
    const filesModified = [];
    const filesDeleted = [];
    const filesRenamed = [];
    const fileChanges = [];
    let totalAdditions = 0;
    let totalDeletions = 0;

    const nameStatusLines = (rawNameStatus || '').split('\n').filter(Boolean);
    for (const line of nameStatusLines) {
      const parts = line.split('\t');
      if (!parts[0]) continue;
      const statusType = parts[0].trim();

      if (statusType.startsWith('R') && parts.length >= 3) {
        const oldPath = parts[1].trim();
        const newPath = parts[2].trim();
        const stats = numstatMap.get(newPath) || numstatMap.get(`${oldPath} => ${newPath}`) || { additions: 0, deletions: 0 };
        totalAdditions += stats.additions;
        totalDeletions += stats.deletions;
        filesRenamed.push({ oldPath, newPath, additions: stats.additions, deletions: stats.deletions });
        fileChanges.push({ path: newPath, oldPath, status: 'renamed', additions: stats.additions, deletions: stats.deletions });
      } else if (statusType === 'A' && parts.length >= 2) {
        const filePath = parts.slice(1).join('\t').trim();
        const stats = numstatMap.get(filePath) || { additions: 0, deletions: 0 };
        totalAdditions += stats.additions;
        totalDeletions += stats.deletions;
        filesAdded.push({ path: filePath, additions: stats.additions, deletions: stats.deletions });
        fileChanges.push({ path: filePath, status: 'added', additions: stats.additions, deletions: stats.deletions });
      } else if (statusType === 'D' && parts.length >= 2) {
        const filePath = parts.slice(1).join('\t').trim();
        const stats = numstatMap.get(filePath) || { additions: 0, deletions: 0 };
        totalAdditions += stats.additions;
        totalDeletions += stats.deletions;
        filesDeleted.push({ path: filePath, additions: stats.additions, deletions: stats.deletions });
        fileChanges.push({ path: filePath, status: 'deleted', additions: stats.additions, deletions: stats.deletions });
      } else if (statusType === 'M' && parts.length >= 2) {
        const filePath = parts.slice(1).join('\t').trim();
        const stats = numstatMap.get(filePath) || { additions: 0, deletions: 0 };
        totalAdditions += stats.additions;
        totalDeletions += stats.deletions;
        filesModified.push({ path: filePath, additions: stats.additions, deletions: stats.deletions });
        fileChanges.push({ path: filePath, status: 'modified', additions: stats.additions, deletions: stats.deletions });
      }
    }

    return {
      filesAdded,
      filesModified,
      filesDeleted,
      filesRenamed,
      fileChanges,
      totalAdditions,
      totalDeletions
    };
  }

  /**
   * Inspects a remote Git repository to discover available branches, default branch,
   * and the latest 5 commits for the default or requested branch.
   */
  static async inspectRemoteRepository(url, requestedBranch = '') {
    const git = simpleGit();
    const cleanUrl = url.trim();
    try {
      // 1. Inspect HEAD symref to discover the true default branch
      let defaultBranch = null;
      try {
        const rawHead = await git.raw(['ls-remote', '--symref', cleanUrl, 'HEAD']);
        const match = rawHead.match(/ref:\s*refs\/heads\/([^\s]+)\s+HEAD/);
        if (match && match[1]) {
          defaultBranch = match[1].trim();
        }
      } catch (headErr) {
        // Fallback if --symref is not supported by older servers
      }

      // 2. Discover all available remote branch heads
      const rawHeads = await git.raw(['ls-remote', '--heads', cleanUrl]);
      const availableBranches = [];
      const lines = rawHeads.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const headMatch = trimmed.match(/refs\/heads\/([^\s]+)/);
        if (headMatch && headMatch[1]) {
          availableBranches.push(headMatch[1].trim());
        }
      }

      // If defaultBranch wasn't resolved by symref, resolve from available branches
      if (!defaultBranch && availableBranches.length > 0) {
        if (availableBranches.includes('main')) defaultBranch = 'main';
        else if (availableBranches.includes('master')) defaultBranch = 'master';
        else defaultBranch = availableBranches[0];
      }

      if (availableBranches.length === 0 && !defaultBranch) {
        throw new Error(`The remote repository '${cleanUrl}' is empty (no branches or commits found). Please push initial code to this repository before running analysis.`);
      }

      const targetBranch = requestedBranch && availableBranches.includes(requestedBranch)
        ? requestedBranch
        : (defaultBranch || 'main');

      // 3. Retrieve ONLY the latest 5 commits for the selected branch via shallow clone
      const tempInspectId = `inspect_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const tempInspectPath = path.join(WORKSPACE_BASE, tempInspectId);
      let recentCommits = [];

      try {
        await fs.ensureDir(tempInspectPath);
        const tempGit = simpleGit();
        const cloneSource = (fs.existsSync(cleanUrl) || cleanUrl.startsWith('file://'))
          ? (cleanUrl.startsWith('file://') ? cleanUrl : `file://${path.resolve(cleanUrl).replace(/\\/g, '/')}`)
          : cleanUrl;
        await tempGit.clone(cloneSource, tempInspectPath, ['--depth', '5', '--branch', targetBranch]);

        const inspectRepoGit = simpleGit(tempInspectPath);
        const rawLogs = await inspectRepoGit.raw(['log', '-n', '5', '--pretty=format:%H|%h|%s|%an|%ad|%aI']);
        const logLines = (rawLogs || '').split('\n').filter(Boolean);
        recentCommits = logLines.map(line => {
          const [fullSha, shortSha, message, author, date, isoDate] = line.split('|');
          return {
            fullSha: fullSha || '',
            shortSha: shortSha || (fullSha ? fullSha.substring(0, 7) : ''),
            message: message || 'Commit',
            author: author || 'Developer',
            date: date || isoDate || new Date().toISOString()
          };
        });
      } catch (logErr) {
        console.warn(`[Git Ingestion] Failed to fetch commit logs for ${targetBranch}:`, logErr.message);
      } finally {
        await fs.remove(tempInspectPath).catch(() => { });
      }

      const chronologicalCommits = [...recentCommits].reverse();
      const versionList = chronologicalCommits.map((c, idx) => ({
        versionLabel: `V${idx + 1}`,
        versionIndex: idx + 1,
        totalVersions: chronologicalCommits.length,
        fullSha: c.fullSha,
        shortSha: c.shortSha,
        message: c.message,
        author: c.author,
        date: c.date,
        isOldestInWindow: idx === 0,
        isLatestInWindow: idx === chronologicalCommits.length - 1,
        previousSha: idx > 0 ? chronologicalCommits[idx - 1].fullSha : null
      }));

      return {
        reachable: true,
        defaultBranch: defaultBranch || 'main',
        selectedBranch: targetBranch,
        availableBranches,
        recentCommits: recentCommits.slice(0, 5),
        chronologicalVersions: versionList
      };
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('is empty (no branches or commits found)')) {
        throw err;
      }
      if (msg.includes('Authentication failed') || msg.includes('could not read Username') || msg.includes('terminal prompts disabled') || msg.includes('403') || msg.includes('401')) {
        throw new Error(`Authentication failed or private repository: Unable to access ${cleanUrl}. Please verify repository access permissions.`);
      }
      if (msg.includes('Repository not found') || msg.includes('not found') || msg.includes('404')) {
        throw new Error(`Repository not found: ${cleanUrl}. Please verify that the repository URL exists and is public.`);
      }
      if (msg.includes('Could not resolve host') || msg.includes('Network is unreachable') || msg.includes('Connection refused') || msg.includes('timed out')) {
        throw new Error(`Network error: Unable to reach remote host for repository ${cleanUrl}. Check network connectivity.`);
      }
      throw new Error(`Failed to inspect remote Git repository ${cleanUrl}: ${err.message}`);
    }
  }

  /**
   * Clones a remote Git repository into an isolated workspace and checks out the exact selected commit.
   */
  static async ingestGitRepo({ url, branch = '', commitSha = '', name = '' }) {
    await this.init();
    const cleanUrl = url.trim();
    const requestedBranch = (branch || '').trim();
    const requestedCommit = (commitSha || '').trim();

    console.log(`[Git Ingestion] Inspecting remote repository: ${cleanUrl}`);
    console.log(`[Git Ingestion] Requested branch: '${requestedBranch || '(auto-detect default)'}'`);
    if (requestedCommit) {
      console.log(`[Git Ingestion] Requested exact commit SHA: '${requestedCommit}'`);
    }

    const remoteInfo = await this.inspectRemoteRepository(cleanUrl, requestedBranch);
    console.log(`[Git Ingestion] Detected default branch: '${remoteInfo.defaultBranch}'`);
    console.log(`[Git Ingestion] Available remote branches: [${remoteInfo.availableBranches.join(', ')}]`);

    let selectedBranch = remoteInfo.defaultBranch;

    if (requestedBranch && requestedBranch !== 'HEAD' && requestedBranch !== 'auto') {
      // User explicitly entered a branch: verify existence
      if (remoteInfo.availableBranches.length > 0 && !remoteInfo.availableBranches.includes(requestedBranch)) {
        throw new Error(
          `Requested branch '${requestedBranch}' does not exist in remote repository '${cleanUrl}'. ` +
          `Available remote branches: ${remoteInfo.availableBranches.join(', ')}.`
        );
      }
      selectedBranch = requestedBranch;
    }

    console.log(`[Git Ingestion] Selected branch for clone: '${selectedBranch}'`);

    const workspaceId = this.generateWorkspaceId(cleanUrl + selectedBranch);
    const workspacePath = this.getWorkspacePath(workspaceId);

    const isExistingRepo = await fs.pathExists(path.join(workspacePath, '.git'));
    const git = simpleGit();
    let repoGit;

    const cloneSource = (fs.existsSync(cleanUrl) || cleanUrl.startsWith('file://'))
      ? (cleanUrl.startsWith('file://') ? cleanUrl : `file://${path.resolve(cleanUrl).replace(/\\/g, '/')}`)
      : cleanUrl;

    const performCleanClone = async (depth = null) => {
      await fs.remove(workspacePath).catch(() => { });
      await fs.ensureDir(workspacePath);
      const cloneArgs = [];
      if (depth) cloneArgs.push('--depth', String(depth));
      if (selectedBranch) cloneArgs.push('--branch', selectedBranch);
      await git.clone(cloneSource, workspacePath, cloneArgs);
      const instance = simpleGit(workspacePath);
      if (requestedCommit) {
        try {
          await instance.checkout(requestedCommit);
        } catch (checkoutErr) {
          // If shallow clone is missing the tree/commit, unshallow or fetch target commit
          try {
            await instance.fetch('origin', requestedCommit);
            await instance.checkout(requestedCommit);
          } catch (_) {
            if (depth) {
              // Retry with full clone without depth
              return performCleanClone(null);
            }
            throw checkoutErr;
          }
        }
      }
      return instance;
    };

    try {
      if (isExistingRepo) {
        console.log(`[Git Ingestion] Reusing local workspace for ${cleanUrl} [branch: ${selectedBranch}]...`);
        repoGit = simpleGit(workspacePath);
        try {
          await repoGit.fetch('origin', selectedBranch);
          if (requestedCommit) {
            try {
              await repoGit.checkout(requestedCommit);
            } catch (coErr) {
              await repoGit.fetch('origin', requestedCommit);
              await repoGit.checkout(requestedCommit);
            }
          } else {
            await repoGit.checkout(selectedBranch);
          }
        } catch (reuseErr) {
          console.warn(`[Git Ingestion] Workspace reuse failed (${reuseErr.message}), falling back to clean clone...`);
          repoGit = await performCleanClone(15);
        }
      } else {
        try {
          repoGit = await performCleanClone(15);
        } catch (cloneErr) {
          console.warn(`[Git Ingestion] Initial clone failed (${cloneErr.message}), falling back to full clone...`);
          repoGit = await performCleanClone(null);
        }
      }

      // Retrieve ONLY the latest 5 commits for this branch/checkout
      let recentCommits = [];
      let activeCommit = {
        fullSha: requestedCommit || '',
        shortSha: requestedCommit ? requestedCommit.substring(0, 7) : '',
        message: 'Active Commit',
        author: 'Developer',
        date: new Date().toISOString()
      };

      try {
        const rawLogs = await repoGit.raw(['log', '-n', '5', '--pretty=format:%H|%h|%s|%an|%ad|%aI']);
        const logLines = (rawLogs || '').split('\n').filter(Boolean);
        recentCommits = logLines.map(line => {
          const [fullSha, shortSha, message, author, date, isoDate] = line.split('|');
          return {
            fullSha: fullSha || '',
            shortSha: shortSha || (fullSha ? fullSha.substring(0, 7) : ''),
            message: message || 'Commit',
            author: author || 'Developer',
            date: date || isoDate || new Date().toISOString()
          };
        });

        // Retrieve active HEAD commit
        const headLog = await repoGit.raw(['log', '-1', '--pretty=format:%H|%h|%s|%an|%ad|%aI']);
        if (headLog) {
          const [fullSha, shortSha, message, author, date, isoDate] = headLog.split('|');
          activeCommit = {
            fullSha: fullSha || '',
            shortSha: shortSha || (fullSha ? fullSha.substring(0, 7) : ''),
            message: message || 'Active Commit',
            author: author || 'Developer',
            date: date || isoDate || new Date().toISOString()
          };
        }

        // Verify checked out HEAD matches requested commit
        const verifiedHead = (await repoGit.raw(['rev-parse', 'HEAD'])).trim();
        if (requestedCommit && verifiedHead !== requestedCommit) {
          throw new Error(`Git checkout mismatch: requested commit '${requestedCommit}' but checked out HEAD is '${verifiedHead}'.`);
        }
      } catch (logErr) {
        if (logErr.message && logErr.message.includes('Git checkout mismatch')) {
          throw logErr;
        }
        console.warn(`[Git Ingestion] Could not parse git log:`, logErr.message);
      }

      const chronologicalCommits = [...recentCommits].reverse();
      const versionList = chronologicalCommits.map((c, idx) => ({
        versionLabel: `V${idx + 1}`,
        versionIndex: idx + 1,
        totalVersions: chronologicalCommits.length,
        fullSha: c.fullSha,
        shortSha: c.shortSha,
        message: c.message,
        author: c.author,
        date: c.date,
        isOldestInWindow: idx === 0,
        isLatestInWindow: idx === chronologicalCommits.length - 1,
        previousSha: idx > 0 ? chronologicalCommits[idx - 1].fullSha : null
      }));

      const activeVersionIndex = versionList.findIndex(v => v.fullSha === activeCommit.fullSha);
      const activeVersionLabel = activeVersionIndex >= 0 ? versionList[activeVersionIndex].versionLabel : 'V1';
      const isOldest = activeVersionIndex === 0 || versionList.length <= 1;
      const previousVersionInfo = (activeVersionIndex > 0) ? versionList[activeVersionIndex - 1] : null;

      let versionComparison;

      if (previousVersionInfo) {
        let rawNumstat = '';
        let rawNameStatus = '';
        let rawStatSummary = '';
        let rawDiffSnippet = '';
        try {
          rawNumstat = await repoGit.raw(['diff', '--numstat', previousVersionInfo.fullSha, activeCommit.fullSha]);
          rawNameStatus = await repoGit.raw(['diff', '--name-status', previousVersionInfo.fullSha, activeCommit.fullSha]);
          rawStatSummary = await repoGit.raw(['diff', '--stat', previousVersionInfo.fullSha, activeCommit.fullSha]);
          rawDiffSnippet = await repoGit.raw(['diff', '-U3', previousVersionInfo.fullSha, activeCommit.fullSha]);
        } catch (diffErr) {
          console.warn('[Git Ingestion] Initial diff failed, fetching previous commit tree objects...', diffErr.message);
          try {
            await repoGit.fetch('origin', previousVersionInfo.fullSha);
            rawNumstat = await repoGit.raw(['diff', '--numstat', previousVersionInfo.fullSha, activeCommit.fullSha]);
            rawNameStatus = await repoGit.raw(['diff', '--name-status', previousVersionInfo.fullSha, activeCommit.fullSha]);
            rawStatSummary = await repoGit.raw(['diff', '--stat', previousVersionInfo.fullSha, activeCommit.fullSha]);
            rawDiffSnippet = await repoGit.raw(['diff', '-U3', previousVersionInfo.fullSha, activeCommit.fullSha]);
          } catch (retryErr) {
            console.warn('[Git Ingestion] Could not compute git diff between commits:', retryErr.message);
          }
        }

        const parsedDiff = this.parseGitDiffOutput(rawNameStatus, rawNumstat);

        versionComparison = VersionDiffEngine.computeVersionDiff({
          currentVersion: {
            versionLabel: activeVersionLabel,
            versionIndex: activeVersionIndex + 1,
            totalVersions: versionList.length,
            fullSha: activeCommit.fullSha,
            shortSha: activeCommit.shortSha,
            message: activeCommit.message,
            author: activeCommit.author,
            date: activeCommit.date,
            branch: selectedBranch
          },
          previousVersion: {
            versionLabel: previousVersionInfo.versionLabel,
            versionIndex: previousVersionInfo.versionIndex,
            fullSha: previousVersionInfo.fullSha,
            shortSha: previousVersionInfo.shortSha,
            message: previousVersionInfo.message,
            author: previousVersionInfo.author,
            date: previousVersionInfo.date,
            branch: selectedBranch
          },
          rawDiff: {
            ...parsedDiff,
            statSummary: (rawStatSummary || '').trim(),
            rawDiffSnippet: (rawDiffSnippet || '').trim()
          }
        });
      } else {
        versionComparison = VersionDiffEngine.computeVersionDiff({
          currentVersion: {
            versionLabel: activeVersionLabel || 'V1',
            versionIndex: 1,
            totalVersions: versionList.length,
            fullSha: activeCommit.fullSha,
            shortSha: activeCommit.shortSha,
            message: activeCommit.message,
            author: activeCommit.author,
            date: activeCommit.date,
            branch: selectedBranch
          },
          previousVersion: null
        });
      }

      const sessionId = this.generateWorkspaceId(cleanUrl + selectedBranch + (activeCommit.fullSha || ''));
      console.log(`[Git Ingestion] Successfully cloned '${cleanUrl}' [branch: ${selectedBranch}, commit: ${activeCommit.shortSha}, version: ${activeVersionLabel}] into workspace: ${sessionId}`);

      return {
        workspaceId: sessionId,
        workspacePath,
        sourceType: 'git',
        source: cleanUrl,
        branch: selectedBranch,
        defaultBranch: remoteInfo.defaultBranch,
        availableBranches: remoteInfo.availableBranches,
        activeCommit,
        recentCommits: recentCommits.slice(0, 5),
        chronologicalVersions: versionList,
        versionComparison,
        name: name || path.basename(cleanUrl, '.git')
      };
    } catch (err) {
      console.error(`[Git Ingestion] Clone/checkout failed for ${cleanUrl} on branch ${selectedBranch}:`, err.message);
      await fs.remove(workspacePath).catch(() => { });

      const msg = err.message || '';
      if (msg.includes('Remote branch') && msg.includes('not found')) {
        throw new Error(`Remote branch '${selectedBranch}' was not found in upstream origin.`);
      }
      throw new Error(`Git clone/checkout failed for ${cleanUrl} on branch '${selectedBranch}': ${err.message}`);
    }
  }

  /**
   * Ingests a local directory safely into an isolated workspace.
   */
  static async ingestLocalFolder({ folderPath, name = '' }) {
    await this.init();
    const resolvedSource = path.resolve(folderPath);

    if (!await fs.pathExists(resolvedSource)) {
      throw new Error(`Local directory does not exist: ${folderPath}`);
    }

    const stat = await fs.stat(resolvedSource);
    if (!stat.isDirectory()) {
      throw new Error(`Specified path is not a directory: ${folderPath}`);
    }

    const workspaceId = this.generateWorkspaceId(resolvedSource);
    const workspacePath = this.getWorkspacePath(workspaceId);

    await fs.ensureDir(workspacePath);

    // Copy directory files into sandbox, ignoring node_modules, .git, etc.
    const ignoreList = ['node_modules', '.git', 'dist', 'build', 'target', '__pycache__', '.venv', 'vendor'];
    await fs.copy(resolvedSource, workspacePath, {
      filter: (src) => {
        const base = path.basename(src);
        return !ignoreList.includes(base);
      }
    });

    return {
      workspaceId,
      workspacePath,
      sourceType: 'local_folder',
      source: resolvedSource,
      name: name || path.basename(resolvedSource),
      activeCommit: {
        fullSha: 'local_head',
        shortSha: 'local',
        message: 'Local Directory Analysis Snapshot',
        author: 'Local User',
        date: new Date().toISOString()
      },
      recentCommits: []
    };
  }

  /**
   * Ingests an uploaded ZIP archive buffer into an isolated workspace.
   */
  static async ingestZipArchive({ zipBuffer, filename = 'archive.zip', name = '' }) {
    await this.init();
    const workspaceId = this.generateWorkspaceId(filename);
    const workspacePath = this.getWorkspacePath(workspaceId);

    await fs.ensureDir(workspacePath);
    await extractZipSafely(zipBuffer, workspacePath);

    // If the archive contained a single root directory, adjust root
    let rootPath = workspacePath;
    const items = await fs.readdir(workspacePath);
    if (items.length === 1) {
      const singlePath = path.join(workspacePath, items[0]);
      const stat = await fs.stat(singlePath);
      if (stat.isDirectory()) {
        rootPath = singlePath;
      }
    }

    return {
      workspaceId,
      workspacePath: rootPath,
      actualWorkspaceRoot: workspacePath,
      sourceType: 'zip_archive',
      source: filename,
      name: name || path.basename(filename, path.extname(filename)),
      activeCommit: {
        fullSha: 'zip_upload',
        shortSha: 'zip',
        message: 'Uploaded ZIP Archive Snapshot',
        author: 'Archive Uploader',
        date: new Date().toISOString()
      },
      recentCommits: []
    };
  }

  /**
   * Safely deletes an isolated workspace.
   */
  static async cleanupWorkspace(workspaceId) {
    const workspacePath = this.getWorkspacePath(workspaceId);
    if (await fs.pathExists(workspacePath)) {
      await fs.remove(workspacePath).catch(() => { });
    }
  }
}
