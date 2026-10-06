export function analyzeModuleDependencies(astData) {
  const modules = new Map();
  const dependencies = [];

  const addModule = (moduleName) => {
    if (!modules.has(moduleName)) {
      modules.set(moduleName, { id: moduleName, label: moduleName, type: 'module' });
    }
  };

  const normalizeModule = (value) => String(value || '').replace(/\\/g, '/');

  for (const fn of astData.functions || []) {
    addModule(fn.file);
    fn.imports?.forEach((imp) => {
      const target = normalizeModule(imp.file || imp.source);
      addModule(target);
      dependencies.push({ source: fn.file, target, relationship: 'imports' });
    });
  }

  for (const cls of astData.classes || []) {
    addModule(cls.file);
    cls.imports?.forEach((imp) => {
      const target = normalizeModule(imp.file || imp.source);
      addModule(target);
      dependencies.push({ source: cls.file, target, relationship: 'imports' });
    });
  }

  return {
    nodes: Array.from(modules.values()),
    edges: dependencies
  };
}
