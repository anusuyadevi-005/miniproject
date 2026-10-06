import { normalizeRepository, normalizeFolder, normalizeFile, normalizeClass, normalizeInterface, normalizeEnum, normalizeFunction, normalizeMethod, normalizeApi, normalizeDatabase, normalizeDependency, normalizeConfiguration } from './metadataNormalizer.js';
import { mergeEntitiesById } from './entityMerger.js';
import { buildRelationshipGraph } from './relationshipIndexer.js';
import { buildSearchIndex } from './repositoryIndexer.js';

export function buildRepositoryKnowledgeModel({ inventory, technology, astAnalysis, dependencyAnalysis }) {
  const repository = normalizeRepository(inventory.repositoryId, inventory);

  const folders = (inventory.folders || []).map((folder) => normalizeFolder(inventory.repositoryId, folder));
  const files = (inventory.files || []).map((file) => normalizeFile(inventory.repositoryId, file));

  const classes = (astAnalysis.classes || []).map((cls) => normalizeClass(inventory.repositoryId, cls));
  const interfaces = (astAnalysis.interfaces || []).map((intf) => normalizeInterface(inventory.repositoryId, intf));
  const enums = (astAnalysis.enums || []).map((enm) => normalizeEnum(inventory.repositoryId, enm));
  const functions = (astAnalysis.functions || []).map((fn) => normalizeFunction(inventory.repositoryId, fn));
  const methods = (astAnalysis.methods || []).map((method) => normalizeMethod(inventory.repositoryId, method));

  const apis = (dependencyAnalysis.apis || []).map((api) => normalizeApi(inventory.repositoryId, api));
  const database = (dependencyAnalysis.database || []).map((db) => normalizeDatabase(inventory.repositoryId, db));

  const dependencies = [
    ...(dependencyAnalysis.dependencies || []).map((dependency) => normalizeDependency(inventory.repositoryId, dependency)),
    ...(dependencyAnalysis.moduleDependencies?.edges || []).map((edge) => normalizeDependency(inventory.repositoryId, { source: edge.source, target: edge.target, relationship: edge.relationship || 'imports' }))
  ];

  const configuration = normalizeConfiguration(technology.configuration || {});

  const mergedFolders = mergeEntitiesById(folders);
  const mergedFiles = mergeEntitiesById(files);
  const mergedClasses = mergeEntitiesById(classes);
  const mergedInterfaces = mergeEntitiesById(interfaces);
  const mergedEnums = mergeEntitiesById(enums);
  const mergedFunctions = mergeEntitiesById(functions);
  const mergedMethods = mergeEntitiesById(methods);
  const mergedApis = mergeEntitiesById(apis);
  const mergedDatabases = mergeEntitiesById(database);
  const mergedDependencies = mergeEntitiesById(dependencies);

  const callGraph = (dependencyAnalysis.callGraph || []).map((entry) => ({
    caller: entry.caller,
    callee: entry.callee,
    relationship: entry.relationship || 'calls',
    file: entry.file || null,
    location: entry.location || null
  }));

  const relationships = buildRelationshipGraph({
    repository,
    folders: mergedFolders,
    files: mergedFiles,
    classes: mergedClasses,
    interfaces: mergedInterfaces,
    enums: mergedEnums,
    functions: mergedFunctions,
    methods: mergedMethods,
    apis: mergedApis,
    database: mergedDatabases,
    dependencies: mergedDependencies,
    callGraph,
    technology
  });

  const searchIndex = buildSearchIndex({
    classes: mergedClasses,
    methods: mergedMethods,
    functions: mergedFunctions,
    files: mergedFiles,
    folders: mergedFolders,
    apis: mergedApis,
    databases: mergedDatabases
  });

  return {
    repository,
    folders: mergedFolders,
    files: mergedFiles,
    classes: mergedClasses,
    interfaces: mergedInterfaces,
    enums: mergedEnums,
    functions: mergedFunctions,
    methods: mergedMethods,
    apis: mergedApis,
    database: mergedDatabases,
    dependencies: mergedDependencies,
    callGraph,
    technology,
    configuration,
    relationships,
    searchIndex: {
      classes: Array.from(searchIndex.classes.keys()),
      methods: Array.from(searchIndex.methods.keys()),
      functions: Array.from(searchIndex.functions.keys()),
      files: Array.from(searchIndex.files.keys()),
      folders: Array.from(searchIndex.folders.keys()),
      apis: Array.from(searchIndex.apis.keys()),
      databases: Array.from(searchIndex.databases.keys())
    }
  };
}
