import fs from 'fs-extra';

let Parser = null;
let Cpp = null;
let treeSitterAvailable = false;

try {
  Parser = (await import('tree-sitter')).default;
  Cpp = (await import('tree-sitter-cpp')).default;
  treeSitterAvailable = true;
} catch (error) {
  console.warn('Optional tree-sitter parsers unavailable for C++ analysis:', error.message);
}

export async function parseCpp(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  if (!treeSitterAvailable) {
    return { language: 'C++', ast: null, source: text, filePath, warning: 'tree-sitter parser unavailable' };
  }

  const parser = new Parser();
  parser.setLanguage(Cpp);
  const tree = parser.parse(text);
  return { language: 'C++', ast: tree, source: text, filePath };
}

