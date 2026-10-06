export function analyzeServiceRelationships(astData) {
  const services = [];
  const edges = [];

  const serviceByName = new Map();
  (astData.classes || []).forEach((cls) => {
    if (cls.isService || /Service$/.test(cls.name)) {
      serviceByName.set(cls.name, cls);
      services.push({ id: cls.name, label: cls.name, type: 'service' });
    }
  });

  (astData.methods || []).forEach((method) => {
    const owner = method.className;
    if (!owner || !serviceByName.has(owner)) return;
    method.calls?.forEach((callee) => {
      if (serviceByName.has(callee)) {
        edges.push({ source: owner, target: callee, relationship: 'calls-service' });
      }
    });
  });

  return { nodes: services, edges };
}
