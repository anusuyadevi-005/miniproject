import { detectFrameworks } from './frameworkDetector.js';
import { detectBuildTools } from './buildToolDetector.js';
import { detectDeployment } from './deploymentDetector.js';
import { detectTesting } from './testingDetector.js';
import { analyzeDependencies } from './dependencyAnalyzer.js';
import { analyzeConfiguration } from './configAnalyzer.js';
import { detectProjectType } from './projectTypeDetector.js';

export async function analyzeTechnology(inventory) {
  if (!inventory || !inventory.repositoryId) {
    throw new Error('Invalid repository inventory provided.');
  }

  const frameworks = await detectFrameworks(inventory);
  const config = await analyzeConfiguration(inventory);
  const buildTools = await detectBuildTools(inventory);
  const deployment = await detectDeployment(inventory);
  const testing = await detectTesting(inventory);
  const dependencies = await analyzeDependencies(inventory);

  const detectedFileLanguages = [];
  for (const f of inventory.files || []) {
    const ext = (f.extension || '').toLowerCase();
    if (ext === '.py') detectedFileLanguages.push('Python');
    else if (ext === '.js' || ext === '.mjs' || ext === '.cjs') detectedFileLanguages.push('JavaScript');
    else if (ext === '.ts' || ext === '.tsx') detectedFileLanguages.push('TypeScript');
    else if (ext === '.go') detectedFileLanguages.push('Go');
    else if (ext === '.java') detectedFileLanguages.push('Java');
    else if (ext === '.cs') detectedFileLanguages.push('C#');
    else if (ext === '.cpp' || ext === '.cc' || ext === '.cxx' || ext === '.c') detectedFileLanguages.push('C/C++');
    else if (ext === '.php') detectedFileLanguages.push('PHP');
    else if (ext === '.rb') detectedFileLanguages.push('Ruby');
    else if (ext === '.rs') detectedFileLanguages.push('Rust');
  }

  const allLangs = Array.from(new Set([...(inventory.metadata?.languages || []), ...(frameworks.languages || []), ...detectedFileLanguages]));
  const codeLangs = ['Python', 'JavaScript', 'TypeScript', 'Go', 'Java', 'C#', 'C++', 'C', 'PHP', 'Ruby', 'Rust', 'Kotlin', 'Dart'];
  const languages = Array.from(new Set([
    ...allLangs.filter(l => codeLangs.includes(l)),
    ...allLangs.filter(l => !codeLangs.includes(l) && !['Unknown', 'Markdown', 'Text', 'INI'].includes(l))
  ]));
  const packageManagers = Array.from(new Set([...(inventory.metadata?.packageManagers || []), ...buildTools.filter((tool) => ['npm', 'Yarn', 'pnpm', 'Go Modules', 'Cargo', 'Pub'].includes(tool))]));

  const technology = {
    repositoryId: inventory.repositoryId,
    projectType: detectProjectType({
      frontend: frameworks.frontend,
      backend: frameworks.backend,
      database: inventory.database,
      packageManagers,
      languages,
      deployment,
      dependencies,
      configuration: config
    }),
    architectureStyle: detectArchitectureStyle(inventory, frameworks, config),
    languages,
    frontend: {
      frameworks: frameworks.frontend
    },
    backend: {
      frameworks: frameworks.backend
    },
    database: {
      databases: detectDatabases(inventory, dependencies, config, frameworks)
    },
    authentication: detectAuthentication(inventory, dependencies, config, frameworks),
    deployment,
    testing,
    buildTools: {
      tools: buildTools
    },
    packageManagers,
    dependencies,
    configuration: config,
    confidenceScore: calculateConfidenceScore({ frameworks, buildTools, deployment, testing, dependencies, config })
  };

  return technology;
}

