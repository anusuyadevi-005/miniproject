import fs from 'fs-extra';

let PHPParser = null;
let phpParserAvailable = false;

try {
  PHPParser = (await import('php-parser')).default;
  phpParserAvailable = true;
} catch (error) {
  console.warn('Optional php-parser unavailable for PHP analysis:', error.message);
}

export async function parsePhp(filePath) {
  const text = await fs.readFile(filePath, 'utf8');
  if (!phpParserAvailable) {
    return { language: 'PHP', ast: null, source: text, filePath, warning: 'php-parser unavailable' };
  }

  const parser = new PHPParser({ parser: { php7: true }, ast: { withPositions: true } });
  const ast = parser.parseCode(text, filePath);
  return { language: 'PHP', ast, source: text, filePath };
}
