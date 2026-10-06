import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, CheckCircle2, Code, Hash, Layers } from 'lucide-react';

export default function DocViewer() {
  const [sdidList, setSdidList] = useState([]);
  const [selectedSdid, setSelectedSdid] = useState('');
  const [sdidData, setSdidData] = useState(null);
  const [activeArtifactTab, setActiveArtifactTab] = useState('Paragraph');
  const [editableCode, setEditableCode] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSDIDList();
  }, []);

  const fetchSDIDList = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/sdid');
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setSdidList(list);

      if (list.length > 0) {
        const firstSdid = list[0].sdid;
        setSelectedSdid(firstSdid);
        fetchSDIDArtifacts(firstSdid);
      } else {
        setSdidData(null);
      }
    } catch (err) {
      console.error('Failed to fetch SDID list:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSDIDArtifacts = async (targetSdid) => {
    if (!targetSdid) return;
    try {
      const res = await fetch(`/api/sdid/artifacts/${encodeURIComponent(targetSdid)}`);
      const data = await res.json();
      setSdidData(data);
      if (data && data.signature) {
        setEditableCode(data.signature);
      } else {
        setEditableCode('');
      }
    } catch (err) {
      console.error('Failed to fetch SDID artifacts:', err);
    }
  };

  const handleSelectSymbol = (e) => {
    const sdidVal = e.target.value;
    setSelectedSdid(sdidVal);
    fetchSDIDArtifacts(sdidVal);
  };

  const triggerSelectiveRegen = async () => {
    if (!selectedSdid) return;
    setIsRegenerating(true);
    try {
      const res = await fetch('/api/ai/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sdid: selectedSdid,
          rawCode: editableCode,
          diffSummary: `Selective update for ${selectedSdid} tagged objects`
        })
      });
      await res.json();
      fetchSDIDArtifacts(selectedSdid);
    } catch (err) {
      console.error('Selective regen failed:', err);
    } finally {
      setIsRegenerating(false);
    }
  };

  const activeArtifact = sdidData?.artifacts?.find(a => a.artifactType === activeArtifactTab) || sdidData?.artifacts?.[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <FileText className="w-7 h-7 text-cyan-400" />
            <span>SDID Multi-Artifact Inspector</span>
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            Every discovered code symbol is assigned a Semantic Documentation ID (<code className="text-cyan-400 font-bold">SDID</code>). Updates target only artifacts tagged with the selected SDID.
          </p>
        </div>

        {sdidList.length > 0 && (
          <div className="flex items-center space-x-3 bg-gray-900 px-3 py-1.5 rounded-xl border border-gray-800">
            <Hash className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedSdid}
              onChange={handleSelectSymbol}
              className="bg-gray-950 text-cyan-400 font-mono text-xs font-bold border border-gray-800 rounded px-2 py-1 focus:outline-none"
            >
              {sdidList.map((item) => (
                <option key={item.sdid} value={item.sdid}>
                  {item.sdid}: {item.symbolName} ({item.symbolType})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {loading ? (
        <div className="glass-card p-12 rounded-2xl border border-gray-800 text-center text-gray-400 text-sm">
          Scanning repository for code symbols...
        </div>
      ) : !sdidData || !sdidData.sdid ? (
        <div className="glass-card p-12 rounded-2xl border border-gray-800 text-center space-y-3">
          <div className="text-lg font-semibold text-gray-300">
            No eligible code symbols detected in repository.
          </div>
          <p className="text-gray-500 text-xs">
            Analyze a public GitHub repository using the ASDSE Engine to dynamically extract code symbols and register SDIDs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Pane: Code AST Symbol */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Code className="w-4 h-4 text-cyan-400" />
                  <span className="text-sm font-semibold text-white">
                    Target Symbol: {sdidData.symbolType} {sdidData.symbolName}
                  </span>
                </div>
                <span className="text-xs font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {sdidData.sdid}
                </span>
              </div>

              <div className="mt-4">
                <label className="block text-xs text-gray-400 mb-1">
                  Source File Location: <code className="text-gray-200 font-mono">{sdidData.filePath || 'Not detected in repository.'}</code>
                </label>
                <textarea
                  value={editableCode}
                  onChange={(e) => setEditableCode(e.target.value)}
                  rows={8}
                  className="w-full p-4 rounded-xl bg-gray-950 border border-gray-800 text-cyan-300 font-mono text-xs leading-relaxed focus:outline-none focus:border-cyan-500 transition resize-none"
                />
              </div>

              <div className="mt-4 p-4 rounded-xl bg-gray-900/80 border border-gray-800 space-y-2 text-xs">
                <div className="font-bold text-gray-200">SDID Selective Propagation Rule:</div>
                <div className="text-gray-400">
                  When <code className="text-cyan-400 font-mono">{sdidData.symbolName}</code> changes, the system locates only artifacts containing <code className="text-cyan-400 font-mono">{sdidData.sdid}</code>. Paragraphs, diagrams, and tables tagged with this SDID are updated. All other repository docs remain untouched.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex justify-end">
              <button
                onClick={triggerSelectiveRegen}
                disabled={isRegenerating}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white text-xs font-semibold shadow-md shadow-cyan-500/20 hover:brightness-110 transition cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isRegenerating ? `Regenerating ${sdidData.sdid}...` : `Selective Regenerate ${sdidData.sdid} Objects`}</span>
              </button>
            </div>
          </div>

          {/* Right Pane: Tagged Documentation Artifacts */}
          <div className="glass-card p-5 rounded-2xl border border-gray-800 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-semibold text-white">
                  Tagged Documentation Artifacts ({sdidData.artifacts ? sdidData.artifacts.length : 0})
                </span>
              </div>
              <span className="text-xs text-emerald-400 font-bold">100% Isolated</span>
            </div>

            {/* Artifact Tabs */}
            {sdidData.artifacts && sdidData.artifacts.length > 0 && (
              <div className="flex space-x-2 border-b border-gray-800/60 pb-2 overflow-x-auto">
                {sdidData.artifacts.map((art) => (
                  <button
                    key={art.id}
                    onClick={() => setActiveArtifactTab(art.artifactType)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
                      activeArtifactTab === art.artifactType
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
                    }`}
                  >
                    {art.artifactType}
                  </button>
                ))}
              </div>
            )}

            {activeArtifact ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">{activeArtifact.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
                    Confidence: {activeArtifact.confidenceScore}%
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-gray-950 border border-gray-900 min-h-[220px] text-gray-300 text-xs font-mono whitespace-pre-wrap leading-relaxed overflow-auto">
                  {activeArtifact.content}
                </div>

                {/* Confidence Engine Reasons */}
                <div className="p-3 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                  <div className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">
                    Confidence Evaluation Factors:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-300">
                    {activeArtifact.confidenceReasons && activeArtifact.confidenceReasons.map((reason, idx) => (
                      <div key={idx} className="flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 text-xs">
                No artifacts tagged for this SDID symbol.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
