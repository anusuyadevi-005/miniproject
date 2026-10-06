export function analyzeCallGraph(astData) {
  const callGraph = [];
  for (const fn of astData.functions || []) {
    fn.calls?.forEach((callee) => {
      callGraph.push({
        caller: fn.name,
        callee,
        type: 'function'
      });
    });
  }
  for (const method of astData.methods || []) {
    method.calls?.forEach((callee) => {
      callGraph.push({
        caller: `${method.file}.${method.name}`,
        callee,
        type: 'method'
      });
    });
  }
  return callGraph;
}
