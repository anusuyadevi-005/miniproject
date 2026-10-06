import fs from 'fs-extra';
import path from 'path';

function findFile(files, fileName) {
  return files.find((file) => file.relativePath.toLowerCase() === fileName.toLowerCase());
}

export async function analyzePackageDependencies(inventory) {
  const packageGraph = { nodes: [], edges: [] };
  const files = inventory.files || [];

  const packageFiles = [
    'package.json',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'pyproject.toml',
    'requirements.txt',
    'Pipfile',
    'composer.json',
    'go.mod',
    'Cargo.toml',
    'pubspec.yaml'
  ];

  const packageFile = files.find((file) => packageFiles.includes(file.name));
  if (!packageFile) return packageGraph;

  packageGraph.nodes.push({ id: packageFile.relativePath, label: packageFile.name, type: 'package-file' });
  
  try {
    const content = await fs.readFile(packageFile.absolutePath, 'utf8');
    const dependencies = extractPackageNames(content, packageFile.name);
    dependencies.forEach((dep) => {
      packageGraph.nodes.push({ id: dep, label: dep, type: 'package' });
      packageGraph.edges.push({ source: packageFile.relativePath, target: dep, relationship: 'declares' });
    });
  } catch (err) {
    console.warn('Package dependency parse failed:', err.message);
  }

  return packageGraph;
}

function extractPackageNames(content, fileName) {
  const names = new Set();
  if (fileName === 'package.json' || fileName === 'composer.json') {
    try {
      const data = JSON.parse(content);
      const declare = data.dependencies || {};
      const dev = data.devDependencies || data['require-dev'] || {};
      Object.keys({ ...declare, ...dev }).forEach((name) => names.add(name));
    } catch (_err) {
      return names;
    }
  }

  if (fileName === 'requirements.txt' || fileName === 'Pipfile') {
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        names.add(trimmed.split(/==|>=|<=|~=|!=|===|>|</)[0].trim());
      }
    });
  }

  if (fileName === 'go.mod' || fileName === 'Cargo.toml' || fileName === 'pyproject.toml' || fileName === 'pubspec.yaml' || fileName === 'pnpm-lock.yaml' || fileName === 'yarn.lock' || fileName === 'package-lock.json') {
    content.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^[\s\"']*([A-Za-z0-9_@/.-]+)[\s\"']*/);
      if (match && match[1]) {
        names.add(match[1]);
      }
    });
  }

  return Array.from(names).filter(Boolean);
}
