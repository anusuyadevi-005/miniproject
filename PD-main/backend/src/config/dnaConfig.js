/**
 * Documentation DNA Configuration
 * 
 * All thresholds and weights for the DNA comparison and
 * regeneration decision pipeline. Edit this file to tune
 * sensitivity; never hard-code these values elsewhere.
 */
export const DnaConfig = {
  // ── Change Score Thresholds (0-100) ──────────────────────
  // 0-15   → No meaningful change
  // 16-35  → Minor textual / internal change
  // 36-60  → Potential semantic change
  // 61-80  → Significant semantic change
  // 81-100 → Major semantic change
  THRESHOLDS: {
    NO_CHANGE_MAX: 15,
    TEXT_ONLY_MAX: 35,
    POTENTIAL_SEMANTIC_MAX: 60,
    SIGNIFICANT_SEMANTIC_MAX: 80,
    MAJOR_SEMANTIC_MIN: 81
  },

  // ── Dimension Weights (should sum to ~1.0) ──────────────
  WEIGHTS: {
    content: 0.20,
    semantic: 0.40,
    dependency: 0.10,
    api: 0.15,
    database: 0.10,
    architecture: 0.05
  },

  // ── LLM Fallback ────────────────────────────────────────
  // If deterministic confidence is below this threshold,
  // invoke the configured LLM for a secondary opinion.
  LLM_CONFIDENCE_THRESHOLD: 0.6,

  // ── Similarity algorithm ────────────────────────────────
  // "jaccard" — set-overlap ratio (good for concept lists)
  // Used for semantic, API, DB, architecture, dependency
  SIMILARITY_ALGORITHM: 'jaccard'
};
