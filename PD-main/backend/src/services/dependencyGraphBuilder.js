function normalizeName(name) {
  return String(name || '').replace(/\s+/g, '_').toLowerCase();
}

export function buildDependencyGraph(astData) {
  const nodes = new Map();
  const edges = [];

  for (const fn of astData.functions || []) {
    const key = normalizeName(`${fn.file}:${fn.name}`);
    nodes.set(key, { id: key, label: fn.name, type: 'function', file: fn.file });

    (fn.calls || []).forEach((callee) => {
      const target = normalizeName(`${fn.file}:${callee}`);
      nodes.set(target, { id: target, label: callee, type: 'function', file: fn.file });
      edges.push({ source: key, target, relationship: 'calls' });
    });
  }

  for (const cls of astData.classes || []) {
    const classKey = normalizeName(`${cls.file}:${cls.name}`);
    nodes.set(classKey, { id: classKey, label: cls.name, type: 'class', file: cls.file });
    cls.properties?.forEach((prop) => {
      if (prop.type) {
        const propKey = normalizeName(`${cls.file}:${prop.type}`);
        nodes.set(propKey, { id: propKey, label: prop.type, type: 'class', file: cls.file });
        edges.push({ source: classKey, target: propKey, relationship: 'hasProperty' });
      }
    });
    cls.methods?.forEach((method) => {
      const methodKey = normalizeName(`${cls.file}:${cls.name}.${method.name}`);
      nodes.set(methodKey, { id: methodKey, label: `${cls.name}.${method.name}`, type: 'method', file: cls.file });
      edges.push({ source: classKey, target: methodKey, relationship: 'ownsMethod' });
      (method.calls || []).forEach((callee) => {
        const target = normalizeName(`${cls.file}:${callee}`);
        nodes.set(target, { id: target, label: callee, type: 'function', file: cls.file });
        edges.push({ source: methodKey, target, relationship: 'calls' });
      });
    });
  }

  return { nodes: Array.from(nodes.values()), edges };
}

export function buildModuleGraph(astData) {
  const moduleNodes = new Map();
  const moduleEdges = [];

  for (const fn of astData.functions || []) {
    moduleNodes.set(fn.file, { id: fn.file, label: fn.file, type: 'module' });
    fn.imports?.forEach((imp) => {
      moduleNodes.set(imp.file || imp.source, { id: imp.file || imp.source, label: imp.file || imp.source, type: 'module' });
      moduleEdges.push({ source: fn.file, target: imp.file || imp.source, relationship: 'imports' });
    });
  }

  for (const cls of astData.classes || []) {
    moduleNodes.set(cls.file, { id: cls.file, label: cls.file, type: 'module' });
    cls.imports?.forEach((imp) => {
      moduleNodes.set(imp.file || imp.source, { id: imp.file || imp.source, label: imp.file || imp.source, type: 'module' });
      moduleEdges.push({ source: cls.file, target: imp.file || imp.source, relationship: 'imports' });
    });
  }

  return { nodes: Array.from(moduleNodes.values()), edges: moduleEdges };
}

export function buildPackageGraph(astData, metadata) {
  const packageNodes = new Map();
  const packageEdges = [];

  const packageHierarchy = [
    { name: 'Controllers', pattern: /controller/i },
    { name: 'Services', pattern: /service/i },
    { name: 'Repositories', pattern: /repository/i },
    { name: 'Database', pattern: /db|database/i }
  ];

  for (const cls of astData.classes || []) {
    const packageName = packageHierarchy.find((pkg) => pkg.pattern.test(cls.file))?.name || 'Other';
    const nodeId = normalizeName(packageName);
    packageNodes.set(nodeId, { id: nodeId, label: packageName, type: 'package' });
  }

  for (const edge of (astData.relationships || [])) {
    const sourcePackage = normalizeName(packageHierarchy.find((pkg) => pkg.pattern.test(edge.source))?.name || 'Other');
    const targetPackage = normalizeName(packageHierarchy.find((pkg) => pkg.pattern.test(edge.target))?.name || 'Other');
    if (sourcePackage !== targetPackage) {
      packageEdges.push({ source: sourcePackage, target: targetPackage, relationship: edge.type });
    }
  }

  return { nodes: Array.from(packageNodes.values()), edges: packageEdges };
}
