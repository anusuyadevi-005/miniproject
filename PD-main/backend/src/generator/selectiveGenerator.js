export class SelectiveDocumentationGenerator {
  static evaluateNeed(classifierResult, currentConfidence, confidenceThreshold = 75) {
    if (classifierResult.requiresDocRegen || currentConfidence < confidenceThreshold) {
      return {
        shouldGenerate: true,
        reason: classifierResult.description || 'Doc confidence dropped below threshold.',
        priority: classifierResult.severity || 'HIGH'
      };
    }
    return {
      shouldGenerate: false,
      reason: 'Existing documentation matches current AST signature within tolerance.',
      priority: 'NONE'
    };
  }
}
