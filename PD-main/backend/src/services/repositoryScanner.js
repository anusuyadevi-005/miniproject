import path from 'path';
import fs from 'fs-extra';
import { WorkspaceManager } from '../ingestion/workspaceManager.js';
import { scanFolders } from '../utils/folderScanner.js';
import { scanFiles } from '../utils/fileScanner.js';
import { detectLanguage } from '../utils/languageDetector.js';
import { computeStringHash } from '../utils/hashGenerator.js';

export const DEFAULT_IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/dist/**',
  '**/build/**',
  '**/coverage/**',
  '**/vendor/**',
  '**/target/**',
  '**/out/**',
  '**/.next/**',
  '**/.cache/**',
  '**/.idea/**',
  '**/.vscode/**',
  '**/bin/**',
  '**/obj/**',
  '**/__pycache__/**',
  '**/.venv/**',
  '**/venv/**'
];

export function validateRepositoryUrl(url) {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Repository URL must be a string.' };
  }

  const normalized = url.trim();

  if (fs.existsSync(normalized) || normalized.startsWith('file://')) {
    return { valid: true, cloneUrl: normalized, host: 'local' };
  }

  const repoRegex = /^(?:https?:\/\/)?(?:www\.)?(github\.com|gitlab\.com|bitbucket\.org)\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?$/i;

  if (!repoRegex.test(normalized)) {
    return { valid: false, error: 'Repository URL format is invalid. Supported hosts: GitHub, GitLab, Bitbucket.' };
  }

  const hostMatch = normalized.match(repoRegex);
  const host = hostMatch ? hostMatch[1].toLowerCase() : 'unknown';
  const cloneUrl = normalized.endsWith('.git') ? normalized : `${normalized}.git`;

  return { valid: true, cloneUrl, host };
}

function detectRepositoryFeatures(files) {
  const packageManagers = new Set();
  let readmeExists = false;
  let licenseExists = false;
  let dockerExists = false;
  let githubActionsExists = false;

  for (const file of files) {
    const pathLower = file.relativePath.toLowerCase();
    if (pathLower === 'readme.md' || pathLower.startsWith('readme.')) {
      readmeExists = true;
    }
    if (pathLower === 'license' || pathLower.startsWith('license.') || pathLower === 'licence') {
      licenseExists = true;
    }
    if (pathLower === 'dockerfile' || pathLower.endsWith('dockerfile') || file.extension === 'dockerfile') {
      dockerExists = true;
    }
    if (file.relativePath.startsWith('.github/workflows/') || (pathLower.endsWith('.yml') && file.relativePath.includes('.github/workflows'))) {
      githubActionsExists = true;
    }

    switch (file.extension) {
      case 'json':
        if (file.name === 'package.json') packageManagers.add('npm');
        if (file.name === 'package-lock.json') packageManagers.add('npm');
        if (file.name === 'yarn.lock') packageManagers.add('Yarn');
        if (file.name === 'pnpm-lock.yaml' || file.name === 'pnpm-lock.yml') packageManagers.add('pnpm');
        break;
      case 'toml':
        if (file.name === 'pyproject.toml') packageManagers.add('pip / poetry');
        if (file.name === 'Cargo.toml') packageManagers.add('Cargo');
        break;
      case 'txt':
        if (file.name === 'requirements.txt') packageManagers.add('pip');
        break;
      case 'yaml':
      case 'yml':
        if (file.relativePath.toLowerCase().includes('docker') || file.relativePath.toLowerCase().includes('compose')) {
          dockerExists = true;
        }
        break;
      case 'lock':
        if (['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'pnpm-lock.yml'].includes(file.name)) {
          packageManagers.add(file.name.includes('yarn') ? 'Yarn' : file.name.includes('pnpm') ? 'pnpm' : 'npm');
        }
        break;
      case 'gradle':
      case 'pom':
      case 'sbt':
        packageManagers.add('JVM');
        break;
    }
  }

  return {
    readmeExists,
    licenseExists,
    dockerExists,
    githubActionsExists,
    packageManagers: Array.from(packageManagers)
  };
}

/**
 * Scans an already materialized workspace directory and extracts file/folder inventories.
 */
