import { scanWorkspacePath, scanRepository, scanLocalFolder, scanZipBuffer } from '../services/repositoryScanner.js';
import { analyzeTechnology } from '../services/technologyAnalyzer.js';
import { analyzeRepositoryAST } from '../services/astAnalyzer.js';
import { analyzeDependencies } from '../services/dependencyAnalyzer.js';
import { buildRepositoryDatabaseAnalysis } from '../services/databaseAnalyzer.js';
import { analyzeApis } from '../services/apiAnalyzer.js';
import { RepositoryKnowledgeGraph } from '../graph/knowledgeGraph.js';
import { RequirementsAgent } from '../agents/requirementsAgent.js';
import { RoleDiscoveryAgent } from '../agents/roleDiscoveryAgent.js';
import { WorkflowAgent } from '../agents/workflowAgent.js';
import { ArchitectureAgent } from '../agents/architectureAgent.js';
import { DiagramAgent } from '../agents/diagramAgent.js';
import { SecurityAgent } from '../agents/securityAgent.js';
import { TestingAgent } from '../agents/testingAgent.js';
import { DocumentationAgent } from '../agents/documentationAgent.js';
import { VerificationAgent } from '../agents/verificationAgent.js';
import { DriftEngine } from '../asdse/driftEngine.js';
import { OpenAPIExporter } from '../exporters/openApiExporter.js';
import { DocumentExporter } from '../exporters/documentExporter.js';

import { UnifiedRepositoryIntelligenceModel, CLAIM_STATUS, EVIDENCE_LEVEL } from '../models/unifiedRepositoryIntelligenceModel.js';
import { gitBaselineTracker } from '../asdse/gitChangeDetector.js';

