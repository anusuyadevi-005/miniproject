import { normalizeEntityId } from './metadataNormalizer.js';

const EVENT_KEYWORDS = ['event', 'emit', 'on', 'listener', 'publish', 'subscribe', 'queue', 'webhook', 'callback'];

function findEventCandidates(knowledgeModel) {
  const candidates = [];
  const apis = knowledgeModel.apis || [];
  const methods = knowledgeModel.methods || [];
  const functions = knowledgeModel.functions || [];

  const grouped = [...apis, ...methods, ...functions];
  grouped.forEach((entity) => {
    const source = entity.metadata?.source || '';
    const text = `${entity.name} ${entity.path || ''} ${source}`.toLowerCase();
    if (EVENT_KEYWORDS.some((keyword) => text.includes(keyword))) {
      candidates.push({
        id: entity.id,
        name: entity.name,
        path: entity.path,
        type: entity.type,
        source: entity.metadata?.source || ''
      });
    }
  });

  return candidates;
}

export function analyzeEvents(knowledgeModel) {
  const repositoryId = knowledgeModel.repository?.id || 'unknown-repo';
  const candidates = findEventCandidates(knowledgeModel);

  return candidates.map((candidate) => ({
    eventId: normalizeEntityId(repositoryId, 'event', `${candidate.name}:${candidate.path}`),
    eventName: candidate.name,
    description: `Discovered event-related flow in ${candidate.path || candidate.type}.`,
    source: candidate.path,
    type: candidate.type,
    evidence: candidate.source,
    repository: repositoryId
  }));
}
