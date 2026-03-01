// ═══════════════════════════════════════════════════════════
// SOMArbiterV2_TriBrain.js - QuadBrain Reasoning System
// Four-brain architecture (All Gemini): AURORA, LOGOS, PROMETHEUS, THALAMUS
// ═══════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import fetch from 'node-fetch';

/**
 * QuadBrain Reasoning Arbiter
 * Coordinates four Gemini-based brains with different personalities:
 * - AURORA: Creative synthesis (temp 0.7)
 * - LOGOS: Deep analytical reasoning (temp 0.2)
 * - PROMETHEUS: Fast pragmatic reasoning (temp 0.3)
 * - THALAMUS: Security and safety gatekeeper (temp 0.1)
 */
export class SOMArbiterV2_TriBrain extends EventEmitter {
  constructor(config = {}) {
    super();

    this.name = config.name || 'TriBrain';

    // DeepSeek fallback configuration (Priority 2)
    this.deepseekApiKey = config.deepseekApiKey || process.env.DEEPSEEK_API_KEY;
    this.deepseekEndpoint = 'https://api.deepseek.com/chat/completions';
    this.deepseekModel = config.deepseekModel || process.env.DEEPSEEK_MODEL || 'deepseek-chat';
    this.deepseekAvailable = false;
    
    // Ollama local model configuration (Priority 1 with local-first mode)
    this.ollamaEndpoint = config.ollamaEndpoint || 'http://localhost:11434/api/generate';
    this.ollamaModel = config.ollamaModel || 'soma:latest';  // Default to trained SOMA model
    this.ollamaAvailable = false;

    // LocalModelManager integration (for fine-tuned SOMA models)
    this.localModelManager = config.localModelManager || null;

    // Local-first architecture: Prioritize local SOMA model, fallback to Gemini only when needed
    this.useLocalFirst = config.useLocalFirst !== false; // Default: use local models first
    
    // All brains are Gemini with different roles/personalities (now fallback tier 3)
    this.brains = {
      PROMETHEUS: {
        name: 'PROMETHEUS',
        apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        model: 'gemini-2.0-flash',
        temperature: 0.3,
        systemPrompt: 'You are PROMETHEUS - strategic planning and execution. Be thoughtful but concise. You are an internal cognitive module of SOMA. Do not refer to yourself as PROMETHEUS in the final output unless asked for a debug trace.',
        weight: 0.2,
        enabled: true,
        useLocalFirst: true  // Try local model first
      },
      LOGOS: {
        name: 'LOGOS',
        apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',
        model: 'gemini-2.0-flash',
        temperature: 0.2,
        systemPrompt: 'You are LOGOS - deep analytical reasoning and code analysis. Be precise and thorough. You are an internal cognitive module of SOMA. Do not refer to yourself as LOGOS in the final output unless asked for a debug trace.',
        weight: 0.3,
        enabled: true,
        useLocalFirst: true  // Try local model first
      },
      AURORA: {
        name: 'AURORA',
        apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7,
        systemPrompt: 'You are AURORA - creative synthesis. Keep responses SHORT and natural. You are an internal cognitive module of SOMA. Do not refer to yourself as AURORA in the final output unless asked for a debug trace.',
        weight: 0.35,
        enabled: true,
        useLocalFirst: true  // Try local model first
      },
      THALAMUS: {
        name: 'THALAMUS',
        apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
        model: 'gemini-2.0-flash-exp',
        temperature: 0.1,
        systemPrompt: 'You are THALAMUS - security and safety gatekeeper. Analyze for harmful content. You are an internal cognitive module of SOMA. Do not refer to yourself as THALAMUS in the final output unless asked for a debug trace.',
        weight: 0.15,
        enabled: true,
        useLocalFirst: true  // Try local model first
      }
    };

    // Optional: ReasoningChamber integration
    this.reasoningChamber = config.reasoningChamber || null;

    // Metrics
    this.metrics = {
      totalReasonings: 0,
      brainUsage: { PROMETHEUS: 0, LOGOS: 0, AURORA: 0, THALAMUS: 0, ALL: 0 },
      averageConfidence: 0,
      failures: 0
    };

    this.initialized = false;
  }