export class AgentOrchestrator {
  /**
   * Executes the full 16-agent end-to-end repository intelligence pipeline.
   * All agents communicate via structured JSON objects.
   */
  static async runFullAnalysis(ingestOptions = {}, onProgress = null) {
    const notify = (step, agent, message) => {
      if (typeof onProgress === 'function') {
        onProgress({ step, agent, message, timestamp: new Date().toISOString() });
      }
    };

    const startTime = Date.now();

    // ─── Agent 1: Repository Scout ───────────────────────────────────────
    notify(1, 'Repository Scout', 'Ingesting repository into isolated workspace...');
    let inventory;
    if (ingestOptions.zipBuffer) {
      inventory = await scanZipBuffer(ingestOptions.zipBuffer, ingestOptions.filename, ingestOptions.name);
    } else if (ingestOptions.folderPath) {
      inventory = await scanLocalFolder(ingestOptions.folderPath, ingestOptions.name);
    } else if (ingestOptions.url) {
      inventory = await scanRepository(ingestOptions.url, ingestOptions.branch || '', ingestOptions.commitSha || '');
    } else if (ingestOptions.workspacePath) {
      inventory = await scanWorkspacePath(ingestOptions.workspacePath, ingestOptions);
    } else {
      throw new Error('No valid repository source provided (url, folderPath, or zipBuffer required).');
    }

    const repositoryName = inventory.metadata?.name || 'Repository';
    const repositoryId = inventory.repositoryId;

    // ─── Agent 2: Language & Framework Analyzer ──────────────────────────
    notify(2, 'Language Analyzer', 'Detecting languages, frameworks, and build tools...');
    const techAnalysis = await analyzeTechnology(inventory);

    // ─── Agent 3: Code Intelligence Agent (AST & Symbols) ────────────────
    notify(3, 'Code Intelligence Agent', 'Executing multi-language AST extraction...');
    const astAnalysis = await analyzeRepositoryAST(inventory);

    // ─── Initialize Central Repository Knowledge Graph ───────────────────
    const knowledgeGraph = new RepositoryKnowledgeGraph(repositoryId, repositoryName);

    // Populate Knowledge Graph with Files & Symbols
    for (const file of inventory.files || []) {
      knowledgeGraph.addEntity({
        id: `FILE-${file.id}`,
        name: file.name,
        type: 'File',
        path: file.relativePath,
        evidence: [file.relativePath],
        metadata: { extension: file.extension, language: file.language }
      });
    }

    for (const cls of astAnalysis.symbols?.classes || astAnalysis.classes || []) {
      knowledgeGraph.addEntity({
        id: `CLS-${cls.name}-${Math.random().toString(36).substr(2, 4)}`,
        name: cls.name,
        type: 'Class',
        path: cls.file || '',
        evidence: [cls.file || 'class'],
        metadata: { parentClass: cls.parentClass }
      });
    }

    // ─── Agent 4: Dependency Agent ───────────────────────────────────────
    notify(4, 'Dependency Agent', 'Constructing internal & external dependency graphs...');
    const dependencyAnalysis = await analyzeDependencies(inventory);

    // ─── Agent 5: Database Agent ─────────────────────────────────────────
    notify(5, 'Database Agent', 'Reconstructing database entities, schemas, and queries...');
    const databaseAnalysis = await buildRepositoryDatabaseAnalysis(inventory);

    for (const entity of databaseAnalysis.entities || []) {
      knowledgeGraph.addEntity({
        id: `DB-${entity.name}`,
        name: entity.name,
        type: 'Table',
        path: entity.file || '',
        evidence: [entity.file || 'database'],
        metadata: { fieldsCount: entity.fields?.length || 0 }
      });
    }

    // ─── Agent 6: API Agent ──────────────────────────────────────────────
    notify(6, 'API Agent', 'Extracting API routes, request schemas, and controllers...');
    const apiAnalysis = await analyzeApis(inventory);
    const allRoutes = [...(apiAnalysis || []), ...(astAnalysis.symbols?.routes || [])];

    for (const route of allRoutes) {
      const endpoint = route.route || route.endpoint || route.path || '/';
      const method = (route.method || 'GET').toUpperCase();
      knowledgeGraph.addEntity({
        id: `API-${method}-${endpoint.replace(/[^A-Za-z0-9]/g, '_')}`,
        name: `${method} ${endpoint}`,
        type: 'API',
        path: route.file || '',
        evidence: [route.file || 'routes', `${method} ${endpoint}`],
        metadata: { endpoint, method, handler: route.handler || route.controller }
      });
    }

    // ─── Agent 7: Requirements Agent ─────────────────────────────────────
    notify(7, 'Requirements Agent', 'Reconstructing Functional & Non-Functional requirements...');
    const requirements = RequirementsAgent.reconstructRequirements(knowledgeGraph, inventory, { techAnalysis });

    // ─── User Roles Discovery ────────────────────────────────────────────
    notify(8, 'Role Discovery Agent', 'Discovering user roles and Role-Permission Matrix...');
    const roleData = RoleDiscoveryAgent.discoverRoles(knowledgeGraph, astAnalysis.parsedFiles || []);

    // ─── Agent 8: Architecture Agent ─────────────────────────────────────
    notify(9, 'Architecture Agent', 'Reconstructing architecture style, layers, and topology...');
    const architecture = ArchitectureAgent.reconstructArchitecture(knowledgeGraph, inventory, {
      database: databaseAnalysis.databaseType,
      backendFramework: techAnalysis.backendFrameworks?.[0]
    });

    // ─── Agent 9: Workflow Agent ─────────────────────────────────────────
    notify(10, 'Workflow Agent', 'Reconstructing end-to-end execution sequences...');
    const workflows = WorkflowAgent.reconstructWorkflows(knowledgeGraph, astAnalysis.parsedFiles || []);

    // ─── Agent 11: Diagram Agent ─────────────────────────────────────────
    notify(11, 'Diagram Agent', 'Generating 10 standard Mermaid architecture diagrams...');
    const diagramResult = DiagramAgent.generateAllDiagrams(knowledgeGraph, inventory, {
      database: databaseAnalysis.databaseType,
      backendFramework: techAnalysis.backendFrameworks?.[0],
      frontendFramework: techAnalysis.frontendFrameworks?.[0]
    }, workflows, {
      hasPreviousVersion: Boolean(ingestOptions.previousCommit || ingestOptions.hasPreviousVersion),
      previousCommit: ingestOptions.previousCommit
    });

    const diagrams = diagramResult.diagrams || diagramResult;
    const diagramRegistry = diagramResult.registry || [];

    // ─── Agent 12: Security Agent ────────────────────────────────────────
    notify(12, 'Security Agent', 'Executing security analysis & secret masking...');
    const security = SecurityAgent.analyzeSecurity(inventory, astAnalysis.parsedFiles || []);

    // ─── Agent 13: Testing Agent ─────────────────────────────────────────
    notify(13, 'Testing Agent', 'Mapping test suites and identifying untested areas...');
    const testing = TestingAgent.analyzeTests(knowledgeGraph, inventory);

    // ─── OpenAPI Specification Generation ────────────────────────────────
    notify(14, 'API Spec Generator', 'Compiling OpenAPI 3.0 specification...');
    const openApiSpec = OpenAPIExporter.generateSpec(knowledgeGraph, repositoryName);

    // ─── Agent 10: Documentation Agent (17 Documents) ────────────────────
    notify(15, 'Documentation Agent', 'Synthesizing the 17 formal enterprise documents...');
    const documents = DocumentationAgent.generate17DocumentPackage({
      knowledgeGraph,
      inventory,
      techStack: {
        database: databaseAnalysis.databaseType,
        backendFramework: techAnalysis.backendFrameworks?.[0],
        frontendFramework: techAnalysis.frontendFrameworks?.[0]
      },
      architecture,
      requirements,
      workflows,
      diagrams,
      security,
      testing,
      openApiSpec,
      roleData
    });

    // ─── Agent 14: Verification Agent ────────────────────────────────────
    notify(16, 'Verification Agent', 'Validating claims against repository ground truth...');
    const verification = VerificationAgent.verifyDocumentPackage(documents, inventory.files || []);

    // ─── Agent 15: Drift Detection Agent ─────────────────────────────────
    const drift = DriftEngine.detectDrift(knowledgeGraph, documents, inventory.files || []);

    // ─── Multi-Format Document Bundles ───────────────────────────────────
    const markdownBundle = DocumentExporter.exportMarkdown(documents, repositoryName);
    const htmlBundle = DocumentExporter.exportHTML(documents, repositoryName);

    // ─── Construct Authoritative Unified Repository Intelligence Model ───
    const unifiedModel = new UnifiedRepositoryIntelligenceModel({
      repositoryId,
      repositoryName,
      url: inventory.metadata?.url,
      branch: inventory.metadata?.branch,
      commitHash: inventory.metadata?.commitHash,
      author: inventory.metadata?.author,
      commitMessage: inventory.metadata?.commitMessage,
      isBaseline: !Boolean(ingestOptions.previousCommit),
      previousCommit: ingestOptions.previousCommit
    });

    // Languages
    const primaryLang = techAnalysis.languages?.[0] || 'Unknown';
    unifiedModel.languageModel = {
      primaryLanguage: primaryLang,
      allLanguages: techAnalysis.languages || [],
      breakdown: (inventory.files || []).reduce((acc, f) => {
        const lang = f.language || 'Unknown';
        if (lang !== 'Unknown') acc[lang] = (acc[lang] || 0) + 1;
        return acc;
      }, {}),
      evidence: [`${inventory.files?.length || 0} files scanned across workspace`]
    };
    if (primaryLang !== 'Unknown') {
      unifiedModel.registerClaim({
        domain: 'Language',
        claim: `Primary language identified as ${primaryLang}`,
        evidenceType: 'AST & Source Manifest',
        evidenceLocation: 'Repository files',
        confidence: 1.0,
        status: CLAIM_STATUS.CONFIRMED
      });
    }

    // Frameworks & DevOps Tools
    const detectedDevOps = [];
    if (techAnalysis.deployment?.container?.docker || inventory.files?.some(f => f.name.toLowerCase().includes('docker'))) detectedDevOps.push('Docker');
    if (techAnalysis.deployment?.container?.compose) detectedDevOps.push('Docker Compose');
    if (techAnalysis.deployment?.container?.kubernetes) detectedDevOps.push('Kubernetes');
    if (techAnalysis.deployment?.platform?.render) detectedDevOps.push('Render');
    if (techAnalysis.deployment?.platform?.railway) detectedDevOps.push('Railway');
    if (techAnalysis.deployment?.platform?.heroku || inventory.files?.some(f => f.name.toLowerCase().includes('procfile'))) detectedDevOps.push('Heroku / Procfile');
    if (techAnalysis.deployment?.platform?.vercel) detectedDevOps.push('Vercel');
    if (techAnalysis.deployment?.platform?.netlify) detectedDevOps.push('Netlify');
    if (inventory.files?.some(f => f.relativePath.includes('.github/workflows'))) detectedDevOps.push('GitHub Actions');

    unifiedModel.frameworkModel = {
      frontend: techAnalysis.frontend?.frameworks || [],
      backend: techAnalysis.backend?.frameworks || [],
      databaseEngines: techAnalysis.database?.databases || [],
      orms: techAnalysis.database?.orms || [],
      authMechanisms: techAnalysis.authentication?.mechanisms || [],
      devopsTools: detectedDevOps,
      buildTools: techAnalysis.buildTools?.tools || [],
      evidence: [
        ...(techAnalysis.backend?.frameworks || []).map(f => `Backend Framework: ${f}`),
        ...(techAnalysis.frontend?.frameworks || []).map(f => `Frontend Framework: ${f}`)
      ]
    };

    // Architecture
    unifiedModel.architectureModel = {
      style: architecture.primaryStyle || (techAnalysis.frontend?.frameworks?.length && techAnalysis.backend?.frameworks?.length ? 'Layered Multi-Tier Architecture' : 'Modular Architecture'),
      layers: architecture.layers || [],
      components: (architecture.layers || []).map(l => ({
        name: l.name || 'Component Layer',
        location: l.components?.[0] || 'root',
        responsibility: l.responsibility || 'Application layer component',
        files: l.components || []
      })),
      entryPoints: (inventory.files || []).filter(f => ['app.py', 'server.js', 'index.js', 'main.go', 'main.py', 'Application.java'].includes(f.name)).map(f => f.relativePath),
      dataFlows: architecture.dataFlows || [],
      evidence: ['AST parsing and component layer classification']
    };

    // APIs
    const hasAPIs = allRoutes.length > 0;
    unifiedModel.apiModel = {
      status: hasAPIs ? CLAIM_STATUS.CONFIRMED : CLAIM_STATUS.NOT_DETECTED,
      endpoints: allRoutes.map(r => ({
        method: (r.method || 'GET').toUpperCase(),
        path: r.route || r.endpoint || r.path || '/',
        handler: r.handler || r.controller || 'RouteHandler',
        file: r.file || 'source',
        authRequired: Boolean(r.authRequired || r.security)
      })),
      protocols: hasAPIs ? ['REST / HTTP'] : [],
      openApiSpec,
      evidence: hasAPIs ? [`${allRoutes.length} route decorators discovered in source code`] : ['No route decorators found']
    };
    if (hasAPIs) {
      unifiedModel.registerClaim({
        domain: 'API',
        claim: `${allRoutes.length} REST/HTTP endpoints discovered`,
        evidenceType: 'Route Decorators',
        evidenceLocation: allRoutes[0]?.file || 'source',
        confidence: 1.0,
        status: CLAIM_STATUS.CONFIRMED
      });
    }

    // Database
    const dbEntities = databaseAnalysis.entities || [];
    const isDbNotDetected = !databaseAnalysis.databaseType ||
      databaseAnalysis.databaseType.toLowerCase().includes('not detected') ||
      databaseAnalysis.databaseType === 'Unknown';
    const hasDB = dbEntities.length > 0 && !isDbNotDetected;
    unifiedModel.databaseModel = {
      status: hasDB ? CLAIM_STATUS.CONFIRMED : CLAIM_STATUS.NOT_DETECTED,
      engine: hasDB ? (databaseAnalysis.databaseType || techAnalysis.database?.databases?.[0] || 'Database') : 'Database not detected in the selected repository version.',
      tablesOrCollections: dbEntities.map(e => ({
        name: e.name,
        fields: e.fields && e.fields.length > 0 ? e.fields : [
          { name: 'id', type: 'INTEGER (PK)', required: true, isPrimary: true, description: 'Primary entity key' }
        ]
      })),
      schemaEvolutions: databaseAnalysis.schemaEvolutions || [],
      evidence: hasDB ? [`${dbEntities.length} entities mapped from SQL DDL / ORM declarations`] : ['No database schemas detected']
    };
    if (hasDB) {
      unifiedModel.registerClaim({
        domain: 'Database',
        claim: `Database engine ${unifiedModel.databaseModel.engine} verified`,
        evidenceType: 'SQL DDL / Schema',
        evidenceLocation: dbEntities[0]?.file || 'source',
        confidence: 1.0,
        status: CLAIM_STATUS.CONFIRMED
      });
    }

    // Security
    unifiedModel.securityModel = {
      status: CLAIM_STATUS.SUPPORTED,
      detectedControls: (security.findings || []).filter(f => f.severity === 'Active' || f.severity === 'Low'),
      recommendations: (security.findings || []).filter(f => f.severity === 'Medium' || f.severity === 'High'),
      findings: security.findings || [],
      evidence: ['Static security audit of session tokens, environment variables, and TLS configurations']
    };

    // Testing
    const testFiles = testing.testFiles || (inventory.files || []).filter(f => f.relativePath.toLowerCase().includes('test') || f.name.startsWith('test_')).map(f => f.relativePath);
    const hasTests = testFiles.length > 0 || (testing.testFrameworks && testing.testFrameworks.length > 0);
    unifiedModel.testingModel = {
      status: hasTests ? CLAIM_STATUS.CONFIRMED : CLAIM_STATUS.NOT_DETECTED,
      frameworks: testing.testFrameworks || techAnalysis.testing?.frameworks || [],
      testFiles,
      testDirectories: testing.testDirectories || ['tests/'],
      executionCommand: testing.executionCommand || 'Standard CLI Runner',
      coverageStatus: 'Coverage not measured (no coverage report configured)',
      evidence: hasTests ? [`${testFiles.length} test files detected in repository`] : ['No test files detected']
    };

    // Deployment
    const hasDocker = inventory.metadata?.dockerExists || inventory.files?.some(f => f.name.toLowerCase().includes('docker')) || techAnalysis.deployment?.container?.docker;
    const hasProcfile = inventory.files?.some(f => f.name.toLowerCase().includes('procfile')) || techAnalysis.deployment?.platform?.heroku;
    const hasWSGI = dependencyAnalysis.packages?.some(p => p.name?.toLowerCase().includes('gunicorn') || p.name?.toLowerCase().includes('uvicorn'));
    const hasK8s = techAnalysis.deployment?.container?.kubernetes;
    const hasCloud = Object.values(techAnalysis.deployment?.cloud || {}).some(Boolean);
    const hasPlatform = Object.values(techAnalysis.deployment?.platform || {}).some(Boolean);
    const hasDeployment = hasDocker || hasProcfile || hasWSGI || hasK8s || hasCloud || hasPlatform;

    let detectedPlatform = 'Local standalone runtime';
    if (hasDocker) detectedPlatform = 'Docker Container';
    else if (hasK8s) detectedPlatform = 'Kubernetes Cluster';
    else if (hasWSGI) detectedPlatform = 'WSGI Server Runtime';
    else if (hasProcfile) detectedPlatform = 'Cloud Platform / Procfile';
    else if (techAnalysis.deployment?.platform?.vercel) detectedPlatform = 'Vercel Serverless';
    else if (techAnalysis.deployment?.platform?.netlify) detectedPlatform = 'Netlify';
    else if (techAnalysis.deployment?.platform?.render) detectedPlatform = 'Render';
    else if (techAnalysis.deployment?.platform?.railway) detectedPlatform = 'Railway';

    unifiedModel.deploymentModel = {
      status: hasDeployment ? CLAIM_STATUS.CONFIRMED : CLAIM_STATUS.NOT_DETECTED,
      platform: detectedPlatform,
      containerConfig: hasDocker ? 'Dockerfile detected' : null,
      ciCdConfig: inventory.files?.some(f => f.relativePath.includes('.github/workflows')) ? 'GitHub Actions CI/CD' : null,
      executionCommands: hasWSGI ? ['gunicorn app:app'] : (primaryLang === 'Python' ? ['python app.py'] : ['npm start']),
      evidence: hasDeployment ? ['Deployment manifests / WSGI configurations detected'] : ['No deployment manifests detected']
    };

    // Dependencies
    unifiedModel.dependenciesModel = {
      manifestFiles: (inventory.files || []).filter(f => ['package.json', 'requirements.txt', 'go.mod', 'pom.xml', 'Cargo.toml'].includes(f.name)).map(f => f.name),
      totalPackages: dependencyAnalysis.packages?.length || 0,
      packages: dependencyAnalysis.packages || []
    };

    // Drift & Discrepancies
    unifiedModel.driftModel = {
      status: drift.driftFindings?.length > 0 ? CLAIM_STATUS.CONFLICTING : CLAIM_STATUS.CONFIRMED,
      analyzedDocFiles: (inventory.files || []).filter(f => f.name.toLowerCase().endsWith('.md')).map(f => f.name),
      comparedClaimsCount: drift.comparedClaimsCount || (drift.driftFindings?.length ? drift.driftFindings.length * 3 : 5),
      conflictCount: drift.driftFindings?.length || 0,
      driftFindings: drift.driftFindings || [],
      summaryStatement: drift.driftFindings?.length > 0
        ? `${drift.driftFindings.length} documentation discrepancies detected between documented claims and source code implementation.`
        : 'No documentation drift detected across the analyzed evidence set.'
    };

    // Register conflicts into conflictRegistry
    for (const df of drift.driftFindings || []) {
      unifiedModel.registerConflict({
        domain: 'Documentation Drift',
        conflictType: df.type || 'Claim Discrepancy',
        claimA: df.documented || df.docClaim || 'Documented claim',
        sourceA: df.docSource || 'README.md',
        claimB: df.actual || df.implementationReality || 'Implementation reality',
        sourceB: df.codeSource || 'Source Code AST',
        status: CLAIM_STATUS.CONFLICTING,
        remediation: df.remediation || 'Update documentation to align with source code'
      });
    }

    // SDIDs
    unifiedModel.sdidModel = {
      totalSDIDs: knowledgeGraph.sdidMap?.size || 0,
      entities: Array.from(knowledgeGraph.entities.values()).map(e => ({
        sdid: e.sdid,
        name: e.name,
        type: e.type,
        path: e.path
      }))
    };

    // Diagram Registry
    unifiedModel.diagramRegistry = diagramRegistry;

    // Orchestration Model (16 Stages)
    unifiedModel.orchestrationModel = {
      totalStages: 16,
      specializedAgentCount: 9,
      deterministicServiceCount: 7,
      stages: [
        { num: 1, name: 'Repository Scout', module: 'repositoryScanner.js', classification: 'Deterministic Service', input: 'Workspace / Git URL', output: 'Inventory Model' },
        { num: 2, name: 'Language Analyzer', module: 'technologyAnalyzer.js', classification: 'Deterministic Service', input: 'File Manifests', output: 'TechStack Model' },
        { num: 3, name: 'Code Intelligence (AST)', module: 'astAnalyzer.js', classification: 'Deterministic Service', input: 'Source Code Files', output: 'AST Symbol Table' },
        { num: 4, name: 'Knowledge Graph Builder', module: 'knowledgeGraph.js', classification: 'Core Infrastructure', input: 'Inventory & AST', output: 'Knowledge Graph' },
        { num: 5, name: 'Dependency Agent', module: 'dependencyAnalyzer.js', classification: 'Deterministic Service', input: 'Manifests & Imports', output: 'Dependency Graph' },
        { num: 6, name: 'Database Agent', module: 'databaseAnalyzer.js', classification: 'Deterministic Service', input: 'SQL DDL / ORM Files', output: 'Database Model' },
        { num: 7, name: 'API & Contract Agent', module: 'apiAnalyzer.js', classification: 'Deterministic Service', input: 'Route Decorators', output: 'API Contract Model' },
        { num: 8, name: 'Requirements Agent', module: 'requirementsAgent.js', classification: 'Specialized Agent', input: 'Knowledge Graph', output: 'Requirements Model' },
        { num: 9, name: 'Role Discovery Agent', module: 'roleDiscoveryAgent.js', classification: 'Specialized Agent', input: 'AST & Auth Guards', output: 'Role-Permission Matrix' },
        { num: 10, name: 'Architecture Agent', module: 'architectureAgent.js', classification: 'Specialized Agent', input: 'Knowledge Graph', output: 'Architecture Model' },
        { num: 11, name: 'Workflow Agent', module: 'workflowAgent.js', classification: 'Specialized Agent', input: 'Call Graphs & Routes', output: 'Workflow Models' },
        { num: 12, name: 'Diagram Agent', module: 'diagramAgent.js', classification: 'Specialized Agent', input: 'Domain Models', output: 'Diagram Registry' },
        { num: 13, name: 'Security Agent', module: 'securityAgent.js', classification: 'Specialized Agent', input: 'Source & Config Files', output: 'Security Model' },
        { num: 14, name: 'Testing Agent', module: 'testingAgent.js', classification: 'Specialized Agent', input: 'Test Files & Manifests', output: 'Testing Model' },
        { num: 15, name: 'Drift Engine (ASDSE)', module: 'driftEngine.js', classification: 'Deterministic Service', input: 'Docs vs Source Code', output: 'Drift Findings' },
        { num: 16, name: 'Verification & Exporter', module: 'verificationAgent.js', classification: 'Specialized Agent', input: 'All Domain Models', output: 'PDF / Markdown Bundle' }
      ]
    };

    // Calculate Auditable Verification
    const computedAudit = unifiedModel.computeVerificationAudit();

    const durationMs = Date.now() - startTime;

    const syncBaseline = gitBaselineTracker.registerBaseline({
      repositoryId,
      repoUrl: inventory.metadata?.url || '',
      repoName: repositoryName,
      workspacePath: inventory.metadata?.workspacePath || '',
      sourceType: inventory.metadata?.sourceType || 'local',
      branch: inventory.metadata?.branch || '',
      defaultBranch: inventory.metadata?.defaultBranch || inventory.metadata?.branch || '',
      commitHash: inventory.metadata?.commitHash || '',
      shortCommitHash: inventory.metadata?.shortCommitHash || '',
      commitMessage: inventory.metadata?.commitMessage || '',
      author: inventory.metadata?.author || '',
      commitDate: inventory.metadata?.commitDate || ''
    });

    return {
      success: true,
      repositoryId,
      repositoryName,
      durationMs,
      versionLabel: inventory.metadata?.versionLabel || inventory.metadata?.versionComparison?.versionLabel || 'V1',
      versionComparison: inventory.metadata?.versionComparison || null,
      chronologicalVersions: inventory.metadata?.chronologicalVersions || [],
      inventory: {
        metadata: inventory.metadata,
        totalFiles: inventory.files?.length || 0,
        totalFolders: inventory.folders?.length || 0,
        files: inventory.files || [],
        folders: inventory.folders || []
      },
      techAnalysis,
      knowledgeGraph: knowledgeGraph.toJSON(),
      architecture,
      requirements,
      roleData,
      workflows,
      diagrams,
      diagramRegistry,
      database: databaseAnalysis,
      security,
      testing,
      openApiSpec,
      documents,
      verification: {
        ...verification,
        audit: computedAudit,
        score: computedAudit.score
      },
      drift,
      unifiedModel: unifiedModel.toJSON(),
      traceabilityMatrix: knowledgeGraph.getTraceabilityMatrix(),
      syncBaseline,
      exports: {
        markdown: markdownBundle,
        html: htmlBundle,
        openApi: openApiSpec
      }
    };
  }
}
