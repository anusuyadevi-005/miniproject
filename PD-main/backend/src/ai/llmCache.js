import crypto from 'crypto';

class LLMCache {
  constructor(maxEntries = 1000) {
    this.cache = new Map();
    this.maxEntries = maxEntries;
  }

  computeKey(prompt, model = '', options = {}) {
    const raw = `${model}_${JSON.stringify(options)}_${prompt.trim()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  get(key) {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check expiration (24 hour TTL)
    if (Date.now() - entry.timestamp > 24 * 60 * 60 * 1000) {
      this.cache.delete(key);
      return null;
    }

    return entry.response;
  }

  set(key, response) {
    if (this.cache.size >= this.maxEntries) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      response,
      timestamp: Date.now()
    });
  }

  clear() {
    this.cache.clear();
  }

  size() {
    return this.cache.size;
  }
}

export const llmCache = new LLMCache();
