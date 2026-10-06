import path from 'path';
import { AgentOrchestrator } from './src/orchestration/orchestrator.js';

async function testRepoMind() {
  console.log('================================================================');
  console.log('🚀 Running RepoMind AI Full 16-Agent Intelligence Pipeline Test');
  console.log('================================================================\n');

  const testFolder = path.resolve('./src/parsers');
  console.log(`[1] Ingesting local folder: ${testFolder}`);

  try {
    const result = await AgentOrchestrator.runFullAnalysis({
      folderPath: testFolder,
      name: 'RepoMind Parsers Module'
    }, (progress) => {
      console.log(`  [Agent ${progress.step}] ${progress.agent}: ${progress.message}`);
    });

    console.log('\n✅ Full 16-Agent Pipeline Executed Successfully!');
    console.log(`   └─ Repository ID: ${result.repositoryId}`);
    console.log(`   └─ Analysis Duration: ${result.durationMs} ms`);
    console.log(`   └─ Scanned Files: ${result.inventory.totalFiles}`);
    console.log(`   └─ Knowledge Graph Entities: ${result.knowledgeGraph.stats.totalEntities}`);
    console.log(`   └─ Knowledge Graph Edges: ${result.knowledgeGraph.stats.totalEdges}`);
    console.log(`   └─ Functional Requirements Reconstructed: ${result.requirements.functional?.length || 0}`);
    console.log(`   └─ Non-Functional Requirements: ${result.requirements.nonFunctional?.length || 0}`);
    console.log(`   └─ Architecture Style: ${result.architecture.primaryStyle}`);
    console.log(`   └─ Diagrams Generated: ${Object.keys(result.diagrams).filter(k => result.diagrams[k]).length}`);
    console.log(`   └─ Documents Package: ${result.documents.length} / 17 Formal Documents`);
    console.log(`   └─ Verification Score: ${result.verification.verificationScore}%`);
    console.log(`   └─ Traceability Matrix Rows: ${result.traceabilityMatrix?.length || 0}`);
    console.log(`   └─ OpenAPI Paths: ${Object.keys(result.openApiSpec?.paths || {}).length}`);
    console.log(`   └─ Quality Score (Freshness): ${result.drift.qualityScores.freshness.value}`);
    console.log(`   └─ Quality Score (Traceability): ${result.drift.qualityScores.traceability.value}`);

    console.log('\n================================================================');
    console.log('🎉 TEST RESULT: ALL 16 AGENTS & PIPELINES OPERATIONAL');
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ Analysis failed with error:', err);
    process.exit(1);
  }
}

testRepoMind();
