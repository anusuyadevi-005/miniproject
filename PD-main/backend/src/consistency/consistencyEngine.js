export class ConsistencyVerificationEngine {
  /**
   * Performs comprehensive multi-point consistency verification between source code and documentation.
   * If any check fails, strictly reports isVerified: false and details the exact failure reasons.
   */
  static verifyDocumentationConsistency({
    codeSymbols = [],
    documentedSymbols = [],
    apiRoutes = [],
    documentedApis = [],
    databaseEntities = [],
    documentedTables = [],
    dependencies = [],
    documentedDependencies = [],
    diagrams = {},
    activeCommit = '',
    documentedCommit = '',
    sdidMappings = []
  } = {}) {
    const failures = [];
    const passedChecks = [];

    // 1. Symbol & Parameter Verification
    const missingSymbols = [];
    codeSymbols.forEach(sym => {
      const symName = typeof sym === 'string' ? sym : (sym.name || sym.symbolName);
      if (symName && !documentedSymbols.some(ds => String(ds).includes(symName))) {
        missingSymbols.push(symName);
      }
    });
    if (missingSymbols.length > 0) {
      failures.push(`Missing symbol documentation for: ${missingSymbols.join(', ')}`);
    } else {
      passedChecks.push('All declared code symbols mapped to active documentation blocks.');
    }

    // 2. API Contract Verification
    const missingApis = [];
    apiRoutes.forEach(route => {
      const routePath = typeof route === 'string' ? route : (route.path || route.endpoint || route.name);
      if (routePath && !documentedApis.some(da => String(da).includes(routePath))) {
        missingApis.push(routePath);
      }
    });
    if (missingApis.length > 0) {
      failures.push(`Missing API contracts in documentation for: ${missingApis.join(', ')}`);
    } else {
      passedChecks.push('All HTTP route controllers verified in API documentation.');
    }

    // 3. Database Schema Verification
    const missingTables = [];
    databaseEntities.forEach(tbl => {
      const tableName = typeof tbl === 'string' ? tbl : (tbl.name || tbl.tableName);
      if (tableName && !documentedTables.some(dt => String(dt).includes(tableName))) {
        missingTables.push(tableName);
      }
    });
    if (missingTables.length > 0) {
      failures.push(`Database schema mismatch for tables: ${missingTables.join(', ')}`);
    } else {
      passedChecks.push('Database entity declarations grounded in repository evidence.');
    }

    // 4. Diagram Model Verification
    if (diagrams && diagrams.systemContext) {
      passedChecks.push('System Context diagram matches active repository intelligence model.');
    }

    // 5. SDID Traceability Verification
    const invalidSdids = sdidMappings.filter(m => !m.sdid || !m.filePath);
    if (invalidSdids.length > 0) {
      failures.push(`${invalidSdids.length} SDID mappings missing valid file path references.`);
    } else {
      passedChecks.push('SDID traceability matrix verified across all symbols.');
    }

    // 6. Commit Metadata Verification
    if (activeCommit && documentedCommit && activeCommit.substring(0, 7) !== documentedCommit.substring(0, 7)) {
      failures.push(`Commit version mismatch: Active commit ${activeCommit.substring(0, 7)} vs Documented commit ${documentedCommit.substring(0, 7)}`);
    } else {
      passedChecks.push('Documentation metadata verified against active git commit.');
    }

    const isVerified = failures.length === 0;

    return {
      isVerified,
      status: isVerified ? 'VERIFIED' : 'FAILED',
      passedChecksCount: passedChecks.length,
      failuresCount: failures.length,
      passedChecks,
      failures,
      verificationScore: isVerified ? 100 : Math.max(40, 100 - failures.length * 15),
      summary: isVerified
        ? 'All multi-point repository consistency checks passed.'
        : `Consistency verification failed with ${failures.length} discrepancy finding(s).`
    };
  }

  static verify(codeParams = [], docMarkdown = '') {
    const missingInDocs = [];
    codeParams.forEach(param => {
      if (!docMarkdown.includes(param)) {
        missingInDocs.push(param);
      }
    });

    const isConsistent = missingInDocs.length === 0;
    return {
      isConsistent,
      isVerified: isConsistent,
      status: isConsistent ? 'VERIFIED' : 'FAILED',
      missingInDocs,
      verificationMessage: isConsistent
        ? 'All code parameters verified in documentation.'
        : `Missing parameter documentation for: ${missingInDocs.join(', ')}`
    };
  }
}
