import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, FileText, Code2, History, Edit3, RefreshCw, Download,
  ChevronRight, ChevronDown, CheckCircle2, Clock, Loader2, Globe,
  Sparkles, Layers, Copy, Check, AlertCircle, Eye, Search, X,
  RotateCcw, Terminal, Zap, Database, Server, Shield, Activity
} from 'lucide-react';
import { getMemorySession } from '../services/sessionStore';

// ── Constants ─────────────────────────────────────────────────────────────────

const CHAPTER_ICONS = {
  chapter_1:  Sparkles,
  chapter_2:  BookOpen,
  chapter_3:  Layers,
  chapter_4:  FileText,
  chapter_5:  Code2,
  chapter_6:  Layers,
  chapter_7:  Activity,
  chapter_8:  Server,
  chapter_9:  Database,
  chapter_10: Globe,
  chapter_11: Zap,
  chapter_12: Terminal,
  chapter_13: Terminal,
  chapter_14: Shield,
  chapter_15: Activity,
  chapter_16: CheckCircle2,
  chapter_17: Eye,
  chapter_18: Sparkles,
  chapter_19: BookOpen
};

const CHAPTER_COLORS = {
  chapter_1:  'from-violet-500 to-purple-600',
  chapter_2:  'from-blue-500 to-cyan-600',
  chapter_3:  'from-cyan-500 to-teal-600',
  chapter_4:  'from-emerald-500 to-green-600',
  chapter_5:  'from-lime-500 to-emerald-600',
  chapter_6:  'from-amber-500 to-yellow-600',
  chapter_7:  'from-orange-500 to-amber-600',
  chapter_8:  'from-red-500 to-rose-600',
  chapter_9:  'from-pink-500 to-fuchsia-600',
  chapter_10: 'from-indigo-500 to-blue-600',
  chapter_11: 'from-teal-500 to-cyan-600',
  chapter_12: 'from-sky-500 to-blue-600',
  chapter_13: 'from-green-500 to-teal-600',
  chapter_14: 'from-rose-500 to-red-600',
  chapter_15: 'from-yellow-500 to-orange-600',
  chapter_16: 'from-lime-500 to-green-600',
  chapter_17: 'from-purple-500 to-violet-600',
  chapter_18: 'from-fuchsia-500 to-pink-600',
  chapter_19: 'from-slate-500 to-gray-600'
};

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'ar', label: 'Arabic' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'hi', label: 'Hindi' },
  { code: 'ko', label: 'Korean' }
];

// ── Copy Button ───────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy to clipboard"
      className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-all"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

// ── Provider Status Badge ─────────────────────────────────────────────────────

