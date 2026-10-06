export class ASTDiffEngine {
  /**
   * Multi-Language AST Node parser for JS/TS/Python/Go/SQL snippets and files.
   * Extracts functions, classes, routes, database models, configurations, tests, and documentation.
   */
  static parseCodeToNodes(codeString, filePath = '') {
    const nodes = [];
    const lowerPath = filePath.toLowerCase();

    // 1. Documentation File Check
    if (lowerPath.endsWith('.md') || lowerPath.endsWith('.rst') || lowerPath.endsWith('.txt')) {
      nodes.push({
        type: 'Documentation',
        category: 'DOCUMENTATION_CHANGE',
        name: filePath || 'documentation',
        sdid: `sdid:doc:${(filePath || 'readme').replace(/[^a-zA-Z0-9_]/g, '_')}`,
        rawSignature: codeString.slice(0, 100),
        filePath
      });
      return nodes;
    }

    // 2. Configuration & Manifests Check
    if (lowerPath.includes('package.json') || lowerPath.includes('requirements.txt') || lowerPath.includes('go.mod') || lowerPath.includes('pom.xml')) {
      nodes.push({
        type: 'Dependency',
        category: 'DEPENDENCY_CHANGE',
        name: filePath || 'dependencies',
        sdid: `sdid:dep:${(filePath || 'manifest').replace(/[^a-zA-Z0-9_]/g, '_')}`,
        rawSignature: codeString.slice(0, 100),
        filePath
      });
      return nodes;
    }

    if (lowerPath.includes('dockerfile') || lowerPath.includes('.env') || lowerPath.includes('config') || lowerPath.endsWith('.yml') || lowerPath.endsWith('.yaml')) {
      const isSecurity = lowerPath.includes('.env') || codeString.includes('SECRET') || codeString.includes('KEY') || codeString.includes('TOKEN');
      nodes.push({
        type: 'Configuration',
        category: isSecurity ? 'SECURITY_CHANGE' : 'CONFIGURATION_CHANGE',
        name: filePath || 'config',
        sdid: `sdid:config:${(filePath || 'config').replace(/[^a-zA-Z0-9_]/g, '_')}`,
        rawSignature: codeString.slice(0, 100),
        filePath
      });
      return nodes;
    }

    // 3. Database Schema / SQL Statements Check
    const sqlTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);?/gi;
    const sqlAlterRegex = /ALTER\s+TABLE\s+([a-zA-Z0-9_]+)\s+ADD\s+(?:COLUMN\s+)?([a-zA-Z0-9_]+)\s+([a-zA-Z0-9_]+)/gi;
    let sqlMatch;
    while ((sqlMatch = sqlTableRegex.exec(codeString)) !== null) {
      const tableName = sqlMatch[1];
      nodes.push({
        type: 'DatabaseTable',
        category: 'DATABASE_SCHEMA_CHANGE',
        name: tableName,
        columns: sqlMatch[2].split(',').map(c => c.trim()).filter(Boolean),
        rawSignature: sqlMatch[0],
        sdid: `sdid:db:${tableName.toLowerCase()}`,
        filePath
      });
    }
    while ((sqlMatch = sqlAlterRegex.exec(codeString)) !== null) {
      const tableName = sqlMatch[1];
      const colName = sqlMatch[2];
      nodes.push({
        type: 'DatabaseAlter',
        category: 'DATABASE_SCHEMA_CHANGE',
        name: `${tableName}.${colName}`,
        rawSignature: sqlMatch[0],
        sdid: `sdid:db:${tableName.toLowerCase()}`,
        filePath
      });
    }

    // 4. HTTP Routes / API Endpoints (Express, Flask, FastAPI)
    const expressRouteRegex = /(?:app|router)\.(get|post|put|delete|patch|options)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let routeMatch;
    while ((routeMatch = expressRouteRegex.exec(codeString)) !== null) {
      const method = routeMatch[1].toUpperCase();
      const endpoint = routeMatch[2];
      const cleanEp = endpoint.replace(/[^a-zA-Z0-9_]/g, '_');
      nodes.push({
        type: 'API',
        category: 'ROUTE_CHANGE',
        method,
        endpoint,
        name: `${method} ${endpoint}`,
        rawSignature: routeMatch[0],
        sdid: `sdid:route:${method}_${cleanEp}`,
        filePath
      });
    }

    const flaskRouteRegex = /@(?:app|blueprint|api)\.route\s*\(\s*['"`]([^'"`]+)['"`](?:.*methods\s*=\s*\[([^\]]+)\])?/gi;
    while ((routeMatch = flaskRouteRegex.exec(codeString)) !== null) {
      const endpoint = routeMatch[1];
      const methods = routeMatch[2] ? routeMatch[2].replace(/['"\s]/g, '') : 'GET';
      const cleanEp = endpoint.replace(/[^a-zA-Z0-9_]/g, '_');
      nodes.push({
        type: 'API',
        category: 'ROUTE_CHANGE',
        method: methods,
        endpoint,
        name: `${methods} ${endpoint}`,
        rawSignature: routeMatch[0],
        sdid: `sdid:route:${methods}_${cleanEp}`,
        filePath
      });
    }

    // 5. Test Functions / Suites
    const isTestFile = lowerPath.includes('test') || lowerPath.includes('spec');
    const testBlockRegex = /(?:describe|it|test)\s*\(\s*['"`]([^'"`]+)['"`]/gi;
    let testMatch;
    while ((testMatch = testBlockRegex.exec(codeString)) !== null) {
      const testName = testMatch[1];
      nodes.push({
        type: 'Test',
        category: 'TEST_CHANGE',
        name: testName,
        rawSignature: testMatch[0],
        sdid: `sdid:test:${testName.replace(/[^a-zA-Z0-9_]/g, '_')}`,
        filePath
      });
    }

    // 6. Functions (JavaScript, TypeScript, Python, Go)
    const jsFuncRegex = /(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;
    const arrowFuncRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?\(([^)]*)\)\s*=>/g;
    const pyFuncRegex = /def\s+([a-zA-Z0-9_]+)\s*\(([^)]*)\):/g;
    const goFuncRegex = /func\s+(?:\([^)]+\)\s+)?([a-zA-Z0-9_]+)\s*\(([^)]*)\)/g;

    let fnMatch;
    while ((fnMatch = jsFuncRegex.exec(codeString)) !== null) {
      const name = fnMatch[1];
      const params = fnMatch[2].split(',').map(p => p.trim()).filter(Boolean);
      nodes.push({
        type: 'Function',
        category: isTestFile ? 'TEST_CHANGE' : 'FUNCTION_MODIFIED',
        name,
        params,
        rawSignature: fnMatch[0],
        sdid: `sdid:func:${name}`,
        filePath
      });
    }

    while ((fnMatch = arrowFuncRegex.exec(codeString)) !== null) {
      const name = fnMatch[1];
      const params = fnMatch[2].split(',').map(p => p.trim()).filter(Boolean);
      nodes.push({
        type: 'Function',
        category: isTestFile ? 'TEST_CHANGE' : 'FUNCTION_MODIFIED',
        name,
        params,
        rawSignature: fnMatch[0],
        sdid: `sdid:func:${name}`,
        filePath
      });
    }

    while ((fnMatch = pyFuncRegex.exec(codeString)) !== null) {
      const name = fnMatch[1];
      const params = fnMatch[2].split(',').map(p => p.trim()).filter(Boolean);
      const isTestFn = name.startsWith('test_') || isTestFile;
      nodes.push({
        type: 'Function',
        category: isTestFn ? 'TEST_CHANGE' : 'FUNCTION_MODIFIED',
        name,
        params,
        rawSignature: fnMatch[0],
        sdid: isTestFn ? `sdid:test:${name}` : `sdid:func:${name}`,
        filePath
      });
    }

    while ((fnMatch = goFuncRegex.exec(codeString)) !== null) {
      const name = fnMatch[1];
      const params = fnMatch[2].split(',').map(p => p.trim()).filter(Boolean);
      nodes.push({
        type: 'Function',
        category: 'FUNCTION_MODIFIED',
        name,
        params,
        rawSignature: fnMatch[0],
        sdid: `sdid:func:${name}`,
        filePath
      });
    }

    // 7. Classes (JavaScript, TypeScript, Python, Java, C#)
    const classRegex = /(?:export\s+)?class\s+([a-zA-Z0-9_]+)(?:\s*(?:extends|implements|\()\s*([a-zA-Z0-9_]+)\)?)?/g;
    let clsMatch;
    while ((clsMatch = classRegex.exec(codeString)) !== null) {
      const name = clsMatch[1];
      const superClass = clsMatch[2] || null;
      const isDbModel = (superClass && (superClass.includes('Model') || superClass.includes('Entity') || superClass.includes('Document'))) || codeString.includes('db.Column');
      nodes.push({
        type: 'Class',
        category: isDbModel ? 'DATABASE_SCHEMA_CHANGE' : 'CLASS_MODIFIED',
        name,
        superClass,
        rawSignature: clsMatch[0],
        sdid: isDbModel ? `sdid:db:${name.toLowerCase()}` : `sdid:class:${name}`,
        filePath
      });
    }

    return nodes;
  }

  /**
   * Compares two AST node sets to find additions, deletions, signature modifications, or body changes.
   */
  static computeASTDiff(oldCode, newCode, filePath = '') {
    const oldNodes = this.parseCodeToNodes(oldCode, filePath);
    const newNodes = this.parseCodeToNodes(newCode, filePath);

    const diffs = [];

    newNodes.forEach(newNode => {
      const oldNode = oldNodes.find(n => n.sdid === newNode.sdid);
      if (!oldNode) {
        let changeCategory = 'FILE_ADDED';
        if (newNode.type === 'Function') changeCategory = 'FUNCTION_ADDED';
        else if (newNode.type === 'Class') changeCategory = 'CLASS_ADDED';
        else if (newNode.type === 'API') changeCategory = 'ROUTE_CHANGE';
        else if (newNode.type === 'DatabaseTable' || newNode.type === 'DatabaseAlter') changeCategory = 'DATABASE_SCHEMA_CHANGE';
        else if (newNode.type === 'Dependency') changeCategory = 'DEPENDENCY_CHANGE';
        else if (newNode.type === 'Configuration') changeCategory = 'CONFIGURATION_CHANGE';
        else if (newNode.type === 'Test') changeCategory = 'TEST_CHANGE';
        else if (newNode.type === 'Documentation') changeCategory = 'DOCUMENTATION_CHANGE';

        diffs.push({
          type: 'NodeAdded',
          changeCategory,
          sdid: newNode.sdid,
          name: newNode.name,
          symbolType: newNode.type,
          filePath: newNode.filePath || filePath,
          newSignature: newNode.rawSignature,
          details: `New ${newNode.type} '${newNode.name}' created.`
        });
      } else {
        // Compare function parameters
        if (newNode.type === 'Function' && newNode.params && oldNode.params) {
          const addedParams = newNode.params.filter(p => !oldNode.params.includes(p));
          const removedParams = oldNode.params.filter(p => !newNode.params.includes(p));

          if (addedParams.length > 0 || removedParams.length > 0) {
            diffs.push({
              type: 'SignatureChanged',
              changeCategory: 'FUNCTION_MODIFIED',
              sdid: newNode.sdid,
              name: newNode.name,
              symbolType: newNode.type,
              filePath: newNode.filePath || filePath,
              oldParams: oldNode.params,
              newParams: newNode.params,
              addedParams,
              removedParams,
              oldSignature: oldNode.rawSignature,
              newSignature: newNode.rawSignature,
              details: `Parameters updated in '${newNode.name}': +[${addedParams.join(', ')}] -[${removedParams.join(', ')}]`
            });
          } else if (oldCode !== newCode) {
            diffs.push({
              type: 'BodyModified',
              changeCategory: 'FUNCTION_MODIFIED',
              sdid: newNode.sdid,
              name: newNode.name,
              symbolType: newNode.type,
              filePath: newNode.filePath || filePath,
              details: `Internal logic updated in ${newNode.name}.`
            });
          }
        } else if (newNode.type === 'API' && (oldNode.rawSignature !== newNode.rawSignature || oldNode.method !== newNode.method)) {
          diffs.push({
            type: 'ApiModified',
            changeCategory: 'API_CHANGE',
            sdid: newNode.sdid,
            name: newNode.name,
            symbolType: newNode.type,
            filePath: newNode.filePath || filePath,
            details: `API contract updated: ${oldNode.name} -> ${newNode.name}`
          });
        } else if (newNode.type === 'DatabaseTable' && oldNode.rawSignature !== newNode.rawSignature) {
          diffs.push({
            type: 'SchemaModified',
            changeCategory: 'DATABASE_SCHEMA_CHANGE',
            sdid: newNode.sdid,
            name: newNode.name,
            symbolType: newNode.type,
            filePath: newNode.filePath || filePath,
            details: `Database schema updated for table '${newNode.name}'.`
          });
        }
      }
    });

    oldNodes.forEach(oldNode => {
      if (!newNodes.some(n => n.sdid === oldNode.sdid)) {
        let changeCategory = 'FILE_DELETED';
        if (oldNode.type === 'Function') changeCategory = 'FUNCTION_DELETED';
        else if (oldNode.type === 'Class') changeCategory = 'CLASS_DELETED';
        else if (oldNode.type === 'API') changeCategory = 'ROUTE_CHANGE';
        else if (oldNode.type === 'DatabaseTable') changeCategory = 'DATABASE_SCHEMA_CHANGE';

        diffs.push({
          type: 'NodeDeleted',
          changeCategory,
          sdid: oldNode.sdid,
          name: oldNode.name,
          symbolType: oldNode.type,
          filePath: oldNode.filePath || filePath,
          oldSignature: oldNode.rawSignature,
          details: `${oldNode.type} '${oldNode.name}' was removed.`
        });
      }
    });

    // Fallback if raw text changed but no top-level symbol was altered
    if (diffs.length === 0 && oldCode && newCode && oldCode.trim() !== newCode.trim()) {
      const isDoc = filePath.toLowerCase().endsWith('.md');
      diffs.push({
        type: 'ContentModified',
        changeCategory: isDoc ? 'DOCUMENTATION_CHANGE' : 'FUNCTION_MODIFIED',
        sdid: `sdid:file:${(filePath || 'source').replace(/[^a-zA-Z0-9_]/g, '_')}`,
        name: filePath || 'SourceFile',
        symbolType: isDoc ? 'Documentation' : 'Module',
        filePath,
        details: `File content modified: ${filePath}`
      });
    }

    return diffs;
  }
}
