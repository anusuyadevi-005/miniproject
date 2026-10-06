import path from 'path';

/**
 * VersionDiffEngine: Computes genuine repository version differences between consecutive Git commits.
 * 
 * Rules:
 * 1. A VERSION is the complete repository state at a Git commit.
 * 2. A VERSION DIFFERENCE is everything that actually changed between two complete repository states.
 * 3. Uses actual Git history/diff as the source of truth.
 * 4. Categorizes higher-level changes across 10 domain categories ONLY where real evidence exists.
 * 5. If a category did not change, reports hasChanges: false, status: 'NOT_DETECTED' with zero fabrication.
 */
export class VersionDiffEngine {
  /**
   * Classifies a file path into its relevant architectural and domain categories.
   */
  static categorizeFilePath(filePath = '') {
    const normalized = filePath.replace(/\\/g, '/').toLowerCase();
    const basename = path.basename(normalized);
    const ext = path.extname(normalized).toLowerCase();

    const categories = {
      isSourceCode: false,
      isApi: false,
      isDatabase: false,
      isDependency: false,
      isSecurity: false,
      isConfiguration: false,
      isArchitecture: false,
      isWorkflow: false,
      isTesting: false,
      isDocumentation: false
    };

    // Testing
    if (
      normalized.includes('/test/') ||
      normalized.includes('/tests/') ||
      normalized.includes('/__tests__/') ||
      normalized.includes('/spec/') ||
      normalized.includes('/specs/') ||
      basename.includes('.test.') ||
      basename.includes('.spec.') ||
      basename.startsWith('test_') ||
      basename.endsWith('_test.py') ||
      basename.endsWith('_test.go') ||
      basename.endsWith('test.java')
    ) {
      categories.isTesting = true;
    }

    // Documentation
    if (
      ext === '.md' ||
      ext === '.markdown' ||
      ext === '.rst' ||
      normalized.includes('/docs/') ||
      normalized.includes('/doc/') ||
      basename.startsWith('readme') ||
      basename.startsWith('changelog') ||
      basename.startsWith('license') ||
      basename.startsWith('contributing') ||
      (ext === '.txt' && (basename.startsWith('readme') || basename.startsWith('license') || basename.startsWith('notes')))
    ) {
      categories.isDocumentation = true;
    }

    // Dependency Manifests
    if (
      basename === 'package.json' ||
      basename === 'package-lock.json' ||
      basename === 'yarn.lock' ||
      basename === 'pnpm-lock.yaml' ||
      basename === 'requirements.txt' ||
      basename === 'pipfile' ||
      basename === 'pipfile.lock' ||
      basename === 'pyproject.toml' ||
      basename === 'pom.xml' ||
      basename === 'build.gradle' ||
      basename === 'build.gradle.kts' ||
      basename === 'go.mod' ||
      basename === 'go.sum' ||
      basename === 'cargo.toml' ||
      basename === 'cargo.lock' ||
      basename === 'gemfile' ||
      basename === 'gemfile.lock' ||
      basename === 'composer.json' ||
      basename === 'composer.lock'
    ) {
      categories.isDependency = true;
    }

    // Configuration
    if (
      basename.startsWith('.env') ||
      basename.includes('.config.') ||
      basename.endsWith('.conf') ||
      basename === 'tsconfig.json' ||
      basename === 'jsconfig.json' ||
      basename === 'dockerfile' ||
      basename.includes('docker-compose') ||
      basename === 'procfile' ||
      basename === '.gitignore' ||
      basename === '.editorconfig' ||
      basename === '.dockerignore' ||
      (ext === '.yaml' || ext === '.yml' || ext === '.toml' || ext === '.ini') && !categories.isWorkflow
    ) {
      categories.isConfiguration = true;
    }

    // Workflows / CI/CD
    if (
      normalized.includes('.github/workflows/') ||
      normalized.includes('.gitlab-ci') ||
      normalized.includes('/workflows/') ||
      basename.includes('jenkinsfile') ||
      normalized.includes('/pipeline/')
    ) {
      categories.isWorkflow = true;
      categories.isConfiguration = true;
    }

    // Database / Schema / Migrations
    if (
      normalized.includes('/migration') ||
      normalized.includes('/migrations/') ||
      normalized.includes('/schema') ||
      normalized.includes('/schemas/') ||
      normalized.includes('/db/') ||
      normalized.includes('/database/') ||
      normalized.includes('/models/') ||
      normalized.includes('/entities/') ||
      ext === '.sql' ||
      basename.endsWith('.prisma') ||
      basename.includes('alembic') ||
      basename.includes('schema') ||
      basename.includes('entity') ||
      basename.includes('model')
    ) {
      categories.isDatabase = true;
    }

    // Security / Authentication
    if (
      normalized.includes('/auth') ||
      normalized.includes('/security/') ||
      normalized.includes('/guards/') ||
      normalized.includes('/middleware/auth') ||
      normalized.includes('/middlewares/auth') ||
      basename.includes('auth') ||
      basename.includes('passport') ||
      basename.includes('jwt') ||
      basename.includes('oauth') ||
      basename.includes('security') ||
      basename.includes('permission') ||
      basename.includes('role')
    ) {
      categories.isSecurity = true;
    }

    // API / Routes / Controllers
    if (
      normalized.includes('/route') ||
      normalized.includes('/routes/') ||
      normalized.includes('/controller') ||
      normalized.includes('/controllers/') ||
      normalized.includes('/api/') ||
      normalized.includes('/endpoints/') ||
      normalized.includes('/views/') ||
      basename.includes('router') ||
      basename.includes('route') ||
      basename.includes('controller') ||
      basename.includes('api') ||
      basename === 'urls.py' ||
      basename === 'endpoints.py'
    ) {
      categories.isApi = true;
    }

    // Architecture / Component Layers
    if (
      normalized.includes('/services/') ||
      normalized.includes('/service/') ||
      normalized.includes('/modules/') ||
      normalized.includes('/components/') ||
      normalized.includes('/layers/') ||
      normalized.includes('/src/') ||
      normalized.includes('/backend/') ||
      normalized.includes('/frontend/') ||
      normalized.includes('/core/') ||
      normalized.includes('/pkg/')
    ) {
      categories.isArchitecture = true;
    }

    // Source Code (General)
    const sourceExtensions = [
      '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs',
      '.py', '.pyw',
      '.java', '.kt', '.scala', '.groovy',
      '.go',
      '.rs',
      '.c', '.h', '.cpp', '.hpp', '.cc', '.cxx',
      '.cs', '.fs',
      '.php',
      '.rb',
      '.swift',
      '.dart',
      '.sh', '.bash', '.ps1'
    ];

    if (sourceExtensions.includes(ext) && !categories.isTesting) {
      categories.isSourceCode = true;
    }

    return categories;
  }