function ProviderBadge({ provider }) {
  const colors = {
    openai: 'bg-green-500/15 text-green-400 border-green-500/30',
    gemini: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    claude: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
    deterministic: 'bg-amber-500/15 text-amber-400 border-amber-500/30'
  };
  const cls = colors[provider] || colors.deterministic;
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${cls}`}>
      {provider || 'deterministic'}
    </span>
  );
}

// ── Chapter Sidebar Item ──────────────────────────────────────────────────────

function ChapterItem({ chapter, index, isActive, onClick, isRegenerating }) {
  const Icon = CHAPTER_ICONS[chapter.chapterId] || FileText;
  const colorGrad = CHAPTER_COLORS[chapter.chapterId] || 'from-blue-500 to-cyan-600';
  const hasContent = chapter.markdown && chapter.markdown.length > 50;

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all group ${
        isActive
          ? 'bg-blue-600/20 border border-blue-500/40 shadow-sm shadow-blue-500/10'
          : 'hover:bg-gray-800/60 border border-transparent'
      }`}
    >
      <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${colorGrad} flex items-center justify-center flex-shrink-0 shadow-sm`}>
        {isRegenerating
          ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
          : <Icon className="w-3.5 h-3.5 text-white" />
        }
      </div>

      <div className="flex-1 min-w-0">
        <div className={`text-[11px] font-semibold truncate ${isActive ? 'text-blue-200' : 'text-gray-300 group-hover:text-white'}`}>
          {index + 1}. {chapter.title}
        </div>
        {chapter.version > 1 && (
          <div className="text-[10px] text-gray-500 mt-0.5">v{chapter.version}</div>
        )}
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        {hasContent
          ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          : <AlertCircle className="w-3.5 h-3.5 text-amber-400/60" />
        }
      </div>
    </button>
  );
}

// ── Markdown Renderer ─────────────────────────────────────────────────────────

function MarkdownRenderer({ content }) {
  if (!content) return <p className="text-gray-500 italic text-sm">No content generated yet.</p>;
  return (
    <div
      className="prose-doc"
      dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(content) }}
    />
  );
}

function renderMarkdownToHtml(md) {
  return md
    .replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
      const trimmedCode = code.trim();
      if (lang === 'mermaid' || trimmedCode.startsWith('erDiagram') || trimmedCode.startsWith('graph')) {
        return renderVisualMermaidDiagram(trimmedCode);
      }
      return `<pre class="doc-pre"><code class="doc-code ${lang}">${escHtml(trimmedCode)}</code></pre>`;
    })
    .replace(/`([^`]+)`/g, '<code class="doc-inline-code">$1</code>')
    .replace(/^#{6}\s+(.*)$/gm, '<h6 class="doc-h6">$1</h6>')
    .replace(/^#{5}\s+(.*)$/gm, '<h5 class="doc-h5">$1</h5>')
    .replace(/^#{4}\s+(.*)$/gm, '<h4 class="doc-h4">$1</h4>')
    .replace(/^#{3}\s+(.*)$/gm, '<h3 class="doc-h3">$1</h3>')
    .replace(/^#{2}\s+(.*)$/gm, '<h2 class="doc-h2">$1</h2>')
    .replace(/^#\s+(.*)$/gm, '<h1 class="doc-h1">$1</h1>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="doc-strong">$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="doc-link" target="_blank">$1</a>')
    .replace(/^\|(.+)\|\n\|[-\s|:]+\|\n((?:\|.+\|\n?)*)/gm, (_, headerRow, bodyRows) => {
      const headers = headerRow.split('|').map(h => h.trim()).filter(Boolean);
      const hHtml = headers.map(h => `<th class="doc-th">${h}</th>`).join('');
      const rows = (bodyRows || '').trim().split('\n').filter(Boolean).map(row => {
        const cells = row.split('|').map(c => c.trim()).filter(Boolean);
        return `<tr>${cells.map(c => `<td class="doc-td">${c}</td>`).join('')}</tr>`;
      }).join('');
      return `<div class="doc-table-wrap"><table class="doc-table"><thead><tr>${hHtml}</tr></thead><tbody>${rows}</tbody></table></div>`;
    })
    .replace(/^---$/gm, '<hr class="doc-hr" />')
    .replace(/^\s*[-*+]\s+(.*)$/gm, '<li class="doc-li">$1</li>')
    .replace(/(<li class="doc-li">.*<\/li>\n?)+/g, m => `<ul class="doc-ul">${m}</ul>`)
    .replace(/\n{2,}/g, '\n<p class="doc-p">')
    .replace(/\n/g, '<br/>');
}

function renderVisualMermaidDiagram(mermaidCode) {
  if (mermaidCode.includes('erDiagram')) {
    const lines = mermaidCode.split('\n');
    const entities = [];
    const relationships = [];
    let currentEntity = null;

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed === 'erDiagram') return;

      if (trimmed.includes('||--o{') || trimmed.includes('||--||')) {
        relationships.push(trimmed);
        return;
      }

      if (trimmed.endsWith('{')) {
        const entityName = trimmed.replace('{', '').trim();
        currentEntity = { name: entityName, fields: [] };
        entities.push(currentEntity);
      } else if (trimmed === '}' && currentEntity) {
        currentEntity = null;
      } else if (currentEntity) {
        const parts = trimmed.split(/\s+/);
        if (parts.length >= 2) {
          const type = parts[0];
          const name = parts[1];
          const key = parts[2] || '';
          currentEntity.fields.push({ type, name, key });
        }
      }
    });

    const entityCardsHtml = entities.map(e => `
      <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 shadow-lg flex flex-col">
        <div class="font-bold text-white text-xs tracking-wider uppercase pb-2 mb-2.5 border-b border-slate-700/80 flex items-center justify-between">
          <span class="text-blue-400 font-mono">${escHtml(e.name)}</span>
          <span class="px-2 py-0.5 text-[9px] font-sans font-medium bg-blue-500/20 text-blue-300 rounded-full border border-blue-500/30">Table Entity</span>
        </div>
        <div class="space-y-1.5 text-xs font-mono flex-1">
          ${e.fields.map(f => `
            <div class="flex items-center justify-between py-0.5 text-[11px]">
              <span class="text-slate-200 font-semibold">${escHtml(f.name)}</span>
              <div class="flex items-center gap-1.5">
                <span class="text-slate-400 text-[10px]">${escHtml(f.type)}</span>
                ${f.key === 'PK' ? '<span class="px-1.5 py-0.2 text-[9px] font-sans font-bold bg-amber-500/20 text-amber-300 rounded border border-amber-500/40">PK</span>' : ''}
                ${f.key === 'FK' ? '<span class="px-1.5 py-0.2 text-[9px] font-sans font-bold bg-purple-500/20 text-purple-300 rounded border border-purple-500/40">FK</span>' : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    const relsHtml = relationships.map(r => `
      <div class="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800">
        <span class="text-emerald-400 font-semibold">${escHtml(r)}</span>
      </div>
    `).join('');

    return `
      <div class="my-6 p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-blue-500/30 rounded-2xl shadow-2xl">
        <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <div class="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
          </div>
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-blue-400">Rendered Entity Relationship Diagram</h4>
            <p class="text-[11px] text-slate-400">Dynamic database schema entity models & relationship linkages</p>
          </div>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          ${entityCardsHtml}
        </div>
        ${relationships.length > 0 ? `
          <div class="mt-4 pt-3 border-t border-slate-800/80">
            <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">Foreign Key Relationships</span>
            <div class="flex flex-wrap gap-2">${relsHtml}</div>
          </div>
        ` : ''}
      </div>
    `;
  }

  if (mermaidCode.includes('graph') || mermaidCode.includes('flowchart')) {
    const lines = mermaidCode.split('\n');
    const subgraphs = [];
    let currentSubgraph = null;
    const links = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('graph')) return;

      if (trimmed.startsWith('subgraph')) {
        const title = trimmed.replace('subgraph', '').trim();
        currentSubgraph = { title, nodes: [] };
        subgraphs.push(currentSubgraph);
        return;
      }

      if (trimmed === 'end' && currentSubgraph) {
        currentSubgraph = null;
        return;
      }

      const arrowMatch = trimmed.match(/(.+)-->(?:\|(.*)\|)?(.+)/);
      if (arrowMatch) {
        const from = extractNodeInfo(arrowMatch[1]);
        const label = (arrowMatch[2] || '').trim();
        const to = extractNodeInfo(arrowMatch[3]);
        links.push({ from, label, to });

        if (currentSubgraph) {
          if (!currentSubgraph.nodes.some(n => n.id === from.id)) currentSubgraph.nodes.push(from);
          if (!currentSubgraph.nodes.some(n => n.id === to.id)) currentSubgraph.nodes.push(to);
        }
      }
    });

    if (subgraphs.length > 0) {
      // Render Layered Subgraph Component Architecture
      const layersHtml = subgraphs.map((sub, idx) => `
        <div class="bg-slate-900/90 border border-slate-700/80 rounded-xl p-4 shadow-lg flex flex-col flex-1">
          <div class="flex items-center justify-between pb-2 mb-3 border-b border-slate-700/80">
            <span class="text-xs font-bold text-violet-400 uppercase tracking-wider">${escHtml(sub.title)}</span>
            <span class="px-2 py-0.5 text-[9px] font-sans font-medium bg-violet-500/20 text-violet-300 rounded-full border border-violet-500/30">Tier ${idx + 1}</span>
          </div>
          <div class="space-y-2 flex-1">
            ${sub.nodes.map(n => `
              <div class="p-2.5 bg-slate-800/90 border border-slate-700 rounded-lg">
                <div class="font-semibold text-white text-xs">${escHtml(n.label)}</div>
                ${n.desc ? `<div class="text-[10px] text-blue-400 font-mono mt-0.5">${escHtml(n.desc)}</div>` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      `).join('');

      const flowConnectionsHtml = links.map(l => `
        <div class="flex items-center gap-2 text-xs font-mono text-slate-300 bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
          <span class="text-blue-400 font-semibold">${escHtml(l.from.label)}</span>
          ${l.from.desc ? `<span class="text-[10px] text-slate-400">(${escHtml(l.from.desc)})</span>` : ''}
          <div class="flex items-center gap-1 text-emerald-400 font-sans px-1">
            <span>──</span>
            ${l.label ? `<span class="px-1.5 py-0.5 bg-slate-800 text-emerald-300 rounded text-[10px] border border-emerald-500/30">${escHtml(l.label)}</span>──` : ''}
            <span>►</span>
          </div>
          <span class="text-violet-400 font-semibold">${escHtml(l.to.label)}</span>
          ${l.to.desc ? `<span class="text-[10px] text-slate-400">(${escHtml(l.to.desc)})</span>` : ''}
        </div>
      `).join('');

      return `
        <div class="my-6 p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-violet-500/30 rounded-2xl shadow-2xl">
          <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
            <div class="p-1.5 bg-violet-500/20 rounded-lg text-violet-400">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            </div>
            <div>
              <h4 class="text-xs font-bold uppercase tracking-wider text-violet-400">Rendered Component Layer Architecture</h4>
              <p class="text-[11px] text-slate-400">Multi-tier modular decomposition and source file linkages</p>
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            ${layersHtml}
          </div>
          ${links.length > 0 ? `
            <div class="mt-4 pt-3 border-t border-slate-800/80">
              <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2.5">Component Inter-Layer Communication</span>
              <div class="space-y-2">${flowConnectionsHtml}</div>
            </div>
          ` : ''}
        </div>
      `;
    }

    // High-Level Flow Sequence
    const flowStepsHtml = links.map((l, idx) => `
      <div class="flex items-center gap-3 p-3.5 bg-slate-900/90 border border-slate-800 rounded-xl">
        <span class="w-6 h-6 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center text-xs font-bold font-mono">${idx + 1}</span>
        <div class="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div class="flex flex-col">
            <span class="text-xs font-bold text-white">${escHtml(l.from.label)}</span>
            ${l.from.desc ? `<span class="text-[10px] text-blue-400 font-mono">${escHtml(l.from.desc)}</span>` : ''}
          </div>
          <div class="flex items-center gap-1.5 text-xs text-emerald-400 font-mono px-2">
            <span>──</span>
            ${l.label ? `<span class="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded text-[10px] font-sans font-medium">${escHtml(l.label)}</span>──` : ''}
            <span>►</span>
          </div>
          <div class="flex flex-col text-right">
            <span class="text-xs font-bold text-white">${escHtml(l.to.label)}</span>
            ${l.to.desc ? `<span class="text-[10px] text-violet-400 font-mono">${escHtml(l.to.desc)}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');

    return `
      <div class="my-6 p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border border-blue-500/30 rounded-2xl shadow-2xl">
        <div class="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
          <div class="p-1.5 bg-blue-500/20 rounded-lg text-blue-400">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <div>
            <h4 class="text-xs font-bold uppercase tracking-wider text-blue-400">Rendered High-Level Architecture Flow</h4>
            <p class="text-[11px] text-slate-400">System-level execution pipeline & request flow sequence</p>
          </div>
        </div>
        <div class="space-y-3">
          ${flowStepsHtml || `<pre class="doc-pre"><code class="doc-code mermaid">${escHtml(mermaidCode)}</code></pre>`}
        </div>
      </div>
    `;
  }

  return `<pre class="doc-pre"><code class="doc-code mermaid">${escHtml(mermaidCode)}</code></pre>`;
}

function extractNodeInfo(raw) {
  if (!raw) return { id: '', label: '', desc: '' };
  const str = raw.trim();

  const match = str.match(/^([a-zA-Z0-9_-]+)\s*(?:\["([^"]+)"\]|\[([^\]]+)\]|\(([^)]+)\))?/);
  if (match) {
    const id = match[1];
    const fullText = (match[2] || match[3] || match[4] || match[1]).trim();
    const descMatch = fullText.match(/^([^(]+)(?:\(([^)]+)\))?/);
    const label = (descMatch ? descMatch[1] : fullText).trim();
    const desc = descMatch && descMatch[2] ? descMatch[2].trim() : '';

    return { id, label, desc };
  }
  
  return { id: str, label: str, desc: '' };
}

function cleanNodeLabel(raw) {
  if (!raw) return '';
  const str = raw.trim();
  const quoteMatch = str.match(/\["([^"]+)"\]/);
  if (quoteMatch && quoteMatch[1]) return quoteMatch[1].trim();

  const bracketMatch = str.match(/\[([^\]]+)\]/);
  if (bracketMatch && bracketMatch[1]) return bracketMatch[1].trim();

  const parenMatch = str.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) return parenMatch[1].trim();

  return str.replace(/["[\]()]/g, '').trim();
}

function escHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Version History Panel ─────────────────────────────────────────────────────

function VersionHistoryPanel({ repositoryId, chapterId, onClose }) {
  const [history, setHistory] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!repositoryId || !chapterId) return;
    setLoading(true);
    fetch(`/api/repository/${repositoryId}/documentation/chapter/${chapterId}/versions`)
      .then(r => r.json())
      .then(d => { if (d.success) setHistory(d.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [repositoryId, chapterId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0F172A] border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden shadow-2xl flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/20 rounded-lg">
              <History className="w-4 h-4 text-violet-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Version History</h3>
              <p className="text-xs text-gray-400">{history?.title || 'Loading...'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
            </div>
          )}
          {!loading && history && (
            <>
              <div className="flex items-center gap-3 mb-5 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <CheckCircle2 className="w-4 h-4 text-blue-400" />
                <div>
                  <span className="text-xs font-semibold text-blue-300">Current Version: v{history.currentVersion}</span>
                  <p className="text-[11px] text-gray-400 mt-0.5">{history.history?.length || 0} previous version(s) in history</p>
                </div>
              </div>

              {(!history.history || history.history.length === 0) && (
                <div className="text-center py-8 text-gray-500 text-sm">
                  No previous versions found. Regenerate this chapter to start tracking versions.
                </div>
              )}

              <div className="space-y-3">
                {(history.history || []).slice().reverse().map((ver, i) => (
                  <div key={i} className="p-4 bg-[#0A0E17] border border-gray-800 rounded-xl">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-300">Version {ver.version}</span>
                      <div className="flex items-center gap-2">
                        <ProviderBadge provider={ver.generatedBy} />
                        <span className="text-[10px] text-gray-500">
                          {ver.generatedAt ? new Date(ver.generatedAt).toLocaleString() : '—'}
                        </span>
                      </div>
                    </div>
                    <pre className="text-[11px] text-gray-400 font-mono overflow-x-auto max-h-32 whitespace-pre-wrap leading-relaxed">
                      {ver.markdown?.slice(0, 400)}{ver.markdown?.length > 400 ? '...' : ''}
                    </pre>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Documentation Workspace ──────────────────────────────────────────────

export default function DocumentationWorkspace() {
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeChapter, setActiveChapter] = useState(null);
  const [viewMode, setViewMode] = useState('preview'); // preview | markdown | html
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [regenerating, setRegenerating] = useState({}); // { chapterId: bool }
  const [generatingAll, setGeneratingAll] = useState(false);
  const [repoInput, setRepoInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [providerInfo, setProviderInfo] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [notification, setNotification] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const textareaRef = useRef(null);

  // Notify helper
  const notify = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  // Fetch provider info on mount
  useEffect(() => {
    fetch('/api/documentation/providers')
      .then(r => r.json())
      .then(d => { if (d.success) setProviderInfo(d); })
      .catch(() => {});
    // Restore active repository context from in-memory session
    const mem = getMemorySession();
    if (mem.repoUrl) {
      setRepoInput(mem.repoUrl);
    }
    // Try loading latest docs
    fetch('/api/repository/documentation/latest')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.chapters?.length) {
          setDocData(d.data);
          setActiveChapter(d.data.chapters[0]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    console.log(`[DEBUG] DOCS GENERATOR OPENED:
  analysisSessionId: ${docData?.repositoryId || 'active'}
  repositoryUrl: ${repoInput || 'pending / active session'}`);
  }, [docData, repoInput]);

  // Generate all chapters
  const handleGenerateAll = async (e) => {
    e.preventDefault();
    if (!repoInput.trim()) return;
    setGeneratingAll(true);
    try {
      // First build knowledge graph via intelligent docs
      const kgRes = await fetch('/api/intelligent-docs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoInput.trim() })
      });
      const kgData = await kgRes.json();
      if (!kgData.success) throw new Error(kgData.error || 'Knowledge graph generation failed');

      const repositoryId = kgData.reportId || kgData.data?.reportId;

      // Now generate documentation
      const docRes = await fetch(`/api/repository/${repositoryId}/documentation/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoInput.trim(), language })
      });
      const docResult = await docRes.json();
      if (!docResult.success) throw new Error(docResult.error || 'Documentation generation failed');

      setDocData(docResult.data);
      setActiveChapter(docResult.data.chapters[0]);
      setEditMode(false);
      notify(`✅ Generated ${docResult.chaptersGenerated} chapters via ${docResult.llmProvider} provider`);
    } catch (err) {
      notify(`❌ ${err.message}`, 'error');
    } finally {
      setGeneratingAll(false);
    }
  };

  // Regenerate a single chapter
  const handleRegenerateChapter = async (chapter) => {
    if (!docData?.repositoryId) return;
    setRegenerating(prev => ({ ...prev, [chapter.chapterId]: true }));
    try {
      const res = await fetch(`/api/repository/${docData.repositoryId}/documentation/chapter/${chapter.chapterId}/regenerate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: docData.language || language })
      });
      const result = await res.json();
      if (!result.success) throw new Error(result.error);

      // Update local state
      const updatedChapters = docData.chapters.map(c =>
        c.chapterId === chapter.chapterId ? result.data : c
      );
      const updatedDoc = { ...docData, chapters: updatedChapters };
      setDocData(updatedDoc);
      if (activeChapter?.chapterId === chapter.chapterId) {
        setActiveChapter(result.data);
        setEditContent(result.data.markdown);
      }
      notify(`♻️ Regenerated "${chapter.title}" → v${result.version}`);
    } catch (err) {
      notify(`❌ ${err.message}`, 'error');
    } finally {
      setRegenerating(prev => ({ ...prev, [chapter.chapterId]: false }));
    }
  };

  // Select chapter
  const handleSelectChapter = (chapter) => {
    setActiveChapter(chapter);
    setEditMode(false);
    setEditContent(chapter.markdown || '');
    setViewMode('preview');
  };

  // Toggle edit mode
  const toggleEdit = () => {
    if (!editMode) {
      setEditContent(activeChapter?.markdown || '');
      setViewMode('preview');
    }
    setEditMode(prev => !prev);
  };

  // Save edited content locally
  const handleSaveEdit = () => {
    if (!docData || !activeChapter) return;
    const updated = { ...activeChapter, markdown: editContent, generatedBy: 'manual', updatedAt: new Date().toISOString() };
    const updatedChapters = docData.chapters.map(c => c.chapterId === activeChapter.chapterId ? updated : c);
    setDocData({ ...docData, chapters: updatedChapters });
    setActiveChapter(updated);
    setEditMode(false);
    notify('💾 Chapter saved locally');
  };

  // Export chapter
  const handleExportChapter = (format) => {
    if (!docData?.repositoryId || !activeChapter) return;
    window.open(`/api/repository/${docData.repositoryId}/documentation/chapter/${activeChapter.chapterId}/export/${format}`, '_blank');
  };

  // Export full documentation
  const handleExportFull = (format) => {
    if (!docData?.repositoryId) return;
    window.open(`/api/repository/${docData.repositoryId}/documentation/export/${format}`, '_blank');
  };

  // Filtered chapters by search
  const filteredChapters = docData?.chapters?.filter(c =>
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.markdown?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const generatedCount = docData?.chapters?.filter(c => c.markdown && c.markdown.length > 50).length || 0;
  const totalChapters = docData?.chapters?.length || 19;

  return (
    <div className="flex flex-col gap-0 h-full">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-sm flex items-center gap-2 transition-all animate-in slide-in-from-top-2 ${
          notification.type === 'error'
            ? 'bg-red-900/80 border-red-500/50 text-red-200'
            : 'bg-emerald-900/80 border-emerald-500/50 text-emerald-200'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* Version History Modal */}
      {showVersionHistory && docData?.repositoryId && activeChapter && (
        <VersionHistoryPanel
          repositoryId={docData.repositoryId}
          chapterId={activeChapter.chapterId}
          onClose={() => setShowVersionHistory(false)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-5 mb-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Title */}
          <div className="flex items-center gap-3 flex-1">
            <div className="p-2.5 bg-gradient-to-br from-blue-600/30 to-violet-600/30 border border-blue-500/30 rounded-xl">
              <BookOpen className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                Enterprise Documentation Workspace
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
                  Module 10
                </span>
                {providerInfo && <ProviderBadge provider={providerInfo.activeProvider} />}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {docData
                  ? <>📖 <span className="text-blue-400 font-mono">{docData.projectName}</span> · {generatedCount}/{totalChapters} chapters · Language: <span className="text-cyan-400">{docData.language || 'en'}</span></>
                  : '19-chapter enterprise documentation from Repository Knowledge Model'}
              </p>
            </div>
          </div>

          {/* Generation Progress */}
          {docData && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden xl:block">
                <div className="text-xs text-gray-400">Generation Progress</div>
                <div className="text-sm font-bold text-emerald-400">{generatedCount}/{totalChapters}</div>
              </div>
              <div className="w-24 h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${(generatedCount / totalChapters) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Export Buttons */}
          {docData && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleExportFull('markdown')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-semibold hover:bg-blue-600/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" /> Markdown
              </button>
              <button
                onClick={() => handleExportFull('html')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-semibold hover:bg-purple-600/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" /> HTML
              </button>
              <button
                onClick={() => handleExportFull('json')}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold hover:bg-amber-600/30 transition-all"
              >
                <Download className="w-3.5 h-3.5" /> JSON
              </button>
            </div>
          )}
        </div>

        {/* Generate Form */}
        <form onSubmit={handleGenerateAll} className="flex gap-2 mt-4">
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="bg-[#0A0E17] border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-200 focus:outline-none focus:border-blue-500 flex-shrink-0"
          >
            {LANGUAGES.map(l => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <input
            type="url"
            value={repoInput}
            onChange={e => setRepoInput(e.target.value)}
            placeholder="Repository URL (e.g. https://github.com/expressjs/express)"
            className="flex-1 bg-[#0A0E17] border border-gray-700 rounded-lg px-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={generatingAll || !repoInput.trim()}
            className="px-5 py-2 bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-500 hover:to-violet-500 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/30"
          >
            {generatingAll
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating 19 Chapters…</>
              : <><Sparkles className="w-3.5 h-3.5" /> Generate All</>
            }
          </button>
        </form>
      </div>

      {/* ── Main Workspace ──────────────────────────────────────────────── */}
      <div className="flex gap-4 flex-1 min-h-0" style={{ minHeight: '70vh' }}>

        {/* Sidebar */}
        <div className={`flex-shrink-0 flex flex-col gap-2 transition-all duration-300 ${sidebarCollapsed ? 'w-12' : 'w-64'}`}>
          <div className="bg-[#0F172A] border border-gray-800 rounded-2xl overflow-hidden flex flex-col h-full">
            {/* Sidebar Header */}
            <div className="p-3 border-b border-gray-800 flex items-center justify-between">
              {!sidebarCollapsed && (
                <div className="flex items-center gap-2 flex-1 relative">
                  <Search className="w-3.5 h-3.5 text-gray-500 absolute left-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search chapters…"
                    className="w-full bg-[#0A0E17] border border-gray-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
              <button
                onClick={() => setSidebarCollapsed(p => !p)}
                className="ml-2 p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-all flex-shrink-0"
              >
                {sidebarCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Chapter List */}
            <div className="overflow-y-auto flex-1 p-2 space-y-0.5">
              {!docData && !sidebarCollapsed && (
                <div className="px-2 py-6 text-center text-xs text-gray-500">
                  <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-700" />
                  Generate documentation to see chapters
                </div>
              )}
              {filteredChapters.map((chapter, idx) => (
                <ChapterItem
                  key={chapter.chapterId}
                  chapter={chapter}
                  index={idx}
                  isActive={activeChapter?.chapterId === chapter.chapterId}
                  onClick={() => handleSelectChapter(chapter)}
                  isRegenerating={!!regenerating[chapter.chapterId]}
                />
              ))}
            </div>

            {/* Sidebar Footer */}
            {!sidebarCollapsed && docData && (
              <div className="p-3 border-t border-gray-800">
                <div className="text-[10px] text-gray-500 text-center">
                  {generatedCount}/{totalChapters} chapters generated · {docData.language || 'en'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Content Pane */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          {!activeChapter && (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0F172A] border border-gray-800 rounded-2xl py-20">
              <div className="p-4 bg-blue-500/10 rounded-2xl mb-4">
                <BookOpen className="w-10 h-10 text-blue-400" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">Documentation Workspace</h3>
              <p className="text-xs text-gray-400 text-center max-w-xs">
                Generate enterprise documentation from your Repository Knowledge Model, then select a chapter to view, edit, or export.
              </p>
            </div>
          )}

          {activeChapter && (
            <>
              {/* Chapter Toolbar */}
              <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${CHAPTER_COLORS[activeChapter.chapterId] || 'from-blue-500 to-cyan-600'} flex items-center justify-center flex-shrink-0`}>
                    {React.createElement(CHAPTER_ICONS[activeChapter.chapterId] || FileText, { className: 'w-4 h-4 text-white' })}
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-bold text-white truncate">{activeChapter.title}</h2>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[10px] text-gray-500">v{activeChapter.version || 1}</span>
                      <ProviderBadge provider={activeChapter.generatedBy} />
                      {activeChapter.language && activeChapter.language !== 'en' && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded">
                          {activeChapter.language}
                        </span>
                      )}
                      {activeChapter.updatedAt && (
                        <span className="text-[10px] text-gray-600 hidden sm:inline">
                          {new Date(activeChapter.updatedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Toolbar Actions */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* View Mode Switcher */}
                  {!editMode && (
                    <div className="flex items-center bg-[#0A0E17] border border-gray-700 rounded-lg p-0.5">
                      {[
                        { id: 'preview', icon: Eye, label: 'Preview' },
                        { id: 'markdown', icon: FileText, label: 'Markdown' },
                        { id: 'html', icon: Code2, label: 'HTML' }
                      ].map(vm => (
                        <button
                          key={vm.id}
                          onClick={() => setViewMode(vm.id)}
                          title={vm.label}
                          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all ${
                            viewMode === vm.id
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          <vm.icon className="w-3 h-3" />
                          <span className="hidden sm:inline">{vm.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Edit Toggle */}
                  <button
                    onClick={toggleEdit}
                    title={editMode ? 'Cancel Edit' : 'Edit Markdown'}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      editMode
                        ? 'bg-amber-600/20 text-amber-300 border-amber-500/30'
                        : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {editMode ? 'Cancel' : 'Edit'}
                  </button>

                  {/* Save Edit */}
                  {editMode && (
                    <button
                      onClick={handleSaveEdit}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-semibold hover:bg-emerald-600/30 transition-all"
                    >
                      <Check className="w-3.5 h-3.5" /> Save
                    </button>
                  )}

                  {/* Regenerate */}
                  <button
                    onClick={() => handleRegenerateChapter(activeChapter)}
                    disabled={!!regenerating[activeChapter.chapterId]}
                    title="Regenerate this chapter"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-violet-600/20 text-violet-300 border border-violet-500/30 rounded-lg text-xs font-semibold hover:bg-violet-600/30 transition-all disabled:opacity-50"
                  >
                    {regenerating[activeChapter.chapterId]
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : <RefreshCw className="w-3.5 h-3.5" />
                    }
                    <span className="hidden sm:inline">Regenerate</span>
                  </button>

                  {/* Version History */}
                  <button
                    onClick={() => setShowVersionHistory(true)}
                    title="Version History"
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-800 text-gray-400 border border-gray-700 hover:text-white rounded-lg text-xs font-medium transition-all"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">History</span>
                  </button>

                  {/* Export Chapter */}
                  <div className="flex items-center gap-1">
                    {['markdown', 'html', 'json'].map(fmt => (
                      <button
                        key={fmt}
                        onClick={() => handleExportChapter(fmt)}
                        title={`Export as ${fmt.toUpperCase()}`}
                        className="px-2 py-1.5 bg-gray-800 text-gray-400 border border-gray-700 hover:text-white rounded-lg text-[11px] font-medium transition-all hover:bg-gray-700"
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Content Area */}
              <div className="flex-1 bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden">
                {editMode ? (
                  // Edit Mode
                  <div className="h-full flex flex-col">
                    <div className="px-4 py-2 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-2">
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span className="text-xs text-amber-400 font-medium">Edit Mode — Markdown</span>
                      <span className="text-[11px] text-gray-500 ml-auto">{editContent.length} chars</span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={editContent}
                      onChange={e => setEditContent(e.target.value)}
                      className="flex-1 w-full bg-[#0A0E17] text-gray-200 text-xs font-mono p-5 resize-none focus:outline-none leading-relaxed"
                      placeholder="Enter Markdown content…"
                      spellCheck={false}
                    />
                  </div>
                ) : viewMode === 'preview' ? (
                  // Preview Mode
                  <div className="h-full overflow-y-auto p-6">
                    <style>{docStyles}</style>
                    <MarkdownRenderer content={activeChapter.markdown} />
                  </div>
                ) : viewMode === 'markdown' ? (
                  // Raw Markdown Mode
                  <div className="h-full overflow-y-auto">
                    <div className="px-4 py-2 bg-[#0A0E17] border-b border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-blue-400" />
                        <span className="text-xs text-gray-400">Raw Markdown</span>
                      </div>
                      <CopyButton text={activeChapter.markdown || ''} />
                    </div>
                    <pre className="p-5 text-xs text-gray-300 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
                      {activeChapter.markdown || 'No content generated yet.'}
                    </pre>
                  </div>
                ) : (
                  // HTML Source Mode
                  <div className="h-full overflow-y-auto">
                    <div className="px-4 py-2 bg-[#0A0E17] border-b border-gray-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-3.5 h-3.5 text-purple-400" />
                        <span className="text-xs text-gray-400">HTML Source</span>
                      </div>
                      <CopyButton text={activeChapter.html || ''} />
                    </div>
                    <pre className="p-5 text-xs text-purple-300 font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
                      {activeChapter.html || 'No HTML content generated yet.'}
                    </pre>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Embedded Styles for Markdown Preview ──────────────────────────────────────
const docStyles = `
  .doc-h1 { font-size: 1.6rem; font-weight: 800; color: #F8FAFC; margin-top: 0; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid #1e293b; }
  .doc-h2 { font-size: 1.2rem; font-weight: 700; color: #93C5FD; margin-top: 2rem; margin-bottom: 0.75rem; }
  .doc-h3 { font-size: 1rem; font-weight: 600; color: #6EE7B7; margin-top: 1.5rem; margin-bottom: 0.5rem; }
  .doc-h4 { font-size: 0.9rem; font-weight: 600; color: #FCD34D; margin-top: 1.25rem; margin-bottom: 0.4rem; }
  .doc-h5, .doc-h6 { font-size: 0.85rem; font-weight: 600; color: #A5B4FC; margin-top: 1rem; margin-bottom: 0.3rem; }
  .doc-p { margin: 0.5rem 0; color: #CBD5E1; font-size: 0.82rem; line-height: 1.7; }
  .doc-ul { margin: 0.5rem 0 0.5rem 1.25rem; padding: 0; list-style: disc; }
  .doc-li { color: #CBD5E1; font-size: 0.82rem; margin-bottom: 0.25rem; line-height: 1.6; }
  .doc-pre { background: #020617; border: 1px solid #1e293b; border-radius: 10px; padding: 14px 16px; margin: 0.75rem 0; overflow-x: auto; }
  .doc-code { color: #A5F3FC; font-family: 'Fira Code', 'Cascadia Code', monospace; font-size: 0.78rem; line-height: 1.6; }
  .doc-inline-code { background: #0F172A; color: #A5F3FC; border: 1px solid #1e293b; border-radius: 4px; padding: 1px 6px; font-family: monospace; font-size: 0.8em; }
  .doc-table-wrap { overflow-x: auto; margin: 0.75rem 0; border-radius: 10px; border: 1px solid #1e293b; }
  .doc-table { border-collapse: collapse; width: 100%; font-size: 0.79rem; }
  .doc-th { background: #1e293b; color: #F8FAFC; padding: 9px 12px; text-align: left; font-weight: 600; white-space: nowrap; }
  .doc-td { padding: 7px 12px; border-top: 1px solid #1e293b; color: #CBD5E1; }
  .doc-table tbody tr:nth-child(even) td { background: #0A0E17; }
  .doc-hr { border: none; border-top: 1px solid #1e293b; margin: 1.5rem 0; }
  .doc-strong { color: #E2E8F0; font-weight: 600; }
  .doc-link { color: #60A5FA; text-decoration: underline; }
`;
