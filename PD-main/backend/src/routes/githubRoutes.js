import express from 'express';
import crypto from 'crypto';
import axios from 'axios';
import { db } from '../db/store.js';
import { WorkspaceManager } from '../ingestion/workspaceManager.js';
import { AgentOrchestrator } from '../orchestration/orchestrator.js';

const router = express.Router();

const processedDeliveries = new Set();

// Mock user session handling
const MOCK_USER_ID = 'usr_1'; 

// Temporary store for OAuth states to prevent CSRF
const oauthStates = new Map();

router.get('/login', (req, res) => {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  if (!GITHUB_CLIENT_ID) {
    return res.status(500).json({ error: 'GITHUB_CLIENT_ID is not configured in environment variables.' });
  }
  
  const state = crypto.randomBytes(16).toString('hex');
  // Store state with a 10-minute expiration
  oauthStates.set(state, { expires: Date.now() + 10 * 60 * 1000, userId: MOCK_USER_ID });
  
  const redirectUri = encodeURIComponent(`http://localhost:5000/api/github/callback`);
  const scope = encodeURIComponent('repo read:user');
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=${scope}&state=${state}`;
  
  res.json({ url });
});

router.get('/callback', async (req, res) => {
  const { code, state, error, error_description } = req.query;

  if (error) {
    console.error('GitHub Authorization Error:', error_description);
    return res.redirect(`http://localhost:5173/?github_error=auth_denied`);
  }

  if (!code || !state) {
    return res.redirect(`http://localhost:5173/?github_error=invalid_request`);
  }

  // Validate state to prevent CSRF
  const storedState = oauthStates.get(state);
  if (!storedState || storedState.expires < Date.now()) {
    return res.redirect(`http://localhost:5173/?github_error=invalid_state`);
  }
  
  // Clear the used state
  oauthStates.delete(state);

  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;

  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    console.error('Missing GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET');
    return res.redirect(`http://localhost:5173/?github_error=missing_config`);
  }

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code
      },
      { headers: { Accept: 'application/json' } }
    );

    const accessToken = tokenResponse.data.access_token;
    if (!accessToken) {
      throw new Error(`Failed to obtain access token: ${tokenResponse.data.error_description || 'Unknown error'}`);
    }

    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const githubUser = userResponse.data;

    // Store the connection
    if (!db.githubConnections) db.githubConnections = [];
    let connection = db.githubConnections.find(c => c.userId === MOCK_USER_ID);
    
    if (connection) {
      connection.accessToken = accessToken;
      connection.username = githubUser.login;
      connection.updatedAt = new Date().toISOString();
    } else {
      db.githubConnections.push({
        id: `gh_conn_${crypto.randomBytes(4).toString('hex')}`,
        userId: MOCK_USER_ID,
        accessToken,
        username: githubUser.login,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    res.redirect(`http://localhost:5173/?github_success=true`);
  } catch (error) {
    console.error('GitHub OAuth Error:', error.message);
    res.redirect(`http://localhost:5173/?github_error=auth_failed`);
  }
});

router.get('/status', (req, res) => {
  const connection = (db.githubConnections || []).find(c => c.userId === MOCK_USER_ID);
  if (connection) {
    res.json({ connected: true, username: connection.username });
  } else {
    res.json({ connected: false });
  }
});

router.get('/repositories', async (req, res) => {
  const connection = (db.githubConnections || []).find(c => c.userId === MOCK_USER_ID);
  if (!connection) {
    return res.status(401).json({ error: 'GitHub not connected' });
  }

  try {
    const reposResponse = await axios.get('https://api.github.com/user/repos?per_page=100&sort=updated', {
      headers: { Authorization: `Bearer ${connection.accessToken}` }
    });

    const repos = reposResponse.data.map(repo => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: repo.owner.login,
      visibility: repo.visibility,
      default_branch: repo.default_branch,
      url: repo.clone_url,
      description: repo.description
    }));

    res.json(repos);
  } catch (error) {
    console.error('Failed to fetch repositories:', error.message);
    res.status(500).json({ error: 'Failed to fetch repositories from GitHub' });
  }
});

