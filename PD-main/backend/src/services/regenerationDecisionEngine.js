import crypto from 'crypto';
import { DocumentationDnaEngine } from './documentationDnaEngine.js';
import { DocumentationComparator } from './documentationComparator.js';
import { DnaChangeClassifier } from './dnaChangeClassifier.js';
import { DnaConfig } from '../config/dnaConfig.js';
import { LLMProviderFactory } from '../ai/llmProviderFactory.js';
import { getMongoStatus } from '../db/mongo.js';
import { DocumentationDNAHistory, RegenerationDecision } from '../models/DnaModels.js';
import { ImpactAnalyzer } from './impactAnalyzer.js';
import { db } from '../db/store.js';

/**
 * Regeneration Decision Engine
 *
 * Orchestrates the complete Documentation DNA pipeline:
 *
 *  1. Load impacted documentation IDs from an Impact Analysis.
 *  2. Retrieve previous DNA for each doc section.
 *  3. Generate current DNA.
 *  4. Compare.
 *  5. Classify.
 *  6. (Optional) invoke LLM when deterministic confidence is low.
 *  7. Persist DNA, history, and decision records.
 *  8. Return an array of decisions.
 */
export class RegenerationDecisionEngine {

  /**
   * Main entry point.
   *
   * @param {string} repositoryId
   * @param {string} impactAnalysisId
   * @returns {Promise<Array>} decisions
   */
  static async analyze(repositoryId, impactAnalysisId) {
    // 1. Load impact analysis
    const analysis = await ImpactAnalyzer.getAnalysis(repositoryId, impactAnalysisId);
    if (!analysis) {
      throw new Error(`Impact analysis "${impactAnalysisId}" not found for repository "${repositoryId}".`);
    }

    // 2. Extract documentation impacts (only DOCUMENTATION level)
    const docImpacts = (analysis.documentationImpacts || [])
      .concat((analysis.entities || []).filter(e => e.impactLevel === 'DOCUMENTATION'));

    if (docImpacts.length === 0) {
      return [];
    }

    const decisions = [];

    for (const impact of docImpacts) {
      const docId = impact.sdid || impact.docId;
      if (!docId) continue;

      const decision = await this._processDoc(repositoryId, docId, impactAnalysisId, impact);
      decisions.push(decision);
    }

    return decisions;
  }

  /**
   * Process a single doc: generate DNA, compare, classify, decide.
   */
  static async _processDoc(repositoryId, docId, analysisId, impact) {
    // Retrieve previous DNA (cached)
    const previousDna = await DocumentationDnaEngine.getPreviousDNA(repositoryId, docId);

    // Retrieve documentation content
    const docContent = this._getDocContent(repositoryId, docId);

    // Build evidence from impact metadata
    const evidence = this._buildEvidence(impact);

    // Generate current DNA
    const currentDna = await DocumentationDnaEngine.generateDNA(
      repositoryId, docId, docContent, evidence, 'latest'
    );

    // Compare
    const comparison = DocumentationComparator.compare(previousDna, currentDna);

    // Classify
    let classification = DnaChangeClassifier.classify(comparison);

    // ── LLM fallback (secondary evaluator only) ──────────
    if (comparison.confidence < DnaConfig.LLM_CONFIDENCE_THRESHOLD) {
      const llmResult = await this._invokeLLMFallback(previousDna, currentDna, comparison);
      if (llmResult) {
        classification = this._mergeLLMResult(classification, llmResult);
      }
    }

    // Build decision object
    const decisionId = `dec_${crypto.randomBytes(4).toString('hex')}`;
    const decisionRecord = {
      decisionId,
      docId,
      repositoryId,
      analysisId,
      decision: classification.decision,
      changeType: classification.changeType,
      score: comparison.changeScore,
      confidence: Number(comparison.confidence.toFixed(2)),
      reasons: classification.reasons,
      changedFacts: comparison.changedFacts,
      unchangedFacts: comparison.unchangedFacts
    };

    // Persist current DNA
    await DocumentationDnaEngine.saveDNA(currentDna);

    // Persist history
    await this._saveHistory(repositoryId, docId, previousDna, currentDna, comparison, decisionId);

    // Persist decision
    await this._saveDecision(decisionRecord);

    return decisionRecord;
  }

  // ── Evidence from impact data ───────────────────────────

  static _buildEvidence(impact) {
    return {
      relatedSDIDs:            impact.relatedSDIDs || [impact.sdid].filter(Boolean),
      entityTypes:             impact.entityTypes || [],
      entitySignatures:        impact.entitySignatures || [],
      apiMethods:              impact.apiMethods || [],
      apiPaths:                impact.apiPaths || impact.relatedAPIs || [],
      databaseEntities:        impact.databaseEntities || [],
      databaseFields:          impact.databaseFields || [],
      relationships:           impact.relationships || [],
      workflowSteps:           impact.workflowSteps || [],
      architectureComponents:  impact.architectureComponents || [],
      businessRules:           impact.businessRules || [],
      dependencies:            impact.dependencies || [],
      documentedBehaviors:     impact.documentedBehaviors || []
    };
  }

  // ── Doc content lookup ─────────────────────────────────

  static _getDocContent(repositoryId, docId) {
    // Try to find doc content from documentation blocks (in-memory store)
    const block = (db.documentationBlocks || []).find(b => b.id === docId || b.sdid === docId);
    return block?.content || '';
  }

  // ── LLM fallback ──────────────────────────────────────

