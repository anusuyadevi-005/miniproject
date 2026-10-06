export function normalizeEntityId(repositoryId, type, pathOrName) {
  const key = String(pathOrName || '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').toLowerCase();
  return `${repositoryId}:${type}:${key}`;
}

export function normalizeRepository(repositoryId, inventory) {
  return {
    id: repositoryId,
    name: inventory.metadata?.name || inventory.repositoryId,
    type: 'repository',
    path: inventory.repositoryUrl || '',
    language: (inventory.metadata?.languages || [])[0] || 'Unknown',
    parent: null,
    children: [],
    dependencies: [],
    metadata: {
      url: inventory.repositoryUrl,
      scannedAt: inventory.scannedAt,
      languages: inventory.metadata?.languages || [],
      totalFiles: inventory.metadata?.totalFiles || 0,
      totalFolders: inventory.metadata?.totalFolders || 0,
      packageManagers: inventory.metadata?.packageManagers || [],
      repositoryHash: inventory.repositoryHash || null
    },
    relationships: []
  };
}

export function normalizeFolder(repositoryId, folder) {
  return {
    id: normalizeEntityId(repositoryId, 'folder', folder.relativePath),
    name: folder.name,
    type: 'folder',
    path: folder.relativePath,
    language: 'folder',
    parent: folder.parentFolder ? normalizeEntityId(repositoryId, 'folder', folder.parentFolder) : repositoryId,
    children: [],
    dependencies: [],
    metadata: {
      absolutePath: folder.absolutePath,
      depth: folder.depth,
      children: folder.children || []
    },
    relationships: []
  };
}

export function normalizeFile(repositoryId, file) {
  return {
    id: normalizeEntityId(repositoryId, 'file', file.relativePath),
    name: file.name,
    type: 'file',
    path: file.relativePath,
    language: file.language || file.extension || 'Unknown',
    parent: normalizeEntityId(repositoryId, 'folder', file.folder || file.relativePath.replace(/\\/g, '/').replace(/\/[^/]+$/, '')),
    children: [],
    dependencies: [],
    metadata: {
      absolutePath: file.absolutePath,
      size: file.size,
      lineCount: file.lineCount,
      mimeType: file.mimeType,
      hash: file.hash,
      isBinary: file.isBinary,
      createdDate: file.createdDate,
      modifiedDate: file.modifiedDate
    },
    relationships: []
  };
}

export function normalizeClass(repositoryId, cls) {
  return {
    id: normalizeEntityId(repositoryId, 'class', `${cls.file}:${cls.name}`),
    name: cls.name,
    type: 'class',
    path: cls.file,
    language: cls.language || inferLanguageFromPath(cls.file),
    parent: normalizeEntityId(repositoryId, 'file', cls.file),
    children: (cls.methods || []).map((method) => normalizeEntityId(repositoryId, 'method', `${cls.file}:${cls.name}:${method.name}`)),
    dependencies: cls.implementedInterfaces || cls.parentClass ? [cls.parentClass, ...(cls.implementedInterfaces || [])].filter(Boolean) : [],
    metadata: {
      visibility: cls.visibility,
      parentClass: cls.parentClass,
      implementedInterfaces: cls.implementedInterfaces || [],
      properties: cls.properties || [],
      location: cls.location,
      source: cls.source
    },
    relationships: []
  };
}

export function normalizeInterface(repositoryId, intf) {
  return {
    id: normalizeEntityId(repositoryId, 'interface', `${intf.file}:${intf.name}`),
    name: intf.name,
    type: 'interface',
    path: intf.file,
    language: intf.language || inferLanguageFromPath(intf.file),
    parent: normalizeEntityId(repositoryId, 'file', intf.file),
    children: [],
    dependencies: intf.extends || [],
    metadata: {
      location: intf.location,
      source: intf.source
    },
    relationships: []
  };
}

export function normalizeEnum(repositoryId, enm) {
  return {
    id: normalizeEntityId(repositoryId, 'enum', `${enm.file}:${enm.name}`),
    name: enm.name,
    type: 'enum',
    path: enm.file,
    language: enm.language || inferLanguageFromPath(enm.file),
    parent: normalizeEntityId(repositoryId, 'file', enm.file),
    children: [],
    dependencies: [],
    metadata: {
      location: enm.location,
      source: enm.source
    },
    relationships: []
  };
}

