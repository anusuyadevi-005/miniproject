import React, { useState } from 'react';
import ImpactGraphVisualization from './ImpactGraphVisualization';

export default function ImpactAnalysisExplorer({ repositoryId }) {
  const [sdid, setSdid] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleAnalyze = async () => {
    if (!sdid) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repository/${repositoryId}/impact/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdids: [sdid],
          changeType: 'MODIFIED',
          commitHash: 'latest'
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to analyze impact');
      setAnalysis(data.impactAnalysis);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 text-gray-800">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">Impact Radius Analyzer</h2>
        <div className="flex space-x-4">
          <input 
            type="text" 
            placeholder="Enter Root SDID (e.g., FUNC-000001)"
            value={sdid}
            onChange={(e) => setSdid(e.target.value)}
            className="flex-1 px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button 
            onClick={handleAnalyze}
            disabled={loading || !sdid}
            className="px-6 py-2 bg-blue-600 text-white rounded-md font-semibold disabled:bg-gray-400 hover:bg-blue-700 transition"
          >
            {loading ? 'Analyzing...' : 'Analyze Impact Radius'}
          </button>
        </div>
        {error && <div className="mt-4 text-red-600 font-medium">{error}</div>}
      </div>

      {analysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-[500px]">
          {/* Summary Panel */}
          <div className="lg:col-span-1 bg-white p-6 rounded-lg shadow-md border border-gray-200 overflow-y-auto">
            <h3 className="text-xl font-bold border-b pb-2 mb-4">Analysis Summary</h3>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg border">
                <div className="text-sm text-gray-500 font-medium">Root Entity</div>
                <div className="text-lg font-bold text-gray-900">{analysis.rootSDID}</div>
                <div className="text-sm mt-1">Change: <span className="font-semibold">{analysis.change.changeType}</span></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-center">
                  <div className="text-2xl font-bold text-red-700">{analysis.impactScore}</div>
                  <div className="text-xs font-semibold text-red-600 uppercase tracking-wide">Impact Score</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-100 text-center">
                  <div className="text-2xl font-bold text-green-700">{(analysis.confidence * 100).toFixed(0)}%</div>
                  <div className="text-xs font-semibold text-green-600 uppercase tracking-wide">Confidence</div>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">Direct Impacts</span>
                  <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-full">{analysis.directImpacts.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">Dependent Impacts</span>
                  <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">{analysis.dependentImpacts.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">Transitive Impacts</span>
                  <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">{analysis.transitiveImpacts.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">Affected Documentation</span>
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{analysis.documentationImpacts.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium text-gray-700">Affected Diagrams</span>
                  <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">{analysis.diagramImpacts.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Graph Visualization Panel */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden flex flex-col">
            <h3 className="text-xl font-bold p-4 border-b bg-gray-50">Impact Propagation Graph</h3>
            <div className="flex-1 p-2 bg-gray-50 relative">
              <ImpactGraphVisualization analysis={analysis} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
