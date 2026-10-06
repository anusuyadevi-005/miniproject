import path from 'path';
import fs from 'fs-extra';
import fastGlob from 'fast-glob';
import mime from 'mime-types';
import { computeFileHash } from './hashGenerator.js';
import { detectLanguage } from './languageDetector.js';

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
  return relativePath.replace(/\\/g, '/');
}

function isBinaryBuffer(buffer) {
  for (let i = 0; i < buffer.length; i += 1) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
}

export async function scanFiles(rootPath, ignorePatterns = DEFAULT_IGNORED_DIRECTORIES) {
  const normalizedRoot = path.resolve(rootPath).replace(/\\/g, '/');
  const fileEntries = await fastGlob(['**/*'], {
    cwd: normalizedRoot,
    onlyFiles: true,
    dot: true,
    ignore: ignorePatterns,
    followSymbolicLinks: false
  });

  const files = [];
  for (const rawRelativePath of fileEntries) {
    const relativePath = normalizeRelativePath(rawRelativePath);
    const absolutePath = path.join(normalizedRoot, relativePath);
    const stat = await fs.stat(absolutePath);
    const buffer = await fs.readFile(absolutePath);
    const extension = path.extname(relativePath).toLowerCase();
    const language = detectLanguage(extension.replace(/^[.]/, ''));
    const mimeType = mime.lookup(absolutePath) || 'application/octet-stream';
    const isBinary = isBinaryBuffer(buffer);
    const content = isBinary ? '' : buffer.toString('utf8');
    const folder = normalizeRelativePath(path.dirname(relativePath));

    files.push({
      id: computeFileHash(relativePath),
      name: path.basename(relativePath),
      extension: extension.replace(/^[.]/, ''),
      language,
      size: stat.size,
      createdDate: stat.birthtime.toISOString(),
      modifiedDate: stat.mtime.toISOString(),
      relativePath,
      absolutePath,
      folder: folder === '.' ? '.' : folder,
      mimeType,
      hash: computeFileHash(buffer),
      lineCount: isBinary ? 0 : content.split(/\r\n|\r|\n/).length,
      characterCount: isBinary ? buffer.length : content.length,
      isBinary
    });
  }

  return files;
}

export const ignoredFilePatterns = DEFAULT_IGNORED_DIRECTORIES;
