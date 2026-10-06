import fs from 'fs-extra';
import { parseJava } from './javaParser.js';
import { parseJavaScript } from './javascriptParser.js';
import { parseTypeScript } from './typescriptParser.js';
import { parsePython } from './pythonParser.js';
import { parseCpp } from './cppParser.js';
import { parseCSharp } from './csharpParser.js';
import { parseGo } from './goParser.js';
import { parsePhp } from './phpParser.js';
import { PolyglotExtractor } from './polyglotExtractor.js';

async function parsePolyglotGeneric(filePath, language) {
  const text = await fs.readFile(filePath, 'utf8');
  const symbols = PolyglotExtractor.extractFromSource(text, language, filePath);
  return {
    language,
    ast: { _type: 'PolyglotAST', symbols },
    source: text,
    filePath
  };
}

const extensionMap = {
  '.js': parseJavaScript,
  '.jsx': parseJavaScript,
  '.ts': parseTypeScript,
  '.tsx': parseTypeScript,
  '.py': parsePython,
  '.java': parseJava,
  '.cpp': parseCpp,
  '.cc': parseCpp,
  '.cxx': parseCpp,
  '.hpp': parseCpp,
  '.h': parseCpp,
  '.cs': parseCSharp,
  '.go': parseGo,
  '.php': parsePhp,
  '.rs': (fp) => parsePolyglotGeneric(fp, 'Rust'),
  '.kt': (fp) => parsePolyglotGeneric(fp, 'Kotlin'),
  '.dart': (fp) => parsePolyglotGeneric(fp, 'Dart'),
  '.rb': (fp) => parsePolyglotGeneric(fp, 'Ruby'),
  '.sql': (fp) => parsePolyglotGeneric(fp, 'SQL')
};

export function getParserForExtension(extension) {
  return extensionMap[extension.toLowerCase()] || ((fp) => parsePolyglotGeneric(fp, 'Generic'));
}

export const supportedExtensions = Object.keys(extensionMap);
