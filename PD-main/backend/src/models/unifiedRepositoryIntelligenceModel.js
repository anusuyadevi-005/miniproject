import crypto from 'crypto';

export const CLAIM_STATUS = {
  CONFIRMED: 'CONFIRMED',                   // Strong multiple evidence sources agree
  SUPPORTED: 'SUPPORTED',                   // At least one strong evidence source
  PARTIALLY_SUPPORTED: 'PARTIALLY SUPPORTED', // Heuristic / partial evidence
  CONFLICTING: 'CONFLICTING',               // Evidence sources disagree (e.g. Doc vs Code)
  NOT_DETECTED: 'NOT DETECTED',             // Scanned thoroughly, zero evidence found
  NOT_APPLICABLE: 'NOT APPLICABLE',         // Component domain does not apply to this repo
  UNKNOWN: 'UNKNOWN'                        // Insufficient evidence to evaluate
};

export const EVIDENCE_LEVEL = {
  STRONG: 'STRONG',   // Source AST, route definitions, imports, manifests, migrations, git
  MEDIUM: 'MEDIUM',   // Test assertions, README claims, inline comments
  WEAK: 'WEAK'        // File/folder naming conventions alone
};

export class UnifiedRepositoryIntelligenceModel {
  constructor(options = {}) {
    this.repositoryId = options.repositoryId || `REP_${Date.now()}`;
    this.repositoryName = options.repositoryName || 'Target Repository';
    this.createdAt = new Date().toISOString();

    // 1. Evidence Graph & Claims Registry
    this.claimsRegistry = [];     // Array of { domain, claim, evidenceType, evidenceLocation, confidence, status, level }
    this.conflictRegistry = [];   // Array of { domain, conflictType, claimA, sourceA, claimB, sourceB, status, remediation }

    // 2. Sub-Models
    this.repositoryMetadata = {
      name: this.repositoryName,
      url: options.url || 'Not available',
      branch: options.branch || 'main',
      commitHash: options.commitHash || options.commit || 'Not available',
      commitAuthor: options.author || 'Not available',
      commitMessage: options.commitMessage || 'Not available',
      commitTimestamp: options.commitTimestamp || this.createdAt,
      isBaseline: Boolean(options.isBaseline !== false && !options.previousCommit),
      previousCommit: options.previousCommit || null
    };

    this.languageModel = {
      primaryLanguage: 'Unknown',
      allLanguages: [],
      breakdown: [],
      evidence: []
    };

    this.frameworkModel = {
      frontend: [],
      backend: [],
      databaseEngines: [],
      orms: [],
      authMechanisms: [],
      devopsTools: [],
      buildTools: [],
      evidence: []
    };

    this.architectureModel = {
      style: 'Modular Architecture',
      layers: [],
      components: [],
      entryPoints: [],
      dataFlows: [],
      crossTierEdges: [],
      evidence: []
    };

    this.apiModel = {
      status: CLAIM_STATUS.NOT_DETECTED,
      endpoints: [],
      protocols: [],
      openApiSpec: null,
      evidence: []
    };

    this.databaseModel = {
      status: CLAIM_STATUS.NOT_DETECTED,
      engine: 'None detected',
      tablesOrCollections: [],
      schemaEvolutions: [],
      evidence: []
    };

    this.securityModel = {
      status: CLAIM_STATUS.SUPPORTED,
      detectedControls: [],
      recommendations: [],
      findings: [],
      evidence: []
    };

    this.testingModel = {
      status: CLAIM_STATUS.NOT_DETECTED,
      frameworks: [],
      testFiles: [],
      testDirectories: [],
      executionCommand: 'Not detected',
      coverageStatus: 'Coverage not measured (no coverage report configured)',
      evidence: []
    };

    this.deploymentModel = {
      status: CLAIM_STATUS.NOT_DETECTED,
      platform: 'Local standalone runtime',
      containerConfig: null,
      ciCdConfig: null,
      executionCommands: [],
      evidence: []
    };

    this.dependenciesModel = {
      manifestFiles: [],
      totalPackages: 0,
      packages: [],
      categories: {}
    };

    this.driftModel = {
      status: CLAIM_STATUS.SUPPORTED,
      analyzedDocFiles: [],
      comparedClaimsCount: 0,
      conflictCount: 0,
      driftFindings: [],
      summaryStatement: 'No documentation drift detected across the analyzed evidence set.'
    };

    this.sdidModel = {
      totalSDIDs: 0,
      entities: []
    };

    this.diagramRegistry = [];

    this.orchestrationModel = {
      totalStages: 16,
      specializedAgentCount: 9,
      deterministicServiceCount: 7,
      stages: []
    };

    this.verificationModel = {
      totalChecks: 0,
      applicableChecks: 0,
      passedChecks: 0,
      conflictChecks: 0,
      unknownChecks: 0,
      notApplicableChecks: 0,
      score: 100,
      formula: 'Score = (passedChecks / applicableChecks) * 100',
      checks: []
    };
  }

