export class PromptManager {
  static buildDocRegenPrompt(symbolName, rawCode, currentDoc, diffSummary) {
    return `System: You are an expert technical writer and AST Documentation Synchronization Engine.
Task: Regenerate precise, clean Markdown documentation for the symbol '${symbolName}'.

Current AST Code:
\`\`\`ts
${rawCode}
\`\`\`

AST Diff Summary:
${diffSummary}

Existing Outdated Doc:
${currentDoc}

Requirements:
1. Update parameter lists to match the exact code parameters.
2. Include types and optional flags.
3. Preserve markdown formatting standards.`;
  }
}
