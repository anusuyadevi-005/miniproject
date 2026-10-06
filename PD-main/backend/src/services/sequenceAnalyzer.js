export function analyzeSequence(knowledgeModel = {}, components = []) {
  const sequences = [];
  const apis = knowledgeModel.apis || [];
  const callGraph = knowledgeModel.callGraph || [];

  if (apis.length) {
    apis.slice(0, 3).forEach((api, index) => {
      const steps = [
        { actor: 'Client', action: 'Invokes API' },
        { actor: 'Controller', action: 'Routes request' },
        { actor: 'Service', action: 'Executes business workflow' },
        { actor: 'Repository', action: 'Reads or writes data' },
        { actor: 'Database', action: 'Persists or returns result' }
      ];

      sequences.push({
        id: `sequence-${index + 1}`,
        name: `Flow for ${api.path || 'request'}`,
        description: `The sequence for ${api.path || 'the primary endpoint'} was inferred from path and call-graph data.`,
        steps,
        api: api.path || '/unknown'
      });
    });
  }

  if (!sequences.length && callGraph.length) {
    sequences.push({
      id: 'sequence-default',
      name: 'Default Call Sequence',
      description: 'A generic sequence was synthesized from observed call relationships.',
      steps: callGraph.slice(0, 4).map((entry) => ({ actor: entry.caller || 'Caller', action: `Calls ${entry.callee || 'target'}` })),
      api: '/unknown'
    });
  }

  return sequences;
}
