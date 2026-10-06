import { analyzeRepositoryDatabase, getRepositoryDatabase } from '../services/databaseAnalyzer.js';
import { db } from '../db/store.js';
import { RepoAnalyzer } from '../git/repoAnalyzer.js';
import { getMongoStatus } from '../db/mongo.js';

export async function getRepositoryDatabaseController(req, res) {
  let { repositoryId } = req.params;
  try {
    if (!repositoryId) {
      return res.status(400).json({ success: false, error: 'repositoryId is required' });
    }

    repositoryId = decodeURIComponent(repositoryId).trim();

    let analysis = null;

    if (getMongoStatus().isConnected) {
      try {
        analysis = await getRepositoryDatabase(repositoryId);
        if (!analysis) {
          analysis = await analyzeRepositoryDatabase(repositoryId);
        }
      } catch (err) {
        console.warn('MongoDB database query fallback:', err.message);
      }
    }

    // 1. Memory lookup in intelligentDocs
    if (!analysis) {
      const memoryDoc = (db.intelligentDocs || []).find(
        d => d.reportId === repositoryId || d.repoUrl === repositoryId || d.projectName === repositoryId
      );
      if (memoryDoc && memoryDoc.database) {
        const collections = memoryDoc.database.collections || [];
        analysis = {
          repositoryId: memoryDoc.reportId,
          databaseType: memoryDoc.database.databaseType || 'MongoDB Atlas',
          orm: ['Mongoose', 'Prisma'],
          entities: collections.map(c => ({
            name: c.name,
            tableName: c.name,
            collectionName: c.name,
            type: 'Collection',
            fields: (c.fields || []).map(f => typeof f === 'string' ? { name: f, dataType: 'String' } : f)
          })),
          relationships: [],
          indexes: [],
          constraints: [],
          diagrams: {
            mermaid: memoryDoc.database.erDiagram || 'erDiagram\n',
            markdown: `# Database Schema Analysis\n\nDatabase Type: ${memoryDoc.database.databaseType || 'MongoDB'}`
          }
        };
      }
    }

    // 2. Memory lookup in db.reports
    if (!analysis) {
      const memoryReport = (db.reports || []).find(
        r => r.reportId === repositoryId || r.repoUrl === repositoryId || r.projectName === repositoryId || String(r._id) === repositoryId
      );
      if (memoryReport && memoryReport.databaseStructure) {
        const dbStruct = memoryReport.databaseStructure;
        const colls = dbStruct.tablesOrCollections || [];
        analysis = {
          repositoryId: memoryReport.reportId,
          databaseType: dbStruct.engine || 'MongoDB / Relational DB',
          orm: memoryReport.techStack?.database || ['MongoDB'],
          entities: colls.map(c => ({
            name: c.name,
            tableName: c.name,
            collectionName: c.name,
            type: 'Table/Collection',
            fields: (c.fields || []).map(f => typeof f === 'string' ? { name: f, dataType: 'String' } : f)
          })),
          relationships: [],
          indexes: [],
          constraints: [],
          diagrams: {
            mermaid: dbStruct.erDiagram || `erDiagram\n  ${colls.map(c => c.name).join(' {\n  }\n  ')} {\n  }`,
            markdown: `# Database Schema Analysis for ${memoryReport.projectName}\n\nEngine: ${dbStruct.engine}`
          }
        };
      }
    }

    // 3. If repositoryId is a Git URL or local path, auto-analyze on demand
    if (!analysis && (repositoryId.startsWith('http') || repositoryId.includes('/'))) {
      try {
        const reportData = await RepoAnalyzer.analyzeRepository(repositoryId);
        if (!db.reports) db.reports = [];
        db.reports.unshift(reportData);
        const dbStruct = reportData.databaseStructure || {};
        const colls = dbStruct.tablesOrCollections || [];
        analysis = {
          repositoryId: reportData.reportId,
          databaseType: dbStruct.engine || 'MongoDB / Relational DB',
          orm: reportData.techStack?.database || ['MongoDB'],
          entities: colls.map(c => ({
            name: c.name,
            tableName: c.name,
            collectionName: c.name,
            type: 'Table/Collection',
            fields: (c.fields || []).map(f => typeof f === 'string' ? { name: f, dataType: 'String' } : f)
          })),
          relationships: [],
          indexes: [],
          constraints: [],
          diagrams: {
            mermaid: dbStruct.erDiagram || `erDiagram\n  ${colls.map(c => c.name).join(' {\n  }\n  ')} {\n  }`,
            markdown: `# Database Schema Analysis for ${reportData.projectName}\n\nEngine: ${dbStruct.engine}`
          }
        };
      } catch (err) {
        console.warn('Auto-analyze for database explorer failed:', err.message);
      }
    }

    // 4. Fallback: Return latest report in memory
    if (!analysis && db.reports && db.reports.length > 0) {
      const latest = db.reports[0];
      const dbStruct = latest.databaseStructure || {};
      const colls = dbStruct.tablesOrCollections || [];
      analysis = {
        repositoryId: latest.reportId,
        databaseType: dbStruct.engine || 'MongoDB / Relational DB',
        orm: latest.techStack?.database || ['MongoDB'],
        entities: colls.map(c => ({
          name: c.name,
          tableName: c.name,
          collectionName: c.name,
          type: 'Table/Collection',
          fields: (c.fields || []).map(f => typeof f === 'string' ? { name: f, dataType: 'String' } : f)
        })),
        relationships: [],
        indexes: [],
        constraints: [],
        diagrams: {
          mermaid: dbStruct.erDiagram || `erDiagram\n`,
          markdown: `# Database Schema Analysis\n\nEngine: ${dbStruct.engine}`
        }
      };
    }

    if (!analysis) {
      return res.status(404).json({ success: false, error: 'Database analysis not found for the specified repository.' });
    }

    return res.json({ success: true, database: analysis });
  } catch (error) {
    console.error('Database analysis fetch error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

