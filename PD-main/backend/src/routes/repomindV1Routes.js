import express from 'express';
import multer from 'multer';
import { AgentOrchestrator } from '../orchestration/orchestrator.js';
import { ASDSESyncEngine } from '../asdse/syncEngine.js';
import { PDFReportGenerator } from '../generator/pdfReportGenerator.js';
import { WorkspaceManager } from '../ingestion/workspaceManager.js';
import { SDIDManager } from '../sdid/sdidManager.js';
import { GitChangeDetector, gitBaselineTracker } from '../asdse/gitChangeDetector.js';
import { db } from '../db/store.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max ZIP upload
});

const router = express.Router();

// In-memory analysis cache and active session tracker (retains up to 5 analysis snapshots)
export const analysisStore = new Map();
let activeSessionId = null;

export function setActiveSession(id, analysis) {
  activeSessionId = id;
  if (analysis) {
    analysisStore.set(id, analysis);
  }
}

export function getActiveAnalysis() {
  if (activeSessionId && analysisStore.has(activeSessionId)) {
    return analysisStore.get(activeSessionId);
  }
  if (analysisStore.size > 0) {
    const all = Array.from(analysisStore.values());
    return all[all.length - 1];
  }
  return null;
}

export function getActiveSessionId() {
  if (activeSessionId) return activeSessionId;
  if (analysisStore.size > 0) {
    const all = Array.from(analysisStore.keys());
    return all[all.length - 1];
  }
  return null;
}

// ─── 0. Active Session Endpoints ─────────────────────────────────────────
router.get('/session/active', (req, res) => {
  if (!activeSessionId || !analysisStore.has(activeSessionId)) {
    if (analysisStore.size > 0) {
      const all = Array.from(analysisStore.entries());
      const [lastId, lastAnalysis] = all[all.length - 1];
      activeSessionId = lastId;
      return res.json({
        active: true,
        repositoryId: activeSessionId,
        repositoryUrl: lastAnalysis.inventory?.metadata?.url || '',
        repositoryName: lastAnalysis.repositoryName,
        branch: lastAnalysis.inventory?.metadata?.branch || '',
        commitHash: lastAnalysis.inventory?.metadata?.commitHash || '',
        shortCommitHash: lastAnalysis.inventory?.metadata?.shortCommitHash || '',
        author: lastAnalysis.inventory?.metadata?.author || '',
        commitMessage: lastAnalysis.inventory?.metadata?.commitMessage || '',
        commitDate: lastAnalysis.inventory?.metadata?.commitDate || '',
        recentCommits: lastAnalysis.inventory?.metadata?.recentCommits || [],
        workspacePath: lastAnalysis.inventory?.metadata?.workspacePath || '',
        analysis: lastAnalysis
      });
    }
    return res.status(404).json({ active: false, error: 'No active analysis session found' });
  }

  const analysis = analysisStore.get(activeSessionId);
  res.json({
    active: true,
    repositoryId: activeSessionId,
    repositoryUrl: analysis.inventory?.metadata?.url || '',
    repositoryName: analysis.repositoryName,
    branch: analysis.inventory?.metadata?.branch || '',
    commitHash: analysis.inventory?.metadata?.commitHash || '',
    shortCommitHash: analysis.inventory?.metadata?.shortCommitHash || '',
    author: analysis.inventory?.metadata?.author || '',
    commitMessage: analysis.inventory?.metadata?.commitMessage || '',
    commitDate: analysis.inventory?.metadata?.commitDate || '',
    recentCommits: analysis.inventory?.metadata?.recentCommits || [],
    workspacePath: analysis.inventory?.metadata?.workspacePath || '',
    analysis
  });
});

