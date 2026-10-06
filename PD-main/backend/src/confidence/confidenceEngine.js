import { db } from '../db/store.js';

export class ConfidenceEngine {
  static calculateScore(sdid, consistencyResult, dnaMatch) {
    let score = 100;
    if (!dnaMatch) score -= 35;
    if (!consistencyResult.isConsistent) score -= (consistencyResult.missingInDocs.length * 15);

    score = Math.max(0, Math.min(100, score));
    return {
      score,
      rating: score > 85 ? 'EXCELLENT' : score > 60 ? 'MODERATE' : 'CRITICAL_DRIFT'
    };
  }

  static getProjectOverallConfidence(projectId) {
    const blocks = db.documentationBlocks;
    if (blocks.length === 0) return 100;
    const sum = blocks.reduce((acc, b) => acc + b.confidenceScore, 0);
    return Math.round(sum / blocks.length);
  }
}
