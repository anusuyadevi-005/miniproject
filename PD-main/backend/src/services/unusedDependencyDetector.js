import path from 'path';

export function detectUnusedImports(astData) {
  const imports = astData.imports || [];
  const usedSymbols = new Set();

  const scanSource = (source) => {
    if (!source) return;
    const matches = source.match(/\b[A-Za-z_][A-Za-z0-9_]*\b/g) || [];
    matches.forEach((name) => usedSymbols.add(name));
  };

  (astData.functions || []).forEach((fn) => scanSource(fn.source));
  (astData.methods || []).forEach((method) => scanSource(method.source));
  (astData.classes || []).forEach((cls) => scanSource(cls.source));

  return imports.filter((imp) => {
    const importedNames = imp.specifiers || [imp.source];
    return importedNames.every((name) => !usedSymbols.has(name));
  }).map((imp) => ({ file: imp.file, source: imp.source, specifiers: imp.specifiers }));
}

export function detectUnusedPackages(inventory, astData) {
  const packageFiles = ['package.json', 'requirements.txt', 'pyproject.toml', 'composer.json', 'go.mod', 'Cargo.toml', 'pubspec.yaml'];
  const files = inventory.files || [];
  const dependencies = new Set();

  files.filter((file) => packageFiles.includes(file.name)).forEach((pkgFile) => {
    const content = pkgFile.source || '';
    content.split(/\r?\n/).forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return;
      const name = trimmed.split(/[:=\s]/)[0].replace(/['\",]/g, '').trim();
      if (name) dependencies.add(name);
    });
  });

  const used = new Set();
  (astData.imports || []).forEach((imp) => {
    if (imp.source) used.add(path.basename(imp.source));
  });

  return Array.from(dependencies).filter((name) => !used.has(name));
}

export function detectUnusedFiles(inventory, astData) {
  const files = inventory.files || [];
  const usedFiles = new Set();

  (astData.imports || []).forEach((imp) => {
    if (imp.file) usedFiles.add(imp.file);
    if (imp.source) usedFiles.add(imp.source);
  });

  return files
    .filter((file) => !usedFiles.has(file.relativePath) && file.extension !== 'md' && file.extension !== 'json')
    .map((file) => ({ file: file.relativePath, reason: 'No import dependencies found' }));
}
