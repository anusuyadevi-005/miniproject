import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Upload, FileText, Network, Settings, Cpu, ShieldCheck, Wrench, Dna, Database, BookOpen, Webhook, Link2, Layers, Activity, ScrollText, Printer, MessageSquare, Hash, Sparkles, Bot, Zap, Check, ChevronDown, X } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, overallConfidence }) {
  const [activeModel, setActiveModel] = useState('deterministic');
  const [providers, setProviders] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProviderStatus();
  }, []);

  const fetchProviderStatus = async () => {
    try {
      const res = await fetch('/api/repository/documentation/providers');
      const data = await res.json();
      if (data.success) {
        setActiveModel(data.activeProvider || 'deterministic');
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.warn('Unable to load AI providers:', err);
    }
  };

  const handleSelectModel = async (modelName) => {
    setLoading(true);
    try {
      const res = await fetch('/api/repository/documentation/providers/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: modelName })
      });
      const data = await res.json();
      if (data.success) {
        setActiveModel(data.activeProvider);
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error('Failed to switch AI model:', err);
    } finally {
      setLoading(false);
      setIsModalOpen(false);
    }
  };

  const modelMetadata = {
    openai: { name: 'GPT-4o Mini', tag: 'OpenAI', icon: Zap, color: 'from-emerald-500 to-teal-600', badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' },
    gemini: { name: 'Gemini 1.5 Flash', tag: 'Google AI', icon: Sparkles, color: 'from-blue-500 to-cyan-500', badgeClass: 'bg-blue-500/10 text-blue-400 border-blue-500/30' },
    claude: { name: 'Claude 3.5 Sonnet', tag: 'Anthropic', icon: Bot, color: 'from-amber-500 to-orange-600', badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30' },
    ollama: { name: 'Llama 3.1 70B', tag: 'Local LLM', icon: Cpu, color: 'from-purple-500 to-indigo-600', badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/30' },
    deterministic: { name: 'Deterministic AI Engine', tag: 'Zero-Hallucination', icon: ShieldCheck, color: 'from-cyan-500 to-blue-600', badgeClass: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' }
  };

  const currentMeta = modelMetadata[activeModel] || modelMetadata.deterministic;
  const ModelIcon = currentMeta.icon;

  const navItems = [
    { id: 'repomind', label: 'RepoMind Studio', icon: Cpu, isPrimary: true },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'chat', label: 'AI Assistant', icon: MessageSquare },
    { id: 'doc_workspace', label: 'Doc Workspace', icon: ScrollText },
    { id: 'publisher', label: 'Doc Publisher', icon: Printer },
    { id: 'repo_docs', label: 'Repository Docs', icon: BookOpen },
    { id: 'upload', label: 'Repo PDF Generator', icon: Upload },
    { id: 'saved_reports', label: 'MongoDB Reports', icon: Database },
    { id: 'docs', label: 'SDID Inspector', icon: FileText },
    { id: 'sdid', label: 'SDID Engine', icon: Hash },
    { id: 'graph', label: 'Impact Radius', icon: Network },
    { id: 'api_explorer', label: 'API Explorer', icon: Link2 },
    { id: 'database_explorer', label: 'Database Explorer', icon: Database },
    { id: 'selfhealing', label: 'Self-Healing Studio', icon: Wrench },
    { id: 'architecture', label: 'Architecture Explorer', icon: Layers },
    { id: 'business_logic', label: 'Business Logic Explorer', icon: Activity },
    { id: 'history', label: 'DNA Ledger', icon: Dna },
    { id: 'webhook', label: 'Webhook Sync', icon: Webhook },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-50 glass-card border-b border-gray-800 bg-[#0B0F19]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center space-x-3 cursor-pointer shrink-0" onClick={() => setActiveTab('repomind')}>
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 shadow-lg shadow-cyan-500/20 shrink-0">
              <Cpu className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-bold bg-gradient-to-r from-white via-gray-200 to-cyan-400 bg-clip-text text-transparent whitespace-nowrap">
                RepoMind AI
              </h1>
              <div className="flex items-center space-x-2 text-[11px] text-gray-400 whitespace-nowrap">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <span>ASDSE Continuous Sync Active</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5 overflow-x-auto py-1 flex-1 min-w-0 mx-4 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-sm shadow-cyan-500/10 font-semibold'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Model Selector Badge & System Status */}
          <div className="flex items-center space-x-2">
            {/* Show-off AI Model Badge */}
            <button
              onClick={() => setIsModalOpen(true)}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all duration-200 cursor-pointer shadow-md hover:scale-[1.03] ${currentMeta.badgeClass}`}
            >
              <ModelIcon className="w-3.5 h-3.5 animate-pulse" />
              <span>{currentMeta.name}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {/* System Status Pill */}
            <div className="hidden xl:flex items-center space-x-2 bg-gray-900/80 px-3 py-1.5 rounded-full border border-gray-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs text-gray-300 font-medium">Confidence:</span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/50">
                {overallConfidence}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Model Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0F172A] border border-gray-800 rounded-2xl p-6 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Select AI Engine / Model</h3>
                  <p className="text-xs text-gray-400">Choose the AI model powering code intelligence & docs.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              {[
                { id: 'openai', name: 'OpenAI GPT-4o Mini', desc: 'Fast, high-reasoning multimodal model.', tag: 'Cloud API', icon: Zap },
                { id: 'gemini', name: 'Google Gemini 1.5 Flash', desc: 'Long-context window for deep repositories.', tag: 'Cloud API', icon: Sparkles },
                { id: 'claude', name: 'Anthropic Claude 3.5 Sonnet', desc: 'Precision code & architecture synthesis.', tag: 'Cloud API', icon: Bot },
                { id: 'ollama', name: 'Meta Llama 3.1 70B', desc: 'Local private open-weights model.', tag: 'Self-Hosted', icon: Cpu },
                { id: 'deterministic', name: 'Deterministic AST Engine', desc: 'Zero-hallucination static code analysis.', tag: 'Offline Local', icon: ShieldCheck }
              ].map((m) => {
                const IconComp = m.icon;
                const isSelected = activeModel === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(m.id)}
                    disabled={loading}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start justify-between ${
                      isSelected
                        ? 'bg-cyan-500/10 border-cyan-500 text-white shadow-lg shadow-cyan-500/10'
                        : 'bg-[#0A0E17] border-gray-800 text-gray-300 hover:border-gray-700 hover:bg-gray-900/60'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg mt-0.5 ${isSelected ? 'bg-cyan-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
                        <IconComp className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">{m.name}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 font-medium">{m.tag}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 mt-1">{m.desc}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-1" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex items-center justify-between text-[11px] text-gray-400 border-t border-gray-800">
              <span>Active Provider: <strong className="text-cyan-400 uppercase">{activeModel}</strong></span>
              <span>100% Zero Hallucination Mode</span>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

