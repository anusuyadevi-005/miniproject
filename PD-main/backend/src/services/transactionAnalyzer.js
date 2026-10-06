import { normalizeEntityId } from './metadataNormalizer.js';

const TRANSACTION_KEYWORDS = ['transaction', 'commit', 'rollback', 'atomic', 'savepoint', 'begin', 'end'];

export function analyzeTransactions(knowledgeModel) {
  const repositoryId = knowledgeModel.repository?.id || 'unknown-repo';
  const sources = [];
  const apis = knowledgeModel.apis || [];
  const methods = knowledgeModel.methods || [];
  const functions = knowledgeModel.functions || [];

  apis.forEach((api) => {
    if (api.metadata?.source) sources.push(api.metadata.source.toLowerCase());
  });
  methods.forEach((method) => {
    if (method.metadata?.source) sources.push(method.metadata.source.toLowerCase());
  });
  functions.forEach((fn) => {
    if (fn.metadata?.source) sources.push(fn.metadata.source.toLowerCase());
  });

  const text = sources.join('\n');
  const matches = TRANSACTION_KEYWORDS.filter((keyword) => text.includes(keyword));

  return matches.map((keyword) => ({
    transactionId: normalizeEntityId(repositoryId, 'transaction', keyword),
    name: `${keyword.charAt(0).toUpperCase()}${keyword.slice(1)} Transaction`,
    description: `Detected transaction-related flow by static keyword matching for '${keyword}'.`,
    evidence: keyword,
    source: 'static analysis'
  }));
}
