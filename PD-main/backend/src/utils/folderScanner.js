import path from 'path';
import fastGlob from 'fast-glob';
import { computeStringHash } from './hashGenerator.js';

const DEFAULT_IGNORED_DIRECTORIES = [
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
  '**/obj/**'
];

function normalizeRelativePath(relativePath) {
  if (!relativePath || relativePath === '' || relativePath === './') {
    return '.';
  }
  return relativePath.replace(/\\/g, '/').replace(/\/\/$/, '');
}

function getParentFolder(relativePath) {
  if (!relativePath || relativePath === '.') {
    return null;
  }

  const parent = path.posix.dirname(relativePath);
  return parent === '.' ? '.' : normalizeRelativePath(parent);
}

export async function scanFolders(rootPath, ignorePatterns = DEFAULT_IGNORED_DIRECTORIES) {
  const normalizedRoot = path.resolve(rootPath).replace(/\\/g, '/');
  const folderEntries = await fastGlob(['**/'], {
    cwd: normalizedRoot,
    onlyDirectories: true,
    dot: true,
    ignore: ignorePatterns,
    followSymbolicLinks: false
  });

  const folderMap = new Map();
  folderMap.set('.', {
    id: computeStringHash('.'),
    name: path.basename(normalizedRoot),
    path: normalizedRoot,
    absolutePath: normalizedRoot,
    relativePath: '.',
    parentFolder: null,
    depth: 0,
    children: []
  });

  for (const rawEntry of folderEntries) {
    const relativePath = normalizeRelativePath(rawEntry);
    const absolutePath = path.join(normalizedRoot, relativePath);

    if (relativePath === '.') {
      continue;
    }

    folderMap.set(relativePath, {
      id: computeStringHash(relativePath),
      name: path.basename(relativePath),
      path: absolutePath,
      absolutePath,
      relativePath,
      parentFolder: getParentFolder(relativePath),
      depth: relativePath === '.' ? 0 : relativePath.split('/').filter(Boolean).length,
      children: []
    });
  }

  for (const folder of folderMap.values()) {
    if (folder.parentFolder && folderMap.has(folder.parentFolder)) {
      folderMap.get(folder.parentFolder).children.push(folder.id);
    }
  }

  return Array.from(folderMap.values());
}

export const ignoredFolderPatterns = DEFAULT_IGNORED_DIRECTORIES;
