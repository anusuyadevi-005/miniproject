import { visit } from './astUtils.js';

const VALIDATION_LIBS = ['express-validator', 'joi', 'zod', 'class-validator', 'validator', '@hapi/joi'];

export function analyzeValidation(parsedFile) {
  const validations = [];

  visit(parsedFile.ast, (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'ImportDeclaration') {
      const source = node.source?.value || node.module?.value;
      if (typeof source === 'string' && VALIDATION_LIBS.some((lib) => source.includes(lib))) {
        validations.push({ type: 'library', library: source, file: parsedFile.filePath });
      }
    }
    if (node.type === 'CallExpression') {
      const callee = node.callee;
      const name = callee?.name || callee?.property?.name;
      if (!name) return;
      if (/check|body|param|query|validation|schema|parse|safeParse/i.test(name)) {
        validations.push({ type: 'runtime', name, file: parsedFile.filePath });
      }
    }
    if (node.type === 'Decorator') {
      const name = node.expression?.callee?.name || node.expression?.name;
      if (/Is.*|Validate|Matches|Min|Max|Length|IsEmail|IsUUID/i.test(name)) {
        validations.push({ type: 'decorator', name, file: parsedFile.filePath });
      }
    }
  });

  return validations;
}
