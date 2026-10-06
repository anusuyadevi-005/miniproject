import crypto from 'crypto';
import { SDIDManager } from '../sdid/sdidManager.js';

export const ENTITY_TYPES = {
  REPOSITORY: 'Repository',
  PROJECT: 'Project',
  MODULE: 'Module',
  FILE: 'File',
  CLASS: 'Class',
  FUNCTION: 'Function',
  API: 'API',
  DATABASE: 'Database',
  TABLE: 'Table',
  COLLECTION: 'Collection',
  FIELD: 'Field',
  SERVICE: 'Service',
  COMPONENT: 'Component',
  DEPENDENCY: 'Dependency',
  CONFIGURATION: 'Configuration',
  TEST: 'Test',
  REQUIREMENT: 'Requirement',
  DOCUMENT: 'Document',
  WORKFLOW: 'Workflow',
  USER_ROLE: 'UserRole',
  EXTERNAL_SERVICE: 'ExternalService',
  DEPLOYMENT_COMPONENT: 'DeploymentComponent'
};

export const RELATIONSHIP_TYPES = {
  CONTAINS: 'CONTAINS',
  IMPORTS: 'IMPORTS',
  CALLS: 'CALLS',
  DEPENDS_ON: 'DEPENDS_ON',
  IMPLEMENTS: 'IMPLEMENTS',
  EXTENDS: 'EXTENDS',
  EXPOSES: 'EXPOSES',
  CONSUMES: 'CONSUMES',
  READS: 'READS',
  WRITES: 'WRITES',
  AUTHENTICATES: 'AUTHENTICATES',
  VALIDATES: 'VALIDATES',
  TESTS: 'TESTS',
  CONFIGURES: 'CONFIGURES',
  DEPLOYS: 'DEPLOYS',
  DOCUMENTS: 'DOCUMENTS',
  IMPLEMENTS_REQUIREMENT: 'IMPLEMENTS_REQUIREMENT',
  AFFECTS: 'AFFECTS'
};

export class RepositoryKnowledgeGraph {
  constructor(repositoryId = 'repo_default', repositoryName = 'Repository') {
    this.repositoryId = repositoryId;
    this.repositoryName = repositoryName;
    this.entities = new Map(); // id -> Entity
    this.edges = []; // { id, from, to, relationship, metadata }
    this.outgoing = new Map(); // id -> [edge]
    this.incoming = new Map(); // id -> [edge]
    this.sdidMap = new Map(); // sdid -> entityId
    this.createdAt = new Date().toISOString();

    // Register root repository entity
    this.addEntity({
      id: repositoryId,
      name: repositoryName,
      type: ENTITY_TYPES.REPOSITORY,
      metadata: { repositoryId }
    });
  }

