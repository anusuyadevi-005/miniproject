import { normalizeEntityId } from './metadataNormalizer.js';

const KNOWN_WORKFLOWS = [
  { id: 'auth-workflow', name: 'Authentication Workflow', keywords: ['login', 'authenticate', 'auth', 'jwt', 'token', 'signIn', 'sign_in', 'signin'] },
  { id: 'registration-workflow', name: 'Registration Workflow', keywords: ['register', 'signup', 'signUp', 'createAccount', 'create_user'] },
  { id: 'crud-workflow', name: 'CRUD Operations', keywords: ['create', 'read', 'update', 'delete', 'find', 'list', 'save'] },
  { id: 'booking-workflow', name: 'Booking Workflow', keywords: ['book', 'booking', 'reserve', 'reservation'] },
  { id: 'payment-workflow', name: 'Payment Workflow', keywords: ['payment', 'pay', 'checkout', 'charge', 'capture', 'refund'] },
  { id: 'order-workflow', name: 'Order Workflow', keywords: ['order', 'purchase', 'cart', 'checkout', 'shipment'] },
  { id: 'notification-workflow', name: 'Notification Workflow', keywords: ['notify', 'notification', 'email', 'sms', 'push'] },
  { id: 'background-job-workflow', name: 'Background Jobs', keywords: ['job', 'queue', 'worker', 'cron', 'schedule', 'scheduler'] },
  { id: 'file-upload-workflow', name: 'File Upload Workflow', keywords: ['upload', 'file', 'multipart', 'formdata'] }
];

function extractWorkflowCandidates(knowledgeModel) {
  const apis = knowledgeModel.apis || [];
  const methods = knowledgeModel.methods || [];
  const functions = knowledgeModel.functions || [];
  const controllers = methods.filter((method) => method.metadata?.className).map((method) => method);

  const names = [...apis, ...methods, ...functions].map((entity) => ({
    id: entity.id,
    name: entity.name,
    path: entity.path,
    source: entity.metadata?.source || '',
    type: entity.type,
    controller: entity.metadata?.className || null,
    api: entity.metadata?.method ? { method: entity.metadata.method, route: entity.metadata.route } : null
  }));

  return names;
}

function identifyWorkflowType(candidate) {
  const normalized = `${candidate.name} ${candidate.path} ${candidate.source}`.toLowerCase();
  return KNOWN_WORKFLOWS.find((workflow) => workflow.keywords.some((keyword) => normalized.includes(keyword))) || null;
}

function createWorkflowEntry(repositoryId, candidate, workflowType) {
  const workflowId = normalizeEntityId(repositoryId, 'workflow', `${workflowType.id}:${candidate.name}:${candidate.path}`);
  return {
    workflowId,
    workflowName: workflowType.name,
    purpose: `Detects ${workflowType.name.toLowerCase()} from repository workflow semantics.`,
    entryPoint: candidate.api?.route || candidate.path || candidate.name,
    api: candidate.api || null,
    controller: candidate.controller,
    service: candidate.path,
    repository: repositoryId,
    database: null,
    validation: [],
    authentication: [],
    businessRules: [],
    exitPoint: 'Response or completion event',
    candidateSource: candidate.source
  };
}

export function extractWorkflows(knowledgeModel) {
  const repositoryId = knowledgeModel.repository?.id || 'unknown-repo';
  const candidates = extractWorkflowCandidates(knowledgeModel);
  const workflows = [];

  for (const candidate of candidates) {
    const workflowType = identifyWorkflowType(candidate);
    if (!workflowType) continue;

    const workflow = createWorkflowEntry(repositoryId, candidate, workflowType);
    workflows.push(workflow);
  }

  return workflows;
}
