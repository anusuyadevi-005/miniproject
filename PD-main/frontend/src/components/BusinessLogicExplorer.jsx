import React, { useEffect, useState } from 'react';
import { Search, Activity, BookOpen, Layers, ShieldCheck, ArrowRight, FileText, CloudDownload } from 'lucide-react';

export default function BusinessLogicExplorer() {
  const [repoId, setRepoId] = useState('');
  const [projects, setProjects] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('workflows');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data || []);
    } catch (err) {
      console.warn('Unable to load repositories:', err.message || err);
    }
  };

  const fetchBusinessLogic = async () => {
    if (!repoId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/repository/${encodeURIComponent(repoId.trim())}/business-logic`);
      const payload = await res.json();
      if (!res.ok) {
        setError(payload.error || 'Unable to load business logic analysis');
        setAnalysis(null);
      } else {
        setAnalysis(payload.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch business logic analysis');
      setAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const downloadJson = () => {
    if (!analysis) return;
    const blob = new Blob([JSON.stringify(analysis, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoId || 'business-logic'}-analysis.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadMarkdown = () => {
    if (!analysis) return;
    const markdown = [`# Business Logic Analysis for ${repoId}`];
    markdown.push('## Workflows');
    analysis.workflows?.forEach((workflow) => {
      markdown.push(`### ${workflow.workflowName}`);
      markdown.push(`- Purpose: ${workflow.purpose}`);
      markdown.push(`- Entry Point: ${workflow.entryPoint}`);
      markdown.push(`- API: ${workflow.api?.method || 'N/A'} ${workflow.api?.route || ''}`);
      markdown.push(`- Controller: ${workflow.controller || 'N/A'}`);
      markdown.push(`- Service: ${workflow.service || 'N/A'}`);
      markdown.push(`- Repository: ${workflow.repository || 'N/A'}`);
      markdown.push(`- Exit Point: ${workflow.exitPoint || 'N/A'}`);
      markdown.push('');
    });
    markdown.push('## Mermaid Flowchart');
    markdown.push('```mermaid');
    markdown.push(analysis.mermaidFlowchart || 'graph TD\n  A[No workflow data]');
    markdown.push('```');

    const blob = new Blob([markdown.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${repoId || 'business-logic'}-analysis.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Business Logic Explorer</h2>
            <p className="text-sm text-gray-400">Automatically discover workflows, business rules, state transitions, validation, and sequence diagrams.</p>
          </div>
          <div className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-sm text-cyan-300">Static Analysis</div>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Repository</label>
            <select
              value={repoId}
              onChange={(e) => setRepoId(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-[#0A0E17] px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="">Select Repository</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name} — {project.id}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <button
              disabled={!repoId || loading}
              onClick={fetchBusinessLogic}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="w-4 h-4" /> Analyze Business Logic
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!analysis}
                onClick={downloadJson}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-[#0A0E17] px-4 py-2 text-xs text-gray-300 hover:border-cyan-500"
              >
                <CloudDownload className="w-4 h-4" /> JSON
              </button>
              <button
                type="button"
                disabled={!analysis}
                onClick={downloadMarkdown}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-[#0A0E17] px-4 py-2 text-xs text-gray-300 hover:border-cyan-500"
              >
                <FileText className="w-4 h-4" /> Markdown
              </button>
            </div>
          </div>
        </div>

        {error && <div className="mt-4 rounded-lg border border-red-700 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</div>}
      </div>

      <div className="rounded-xl border border-gray-800 bg-[#0B0F19] p-4">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {[
            { id: 'workflows', label: 'Workflows', icon: Activity },
            { id: 'businessRules', label: 'Business Rules', icon: BookOpen },
            { id: 'stateTransitions', label: 'State Transitions', icon: ArrowRight },
            { id: 'validation', label: 'Validation', icon: ShieldCheck },
            { id: 'sequence', label: 'Sequence Diagrams', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${active ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30' : 'bg-[#0A0E17] text-gray-400 border border-gray-800'}`}
              >
                <Icon className="w-4 h-4" /> {tab.label}
              </button>
            );
          })}
        </div>

        {!analysis ? (
          <div className="rounded-2xl border border-dashed border-gray-800 bg-[#0A0E17] p-8 text-center text-sm text-gray-400">Run analysis to explore discovered workflows, rules, and state transitions.</div>
        ) : (
          <div className="space-y-4">
            {activeTab === 'workflows' && (
              <div className="grid gap-4">
                {analysis.workflows?.length ? analysis.workflows.map((workflow) => (
                  <div key={workflow.workflowId} className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-semibold text-white">{workflow.workflowName}</h3>
                        <p className="text-xs text-gray-500">{workflow.workflowId}</p>
                      </div>
                      <span className="rounded-full bg-gray-900 px-2 py-1 text-[11px] uppercase tracking-[0.18em] text-gray-400">{workflow.api?.method || 'N/A'}</span>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 text-sm text-gray-300">
                      <div><strong>Purpose:</strong> {workflow.purpose}</div>
                      <div><strong>Entry:</strong> {workflow.entryPoint}</div>
                      <div><strong>Controller:</strong> {workflow.controller || 'N/A'}</div>
                      <div><strong>Service:</strong> {workflow.service || 'N/A'}</div>
                      <div><strong>Exit:</strong> {workflow.exitPoint}</div>
                    </div>
                  </div>
                )) : <div className="text-gray-400 text-sm">No workflows discovered.</div>}
              </div>
            )}

            {activeTab === 'businessRules' && (
              <div className="grid gap-4">
                {analysis.businessRules?.length ? analysis.businessRules.map((rule) => (
                  <div key={rule.ruleId} className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                    <h3 className="text-sm font-semibold text-white">{rule.name}</h3>
                    <p className="mt-2 text-sm text-gray-300">{rule.description}</p>
                    <div className="mt-3 text-xs text-gray-400">
                      <div><strong>Validation:</strong> {rule.validation?.length ? rule.validation.join(', ') : 'None'}</div>
                      <div><strong>Authentication:</strong> {rule.authentication?.length ? rule.authentication.join(', ') : 'None'}</div>
                      <div><strong>Conditions:</strong> {rule.conditions?.length ? rule.conditions.join(', ') : 'None detected'}</div>
                    </div>
                  </div>
                )) : <div className="text-gray-400 text-sm">No business rules discovered.</div>}
              </div>
            )}

            {activeTab === 'stateTransitions' && (
              <div className="grid gap-4">
                {analysis.stateTransitions?.length ? analysis.stateTransitions.map((transition) => (
                  <div key={transition.transitionId} className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold text-white">{transition.beforeState} → {transition.afterState}</h3>
                      <span className="text-xs text-gray-400">{transition.source}</span>
                    </div>
                    <p className="mt-2 text-sm text-gray-300">{transition.rules?.length ? transition.rules.join(', ') : 'No rules extracted.'}</p>
                  </div>
                )) : <div className="text-gray-400 text-sm">No state transitions discovered.</div>}
              </div>
            )}

            {activeTab === 'validation' && (
              <div className="grid gap-4">
                {analysis.workflows?.map((workflow) => (
                  <div key={workflow.workflowId} className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                    <h3 className="text-sm font-semibold text-white">{workflow.workflowName}</h3>
                    <p className="mt-2 text-sm text-gray-300">Validation detected in workflow entry points and input paths.</p>
                    <div className="mt-3 text-xs text-gray-400">
                      <div><strong>Validation:</strong> {workflow.validation?.length ? workflow.validation.join(', ') : 'None detected'}</div>
                      <div><strong>Auth:</strong> {workflow.authentication?.length ? workflow.authentication.join(', ') : 'None detected'}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'sequence' && (
              <div className="rounded-2xl border border-gray-800 bg-[#0A0E17] p-4">
                <h3 className="text-sm font-semibold text-white">Sequence Diagram</h3>
                <pre className="mt-3 overflow-x-auto rounded-xl border border-gray-800 bg-[#09101A] p-4 text-xs text-gray-300 whitespace-pre-wrap">{analysis.sequenceDiagram || 'No sequence diagram available.'}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
