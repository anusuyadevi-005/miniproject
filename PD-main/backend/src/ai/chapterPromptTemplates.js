/**
 * Enterprise Chapter Prompt Templates
 * 
 * 19 specialized prompt templates for documentation generation.
 * Each template receives the relevant slice of the Repository Knowledge Model
 * and instructs the LLM to only reference actual repository entities.
 * 
 * Supports multilingual generation via the `language` parameter.
 */

function safeJSON(obj) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return '{}';
  }
}

function safeArray(val) {
  return Array.isArray(val) ? val : [];
}

function safeStr(val) {
  return typeof val === 'string' ? val.trim() : '';
}

function truncateArray(arr, max = 20) {
  const safe = safeArray(arr);
  return safe.length > max ? safe.slice(0, max) : safe;
}

const STRICT_INSTRUCTIONS = `
STRICT RULES:
1. ONLY reference entities, files, classes, functions, APIs, and database schemas that are explicitly listed in the provided repository data.
2. NEVER hallucinate or invent any code entity, file name, class name, function name, API endpoint, or database schema.
3. If the provided data does not contain sufficient information for a section, write exactly: "Information not found in repository."
4. Use proper Markdown formatting with headers, tables, code blocks, and lists.
5. Every statement must be traceable to the provided repository data.
`;

function langInstruction(language) {
  if (!language || language === 'en' || language === 'english') return '';
  return `\nIMPORTANT: Generate all documentation text in ${language}. Keep code identifiers, file paths, and technical terms in English.\n`;
}

// ─── Chapter 1: Executive Summary ───────────────────────────────────────────

export function buildExecutiveSummaryPrompt(knowledgeModel, language) {
  const repo = knowledgeModel.repository || {};
  const folderCount = safeArray(knowledgeModel.folders).length;
  const fileCount = safeArray(knowledgeModel.files).length;
  const classCount = safeArray(knowledgeModel.classes).length;
  const functionCount = safeArray(knowledgeModel.functions).length;
  const apiCount = safeArray(knowledgeModel.apis).length;
  const techSummary = knowledgeModel.technology || {};

  return `Generate a comprehensive Executive Summary chapter for the software project documentation.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

REPOSITORY DATA:
- Project Name: ${safeStr(repo.name || repo.projectName || knowledgeModel.projectName || 'Unknown')}
- Repository URL: ${safeStr(repo.url || repo.repoUrl || knowledgeModel.repoUrl || '')}
- Total Folders: ${folderCount}
- Total Files: ${fileCount}
- Total Classes: ${classCount}
- Total Functions: ${functionCount}
- Total API Endpoints: ${apiCount}
- Architecture Style: ${safeStr(techSummary.architectureStyle)}
- Project Type: ${safeStr(techSummary.projectType)}
- Languages: ${safeArray(techSummary.languages).join(', ') || 'Not detected'}

FORMAT:
# Chapter 1: Executive Summary
## Project Overview
## Key Metrics
## Architecture Highlights
## Technology Decisions
## Strategic Observations`;
}

// ─── Chapter 2: Repository Overview ─────────────────────────────────────────

export function buildRepositoryOverviewPrompt(knowledgeModel, language) {
  const repo = knowledgeModel.repository || {};
  const topFolders = truncateArray(knowledgeModel.folders, 10).map(f => ({
    path: f.path || f.folderPath || f.relativePath,
    purpose: f.purpose || f.description || '',
    layer: f.architectureLayer || f.layer || ''
  }));

  return `Generate a Repository Overview chapter documenting the project structure and organization.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

REPOSITORY DATA:
- Project Name: ${safeStr(repo.name || repo.projectName || knowledgeModel.projectName || 'Unknown')}
- Repository URL: ${safeStr(repo.url || repo.repoUrl || knowledgeModel.repoUrl || '')}
- Branch: ${safeStr(repo.branch || 'main')}
- Total Folders: ${safeArray(knowledgeModel.folders).length}
- Total Files: ${safeArray(knowledgeModel.files).length}
- Top-Level Folders:
${safeJSON(topFolders)}

FORMAT:
# Chapter 2: Repository Overview
## Project Identity
## Repository Structure
## Folder Organization
## Key Entry Points`;
}

