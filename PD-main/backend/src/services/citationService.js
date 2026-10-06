export class CitationService {
  /**
   * Scans generated answer for codebase entity names and file paths, building structured reference lists.
   * @param {string} answer - Generated text reply
   * @param {Object} knowledgeGraph - Repository Knowledge Model
   * @returns {Array} List of resolved clickable source links
   */
  static extractCitations(answer, knowledgeGraph) {
    if (!knowledgeGraph || !answer) return [];

    const citations = [];
    const lowerAnswer = answer.toLowerCase();

    // 1. Match File Paths
    const files = knowledgeGraph.files || [];
    files.forEach(f => {
      const pathToken = f.filePath.toLowerCase();
      const nameToken = f.fileName.toLowerCase();
      if (lowerAnswer.includes(pathToken) || lowerAnswer.includes(nameToken)) {
        citations.push({
          type: 'File',
          name: f.fileName,
          path: f.filePath,
          label: f.filePath
        });
      }
    });

    // 2. Match Class Names
    const classes = knowledgeGraph.classes || [];
    classes.forEach(c => {
      const classToken = c.className.toLowerCase();
      if (lowerAnswer.includes(classToken)) {
        citations.push({
          type: 'Class',
          name: c.className,
          path: c.filePath,
          label: `class ${c.className}`
        });
      }
    });

    // 3. Match API Routes
    const apis = knowledgeGraph.apis || [];
    apis.forEach(api => {
      const routeToken = (api.route || '').toLowerCase();
      if (routeToken && routeToken.length > 3 && lowerAnswer.includes(routeToken)) {
        citations.push({
          type: 'API',
          name: `${api.method} ${api.route}`,
          path: api.controller || 'router',
          label: `${api.method} ${api.route}`
        });
      }
    });

    // 4. Match Database collections
    const database = knowledgeGraph.database || {};
    const collections = Array.isArray(database) ? database : (database.collections || []);
    collections.forEach(coll => {
      const collName = (coll.name || coll.collection || '').toLowerCase();
      if (collName && lowerAnswer.includes(collName)) {
        citations.push({
          type: 'Database',
          name: coll.name || coll.collection,
          path: 'Database Schema',
          label: `Collection: ${coll.name || coll.collection}`
        });
      }
    });

    // Remove duplicate citations
    const seen = new Set();
    return citations.filter(c => {
      const key = `${c.type}_${c.name}_${c.path}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Builds a workflow flow trace mapping if requested
   */
  static buildCrossReferenceTrace(query, knowledgeGraph) {
    if (!knowledgeGraph) return null;

    const lowerQuery = query.toLowerCase();

    // Check if query is about login or authentication flow
    if (lowerQuery.includes('auth') || lowerQuery.includes('login')) {
      const authApi = (knowledgeGraph.apis || []).find(a => a.route?.includes('auth') || a.route?.includes('login'));
      const authController = (knowledgeGraph.classes || []).find(c => c.className?.toLowerCase().includes('auth') || c.className?.toLowerCase().includes('user'));
      const dbCollection = (knowledgeGraph.database?.collections || []).find(c => c.name?.toLowerCase().includes('user') || c.name?.toLowerCase().includes('session'));

      if (authApi || authController || dbCollection) {
        return {
          title: 'Authentication Trace Path',
          nodes: [
            { label: 'Client App', type: 'Client' },
            { label: authApi ? `${authApi.method} ${authApi.route}` : 'POST /api/auth/login', type: 'API' },
            { label: authController ? authController.className : 'AuthController', type: 'Controller' },
            { label: 'UserService / AuthEngine', type: 'Service' },
            { label: dbCollection ? dbCollection.name : 'users / sessions', type: 'Database' }
          ]
        };
      }
    }

    return null;
  }
}
