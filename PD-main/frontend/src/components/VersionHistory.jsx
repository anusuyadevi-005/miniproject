import React, { useState, useEffect } from 'react';
import { History, GitCommit, Dna, RotateCcw, CheckCircle2, ShieldAlert } from 'lucide-react';

export default function VersionHistory() {
  const [history, setHistory] = useState([]);
  const [dnaList, setDnaList] = useState([]);
  const [isRollingBack, setIsRollingBack] = useState(false);

  useEffect(() => {
    fetchHistoryData();
  }, []);

  const fetchHistoryData = async () => {
    try {
      const [resHist, resDna] = await Promise.all([
        fetch('/api/version-history'),
        fetch('/api/dna')
      ]);
      if (resHist.ok) {
        const dataHist = await resHist.json();
        setHistory(dataHist);
      }
      if (resDna.ok) {
        const dataDna = await resDna.json();
        setDnaList(dataDna);
      }
    } catch (err) {
      console.error('Failed to fetch version history:', err);
    }
  };

  const handleRollback = async (versionId) => {
    if (!confirm('Are you sure you want to rollback documentation state to this version snapshot?')) return;
    setIsRollingBack(true);

    try {
      const res = await fetch('/api/version-history/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId })
      });
      const result = await res.json();
      if (result.success) {
        alert(`Successfully rolled back to version ${result.rolledBackVersion}!`);
        fetchHistoryData();
      }
    } catch (err) {
      console.error('Rollback failed:', err);
    } finally {
      setIsRollingBack(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <History className="w-7 h-7 text-cyan-400" />
          <span>Version History & Documentation DNA Ledger</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Cryptographic documentation DNA audit trail and point-in-time version rollbacks.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline List */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <GitCommit className="w-5 h-5 text-indigo-400" />
            <span>AST & Documentation Revision Timeline</span>
          </h3>

          <div className="relative pl-6 border-l-2 border-gray-800 space-y-6">
            {history.map((ver) => (
              <div key={ver.id} className="relative group">
                {/* Timeline Dot */}
                <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-cyan-500 border-4 border-[#0A0E17]"></div>

                <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <span className="text-sm font-bold text-cyan-400 font-mono">{ver.version}</span>
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded font-mono">
                        {ver.commitHash}
                      </span>
                      <span className="text-xs text-indigo-400 font-semibold">{ver.changeType}</span>
                    </div>

                    <button
                      onClick={() => handleRollback(ver.id)}
                      disabled={isRollingBack}
                      className="text-xs flex items-center space-x-1 px-3 py-1 rounded-lg bg-gray-800 hover:bg-cyan-500/20 hover:text-cyan-400 text-gray-300 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rollback</span>
                    </button>
                  </div>

                  <div className="text-xs text-gray-300 font-mono bg-gray-950 p-2.5 rounded-lg border border-gray-900">
                    {ver.diffSummary}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-500 pt-1">
                    <span>Target SDID: <strong className="text-gray-300 font-mono">{ver.sdid}</strong></span>
                    <span>Doc Score: {ver.confidenceBefore}% → <strong className="text-emerald-400">{ver.confidenceAfter}%</strong></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Documentation DNA Ledger Panel */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Dna className="w-5 h-5 text-cyan-400" />
            <span>Documentation DNA Fingerprints</span>
          </h3>

          <div className="space-y-3">
            {dnaList.map((dna) => (
              <div key={dna.id} className="p-3.5 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-cyan-400 font-bold">{dna.sdid}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${dna.isMatch ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                    {dna.isMatch ? 'DNA MATCH' : 'DNA DRIFT'}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-gray-400 truncate bg-gray-950 p-2 rounded">
                  {dna.combinedDNA}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
