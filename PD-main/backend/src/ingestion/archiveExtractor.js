import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs-extra';

const MAX_UNCOMPRESSED_SIZE = 500 * 1024 * 1024; // 500 MB max total
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB max per single file
const MAX_ENTRIES = 50000;

/**
 * Safely extracts a ZIP buffer into a target directory with Zip-Slip protection
 * and decompression bomb mitigation.
 */
export async function extractZipSafely(zipBuffer, targetDir) {
  await fs.ensureDir(targetDir);
  const resolvedTarget = path.resolve(targetDir);

  const zip = new AdmZip(zipBuffer);
  const entries = zip.getEntries();

  if (entries.length > MAX_ENTRIES) {
    throw new Error(`Archive exceeds maximum entry limit (${MAX_ENTRIES}). Potential archive bomb.`);
  }

  let totalBytes = 0;

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    // Check individual file size
    if (entry.header.size > MAX_FILE_SIZE) {
      throw new Error(`File ${entry.entryName} exceeds single-file size limit (50MB).`);
    }

    totalBytes += entry.header.size;
    if (totalBytes > MAX_UNCOMPRESSED_SIZE) {
      throw new Error(`Archive total extracted size exceeds 500MB limit. Decompression aborted.`);
    }

    // Zip-Slip security check: ensure destination path starts with targetDir
    const entryDestination = path.resolve(resolvedTarget, entry.entryName);
    if (!entryDestination.startsWith(resolvedTarget + path.sep) && entryDestination !== resolvedTarget) {
      throw new Error(`Security Violation: Zip-Slip detected on entry "${entry.entryName}".`);
    }
  }

  // Safe extraction
  zip.extractAllTo(resolvedTarget, true);
  return {
    extractedFilesCount: entries.filter(e => !e.isDirectory).length,
    targetDirectory: resolvedTarget
  };
}
