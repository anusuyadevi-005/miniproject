import { normalizeEntityId } from './metadataNormalizer.js';

const TRANSITION_KEYWORDS = ['pending', 'approved', 'completed', 'cancelled', 'failed', 'active', 'inactive', 'processing', 'shipped', 'delivered'];

function collectStateCandidates(knowledgeModel) {
  const textSources = [];
  const apis = knowledgeModel.apis || [];
  const methods = knowledgeModel.methods || [];
  const functions = knowledgeModel.functions || [];

  apis.forEach((api) => textSources.push(`${api.name} ${api.path} ${api.metadata?.source || ''}`));
  methods.forEach((method) => textSources.push(`${method.name} ${method.metadata?.source || ''}`));
  functions.forEach((fn) => textSources.push(`${fn.name} ${fn.metadata?.source || ''}`));

  return textSources.join('\n').toLowerCase();
}

function findStateSequence(sourceText = '') {
  const states = TRANSITION_KEYWORDS.filter((keyword) => sourceText.includes(keyword));
  return Array.from(new Set(states));
}

export function analyzeStateTransitions(knowledgeModel) {
  const repositoryId = knowledgeModel.repository?.id || 'unknown-repo';
  const sourceText = collectStateCandidates(knowledgeModel);
  const states = findStateSequence(sourceText);

  if (states.length < 2) return [];

  const transitions = [];
  for (let idx = 0; idx < states.length - 1; idx += 1) {
    transitions.push({
      transitionId: normalizeEntityId(repositoryId, 'stateTransition', `${states[idx]}-to-${states[idx + 1]}`),
      beforeState: states[idx],
      afterState: states[idx + 1],
      rules: [],
      source: 'static analysis'
    });
  }

  return transitions;
}
