import { db } from '../db/store.js';

export class ImpactPropagationEngine {
  static getGraph() {
    return db.dependencyGraph;
  }

  static calculateBlastRadius(sdid) {
    const { nodes, edges } = db.dependencyGraph;

    const affectedNodes = new Set();
    const queue = [sdid];
    affectedNodes.add(sdid);

    while (queue.length > 0) {
      const current = queue.shift();
      const outgoingEdges = edges.filter(e => e.source === current);
      outgoingEdges.forEach(e => {
        if (!affectedNodes.has(e.target)) {
          affectedNodes.add(e.target);
          queue.push(e.target);
        }
      });
    }

    const affectedDetails = Array.from(affectedNodes).map(id => {
      const node = nodes.find(n => n.id === id) || { id, label: id, type: 'Unknown', status: 'Affected' };
      return node;
    });

    return {
      rootSDID: sdid,
      blastRadiusScore: affectedNodes.size,
      impactedEntities: affectedDetails
    };
  }
}
