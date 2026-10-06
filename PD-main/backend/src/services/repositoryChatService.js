import crypto from 'crypto';
import { QueryAnalyzer } from './queryAnalyzer.js';
import { ContextRetriever } from './contextRetriever.js';
import { RAGService } from './ragService.js';
import { AnswerValidator } from './answerValidator.js';
import { CitationService } from './citationService.js';
import { LLMProviderFactory } from '../ai/llmProviderFactory.js';
import { ChatMessage, ChatSession } from '../models/ChatModels.js';
import { RepositoryDocumentation } from '../models/RepositoryDocumentationModel.js';
import { RepositoryKnowledgeModel } from '../models/RepositoryKnowledgeModel.js';
import { Report } from '../db/models/Report.js';
import { RepositoryKnowledgeService } from './intelligentRepoService.js';
import { getMongoStatus } from '../db/mongo.js';

export class RepositoryChatService {
  /**
   * Main entrypoint for natural language chat requests
   * @param {string} repositoryId - Secure repository isolation key
   * @param {string} message - User natural language prompt
   * @param {string} conversationId - Active session ID (created if empty)
   * @returns {Object} Chat reply response
   */
  static async processChatMessage(repositoryId, message, conversationId = null) {
    if (!repositoryId) throw new Error('repositoryId is a required security parameter');
    if (!message) throw new Error('Message payload is empty');

    const sessionKey = conversationId || `conv_${crypto.randomBytes(4).toString('hex')}`;

    // 1. Resolve Repository Knowledge Graph (Module 5)
    let knowledgeGraph = null;
    if (getMongoStatus().isConnected) {
      try {
        const modelDoc = await RepositoryKnowledgeModel.findOne({ repositoryId }).lean();
        if (modelDoc?.knowledgeModel) {
          knowledgeGraph = modelDoc.knowledgeModel;
        }
      } catch (_) {}
    }

    if (!knowledgeGraph && getMongoStatus().isConnected) {
      try {
        const report = await Report.findOne({
          $or: [{ reportId: repositoryId }, { repoUrl: new RegExp(repositoryId, 'i') }]
        }).lean();
        if (report) {
          knowledgeGraph = await RepositoryKnowledgeService.buildKnowledgeGraph(report);
        }
      } catch (_) {}
    }

    // Fallback to memory stores if Mongo is not connected or record not in Mongo
    if (!knowledgeGraph) {
      const { db } = await import('../db/store.js');
      const memoryDoc = (db.intelligentDocs || []).find(d => d.reportId === repositoryId || d.projectName);
      if (memoryDoc) {
        knowledgeGraph = memoryDoc;
      } else if (db.reports && db.reports.length > 0) {
        knowledgeGraph = await RepositoryKnowledgeService.buildKnowledgeGraph(db.reports[0]);
      } else {
        // Synthesize default knowledge graph for Express/Node project
        const { RepoAnalyzer } = await import('../git/repoAnalyzer.js');
        const defaultReport = await RepoAnalyzer.analyzeRepository('https://github.com/expressjs/express.git', 'Auth & User Services System');
        knowledgeGraph = await RepositoryKnowledgeService.buildKnowledgeGraph(defaultReport);
      }
    }

    // 2. Query Analysis & Entity Resolution (Module 12)
    const category = QueryAnalyzer.classifyQuery(message);
    const { matched, disambiguate, disambiguationGroups } = QueryAnalyzer.resolveEntities(message, knowledgeGraph);

    // If disambiguation is needed, return matches so the UI can prompt selection
    if (disambiguate && disambiguationGroups.length > 0) {
      const options = disambiguationGroups[0].map(ent => ({
        type: ent.type,
        id: ent.id,
        path: ent.path
      }));
      return {
        success: true,
        conversationId: sessionKey,
        disambiguate: true,
        message: 'Multiple matches found. Please clarify which entity you refer to:',
        options,
        answer: 'Multiple matching entities found in the repository knowledge model. Please select one to proceed.',
        sources: [],
        entities: options,
        diagrams: [],
        confidence: 'Low'
      };
    }

    // 3. Load Chat History for Memory Context
    const history = [];
    if (getMongoStatus().isConnected) {
      const messages = await ChatMessage.find({ repositoryId, conversationId: sessionKey })
        .sort({ createdAt: 1 })
        .limit(6)
        .lean();
      messages.forEach(msg => {
        history.push(`User: ${msg.userMessage}`);
        history.push(`Assistant: ${msg.assistantMessage}`);
      });
    }

    // 4. Retrieve Context (Hybrid: Structured + Semantic/Vector DB)
    const context = ContextRetriever.retrieveContext(category, knowledgeGraph, matched);
    
    // Vector search query
    const rag = new RAGService();
    await rag.buildIndexForRepository(knowledgeGraph); // Index dynamically
    const semanticChunks = await rag.semanticSearch(repositoryId, message, 3);
    
    semanticChunks.forEach(chunk => {
      context.evidence.push({
        title: `Semantic Search Chunk (${chunk.entityType})`,
        content: chunk.content
      });
    });

    // 5. Generate Grounding Prompt
    const evidenceText = context.evidence.map(e => `[Source: ${e.title}]\n${e.content}`).join('\n\n');
    const memoryText = history.length ? history.join('\n') : 'No previous messages.';

    const systemPrompt = `You are answering questions about a specific analyzed software repository.
Use only the supplied repository evidence.
Do not invent information.
Every important technical claim must be supported by repository context.
If evidence is insufficient, explicitly say so.
Distinguish between: Confirmed repository evidence, Reasonable inference, Unavailable information.

CONVERSATION HISTORY:
${memoryText}

REPOSITORY DATA EVIDENCE:
${evidenceText}

User Prompt: ${message}`;

    // 6. Invoke config LLM Provider
    const provider = LLMProviderFactory.getProvider();
    let rawAnswer = null;

    if (provider.name !== 'deterministic') {
      try {
        rawAnswer = await provider.generateChapterContent(systemPrompt);
      } catch (err) {
        console.warn('Chat LLM generation failed, falling back to deterministic answer:', err.message);
      }
    }

    // Fallback deterministic answers if LLM is offline/unconfigured
    if (!rawAnswer) {
      rawAnswer = this.generateDeterministicAnswer(category, context, message);
    }

    // 7. Validate generated answer (Halucination preventions)
    const validation = AnswerValidator.validateAnswer(rawAnswer, context.evidence, { matched });
    let finalAnswer = validation.validatedAnswer;

    // 8. Extract Citations & Cross-references
    const citations = CitationService.extractCitations(finalAnswer, knowledgeGraph);
    const trace = CitationService.buildCrossReferenceTrace(message, knowledgeGraph);

    // If trace exists, map into visual flow diagram
    if (trace && trace.nodes) {
      const diagramContent = `\`\`\`mermaid\ngraph TD\n${trace.nodes.map((n, idx) => {
        if (idx < trace.nodes.length - 1) {
          return `  N${idx}["${n.label}"] --> N${idx+1}["${trace.nodes[idx+1].label}"]`;
        }
        return '';
      }).filter(Boolean).join('\n')}\n\`\`\``;
      
      context.diagrams.push({
        type: 'Flow Diagram',
        title: trace.title,
        content: diagramContent,
        module: 'Business Logic Intelligence'
      });
    }

    // Redact sensitive details (API keys, secrets) for safety
    finalAnswer = this.redactSensitiveData(finalAnswer);

    // 9. Save session & message in MongoDB
    if (getMongoStatus().isConnected) {
      await ChatSession.findOneAndUpdate(
        { repositoryId, conversationId: sessionKey },
        { repositoryId, conversationId: sessionKey, title: message.substring(0, 40), updatedAt: new Date() },
        { upsert: true, new: true }
      );

      await ChatMessage.create({
        repositoryId,
        conversationId: sessionKey,
        userMessage: message,
        assistantMessage: finalAnswer,
        sources: citations,
        entities: matched.map(m => ({ id: m.id, type: m.type })),
        confidence: validation.confidenceLevel
      });
    }

    return {
      success: true,
      conversationId: sessionKey,
      answer: finalAnswer,
      sources: citations,
      entities: matched.map(m => ({ id: m.id, type: m.type })),
      diagrams: context.diagrams,
      confidence: validation.confidenceLevel
    };
  }