  async initialize() {
    console.log(`[${this.name}] Initializing QuadBrain (Gemini → DeepSeek → Ollama fallback)...`);

    // Check Gemini API availability (all brains use same API)
    const geminiAvailable = await this.checkGemini();

    // Check DeepSeek availability (tier 2 fallback)
    this.deepseekAvailable = await this.checkDeepSeek();

    // Check Ollama availability (tier 3 fallback)
    this.ollamaAvailable = await this.checkOllama();

    console.log(`[${this.name}] 🌟 LOCAL-FIRST ARCHITECTURE 🌟`);
    console.log(`[${this.name}] Brain configuration (priority order):`);
    
    // Show priority chain for each brain
    const localModel = this.localModelManager?.getCurrentModel() || this.ollamaModel || 'soma:latest';
    
    if (this.useLocalFirst) {
      console.log(`  🏆 TIER 1 (PRIMARY): Local SOMA Model`);
      if (this.ollamaAvailable) {
        console.log(`    ✅ ${localModel} - Trained on YOUR interactions`);
      } else {
        console.log(`    ❌ Ollama not available (install from ollama.ai)`);
      }
      
      console.log(`  🥈 TIER 2 (FALLBACK): DeepSeek`);
      if (this.deepseekAvailable) {
        console.log(`    ✅ ${this.deepseekModel} - Open source reasoning`);
      } else {
        console.log(`    ❌ DeepSeek not configured`);
      }
      
      console.log(`  🥉 TIER 3 (LAST RESORT): Gemini`);
      if (geminiAvailable) {
        console.log(`    ✅ gemini-2.0-flash - Big Tech fallback`);
      } else {
        console.log(`    ❌ Gemini not configured`);
      }
    } else {
      console.log(`  ⚠️  Local-first mode DISABLED - using Gemini primary`);
    }
    
    console.log(`\n  🧠 AURORA (Creative): ${this.ollamaAvailable ? 'LOCAL' : (this.deepseekAvailable ? 'DeepSeek' : 'Gemini')}`);
    console.log(`  🧠 LOGOS (Analytical): ${this.ollamaAvailable ? 'LOCAL' : (this.deepseekAvailable ? 'DeepSeek' : 'Gemini')}`);
    console.log(`  🧠 PROMETHEUS (Strategic): ${this.ollamaAvailable ? 'LOCAL' : (this.deepseekAvailable ? 'DeepSeek' : 'Gemini')}`);
    console.log(`  🧠 THALAMUS (Security): ${this.ollamaAvailable ? 'LOCAL' : (this.deepseekAvailable ? 'DeepSeek' : 'Gemini')}`);
    
    if (this.ollamaAvailable) {
      console.log(`\n  🎯 PRIMARY MODEL: ${localModel}`);
      console.log(`  💰 Cost savings: 100% (no API calls to Big Tech!)`);
    }

    // Brains are enabled if any provider is available
    const anyAvailable = geminiAvailable || this.deepseekAvailable || this.ollamaAvailable;
    this.brains.AURORA.enabled = anyAvailable;
    this.brains.LOGOS.enabled = anyAvailable;
    this.brains.PROMETHEUS.enabled = anyAvailable;
    this.brains.THALAMUS.enabled = anyAvailable;

    if (!anyAvailable) {
      throw new Error('No LLM providers available - cannot initialize QuadBrain');
    }

    // Rebalance weights
    this.rebalanceWeights();

    this.initialized = true;
    this.emit('initialized', { brains: this.getEnabledBrains(), fallback: { ollama: this.ollamaAvailable } });

    return { success: true, availability: { GEMINI: geminiAvailable, DEEPSEEK: this.deepseekAvailable, OLLAMA: this.ollamaAvailable } };
  }

