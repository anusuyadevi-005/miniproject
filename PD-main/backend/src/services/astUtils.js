export function visit(node, callback, parent = null) {
  if (!node || typeof node !== 'object') return;
  callback(node, parent);
  const keys = Object.keys(node);
  for (const key of keys) {
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) {
        visit(child, callback, node);
      }
    } else if (value && typeof value === 'object' && key !== 'loc') {
      visit(value, callback, node);
    }
  }
}