function detectDatabases(inventory, dependencies = [], config = {}, frameworks = {}) {
  const files = inventory.files || [];
  const dbs = new Set();
  const filePaths = files.map((file) => (file.relativePath || '').toLowerCase());
  const fileNames = files.map((file) => (file.name || '').toLowerCase());
  const packages = dependencies.map((dep) => (dep.name || '').toLowerCase());
  const envVars = (config.environmentVariables || []).map(e => (typeof e === 'string' ? e : JSON.stringify(e)).toLowerCase());
  const allConfigStr = JSON.stringify(config || {}).toLowerCase();

  // 1. Dependency Analysis (Drivers & Database Adapters)
  if (packages.some(p => p === 'psycopg2' || p === 'psycopg2-binary' || p === 'asyncpg' || p === 'pg' || p === 'pg-promise' || p === 'postgres')) {
    dbs.add('PostgreSQL');
  }
  if (packages.some(p => p === 'mysql' || p === 'mysql2' || p === 'mysqlclient' || p === 'pymysql' || p === 'aiomysql')) {
    dbs.add('MySQL');
  }
  if (packages.some(p => p === 'mongodb' || p === 'mongoose' || p === 'pymongo' || p === 'motor')) {
    dbs.add('MongoDB');
  }
  if (packages.some(p => p === 'sqlite3' || p === 'aiosqlite' || p === 'better-sqlite3')) {
    dbs.add('SQLite');
  }
  if (packages.some(p => p === 'redis' || p === 'ioredis' || p === 'aioredis')) {
    dbs.add('Redis');
  }
  if (packages.some(p => p === 'cx_oracle' || p === 'oracledb')) {
    dbs.add('Oracle');
  }
  if (packages.some(p => p === 'mssql' || p === 'pyodbc' || p === 'tedious')) {
    dbs.add('SQL Server');
  }
  if (packages.some(p => p === 'firebase-admin' || p.includes('firestore'))) {
    dbs.add('Firebase Firestore');
  }

  // 2. Configuration & Environment Variables (Connection strings & URIs)
  if (envVars.some(v => v.includes('postgres://') || v.includes('postgresql://')) || allConfigStr.includes('postgresql://') || allConfigStr.includes('postgres://')) {
    dbs.add('PostgreSQL');
  }
  if (envVars.some(v => v.includes('mysql://')) || allConfigStr.includes('mysql://')) {
    dbs.add('MySQL');
  }
  if (envVars.some(v => v.includes('mongodb://') || v.includes('mongodb+srv://')) || allConfigStr.includes('mongodb://')) {
    dbs.add('MongoDB');
  }
  if (envVars.some(v => v.includes('sqlite:///') || v.includes('.sqlite') || v.includes('.db')) || allConfigStr.includes('sqlite:///')) {
    dbs.add('SQLite');
  }
  if (envVars.some(v => v.includes('redis://')) || allConfigStr.includes('redis://')) {
    dbs.add('Redis');
  }

  // 3. Manifests & Config Files
  if (fileNames.includes('firebase.json') || fileNames.includes('.firebaserc')) {
    dbs.add('Firebase Firestore');
  }
  if (fileNames.includes('redis.conf') || fileNames.includes('redis.yml')) {
    dbs.add('Redis');
  }
  if (filePaths.some(p => p.endsWith('.sqlite') || p.endsWith('.sqlite3') || p.endsWith('.db'))) {
    dbs.add('SQLite');
  }

  // 4. Dedicated database source directories / schema scripts
  if (filePaths.some(p => p.includes('/models/') || p.includes('/entities/') || p.includes('/schema/'))) {
    if (filePaths.some(p => p.includes('postgres') || p.includes('pg_'))) dbs.add('PostgreSQL');
    if (filePaths.some(p => p.includes('mongo'))) dbs.add('MongoDB');
    if (filePaths.some(p => p.includes('mysql'))) dbs.add('MySQL');
  }

  return Array.from(dbs);
}

function detectAuthentication(inventory, dependencies = [], config = {}, frameworks = {}) {
  const auth = new Set();
  const packages = dependencies.map((dep) => (dep.name || '').toLowerCase());
  const filePaths = (inventory.files || []).map((file) => (file.relativePath || '').toLowerCase());
  const backendFrameworks = frameworks.backend || [];

  if (packages.includes('jsonwebtoken') || packages.includes('@auth0/node-jsonwebtoken') || filePaths.some((p) => p.includes('jwt'))) {
    auth.add('JWT');
  }
  if (packages.includes('passport') || packages.some((name) => name.startsWith('passport-'))) {
    auth.add('Passport');
  }
  if (packages.includes('firebase-admin') || packages.includes('firebase')) {
    auth.add('Firebase Auth');
  }
  if (packages.includes('oauth') || packages.includes('passport-oauth') || packages.includes('passport-google-oauth20') || packages.includes('authlib')) {
    auth.add('OAuth');
  }
  if (filePaths.some((p) => p.includes('spring-security'))) {
    auth.add('Spring Security');
  }
  if (filePaths.some((p) => p.includes('auth0'))) {
    auth.add('Auth0');
  }

  if (backendFrameworks.includes('Flask') || packages.includes('flask') || packages.includes('flask-login') || packages.includes('flask-session')) {
    auth.add('Flask Session Management');
  } else if (backendFrameworks.includes('Django') || packages.includes('django')) {
    auth.add('Django Authentication & Sessions');
  } else if (packages.includes('express-session') || packages.includes('cookie-session')) {
    auth.add('Session Cookie Guard');
  }

  if (config.environmentVariables?.length > 0 || (inventory.files || []).some(f => (f.name || '').includes('.env') || (f.name || '').includes('dotenv'))) {
    auth.add('Environment-based Secrets');
  }

  return { mechanisms: Array.from(auth) };
}

function detectArchitectureStyle(inventory, frameworks, config) {
  const frontend = frameworks.frontend || [];
  const backend = frameworks.backend || [];
  const filePaths = (inventory.files || []).map((file) => file.relativePath.toLowerCase());
  const hasServerless = filePaths.some((p) => p.includes('serverless.yml') || p.includes('aws-lambda') || p.includes('azure-functions'));

  if (hasServerless) {
    return 'Serverless';
  }
  if (frontend.includes('React') || frontend.includes('Vue') || frontend.includes('Svelte') || frontend.includes('Angular')) {
    return 'Component Based';
  }
  if (backend.includes('Spring Boot') || backend.includes('Django') || backend.includes('Laravel') || backend.includes('Express') || backend.includes('FastAPI')) {
    if (config.docker?.dockerfile || config.docker?.compose) {
      return 'Microservice';
    }
    return 'Layered Architecture';
  }
  if (filePaths.some((p) => p.includes('controllers/') || p.includes('models/') || p.includes('views/'))) {
    return 'MVC';
  }
  return 'Monolith';
}

function calculateConfidenceScore(context) {
  let score = 50;
  if (context.frameworks?.frontend?.length) score += 10;
  if (context.frameworks?.backend?.length) score += 10;
  if (context.buildTools?.length) score += 5;
  if (Object.values(context.deployment?.platform || {}).some(Boolean)) score += 5;
  if (context.testing?.frameworks?.length) score += 5;
  if (context.dependencies?.length) score += 10;
  if (context.config?.environmentVariables?.length || context.configuration?.environmentVariables?.length) score += 5;
  return Math.min(100, score);
}
