export function buildSearchIndex(model) {
  const index = {
    classes: new Map(),
    methods: new Map(),
    functions: new Map(),
    files: new Map(),
    folders: new Map(),
    apis: new Map(),
    databases: new Map()
  };

  (model.classes || []).forEach((item) => {
    index.classes.set(item.name.toLowerCase(), item);
  });
  (model.methods || []).forEach((item) => {
    index.methods.set(item.name.toLowerCase(), item);
  });
  (model.functions || []).forEach((item) => {
    index.functions.set(item.name.toLowerCase(), item);
  });
  (model.files || []).forEach((item) => {
    index.files.set(item.path.toLowerCase(), item);
    index.files.set(item.name.toLowerCase(), item);
  });
  (model.folders || []).forEach((item) => {
    index.folders.set(item.path.toLowerCase(), item);
    index.folders.set(item.name.toLowerCase(), item);
  });
  (model.apis || []).forEach((item) => {
    index.apis.set(item.name.toLowerCase(), item);
    if (item.metadata?.route) index.apis.set(item.metadata.route.toLowerCase(), item);
  });
  (model.database || []).forEach((item) => {
    index.databases.set(item.name.toLowerCase(), item);
  });

  return {
    findByName: (term) => {
      if (!term) return [];
      const key = term.toLowerCase();
      return [
        ...Array.from(index.classes.values()).filter((item) => item.name.toLowerCase().includes(key)),
        ...Array.from(index.methods.values()).filter((item) => item.name.toLowerCase().includes(key)),
        ...Array.from(index.functions.values()).filter((item) => item.name.toLowerCase().includes(key)),
        ...Array.from(index.files.values()).filter((item) => item.name.toLowerCase().includes(key) || item.path.toLowerCase().includes(key)),
        ...Array.from(index.folders.values()).filter((item) => item.name.toLowerCase().includes(key) || item.path.toLowerCase().includes(key)),
        ...Array.from(index.apis.values()).filter((item) => item.name.toLowerCase().includes(key) || (item.metadata?.route || '').toLowerCase().includes(key)),
        ...Array.from(index.databases.values()).filter((item) => item.name.toLowerCase().includes(key))
      ];
    }
  };
}
