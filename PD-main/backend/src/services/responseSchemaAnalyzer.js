import { visit } from './astUtils.js';

export function analyzeResponseSchema(parsedFile) {
  const responses = [];
  visit(parsedFile.ast, (node) => {
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const name = callee?.property?.name || callee?.name;
      if (/send|json|status|render|redirect|write|end/i.test(name)) {
        responses.push({ file: parsedFile.filePath, expression: name, nodeType: node.type, source: extractSource(parsedFile, node) });
      }
    }
    if (node.type === 'MemberExpression') {
      const text = serializeMemberExpression(node);
      if (/res\.(status|json|send|redirect|write|end)/i.test(text)) {
        responses.push({ file: parsedFile.filePath, expression: text, nodeType: node.type, source: extractSource(parsedFile, node) });
      }
    }
  });
  return responses;
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
