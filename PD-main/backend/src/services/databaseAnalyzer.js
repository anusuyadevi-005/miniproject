import path from 'path';
import { RepositoryInventory } from '../models/RepositoryInventory.js';
import { RepositoryDatabaseAnalysis } from '../models/RepositoryDatabaseAnalysis.js';
import { extractSchemaDefinitions } from './schemaExtractor.js';
import { analyzeORMs } from './ormAnalyzer.js';
import { analyzeEntities } from './entityAnalyzer.js';
import { analyzeMigrations } from './migrationAnalyzer.js';
import { analyzeIndexes } from './indexAnalyzer.js';
import { analyzeDatabaseRelationships } from './relationshipAnalyzer.js';

const DATABASE_PATTERNS = [
  { type: 'MongoDB', matcher: /mongodb|mongoose|mongo/i },
  { type: 'PostgreSQL', matcher: /postgres|pg\b|prisma|sqlalchemy/i },
  { type: 'MySQL', matcher: /mysql|sequelize/i },
  { type: 'SQLite', matcher: /sqlite|django/i },
  { type: 'Oracle', matcher: /oracle|hibernate/i },
  { type: 'SQL Server', matcher: /mssql|sqlserver|entity framework/i },
  { type: 'Firebase Firestore', matcher: /firebase|firestore/i }
];

function identifyDatabaseType(inventory, orms = [], schemas = [], entities = []) {
  const filePaths = (inventory.files || []).map((file) => (file.relativePath || '').toLowerCase());
  const fileNames = (inventory.files || []).map((file) => (file.name || '').toLowerCase());
  const inventoryText = filePaths.join(' ');
  const candidates = new Set(orms.map((orm) => (orm || '').toLowerCase()));

  // 1. Check SQL DDL and Prisma dialect
  for (const schema of schemas) {
    if (schema.file && schema.file.toLowerCase().includes('schema.prisma')) {
      const rawData = typeof schema.data === 'string' ? schema.data : JSON.stringify(schema.data || '');
      if (rawData.includes('provider = "postgresql"') || rawData.includes('provider = "postgres"')) return 'PostgreSQL';
      if (rawData.includes('provider = "mysql"')) return 'MySQL';
      if (rawData.includes('provider = "sqlite"')) return 'SQLite';
      if (rawData.includes('provider = "mongodb"')) return 'MongoDB';
      return 'PostgreSQL';
    }
    if (schema.extension === '.sql' && schema.data) {
      const sqlText = typeof schema.data === 'string' ? schema.data : JSON.stringify(schema.data);
      if (/create\s+table\s+.*serial|create\s+table\s+.*bigserial|\bserial\b/i.test(sqlText)) return 'PostgreSQL';
      if (/create\s+table\s+.*ENGINE\s*=\s*InnoDB/i.test(sqlText)) return 'MySQL';
      if (/create\s+table\s+.*AUTOINCREMENT/i.test(sqlText)) return 'SQLite';
    }
  }

  // 2. Check entities extracted from source AST / DDL
  if (entities.some(e => String(e.type || '').includes('Mongoose') || String(e.type || '').includes('Mongo'))) return 'MongoDB';
  if (entities.some(e => String(e.type || '').includes('TypeORM') || String(e.type || '').includes('JPA') || String(e.type || '').includes('Postgres'))) return 'PostgreSQL';
  if (entities.some(e => String(e.type || '').includes('Sequelize') || String(e.type || '').includes('MySQL'))) return 'MySQL';
  if (entities.some(e => String(e.type || '').includes('SQLite') || String(e.language || '').includes('SQLite'))) return 'SQLite';

  // 3. Check files and config patterns
  if (fileNames.includes('firebase.json') || fileNames.includes('.firebaserc') || inventoryText.includes('firestore')) return 'Firebase Firestore';
  if (fileNames.includes('redis.conf') || fileNames.includes('redis.yml')) return 'Redis';
  if (filePaths.some(p => p.endsWith('.sqlite') || p.endsWith('.sqlite3') || p.endsWith('.db'))) return 'SQLite';

  if (filePaths.some(p => p.includes('postgres') || p.includes('psycopg2') || p.includes('pg_'))) return 'PostgreSQL';
  if (filePaths.some(p => p.includes('mongo') || p.includes('mongoose'))) return 'MongoDB';
  if (filePaths.some(p => p.includes('mysql'))) return 'MySQL';

  if (candidates.has('firebase firestore')) return 'Firebase Firestore';
  if (candidates.has('mongodb')) return 'MongoDB';
  if (candidates.has('postgresql') || candidates.has('postgres') || candidates.has('prisma')) return 'PostgreSQL';
  if (candidates.has('mysql')) return 'MySQL';
  if (candidates.has('sqlite')) return 'SQLite';
  if (candidates.has('oracle')) return 'Oracle';
  if (candidates.has('sql server') || candidates.has('mssql')) return 'SQL Server';

  // If ORMs are detected without explicit database dialect:
  if (candidates.has('sqlalchemy') || candidates.has('django orm') || candidates.has('hibernate')) {
    // Check if any Postgres driver is mentioned
    if (inventoryText.includes('psycopg') || inventoryText.includes('asyncpg')) return 'PostgreSQL';
    if (inventoryText.includes('pymysql') || inventoryText.includes('mysqlclient')) return 'MySQL';
    if (inventoryText.includes('sqlite')) return 'SQLite';
    return 'Relational Database';
  }

  return 'Database not detected in the selected repository version.';
}

