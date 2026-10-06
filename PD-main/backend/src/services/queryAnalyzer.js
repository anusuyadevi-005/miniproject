export class QueryAnalyzer {
  /**
   * Classifies user natural language query into specific domain categories
   * @param {string} query - User natural language prompt
   * @returns {string} Category string
   */
  static classifyQuery(query) {
    const q = (query || '').toLowerCase().trim();

    if (q.includes('auth') || q.includes('login') || q.includes('jwt') || q.includes('session')) {
      return 'Authentication';
    }
    if (q.includes('deploy') || q.includes('docker') || q.includes('setup') || q.includes('run') || q.includes('install')) {
      return 'Deployment';
    }
    if (q.includes('security') || q.includes('vulnerability') || q.includes('redact') || q.includes('secret')) {
      return 'Security';
    }
    if (q.includes('test') || q.includes('spec') || q.includes('mocha') || q.includes('jest')) {
      return 'Testing';
    }
    if (q.includes('performance') || q.includes('optimize') || q.includes('complexity') || q.includes('latency')) {
      return 'Performance';
    }
    if (q.includes('database') || q.includes('schema') || q.includes('collection') || q.includes('table') || q.includes('field') || q.includes('index')) {
      return 'Database';
    }
    if (q.includes('api') || q.includes('route') || q.includes('endpoint') || q.includes('post') || q.includes('get') || q.includes('request')) {
      return 'API';
    }
    if (q.includes('architecture') || q.includes('pattern') || q.includes('layer') || q.includes('structure')) {
      return 'Architecture';
    }
    if (q.includes('workflow') || q.includes('sequence') || q.includes('process') || q.includes('flow')) {
      return 'Workflow';
    }
    if (q.includes('class ') || q.includes('extends') || q.includes('constructor')) {
      return 'Class';
    }
    if (q.includes('function ') || q.includes('method') || q.includes('return') || q.endsWith('()')) {
      return 'Function';
    }
    if (q.includes('file') || q.includes('.js') || q.includes('.ts') || q.includes('.java') || q.includes('.py')) {
      return 'File';
    }
    if (q.includes('dependency') || q.includes('package') || q.includes('import') || q.includes('require')) {
      return 'Dependency';
    }
    if (q.includes('business') || q.includes('logic') || q.includes('rule') || q.includes('transform')) {
      return 'Business Logic';
    }
    if (q.includes('stack') || q.includes('technology') || q.includes('framework') || q.includes('language')) {
      return 'Technology';
    }
    if (q.includes('project') || q.includes('repository') || q.includes('overview') || q.includes('readme')) {
      return 'Repository Overview';
    }

    return 'General Repository Question';
  }

  /**
   * Identifies code entity names mentioned in the user prompt and resolves them in the Knowledge Model.
   * Handles disambiguation if multiple entities match the term.
   * @param {string} query - User prompt
   * @param {Object} knowledgeGraph - Stored Repository Knowledge Model
   * @returns {Object} Resolves list of matched entities and a flag if disambiguation is required
   */
  static resolveEntities(query, knowledgeGraph) {
    if (!knowledgeGraph) return { matched: [], disambiguate: false };

    const resolved = [];
    const words = query.split(/[^a-zA-Z0-9_\-\.\/]+/);

    // Collect candidates from classes, functions, files, apis, databases
    const classes = knowledgeGraph.classes || [];
    const functions = knowledgeGraph.functions || [];
    const files = knowledgeGraph.files || [];
    const dbEntities = Array.isArray(knowledgeGraph.database) 
      ? knowledgeGraph.database 
      : (knowledgeGraph.database?.collections || []);

    words.forEach(word => {
      if (word.length < 3) return; // Ignore very short words

      // 1. Resolve Class
      classes.forEach(c => {
        if (c.className?.toLowerCase() === word.toLowerCase()) {
          resolved.push({ type: 'Class', id: c.className, path: c.filePath, details: c });
        }
      });

      // 2. Resolve Function
      functions.forEach(f => {
        const cleanFnName = (f.functionName || '').replace('()', '');
        if (cleanFnName?.toLowerCase() === word.toLowerCase()) {
          resolved.push({ type: 'Function', id: f.functionName, path: f.filePath, details: f });
        }
      });

      // 3. Resolve File
      files.forEach(f => {
        if (f.fileName?.toLowerCase() === word.toLowerCase() || f.filePath?.toLowerCase() === word.toLowerCase()) {
          resolved.push({ type: 'File', id: f.fileName, path: f.filePath, details: f });
        }
      });

      // 4. Resolve Database Collection/Table
      dbEntities.forEach(db => {
        if (db.name?.toLowerCase() === word.toLowerCase() || db.collection?.toLowerCase() === word.toLowerCase()) {
          resolved.push({ type: 'Database', id: db.name || db.collection, path: 'Database Schema', details: db });
        }
      });
    });

    // Remove duplicates
    const seen = new Set();
    const uniqueMatches = [];
    resolved.forEach(item => {
      const key = `${item.type}_${item.id}_${item.path}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueMatches.push(item);
      }
    });

    // Disambiguation needed if we have multiple entities with the same ID/name
    const nameGroups = {};
    uniqueMatches.forEach(item => {
      const name = item.id.toLowerCase();
      if (!nameGroups[name]) nameGroups[name] = [];
      nameGroups[name].push(item);
    });

    const duplicateNames = Object.values(nameGroups).filter(group => group.length > 1);
    const disambiguate = duplicateNames.length > 0;

    return {
      matched: uniqueMatches,
      disambiguate,
      disambiguationGroups: duplicateNames
    };
  }
}
