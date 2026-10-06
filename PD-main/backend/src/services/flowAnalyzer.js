export function analyzeFlows(knowledgeModel = {}, components = []) {
  const flows = [];
  const apis = knowledgeModel.apis || [];
  const dependencies = knowledgeModel.dependencies || [];
  const callGraph = knowledgeModel.callGraph || [];

  apis.slice(0, 4).forEach((api, index) => {
    flows.push({
      id: `flow-${index + 1}`,
      name: `Request Flow ${index + 1}`,
      source: 'Client',
      target: 'Application',
      description: `Data flow for ${api.path || 'request endpoint'} was inferred from static route and dependency analysis.`,
      path: api.path || '/unknown'
    });
  });

  if (!flows.length && (dependencies.length || callGraph.length)) {
    flows.push({
      id: 'flow-default',
      name: 'Dependency Flow',
      source: 'Entry Point',
      target: 'Persistence Layer',
      description: 'A generic data flow was synthesized from static dependency edges.',
      path: '/unknown'
    });
  }

  return flows;
}
