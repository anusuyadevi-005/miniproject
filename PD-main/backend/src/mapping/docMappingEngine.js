import { db } from '../db/store.js';

export class DocMappingEngine {
  static getDocBlockBySDID(sdid) {
    return db.documentationBlocks.find(b => b.sdid === sdid);
  }

  static getAllDocBlocks() {
    return db.documentationBlocks;
  }

  static updateDocBlockContent(docBlockId, newContent, newConfidence = 95) {
    const block = db.documentationBlocks.find(b => b.id === docBlockId);
    if (!block) throw new Error('Doc block not found');

    block.content = newContent;
    block.confidenceScore = newConfidence;
    block.status = 'Synced';
    block.lastUpdated = new Date().toISOString();
    return block;
  }
}