// ─── Chapter 3: Technology Stack ────────────────────────────────────────────

export function buildTechnologyStackPrompt(knowledgeModel, language) {
  const tech = knowledgeModel.technology || {};

  return `Generate a Technology Stack chapter documenting all technologies, frameworks, and tools used.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

TECHNOLOGY DATA:
${safeJSON({
  projectType: tech.projectType,
  architectureStyle: tech.architectureStyle,
  languages: tech.languages,
  frontend: tech.frontend,
  backend: tech.backend,
  database: tech.database,
  authentication: tech.authentication,
  deployment: tech.deployment,
  testing: tech.testing,
  buildTools: tech.buildTools,
  packageManagers: tech.packageManagers
})}

FORMAT:
# Chapter 3: Technology Stack
## Languages
## Frontend Technologies
## Backend Technologies
## Database Technologies
## Authentication & Security
## Build & Deployment Tools
## Testing Frameworks
## Package Managers`;
}

// ─── Chapter 4: Folder Documentation ────────────────────────────────────────

export function buildFolderDocumentationPrompt(knowledgeModel, language) {
  const folders = truncateArray(knowledgeModel.folders, 15).map(f => ({
    path: f.path || f.folderPath || f.relativePath,
    purpose: f.purpose || f.description || '',
    layer: f.architectureLayer || f.layer || '',
    responsibilities: safeArray(f.responsibilities),
    containsFiles: safeArray(f.containsFiles).slice(0, 5),
    dependencies: safeArray(f.dependencies),
    usedBy: safeArray(f.usedBy)
  }));

  return `Generate comprehensive Folder Documentation for each repository folder.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

FOLDER DATA:
${safeJSON(folders)}

FORMAT:
# Chapter 4: Folder Documentation
For each folder, document:
## [Folder Path]
### Purpose
### Architecture Layer
### Responsibilities
### Key Files
### Dependencies & Consumers`;
}

// ─── Chapter 5: File Documentation ──────────────────────────────────────────

export function buildFileDocumentationPrompt(knowledgeModel, language) {
  const files = truncateArray(knowledgeModel.files, 15).map(f => ({
    name: f.name || f.fileName,
    path: f.path || f.filePath || f.relativePath,
    purpose: f.purpose || f.description || '',
    language: f.language || '',
    exports: safeArray(f.exports).slice(0, 5),
    imports: safeArray(f.imports).slice(0, 5),
    classes: safeArray(f.classes),
    functions: safeArray(f.functions),
    securityNotes: safeArray(f.securityNotes),
    improvementSuggestions: safeArray(f.improvementSuggestions)
  }));

  return `Generate comprehensive File Documentation for each key source file.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

FILE DATA:
${safeJSON(files)}

FORMAT:
# Chapter 5: File Documentation
For each file, document:
## [File Name] — \`[File Path]\`
### Purpose
### Imports & Dependencies
### Exports
### Classes & Functions Defined
### Security Notes
### Improvement Suggestions`;
}

// ─── Chapter 6: Class Documentation ─────────────────────────────────────────

export function buildClassDocumentationPrompt(knowledgeModel, language) {
  const classes = truncateArray(knowledgeModel.classes, 12).map(c => ({
    name: c.name || c.className,
    path: c.filePath || c.path || '',
    purpose: c.purpose || c.description || '',
    constructor: c.constructor || null,
    properties: safeArray(c.properties).slice(0, 8),
    methods: safeArray(c.methods).slice(0, 8),
    inheritance: c.inheritance || 'None',
    composition: safeArray(c.composition),
    relationships: safeArray(c.relationships),
    lifecycle: c.lifecycle || '',
    exampleUsage: c.exampleUsage || ''
  }));

  return `Generate comprehensive Class Documentation for each class in the repository.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

CLASS DATA:
${safeJSON(classes)}

FORMAT:
# Chapter 6: Class Documentation
For each class, document:
## class \`[ClassName]\`
### Purpose
### File Location
### Constructor
### Properties
### Methods
### Inheritance & Composition
### Relationships
### Example Usage`;
}

// ─── Chapter 7: Function Documentation ──────────────────────────────────────

