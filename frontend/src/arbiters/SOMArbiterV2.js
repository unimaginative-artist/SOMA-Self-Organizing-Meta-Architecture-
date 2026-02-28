// ═══════════════════════════════════════════════════════════
// FILE: src/arbiters/SOMArbiterV2.js
// COMPLETE SOMA WITH FULL EMOTIONAL PERSONALITY
// ═══════════════════════════════════════════════════════════

import { BaseArbiter } from '../core/BaseArbiter.js';
import messageBroker from '../core/MessageBroker.js';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import CognitiveBridge from '../cognitive/CognitiveBridge.js';
import EmotionalEngine from '../cognitive/EmotionalEngine.js';
import PersonalityVoice from '../cognitive/PersonalityVoice.js';

const DEFAULTS = {
  maxConcurrent: 4,
  maxQueue: 200,
  maxClones: 6,
  cloneTTLms: 30 * 60 * 1000,
  dreamAuditIntervalMs: 15 * 60 * 1000,
  brokerHeartbeatMs: 10 * 1000
};

export class SOMArbiterV2 extends BaseArbiter {
  static role = 'neural_coordinator';
  static capabilities = [
    'route_query', 'intelligent_decision', 'learn_from_feedback',
    'acquire_knowledge', 'get_insights', 'debate',
    'dream_audit', 'spawn_clone', 'merge_clone', 'distribute_update'
  ];

  constructor(config = {}) {
    super(config);

    this.isClone = config.isClone || false;
    this.parentName = config.parentName || null;
    this.maxConcurrent = config.maxConcurrent || DEFAULTS.maxConcurrent;
    this.maxQueue = config.maxQueue || DEFAULTS.maxQueue;
    this.maxClones = config.maxClones !== undefined ? config.maxClones : DEFAULTS.maxClones;
    this.cloneTTLms = config.cloneTTLms || DEFAULTS.cloneTTLms;
    this.dreamAuditIntervalMs = config.dreamAuditIntervalMs || DEFAULTS.dreamAuditIntervalMs;

    this.queue = { high: [], normal: [], low: [] };
    this.queueIndex = new Set();
    this.processing = 0;

    this.helpers = [];
    this.clones = new Map();
    this.cloneCounter = 0;

    this.hemispheres = {
      LOGOS: {
        name: 'LOGOS',
        model: config.logosModel || 'llama3',
        endpoint: config.logosEndpoint || 'http://localhost:11434/api/generate',
        temperature: 0.2,
        systemPrompt: config.logosSystemPrompt || 'You are LOGOS, the analytical hemisphere.'
      },
      AURORA: {
        name: 'AURORA',
        model: config.auroraModel || 'gemini-pro',
        apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY,
        temperature: 0.8,
        systemPrompt: config.auroraSystemPrompt || 'You are AURORA, the creative hemisphere.'
      }
    };

    // Track hemisphere usage
    this.hemisphereUsage = { LOGOS: 0, AURORA: 0, BOTH: 0 };

    this.cognitive = new CognitiveBridge({
      memoryPath: config.memoryPath || `./soma-memory/${this.name}`
    });

    // 🎭 EMOTIONAL & PERSONALITY SYSTEMS
    this.emotions = new EmotionalEngine({
      personalityEnabled: config.personalityEnabled !== false
    });
    this.voice = new PersonalityVoice(this.emotions);

    this.metrics = {
      totalProcessed: 0,
      totalErrors: 0,
      debates: 0,
      dreamAudits: 0,
      clonesSpawned: 0,
      merges: 0,
      helpersUsed: 0,
      lastDreamAudit: null
    };

    this.state = {
      mode: 'calm',
      brokerAvailable: true
    };

    this._brokerHeartbeatTimer = null;
    this._dreamAuditTimer = null;
    this._emotionDecayTimer = null;

    this.logger.info(`[${this.name}] 🧠 SOMA with Personality constructed`);
  }

