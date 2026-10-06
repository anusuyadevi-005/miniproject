import fs from 'fs-extra';
import path from 'path';

const MIGRATION_PATTERNS = [
  { type: 'Flyway', patterns: ['flyway.conf', 'sql/migrations', 'db/migration'] },
  { type: 'Liquibase', patterns: ['liquibase', 'changelog', 'db/changelog'] },
  { type: 'Prisma Migration', patterns: ['prisma/migrations', 'migration.sql', 'schema.prisma'] },
  { type: 'Mongoose Migration', patterns: ['migrate-mongo', 'migrations/mongo', 'scripts/migrate'] },
  { type: 'SQL Script', patterns: ['.sql'] }
];

export async function analyzeMigrations(inventory) {
  const files = inventory.files || [];
  const migrations = [];

  for (const file of files) {
    const relativePath = file.relativePath.toLowerCase();
    MIGRATION_PATTERNS.forEach((entry) => {
      if (entry.patterns.some((pattern) => relativePath.includes(pattern))) {
        migrations.push({ type: entry.type, file: file.relativePath, path: file.absolutePath });
      }
    });
  }

  return Array.from(new Map(migrations.map((item) => [`${item.type}:${item.file}`, item])).values());
}