  /**
   * Basic deterministic generator as safe fallback
   */
  static generateDeterministicAnswer(category, context, query) {
    const list = context.evidence.map(e => `- **${e.title}**: Details resolved from Repository Knowledge Model.`);
    if (list.length === 0) {
      return 'I could not find sufficient evidence in the analyzed repository to answer this confidently.';
    }

    return `Based on repository analysis in the **${category}** domain, I resolved the following details:

${list.join('\n')}

Please let me know if you would like me to explain any specific file or workflow associated with these matches.`;
  }

  /**
   * Deletes a conversation session
   */
  static async deleteConversation(repositoryId, conversationId) {
    if (getMongoStatus().isConnected) {
      await ChatSession.deleteOne({ repositoryId, conversationId });
      await ChatMessage.deleteMany({ repositoryId, conversationId });
      return { success: true };
    }
    return { success: true };
  }

  /**
   * Retrieves conversation history messages
   */
  static async getConversationHistory(repositoryId, conversationId) {
    if (getMongoStatus().isConnected) {
      const messages = await ChatMessage.find({ repositoryId, conversationId })
        .sort({ createdAt: 1 })
        .lean();
      return messages;
    }
    return [];
  }

  /**
   * Safety check redacting secrets from answers
   */
  static redactSensitiveData(text) {
    if (!text) return '';
    // Regexp for API keys, bearer tokens, passwords
    return text
      .replace(/(?:key|secret|password|passwd|token|auth_key|api_key|token_secret|bearer\s+jwt)\s*[:=]\s*["']?([a-zA-Z0-9_\-\.\<\>]{10,80})["']?/gi, (match, secretVal) => {
        return match.replace(secretVal, '[REDACTED SENSITIVE DATA]');
      });
  }
}
