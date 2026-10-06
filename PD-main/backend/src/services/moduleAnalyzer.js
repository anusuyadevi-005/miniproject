export function analyzeModules(knowledgeModel = {}) {
  const modules = [];
  const files = knowledgeModel.files || [];
  const paths = files.map((file) => String(file.relativePath || ''));

  const moduleGroups = [
    { name: 'Frontend Modules', matcher: (path) => path.includes('frontend/') || path.endsWith('.jsx') || path.endsWith('.tsx') || path.endsWith('.vue'), kind: 'frontend' },
    { name: 'Controller Modules', matcher: (path) => path.includes('controller') || path.includes('route'), kind: 'controller' },
    { name: 'Service Modules', matcher: (path) => path.includes('service') || path.includes('usecase'), kind: 'service' },
    { name: 'Repository Modules', matcher: (path) => path.includes('model') || path.includes('repository') || path.includes('dao'), kind: 'repository' },
    { name: 'Infrastructure Modules', matcher: (path) => path.includes('middleware') || path.includes('auth') || path.includes('db/') || path.includes('config'), kind: 'infrastructure' }
  ];

  moduleGroups.forEach((group, index) => {
    const matchingPaths = paths.filter((path) => group.matcher(path));
    if (matchingPaths.length) {
      modules.push({
        id: `module-${index + 1}`,
        name: group.name,
        kind: group.kind,
        files: matchingPaths.slice(0, 10)
      });
    }
  });

  return modules;
}
