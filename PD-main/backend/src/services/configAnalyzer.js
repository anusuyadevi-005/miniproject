import fs from 'fs-extra';
import yaml from 'js-yaml';
import toml from 'toml';

function findFile(files, fileName) {
  return files.find((file) => file.relativePath.toLowerCase() === fileName.toLowerCase());
}

async function readFileContent(file) {
  if (!file) return null;
  try {
    return await fs.readFile(file.absolutePath, 'utf8');
  } catch (err) {
    return null;
  }
}

function parseJson(content) {
  try {
    return JSON.parse(content);
  } catch (err) {
    return null;
  }
}

function parseYaml(content) {
  try {
    return yaml.load(content);
  } catch (err) {
    return null;
  }
}

export async function analyzeConfiguration(inventory) {
  const files = inventory.files || [];
  const config = {
    environmentVariables: [],
    docker: {},
    ciCd: {},
    staticHosting: {},
    nginx: false,
    githubActions: false,
    firebase: false
  };

  const envExample = findFile(files, '.env.example');
  if (envExample) {
    const content = await readFileContent(envExample);
    if (content) {
      config.environmentVariables = content
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith('#'))
        .map((line) => line.split('=')[0].trim())
        .filter(Boolean);
    }
  }

  const dockerfile = findFile(files, 'Dockerfile');
  if (dockerfile) {
    config.docker.dockerfile = true;
    config.docker.dockerfilePath = dockerfile.relativePath;
  }

  const composeFile = findFile(files, 'docker-compose.yml') || findFile(files, 'docker-compose.yaml');
  if (composeFile) {
    config.docker.compose = true;
    config.docker.composePath = composeFile.relativePath;
  }

  const githubActionsWorkflow = files.some((file) => file.relativePath.startsWith('.github/workflows/'));
  config.githubActions = githubActionsWorkflow;
  config.ciCd.githubActions = githubActionsWorkflow;

  const vercelFile = findFile(files, 'vercel.json');
  if (vercelFile) {
    config.staticHosting.vercel = true;
    config.staticHosting.vercelPath = vercelFile.relativePath;
  }

  const netlifyFile = findFile(files, 'netlify.toml');
  if (netlifyFile) {
    config.staticHosting.netlify = true;
    config.staticHosting.netlifyPath = netlifyFile.relativePath;
  }

  const firebaseFile = findFile(files, 'firebase.json');
  if (firebaseFile) {
    config.firebase = true;
    config.firebasePath = firebaseFile.relativePath;
  }

  const nginxFile = findFile(files, 'nginx.conf');
  if (nginxFile) {
    config.nginx = true;
    config.nginxPath = nginxFile.relativePath;
  }

  const workflows = files.filter((file) => file.relativePath.startsWith('.github/workflows/'));
  config.ciCd.githubActions = workflows.length > 0;
  config.ciCd.githubActionsWorkflowCount = workflows.length;

  const firebaseJson = findFile(files, 'firebase.json');
  if (firebaseJson) {
    const content = await readFileContent(firebaseJson);
    const parsed = parseJson(content);
    if (parsed?.hosting) {
      config.staticHosting.firebase = true;
      config.staticHosting.firebaseHosting = parsed.hosting;
    }
  }

  const vercelJson = findFile(files, 'vercel.json');
  if (vercelJson) {
    const content = await readFileContent(vercelJson);
    const parsed = parseJson(content);
    if (parsed) {
      config.staticHosting.vercelProject = parsed;
    }
  }

  const netlifyToml = findFile(files, 'netlify.toml');
  if (netlifyToml) {
    const content = await readFileContent(netlifyToml);
    const parsed = parseToml(content);
    if (parsed) {
      config.staticHosting.netlifyConfig = parsed;
    }
  }

  return config;
}
