import fs from 'fs-extra';
import path from 'path';

const SOURCE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.sql', '.prisma'];

export async function analyzeIndexes(inventory) {
  const files = inventory.files || [];
  const indexes = [];

  for (const file of files) {
    const ext = path.extname(file.relativePath).toLowerCase();
    if (!SOURCE_EXTENSIONS.includes(ext)) continue;

    const source = await fs.readFile(file.absolutePath, 'utf8').catch(() => '');
    if (!source) continue;

    if (ext === '.sql') {
      indexes.push(...extractSqlIndexes(source, file.relativePath));
    }
    indexes.push(...extractSourceIndexes(source, ext, file.relativePath));
  }

  return indexes;
}

function extractSqlIndexes(source, file) {
  const indexes = [];
  const regex = /CREATE\s+(UNIQUE\s+)?INDEX\s+[^\s]+\s+ON\s+([A-Za-z0-9_\.]+)\s*\(([^\)]+)\)/gi;
  for (const match of source.matchAll(regex)) {
    indexes.push({ entity: match[2], fields: match[3].split(',').map((f) => f.trim()), unique: Boolean(match[1]), type: 'SQL Index', file });
  }
  return indexes;
}

function extractSourceIndexes(source, ext, file) {
  const indexes = [];
  const mongooseRegex = /\.index\s*\(\s*\{([^}]+)\}/gi;
  for (const match of source.matchAll(mongooseRegex)) {
    const fields = match[1].split(',').map((item) => item.split(':')[0].trim()).filter(Boolean);
    indexes.push({ entity: 'Mongoose', fields, unique: /unique\s*:\s*true/i.test(match[1]), type: 'Mongoose Index', file });
  }

  const prismaRegex = /@@index\s*\(([^\)]+)\)/gi;
  for (const match of source.matchAll(prismaRegex)) {
    const fields = match[1].split(',').map((item) => item.trim().replace(/['\"]/g, '')).filter(Boolean);
    indexes.push({ entity: 'Prisma', fields, unique: false, type: 'Prisma Index', file });
  }

  const typeOrmRegex = /@Index\s*\(\s*\[([^\]]+)\]/gi;
  for (const match of source.matchAll(typeOrmRegex)) {
    const fields = match[1].split(',').map((item) => item.replace(/['\"]/g, '').trim()).filter(Boolean);
    indexes.push({ entity: 'TypeORM', fields, unique: /unique\s*:\s*true/i.test(source), type: 'TypeORM Index', file });
  }

  const djangoRegex = /indexes\s*=\s*\[([^\]]+)\]/gi;
  for (const match of source.matchAll(djangoRegex)) {
    const fields = Array.from(match[1].matchAll(/\('([^']+)'\)/g)).map((m) => m[1]);
    indexes.push({ entity: 'Django', fields, unique: false, type: 'Django Index', file });
  }

  const sequelizeRegex = /indexes\s*:\s*\[([\s\S]*?)\]/gi;
  for (const match of source.matchAll(sequelizeRegex)) {
    const block = match[1];
    const fieldMatches = block.matchAll(/fields\s*:\s*\[([^\]]+)\]/gi);
    for (const fieldMatch of fieldMatches) {
      const fields = fieldMatch[1].split(',').map((item) => item.replace(/['\"]/g, '').trim()).filter(Boolean);
      indexes.push({ entity: 'Sequelize', fields, unique: /unique\s*:\s*true/i.test(block), type: 'Sequelize Index', file });
    }
  }

  return indexes;
}
