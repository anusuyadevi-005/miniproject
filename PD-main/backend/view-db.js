import dotenv from 'dotenv';
dotenv.config();

import { connectMongoDB, getMongoStatus } from './src/db/mongo.js';
import { Report } from './src/db/models/Report.js';
import { db } from './src/db/store.js';

async function viewDatabase() {
  console.log('====================================================');
  console.log('📦 ASDSE MongoDB Atlas & Store Inspector');
  console.log('====================================================\n');

  const connected = await connectMongoDB();
  const status = getMongoStatus();

  console.log(`Database Connection Status: ${connected ? '✅ Connected to MongoDB Atlas' : '⚠️ Offline / In-Memory Fallback'}`);
  console.log(`Database Host: ${status.host}`);
  console.log(`Database Name: ${status.dbName}\n`);

  let reports = [];

  try {
    if (connected) {
      reports = await Report.find().sort({ createdAt: -1 }).lean();
      console.log(`[MongoDB Atlas] Query returned ${reports.length} report record(s) from 'reports' collection:\n`);
    }
  } catch (err) {
    console.error('Error querying MongoDB Atlas:', err.message);
  }

  if (!reports || reports.length === 0) {
    reports = db.reports || [];
    console.log(`[Memory Fallback] Found ${reports.length} report record(s) in local store:\n`);
  }

  if (reports.length === 0) {
    console.log('⚠️ No reports found in database yet. Analyze a repository link in the web app to create records.');
    process.exit(0);
  }

  reports.forEach((r, idx) => {
    console.log(`----------------------------------------------------`);
    console.log(`RECORD #${idx + 1}: ${r.projectName || 'Report'}`);
    console.log(`----------------------------------------------------`);
    console.log(`ID:              ${r._id || r.reportId}`);
    console.log(`Repository Link: ${r.repoUrl}`);
    console.log(`Branch:          ${r.branch || 'main'}`);
    console.log(`Language:        ${r.repoLanguage || 'N/A'}`);
    console.log(`Created At:      ${r.createdAt}`);
    console.log(`Tech Stack:      Backend: [${(r.techStack?.backend || []).join(', ')}] | DB: [${(r.techStack?.database || []).join(', ')}]`);
    console.log(`DB Schemas:      ${r.databaseStructure?.tablesOrCollections?.length || 0} collection(s) parsed`);
    console.log(`API Routes:      ${r.apiEndpoints?.length || 0} endpoint(s) mapped`);
    console.log(`Coverage Score:  ${r.docCoverage || 98}%\n`);
  });

  console.log('====================================================');
  console.log('✨ End of Database Inspection');
  console.log('====================================================');
  process.exit(0);
}

viewDatabase();
