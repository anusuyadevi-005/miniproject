export function analyzeLayers(knowledgeModel = {}, components = []) {
  const layers = [];
  const componentIds = components.map((component) => component.id);

  const presentation = components.find((component) => component.type === 'frontend');
  const application = components.filter((component) => ['backend', 'controllers', 'services', 'authentication', 'middleware'].includes(component.type));
  const domain = components.filter((component) => ['repositories', 'database'].includes(component.type));
  const infrastructure = components.filter((component) => ['external_services', 'message_queue', 'caching', 'storage'].includes(component.type));

  if (presentation) {
    layers.push({
      id: 'layer-presentation',
      name: 'Presentation Layer',
      type: 'presentation',
      description: 'The user-facing interface and client experience layer.',
      components: [presentation.id]
    });
  }

  if (application.length) {
    layers.push({
      id: 'layer-application',
      name: 'Application Layer',
      type: 'application',
      description: 'The core service orchestration and request handling layer.',
      components: application.map((component) => component.id)
    });
  }

  if (domain.length) {
    layers.push({
      id: 'layer-domain',
      name: 'Domain & Data Layer',
      type: 'domain',
      description: 'Business entities, repositories, and persistence concerns.',
      components: domain.map((component) => component.id)
    });
  }

  if (infrastructure.length) {
    layers.push({
      id: 'layer-infrastructure',
      name: 'Infrastructure Layer',
      type: 'infrastructure',
      description: 'Cross-cutting infrastructure and external dependencies.',
      components: infrastructure.map((component) => component.id)
    });
  }

  return layers;
}
