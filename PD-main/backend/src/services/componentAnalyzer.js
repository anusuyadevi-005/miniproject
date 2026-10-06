function normalizeName(value) {
  return String(value || '').replace(/[_-]+/g, ' ').trim();
}

function addComponent(components, type, name, description, evidence = []) {
  const existing = components.find((component) => component.type === type);
  if (existing) {
    return existing;
  }

  const component = {
    id: `${type}-${components.length + 1}`,
    name,
    type,
    description,
    evidence: evidence.slice(0, 3)
  };
  components.push(component);
  return component;
}

export function analyzeComponents(knowledgeModel = {}) {
  const components = [];
  const files = knowledgeModel.files || [];
  const filePaths = files.map((file) => String(file.relativePath || '').toLowerCase());
  const technology = knowledgeModel.technology || {};
  const frontendFrameworks = technology.frontend?.frameworks || [];
  const backendFrameworks = technology.backend?.frameworks || [];
  const authMechanisms = technology.authentication?.mechanisms || [];
  const dependencies = (technology.dependencies || []).map((dep) => String(dep.name || '').toLowerCase());

  if (frontendFrameworks.length || filePaths.some((path) => path.includes('frontend/') || path.includes('src/ui') || path.endsWith('.jsx') || path.endsWith('.tsx') || path.endsWith('.vue'))) {
    addComponent(components, 'frontend', 'Frontend Application', 'User-facing interface layer discovered from frontend files or frameworks.', filePaths.filter((path) => path.includes('frontend/') || path.endsWith('.jsx') || path.endsWith('.tsx') || path.endsWith('.vue')));
  }

  if (backendFrameworks.length || filePaths.some((path) => path.includes('server') || path.includes('controller') || path.includes('service') || path.includes('router') || path.includes('src/'))) {
    addComponent(components, 'backend', 'Backend Application', 'Server-side application layer discovered from runtime entry points and framework hints.', filePaths.filter((path) => path.includes('server') || path.includes('router') || path.includes('src/')));
  }

  if (filePaths.some((path) => path.includes('controller') || path.includes('route'))) {
    addComponent(components, 'controllers', 'Controllers', 'HTTP request handlers and route-bound logic were detected.', filePaths.filter((path) => path.includes('controller') || path.includes('route')));
  }

  if (filePaths.some((path) => path.includes('service') || path.includes('usecase'))) {
    addComponent(components, 'services', 'Services', 'Business logic and workflow orchestration were detected.', filePaths.filter((path) => path.includes('service') || path.includes('usecase')));
  }

  if (filePaths.some((path) => path.includes('model') || path.includes('repository') || path.includes('dao')) || (knowledgeModel.database || []).length) {
    addComponent(components, 'repositories', 'Repositories & Models', 'Persistence and data access abstractions were found.', filePaths.filter((path) => path.includes('model') || path.includes('repository') || path.includes('dao')));
  }

  if ((knowledgeModel.database || []).length || filePaths.some((path) => path.includes('db/') || path.includes('database') || path.includes('schema') || path.includes('model'))) {
    addComponent(components, 'database', 'Database Layer', 'Database access and schema definitions were detected.', (knowledgeModel.database || []).map((entry) => entry.name || 'database'));
  }

  if (authMechanisms.length || filePaths.some((path) => path.includes('auth') || path.includes('security'))) {
    addComponent(components, 'authentication', 'Authentication', 'Identity and access controls were detected.', authMechanisms.length ? authMechanisms : filePaths.filter((path) => path.includes('auth') || path.includes('security')));
  }

  if (filePaths.some((path) => path.includes('middleware') || path.includes('interceptor'))) {
    addComponent(components, 'middleware', 'Middleware', 'Cross-cutting request handling was detected.', filePaths.filter((path) => path.includes('middleware') || path.includes('interceptor')));
  }

  if (dependencies.some((dep) => ['redis', 'stripe', 'sendgrid', 'twilio', 'aws', 'firebase', 's3'].includes(dep))) {
    addComponent(components, 'external_services', 'External Services', 'Third-party integrations were detected from dependencies.', dependencies.filter((dep) => ['redis', 'stripe', 'sendgrid', 'twilio', 'aws', 'firebase', 's3'].includes(dep)));
  }

  if (dependencies.some((dep) => ['kafka', 'rabbitmq', 'nats', 'sqs', 'pubsub'].includes(dep))) {
    addComponent(components, 'message_queue', 'Message Queue', 'Asynchronous messaging was detected.', dependencies.filter((dep) => ['kafka', 'rabbitmq', 'nats', 'sqs', 'pubsub'].includes(dep)));
  }

  if (dependencies.some((dep) => ['redis', 'memcached'].includes(dep))) {
    addComponent(components, 'caching', 'Caching', 'Caching layer was detected from runtime dependencies.', dependencies.filter((dep) => ['redis', 'memcached'].includes(dep)));
  }

  if (filePaths.some((path) => path.includes('storage') || path.includes('upload') || path.includes('blob'))) {
    addComponent(components, 'storage', 'Storage', 'Persistent file or object storage was detected.', filePaths.filter((path) => path.includes('storage') || path.includes('upload') || path.includes('blob')));
  }

  return components;
}
