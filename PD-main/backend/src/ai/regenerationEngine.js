import { LLMService } from './llm.js';
import { ValidationEngine } from './validationEngine.js';
import { DocMappingEngine } from '../mapping/docMappingEngine.js';
import { DocumentationDNAEngine } from '../dna/dnaEngine.js';
import { VersionManager } from '../versioning/versionManager.js';

export class RegenerationEngine {
  static async regenerateDocForSDID(sdid, rawCode, diffSummary) {
    const docBlock = DocMappingEngine.getDocBlockBySDID(sdid);
    if (!docBlock) throw new Error('Doc block not found for SDID');

    const symbolName = docBlock.title.split('(')[0].replace(/###|\`/g, '').trim();

    // 1. Generate updated doc via AI Layer
    const newDocContent = await LLMService.generateDocumentation(
      symbolName,
      rawCode,
      docBlock.content,
      diffSummary
    );

    // 2. Validate Generated Doc
    const validation = ValidationEngine.validateDocAgainstCode(rawCode, newDocContent);
    if (!validation.isValid) {
      console.warn('AI validation warning:', validation.warnings);
    }

    // 3. Update Doc Block
    DocMappingEngine.updateDocBlockContent(docBlock.id, newDocContent, 98);

    // 4. Update DNA Fingerprint
    DocumentationDNAEngine.generateDNA(sdid, rawCode, newDocContent);

    // 5. Log Version History Entry
    VersionManager.recordVersion(
      'proj_1',
      'a7b8c9d',
      sdid,
      'AI Selective Sync',
      diffSummary || 'Regenerated markdown documentation via LLM Engine',
      docBlock.confidenceScore,
      98
    );

    return {
      success: true,
      sdid,
      updatedDocBlock: docBlock,
      validation
    };
  }
}
