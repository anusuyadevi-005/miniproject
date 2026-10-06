import React, { useState, useEffect } from 'react';
import { Search, CloudDownload, Code2, ShieldCheck, Lock, Link2 } from 'lucide-react';

export default function ApiExplorer() {
  const [repoId, setRepoId] = useState('');
  const [projects, setProjects] = useState([]);
  const [apiData, setApiData] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('');
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

  const fetchApis = async (targetId) => {
    const idToFetch = targetId || repoId;
    if (!idToFetch) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repository/${encodeURIComponent(idToFetch.trim())}/apis`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Unable to load API analysis');
        setApiData(null);
        setSelected(null);
      } else {
        setApiData(data);
        setSelected(data.apis?.[0] || null);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch API discovery');
      setApiData(null);
      setSelected(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadOpenApi = () => {
    if (!apiData?.openApi) return;
    const blob = new Blob([JSON.stringify(apiData.openApi, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${repoId || 'repository'}-openapi.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const endpoints = apiData?.apis || [];
  const filtered = filter
    ? endpoints.filter((api) => api.route?.toLowerCase().includes(filter.toLowerCase()) || api.method?.toLowerCase().includes(filter.toLowerCase()) || api.controller?.toLowerCase().includes(filter.toLowerCase()))
    : endpoints;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <div className="space-y-4">
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Link2 className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">API Explorer</h2>
              <p className="text-[11px] text-gray-400">Inspect discovered REST, GraphQL and controller routes.</p>
            </div>
          </div>
          <div className="space-y-3">
            {projects.length > 0 && (
              <div>
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Select Repository</label>
                <select
                  value={repoId}
                  onChange={(e) => {
                    const sel = e.target.value;
                    setRepoId(sel);
                    if (sel) fetchApis(sel);
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
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Or Repository ID / URL</label>
              <input
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
                placeholder="Repository ID"
                className="w-full bg-[#0A0E17] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <button
              onClick={() => fetchApis()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-400 transition-all disabled:opacity-50"
              disabled={!repoId || loading}
            >
              <Search className="w-4 h-4" /> Load API Model
            </button>
            {apiData?.openApi && (
              <button
                onClick={downloadOpenApi}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-700 text-gray-100 text-xs font-semibold hover:bg-slate-600 transition-all"
              >
                <CloudDownload className="w-4 h-4" /> Download OpenAPI JSON
              </button>
            )}
          </div>
        </div>

        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 h-[calc(100vh-180px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xs font-semibold uppercase text-gray-400">Discovered Endpoints</h3>
              <p className="text-[11px] text-gray-500">{filtered.length} endpoints found</p>
            </div>
            <span className="text-[11px] text-gray-500">{apiData?.repositoryId || 'No repository loaded'}</span>
          </div>

          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by path, method, or controller"
            className="w-full mb-4 bg-[#0A0E17] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
          />

          {loading ? (
            <div className="text-gray-400 text-sm">Loading API surface...</div>
          ) : error ? (
            <div className="rounded-xl border border-red-700 bg-red-950/40 p-4 text-red-200 text-sm">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="text-gray-500 text-sm">No endpoints discovered yet.</div>
          ) : (
            <div className="space-y-3">
              {filtered.map((api) => (
                <button
                  key={api.id}
                  type="button"
                  onClick={() => setSelected(api)}
                  className={`w-full text-left rounded-2xl border px-4 py-3 transition-all ${selected?.id === api.id ? 'border-cyan-500 bg-cyan-500/10' : 'border-gray-800 bg-[#0A0E17] hover:border-cyan-500 hover:bg-gray-900/80'}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[11px] uppercase text-cyan-300 font-semibold">{api.method || 'UNKNOWN'}</span>
                    <span className="text-[11px] text-gray-400">{api.controller || api.handler || 'Handler'}</span>
                  </div>
                  <div className="mt-2">
                    <p className="text-sm font-semibold text-white truncate">{api.route || api.path || 'Unknown path'}</p>
                    <p className="text-[11px] text-gray-500 mt-1">{api.file}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 sticky top-6">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Endpoint Details</h3>
              <p className="text-[11px] text-gray-400">Review request/response and metadata.</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-gray-400">
              <Code2 className="w-3.5 h-3.5" /> {selected?.id ? selected.method : 'Select an endpoint'}
            </span>
          </div>

          {!selected ? (
            <div className="text-gray-500 text-sm">Click any endpoint to inspect details.</div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex rounded-full bg-cyan-500/10 text-cyan-300 px-2 py-1 text-[11px] font-semibold">{selected.method}</span>
                  <span className="text-sm font-semibold text-white break-all">{selected.route}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-400">
                  <div>
                    <p className="uppercase tracking-[0.15em] text-gray-500 mb-1">Controller</p>
                    <p>{selected.controller || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.15em] text-gray-500 mb-1">Handler</p>
                    <p>{selected.handler || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.15em] text-gray-500 mb-1">Middleware</p>
                    <p>{selected.middleware?.join(', ') || 'None'}</p>
                  </div>
                  <div>
                    <p className="uppercase tracking-[0.15em] text-gray-500 mb-1">Auth</p>
                    <p>{selected.authentication?.providers?.join(', ') || selected.authentication?.join?.(', ') || 'None'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-semibold text-white">Request Metadata</h4>
                  </div>
                  <pre className="max-h-48 overflow-y-auto rounded-xl bg-[#0A0E17] border border-gray-800 p-3 text-[11px] text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(selected.request || selected.requestSchema || [], null, 2)}
                  </pre>
                </div>
                <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-semibold text-white">Response Metadata</h4>
                  </div>
                  <pre className="max-h-48 overflow-y-auto rounded-xl bg-[#0A0E17] border border-gray-800 p-3 text-[11px] text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(selected.response || selected.responseSchema || [], null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4">
          <h4 className="text-sm font-semibold text-white mb-3">OpenAPI Preview</h4>
          <pre className="max-h-[320px] overflow-y-auto rounded-2xl bg-[#0A0E17] border border-gray-800 p-4 text-[11px] text-gray-300 whitespace-pre-wrap">
            {JSON.stringify(apiData?.openApi || { message: 'Load a repository to preview OpenAPI spec' }, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