export function buildFunctionDocumentationPrompt(knowledgeModel, language) {
  const functions = truncateArray(knowledgeModel.functions, 15).map(fn => ({
    name: fn.name || fn.functionName,
    signature: fn.signature || '',
    path: fn.filePath || fn.path || '',
    purpose: fn.purpose || fn.description || '',
    parameters: safeArray(fn.parameters),
    returnType: fn.returnType || 'void',
    businessLogic: fn.businessLogic || '',
    algorithm: fn.algorithm || '',
    pseudoCode: fn.pseudoCode || '',
    timeComplexity: fn.timeComplexity || '',
    calledBy: safeArray(fn.calledBy),
    calls: safeArray(fn.calls)
  }));

  return `Generate comprehensive Function Documentation for each function.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

FUNCTION DATA:
${safeJSON(functions)}

FORMAT:
# Chapter 7: Function Documentation
For each function, document:
## \`[functionName](parameters)\`
### Purpose
### Signature & Parameters
### Return Type
### Business Logic
### Algorithm & Pseudocode
### Complexity Analysis
### Call Graph (calledBy / calls)`;
}

// ─── Chapter 8: API Documentation ───────────────────────────────────────────

export function buildApiDocumentationPrompt(knowledgeModel, language) {
  const apis = truncateArray(knowledgeModel.apis, 15).map(api => ({
    method: api.method || 'GET',
    route: api.route || api.path || '',
    controller: api.controller || api.handler || '',
    authentication: api.authentication || 'None',
    headers: safeArray(api.headers),
    requestBody: api.requestBody || null,
    responseBody: api.responseBody || null,
    validation: safeArray(api.validation),
    statusCodes: safeArray(api.statusCodes),
    exampleRequest: api.exampleRequest || '',
    exampleResponse: api.exampleResponse || ''
  }));

  return `Generate comprehensive API Documentation for each endpoint.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

API DATA:
${safeJSON(apis)}

FORMAT:
# Chapter 8: API Documentation
For each endpoint, document:
## \`[METHOD]\` \`[Route]\`
### Controller / Handler
### Authentication
### Request Headers
### Request Body Schema
### Response Body Schema
### Validation Rules
### Status Codes
### Example Request
### Example Response`;
}

// ─── Chapter 9: Database Documentation ──────────────────────────────────────

export function buildDatabaseDocumentationPrompt(knowledgeModel, language) {
  const database = knowledgeModel.database || {};
  const dbArray = Array.isArray(database) ? database : safeArray(database.collections || database.entities || database.tables);

  return `Generate comprehensive Database Documentation for all database entities.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

DATABASE DATA:
${safeJSON({
  entities: truncateArray(dbArray, 12),
  erDiagram: database.erDiagram || null,
  databaseType: database.databaseType || knowledgeModel.technology?.database || 'Not specified'
})}

FORMAT:
# Chapter 9: Database Documentation
## Database Technology
## Entity Relationship Diagram
## Collection / Table Documentation
For each entity:
### [Entity Name]
#### Schema / Fields
#### Indexes
#### Relationships
#### Constraints`;
}

// ─── Chapter 10: Architecture Documentation ─────────────────────────────────

export function buildArchitectureDocumentationPrompt(knowledgeModel, language) {
  const arch = knowledgeModel.architecture || {};
  const callGraph = truncateArray(knowledgeModel.callGraph, 10);

  return `Generate comprehensive Architecture Documentation.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

ARCHITECTURE DATA:
${safeJSON({
  highLevelDiagram: arch.highLevelDiagram || null,
  componentDiagram: arch.componentDiagram || null,
  packageDiagram: arch.packageDiagram || null,
  sequenceDiagram: arch.sequenceDiagram || null,
  classDiagram: arch.classDiagram || null,
  deploymentDiagram: arch.deploymentDiagram || null,
  dependencyGraph: arch.dependencyGraph || null,
  architectureStyle: knowledgeModel.technology?.architectureStyle || '',
  callGraph: callGraph
})}

FORMAT:
# Chapter 10: Architecture Documentation
## Architecture Style & Patterns
## High-Level Architecture
## Component Architecture
## Package Structure
## Sequence Flows
## Class Relationships
## Deployment Architecture
## Dependency Graph`;
}

// ─── Chapter 11: Business Logic Documentation ───────────────────────────────

