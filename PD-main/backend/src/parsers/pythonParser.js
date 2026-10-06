import fs from 'fs-extra';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { PolyglotExtractor } from './polyglotExtractor.js';

const execFileAsync = promisify(execFile);

export async function parsePython(filePath) {
  const text = await fs.readFile(filePath, 'utf8');

  try {
    const pythonScript = `import ast, json, sys
from pathlib import Path
path = Path(sys.argv[1])
source = path.read_text(encoding='utf-8')
node = ast.parse(source, filename=str(path))

def node_to_dict(node):
    if isinstance(node, ast.AST):
        result = {'_type': node.__class__.__name__}
        for field, value in ast.iter_fields(node):
            if isinstance(value, list):
                result[field] = [node_to_dict(item) for item in value]
            else:
                result[field] = node_to_dict(value)
        return result
    return node

print(json.dumps(node_to_dict(node)))`;

    const { stdout } = await execFileAsync('python', ['-c', pythonScript, filePath], {
      encoding: 'utf8',
      maxBuffer: 20 * 1024 * 1024,
      timeout: 5000
    });
    const ast = JSON.parse(stdout);
    return { language: 'Python', ast, source: text, filePath };
  } catch (err) {
    // Graceful fallback to deterministic symbol analysis
    const fallbackSymbols = PolyglotExtractor.extractFromSource(text, 'Python', filePath);
    return {
      language: 'Python',
      ast: { _type: 'FallbackModule', symbols: fallbackSymbols },
      source: text,
      filePath,
      warning: 'Native python parser fallback utilized'
    };
  }
}
