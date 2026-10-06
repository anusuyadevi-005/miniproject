import React, { useState, useEffect } from 'react';
import { Folder, FileText, Layers, Box, Search, Database, Link2, Activity, ArrowRight, ChevronDown, ChevronRight as ChevronRightSmall } from 'lucide-react';

function EntityIcon({ type }) {
  switch (type) {
    case 'repository': return <Box className="w-4 h-4" />;
    case 'folder': return <Folder className="w-4 h-4" />;
    case 'file': return <FileText className="w-4 h-4" />;
    case 'class': return <Layers className="w-4 h-4" />;
    case 'function': return <Activity className="w-4 h-4" />;
    case 'method': return <Activity className="w-4 h-4" />;
    case 'api': return <Link2 className="w-4 h-4" />;
    case 'database': return <Database className="w-4 h-4" />;
    default: return <Box className="w-4 h-4" />;
  }
}

function TreeNode({ node, children, onSelect, selectedId }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = children?.length > 0;

  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => { setExpanded(!expanded); onSelect(node); }}
        className={`group flex items-center justify-between w-full rounded-lg px-3 py-2 text-left text-xs transition-all ${selectedId === node.id ? 'bg-blue-600/20 text-white' : 'text-gray-300 hover:bg-gray-800/60 hover:text-white'}`}>
        <div className="flex items-center gap-2">
          {hasChildren ? (
            expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRightSmall className="w-4 h-4" />
          ) : (
            <span className="w-4 h-4" />
          )}
          <EntityIcon type={node.type} />
          <span className="truncate">{node.name}</span>
        </div>
        <span className="text-[10px] text-gray-400">{node.type}</span>
      </button>
      {expanded && hasChildren && (
        <div className="ml-5 border-l border-gray-800/50 pl-3 space-y-1">
          {children.map((child) => (
            <TreeNode key={child.id} node={child} children={child.childrenData} onSelect={onSelect} selectedId={selectedId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RepositoryExplorer() {
  const [knowledge, setKnowledge] = useState(null);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState('');
  const [repoId, setRepoId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!repoId) return;
    fetchKnowledge(repoId);
  }, [repoId]);

  const fetchKnowledge = async (id) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/repository/${id}/knowledge`);
      const data = await res.json();
      if (data.success) {
        setKnowledge(data.knowledge);
        setSelected(data.knowledge.repository);
      }
    } catch (err) {
      console.error('Failed to fetch knowledge model:', err);
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (model) => {
    if (!model) return [];
    const nodesById = new Map();
    const childrenMap = new Map();

    const allEntities = [
      model.repository,
      ...model.folders,
      ...model.files,
      ...model.classes,
      ...model.methods,
      ...model.functions,
      ...model.apis,
      ...model.database,
      ...model.dependencies
    ].filter(Boolean);

    allEntities.forEach((entity) => {
      nodesById.set(entity.id, { ...entity, children: [] });
      childrenMap.set(entity.id, []);
    });

    allEntities.forEach((entity) => {
      const parentId = entity.parent || model.repository.id;
      if (parentId && nodesById.has(parentId)) {
        childrenMap.get(parentId).push(entity.id);
      }
    });

    nodesById.forEach((entity) => {
      entity.childrenData = (childrenMap.get(entity.id) || []).map((id) => nodesById.get(id)).filter(Boolean);
    });

    return [nodesById.get(model.repository.id)].filter(Boolean);
  };

  const searchResults = () => {
    if (!knowledge || !search) return null;
    const term = search.toLowerCase();
    const matches = [
      ...knowledge.classes,
      ...knowledge.methods,
      ...knowledge.functions,
      ...knowledge.files,
      ...knowledge.folders,
      ...knowledge.apis,
      ...knowledge.database
    ].filter((item) => item.name?.toLowerCase().includes(term) || item.path?.toLowerCase().includes(term));
    return matches;
  };

  const tree = buildTree(knowledge);
  const results = searchResults();

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
      <div className="space-y-4">
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-3">
            <Box className="w-5 h-5 text-cyan-400" />
            <div>
              <h2 className="text-sm font-semibold text-white">Repository Explorer</h2>
              <p className="text-[11px] text-gray-400">Load an existing repository knowledge model and explore entities.</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              placeholder="Repository ID"
              className="w-full bg-[#0A0E17] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => fetchKnowledge(repoId)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 text-white text-xs font-semibold hover:bg-cyan-400 transition-all disabled:opacity-50"
              disabled={!repoId || loading}
            >
              <Search className="w-4 h-4" /> Load Knowledge Model
            </button>
          </div>
        </div>

        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4 h-[calc(100vh-210px)] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-semibold uppercase text-gray-400">Explorer Tree</h3>
            <span className="text-[11px] text-gray-500">{tree.length} root node</span>
          </div>
          {loading ? (
            <div className="text-gray-400 text-sm">Loading...</div>
          ) : tree.length === 0 ? (
            <div className="text-gray-500 text-sm">No repository loaded</div>
          ) : (
            tree.map((node) => (
              <TreeNode key={node.id} node={node} children={node.childrenData} onSelect={setSelected} selectedId={selected?.id} />
            ))
          )}
        </div>
      </div>

      <div className="space-y-4">
        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Entity Inspector</h3>
              <p className="text-[11px] text-gray-400">View metadata, relationships and dependencies.</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] text-cyan-400">
              <ArrowRight className="w-3.5 h-3.5" /> {selected?.type || 'Select an entity'}
            </span>
          </div>
          {!selected ? (
            <div className="text-gray-500 text-sm">Select an entity from the explorer.</div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#0A0E17] border border-gray-800 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase">Name</p>
                  <p className="text-sm font-semibold text-white truncate">{selected.name}</p>
                </div>
                <div className="bg-[#0A0E17] border border-gray-800 rounded-lg p-3">
                  <p className="text-[10px] text-gray-500 uppercase">Type</p>
                  <p className="text-sm font-semibold text-white truncate">{selected.type}</p>
                </div>
                <div className="bg-[#0A0E17] border border-gray-800 rounded-lg p-3 col-span-2">
                  <p className="text-[10px] text-gray-500 uppercase">Path</p>
                  <p className="text-sm text-gray-200 break-all">{selected.path}</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-2">Relationships</p>
                  {selected.relationships?.length ? (
                    <ul className="space-y-2 text-sm text-gray-200">
                      {selected.relationships.map((rel, index) => (
                        <li key={index} className="rounded-lg bg-[#0A0E17] border border-gray-800 p-2 text-[12px]">{rel}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-gray-500 text-sm">No explicit relationships found.</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-2">Dependencies</p>
                  {selected.dependencies?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selected.dependencies.map((dep, index) => (
                        <span key={index} className="text-[11px] px-2 py-1 rounded-full bg-gray-800 text-gray-300">{dep}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No dependencies captured.</p>
                  )}
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 uppercase mb-2">Metadata</p>
                  <pre className="max-h-48 overflow-y-auto bg-[#0A0E17] border border-gray-800 rounded-lg p-3 text-[11px] text-gray-300 whitespace-pre-wrap">
                    {JSON.stringify(selected.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Search Index</h3>
            <span className="text-[11px] text-gray-500">Fast lookup</span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-[11px] text-gray-300">
            <div className="bg-[#0A0E17] border border-gray-800 rounded-lg p-3">
              <p className="text-gray-500 uppercase mb-2">Classes</p>
              <p>{knowledge?.searchIndex?.classes?.length || 0}</p>
            </div>
            <div className="bg-[#0A0E17] border border-gray-800 rounded-lg p-3">
              <p className="text-gray-500 uppercase mb-2">Methods</p>
              <p>{knowledge?.searchIndex?.methods?.length || 0}</p>
            </div>
            <div className="bg-[#0A0E17] border border-gray-800 rounded-lg p-3">
              <p className="text-gray-500 uppercase mb-2">Functions</p>
              <p>{knowledge?.searchIndex?.functions?.length || 0}</p>
            </div>
            <div className="bg-[#0A0E17] border border-gray-800 rounded-lg p-3">
              <p className="text-gray-500 uppercase mb-2">Files</p>
              <p>{knowledge?.searchIndex?.files?.length || 0}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="bg-[#0A0E17] border border-gray-800 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase mb-2">Recent query</p>
              <p className="text-sm text-gray-200">{search || 'Type above to search entities'}</p>
            </div>
            {results?.length ? (
              <div className="space-y-2">
                {results.slice(0, 6).map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelected(item)}
                    className="w-full text-left rounded-lg bg-[#0A0E17] border border-gray-800 p-3 text-xs text-gray-200 hover:border-cyan-500"
                  >
                    <div className="font-semibold text-white truncate">{item.name}</div>
                    <div className="text-gray-500 truncate">{item.type} · {item.path}</div>
                  </button>
                ))}
              </div>
            ) : search ? (
              <p className="text-gray-500 text-sm">No entities matched your search.</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