function normalizeEntity(entity) {
  return {
    name: entity.name || entity.modelName || entity.tableName || entity.collectionName || 'UnknownEntity',
    tableName: entity.tableName || entity.name || entity.collectionName || null,
    collectionName: entity.collectionName || entity.name || entity.tableName || null,
    type: entity.type || 'Entity',
    fields: entity.fields || [],
    dataTypes: entity.fields?.map((field) => field.dataType || 'Unknown') || [],
    nullable: entity.fields?.filter((field) => field.nullable).map((field) => field.name) || [],
    required: entity.fields?.filter((field) => field.required).map((field) => field.name) || [],
    defaultValue: entity.fields?.filter((field) => field.defaultValue != null).map((field) => ({ name: field.name, defaultValue: field.defaultValue })) || [],
    validationRules: entity.fields?.flatMap((field) => field.validationRules || []) || [],
    relationships: entity.relationships || [],
    indexes: entity.indexes || [],
    source: entity.file || null,
    language: entity.language || 'Unknown'
  };
}

function extractConstraintsFromSchemas(schemas) {
  const constraints = [];
  schemas.forEach((schema) => {
    if (!schema || !schema.data) return;
    const raw = typeof schema.data === 'string' ? schema.data : JSON.stringify(schema.data);
    const regex = /\b(PRIMARY KEY|FOREIGN KEY|UNIQUE|CHECK|NOT NULL)\b[\s\S]*?(?:,|\)|$)/gi;
    const matches = [...raw.matchAll(regex)];
    matches.forEach((match) => {
      constraints.push({ type: match[1].toUpperCase(), definition: match[0].trim(), file: schema.file });
    });
  });
  return constraints;
}