  static async _invokeLLMFallback(previousDna, currentDna, comparison) {
    try {
      const provider = LLMProviderFactory.getProvider();
      if (provider.name === 'deterministic') {
        // No real LLM configured – skip
        return null;
      }

      const prompt = this._buildLLMPrompt(previousDna, currentDna, comparison);
      const raw = await provider.generateChapterContent(prompt);
      return this._parseLLMResponse(raw);
    } catch (err) {
      console.warn('LLM fallback error:', err.message);
      return null;
    }
  }

  static _buildLLMPrompt(previousDna, currentDna, comparison) {
    const prevConcepts = (previousDna?.semanticConcepts || []).slice(0, 15).join(', ');
    const currConcepts = (currentDna?.semanticConcepts || []).slice(0, 15).join(', ');
    const prevFacts = (previousDna?.keyFacts || []).slice(0, 10).join('; ');
    const currFacts = (currentDna?.keyFacts || []).slice(0, 10).join('; ');

    return `You are a semantic documentation change evaluator.
Compare the previous and current documentation evidence below.
Return ONLY a JSON object with this exact schema:
{"semanticChange":true/false,"confidence":0.0-1.0,"reason":"...","changedFacts":[],"unchangedFacts":[]}

Previous concepts: ${prevConcepts}
Previous key facts: ${prevFacts}
Previous SDIDs: ${(previousDna?.relatedSDIDs || []).join(', ')}

Current concepts: ${currConcepts}
Current key facts: ${currFacts}
Current SDIDs: ${(currentDna?.relatedSDIDs || []).join(', ')}

Deterministic change score: ${comparison.changeScore}
Deterministic confidence: ${comparison.confidence}

Return JSON only.`;
  }

  static _parseLLMResponse(raw) {
    if (!raw) return null;
    try {
      // Extract JSON from response
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      const parsed = JSON.parse(jsonMatch[0]);

      // Validate schema
      if (typeof parsed.semanticChange !== 'boolean') return null;
      if (typeof parsed.confidence !== 'number') return null;

      return {
        semanticChange: parsed.semanticChange,
        confidence: Math.max(0, Math.min(1, parsed.confidence)),
        reason: String(parsed.reason || ''),
        changedFacts: Array.isArray(parsed.changedFacts) ? parsed.changedFacts : [],
        unchangedFacts: Array.isArray(parsed.unchangedFacts) ? parsed.unchangedFacts : []
      };
    } catch (e) {
      console.warn('Failed to parse LLM response:', e.message);
      return null;
    }
  }

  static _mergeLLMResult(classification, llmResult) {
    if (llmResult.semanticChange && llmResult.confidence >= 0.7) {
      return {
        changeType: 'SEMANTIC_CHANGE',
        decision: 'REGENERATE',
        reasons: [...classification.reasons, `LLM secondary evaluation: ${llmResult.reason}`]
      };
    }
    if (!llmResult.semanticChange && llmResult.confidence >= 0.7) {
      return {
        changeType: classification.changeType === 'REVIEW_REQUIRED' ? 'NO_CHANGE' : classification.changeType,
        decision: 'DO_NOT_REGENERATE',
        reasons: [...classification.reasons, `LLM confirms no semantic change: ${llmResult.reason}`]
      };
    }
    // Still inconclusive
    return {
      changeType: 'REVIEW_REQUIRED',
      decision: 'REVIEW_REQUIRED',
      reasons: [...classification.reasons, 'LLM result was inconclusive.']
    };
  }

  // ── Persistence ────────────────────────────────────────

  static async _saveHistory(repositoryId, docId, previousDna, currentDna, comparison, decisionId) {
    const record = {
      docId,
      repositoryId,
      previousVersion: previousDna?.documentationVersion || 0,
      previousSemanticFingerprint: previousDna?.semanticFingerprint || null,
      previousContentHash: previousDna?.contentHash || null,
      currentSemanticFingerprint: currentDna.semanticFingerprint,
      currentContentHash: currentDna.contentHash,
      changeScore: comparison.changeScore,
      decisionId,
      changedFacts: comparison.changedFacts,
      unchangedFacts: comparison.unchangedFacts,
      decision: comparison.changeScore > 0 ? 'CHANGED' : 'UNCHANGED',
      commitHash: currentDna.commitHash
    };

    if (getMongoStatus().isConnected) {
      try { await DocumentationDNAHistory.create(record); } catch (e) { /* fallback */ }
    }
    if (!db.dnaHistory) db.dnaHistory = [];
    db.dnaHistory.push(record);
  }

  static async _saveDecision(decisionRecord) {
    if (getMongoStatus().isConnected) {
      try { await RegenerationDecision.create(decisionRecord); } catch (e) { /* fallback */ }
    }
    if (!db.regenerationDecisions) db.regenerationDecisions = [];
    db.regenerationDecisions.push(decisionRecord);
  }

  // ── Retrieval helpers ──────────────────────────────────

  static async getDNA(repositoryId, docId) {
    return DocumentationDnaEngine.getPreviousDNA(repositoryId, docId);
  }

  static async getDNAHistory(repositoryId, docId) {
    if (getMongoStatus().isConnected) {
      try {
        return await DocumentationDNAHistory.find({ repositoryId, docId }).sort({ createdAt: -1 }).lean();
      } catch (e) { /* fallback */ }
    }
    return (db.dnaHistory || []).filter(h => h.repositoryId === repositoryId && h.docId === docId);
  }
}
