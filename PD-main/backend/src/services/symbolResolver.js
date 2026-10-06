export function resolveMethodClassName(method) {
  return method.className || (method.parent || '').split(':').slice(-1)[0] || null;
}

export function resolveEntityParentId(repositoryId, entity) {
  if (!entity) return repositoryId;
  if (entity.type === 'file') return entity.parent || repositoryId;
  if (entity.type === 'folder' || entity.type === 'repository') return entity.parent || repositoryId;
  if (entity.type === 'class' || entity.type === 'interface' || entity.type === 'enum' || entity.type === 'function') {
    return entity.parent || repositoryId;
  }
  if (entity.type === 'method') {
    return entity.parent || repositoryId;
  }
  if (entity.type === 'api' || entity.type === 'database' || entity.type === 'dependency') {
    return entity.parent || repositoryId;
  }
  return repositoryId;
}

export function resolveEntityDisplayName(entity) {
  if (!entity) return 'Unknown';
  return entity.name || entity.metadata?.route || entity.metadata?.provider || entity.id;
}
