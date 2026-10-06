import { extractWorkflows } from './workflowExtractor.js';
import { analyzeStateTransitions } from './stateTransitionAnalyzer.js';
import { analyzeTransactions } from './transactionAnalyzer.js';
import { analyzeEvents } from './eventAnalyzer.js';

function buildMermaidFlowchart(workflows = []) {
  if (!workflows.length) return '';

  const lines = ['flowchart TD'];
  workflows.forEach((workflow, index) => {
    const nodeId = `W${index + 1}`;
    lines.push(`  ${nodeId}["${workflow.workflowName}"]`);
    if (workflow.api?.route) {
      lines.push(`  ${nodeId} -->|API: ${workflow.api.method}| API_${index + 1}["${workflow.api.route}"]`);
    }
    if (workflow.database) {
      lines.push(`  ${nodeId} --> DB_${index + 1}["${workflow.database}"]`);
    }
  });

  return lines.join('\n');
}

function buildSequenceDiagram(workflows = []) {
  if (!workflows.length) return '';
  const lines = ['sequenceDiagram'];

  workflows.forEach((workflow, index) => {
    const actor = workflow.authentication?.length ? 'User' : 'System';
    const service = workflow.controller || workflow.service || 'Service';
    lines.push(`  ${actor}->>${service}: ${workflow.entryPoint}`);
    lines.push(`  ${service}->>${service}: execute ${workflow.workflowName}`);
    lines.push(`  ${service}->>Database: persist or query data`);
  });

  return lines.join('\n');
}

export function analyzeBusinessLogic(knowledgeModel = {}) {
  const workflows = extractWorkflows(knowledgeModel);
  const stateTransitions = analyzeStateTransitions(knowledgeModel);
  const transactions = analyzeTransactions(knowledgeModel);
  const events = analyzeEvents(knowledgeModel);

  const businessRules = workflows.map((workflow) => ({
    ruleId: workflow.workflowId.replace(':', '-rule-'),
    name: `${workflow.workflowName} Rule Set`,
    description: `Detected business rule set for ${workflow.workflowName}.`,
    validation: workflow.validation || [],
    authentication: workflow.authentication || [],
    conditions: workflow.businessRules || [],
    source: workflow.candidateSource
  }));

  return {
    workflows,
    businessRules,
    stateTransitions,
    events,
    mermaidFlowchart: buildMermaidFlowchart(workflows),
    sequenceDiagram: buildSequenceDiagram(workflows),
    transactionFlows: transactions
  };
}
