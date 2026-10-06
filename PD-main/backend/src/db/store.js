import crypto from 'crypto';

class DatabaseStore {
  constructor() {
    this.users = [
      { id: 'usr_1', name: 'Alex Morgan', email: 'alex@dev.io', role: 'Lead Architect', token: 'mock-jwt-token-123' },
      { id: 'usr_2', name: 'Sarah Chen', email: 'sarah@dev.io', role: 'Senior Engineer', token: 'mock-jwt-token-456' }
    ];

    this.projects = [
      {
        id: 'proj_1',
        name: 'Auth & User Services System',
        repoUrl: 'https://github.com/org/user-service',
        branch: 'main',
        lastScan: new Date().toISOString(),
        docCoverage: 96,
        syncScore: 97,
        status: 'Synchronized',
        language: 'TypeScript / Node.js'
      }
    ];

    this.commits = [
      {
        id: 'cmt_001',
        projectId: 'proj_1',
        hash: 'b9c8a71',
        message: 'refactor(UserService): add MFA token challenge parameter to authenticateUser',
        author: 'Alex Morgan',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        changesCount: 2,
        sdidImpacted: ['SDID-00041']
      }
    ];

    // SDID Multi-Artifact Mapping (Dynamic Repository SDID Registry)
    this.sdidMapping = [];
    this.documentationBlocks = [];
    this.documentationDNA = [];
    this.dependencyGraph = { nodes: [], edges: [] };
    this.versionHistory = [];

    this.reports = [];
    this.intelligentDocs = [];
    this.repositoryDocumentation = [];
    this.semanticEntities = [];
    this.semanticEntityHistory = [];
    this.semanticRelationships = [];
  }

  generateId(prefix = 'id') {
    return `${prefix}_${crypto.randomBytes(4).toString('hex')}`;
  }
}

export const db = new DatabaseStore();