export function buildBusinessLogicDocumentationPrompt(knowledgeModel, language) {
  const businessFunctions = safeArray(knowledgeModel.functions).filter(fn => fn.businessLogic);
  const workflows = safeArray(knowledgeModel.workflows || knowledgeModel.businessLogic?.workflows);
  const rules = safeArray(knowledgeModel.businessRules || knowledgeModel.businessLogic?.rules);

  return `Generate comprehensive Business Logic Documentation.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

BUSINESS LOGIC DATA:
- Functions with business logic: ${businessFunctions.length}
${safeJSON({
  businessFunctions: truncateArray(businessFunctions, 10).map(fn => ({
    name: fn.name || fn.functionName,
    signature: fn.signature || '',
    businessLogic: fn.businessLogic || '',
    algorithm: fn.algorithm || '',
    filePath: fn.filePath || fn.path || ''
  })),
  workflows: truncateArray(workflows, 5),
  rules: truncateArray(rules, 8)
})}

FORMAT:
# Chapter 11: Business Logic Documentation
## Core Business Processes
## Business Rules & Validation
## Workflow Descriptions
## Data Transformation Logic
## Business Function Details`;
}

// ─── Chapter 12: Configuration Guide ────────────────────────────────────────

export function buildConfigurationGuidePrompt(knowledgeModel, language) {
  const config = knowledgeModel.configuration || {};
  const envVars = safeArray(config.envVars || config.environmentVariables || knowledgeModel.deployment?.environmentVariables);

  return `Generate a comprehensive Configuration Guide.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

CONFIGURATION DATA:
${safeJSON({
  configuration: config,
  environmentVariables: truncateArray(envVars, 15),
  packageManagers: safeArray(knowledgeModel.technology?.packageManagers),
  buildTools: knowledgeModel.technology?.buildTools || {},
  dockerFiles: safeArray(knowledgeModel.dockerFiles || knowledgeModel.deployment?.dockerGuide),
  cicd: safeArray(knowledgeModel.cicdWorkflows || knowledgeModel.deployment?.cicd)
})}

FORMAT:
# Chapter 12: Configuration Guide
## Environment Variables
## Application Configuration Files
## Build Configuration
## Docker Configuration
## CI/CD Pipeline Configuration
## Package Manager Configuration`;
}

// ─── Chapter 13: Deployment Guide ───────────────────────────────────────────

export function buildDeploymentGuidePrompt(knowledgeModel, language) {
  const deployment = knowledgeModel.deployment || {};
  const tech = knowledgeModel.technology || {};

  return `Generate a comprehensive Deployment Guide.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

DEPLOYMENT DATA:
${safeJSON({
  installation: safeArray(deployment.installation),
  requirements: safeArray(deployment.requirements),
  environmentVariables: safeArray(deployment.environmentVariables).slice(0, 10),
  dockerGuide: deployment.dockerGuide || null,
  runningCommands: safeArray(deployment.runningCommands),
  productionDeployment: safeArray(deployment.productionDeployment),
  deploymentPlatform: tech.deployment || {},
  testingCommands: safeArray(deployment.testingCommands)
})}

FORMAT:
# Chapter 13: Deployment Guide
## System Requirements
## Installation Steps
## Environment Setup
## Running Locally
## Docker Deployment
## Production Deployment
## Health Checks & Monitoring`;
}

// ─── Chapter 14: Security Analysis ──────────────────────────────────────────

export function buildSecurityAnalysisPrompt(knowledgeModel, language) {
  const authApis = safeArray(knowledgeModel.apis).filter(api => api.authentication && api.authentication !== 'None');
  const securityFiles = safeArray(knowledgeModel.files).filter(f => safeArray(f.securityNotes).length > 0);
  const authTech = knowledgeModel.technology?.authentication || {};

  return `Generate a comprehensive Security Analysis.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

SECURITY DATA:
${safeJSON({
  authenticatedEndpoints: truncateArray(authApis, 10).map(a => ({ method: a.method, route: a.route, authentication: a.authentication })),
  filesWithSecurityNotes: truncateArray(securityFiles, 8).map(f => ({ path: f.filePath || f.path, notes: f.securityNotes })),
  authenticationTechnology: authTech,
  securityConfiguration: knowledgeModel.configuration?.security || null
})}

FORMAT:
# Chapter 14: Security Analysis
## Authentication Mechanisms
## Authenticated Endpoints
## Security Observations per File
## Security Configuration
## Recommendations`;
}

