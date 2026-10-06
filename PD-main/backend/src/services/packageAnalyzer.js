export function analyzePackages(knowledgeModel = {}) {
  const packages = [];
  const files = knowledgeModel.files || [];
  const filePaths = files.map((file) => String(file.relativePath || ''));
  const technology = knowledgeModel.technology || {};
  const dependencies = (technology.dependencies || []).map((dep) => dep.name || dep);

  const packageNames = Array.from(new Set([...dependencies, ...filePaths]))
    .filter(Boolean)
    .slice(0, 20);

  packageNames.forEach((name, index) => {
    packages.push({
      id: `package-${index + 1}`,
      name,
      type: filePaths.includes(name) ? 'source' : 'dependency',
      description: filePaths.includes(name) ? 'Source package inferred from repository paths.' : 'Runtime dependency inferred from technology analysis.'
    });
  });

  return packages;
}
