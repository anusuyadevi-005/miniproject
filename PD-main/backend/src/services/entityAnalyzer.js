import fs from 'fs-extra';
import path from 'path';

const SOURCE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.php', '.prisma', '.sql'];

export async function analyzeEntities(inventory) {
  const files = inventory.files || [];
  const entities = [];

  for (const file of files) {
    const ext = path.extname(file.relativePath).toLowerCase();
    if (!SOURCE_EXTENSIONS.includes(ext)) continue;

    const source = await fs.readFile(file.absolutePath, 'utf8').catch(() => '');
    if (!source) continue;

    // 1. Python Models (SQLAlchemy & Django)
    if (ext === '.py') {
      // 1A. Python SQLAlchemy Classes: class <Name>(db.Model, ...):
      const pyClassRegex = /class\s+([A-Za-z0-9_]+)\s*\(([^)]*)\)\s*:/g;
      let classMatch;
      while ((classMatch = pyClassRegex.exec(source)) !== null) {
        const className = classMatch[1];
        const baseClasses = classMatch[2];
        const isDbModel = /db\.Model|models\.Model|Base|declarative_base|UserMixin/i.test(baseClasses) || source.includes('db.Column') || source.includes('Column(');
        
        if (isDbModel) {
          // Extract class body until next top-level def/class
          const startIndex = classMatch.index + classMatch[0].length;
          const remainingSource = source.slice(startIndex);
          const nextClassOrDef = remainingSource.search(/\n(?:class |def [a-zA-Z_])/);
          const classBody = nextClassOrDef !== -1 ? remainingSource.slice(0, nextClassOrDef) : remainingSource.slice(0, 3000);

          const fields = [];
          const relationships = [];

          // Column matches: name = db.Column(...) or name = Column(...) or name = models.CharField(...)
          const colMatches = classBody.matchAll(/([a-zA-Z0-9_]+)\s*=\s*(?:db\.)?(?:models\.)?Column\(([^)]*)\)/g);
          for (const cm of colMatches) {
            const colName = cm[1];
            const colArgs = cm[2];
            const isPk = /primary_key\s*=\s*True/i.test(colArgs);
            const isNullable = !/nullable\s*=\s*False/i.test(colArgs);
            const isUnique = /unique\s*=\s*True/i.test(colArgs);
            
            // Extract Type (Integer, String(150), DateTime, Boolean, etc.)
            const typeMatch = colArgs.match(/(?:db\.)?([A-Za-z0-9_]+(?:\([0-9]+\))?)/);
            const colType = typeMatch ? typeMatch[1] : 'TEXT';

            fields.push({
              name: colName,
              dataType: colType,
              type: colType,
              isPrimary: isPk,
              required: !isNullable || isPk,
              unique: isUnique,
              defaultValue: extractDefaultValue(colArgs)
            });

            // Foreign Key Check
            const fkMatch = colArgs.match(/ForeignKey\(['"]([^'"]+)['"]\)/i);
            if (fkMatch) {
              relationships.push({
                type: 'Many-To-One',
                target: fkMatch[1].split('.')[0],
                field: colName
              });
            }
          }

          // Django-style field matches: name = models.CharField(...)
          const djangoMatches = classBody.matchAll(/([a-zA-Z0-9_]+)\s*=\s*models\.([A-Za-z0-9_]+)\(([^)]*)\)/g);
          for (const dm of djangoMatches) {
            const colName = dm[1];
            const colType = dm[2];
            const colArgs = dm[3];
            if (!fields.some(f => f.name === colName)) {
              fields.push({
                name: colName,
                dataType: colType,
                type: colType,
                isPrimary: /primary_key\s*=\s*True/i.test(colArgs),
                required: !/null\s*=\s*True/i.test(colArgs),
                defaultValue: extractDefaultValue(colArgs)
              });
            }
          }

          // Relationship definitions: name = db.relationship('Target', ...)
          const relDefMatches = classBody.matchAll(/([a-zA-Z0-9_]+)\s*=\s*(?:db\.)?relationship\(['"]([^'"]+)['"]/g);
          for (const rm of relDefMatches) {
            relationships.push({
              type: 'Association / Relationship',
              target: rm[2],
              field: rm[1]
            });
          }

          if (fields.length > 0 || relationships.length > 0) {
            entities.push({
              name: className,
              file: file.relativePath,
              language: 'Python',
              type: 'SQLAlchemy / Python Model',
              tableName: className.toLowerCase(),
              collectionName: null,
              fields: fields.length > 0 ? fields : [{ name: 'id', type: 'Integer (PK)', isPrimary: true, required: true }],
              relationships,
              indexes: []
            });
          }
        }
      }

      // 1B. Python SQLAlchemy db.Table definitions: enrollments = db.Table('enrollments', ...)
      const tableDefRegex = /([a-zA-Z0-9_]+)\s*=\s*(?:db\.)?Table\(\s*['"]([a-zA-Z0-9_]+)['"]\s*,([\s\S]*?)\)/g;
      let tableDefMatch;
      while ((tableDefMatch = tableDefRegex.exec(source)) !== null) {
        const varName = tableDefMatch[1];
        const tableName = tableDefMatch[2];
        const body = tableDefMatch[3];

        const fields = [];
        const relationships = [];
        const colRegex = /(?:db\.)?Column\(\s*['"]([a-zA-Z0-9_]+)['"]\s*,\s*([^,)]+)(?:,([\s\S]*?))?\)/g;
        let colMatch;
        while ((colMatch = colRegex.exec(body)) !== null) {
          const colName = colMatch[1];
          const colType = colMatch[2].replace(/db\./g, '').trim();
          const extra = colMatch[3] || '';
          fields.push({
            name: colName,
            dataType: colType,
            type: colType,
            isPrimary: /primary_key\s*=\s*True/i.test(extra),
            required: true
          });
          const fkMatch = extra.match(/ForeignKey\(['"]([^'"]+)['"]\)/i);
          if (fkMatch) {
            relationships.push({
              type: 'Many-To-One',
              target: fkMatch[1].split('.')[0],
              field: colName
            });
          }
        }

        if (!entities.some(e => e.name === tableName || e.tableName === tableName)) {
          entities.push({
            name: tableName,
            file: file.relativePath,
            language: 'Python',
            type: 'SQLAlchemy Association Table',
            tableName,
            collectionName: null,
            fields,
            relationships,
            indexes: []
          });
        }
      }
    }

    // 2. JavaScript / TypeScript Mongoose Models & Schemas
    if (ext === '.js' || ext === '.ts' || ext === '.mjs' || ext === '.cjs') {
      const mongooseModelRegex = /(?:const|let|var)\s+([A-Za-z0-9_]+)\s*=\s*mongoose\.model\(\s*['"]([^'"]+)['"]/g;
      let mModelMatch;
      while ((mModelMatch = mongooseModelRegex.exec(source)) !== null) {
        const modelVar = mModelMatch[1];
        const modelName = mModelMatch[2];
        entities.push({
          name: modelName,
          file: file.relativePath,
          language: 'JavaScript / Node.js',
          type: 'Mongoose Model',
          tableName: null,
          collectionName: `${modelName.toLowerCase()}s`,
          fields: extractMongooseFields(source),
          relationships: [],
          indexes: []
        });
      }

      // Sequelize models: sequelize.define('User', { ... })
      const seqRegex = /sequelize\.define\(\s*['"]([^'"]+)['"]\s*,\s*\{([^}]+)\}/g;
      let seqMatch;
      while ((seqMatch = seqRegex.exec(source)) !== null) {
        const modelName = seqMatch[1];
        const fields = [];
        const fieldMatches = seqMatch[2].matchAll(/([a-zA-Z0-9_]+)\s*:\s*(?:DataTypes\.)?([A-Za-z0-9_]+)/g);
        for (const fm of fieldMatches) {
          fields.push({ name: fm[1], dataType: fm[2], type: fm[2], required: true });
        }
        entities.push({
          name: modelName,
          file: file.relativePath,
          language: 'JavaScript / Node.js',
          type: 'Sequelize Model',
          tableName: modelName.toLowerCase(),
          collectionName: null,
          fields,
          relationships: [],
          indexes: []
        });
      }

      // TypeScript TypeORM / Prisma models
      const typeOrmClassRegex = /@Entity\s*\(\s*(?:['"]([^'"]+)['"])?\s*\)[\s\S]*?class\s+([A-Za-z0-9_]+)/g;
      let tormMatch;
      while ((tormMatch = typeOrmClassRegex.exec(source)) !== null) {
        const tableName = tormMatch[1] || tormMatch[2];
        const className = tormMatch[2];
        entities.push({
          name: className,
          file: file.relativePath,
          language: 'TypeScript',
          type: 'TypeORM Entity',
          tableName,
          collectionName: null,
          fields: extractTypeOrmFields(source),
          relationships: [],
          indexes: []
        });
      }
    }

    // 3. SQL DDL Table Extraction (CREATE TABLE in .sql or .py or migrations)
    if (ext === '.sql' || ext === '.py' || source.includes('CREATE TABLE')) {
      const sqlTableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["'`]?([A-Za-z0-9_]+)["'`]?\.)?["'`]?([A-Za-z0-9_]+)["'`]?\s*\(([\s\S]*?)\)/gi;
      let tableMatch;
      while ((tableMatch = sqlTableRegex.exec(source)) !== null) {
        const tableName = tableMatch[2] || tableMatch[1];
        const body = tableMatch[3];
        const fields = body.split(',').map(col => {
          const trimmed = col.trim();
          if (!trimmed) return null;
          const colParts = trimmed.split(/\s+/);
          const colName = colParts[0].replace(/["'`]/g, '');
          const colType = colParts.slice(1).join(' ') || 'TEXT';
          return {
            name: colName,
            dataType: colType,
            type: colType,
            required: trimmed.toUpperCase().includes('NOT NULL') || trimmed.toUpperCase().includes('PRIMARY KEY'),
            isPrimary: trimmed.toUpperCase().includes('PRIMARY KEY'),
            defaultValue: null
          };
        }).filter(f => f && f.name && !['PRIMARY', 'FOREIGN', 'CONSTRAINT', 'UNIQUE', 'CHECK', 'INDEX', 'KEY'].includes(f.name.toUpperCase()));

        // Check for ALTER TABLE evolution in same source
        const alterRegex = new RegExp(`ALTER\\s+TABLE\\s+${tableName}\\s+ADD\\s+COLUMN\\s+([A-Za-z0-9_]+)\\s+([^;\\n\\)]+)`, 'gi');
        let alterMatch;
        while ((alterMatch = alterRegex.exec(source)) !== null) {
          const addColName = alterMatch[1];
          const addColType = alterMatch[2].trim();
          if (!fields.some(f => f.name === addColName)) {
            fields.push({
              name: addColName,
              dataType: addColType,
              type: addColType,
              required: false,
              isPrimary: false,
              defaultValue: "'Neutral'",
              evolution: 'ALTER TABLE ADD COLUMN'
            });
          }
        }

        if (!entities.some(e => e.name === tableName || e.tableName === tableName)) {
          entities.push({
            name: tableName,
            file: file.relativePath,
            language: ext === '.py' ? 'Python / SQLite' : 'SQL DDL',
            type: 'SQL Table',
            tableName,
            collectionName: null,
            fields: fields.length > 0 ? fields : [{ name: 'id', type: 'INTEGER (PK)', isPrimary: true, required: true }],
            relationships: [],
            indexes: []
          });
        }
      }
    }
  }

  return entities;
}

function extractMongooseFields(source) {
  const fields = [];
  const fieldBlock = source.match(/new\s+Schema\s*\((\{[\s\S]*?\})\)/i);
  if (fieldBlock) {
    const fieldText = fieldBlock[1];
    const fieldMatches = fieldText.matchAll(/([A-Za-z0-9_]+)\s*:\s*\{([^}]+)\}/g);
    for (const match of fieldMatches) {
      fields.push({
        name: match[1],
        dataType: inferMongooseType(match[2]),
        required: /required\s*:\s*true/i.test(match[2]),
        defaultValue: extractDefaultValue(match[2])
      });
    }
  }
  return fields.length > 0 ? fields : [{ name: '_id', type: 'ObjectId (PK)', isPrimary: true, required: true }];
}

function inferMongooseType(text) {
  if (/String/i.test(text)) return 'String';
  if (/Number/i.test(text)) return 'Number';
  if (/Boolean/i.test(text)) return 'Boolean';
  if (/Date/i.test(text)) return 'Date';
  if (/ObjectId/i.test(text)) return 'ObjectId';
  if (/Array|\[/i.test(text)) return 'Array';
  return 'Mixed';
}

function extractTypeOrmFields(source) {
  const fields = [];
  const fieldMatches = source.matchAll(/@Column\s*\(([^\)]*)\)\s*\n\s*(?:public|private|protected)?\s*([A-Za-z0-9_]+)/gi);
  for (const match of fieldMatches) {
    fields.push({
      name: match[2],
      dataType: 'Column',
      type: 'Column',
      required: true
    });
  }
  return fields.length > 0 ? fields : [{ name: 'id', type: 'Integer (PK)', isPrimary: true, required: true }];
}

function extractDefaultValue(text) {
  const match = text.match(/default\s*:\s*([^,}]+)/i) || text.match(/default\s*=\s*([^,)]+)/i);
  return match ? match[1].trim().replace(/['"]/g, '') : null;
}