// ─── Chapter 15: Performance Analysis ───────────────────────────────────────

export function buildPerformanceAnalysisPrompt(knowledgeModel, language) {
  const functionsWithComplexity = safeArray(knowledgeModel.functions).filter(fn => fn.timeComplexity);
  const apiCount = safeArray(knowledgeModel.apis).length;

  return `Generate a Performance Analysis chapter based on the repository knowledge model.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

PERFORMANCE DATA:
${safeJSON({
  functionsWithComplexity: truncateArray(functionsWithComplexity, 10).map(fn => ({
    name: fn.name || fn.functionName,
    signature: fn.signature || '',
    timeComplexity: fn.timeComplexity,
    filePath: fn.filePath || fn.path || ''
  })),
  totalApiEndpoints: apiCount,
  totalFunctions: safeArray(knowledgeModel.functions).length,
  totalClasses: safeArray(knowledgeModel.classes).length,
  databaseEntityCount: (Array.isArray(knowledgeModel.database) ? knowledgeModel.database : safeArray(knowledgeModel.database?.collections)).length
})}

FORMAT:
# Chapter 15: Performance Analysis
## Complexity Analysis
## Function Complexity Table
## API Endpoint Performance Considerations
## Database Performance Observations
## Optimization Recommendations`;
}

// ─── Chapter 16: Testing Documentation ──────────────────────────────────────

export function buildTestingDocumentationPrompt(knowledgeModel, language) {
  const testing = knowledgeModel.technology?.testing || {};
  const testCommands = safeArray(knowledgeModel.deployment?.testingCommands);
  const testFiles = safeArray(knowledgeModel.files).filter(f => {
    const name = (f.name || f.fileName || '').toLowerCase();
    return name.includes('test') || name.includes('spec') || name.includes('.test.') || name.includes('.spec.');
  });

  return `Generate comprehensive Testing Documentation.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

TESTING DATA:
${safeJSON({
  testingFrameworks: testing,
  testCommands: testCommands,
  testFiles: truncateArray(testFiles, 10).map(f => ({
    name: f.name || f.fileName,
    path: f.filePath || f.path || f.relativePath
  })),
  totalTestFiles: testFiles.length
})}

FORMAT:
# Chapter 16: Testing Documentation
## Testing Frameworks & Tools
## Test File Inventory
## Running Tests
## Test Coverage Observations
## Testing Recommendations`;
}

// ─── Chapter 17: Code Quality Report ────────────────────────────────────────

export function buildCodeQualityReportPrompt(knowledgeModel, language) {
  const classCount = safeArray(knowledgeModel.classes).length;
  const functionCount = safeArray(knowledgeModel.functions).length;
  const fileCount = safeArray(knowledgeModel.files).length;
  const depCount = safeArray(knowledgeModel.dependencies).length;
  const filesWithSuggestions = safeArray(knowledgeModel.files).filter(f => safeArray(f.improvementSuggestions).length > 0);

  return `Generate a Code Quality Report.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

CODE QUALITY DATA:
${safeJSON({
  metrics: {
    totalFiles: fileCount,
    totalClasses: classCount,
    totalFunctions: functionCount,
    totalDependencies: depCount
  },
  filesWithImprovementSuggestions: truncateArray(filesWithSuggestions, 8).map(f => ({
    path: f.filePath || f.path,
    suggestions: f.improvementSuggestions
  })),
  searchIndexCoverage: knowledgeModel.searchIndex ? Object.keys(knowledgeModel.searchIndex).length : 0
})}

FORMAT:
# Chapter 17: Code Quality Report
## Codebase Metrics
## Module Organization Score
## Code Improvement Suggestions
## Dependency Health
## Documentation Coverage
## Maintainability Assessment`;
}

// ─── Chapter 18: Future Improvements ────────────────────────────────────────