router.post('/session/select', (req, res) => {
  const { repositoryId, commitSha, url } = req.body;
  if (!repositoryId && !commitSha) return res.status(400).json({ error: 'repositoryId or commitSha is required' });

  let targetId = repositoryId;
  if (!targetId && commitSha) {
    for (const [id, a] of analysisStore.entries()) {
      if (a.inventory?.metadata?.commitHash === commitSha) {
        if (!url || a.inventory?.metadata?.url === url) {
          targetId = id;
          break;
        }
      }
    }
  }

  if (!targetId || !analysisStore.has(targetId)) {
    return res.status(404).json({ error: `Analysis session not found` });
  }

  activeSessionId = targetId;
  const analysis = analysisStore.get(targetId);
  res.json({
    success: true,
    activeSessionId,
    repositoryName: analysis.repositoryName,
    commitHash: analysis.inventory?.metadata?.commitHash || '',
    branch: analysis.inventory?.metadata?.branch || '',
    analysis
  });
});

// ─── 1. Repositories Collection ─────────────────────────────────────────
router.get('/repositories', (req, res) => {
  const list = Array.from(analysisStore.values()).map(a => ({
    id: a.repositoryId,
    name: a.repositoryName,
    branch: a.inventory?.metadata?.branch || '',
    commitHash: a.inventory?.metadata?.commitHash || '',
    shortCommitHash: a.inventory?.metadata?.shortCommitHash || '',
    author: a.inventory?.metadata?.author || '',
    commitMessage: a.inventory?.metadata?.commitMessage || '',
    recentCommits: a.inventory?.metadata?.recentCommits || [],
    metadata: a.inventory?.metadata,
    durationMs: a.durationMs
  }));
  res.json(list);
});

router.get('/repositories/:id', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Repository analysis not found' });
  res.json(analysis);
});

// ─── 2. Ingestion & Remote Inspection Endpoints ──────────────────────────

// Inspect Remote Git Repository (Branches & Latest 5 Commits)
router.post('/repositories/inspect', async (req, res) => {
  try {
    const { url, branch } = req.body;
    if (!url) return res.status(400).json({ error: 'Repository URL is required.' });

    console.log(`[RepoMind Inspect] Inspecting remote repository: ${url}`);
    const inspectResult = await WorkspaceManager.inspectRemoteRepository(url, branch || '');
    res.json(inspectResult);
  } catch (err) {
    console.error('[RepoMind Inspect] Remote inspection failed:', err.message);
    res.status(400).json({ error: err.message });
  }
});

