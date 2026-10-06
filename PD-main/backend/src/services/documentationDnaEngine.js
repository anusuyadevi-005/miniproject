import { SemanticFingerprint } from './semanticFingerprint.js';
import { db } from '../db/store.js';
import { getMongoStatus } from '../db/mongo.js';
import { DocumentationDNA } from '../models/DnaModels.js';
import { DocumentationMapping, SemanticRelationship, SemanticEntity } from '../models/SDIDModels.js';

/**
 * Documentation DNA Engine
 *
 * Generates a complete DNA record for a documentation section.
 * The DNA captures both the textual content hash and the
 * semantic fingerprint built from all repository evidence
 * that the doc section references.
 */
export class DocumentationDnaEngine {

  /**
   * Generate a DNA record for a given doc section.
   *
   * @param {string} repositoryId
   * @param {string} docId
   * @param {string} markdownContent - The rendered Markdown of the doc section
   * @param {object} evidence - Pre-gathered evidence (optional override)
   * @param {string} commitHash
   * @returns {object} DNA record
   */
  static async generateDNA(repositoryId, docId, markdownContent, evidence = null, commitHash = 'latest') {
    // 1. Content hash (textual fingerprint)
    const contentHash = SemanticFingerprint.computeContentHash(markdownContent || '');

    // 2. Gather evidence from the knowledge model if not provided
    const ev = evidence || await this.gatherEvidence(repositoryId, docId);

    // 3. Semantic fingerprint
    const semanticFingerprint = SemanticFingerprint.computeSemanticFingerprint(ev);

    // 4. Derive key facts & semantic concepts
    const semanticConcepts = this._extractConcepts(ev);
    const keyFacts = this._extractKeyFacts(ev);

    const dna = {
      docId,
      repositoryId,
      documentationVersion: 1,
      semanticFingerprint,
      contentHash,
      relatedSDIDs:                 ev.relatedSDIDs || [],
      relatedAPIs:                  ev.apiPaths || [],
      relatedWorkflows:             ev.workflowSteps || [],
      relatedDatabaseEntities:      ev.databaseEntities || [],
      relatedArchitectureComponents: ev.architectureComponents || [],
      relatedDependencies:          ev.dependencies || [],
      semanticConcepts,
      keyFacts,
      entitySignatures:             ev.entitySignatures || [],
      commitHash
    };

    return dna;
  }

  /**
   * Persist a DNA record (Mongo with in-memory fallback).
   */
  static async saveDNA(dna) {
    if (getMongoStatus().isConnected) {
      try {
        await DocumentationDNA.findOneAndUpdate(
          { repositoryId: dna.repositoryId, docId: dna.docId },
          dna,
          { upsert: true, new: true }
        );
      } catch (e) {
        console.warn('MongoDB DNA save error:', e.message);
      }
    }

    if (!db.dnaRecords) db.dnaRecords = [];
    const idx = db.dnaRecords.findIndex(d => d.repositoryId === dna.repositoryId && d.docId === dna.docId);
    if (idx >= 0) db.dnaRecords[idx] = dna;
    else db.dnaRecords.push(dna);
  }

  /**
   * Retrieve the previous (stored) DNA for a doc section.
   */
  static async getPreviousDNA(repositoryId, docId) {
    if (getMongoStatus().isConnected) {
      try {
        const doc = await DocumentationDNA.findOne({ repositoryId, docId }).lean();
        if (doc) return doc;
      } catch (e) { /* fallback */ }
    }
    return (db.dnaRecords || []).find(d => d.repositoryId === repositoryId && d.docId === docId) || null;
  }

  // ── Evidence gathering ──────────────────────────────────

  static async gatherEvidence(repositoryId, docId) {
    const evidence = {
      relatedSDIDs: [],
      entityTypes: [],
      entitySignatures: [],
      apiMethods: [],
      apiPaths: [],
      databaseEntities: [],
      databaseFields: [],
      relationships: [],
      workflowSteps: [],
      architectureComponents: [],
      businessRules: [],
      dependencies: [],
      documentedBehaviors: []
    };

    // Pull mappings
    let mappings = [];
    if (getMongoStatus().isConnected) {
      try {
        mappings = await DocumentationMapping.find({ repositoryId, documentationId: docId }).lean();
      } catch (e) { /* fallback */ }
    }
    if (mappings.length === 0) {
      mappings = (db.documentationMappings || []).filter(m => m.repositoryId === repositoryId && m.documentationId === docId);
    }

    for (const m of mappings) {
      evidence.relatedSDIDs.push(m.sdid);
    }

    // Pull entities linked to those SDIDs
    for (const sdid of evidence.relatedSDIDs) {
      let entity = null;
      if (getMongoStatus().isConnected) {
        try { entity = await SemanticEntity.findOne({ repositoryId, sdid }).lean(); } catch (e) { /* */ }
      }
      if (!entity) entity = (db.semanticEntities || []).find(e => e.repositoryId === repositoryId && e.sdid === sdid);

      if (entity) {
        evidence.entityTypes.push(entity.entityType);
        if (entity.signature) evidence.entitySignatures.push(entity.signature);
      }
    }

    return evidence;
  }

  // ── Concept extraction ──────────────────────────────────

  static _extractConcepts(evidence) {
    const concepts = new Set();
    for (const s of (evidence.entitySignatures || [])) concepts.add(`sig:${s}`);
    for (const a of (evidence.apiPaths || []))          concepts.add(`api:${a}`);
    for (const d of (evidence.databaseEntities || []))  concepts.add(`db:${d}`);
    for (const w of (evidence.workflowSteps || []))     concepts.add(`wf:${w}`);
    for (const a of (evidence.architectureComponents || [])) concepts.add(`arch:${a}`);
    return [...concepts];
  }

  static _extractKeyFacts(evidence) {
    const facts = [];
    if (evidence.apiPaths?.length)              facts.push(`APIs: ${evidence.apiPaths.join(', ')}`);
    if (evidence.databaseEntities?.length)      facts.push(`DB Entities: ${evidence.databaseEntities.join(', ')}`);
    if (evidence.entitySignatures?.length)      facts.push(`Signatures: ${evidence.entitySignatures.join(', ')}`);
    if (evidence.businessRules?.length)         facts.push(`Rules: ${evidence.businessRules.join(', ')}`);
    return facts;
  }
}
