import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare, Send, Cpu, Layers, HelpCircle, Shield, Code, CheckCircle,
  Database, AlertTriangle, Loader2, ArrowRight, BookOpen, Trash2, X,
  Maximize2, Eye, ShieldAlert, FileText, ChevronRight, Zap
} from 'lucide-react';

const SUGGESTED_QUESTIONS = [
  "Explain this project's architecture",
  "How does authentication work?",
  "Show the main APIs",
  "Explain the database design",
  "Explain the most important business workflows",
  "Which modules depend on each other?",
  "How do I run this project?"
];

export default function RepositoryChat() {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [repositoryId, setRepositoryId] = useState('proj_1');
  const [projectName, setProjectName] = useState('Auth & User Services System');
  const [conversationId, setConversationId] = useState(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [inspectorContent, setInspectorContent] = useState(null); // { type, title, code }
  const [disambigOptions, setDisambigOptions] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Initial welcome message
    setMessages([
      {
        sender: 'assistant',
        text: `Hello! I am your AI Repository Assistant for **${projectName}**. I can answer design, code, and routing questions grounded strictly on the Repository Knowledge Model. How can I help you today?`,
        sources: [],
        confidence: 'High'
      }
    ]);

    // Attempt to load latest doc to resolve repositoryId if available
    fetch('/api/repository/documentation/latest')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data) {
          setRepositoryId(d.data.repositoryId || 'proj_1');
          setProjectName(d.data.projectName || 'Auth & User Services System');
          
          setMessages([
            {
              sender: 'assistant',
              text: `Hello! I am your AI Repository Assistant for **${d.data.projectName}**. I can answer design, code, and routing questions grounded strictly on the Repository Knowledge Model. How can I help you today?`,
              sources: [],
              confidence: 'High'
            }
          ]);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSendMessage = async (text) => {
    if (!text.trim() || !repositoryId) return;

    // Add user message to state
    const userMsg = { sender: 'user', text };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);
    setDisambigOptions(null);

    try {
      const res = await fetch(`/api/repository/${repositoryId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversationId
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.disambiguate) {
          setDisambigOptions(data.options);
        }

        setConversationId(data.conversationId);
        setMessages(prev => [...prev, {
          sender: 'assistant',
          text: data.answer,
          sources: data.sources || [],
          diagrams: data.diagrams || [],
          confidence: data.confidence || 'Medium'
        }]);
      } else {
        throw new Error(data.error || 'Failed to get answer');
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: `Error processing query: ${err.message}. Please verify the backend is running.`,
        sources: [],
        confidence: 'Low',
        isError: true
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = async () => {
    if (conversationId && repositoryId) {
      await fetch(`/api/repository/${repositoryId}/chat/${conversationId}`, { method: 'DELETE' });
    }
    setMessages([
      {
        sender: 'assistant',
        text: `Conversation cleared. Ready for your questions on **${projectName}**.`,
        sources: [],
        confidence: 'High'
      }
    ]);
    setConversationId(null);
    setInspectorOpen(false);
    setDisambigOptions(null);
  };

  const openInspector = (type, title, content) => {
    setInspectorContent({ type, title, content });
    setInspectorOpen(true);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[72vh]">
      
      {/* ── Chat Container Pane (Left 2 Columns) ── */}
      <div className="lg:col-span-2 flex flex-col bg-[#0F172A] border border-gray-800 rounded-2xl overflow-hidden h-full">
        
        {/* Chat Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 text-blue-400 border border-blue-500/20 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Repository AI Assistant</h2>
              <span className="text-[10px] text-gray-400 font-mono block mt-0.5">
                Active Context: <span className="text-blue-400">{projectName}</span>
              </span>
            </div>
          </div>
          {messages.length > 1 && (
            <button
              onClick={handleClearHistory}
              title="Clear conversation history"
              className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Message Timeline */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white font-medium shadow-md shadow-blue-900/20'
                  : msg.isError
                    ? 'bg-red-950/40 border border-red-500/30 text-red-200'
                    : 'bg-[#0A0E17] border border-gray-800/80 text-gray-200 shadow-sm'
              }`}>
                
                {/* Assistant Headers (Confidence & Badge) */}
                {msg.sender === 'assistant' && !msg.isError && (
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase tracking-wider ${
                      msg.confidence === 'High' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                      msg.confidence === 'Medium' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                      'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {msg.confidence} Confidence
                    </span>
                    <span className="text-[9px] text-gray-500">Repository Grounded</span>
                  </div>
                )}

                {/* Message Text content */}
                <div className="whitespace-pre-wrap font-sans text-gray-300">
                  {msg.text}
                </div>

                {/* Diagrams list */}
                {msg.diagrams && msg.diagrams.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {msg.diagrams.map((diag, dIdx) => (
                      <button
                        key={dIdx}
                        onClick={() => openInspector('diagram', diag.title, diag.content)}
                        className="flex items-center justify-between w-full p-2 bg-gray-900/60 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-xl transition-all"
                      >
                        <span className="text-[10px] text-blue-400 font-semibold truncate">{diag.title}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Sources & Citations */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-800/80">
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Citations & References</span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, sIdx) => {
                        const isFile = src.type === 'File';
                        return (
                          <button
                            key={sIdx}
                            onClick={() => openInspector(src.type, src.name, JSON.stringify(src.details || src, null, 2))}
                            className="text-[10px] px-2 py-0.5 bg-gray-900 border border-gray-800 text-gray-400 hover:text-white rounded hover:border-gray-600 transition-all font-mono"
                          >
                            {src.name}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>
          ))}

          {/* Disambiguation Prompts */}
          {disambigOptions && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4" /> Disambiguation Prompt
              </span>
              <p className="text-[11px] text-gray-300">Multiple entities named match in the codebase. Select the exact entity you refer to:</p>
              <div className="flex flex-wrap gap-2">
                {disambigOptions.map((opt, oIdx) => (
                  <button
                    key={oIdx}
                    onClick={() => handleSendMessage(`Explain ${opt.type} "${opt.id}" in path ${opt.path}`)}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 rounded-lg text-xs font-semibold transition-all"
                  >
                    {opt.type}: {opt.id} ({opt.path})
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading bubble */}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-[#0A0E17] border border-gray-800 rounded-2xl p-4 text-xs text-gray-400 flex items-center gap-2">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                Retrieving context & generating answer...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Chips (above input) */}
        {messages.length <= 1 && (
          <div className="px-5 py-3 border-t border-gray-800/80 bg-gray-900/20">
            <span className="text-[10px] font-bold text-gray-500 uppercase block mb-2">Suggested Questions</span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto no-scrollbar">
              {SUGGESTED_QUESTIONS.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(q)}
                  className="px-2.5 py-1 bg-[#0A0E17] hover:bg-gray-800 text-gray-400 hover:text-white border border-gray-800 rounded-full text-[10px] font-medium transition-all"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={e => { e.preventDefault(); handleSendMessage(inputValue); }} className="p-3 border-t border-gray-800 bg-[#0A0E17] flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Ask a natural-language question about this repository..."
            className="flex-1 bg-[#0F172A] border border-gray-700/80 rounded-xl px-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={loading || !inputValue.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

      {/* ── Sidebar Inspector Pane (Right Column) ── */}
      <div className="lg:col-span-1 flex flex-col bg-[#0F172A] border border-gray-800 rounded-2xl overflow-hidden h-full">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-900/60 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-4.5 h-4.5 text-blue-400" />
            <h3 className="text-xs font-bold text-white">Repository Inspector</h3>
          </div>
          {inspectorOpen && (
            <button
              onClick={() => setInspectorOpen(false)}
              className="p-1 text-gray-500 hover:text-white hover:bg-gray-800 rounded transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!inspectorOpen ? (
            <div className="flex flex-col items-center justify-center text-center h-full text-gray-500 py-10">
              <Eye className="w-10 h-10 text-gray-700 mb-2" />
              <span className="text-xs font-semibold text-gray-400">Inspector Terminal</span>
              <p className="text-[10px] text-gray-500 max-w-xs mt-1">
                Select a citation source or a diagram inside the chat messages to inspect the structured context here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider font-mono">{inspectorContent.type}</span>
                <span className="text-[10px] text-gray-400 font-semibold">{inspectorContent.title}</span>
              </div>

              {inspectorContent.type === 'diagram' ? (
                <div className="space-y-2">
                  <pre className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-[10px] font-mono text-emerald-400 overflow-x-auto">
                    {inspectorContent.content}
                  </pre>
                  <div className="text-[9px] text-gray-500 bg-gray-900/50 p-2.5 rounded-lg border border-gray-850">
                    💡 This flowchart / sequence chart is dynamically generated from actual relationships discovered in the Repository Knowledge Model.
                  </div>
                </div>
              ) : (
                <pre className="p-4 bg-[#0A0E17] border border-gray-800 rounded-xl text-[10px] font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap">
                  {inspectorContent.content}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
