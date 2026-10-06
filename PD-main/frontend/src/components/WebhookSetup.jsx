import React, { useState, useEffect, useRef } from 'react';
import {
  Webhook, GitBranch, CheckCircle2, AlertCircle, Terminal,
  Copy, RefreshCw, Zap, Activity, GitCommit, Clock,
  Shield, Server, Play, ChevronRight
} from 'lucide-react';

const WEBHOOK_URL = `${window.location.protocol}//${window.location.hostname}:5000/api/webhooks/github`;

export default function WebhookSetup() {
  const [commits, setCommits] = useState([]);
  const [simulating, setSimulating] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [simError, setSimError] = useState(null);
  const [copied, setCopied] = useState('');
  const [liveLog, setLiveLog] = useState([]);
  const logRef = useRef(null);

  const [simRepo, setSimRepo] = useState('https://github.com/expressjs/express.git');
  const [simFile, setSimFile] = useState('src/services/UserService.ts');
  const [simMsg, setSimMsg] = useState('feat(auth): add biometric MFA parameter to authenticateUser()');
  const [simAuthor, setSimAuthor] = useState('Alex Morgan');

  useEffect(() => {
    fetchCommits();
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [liveLog]);

  const fetchCommits = async () => {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        setCommits(data.recentCommits || []);
      }
    } catch (e) {
      console.error('Failed to load commits:', e);
    }
  };

  const addLog = (msg, type = 'info') => {
    const ts = new Date().toLocaleTimeString('en-US', { hour12: false });
    setLiveLog(prev => [...prev, { ts, msg, type }]);
  };

  const simulateWebhook = async () => {
    setSimulating(true);
    setSimResult(null);
    setSimError(null);
    setLiveLog([]);

    addLog('🔔 Simulating GitHub Push Webhook event...', 'info');
    addLog(`📁 Modified file detected: ${simFile}`, 'info');
    addLog('🔍 SDID Mapper scanning changed paths...', 'info');

    try {
      const res = await fetch('/api/webhooks/github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-github-event': 'push'
        },
        body: JSON.stringify({
          ref: 'refs/heads/main',
          repository: {
            html_url: simRepo.replace(/\.git$/, ''),
            name: simRepo.split('/').pop().replace('.git', '')
          },
          head_commit: {
            id: 'sim_' + Math.random().toString(16).substring(2, 12),
            message: simMsg,
            author: { name: simAuthor },
            modified: [simFile]
          }
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Webhook failed');

      addLog(`✅ Commit "${data.commit.message}" received`, 'success');
      addLog(`🏷️  Impacted SDIDs: ${data.sdidsImpacted.join(', ')}`, 'success');
      addLog(`📐 Impact Radius calculated: ${data.impactRadii?.[0]?.impactLevel || 'MODULE'}`, 'success');
      addLog(`🧬 Documentation DNA fingerprint recalculated`, 'success');
      addLog(`🔧 Self-Healing Engine: ${data.healedCount} micro-repairs executed`, 'success');
      addLog(`📝 Version entry recorded in DNA Ledger`, 'success');
      addLog('✅ Documentation sync COMPLETE — all artifacts updated!', 'done');

      setSimResult(data);
      fetchCommits();
    } catch (err) {
      addLog(`❌ Error: ${err.message}`, 'error');
      setSimError(err.message);
    } finally {
      setSimulating(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 2000);
  };

  const CopyBtn = ({ value, id }) => (
    <button
      onClick={() => copyToClipboard(value, id)}
      className="ml-2 p-1 rounded hover:bg-gray-700 text-gray-400 hover:text-cyan-400 transition cursor-pointer"
      title="Copy"
    >
      {copied === id ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-3">
          <Webhook className="w-7 h-7 text-cyan-400" />
          <span>GitHub Push Webhook — Auto Documentation Sync</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          When a developer pushes code to GitHub, ASDSE automatically detects changed files, identifies impacted SDIDs, recalculates Documentation DNA, computes Impact Radius, runs Self-Healing, and updates all documentation without manual action.
        </p>
      </div>

      {/* How It Works Flow */}
      <div className="glass-card p-6 rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/20 to-indigo-950/10 space-y-4">
        <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-4 h-4" /> How Auto-Sync Works on Every Git Push
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { icon: GitBranch, label: 'Developer Pushes Code', color: 'text-cyan-400', bg: 'bg-cyan-950/40 border-cyan-800' },
            { icon: Webhook, label: 'GitHub Fires Webhook', color: 'text-indigo-400', bg: 'bg-indigo-950/40 border-indigo-800' },
            { icon: Server, label: 'ASDSE Receives Event', color: 'text-purple-400', bg: 'bg-purple-950/40 border-purple-800' },
            { icon: Zap, label: 'SDID & DNA Computed', color: 'text-amber-400', bg: 'bg-amber-950/40 border-amber-800' },
            { icon: Shield, label: 'Impact Radius + Self-Heal', color: 'text-emerald-400', bg: 'bg-emerald-950/40 border-emerald-800' },
            { icon: CheckCircle2, label: 'Docs Updated', color: 'text-green-400', bg: 'bg-green-950/40 border-green-800' },
          ].map((step, i) => (
            <div key={i} className="flex flex-col items-center gap-1 text-center">
              <div className={`p-3 rounded-xl border ${step.bg} relative`}>
                <step.icon className={`w-5 h-5 ${step.color}`} />
                {i < 5 && (
                  <ChevronRight className="w-3 h-3 text-gray-600 absolute -right-2 top-1/2 -translate-y-1/2 hidden lg:block" />
                )}
              </div>
              <span className="text-[10px] text-gray-400 leading-tight">{step.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Setup Instructions */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-indigo-400" />
            GitHub Webhook Setup Instructions
          </h3>

          <div className="space-y-4 text-sm">
            {[
              {
                step: '1',
                title: 'Go to your GitHub Repository → Settings → Webhooks → Add webhook',
                color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800'
              },
              {
                step: '2',
                title: 'Set Payload URL to your ASDSE backend endpoint:',
                color: 'text-indigo-400 bg-indigo-950/60 border-indigo-800',
                code: WEBHOOK_URL
              },
              {
                step: '3',
                title: 'Set Content type to: application/json',
                color: 'text-purple-400 bg-purple-950/60 border-purple-800',
                code: 'application/json'
              },
              {
                step: '4',
                title: 'Choose: "Just the push event"  →  Click Add webhook',
                color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800'
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-3">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center text-[11px] font-bold ${item.color}`}>
                  {item.step}
                </div>
                <div className="flex-1 space-y-1">
                  <p className="text-gray-300 text-xs">{item.title}</p>
                  {item.code && (
                    <div className="flex items-center bg-gray-950 border border-gray-800 rounded-lg px-3 py-1.5">
                      <code className="text-cyan-300 text-[11px] font-mono flex-1 truncate">{item.code}</code>
                      <CopyBtn value={item.code} id={`step-${i}`} />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* GitHub Actions Alternative */}
          <div className="pt-4 border-t border-gray-800 space-y-2">
            <h4 className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-amber-400" />
              Alternative: GitHub Actions Workflow
            </h4>
            <div className="relative">
              <pre className="bg-gray-950 border border-gray-800 rounded-lg p-3 text-[10px] font-mono text-emerald-300 overflow-x-auto leading-relaxed">
{`# .github/workflows/asdse-sync.yml
name: ASDSE Documentation Auto-Sync
on: [push]
jobs:
  sync-docs:
    runs-on: ubuntu-latest
    steps:
      - name: Notify ASDSE Engine
        run: |
          curl -X POST ${WEBHOOK_URL} \\
            -H "Content-Type: application/json" \\
            -H "x-github-event: push" \\
            -d '{"ref":"refs/heads/main","repository":{"html_url":"\${{ github.event.repository.html_url }}","name":"\${{ github.event.repository.name }}"},"head_commit":{"id":"\${{ github.sha }}","message":"\${{ github.event.head_commit.message }}","author":{"name":"\${{ github.event.head_commit.author.name }}"},"modified":\${{ toJson(github.event.head_commit.modified) }}}}'`}
              </pre>
              <button
                onClick={() => copyToClipboard(`# .github/workflows/asdse-sync.yml\nname: ASDSE Documentation Auto-Sync\non: [push]\njobs:\n  sync-docs:\n    runs-on: ubuntu-latest\n    steps:\n      - name: Notify ASDSE Engine\n        run: curl -X POST ${WEBHOOK_URL}`, 'actions')}
                className="absolute top-2 right-2 p-1.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-cyan-400 transition cursor-pointer"
              >
                {copied === 'actions' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Simulation Panel */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Play className="w-5 h-5 text-emerald-400" />
            Simulate a GitHub Push Event
          </h3>

          <div className="space-y-3">
            {[
              { label: 'Repository URL', value: simRepo, setter: setSimRepo, placeholder: 'https://github.com/org/repo.git' },
              { label: 'Modified File Path', value: simFile, setter: setSimFile, placeholder: 'src/services/UserService.ts' },
              { label: 'Commit Message', value: simMsg, setter: setSimMsg, placeholder: 'feat: add new parameter...' },
              { label: 'Author Name', value: simAuthor, setter: setSimAuthor, placeholder: 'Alex Morgan' },
            ].map((field, i) => (
              <div key={i}>
                <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{field.label}</label>
                <input
                  value={field.value}
                  onChange={e => field.setter(e.target.value)}
                  placeholder={field.placeholder}
                  className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-xs placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
                />
              </div>
            ))}
          </div>

          <button
            onClick={simulateWebhook}
            disabled={simulating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:brightness-110 transition disabled:opacity-50 cursor-pointer"
          >
            {simulating ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /><span>Processing Webhook...</span></>
            ) : (
              <><Zap className="w-4 h-4 fill-current" /><span>Fire Simulated Webhook Push</span></>
            )}
          </button>

          {/* Live Log Terminal */}
          {liveLog.length > 0 && (
            <div>
              <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" /> Live Processing Log
              </h4>
              <div
                ref={logRef}
                className="bg-gray-950 border border-gray-800 rounded-lg p-3 h-44 overflow-y-auto font-mono text-[10px] space-y-1 scroll-smooth"
              >
                {liveLog.map((entry, i) => (
                  <div key={i} className={`flex gap-2 ${
                    entry.type === 'error' ? 'text-rose-400' :
                    entry.type === 'success' ? 'text-emerald-400' :
                    entry.type === 'done' ? 'text-cyan-300 font-bold' :
                    'text-gray-400'
                  }`}>
                    <span className="text-gray-600 shrink-0">[{entry.ts}]</span>
                    <span>{entry.msg}</span>
                  </div>
                ))}
                {simulating && (
                  <div className="flex items-center gap-1 text-cyan-400">
                    <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                    <span>Processing...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Result Summary */}
          {simResult && !simError && (
            <div className="p-4 bg-emerald-950/30 border border-emerald-800/50 rounded-xl space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" /> Webhook Processed Successfully
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-300">
                <span>Commit: <strong className="text-white font-mono">{simResult.commit?.hash}</strong></span>
                <span>Branch: <strong className="text-cyan-300">{simResult.branch}</strong></span>
                <span>SDIDs Hit: <strong className="text-indigo-300">{simResult.sdidsImpacted?.join(', ')}</strong></span>
                <span>Repairs: <strong className="text-amber-300">{simResult.healedCount}</strong></span>
              </div>
            </div>
          )}
          {simError && (
            <div className="p-3 bg-rose-950/30 border border-rose-800/50 rounded-xl flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" /> {simError}
            </div>
          )}
        </div>
      </div>

      {/* Live Webhook Commit Feed */}
      <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <GitCommit className="w-5 h-5 text-indigo-400" />
            Live Webhook Commit Feed
          </h3>
          <button
            onClick={fetchCommits}
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:underline cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {commits.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500 text-sm">
              No commits yet — fire a webhook simulation above or push to your linked repository.
            </div>
          )}
          {commits.map((c) => (
            <div key={c.id} className="p-4 rounded-xl bg-gray-900/60 border border-gray-800 space-y-2 hover:border-indigo-500/40 transition">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span className="font-mono text-cyan-400 font-bold">{c.hash}</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="text-xs text-white font-medium line-clamp-2">{c.message}</p>
              <div className="flex items-center justify-between text-[10px] text-gray-500 pt-1 border-t border-gray-800">
                <span>by {c.author}</span>
                <span className="text-indigo-400 font-semibold">{c.sdidImpacted?.length || 0} SDID tagged</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
