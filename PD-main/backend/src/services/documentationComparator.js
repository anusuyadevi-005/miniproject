import { DnaConfig } from '../config/dnaConfig.js';

/**
 * Documentation Comparator
 *
 * Compares a previous DNA record with a current DNA record
 * and calculates per-dimension similarity scores plus a
 * weighted composite change score (0–100).
 */
export class DocumentationComparator {

  /**
   * Compare two DNA objects.
   *
   * @param {object} previousDna
   * @param {object} currentDna
   * @returns {{ changeScore, dimensions, confidence }}
   */
  static compare(previousDna, currentDna) {
    if (!previousDna) {
      // First-time DNA – treat as a new doc, no comparison needed
      return {
        changeScore: 0,
        dimensions: this._zeroDimensions(),
        confidence: 1.0,
        changedFacts: [],
        unchangedFacts: currentDna?.keyFacts || []
      };
    }

    // Per-dimension dissimilarity (0 = identical, 100 = completely different)
    const contentDiss = previousDna.contentHash === currentDna.contentHash
      ? 0
      : this._tokenDissimilarity(
          previousDna.keyFacts?.join(' ') || '',
          currentDna.keyFacts?.join(' ') || ''
        );

    const semanticDiss = previousDna.semanticFingerprint === currentDna.semanticFingerprint
      ? 0
      : this._jaccardDissimilarity(previousDna.semanticConcepts, currentDna.semanticConcepts);

    const dependencyDiss = this._jaccardDissimilarity(previousDna.relatedDependencies, currentDna.relatedDependencies);
    const apiDiss        = this._jaccardDissimilarity(previousDna.relatedAPIs, currentDna.relatedAPIs);
    const databaseDiss   = this._jaccardDissimilarity(previousDna.relatedDatabaseEntities, currentDna.relatedDatabaseEntities);
    const archDiss       = this._jaccardDissimilarity(previousDna.relatedArchitectureComponents, currentDna.relatedArchitectureComponents);

    const dimensions = {
      content:      Math.round(contentDiss),
      semantic:     Math.round(semanticDiss),
      dependency:   Math.round(dependencyDiss),
      api:          Math.round(apiDiss),
      database:     Math.round(databaseDiss),
      architecture: Math.round(archDiss)
    };

    // Weighted composite score
    const W = DnaConfig.WEIGHTS;
    const changeScore = Math.round(
      dimensions.content      * W.content +
      dimensions.semantic     * W.semantic +
      dimensions.dependency   * W.dependency +
      dimensions.api          * W.api +
      dimensions.database     * W.database +
      dimensions.architecture * W.architecture
    );

    // Determine changed / unchanged facts
    const prevFacts = new Set(previousDna.keyFacts || []);
    const currFacts = new Set(currentDna.keyFacts || []);
    const changedFacts = [...currFacts].filter(f => !prevFacts.has(f));
    const unchangedFacts = [...currFacts].filter(f => prevFacts.has(f));

    // Confidence heuristic: high when dimensions clearly diverge
    // or clearly agree; low when scores are in the ambiguous middle.
    const confidence = this._computeConfidence(changeScore);

    return { changeScore, dimensions, confidence, changedFacts, unchangedFacts };
  }

  // ── Jaccard dissimilarity ────────────────────────────────

  static _jaccardDissimilarity(setA, setB) {
    const a = new Set((setA || []).map(s => String(s).toLowerCase().trim()));
    const b = new Set((setB || []).map(s => String(s).toLowerCase().trim()));

    if (a.size === 0 && b.size === 0) return 0;

    let intersection = 0;
    for (const item of a) { if (b.has(item)) intersection++; }
    const union = a.size + b.size - intersection;
    if (union === 0) return 0;

    const similarity = intersection / union; // 0-1
    return (1 - similarity) * 100;
  }

  // ── Token-level dissimilarity for content ────────────────

  static _tokenDissimilarity(textA, textB) {
    const tokensA = new Set(textA.toLowerCase().split(/\s+/).filter(Boolean));
    const tokensB = new Set(textB.toLowerCase().split(/\s+/).filter(Boolean));

    if (tokensA.size === 0 && tokensB.size === 0) return 0;

    let intersection = 0;
    for (const t of tokensA) { if (tokensB.has(t)) intersection++; }
    const union = tokensA.size + tokensB.size - intersection;
    if (union === 0) return 0;

    return (1 - intersection / union) * 100;
  }

  // ── Confidence heuristic ─────────────────────────────────

  static _computeConfidence(changeScore) {
    const T = DnaConfig.THRESHOLDS;
    // Very low or very high scores → high confidence
    if (changeScore <= T.NO_CHANGE_MAX) return 0.98;
    if (changeScore >= T.MAJOR_SEMANTIC_MIN) return 0.95;
    // Mid range → lower confidence (ambiguous zone)
    if (changeScore >= T.TEXT_ONLY_MAX && changeScore <= T.POTENTIAL_SEMANTIC_MAX) return 0.55;
    return 0.78;
  }

  static _zeroDimensions() {
    return { content: 0, semantic: 0, dependency: 0, api: 0, database: 0, architecture: 0 };
  }
}
