import crypto from 'crypto';

/**
 * Semantic Fingerprint Generator
 * 
 * Creates a deterministic SHA-256 hash from structured
 * repository evidence.  The fingerprint captures the
 * *semantic meaning* of a documentation section – not
 * its textual formatting.
 */
export class SemanticFingerprint {

  /**
   * Normalise a content string for hashing:
   *  • collapse whitespace / line endings
   *  • strip Markdown formatting noise (headers, bold, italic markers)
   *  • remove generated timestamps / page numbers
   *  • lowercase
   *
   * Preserves meaningful tokens: function names, API paths,
   * DB fields, business rules, parameters, return types.
   */
  static normalizeContent(text) {
    if (!text) return '';
    let normalized = text;

    // Collapse line endings
    normalized = normalized.replace(/\r\n/g, '\n');

    // Remove Markdown formatting characters (but keep the text)
    normalized = normalized.replace(/#{1,6}\s*/g, '');       // headers
    normalized = normalized.replace(/\*{1,2}([^*]+)\*{1,2}/g, '$1'); // bold / italic
    normalized = normalized.replace(/_([^_]+)_/g, '$1');     // italic _
    normalized = normalized.replace(/`{1,3}/g, '');          // code fences

    // Remove generated timestamps like "Generated on 2025-08-11T..."
    normalized = normalized.replace(/generated\s+on\s+\d{4}-\d{2}-\d{2}[T\s][\d:.Z+-]*/gi, '');

    // Remove page numbers
    normalized = normalized.replace(/page\s*\d+/gi, '');

    // Collapse whitespace
    normalized = normalized.replace(/\s+/g, ' ').trim();

    // Lowercase for stable comparison
    normalized = normalized.toLowerCase();

    return normalized;
  }

  /**
   * Build a content hash (SHA-256) from the raw Markdown
   * after normalisation.  Detects *textual* changes.
   */
  static computeContentHash(markdownText) {
    const normalized = this.normalizeContent(markdownText);
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Build a semantic fingerprint from repository evidence.
   *
   * The evidence is canonicalized (sorted, de-duped, lowered)
   * so that ordering differences do not cause false positives.
   */
  static computeSemanticFingerprint(evidence) {
    const canonical = {
      sdids:          this._sortedUnique(evidence.relatedSDIDs),
      entityTypes:    this._sortedUnique(evidence.entityTypes),
      signatures:     this._sortedUnique(evidence.entitySignatures),
      apiMethods:     this._sortedUnique(evidence.apiMethods),
      apiPaths:       this._sortedUnique(evidence.apiPaths),
      dbEntities:     this._sortedUnique(evidence.databaseEntities),
      dbFields:       this._sortedUnique(evidence.databaseFields),
      relationships:  this._sortedUnique(evidence.relationships),
      workflowSteps:  this._sortedUnique(evidence.workflowSteps),
      archComponents: this._sortedUnique(evidence.architectureComponents),
      businessRules:  this._sortedUnique(evidence.businessRules),
      dependencies:   this._sortedUnique(evidence.dependencies),
      behaviors:      this._sortedUnique(evidence.documentedBehaviors)
    };

    const json = JSON.stringify(canonical);
    return crypto.createHash('sha256').update(json).digest('hex');
  }

  // ── helpers ──────────────────────────────────────────────

  static _sortedUnique(arr) {
    if (!arr || !Array.isArray(arr)) return [];
    return [...new Set(arr.map(s => String(s).toLowerCase().trim()))].sort();
  }
}
