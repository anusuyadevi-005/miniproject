import React, { useState, useEffect } from 'react';
import {
  GitCommit, CheckCircle2, Zap, ArrowRight, Activity,
  Database, Layers, Dna, Network, Wrench, Hash, ShieldCheck,
  Webhook, RefreshCw, Server, Clock, GitBranch, TrendingUp
} from 'lucide-react';

export default function Dashboard({ data, onNavigate, onTriggerSync }) {
  const [dbStatus, setDbStatus] = useState(null);

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/db-status');
      if (res.ok) {
        const s = await res.json();
        setDbStatus(s);
      }
    } catch (_) {}
  };

  if (!data) return (
    <div className="flex flex-col items-center justify-center py-32 space-y-4">
      <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Loading ASDSE Dashboard...</p>
    </div>
  );

  const { projectsCount, overallConfidence, driftCount, syncedCount, recentCommits, projects, innovations, sdidCount } = data;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-card p-6 rounded-2xl relative overflow-hidden bg-gradient-to-r from-cyan-950/30 via-indigo-950/20 to-gray-900 border border-cyan-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl -z-10" />
        <div className="absolute bottom-0 left-40 w-72 h-72 bg-indigo-500/5 rounded-full blur-3xl -z-10" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 bg-cyan-950/80 text-cyan-400 px-3 py-1 rounded-full text-xs font-semibold border border-cyan-800 mb-3">
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Adaptive Semantic Documentation Synchronization Engine (ASDSE)</span>
            </div>
            <h2 className="text-2xl font-extrabold text-white">Incremental Semantic Documentation Synchronization</h2>
            <p className="text-gray-400 mt-1.5 max-w-2xl text-sm leading-relaxed">
              Instead of full documentation regeneration, ASDSE mathematically identifies affected paragraphs, diagrams, tables, and dependency graphs using semantic impact propagation — triggered automatically on every GitHub push.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <button
              onClick={() => onNavigate('webhook')}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 font-semibold text-sm hover:bg-indigo-600/30 transition-all cursor-pointer whitespace-nowrap"
            >
              <Webhook className="w-4 h-4" />
              <span>Setup Webhook</span>
            </button>
            <button
              onClick={onTriggerSync}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all cursor-pointer whitespace-nowrap"
            >
              <Zap className="w-4 h-4 fill-current" />
              <span>Simulate AST Change</span>
            </button>
          </div>
        </div>
      </div>

      {/* System Status Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* MongoDB Status */}
        <div className="glass-card px-4 py-3 rounded-xl border border-gray-800 flex items-center gap-3">
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dbStatus?.isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <div className="min-w-0">
            <div className="text-[10px] text-gray-500 uppercase font-semibold">MongoDB Atlas</div>
            <div className={`text-xs font-bold truncate ${dbStatus?.isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {dbStatus?.isConnected ? 'Connected' : 'In-Memory Mode'}
            </div>
          </div>
        </div>

        {/* Backend Status */}
        <div className="glass-card px-4 py-3 rounded-xl border border-gray-800 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse flex-shrink-0" />
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-semibold">API Server</div>
            <div className="text-xs font-bold text-cyan-400">Running :5000</div>
          </div>
        </div>

        {/* Webhook Status */}
        <div
          className="glass-card px-4 py-3 rounded-xl border border-gray-800 flex items-center gap-3 cursor-pointer hover:border-indigo-500/40 transition"
          onClick={() => onNavigate('webhook')}
        >
          <Webhook className="w-4 h-4 text-indigo-400 flex-shrink-0" />
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-semibold">Webhook</div>
            <div className="text-xs font-bold text-indigo-400">Active → /api/webhooks/github</div>
          </div>
        </div>

        {/* PDF Generator */}
        <div className="glass-card px-4 py-3 rounded-xl border border-gray-800 flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse flex-shrink-0" />
          <div>
            <div className="text-[10px] text-gray-500 uppercase font-semibold">PDF Generator</div>
            <div className="text-xs font-bold text-purple-400">PDFKit Active</div>
          </div>
        </div>
      </div>

      {/* 5 Core Innovations */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>5 Core Technical Innovations</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            {
              tab: 'docs', icon: Hash, color: 'text-cyan-400', num: '#1', bg: 'bg-cyan-950',
              title: 'SDID Multi-Artifact', desc: 'Code symbols map to SDIDs tagging text, diagrams, and API tables.'
            },
            {
              tab: 'history', icon: Dna, color: 'text-indigo-400', num: '#2', bg: 'bg-indigo-950',
              title: 'Documentation DNA', desc: '6-part fingerprint tuple determining exact regeneration necessity.'
            },
            {
              tab: 'graph', icon: Network, color: 'text-emerald-400', num: '#3', bg: 'bg-emerald-950',
              title: 'Impact Radius', desc: 'Hierarchical propagation: Function → Class → Module → Package → Architecture.'
            },
            {
              tab: 'docs', icon: Activity, color: 'text-amber-400', num: '#4', bg: 'bg-amber-950',
              title: 'Confidence Engine', desc: 'Scores documentation reliability with breakdown reason factors.'
            },
            {
              tab: 'selfhealing', icon: Wrench, color: 'text-rose-400', num: '#5', bg: 'bg-rose-950',
              title: 'Self-Healing Engine', desc: 'Continuous contract verification repairing only damaged section blocks.'
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.num}
                onClick={() => onNavigate(item.tab)}
                className="glass-card glass-card-hover p-4 rounded-xl border border-gray-800 cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between">
                  <Icon className={`w-5 h-5 ${item.color}`} />
                  <span className={`text-[10px] ${item.bg} ${item.color} px-1.5 py-0.5 rounded font-mono`}>{item.num}</span>
                </div>
                <div className="text-xs font-bold text-white">{item.title}</div>
                <p className="text-[11px] text-gray-400 line-clamp-2">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-card glass-card-hover p-5 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Projects Tracked</span>
            <Database className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-white mt-2">{projectsCount}</div>
          <span className="text-xs text-gray-500 mt-1 inline-block">Active Repositories</span>
        </div>

        <div className="glass-card glass-card-hover p-5 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Confidence Score</span>
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-emerald-400 mt-2">{overallConfidence}%</div>
          <span className="text-xs text-emerald-500/80 mt-1 inline-block">Global Doc Health</span>
        </div>

        <div className="glass-card glass-card-hover p-5 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Active SDID System</span>
            <Hash className="w-5 h-5 text-indigo-400" />
          </div>
          <div className="text-xl font-extrabold text-indigo-400 mt-2">Dynamic Tags</div>
          <span className="text-xs text-indigo-500/80 mt-1 inline-block">Multi-Artifact Mapping</span>
        </div>

        <div className="glass-card glass-card-hover p-5 rounded-xl border border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400 font-medium">Self-Healing Status</span>
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
          </div>
          <div className="text-3xl font-extrabold text-cyan-400 mt-2">ACTIVE</div>
          <span className="text-xs text-cyan-500/80 mt-1 inline-block">Contract Verification ON</span>
        </div>
      </div>

      {/* Projects + Commit Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Managed Repositories */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-cyan-400" />
              <span>Tracked Codebases</span>
            </h3>
            <button
              onClick={() => onNavigate('upload')}
              className="text-xs text-cyan-400 hover:underline flex items-center space-x-1 cursor-pointer"
            >
              <span>+ Add Repository</span>
            </button>
          </div>

          <div className="space-y-3">
            {projects && projects.map((p) => (
              <div
                key={p.id}
                onClick={() => onNavigate('docs')}
                className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 hover:border-cyan-500/40 transition cursor-pointer"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white truncate">{p.name}</span>
                      <span className="text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded shrink-0">{p.branch || 'main'}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 truncate font-mono">{p.repoUrl}</div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-[10px] text-gray-400">Sync Score</div>
                      <div className={`text-sm font-bold ${p.syncScore > 80 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {p.syncScore}%
                      </div>
                    </div>
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                      p.status === 'Synchronized'
                        ? 'bg-emerald-950/60 text-emerald-400 border-emerald-800'
                        : 'bg-rose-950/60 text-rose-400 border-rose-800'
                    }`}>
                      {p.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Innovations Active Strip */}
          <div className="pt-3 border-t border-gray-800">
            <div className="text-[10px] text-gray-500 uppercase font-semibold mb-2">Active Innovation Modules</div>
            <div className="flex flex-wrap gap-2">
              {(innovations || []).map((inn, i) => (
                <span key={i} className="text-[10px] px-2 py-1 rounded-md bg-gray-900 border border-gray-800 text-gray-300">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 ${inn.status === 'Active' || inn.status?.includes('Connected') ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  {inn.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Live Commit / Webhook Feed */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <GitCommit className="w-5 h-5 text-indigo-400" />
              <span>Live Commit Stream</span>
            </h3>
            <button
              onClick={() => onNavigate('webhook')}
              className="flex items-center gap-1 text-[10px] text-indigo-400 hover:underline cursor-pointer"
            >
              <Webhook className="w-3 h-3" />
              <span>Webhook</span>
            </button>
          </div>

          <div className="space-y-3">
            {recentCommits && recentCommits.length > 0 ? (
              recentCommits.map((c) => (
                <div key={c.id} className="p-3 rounded-lg bg-gray-900/50 border border-gray-800/80 space-y-2 hover:border-indigo-500/30 transition">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-mono text-cyan-400 font-bold">{c.hash}</span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <Clock className="w-3 h-3" />
                      {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-gray-200 font-medium line-clamp-2">{c.message}</p>
                  <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1 border-t border-gray-800/60">
                    <span>{c.author}</span>
                    <span className="text-indigo-400 font-semibold">{(c.sdidImpacted || []).length} SDID</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center space-y-3">
                <Webhook className="w-8 h-8 text-gray-700 mx-auto" />
                <p className="text-xs text-gray-500">No commits yet.</p>
                <button
                  onClick={() => onNavigate('webhook')}
                  className="text-xs text-indigo-400 hover:underline cursor-pointer"
                >
                  Setup webhook or simulate a push →
                </button>
              </div>
            )}
          </div>

          {recentCommits && recentCommits.length > 0 && (
            <button
              onClick={() => onNavigate('webhook')}
              className="w-full py-2 text-xs text-indigo-400 hover:bg-indigo-950/40 rounded-lg border border-indigo-900/50 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Webhook className="w-3.5 h-3.5" />
              View full webhook setup & commit log
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
