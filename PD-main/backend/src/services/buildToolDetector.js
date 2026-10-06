import fs from 'fs-extra';

function findFile(files, fileName) {
  return files.find((file) => file.relativePath.toLowerCase() === fileName.toLowerCase());
}

export async function detectBuildTools(inventory) {
  const files = inventory.files || [];
  const buildTools = new Set();

  if (findFile(files, 'vite.config.js') || findFile(files, 'vite.config.ts')) {
    buildTools.add('Vite');
  }
  if (findFile(files, 'webpack.config.js') || findFile(files, 'webpack.config.ts')) {
    buildTools.add('Webpack');
  }
  if (findFile(files, 'rollup.config.js') || findFile(files, 'rollup.config.mjs')) {
    buildTools.add('Rollup');
  }
  if (findFile(files, 'babel.config.js') || findFile(files, '.babelrc') || findFile(files, '.babelrc.json')) {
    buildTools.add('Babel');
  }
  if (findFile(files, 'pom.xml')) {
    buildTools.add('Maven');
  }
  if (findFile(files, 'build.gradle') || findFile(files, 'settings.gradle') || findFile(files, 'build.gradle.kts')) {
    buildTools.add('Gradle');
  }
  if (findFile(files, 'package.json')) {
    buildTools.add('npm');
  }
  if (findFile(files, 'yarn.lock')) {
    buildTools.add('Yarn');
  }
  if (findFile(files, 'pnpm-lock.yaml') || findFile(files, 'pnpm-lock.yml')) {
    buildTools.add('pnpm');
  }
  if (findFile(files, 'go.mod')) {
    buildTools.add('Go Modules');
  }
  if (findFile(files, 'Cargo.toml')) {
    buildTools.add('Cargo');
  }
  if (findFile(files, 'pubspec.yaml')) {
    buildTools.add('Pub');
  }

  return Array.from(buildTools);
}
