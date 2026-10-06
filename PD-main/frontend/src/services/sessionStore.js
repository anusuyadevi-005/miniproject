// In-memory and session-backed store for RepoMind / ASDSE
// Persists across tab navigation within the single-page application.

const SESSION_STORAGE_KEY = 'repomind_active_session_v1';

function loadInitialSession() {
  const initial = {
    repoUrl: '',
    branch: '',
    availableBranches: [],
    recentCommits: [],
    chronologicalVersions: [],
    selectedCommit: '',
    selectedVersionLabel: '',
    analysis: null,
    versionAnalysisCache: {}, // { [commitSha]: analysis }
    ingestMode: 'git',
    folderPath: '',
    activeSubTab: 'docs',
    selectedDiagram: 'systemContext',
    selectedDocIndex: 0
  };

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...initial, ...parsed };
      }
    }
  } catch (err) {
    console.warn('[SessionStore] Could not read from sessionStorage:', err);
  }

  return initial;
}

export const memorySession = loadInitialSession();

function syncToSessionStorage() {
  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      // Save metadata and lightweight analysis state
      const toPersist = {
        repoUrl: memorySession.repoUrl,
        branch: memorySession.branch,
        availableBranches: memorySession.availableBranches,
        recentCommits: memorySession.recentCommits,
        chronologicalVersions: memorySession.chronologicalVersions,
        selectedCommit: memorySession.selectedCommit,
        selectedVersionLabel: memorySession.selectedVersionLabel,
        analysis: memorySession.analysis,
        versionAnalysisCache: memorySession.versionAnalysisCache,
        ingestMode: memorySession.ingestMode,
        folderPath: memorySession.folderPath,
        activeSubTab: memorySession.activeSubTab,
        selectedDiagram: memorySession.selectedDiagram,
        selectedDocIndex: memorySession.selectedDocIndex
      };
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(toPersist));
    }
  } catch (err) {
    console.warn('[SessionStore] Could not persist to sessionStorage:', err);
  }
}

export function setMemorySession(data = {}) {
  Object.assign(memorySession, data);
  syncToSessionStorage();
}

export function getMemorySession() {
  return memorySession;
}

export function cacheVersionAnalysis(commitSha, analysis) {
  if (!commitSha || !analysis) return;
  if (!memorySession.versionAnalysisCache) {
    memorySession.versionAnalysisCache = {};
  }
  memorySession.versionAnalysisCache[commitSha] = analysis;
  syncToSessionStorage();
}

export function getCachedVersionAnalysis(commitSha) {
  if (!commitSha || !memorySession.versionAnalysisCache) return null;
  return memorySession.versionAnalysisCache[commitSha] || null;
}

export function clearMemorySession() {
  memorySession.repoUrl = '';
  memorySession.branch = '';
  memorySession.availableBranches = [];
  memorySession.recentCommits = [];
  memorySession.chronologicalVersions = [];
  memorySession.selectedCommit = '';
  memorySession.selectedVersionLabel = '';
  memorySession.analysis = null;
  memorySession.versionAnalysisCache = {};
  memorySession.ingestMode = 'git';
  memorySession.folderPath = '';
  memorySession.activeSubTab = 'docs';
  memorySession.selectedDiagram = 'systemContext';
  memorySession.selectedDocIndex = 0;

  try {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch (_) { }
}

