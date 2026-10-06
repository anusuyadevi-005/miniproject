import { QueryAnalyzer } from './queryAnalyzer.js';

export class ContextRetriever {
  /**
   * Retrieves relevant context slices from the Repository Knowledge Graph based on the question classification.
   * @param {string} category - Classification category (e.g. API, Database, Function)
   * @param {Object} knowledgeGraph - Stored Repository Knowledge Model
   * @param {Array} matchedEntities - Resolved entities from QueryAnalyzer
   * @returns {Object} Structured context slices
   */
  static retrieveContext(category, knowledgeGraph, matchedEntities = []) {
    if (!knowledgeGraph) return { evidence: [], metadata: {}, diagrams: [] };

    const context = {
      evidence: [],
      metadata: {
        projectName: knowledgeGraph.projectName,
        repoUrl: knowledgeGraph.repoUrl,
        category
      },
      diagrams: []
    };

    const addEvidence = (title, data) => {
      context.evidence.push({ title, content: typeof data === 'object' ? JSON.stringify(data, null, 2) : data });
    };

    // If exact entities are matched in the prompt, pull them first (high relevance)
    if (matchedEntities && matchedEntities.length > 0) {
      matchedEntities.forEach(ent => {
        addEvidence(`Entity MATCH: ${ent.type} [${ent.id}] in ${ent.path}`, ent.details);

        // Retrieve relationships for function
        if (ent.type === 'Function') {
          const fn = ent.details;
          const callers = (knowledgeGraph.callGraph || []).filter(c => c.callee === fn.functionName).map(c => c.caller);
          const callees = (knowledgeGraph.callGraph || []).filter(c => c.caller === fn.functionName).map(c => c.callee);
          if (callers.length) addEvidence(`Callers of ${fn.functionName}`, callers);
          if (callees.length) addEvidence(`Callees of ${fn.functionName}`, callees);
        }

        // Retrieve schema relationships for DB
        if (ent.type === 'Database') {
          const coll = ent.details;
          if (coll.relationships) addEvidence(`Relationships of database entity ${coll.name || coll.collection}`, coll.relationships);
        }
      });
    }

    // Pull specific category data to guarantee grounding
    switch (category) {
      case 'API': {
        const apis = knowledgeGraph.apis || [];
        addEvidence(`API Routes Inventory`, apis.slice(0, 15));
        if (knowledgeGraph.architecture?.sequenceDiagram) {
          context.diagrams.push({
            type: 'Sequence Diagram',
            title: 'API Request Sequence Flow',
            content: knowledgeGraph.architecture.sequenceDiagram,
            module: 'Architecture Discovery'
          });
        }
        break;
      }

      case 'Database': {
        const database = knowledgeGraph.database || {};
        const collections = Array.isArray(database) ? database : (database.collections || []);
        addEvidence(`Database engine`, database.engine || 'MongoDB Atlas');
        addEvidence(`Collections & Tables`, collections.slice(0, 10));
        if (database.erDiagram) {
          context.diagrams.push({
            type: 'ER Diagram',
            title: 'Entity Relationship Diagram',
            content: database.erDiagram,
            module: 'Database Schema Intelligence'
          });
        }
        break;
      }

      case 'Architecture':
      case 'Workflow': {
        const arch = knowledgeGraph.architecture || {};
        addEvidence(`Architecture Style`, knowledgeGraph.technology?.architectureStyle || 'Layered MVC');
        if (arch.highLevelDiagram) {
          context.diagrams.push({
            type: 'Flow Diagram',
            title: 'High-Level System Flow',
            content: arch.highLevelDiagram,
            module: 'Architecture Discovery'
          });
        }
        if (arch.componentDiagram) {
          context.diagrams.push({
            type: 'Component Diagram',
            title: 'Subsystem Component Boundaries',
            content: arch.componentDiagram,
            module: 'Architecture Discovery'
          });
        }
        break;
      }

      case 'Authentication': {
        const authApis = (knowledgeGraph.apis || []).filter(a => a.authentication && a.authentication !== 'None');
        addEvidence(`Authentication Technology`, knowledgeGraph.technology?.authentication || 'JWT / Session token');
        addEvidence(`Protected Endpoints`, authApis);
        break;
      }

      case 'Deployment': {
        const depl = knowledgeGraph.deployment || {};
        addEvidence(`Installation Guides`, depl.installation || []);
        addEvidence(`Requirements`, depl.requirements || []);
        addEvidence(`Environment Variables`, depl.environmentVariables || []);
        addEvidence(`Docker settings`, depl.dockerGuide || {});
        break;
      }

      case 'Dependency': {
        const deps = knowledgeGraph.dependencies || [];
        addEvidence(`Project Dependencies`, deps.slice(0, 20));
        break;
      }

      case 'Technology': {
        const tech = knowledgeGraph.technology || {};
        addEvidence(`Languages`, tech.languages || []);
        addEvidence(`Tech Stack Components`, tech);
        break;
      }

      case 'Repository Overview': {
        const folders = (knowledgeGraph.folders || []).slice(0, 10);
        addEvidence(`Repository Directory Map`, folders);
        break;
      }

      case 'Business Logic': {
        const bizFns = (knowledgeGraph.functions || []).filter(f => f.businessLogic);
        addEvidence(`Core Business Workflows`, bizFns.slice(0, 10));
        break;
      }

      case 'Security': {
        const secFiles = (knowledgeGraph.files || []).filter(f => (f.securityNotes || []).length > 0);
        addEvidence(`Security Settings`, knowledgeGraph.technology?.authentication || {});
        addEvidence(`File Security Findings`, secFiles.map(f => ({ file: f.filePath, notes: f.securityNotes })));
        break;
      }

      case 'Testing': {
        const testFiles = (knowledgeGraph.files || []).filter(f => (f.fileName || '').toLowerCase().includes('test') || (f.fileName || '').toLowerCase().includes('spec'));
        addEvidence(`Testing frameworks`, knowledgeGraph.technology?.testing || {});
        addEvidence(`Test files inventory`, testFiles.slice(0, 10).map(f => f.filePath));
        break;
      }

      case 'Performance': {
        const complexFns = (knowledgeGraph.functions || []).filter(f => f.timeComplexity);
        addEvidence(`Function Time Complexities`, complexFns.slice(0, 10).map(f => ({ name: f.functionName, complexity: f.timeComplexity })));
        break;
      }

      default: {
        // Pull generic summary
        addEvidence(`Repository Project Name`, knowledgeGraph.projectName);
        addEvidence(`Repository URL`, knowledgeGraph.repoUrl);
        addEvidence(`Folders Count`, (knowledgeGraph.folders || []).length);
        addEvidence(`Files Count`, (knowledgeGraph.files || []).length);
        break;
      }
    }

    return context;
  }
}
