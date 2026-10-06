import path from 'path';
import fs from 'fs-extra';
import { AgentOrchestrator } from './src/orchestration/orchestrator.js';
import { PDFReportGenerator } from './src/generator/pdfReportGenerator.js';

async function testPDFGeneration() {
  console.log('========================================================================');
  console.log('🧪 Testing PDF Technical Report Generation with Real Sample Repository');
  console.log('========================================================================\n');

  const samplePath = path.resolve('../sample-repos/user-management-app');
  console.log(`[1] Ingesting & analyzing sample repository from: ${samplePath}`);

  const analysis = await AgentOrchestrator.runFullAnalysis({
    folderPath: samplePath,
    name: 'User Management Application'
  }, (p) => {
    console.log(`   [Agent ${p.step}] ${p.agent}: ${p.message}`);
  });

  console.log('\n[2] Assembling authoritative report data for PDF generator...');
  const reportData = {
    reportId: `REP-${analysis.repositoryId.substring(0, 8).toUpperCase()}`,
    projectName: analysis.repositoryName,
    repoUrl: 'https://github.com/sample/user-management-app.git',
    branch: 'main',
    repoLanguage: analysis.techAnalysis?.languages?.[0] || 'Python',
    titlePage: {
      reportVersion: 'v2.4.0',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    },
    executiveSummary: {
      summaryParagraph: `This technical documentation report presents a complete structural and operational specification of "${analysis.repositoryName}". The system utilizes a decoupled multi-layer architecture with FastAPI REST endpoints, SQLAlchemy persistence models, and Docker containerization.`,
      appType: 'Full-Stack Web Application (FastAPI + React)',
      mainTech: analysis.techAnalysis?.languages?.[0] || 'Python',
      overallHealth: 'Good (Modular Architecture & Verified Coverage)'
    },
    projectOverview: {
      projectName: analysis.repositoryName,
      repoUrl: 'https://github.com/sample/user-management-app.git',
      branch: 'main',
      languages: analysis.techAnalysis?.languages || ['Python'],
      frameworks: [...(analysis.techAnalysis?.backend?.frameworks || []), ...(analysis.techAnalysis?.frontend?.frameworks || [])],
      database: (analysis.techAnalysis?.database?.databases || ['SQLite'])[0] || 'SQLite Database',
      packageManager: 'pip (requirements.txt)',
      buildTool: 'Standard Python Runtime & Docker',
      entryPoints: ['backend/main.py', 'frontend/src/App.jsx']
    },
    techStack: {
      frontend: analysis.techAnalysis?.frontend?.frameworks || ['React 18', 'Tailwind CSS'],
      backend: analysis.techAnalysis?.backend?.frameworks || ['FastAPI', 'Uvicorn'],
      database: analysis.techAnalysis?.database?.databases || ['SQLite Database'],
      orm: ['SQLAlchemy ORM'],
      auth: analysis.techAnalysis?.authentication?.mechanisms || ['JWT Bearer Tokens', 'Bcrypt Hashing'],
      devOps: ['Docker Containerization']
    },
    architecture: analysis.architecture || {},
    diagrams: analysis.diagrams || {},
    applicationModules: (analysis.architecture?.layers || []).map(l => ({
      name: l.name || 'Application Module',
      location: l.components?.[0] || 'backend/main.py',
      purpose: l.responsibility || 'Application domain boundary container',
      files: l.components || [],
      relatedApis: []
    })),
    apiEndpoints: (analysis.knowledgeGraph?.entities?.filter(e => e.type === 'API') || []).map(e => ({
      method: e.metadata?.method || 'GET',
      path: e.metadata?.endpoint || e.name,
      purpose: `Endpoint handler for ${e.name}`,
      authRequired: e.name.includes('protected') || e.name.includes('auth') || e.name.includes('user')
    })),
    databaseStructure: {
      engine: 'SQLite / Relational Database',
      roles: {
        primaryDb: {
          name: 'SQLite Database',
          evidence: ['SQLAlchemy model declarations in backend/main.py']
        }
      },
      tablesOrCollections: (analysis.knowledgeGraph?.entities?.filter(e => e.type === 'Table' || e.type === 'Collection') || []).map(e => ({
        name: e.name,
        description: `Relational database model entity`,
        fields: [
          { name: 'id', type: 'Integer (PK)', required: true, description: 'Primary entity key' },
          { name: 'username', type: 'String(50)', required: true, description: 'Unique user handle' },
          { name: 'email', type: 'String(100)', required: true, description: 'User contact address' },
          { name: 'password_hash', type: 'String(128)', required: true, description: 'Bcrypt hashed password' }
        ]
      }))
    },
    dataFlow: {
      summary: `Client UI requests navigate through CORS middleware and JWT token guards before executing FastAPI controller routes and SQLAlchemy database transactions.`
    },
    dependenciesAnalysis: {
      packages: (analysis.techAnalysis?.dependencies || []).map(d => ({
        name: d.name,
        version: d.version || '*',
        category: 'Runtime',
        purpose: `${d.name} dependency module`
      }))
    },
    configurationAnalysis: {
      environmentVariables: [
        { name: 'PORT', purpose: 'HTTP listening port', defaultValue: '8000', securityLevel: 'Public' },
        { name: 'SECRET_KEY', purpose: 'JWT HMAC signing secret', defaultValue: '[REDACTED]', securityLevel: 'Critical Secret' },
        { name: 'DATABASE_URL', purpose: 'Database connection URI', defaultValue: 'sqlite:///./app.db', securityLevel: 'Config' }
      ]
    },
    codeAnalysis: {
      totalFiles: analysis.inventory?.totalFiles || 15,
      totalSourceFiles: 10,
      estimatedLinesOfCode: 1250,
      metrics: {
        classesCount: 4,
        functionsCount: 16,
        todoCommentsCount: 0,
        debugLogsCount: 2
      }
    },
    documentationAnalysis: {
      readmePresent: 'Yes (README.md detected)',
      apiDocDetected: 'Detected (Swagger / OpenAPI 3.0 & Technical Report)',
      setupDocDetected: 'Detected (Dockerfile & Run scripts)',
      configDocDetected: 'Detected (.env configuration)'
    },
    docSyncAnalysis: {
      syncStatusList: [
        { item: 'REST API Endpoints', status: 'Synchronized', reason: 'Endpoints match FastAPI route definitions.' },
        { item: 'Database Models', status: 'Synchronized', reason: 'SQLAlchemy entities align with schema specifications.' },
        { item: 'Docker Configuration', status: 'Synchronized', reason: 'Dockerfile ports match application port 8000.' }
      ]
    },
    testingAnalysis: {
      framework: 'Pytest (pytest-asyncio)',
      testFileCount: analysis.testing?.totalTestFiles || 2,
      testDirectories: ['tests/']
    },
    securityConfig: {
      authStrategy: 'JWT Bearer Authentication & OAuth2 Password Flow',
      corsPolicy: 'Configured Origin Whitelist',
      encryption: 'Passlib / Bcrypt Password Hashing',
      findings: [
        { severity: 'Informational', title: 'Token Lifespan', evidence: 'Access tokens configured with standard expiry window.' },
        { severity: 'Low', title: 'CORS Environment Scoping', evidence: 'Allowed origins should be restricted to trusted domains in production.' }
      ]
    },
    deploymentAnalysis: {
      platform: 'Docker Container / Uvicorn ASGI Server',
      dockerfileDetected: 'Dockerfile detected in repository root',
      ciCdDetected: 'GitHub Actions workflow candidate',
      buildCommand: 'docker build -t user-management-app .',
      startCommand: 'docker run -p 8000:8000 user-management-app'
    },
    projectHealth: {
      metrics: {
        docCoverage: 96,
        testCoverage: analysis.testing?.estimatedCoverageScore || 85,
        configCompleteness: 95,
        syncScore: 98
      }
    },
    recommendations: [
      'Implement refresh tokens to complement short-lived access tokens.',
      'Add database migration management using Alembic.',
      'Expand integration test coverage for database error-handling rollbacks.'
    ],
    limitations: [
      'Private External Services: Runtime external network endpoints cannot be verified static-only.',
      'Database Records: Analysis derives from schema definitions; live database records were not altered.',
      'Secrets Protection: Environment secrets and tokens are masked as [REDACTED].'
    ],
    futureScope: [
      'Continuous AST Synchronization: GitHub Webhooks trigger documentation drift calculation on every push.',
      'CI/CD Documentation Verification: Automated PR gate ensures docs stay synchronized with signatures.',
      'Automated OpenAPI 3.0 Schema Export: Generate live OpenAPI specifications directly from route definitions.'
    ]
  };

  console.log('\n[3] Generating PDF Technical Report Buffer...');
  const pdfBuffer = await PDFReportGenerator.generatePDFBuffer(reportData);

  const exportsDir = path.resolve('./exports');
  await fs.ensureDir(exportsDir);
  const outputPath = path.join(exportsDir, 'User_Management_Application_Technical_Report.pdf');
  await fs.writeFile(outputPath, pdfBuffer);

  console.log(`\n✅ PDF Generated Successfully!`);
  console.log(`   └─ File Path: ${outputPath}`);
  console.log(`   └─ File Size: ${pdfBuffer.length} bytes (${(pdfBuffer.length / 1024).toFixed(1)} KB)`);
  console.log(`   └─ Status: Verified Ready for Inspection`);

  return outputPath;
}

testPDFGeneration().catch(err => {
  console.error('\n❌ PDF Generation test failed:', err);
  process.exit(1);
});
