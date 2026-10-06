import { analyzeComponents } from './componentAnalyzer.js';
import { analyzeLayers } from './layerAnalyzer.js';
import { analyzeDeployment } from './deploymentAnalyzer.js';
import { analyzeSequence } from './sequenceAnalyzer.js';
import { analyzeFlows } from './flowAnalyzer.js';
import { analyzeModules } from './moduleAnalyzer.js';
import { analyzePackages } from './packageAnalyzer.js';

function buildDiagrams(architecture, components, layers, packages, communication, deployment, flows, sequences) {
  const diagrams = [];
  diagrams.push({
    id: 'diagram-mermaid',
    kind: 'mermaid',
    name: 'High-Level Architecture',
    content: `graph TD\n  Client[Frontend] --> API[Backend]\n  API --> DB[Database]\n  API --> Ext[External Services]`
  });

  diagrams.push({
    id: 'diagram-plantuml',
    kind: 'plantuml',
    name: 'Component View',
    content: `@startuml\nleft to right direction\nactor User\ncomponent Frontend\ncomponent Backend\ncomponent Database\nUser --> Frontend\nFrontend --> Backend\nBackend --> Database\n@enduml`
  });

  return diagrams;
}

export function analyzeArchitecture(knowledgeModel = {}) {
  const components = analyzeComponents(knowledgeModel);
  const layers = analyzeLayers(knowledgeModel, components);
  const deployment = analyzeDeployment(knowledgeModel);
  const sequences = analyzeSequence(knowledgeModel, components);
  const flows = analyzeFlows(knowledgeModel, components);
  const modules = analyzeModules(knowledgeModel);
  const packages = analyzePackages(knowledgeModel);

  const communication = [
    {
      id: 'comm-1',
      source: 'Frontend',
      target: 'Backend',
      protocol: 'HTTP/HTTPS',
      description: 'The frontend interacts with backend endpoints discovered from routes and APIs.'
    },
    {
      id: 'comm-2',
      source: 'Backend',
      target: 'Database',
      protocol: 'SQL/ORM',
      description: 'The application layer accesses persisted entities through repositories or database models.'
    }
  ];

  const architecture = {
    name: knowledgeModel.repository?.name || 'Discovered Repository',
    style: knowledgeModel.technology?.architectureStyle || 'Layered Architecture',
    summary: 'Architecture inferred from static repository knowledge, file layout, dependencies, and routing patterns.',
    detected: {
      frontend: components.some((component) => component.type === 'frontend'),
      backend: components.some((component) => component.type === 'backend'),
      controllers: components.some((component) => component.type === 'controllers'),
      services: components.some((component) => component.type === 'services'),
      repositories: components.some((component) => component.type === 'repositories'),
      database: components.some((component) => component.type === 'database'),
      authentication: components.some((component) => component.type === 'authentication'),
      middleware: components.some((component) => component.type === 'middleware'),
      externalServices: components.some((component) => component.type === 'external_services'),
      messageQueue: components.some((component) => component.type === 'message_queue'),
      caching: components.some((component) => component.type === 'caching'),
      storage: components.some((component) => component.type === 'storage')
    }
  };

  return {
    architecture,
    components,
    layers,
    packages,
    communication,
    deployment,
    flows,
    diagrams: buildDiagrams(architecture, components, layers, packages, communication, deployment, flows, sequences),
    sequences,
    modules
  };
}
