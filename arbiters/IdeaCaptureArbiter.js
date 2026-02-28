/**
 * IdeaCaptureArbiter.js
 *
 * Thin intake layer for Mode A (total capture).
 * Captures ALL inputs (text, voice metadata, file refs) and builds memory nodes.
 *
 * Responsibilities:
 *  - Accept raw inputs from any source
 *  - Build canonical MemoryNode package
 *  - Send to processing pipelines via broker
 *  - Persist to MnemonicArbiter/Storage
 *  - Create triggers for resurfacing (memory resonance)
 *  - Expose hooks for muse-generation
 *
 * Integration with SOMA:
 *  - Uses MnemonicArbiter for storage
 *  - Uses MessageBroker for event distribution
 *  - Triggers MuseEngine via 'muse.trigger' topic
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

class IdeaCaptureArbiter extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.name = 'IdeaCaptureArbiter';

    // Dependencies
    this.broker = opts.broker || opts.messageBroker;
    this.mnemonic = opts.mnemonic; // MnemonicArbiter for storage
    this.learningPipeline = opts.learningPipeline; // UniversalLearningPipeline for learning
    this.embeddingFn = opts.embeddingFn; // async(text) => vector
    this.summarizerFn = opts.summarizerFn || this._defaultSummarize;
    this.emotionFn = opts.emotionFn || this._simpleEmotionTag;

    // Configuration
    this.impulserTopic = opts.impulserTopic || 'impulser.process';
    this.museTriggerTopic = opts.museTriggerTopic || 'muse.trigger';

    // In-memory index for quick resonance lookups
    this.embeddingIndex = new Map(); // id -> embedding

    // Resonance configuration
    this.resonanceConfig = {
      topK: 6,
      similarityThreshold: 0.65
    };

    // Statistics
    this.stats = {
      totalCaptured: 0,
      bySource: { ui: 0, voice: 0, file: 0, system: 0 },
      resonanceTriggers: 0,
      museTriggers: 0
    };

    // Wire broker subscriptions
    if (this.broker && typeof this.broker.subscribe === 'function') {
      this.broker.subscribe('idea.capture', msg => {
        this.handleRawInput(msg.payload || msg).catch(err => this.emit('error', err));
      });
    }

    console.log(`[${this.name}] Initialized - listening on 'idea.capture' topic`);
  }

  /**
   * Main entry point - accept raw input and process
   *
   * @param {Object} payload
   *   - text: string (required)
   *   - source: 'voice'|'ui'|'file'|'system' (default: 'ui')
   *   - sourceRef: optional reference (file ID, audio ID, etc)
   *   - voiceMeta: { pitch, rate, prosody, questionProb } for voice inputs
   *   - author: string (default: 'user')
   *   - metadata: additional metadata object
   */
  async handleRawInput(payload = {}) {
    const startTime = Date.now();
    const id = crypto.randomUUID();
    const ts = new Date().toISOString();

    try {
      // Extract payload fields
      const text = payload.text || '';
      const source = payload.source || 'ui';
      const sourceRef = payload.sourceRef || null;
      const author = payload.author || 'user';
      const voiceMeta = payload.voiceMeta || null;

      if (!text) {
        console.warn(`[${this.name}] Empty text input ignored`);
        return { ok: false, reason: 'empty_text' };
      }

      this.stats.totalCaptured++;
      this.stats.bySource[source] = (this.stats.bySource[source] || 0) + 1;

      // 1. Generate immediate lightweight tags
      const emotion = this.emotionFn(text);
      const summary = await this.summarizerFn(text);
      const embedding = this.embeddingFn ? await this.embeddingFn(text) : null;

      // 2. Build canonical memory node
      const node = {
        id,
        createdAt: ts,
        updatedAt: ts,
        author,
        source,
        sourceRef,
        originalText: text,
        summary,
        emotion,
        embedding,
        voiceMeta,
        meta: {
          capturedBy: this.name,
          mode: 'ModeA_totalCapture',
          ...payload.metadata
        },
        relatedIds: [],
        relevance: 1.0
      };

      // 3. Persist to MnemonicArbiter
      if (this.mnemonic && typeof this.mnemonic.remember === 'function') {
        try {
          await this.mnemonic.remember(node.originalText, {
            type: 'idea_capture',
            id: id,
            createdAt: node.createdAt,
            author: node.author,
            source: node.source,
            summary: node.summary,
            emotion: node.emotion,
            ...node.meta
          });
          this.emit('stored', { id, node });
        } catch (err) {
          console.error(`[${this.name}] Failed to store node:`, err);
          this.emit('warn', { message: 'Storage failed', id, err });
        }
      }

      // 4. Notify processing pipelines via broker
      if (this.broker && typeof this.broker.publish === 'function') {
        try {
          this.broker.publish(this.impulserTopic, {
            type: 'idea_capture',
            nodeId: id,
            payload: node
          });
        } catch (err) {
          console.error(`[${this.name}] Failed to publish to impulser:`, err);
        }
      }

      // 5. Index embedding for resonance
      if (embedding) {
        this.embeddingIndex.set(id, embedding);
      }

      // 6. Run lightweight resonance scan (non-blocking)
      this._runResonance(node).catch(err => this.emit('error', err));

      // 7. Emit captured event
      this.emit('captured', { id, node });

      const elapsed = Date.now() - startTime;
      console.log(`[${this.name}] Captured idea ${id} (${elapsed}ms) - source: ${source}`);

      // Log this interaction for learning
      if (this.learningPipeline && this.learningPipeline.initialized) {
        await this.learningPipeline.logInteraction({
          type: 'idea_capture',
          agent: this.name,
          input: { text, source, voiceMeta },
          output: node,
          context: {
            emotion,
            summary,
            hasEmbedding: !!embedding
          },
          metadata: {
            success: true,
            elapsedMs: elapsed,
            author,
            sourceType: source
          }
        });
      }

      return { ok: true, id, node, elapsedMs: elapsed };

    } catch (err) {
      console.error(`[${this.name}] Error in handleRawInput:`, err);
      this.emit('error', err);
      return { ok: false, error: err.message };
    }
  }

  /**
   * Handle file upload
   */
  async handleFileUpload(payload = {}) {
    const text = payload.notes || `Uploaded file: ${payload.filename} (${payload.mime})`;
    return this.handleRawInput({
      text,
      source: 'file',
      sourceRef: payload.fileRef,
      author: payload.author || 'user',
      metadata: {
        filename: payload.filename,
        mime: payload.mime,
        size: payload.size
      }
    });
  }

  /**
   * Handle voice input with prosody metadata
   */
  async handleVoiceInput(payload = {}) {
    const vm = payload.voiceMeta || {};
    const text = payload.text || payload.transcript || '';

    // Classify voice intention
    const voiceTag = {
      prosody: vm,
      detectedIntention: vm.questionProb > 0.6 ? 'question-like' : 'statement-like',
      excitement: vm.excitement || 0.5,
      curiosity: vm.curiosity || 0.5
    };

    const result = await this.handleRawInput({
      text,
      source: 'voice',
      sourceRef: payload.audioRef || null,
      author: payload.author || 'user',
      voiceMeta: voiceTag
    });

    // Emit voice-specific event
    if (result.ok) {
      this.emit('voice:captured', { nodeId: result.id, voiceTag });
    }

    return result;
  }

  /**
   * Internal: Run resonance scan to find related memories
   */
  async _runResonance(node) {
    if (!node.embedding || !this.embeddingIndex.size) return;

    const results = [];

    // Calculate similarity with all indexed embeddings
    for (const [id, emb] of this.embeddingIndex.entries()) {
      if (id === node.id) continue;

      const score = this._cosineSimilarity(node.embedding, emb);
      results.push({ id, score });
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    // Filter by threshold and take top K
    const matches = results
      .filter(r => r.score >= this.resonanceConfig.similarityThreshold)
      .slice(0, this.resonanceConfig.topK);

    if (matches.length > 0) {
      // Update relatedIds
      node.relatedIds = matches.map(m => m.id);
      node.updatedAt = new Date().toISOString();

      // Update in mnemonic if possible
      if (this.mnemonic && typeof this.mnemonic.remember === 'function') {
        try {
          await this.mnemonic.remember(node.originalText, {
            type: 'idea_capture',
            id: node.id,
            createdAt: node.createdAt,
            updatedAt: node.updatedAt,
            author: node.author,
            source: node.source,
            summary: node.summary,
            emotion: node.emotion,
            relatedIds: node.relatedIds,
            ...node.meta
          });
        } catch (err) {
          this.emit('warn', { message: 'Failed updating relatedIds', nodeId: node.id, err });
        }
      }

      // Emit resonance event
      this.emit('resonance', { node, matches });
      this.stats.resonanceTriggers++;

      // Trigger muse engine
      if (this.broker && typeof this.broker.publish === 'function') {
        try {
          this.broker.publish(this.museTriggerTopic, {
            nodeId: node.id,
            matches,
            node
          });
          this.stats.museTriggers++;
        } catch (err) {
          console.error(`[${this.name}] Failed to trigger muse:`, err);
        }
      }
    }
  }

  /**
   * Quick semantic search over local index
   */
  async quickSearchByText(text, topK = 8) {
    if (!this.embeddingFn) {
      throw new Error('Embedding function not configured');
    }

    const queryEmbedding = await this.embeddingFn(text);
    const results = [];

    for (const [id, emb] of this.embeddingIndex.entries()) {
      const score = this._cosineSimilarity(queryEmbedding, emb);
      results.push({ id, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  /**
   * Fetch full nodes by IDs (for muse engine context)
   */
  async fetchNodesContext(ids = []) {
    const nodes = [];

    for (const id of ids) {
      try {
        if (this.mnemonic && typeof this.mnemonic.retrieve === 'function') {
          const node = await this.mnemonic.retrieve(id);
          if (node) nodes.push(node);
        }
      } catch (err) {
        console.warn(`[${this.name}] Failed to fetch node ${id}:`, err);
      }
    }

    return nodes;
  }

  /**
   * Configure resonance parameters
   */
  setResonanceConfig(cfg = {}) {
    this.resonanceConfig = { ...this.resonanceConfig, ...cfg };
    console.log(`[${this.name}] Resonance config updated:`, this.resonanceConfig);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      embeddingIndexSize: this.embeddingIndex.size
    };
  }

  /**
   * Default summarizer (simple truncate)
   */
  async _defaultSummarize(text) {
    if (!text) return '';
    const trimmed = text.trim();
    const firstSentence = trimmed.split(/[.?!]\s/)[0];
    return firstSentence.length < 200 ? firstSentence : trimmed.slice(0, 200) + '…';
  }

  /**
   * Simple emotion tagger
   */
  _simpleEmotionTag(text) {
    if (!text) return 'neutral';

    const t = text.toLowerCase();

    if (/\b(angry|annoy|hate|frustrat)\b/.test(t)) return 'angry';
    if (/\b(happy|love|joy|excite|yay)\b/.test(t)) return 'joyful';
    if (/\b(sad|depress|lonely)\b/.test(t)) return 'sad';
    if (/\b(wonder|curious|what if|imagine)\b/.test(t)) return 'curious';
    if (/\b(worried|anxious|concern|nervous)\b/.test(t)) return 'anxious';

    return 'neutral';
  }

  /**
   * Cosine similarity helper
   */
  _cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Shutdown cleanup
   */
  shutdown() {
    console.log(`[${this.name}] Shutting down...`);
    this.embeddingIndex.clear();
    this.removeAllListeners();
  }
}

export { IdeaCaptureArbiter };
