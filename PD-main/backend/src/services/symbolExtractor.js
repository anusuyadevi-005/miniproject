import { visit } from './astUtils.js';

export function extractSymbols(parsedFiles) {
  const symbols = {
    classes: [],
    interfaces: [],
    enums: [],
    functions: [],
    methods: [],
    imports: [],
    exports: [],
    variables: []
  };

  for (const file of parsedFiles) {
    if (file.ast?.symbols) {
      const s = file.ast.symbols;
      if (s.classes) symbols.classes.push(...s.classes);
      if (s.functions) symbols.functions.push(...s.functions);
      if (s.methods) symbols.methods.push(...s.methods);
      if (s.imports) symbols.imports.push(...s.imports);
      if (s.exports) symbols.exports.push(...s.exports);
      continue;
    }

    const context = { file, symbols };
    visit(file.ast, (node, parent) => {
      if (!node || !node.type) return;

      if (isClassNode(node)) {
        symbols.classes.push(extractClass(node, file));
      }
      if (isFunctionNode(node)) {
        const fn = extractFunction(node, file);
        if (fn.isMethod) {
          symbols.methods.push(fn);
        } else {
          symbols.functions.push(fn);
        }
      }
      if (isImportNode(node)) {
        symbols.imports.push(extractImport(node, file));
      }
      if (isExportNode(node)) {
        symbols.exports.push(extractExport(node, file));
      }
      if (isVariableNode(node)) {
        symbols.variables.push(extractVariable(node, file));
      }
    });
  }

  return symbols;
}

function isClassNode(node) {
  return ['ClassDeclaration', 'ClassDefinition', 'class_declaration', 'class_declaration', 'class_definition'].includes(node.type);
}

function isFunctionNode(node) {
  return [
    'FunctionDeclaration',
    'FunctionExpression',
    'ArrowFunctionExpression',
    'MethodDefinition',
    'method_definition',
    'function_definition',
    'function_declaration'
  ].includes(node.type);
}

function isImportNode(node) {
  return ['ImportDeclaration', 'import_statement', 'using_directive', 'namespace_definition'].includes(node.type);
}

function isExportNode(node) {
  return ['ExportNamedDeclaration', 'ExportDefaultDeclaration', 'export_statement', 'export_assignment'].includes(node.type);
}

function isVariableNode(node) {
  return ['VariableDeclaration', 'variable_declarator', 'assignment_expression', 'constant_declaration', 'let_declaration', 'const_declaration'].includes(node.type);
}

function getNodeText(node, file) {
  if (!node || !node.source) return null;
  const start = node.startIndex ?? node.range?.[0];
  const end = node.endIndex ?? node.range?.[1];
  return file.source.slice(start, end);
}

function extractClass(node, file) {
  return {
    name: node.id?.name || node.name?.value || 'anonymous',
    visibility: node.accessibility || node.modifiers?.find((m) => ['public', 'private', 'protected'].includes(m)) || 'public',
    parentClass: node.superClass?.name || node.superClass?.id?.name || null,
    implementedInterfaces: extractImplementedInterfaces(node),
    constructor: extractConstructor(node, file),
    properties: extractProperties(node),
    methods: extractMethods(node, file),
    decorators: node.decorators || [],
    annotations: node.annotations || [],
    location: getLocation(node),
    file: file.relativePath,
    source: getNodeText(node, file)
  };
}

function extractImplementedInterfaces(node) {
  if (!node.implements) return [];
  return node.implements.map((impl) => impl.name || impl.expression?.name).filter(Boolean);
}

function extractConstructor(node, file) {
  const constructorNode = node.body?.body?.find((member) => member.kind === 'constructor' || member.type === 'constructor');
  if (!constructorNode) return null;
  return extractFunction(constructorNode, file);
}

function extractProperties(node) {
  const properties = [];
  const body = node.body?.body || [];
  for (const member of body) {
    if (member.type === 'ClassProperty' || member.type === 'property_definition' || member.type === 'field_declaration') {
      properties.push({
        name: member.key?.name || member.name?.value || null,
        visibility: member.accessibility || 'public',
        type: member.typeAnnotation?.typeAnnotation?.typeName?.name || member.typeAnnotation?.type?.name || null,
        modifiers: member.static ? ['static'] : [],
        location: getLocation(member)
      });
    }
  }
  return properties;
}

function extractMethods(node, file) {
  const methods = [];
  const body = node.body?.body || [];
  for (const member of body) {
    if (member.type === 'MethodDefinition' || member.type === 'method_definition' || member.type === 'function_definition') {
      methods.push(extractFunction(member, file, true));
    }
  }
  return methods;
}

function extractFunction(node, file, isMethod = false) {
  return {
    name: node.id?.name || node.key?.name || node.name?.value || 'anonymous',
    parameters: extractParameters(node),
    returnType: node.returnType?.typeName?.name || node.returnType?.type || null,
    visibility: node.accessibility || 'public',
    isAsync: node.async === true,
    isStatic: node.static === true,
    isAbstract: node.abstract === true,
    isGenerator: node.generator === true,
    isMethod,
    location: getLocation(node),
    file: file.relativePath,
    source: getNodeText(node, file)
  };
}

function extractParameters(node) {
  const params = node.params || node.parameters || [];
  return params.map((param) => ({
    name: param.name?.value || param.name?.name || param.argument?.name || 'unknown',
    type: param.typeAnnotation?.typeAnnotation?.typeName?.name || param.typeAnnotation?.type || null,
    optional: param.optional || false
  }));
}

function extractImport(node, file) {
  return {
    source: node.source?.value || node.module?.value || node.path?.value || null,
    specifiers: (node.specifiers || node.imports || []).map((specifier) => specifier.local?.name || specifier.name?.value || specifier.name),
    file: file.relativePath,
    location: getLocation(node)
  };
}

function extractExport(node, file) {
  return {
    source: node.source?.value || null,
    specifiers: (node.specifiers || []).map((specifier) => specifier.exported?.name || specifier.local?.name || specifier.name),
    file: file.relativePath,
    location: getLocation(node)
  };
}

function extractVariable(node, file) {
  return {
    name: node.id?.name || node.name?.value || null,
    kind: node.kind || node.type || 'variable',
    file: file.relativePath,
    location: getLocation(node)
  };
}

function getLocation(node) {
  if (!node || node.loc == null) return null;
  return {
    start: node.loc.start,
    end: node.loc.end
  };
}
