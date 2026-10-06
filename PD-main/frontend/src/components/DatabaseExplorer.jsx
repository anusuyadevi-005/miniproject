import React, { useState, useEffect } from 'react';
import { Database, Search, CloudDownload, FileText, Code2, ListChecks } from 'lucide-react';

export default function DatabaseExplorer() {
  const [repoId, setRepoId] = useState('');
  const [projects, setProjects] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data || []);
      if (data && data.length > 0 && !repoId) {
        setRepoId(data[0].id || data[0].repoUrl);
      }
    } catch (err) {
      console.warn('Unable to fetch project list:', err.message);
    }
  };

  const fetchDatabaseAnalysis = async (targetId) => {
    const idToFetch = targetId || repoId;
    if (!idToFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repository/${encodeURIComponent(idToFetch.trim())}/database`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to load database analysis');
        setAnalysis(null);
      } else {
        setAnalysis(data.database || data);
      }
    } catch (err) {
      setError(err.message || 'Request failed');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${repoId || 'database'}-analysis.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = () => {
    if (!analysis?.diagrams?.markdown) return;
    const blob = new Blob([analysis.diagrams.markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${repoId || 'database'}-analysis.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadMermaid = () => {
    if (!analysis?.diagrams?.mermaid) return;
    const blob = new Blob([analysis.diagrams.mermaid], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${repoId || 'database'}-erd.mmd`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <div className="space-y-4">
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Database className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Database Explorer</h2>
              <p className="text-[11px] text-gray-400">Inspect repository database schema, ORM models, and indexes.</p>
            </div>
          </div>

          <div className="space-y-3">
            {projects.length > 0 && (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Select Analyzed Repository</label>
                <select
                  value={repoId}
                  onChange={(e) => {
                    const selected = e.target.value;
                    setRepoId(selected);
                    if (selected) fetchDatabaseAnalysis(selected);
                  }}
                  className="w-full bg-[#0A0E17] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">Select a repository...</option>
                  {projects.map((proj) => (
                    <option key={proj.id} value={proj.id}>
                      {proj.name} ({proj.id})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Or Enter Git URL / Repo ID</label>
              <input
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
                placeholder="https://github.com/owner/repo.git"
                className="w-full bg-[#0A0E17] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={() => fetchDatabaseAnalysis()}
              disabled={!repoId || loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-400 transition-all disabled:opacity-50"
            >
              <Search className="w-4 h-4" /> Load Database Schema
            </button>
            {analysis && (
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={downloadJson}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-slate-700 text-gray-100 text-xs font-semibold px-4 py-2 hover:bg-slate-600"
                >
                  <CloudDownload className="w-4 h-4" /> Download JSON
                </button>
                <button
                  onClick={downloadMarkdown}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-slate-700 text-gray-100 text-xs font-semibold px-4 py-2 hover:bg-slate-600"
                >
                  <FileText className="w-4 h-4" /> Download Markdown
                </button>
                <button
                  onClick={downloadMermaid}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-lg bg-slate-700 text-gray-100 text-xs font-semibold px-4 py-2 hover:bg-slate-600"
                >
                  <Code2 className="w-4 h-4" /> Download ERD
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 h-[calc(100vh-180px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400">Database Summary</h3>
              <p className="text-[11px] text-gray-500">Loaded repository analysis and schema metadata.</p>
            </div>
            <span className="text-[11px] text-gray-400">{analysis?.repositoryId || 'No repository loaded'}</span>
          </div>

          {loading ? (
            <div className="text-gray-400 text-sm">Loading database analysis...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-700 bg-red-950/40 p-4 text-red-200 text-sm">{error}</div>
          ) : !analysis ? (
            <div className="text-gray-500 text-sm">Enter a repository ID and click Load Database Schema.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-300">
                <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                  <p className="text-gray-500 uppercase tracking-[0.2em] mb-2">Database Type</p>
                  <p className="font-semibold text-white">{analysis.databaseType || 'Unknown'}</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                  <p className="text-gray-500 uppercase tracking-[0.2em] mb-2">ORMs</p>
                  <p className="font-semibold text-white">{analysis.orm?.join(', ') || 'None'}</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                  <p className="text-gray-500 uppercase tracking-[0.2em] mb-2">Entities</p>
                  <p className="font-semibold text-white">{analysis.entities?.length ?? 0}</p>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                  <p className="text-gray-500 uppercase tracking-[0.2em] mb-2">Indexes</p>
                  <p className="font-semibold text-white">{analysis.indexes?.length ?? 0}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                  <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <Database className="w-4 h-4 text-cyan-400" /> Schema Entities
                  </h4>
                  <div className="space-y-3">
                    {(analysis.entities || []).map((entity, index) => (
                      <div key={index} className="rounded-2xl border border-gray-800 bg-[#111827] p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs uppercase text-gray-400">{entity.type}</span>
                          <span className="text-xs text-cyan-300">{entity.fields?.length ?? 0} fields</span>
                        </div>
                        <p className="font-semibold text-white">{entity.name}</p>
                        <p className="text-[11px] text-gray-400">{entity.tableName || entity.collectionName || 'No table/collection name'}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Relationships</h4>
                  <div className="space-y-2 text-[11px] text-gray-300">
                    {(analysis.relationships || []).length === 0 ? (
                      <p className="text-gray-500">No relationships discovered.</p>
                    ) : (
                      analysis.relationships.map((rel, index) => (
                        <div key={index} className="rounded-xl border border-gray-800 bg-[#0A0E17] p-3">
                          <p className="text-sm text-white">{rel.source} → {rel.target}</p>
                          <p className="text-xs text-gray-400">{rel.type}{rel.field ? ` / ${rel.field}` : ''}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                  <h4 className="text-sm font-semibold text-white mb-3">Indexes & Constraints</h4>
                  <div className="grid grid-cols-1 gap-3">
                    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-3">
                      <p className="text-xs uppercase text-gray-400 mb-2">Indexes</p>
                      {(analysis.indexes || []).length === 0 ? (
                        <p className="text-gray-500">No index definitions found.</p>
                      ) : (
                        (analysis.indexes || []).map((index, idx) => (
                          <div key={idx} className="text-[11px] text-gray-300">
                            <p>{index.entity || 'Unknown'}: {index.fields?.join(', ')}</p>
                            {index.unique && <p className="text-emerald-300">Unique</p>}
                          </div>
                        ))
                      )}
                    </div>
                    <div className="rounded-2xl border border-gray-800 bg-[#111827] p-3">
                      <p className="text-xs uppercase text-gray-400 mb-2">Constraints</p>
                      {(analysis.constraints || []).length === 0 ? (
                        <p className="text-gray-500">No constraints found.</p>
                      ) : (
                        (analysis.constraints || []).slice(0, 8).map((constraint, idx) => (
                          <div key={idx} className="text-[11px] text-gray-300">
                            <p>{constraint.type}: {constraint.definition}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 sticky top-6">
          <h4 className="text-sm font-semibold text-white mb-3">Diagram Preview</h4>
          <div className="space-y-3">
            <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4 text-[11px] text-gray-300">
              <p className="text-gray-400 mb-2">Mermaid ERD</p>
              <pre className="max-h-[360px] overflow-y-auto whitespace-pre-wrap">{analysis?.diagrams?.mermaid || 'No ERD generated yet.'}</pre>
            </div>
            <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4 text-[11px] text-gray-300">
              <p className="text-gray-400 mb-2">Markdown Summary</p>
              <pre className="max-h-[260px] overflow-y-auto whitespace-pre-wrap">{analysis?.diagrams?.markdown || 'No markdown summary generated.'}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
