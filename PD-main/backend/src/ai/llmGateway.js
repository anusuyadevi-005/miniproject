import { llmCache } from './llmCache.js';

export class LLMGateway {
  static stats = {
    totalRequests: 0,
    cacheHits: 0,
    fallbackActivations: 0,
    rateLimitsHandled: 0,
    totalTokensEstimated: 0
  };

  /**
   * Dispatches an LLM generation request with caching, backoff, and fallback.
   */
  static async generateWithResilience(prompt, options = {}) {
    this.stats.totalRequests++;
    const model = options.model || process.env.LLM_MODEL || 'default';
    const cacheKey = llmCache.computeKey(prompt, model, options);

    // 1. Check SHA-256 Prompt/Response Cache
    const cached = llmCache.get(cacheKey);
    if (cached) {
      this.stats.cacheHits++;
      return {
        content: cached,
        source: 'cache',
        model
      };
    }

    const providerOrder = this.getProviderHierarchy();

    for (const providerName of providerOrder) {
      try {
        const result = await this.executeWithRetry(providerName, prompt, options);
        if (result) {
          llmCache.set(cacheKey, result);
          return {
            content: result,
            source: providerName,
            model
          };
        }
      } catch (err) {
        console.warn(`Provider [${providerName}] failed: ${err.message}. Trying next provider...`);
        this.stats.fallbackActivations++;
      }
    }

    // Zero-hallucination deterministic fallback
    return {
      content: null,
      source: 'deterministic_fallback',
      model: 'deterministic'
    };
  }

  static getProviderHierarchy() {
    const configured = (process.env.LLM_PROVIDER || 'deterministic').toLowerCase();
    const allProviders = ['groq', 'openai', 'gemini', 'claude', 'ollama', 'deterministic'];

    if (configured === 'deterministic') {
      return ['deterministic'];
    }

    return [configured, ...allProviders.filter(p => p !== configured)];
  }

  static async executeWithRetry(providerName, prompt, options, maxRetries = 2) {
    let attempt = 0;

    while (attempt <= maxRetries) {
      try {
        return await this.callProvider(providerName, prompt, options);
      } catch (err) {
        attempt++;
        const isRateLimit = err.message.includes('429') || err.message.includes('rate limit');
        if (isRateLimit) {
          this.stats.rateLimitsHandled++;
        }

        if (attempt > maxRetries) {
          throw err;
        }

        // Exponential backoff with jitter: 2^attempt * 500ms + random(0-200ms)
        const delay = Math.pow(2, attempt) * 500 + Math.floor(Math.random() * 200);
        await new Promise(res => setTimeout(res, delay));
      }
    }
  }

  static async callProvider(providerName, prompt, options) {
    const systemPrompt = options.systemPrompt || 'You are an expert enterprise documentation engineer. Never hallucinate. Only reference concrete repository evidence provided in context.';

    switch (providerName) {
      case 'groq': {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error('GROQ_API_KEY is not configured');
        const model = process.env.GROQ_MODEL || 'llama-3.1-70b-versatile';

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 4096
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message || 'Groq API Error');
        return data.choices?.[0]?.message?.content || null;
      }

      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
        const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 4096
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message || 'OpenAI API Error');
        return data.choices?.[0]?.message?.content || null;
      }

      case 'gemini': {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');
        const model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: `${systemPrompt}\n\n${prompt}` }]
            }],
            generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
          })
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error.message || 'Gemini API Error');
        return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }

      case 'ollama': {
        const host = process.env.OLLAMA_HOST || 'http://localhost:11434';
        const model = process.env.OLLAMA_MODEL || 'llama3';

        const res = await fetch(`${host}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            system: systemPrompt,
            prompt,
            stream: false
          })
        });

        if (!res.ok) throw new Error(`Ollama connection error: ${res.statusText}`);
        const data = await res.json();
        return data.response || null;
      }

      case 'deterministic':
      default:
        // Returns null to trigger deterministic template generation
        return null;
    }
  }

  static getMetrics() {
    return {
      ...this.stats,
      cacheSize: llmCache.size()
    };
  }
}
