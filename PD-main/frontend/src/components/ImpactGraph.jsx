import React, { useState, useEffect } from 'react';
import { Network, AlertCircle, ArrowUpRight, Zap, Target, Layers, ShieldCheck, Activity } from 'lucide-react';

export default function ImpactGraph() {
  const [selectedRadiusTier, setSelectedRadiusTier] = useState('MODULE');
  const [impactResult, setImpactResult] = useState(null);

  useEffect(() => {
    calculateRadius('SIGNATURE_ENHANCEMENT', 1);
  }, []);

  const calculateRadius = async (changeType, paramCountChanged) => {
    try {
      const res = await fetch('/api/impact/radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sdid: '', changeType, paramCountChanged })
      });
      const data = await res.json();
      setImpactResult(data);
      setSelectedRadiusTier(data.impactLevel);
    } catch (err) {
      console.error('Impact radius error:', err);
    }
  };

  const tiers = [
    { level: 'FUNCTION', title: 'Function Level', desc: 'Updates inline docstrings and parameter descriptions only.' },
    { level: 'CLASS', title: 'Class Level', desc: 'Updates class methods table and class summary.' },
    { level: 'MODULE', title: 'Module Level', desc: 'Updates module API summary & call graphs.' },
    { level: 'PACKAGE', title: 'Package Level', desc: 'Updates package dependencies & README.md.' },
    { level: 'ARCHITECTURE', title: 'Architecture Level', desc: 'Updates system architecture diagrams & sequence flows.' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Network className="w-7 h-7 text-cyan-400" />
          <span>Impact Radius Propagation Algorithm (Innovation #3)</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Hierarchical propagation algorithm determining the granular scope of documentation updates: <code className="text-cyan-400 font-bold">Function → Class → Module → Package → Architecture</code>.
        </p>
      </div>

      {/* Impact Radius Level Selector Controls */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {tiers.map((t) => {
          const isActive = selectedRadiusTier === t.level;
          return (
            <button
              key={t.level}
              onClick={() => {
                const paramCount = t.level === 'ARCHITECTURE' ? 4 : t.level === 'MODULE' ? 1 : 0;
                calculateRadius(t.level === 'ARCHITECTURE' ? 'BREAKING_REMOVAL' : 'SIGNATURE_ENHANCEMENT', paramCount);
              }}
              className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                isActive
                  ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                  : 'glass-card border-gray-800 text-gray-400 hover:border-gray-700'
              }`}
            >
              <div className="text-xs font-bold font-mono uppercase text-cyan-400">{t.level}</div>
              <div className="text-xs font-semibold text-white mt-1">{t.title}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Propagation Graph Canvas */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 flex flex-col justify-between min-h-[440px]">
          <div className="flex items-center justify-between border-b border-gray-800 pb-3">
            <span className="text-sm font-semibold text-white">Hierarchical Impact Propagation Canvas</span>
            <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              Active Tier: {selectedRadiusTier}
            </span>
          </div>

          <div className="my-6 relative flex items-center justify-center min-h-[300px] bg-gray-950/80 rounded-xl border border-gray-900 overflow-hidden">
            <svg className="w-full h-full absolute inset-0" viewBox="0 0 600 280">
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#4B5563" />
                </marker>
              </defs>

              {/* Tier 1: Function Node */}
              <g className="cursor-pointer">
                <circle cx="80" cy="140" r="26" fill={selectedRadiusTier === 'FUNCTION' ? '#065F46' : '#111827'} stroke="#10B981" strokeWidth="2" />
                <text x="80" y="144" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">Function</text>
              </g>

              <line x1="106" y1="140" x2="174" y2="140" stroke="#374151" strokeWidth="2" markerEnd="url(#arrow)" />

              {/* Tier 2: Class Node */}
              <g className="cursor-pointer">
                <circle cx="200" cy="140" r="26" fill={selectedRadiusTier === 'CLASS' ? '#065F46' : '#111827'} stroke="#06B6D4" strokeWidth="2" />
                <text x="200" y="144" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">Class</text>
              </g>

              <line x1="226" y1="140" x2="294" y2="140" stroke="#374151" strokeWidth="2" markerEnd="url(#arrow)" />

              {/* Tier 3: Module Node */}
              <g className="cursor-pointer">
                <circle cx="320" cy="140" r="28" fill={selectedRadiusTier === 'MODULE' ? '#1E1B4B' : '#111827'} stroke="#6366F1" strokeWidth="2" />
                <text x="320" y="144" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">Module</text>
              </g>

              <line x1="348" y1="140" x2="414" y2="140" stroke="#374151" strokeWidth="2" markerEnd="url(#arrow)" />

              {/* Tier 4: Package Node */}
              <g className="cursor-pointer">
                <circle cx="440" cy="140" r="26" fill={selectedRadiusTier === 'PACKAGE' ? '#312E81' : '#111827'} stroke="#818CF8" strokeWidth="2" />
                <text x="440" y="144" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold">Package</text>
              </g>

              <line x1="466" y1="140" x2="514" y2="140" stroke="#374151" strokeWidth="2" markerEnd="url(#arrow)" />

              {/* Tier 5: Architecture Node */}
              <g className="cursor-pointer">
                <circle cx="540" cy="140" r="26" fill={selectedRadiusTier === 'ARCHITECTURE' ? '#881337' : '#111827'} stroke="#F43F5E" strokeWidth="2" />
                <text x="540" y="144" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">Architecture</text>
              </g>
            </svg>
          </div>

          <div className="text-xs text-gray-400 text-center">
            {tiers.find(t => t.level === selectedRadiusTier)?.desc}
          </div>
        </div>

        {/* Sidebar: Calculated Impact Algorithm Results */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-400" />
            <span>Algorithm Calculation Drawer</span>
          </h3>

          {impactResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gray-900 border border-gray-800">
                <div className="text-xs text-gray-400">Target Symbol</div>
                <div className="text-lg font-bold text-white mt-0.5">{impactResult.symbolName}</div>
                <div className="text-xs font-mono text-cyan-400 mt-1">{impactResult.sdid}</div>
              </div>

              <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  Impact Radius Explanation:
                </div>
                <div className="text-xs text-gray-300 leading-relaxed">
                  {impactResult.explanation}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Tagged Artifacts Scheduled for Regeneration:
                </div>
                {impactResult.artifactsToRegenerate.map((art, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-gray-900 border border-gray-800 text-xs flex items-center justify-between">
                    <span className="text-gray-200 font-semibold">{art.title}</span>
                    <span className="text-cyan-400 text-[10px] font-mono">{art.type}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 py-8 text-center">Calculating impact algorithm...</div>
          )}
        </div>
      </div>
    </div>
  );
}
