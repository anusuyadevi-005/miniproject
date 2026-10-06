import fs from 'fs-extra';
import yaml from 'js-yaml';

function findFile(files, fileName) {
  return files.find((file) => file.relativePath.toLowerCase() === fileName.toLowerCase());
}

async function readTextFile(file) {
  if (!file) return null;
  try {
    return await fs.readFile(file.absolutePath, 'utf8');
  } catch (err) {
    return null;
  }
}

export async function detectDeployment(inventory) {
  const files = inventory.files || [];
  const deployment = {
    container: {
      docker: false,
      compose: false,
      kubernetes: false
    },
    platform: {
      render: false,
      railway: false,
      heroku: false,
      netlify: false,
      vercel: false,
      githubPages: false
    },
    cloud: {
      aws: false,
      azure: false,
      gcp: false,
      digitalOcean: false
    }
  };

  const dockerfile = findFile(files, 'dockerfile');
  if (dockerfile) {
    deployment.container.docker = true;
  }

  const composeFile = findFile(files, 'docker-compose.yml') || findFile(files, 'docker-compose.yaml');
  if (composeFile) {
    deployment.container.compose = true;
  }

  if (findFile(files, 'kustomization.yaml') || findFile(files, 'kustomization.yml') || findFile(files, 'helmfile.yaml')) {
    deployment.container.kubernetes = true;
  }

  if (findFile(files, 'vercel.json')) {
    deployment.platform.vercel = true;
  }
  if (findFile(files, 'netlify.toml')) {
    deployment.platform.netlify = true;
  }
  if (findFile(files, 'staticwebapp.config.json')) {
    deployment.platform.azure = true;
  }
  if (findFile(files, 'render.yaml') || findFile(files, 'render.yml')) {
    deployment.platform.render = true;
  }
  if (findFile(files, 'railway.json')) {
    deployment.platform.railway = true;
  }
  if (findFile(files, 'Procfile')) {
    deployment.platform.heroku = true;
  }
  if (findFile(files, '404.html') && findFile(files, 'index.html') && !findFile(files, 'package.json')) {
    deployment.platform.githubPages = true;
  }

  const firebaseFile = findFile(files, 'firebase.json');
  if (firebaseFile) {
    deployment.cloud.gcp = true;
  }

  const azureFile = findFile(files, 'azure-pipelines.yml') || findFile(files, 'azure-pipelines.yaml');
  if (azureFile) {
    deployment.cloud.azure = true;
  }

  const gcpFile = findFile(files, 'app.yaml') || findFile(files, 'cloudbuild.yaml');
  if (gcpFile) {
    deployment.cloud.gcp = true;
  }

  const awsFile = findFile(files, 'serverless.yml') || findFile(files, 'template.yaml') || findFile(files, 'template.yml');
  if (awsFile) {
    deployment.cloud.aws = true;
  }

  const doFile = findFile(files, 'docker-compose.yml') || findFile(files, 'docker-compose.yaml');
  if (doFile) {
    deployment.cloud.digitalOcean = true;
  }

  return deployment;
}
