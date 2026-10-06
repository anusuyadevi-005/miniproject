import React, { useEffect, useState } from 'react';
import { Layers, Boxes, Workflow, Satellite, Server, GitBranch, Search, ListChecks } from 'lucide-react';

export default function ArchitectureExplorer({ repositoryId }) {
  const [repoId, setRepoId] = useState(repositoryId || '');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Satellite },
    { id: 'components', label: 'Components', icon: Boxes },
    { id: 'layers', label: 'Layers', icon: Layers },
    { id: 'flows', label: 'Flows', icon: Workflow },
    { id: 'deployment', label: 'Deployment', icon: Server },
    { id: 'diagrams', label: 'Diagrams', icon: GitBranch }
  ];

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (repositoryId) {
      setRepoId(repositoryId);
      fetchArchitecture(repositoryId);
    }
  }, [repositoryId]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      const result = await response.json();
      setProjects(result || []);
    } catch (fetchError) {
      console.warn('Unable to load project list:', fetchError.message || fetchError);
    }
  };

  const handleProjectSelect = async (event) => {
    const selectedId = event.target.value;
    setRepoId(selectedId);
    if (selectedId) {
      fetchArchitecture(selectedId);
    }
  };

  const fetchArchitecture = async (id) => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/repository/${encodeURIComponent(id.trim())}/architecture`);
      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        setError(payload?.error || 'Failed to load architecture data');
        setData(null);
      } else {
        setData(payload.data);
      }
    } catch (fetchError) {
      setError(fetchError.message || 'Fetch failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoad = () => {
    fetchArchitecture(repoId.trim());
  };

  if (loading) {
    return <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-6 text-gray-400">Loading architecture intelligence…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Architecture Explorer</h2>
            <p className="text-sm text-gray-400">Static architecture discovery derived from repository knowledge and dependency analysis.</p>
          </div>
          <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">
            {data?.architecture?.style || 'Layered'}
          </div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Select Repository</label>
              <select
                value={repoId}
                onChange={handleProjectSelect}
                className="w-full rounded-lg border border-gray-700 bg-[#0A0E17] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">Select a Repository ID</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} — {project.id}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Or enter ID manually</label>
              <input
                value={repoId}
                onChange={(e) => setRepoId(e.target.value)}
                placeholder="Repository ID"
                className="w-full rounded-lg border border-gray-700 bg-[#0A0E17] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleLoad}
            disabled={!repoId.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Search className="w-4 h-4" /> Load Architecture
          </button>
        </div>

        {projects.length > 0 && (
          <div className="mt-4 rounded-xl border border-gray-800 bg-[#0A0E17] px-4 py-3 text-sm text-gray-300">
            <div className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-cyan-300" />
              <span>{projects.length} repositories available for selection.</span>
            </div>
          </div>
        )}
        {error && <div className="mt-3 rounded-lg border border-red-700 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</div>}
      </div>

      {!data ? (
        <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-6 text-gray-400">Architecture data is not available for this repository yet. Enter a valid repository ID and click Load Architecture.</div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${isActive ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300' : 'border-gray-800 bg-[#0B0F19] text-gray-400'}`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'overview' && (
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Architecture Summary</h3>
                <p className="text-sm text-gray-300">{data.architecture?.summary}</p>
                <div className="mt-4 grid gap-2 text-sm text-gray-300">
                  {Object.entries(data.architecture?.detected || {}).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between rounded-lg border border-gray-800 bg-[#0A0E17] px-3 py-2">
                      <span className="capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                      <span className={value ? 'text-emerald-400' : 'text-gray-500'}>{value ? 'Detected' : 'Not detected'}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-400">Architecture Signals</h3>
                <div className="space-y-2 text-sm text-gray-300">
                  <div className="rounded-lg border border-gray-800 bg-[#0A0E17] px-3 py-2">Name: {data.architecture?.name}</div>
                  <div className="rounded-lg border border-gray-800 bg-[#0A0E17] px-3 py-2">Style: {data.architecture?.style}</div>
                  <div className="rounded-lg border border-gray-800 bg-[#0A0E17] px-3 py-2">Components: {data.components?.length || 0}</div>
                  <div className="rounded-lg border border-gray-800 bg-[#0A0E17] px-3 py-2">Layers: {data.layers?.length || 0}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'components' && (
            <div className="grid gap-3 md:grid-cols-2">
              {data.components?.map((component) => (
                <div key={component.id} className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{component.name}</h3>
                    <span className="rounded-full border border-gray-700 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-400">{component.type}</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{component.description}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'layers' && (
            <div className="grid gap-3">
              {data.layers?.map((layer) => (
                <div key={layer.id} className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
                  <h3 className="text-sm font-semibold text-white">{layer.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">{layer.description}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'flows' && (
            <div className="grid gap-3">
              {data.flows?.map((flow) => (
                <div key={flow.id} className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
                  <h3 className="text-sm font-semibold text-white">{flow.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">{flow.description}</p>
                  <div className="mt-2 text-xs uppercase tracking-wide text-gray-500">{flow.source} → {flow.target}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'deployment' && (
            <div className="grid gap-3">
              {data.deployment?.map((item) => (
                <div key={item.id} className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
                  <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                  <p className="mt-1 text-sm text-gray-400">{item.summary}</p>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'diagrams' && (
            <div className="grid gap-3">
              {data.diagrams?.map((diagram) => (
                <div key={diagram.id} className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">{diagram.name}</h3>
                    <span className="rounded-full border border-gray-700 px-2 py-1 text-[11px] uppercase tracking-wide text-gray-400">{diagram.kind}</span>
                  </div>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-[#0A0E17] p-3 text-xs text-gray-300">{diagram.content}</pre>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
