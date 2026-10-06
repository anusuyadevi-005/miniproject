const BASE_URL = 'http://localhost:5000';

async function runSelfTests() {
  console.log('====================================================');
  console.log('🧪 ASDSE Self-Test Suite: Automated Verification');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  async function assertEndpoint(name, url, options = {}) {
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        const data = options.isPdf ? await res.arrayBuffer() : await res.json();
        console.log(`[PASS] ✅ ${name} (Status: ${res.status})`);
        passed++;
        return data;
      } else {
        console.error(`[FAIL] ❌ ${name} (Status: ${res.status})`);
        failed++;
      }
    } catch (err) {
      console.error(`[FAIL] ❌ ${name} (Error: ${err.message})`);
      failed++;
    }
  }

  // 1. Test Dashboard Overview
  const dashboard = await assertEndpoint('Dashboard Overview & MongoDB Status', `${BASE_URL}/api/dashboard`);
  if (dashboard) {
    console.log(`   └─ Monitored Projects: ${dashboard.projectsCount}, Overall Confidence: ${dashboard.overallConfidence}%`);
    console.log(`   └─ Innovations Tracked: ${dashboard.innovations.length} Active Modules\n`);
  }

  // 2. Test Repository Analyzer & PDF Report Generator
  const reportRes = await assertEndpoint('Repo Link Analyzer & MongoDB Atlas Storage', `${BASE_URL}/api/projects/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Express E-Commerce Microservice',
      repoUrl: 'https://github.com/expressjs/express.git',
      branch: 'main'
    })
  });
  if (reportRes && reportRes.report) {
    console.log(`   └─ Report Generated for: ${reportRes.report.projectName}`);
    console.log(`   └─ DB Collections Extracted: ${reportRes.report.databaseStructure?.tablesOrCollections?.length || 0}`);
    console.log(`   └─ API Routes Extracted: ${reportRes.report.apiEndpoints?.length || 0}\n`);
  }

  // 3. Test Saved Reports from Database
  const savedReports = await assertEndpoint('Query Saved Reports from Database', `${BASE_URL}/api/reports`);
  if (savedReports && savedReports.length > 0) {
    console.log(`   └─ Saved Reports Count: ${savedReports.length} in DB\n`);
  }

  // 4. Test PDF Download Generation Stream
  const pdfBuffer = await assertEndpoint('PDF Report Generation & Binary Stream', `${BASE_URL}/api/reports/latest/pdf`, { isPdf: true });
  if (pdfBuffer) {
    console.log(`   └─ PDF Binary Stream Generated Successfully (${pdfBuffer.byteLength} bytes)\n`);
  }

  // 5. Test Innovation #1: SDID Multi-Artifact Mapping
  const sdidData = await assertEndpoint('Innovation #1: SDID Multi-Artifact Mapping', `${BASE_URL}/api/sdid/artifacts/SDID-00041`);
  if (sdidData) {
    console.log(`   └─ SDID: ${sdidData.sdid || sdidData.mapping?.sdid} (${sdidData.symbolName || sdidData.mapping?.symbolName})`);
    console.log(`   └─ Associated Artifacts: ${sdidData.artifacts ? sdidData.artifacts.length : 0}\n`);
  }

  // 6. Test Innovation #3: Impact Radius Algorithm
  const impactRadius = await assertEndpoint('Innovation #3: Impact Radius Algorithm', `${BASE_URL}/api/impact/radius`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdid: 'SDID-00041', changeType: 'SIGNATURE_ENHANCEMENT', paramCountChanged: 1 })
  });
  if (impactRadius) {
    console.log(`   └─ Calculated Tier: ${impactRadius.impactLevel}\n`);
  }

  // 7. Test Innovation #5: Self-Healing Engine
  const selfHeal = await assertEndpoint('Innovation #5: Self-Healing Engine Repair', `${BASE_URL}/api/self-heal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sdid: 'SDID-00041' })
  });
  if (selfHeal) {
    console.log(`   └─ Micro-Repairs Executed: ${selfHeal.healedCount}\n`);
  }

  // 8. Test Intelligent Repository Documentation Engine
  const intelligentDocs = await assertEndpoint('Intelligent Repository Documentation Engine', `${BASE_URL}/api/intelligent-docs/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ repoUrl: 'https://github.com/expressjs/express.git' })
  });
  if (intelligentDocs && intelligentDocs.data) {
    console.log(`   └─ Knowledge Graph Report ID: ${intelligentDocs.reportId}`);
    console.log(`   └─ Extracted Folders: ${intelligentDocs.data.folders.length}`);
    console.log(`   └─ Extracted APIs: ${intelligentDocs.data.apis.length}\n`);
  }

  // 9. Test GitHub Webhook Sync Trigger
  const webhookResult = await assertEndpoint('GitHub Webhook Automatic Scan Sync', `${BASE_URL}/api/webhooks/github`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-github-event': 'push'
    },
    body: JSON.stringify({
      ref: 'refs/heads/main',
      repository: {
        html_url: 'https://github.com/expressjs/express.git',
        name: 'express'
      },
      head_commit: {
        id: '9b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c',
        message: 'feat(UserService): enforce MFA token validation logic',
        author: { name: 'Sarah Chen' },
        modified: ['src/services/UserService.ts']
      }
    })
  });
  if (webhookResult) {
    console.log(`   └─ Event: ${webhookResult.event} on ${webhookResult.repository}`);
    console.log(`   └─ Commit Message: ${webhookResult.commit.message}`);
    console.log(`   └─ Impacted SDIDs: ${webhookResult.sdidsImpacted.join(', ')}`);
    console.log(`   └─ Micro-Repairs Executed via Webhook: ${webhookResult.healedCount}\n`);
  }

  console.log('====================================================');
  console.log(`🎉 Self-Test Summary: ${passed} PASSED | ${failed} FAILED`);
  console.log('====================================================');

  process.exit(failed > 0 ? 1 : 0);
}

runSelfTests();
