import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeArchitecture } from '../src/services/architectureAnalyzer.js';

test('analyzeArchitecture returns structured architecture output from static repository knowledge', () => {
  const knowledgeModel = {
    repository: { name: 'sample-app' },
    files: [
      { relativePath: 'src/server.js', extension: 'js' },
      { relativePath: 'src/controllers/userController.js', extension: 'js' },
      { relativePath: 'src/services/authService.js', extension: 'js' },
      { relativePath: 'src/models/userModel.js', extension: 'js' },
      { relativePath: 'src/routes/api.js', extension: 'js' },
      { relativePath: 'frontend/src/App.jsx', extension: 'jsx' },
      { relativePath: 'docker-compose.yml', extension: 'yml' }
    ],
    classes: [
      { name: 'UserController', kind: 'class' },
      { name: 'AuthService', kind: 'class' }
    ],
    apis: [
      { path: '/api/users', method: 'GET' }
    ],
    database: [{ name: 'users' }],
    technology: {
      architectureStyle: 'Layered Architecture',
      frontend: { frameworks: ['React'] },
      backend: { frameworks: ['Express'] },
      authentication: { mechanisms: ['JWT'] },
      deployment: { container: { docker: true, compose: true }, platform: { vercel: false }, cloud: { aws: false } },
      dependencies: [{ name: 'express' }, { name: 'redis' }, { name: 'jsonwebtoken' }]
    },
    dependencies: [
      { source: 'src/controllers/userController.js', target: 'src/services/authService.js', relationship: 'dependsOn' }
    ],
    callGraph: [
      { caller: 'UserController', callee: 'AuthService', relationship: 'calls' }
    ]
  };

  const result = analyzeArchitecture(knowledgeModel);

  assert.equal(result.architecture.name, 'sample-app');
  assert.ok(Array.isArray(result.components));
  assert.ok(result.components.some((component) => component.type === 'frontend'));
  assert.ok(result.components.some((component) => component.type === 'backend'));
  assert.ok(result.components.some((component) => component.type === 'controllers'));
  assert.ok(result.components.some((component) => component.type === 'services'));
  assert.ok(Array.isArray(result.layers));
  assert.ok(Array.isArray(result.packages));
  assert.ok(Array.isArray(result.communication));
  assert.ok(Array.isArray(result.deployment));
  assert.ok(Array.isArray(result.flows));
  assert.ok(Array.isArray(result.diagrams));
  assert.ok(result.diagrams.some((diagram) => diagram.kind === 'mermaid'));
});
