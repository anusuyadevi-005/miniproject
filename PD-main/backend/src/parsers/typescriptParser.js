import fs from 'fs-extra';
import { Project } from 'ts-morph';

export async function parseTypeScript(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  const project = new Project({ useInMemoryFileSystem: true, compilerOptions: { allowJs: true, target: 99 } });
  project.createSourceFile(filePath, text);
  const sourceFile = project.getSourceFileOrThrow(filePath);
  return { language: 'TypeScript', ast: sourceFile, source: text, filePath };
}
