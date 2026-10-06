import fs from 'fs-extra';
import yaml from 'js-yaml';
import toml from 'toml';

function findFiles(files, fileName) {
  return files.filter((file) => 
    (file.name || '').toLowerCase() === fileName.toLowerCase() || 
    file.relativePath.toLowerCase().endsWith('/' + fileName.toLowerCase()) || 
    file.relativePath.toLowerCase().endsWith('\\' + fileName.toLowerCase()) ||
    file.relativePath.toLowerCase() === fileName.toLowerCase()
  );
}

function findFile(files, fileName) {
  const matches = findFiles(files, fileName);
  return matches.length > 0 ? matches[0] : null;
}

async function readTextFile(file) {
  if (!file) return null;
  try {
    return await fs.readFile(file.absolutePath, 'utf8');
  } catch (err) {
    return null;
  }
}

function parseJson(content) {
  try {
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function parseYaml(content) {
  try {
    return yaml.load(content);
  } catch (err) {
    return null;
  }
}

function parseToml(content) {
  try {
    return toml.parse(content);
  } catch (err) {
    return null;
  }
}

function formatDependency(name, version, purpose) {
  return {
    name,
    version: version || 'unknown',
    purpose: purpose || 'runtime',
    requiredBy: [],
    unused: null
  };
}

export async function analyzeDependencies(inventory) {
  const files = inventory.files || [];
  const dependencies = [];
  const seenDeps = new Set();

  const addDep = (name, version, purpose) => {
    if (!name || typeof name !== 'string') return;
    const cleanName = name.trim();
    const key = cleanName.toLowerCase();
    if (seenDeps.has(key)) return;
    seenDeps.add(key);
    dependencies.push(formatDependency(cleanName, version, purpose));
  };

  const packageJsonFiles = findFiles(files, 'package.json');
  for (const pkgFile of packageJsonFiles) {
    const content = await readTextFile(pkgFile);
    const packageJson = parseJson(content);
    if (packageJson) {
      if (packageJson.dependencies) {
        Object.entries(packageJson.dependencies).forEach(([name, version]) => {
          addDep(name, String(version), 'runtime');
        });
      }
      if (packageJson.devDependencies) {
        Object.entries(packageJson.devDependencies).forEach(([name, version]) => {
          addDep(name, String(version), 'development');
        });
      }
    }
  }

  const reqFiles = findFiles(files, 'requirements.txt');
  for (const reqFile of reqFiles) {
    const content = await readTextFile(reqFile);
    if (content) {
      content.split(/\r?\n/).forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const [pkg, version] = trimmed.split(/==|>=|<=|~=|!=|===|>|</, 2);
        addDep(pkg.trim(), version?.trim() || 'latest', 'runtime');
      });
    }
  }

  const pyprojectFiles = findFiles(files, 'pyproject.toml');
  for (const pyFile of pyprojectFiles) {
    const content = await readTextFile(pyFile);
    const pyproject = parseToml(content);
    const projectDeps = pyproject?.tool?.poetry?.dependencies || pyproject?.project?.dependencies || {};
    Object.entries(projectDeps).forEach(([name, value]) => {
      if (name === 'python') return;
      let version = 'latest';
      if (typeof value === 'string') version = value;
      if (typeof value === 'object' && value?.version) version = value.version;
      addDep(name, version, 'runtime');
    });
    const devDeps = pyproject?.tool?.poetry?.dev-dependencies || pyproject?.tool?.poetry?.['dev-dependencies'] || {};
    Object.entries(devDeps).forEach(([name, value]) => {
      let version = 'latest';
      if (typeof value === 'string') version = value;
      if (typeof value === 'object' && value?.version) version = value.version;
      addDep(name, version, 'development');
    });
  }

  const pipfiles = findFiles(files, 'pipfile');
  for (const pipfile of pipfiles) {
    const content = await readTextFile(pipfile);
    const pipData = parseToml(content);
    Object.entries(pipData?.packages || {}).forEach(([name, version]) => {
      addDep(name, typeof version === 'string' ? version : JSON.stringify(version), 'runtime');
    });
    Object.entries(pipData?.dev-packages || {}).forEach(([name, version]) => {
      addDep(name, typeof version === 'string' ? version : JSON.stringify(version), 'development');
    });
  }

  const composerJsonFiles = findFiles(files, 'composer.json');
  for (const compFile of composerJsonFiles) {
    const content = await readTextFile(compFile);
    const composerJson = parseJson(content);
    if (composerJson) {
      Object.entries(composerJson.require || {}).forEach(([name, version]) => {
        addDep(name, String(version), 'runtime');
      });
      Object.entries(composerJson['require-dev'] || {}).forEach(([name, version]) => {
        addDep(name, String(version), 'development');
      });
    }
  }

  const goModFiles = findFiles(files, 'go.mod');
  for (const goModFile of goModFiles) {
    const content = await readTextFile(goModFile);
    if (content) {
      content.split(/\r?\n/).forEach((line) => {
        const match = line.trim().match(/^(require|replace)\s+([^\s]+)\s+(.+)$/);
        if (match) {
          addDep(match[2], match[3].trim(), 'runtime');
        }
      });
    }
  }

  const cargoFiles = findFiles(files, 'cargo.toml');
  for (const cargoFile of cargoFiles) {
    const content = await readTextFile(cargoFile);
    const cargo = parseToml(content);
    Object.entries(cargo?.dependencies || {}).forEach(([name, value]) => {
      if (name === 'package') return;
      const version = typeof value === 'string' ? value : value?.version || 'latest';
      addDep(name, version, 'runtime');
    });
    Object.entries(cargo?.['dev-dependencies'] || {}).forEach(([name, value]) => {
      const version = typeof value === 'string' ? value : value?.version || 'latest';
      addDep(name, version, 'development');
    });
  }

  const pubspecFiles = findFiles(files, 'pubspec.yaml');
  for (const pubspecFile of pubspecFiles) {
    const content = await readTextFile(pubspecFile);
    const pubspec = parseYaml(content);
    Object.entries(pubspec?.dependencies || {}).forEach(([name, value]) => {
      const version = typeof value === 'string' ? value : JSON.stringify(value);
      addDep(name, version, 'runtime');
    });
    Object.entries(pubspec?.dev_dependencies || {}).forEach(([name, value]) => {
      const version = typeof value === 'string' ? value : JSON.stringify(value);
      addDep(name, version, 'development');
    });
  }

  return dependencies;
}
