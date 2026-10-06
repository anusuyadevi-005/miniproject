import { visit } from './astUtils.js';

export function analyzeController(parsedFile) {
  const controllers = [];
  visit(parsedFile.ast, (node, parent) => {
    if (node.type === 'ClassDeclaration' || node.type === 'ClassExpression') {
      const name = node.id?.name || 'AnonymousController';
      const methods = (node.body?.body || []).filter((member) => member.type === 'ClassMethod' || member.type === 'MethodDefinition').map((methodNode) => ({
        name: methodNode.key?.name || methodNode.key?.value || 'anonymous',
        params: (methodNode.params || []).map((param) => param.name || param.argument?.name || 'unknown'),
        auth: extractAuthenticationFromMethod(methodNode),
        validation: extractValidationFromMethod(methodNode),
        source: parsedFile.source.slice(methodNode.start || 0, methodNode.end || 0)
      }));
      controllers.push({ name, file: parsedFile.filePath, methods });
    }
  });
  return controllers;
}

function extractAuthenticationFromMethod(methodNode) {
  const auth = [];
  if (!methodNode.decorators) return auth;
  methodNode.decorators.forEach((decorator) => {
    const name = decorator.expression?.callee?.name || decorator.expression?.name;
    if (name && /Auth|Roles|UseGuards|Jwt|Passport/i.test(name)) {
      auth.push(name);
    }
  });
  return auth;
}

function extractValidationFromMethod(methodNode) {
  const validation = [];
  if (!methodNode.decorators) return validation;
  methodNode.decorators.forEach((decorator) => {
    const name = decorator.expression?.callee?.name || decorator.expression?.name;
    if (name && /Validate|Body|Param|Query|UsePipes|Parse|Is[A-Z]/.test(name)) {
      validation.push(name);
    }
  });
  return validation;
}