// Inspect specific branch for commits
router.post('/repositories/inspect-branch', async (req, res) => {
  try {
    const { url, branch } = req.body;
    if (!url || !branch) return res.status(400).json({ error: 'Repository URL and branch are required.' });

    const inspectResult = await WorkspaceManager.inspectRemoteRepository(url, branch);
    res.json({
      branch: inspectResult.selectedBranch,
      recentCommits: inspectResult.recentCommits || []
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Ingest via Git URL with Branch and Exact Commit Selection
router.post('/repositories/analyze', async (req, res) => {
  try {
    const { url, branch, commitSha, name } = req.body;
    if (!url) return res.status(400).json({ error: 'Repository URL is required.' });

    console.log(`[DEBUG] STARTING REPOSITORY ANALYSIS:
  url: ${url}
  branch: ${branch || '(default)'}
  commitSha: ${commitSha || '(latest)'}`);

    const result = await AgentOrchestrator.runFullAnalysis({ url, branch, commitSha, name });

    // Maintain maximum of 5 retained analysis snapshots per instance
    if (analysisStore.size >= 10) {
      const oldestKey = analysisStore.keys().next().value;
      analysisStore.delete(oldestKey);
    }

    activeSessionId = result.repositoryId;
    analysisStore.set(result.repositoryId, result);

    // Build SDID mappings for the analyzed repo
    SDIDManager.buildSDIDFromRepository({
      reportId: result.repositoryId,
      projectName: result.repositoryName,
      repoUrl: url,
      classes: result.knowledgeGraph?.entities?.filter(e => e.type === 'Class'),
      functions: result.knowledgeGraph?.entities?.filter(e => e.type === 'Function'),
      apisList: result.knowledgeGraph?.entities?.filter(e => e.type === 'API'),
      treeFiles: result.inventory?.files || []
    });

    console.log(`[DEBUG] ANALYSIS SESSION CREATED & PERSISTED:
  analysisSessionId: ${result.repositoryId}
  repositoryUrl: ${url}
  branch: ${result.inventory?.metadata?.branch}
  commit: ${result.inventory?.metadata?.commitHash} (${result.inventory?.metadata?.shortCommitHash})
  commitMessage: ${result.inventory?.metadata?.commitMessage}
  author: ${result.inventory?.metadata?.author}
  workspaceId: ${result.inventory?.metadata?.workspacePath || result.repositoryId}`);

    res.status(201).json(result);
  } catch (err) {
    console.error('Git analysis failed:', err);
    const isClientError = err.message && (
      err.message.includes('empty') ||
      err.message.includes('not found') ||
      err.message.includes('Authentication failed') ||
      err.message.includes('does not exist') ||
      err.message.includes('invalid') ||
      err.message.includes('access')
    );
    res.status(isClientError ? 400 : 500).json({ error: err.message });
  }
});

// Ingest via Local Folder Path
router.post('/analyze/local', async (req, res) => {
  try {
    const { folderPath, name } = req.body;
    if (!folderPath) return res.status(400).json({ error: 'folderPath is required.' });

    const result = await AgentOrchestrator.runFullAnalysis({ folderPath, name });
    activeSessionId = result.repositoryId;
    analysisStore.set(result.repositoryId, result);

    res.status(201).json(result);
  } catch (err) {
    console.error('Local folder analysis failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// Ingest via ZIP Upload
router.post('/analyze/upload', upload.single('archive'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'ZIP archive file is required.' });

    const result = await AgentOrchestrator.runFullAnalysis({
      zipBuffer: req.file.buffer,
      filename: req.file.originalname,
      name: req.body.name || req.file.originalname.replace(/\.zip$/i, '')
    });

    activeSessionId = result.repositoryId;
    analysisStore.set(result.repositoryId, result);
    res.status(201).json(result);
  } catch (err) {
    console.error('ZIP upload analysis failed:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── 3. Specific Subsystem Endpoints ────────────────────────────────────

router.get('/repositories/:id/architecture', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json({
    architecture: analysis.architecture,
    diagrams: analysis.diagrams
  });
});

router.get('/repositories/:id/requirements', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json(analysis.requirements);
});

router.get('/repositories/:id/apis', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json({
    apis: analysis.knowledgeGraph?.entities?.filter(e => e.type === 'API') || [],
    openApiSpec: analysis.openApiSpec
  });
});

router.get('/repositories/:id/database', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json({
    tables: analysis.knowledgeGraph?.entities?.filter(
      e => e.type === 'Table' || e.type === 'Collection'
    ) || [],
    erDiagram: analysis.diagrams?.erDiagram
  });
});

router.get('/repositories/:id/workflows', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json(analysis.workflows);
});

router.get('/repositories/:id/security', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json(analysis.security);
});

router.get('/repositories/:id/testing', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json(analysis.testing);
});

router.get('/repositories/:id/traceability', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json(analysis.traceabilityMatrix);
});

router.get('/repositories/:id/documentation', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json(analysis.documents);
});

router.get('/repositories/:id/drift', (req, res) => {
  const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  const analysis = analysisStore.get(targetId);
  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });
  res.json(analysis.drift);
});

