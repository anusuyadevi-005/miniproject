import React, { useState, useEffect } from 'react';
import { Upload, GitBranch, CheckCircle, FolderTree, Network, Database, Download, FileText, ShieldCheck, Sparkles, Hash, Layers, Code, Server, GitCommit, Clock, Github, Search, LogOut } from 'lucide-react';
import { getMemorySession } from '../services/sessionStore';

export default function UploadRepo({ onProjectCreated }) {
  const [repoName, setRepoName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  // Version Control State
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);
  const [analyzingCommitSha, setAnalyzingCommitSha] = useState(null);

  // GitHub Integration State
  const [githubConnected, setGithubConnected] = useState(false);
  const [githubUsername, setGithubUsername] = useState('');
  const [githubRepos, setGithubRepos] = useState([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedGithubRepo, setSelectedGithubRepo] = useState(null);
  const [githubBranches, setGithubBranches] = useState([]);
  const [selectedGithubBranch, setSelectedGithubBranch] = useState('');
  const [githubConnectionResult, setGithubConnectionResult] = useState(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [loadingGithubData, setLoadingGithubData] = useState(false);

  useEffect(() => {
    checkGithubStatus();
    // Handle OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('github_success')) {
      checkGithubStatus();
      // clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const checkGithubStatus = async () => {
    try {
      const res = await fetch('/api/github/status');
      const data = await res.json();
      if (data.connected) {
        setGithubConnected(true);
        setGithubUsername(data.username);
        fetchGithubRepos();
      } else {
        setGithubConnected(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectGithub = async () => {
    setIsAuthorizing(true);
    try {
      const res = await fetch('/api/github/login');
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
        setIsAuthorizing(false);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to initiate GitHub login');
      setIsAuthorizing(false);
    }
  };

  const handleDisconnectGithub = async () => {
    try {
      await fetch('/api/github/disconnect', { method: 'DELETE' });
      setGithubConnected(false);
      setGithubUsername('');
      setGithubRepos([]);
      setSelectedGithubRepo(null);
      setGithubBranches([]);
      setGithubConnectionResult(null);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGithubRepos = async () => {
    setLoadingGithubData(true);
    try {
      const res = await fetch('/api/github/repositories');
      const data = await res.json();
      if (res.ok) {
        setGithubRepos(data);
      } else {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load GitHub repositories');
    } finally {
      setLoadingGithubData(false);
    }
  };

  const handleSelectGithubRepo = async (repo) => {
    setSelectedGithubRepo(repo);
    setSelectedGithubBranch(repo.default_branch || '');
    setGithubBranches([]);
    setLoadingGithubData(true);
    try {
      const res = await fetch(`/api/github/repositories/${repo.owner}/${repo.name}/branches`);
      const data = await res.json();
      if (res.ok) {
        setGithubBranches(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGithubData(false);
    }
  };

  const handleConnectSelectedRepo = async () => {
    if (!selectedGithubRepo || !selectedGithubBranch) return;
    setLoading(true);
    setError(null);
    setGithubConnectionResult(null);
    try {
      const res = await fetch('/api/github/connect-repository', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repository: selectedGithubRepo, branch: selectedGithubBranch })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to connect repository');
      setGithubConnectionResult(data.project);
      if (onProjectCreated) onProjectCreated(data.project);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const mem = getMemorySession();
    if (mem.repoUrl) setRepoUrl(mem.repoUrl);
    if (mem.branch) setBranch(mem.branch);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;

    setLoading(true);
    setAnalysisResult(null);
    setError(null);

    try {
      const res = await fetch('/api/projects/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: repoName, repoUrl, branch })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || `Server returned error (${res.status}). Ensure backend is running.`);
      }
      setAnalysisResult(data);
      if (onProjectCreated && data.project) onProjectCreated(data.project);
    } catch (err) {
      console.error('Failed to analyze repository:', err);
      setError(err.message || 'Failed to analyze repository link. Please check the URL and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFetchCommits = async (e) => {
    e.preventDefault();
    if (!repoUrl) return;
    setLoadingCommits(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/repositories/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl, branch })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch commits');
      setCommits(data?.recentCommits || []);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to fetch commits.');
    } finally {
      setLoadingCommits(false);
    }
  };

  const handleAnalyzeCommit = async (commitSha) => {
    setAnalyzingCommitSha(commitSha);
    setAnalysisResult(null);
    setError(null);
    try {
      const res = await fetch('/api/v1/repositories/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl, branch, commitSha, name: repoName })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'Failed to analyze commit');
      
      // Wrap data in a report object to match existing UI structure
      setAnalysisResult({ report: data });
      if (onProjectCreated) onProjectCreated(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to analyze commit.');
    } finally {
      setAnalyzingCommitSha(null);
    }
  };

  const handleDownloadPDF = (reportId, targetRepoUrl, commitSha) => {
    const rId = reportId || 'latest';
    let query = targetRepoUrl ? `?url=${encodeURIComponent(targetRepoUrl)}` : '';
    if (commitSha) {
      query += query ? `&commitSha=${encodeURIComponent(commitSha)}` : `?commitSha=${encodeURIComponent(commitSha)}`;
    }
    const downloadUrl = `/api/reports/${rId}/pdf${query}`;
    window.open(downloadUrl, '_blank');
  };

  const report = analysisResult?.report;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
          <Upload className="w-7 h-7 text-cyan-400" />
          <span>Upload & Analyze Repository Link</span>
        </h2>
        <p className="text-gray-400 mt-1 text-sm">
          Provide any public Git repository link (GitHub/GitLab) to automatically generate a full detailed report—including **Tech Stack Matrix**, **MongoDB Atlas Database Structures**, **API Endpoint Contracts**, **Architecture Diagrams**, and **Downloadable PDF Document**.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* GitHub Integration Card */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-gray-800 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2 border-b border-gray-800 pb-4">
            <Github className="w-5 h-5 text-white" />
            <span>Connect via GitHub (Recommended)</span>
          </h3>

          {!githubConnected ? (
            <div className="text-center py-8 space-y-4">
              <p className="text-sm text-gray-400">
                Connect your GitHub account to easily select repositories and synchronize changes automatically.
              </p>
              <button
                onClick={handleConnectGithub}
                disabled={isAuthorizing}
                className="mx-auto px-6 py-3 rounded-xl bg-[#2ea44f] hover:bg-[#2c974b] text-white font-semibold transition flex items-center space-x-2 disabled:opacity-50"
              >
                {isAuthorizing ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <Github className="w-4 h-4" />
                )}
                <span>Connect GitHub</span>
              </button>
            </div>
          ) : githubConnectionResult ? (
            <div className="space-y-4 animate-fade-in">
              <div className="p-5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                  <CheckCircle className="w-5 h-5" />
                  <span>GitHub Repository Connected ✓</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mt-4 bg-gray-900/60 p-4 rounded-lg border border-gray-800">
                  <div>
                    <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Repository</span>
                    <span className="text-sm text-gray-200 font-mono">{githubConnectionResult.fullName}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Branch</span>
                    <span className="text-sm text-cyan-400 font-mono">{githubConnectionResult.branch}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">GitHub Sync</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-900/50 text-emerald-400 font-bold border border-emerald-800/50">Connected</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Initial synchronization</span>
                    <span className="text-xs text-amber-400 font-medium">Not started yet</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setGithubConnectionResult(null)}
                className="text-xs text-gray-400 hover:text-white transition"
              >
                Connect another repository
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <img src={`https://github.com/${githubUsername}.png`} alt={githubUsername} className="w-6 h-6 rounded-full border border-gray-700" />
                  <span className="text-sm font-semibold text-gray-300">{githubUsername}</span>
                </div>
                <button onClick={handleDisconnectGithub} className="text-xs text-gray-500 hover:text-rose-400 flex items-center space-x-1 transition">
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>

              {!selectedGithubRepo ? (
                <div className="space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      placeholder="Search repositories..."
                      value={repoSearch}
                      onChange={(e) => setRepoSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-900/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition text-sm"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {loadingGithubData ? (
                      <div className="p-4 text-center text-sm text-gray-500">Loading repositories...</div>
                    ) : githubRepos.length === 0 ? (
                      <div className="p-4 text-center text-sm text-gray-500">No repositories found.</div>
                    ) : (
                      githubRepos
                        .filter(r => r.full_name.toLowerCase().includes(repoSearch.toLowerCase()))
                        .map(repo => (
                          <button
                            key={repo.id}
                            onClick={() => handleSelectGithubRepo(repo)}
                            className="w-full text-left px-3 py-2.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 border border-transparent hover:border-gray-700 transition flex items-center justify-between"
                          >
                            <span className="text-sm font-medium text-gray-200">{repo.full_name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 capitalize">{repo.visibility}</span>
                          </button>
                        ))
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                    <h4 className="text-sm font-bold text-cyan-400">{selectedGithubRepo.full_name}</h4>
                    <button onClick={() => setSelectedGithubRepo(null)} className="text-xs text-gray-500 hover:text-white transition">Change</button>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                      Select Branch
                    </label>
                    {loadingGithubData ? (
                      <div className="text-xs text-gray-500 py-2">Loading branches...</div>
                    ) : (
                      <div className="relative">
                        <GitBranch className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                        <select
                          value={selectedGithubBranch}
                          onChange={(e) => setSelectedGithubBranch(e.target.value)}
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/80 border border-gray-700 text-white focus:outline-none focus:border-cyan-500 transition text-sm appearance-none"
                        >
                          <option value="" disabled>Select a branch</option>
                          {githubBranches.map(b => (
                            <option key={b.name} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleConnectSelectedRepo}
                    disabled={loading || !selectedGithubBranch}
                    className="w-full px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/20 hover:brightness-110 transition flex items-center justify-center space-x-2 disabled:opacity-50 mt-4"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Network className="w-4 h-4" />
                    )}
                    <span>Connect Repository</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Existing Manual URL Workflow */}
        <div className="glass-card p-6 sm:p-8 rounded-2xl border border-gray-800 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center space-x-2 border-b border-gray-800 pb-4">
            <Code className="w-5 h-5 text-gray-400" />
            <span>Manual Git URL Connection</span>
          </h3>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Project Name (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Microservice Engine"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-900/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Target Branch
              </label>
              <div className="relative">
                <GitBranch className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="main"
                  value={branch}
                  onChange={(e) => setBranch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-gray-900/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Git Repository URL Link *
              </label>
              <input
                type="url"
                placeholder="https://github.com/expressjs/express.git"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-gray-900/80 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition text-sm"
                required
              />
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={loading || loadingCommits || analyzingCommitSha}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 text-white font-semibold shadow-lg shadow-cyan-500/20 hover:brightness-110 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-sm"
              >
                {loading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Analyze & PDF</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                onClick={handleFetchCommits}
                disabled={loading || loadingCommits || analyzingCommitSha || !repoUrl}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-800 text-white font-semibold hover:bg-gray-700 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer text-sm"
              >
                {loadingCommits ? (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <GitCommit className="w-3.5 h-3.5" />
                )}
                <span>Fetch History</span>
              </button>
            </div>
          </form>
        </div>
      </div>

        {/* Display Analysis Error */}
        {error && (
          <div className="p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-200 text-xs font-semibold flex items-center justify-between animate-fade-in">
            <span>⚠️ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-white font-bold ml-4">✕</button>
          </div>
        )}

        {/* Display Commits */}
        {commits.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-gray-800 animate-fade-in">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <GitCommit className="w-5 h-5 text-indigo-400" />
              <span>Version History (Select a commit to generate PDF)</span>
            </h3>
            <div className="space-y-3">
              {commits.map((commit, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-gray-900/60 border border-gray-800 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="font-mono text-cyan-400 font-bold">{commit.shortSha || commit.hash?.substring(0, 7) || commit.fullSha?.substring(0, 7)}</span>
                      <span className="text-gray-300 font-medium">{commit.message}</span>
                    </div>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span className="flex items-center space-x-1"><Hash className="w-3.5 h-3.5" /><span>{commit.author}</span></span>
                      <span className="flex items-center space-x-1"><Clock className="w-3.5 h-3.5" /><span>{commit.date || commit.commitDate}</span></span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAnalyzeCommit(commit.fullSha || commit.hash)}
                    disabled={analyzingCommitSha === (commit.fullSha || commit.hash) || loading}
                    className="px-4 py-2 rounded-lg bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600 hover:text-white border border-indigo-600/50 transition font-semibold text-sm flex items-center justify-center space-x-2 shrink-0 disabled:opacity-50"
                  >
                    {analyzingCommitSha === (commit.fullSha || commit.hash) ? (
                      <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <FileText className="w-4 h-4" />
                    )}
                    <span>Generate PDF</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Display Analysis & Report Results */}
        {analysisResult && report && (
          <div className="space-y-8 pt-6 border-t border-gray-800 animate-fade-in">
            {/* Success Banner & PDF Download Action */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 to-teal-950/40 border border-emerald-500/30 gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-emerald-400 font-bold text-base">
                  <CheckCircle className="w-5 h-5" />
                  <span>Repository Analysis & Report Generation Complete!</span>
                </div>
                <p className="text-xs text-gray-300">
                  Full detailed structure extracted for <span className="text-emerald-300 font-mono">{report.projectName}</span>. Report persisted in **MongoDB Atlas** (`asdse_db`).
                </p>
              </div>

              <button
                onClick={() => handleDownloadPDF(report._id || report.reportId || report.repositoryId, report.repoUrl, report.inventory?.metadata?.commitHash)}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition flex items-center space-x-2 text-sm cursor-pointer shrink-0"
              >
                <Download className="w-4 h-4" />
                <span>Download Generated PDF Report</span>
              </button>
            </div>

            {/* 1. Tech Stack Overview */}
            <div className="p-6 rounded-2xl bg-gray-950 border border-gray-900 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Extracted Technology Stack Matrix</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(report.techStack || {}).map(([key, items]) => (
                  <div key={key} className="p-4 rounded-xl bg-gray-900/80 border border-gray-800/80 space-y-2">
                    <span className="text-xs font-semibold text-cyan-400 capitalize">{key} Layer</span>
                    <div className="flex flex-wrap gap-1.5">
                      {Array.isArray(items) && items.map((item, idx) => (
                        <span key={idx} className="text-[11px] px-2 py-0.5 rounded-md bg-gray-800 text-gray-200 border border-gray-700">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Database Structure & Schemas (Crucial User Requirement) */}
            <div className="p-6 rounded-2xl bg-gray-950 border border-gray-900 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-400" />
                  <span>Database Structure & Collection Schemas (MongoDB Atlas)</span>
                </h3>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-mono">
                  {report.databaseStructure?.engine || 'MongoDB Atlas'}
                </span>
              </div>

              <div className="space-y-6">
                {(report.databaseStructure?.tablesOrCollections || []).map((coll, idx) => (
                  <div key={idx} className="p-5 rounded-xl bg-gray-900/90 border border-gray-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-emerald-300 font-mono">Collection: {coll.name}</h4>
                        <p className="text-xs text-gray-400 mt-0.5">{coll.description}</p>
                      </div>
                      <span className="text-[10px] text-gray-400 font-mono">
                        {coll.fields?.length || 0} Fields Defined
                      </span>
                    </div>

                    {/* Fields Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs font-mono">
                        <thead>
                          <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                            <th className="py-2 px-3">Field Name</th>
                            <th className="py-2 px-3">Data Type</th>
                            <th className="py-2 px-3">Required</th>
                            <th className="py-2 px-3">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60 text-gray-300">
                          {coll.fields?.map((field, fIdx) => (
                            <tr key={fIdx} className="hover:bg-gray-800/30">
                              <td className="py-2 px-3 text-cyan-300 font-bold">{field.name}</td>
                              <td className="py-2 px-3 text-indigo-300">{field.type}</td>
                              <td className="py-2 px-3">
                                {field.required ? (
                                  <span className="text-emerald-400 font-bold">Yes</span>
                                ) : (
                                  <span className="text-gray-500">No</span>
                                )}
                              </td>
                              <td className="py-2 px-3 text-gray-400 text-[11px]">{field.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Relationships & Indexes */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 text-xs">
                      <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Indexes & Optimization</span>
                        <div className="space-y-1 text-[11px] text-gray-300">
                          {coll.indexes?.map((idxItem, i) => (
                            <div key={i}>• {idxItem}</div>
                          ))}
                        </div>
                      </div>
                      <div className="p-3 rounded-lg bg-gray-950/60 border border-gray-800/80">
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1">Document Relationships</span>
                        <div className="space-y-1 text-[11px] text-gray-300">
                          {coll.relationships?.map((relItem, r) => (
                            <div key={r}>• {relItem}</div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. API Endpoints & Routes */}
            <div className="p-6 rounded-2xl bg-gray-950 border border-gray-900 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Server className="w-4 h-4 text-indigo-400" />
                <span>Extracted API Route Specifications</span>
              </h3>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">Method</th>
                      <th className="py-2.5 px-3">Route Endpoint</th>
                      <th className="py-2.5 px-3">Security</th>
                      <th className="py-2.5 px-3">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60 text-gray-300">
                    {(report.apiEndpoints || []).map((ep, idx) => (
                      <tr key={idx} className="hover:bg-gray-900/50">
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            ep.method === 'GET' ? 'bg-cyan-950 text-cyan-400 border border-cyan-800' :
                            ep.method === 'POST' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                            {ep.method}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-white font-bold">{ep.path}</td>
                        <td className="py-2.5 px-3">
                          {ep.authRequired ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 border border-red-800">JWT Auth</span>
                          ) : (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">Public</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-gray-400 text-[11px]">{ep.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Directory Structure & Architecture Diagram Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Directory Tree */}
              <div className="p-5 rounded-2xl bg-gray-950 border border-gray-900 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <FolderTree className="w-4 h-4 text-cyan-400" />
                  <span>Repository File & Directory Structure</span>
                </h4>

                <div className="space-y-2 font-mono text-xs text-gray-300 max-h-72 overflow-auto pr-1">
                  {(report.directoryStructure || []).map((item, idx) => (
                    <div key={idx} className="p-2 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-between">
                      <span className="text-cyan-300 font-medium">{item.path}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-indigo-300 font-bold">
                        {item.type}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Architecture Diagram */}
              <div className="p-5 rounded-2xl bg-gray-950 border border-gray-900 space-y-4">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                  <Network className="w-4 h-4 text-indigo-400" />
                  <span>System Architecture Diagram (Mermaid)</span>
                </h4>

                <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-xs font-mono text-emerald-400 whitespace-pre-wrap leading-relaxed max-h-72 overflow-auto">
                  {report.architectureDiagram}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-900">
                  <div className="flex items-center space-x-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>MongoDB Atlas Status: <strong className="text-emerald-400">Stored</strong></span>
                  </div>
                  <button
                    onClick={() => handleDownloadPDF(report._id || report.reportId || report.repositoryId, report.repoUrl, report.inventory?.metadata?.commitHash)}
                    className="text-cyan-400 hover:underline flex items-center space-x-1 font-semibold"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
  );
}
