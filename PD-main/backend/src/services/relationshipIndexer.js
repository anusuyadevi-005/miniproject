export function buildRelationshipGraph({ repository, folders, files, classes, interfaces, enums, functions, methods, apis, database, dependencies, callGraph, technology }) {
  const relationships = [];

  const pushRel = (source, target, type, label) => {
    if (!source || !target) return;
    relationships.push({ source, target, type, label });
  };

  folders.forEach((folder) => {
    pushRel(repository.id, folder.id, 'contains', 'contains-folder');
    if (folder.parent && folder.parent !== repository.id) {
      pushRel(folder.parent, folder.id, 'contains', 'contains-folder');
    }
  });

  files.forEach((file) => {
    pushRel(file.parent || repository.id, file.id, 'contains', 'contains-file');
  });

  classes.forEach((cls) => {
    pushRel(cls.parent, cls.id, 'contains', 'contains-class');
    if (cls.metadata?.parentClass) {
      pushRel(normalizeParentId(cls.parent, cls.metadata.parentClass), cls.id, 'extends', 'extends');
    }
    (cls.metadata?.implementedInterfaces || []).forEach((intf) => {
      pushRel(normalizeParentId(cls.parent, intf), cls.id, 'implements', 'implements');
    });
  });

  methods.forEach((method) => {
    pushRel(method.parent, method.id, 'contains', 'contains-method');
  });

  functions.forEach((fn) => {
    pushRel(fn.parent, fn.id, 'contains', 'contains-function');
  });

  apis.forEach((api) => {
    pushRel(api.parent, api.id, 'exposes', 'exposes-api');
    (api.dependencies || []).forEach((dep) => {
      pushRel(api.id, dep, 'requires', 'api-depends-on');
    });
  });

  database.forEach((db) => {
    pushRel(repository.id, db.id, 'contains', 'contains-database');
    (db.metadata?.collections || []).forEach((collection) => {
      pushRel(db.id, collection, 'contains', 'contains-collection');
    });
  });

  dependencies.forEach((dependency) => {
    if (dependency.metadata?.source && dependency.metadata?.target) {
      pushRel(normalizeParentId(repository.id, dependency.metadata.source), normalizeParentId(repository.id, dependency.metadata.target), dependency.metadata.relationship || 'depends-on', dependency.metadata.relationship || 'depends-on');
    }
  });

  callGraph.forEach((edge) => {
    pushRel(edge.caller, edge.callee, 'calls', edge.relationship || 'calls');
  });

  return relationships;
}

function normalizeParentId(containerId, pathValue) {
  if (!pathValue) return containerId;
  if (pathValue.includes(':')) return pathValue;
  return `${containerId.split(':')[0]}:file:${pathValue}`;
}
