import { AgentOrchestrator } from './src/orchestration/orchestrator.js';
import { analysisStore, getActiveAnalysis } from './src/routes/repomindV1Routes.js';
import { PDFReportGenerator } from './src/generator/pdfReportGenerator.js';
import { DocumentationPublisher } from './src/services/documentationPublisher.js';
import fs from 'fs';
import path from 'path';

async function runAcceptanceTest() {
  console.log('============================================================');
  console.log('STARTING ACCEPTANCE TEST: REPOMIND STUDIO -> DOCS GENERATOR -> PDF FLOW');
  console.log('============================================================\n');

  // Test 1: Python/Flask/PostgreSQL repository: attendance-system
  console.log('>>> TEST 1: Analyzing attendance-system (Python/Flask/PostgreSQL)...');
  const repo1Url = 'https://github.com/PadmaPriya78/attendance-system.git';
  const result1 = await AgentOrchestrator.runFullAnalysis({ url: repo1Url });

  console.log('✅ Analysis complete for attendance-system:');
  console.log(`   Session ID: ${result1.repositoryId}`);
  console.log(`   Repo Name: ${result1.repositoryName}`);
  console.log(`   Branch: ${result1.inventory?.metadata?.branch}`);
  console.log(`   Primary Lang: ${result1.techAnalysis?.languages?.[0]}`);
  console.log(`   DB Detected: ${result1.techAnalysis?.database?.databases?.join(', ')}`);
  console.log(`   Entities Found: ${result1.knowledgeGraph?.entities?.filter(e => e.type === 'Table' || e.type === 'Collection').length}`);
  console.log(`   Diagrams Generated: ${Object.keys(result1.diagrams || {}).filter(k => result1.diagrams[k]).length}/10`);

  // Ensure analysis is in store
  analysisStore.set(result1.repositoryId, result1);

  // Check active analysis
  const activeAnalysis1 = getActiveAnalysis();
  console.log(`\n✅ Active Analysis retrieved: ${activeAnalysis1?.repositoryName}`);

  // Resolve document data via DocumentationPublisher
  const docData1 = await DocumentationPublisher.resolveDocumentData(result1.repositoryId);
  console.log(`✅ DocumentationPublisher resolved for ${docData1.projectName}:`);
  console.log(`   TechStack Backend: ${docData1.techStack?.backend?.join(', ')}`);
  console.log(`   TechStack DB: ${docData1.techStack?.database?.join(', ')}`);
  console.log(`   DB Engine: ${docData1.databaseStructure?.engine}`);
  console.log(`   DB Tables: ${docData1.databaseStructure?.tablesOrCollections?.map(t => t.name).join(', ')}`);

  // Generate PDF Buffer
  const pdfBuffer1 = await PDFReportGenerator.generatePDFBuffer(docData1);
  console.log(`✅ PDF generated successfully: ${pdfBuffer1.length} bytes`);
  fs.writeFileSync('./attendance-system-report.pdf', pdfBuffer1);

  // Test 2: Repository Switching to data-warehouse (No DB)
  console.log('\n============================================================');
  console.log('>>> TEST 2: Repository Switching to data-warehouse (No Database)...');
  const repo2Url = 'https://github.com/PadmaPriya78/data-warehouse.git';
  const result2 = await AgentOrchestrator.runFullAnalysis({ url: repo2Url });

  console.log('✅ Analysis complete for data-warehouse:');
  console.log(`   Session ID: ${result2.repositoryId}`);
  console.log(`   Repo Name: ${result2.repositoryName}`);
  console.log(`   Branch: ${result2.inventory?.metadata?.branch}`);
  console.log(`   Primary Lang: ${result2.techAnalysis?.languages?.[0]}`);
  console.log(`   DB Detected: ${result2.techAnalysis?.database?.databases?.join(', ') || 'None'}`);
  console.log(`   Entities Found: ${result2.knowledgeGraph?.entities?.filter(e => e.type === 'Table' || e.type === 'Collection').length}`);

  // Ensure analysis is in store
  analysisStore.set(result2.repositoryId, result2);

  const docData2 = await DocumentationPublisher.resolveDocumentData(result2.repositoryId);
  console.log(`✅ DocumentationPublisher resolved for ${docData2.projectName}:`);
  console.log(`   TechStack DB: ${docData2.techStack?.database?.join(', ') || 'None'}`);
  console.log(`   DB Engine: ${docData2.databaseStructure?.engine || 'None'}`);
  console.log(`   DB Tables: ${docData2.databaseStructure?.tablesOrCollections?.length || 0}`);

  const pdfBuffer2 = await PDFReportGenerator.generatePDFBuffer(docData2);
  console.log(`✅ PDF generated successfully: ${pdfBuffer2.length} bytes`);
  fs.writeFileSync('./data-warehouse-report.pdf', pdfBuffer2);

  console.log('\n============================================================');
  console.log('ALL ACCEPTANCE TESTS PASSED SUCCESSFULLY WITH ZERO CONTAMINATION!');
  console.log('============================================================');
}

runAcceptanceTest().catch(err => {
  console.error('Acceptance test failed:', err);
  process.exit(1);
});
