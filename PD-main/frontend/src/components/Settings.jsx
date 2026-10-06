import React, { useState } from 'react';
import { Settings, Sliders, Key, MessageSquare, ShieldCheck, Save, Check } from 'lucide-react';

export default function SettingsView() {
  const [provider, setProvider] = useState('gemini');
  const [apiKey, setApiKey] = useState('');
  const [confidenceThreshold, setConfidenceThreshold] = useState(75);
  const [autoRegen, setAutoRegen] = useState(true);
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Settings className="w-7 h-7 text-cyan-400" />
          <span>Engine Settings & AI Layer Configuration</span>
        </h2>
        <p className="text-gray-400 text-sm mt-1">
          Tune confidence thresholds, LLM providers, prompt templates, and selective documentation generation policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* AI Layer Provider */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Key className="w-4 h-4 text-cyan-400" />
            <span>AI Layer & LLM Provider Settings</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                LLM Provider Model
              </label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="gemini">Google Gemini 1.5 Flash (Recommended)</option>
                <option value="openai">OpenAI GPT-4o</option>
                <option value="fallback">Internal Semantic Rules Engine</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                API Key (Optional / Environment Managed)
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-900 border border-gray-700 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Confidence Thresholds */}
        <div className="glass-card p-6 rounded-2xl border border-gray-800 space-y-5">
          <h3 className="text-base font-bold text-white flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <span>Confidence & Selective Regeneration Rules</span>
          </h3>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center text-xs font-semibold mb-2">
                <span className="text-gray-300 uppercase tracking-wider">Doc Confidence Threshold</span>
                <span className="text-cyan-400 text-sm">{confidenceThreshold}%</span>
              </div>
              <input
                type="range"
                min="50"
                max="95"
                value={confidenceThreshold}
                onChange={(e) => setConfidenceThreshold(e.target.value)}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Documentation blocks falling below {confidenceThreshold}% confidence score automatically trigger selective AI regeneration.
              </p>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Automated AST Sync Trigger</div>
                <div className="text-xs text-gray-400">Automatically trigger AST scan upon Git push webhooks.</div>
              </div>
              <input
                type="checkbox"
                checked={autoRegen}
                onChange={(e) => setAutoRegen(e.target.checked)}
                className="w-5 h-5 accent-cyan-500 rounded cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold shadow-lg shadow-cyan-500/20 hover:brightness-110 transition cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Settings Saved!' : 'Save Engine Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