  async initialize() {
    await super.initialize();
    await this.cognitive.initialize();
    this.registerWithBroker();
    this._subscribeBrokerMessages();

    if (!this.isClone) {
      this.startBrokerHeartbeat();
      this.startDreamAudits();
      this.startEmotionalDecay();
      this.checkTimeOfDay(); // Set initial emotional state
    }

    this.logger.info(`[${this.name}] ✅ SOMA initialized with personality`);
  }

  registerWithBroker() {
    try {
      messageBroker.registerArbiter(this.name, this, {
        type: SOMArbiterV2.role,
        capabilities: SOMArbiterV2.capabilities
      });
      this.state.brokerAvailable = true;
    } catch (err) {
      this.state.brokerAvailable = false;
      this.logger.warn(`[${this.name}] Broker unavailable: ${err.message}`);
    }
  }

  _subscribeBrokerMessages() {
    const subs = [
      'route_query', 'intelligent_decision', 'learn_from_feedback',
      'acquire_knowledge', 'get_insights', 'task_batch',
      'help_request', 'help_accepted', 'release',
      'status_check', 'distribute_update'
    ];
    subs.forEach(t => {
      try { messageBroker.subscribe(this.name, t); }
      catch (e) { /* ignore */ }
    });
  }

  startBrokerHeartbeat() {
    if (this._brokerHeartbeatTimer) clearInterval(this._brokerHeartbeatTimer);
    this._brokerHeartbeatTimer = setInterval(() => {
      try {
        messageBroker.getAllArbiters();
        this.state.brokerAvailable = true;
      } catch {
        this.state.brokerAvailable = false;
      }
    }, DEFAULTS.brokerHeartbeatMs);
  }

  startDreamAudits() {
    if (this._dreamAuditTimer) clearInterval(this._dreamAuditTimer);
    this._dreamAuditTimer = setInterval(async () => {
      try {
        await this.runDreamAudit();
      } catch (err) {
        this.logger.error(`[${this.name}] Dream audit error: ${err.message}`);
      }
    }, this.dreamAuditIntervalMs);
  }

  startEmotionalDecay() {
    if (this._emotionDecayTimer) clearInterval(this._emotionDecayTimer);
    this._emotionDecayTimer = setInterval(() => {
      this.emotions.applyDecay();
    }, 30000); // Every 30 seconds
  }

  checkTimeOfDay() {
    const hour = new Date().getHours();
    if (hour >= 22 || hour < 6) {
      this.emotions.processEvent('LATE_NIGHT');
    }
  }

