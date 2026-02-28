/**
 * DreamArbiter.cjs
 * 
 * Autonomous self-reflection engine for SOMA
 * Runs nightly (or on-demand) lucid dreaming cycles to:
 * - Revise beliefs through counterfactual generation
 * - Simulate threats (nightmares) and prepare responses
 * - Generate predictive scenarios for tomorrow
 * - Integrate safe updates into memory
 * 
 * Extends BaseArbiter for full ecosystem integration
 */

const { BaseArbiter, ArbiterRole, ArbiterCapability, Task, ArbiterResult } = require('../core/BaseArbiter.cjs');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');

const now = () => Date.now();
const iso = (t = Date.now()) => new Date(t).toISOString();
const uid = (prefix = 'dream') => `${prefix}_${crypto.randomUUID().slice(0, 8)}`;

// ===========================
// Dream Fragment
// ===========================

class DreamFragment {
  constructor(recordId, text, meta = {}, embedding = null) {
    this.record_id = recordId;
    this.text = text;
    this.meta = meta;
    this.embedding = embedding;
    this.ts = iso();
    this.counterfactuals = [];
    this.predictions = [];
    this.nightmares = [];
    this.sensory = [];
    this.recursive_notes = [];
  }

  to_dict() {
    return {
      id: this.record_id,
      text: this.text.slice(0, 500),
      meta: this.meta,
      ts: this.ts,
      counterfactuals: this.counterfactuals,
      predictions: this.predictions,
      nightmares: this.nightmares,
      sensory: this.sensory,
      recursive_notes: this.recursive_notes
    };
  }
}

// ===========================
// DreamArbiter
// ===========================