  /**
   * Computes the complete multi-category difference between two consecutive versions.
   */
  static computeVersionDiff({
    currentVersion,
    previousVersion = null,
    rawDiff = {},
    currentAnalysis = null
  }) {
    if (!previousVersion) {
      // V1: Initial version in retained window — No prior version available
      return {
        hasPreviousVersion: false,
        versionLabel: currentVersion.versionLabel || 'V1',
        versionIndex: currentVersion.versionIndex || 1,
        totalVersionsInWindow: currentVersion.totalVersions || 1,
        currentVersion: {
          versionLabel: currentVersion.versionLabel || 'V1',
          versionIndex: currentVersion.versionIndex || 1,
          fullSha: currentVersion.fullSha,
          shortSha: currentVersion.shortSha || (currentVersion.fullSha ? currentVersion.fullSha.substring(0, 7) : ''),
          message: currentVersion.message || 'Initial baseline version',
          author: currentVersion.author || 'Developer',
          date: currentVersion.date || new Date().toISOString(),
          branch: currentVersion.branch || 'main'
        },
        previousVersion: null,
        comparisonSource: 'Initial available version in this version window',
        note: 'Initial available version in this version window. No prior version available for comparison within this window.',
        totalFilesChanged: 0,
        totalAdditions: 0,
        totalDeletions: 0,
        filesAdded: [],
        filesModified: [],
        filesDeleted: [],
        filesRenamed: [],
        fileChanges: [],
        statSummary: '',
        rawDiffSnippet: '',
        activeCategoryNames: [],
        categorizedChanges: {
          sourceCode: { hasChanges: false, status: 'NOT_DETECTED', count: 0, files: [], summary: 'No prior version available.' },
          api: { hasChanges: false, status: 'NOT_DETECTED', count: 0, items: [], summary: 'No prior version available.' },
          database: { hasChanges: false, status: 'NOT_DETECTED', count: 0, items: [], summary: 'No prior version available.' },
          dependencies: { hasChanges: false, status: 'NOT_DETECTED', count: 0, items: [], summary: 'No prior version available.' },
          security: { hasChanges: false, status: 'NOT_DETECTED', count: 0, items: [], summary: 'No prior version available.' },
          configuration: { hasChanges: false, status: 'NOT_DETECTED', count: 0, files: [], summary: 'No prior version available.' },
          architecture: { hasChanges: false, status: 'NOT_DETECTED', count: 0, components: [], summary: 'No prior version available.' },
          workflows: { hasChanges: false, status: 'NOT_DETECTED', count: 0, flows: [], summary: 'No prior version available.' },
          testing: { hasChanges: false, status: 'NOT_DETECTED', count: 0, files: [], summary: 'No prior version available.' },
          documentation: { hasChanges: false, status: 'NOT_DETECTED', count: 0, files: [], summary: 'No prior version available.' }
        },
        summary: 'Initial repository baseline version. Represents complete repository state.'
      };
    }

    // Consecutive Version Transition: V(N-1) -> V(N)
    const fileChanges = rawDiff.fileChanges || [];
    const filesAdded = rawDiff.filesAdded || [];
    const filesModified = rawDiff.filesModified || [];
    const filesDeleted = rawDiff.filesDeleted || [];
    const filesRenamed = rawDiff.filesRenamed || [];
    const totalAdditions = rawDiff.totalAdditions || 0;
    const totalDeletions = rawDiff.totalDeletions || 0;
    const rawDiffSnippet = rawDiff.rawDiffSnippet || '';
    const statSummary = rawDiff.statSummary || '';

    // Classify all file changes into categories
    const sourceCodeFiles = [];
    const apiFiles = [];
    const dbFiles = [];
    const dependencyFiles = [];
    const securityFiles = [];
    const configFiles = [];
    const archFiles = [];
    const workflowFiles = [];
    const testFiles = [];
    const docFiles = [];

    for (const change of fileChanges) {
      const filePath = change.path || change.newPath || change.oldPath || '';
      const cat = this.categorizeFilePath(filePath);

      if (cat.isSourceCode) sourceCodeFiles.push(change);
      if (cat.isApi) apiFiles.push(change);
      if (cat.isDatabase) dbFiles.push(change);
      if (cat.isDependency) dependencyFiles.push(change);
      if (cat.isSecurity) securityFiles.push(change);
      if (cat.isConfiguration) configFiles.push(change);
      if (cat.isArchitecture) archFiles.push(change);
      if (cat.isWorkflow) workflowFiles.push(change);
      if (cat.isTesting) testFiles.push(change);
      if (cat.isDocumentation) docFiles.push(change);
    }

    // Extract detailed evidence for each category
    const categorizedChanges = {
      sourceCode: {
        hasChanges: sourceCodeFiles.length > 0,
        status: sourceCodeFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: sourceCodeFiles.length,
        files: sourceCodeFiles.map(f => ({ path: f.path || f.newPath, status: f.status, additions: f.additions, deletions: f.deletions })),
        summary: sourceCodeFiles.length > 0
          ? `${sourceCodeFiles.length} source code file(s) changed (${sourceCodeFiles.filter(f => f.status === 'added').length} added, ${sourceCodeFiles.filter(f => f.status === 'modified').length} modified, ${sourceCodeFiles.filter(f => f.status === 'deleted').length} deleted).`
          : 'No source code changes detected between these versions.'
      },
      api: {
        hasChanges: apiFiles.length > 0,
        status: apiFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: apiFiles.length,
        files: apiFiles.map(f => ({ path: f.path || f.newPath, status: f.status })),
        summary: apiFiles.length > 0
          ? `${apiFiles.length} API route / controller file(s) changed.`
          : 'No API route changes detected between these versions.'
      },
      database: {
        hasChanges: dbFiles.length > 0,
        status: dbFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: dbFiles.length,
        files: dbFiles.map(f => ({ path: f.path || f.newPath, status: f.status })),
        summary: dbFiles.length > 0
          ? `${dbFiles.length} database model(s) / schema / migration file(s) changed.`
          : 'No database schema changes detected between these versions.'
      },
      dependencies: {
        hasChanges: dependencyFiles.length > 0,
        status: dependencyFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: dependencyFiles.length,
        files: dependencyFiles.map(f => ({ path: f.path || f.newPath, status: f.status })),
        summary: dependencyFiles.length > 0
          ? `${dependencyFiles.length} package manifest / dependency file(s) modified.`
          : 'No dependency manifest changes detected between these versions.'
      },
      security: {
        hasChanges: securityFiles.length > 0,
        status: securityFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: securityFiles.length,
        files: securityFiles.map(f => ({ path: f.path || f.newPath, status: f.status })),
        summary: securityFiles.length > 0
          ? `${securityFiles.length} security / authentication file(s) changed.`
          : 'No security control changes detected between these versions.'
      },
      configuration: {
        hasChanges: configFiles.length > 0,
        status: configFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: configFiles.length,
        files: configFiles.map(f => ({ path: f.path || f.newPath, status: f.status })),
        summary: configFiles.length > 0
          ? `${configFiles.length} configuration file(s) modified.`
          : 'No configuration changes detected between these versions.'
      },
      architecture: {
        hasChanges: archFiles.length > 0,
        status: archFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: archFiles.length,
        files: archFiles.map(f => ({ path: f.path || f.newPath, status: f.status })),
        summary: archFiles.length > 0
          ? `${archFiles.length} architectural component / layer file(s) affected.`
          : 'No architecture structure changes detected between these versions.'
      },
      workflows: {
        hasChanges: workflowFiles.length > 0,
        status: workflowFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: workflowFiles.length,
        files: workflowFiles.map(f => ({ path: f.path || f.newPath, status: f.status })),
        summary: workflowFiles.length > 0
          ? `${workflowFiles.length} CI/CD workflow / pipeline file(s) modified.`
          : 'No workflow changes detected between these versions.'
      },
      testing: {
        hasChanges: testFiles.length > 0,
        status: testFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: testFiles.length,
        files: testFiles.map(f => ({ path: f.path || f.newPath, status: f.status })),
        summary: testFiles.length > 0
          ? `${testFiles.length} test suite file(s) added/modified/deleted.`
          : 'No test suite changes detected between these versions.'
      },
      documentation: {
        hasChanges: docFiles.length > 0,
        status: docFiles.length > 0 ? 'CONFIRMED' : 'NOT_DETECTED',
        count: docFiles.length,
        files: docFiles.map(f => ({ path: f.path || f.newPath, status: f.status })),
        summary: docFiles.length > 0
          ? `${docFiles.length} documentation file(s) updated.`
          : 'No documentation changes detected between these versions.'
      }
    };

    const activeCategoryNames = Object.keys(categorizedChanges).filter(k => categorizedChanges[k].hasChanges);

    const prevShortSha = previousVersion.shortSha || (previousVersion.fullSha ? previousVersion.fullSha.substring(0, 7) : 'prior');
    const currShortSha = currentVersion.shortSha || (currentVersion.fullSha ? currentVersion.fullSha.substring(0, 7) : 'head');
    const prevLabel = previousVersion.versionLabel || 'V1';
    const currLabel = currentVersion.versionLabel || 'V2';

    const summary = `${currLabel} represents the complete repository state at commit ${currShortSha}. Compared to ${prevLabel} (${prevShortSha}), ${fileChanges.length} file(s) changed (+${totalAdditions} / -${totalDeletions} lines) across ${activeCategoryNames.length} domain categories (${activeCategoryNames.join(', ') || 'file edits'}).`;

    return {
      hasPreviousVersion: true,
      versionLabel: currLabel,
      versionIndex: currentVersion.versionIndex || 2,
      totalVersionsInWindow: currentVersion.totalVersions || 5,
      currentVersion: {
        versionLabel: currLabel,
        versionIndex: currentVersion.versionIndex || 2,
        fullSha: currentVersion.fullSha,
        shortSha: currShortSha,
        message: currentVersion.message || 'Commit',
        author: currentVersion.author || 'Developer',
        date: currentVersion.date || new Date().toISOString(),
        branch: currentVersion.branch || 'main'
      },
      previousVersion: {
        versionLabel: prevLabel,
        versionIndex: previousVersion.versionIndex || 1,
        fullSha: previousVersion.fullSha,
        shortSha: prevShortSha,
        message: previousVersion.message || 'Commit',
        author: previousVersion.author || 'Developer',
        date: previousVersion.date || new Date().toISOString(),
        branch: previousVersion.branch || 'main'
      },
      comparisonSource: `git diff ${prevShortSha}..${currShortSha}`,
      totalFilesChanged: fileChanges.length,
      totalAdditions,
      totalDeletions,
      filesAdded,
      filesModified,
      filesDeleted,
      filesRenamed,
      fileChanges,
      statSummary,
      rawDiffSnippet: rawDiffSnippet.substring(0, 5000),
      activeCategoryNames,
      categorizedChanges,
      summary
    };
  }
}