  generateSDID(type, name = '') {
    const prefixMap = {
      [ENTITY_TYPES.REPOSITORY]: 'REPO',
      [ENTITY_TYPES.MODULE]: 'MOD',
      [ENTITY_TYPES.FILE]: 'FILE',
      [ENTITY_TYPES.CLASS]: 'CLS',
      [ENTITY_TYPES.FUNCTION]: 'FN',
      [ENTITY_TYPES.API]: 'API',
      [ENTITY_TYPES.DATABASE]: 'DB',
      [ENTITY_TYPES.TABLE]: 'TBL',
      [ENTITY_TYPES.COLLECTION]: 'COL',
      [ENTITY_TYPES.SERVICE]: 'SVC',
      [ENTITY_TYPES.COMPONENT]: 'CMP',
      [ENTITY_TYPES.REQUIREMENT]: 'REQ',
      [ENTITY_TYPES.WORKFLOW]: 'WF',
      [ENTITY_TYPES.USER_ROLE]: 'ROLE',
      [ENTITY_TYPES.DOCUMENT]: 'DOC',
      [ENTITY_TYPES.TEST]: 'TST',
      [ENTITY_TYPES.CONFIGURATION]: 'CFG'
    };

    const prefix = prefixMap[type] || 'ENT';
    const cleanName = name.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10);
    const randomHex = crypto.randomBytes(2).toString('hex').toUpperCase();
    return `SDID-${prefix}-${cleanName ? cleanName + '-' : ''}${randomHex}`;
  }

  addEntity(entity) {
    if (!entity || !entity.id) {
      throw new Error('Entity must have an id.');
    }

    const type = entity.type || ENTITY_TYPES.COMPONENT;
    const sdid = entity.sdid || this.generateSDID(type, entity.name || entity.id);

    const fullEntity = {
      id: String(entity.id),
      sdid,
      name: entity.name || entity.id,
      type,
      path: entity.path || entity.filePath || '',
      line: entity.line || null,
      confidence: entity.confidence ?? 1.0,
      evidence: entity.evidence || [entity.path || 'repository'],
      metadata: entity.metadata || {}
    };

    this.entities.set(fullEntity.id, fullEntity);
    this.sdidMap.set(sdid, fullEntity.id);

    // Register with SDIDManager for continuous ASDSE synchronization
    try {
      SDIDManager.registerSDID({
        sdid,
        symbolName: fullEntity.name,
        symbolType: fullEntity.type,
        filePath: fullEntity.path,
        signature: fullEntity.metadata?.signature || fullEntity.name
      });
    } catch (_) {}

    return fullEntity;
  }

  addEdge(fromId, toId, relationship, metadata = {}) {
    if (!fromId || !toId || !relationship) return null;

    const from = String(fromId);
    const to = String(toId);

    // Auto-create stub entities if not existing yet
    if (!this.entities.has(from)) {
      this.addEntity({ id: from, name: from, type: ENTITY_TYPES.COMPONENT });
    }
    if (!this.entities.has(to)) {
      this.addEntity({ id: to, name: to, type: ENTITY_TYPES.COMPONENT });
    }

    const edgeId = `edge_${crypto.createHash('md5').update(`${from}_${relationship}_${to}`).digest('hex').substring(0, 10)}`;

    // Avoid duplicate edges
    const exists = this.edges.some(e => e.from === from && e.to === to && e.relationship === relationship);
    if (exists) return null;

    const edge = {
      id: edgeId,
      from,
      to,
      relationship,
      metadata
    };

    this.edges.push(edge);

    if (!this.outgoing.has(from)) this.outgoing.set(from, []);
    this.outgoing.get(from).push(edge);

    if (!this.incoming.has(to)) this.incoming.set(to, []);
    this.incoming.get(to).push(edge);

    return edge;
  }

  getEntity(id) {
    return this.entities.get(String(id)) || null;
  }

  getEntityBySDID(sdid) {
    const id = this.sdidMap.get(sdid);
    return id ? this.entities.get(id) : null;
  }

  findEntitiesByType(type) {
    return Array.from(this.entities.values()).filter(e => e.type === type);
  }

  getOutgoingEdges(entityId, relationship = null) {
    const edges = this.outgoing.get(String(entityId)) || [];
    return relationship ? edges.filter(e => e.relationship === relationship) : edges;
  }

  getIncomingEdges(entityId, relationship = null) {
    const edges = this.incoming.get(String(entityId)) || [];
    return relationship ? edges.filter(e => e.relationship === relationship) : edges;
  }

  /**
   * Traverses a full traceability chain for a given requirement.
   * Requirement -> Module -> API -> Code -> Test -> Documentation
   */
  getTraceabilityMatrix() {
    const requirements = this.findEntitiesByType(ENTITY_TYPES.REQUIREMENT);
    const matrix = [];

    for (const req of requirements) {
      const implementedBy = this.getIncomingEdges(req.id, RELATIONSHIP_TYPES.IMPLEMENTS_REQUIREMENT)
        .concat(this.getOutgoingEdges(req.id, RELATIONSHIP_TYPES.IMPLEMENTS));

      const modules = new Set();
      const apis = new Set();
      const codeEntities = new Set();
      const tests = new Set();
      const docs = new Set();

      for (const edge of implementedBy) {
        const targetId = edge.from === req.id ? edge.to : edge.from;
        const target = this.getEntity(targetId);
        if (!target) continue;

        if (target.type === ENTITY_TYPES.MODULE || target.type === ENTITY_TYPES.SERVICE) modules.add(target.name);
        if (target.type === ENTITY_TYPES.API) apis.add(target.name);
        if (target.type === ENTITY_TYPES.CLASS || target.type === ENTITY_TYPES.FUNCTION) codeEntities.add(`${target.name} (${target.path})`);

        // Check tests connected to this target
        const testEdges = this.getIncomingEdges(target.id, RELATIONSHIP_TYPES.TESTS);
        testEdges.forEach(te => {
          const testEnt = this.getEntity(te.from);
          if (testEnt) tests.add(testEnt.name);
        });

        // Check documentation connected to this target
        const docEdges = this.getIncomingEdges(target.id, RELATIONSHIP_TYPES.DOCUMENTS);
        docEdges.forEach(de => {
          const docEnt = this.getEntity(de.from);
          if (docEnt) docs.add(docEnt.name);
        });
      }

      matrix.push({
        requirementId: req.sdid || req.id,
        requirementName: req.name,
        description: req.metadata?.description || req.name,
        confidence: req.confidence,
        modules: Array.from(modules),
        apis: Array.from(apis),
        code: Array.from(codeEntities),
        tests: Array.from(tests),
        documents: Array.from(docs),
        evidence: req.evidence
      });
    }

    return matrix;
  }

  toJSON() {
    return {
      repositoryId: this.repositoryId,
      repositoryName: this.repositoryName,
      createdAt: this.createdAt,
      stats: {
        totalEntities: this.entities.size,
        totalEdges: this.edges.length,
        types: Array.from(this.entities.values()).reduce((acc, e) => {
          acc[e.type] = (acc[e.type] || 0) + 1;
          return acc;
        }, {})
      },
      entities: Array.from(this.entities.values()),
      edges: this.edges
    };
  }
}
