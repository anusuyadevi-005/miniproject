import { visit } from './astUtils.js';

export function analyzeRequestSchema(parsedFile) {
  const requests = [];
  visit(parsedFile.ast, (node) => {
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const name = callee?.property?.name || callee?.name;
      if (/body|json|formData|file|upload|query|param|params/i.test(name)) {
        requests.push({ file: parsedFile.filePath, expression: name, nodeType: node.type, source: extractSource(parsedFile, node) });
      }
    }
    if (node.type === 'MemberExpression') {
      const text = serializeMemberExpression(node);
      if (/req\.(body|query|params|headers|cookies)/i.test(text)) {
        requests.push({ file: parsedFile.filePath, expression: text, nodeType: node.type, source: extractSource(parsedFile, node) });
      }
    }
  });
  return requests;
}

function serializeMemberExpression(node) {
  if (!node) return '';
  const object = node.object?.name || serializeMemberExpression(node.object);
  const property = node.property?.name || node.property?.value || '';
  return `${object}.${property}`;
}

function extractSource(parsedFile, node) {
  if (!node || typeof node.start !== 'number' || typeof node.end !== 'number') return null;
  return parsedFile.source.slice(node.start, node.end);
}