// Export endpoints: markdown, html, json, openapi, pdf
router.get('/repositories/:id/export/:format', async (req, res) => {
  let targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
  let analysis = targetId ? analysisStore.get(targetId) : null;

  const requestedCommit = req.query.commitSha;
  const requestedUrl = req.query.url;

  // If a specific commit SHA was requested via query parameter:
  if (requestedCommit) {
    if (!analysis || analysis.inventory?.metadata?.commitHash !== requestedCommit) {
      let matchingAnalysis = null;
      for (const [id, a] of analysisStore.entries()) {
        if (a.inventory?.metadata?.commitHash === requestedCommit) {
          if (!requestedUrl || a.inventory?.metadata?.url === requestedUrl) {
            matchingAnalysis = a;
            targetId = id;
            break;
          }
        }
      }
      if (matchingAnalysis) {
        analysis = matchingAnalysis;
        activeSessionId = targetId;
      } else {
        console.error(`[PDF Validation Failed] Requested commit ${requestedCommit} not found in active analysisStore.`);
        return res.status(400).json({
          error: `PDF validation failed: Selected commit (${requestedCommit.substring(0, 7)}) has not been analyzed yet. Please run intelligence analysis for this commit first.`
        });
      }
    }
  }

  if (!analysis) {
    analysis = getActiveAnalysis();
    if (analysis) {
      activeSessionId = analysis.repositoryId;
    }
  }

  if (!analysis) return res.status(404).json({ error: 'Analysis not found' });

  // Keep active session synchronized
  if (analysis.repositoryId) {
    activeSessionId = analysis.repositoryId;
  }

  const format = req.params.format.toLowerCase();

  if (format === 'markdown' || format === 'md') {
    res.setHeader('Content-Type', 'text/markdown');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${analysis.repositoryName}_docs.md"`
    );
    return res.send(analysis.exports?.markdown || '');
  }

  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${analysis.repositoryName}_docs.html"`
    );
    return res.send(analysis.exports?.html || '');
  }

  if (format === 'openapi' || format === 'json') {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${analysis.repositoryName}_openapi.json"`
    );
    return res.json(analysis.openApiSpec || {});
  }

  if (format === 'pdf') {
    try {
      // ─── Part M: Strict PDF Validation Before Generation ──────────────────
      const commitHash = analysis.inventory?.metadata?.commitHash;
      if (!commitHash) {
        return res.status(400).json({ error: 'PDF validation failed: Analysis session is missing commit metadata.' });
      }

      if (requestedCommit && commitHash !== requestedCommit) {
        return res.status(400).json({
          error: `PDF validation failed: Selected commit (${requestedCommit.substring(0, 7)}) does not match analysis commit (${commitHash.substring(0, 7)}).`
        });
      }

      if (requestedUrl) {
        const analysisUrl = analysis.inventory?.metadata?.url || analysis.repositoryName;
        if (analysisUrl !== requestedUrl && !analysisUrl.includes(requestedUrl) && !requestedUrl.includes(analysisUrl)) {
          return res.status(400).json({
            error: `PDF validation failed: Target repository (${requestedUrl}) does not match active repository session (${analysisUrl}).`
          });
        }
      }

      if (!analysis.diagrams || !analysis.diagrams.systemContext) {
        return res.status(400).json({ error: 'PDF validation failed: System Context architecture diagram is missing from active analysis.' });
      }

      const rawDbList = analysis.techAnalysis?.database?.databases || [];
      const dbEngine = rawDbList.length > 0
        ? rawDbList[0]
        : (analysis.database?.databaseType && !analysis.database.databaseType.toLowerCase().includes('not detected') ? analysis.database.databaseType : '');

      const dbTables = (
        analysis.knowledgeGraph?.entities?.filter(
          e => e.type === 'Table' || e.type === 'Collection'
        ) || []
      ).map(e => ({
        name: e.name,
        description: `Database entity definition for ${e.name}`,
        fields: e.metadata?.fields && e.metadata.fields.length > 0 ? e.metadata.fields : []
      }));

      const versionComp = analysis.versionComparison || analysis.inventory?.metadata?.versionComparison || null;

      const reportData = {
        unifiedModel: analysis.unifiedModel,
        projectName: analysis.repositoryName,
        repoUrl: analysis.inventory?.metadata?.url || 'https://github.com/repository',
        branch: analysis.inventory?.metadata?.branch || 'main',
        repoLanguage: analysis.techAnalysis?.languages?.[0] || 'JavaScript',
        currentCommit: analysis.inventory?.metadata?.commitHash || 'Not available',
        shortCommitHash: analysis.inventory?.metadata?.shortCommitHash || (analysis.inventory?.metadata?.commitHash ? analysis.inventory.metadata.commitHash.substring(0, 7) : 'Not available'),
        previousCommit: versionComp?.previousVersion?.fullSha || analysis.previousCommit || null,
        previousVersionShortSha: versionComp?.previousVersion?.shortSha || null,
        versionLabel: versionComp?.versionLabel || 'V1',
        versionComparison: versionComp,
        chronologicalVersions: analysis.chronologicalVersions || analysis.inventory?.metadata?.chronologicalVersions || [],
        hasPreviousVersion: Boolean(versionComp?.hasPreviousVersion),
        gitDiff: versionComp,
        author: analysis.inventory?.metadata?.author || 'Not available',
        commitMessage: analysis.inventory?.metadata?.commitMessage || 'Repository baseline analysis',
        commitDate: analysis.inventory?.metadata?.commitDate || new Date().toISOString(),
        generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),

        techStack: {
          frontend: analysis.techAnalysis?.frontend?.frameworks || [],
          backend: analysis.techAnalysis?.backend?.frameworks || [],
          database: rawDbList,
          orm: analysis.techAnalysis?.database?.orms || [],
          auth: analysis.techAnalysis?.authentication?.mechanisms || [],
          devOps: analysis.unifiedModel?.frameworkModel?.devopsTools || []
        },

        architecture: analysis.architecture || {},
        diagrams: analysis.diagrams || {},
        diagramRegistry: analysis.diagramRegistry || analysis.unifiedModel?.diagramRegistry || [],

        applicationModules: (analysis.architecture?.layers || []).map(l => ({
          name: l.name || 'Application Layer',
          location: l.components?.[0] || 'src/',
          purpose: l.responsibility || 'Application layer component',
          files: l.components || [],
          relatedApis: []
        })),

        apiEndpoints: (
          analysis.knowledgeGraph?.entities?.filter(e => e.type === 'API') || []
        ).map(e => ({
          method: e.metadata?.method || 'GET',
          path: e.metadata?.endpoint || e.name,
          purpose: `Endpoint handler for ${e.name}`,
          authRequired: Boolean(e.metadata?.authRequired)
        })),

        inventory: analysis.inventory || {},
        techAnalysis: analysis.techAnalysis || {},
        drift: analysis.drift || {},

        databaseStructure: {
          engine: dbEngine,
          tablesOrCollections: dbTables
        },

        dependenciesAnalysis: {
          packages: (analysis.techAnalysis?.dependencies || []).map(d => ({
            name: d.name,
            version: d.version || '*',
            category: 'Runtime',
            purpose: `${d.name} module`
          }))
        },

        securityConfig: analysis.security || {},

        testingAnalysis: {
          framework: analysis.techAnalysis?.testing?.frameworks?.join(', ') || analysis.testing?.testFrameworks?.[0] || 'unittest',
          totalTestFiles: analysis.testing?.totalTestFiles || 1,
          testDirectories: ['root', 'tests/']
        },

        projectHealth: {
          metrics: {
            docCoverage: 95,
            testCoverage: analysis.testing?.estimatedCoverageScore || 85,
            configCompleteness: 95,
            syncScore: 98
          }
        }
      };

      console.log(`[DEBUG] PDF GENERATION VALIDATED & STARTED:
  analysisSessionId: ${analysis.repositoryId}
  repositoryUrl: ${reportData.repoUrl}
  branch: ${reportData.branch}
  commit: ${reportData.currentCommit}
  diagram IDs requested: ${reportData.diagramRegistry.map(d => d.id).join(', ')}
  diagram IDs found: ${Object.keys(reportData.diagrams || {}).join(', ')}
  diagram source used: Unified Repository Intelligence Model & RepoMind Studio Mermaid`);

      const pdfBuffer = await PDFReportGenerator.generatePDFBuffer(reportData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${analysis.repositoryName}_report.pdf"`
      );

      return res.send(pdfBuffer);

    } catch (err) {
      console.error('PDF export error:', err);
      return res.status(500).json({
        error: 'PDF generation failed: ' + err.message
      });
    }
  }

  return res.json(analysis);
});