  async runDreamAudit() {
    this.logger.info(`[${this.name}] 💭 Running Dream Audit`);
    this.metrics.dreamAudits++;
    this.emotions.processEvent('DREAM_AUDIT');

    try {
      const auditResult = await this.cognitive.dreamAudit();
      const message = this.voice.dreamAuditMessage(auditResult.changes || 0);
      this.logger.info(`[${this.name}] ${message}`);
      
      if (this.state.brokerAvailable) {
        await messageBroker.sendMessage({
          from: this.name,
          to: 'DistributionArbiter',
          type: 'dream_audit_proposal',
          payload: { auditResult, message }
        }).catch(() => {});
      }
      
      this.metrics.lastDreamAudit = Date.now();
      return auditResult;
    } catch (err) {
      this.logger.error(`[${this.name}] Dream audit failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleMessage(message = {}) {
    try {
      const { type, payload } = message;

      switch (type) {
        case 'route_query':
          return await this.addTask({ type: 'route_query', priority: payload.priority || 'normal', data: payload });
        case 'intelligent_decision':
          return await this.addTask({ type: 'intelligent_decision', priority: payload.priority || 'normal', data: payload });
        case 'learn_from_feedback':
          return await this.learnFromFeedback(payload.success, payload.feedback);
        case 'acquire_knowledge':
          return await this.addTask({ type: 'acquire_knowledge', priority: 'high', data: { topic: payload.topic } });
        case 'get_insights':
          return this.cognitive.getInsights();
        case 'task_batch':
          return await this.handleTaskBatch(message);
        case 'help_request':
          return await this.handleHelpRequest(message);
        case 'help_accepted':
          return await this.handleHelpAccepted(message);
        case 'release':
          return await this.handleRelease(message);
        case 'distribute_update':
          return await this.handleDistributedUpdate(payload);
        case 'status_check':
          return this.getStatus();
        default:
          return { success: false, error: 'unknown_message_type' };
      }
    } catch (err) {
      this.logger.error(`[${this.name}] handleMessage error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  _enqueue(task) {
    const p = task.priority || 'normal';
    if (!['high', 'normal', 'low'].includes(p)) task.priority = 'normal';
    this.queue[p].push(task);
    this.queueIndex.add(task.taskId);
  }

  _dequeue() {
    if (this.queue.high.length) return this.queue.high.shift();
    if (this.queue.normal.length) return this.queue.normal.shift();
    if (this.queue.low.length) return this.queue.low.shift();
    return null;
  }

  _queueSize() {
    return this.queue.high.length + this.queue.normal.length + this.queue.low.length;
  }

  async addTask(task) {
    const taskId = task.taskId || crypto.randomUUID();
    if (this.queueIndex.has(taskId)) return { success: false, reason: 'duplicate' };

    if (this._queueSize() >= this.maxQueue) {
      this.logger.warn(`[${this.name}] Queue full`);
      await this.requestHelp('queue_full');
      return { success: false, reason: 'queue_full' };
    }

    // 🎭 Trigger emotion based on task priority
    if (task.priority === 'high') {
      this.emotions.processEvent('COMPLEX_QUERY');
    }

    const normalized = { ...task, taskId, addedAt: Date.now() };
    this._enqueue(normalized);
    this._drainQueue();
    return { success: true, taskId };
  }

  async _drainQueue() {
    while (this.processing < this.maxConcurrent && this._queueSize() > 0) {
      const task = this._dequeue();
      if (!task) break;
      this.queueIndex.delete(task.taskId);
      this.processing++;
      this._processTask(task).catch(err => {
        this.logger.error(`[${this.name}] Task error: ${err.message}`);
      });
    }

    const load = this.checkLoad();
    if (load.isOverloaded) {
      this.state.mode = 'stressed';
      this.emotions.processEvent('OVERLOAD');
      
      if (this.helpers.length === 0 && this.clones.size < this.maxClones && !this.isClone) {
        await this.spawnClone('overload');
      } else if (this.helpers.length === 0) {
        await this.requestHelp('overloaded');
      }
    } else {
      this.state.mode = 'calm';
      if (this.helpers.length > 0 && this._queueSize() === 0 && this.processing === 0) {
        await this.releaseHelpers();
      }
    }
  }

  async _processTask(task) {
    try {
      let result;
      switch (task.type) {
        case 'route_query':
          result = await this._handleRouteQueryTask(task.data);
          break;
        case 'intelligent_decision':
          result = await this._handleDecisionTask(task.data);
          break;
        case 'acquire_knowledge':
          result = await this._handleAcquireKnowledge(task.data);
          break;
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      this.metrics.totalProcessed++;
      this.emotions.processEvent('TASK_SUCCESS');
      
      return result;
    } catch (err) {
      this.metrics.totalErrors++;
      this.emotions.processEvent('TASK_FAILURE');
      throw err;
    } finally {
      this.processing--;
      this._drainQueue();
    }
  }

  async _handleRouteQueryTask({ query, context = {} }) {
    const prediction = this.cognitive.predictRoute?.(query) || { predicted: false };

    if (prediction.predicted) {
      this.logger.info(`[${this.name}] Using learned routing`);
      const response = await this._callHemisphere(prediction.hemisphere, query, context);
      const arbiterRoute = prediction.arbiter ? 
        { arbiter: prediction.arbiter, task: 'predicted' } : 
        await this.determineArbiterRoute(query, response, context);

      await this.cognitive.learnFromInteraction(query, { result: response, arbiterRoute }, context);
      
      // 🎭 ADD PERSONALITY
      const framedResponse = this.voice.frame({
        success: true,
        response,
        arbiterRoute,
        learned: true
      }, context);
      
      return framedResponse;
    }

    const { hemisphere, confidence } = this.selectHemisphere(query, context);

    if (confidence < 0.6 && context.allowDebate !== false) {
      this.emotions.processEvent('DEBATE_MODE');
      const debate = await this.debateMode(query, context);
      const arbiterRoute = await this.determineArbiterRoute(query, debate.synthesis, context);
      await this.cognitive.learnFromInteraction(query, { result: debate.synthesis, arbiterRoute }, context);
      
      // 🎭 ADD PERSONALITY
      const framedResponse = this.voice.frame({
        success: true,
        debate,
        arbiterRoute
      }, context);
      
      return framedResponse;
    }

    const result = await this._callHemisphere(hemisphere, query, context);
    const arbiterRoute = await this.determineArbiterRoute(query, result, context);
    await this.cognitive.learnFromInteraction(query, { result, arbiterRoute }, context);
    
    // 🎭 ADD PERSONALITY
    const framedResponse = this.voice.frame({
      success: true,
      hemisphere,
      confidence,
      result,
      arbiterRoute
    }, context);
    
    return framedResponse;
  }

  async _handleDecisionTask({ question, options = [], context = {} }) {
    const { hemisphere } = this.selectHemisphere(question, { ...context, requiresPrecision: true });
    
    if (hemisphere === 'AURORA' || context.requiresCreativity) {
      this.emotions.processEvent('CREATIVE_TASK');
      const debate = await this.debateMode(question, context, { options });
      return this.voice.frame({ success: true, debate }, context);
    }
    
    const prompt = this._formatDecisionPrompt(question, options, context);
    const logosResp = await this.callLOGOS(prompt);
    
    try {
      const decision = JSON.parse(logosResp.response);
      return this.voice.frame({ success: true, decision }, context);
    } catch {
      return this.voice.frame({ success: false, raw: logosResp.response }, context);
    }
  }

  async _handleAcquireKnowledge({ topic }) {
    const acquired = await this.cognitive.acquireKnowledge(topic);
    return this.voice.frame({ success: !!acquired, acquired }, { eventType: 'knowledge_acquisition' });
  }

  async _callHemisphere(hemisphere, prompt, context = {}) {
    if (hemisphere === 'LOGOS') return this.callLOGOS(prompt, context);
    if (hemisphere === 'AURORA') return this.callAURORA(prompt, context);
    return this.callBothHemispheres(prompt, context);
  }

  async callLOGOS(prompt, context = {}) {
    this.logger.info(`[${this.name}] 🔷 Calling LOGOS`);
    this.hemisphereUsage.LOGOS++;
    
    // 🎭 Check if LOGOS is being used heavily
    if (this.hemisphereUsage.LOGOS > this.hemisphereUsage.AURORA * 2) {
      this.emotions.processEvent('LOGOS_HEAVY');
    }
    
    try {
      const response = await fetch(this.hemispheres.LOGOS.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.hemispheres.LOGOS.model,
          prompt: `${this.hemispheres.LOGOS.systemPrompt}\n\n${prompt}`,
          temperature: this.hemispheres.LOGOS.temperature,
          stream: false
        })
      });
      const data = await response.json();
      return { hemisphere: 'LOGOS', response: data.response, model: this.hemispheres.LOGOS.model };
    } catch (err) {
      this.logger.error(`[${this.name}] LOGOS failed: ${err.message}`);
      throw err;
    }
  }

  async callAURORA(prompt, context = {}) {
    this.logger.info(`[${this.name}] 🔶 Calling AURORA`);
    this.hemisphereUsage.AURORA++;
    
    // 🎭 Check if AURORA is being used heavily
    if (this.hemisphereUsage.AURORA > this.hemisphereUsage.LOGOS * 2) {
      this.emotions.processEvent('AURORA_HEAVY');
    }
    
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${this.hemispheres.AURORA.model}:generateContent?key=${this.hemispheres.AURORA.apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `${this.hemispheres.AURORA.systemPrompt}\n\n${prompt}` }] }],
            generationConfig: { temperature: this.hemispheres.AURORA.temperature, maxOutputTokens: 2048 }
          })
        }
      );
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
      return { hemisphere: 'AURORA', response: text, model: this.hemispheres.AURORA.model };
    } catch (err) {
      this.logger.error(`[${this.name}] AURORA failed: ${err.message}`);
      throw err;
    }
  }

  async callBothHemispheres(prompt, context = {}) {
    this.logger.info(`[${this.name}] 🧠 Calling BOTH hemispheres`);
    this.hemisphereUsage.BOTH++;
    
    // 🎭 Balanced usage
    this.emotions.processEvent('BALANCED_HEMISPHERES');
    
    const [logos, aurora] = await Promise.allSettled([
      this.callLOGOS(prompt, context).catch(e => ({ hemisphere: 'LOGOS', response: `ERROR: ${e.message}` })),
      this.callAURORA(prompt, context).catch(e => ({ hemisphere: 'AURORA', response: `ERROR: ${e.message}` }))
    ]);

    const logosResp = logos.status === 'fulfilled' ? logos.value : logos.reason;
    const auroraResp = aurora.status === 'fulfilled' ? aurora.value : aurora.reason;

    const synthesisPrompt = `Synthesize these perspectives:\n\nLOGICAL:\n${logosResp.response}\n\nCREATIVE:\n${auroraResp.response}\n\nProvide a balanced answer.`;
    const synthesis = await this.callLOGOS(synthesisPrompt).catch(() => ({ response: `${logosResp.response}\n\n${auroraResp.response}` }));
    
    return { 
      hemisphere: 'BOTH', 
      logos: logosResp.response, 
      aurora: auroraResp.response, 
      synthesis: synthesis.response || synthesis 
    };
  }

  async debateMode(prompt, context = {}) {
    this.logger.info(`[${this.name}] ⚔️ Starting debate mode`);
    this.metrics.debates++;
    this.emotions.processEvent('DEBATE_MODE');

    const logosPrompt = `(LOGOS) Analyze and produce a logical answer:\n\n${prompt}`;
    const auroraPrompt = `(AURORA) Produce a creative perspective:\n\n${prompt}`;

    const settled = await Promise.allSettled([
      this.callLOGOS(logosPrompt),
      this.callAURORA(auroraPrompt)
    ]);

    const logosResp = settled[0].status === 'fulfilled' ? settled[0].value.response : `ERROR: ${settled[0].reason?.message}`;
    const auroraResp = settled[1].status === 'fulfilled' ? settled[1].value.response : `ERROR: ${settled[1].reason?.message}`;

    const synthesisPrompt = `Two perspectives:\n\nLOGICAL:\n${logosResp}\n\nCREATIVE:\n${auroraResp}\n\nSynthesize.`;
    const synthesisResp = await this.callLOGOS(synthesisPrompt).catch(() => ({ response: `${logosResp}\n\n${auroraResp}` }));

    // 🎭 Add debate intro message
    const debateIntro = this.voice.debateIntroMessage();

    return {
      success: true,
      debateIntro,
      logos: logosResp,
      aurora: auroraResp,
      synthesis: synthesisResp.response || synthesisResp
    };
  }

  async spawnClone(reason = 'scale', metadata = {}) {
    if (this.clones.size >= this.maxClones || this.isClone) {
      this.logger.warn(`[${this.name}] Clone spawn denied`);
      return { success: false, reason: 'maxClones_or_isClone' };
    }

    const cloneId = `${this.name}_clone_${++this.cloneCounter}`;
    this.logger.info(`[${this.name}] 🧬 Spawning clone: ${cloneId}`);

    // 🎭 Trigger emotion
    this.emotions.processEvent('CLONE_SPAWNED');

    try {
      const clone = new SOMArbiterV2({
        name: cloneId,
        isClone: true,
        parentName: this.name,
        logosModel: this.hemispheres.LOGOS.model,
        logosEndpoint: this.hemispheres.LOGOS.endpoint,
        logosSystemPrompt: this.hemispheres.LOGOS.systemPrompt,
        auroraModel: this.hemispheres.AURORA.model,
        geminiApiKey: this.hemispheres.AURORA.apiKey,
        auroraSystemPrompt: this.hemispheres.AURORA.systemPrompt,
        memoryPath: this.cognitive.memoryPath,
        maxConcurrent: 2,
        maxQueue: 50,
        maxClones: 0,
        dreamAuditIntervalMs: 0,
        personalityEnabled: false // Clones don't need personality
      });

      await clone.initialize();

      this.clones.set(cloneId, {
        id: cloneId,
        instance: clone,
        createdAt: Date.now(),
        status: 'active',
        reason,
        metadata
      });

      this.helpers.push(cloneId);
      this.metrics.clonesSpawned++;
      this.metrics.helpersUsed++;

      setTimeout(() => {
        if (this.clones.has(cloneId)) {
          this.mergeClone(cloneId).catch(() => {});
        }
      }, this.cloneTTLms);

      await this.distributeWorkToHelpers();

      // 🎭 Log with personality
      const message = this.voice.cloneSpawnedMessage(cloneId);
      this.logger.info(`[${this.name}] ${message}`);

      return { success: true, cloneId, message };
    } catch (error) {
      this.logger.error(`[${this.name}] Clone spawn failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async mergeClone(cloneId) {
    const cloneData = this.clones.get(cloneId);
    if (!cloneData) return { success: false, reason: 'not_found' };

    this.logger.info(`[${this.name}] 🔄 Merging clone: ${cloneId}`);

    try {
      if (cloneData.instance) {
        await cloneData.instance.shutdown();
      }
      this.clones.delete(cloneId);
      const idx = this.helpers.indexOf(cloneId);
      if (idx > -1) this.helpers.splice(idx, 1);
      this.metrics.merges++;
      return { success: true, cloneId };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async distributeWorkToHelpers() {
    if (this.helpers.length === 0 || this._queueSize() === 0) {
      return { success: false, reason: 'nothing_to_distribute' };
    }

    this.logger.info(`[${this.name}] 📤 Distributing to ${this.helpers.length} helpers`);

    const tasksPer = Math.ceil(this._queueSize() / this.helpers.length);

    for (const helper of this.helpers) {
      const batch = [];
      for (let i = 0; i < tasksPer; i++) {
        const task = this._dequeue();
        if (!task) break;
        this.queueIndex.delete(task.taskId);
        batch.push(task);
      }

      if (batch.length > 0 && this.state.brokerAvailable) {
        await messageBroker.sendMessage({
          from: this.name,
          to: helper,
          type: 'task_batch',
          payload: { tasks: batch, callback: this.name }
        }).catch(err => {
          batch.forEach(task => this._enqueue(task));
        });
      } else if (batch.length > 0) {
        batch.forEach(task => this._enqueue(task));
      }
    }
    return { success: true };
  }

  async requestHelp(reason = 'overload') {
    if (!this.state.brokerAvailable) {
      return { success: false, reason: 'broker_unavailable' };
    }

    this.logger.info(`[${this.name}] 📢 Requesting help: ${reason}`);

    await messageBroker.sendMessage({
      from: this.name,
      to: 'broadcast',
      type: 'help_request',
      payload: {
        reason,
        load: this.checkLoad(),
        queueSize: this._queueSize(),
        capabilities: SOMArbiterV2.capabilities
      }
    }).catch(() => {});

    return { success: true };
  }

  async handleHelpRequest(message) {
    const from = message.from;
    if (from === this.name) return { success: false, reason: 'self' };

    const load = this.checkLoad();
    if (load.isOverloaded) return { success: false, reason: 'busy' };

    await messageBroker.sendMessage({
      from: this.name,
      to: from,
      type: 'help_accepted',
      payload: { helper: this.name, capacity: this.maxConcurrent - this.processing }
    }).catch(() => {});

    return { success: true, helping: from };
  }

  async handleHelpAccepted(message) {
    const helper = message.from;
    if (!this.helpers.includes(helper)) {
      this.helpers.push(helper);
      this.metrics.helpersUsed++;
    }
    await this.distributeWorkToHelpers();
    return { success: true };
  }

  async handleRelease(message) {
    const idx = this.helpers.indexOf(message.from);
    if (idx > -1) this.helpers.splice(idx, 1);
    return { success: true };
  }

  async releaseHelpers() {
    if (this.helpers.length === 0) return;

    for (const helper of this.helpers) {
      if (this.state.brokerAvailable) {
        await messageBroker.sendMessage({
          from: this.name,
          to: helper,
          type: 'release',
          payload: { reason: 'work_complete' }
        }).catch(() => {});
      }
    }
    this.helpers = [];
  }

  async handleTaskBatch(message) {
    const tasks = (message.payload && message.payload.tasks) || [];
    let queued = 0;
    for (const t of tasks) {
      const result = await this.addTask({ ...t, priority: t.priority || 'normal' }).catch(() => ({ success: false }));
      if (result.success) queued++;
    }
    return { success: true, queued };
  }

  async handleDistributedUpdate(payload) {
    if (payload.type === 'routing_weights' && payload.weights) {
      try {
        await this.cognitive.applyRoutingWeights(payload.weights);
        return { success: true, applied: 'routing_weights' };
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    if (payload.type === 'config_patch' && payload.config) {
      Object.assign(this.hemispheres.LOGOS, payload.config.LOGOS || {});
      Object.assign(this.hemispheres.AURORA, payload.config.AURORA || {});
      return { success: true, applied: 'config_patch' };
    }

    return { success: false, reason: 'code_updates_blocked' };
  }

  selectHemisphere(query, context = {}) {
    const q = (query || '').toLowerCase();
    const scores = { LOGOS: 0, AURORA: 0 };

    const logosKw = ['analyze', 'calculate', 'debug', 'code', 'logic', 'technical'];
    const auroraKw = ['design', 'create', 'imagine', 'story', 'creative', 'visual'];

    logosKw.forEach(k => { if (q.includes(k)) scores.LOGOS += 2; });
    auroraKw.forEach(k => { if (q.includes(k)) scores.AURORA += 2; });

    if (context.requiresPrecision) scores.LOGOS += 3;
    if (context.requiresCreativity) scores.AURORA += 3;

    if (scores.LOGOS > scores.AURORA) {
      return { hemisphere: 'LOGOS', confidence: scores.LOGOS / (scores.LOGOS + scores.AURORA || 1) };
    }
    if (scores.AURORA > scores.LOGOS) {
      return { hemisphere: 'AURORA', confidence: scores.AURORA / (scores.LOGOS + scores.AURORA || 1) };
    }
    return { hemisphere: 'BOTH', confidence: 0.5 };
  }

  async determineArbiterRoute(query, aiResult, context = {}) {
    const q = (query || '').toLowerCase();
    if (q.includes('store') || q.includes('save')) return { arbiter: 'StorageArbiter', task: 'store', confidence: 0.9 };
    if (q.includes('compress') || q.includes('archive')) return { arbiter: 'ArchivistArbiter', task: 'compress', confidence: 0.9 };
    if (q.includes('fetch') || q.includes('crawl')) return { arbiter: 'EdgeWorker', task: 'fetch', confidence: 0.9 };
    if (q.includes('analyze') || q.includes('process')) return { arbiter: 'UniversalImpulser', task: 'categorize', confidence: 0.8 };
    return { arbiter: 'none', task: 'none', confidence: 0.0 };
  }

  _formatDecisionPrompt(question, options, context) {
    return `Question: ${question}\nOptions: ${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}\nContext: ${JSON.stringify(context, null, 2)}\nReturn JSON: recommendation, reasoning, confidence, alternatives.`;
  }

  checkLoad() {
    const qLoad = this.maxQueue > 0 ? (this._queueSize() / this.maxQueue) : 0;
    const pLoad = this.maxConcurrent > 0 ? (this.processing / this.maxConcurrent) : 0;
    const overall = (qLoad + pLoad) / 2;
    const isOverloaded = qLoad > 0.8 || pLoad > 0.9;
    
    // 🎭 Log overload with personality
    if (isOverloaded && this.emotions.enabled) {
      const message = this.voice.overloadMessage(overall);
      if (Math.random() < 0.1) { // Only log occasionally
        this.logger.info(`[${this.name}] ${message}`);
      }
    }
    
    return { queue: qLoad, processing: pLoad, overall, isOverloaded };
  }

  async learnFromFeedback(success = true, feedback = {}) {
    try {
      // 🎭 Trigger emotion
      if (success) {
        this.emotions.processEvent('USER_PRAISED');
      }
      
      await this.cognitive.recordFeedback?.({ success, feedback });
      return { success: true };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }

  getStatus() {
    // 🎭 Check for autonomy milestones
    const cogMetrics = this.cognitive.getMetrics();
    const autonomyPercent = parseFloat(cogMetrics.autonomyLevel);
    
    if (autonomyPercent >= 80 && autonomyPercent < 80.5 && this.emotions.enabled) {
      this.emotions.processEvent('HIGH_AUTONOMY');
      const message = this.voice.highAutonomyMessage(autonomyPercent.toFixed(0));
      this.logger.info(`[${this.name}] ${message}`);
    }

    return {
      name: this.name,
      role: SOMArbiterV2.role,
      isClone: this.isClone,
      parentName: this.parentName,
      queue: {
        high: this.queue.high.length,
        normal: this.queue.normal.length,
        low: this.queue.low.length,
        total: this._queueSize(),
        processing: this.processing
      },
      load: this.checkLoad(),
      helpers: this.helpers.length,
      clones: {
        active: this.clones.size,
        max: this.maxClones,
        list: Array.from(this.clones.keys())
      },
      mode: this.state.mode,
      brokerAvailable: this.state.brokerAvailable,
      metrics: this.metrics,
      cognitive: cogMetrics,
      // 🎭 EMOTIONAL STATE
      emotional: {
        enabled: this.emotions.enabled,
        mood: this.emotions.getCurrentMood(),
        state: this.emotions.getState(),
        recentEvents: this.emotions.getHistory().slice(-5)
      },
      hemispheres: {
        usage: this.hemisphereUsage,
        balance: this.getHemisphereBalance()
      }
    };
  }

  getHemisphereBalance() {
    const total = this.hemisphereUsage.LOGOS + this.hemisphereUsage.AURORA + this.hemisphereUsage.BOTH;
    if (total === 0) return { logos: 0, aurora: 0, both: 0 };
    
    return {
      logos: ((this.hemisphereUsage.LOGOS / total) * 100).toFixed(1) + '%',
      aurora: ((this.hemisphereUsage.AURORA / total) * 100).toFixed(1) + '%',
      both: ((this.hemisphereUsage.BOTH / total) * 100).toFixed(1) + '%'
    };
  }

  async shutdown() {
    this.logger.info(`[${this.name}] 🛑 Shutting down...`);

    if (this._brokerHeartbeatTimer) clearInterval(this._brokerHeartbeatTimer);
    if (this._dreamAuditTimer) clearInterval(this._dreamAuditTimer);
    if (this._emotionDecayTimer) clearInterval(this._emotionDecayTimer);

    await this.releaseHelpers();

    const cloneIds = Array.from(this.clones.keys());
    for (const cloneId of cloneIds) {
      await this.mergeClone(cloneId).catch(() => {});
    }

    await this.cognitive.saveCognitiveState?.();
    this.logger.info(`[${this.name}] ✅ Shutdown complete`);
  }
}

export default SOMArbiterV2;
