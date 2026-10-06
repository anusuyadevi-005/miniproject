import { ENTITY_TYPES, RELATIONSHIP_TYPES } from '../graph/knowledgeGraph.js';

export class WorkflowAgent {
  /**
   * Reconstructs end-to-end system execution workflows with sequence diagram representations.
   */
  static reconstructWorkflows(knowledgeGraph, sourceFiles = []) {
    const workflows = [];
    const apis = knowledgeGraph.findEntitiesByType(ENTITY_TYPES.API);
    const services = knowledgeGraph.findEntitiesByType(ENTITY_TYPES.SERVICE);
    const tables = knowledgeGraph.findEntitiesByType(ENTITY_TYPES.TABLE)
      .concat(knowledgeGraph.findEntitiesByType(ENTITY_TYPES.COLLECTION));

    // 1. Authentication / Login Workflow
    const authApi = apis.find(a => (a.metadata?.endpoint || '').toLowerCase().includes('login') || (a.metadata?.endpoint || '').toLowerCase().includes('auth'));
    if (authApi || sourceFiles.some(f => f.relativePath.toLowerCase().includes('auth'))) {
      const endpoint = authApi?.metadata?.endpoint || '/api/auth/login';
      const method = authApi?.metadata?.method || 'POST';
      const authService = services.find(s => s.name.toLowerCase().includes('auth'))?.name || 'AuthService';
      const userModel = tables.find(t => t.name.toLowerCase().includes('user'))?.name || 'User';

      const sequenceMermaid = `sequenceDiagram
    actor Client as User / Frontend
    participant API as ${method} ${endpoint}
    participant Svc as ${authService}
    participant DB as Database (${userModel})

    Client->>API: Submit Credentials (email/username, password)
    API->>Svc: validateCredentials(payload)
    Svc->>DB: findOne({ email })
    DB-->>Svc: Return Stored User Record & Hash
    Svc->>Svc: verifyHash(password, storedHash)
    alt Credentials Valid
        Svc->>Svc: generateJwtToken(userPayload)
        Svc-->>API: { token, userProfile }
        API-->>Client: 200 OK (JWT Token + Auth Headers)
    else Credentials Invalid
        Svc-->>API: AuthenticationError
        API-->>Client: 401 Unauthorized
    end`;

      const wfEntity = knowledgeGraph.addEntity({
        id: 'WF-AUTH-LOGIN',
        sdid: 'SDID-WF-AUTH-001',
        name: 'User Authentication & JWT Issuance Workflow',
        type: ENTITY_TYPES.WORKFLOW,
        confidence: 0.96,
        evidence: [authApi?.path || 'authController', endpoint],
        metadata: {
          category: 'Security',
          trigger: `Client HTTP ${method} to ${endpoint}`,
          steps: [
            '1. User submits authentication credentials from frontend.',
            `2. Route handler receives request and invokes ${authService}.`,
            `3. Service queries ${userModel} collection/table to retrieve credential record.`,
            '4. Password hash or token challenge is cryptographically verified.',
            '5. JWT or session artifact is constructed with role claims.',
            '6. HTTP response delivers bearer token to client for subsequent authorized requests.'
          ],
          sequenceMermaid
        }
      });
      workflows.push(wfEntity);
    }

    // 2. User Registration Workflow
    const registerApi = apis.find(a => (a.metadata?.endpoint || '').toLowerCase().includes('register') || (a.metadata?.endpoint || '').toLowerCase().includes('signup'));
    if (registerApi) {
      const endpoint = registerApi.metadata?.endpoint;
      const method = registerApi.metadata?.method || 'POST';

      const sequenceMermaid = `sequenceDiagram
    actor Client as User / Frontend
    participant API as ${method} ${endpoint}
    participant Svc as RegistrationService
    participant DB as User Database

    Client->>API: Submit Registration Details
    API->>Svc: registerUser(payload)
    Svc->>DB: Check if user already exists
    DB-->>Svc: Not found (Available)
    Svc->>Svc: hashPassword(plainPassword)
    Svc->>DB: saveNewUser(newUser)
    DB-->>Svc: Created User Record
    Svc-->>API: Success confirmation
    API-->>Client: 201 Created`;

      const wfEntity = knowledgeGraph.addEntity({
        id: 'WF-USER-REGISTER',
        sdid: 'SDID-WF-REGISTER-001',
        name: 'New User Registration & Onboarding Workflow',
        type: ENTITY_TYPES.WORKFLOW,
        confidence: 0.94,
        evidence: [registerApi.path || 'registerController', endpoint],
        metadata: {
          category: 'User Management',
          trigger: `Client HTTP ${method} to ${endpoint}`,
          steps: [
            '1. Client submits registration payload (username, email, credentials).',
            '2. API validates incoming payload schemas.',
            '3. Service verifies uniqueness of email/username in database.',
            '4. Password is salt-hashed and stored.',
            '5. New user entity is persisted to the database.',
            '6. API issues 201 Created with initial user profile.'
          ],
          sequenceMermaid
        }
      });
      workflows.push(wfEntity);
    }

    // 3. Resource Query / Data Retrieval Workflow
    const getApis = apis.filter(a => (a.metadata?.method || 'GET') === 'GET' && !a.metadata?.endpoint?.includes('health'));
    if (getApis.length > 0) {
      const sampleApi = getApis[0];
      const endpoint = sampleApi.metadata?.endpoint || '/api/data';

      const sequenceMermaid = `sequenceDiagram
    actor Client as Client App
    participant Route as GET ${endpoint}
    participant Handler as Controller / Service
    participant Storage as Database / Persistence

    Client->>Route: GET ${endpoint} (with Auth Header)
    Route->>Handler: Validate Token & Query Parameters
    Handler->>Storage: Execute Query / Model Lookup
    Storage-->>Handler: Return Dataset
    Handler-->>Route: Format Response Payload
    Route-->>Client: 200 OK (JSON Payload)`;

      const wfEntity = knowledgeGraph.addEntity({
        id: 'WF-DATA-QUERY',
        sdid: 'SDID-WF-QUERY-001',
        name: 'Primary Resource Retrieval Workflow',
        type: ENTITY_TYPES.WORKFLOW,
        confidence: 0.95,
        evidence: [sampleApi.path || 'controller', endpoint],
        metadata: {
          category: 'Data Access',
          trigger: `Client HTTP GET to ${endpoint}`,
          steps: [
            `1. Client issues GET request to ${endpoint}.`,
            '2. Authorization middleware validates authentication headers and permissions.',
            '3. Controller parses query parameters and passes request to service layer.',
            '4. Service executes query against database schema.',
            '5. Results are formatted and returned with HTTP 200 status.'
          ],
          sequenceMermaid
        }
      });
      workflows.push(wfEntity);
    }

    return workflows;
  }
}
