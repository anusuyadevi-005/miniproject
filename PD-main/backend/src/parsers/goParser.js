import fs from 'fs-extra';

let GoParser = null;
let Go = null;
let goAvailable = false;

try {
  GoParser = (await import('tree-sitter')).default;
  Go = (await import('tree-sitter-go')).default;
  goAvailable = true;
} catch (error) {
  console.warn('Optional tree-sitter parser unavailable for Go analysis:', error.message);
}

export async function parseGo(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  if (!goAvailable) {
    return { language: 'Go', ast: null, source: text, filePath, warning: 'tree-sitter parser unavailable' };
  }

  const parser = new GoParser();
  parser.setLanguage(Go);
  const tree = parser.parse(text);
  return { language: 'Go', ast: tree, source: text, filePath };
}