export function normalizeFunction(repositoryId, fn) {
  return {
    id: normalizeEntityId(repositoryId, 'function', `${fn.file}:${fn.name}`),
    name: fn.name,
    type: 'function',
    path: fn.file,
    language: fn.language || inferLanguageFromPath(fn.file),
    parent: normalizeEntityId(repositoryId, 'file', fn.file),
    children: [],
    dependencies: fn.parameters?.map((param) => param.type).filter(Boolean) || [],
    metadata: {
      parameters: fn.parameters || [],
      returnType: fn.returnType,
      visibility: fn.visibility,
      isAsync: fn.isAsync,
      isStatic: fn.isStatic,
      location: fn.location,
      source: fn.source
    },
    relationships: []
  };
}

export function normalizeMethod(repositoryId, method) {
  return {
    id: normalizeEntityId(repositoryId, 'method', `${method.file}:${method.className || 'unknown'}:${method.name}`),
    name: method.name,
    type: 'method',
    path: method.file,
    language: method.language || inferLanguageFromPath(method.file),
    parent: method.className ? normalizeEntityId(repositoryId, 'class', `${method.file}:${method.className}`) : normalizeEntityId(repositoryId, 'file', method.file),
    children: [],
    dependencies: method.parameters?.map((param) => param.type).filter(Boolean) || [],
    metadata: {
      className: method.className || null,
      parameters: method.parameters || [],
      returnType: method.returnType,
      visibility: method.visibility,
      isAsync: method.isAsync,
      isStatic: method.isStatic,
      location: method.location,
      source: method.source
    },
    relationships: []
  };
}

export function normalizeApi(repositoryId, api) {
  return {
    id: normalizeEntityId(repositoryId, 'api', `${api.path}:${api.name}`),
    name: api.name,
    type: 'api',
    path: api.path,
    language: api.language || 'Unknown',
    parent: normalizeEntityId(repositoryId, 'file', api.file || api.path || api.route || ''),
    children: [],
    dependencies: api.dependencies || [],
    metadata: {
      method: api.method || api.type || 'unknown',
      route: api.route || api.path,
      source: api.source || api.description || null
    },
    relationships: []
  };
}

export function normalizeDatabase(repositoryId, dbEntry) {
  return {
    id: normalizeEntityId(repositoryId, 'database', dbEntry.name || dbEntry.provider || dbEntry.type || 'database'),
    name: dbEntry.name || dbEntry.provider || dbEntry.type || 'database',
    type: 'database',
    path: dbEntry.path || '',
    language: dbEntry.language || 'Configuration',
    parent: repositoryId,
    children: [],
    dependencies: dbEntry.dependencies || [],
    metadata: {
      provider: dbEntry.provider,
      collections: dbEntry.collections || [],
      connectionString: dbEntry.connectionString || null,
      files: dbEntry.files || []
    },
    relationships: []
  };
}

export function normalizeDependency(repositoryId, dependency) {
  return {
    id: normalizeEntityId(repositoryId, 'dependency', `${dependency.source || dependency.file || 'dependency'}:${dependency.target || dependency.name || 'unknown'}`),
    name: dependency.name || dependency.target || `${dependency.source}->${dependency.target}`,
    type: 'dependency',
    path: dependency.source || dependency.file || null,
    language: dependency.language || 'Dependency',
    parent: repositoryId,
    children: [],
    dependencies: [],
    metadata: {
      source: dependency.source,
      target: dependency.target,
      relationship: dependency.relationship || dependency.type || 'uses',
      version: dependency.version || null,
      purpose: dependency.purpose || null
    },
    relationships: []
  };
}

export function normalizeConfiguration(configuration) {
  return {
    ...configuration,
    normalized: {
      environmentVariables: configuration.environmentVariables || [],
      files: configuration.files || [],
      docker: configuration.docker || {},
      runtime: configuration.runtime || {}
    }
  };
}

function inferLanguageFromPath(path) {
  if (!path) return 'Unknown';
  const lower = path.toLowerCase();
  if (lower.endsWith('.ts') || lower.endsWith('.tsx')) return 'TypeScript';
  if (lower.endsWith('.js') || lower.endsWith('.jsx')) return 'JavaScript';
  if (lower.endsWith('.py')) return 'Python';
  if (lower.endsWith('.java')) return 'Java';
  if (lower.endsWith('.cs')) return 'C#';
  if (lower.endsWith('.cpp') || lower.endsWith('.hpp') || lower.endsWith('.cc')) return 'C++';
  if (lower.endsWith('.go')) return 'Go';
  if (lower.endsWith('.php')) return 'PHP';
  return 'Unknown';
}
