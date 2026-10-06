import path from 'path';
import { getParserForExtension } from '../parsers/index.js';
import { extractRoutes } from './routeExtractor.js';
import { analyzeController } from './controllerAnalyzer.js';
import { analyzeMiddleware } from './middlewareAnalyzer.js';
import { analyzeAuthentication } from './authenticationAnalyzer.js';
import { analyzeValidation } from './validationAnalyzer.js';
import { analyzeRequestSchema } from './requestSchemaAnalyzer.js';
import { analyzeResponseSchema } from './responseSchemaAnalyzer.js';

const SOURCE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.java', '.php', '.cs', '.go'];

export async function analyzeApis(inventory) {
  const files = inventory.files || [];
  const sourceFiles = files.filter((file) => SOURCE_EXTENSIONS.includes(path.extname(file.relativePath)));
  const apiResults = [];

  for (const file of sourceFiles) {
    const parser = getParserForExtension(path.extname(file.relativePath));
    if (!parser) continue;

    try {
      const parsed = await parser(file.absolutePath);
      const routes = extractRoutes(parsed) || [];
      const controllers = analyzeController(parsed) || [];
      const middleware = analyzeMiddleware(parsed) || [];
      const auth = analyzeAuthentication(parsed) || { providers: [] };
      const validation = analyzeValidation(parsed) || [];
      const request = analyzeRequestSchema(parsed) || [];
      const response = analyzeResponseSchema(parsed) || [];

      routes.forEach((route) => {
        const controller = controllers.find((ctrl) => route.file === ctrl.file) || null;
        const handler = controller?.methods?.find((method) => method.name === route.handlerName || method.name === route.methodName) || null;
        apiResults.push({
          id: `${inventory.repositoryId}:api:${route.method}:${route.path}`,
          method: route.method,
          route: route.path,
          controller: controller?.name || null,
          handler: handler?.name || route.handlerName || null,
          file: path.relative(process.cwd(), route.file),
          middleware: middleware.map((item) => item.method || item.args).filter(Boolean),
          authentication: auth,
          authorization: auth.providers || [],
          validation: validation.map((item) => item.name || item.library),
          consumes: request.map((item) => item.expression),
          produces: response.map((item) => item.expression),
          request: request,
          response: response,
          statusCodes: Array.from(new Set(response.map((item) => extractStatusCodes(item.source)))).filter(Boolean),
          dependencies: [route.router || null].filter(Boolean),
          middlewareDefinition: middleware,
          controllerDefinition: controller,
          requestSchema: request,
          responseSchema: response,
          authenticationDetails: auth,
          validationDetails: validation,
          source: parsed.source
        });
      });
    } catch (err) {
      console.warn(`API analysis failed for ${file.relativePath}:`, err.message);
    }
  }

  return apiResults;
}

function extractStatusCodes(source) {
  if (!source || typeof source !== 'string') return null;
  const match = source.match(/\.status\((\d{3})\)/);
  return match ? parseInt(match[1], 10) : null;
}
