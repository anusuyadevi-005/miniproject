export function buildOpenApiSpec(repositoryId, apiItems, metadata = {}) {
  const paths = {};
  apiItems.forEach((api) => {
    const pathKey = api.route || '/';
    paths[pathKey] = paths[pathKey] || {};
    paths[pathKey][api.method.toLowerCase()] = {
      summary: api.controller || api.handler || api.route,
      tags: [api.controller || 'API'],
      operationId: api.id,
      parameters: buildParameters(api),
      requestBody: buildRequestBody(api),
      responses: buildResponses(api),
      security: buildSecurity(api)
    };
  });

  return {
    openapi: '3.0.3',
    info: {
      title: metadata.projectName || 'Repository API Surface',
      version: metadata.version || '1.0.0',
      description: metadata.description || 'Auto-generated API discovery model'
    },
    paths,
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKeyAuth: { type: 'apiKey', name: 'Authorization', in: 'header' }
      }
    }
  };
}

function buildParameters(api) {
  const params = [];
  const seen = new Set();
  api.request?.forEach((req) => {
    if (/req\.params\./i.test(req.expression) || /req\.query\./i.test(req.expression) || /req\.headers\./i.test(req.expression)) {
      const name = req.expression.split('.').slice(-1)[0];
      if (!seen.has(name)) {
        seen.add(name);
        params.push({ name, in: req.expression.includes('params') ? 'path' : req.expression.includes('query') ? 'query' : 'header', required: false, schema: { type: 'string' } });
      }
    }
  });
  return params;
}

function buildRequestBody(api) {
  if (!api.request || !api.request.length) return undefined;
  const bodyFields = api.request.filter((req) => /req\.body\.|body|json/i.test(req.expression));
  if (!bodyFields.length) return undefined;
  return {
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: bodyFields.reduce((acc, req) => {
            const name = req.expression.split('.').slice(-1)[0];
            acc[name] = { type: 'string' };
            return acc;
          }, {})
        }
      }
    }
  };
}

function buildResponses(api) {
  const responses = {};
  if (api.statusCodes && api.statusCodes.length) {
    api.statusCodes.forEach((code) => {
      responses[code] = { description: `Response ${code}` };
    });
  }
  if (!Object.keys(responses).length) {
    responses['200'] = { description: 'Successful response' };
  }
  return responses;
}

function buildSecurity(api) {
  if (!api.authentication || !api.authentication.providers) return [];
  const schemes = [];
  if (api.authentication.providers.some((provider) => /jwt|jsonwebtoken/i.test(provider))) schemes.push({ bearerAuth: [] });
  if (api.authentication.providers.some((provider) => /apiKey|apikey|Authorization/i.test(provider))) schemes.push({ apiKeyAuth: [] });
  return schemes;
}
