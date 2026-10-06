/**
 * Enterprise LLM Provider Factory
 * 
 * Pluggable multi-provider system for documentation generation.
 * Supports: OpenAI, Gemini, Claude, Deterministic (fallback).
 * Provider selected via LLM_PROVIDER environment variable.
 */

// ─── Base Provider Interface ────────────────────────────────────────────────

class BaseLLMProvider {
  constructor(name) {
    this.name = name;
  }

  async generateChapterContent(prompt) {
    throw new Error(`generateChapterContent() not implemented for provider: ${this.name}`);
  }

  isConfigured() {
    return false;
  }
}

// ─── OpenAI Provider ────────────────────────────────────────────────────────

class OpenAIProvider extends BaseLLMProvider {
  constructor() {
    super('openai');
    this.apiKey = process.env.OPENAI_API_KEY || '';
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
  }

  isConfigured() {
    return !!this.apiKey && !this.apiKey.includes('<') && this.apiKey.length > 10;
  }

  async generateChapterContent(prompt) {
    if (!this.isConfigured()) {
      throw new Error('OpenAI API key is not configured');
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert enterprise software documentation engineer. Generate precise, well-structured Markdown documentation. Never hallucinate. Only reference actual repository entities provided in the context.'
            },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 4096
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`OpenAI API error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (data.choices && data.choices[0]?.message?.content) {
        return data.choices[0].message.content;
      }

      throw new Error('Unexpected OpenAI response format');
    } catch (err) {
      console.warn(`OpenAI provider error: ${err.message}`);
      throw err;
    }
  }
}

// ─── Gemini Provider ────────────────────────────────────────────────────────

class GeminiProvider extends BaseLLMProvider {
  constructor() {
    super('gemini');
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  isConfigured() {
    return !!this.apiKey && !this.apiKey.includes('<') && this.apiKey.length > 10;
  }

  async generateChapterContent(prompt) {
    if (!this.isConfigured()) {
      throw new Error('Gemini API key is not configured');
    }

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `System: You are an expert enterprise software documentation engineer. Generate precise, well-structured Markdown documentation. Never hallucinate. Only reference actual repository entities provided in the context.\n\n${prompt}`
              }]
            }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 4096
            }
          })
        }
      );

      const data = await response.json();

      if (data.error) {
        throw new Error(`Gemini API error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        return data.candidates[0].content.parts[0].text;
      }

      throw new Error('Unexpected Gemini response format');
    } catch (err) {
      console.warn(`Gemini provider error: ${err.message}`);
      throw err;
    }
  }
}

// ─── Claude Provider ────────────────────────────────────────────────────────

class ClaudeProvider extends BaseLLMProvider {
  constructor() {
    super('claude');
    this.apiKey = process.env.CLAUDE_API_KEY || '';
    this.model = process.env.CLAUDE_MODEL || 'claude-3-haiku-20240307';
  }

  isConfigured() {
    return !!this.apiKey && !this.apiKey.includes('<') && this.apiKey.length > 10;
  }

  async generateChapterContent(prompt) {
    if (!this.isConfigured()) {
      throw new Error('Claude API key is not configured');
    }

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: 'You are an expert enterprise software documentation engineer. Generate precise, well-structured Markdown documentation. Never hallucinate. Only reference actual repository entities provided in the context.',
          messages: [
            { role: 'user', content: prompt }
          ]
        })
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(`Claude API error: ${data.error.message || JSON.stringify(data.error)}`);
      }

      if (data.content && data.content[0]?.text) {
        return data.content[0].text;
      }

      throw new Error('Unexpected Claude response format');
    } catch (err) {
      console.warn(`Claude provider error: ${err.message}`);
      throw err;
    }
  }
}

// ─── Deterministic Provider (Zero-Hallucination Fallback) ───────────────────

class DeterministicProvider extends BaseLLMProvider {
  constructor() {
    super('deterministic');
  }

  isConfigured() {
    return true;
  }

  async generateChapterContent(_prompt) {
    // This provider is never called directly for content generation.
    // The documentation engine handles deterministic generation inline
    // when this provider is active. This method returns null to signal
    // the engine to use its built-in deterministic generator.
    return null;
  }
}

// ─── Provider Factory ───────────────────────────────────────────────────────

export class LLMProviderFactory {
  static _providers = {
    openai: OpenAIProvider,
    gemini: GeminiProvider,
    claude: ClaudeProvider,
    deterministic: DeterministicProvider
  };

  /**
   * Set active LLM provider dynamically.
   */
  static setActiveProvider(name) {
    process.env.LLM_PROVIDER = name.toLowerCase().trim();
    return this.getProvider();
  }

  /**
   * Get the configured LLM provider.
   * Falls back to deterministic if the selected provider is not configured.
   */
  static getProvider() {
    const providerName = (process.env.LLM_PROVIDER || 'deterministic').toLowerCase().trim();
    const ProviderClass = this._providers[providerName];

    if (!ProviderClass) {
      console.warn(`Unknown LLM provider "${providerName}", falling back to deterministic.`);
      return new DeterministicProvider();
    }

    const provider = new ProviderClass();

    if (!provider.isConfigured()) {
      console.warn(`LLM provider "${providerName}" is not configured (missing API key), falling back to deterministic.`);
      return new DeterministicProvider();
    }

    return provider;
  }

  /**
   * Register a custom LLM provider class.
   */
  static registerProvider(name, ProviderClass) {
    this._providers[name.toLowerCase()] = ProviderClass;
  }

  /**
   * List all available provider names.
   */
  static listProviders() {
    return Object.keys(this._providers);
  }

  /**
   * Get provider status for all registered providers.
   */
  static getProviderStatus() {
    return Object.entries(this._providers).map(([name, ProviderClass]) => {
      const instance = new ProviderClass();
      return {
        name,
        configured: instance.isConfigured(),
        active: (process.env.LLM_PROVIDER || 'deterministic').toLowerCase() === name
      };
    });
  }
}
