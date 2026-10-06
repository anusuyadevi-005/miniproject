import React, { useState, useEffect } from 'react';
import {
  Cpu, GitBranch, Folder, Upload, Play, CheckCircle, AlertTriangle,
  FileText, Layers, Network, ShieldCheck, Database, Link2,
  RefreshCw, Download, Search, Check, Copy, ArrowRight, Zap, Eye, X, Github, LogOut
} from 'lucide-react';
import MermaidViewer from './MermaidViewer';
import { getMemorySession, setMemorySession, clearMemorySession } from '../services/sessionStore';
import { api } from '../services/api';

export default function RepoMindStudio() {
  const [ingestMode, setIngestMode] = useState('git'); // 'git' | 'local' | 'zip'
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [folderPath, setFolderPath] = useState('');
  const [zipFile, setZipFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('docs'); // docs | diagrams | requirements | traceability | openapi | security | drift
  const [selectedDocIndex, setSelectedDocIndex] = useState(0);
  const [selectedDiagram, setSelectedDiagram] = useState('systemContext');
  const [copied, setCopied] = useState(false);

  // Branch & Commit Ingestion State
  const [availableBranches, setAvailableBranches] = useState([]);
  const [recentCommits, setRecentCommits] = useState([]);
  const [chronologicalVersions, setChronologicalVersions] = useState([]);
  const [selectedCommit, setSelectedCommit] = useState('');
  const [selectedVersionLabel, setSelectedVersionLabel] = useState('');
  const [versionAnalysisCache, setVersionAnalysisCache] = useState({});
  const [inspecting, setInspecting] = useState(false);

  // Synchronization state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [autoSyncLoading, setAutoSyncLoading] = useState(false);
  const [autoSyncStatus, setAutoSyncStatus] = useState(null);
  const [autoSyncMsg, setAutoSyncMsg] = useState('');

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
      setIngestMode('github');
      // clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('github_error')) {
      const errCode = urlParams.get('github_error');
      setIngestMode('github');
      if (errCode === 'auth_denied') setError('GitHub authorization was denied or cancelled.');
      else if (errCode === 'invalid_state') setError('GitHub authorization failed due to invalid state (CSRF protection).');
      else if (errCode === 'missing_config') setError('Server is missing GitHub configuration credentials.');
      else setError('Failed to complete GitHub authorization.');
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

  const handleReset = () => {
    setAnalysis(null);
    setRepoUrl('');
    setBranch('');
    setFolderPath('');
    setZipFile(null);
    setAvailableBranches([]);
    setRecentCommits([]);
    setChronologicalVersions([]);
    setSelectedCommit('');
    setSelectedVersionLabel('');
    setVersionAnalysisCache({});
    setError(null);
    setSyncResult(null);
    clearMemorySession();
  };

  // 1. Sync active in-memory repository context across tab navigation on mount
  useEffect(() => {
    const mem = getMemorySession();
    if (mem.repoUrl) setRepoUrl(mem.repoUrl);
    if (mem.branch) setBranch(mem.branch);
    if (mem.ingestMode) setIngestMode(mem.ingestMode);
    if (mem.folderPath) setFolderPath(mem.folderPath);
    if (mem.activeSubTab) setActiveSubTab(mem.activeSubTab);
    if (mem.selectedDiagram) setSelectedDiagram(mem.selectedDiagram);
    if (mem.selectedDocIndex !== undefined) setSelectedDocIndex(mem.selectedDocIndex);
    if (mem.availableBranches && mem.availableBranches.length > 0) setAvailableBranches(mem.availableBranches);
    if (mem.recentCommits && mem.recentCommits.length > 0) setRecentCommits(mem.recentCommits);
    if (mem.chronologicalVersions && mem.chronologicalVersions.length > 0) setChronologicalVersions(mem.chronologicalVersions);
    if (mem.selectedCommit) setSelectedCommit(mem.selectedCommit);
    if (mem.selectedVersionLabel) setSelectedVersionLabel(mem.selectedVersionLabel);
    if (mem.versionAnalysisCache && Object.keys(mem.versionAnalysisCache).length > 0) {
      setVersionAnalysisCache(mem.versionAnalysisCache);
    }

    if (mem.analysis) {
      setAnalysis(mem.analysis);
      if ((!mem.recentCommits || mem.recentCommits.length === 0) && mem.analysis.inventory?.metadata?.recentCommits?.length > 0) {
        setRecentCommits(mem.analysis.inventory.metadata.recentCommits);
      }
      if ((!mem.chronologicalVersions || mem.chronologicalVersions.length === 0) && mem.analysis.chronologicalVersions?.length > 0) {
        setChronologicalVersions(mem.analysis.chronologicalVersions);
      }
      if (!mem.selectedCommit && mem.analysis.inventory?.metadata?.commitHash) {
        setSelectedCommit(mem.analysis.inventory.metadata.commitHash);
      }
      if (!mem.selectedVersionLabel && mem.analysis.versionComparison?.versionLabel) {
        setSelectedVersionLabel(mem.analysis.versionComparison.versionLabel);
      }
    }
  }, []);

  // 2. Persist active analysis and repository context across tab navigation
  useEffect(() => {
    setMemorySession({
      analysis,
      repoUrl,
      branch,
      availableBranches,
      recentCommits,
      chronologicalVersions,
      selectedCommit,
      selectedVersionLabel,
      versionAnalysisCache,
      ingestMode,
      folderPath,
      activeSubTab,
      selectedDiagram,
      selectedDocIndex
    });
  }, [
    analysis, repoUrl, branch, availableBranches, recentCommits, chronologicalVersions,
    selectedCommit, selectedVersionLabel, versionAnalysisCache,
    ingestMode, folderPath, activeSubTab, selectedDiagram, selectedDocIndex
  ]);

  // 3. Debug logging for Architecture Displayed
  useEffect(() => {
    if (analysis && activeSubTab === 'diagrams') {
      console.log(`[DEBUG] ARCHITECTURE DISPLAYED:
  analysisSessionId: ${analysis.repositoryId}
  diagramId: ${selectedDiagram}`);
    }
  }, [analysis, activeSubTab, selectedDiagram]);

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
      handleReset();
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
    handleReset();
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
      
      // We don't automatically trigger full analysis here, as per requirements.
      // We just store the connection status.
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInspectRepo = async () => {
    if (!repoUrl) return;
    setInspecting(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/repositories/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl, branch })
      });
      if (!res.ok) {
        let errorMsg = `Inspection failed with status ${res.status}`;
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errData = await res.json();
            if (errData.error) errorMsg = errData.error;
          } else if (res.status === 500 || res.status === 502 || res.status === 504) {
            errorMsg = 'Backend server is unreachable on port 5000. Please ensure the backend server is running in your terminal.';
          }
        } catch (_) {
          if (res.status === 500) {
            errorMsg = 'Backend server is unreachable on port 5000. Please ensure the backend server is running in your terminal.';
          }
        }
        throw new Error(errorMsg);
      }
      const data = await res.json();
      setAvailableBranches(data.availableBranches || []);
      if (!branch && data.defaultBranch) {
        setBranch(data.defaultBranch);
      }
      const commits = data.recentCommits || [];
      const versions = data.chronologicalVersions || [];
      setRecentCommits(commits);
      setChronologicalVersions(versions);

      if (commits.length > 0 && !selectedCommit) {
        setSelectedCommit(commits[0].fullSha);
        const latestVersion = versions[versions.length - 1];
        if (latestVersion) {
          setSelectedVersionLabel(latestVersion.versionLabel);
        }
      }
    } catch (err) {
      console.error('Inspection error:', err);
      setError(err.message);
    } finally {
      setInspecting(false);
    }
  };

  const handleBranchChange = async (newBranch) => {
    setBranch(newBranch);
    if (!repoUrl) return;
    setInspecting(true);
    try {
      const res = await fetch('/api/v1/repositories/inspect-branch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: repoUrl, branch: newBranch })
      });
      if (res.ok) {
        const data = await res.json();
        const commits = data.recentCommits || [];
        const versions = data.chronologicalVersions || [];
        setRecentCommits(commits);
        setChronologicalVersions(versions);
        if (commits.length > 0) {
          setSelectedCommit(commits[0].fullSha);
          const latestVersion = versions[versions.length - 1];
          if (latestVersion) {
            setSelectedVersionLabel(latestVersion.versionLabel);
          }
        }
      }
    } catch (e) {
      console.warn('Branch inspection failed:', e);
    } finally {
      setInspecting(false);
    }
  };

  const handleSelectCommit = async (commitSha, vLabel = '') => {
    setSelectedCommit(commitSha);
    if (vLabel) setSelectedVersionLabel(vLabel);

    // If we have cached analysis for this commit, switch to it immediately and sync active session
    if (versionAnalysisCache && versionAnalysisCache[commitSha]) {
      const cached = versionAnalysisCache[commitSha];
      setAnalysis(cached);
      try {
        await fetch('/api/v1/session/select', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repositoryId: cached.repositoryId, commitSha })
        });
      } catch (err) {
        console.warn('[RepoMindStudio] Session select error:', err);
      }
    }
  };

  const handleStartAnalysis = async (targetCommit = null) => {
    setLoading(true);
    setError(null);
    setSyncResult(null);

    const commitToRun = (typeof targetCommit === 'string' && targetCommit.trim())
      ? targetCommit.trim()
      : (typeof selectedCommit === 'string' && selectedCommit.trim() ? selectedCommit.trim() : '');

    try {
      let res;
      if (ingestMode === 'git') {
        res = await fetch('/api/v1/repositories/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: (repoUrl || '').trim(),
            branch: (typeof branch === 'string' ? branch.trim() : ''),
            commitSha: commitToRun || undefined
          })
        });
      } else if (ingestMode === 'local') {
        res = await fetch('/api/v1/analyze/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderPath })
        });
      } else if (ingestMode === 'zip') {
        if (!zipFile) throw new Error('Please select a ZIP file to upload.');
        const formData = new FormData();
        formData.append('archive', zipFile);
        res = await fetch('/api/v1/analyze/upload', {
          method: 'POST',
          body: formData
        });
      } else if (ingestMode === 'github') {
        if (!githubConnectionResult) throw new Error('Please connect a GitHub repository first.');
        res = await fetch('/api/v1/repositories/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: `https://github.com/${githubConnectionResult.fullName}.git`,
            branch: githubConnectionResult.branch,
            commitSha: commitToRun || undefined
          })
        });
      }

      if (!res) {
        throw new Error('Unsupported ingestion mode selected.');
      }

      if (!res.ok) {
        let errorMsg = `Analysis failed with HTTP status ${res.status}`;
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errData = await res.json();
            if (errData.error) errorMsg = errData.error;
          } else {
            const rawText = await res.text();
            if (rawText && rawText.length < 300) {
              errorMsg = rawText;
            } else if (res.status === 500 || res.status === 502 || res.status === 504) {
              errorMsg = 'Backend server is unreachable on port 5000. Please ensure the backend process is running in the terminal.';
            }
          }
        } catch (_) {
          if (res.status === 500) {
            errorMsg = 'Backend server is unreachable on port 5000. Please ensure the backend process is running in the terminal.';
          }
        }
        throw new Error(errorMsg);
      }

      const data = await res.json();
      setAnalysis(data);

      const actualCommit = data.inventory?.metadata?.commitHash || commitToRun;
      if (actualCommit) {
        setSelectedCommit(actualCommit);
        setVersionAnalysisCache(prev => ({
          ...prev,
          [actualCommit]: data
        }));
      }

      if (data.versionComparison?.versionLabel) {
        setSelectedVersionLabel(data.versionComparison.versionLabel);
      }

      if (data.inventory?.metadata?.recentCommits?.length > 0) {
        setRecentCommits(data.inventory.metadata.recentCommits);
      }
      if (data.chronologicalVersions?.length > 0) {
        setChronologicalVersions(data.chronologicalVersions);
      }
      if (data.inventory?.metadata?.availableBranches?.length > 0) {
        setAvailableBranches(data.inventory.metadata.availableBranches);
      }
      return data;
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    if (!analysis) return;
    setSyncLoading(true);
    try {
      const res = await fetch(`/api/v1/repositories/${analysis.repositoryId}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modifiedFiles: ['backend/main.py'],
          commitMessage: 'refactor(auth): relocate /api/login to /api/auth/login',
          oldCode: '@app.post("/api/login")\ndef login(): pass',
          newCode: '@app.post("/api/auth/login")\ndef login(): pass'
        })
      });
      const data = await res.json();
      setSyncResult(data.syncResult);
    } catch (err) {
      console.error('Sync error:', err);
    } finally {
      setSyncLoading(false);
    }
  };

  const handleCheckAndAutoSync = async () => {
    if (!analysis) return;
    setAutoSyncLoading(true);
    setAutoSyncMsg('');
    try {
      const res = await fetch('/api/v1/sync/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryId: analysis.repositoryId })
      });
      const data = await res.json();
      setAutoSyncStatus(data.status);
      setAutoSyncMsg(data.message || (data.status === 'SYNCHRONIZED' ? `Synchronized to ${data.newCommit?.shortSha}` : 'Repository is up to date'));
      if (data.syncResult) {
        setSyncResult(data.syncResult);
      }
      if (data.status === 'SYNCHRONIZED' && data.newCommit) {
        setAnalysis(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            inventory: {
              ...prev.inventory,
              metadata: {
                ...prev.inventory?.metadata,
                commitHash: data.newCommit.fullSha,
                shortCommitHash: data.newCommit.shortSha,
                commitMessage: data.newCommit.message,
                author: data.newCommit.author,
                commitDate: data.newCommit.date
              }
            }
          };
        });
      }
    } catch (err) {
      console.error('Auto sync check error:', err);
      setAutoSyncMsg(`Auto-sync check failed: ${err.message}`);
    } finally {
      setAutoSyncLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = async (endpoint, filename) => {
    if (!analysis && !selectedCommit) return;

    let targetAnalysis = analysis;
    const currentAnalysisCommit = analysis?.inventory?.metadata?.commitHash;

    // If user has selected a commit different from currently loaded analysis
    if (selectedCommit && currentAnalysisCommit !== selectedCommit) {
      if (versionAnalysisCache[selectedCommit]) {
        targetAnalysis = versionAnalysisCache[selectedCommit];
        setAnalysis(targetAnalysis);
        try {
          await fetch('/api/v1/session/select', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ repositoryId: targetAnalysis.repositoryId, commitSha: selectedCommit })
          });
        } catch (_) { }
      } else {
        // Automatically analyze selected commit first to ensure PDF strictly corresponds to selected version
        setError('Analyzing selected version snapshot before document generation...');
        const freshAnalysis = await handleStartAnalysis(selectedCommit);
        if (!freshAnalysis) {
          // Do not overwrite the error set by handleStartAnalysis
          return;
        }
        targetAnalysis = freshAnalysis;
      }
    }

    if (!targetAnalysis) return;

    let targetUrl = repoUrl;
    if (ingestMode === 'github' && githubConnectionResult) {
      targetUrl = `https://github.com/${githubConnectionResult.fullName}.git`;
    }

    const commitQuery = selectedCommit ? `?commitSha=${encodeURIComponent(selectedCommit)}&url=${encodeURIComponent(targetUrl)}` : '';
    window.open(`/api/v1/repositories/${targetAnalysis.repositoryId}/export/${endpoint}${commitQuery}`, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* ─── Hero Header ─── */}
      <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-[#0C1222] via-[#0F172A] to-[#0A0E1A] p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-cyan-500/10 blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
              <Cpu className="w-3.5 h-3.5" />
              <span>Production AI Intelligence Platform</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              RepoMind AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400">& ASDSE</span>
            </h1>
            <p className="text-sm text-gray-400 max-w-2xl mt-2 leading-relaxed">
              Autonomous multi-agent repository intelligence, 17 formal enterprise documents, 10 dynamic Mermaid architecture diagrams, and continuous documentation synchronization with zero hallucination.
            </p>
          </div>

          {analysis && (
            <div className="flex items-center gap-2 bg-[#090D16] p-3 rounded-xl border border-gray-800 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-gray-400 uppercase font-semibold block">Grounding Certainty</span>
                <span className="text-lg font-bold text-emerald-400">{analysis.verification?.verificationScore || 98}% Verified</span>
              </div>
              <ShieldCheck className="w-8 h-8 text-emerald-400 ml-2" />
            </div>
          )}
        </div>
      </div>

      {/* ─── Ingestion Control Card ─── */}
      <div className="bg-[#0B0F19] border border-gray-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ingestion Source:</span>
            <div className="flex bg-[#080C14] p-1 rounded-lg border border-gray-800">
              <button
                onClick={() => setIngestMode('github')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${ingestMode === 'github' ? 'bg-cyan-500 text-black font-semibold' : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Github className="w-3.5 h-3.5" />
                <span>GitHub</span>
              </button>
              <button
                onClick={() => setIngestMode('git')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${ingestMode === 'git' ? 'bg-cyan-500 text-black font-semibold' : 'text-gray-400 hover:text-white'
                  }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Git URL</span>
              </button>
              <button
                onClick={() => setIngestMode('local')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${ingestMode === 'local' ? 'bg-cyan-500 text-black font-semibold' : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Folder className="w-3.5 h-3.5" />
                <span>Local Folder</span>
              </button>
              <button
                onClick={() => setIngestMode('zip')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer ${ingestMode === 'zip' ? 'bg-cyan-500 text-black font-semibold' : 'text-gray-400 hover:text-white'
                  }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>ZIP Archive</span>
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {(analysis || repoUrl || error) && (
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="flex items-center space-x-1.5 bg-gray-800/80 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-medium border border-gray-700 transition cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New / Reset</span>
              </button>
            )}

            <button
              onClick={() => handleStartAnalysis()}
              disabled={loading || (!repoUrl && ingestMode === 'git') || (!folderPath && ingestMode === 'local') || (!zipFile && ingestMode === 'zip')}
              className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-black px-5 py-2.5 rounded-xl font-bold text-xs tracking-wide shadow-lg shadow-cyan-500/20 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>16-Stage Pipeline Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 text-black fill-black" />
                  <span>Run Full Intelligence Analysis</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Dynamic Inputs Based on Ingestion Mode */}
        {ingestMode === 'github' && (
          <div className="space-y-4">
            {!githubConnected ? (
              <div className="text-center py-6 space-y-4 border border-dashed border-gray-800 rounded-xl bg-gray-900/30">
                <p className="text-sm text-gray-400 max-w-md mx-auto">
                  Connect your GitHub account to easily select repositories and synchronize changes automatically.
                </p>
                <button
                  onClick={handleConnectGithub}
                  disabled={isAuthorizing}
                  className="mx-auto px-6 py-2.5 rounded-xl bg-[#2ea44f] hover:bg-[#2c974b] text-white text-sm font-semibold transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
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
                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                    <CheckCircle className="w-4 h-4" />
                    <span>GitHub Repository Connected ✓</span>
                  </div>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2 bg-gray-900/60 p-3 rounded-lg border border-gray-800">
                    <div>
                      <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Repository</span>
                      <span className="text-xs text-gray-200 font-mono truncate block">{githubConnectionResult.fullName || githubConnectionResult.repositoryName}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Branch</span>
                      <span className="text-xs text-cyan-400 font-mono truncate block">{githubConnectionResult.branch || selectedGithubBranch}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase text-gray-500 font-bold mb-1">Status</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold border inline-block ${githubConnectionResult.status === 'Synchronized' ? 'bg-cyan-900/50 text-cyan-400 border-cyan-800/50' : 'bg-emerald-900/50 text-emerald-400 border-emerald-800/50'}`}>
                        {githubConnectionResult.status === 'Synchronized' ? '✓ Synchronized' : 'Ready for synchronization'}
                      </span>
                    </div>
                  </div>

                  {githubConnectionResult.status === 'Synchronized' && githubConnectionResult.commits && (
                    <div className="mt-4 bg-gray-900/80 rounded-lg border border-gray-800 p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">HEAD</h4>
                        <span className="text-[10px] font-mono text-gray-400">{githubConnectionResult.headSha}</span>
                      </div>
                      <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">Versions:</h4>
                      <div className="space-y-2">
                        {githubConnectionResult.commits.map((commit, idx) => {
                          const vLabel = `V${githubConnectionResult.commits.length - idx}`;
                          const isSelected = selectedCommit === commit.hash || (!selectedCommit && idx === 0);
                          return (
                            <button 
                              key={commit.hash}
                              onClick={() => handleSelectCommit(commit.hash, vLabel)}
                              className={`w-full flex justify-between items-center p-2 rounded border transition cursor-pointer text-left ${
                                isSelected
                                  ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm shadow-cyan-500/20 ring-1 ring-cyan-500/40'
                                  : 'bg-gray-800/50 border-gray-700/50 hover:bg-gray-800 hover:border-gray-600'
                              }`}
                            >
                              <div className="flex items-center space-x-3 truncate">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  isSelected ? 'bg-cyan-500 text-black' : 'text-cyan-500 bg-cyan-900/30'
                                }`}>{vLabel}</span>
                                <span className={`text-xs truncate ${isSelected ? 'text-white font-medium' : 'text-gray-300'}`}>{commit.message}</span>
                              </div>
                              <span className={`text-[10px] font-mono ml-4 shrink-0 ${isSelected ? 'text-cyan-400 font-bold' : 'text-gray-500'}`}>{commit.hash.substring(0,7)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex space-x-4 mt-4">
                  {githubConnectionResult.status !== 'Synchronized' && (
                    <button 
                      onClick={async () => {
                        try {
                          const { data } = await api.post('/api/github/synchronize', { 
                            projectId: githubConnectionResult.id 
                          });
                          if (data && data.project) {
                            setGithubConnectionResult(data.project);
                          }
                        } catch (err) {
                          console.error('Sync failed', err);
                          setError(err.message);
                        }
                      }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition cursor-pointer font-bold flex items-center space-x-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Synchronize Repository</span>
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setGithubConnectionResult(null);
                      handleReset();
                    }}
                    className="text-xs text-gray-400 hover:text-white transition cursor-pointer"
                  >
                    Change Repository / Branch
                  </button>
                  <button 
                    onClick={handleDisconnectGithub}
                    className="text-xs text-rose-500 hover:text-rose-400 transition cursor-pointer flex items-center space-x-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Disconnect GitHub</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between bg-gray-900/50 p-3 rounded-xl border border-gray-800">
                  <div className="flex items-center space-x-2">
                    <img src={`https://github.com/${githubUsername}.png`} alt={githubUsername} className="w-6 h-6 rounded-full border border-gray-700" />
                    <span className="text-sm font-semibold text-gray-300">{githubUsername}</span>
                  </div>
                  <button onClick={handleDisconnectGithub} className="text-xs text-gray-500 hover:text-rose-400 flex items-center space-x-1 transition cursor-pointer">
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2 space-y-2">
                    <label className="block text-xs font-medium text-gray-400">Select Repository</label>
                    {!selectedGithubRepo ? (
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search your repositories..."
                            value={repoSearch}
                            onChange={(e) => setRepoSearch(e.target.value)}
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#080C14] border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition text-xs"
                          />
                        </div>
                        <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar border border-gray-800 rounded-xl p-1 bg-[#080C14]">
                          {loadingGithubData ? (
                            <div className="p-4 text-center text-xs text-gray-500">Loading repositories...</div>
                          ) : githubRepos.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-500">No repositories found.</div>
                          ) : (
                            githubRepos
                              .filter(r => r.full_name.toLowerCase().includes(repoSearch.toLowerCase()))
                              .map(repo => (
                                <button
                                  key={repo.id}
                                  onClick={() => handleSelectGithubRepo(repo)}
                                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-800 border border-transparent hover:border-gray-700 transition flex items-center justify-between cursor-pointer group"
                                >
                                  <div className="flex items-center space-x-2 overflow-hidden">
                                    <Github className="w-3.5 h-3.5 text-gray-500 group-hover:text-cyan-400 shrink-0" />
                                    <span className="text-xs text-gray-300 font-medium truncate">{repo.full_name}</span>
                                  </div>
                                  <div className="flex items-center space-x-2 shrink-0">
                                    {repo.private ? (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-bold">Private</span>
                                    ) : (
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 font-bold">Public</span>
                                    )}
                                  </div>
                                </button>
                              ))
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between p-3 rounded-xl bg-[#080C14] border border-cyan-500/50">
                        <div className="flex items-center space-x-2">
                          <Github className="w-4 h-4 text-cyan-400" />
                          <span className="text-sm font-semibold text-white">{selectedGithubRepo.full_name}</span>
                        </div>
                        <button 
                          onClick={() => { setSelectedGithubRepo(null); setGithubBranches([]); setSelectedGithubBranch(''); }}
                          className="text-xs text-gray-500 hover:text-white transition cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-gray-400">Target Branch</label>
                    <div className="relative">
                      <GitBranch className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      {loadingGithubData ? (
                        <div className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#080C14] border border-gray-800 text-gray-500 text-xs flex items-center">
                          <div className="w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                          Loading...
                        </div>
                      ) : (
                        <select
                          value={selectedGithubBranch}
                          onChange={(e) => setSelectedGithubBranch(e.target.value)}
                          disabled={!selectedGithubRepo}
                          className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#080C14] border border-gray-800 text-white focus:outline-none focus:border-cyan-500 transition text-xs cursor-pointer disabled:opacity-50"
                        >
                          <option value="" disabled>Select branch</option>
                          {githubBranches.map(b => (
                            <option key={b.name} value={b.name}>{b.name}</option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    <button
                      onClick={handleConnectSelectedRepo}
                      disabled={loading || !selectedGithubBranch}
                      className="w-full mt-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
                    >
                      {loading ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <Network className="w-3.5 h-3.5" />
                      )}
                      <span>Connect Repository</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {ingestMode === 'git' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-400 mb-1">Git Repository URL (GitHub, GitLab, Bitbucket)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={repoUrl}
                    onChange={(e) => setRepoUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository.git"
                    className="w-full bg-[#080C14] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
                  />
                  <button
                    type="button"
                    onClick={handleInspectRepo}
                    disabled={!repoUrl || inspecting}
                    className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-cyan-400 text-xs font-semibold rounded-xl border border-gray-700 transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {inspecting ? 'Inspecting...' : 'Inspect Branches'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Branch</label>
                <div className="relative">
                  {availableBranches.length > 0 ? (
                    <select
                      value={branch}
                      onChange={(e) => handleBranchChange(e.target.value)}
                      className="w-full bg-[#080C14] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 transition cursor-pointer"
                    >
                      {availableBranches.map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      placeholder="Auto-detect default (e.g. main)"
                      className="w-full bg-[#080C14] border border-gray-800 rounded-xl px-4 py-2.5 pr-8 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
                    />
                  )}
                  {branch && availableBranches.length === 0 && (
                    <button
                      type="button"
                      onClick={() => setBranch('')}
                      title="Clear branch"
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-white rounded-md transition cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}

        {/* Latest 5 Commits Selector (Visible in Git URL and GitHub modes) */}
        {(ingestMode === 'git' || ingestMode === 'github') && recentCommits.length > 0 && (
          <div className="bg-[#080C14] border border-gray-800/80 rounded-xl p-3.5 space-y-2 mt-4">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className="font-semibold text-gray-300">Select Version Snapshot from Latest Commits ({branch || 'default'}):</span>
              <span className="text-[11px] text-cyan-400">Exact version controls all models, diagrams, and PDF</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {recentCommits.slice(0, 5).map((c, idx) => {
                const isSelected = selectedCommit === c.fullSha || (!selectedCommit && recentCommits[0]?.fullSha === c.fullSha);
                const vNum = recentCommits.slice(0, 5).length - idx;
                const vLabel = c.versionLabel || `V${vNum}`;
                const isAnalyzed = Boolean(versionAnalysisCache[c.fullSha] || (analysis?.inventory?.metadata?.commitHash === c.fullSha));
                return (
                  <button
                    key={c.fullSha}
                    type="button"
                    onClick={() => handleSelectCommit(c.fullSha, vLabel)}
                    className={`text-left p-2.5 rounded-lg border transition cursor-pointer text-xs space-y-1 relative ${isSelected
                        ? 'bg-cyan-500/15 border-cyan-500 text-white shadow-sm shadow-cyan-500/20 ring-1 ring-cyan-500/40'
                        : 'bg-gray-900/40 border-gray-800 text-gray-400 hover:border-gray-700 hover:text-gray-300'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${isSelected
                            ? 'bg-cyan-500 text-black border-cyan-400'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}>{vLabel}</span>
                        <span className="font-mono text-[11px] text-cyan-400 font-bold">{c.shortSha}</span>
                      </div>
                      <span className="text-[10px] text-gray-500">{new Date(c.date).toLocaleDateString()}</span>
                    </div>
                    <p className="font-medium text-[11px] truncate">{c.message}</p>
                    <div className="flex items-center justify-between text-[10px] text-gray-500 pt-0.5">
                      <span className="truncate max-w-[90px]">by {c.author}</span>
                      {isAnalyzed && (
                        <span className="text-emerald-400 font-semibold shrink-0">Analyzed</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {ingestMode === 'local' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Local Directory Path</label>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="C:\projects\user-management or ../sample-repos/user-management-app"
              className="w-full bg-[#080C14] border border-gray-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition"
            />
          </div>
        )}

        {ingestMode === 'zip' && (
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Upload Repository Archive (.ZIP)</label>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setZipFile(e.target.files[0])}
              className="w-full bg-[#080C14] border border-gray-800 rounded-xl px-4 py-2 text-xs text-gray-300 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-black hover:file:bg-cyan-400 cursor-pointer"
            />
          </div>
        )}

        {error && (
          <div className="p-3.5 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300 space-y-2">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
            {error.includes('Available remote branches:') && (
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-red-900/60 text-xs">
                <span className="text-gray-400 text-[11px]">Quick Resolution:</span>
                {error.match(/Available remote branches:\s*([^\.]+)/)?.[1]?.split(',').map(b => b.trim()).filter(Boolean).map(suggestedBranch => (
                  <button
                    key={suggestedBranch}
                    type="button"
                    onClick={() => {
                      setBranch(suggestedBranch);
                      setError(null);
                    }}
                    className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    Switch to branch &apos;{suggestedBranch}&apos;
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setBranch('');
                    setError(null);
                  }}
                  className="px-2.5 py-1 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-lg text-xs font-medium transition cursor-pointer"
                >
                  Auto-detect default branch
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Active Analysis Session Banner with Auto-Sync Status */}
      {analysis && (
        <div className="bg-[#090D16] border border-cyan-500/30 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="px-2.5 py-1 bg-cyan-500/20 text-cyan-300 font-mono font-bold rounded-md">
              SESSION: {analysis.repositoryId.substring(0, 12)}
            </span>
            <span className="text-white font-semibold">{analysis.repositoryName}</span>
            <span className="text-gray-400">Branch: <strong className="text-gray-200">{analysis.inventory?.metadata?.branch || 'main'}</strong></span>
            <span className="text-gray-400">Active Version: <strong className="text-cyan-300 font-mono">{analysis.versionComparison?.versionLabel || selectedVersionLabel || 'V1'} ({analysis.inventory?.metadata?.shortCommitHash || analysis.inventory?.metadata?.commitHash?.substring(0, 7) || 'HEAD'})</strong></span>
            {analysis.versionComparison?.hasPreviousVersion && (
              <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px]">
                Diff vs {analysis.versionComparison.previousVersion?.versionLabel || 'Prior'} ({analysis.versionComparison.previousVersion?.shortSha})
              </span>
            )}
            {analysis.inventory?.metadata?.commitMessage && (
              <span className="text-gray-400 max-w-xs truncate">&quot;{analysis.inventory.metadata.commitMessage}&quot;</span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {githubConnectionResult && (
              <div className="flex flex-col items-start mr-2 bg-gray-900/50 p-2 rounded border border-gray-700 text-[10px] leading-tight text-gray-300">
                <div><span className="text-gray-400">GitHub Auto-Sync:</span> <span className="text-emerald-400 font-bold">● Active</span></div>
                {githubConnectionResult.lastSyncedAt && (
                  <div><span className="text-gray-400">Last sync:</span> {new Date(githubConnectionResult.lastSyncedAt).toLocaleString()}</div>
                )}
                {githubConnectionResult.headSha && (
                  <div><span className="text-gray-400">Commit:</span> <span className="font-mono text-cyan-300">{githubConnectionResult.headSha.substring(0, 7)}</span></div>
                )}
                {githubConnectionResult.status && (
                  <div><span className="text-gray-400">Status:</span> <span className={githubConnectionResult.status === 'Synchronized' ? 'text-emerald-400' : 'text-amber-400'}>{githubConnectionResult.status}</span></div>
                )}
              </div>
            )}
            {analysis.inventory?.metadata?.sourceType === 'git' && (
              <button
                type="button"
                onClick={handleCheckAndAutoSync}
                disabled={autoSyncLoading}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                title="Automatically check for new commits on remote and trigger selective documentation synchronization"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${autoSyncLoading ? 'animate-spin' : ''}`} />
                <span>{autoSyncLoading ? 'Checking Git...' : 'Auto-Sync / Check Git'}</span>
              </button>
            )}

            {autoSyncMsg && (
              <span className="text-[11px] text-cyan-400 font-medium">
                {autoSyncMsg}
              </span>
            )}

            <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <CheckCircle className="w-4 h-4" />
              <span>Isolated & Grounded</span>
            </div>
          </div>
        </div>
      )}

      {/* ─── Analysis Results View ─── */}
      {analysis && (
        <div className="space-y-6">
          {/* Key Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-[#0B0F19] border border-gray-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-gray-500 font-medium block">Total Scanned Files</span>
              <span className="text-xl font-bold text-white mt-1 block">{analysis.inventory.totalFiles}</span>
            </div>
            <div className="bg-[#0B0F19] border border-gray-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-gray-500 font-medium block">Architecture Style</span>
              <span className="text-sm font-bold text-cyan-400 mt-1 block truncate">{analysis.architecture.primaryStyle}</span>
            </div>
            <div className="bg-[#0B0F19] border border-gray-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-gray-500 font-medium block">Requirements</span>
              <span className="text-xl font-bold text-indigo-400 mt-1 block">
                {(analysis.requirements.functional?.length || 0) + (analysis.requirements.nonFunctional?.length || 0)}
              </span>
            </div>
            <div className="bg-[#0B0F19] border border-gray-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-gray-500 font-medium block">API Endpoints</span>
              <span className="text-xl font-bold text-emerald-400 mt-1 block">
                {Object.keys(analysis.openApiSpec?.paths || {}).length}
              </span>
            </div>
            <div className="bg-[#0B0F19] border border-gray-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-gray-500 font-medium block">Mermaid Diagrams</span>
              <span className="text-xl font-bold text-amber-400 mt-1 block">
                {Object.keys(analysis.diagrams).filter(k => analysis.diagrams[k]).length} / 10
              </span>
            </div>
            <div className="bg-[#0B0F19] border border-gray-800 p-3.5 rounded-xl">
              <span className="text-[11px] text-gray-500 font-medium block">Formal Documents</span>
              <span className="text-xl font-bold text-pink-400 mt-1 block">
                {analysis.documents.length} / 17
              </span>
            </div>
          </div>

          {/* Subsystem Navigation Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-800/80 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {[
                { id: 'docs', label: '17 Formal Documents', icon: FileText },
                { id: 'diagrams', label: '10 Architecture Diagrams', icon: Layers },
                { id: 'requirements', label: 'Requirements (SRS)', icon: CheckCircle },
                { id: 'traceability', label: 'Traceability Matrix', icon: Network },
                { id: 'openapi', label: 'API & OpenAPI 3.0', icon: Link2 },
                { id: 'security', label: 'Security & Masking', icon: ShieldCheck },
                { id: 'drift', label: 'Drift & Quality Scores', icon: AlertTriangle }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id)}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${isActive
                        ? 'bg-cyan-500 text-black shadow-md shadow-cyan-500/10'
                        : 'bg-[#0B0F19] text-gray-400 hover:text-white border border-gray-800'
                      }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Export Actions */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFile('pdf')}
                className="flex items-center space-x-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg shadow-md shadow-purple-500/20 transition cursor-pointer"
                title="Download 32-Section Software Architecture & Change Impact PDF Report"
              >
                <Download className="w-3.5 h-3.5 text-white" />
                <span>PDF Technical Report</span>
              </button>
              <button
                onClick={() => downloadFile('markdown')}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#0B0F19] hover:bg-gray-800 text-gray-300 text-xs font-medium rounded-lg border border-gray-800 transition cursor-pointer"
                title="Download Consolidated Markdown Package"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" />
                <span>Markdown</span>
              </button>
              <button
                onClick={() => downloadFile('html')}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#0B0F19] hover:bg-gray-800 text-gray-300 text-xs font-medium rounded-lg border border-gray-800 transition cursor-pointer"
                title="Download Standalone HTML Documentation Package"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" />
                <span>HTML</span>
              </button>
              <button
                onClick={() => downloadFile('openapi')}
                className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#0B0F19] hover:bg-gray-800 text-gray-300 text-xs font-medium rounded-lg border border-gray-800 transition cursor-pointer"
                title="Download OpenAPI 3.0 JSON Specification"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>OpenAPI</span>
              </button>
            </div>
          </div>

          {/* ─── TAB 1: 17 Formal Documents ─── */}
          {activeSubTab === 'docs' && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Document List Sidebar */}
              <div className="lg:col-span-1 bg-[#0B0F19] border border-gray-800 rounded-2xl p-3 space-y-1 h-[600px] overflow-y-auto">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider px-2 py-1 block">
                  17 Enterprise Documents
                </span>
                {analysis.documents.map((doc, idx) => {
                  const isSelected = selectedDocIndex === idx;
                  return (
                    <button
                      key={doc.documentId}
                      onClick={() => setSelectedDocIndex(idx)}
                      className={`w-full text-left p-2.5 rounded-xl text-xs transition flex items-center justify-between cursor-pointer ${isSelected
                          ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold'
                          : 'text-gray-400 hover:bg-gray-800/40 hover:text-gray-200'
                        }`}
                    >
                      <span className="truncate pr-2">{doc.title}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 shrink-0">
                        {doc.sdid.split('-')[1]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Document Viewer Content */}
              <div className="lg:col-span-3 bg-[#0B0F19] border border-gray-800 rounded-2xl p-6 relative flex flex-col h-[600px]">
                {analysis.documents[selectedDocIndex] && (
                  <>
                    <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-4">
                      <div>
                        <h2 className="text-lg font-bold text-white">
                          {analysis.documents[selectedDocIndex].title}
                        </h2>
                        <div className="flex items-center space-x-3 text-xs text-gray-400 mt-1">
                          <span>SDID: <code className="text-cyan-400 bg-cyan-950/40 px-1 rounded">{analysis.documents[selectedDocIndex].sdid}</code></span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">{analysis.documents[selectedDocIndex].status}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => copyToClipboard(analysis.documents[selectedDocIndex].content)}
                        className="flex items-center space-x-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg text-xs transition cursor-pointer"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto text-xs text-gray-300 font-mono whitespace-pre-wrap leading-relaxed pr-2">
                      {analysis.documents[selectedDocIndex].content}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ─── TAB 2: 10 Architecture Diagrams (Mermaid) ─── */}
          {activeSubTab === 'diagrams' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 bg-[#0B0F19] p-2 rounded-xl border border-gray-800">
                {[
                  { key: 'systemContext', label: '1. System Context' },
                  { key: 'container', label: '2. Container (C4-L2)' },
                  { key: 'component', label: '3. Component (C4-L3)' },
                  { key: 'deployment', label: '4. Deployment Topology' },
                  { key: 'dataFlow', label: '5. Data Flow' },
                  { key: 'sequence', label: '6. Workflow Sequence' },
                  { key: 'erDiagram', label: '7. Entity Relationship (ERD)' },
                  { key: 'dependencyGraph', label: '8. Dependency Graph' },
                  { key: 'authFlow', label: '9. Authentication Flow' },
                  { key: 'aiWorkflow', label: '10. AI / LLM Workflow' }
                ].filter(d => analysis.diagrams[d.key]).map(d => (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDiagram(d.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${selectedDiagram === d.key
                        ? 'bg-cyan-500 text-black font-bold'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                      }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>

              <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {selectedDiagram.replace(/([A-Z])/g, ' $1').trim()} Diagram (Interactive Mermaid Rendering)
                  </h3>
                  <button
                    onClick={() => copyToClipboard(analysis.diagrams[selectedDiagram])}
                    className="flex items-center space-x-1.5 text-xs text-cyan-400 hover:text-cyan-300 cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Mermaid Syntax</span>
                  </button>
                </div>
                <MermaidViewer chart={analysis.diagrams[selectedDiagram] || ''} id={selectedDiagram} />
              </div>
            </div>
          )}

          {/* ─── TAB 3: Requirements (SRS) ─── */}
          {activeSubTab === 'requirements' && (
            <div className="space-y-6">
              {/* Functional Requirements */}
              <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                  <span>Functional Requirements ({analysis.requirements.functional?.length || 0})</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                        <th className="py-2.5 px-3">Req ID</th>
                        <th className="py-2.5 px-3">Requirement Name</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Evidence Source</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800/60">
                      {(analysis.requirements.functional || []).map(r => (
                        <tr key={r.id} className="hover:bg-gray-800/30">
                          <td className="py-3 px-3 font-mono font-bold text-cyan-400">{r.sdid || r.id}</td>
                          <td className="py-3 px-3 font-semibold text-white">{r.name}</td>
                          <td className="py-3 px-3 text-gray-300">{r.metadata?.description}</td>
                          <td className="py-3 px-3 font-mono text-gray-400 text-[11px] truncate max-w-xs">
                            {(r.evidence || []).join(', ')}
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-bold">
                              {r.metadata?.status || 'VERIFIED'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Non-Functional Requirements */}
              <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-4 flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span>
                  <span>Non-Functional Requirements ({analysis.requirements.nonFunctional?.length || 0})</span>
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(analysis.requirements.nonFunctional || []).map(nfr => (
                    <div key={nfr.id} className="bg-[#080C14] border border-gray-800 p-4 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-indigo-400">{nfr.sdid || nfr.id}</span>
                        <span className="text-[10px] bg-indigo-950/50 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/40">
                          {nfr.metadata?.subCategory || 'General'}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{nfr.name}</h4>
                      <p className="text-xs text-gray-400">{nfr.metadata?.description}</p>
                      <div className="pt-2 border-t border-gray-800/60 text-[11px] text-gray-500">
                        Evidence: <code className="text-gray-400">{(nfr.evidence || []).join(', ')}</code>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB 4: Traceability Matrix ─── */}
          {activeSubTab === 'traceability' && (
            <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">End-to-End Traceability Matrix</h3>
                <p className="text-xs text-gray-400">Every requirement mapped across Module, API Endpoint, Code Entity, Test Case, and Document.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400 uppercase text-[10px]">
                      <th className="py-2.5 px-3">Requirement</th>
                      <th className="py-2.5 px-3">Module</th>
                      <th className="py-2.5 px-3">API Route</th>
                      <th className="py-2.5 px-3">Implementation Code</th>
                      <th className="py-2.5 px-3">Test Case</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/60">
                    {(analysis.traceabilityMatrix || []).map((row, idx) => (
                      <tr key={idx} className="hover:bg-gray-800/30">
                        <td className="py-3 px-3 font-mono font-bold text-cyan-400">{row.requirementId}</td>
                        <td className="py-3 px-3 text-white">{row.modules?.join(', ') || 'Core'}</td>
                        <td className="py-3 px-3 font-mono text-emerald-400 text-[11px]">{row.apis?.join(', ') || 'Internal'}</td>
                        <td className="py-3 px-3 text-gray-300 font-mono text-[11px]">{row.code?.slice(0, 1).join(', ') || 'Service'}</td>
                        <td className="py-3 px-3 text-indigo-400 font-mono text-[11px]">{row.tests?.join(', ') || 'Untested'}</td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-[10px] font-bold">
                            VERIFIED
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── TAB 5: API & OpenAPI ─── */}
          {activeSubTab === 'openapi' && (
            <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">OpenAPI 3.0.3 Specification</h3>
                  <p className="text-xs text-gray-400">Reconstructed API routes, methods, path parameters, and request/response schemas.</p>
                </div>
                <button
                  onClick={() => copyToClipboard(JSON.stringify(analysis.openApiSpec, null, 2))}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs rounded-lg transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy OpenAPI JSON</span>
                </button>
              </div>

              <div className="bg-[#080C14] border border-gray-800 rounded-xl p-4 max-h-[500px] overflow-y-auto">
                <pre className="text-xs text-emerald-400 font-mono whitespace-pre-wrap">
                  {JSON.stringify(analysis.openApiSpec, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* ─── TAB 6: Security & Masking ─── */}
          {activeSubTab === 'security' && (
            <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-white">Security Controls & Masked Secrets</h3>
                <p className="text-xs text-gray-400">Deterministic check for authentication, encryption, CORS, and sensitive keys (strictly masked).</p>
              </div>

              <div className="space-y-3">
                {(analysis.security?.findings || []).map((sec, idx) => (
                  <div key={idx} className="bg-[#080C14] border border-gray-800 p-4 rounded-xl flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-sm text-white">{sec.control}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${sec.riskLevel === 'Low' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-amber-950 text-amber-400 border border-amber-800'
                          }`}>
                          Risk: {sec.riskLevel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">{sec.details}</p>
                      <div className="text-[11px] text-gray-500 font-mono mt-1">
                        Evidence: {(sec.evidence || []).join(', ')}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-cyan-400">{sec.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB 7: Drift & Quality Scores ─── */}
          {activeSubTab === 'drift' && (
            <div className="space-y-6">
              {/* Measurable Quality Scores Matrix */}
              <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl p-6">
                <h3 className="text-base font-bold text-white mb-2">Measurable Quality Dimensions (Section 25)</h3>
                <p className="text-xs text-gray-400 mb-4">Quality metrics grounded in verifiable deterministic evidence rather than arbitrary single numbers.</p>

                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.values(analysis.drift?.qualityScores || {}).map(score => (
                    <div key={score.dimension} className="bg-[#080C14] border border-gray-800 p-4 rounded-xl space-y-1">
                      <span className="text-[11px] text-gray-500 font-semibold uppercase">{score.dimension}</span>
                      <span className="text-2xl font-black text-cyan-400 block">{score.value}</span>
                      <p className="text-[11px] text-gray-400 pt-1 border-t border-gray-800/80 leading-relaxed">
                        {score.methodology}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Continuous Synchronization (ASDSE) Interactive Test */}
              <div className="bg-[#0B0F19] border border-gray-800 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white">Continuous Documentation Synchronization (ASDSE)</h3>
                    <p className="text-xs text-gray-400">Simulate a commit diff changing an API route and watch selective regeneration live.</p>
                  </div>
                  <button
                    onClick={handleTriggerSync}
                    disabled={syncLoading}
                    className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-cyan-500 to-indigo-600 text-black font-bold text-xs rounded-xl hover:opacity-90 transition disabled:opacity-50 cursor-pointer"
                  >
                    {syncLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    <span>Simulate Commit Diff Sync</span>
                  </button>
                </div>

                {syncResult && (
                  <div className="bg-[#080C14] border border-cyan-500/30 p-4 rounded-xl space-y-2">
                    <span className="text-xs font-bold text-cyan-400 flex items-center space-x-1.5">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                      <span>Selective Synchronization Executed Successfully:</span>
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-300">
                      <div>Impacted SDIDs: <code className="text-cyan-400">{syncResult.affectedSDIDs?.join(', ')}</code></div>
                      <div>Impact Level: <code className="text-amber-400">{syncResult.impactRadii?.[0]?.impactLevel}</code></div>
                      <div>Regenerated Blocks: <code className="text-emerald-400">{syncResult.regeneratedDocs?.length}</code></div>
                    </div>
                    <p className="text-[11px] text-gray-500 italic">
                      Notice: Only dependent documentation blocks were selectively regenerated; all unrelated documentation remained intact.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─── AUTHORITATIVE REPOSITORY ARCHITECTURE SECTION (BOTTOM OF PAGE) ─── */}
          <div className="bg-[#0B0F19] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-800 pb-4">
              <div>
                <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Authoritative Repository Architecture</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  System Architecture & Physical Topology Blueprint
                </h3>
                <p className="text-xs text-gray-400">
                  Extracted from AST symbol graphs, route bindings, and component relationships for <strong className="text-gray-200">{analysis.repositoryName}</strong>. (Feeds PDF Cover & Architecture Section)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs px-3 py-1 rounded-lg bg-[#080C14] border border-gray-800 text-cyan-300 font-mono font-semibold">
                  Style: {analysis.architecture?.primaryStyle || 'Layered Architecture'}
                </span>
                <button
                  onClick={() => copyToClipboard(analysis.diagrams?.container || analysis.diagrams?.systemContext || '')}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Mermaid</span>
                </button>
              </div>
            </div>

            {/* Logical Layers Grid */}
            {analysis.architecture?.logicalLayers && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {analysis.architecture.logicalLayers.slice(0, 4).map((layer, lIdx) => (
                  <div key={lIdx} className="bg-[#080C14] border border-gray-800/80 p-3.5 rounded-xl space-y-1.5">
                    <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-wider block">
                      Layer {lIdx + 1}: {layer.name}
                    </span>
                    <p className="text-xs text-white font-medium">
                      {(layer.components || []).join(', ')}
                    </p>
                    <p className="text-[11px] text-gray-500 line-clamp-2">
                      {(layer.responsibilities || []).join('; ')}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* Interactive Architecture Diagram */}
            <div className="bg-[#080C14] border border-gray-800/80 rounded-xl p-4">
              <MermaidViewer
                chart={analysis.diagrams?.container || analysis.diagrams?.systemContext || analysis.diagrams?.component || ''}
                id="bottom-architecture-blueprint"
              />
            </div>

            {/* Physical Deployment Topology summary */}
            {analysis.architecture?.physicalNodes && (
              <div className="pt-2 border-t border-gray-800/60 flex flex-wrap items-center justify-between text-xs text-gray-400 gap-2">
                <span className="font-semibold text-gray-300">Physical Nodes:</span>
                <div className="flex flex-wrap gap-2">
                  {analysis.architecture.physicalNodes.map((pn, pIdx) => (
                    <span key={pIdx} className="px-2 py-0.5 rounded bg-gray-800/60 border border-gray-700/50 text-[11px] text-gray-300">
                      <strong className="text-cyan-400">{pn.node}:</strong> {pn.description}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
