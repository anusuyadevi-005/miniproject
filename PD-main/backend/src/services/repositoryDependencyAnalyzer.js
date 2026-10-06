import { analyzeRepositoryAST } from './astAnalyzer.js';
import { buildDependencyGraph, buildModuleGraph, buildPackageGraph } from './dependencyGraphBuilder.js';
import { analyzePackageDependencies } from './packageDependencyAnalyzer.js';
import { analyzeModuleDependencies } from './moduleDependencyAnalyzer.js';
import { detectCircularDependencies } from './circularDependencyDetector.js';
import { detectUnusedImports, detectUnusedPackages, detectUnusedFiles } from './unusedDependencyDetector.js';
import { analyzeServiceRelationships } from './serviceRelationshipAnalyzer.js';

export async function analyzeRepositoryDependencies(inventory) {
  if (!inventory || !inventory.repositoryId) {
    throw new Error('Repository inventory is required for dependency analysis.');
  }

  const astAnalysis = await analyzeRepositoryAST(inventory);
  const dependencyGraph = buildDependencyGraph(astAnalysis);
  const moduleGraph = buildModuleGraph(astAnalysis);
  const packageGraph = buildPackageGraph(astAnalysis, inventory.metadata || {});
  const packageDependencies = await analyzePackageDependencies(inventory);
  const moduleDependencies = analyzeModuleDependencies(astAnalysis);
  const circularDependencies = detectCircularDependencies(moduleGraph);
  const unusedImports = detectUnusedImports(astAnalysis);
  const unusedPackages = detectUnusedPackages(inventory, astAnalysis);
  const unusedFiles = detectUnusedFiles(inventory, astAnalysis);
  const serviceRelationships = analyzeServiceRelationships(astAnalysis);

  return {
    repositoryId: inventory.repositoryId,
    dependencyGraph,
    moduleGraph,
    packageGraph,
    packageDependencies,
    moduleDependencies,
    circularDependencies,
    unusedImports,
    unusedPackages,
    unusedFiles,
    serviceRelationships,
    analyzedAt: new Date()
  };
}
