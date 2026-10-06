export function analyzeComplexity(symbolData) {
  const complexity = [];
  const allRoutines = [...(symbolData.functions || []), ...(symbolData.methods || [])];

  for (const routine of allRoutines) {
    const source = routine.source || '';
    const cyclomatic = calculateCyclomaticComplexity(source);
    const lineCount = source.split(/\r?\n/).length;
    const parameterCount = routine.parameters?.length || 0;
    const nestedLoops = countNestedLoops(source);

    complexity.push({
      name: routine.name,
      file: routine.file,
      cyclomaticComplexity: cyclomatic,
      methodLength: lineCount,
      parameterCount,
      nestedLoopCount: nestedLoops
    });
  }

  return complexity;
}

function calculateCyclomaticComplexity(source) {
  const patterns = [
    /\bif\b/g,
    /\belse if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\?\s*/g,
    /\b&&\b/g,
    /\b\|\|\b/g
  ];
  return patterns.reduce((score, pattern) => {
    const matches = source.match(pattern);
    return score + (matches ? matches.length : 0);
  }, 1);
}

function countNestedLoops(source) {
  const loopKeywords = ['for', 'while', 'do'];
  const lines = source.split(/\r?\n/);
  let nested = 0;
  let currentDepth = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (loopKeywords.some((kw) => trimmed.startsWith(kw))) {
      currentDepth += 1;
      nested = Math.max(nested, currentDepth);
    }
    if (trimmed.endsWith('}') || trimmed === '') {
      currentDepth = Math.max(0, currentDepth - 1);
    }
  }
  return nested > 0 ? nested - 1 : 0;
}