export function buildFutureImprovementsPrompt(knowledgeModel, language) {
  const allSuggestions = [];
  safeArray(knowledgeModel.files).forEach(f => {
    safeArray(f.improvementSuggestions).forEach(s => {
      allSuggestions.push({ file: f.filePath || f.path || f.name, suggestion: s });
    });
  });

  return `Generate a Future Improvements chapter with actionable recommendations.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

IMPROVEMENT DATA:
${safeJSON({
  existingSuggestions: truncateArray(allSuggestions, 15),
  totalClasses: safeArray(knowledgeModel.classes).length,
  totalFunctions: safeArray(knowledgeModel.functions).length,
  totalApis: safeArray(knowledgeModel.apis).length,
  architectureStyle: knowledgeModel.technology?.architectureStyle || 'Unknown',
  hasDocker: !!(knowledgeModel.deployment?.dockerGuide),
  hasCicd: safeArray(knowledgeModel.cicdWorkflows).length > 0,
  hasTesting: !!knowledgeModel.technology?.testing
})}

FORMAT:
# Chapter 18: Future Improvements
## Architecture Recommendations
## Code Quality Improvements
## Testing Improvements
## Security Enhancements
## Performance Optimizations
## DevOps & Deployment Improvements
## Documentation Improvements`;
}

// ─── Chapter 19: Appendix ───────────────────────────────────────────────────

export function buildAppendixPrompt(knowledgeModel, language) {
  const depList = truncateArray(knowledgeModel.dependencies, 20).map(d => ({
    name: d.name || d.source || 'Unknown',
    version: d.version || '',
    relationship: d.relationship || ''
  }));

  return `Generate an Appendix chapter with reference tables and metadata.
${STRICT_INSTRUCTIONS}${langInstruction(language)}

APPENDIX DATA:
${safeJSON({
  dependencies: depList,
  folderCount: safeArray(knowledgeModel.folders).length,
  fileCount: safeArray(knowledgeModel.files).length,
  classCount: safeArray(knowledgeModel.classes).length,
  functionCount: safeArray(knowledgeModel.functions).length,
  apiCount: safeArray(knowledgeModel.apis).length,
  technologyStack: knowledgeModel.technology?.languages || [],
  repositoryUrl: knowledgeModel.repository?.url || knowledgeModel.repoUrl || ''
})}

FORMAT:
# Chapter 19: Appendix
## Full Dependency Table
## Glossary of Terms
## File Inventory Summary
## Technology Reference
## Document Generation Metadata`;
}

// ─── Prompt Router ──────────────────────────────────────────────────────────

const CHAPTER_PROMPT_BUILDERS = {
  chapter_1: buildExecutiveSummaryPrompt,
  chapter_2: buildRepositoryOverviewPrompt,
  chapter_3: buildTechnologyStackPrompt,
  chapter_4: buildFolderDocumentationPrompt,
  chapter_5: buildFileDocumentationPrompt,
  chapter_6: buildClassDocumentationPrompt,
  chapter_7: buildFunctionDocumentationPrompt,
  chapter_8: buildApiDocumentationPrompt,
  chapter_9: buildDatabaseDocumentationPrompt,
  chapter_10: buildArchitectureDocumentationPrompt,
  chapter_11: buildBusinessLogicDocumentationPrompt,
  chapter_12: buildConfigurationGuidePrompt,
  chapter_13: buildDeploymentGuidePrompt,
  chapter_14: buildSecurityAnalysisPrompt,
  chapter_15: buildPerformanceAnalysisPrompt,
  chapter_16: buildTestingDocumentationPrompt,
  chapter_17: buildCodeQualityReportPrompt,
  chapter_18: buildFutureImprovementsPrompt,
  chapter_19: buildAppendixPrompt
};

/**
 * Build a prompt for a specific chapter.
 * @param {string} chapterId - The chapter ID (e.g., 'chapter_1')
 * @param {Object} knowledgeModel - The repository knowledge model
 * @param {string} language - Target language for generation (default: 'en')
 * @returns {string} The constructed prompt
 */
export function buildChapterPrompt(chapterId, knowledgeModel, language = 'en') {
  const builder = CHAPTER_PROMPT_BUILDERS[chapterId];
  if (!builder) {
    throw new Error(`No prompt template found for chapter: ${chapterId}`);
  }
  return builder(knowledgeModel, language);
}

/**
 * Get the list of all supported chapter IDs.
 */
export function getAllChapterIds() {
  return Object.keys(CHAPTER_PROMPT_BUILDERS);
}