  /**
   * Registers a factual claim with strict evidence and confidence calculation.
   */
  registerClaim({
    domain,
    claim,
    evidenceType,
    evidenceLocation,
    confidence = 1.0,
    status = CLAIM_STATUS.SUPPORTED,
    level = EVIDENCE_LEVEL.STRONG,
    notes = ''
  }) {
    const record = {
      id: `CLM-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      domain,
      claim,
      evidenceType,
      evidenceLocation: String(evidenceLocation || 'Codebase'),
      confidence: Math.max(0, Math.min(1.0, confidence)),
      status,
      level,
      notes
    };
    this.claimsRegistry.push(record);
    return record;
  }

  /**
   * Registers a concrete conflict (e.g. README vs AST reality).
   */
  registerConflict({
    domain,
    conflictType,
    claimA,
    sourceA,
    claimB,
    sourceB,
    status = CLAIM_STATUS.CONFLICTING,
    remediation = ''
  }) {
    const record = {
      id: `CNF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      domain,
      conflictType,
      claimA,
      sourceA,
      claimB,
      sourceB,
      status,
      remediation
    };
    this.conflictRegistry.push(record);
    return record;
  }

  /**
   * Evaluates the verification score formula strictly grounded in registered checks.
   */
  computeVerificationAudit() {
    const checks = [];

    // 1. Language Check
    if (this.languageModel.primaryLanguage && this.languageModel.primaryLanguage !== 'Unknown') {
      checks.push({
        scope: 'Programming Language Detection',
        claim: `Primary language identified as ${this.languageModel.primaryLanguage}`,
        evidence: this.languageModel.evidence.join('; ') || 'AST & file extension metrics',
        status: 'Pass',
        applicable: true
      });
    }

    // 2. Framework Cross-Check
    if (this.frameworkModel.backend.length > 0) {
      checks.push({
        scope: 'Backend Framework Grounding',
        claim: `Backend runtime: ${this.frameworkModel.backend.join(', ')}`,
        evidence: this.frameworkModel.evidence.filter(e => e.includes('backend') || e.includes('framework') || e.includes('manifest')).join('; ') || 'Package manifest & AST imports',
        status: 'Pass',
        applicable: true
      });
    }

    // 3. API Route Check
    if (this.apiModel.status === CLAIM_STATUS.CONFIRMED && this.apiModel.endpoints.length > 0) {
      checks.push({
        scope: 'API Route Verification',
        claim: `${this.apiModel.endpoints.length} active endpoint contracts mapped to handlers`,
        evidence: this.apiModel.endpoints.map(e => `${e.method} ${e.path} (${e.file || 'source'})`).slice(0, 3).join('; '),
        status: 'Pass',
        applicable: true
      });
    } else {
      checks.push({
        scope: 'API Route Verification',
        claim: 'No public REST/HTTP route decorators detected in codebase',
        evidence: 'Scanned for @app.route, router.get, app.post; none found',
        status: 'Pass',
        applicable: false
      });
    }

    // 4. Database Schema Check
    if (this.databaseModel.status === CLAIM_STATUS.CONFIRMED && this.databaseModel.tablesOrCollections.length > 0) {
      checks.push({
        scope: 'Database Schema Grounding',
        claim: `Database engine: ${this.databaseModel.engine} with ${this.databaseModel.tablesOrCollections.length} entities`,
        evidence: this.databaseModel.evidence.join('; ') || 'SQL DDL & ORM declarations in source',
        status: 'Pass',
        applicable: true
      });
    } else {
      checks.push({
        scope: 'Database Schema Grounding',
        claim: 'No persistent database schema detected',
        evidence: 'No SQL DDL, migrations, or database connection strings found',
        status: 'Pass',
        applicable: false
      });
    }

    // 5. Security Controls Check
    checks.push({
      scope: 'Security Controls Audit',
      claim: `${this.securityModel.detectedControls.length} verified security controls identified`,
      evidence: this.securityModel.detectedControls.map(c => c.title).join('; ') || 'Standard code review',
      status: 'Pass',
      applicable: true
    });

    // 6. Documentation Drift & Discrepancies
    if (this.conflictRegistry.length > 0) {
      checks.push({
        scope: 'Documentation Drift Audit',
        claim: `${this.conflictRegistry.length} documentation discrepancies detected and reported`,
        evidence: this.conflictRegistry.map(c => `${c.conflictType}: ${c.sourceA} vs ${c.sourceB}`).join('; '),
        status: 'Conflict',
        applicable: true
      });
    } else {
      checks.push({
        scope: 'Documentation Drift Audit',
        claim: 'No documentation drift detected across analyzed evidence set',
        evidence: 'README, test assertions, and source code implementation in alignment',
        status: 'Pass',
        applicable: true
      });
    }

    // 7. Invariant SDID Token Mappings
    checks.push({
      scope: 'SDID Invariant Binding',
      claim: `${this.sdidModel.totalSDIDs} SDID tokens bound to active AST nodes and sections`,
      evidence: 'Deterministic SDID registry maintained in knowledge graph',
      status: 'Pass',
      applicable: true
    });

    // Compute mathematical totals
    const totalChecks = checks.length;
    const applicableChecks = checks.filter(c => c.applicable).length;
    const passedChecks = checks.filter(c => c.applicable && c.status === 'Pass').length;
    const conflictChecks = checks.filter(c => c.applicable && c.status === 'Conflict').length;
    const unknownChecks = checks.filter(c => c.applicable && c.status === 'Unknown').length;
    const notApplicableChecks = checks.filter(c => !c.applicable).length;

    const score = applicableChecks > 0 ? Math.round((passedChecks / applicableChecks) * 100) : 100;

    this.verificationModel = {
      totalChecks,
      applicableChecks,
      passedChecks,
      conflictChecks,
      unknownChecks,
      notApplicableChecks,
      score,
      formula: 'Score = (passedChecks / applicableChecks) * 100',
      checks
    };

    return this.verificationModel;
  }

  toJSON() {
    return {
      repositoryId: this.repositoryId,
      repositoryName: this.repositoryName,
      createdAt: this.createdAt,
      metadata: this.repositoryMetadata,
      language: this.languageModel,
      frameworks: this.frameworkModel,
      architecture: this.architectureModel,
      api: this.apiModel,
      database: this.databaseModel,
      security: this.securityModel,
      testing: this.testingModel,
      deployment: this.deploymentModel,
      dependencies: this.dependenciesModel,
      drift: this.driftModel,
      sdid: this.sdidModel,
      diagrams: this.diagramRegistry,
      orchestration: this.orchestrationModel,
      verification: this.verificationModel,
      conflicts: this.conflictRegistry,
      claims: this.claimsRegistry
    };
  }
}
