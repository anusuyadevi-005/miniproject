export class AnswerValidator {
  /**
   * Validates generated LLM answer against retrieved repository context to prevent hallucinations.
   * @param {string} answer - Generated text reply
   * @param {Array} evidenceList - Retrieved context evidence chunks
   * @param {Object} queryAnalysis - Discovered query details (category, matched entities)
   * @returns {Object} Validation score and safe answer
   */
  static validateAnswer(answer, evidenceList = [], queryAnalysis = {}) {
    // 1. If evidence list is completely empty or has no substantial content
    const hasEvidence = evidenceList && evidenceList.length > 0 && evidenceList.some(e => e.content && e.content.length > 20);
    
    if (!hasEvidence) {
      return {
        isValid: false,
        confidenceScore: 0,
        confidenceLevel: 'Low',
        validatedAnswer: 'I could not find sufficient evidence in the analyzed repository to answer this confidently.'
      };
    }

    const lowerAnswer = answer.toLowerCase();

    // 2. Scan for generic hallucination markers or standard LLM boilerplate
    const hallucinationKeywords = [
      'hypothetical', 'assume this repository', 'assuming that',
      'would typically have', 'usually has a class named', 'i assume'
    ];

    let hasHallucinationMarkers = false;
    hallucinationKeywords.forEach(kw => {
      if (lowerAnswer.includes(kw)) {
        hasHallucinationMarkers = true;
      }
    });

    // 3. Rate confidence level based on matched elements
    let confidenceLevel = 'Medium';
    let score = 70;

    // Check if exact symbol matches were retrieved
    const exactMatches = (queryAnalysis.matched || []).length;
    if (exactMatches > 0) {
      score += 20;
      confidenceLevel = 'High';
    }

    if (hasHallucinationMarkers) {
      score -= 30;
      confidenceLevel = 'Low';
    }

    // Ensure score boundaries
    score = Math.max(10, Math.min(100, score));

    return {
      isValid: score > 40,
      confidenceScore: score,
      confidenceLevel,
      validatedAnswer: answer
    };
  }
}
