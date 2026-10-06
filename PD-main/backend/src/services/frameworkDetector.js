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

function collectPackageDeps(packageJson) {
  const dependencies = packageJson?.dependencies || {};
  const devDependencies = packageJson?.devDependencies || {};
  return { dependencies, devDependencies };
}

export async function detectFrameworks(inventory) {
  const files = inventory.files || [];
  const packageJsonFiles = findFiles(files, 'package.json');
  const pyprojectFiles = findFiles(files, 'pyproject.toml');
  const composerJsonFiles = findFiles(files, 'composer.json');
  const pubspecFiles = findFiles(files, 'pubspec.yaml');
  const reqFiles = findFiles(files, 'requirements.txt');
  const pipfiles = findFiles(files, 'pipfile');
  const manifest = {};

  let packageJson = null;
  const allNames = new Set();

  for (const pkgFile of packageJsonFiles) {
    const content = await readTextFile(pkgFile);
    const parsed = parseJson(content);
    if (parsed) {
      if (!packageJson) packageJson = parsed;
      const deps = collectPackageDeps(parsed);
      Object.keys(deps.dependencies).forEach(d => allNames.add(d.toLowerCase()));
      Object.keys(deps.devDependencies).forEach(d => allNames.add(d.toLowerCase()));
    }
  }
  manifest.packageJson = packageJson;

  let pyproject = null;
  for (const pyFile of pyprojectFiles) {
    const content = await readTextFile(pyFile);
    const parsed = parseToml(content);
    if (parsed) {
      if (!pyproject) pyproject = parsed;
      const pDeps = parsed?.tool?.poetry?.dependencies || parsed?.project?.dependencies || {};
      Object.keys(pDeps).forEach(d => allNames.add(d.toLowerCase()));
    }
  }
  manifest.pyproject = pyproject;

  let composerJson = null;
  for (const compFile of composerJsonFiles) {
    const content = await readTextFile(compFile);
    const parsed = parseJson(content);
    if (parsed) {
      if (!composerJson) composerJson = parsed;
      if (parsed.require) Object.keys(parsed.require).forEach(d => allNames.add(d.toLowerCase()));
      if (parsed['require-dev']) Object.keys(parsed['require-dev']).forEach(d => allNames.add(d.toLowerCase()));
    }
  }
  manifest.composerJson = composerJson;

  let pubspec = null;
  for (const pubFile of pubspecFiles) {
    const content = await readTextFile(pubFile);
    const parsed = parseYaml(content);
    if (parsed) {
      if (!pubspec) pubspec = parsed;
      if (parsed.dependencies) Object.keys(parsed.dependencies).forEach(d => allNames.add(d.toLowerCase()));
      if (parsed.dev_dependencies) Object.keys(parsed.dev_dependencies).forEach(d => allNames.add(d.toLowerCase()));
    }
  }
  manifest.pubspec = pubspec;

  for (const rFile of reqFiles) {
    const reqContent = await readTextFile(rFile);
    if (reqContent) {
      reqContent.split('\n').forEach(line => {
        const clean = line.trim().split(/[=><~;]/)[0].trim().toLowerCase();
        if (clean && !clean.startsWith('#')) allNames.add(clean);
      });
    }
  }

  const frontend = new Set();
  const backend = new Set();
  const buildTools = new Set();
  const languages = new Set(inventory.metadata?.languages || []);

  if (allNames.has('react') || allNames.has('react-dom')) {
    frontend.add('React');
  }
  if (allNames.has('next')) {
    frontend.add('Next.js');
    backend.add('Next.js API');
  }
  if (allNames.has('vue')) {
    frontend.add('Vue');
  }
  if (allNames.has('@angular/core')) {
    frontend.add('Angular');
  }
  if (allNames.has('svelte')) {
    frontend.add('Svelte');
  }
  if (pubspec?.dependencies?.flutter || pubspec?.dev_dependencies?.flutter) {
    frontend.add('Flutter Web');
  }
  if (allNames.has('express')) {
    backend.add('Express');
  }
  if (allNames.has('@nestjs/core')) {
    backend.add('NestJS');
  }
  if (allNames.has('fastify')) {
    backend.add('Fastify');
  }
  if (Array.from(allNames).some((name) => name.includes('spring-boot'))) {
    backend.add('Spring Boot');
  }
  if (allNames.has('django')) {
    backend.add('Django');
  }
  if (allNames.has('flask')) {
    backend.add('Flask');
  }
  if (allNames.has('fastapi')) {
    backend.add('FastAPI');
  }
  if (allNames.has('laravel/framework')) {
    backend.add('Laravel');
  }
  if (allNames.has('aspnetcore') || allNames.has('microsoft.aspnetcore.app')) {
    backend.add('ASP.NET');
  }
  if (allNames.has('adonisjs')) {
    backend.add('AdonisJS');
  }

  if (allNames.has('vite')) {
    buildTools.add('Vite');
  }
  if (allNames.has('webpack')) {
    buildTools.add('Webpack');
  }
  if (allNames.has('rollup')) {
    buildTools.add('Rollup');
  }
  if (allNames.has('@babel/core') || allNames.has('babel-loader')) {
    buildTools.add('Babel');
  }

  if (packageJson?.dependencies && Object.keys(packageJson.dependencies).length > 0) {
    languages.add('JavaScript');
  }
  if (packageJson?.devDependencies && Object.keys(packageJson.devDependencies).length > 0) {
    languages.add('JavaScript');
  }
  if (pyproject || findFile(files, 'requirements.txt') || findFile(files, 'Pipfile')) {
    languages.add('Python');
  }
  if (composerJson) {
    languages.add('PHP');
  }
  if (findFile(files, 'go.mod')) {
    languages.add('Go');
  }
  if (findFile(files, 'Cargo.toml')) {
    languages.add('Rust');
  }
  if (findFile(files, 'pom.xml') || findFile(files, 'build.gradle') || findFile(files, 'settings.gradle')) {
    languages.add('Java');
  }
  if (findFile(files, 'pubspec.yaml')) {
    languages.add('Dart');
  }
  if (findFile(files, 'tsconfig.json')) {
    languages.add('TypeScript');
  }

  return {
    frontend: Array.from(frontend),
    backend: Array.from(backend),
    buildTools: Array.from(buildTools),
    languages: Array.from(languages),
    manifest
  };
}
