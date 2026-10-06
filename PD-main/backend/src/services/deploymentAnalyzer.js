export function analyzeDeployment(knowledgeModel = {}) {
  const files = knowledgeModel.files || [];
  const filePaths = files.map((file) => String(file.relativePath || '').toLowerCase());
  const technology = knowledgeModel.technology || {};
  const deployment = technology.deployment || {};
  const inventory = [];

  if (filePaths.some((path) => path.includes('docker') || path.includes('docker-compose'))) {
    inventory.push({
      id: 'deployment-container',
      name: 'Container Runtime',
      type: 'container',
      summary: 'Docker or Compose-based deployment was detected.',
      details: {
        docker: Boolean(deployment.container?.docker),
        compose: Boolean(deployment.container?.compose)
      }
    });
  }

  if (deployment.platform) {
    const platforms = Object.entries(deployment.platform)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);

    if (platforms.length) {
      inventory.push({
        id: 'deployment-platform',
        name: 'Cloud Platform',
        type: 'platform',
        summary: `Targeted deployment platforms: ${platforms.join(', ')}.`,
        details: { platforms }
      });
    }
  }

  if (filePaths.some((path) => path.includes('k8s') || path.includes('helm') || path.includes('kustomization'))) {
    inventory.push({
      id: 'deployment-orchestrator',
      name: 'Orchestrator',
      type: 'orchestrator',
      summary: 'Kubernetes-style deployment assets were detected.',
      details: { manifests: true }
    });
  }

  if (!inventory.length) {
    inventory.push({
      id: 'deployment-generic',
      name: 'Runtime Host',
      type: 'host',
      summary: 'No explicit deployment manifest was detected, so a generic runtime host is assumed.',
      details: { manifests: false }
    });
  }

  return inventory;
}
