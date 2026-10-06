import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '../graph/knowledgeGraph.js';

export class RequirementsAgent {
  /**
   * Automatically reconstructs Functional and Non-Functional requirements from repository evidence.
   */
  static reconstructRequirements(knowledgeGraph, inventory, analysisData = {}) {
    const functionalRequirements = [];
    const nonFunctionalRequirements = [];

    const routes = knowledgeGraph.findEntitiesByType(ENTITY_TYPES.API);
    const classes = knowledgeGraph.findEntitiesByType(ENTITY_TYPES.CLASS);
    const services = knowledgeGraph.findEntitiesByType(ENTITY_TYPES.SERVICE);
    const tables = knowledgeGraph.findEntitiesByType(ENTITY_TYPES.TABLE)
      .concat(knowledgeGraph.findEntitiesByType(ENTITY_TYPES.COLLECTION));

    let frCounter = 1;

    // ─── 1. Functional Requirements from API Routes & Controllers ──────
    for (const route of routes) {
      const endpoint = route.metadata?.endpoint || route.name;
      const method = route.metadata?.method || 'GET';
      const handler = route.metadata?.handler || route.name;
      const filePath = route.path || '';

      // Deduce functional purpose from endpoint & method
      let action = 'manage resources';
      let entityName = endpoint.split('/').filter(p => p && !p.startsWith(':'))[1] || 'resource';

      if (endpoint.includes('auth') || endpoint.includes('login')) {
        action = method === 'POST' ? 'allow users to authenticate and receive an access token' : 'verify user session';
        entityName = 'Authentication';
      } else if (endpoint.includes('register') || endpoint.includes('signup')) {
        action = 'allow new users to register an account';
        entityName = 'User Registration';
      } else if (endpoint.includes('user')) {
        action = method === 'GET' ? 'retrieve user profiles' : method === 'POST' ? 'create a user profile' : 'update user information';
        entityName = 'User Management';
      } else if (method === 'GET') {
        action = `query and retrieve ${entityName} data`;
      } else if (method === 'POST') {
        action = `create and store new ${entityName} records`;
      } else if (method === 'PUT' || method === 'PATCH') {
        action = `modify existing ${entityName} records`;
      } else if (method === 'DELETE') {
        action = `delete specified ${entityName} records`;
      }

      const reqId = `FR-${String(frCounter++).padStart(3, '0')}`;
      const description = `The system shall ${action} via ${method} ${endpoint}.`;

      const frEntity = knowledgeGraph.addEntity({
        id: reqId,
        sdid: `SDID-REQ-${reqId}`,
        name: `${entityName} - ${method} ${endpoint}`,
        type: ENTITY_TYPES.REQUIREMENT,
        path: filePath,
        confidence: 0.95,
        evidence: [filePath, `${method} ${endpoint}`],
        metadata: {
          category: 'Functional',
          status: 'VERIFIED',
          description,
          action,
          endpoint,
          method,
          handler
        }
      });

      // Link Requirement <-> API route
      knowledgeGraph.addEdge(route.id, frEntity.id, RELATIONSHIP_TYPES.IMPLEMENTS_REQUIREMENT);
      functionalRequirements.push(frEntity);
    }

    // ─── 2. Non-Functional Requirements based on Concrete Evidence ─────
    let nfrCounter = 1;

    // Security & Authentication NFR
    const hasAuth = routes.some(r => r.metadata?.endpoint?.includes('auth') || r.metadata?.endpoint?.includes('login')) ||
                    inventory.files?.some(f => f.relativePath.toLowerCase().includes('jwt') || f.relativePath.toLowerCase().includes('auth'));
    if (hasAuth) {
      const authFiles = inventory.files?.filter(f => f.relativePath.toLowerCase().includes('auth') || f.relativePath.toLowerCase().includes('jwt')).map(f => f.relativePath) || [];
      const nfrId = `NFR-${String(nfrCounter++).padStart(3, '0')}`;
      const nfrEntity = knowledgeGraph.addEntity({
        id: nfrId,
        sdid: `SDID-REQ-${nfrId}`,
        name: 'Authentication & Session Security',
        type: ENTITY_TYPES.REQUIREMENT,
        confidence: 0.96,
        evidence: authFiles.slice(0, 5),
        metadata: {
          category: 'Non-Functional',
          subCategory: 'Security',
          status: 'VERIFIED',
          description: 'The system shall enforce secure user authentication and session management using tokens/credentials.'
        }
      });
      nonFunctionalRequirements.push(nfrEntity);
    }

    // Data Persistence & Integrity NFR
    if (tables.length > 0) {
      const nfrId = `NFR-${String(nfrCounter++).padStart(3, '0')}`;
      const nfrEntity = knowledgeGraph.addEntity({
        id: nfrId,
        sdid: `SDID-REQ-${nfrId}`,
        name: 'Data Persistence & Relational/Document Integrity',
        type: ENTITY_TYPES.REQUIREMENT,
        confidence: 0.98,
        evidence: tables.map(t => t.path || t.name).slice(0, 5),
        metadata: {
          category: 'Non-Functional',
          subCategory: 'Data Integrity',
          status: 'VERIFIED',
          description: `The system shall maintain structured data persistence across ${tables.length} entity schemas with defined schema constraints.`
        }
      });
      nonFunctionalRequirements.push(nfrEntity);
    }

    // CI/CD & Deployment NFR
    if (inventory.metadata?.dockerExists || inventory.metadata?.githubActionsExists) {
      const evidence = [];
      if (inventory.metadata.dockerExists) evidence.push('Dockerfile / docker-compose.yml');
      if (inventory.metadata.githubActionsExists) evidence.push('.github/workflows');

      const nfrId = `NFR-${String(nfrCounter++).padStart(3, '0')}`;
      const nfrEntity = knowledgeGraph.addEntity({
        id: nfrId,
        sdid: `SDID-REQ-${nfrId}`,
        name: 'Automated Build, Containerization & CI/CD',
        type: ENTITY_TYPES.REQUIREMENT,
        confidence: 0.99,
        evidence,
        metadata: {
          category: 'Non-Functional',
          subCategory: 'DevOps / Deployability',
          status: 'VERIFIED',
          description: 'The system shall support reproducible containerized deployment and automated build execution via CI/CD pipelines.'
        }
      });
      nonFunctionalRequirements.push(nfrEntity);
    }

    return {
      functional: functionalRequirements,
      nonFunctional: nonFunctionalRequirements,
      totalCount: functionalRequirements.length + nonFunctionalRequirements.length
    };
  }
}
