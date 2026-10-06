export function analyzeRelationships(symbolData) {
  const relationships = [];
  const classes = symbolData.classes || [];

  for (const cls of classes) {
    if (cls.parentClass) {
      relationships.push({
        type: 'Inheritance',
        source: cls.name,
        target: cls.parentClass
      });
    }
    if (cls.implementedInterfaces?.length) {
      for (const iface of cls.implementedInterfaces) {
        relationships.push({
          type: 'Implementation',
          source: cls.name,
          target: iface
        });
      }
    }
    if (cls.properties?.length) {
      for (const prop of cls.properties) {
        if (prop.name && prop.type) {
          relationships.push({
            type: 'Composition',
            source: cls.name,
            target: prop.type,
            property: prop.name
          });
        }
      }
    }
  }

  return relationships;
}

export function analyzeDatabaseRelationships(entities, schemas) {
  const relationships = [];

  (entities || []).forEach((entity) => {
    (entity.relationships || []).forEach((rel) => {
      relationships.push({
        type: rel.type || 'Association',
        source: entity.name || entity.tableName || entity.collectionName || 'UnknownEntity',
        target: rel.target || 'UnknownEntity',
        field: rel.field || rel.property || null,
        sourceType: entity.type || 'Entity'
      });
    });
  });

  (schemas || []).forEach((schema) => {
    const raw = typeof schema.data === 'string' ? schema.data : JSON.stringify(schema.data);
    const fkRegex = /FOREIGN\s+KEY\s*\(([^\)]+)\)\s+REFERENCES\s+([A-Za-z0-9_\.]+)\s*\(([^\)]+)\)/gi;
    for (const match of raw.matchAll(fkRegex)) {
      relationships.push({
        type: 'ForeignKey',
        source: match[2],
        target: match[2],
        field: match[1].split(',').map((item) => item.trim()),
        reference: match[3].split(',').map((item) => item.trim()),
        definition: match[0].trim(),
        file: schema.file
      });
    }
  });

  return relationships;
}
