export class OpenAPIExporter {
  /**
   * Generates a valid OpenAPI 3.0.3 specification JSON from extracted repository APIs.
   */
  static generateSpec(knowledgeGraph, projectName = 'Repository API', version = '1.0.0') {
    const apis = knowledgeGraph.findEntitiesByType('API');

    const paths = {};

    for (const api of apis) {
      let endpoint = api.metadata?.endpoint || api.name;
      const method = (api.metadata?.method || 'get').toLowerCase();

      if (!endpoint.startsWith('/')) {
        endpoint = '/' + endpoint;
      }

      // Convert Express/FastAPI path params :id to {id}
      const openApiPath = endpoint.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');

      if (!paths[openApiPath]) {
        paths[openApiPath] = {};
      }

      // Extract path parameters
      const pathParams = [];
      const paramMatches = openApiPath.match(/\{([a-zA-Z0-9_]+)\}/g);
      if (paramMatches) {
        paramMatches.forEach(p => {
          const paramName = p.replace(/[{}]/g, '');
          pathParams.push({
            name: paramName,
            in: 'path',
            required: true,
            schema: { type: 'string' },
            description: `Identifier for ${paramName}`
          });
        });
      }

      const operation = {
        summary: `${method.toUpperCase()} ${endpoint}`,
        description: `Handler: ${api.metadata?.handler || api.name}. Reconstructed from evidence in ${api.path || 'routes'}.`,
        operationId: `${method}_${endpoint.replace(/[^a-zA-Z0-9]/g, '_')}`,
        parameters: pathParams,
        responses: {
          '200': {
            description: 'Successful response',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { type: 'object' }
                  }
                }
              }
            }
          },
          '400': {
            description: 'Bad request / validation error'
          },
          '401': {
            description: 'Unauthorized / invalid authentication token'
          },
          '500': {
            description: 'Internal server error'
          }
        }
      };

      if (['post', 'put', 'patch'].includes(method)) {
        operation.requestBody = {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                description: 'Payload for resource operation'
              }
            }
          }
        };
      }

      paths[openApiPath][method] = operation;
    }

    return {
      openapi: '3.0.3',
      info: {
        title: `${projectName} API Specification`,
        description: `Automated OpenAPI 3.0 specification reconstructed by RepoMind AI from repository source code evidence.`,
        version
      },
      paths
    };
  }
}