export async function scanWorkspacePath(workspaceRoot, metadataOverride = {}) {
  if (!await fs.pathExists(workspaceRoot)) {
    throw new Error(`Workspace path does not exist: ${workspaceRoot}`);
  }

  const folders = await scanFolders(workspaceRoot, DEFAULT_IGNORE_PATTERNS);
  const files = await scanFiles(workspaceRoot, DEFAULT_IGNORE_PATTERNS);
  const detectedLanguages = new Set(files.map((file) => detectLanguage(file.extension)));

  const counts = {
    totalFiles: files.length,
    totalFolders: folders.length,
    totalSourceFiles: files.filter((file) => file.language !== 'Unknown' && !file.isBinary).length
  };

  const featureSummary = detectRepositoryFeatures(files);
  const repositoryId = metadataOverride.repositoryId || computeStringHash(workspaceRoot);

  const metadata = {
    name: metadataOverride.name || path.basename(workspaceRoot),
    owner: metadataOverride.owner || 'local',
    url: metadataOverride.url || workspaceRoot,
    branch: metadataOverride.branch || 'main',
    sourceType: metadataOverride.sourceType || 'local',
    workspacePath: workspaceRoot,
    commitHash: metadataOverride.commitHash || '',
    shortCommitHash: metadataOverride.shortCommitHash || '',
    author: metadataOverride.author || 'Developer',
    commitMessage: metadataOverride.commitMessage || 'Repository baseline analysis',
    commitDate: metadataOverride.commitDate || new Date().toISOString(),
    recentCommits: metadataOverride.recentCommits || [],
    chronologicalVersions: metadataOverride.chronologicalVersions || [],
    versionComparison: metadataOverride.versionComparison || null,
    versionLabel: metadataOverride.versionLabel || metadataOverride.versionComparison?.versionLabel || 'V1',
    languages: Array.from(detectedLanguages).filter(Boolean),
    totalFiles: counts.totalFiles,
    totalFolders: counts.totalFolders,
    repositorySizeBytes: await fs.pathExists(workspaceRoot) ? (await fs.stat(workspaceRoot)).size : 0,
    totalSourceFiles: counts.totalSourceFiles,
    readmeExists: featureSummary.readmeExists,
    licenseExists: featureSummary.licenseExists,
    dockerExists: featureSummary.dockerExists,
    githubActionsExists: featureSummary.githubActionsExists,
    packageManagers: featureSummary.packageManagers
  };

  return {
    repositoryId,
    workspaceRoot,
    metadata,
    folders: folders.map(({ id, name, path: p, absolutePath, relativePath, parentFolder, depth, children }) => ({
      id,
      name,
      path: p,
      absolutePath,
      relativePath,
      parentFolder,
      depth,
      children
    })),
    files: files.map(({ id, name, extension, language, relativePath, size, lineCount, hash, folder, mimeType, absolutePath, createdDate, modifiedDate, characterCount, isBinary }) => ({
      id,
      name,
      extension,
      language,
      relativePath,
      size,
      lineCount,
      hash,
      folder,
      mimeType,
      absolutePath,
      createdDate,
      modifiedDate,
      characterCount,
      isBinary
    }))
  };
}

/**
 * Ingests and scans a remote Git repository URL.
 */
export async function scanRepository(repositoryUrl, branch = '', commitSha = '') {
  const validation = validateRepositoryUrl(repositoryUrl);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const ingested = await WorkspaceManager.ingestGitRepo({
    url: validation.cloneUrl,
    branch,
    commitSha,
    name: path.basename(repositoryUrl).replace(/\.git$/, '')
  });

  const owner = repositoryUrl
    .replace(/(^https?:\/\/)|(^git@)|(^www\.)/gi, '')
    .replace(/\.git$/, '')
    .split('/')[1] || 'repo-owner';

  return scanWorkspacePath(ingested.workspacePath, {
    repositoryId: ingested.workspaceId,
    name: ingested.name,
    owner,
    url: validation.cloneUrl,
    branch: ingested.branch,
    defaultBranch: ingested.defaultBranch,
    availableBranches: ingested.availableBranches,
    commitHash: ingested.activeCommit?.fullSha || '',
    shortCommitHash: ingested.activeCommit?.shortSha || '',
    author: ingested.activeCommit?.author || 'Developer',
    commitMessage: ingested.activeCommit?.message || 'Repository baseline analysis',
    commitDate: ingested.activeCommit?.date || new Date().toISOString(),
    recentCommits: ingested.recentCommits || [],
    chronologicalVersions: ingested.chronologicalVersions || [],
    versionComparison: ingested.versionComparison || null,
    versionLabel: ingested.versionComparison?.versionLabel || 'V1',
    sourceType: 'git'
  });
}

/**
 * Ingests and scans a local folder directory.
 */
export async function scanLocalFolder(folderPath, name = '') {
  const ingested = await WorkspaceManager.ingestLocalFolder({ folderPath, name });
  return scanWorkspacePath(ingested.workspacePath, {
    repositoryId: ingested.workspaceId,
    name: ingested.name,
    owner: 'local-user',
    url: folderPath,
    branch: 'local',
    commitHash: ingested.activeCommit?.fullSha || 'local_head',
    shortCommitHash: ingested.activeCommit?.shortSha || 'local',
    author: ingested.activeCommit?.author || 'Local User',
    commitMessage: ingested.activeCommit?.message || 'Local Directory Analysis Snapshot',
    commitDate: ingested.activeCommit?.date || new Date().toISOString(),
    recentCommits: ingested.recentCommits || [],
    sourceType: 'local_folder'
  });
}

/**
 * Ingests and scans an uploaded ZIP archive buffer.
 */
export async function scanZipBuffer(zipBuffer, filename = 'archive.zip', name = '') {
  const ingested = await WorkspaceManager.ingestZipArchive({ zipBuffer, filename, name });
  return scanWorkspacePath(ingested.workspacePath, {
    repositoryId: ingested.workspaceId,
    name: ingested.name,
    owner: 'archive-upload',
    url: filename,
    branch: 'archive',
    commitHash: ingested.activeCommit?.fullSha || 'zip_upload',
    shortCommitHash: ingested.activeCommit?.shortSha || 'zip',
    author: ingested.activeCommit?.author || 'Archive Uploader',
    commitMessage: ingested.activeCommit?.message || 'Uploaded ZIP Archive Snapshot',
    commitDate: ingested.activeCommit?.date || new Date().toISOString(),
    recentCommits: ingested.recentCommits || [],
    sourceType: 'zip_archive'
  });
}
