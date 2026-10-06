import fs from 'fs-extra';
import path from 'path';
import { visit } from './astUtils.js';

const ORMS = [
  { name: 'Mongoose', matcher: /mongoose/i, filePatterns: ['.js', '.ts'] },
  { name: 'Prisma', matcher: /prisma/i, filePatterns: ['.prisma'] },
  { name: 'TypeORM', matcher: /typeorm/i, filePatterns: ['.ts', '.js'] },
  { name: 'Sequelize', matcher: /sequelize/i, filePatterns: ['.js', '.ts'] },
  { name: 'Hibernate', matcher: /hibernate/i, filePatterns: ['.java'] },
  { name: 'JPA', matcher: /javax\.persistence|jakarta\.persistence/i, filePatterns: ['.java'] },
  { name: 'Entity Framework', matcher: /entityframework|dbset|modelbuilder/i, filePatterns: ['.cs'] },
  { name: 'SQLAlchemy', matcher: /sqlalchemy/i, filePatterns: ['.py'] },
  { name: 'Django ORM', matcher: /django\.db\.models|models\.Model/i, filePatterns: ['.py'] },
  { name: 'Firebase Firestore', matcher: /firebase\/firestore|firebase\.firestore/i, filePatterns: ['.js', '.ts', '.py'] }
];

const SOURCE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.cs', '.go', '.php', '.prisma'];

export async function analyzeORMs(inventory) {
  const files = (inventory.files || []).filter((file) => SOURCE_EXTENSIONS.includes(path.extname(file.relativePath).toLowerCase()));
  const discovered = new Set();

  for (const file of files) {
    const ext = path.extname(file.relativePath).toLowerCase();
    const source = await fs.readFile(file.absolutePath, 'utf8').catch(() => '');

    ORMS.forEach((orm) => {
      if (!orm.filePatterns.includes(ext) && ext !== '.prisma') return;
      if (orm.matcher.test(source) || orm.matcher.test(file.relativePath)) {
        discovered.add(orm.name);
      }
    });
  }

  return Array.from(discovered);
}
