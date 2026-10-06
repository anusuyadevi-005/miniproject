import fs from 'fs-extra';

let CSharpParser = null;
let CSharp = null;
let csharpAvailable = false;

try {
  CSharpParser = (await import('tree-sitter')).default;
  CSharp = (await import('tree-sitter-c-sharp')).default;
  csharpAvailable = true;
} catch (error) {
  console.warn('Optional tree-sitter parser unavailable for C# analysis:', error.message);
}

export async function parseCSharp(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  if (!csharpAvailable) {
    return { language: 'C#', ast: null, source: text, filePath, warning: 'tree-sitter parser unavailable' };
  }

  const parser = new CSharpParser();
  parser.setLanguage(CSharp);
  const tree = parser.parse(text);
  return { language: 'C#', ast: tree, source: text, filePath };
}