function extractViewsAndTriggers(schemas) {
  const views = [];
  const triggers = [];

  schemas.forEach((schema) => {
    if (!schema || !schema.data) return;
    const raw = typeof schema.data === 'string' ? schema.data : JSON.stringify(schema.data);
    const viewRegex = /CREATE\s+VIEW\s+([A-Za-z0-9_\.\"]+)/gi;
    const triggerRegex = /CREATE\s+TRIGGER\s+([A-Za-z0-9_\.\"]+)/gi;
    let match;

    while ((match = viewRegex.exec(raw))) {
      views.push({ name: match[1], definition: match[0].trim(), file: schema.file });
    }
    while ((match = triggerRegex.exec(raw))) {
      triggers.push({ name: match[1], definition: match[0].trim(), file: schema.file });
    }
  });

  return { views, triggers };
}

function sanitizeIdentifier(value) {
  return value ? value.replace(/[^A-Za-z0-9_]/g, '_') : 'Unknown';
}

function generateMermaidErDiagram(entities, relationships) {
  if (!entities || entities.length === 0) {
    return null;
  }

  const lines = ['erDiagram'];
  entities.forEach((entity) => {
    const entityName = sanitizeIdentifier(entity.name);
    lines.push(`  ${entityName} {`);
    entity.fields.forEach((field) => {
      lines.push(`    ${field.dataType || 'STRING'} ${field.name}`);
    });
    lines.push('  }');
  });

  relationships.forEach((rel) => {
    const source = sanitizeIdentifier(rel.source);
    const target = sanitizeIdentifier(rel.target);
    const cardinality = rel.type === 'One-To-One' ? '||--||' : rel.type === 'One-To-Many' ? '||--|{' : rel.type === 'Many-To-One' ? '}|--||' : rel.type === 'Many-To-Many' ? '}|--|{' : '--';
    lines.push(`  ${source} ${cardinality} ${target} : "${rel.field || rel.type}"`);
  });

  return lines.join('\n');
}

function generatePlantUmlErDiagram(entities, relationships) {
  if (!entities || entities.length === 0) {
    return null;
  }

  const lines = ['@startuml', 'hide circle'];
  entities.forEach((entity) => {
    const entityName = sanitizeIdentifier(entity.name);
    lines.push(`entity "${entity.name}" as ${entityName} {`);
    entity.fields.forEach((field) => {
      lines.push(`  ${field.name} : ${field.dataType || 'STRING'}`);
    });
    lines.push('}');
  });

  relationships.forEach((rel) => {
    const source = sanitizeIdentifier(rel.source);
    const target = sanitizeIdentifier(rel.target);
    const relation = rel.type === 'Many-To-One' ? ']o--||' : rel.type === 'One-To-Many' ? '||--o{' : rel.type === 'Many-To-Many' ? '}o--o{' : rel.type === 'One-To-One' ? '||--||' : '--';
    lines.push(`${source} ${relation} ${target} : ${rel.field || rel.type}`);
  });

  lines.push('@enduml');
  return lines.join('\n');
}

function generateMarkdownReport(analysis) {
  const lines = [];
  if (analysis.databaseType.includes('Not detected') || analysis.databaseType.includes('not detected')) {
    lines.push('# Database Schema Analysis');
    lines.push('\nDatabase not detected in the selected repository version.');
    return lines.join('\n');
  }

  lines.push(`# Database Schema Analysis (${analysis.databaseType})`);
  lines.push(`\n**ORMs:** ${analysis.orm.join(', ') || 'Unknown'}`);
  lines.push('\n## Entities');

  analysis.entities.forEach((entity) => {
    lines.push(`\n### ${entity.name}`);
    lines.push(`- Type: ${entity.type}`);
    lines.push(`- Table / Collection: ${entity.tableName || entity.collectionName || 'Unknown'}`);
    lines.push(`- Source: ${entity.source || 'Unknown'}`);
    lines.push('- Fields:');
    entity.fields.forEach((field) => {
      lines.push(`  - **${field.name}**: ${field.dataType || 'Unknown'}${field.required ? ' (required)' : ''}${field.defaultValue != null ? `, default=${field.defaultValue}` : ''}`);
    });
  });

  lines.push('\n## Relationships');
  if (analysis.relationships.length) {
    analysis.relationships.forEach((rel) => {
      lines.push(`- ${rel.source} ${rel.type} ${rel.target}${rel.field ? ` via ${rel.field}` : ''}`);
    });
  } else {
    lines.push('- No relationships discovered.');
  }

  lines.push('\n## Indexes');
  if (analysis.indexes.length) {
    analysis.indexes.forEach((index) => {
      lines.push(`- ${index.entity}: ${index.fields.join(', ')}${index.unique ? ' (unique)' : ''}`);
    });
  } else {
    lines.push('- No index definitions discovered.');
  }

  lines.push('\n## Constraints');
  if (analysis.constraints.length) {
    analysis.constraints.forEach((constraint) => {
      lines.push(`- ${constraint.type}: ${constraint.definition}`);
    });
  } else {
    lines.push('- No schema constraints discovered.');
  }

  return lines.join('\n');
}

export async function buildRepositoryDatabaseAnalysis(inventory) {
  if (!inventory || !inventory.repositoryId) {
    throw new Error('Invalid repository inventory provided for database analysis.');
  }

  const schemas = await extractSchemaDefinitions(inventory);
  const ormList = await analyzeORMs(inventory);
  const entities = await analyzeEntities(inventory);
  const indexes = await analyzeIndexes(inventory);
  const migrations = await analyzeMigrations(inventory);
  const relationships = analyzeDatabaseRelationships(entities, schemas);
  const databaseType = identifyDatabaseType(inventory, ormList, schemas, entities);
  const constraints = extractConstraintsFromSchemas(schemas);
  const { views, triggers } = extractViewsAndTriggers(schemas);

  const normalizedEntities = entities.map(normalizeEntity);

  return {
    repositoryId: inventory.repositoryId,
    databaseType,
    orm: ormList,
    entities: normalizedEntities,
    relationships,
    indexes,
    constraints,
    views,
    triggers,
    migrations,
    schemas,
    diagrams: {
      mermaid: generateMermaidErDiagram(normalizedEntities, relationships),
      plantuml: generatePlantUmlErDiagram(normalizedEntities, relationships),
      markdown: generateMarkdownReport({ databaseType, orm: ormList, entities: normalizedEntities, relationships, indexes, constraints })
    }
  };
}

export async function analyzeRepositoryDatabase(repositoryId) {
  const inventory = await RepositoryInventory.findOne({ repositoryId }).lean();
  if (!inventory) {
    throw new Error('Repository inventory not found');
  }

  const analysis = await buildRepositoryDatabaseAnalysis(inventory);
  const saved = await RepositoryDatabaseAnalysis.findOneAndUpdate(
    { repositoryId },
    { ...analysis, updatedAt: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  return saved;
}

export async function getRepositoryDatabase(repositoryId) {
  return RepositoryDatabaseAnalysis.findOne({ repositoryId }).lean();
}
