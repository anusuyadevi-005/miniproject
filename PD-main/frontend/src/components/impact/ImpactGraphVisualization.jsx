import React, { useMemo, useState } from 'react';

// A simple custom visualization using SVG since we don't have reactflow available
export default function ImpactGraphVisualization({ analysis }) {
  const [selectedNode, setSelectedNode] = useState(null);

  const { nodes, edges } = useMemo(() => {
    if (!analysis) return { nodes: [], edges: [] };
    
    const nodes = [];
    const edges = [];
    const nodeMap = new Set();
    
    // Add Root Node
    nodes.push({ id: analysis.rootSDID, label: analysis.rootSDID, level: 'ROOT', x: 400, y: 50 });
    nodeMap.add(analysis.rootSDID);
    
    // Helper to calculate positions based on level
    const levelCounts = { DIRECT: 0, DEPENDENT: 0, TRANSITIVE: 0, DOCUMENTATION: 0, DIAGRAM: 0 };
    const levelY = { DIRECT: 150, DEPENDENT: 250, TRANSITIVE: 350, DOCUMENTATION: 450, DIAGRAM: 450 };
    
    const processEntities = (entities, level) => {
      entities.forEach(entity => {
        if (!nodeMap.has(entity.sdid)) {
          const count = levelCounts[level]++;
          nodes.push({
            id: entity.sdid,
            label: entity.sdid,
            level: level,
            x: 150 + (count * 150),
            y: levelY[level],
            data: entity
          });
          nodeMap.add(entity.sdid);
        }
      });
    };

    processEntities(analysis.directImpacts, 'DIRECT');
    processEntities(analysis.dependentImpacts, 'DEPENDENT');
    processEntities(analysis.transitiveImpacts, 'TRANSITIVE');
    processEntities(analysis.documentationImpacts, 'DOCUMENTATION');
    processEntities(analysis.diagramImpacts, 'DIAGRAM');

    // Create edges based on relationship paths
    analysis.relationshipPaths.forEach(rp => {
      if (rp.path && rp.path.length >= 2) {
        for (let i = 0; i < rp.path.length - 1; i++) {
          const source = rp.path[i];
          const target = rp.path[i+1];
          if (nodeMap.has(source) && nodeMap.has(target)) {
            edges.push({ id: `${source}-${target}`, source, target });
          }
        }
      }
    });

    return { nodes, edges };
  }, [analysis]);

  const getNodeColor = (level) => {
    switch(level) {
      case 'ROOT': return '#1F2937'; // gray-800
      case 'DIRECT': return '#DC2626'; // red-600
      case 'DEPENDENT': return '#EA580C'; // orange-600
      case 'TRANSITIVE': return '#CA8A04'; // yellow-600
      case 'DOCUMENTATION': return '#2563EB'; // blue-600
      case 'DIAGRAM': return '#9333EA'; // purple-600
      default: return '#6B7280';
    }
  };

  return (
    <div className="w-full h-full min-h-[400px] relative">
      <svg width="100%" height="100%" style={{ minHeight: '400px' }}>
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="25" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#9CA3AF" />
          </marker>
        </defs>
        {edges.map(edge => {
          const sourceNode = nodes.find(n => n.id === edge.source);
          const targetNode = nodes.find(n => n.id === edge.target);
          if (!sourceNode || !targetNode) return null;
          return (
            <line 
              key={edge.id}
              x1={sourceNode.x} y1={sourceNode.y}
              x2={targetNode.x} y2={targetNode.y}
              stroke="#9CA3AF" strokeWidth="2"
              markerEnd="url(#arrowhead)"
            />
          );
        })}
        {nodes.map(node => (
          <g 
            key={node.id} 
            transform={`translate(${node.x}, ${node.y})`}
            onClick={() => setSelectedNode(node.data || { sdid: node.id, reason: 'Root Entity' })}
            className="cursor-pointer"
          >
            <circle r="20" fill={getNodeColor(node.level)} />
            <text y="35" textAnchor="middle" fontSize="12" fill="#374151" fontWeight="bold">{node.label}</text>
          </g>
        ))}
      </svg>
      
      {selectedNode && (
        <div className="absolute bottom-4 right-4 bg-white p-4 rounded-lg shadow-xl border border-gray-200 max-w-sm">
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-bold text-gray-900">{selectedNode.sdid}</h4>
            <button onClick={() => setSelectedNode(null)} className="text-gray-400 hover:text-gray-600">✕</button>
          </div>
          {selectedNode.impactLevel && (
            <div className="mb-2">
              <span className="text-xs font-semibold px-2 py-1 rounded bg-gray-100 text-gray-700">{selectedNode.impactLevel}</span>
              <span className="ml-2 text-xs font-semibold text-red-600">Score: {selectedNode.impactScore}</span>
            </div>
          )}
          <p className="text-sm text-gray-600">{selectedNode.reason}</p>
        </div>
      )}
    </div>
  );
}
