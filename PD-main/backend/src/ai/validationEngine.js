export class ValidationEngine {
  static validateDocAgainstCode(codeString, markdownContent) {
    const warnings = [];

    // Extract parameters from code signature
    const paramMatch = codeString.match(/\(([^)]*)\)/);
    const codeParams = paramMatch ? paramMatch[1].split(',').map(p => p.trim().split(/[:=?]/)[0]).filter(Boolean) : [];

    codeParams.forEach(p => {
      if (!markdownContent.includes(p)) {
        warnings.push(`Parameter '${p}' present in code AST but missing in generated markdown documentation.`);
      }
    });

    return {
      isValid: warnings.length === 0,
      warnings,
      score: warnings.length === 0 ? 100 : Math.max(50, 100 - warnings.length * 20)
    };
  }
}
