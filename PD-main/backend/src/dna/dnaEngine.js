import crypto from 'crypto';
import { db } from '../db/store.js';

export class DocumentationDNAEngine {
  static hashString(str) {
    return crypto.createHash('sha256').update(str || '').digest('hex').substring(0, 16);
  }

  /**
   * Computes 6-part Documentation DNA tuple:
   * 1. Module / File Name
   * 2. Dependency Hash
   * 3. Complexity Score
   * 4. API / AST Signature
   * 5. Call Graph Hash
   * 6. Behavior Hash
   */
  static generateDNAFingerprint(sdid, moduleName, dependencies = [], codeSignature = '', callGraph = [], behaviorSnippet = '') {
    const cleanModuleName = moduleName || (sdid ? sdid.split(':').pop() : 'Module');
    const safeSig = String(codeSignature || '');

    const fingerprint = {
      moduleName: cleanModuleName,
      dependencyHash: `dep_${this.hashString(JSON.stringify(dependencies || []))}`,
      complexityScore: Math.min(20, Math.max(1, Math.floor(safeSig.length / 25) + (safeSig.includes('if') ? 2 : 0) + (safeSig.includes('for') || safeSig.includes('while') ? 3 : 0))),
      apiSignature: safeSig.slice(0, 200),
      callGraphHash: `cg_${this.hashString(JSON.stringify(callGraph || []))}`,
      behaviorHash: `bh_${this.hashString(behaviorSnippet || safeSig)}`
    };

    const combinedString = Object.values(fingerprint).join('|');
    const combinedDNA = `DNA-SHA256:${this.hashString(combinedString)}`;

    if (!db.documentationDNA) db.documentationDNA = [];

    let record = db.documentationDNA.find(d => d.sdid === sdid);
    const isMatch = record ? record.combinedDNA === combinedDNA : true;

    if (!record) {
      record = {
        id: db.generateId ? db.generateId('dna') : `dna_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        sdid,
        fingerprint,
        combinedDNA,
        isMatch: true,
        lastComputed: new Date().toISOString()
      };
      db.documentationDNA.push(record);
    } else {
      record.fingerprint = fingerprint;
      record.combinedDNA = combinedDNA;
      record.isMatch = isMatch;
      record.lastComputed = new Date().toISOString();
    }

    return record;
  }

  static verifyDNA(sdid, currentCode, currentDoc) {
    const record = (db.documentationDNA || []).find(d => d.sdid === sdid);
    if (!record) {
      return { verified: true, requiresRegeneration: true, reason: 'Initial DNA creation' };
    }

    const newDNA = this.generateDNAFingerprint(sdid, record.fingerprint?.moduleName, [], currentCode, [], currentDoc);
    const hasMutated = newDNA.combinedDNA !== record.combinedDNA;

    return {
      verified: true,
      requiresRegeneration: hasMutated,
      previousDNA: record.combinedDNA,
      currentDNA: newDNA.combinedDNA,
      reason: hasMutated ? 'Source code AST signature or behavior mutated' : 'Source code DNA invariant — no regeneration needed'
    };
  }

  static generateDNA(sdid, rawCode, newDocContent) {
    const symbol = sdid ? sdid.split(':').pop() : 'Entity';
    return this.generateDNAFingerprint(sdid, symbol, [], rawCode, [], newDocContent);
  }

  static getDNARecords() {
    return db.documentationDNA || [];
  }
}
