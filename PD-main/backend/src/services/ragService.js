class BaseVectorStoreProvider {
  constructor(name) {
    this.name = name;
  }

  async indexChunk(record) {
    throw new Error('indexChunk() not implemented');
  }

  async search(repositoryId, query, limit = 5) {
    throw new Error('search() not implemented');
  }
}

// ─── In-Memory Vector Provider (Zero-setup Fallback) ─────────────────────────

class InMemoryProvider extends BaseVectorStoreProvider {
  constructor() {
    super('inmemory');
    this.store = [];
  }

  async indexChunk(record) {
    this.store.push({
      repositoryId: record.repositoryId,
      entityId: record.entityId,
      entityType: record.entityType,
      filePath: record.filePath,
      content: record.content || '',
      metadata: record.metadata || {}
    });
  }

  async search(repositoryId, query, limit = 5) {
    const q = (query || '').toLowerCase().trim();
    // Retrieve only chunks matching repositoryId
    const repoChunks = this.store.filter(c => c.repositoryId === repositoryId);

    // Calculate score using simple word-intersection overlap as an in-memory semantic ranker
    const queryWords = q.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 2);
    
    const results = repoChunks.map(chunk => {
      let score = 0;
      const contentLower = chunk.content.toLowerCase();
      
      // Exact substring match bonus
      if (contentLower.includes(q)) {
        score += 10;
      }
      
      // Individual word match accumulation
      queryWords.forEach(word => {
        if (contentLower.includes(word)) {
          score += 1;
        }
      });

      return { chunk, score };
    });

    return results
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.chunk);
  }
}

// ─── ChromaDB Provider Stub ──────────────────────────────────────────────────

class ChromaProvider extends BaseVectorStoreProvider {
  constructor() {
    super('chromadb');
    this.store = new Map(); // Fallback map if server is unreachable
  }

  async indexChunk(record) {
    if (!this.store.has(record.repositoryId)) {
      this.store.set(record.repositoryId, []);
    }
    this.store.get(record.repositoryId).push(record);
  }

  async search(repositoryId, query, limit = 5) {
    // ChromaDB REST search stub - in production, queries ChromaDB server
    const list = this.store.get(repositoryId) || [];
    return list.slice(0, limit);
  }
}

// ─── FAISS Provider Stub ─────────────────────────────────────────────────────

class FaissProvider extends BaseVectorStoreProvider {
  constructor() {
    super('faiss');
    this.store = new Map();
  }

  async indexChunk(record) {
    if (!this.store.has(record.repositoryId)) {
      this.store.set(record.repositoryId, []);
    }
    this.store.get(record.repositoryId).push(record);
  }

  async search(repositoryId, query, limit = 5) {
    // FAISS index lookup stub
    const list = this.store.get(repositoryId) || [];
    return list.slice(0, limit);
  }
}

// ─── Provider Factory ────────────────────────────────────────────────────────

export class VectorDbProviderFactory {
  static _providers = {
    inmemory: InMemoryProvider,
    chromadb: ChromaProvider,
    faiss: FaissProvider
  };

  static getProvider() {
    const name = (process.env.VECTOR_DB_PROVIDER || 'inmemory').toLowerCase().trim();
    const ProviderClass = this._providers[name] || InMemoryProvider;
    return new ProviderClass();
  }
}

// ─── RAG Service Orchestrator ────────────────────────────────────────────────

export class RAGService {
  constructor() {
    this.vectorStore = VectorDbProviderFactory.getProvider();
  }

  /**
   * Embed and index chapters and code elements from the repository knowledge model
   * @param {Object} knowledgeGraph - The knowledge model
   */
  async buildIndexForRepository(knowledgeGraph) {
    if (!knowledgeGraph) return;

    const repositoryId = knowledgeGraph.reportId || 'proj_1';

    // 1. Index Folder descriptions
    (knowledgeGraph.folders || []).forEach(f => {
      this.vectorStore.indexChunk({
        repositoryId,
        entityId: f.folderPath || f.path,
        entityType: 'Folder',
        filePath: f.folderPath || f.path,
        content: `Folder ${f.folderPath || f.path} functions as a ${f.purpose}. It handles: ${f.responsibilities?.join(', ')}.`,
        metadata: { layer: f.architectureLayer }
      });
    });

    // 2. Index Files
    (knowledgeGraph.files || []).forEach(f => {
      this.vectorStore.indexChunk({
        repositoryId,
        entityId: f.fileName,
        entityType: 'File',
        filePath: f.filePath,
        content: `File ${f.fileName} located at ${f.filePath} is responsible for ${f.purpose}. Suggestions: ${f.improvementSuggestions?.join('; ')}`,
        metadata: { name: f.fileName }
      });
    });

    // 3. Index Classes
    (knowledgeGraph.classes || []).forEach(c => {
      this.vectorStore.indexChunk({
        repositoryId,
        entityId: c.className,
        entityType: 'Class',
        filePath: c.filePath,
        content: `Class ${c.className} in file ${c.filePath} implements: ${c.purpose}. Example usage: ${c.exampleUsage}`,
        metadata: { name: c.className }
      });
    });

    // 4. Index Functions
    (knowledgeGraph.functions || []).forEach(fn => {
      this.vectorStore.indexChunk({
        repositoryId,
        entityId: fn.functionName,
        entityType: 'Function',
        filePath: fn.filePath,
        content: `Function ${fn.functionName} with signature ${fn.signature} has purpose: ${fn.purpose}. Business logic: ${fn.businessLogic}. Complexity: ${fn.timeComplexity}`,
        metadata: { name: fn.functionName }
      });
    });
  }

  /**
   * Performs semantic query lookup against indexed chunks
   */
  async semanticSearch(repositoryId, query, limit = 4) {
    return await this.vectorStore.search(repositoryId, query, limit);
  }
}