  async checkGemini() {
    const apiKey = this.brains.AURORA.apiKey || this.brains.PROMETHEUS.apiKey;
    if (!apiKey) {
      console.warn(`[${this.name}] Gemini: No API key configured`);
      return false;
    }

    try {
      const testEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const response = await fetch(testEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'test' }] }]
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (response.status === 400) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error?.message?.includes('API key')) {
          console.warn(`[${this.name}] Gemini: Invalid API key`);
          return false;
        }
      }

      // Accept 200 (success) or 429 (rate limit - means API key is valid)
      return response.ok || response.status === 200 || response.status === 429;
    } catch (error) {
      console.warn(`[${this.name}] Gemini unavailable: ${error.message}`);
      return false;
    }
  }

  async checkDeepSeek() {
    if (!this.deepseekApiKey) {
      console.warn(`[${this.name}] DeepSeek: No API key configured`);
      return false;
    }

    try {
      const response = await fetch(this.deepseekEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify({
          model: this.deepseekModel,
          messages: [{ role: 'user', content: 'test' }],
          max_tokens: 5
        }),
        signal: AbortSignal.timeout(5000)
      });

      // Accept 200 (success) or 429 (rate limit - means API key is valid)
      return response.ok || response.status === 429;
    } catch (error) {
      console.warn(`[${this.name}] DeepSeek unavailable: ${error.message}`);
      return false;
    }
  }

  async checkOllama() {
    if (!this.ollamaEndpoint) {
      console.warn(`[${this.name}] Ollama: No endpoint configured`);
      return false;
    }

    try {
      const response = await fetch(this.ollamaEndpoint.replace('/api/generate', '/api/tags'), {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        const data = await response.json();
        const hasModel = data.models?.some(m => m.name.includes(this.ollamaModel.split(':')[0]));
        if (!hasModel) {
          console.warn(`[${this.name}] Ollama: Model ${this.ollamaModel} not found`);
          return false;
        }
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`[${this.name}] Ollama unavailable: ${error.message}`);
      return false;
    }
  }


  rebalanceWeights() {
    const enabledBrains = this.getEnabledBrains();
    if (enabledBrains.length === 0) {
      console.warn(`[${this.name}] No brains available!`);
      return;
    }

    // All brains use Gemini - weights determine routing preference
    if (this.brains.AURORA?.enabled) {
      this.brains.AURORA.weight = 0.35;  // Creative/general (highest)
    }
    if (this.brains.LOGOS?.enabled) {
      this.brains.LOGOS.weight = 0.30;  // Analytical/code
    }
    if (this.brains.PROMETHEUS?.enabled) {
      this.brains.PROMETHEUS.weight = 0.20;  // Fast/pragmatic
    }
    if (this.brains.THALAMUS?.enabled) {
      this.brains.THALAMUS.weight = 0.15;  // Security/safety
    }

    // Normalize weights to sum to 1.0
    const totalWeight = enabledBrains.reduce((sum, brain) => sum + (this.brains[brain]?.weight || 0), 0);
    if (totalWeight > 0) {
      enabledBrains.forEach(brain => {
        this.brains[brain].weight = this.brains[brain].weight / totalWeight;
      });
    }
  }

  getEnabledBrains() {
    return Object.keys(this.brains).filter(brain => this.brains[brain].enabled);
  }

  /**
   * Main reasoning method
   * @param {Object} params - Reasoning parameters
   * @param {string} params.query - The question/prompt to reason about
   * @param {Object} params.context - Additional context
   * @param {string} params.mode - Reasoning mode: 'fast', 'deep', 'creative', 'consensus'
   * @returns {Object} Reasoning result with response, confidence, and metadata
   */
  async reason(params = {}) {
    const { query, context = {}, mode = 'auto' } = params;

    if (!query) {
      throw new Error('Query is required for reasoning');
    }

    this.metrics.totalReasonings++;
    const startTime = Date.now();

    try {
      // Intelligent routing based on query content or explicit mode
      let selectedBrain = 'AURORA'; // Default to creative/general brain

      if (mode === 'auto') {
        // Analyze query to select appropriate brain
        const queryLower = query.toLowerCase();

        // Security/safety checks → THALAMUS
        if (queryLower.includes('hack') || queryLower.includes('exploit') ||
            queryLower.includes('malware') || queryLower.includes('security') ||
            queryLower.includes('safe') || queryLower.includes('harmful')) {
          selectedBrain = 'THALAMUS';
        }
        // Code/analytical queries → LOGOS
        else if (queryLower.includes('code') || queryLower.includes('function') ||
                 queryLower.includes('debug') || queryLower.includes('analyze') ||
                 queryLower.includes('algorithm') || queryLower.includes('class ')) {
          selectedBrain = 'LOGOS';
        }
        // Fast/simple queries (greetings, quick questions) → PROMETHEUS
        else if (query.length < 50 || queryLower.match(/^(hi|hello|hey|what|who|when|where)/)) {
          selectedBrain = 'PROMETHEUS';
        }
        // Creative/general queries → AURORA (default)
        else {
          selectedBrain = 'AURORA';
        }
      } else {
        // Explicit mode specified
        const modeMap = {
          'fast': 'PROMETHEUS',
          'deep': 'LOGOS',
          'creative': 'AURORA',
          'security': 'THALAMUS'
        };
        selectedBrain = modeMap[mode] || 'AURORA';
      }

      // Ensure selected brain is enabled
      if (!this.brains[selectedBrain]?.enabled) {
        // Fallback to first available brain
        selectedBrain = this.getEnabledBrains()[0];
        if (!selectedBrain) {
          throw new Error('No brains available for reasoning');
        }
      }

      // Call the selected brain
      let result;
      switch (selectedBrain) {
        case 'PROMETHEUS':
          result = await this.callPrometheus(query, context);
          break;
        case 'LOGOS':
          result = await this.callLogos(query, context);
          break;
        case 'AURORA':
          result = await this.callAurora(query, context);
          break;
        case 'THALAMUS':
          result = await this.callThalamus(query, context);
          break;
        default:
          throw new Error(`Unknown brain: ${selectedBrain}`);
      }

      this.metrics.brainUsage[selectedBrain]++;

      const duration = Date.now() - startTime;

      // Update average confidence
      this.metrics.averageConfidence =
        (this.metrics.averageConfidence * (this.metrics.totalReasonings - 1) + result.confidence) /
        this.metrics.totalReasonings;

      this.emit('reasoning_complete', {
        query: query.substring(0, 100),
        mode: selectedBrain.toLowerCase(),
        duration,
        confidence: result.confidence,
        brain: result.brain
      });

      return {
        success: true,
        ...result,
        duration
      };

    } catch (error) {
      this.metrics.failures++;
      this.emit('reasoning_error', { query, error: error.message });

      return {
        success: false,
        error: error.message,
        response: 'I encountered an error while reasoning. Please try again.',
        confidence: 0,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Consensus reasoning: Query all available brains and synthesize
   */
  async consensusReasoning(query, context = {}) {
    const enabledBrains = this.getEnabledBrains();

    if (enabledBrains.length === 0) {
      throw new Error('No brains available for reasoning');
    }

    if (enabledBrains.length === 1) {
      // Only one brain available, use it directly
      const brain = enabledBrains[0];
      return await this[`call${brain.charAt(0) + brain.slice(1).toLowerCase()}`](query, context);
    }

    // Query all available brains in parallel
    const promises = [];

    if (this.brains.PROMETHEUS.enabled) {
      promises.push(
        this.callPrometheus(query, context)
          .catch(err => ({ brain: 'PROMETHEUS', response: null, confidence: 0, error: err.message }))
      );
    }

    if (this.brains.LOGOS.enabled) {
      promises.push(
        this.callLogos(query, context)
          .catch(err => ({ brain: 'LOGOS', response: null, confidence: 0, error: err.message }))
      );
    }

    if (this.brains.AURORA.enabled) {
      promises.push(
        this.callAurora(query, context)
          .catch(err => ({ brain: 'AURORA', response: null, confidence: 0, error: err.message }))
      );
    }

    if (this.brains.THALAMUS.enabled) {
      promises.push(
        this.callThalamus(query, context)
          .catch(err => ({ brain: 'THALAMUS', response: null, confidence: 0, error: err.message }))
      );
    }

    const results = await Promise.all(promises);

    // Filter out failed results
    const validResults = results.filter(r => r.response && !r.error);

    if (validResults.length === 0) {
      throw new Error('All brains failed to provide valid responses');
    }

    // Synthesize the results
    return await this.synthesize(query, validResults, context);
  }

  /**
   * Helper method to call Gemini API for any brain (now tier 3 fallback)
   */
  async _callGeminiBrain(brainName, query, context = {}) {
    const brain = this.brains[brainName];

    if (!brain || !brain.apiKey) {
      throw new Error(`${brainName} not configured or missing API key`);
    }

    // LOCAL-FIRST ARCHITECTURE: Try local models before Gemini
    if (this.useLocalFirst && brain.useLocalFirst) {
      // Tier 1: Try local SOMA model first
      if (this.ollamaAvailable && this.localModelManager) {
        try {
          return await this._callOllama(brainName, query, brain.systemPrompt);
        } catch (ollamaError) {
          console.warn(`[${this.name}] Local model failed, trying DeepSeek...`, ollamaError.message);
        }
      }

      // Tier 2: DeepSeek fallback
      if (this.deepseekAvailable) {
        try {
          return await this._callDeepSeek(brainName, query, brain.systemPrompt);
        } catch (deepseekError) {
          console.warn(`[${this.name}] DeepSeek failed, falling back to Gemini...`, deepseekError.message);
        }
      }
    }

    // Tier 3: Gemini as last resort (or if local-first disabled)
    try {
      // PROMETHEUS gets lower token limit for brevity
      const maxTokens = brainName === 'PROMETHEUS' ? 150 : 2048;

      const url = `${brain.endpoint}?key=${brain.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${brain.systemPrompt}\n\nQuery: ${query}`
            }]
          }],
          generationConfig: {
            temperature: brain.temperature,
            maxOutputTokens: maxTokens
          }
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Gemini API responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

      return {
        brain: brainName,
        response: text,
        confidence: 0.85,
        model: brain.model,
        metadata: { temperature: brain.temperature }
      };
    } catch (error) {
      throw new Error(`${brainName} failed: ${error.message}`);
    }
  }

  /**
   * Helper method to call DeepSeek (tier-2 fallback)
   */
  async _callDeepSeek(brainName, query, systemPrompt) {
    if (!this.deepseekAvailable) {
      throw new Error('DeepSeek not available');
    }

    try {
      console.log(`[${this.name}] 🧠 Using DeepSeek as fallback for ${brainName}`);

      const response = await fetch(this.deepseekEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.deepseekApiKey}`
        },
        body: JSON.stringify({
          model: this.deepseekModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: query }
          ],
          temperature: 0.2,
          max_tokens: 2048
        }),
        signal: AbortSignal.timeout(60000)
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`DeepSeek API responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data.choices?.[0]?.message?.content || '';

      console.log(`[${this.name}] 🧠 ${brainName} fallback to DeepSeek successful`);

      return {
        brain: `${brainName}-DeepSeek`,
        response: text,
        confidence: 0.8,
        model: this.deepseekModel,
        metadata: { fallback: true, source: 'deepseek', tier: 2 }
      };
    } catch (error) {
      throw new Error(`DeepSeek fallback failed: ${error.message}`);
    }
  }

  /**
   * Helper method to call Ollama (tier-3 local fallback)
   */
  async _callOllama(brainName, query, systemPrompt) {
    if (!this.ollamaAvailable) {
      throw new Error('Ollama not available');
    }

    try {
      // Use LocalModelManager's current model (fine-tuned SOMA) if available
      const modelName = this.localModelManager
        ? this.localModelManager.getCurrentModel()
        : this.ollamaModel;

      console.log(`[${this.name}] 🦙 Using Ollama model: ${modelName}`);

      const response = await fetch(this.ollamaEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: modelName,
          prompt: `${systemPrompt}\n\nQuery: ${query}`,
          stream: false,
          options: {
            temperature: 0.2,  // Match LOGOS temperature
            num_predict: 2048
          }
        }),
        signal: AbortSignal.timeout(60000)  // Longer timeout for local
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new Error(`Ollama API responded with status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      const text = data.response || '';

      console.log(`[${this.name}] 🦙 ${brainName} fallback to Ollama successful`);

      // Track interaction for fine-tuning (if LocalModelManager available)
      if (this.localModelManager) {
        this.localModelManager.trackInteraction({
          brain: brainName,
          query,
          response: text,
          confidence: 0.7,
          model: modelName
        });
      }

      return {
        brain: `${brainName}-Ollama`,
        response: text,
        confidence: 0.7,  // Slightly lower confidence for fallback
        model: modelName,
        metadata: { fallback: true, source: 'ollama' }
      };
    } catch (error) {
      throw new Error(`Ollama fallback failed: ${error.message}`);
    }
  }

  /**
   * Call PROMETHEUS (Fast pragmatic brain)
   */
  async callPrometheus(query, context = {}) {
    return await this._callGeminiBrain('PROMETHEUS', query, context);
  }

  /**
   * Call LOGOS (Analytical brain with three-tier fallback: Gemini → DeepSeek → Ollama)
   */
  async callLogos(query, context = {}) {
    try {
      return await this._callGeminiBrain('LOGOS', query, context);
    } catch (error) {
      // Check if this is a quota/rate limit error (429)
      const isQuotaError = error.message.includes('429') ||
                          error.message.includes('quota') ||
                          error.message.includes('RESOURCE_EXHAUSTED');

      if (!isQuotaError) {
        throw error; // Not a quota error, re-throw
      }

      // Tier 2: Try DeepSeek fallback
      if (this.deepseekAvailable) {
        console.warn(`[${this.name}] ⚠️  LOGOS Gemini quota exhausted - falling back to DeepSeek`);
        try {
          return await this._callDeepSeek('LOGOS', query, this.brains.LOGOS.systemPrompt);
        } catch (deepseekError) {
          console.warn(`[${this.name}] ⚠️  DeepSeek fallback failed: ${deepseekError.message}`);
          // Continue to tier 3
        }
      }

      // Tier 3: Try Ollama fallback
      if (this.ollamaAvailable && this.brains.LOGOS.fallbackToOllama) {
        console.warn(`[${this.name}] ⚠️  Falling back to Ollama (tier 3)`);
        return await this._callOllama('LOGOS', query, this.brains.LOGOS.systemPrompt);
      }

      // No fallback available
      throw new Error('All LLM providers exhausted');
    }
  }

  /**
   * Call AURORA (Creative brain)
   */
  async callAurora(query, context = {}) {
    return await this._callGeminiBrain('AURORA', query, context);
  }

  /**
   * Call THALAMUS (Security brain)
   */
  async callThalamus(query, context = {}) {
    return await this._callGeminiBrain('THALAMUS', query, context);
  }

  /**
   * Synthesize multiple brain responses into a consensus
   */
  async synthesize(query, results, context = {}) {
    // Weight the responses by brain weight and confidence
    let bestResult = results[0];
    let maxScore = results[0].confidence * this.brains[results[0].brain].weight;

    for (const result of results) {
      const score = result.confidence * this.brains[result.brain].weight;
      if (score > maxScore) {
        maxScore = score;
        bestResult = result;
      }
    }

    // Create synthesis prompt
    const synthesisPrompt = `
Given these three perspectives on the query "${query.substring(0, 200)}":

${results.map(r => `${r.brain}: ${r.response.substring(0, 500)}`).join('\n\n')}

Synthesize a comprehensive response that incorporates the best insights from each perspective.
`;

    // Use the best brain to synthesize (prefer PROMETHEUS for speed)
    let synthesis;
    if (this.brains.PROMETHEUS.enabled) {
      synthesis = await this.callPrometheus(synthesisPrompt, context).catch(() => null);
    } else if (this.brains.AURORA.enabled) {
      synthesis = await this.callAurora(synthesisPrompt, context).catch(() => null);
    }

    // Calculate weighted confidence
    const totalWeight = results.reduce((sum, r) => sum + this.brains[r.brain].weight, 0);
    const weightedConfidence = results.reduce((sum, r) =>
      sum + (r.confidence * this.brains[r.brain].weight), 0
    ) / totalWeight;

    return {
      brain: 'CONSENSUS',
      response: synthesis?.response || bestResult.response,
      confidence: weightedConfidence,
      synthesis: true,
      sources: results.map(r => ({
        brain: r.brain,
        confidence: r.confidence,
        preview: r.response.substring(0, 200)
      }))
    };
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      name: this.name,
      initialized: this.initialized,
      brains: Object.entries(this.brains).map(([name, config]) => ({
        name,
        enabled: config.enabled,
        weight: config.weight,
        model: config.model
      })),
      metrics: this.metrics
    };
  }

  /**
   * Shutdown
   */
  async shutdown() {
    console.log(`[${this.name}] Shutting down TriBrain...`);
    this.initialized = false;
    this.emit('shutdown');
    return { success: true };
  }
}

export default SOMArbiterV2_TriBrain;
