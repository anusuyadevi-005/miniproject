export function mergeEntitiesById(entities = []) {
  const map = new Map();
  for (const entity of entities) {
    if (!entity || !entity.id) continue;
    const existing = map.get(entity.id);
    if (!existing) {
      map.set(entity.id, { ...entity });
      continue;
    }

    map.set(entity.id, {
      ...existing,
      ...entity,
      children: Array.from(new Set([...(existing.children || []), ...(entity.children || [])])),
      dependencies: Array.from(new Set([...(existing.dependencies || []), ...(entity.dependencies || [])])),
      relationships: Array.from(new Set([...(existing.relationships || []), ...(entity.relationships || [])])),
      metadata: { ...existing.metadata, ...entity.metadata }
    });
  }

  return Array.from(map.values());
}

export function mergeEntityCollections(collections = []) {
  return mergeEntitiesById(collections.flat());
}
