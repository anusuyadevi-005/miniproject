import path from 'path';
import fs from 'fs-extra';
import { getParserForExtension, supportedExtensions } from '../parsers/index.js';
import { extractSymbols } from './symbolExtractor.js';
import { analyzeRelationships } from './relationshipAnalyzer.js';
import { calculateInheritance } from './inheritanceAnalyzer.js';
import { buildCallGraph } from './callGraphBuilder.js';
import { analyzeComplexity } from './complexityAnalyzer.js';

function isSupportedFile(file) {
  const extension = path.extname(file.relativePath).toLowerCase();
  return supportedExtensions.includes(extension);
}

export async function analyzeRepositoryAST(inventory) {
  if (!inventory || !inventory.files) {
    throw new Error('Invalid inventory data for AST analysis.');
  }

  const results = {
    files: [],
    classes: [],
    functions: [],
    methods: [],
    relationships: [],
    callGraph: [],
    imports: [],
    complexity: []
  };

  const astFiles = inventory.files.filter(isSupportedFile);
  const parsedFiles = [];

  for (const file of astFiles) {
    const parser = getParserForExtension(path.extname(file.relativePath));
    if (!parser) continue;
    try {
      const parsed = await parser(file.absolutePath);
      parsedFiles.push(parsed);
      results.files.push({
        fileName: file.name,
        language: parsed.language,
        relativePath: file.relativePath,
        absolutePath: file.absolutePath,
        size: file.size
      });
    } catch (err) {
      console.error(`AST parse failure for ${file.relativePath}:`, err.message);
    }
  }

  const symbolData = extractSymbols(parsedFiles);
  const relationshipData = analyzeRelationships(symbolData);
  const inheritanceData = calculateInheritance(symbolData);
  const callGraphData = buildCallGraph(symbolData);
  const complexityData = analyzeComplexity(symbolData);

  return {
    ...results,
    ...symbolData,
    relationships: relationshipData,
    inheritance: inheritanceData,
    callGraph: callGraphData,
    complexity: complexityData
  };
}