router.get('/repositories/:owner/:repo/branches', async (req, res) => {
  const connection = (db.githubConnections || []).find(c => c.userId === MOCK_USER_ID);
  if (!connection) {
    return res.status(401).json({ error: 'GitHub not connected' });
  }

  const { owner, repo } = req.params;

  try {
    const branchesResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}/branches?per_page=100`, {
      headers: { Authorization: `Bearer ${connection.accessToken}` }
    });

    const branches = branchesResponse.data.map(branch => ({
      name: branch.name,
      commit_sha: branch.commit.sha
    }));

    res.json(branches);
  } catch (error) {
    console.error('Failed to fetch branches:', error.message);
    res.status(500).json({ error: 'Failed to fetch branches from GitHub' });
  }
});

router.post('/connect-repository', (req, res) => {
  const connection = (db.githubConnections || []).find(c => c.userId === MOCK_USER_ID);
  if (!connection) {
    return res.status(401).json({ error: 'GitHub not connected' });
  }

  const { repository, branch } = req.body; // repository should contain full_name, clone_url, etc.
  
  if (!repository || !branch) {
    return res.status(400).json({ error: 'Repository and branch are required' });
  }

  if (!db.projects) db.projects = [];

  // Prevent duplicates
  const existingProject = db.projects.find(p => p.githubRepoId === repository.id && p.branch === branch);
  
  let project;
  if (existingProject) {
    project = existingProject;
  } else {
    project = {
      id: `proj_${crypto.randomBytes(4).toString('hex')}`,
      name: repository.name,
      fullName: repository.full_name,
      repoUrl: repository.url,
      branch: branch,
      defaultBranch: repository.default_branch,
      githubRepoId: repository.id,
      githubConnectionId: connection.id,
      status: 'Ready for synchronization', // per requirements
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    db.projects.unshift(project);
  }

  res.json({ success: true, project });
});

router.post('/synchronize', async (req, res) => {
  const connection = (db.githubConnections || []).find(c => c.userId === MOCK_USER_ID);
  if (!connection) {
    return res.status(401).json({ error: 'GitHub not connected' });
  }

  const { projectId } = req.body;
  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const project = (db.projects || []).find(p => p.id === projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  try {
    const repoUrl = `https://github.com/${project.fullName}.git`;
    
    // Actually use the workspace manager to clone and retrieve git history
    const remoteInfo = await WorkspaceManager.inspectRemoteRepository(repoUrl, project.branch);

    const commits = (remoteInfo.commits || []).map(c => ({
      hash: c.sha,
      message: c.message,
      author: c.author,
      date: c.date,
      url: `https://github.com/${project.fullName}/commit/${c.sha}`
    }));

    // Update project state
    project.status = 'Synchronized';
    project.commits = commits;
    project.headSha = commits[0]?.hash || null;
    project.lastSyncedAt = new Date().toISOString();

    res.json({ success: true, project });
  } catch (error) {
    console.error('Failed to synchronize repository:', error.message);
    res.status(500).json({ error: 'Failed to synchronize repository from GitHub' });
  }
});

router.post('/webhook', async (req, res) => {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature' });
  }

  if (!req.rawBody) {
    return res.status(400).json({ error: 'Raw body missing' });
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  } catch (err) {
    return res.status(401).json({ error: 'Invalid signature format' });
  }

  const event = req.headers['x-github-event'];
  const deliveryId = req.headers['x-github-delivery'];

  if (event === 'ping') {
    return res.status(200).json({ message: 'pong' });
  }

  if (event !== 'push') {
    return res.status(200).json({ message: 'Ignored event type' });
  }

  if (processedDeliveries.has(deliveryId)) {
    return res.status(200).json({ message: 'Already processed' });
  }
  processedDeliveries.add(deliveryId);

  const payload = req.body;
  const repository = payload.repository;
  const ref = payload.ref;
  const afterSha = payload.after;
  
  if (!repository || !ref || !afterSha) {
    return res.status(400).json({ error: 'Invalid payload' });
  }

  const project = (db.projects || []).find(p => p.fullName === repository.full_name);
  if (!project) {
    return res.status(200).json({ message: 'Repository not connected' });
  }

  const branchMatch = `refs/heads/${project.branch}`;
  if (ref !== branchMatch) {
    return res.status(200).json({ message: 'Ignored branch' });
  }

  if (afterSha === '0000000000000000000000000000000000000000') {
    return res.status(200).json({ message: 'Branch deleted' });
  }

  res.status(202).json({ message: 'Webhook accepted, synchronization queued' });

  setImmediate(async () => {
    try {
      project.status = 'Synchronizing';
      const repoUrl = `https://github.com/${project.fullName}.git`;
      
      const remoteInfo = await WorkspaceManager.inspectRemoteRepository(repoUrl, project.branch);

      const commits = (remoteInfo.commits || []).map(c => ({
        hash: c.sha,
        message: c.message,
        author: c.author,
        date: c.date,
        url: `https://github.com/${project.fullName}/commit/${c.sha}`
      }));
      
      const actualHead = commits[0]?.hash;
      if (actualHead !== afterSha) {
        project.status = 'Synchronization failed (HEAD mismatch)';
        return;
      }

      project.commits = commits;
      project.headSha = afterSha;
      project.lastSyncedAt = new Date().toISOString();
      project.status = 'Analyzing';

      await AgentOrchestrator.runFullAnalysis({
        url: repoUrl,
        branch: project.branch,
        commitSha: afterSha,
        name: project.name
      });
      
      project.status = 'Synchronized';
    } catch (err) {
      console.error('Webhook sync failed:', err);
      project.status = 'Synchronization failed';
    }
  });
});

router.delete('/disconnect', (req, res) => {
  if (db.githubConnections) {
    db.githubConnections = db.githubConnections.filter(c => c.userId !== MOCK_USER_ID);
  }
  res.json({ success: true });
});

export default router;
