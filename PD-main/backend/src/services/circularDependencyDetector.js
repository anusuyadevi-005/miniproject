export function detectCircularDependencies(graph) {
  const nodes = graph.nodes || [];
  const edges = graph.edges || [];
  const adjacency = new Map();
  const cycles = [];

  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((edge) => {
    if (adjacency.has(edge.source)) {
      adjacency.get(edge.source).push(edge.target);
    }
  });

  const visited = new Set();
  const stack = new Set();

  function dfs(nodeId, path) {
    if (stack.has(nodeId)) {
      const cycleIndex = path.indexOf(nodeId);
      cycles.push(path.slice(cycleIndex).concat(nodeId));
      return;
    }
    if (visited.has(nodeId)) return;

    visited.add(nodeId);
    stack.add(nodeId);
    const neighbors = adjacency.get(nodeId) || [];
    for (const neighbor of neighbors) {
      dfs(neighbor, [...path, neighbor]);
    }
    stack.delete(nodeId);
  }

  nodes.forEach((node) => {
    if (!visited.has(node.id)) {
      dfs(node.id, [node.id]);
    }
  });

  return cycles;
}