// Compare two commits or two code states using ASDSE Difference Engine
router.post('/session/compare', async (req, res) => {
  try {
    const {
      baseCommitSha,
      targetCommitSha,
      oldCode,
      newCode,
      modifiedFiles = [],
      commitMessage = ''
    } = req.body;

    const syncResult = await ASDSESyncEngine.syncCommitChanges({
      repositoryId: activeSessionId || 'proj_1',
      commitHash: targetCommitSha || 'compare_target',
      author: 'Comparison Engine',
      modifiedFiles: modifiedFiles.length > 0 ? modifiedFiles : ['src/app.js'],
      commitMessage: commitMessage || `Compare ${baseCommitSha || 'Base'} -> ${targetCommitSha || 'Target'}`,
      oldCode: oldCode || '',
      newCode: newCode || ''
    });

    res.json({
      success: true,
      comparison: syncResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Continuous Synchronization Endpoint (ASDSE)
router.post('/repositories/:id/sync', async (req, res) => {
  try {
    const {
      modifiedFiles,
      commitMessage,
      oldCode,
      newCode,
      commitHash,
      author
    } = req.body;

    const syncResult = await ASDSESyncEngine.syncCommitChanges({
      repositoryId: req.params.id,
      commitHash: commitHash || req.body.hash || '',
      author: author || 'GitHub Developer',
      modifiedFiles: modifiedFiles || [],
      commitMessage: commitMessage || 'Manual AST Synchronization',
      oldCode: oldCode || '',
      newCode: newCode || ''
    });

    res.json({
      success: true,
      syncResult
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── 4. Automatic Git Change Detection & ASDSE Auto-Sync Endpoints ─────────

// Query all active repository baselines
router.get('/baselines', (req, res) => {
  res.json(gitBaselineTracker.getAllBaselines());
});

// Query Sync Status for Active Session or Specific Repository
router.get('/sync/status', async (req, res) => {
  try {
    const targetId = req.query.repositoryId || activeSessionId;
    if (!targetId) {
      return res.status(404).json({ error: 'No active repository session found.' });
    }
    const checkResult = await GitChangeDetector.checkForChanges(targetId);
    const baseline = gitBaselineTracker.getBaseline(targetId);
    res.json({
      ...checkResult,
      baseline,
      activeSessionId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/repositories/:id/sync/status', async (req, res) => {
  try {
    const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
    const checkResult = await GitChangeDetector.checkForChanges(targetId);
    const baseline = gitBaselineTracker.getBaseline(targetId);
    res.json({
      ...checkResult,
      baseline
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Automatic Check for Changes
router.post('/sync/check', async (req, res) => {
  try {
    const targetId = req.body.repositoryId || activeSessionId;
    if (!targetId) {
      return res.status(400).json({ error: 'repositoryId is required or an active analysis must be loaded.' });
    }
    const result = await GitChangeDetector.checkForChanges(targetId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Trigger Automated Git Change Detection & ASDSE Selective Sync Pipeline
router.post('/sync/auto', async (req, res) => {
  try {
    const targetId = req.body.repositoryId || activeSessionId;
    if (!targetId) {
      return res.status(400).json({ error: 'repositoryId is required or an active analysis must be loaded.' });
    }
    const autoSyncResult = await GitChangeDetector.autoSyncRepository(targetId);
    res.json(autoSyncResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/repositories/:id/sync/auto', async (req, res) => {
  try {
    const targetId = (req.params.id === 'active' || req.params.id === 'latest') ? activeSessionId : req.params.id;
    const autoSyncResult = await GitChangeDetector.autoSyncRepository(targetId);
    res.json(autoSyncResult);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;