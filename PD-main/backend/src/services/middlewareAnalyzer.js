import { visit } from './astUtils.js';

const MIDDLEWARE_IDENTIFIERS = ['use', 'middleware', 'app.use', 'router.use'];

export function analyzeMiddleware(parsedFile) {
  const middleware = [];
  visit(parsedFile.ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const callee = node.callee;
    const method = callee?.property?.name || callee?.name;
    if (!method || !MIDDLEWARE_IDENTIFIERS.includes(method)) return;
    const args = (node.arguments || []).map((arg) => arg.name || arg.type || arg.callee?.name || null).filter(Boolean);
    middleware.push({ file: parsedFile.filePath, method, args, source: parsedFile.source.slice(node.start || 0, node.end || 0) });
  });
  return middleware;
}