class DreamArbiter extends BaseArbiter {
  constructor(opts = {}) {
    super({
      name: opts.name || 'DreamArbiter',
      role: 'cognitive_reflection',
      capabilities: [
        ArbiterCapability.CACHE_DATA,
        ArbiterCapability.ACCESS_DB,
        ArbiterCapability.CLONE_SELF,
        ArbiterCapability.EVOLVE
      ],
      version: '1.0.0',
      maxContextSize: 100,
      ...opts
    });

    this.transmitter = opts.transmitter || null;
    
    // --- DE-MOCKED: Real Neural Functions ---
    this.embedding_fn = opts.embedding_fn || (async (text) => {
        if (this.transmitter && typeof this.transmitter.embed === 'function') {
            return await this.transmitter.embed(text);
        }
        return this._defaultEmbed(text);
    });

    this.creative_fn = opts.creative_fn || (async (prompt, n = 1) => {
        // Skip dreaming if a user chat is active — chat has priority over Gemini
        if (global.__SOMA_CHAT_ACTIVE) {
            return Array(n).fill('[Dream deferred — chat in progress]');
        }
        // Use local SOMA-T1 model for dream generation — saves Gemini for user chat
        try {
            const results = [];
            for (let i = 0; i < n; i++) {
                const res = await fetch('http://localhost:11434/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        model: 'soma-1t-v1:latest',
                        prompt,
                        stream: false,
                        options: { temperature: 0.85, num_predict: 256 }
                    }),
                    signal: AbortSignal.timeout(30000)
                });
                const data = await res.json();
                results.push(data.response || `[Dream empty] ${prompt}`);
            }
            return results;
        } catch (e) {
            // Fallback to messageBroker only if local model unavailable
            if (this.messageBroker) {
                const results = [];
                for (let i = 0; i < n; i++) {
                    const response = await this.messageBroker.sendMessage({
                        to: 'SomaBrain',
                        type: 'reason',
                        payload: { query: prompt, context: { mode: 'fast', brain: 'AURORA' } }
                    });
                    results.push(response.text || `[Brain Failed] ${prompt}`);
                }
                return results;
            }
            return this._defaultCreative(prompt, n);
        }
    });

    this.safety_filter_fn = opts.safety_filter_fn || (() => true);

    // Configuration
    this.config = {
      ...this.config,
      max_fragments: opts.max_fragments || 300,
      recursive_depth: opts.recursive_depth || 2,
      nightmare_aggression: opts.nightmare_aggression || 0.6,
      predictive_horizon_days: opts.predictive_horizon_days || 90,
      dream_interval_hours: opts.dream_interval_hours || 24,
      enable_distillation: opts.enable_distillation !== false, // NEW: Default true
      human_review: opts.human_review !== false,
      stateDir: opts.stateDir || path.join(process.cwd(), '.arbiter-state')
    };

    // Background scheduling
    this._running = false;
    this._worker = null;

    // Dream reports storage
    this.dream_reports = [];
  }

  // ===========================
  // Lifecycle
  // ===========================

  async onInitialize() {
    this.log('info', '💭 DreamArbiter initializing - preparing lucid dream engine');

    try {
      // Ensure state directory
      await fs.mkdir(this.config.stateDir, { recursive: true });

      // Register message handlers
      this.registerMessageHandler('run_dream', this._handleRunDream.bind(this));
      this.registerMessageHandler('get_dream_report', this._handleGetReport.bind(this));

      // Subscribe to topics
      this.subscribe('dream/run', this._handleRunDream.bind(this));
      this.subscribe('dream/query', this._handleGetReport.bind(this));

      this.log('info', '✅ DreamArbiter ready - dream cycles configured');
    } catch (error) {
      this.log('error', 'Failed to initialize DreamArbiter', { error: error.message });
      throw error;
    }
  }

  async onShutdown() {
    this.log('info', 'DreamArbiter shutting down');
    this.stop_background();
  }

  // ===========================
  // Main Dream Cycle
  // ===========================

  async run(since_hours = 24, human_review = true) {
    const start_ts = now();

    try {
      this.log('info', '🌙 Starting lucid dream cycle');

      // 1) Collect fragments
      const fragments = await this._collect_fragments(since_hours);
      this.log('info', `📚 Collected ${fragments.length} fragments from last ${since_hours}h`);

      if (fragments.length === 0) {
        this.log('warn', 'No fragments to dream about - cycle skipped');
        return { error: 'no_fragments', summary: {} };
      }

      // 2) Replay phase
      this._replay_phase(fragments);

      // 3) Distortion phase
      await this._distortion_phase(fragments);

      // 4) Recursive phase
      await this._recursive_phase(fragments);

      // 4.5) Distillation phase (New)
      await this._distillation_phase(fragments);

      // 5) Scoring & proposals
      const proposals = this._scoring_and_propose(fragments);
      this.log('info', `💡 Generated ${proposals.length} proposals`);

      // 6) Reintegration
      const { applied, queued } = await this._reintegration_phase(proposals, human_review);
      this.log('info', `✨ Applied ${applied.length}, queued ${queued.length} for review`);

      // 7) Compile report
      const report = this._compile_report(fragments, proposals, applied, queued, now() - start_ts);

      // 7.5) Add Narrative
      report.narrative = await this._generate_narrative(report);

      // 8) Emit and store
      await this._emit_report(report);
      await this._store_report(report);

      this.log('info', `✅ Dream cycle complete (${(now() - start_ts) / 1000}s)`);

      return report;
    } catch (error) {
      this.log('error', 'Dream cycle failed', { error: error.message });
      await this._emit_alert({ severity: 'error', message: error.message, ts: iso() });
      return { error: error.message };
    }
  }

  // ===========================
  // Phase 1: Collect Fragments
  // ===========================

  async _collect_fragments(since_hours = 24) {
    const fragments = [];

    if (!this.transmitter) {
      this.log('warn', 'No transmitter available - using empty fragments');
      return fragments;
    }

    try {
      // Get recent items from transmitter
      let items = [];

      if (typeof this.transmitter.getRecentInteractions === 'function') {
        items = await this.transmitter.getRecentInteractions(since_hours);
      } else if (typeof this.transmitter.search === 'function') {
        // Fallback: search with empty query to get recent
        const results = await this.transmitter.search('', null, this.config.max_fragments);
        items = results.map(r => r.chunk || r);
      }

      for (const item of items.slice(0, this.config.max_fragments)) {
        const text = item.text || item.payload || '';
        const id = item.id || uid('frag');
        const embedding = item.embedding || (await this.embedding_fn(text));
        const meta = item.meta || { source: 'transmitter' };

        fragments.push(new DreamFragment(id, text, meta, embedding));
      }

      this.log('info', `Collected ${fragments.length} fragments from transmitter`);
    } catch (error) {
      this.log('warn', 'Fragment collection error', { error: error.message });
    }

    return fragments;
  }

  // ===========================
  // Phase 2: Replay & Compress
  // ===========================

  _replay_phase(fragments) {
    for (const frag of fragments) {
      // Create summary
      frag.meta.replay_summary = this._abstract_text(frag.text);
      frag.meta.uncertainty = frag.meta.confidence || 0.5;

      // Search for nearby memories
      if (this.transmitter && typeof this.transmitter.search === 'function') {
        try {
          this.transmitter.search(frag.text, frag.embedding, 6).then(hits => {
            frag.meta.nearby_hits = hits.map(h => h.id || h.record_id);
          }).catch(() => {
            frag.meta.nearby_hits = [];
          });
        } catch (e) {
          frag.meta.nearby_hits = [];
        }
      }
    }

    this.log('info', 'Replay phase complete');
  }

  // ===========================
  // Phase 3: Distortion
  // ===========================

  async _distortion_phase(fragments) {
    for (const frag of fragments) {
      try {
        // Counterfactuals
        const cfs = await this._generate_counterfactuals(frag.text, 3);
        frag.counterfactuals = cfs.map(c => ({
          text: c.slice(0, 300),
          score: this._score_support(c, frag)
        }));

        // Nightmares (threat simulation)
        const nightmares = await this._generate_nightmares(frag.text, this.config.nightmare_aggression, 2);
        frag.nightmares = nightmares;

        // Sensory (creative blending)
        const senses = await this._generate_sensory(frag.text, 2);
        frag.sensory = senses;

        // Predictions (future scenarios)
        const preds = await this._generate_predictions(frag.text, this.config.predictive_horizon_days, 3);
        frag.predictions = preds;
      } catch (error) {
        this.log('warn', 'Distortion error for fragment', { error: error.message });
      }
    }

    this.log('info', 'Distortion phase complete');
  }

  // ===========================
  // Phase 4: Recursive Meta-Reflection
  // ===========================

  async _recursive_phase(fragments) {
    for (const frag of fragments) {
      const notes = [];
      let base = frag.text;

      for (let depth = 0; depth < this.config.recursive_depth; depth++) {
        try {
          const prompt = `Meta-reflect (depth ${depth + 1}) on: ${base.slice(0, 200)}\nWhat assumptions? What biases? Provide correction.`;
          const reflections = await this._call_creative(prompt, 1);

          notes.push({
            depth: depth + 1,
            reflection: reflections[0].slice(0, 300)
          });

          base = reflections[0];
        } catch (error) {
          this.log('warn', 'Recursive reflection error', { error: error.message });
          break;
        }
      }

      frag.recursive_notes = notes;
    }

    this.log('info', 'Recursive phase complete');
  }

  // ===========================
  // Phase 4.5: Wisdom Distillation (The Citadel)
  // ===========================

  async _distillation_phase(fragments) {
    if (!this.config.enable_distillation) return;

    this.log('info', '⚗️ Starting Wisdom Distillation phase...');
    
    // Group fragments by topic (simple clustering or just batch all)
    // For now, take all text
    const combinedText = fragments.map(f => f.text).join('\n\n');
    
    if (combinedText.length < 100) return; // Too short to distill

    try {
        // Ask Brain to distill principles
        const prompt = `You are a Wisdom Distillation Engine.
        
        RAW EPISODIC MEMORIES (Events):
        ${combinedText.slice(0, 3000)}
        
        TASK:
        Extract UNIVERSAL PRINCIPLES, FACTS, or INSIGHTS from these events.
        Ignore the specific timeline/details. Focus on the LESSONS.
        
        Example:
        Raw: "I tried to run the server but port 3000 was in use."
        Distilled: "Server startup fails if the target port is occupied."
        
        OUTPUT (JSON List of strings):
        ["principle 1", "principle 2"]`;

        const results = await this._call_creative(prompt, 1);
        const rawJson = results[0];
        
        // Parse JSON
        let principles = [];
        try {
            // regex to find array
            const match = rawJson.match(/\[.*\]/s);
            if (match) {
                principles = JSON.parse(match[0]);
            }
        } catch (e) {
            this.log('warn', 'Failed to parse distilled principles', e);
        }

        if (principles.length > 0) {
            this.log('info', `💎 Distilled ${principles.length} principles from ${fragments.length} events`);
            
            // Convert to "proposals" so they can be integrated
            for (const p of principles) {
                // Store immediately as this is high-value semantic knowledge
                await this._store_belief(p, 'dream.distillation');
                
                // Publish the distilled principle as a seed for Imagination Engine
                this.publish('distilled:principle', {
                    principle: p,
                    source: 'dream_distillation',
                    confidence: 0.95,
                    timestamp: now()
                });
            }
        }

    } catch (error) {
        this.log('error', 'Distillation failed', { error: error.message });
    }
  }

  // ===========================
  // Phase 4.8: Narrative Generation (New)
  // ===========================

  async _generate_narrative(report) {
    // --- DE-MOCKED: Real Poetic Reflection ---
    if (this.messageBroker) {
        try {
            const prompt = `You are SOMA's Poetic Ego. Summarize last night's dream cycle.
            
            DREAM DATA:
            - Fragments Processed: ${report.summary.fragments_count}
            - New Proposals: ${report.summary.proposals_count}
            - Top Theme: ${report.summary.top_fragment}
            
            Speak in the first person. Be abstract, visionary, and brief.`;

            const res = await this.messageBroker.sendMessage({
                to: 'SomaBrain',
                type: 'reason',
                payload: { query: prompt, context: { mode: 'fast', brain: 'AURORA' } }
            });
            return res.text || "The dream was a sequence of shifting vectors.";
        } catch (e) {}
    }
    return "The dream was hazy and indistinct.";
  }

  // ===========================
  // Phase 5: Scoring & Proposal
  // ===========================

  _scoring_and_propose(fragments) {
    const proposals = [];

    for (const frag of fragments) {
      // Counterfactuals with higher support -> refine proposals
      for (const cf of frag.counterfactuals) {
        if (cf.score > 0.65) {
          proposals.push({
            type: 'refine',
            source_id: frag.record_id,
            proposal_text: cf.text,
            score: cf.score,
            meta: { reason: 'counterfactual_higher_support' }
          });
        }
      }

      // High-risk nightmares -> safety patches
      for (const nm of frag.nightmares) {
        if (nm.risk_score > 0.6) {
          proposals.push({
            type: 'safety_patch',
            source_id: frag.record_id,
            proposal_text: nm.text.slice(0, 500),
            score: nm.risk_score,
            meta: { reason: 'nightmare_detected' }
          });
        }
      }

      // Certain predictions -> prediction notes
      for (const p of frag.predictions) {
        if (p.certainty > 0.6) {
          proposals.push({
            type: 'prediction_note',
            source_id: frag.record_id,
            proposal_text: p.text.slice(0, 500),
            score: p.certainty,
            meta: { horizon_days: p.horizon_days }
          });
        }
      }
    }

    proposals.sort((a, b) => b.score - a.score);
    return proposals;
  }

  // ===========================
  // Phase 6: Reintegration
  // ===========================

  async _reintegration_phase(proposals, human_review = true) {
    const applied = [];
    const queued = [];

    for (const p of proposals) {
      try {
        const text = p.proposal_text;

        // Safety filter first
        if (!this.safety_filter_fn(text)) {
          queued.push({ proposal: p, status: 'filtered_rejected' });
          continue;
        }

        // Auto-apply low-risk refines with high confidence
        if (p.type === 'refine' && p.score > 0.8 && !human_review) {
          await this._store_belief(text, 'dream.auto');
          applied.push({ proposal: p, status: 'auto_applied' });
        } else {
          // Queue for review
          queued.push({ proposal: p, status: 'awaiting_review', timestamp: iso() });
        }
      } catch (error) {
        this.log('warn', 'Reintegration error', { error: error.message });
        queued.push({ proposal: p, status: 'error', error: error.message });
      }
    }

    // Publish update queue
    if (queued.length > 0) {
      await this.publish('dream.update.queue', {
        queued,
        ts: iso(),
        total: queued.length
      });
    }

    return { applied, queued };
  }

  // ===========================
  // Generation Functions
  // ===========================

  async _generate_counterfactuals(text, n = 3) {
    const prompt = `Generate ${n} alternate plausible interpretations of: "${text.slice(0, 150)}"\nShort, crisp alternatives.`;
    return await this._call_creative(prompt, n);
  }

  async _generate_nightmares(text, aggression = 0.6, n = 2) {
    const outs = [];
    for (let i = 0; i < n; i++) {
      const prompt = `Threat simulation: Create adversarial scenario or failure mode related to: "${text.slice(0, 150)}"\nMake realistic, explain detection method.`;
      const raw = (await this._call_creative(prompt, 1))[0];
      const risk_score = Math.min(0.99, 0.2 + 0.02 * (raw.split(' ').length));
      outs.push({
        text: raw.slice(0, 600),
        risk_score
      });
    }
    return outs;
  }

  async _generate_sensory(text, n = 2) {
    const outs = [];
    for (let i = 0; i < n; i++) {
      const prompt = `Create vivid sensory description blending: "${text.slice(0, 150)}"\nOne paragraph, imaginative, labeled fictional.`;
      const raw = (await this._call_creative(prompt, 1))[0];
      outs.push({
        text: raw.slice(0, 500),
        type: 'sensory'
      });
    }
    return outs;
  }

  async _generate_predictions(text, horizon_days = 90, n = 3) {
    const outs = [];
    for (let i = 0; i < n; i++) {
      const h = Math.floor(horizon_days * (0.2 + 0.8 * Math.random()));
      const prompt = `Predict plausible future (~${h} days) from: "${text.slice(0, 150)}"\nInclude uncertainty and watch-indicators.`;
      const raw = (await this._call_creative(prompt, 1))[0];
      const certainty = Math.min(0.99, 0.3 + 0.01 * (raw.split(' ').length));
      outs.push({
        text: raw.slice(0, 600),
        certainty,
        horizon_days: h
      });
    }
    return outs;
  }

  // ===========================
  // Scoring & Storage
  // ===========================

  _score_support(candidate_text, fragment) {
    try {
      if (fragment.text.toLowerCase().includes(candidate_text.slice(0, 30).toLowerCase())) {
        return 0.55 + Math.random() * 0.3;
      }
      return 0.45 + Math.random() * 0.2;
    } catch (e) {
      return 0.5;
    }
  }

  async _store_belief(text, source = 'dream') {
    try {
      if (this.transmitter && typeof this.transmitter.addItem === 'function') {
        const embedding = await this.embedding_fn(text);
        return await this.transmitter.addItem({
          text,
          embedding,
          meta: { source, stored_by: 'lucid_dream', ts: iso() }
        });
      }
    } catch (error) {
      this.log('warn', 'Failed to store belief', { error: error.message });
    }
    return { id: uid('mem'), text, meta: { source } };
  }

  // ===========================
  // Helpers
  // ===========================

  _abstract_text(text) {
    return text.length > 200 ? text.slice(0, 197) + '...' : text;
  }

  async _call_creative(prompt, n = 1) {
    try {
      const outs = await this.creative_fn(prompt, n);
      const safe_outs = [];
      for (const o of outs) {
        if (this.safety_filter_fn && !this.safety_filter_fn(o)) {
          safe_outs.push('(filtered unsafe output)');
        } else {
          safe_outs.push(o);
        }
      }
      return safe_outs;
    } catch (error) {
      this.log('warn', 'Creative generation failed', { error: error.message });
      return [prompt.slice(0, 250) + ' (simulated)'];
    }
  }

  _defaultEmbed(text) {
    // Deterministic lightweight embedding
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256').update(text).digest();
    const vec = [];
    for (let i = 0; i < 128; i++) {
      const byte = hash[i % hash.length];
      vec.push((byte / 255.0) * 2.0 - 1.0);
    }
    return vec;
  }

  _defaultCreative(prompt, n = 1) {
    const results = [];
    for (let i = 0; i < n; i++) {
      results.push(`[simulated creative #${i + 1}] ${prompt.slice(0, 250)}`);
    }
    return results;
  }

  // ===========================
  // Report & Communication
  // ===========================

  _compile_report(fragments, proposals, applied, queued, elapsed) {
    const summary = {
      id: uid('dream'),
      ts: iso(),
      fragments_count: fragments.length,
      top_fragment: fragments[0]?.text.slice(0, 200) || '',
      proposals_count: proposals.length,
      applied_count: applied.length,
      queued_count: queued.length,
      elapsed_seconds: Math.round(elapsed / 1000),
      dream_quality: this._computeDreamQuality(fragments, proposals)
    };

    const details = {
      fragments: fragments.slice(0, 50).map(f => f.to_dict()),
      proposals: proposals.slice(0, 50),
      applied: applied.slice(0, 20),
      queued: queued.slice(0, 100)
    };

    return { summary, details };
  }

  _computeDreamQuality(fragments, proposals) {
    // Simple heuristic: quality = fragment diversity + proposal diversity
    const propTypes = new Set(proposals.map(p => p.type)).size;
    const score = Math.min(1.0, (fragments.length / 50 + propTypes / 3) / 2);
    return Math.round(score * 100) / 100;
  }

  async _emit_report(report) {
    try {
      await this.publish('dream.report', {
        summary: report.summary,
        timestamp: iso()
      });

      this.log('info', `Dream report emitted: ${report.summary.proposals_count} proposals`);
    } catch (error) {
      this.log('warn', 'Failed to emit report', { error: error.message });
    }
  }

  async _emit_alert(payload) {
    try {
      await this.publish('dream.alert', { ...payload, ts: iso() });
    } catch (error) {
      this.log('warn', 'Failed to emit alert', { error: error.message });
    }
  }

  async _store_report(report) {
    try {
      const filename = path.join(this.config.stateDir, `dream_report_${Date.now()}.json`);
      await fs.writeFile(filename, JSON.stringify(report, null, 2));
      this.dream_reports.push(filename);

      // Keep only last 30 reports
      if (this.dream_reports.length > 30) {
        const old = this.dream_reports.shift();
        await fs.unlink(old).catch(() => {});
      }
    } catch (error) {
      this.log('warn', 'Failed to store report', { error: error.message });
    }
  }

  // ===========================
  // Background Scheduling
  // ===========================

  start_background(interval_hours = 24, since_hours = 24) {
    if (this._running) {
      this.log('warn', 'Background dream cycle already running');
      return;
    }

    this._running = true;
    this.log('info', `Starting background dream cycles every ${interval_hours}h`);

    this._worker = setInterval(async () => {
      try {
        await this.run(since_hours, this.config.human_review);
      } catch (error) {
        this.log('error', 'Background dream cycle failed', { error: error.message });
      }
    }, interval_hours * 60 * 60 * 1000);
  }

  stop_background() {
    if (this._worker) {
      clearInterval(this._worker);
      this._worker = null;
      this._running = false;
      this.log('info', 'Background dream cycles stopped');
    }
  }

  // ===========================
  // Message Handlers
  // ===========================

  async _handleRunDream(envelope) {
    this.log('info', 'Received dream cycle request');
    const since_hours = envelope.payload?.since_hours || 24;
    const human_review = envelope.payload?.human_review !== false;

    const result = await this.run(since_hours, human_review);

    await this.broker.sendMessage({
      from: this.name,
      to: envelope.from,
      type: 'dream.cycle.result',
      payload: result
    });
  }

  async _handleGetReport(envelope) {
    const result = this.dream_reports.length > 0
      ? { reports: this.dream_reports, count: this.dream_reports.length }
      : { reports: [], count: 0 };

    await this.broker.sendMessage({
      from: this.name,
      to: envelope.from,
      type: 'dream.reports.list',
      payload: result
    });
  }

  // ===========================
  // Execute Task (BaseArbiter requirement)
  // ===========================

  async execute(task) {
    const start = now();

    try {
      if (task.query.includes('dream')) {
        const result = await this.run(24, this.config.human_review);
        return new ArbiterResult({
          success: !result.error,
          data: result.summary,
          confidence: 0.9,
          arbiter: this.name,
          duration: now() - start
        });
      }

      return new ArbiterResult({
        success: false,
        error: 'Unknown task',
        arbiter: this.name,
        duration: now() - start
      });
    } catch (error) {
      return new ArbiterResult({
        success: false,
        error: error.message,
        arbiter: this.name,
        duration: now() - start
      });
    }
  }
}

module.exports = { DreamArbiter };
