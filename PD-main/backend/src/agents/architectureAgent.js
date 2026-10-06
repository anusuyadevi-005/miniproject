import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '../graph/knowledgeGraph.js';

export class ArchitectureAgent {
  /**
   * Reconstructs the actual software architecture pattern, layers, and physical topologies.
   */
  static reconstructArchitecture(knowledgeGraph, inventory, techStack = {}) {
    const files = inventory.files || [];
    const filePaths = files.map(f => f.relativePath.toLowerCase());
    const inventoryText = filePaths.join(' ');

    // ─── 1. Determine Architecture Style ───────────────────────────────
    let primaryStyle = 'Modular Monolith';
    const detectedPatterns = [];
    const evidence = [];

    const hasFrontend = filePaths.some(p => p.includes('frontend') || p.includes('src/components') || p.includes('src/pages') || p.includes('client'));
    const hasBackend = filePaths.some(p => p.includes('backend') || p.includes('server') || p.includes('api') || p.includes('controllers'));
    const hasMicroservices = filePaths.some(p => p.includes('services/') || p.includes('microservices/') || p.includes('docker-compose') && files.some(f => f.relativePath.split('/').length > 3));
    const hasCleanArch = filePaths.some(p => p.includes('domain') && p.includes('usecase') || p.includes('entities') && p.includes('interfaces'));
    const hasMvc = filePaths.some(p => p.includes('controller') && p.includes('model') && (p.includes('view') || hasFrontend));
    const hasEventDriven = filePaths.some(p => p.includes('kafka') || p.includes('rabbitmq') || p.includes('events') || p.includes('pubsub'));

    if (hasFrontend && hasBackend) {
      detectedPatterns.push('Client-Server (Decoupled Frontend & Backend)');
      evidence.push('Presence of distinct presentation components and API backend server tiers.');
    }

    if (hasCleanArch) {
      primaryStyle = 'Clean / Hexagonal Architecture';
      detectedPatterns.push('Clean Architecture (Domain, UseCases, Repositories, Interfaces)');
      evidence.push('Structural isolation of domain business logic from data access interfaces.');
    } else if (hasMvc) {
      primaryStyle = 'MVC / Layered Architecture';
      detectedPatterns.push('Model-View-Controller (MVC)');
      evidence.push('Organized separation across Controllers, Models, and Views/UI components.');
    } else if (hasMicroservices) {
      primaryStyle = 'Microservice Architecture';
      detectedPatterns.push('Microservices');
      evidence.push('Independent service boundaries with containerized configuration.');
    } else {
      primaryStyle = 'Layered Architecture';
      detectedPatterns.push('Layered Architecture (Presentation -> Service -> Data Access)');
      evidence.push('Tiered module structure separating routes, controllers, services, and models.');
    }

    if (hasEventDriven) {
      detectedPatterns.push('Event-Driven Messaging Architecture');
    }

    // ─── 2. Logical Architecture Layers ────────────────────────────────
    const logicalLayers = [
      {
        name: 'Presentation & Interface Tier',
        components: hasFrontend ? ['Web Client UI', 'Interactive Components', 'Routing Navigation'] : ['API Gateway', 'Route Handlers'],
        responsibilities: ['User interaction', 'Input rendering', 'HTTP request dispatching']
      },
      {
        name: 'API & Orchestration Tier',
        components: ['REST Controllers', 'Request Validation Middleware', 'Authentication Guards'],
        responsibilities: ['HTTP request validation', 'Security policy enforcement', 'Service delegation']
      },
      {
        name: 'Business Logic & Domain Tier',
        components: ['Domain Services', 'Business Logic Engines', 'AST / Semantic Analyzers'],
        responsibilities: ['Core domain calculations', 'Workflow execution', 'Business rules validation']
      },
      {
        name: 'Data Access & Persistence Tier',
        components: ['Repositories', 'Data Models / Entities', 'ORM Mappings'],
        responsibilities: ['Database query execution', 'Schema integrity', 'Transaction management']
      },
      {
        name: 'Storage & Infrastructure Tier',
        components: [techStack.database || 'Database Storage', 'Cache / State Store', 'File System'],
        responsibilities: ['Persistent storage', 'Record retrieval', 'State durability']
      }
    ];

    const defaultRuntime = filePaths.some(p => p.endsWith('.py')) ? 'Flask / Python Web Service'
      : filePaths.some(p => p.endsWith('.go')) ? 'Go Application Service'
      : filePaths.some(p => p.endsWith('.java')) ? 'Spring Boot / Java Service'
      : filePaths.some(p => p.endsWith('.js') || p.endsWith('.ts')) ? 'Node.js / Express Application Service'
      : 'Application Service Runtime';

    const physicalNodes = [
      {
        node: 'Client Tier',
        description: 'Web Browser / Client Applications communicating via HTTP / HTTPS'
      },
      {
        node: 'Reverse Proxy / Ingress',
        description: inventoryText.includes('nginx') ? 'Nginx Web Server & Reverse Proxy' : 'API Gateway / Host Ingress Router'
      },
      {
        node: 'Application Server',
        description: `${techStack.backendFramework || defaultRuntime}`
      },
      {
        node: 'Database Engine',
        description: techStack.database || 'Relational / Document Database Management System'
      }
    ];

    const archEntity = knowledgeGraph.addEntity({
      id: 'ARCH-SYS-001',
      sdid: 'SDID-ARCH-001',
      name: `${primaryStyle} System Specification`,
      type: ENTITY_TYPES.COMPONENT,
      confidence: 0.95,
      evidence,
      metadata: {
        primaryStyle,
        detectedPatterns,
        logicalLayers,
        physicalNodes
      }
    });

    return {
      primaryStyle,
      detectedPatterns,
      logicalLayers,
      physicalNodes,
      evidence,
      entity: archEntity
    };
  }
}
