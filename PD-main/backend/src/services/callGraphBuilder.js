export function buildCallGraph(symbolData) {
  const callGraph = [];
  const functions = symbolData.functions || [];
  const methods = symbolData.methods || [];

  const allRoutines = [...functions, ...methods];

  for (const routine of allRoutines) {
    const calledSymbols = extractCallees(routine.source || '');
    for (const callee of calledSymbols) {
      callGraph.push({
        caller: routine.name,
        callee,
        file: routine.file,
        location: routine.location
      });
    }
  }

  return callGraph;
}

function extractCallees(source) {
  if (!source) return [];
  const matches = source.match(/([A-Za-z_$][A-Za-z0-9_$]*)\s*\(/g) || [];
  return Array.from(new Set(matches.map((match) => match.replace(/\s*\(/, ''))));
}
