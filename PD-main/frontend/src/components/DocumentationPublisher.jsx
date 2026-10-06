import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Layers, Server, Database, Sparkles, Download, Eye,
  Loader2, RefreshCw, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  ShieldCheck, CheckCircle2, AlertCircle, FileCode, Printer, HelpCircle
} from 'lucide-react';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' }
];

export default function DocumentationPublisher() {
  const [docData, setDocData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeVersion, setActiveVersion] = useState('1.0');
  const [publishing, setPublishing] = useState(false);
  const [versions, setVersions] = useState([]);
  const [previewFormat, setPreviewFormat] = useState('pdf'); // pdf | html | markdown
  const [zoom, setZoom] = useState(100);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedSection, setSelectedSection] = useState(0);
  const [notification, setNotification] = useState(null);

  const notify = useCallback((msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3500);
  }, []);

  const fetchLatestDoc = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/repository/documentation/latest');
      const result = await res.json();
      if (result.success && result.data) {
        // Build document data structure for preview
        const repoId = result.data.repositoryId;
        
        // Fetch versions history
        const verRes = await fetch(`/api/repository/${repoId}/documentation/versions`);
        const verData = await verRes.json();
        if (verData.success) {
          setVersions(verData.data);
        }

        // Map section contents from chapters
        const chapters = result.data.chapters || [];
        const chMap = {};
        chapters.forEach(c => {
          chMap[c.chapterId] = c.markdown;
        });

        // Resolve mock structure for rendering
        const modelData = {
          repositoryId: repoId,
          projectName: result.data.projectName,
          repoUrl: result.data.repoUrl,
          repoOwner: 'Enterprise Development',
          repoBranch: 'main',
          commitHash: result.data.reportId || 'HEAD',
          documentationVersion: activeVersion,
          generatedDate: new Date(result.data.updatedAt).toLocaleDateString(),
          techStackText: result.data.llmProvider === 'deterministic' ? 'JavaScript / Node.js' : 'Polyglot System',
          chaptersCount: chapters.length,
          diagramsCount: 6,
          apiCount: 8,
          databaseEntitiesCount: 2,
          sections: [
            { title: 'Executive Summary', content: chMap.chapter_1 || 'Executive summary outline.' },
            { title: 'Document Metadata', content: `Project Title: ${result.data.projectName}\nRepository URL: ${result.data.repoUrl}\nVersion: ${activeVersion}\nStatus: Verified` },
            { title: 'Table of Contents', content: '1. Executive Summary\n2. Repository Overview\n3. Technology Stack\n4. Repository Structure\n5. Architecture' },
            { title: 'Executive Summary Detailed', content: chMap.chapter_1 || 'Detailed summary.' },
            { title: 'Repository Overview', content: chMap.chapter_2 || 'Repo overview details.' },
            { title: 'Technology Stack', content: chMap.chapter_3 || 'Tech stack findings.' },
            { title: 'Repository Structure', content: 'Folder Structure:\n- src/controllers\n- src/services\n- src/models\n- src/routes' },
            { title: 'Architecture', content: chMap.chapter_10 || 'System architecture patterns.' },
            { title: 'Component Architecture', content: '```mermaid\ngraph TD\n  Client --> Gateway\n  Gateway --> Controller\n  Controller --> Service\n```' },
            { title: 'Module Documentation', content: chMap.chapter_4 || 'Folder breakdown.' },
            { title: 'File Documentation', content: chMap.chapter_5 || 'File breakdown.' },
            { title: 'Class Documentation', content: chMap.chapter_6 || 'Class breakdown.' },
            { title: 'Function Documentation', content: chMap.chapter_7 || 'Function breakdown.' },
            { title: 'API Documentation', content: chMap.chapter_8 || 'API contracts.' },
            { title: 'Database Documentation', content: chMap.chapter_9 || 'DB collections schemas.' },
            { title: 'Entity Relationships', content: '```mermaid\nerDiagram\n  USERS ||--o{ POSTS : "creates"\n```' },
            { title: 'Business Workflows', content: chMap.chapter_11 || 'Workflows.' },
            { title: 'Sequence Flows', content: '```mermaid\nsequenceDiagram\n  Client->>Server: HTTP Request\n  Server-->>Client: JSON Response\n```' },
            { title: 'Security Analysis', content: chMap.chapter_14 || 'Security middleware findings.' },
            { title: 'Configuration', content: chMap.chapter_12 || 'Environment configuration guide.' },
            { title: 'Deployment', content: chMap.chapter_13 || 'Deployment steps.' },
            { title: 'Testing', content: chMap.chapter_16 || 'Testing details.' },
            { title: 'Code Quality', content: chMap.chapter_17 || 'Code quality metrics.' },
            { title: 'Performance', content: chMap.chapter_15 || 'Performance findings.' },
            { title: 'Future Improvements', content: chMap.chapter_18 || 'Improvement outline.' },
            { title: 'Appendix', content: chMap.chapter_19 || 'Glossary and reference details.' }
          ]
        };

        setDocData(modelData);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLatestDoc();
  }, [activeVersion]);

  // Handle Export / Publish Document
  const handlePublish = async (format) => {
    if (!docData) return;
    setPublishing(true);
    try {
      const res = await fetch(`/api/repository/${docData.repositoryId}/documentation/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format, version: activeVersion })
      });
      const result = await res.json();
      if (result.success) {
        notify(`🎉 Successfully compiled document as ${format.toUpperCase()}!`);
        window.open(result.downloadUrl, '_blank');
        fetchLatestDoc(); // Refresh versions history
      } else {
        throw new Error(result.error || 'Failed to publish');
      }
    } catch (err) {
      notify(`❌ Publishing failed: ${err.message}`, 'error');
    } finally {
      setPublishing(false);
    }
  };

  const downloadExisting = (format, ver) => {
    if (!docData) return;
    window.open(`/api/repository/${docData.repositoryId}/documentation/export/${format}?v=${ver}`, '_blank');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p>Loading Documentation Publisher Workspace...</p>
      </div>
    );
  }

  if (!docData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-[#0F172A] border border-gray-800 rounded-xl p-8">
        <AlertCircle className="w-12 h-12 text-amber-500 mb-4" />
        <h2 className="text-base font-bold text-white mb-2">No Documentation Found</h2>
        <p className="text-xs text-gray-400 max-w-sm text-center">
          You must generate documentation chapters first on the "Doc Workspace" tab before using the Professional Documentation Publisher.
        </p>
      </div>
    );
  }

  // Get active section content
  const activeSection = docData.sections[selectedSection] || docData.sections[0];

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl border text-xs font-semibold shadow-2xl backdrop-blur-sm flex items-center gap-2 transition-all animate-in slide-in-from-top-2 ${
          notification.type === 'error'
            ? 'bg-red-900/80 border-red-500/50 text-red-200'
            : 'bg-emerald-900/80 border-emerald-500/50 text-emerald-200'
        }`}>
          {notification.msg}
        </div>
      )}

      {/* ── Header Banner ── */}
      <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-500/20">
              <Printer className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2 flex-wrap">
                Professional Documentation Publisher
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  Module 11 Active
                </span>
              </h1>
              <p className="text-xs text-gray-400 mt-1">
                Project Name: <span className="text-blue-400 font-mono">{docData.projectName}</span> · Commit: <span className="text-purple-400 font-mono">{(docData.commitHash || 'HEAD').substring(0, 7)}</span>
              </p>
            </div>
          </div>

          {/* Quick Version Input */}
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-400 font-medium">Doc Version:</label>
            <input
              type="text"
              value={activeVersion}
              onChange={e => setActiveVersion(e.target.value)}
              className="w-16 bg-[#0A0E17] border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs text-center text-gray-200 focus:outline-none focus:border-blue-500 font-bold"
            />
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-800/80">
          <div className="bg-[#0A0E17] border border-gray-800 p-4 rounded-xl text-center">
            <span className="text-xs text-gray-500 block mb-1">Chapters</span>
            <span className="text-lg font-bold text-blue-400">{docData.chaptersCount || 19}</span>
          </div>
          <div className="bg-[#0A0E17] border border-gray-800 p-4 rounded-xl text-center">
            <span className="text-xs text-gray-500 block mb-1">Diagrams</span>
            <span className="text-lg font-bold text-purple-400">{docData.diagramsCount || 6}</span>
          </div>
          <div className="bg-[#0A0E17] border border-gray-800 p-4 rounded-xl text-center">
            <span className="text-xs text-gray-500 block mb-1">API Routes</span>
            <span className="text-lg font-bold text-emerald-400">{docData.apiCount || 8}</span>
          </div>
          <div className="bg-[#0A0E17] border border-gray-800 p-4 rounded-xl text-center">
            <span className="text-xs text-gray-500 block mb-1">DB Schemas</span>
            <span className="text-lg font-bold text-amber-400">{docData.databaseEntitiesCount || 2}</span>
          </div>
          <div className="bg-[#0A0E17] border border-gray-800 p-4 rounded-xl text-center col-span-2 md:col-span-1 flex flex-col justify-center">
            <span className="text-xs text-gray-500 block mb-1">Status</span>
            <span className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PUBLISHED
            </span>
          </div>
        </div>
      </div>

      {/* ── Export Controls & Live Preview Workspace ── */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Control Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Exporter Buttons Card */}
          <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-gray-400">Compile & Export</h3>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => handlePublish('pdf')}
                disabled={publishing}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-red-600/10 text-red-300 border border-red-500/20 rounded-xl text-xs font-semibold hover:bg-red-600/20 hover:border-red-500/40 transition-all disabled:opacity-50"
              >
                <span>Export PDF</span>
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handlePublish('html')}
                disabled={publishing}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-purple-600/10 text-purple-300 border border-purple-500/20 rounded-xl text-xs font-semibold hover:bg-purple-600/20 hover:border-purple-500/40 transition-all disabled:opacity-50"
              >
                <span>Export HTML</span>
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handlePublish('markdown')}
                disabled={publishing}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-blue-600/10 text-blue-300 border border-blue-500/20 rounded-xl text-xs font-semibold hover:bg-blue-600/20 hover:border-blue-500/40 transition-all disabled:opacity-50"
              >
                <span>Export Markdown</span>
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </button>
              <button
                onClick={() => handlePublish('docx')}
                disabled={publishing}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-amber-600/10 text-amber-300 border border-amber-500/20 rounded-xl text-xs font-semibold hover:bg-amber-600/20 hover:border-amber-500/40 transition-all disabled:opacity-50"
              >
                <span>Export DOCX</span>
                {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Section Outline Checklist */}
          <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-5 flex flex-col h-[350px]">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-gray-400 mb-3 flex-shrink-0">Document Outline</h3>
            <div className="overflow-y-auto flex-1 pr-1 space-y-1">
              {docData.sections.map((sec, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSection(idx)}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-[11px] font-medium truncate border transition-all ${
                    selectedSection === idx
                      ? 'bg-blue-600/20 text-blue-300 border-blue-500/30'
                      : 'text-gray-400 border-transparent hover:bg-gray-800 hover:text-white'
                  }`}
                >
                  {idx + 1}. {sec.title}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Right Live Preview Workspace */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          
          {/* Preview Toolbar */}
          <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-white">Interactive Document Previewer</span>
            </div>

            {/* Preview Selector */}
            <div className="flex items-center bg-[#0A0E17] border border-gray-700 rounded-lg p-0.5">
              {[
                { id: 'pdf', label: 'PDF Layout' },
                { id: 'html', label: 'HTML View' },
                { id: 'markdown', label: 'MD View' }
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => { setPreviewFormat(opt.id); setCurrentPage(1); }}
                  className={`px-3 py-1 rounded-md text-[10px] font-semibold transition-all ${
                    previewFormat === opt.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Page / Zoom Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoom(z => Math.max(50, z - 10))}
                className="p-1 bg-[#0A0E17] border border-gray-700 hover:border-gray-500 rounded text-gray-400 hover:text-white"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-bold text-gray-300 font-mono w-10 text-center">{zoom}%</span>
              <button
                onClick={() => setZoom(z => Math.min(150, z + 10))}
                className="p-1 bg-[#0A0E17] border border-gray-700 hover:border-gray-500 rounded text-gray-400 hover:text-white"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Document Page Container */}
          <div className="bg-[#0F172A] border border-gray-800 rounded-xl overflow-hidden flex flex-col flex-1 min-h-[500px]">
            
            {/* Page simulated border */}
            <div className="bg-[#0A0E17] border-b border-gray-800 px-4 py-2.5 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] text-gray-500 font-mono uppercase font-bold tracking-wider">
                Preview: {activeSection.title}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedSection(s => Math.max(0, s - 1))}
                  disabled={selectedSection === 0}
                  className="p-1 bg-gray-850 hover:bg-gray-800 rounded text-gray-400 disabled:opacity-30"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-bold text-gray-300 font-mono">
                  Section {selectedSection + 1} of {docData.sections.length}
                </span>
                <button
                  onClick={() => setSelectedSection(s => Math.min(docData.sections.length - 1, s + 1))}
                  disabled={selectedSection === docData.sections.length - 1}
                  className="p-1 bg-gray-850 hover:bg-gray-800 rounded text-gray-400 disabled:opacity-30"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Document Content Display */}
            <div className="p-8 overflow-y-auto flex-1 bg-white text-gray-900 border-l border-r border-gray-200 mx-auto w-full transition-all duration-300" style={{
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              maxWidth: '850px',
              fontFamily: previewFormat === 'pdf' ? 'Helvetica, sans-serif' : 'Arial, sans-serif'
            }}>
              
              {/* PDF Cover simulation (only for first section) */}
              {selectedSection === 0 && previewFormat === 'pdf' && (
                <div className="border-b-4 border-blue-600 pb-6 mb-8 text-left">
                  <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest block mb-1">TECHNICAL SPECIFICATION REPORT</span>
                  <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight leading-tight m-0">{docData.projectName}</h1>
                  <div className="text-[10px] text-slate-500 mt-2 font-mono">
                    URL: {docData.repoUrl} · Doc Version: v{activeVersion}
                  </div>
                </div>
              )}

              {/* Render Section content */}
              <div className="prose prose-slate max-w-none text-xs leading-relaxed">
                <h2 className="text-lg font-bold text-slate-900 border-b border-slate-200 pb-2 mb-4">
                  {selectedSection + 1}. {activeSection.title}
                </h2>
                
                {/* Code highlight wrapper or general render */}
                <div className="space-y-4 whitespace-pre-wrap text-slate-700 font-sans text-[11px] leading-relaxed">
                  {activeSection.content}
                </div>
              </div>

              {/* Footer Page simulation */}
              <div className="border-t border-slate-200 pt-3 mt-12 flex justify-between text-[9px] text-slate-400 font-mono">
                <span>Page {selectedSection + 1} of {docData.sections.length}</span>
                <span>ASDSE Automated Publication</span>
              </div>
            </div>

          </div>

          {/* Historical Released Packages Table */}
          <div className="bg-[#0F172A] border border-gray-800 rounded-xl p-5">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider text-gray-400 mb-4">Released Document Packages</h3>
            {versions.length === 0 ? (
              <div className="text-xs text-gray-500 py-4 text-center">
                No versions released yet. Click the export buttons above to build a release package.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-500">
                      <th className="py-2.5 font-semibold">Version</th>
                      <th className="py-2.5 font-semibold">Release Commit</th>
                      <th className="py-2.5 font-semibold">Release Date</th>
                      <th className="py-2.5 font-semibold">Package Specs</th>
                      <th className="py-2.5 font-semibold text-right">Downloads</th>
                    </tr>
                  </thead>
                  <tbody>
                    {versions.map((ver, idx) => (
                      <tr key={idx} className="border-b border-gray-800/60 hover:bg-gray-800/10">
                        <td className="py-3 font-semibold text-white">v{ver.version}</td>
                        <td className="py-3 font-mono text-purple-400">{(ver.commitHash || 'HEAD').substring(0, 7)}</td>
                        <td className="py-3 text-gray-400">{new Date(ver.generatedAt).toLocaleString()}</td>
                        <td className="py-3 text-gray-400">
                          {ver.metadata?.chaptersCount || 19} chapters · {ver.metadata?.diagramsCount || 6} diagrams · {ver.metadata?.apiCount || 8} APIs
                        </td>
                        <td className="py-3 text-right space-x-1.5">
                          <button
                            onClick={() => downloadExisting('pdf', ver.version)}
                            className="px-2.5 py-1 bg-red-600/20 text-red-300 border border-red-500/20 rounded hover:bg-red-600/30 transition-all font-semibold"
                          >
                            PDF
                          </button>
                          <button
                            onClick={() => downloadExisting('html', ver.version)}
                            className="px-2.5 py-1 bg-purple-600/20 text-purple-300 border border-purple-500/20 rounded hover:bg-purple-600/30 transition-all font-semibold"
                          >
                            HTML
                          </button>
                          <button
                            onClick={() => downloadExisting('markdown', ver.version)}
                            className="px-2.5 py-1 bg-blue-600/20 text-blue-300 border border-blue-500/20 rounded hover:bg-blue-600/30 transition-all font-semibold"
                          >
                            MD
                          </button>
                          <button
                            onClick={() => downloadExisting('docx', ver.version)}
                            className="px-2.5 py-1 bg-amber-600/20 text-amber-300 border border-amber-500/20 rounded hover:bg-amber-600/30 transition-all font-semibold"
                          >
                            DOCX
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}
