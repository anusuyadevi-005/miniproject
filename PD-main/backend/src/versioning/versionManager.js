import { db } from '../db/store.js';

export class VersionManager {
  static getHistory() {
    return db.versionHistory;
  }

  static recordVersion(projectId, commitHash, sdid, changeType, diffSummary, confidenceBefore, confidenceAfter) {
    const versionNumber = `v1.${db.versionHistory.length + 1}.0`;
    const record = {
      id: db.generateId('ver'),
      projectId,
      version: versionNumber,
      commitHash,
      sdid,
      changeType,
      diffSummary,
      confidenceBefore,
      confidenceAfter,
      timestamp: new Date().toISOString()
    };
    db.versionHistory.unshift(record);
    return record;
  }

  static rollbackVersion(versionId) {
    const record = db.versionHistory.find(v => v.id === versionId);
    if (!record) throw new Error('Version snapshot not found');

    const block = db.documentationBlocks.find(b => b.sdid === record.sdid);
    if (block) {
      block.confidenceScore = record.confidenceBefore;
      block.status = 'Synced';
      block.lastUpdated = new Date().toISOString();
    }
    return { success: true, rolledBackVersion: record.version, sdid: record.sdid };
  }
}
