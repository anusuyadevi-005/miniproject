import { DnaConfig } from '../config/dnaConfig.js';

/**
 * DNA Change Classifier
 *
 * Given the per-dimension similarity scores from
 * DocumentationComparator, classifies the nature of the
 * change into one of the required decision types.
 */
export class DnaChangeClassifier {

  /**
   * Classify a comparison result.
   *
   * @param {{ changeScore, dimensions, confidence }} comparison
   * @returns {{ changeType, decision, reasons }}
   */
  static classify(comparison) {
    const { changeScore, dimensions, confidence } = comparison;
    const T = DnaConfig.THRESHOLDS;
    const reasons = [];

    // ── Low-confidence zone → REVIEW_REQUIRED ──────────────
    if (confidence < DnaConfig.LLM_CONFIDENCE_THRESHOLD) {
      reasons.push('Deterministic confidence is too low for an automatic decision.');
      return { changeType: 'REVIEW_REQUIRED', decision: 'REVIEW_REQUIRED', reasons };
    }

    // ── No meaningful change ───────────────────────────────
    if (changeScore <= T.NO_CHANGE_MAX) {
      reasons.push('All dimensions are within the no-change threshold.');
      return { changeType: 'NO_CHANGE', decision: 'DO_NOT_REGENERATE', reasons };
    }

    // ── Text-only / minor internal change ──────────────────
    if (changeScore <= T.TEXT_ONLY_MAX && dimensions.semantic === 0) {
      reasons.push('Content changed but the semantic fingerprint is identical.');
      return { changeType: 'TEXT_ONLY_CHANGE', decision: 'DO_NOT_REGENERATE', reasons };
    }

    // ── Specific dimension-dominated changes ───────────────
    if (dimensions.api >= 50) {
      reasons.push(`API dimension dissimilarity is ${dimensions.api}% – API paths or methods changed.`);
      return { changeType: 'API_CHANGE', decision: 'REGENERATE', reasons };
    }

    if (dimensions.database >= 50) {
      reasons.push(`Database dimension dissimilarity is ${dimensions.database}% – database entities or fields changed.`);
      return { changeType: 'DATABASE_CHANGE', decision: 'REGENERATE', reasons };
    }

    if (dimensions.architecture >= 50) {
      reasons.push(`Architecture dimension dissimilarity is ${dimensions.architecture}% – architecture components changed.`);
      return { changeType: 'ARCHITECTURE_CHANGE', decision: 'REGENERATE', reasons };
    }

    if (dimensions.dependency >= 50) {
      reasons.push(`Dependency dimension dissimilarity is ${dimensions.dependency}% – dependencies changed.`);
      return { changeType: 'DEPENDENCY_CHANGE', decision: 'REGENERATE', reasons };
    }

    // ── Workflow changes (inferred from semantic concepts) ──
    // Detect if workflow-specific concepts changed
    // (workflow steps are part of the semantic fingerprint)

    // ── General semantic change ────────────────────────────
    if (changeScore >= T.MAJOR_SEMANTIC_MIN) {
      reasons.push(`Composite change score ${changeScore} exceeds the major-change threshold.`);
      return { changeType: 'SEMANTIC_CHANGE', decision: 'REGENERATE', reasons };
    }

    if (changeScore > T.TEXT_ONLY_MAX) {
      reasons.push(`Composite change score ${changeScore} indicates a potential semantic change.`);
      return { changeType: 'SEMANTIC_CHANGE', decision: 'REGENERATE', reasons };
    }

    // Fallback
    reasons.push('Unable to classify with high confidence.');
    return { changeType: 'REVIEW_REQUIRED', decision: 'REVIEW_REQUIRED', reasons };
  }
}
