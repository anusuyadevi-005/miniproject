import { scanRepository } from '../services/repositoryScanner.js';
import { RepositoryInventory } from '../models/RepositoryInventory.js';
import { computeStringHash } from '../utils/hashGenerator.js';

export async function scanRepositoryController(req, res) {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Repository url is required.' });
    }

    const scanResult = await scanRepository(url);
    const repositoryHash = computeStringHash(JSON.stringify(scanResult.metadata));

    const savedDocument = await RepositoryInventory.findOneAndUpdate(
      { repositoryId: scanResult.repositoryId },
      {
        repositoryId: scanResult.repositoryId,
        repositoryUrl: url,
        scannedAt: new Date(),
        repositoryHash,
        metadata: scanResult.metadata,
        folders: scanResult.folders,
        files: scanResult.files
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.status(201).json({
      success: true,
      repositoryId: scanResult.repositoryId,
      metadata: scanResult.metadata,
      folders: scanResult.folders,
      files: scanResult.files,
      savedToMongo: !!savedDocument
    });
  } catch (error) {
    console.error('Repository scan error:', error);
    const statusCode = error.message.includes('invalid') ? 400 : 500;
    return res.status(statusCode).json({ success: false, error: error.message });
  }
}
