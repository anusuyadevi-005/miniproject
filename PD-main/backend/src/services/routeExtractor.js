import path from 'path';
import { visit } from './astUtils.js';

const EXPRESS_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'all'];
const GRAPHQL_METHODS = ['query', 'mutation'];

function extractRouteFromExpressCall(node) {
  if (!node || node.type !== 'CallExpression') return null;
  const callee = node.callee;
  if (!callee) return null;

  const objectName = callee.object?.name || callee.object?.property?.name;
  const methodName = callee.property?.name?.toLowerCase();
  if (!EXPRESS_METHODS.includes(methodName)) return null;

  const routeArg = node.arguments[0];
  if (!routeArg) return null;

  const routePath = routeArg.value || routeArg.extra?.rawValue || (routeArg.elements && routeArg.elements.map((item) => item.value).join(','));
  if (!routePath) return null;

  return { method: methodName.toUpperCase(), path: routePath, router: objectName, node };
}

function extractRouteFromNestDecorators(node) {
  if (!node || !node.decorators) return null;
  const pathDecorator = node.decorators.find((decorator) => decorator.expression?.callee?.name === 'Controller');
  if (!pathDecorator) return null;
  const controllerPath = pathDecorator.expression.arguments?.[0]?.text || pathDecorator.expression.arguments?.[0]?.value || '/';
  const routes = [];
  (node.body?.body || []).forEach((methodNode) => {
    const decorator = methodNode.decorators?.find((decorator) => decorator.expression?.callee?.name?.toLowerCase?.() === methodNode.key?.name?.toLowerCase?.());
    if (!decorator) return;
    const httpMethod = decorator.expression.callee.name.toUpperCase();
    const methodPathArg = decorator.expression.arguments?.[0];
    const methodPath = methodPathArg?.text || methodPathArg?.value || '/';
    routes.push({ method: httpMethod, path: path.posix.join(controllerPath, methodPath), node: methodNode });
  });
  return routes;
}

function extractGraphQLRoutes(node) {
  const routes = [];
  if (node.type === 'CallExpression') {
    const callee = node.callee;
    const functionName = callee?.name || callee?.property?.name;
    if (GRAPHQL_METHODS.includes(functionName?.toLowerCase())) {
      const fieldName = node.arguments?.[0]?.value || node.arguments?.[0]?.name?.value;
      routes.push({ method: functionName.toUpperCase(), path: `GraphQL/${fieldName}`, node });
    }
  }
  return routes;
}

import { PolyglotExtractor } from '../parsers/polyglotExtractor.js';

export function extractRoutes(parsedFile) {
  const results = [];

  // 1. Check if parsedFile already has polyglot symbols
  if (parsedFile.ast?.symbols?.routes) {
    results.push(...parsedFile.ast.symbols.routes.map(r => ({
      method: r.method,
      path: r.endpoint,
      handlerName: r.handler,
      framework: r.framework,
      file: parsedFile.filePath
    })));
  }

  // 2. Run AST visitor for Express, Nest, and GraphQL
  visit(parsedFile.ast, (node) => {
    if (node.type === 'CallExpression') {
      const route = extractRouteFromExpressCall(node);
      if (route) {
        results.push({ ...route, file: parsedFile.filePath });
      }
      results.push(...extractGraphQLRoutes(node).map((route) => ({ ...route, file: parsedFile.filePath })));
    }
    if (node.type === 'ClassDeclaration') {
      const nestRoutes = extractRouteFromNestDecorators(node);
      if (nestRoutes && nestRoutes.length) {
        results.push(...nestRoutes.map((route) => ({ ...route, file: parsedFile.filePath })));
      }
    }
  });

  // 3. Fallback to PolyglotExtractor if no routes found yet and source is present
  if (results.length === 0 && parsedFile.source) {
    const polyglot = PolyglotExtractor.extractFromSource(parsedFile.source, parsedFile.language || '', parsedFile.filePath || '');
    if (polyglot.routes && polyglot.routes.length > 0) {
      results.push(...polyglot.routes.map(r => ({
        method: r.method,
        path: r.endpoint,
        handlerName: r.handler,
        framework: r.framework,
        file: parsedFile.filePath
      })));
    }
  }

  return results;
}

