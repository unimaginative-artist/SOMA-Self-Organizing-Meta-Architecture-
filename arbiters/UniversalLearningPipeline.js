/**
 * UniversalLearningPipeline.js - SOMA's Central Learning System
 *
 * THE BRAIN STEM - Captures EVERYTHING and feeds it to learning systems
 *
 * This arbiter acts as middleware that:
 * 1. Intercepts ALL interactions
 * 2. Logs to ExperienceReplayBuffer
 * 3. Records to OutcomeTracker
 * 4. Stores to MnemonicArbiter
 * 5. Feeds AdaptiveLearningPlanner
 * 6. Triggers nighttime learning updates
 *
 * Literally learns from EVERYTHING:
 * - User queries and responses
 * - Arbiter decisions
 * - Task outcomes
 * - Error patterns
 * - Performance metrics
 * - Self-modification results
 */

import EventEmitter from 'events';
import ExperienceReplayBuffer from './ExperienceReplayBuffer.js';
import OutcomeTracker from './OutcomeTracker.js';

export class UniversalLearningPipeline extends EventEmitter {
  constructor(config = {}) {
    super();

    this.name = config.name || 'UniversalLearningPipeline';
    this.config = config; // Store config for later use

    // Connected arbiters
    this.mnemonicArbiter = null;
    this.adaptivePlanner = null;
    this.tribrain = null;

    // Learning systems — accept injected instances to avoid duplicate timers/files.
    // If a shared outcomeTracker already exists (from cognitive.js early boot), use it.
    this.experienceBuffer = config.experienceBuffer || new ExperienceReplayBuffer({
      maxSize: config.maxExperiences || 2000, // Reduced from 10K (each experience ~1KB = 2MB max)
      minSize: config.minExperiences || 2,
      priorityAlpha: 0.7
    });

    this.outcomeTracker = config.outcomeTracker || new OutcomeTracker({
      storageDir: config.storageDir || process.cwd() + '/.soma/outcomes',
      enablePersistence: true,
      persistInterval: 60000 // 1 minute (was 30s — was creating zombie timer when tracker got replaced)
    });

    // Interaction log — capped at 1000 entries (was 10000, each entry could be ~84KB = 840MB max)
    this.interactionLog = [];
    this.maxLogSize = config.maxLogSize || 1000;

    // Stats
    this.stats = {
      totalInteractions: 0,
      totalExperiences: 0,
      totalOutcomes: 0,
      totalMemories: 0,
      learningRate: 0,
      lastLearningSession: null
    };

    // Learning triggers
    this.learningTriggers = {
      experienceThreshold: config.experienceThreshold || 100, // Learn after N experiences
      timeThreshold: config.timeThreshold || 3600000, // Learn every hour
      immediatePatterns: config.immediatePatterns || ['error', 'failure', 'success']
    };

    this.initialized = false;
  }

  /**
   * Initialize the learning pipeline
   */
  async initialize(arbiters = {}) {
    console.log(`[${this.name}] 🧠 Initializing Universal Learning Pipeline...`);

    // Connect to arbiters
    this.mnemonicArbiter = arbiters.mnemonic || null;
    this.adaptivePlanner = arbiters.planner || null;
    this.tribrain = arbiters.tribrain || null;

    // Initialize sub-systems
    await this.outcomeTracker.initialize();
    await this.experienceBuffer.initialize(); // Register as Arbiter

    // Load existing experiences from disk
    const storageDir = this.config.storageDir || process.cwd() + '/.soma';
    const experiencesDir = storageDir + '/experiences';
    const loadResult = await this.experienceBuffer.loadExperiences(experiencesDir);
    if (loadResult.success && loadResult.count > 0) {
      console.log(`[${this.name}]    ✅ Loaded ${loadResult.count} experiences from disk`);
      this.stats.totalExperiences = loadResult.count;
    }

    // Start auto-save for experiences (every 5 minutes)
    this.experienceBuffer.startAutoSave(300000, experiencesDir);

    console.log(`[${this.name}]    ✅ ExperienceReplayBuffer ready (capacity: ${this.experienceBuffer.config.maxSize})`);
    console.log(`[${this.name}]    ✅ OutcomeTracker ready (storage: ${this.outcomeTracker.config.storageDir})`);

    if (this.mnemonicArbiter) {
      console.log(`[${this.name}]    ✅ Connected to MnemonicArbiter`);
    }

    if (this.adaptivePlanner) {
      console.log(`[${this.name}]    ✅ Connected to AdaptiveLearningPlanner`);
    }

    if (this.tribrain) {
      console.log(`[${this.name}]    ✅ Connected to TriBrain`);
    }

    // Set up event listeners
    this.setupEventListeners();

    this.initialized = true;
    console.log(`[${this.name}] ✅ Universal Learning Pipeline ready - ALL interactions will be learned from!`);

    this.emit('initialized', { stats: this.stats });
  }

  /**
   * Log an interaction - THE MAIN ENTRY POINT
   * Call this for EVERY user query, arbiter decision, task execution
   */
  async logInteraction(interaction) {
    if (!this.initialized) {
      console.warn(`[${this.name}] Not initialized yet, buffering interaction`);
      return;
    }

    const timestamp = Date.now();
    this.stats.totalInteractions++;

    // Standardize interaction format
    const standardized = {
      id: `interaction_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp,
      type: interaction.type || 'unknown',
      agent: interaction.agent || 'unknown',
      input: interaction.input || null,
      output: interaction.output || null,
      context: interaction.context || {},
      metadata: interaction.metadata || {},
      ...interaction
    };

    // Add to interaction log
    this.interactionLog.push(standardized);
    if (this.interactionLog.length > this.maxLogSize) {
      this.interactionLog.shift(); // Remove oldest
    }

    // Process in parallel
    await Promise.all([
      this.storeAsExperience(standardized),
      this.trackOutcome(standardized),
      this.storeInMemory(standardized),
      this.updateLearningPlanner(standardized)
    ]);

    // Emit event for real-time learning
    this.emit('interaction', standardized);

    // 🧠 KNOWLEDGE EXTRACTION: Extract concepts and notify LearningVelocityTracker
    if (this.messageBroker && standardized.input && standardized.output) {
      try {
        // Extract potential concepts from the interaction
        const concepts = this._extractConceptsFromInteraction(standardized);

        if (concepts.length > 0) {
          for (const concept of concepts) {
            await this.messageBroker.sendMessage({
              from: this.name,
              to: 'LearningVelocityTracker',
              type: 'knowledge_acquired',
              payload: {
                concept: concept.name,
                domain: concept.domain || 'general',
                confidence: concept.confidence || 0.7,
                size: JSON.stringify(standardized).length,
                source: 'interaction_log',
                timestamp,
                interaction_id: standardized.id
              }
            });
          }
        }
      } catch (err) {
        console.warn(`[${this.name}] Failed to extract concepts: ${err.message}`);
      }
    }

    // Check if we should trigger learning
    this.checkLearningTriggers();

    return standardized.id;
  }

  /**
   * Store interaction as experience for reinforcement learning
   */
  async storeAsExperience(interaction) {
    try {
      // Convert interaction to experience format
      // Trim state to prevent bloat — only store summary of recent interactions, not full text
      const recentSummary = this.interactionLog.slice(-5).map(i => ({
        type: i.type,
        agent: i.agent,
        timestamp: i.timestamp
      }));
      // Truncate helper — handles both strings and objects safely
      const truncate = (val, limit) => {
        if (val === null || val === undefined) return null;
        if (typeof val === 'string') return val.substring(0, limit);
        // For objects, stringify and truncate to prevent storing huge contexts
        try { return JSON.stringify(val).substring(0, limit); } catch { return String(val).substring(0, limit); }
      };
      const experience = {
        state: {
          // Strip context to avoid storing enrichedContext (history, recentLearnings, etc.)
          context: { sessionId: interaction.context?.sessionId, brain: interaction.context?.brain },
          timestamp: interaction.timestamp,
          recentInteractions: recentSummary
        },
        action: interaction.type,
        agent: interaction.agent,
        outcome: truncate(interaction.output, 300),
        reward: this.calculateReward(interaction),
        nextState: null, // Will be filled by next interaction
        metadata: {
          input: truncate(interaction.input, 200),
          ...interaction.metadata
        }
      };

      this.experienceBuffer.addExperience(experience);
      this.stats.totalExperiences++;

      console.log(`[${this.name}] 📝 Experience stored: ${interaction.type} (reward: ${experience.reward.toFixed(2)})`);
    } catch (error) {
      console.error(`[${this.name}] Failed to store experience:`, error.message);
    }
  }

  /**
   * Track outcome for learning
   */
  async trackOutcome(interaction) {
    try {
      const outcome = {
        agent: interaction.agent,
        action: interaction.type,
        result: interaction.output,
        reward: this.calculateReward(interaction),
        success: this.isSuccessful(interaction),
        context: interaction.context,
        metadata: interaction.metadata
      };

      await this.outcomeTracker.recordOutcome(outcome);
      this.stats.totalOutcomes++;
    } catch (error) {
      console.error(`[${this.name}] Failed to track outcome:`, error.message);
    }
  }

  /**
   * Store in long-term memory
   */
  async storeInMemory(interaction) {
    if (!this.mnemonicArbiter) return;

    try {
      // Determine importance
      const importance = this.calculateImportance(interaction);

      // Only store important interactions
      if (importance > 0.3) {
        const memoryContent = JSON.stringify({
          type: interaction.type,
          input: interaction.input,
          output: interaction.output,
          context: interaction.context
        });

        await this.mnemonicArbiter.remember(memoryContent, {
          importance,
          category: 'interaction',
          agent: interaction.agent,
          timestamp: interaction.timestamp,
          ...interaction.metadata
        });

        this.stats.totalMemories++;
        console.log(`[${this.name}] 💾 Stored in memory (importance: ${importance.toFixed(2)})`);
      }
    } catch (error) {
      console.error(`[${this.name}] Failed to store in memory:`, error.message);
    }
  }

  /**
   * Update adaptive learning planner
   */
  async updateLearningPlanner(interaction) {
    if (!this.adaptivePlanner) return;

    try {
      // Extract learning signals
      const learningSignal = {
        topic: interaction.type,
        outcome: interaction.output,
        success: this.isSuccessful(interaction),
        timestamp: interaction.timestamp
      };

      // This would call the planner's update method
      // For now, just emit event
      this.emit('learning_signal', learningSignal);
    } catch (error) {
      console.error(`[${this.name}] Failed to update learning planner:`, error.message);
    }
  }

  /**
   * Calculate reward for reinforcement learning
   */
  calculateReward(interaction) {
    let reward = 0;

    // Positive rewards
    if (interaction.metadata && interaction.metadata.success) reward += 1.0;
    if (interaction.metadata && interaction.metadata.userSatisfaction) reward += interaction.metadata.userSatisfaction;
    if (interaction.metadata && interaction.metadata.taskCompleted) reward += 0.5;
    if (interaction.metadata && interaction.metadata.efficient) reward += 0.3;

    // Negative rewards
    if (interaction.metadata && interaction.metadata.error) reward -= 1.0;
    if (interaction.metadata && interaction.metadata.slow) reward -= 0.2;
    if (interaction.metadata && interaction.metadata.userCorrected) reward -= 0.5;

    // Response quality
    if (interaction.output) {
      const outputLength = JSON.stringify(interaction.output).length;
      if (outputLength > 0 && outputLength < 10000) reward += 0.1; // Reasonable output
      if (outputLength === 0) reward -= 0.5; // Empty output
    }

    return Math.max(-2, Math.min(2, reward)); // Clamp to [-2, 2]
  }

  /**
   * Calculate importance for memory storage
   */
  calculateImportance(interaction) {
    let importance = 0.5; // Base importance

    // High importance triggers
    if (interaction.metadata && interaction.metadata.critical) importance += 0.3;
    if (interaction.metadata && interaction.metadata.userQuery) importance += 0.2;
    if (interaction.metadata && interaction.metadata.error) importance += 0.3;
    if (interaction.metadata && interaction.metadata.success) importance += 0.1;
    if (interaction.metadata && interaction.metadata.novel) importance += 0.2;

    // Recency bonus
    const age = Date.now() - interaction.timestamp;
    if (age < 3600000) importance += 0.1; // Last hour

    return Math.max(0, Math.min(1, importance)); // Clamp to [0, 1]
  }

  /**
   * Determine if interaction was successful
   */
  isSuccessful(interaction) {
    if (interaction.metadata && interaction.metadata.success !== undefined) {
      return interaction.metadata.success;
    }

    // Heuristics
    if (interaction.metadata && interaction.metadata.error) return false;
    if (interaction.output && !(interaction.metadata && interaction.metadata.error)) return true;

    return null; // Unknown
  }

  /**
   * Check if we should trigger a learning session
   */
  checkLearningTriggers() {
    const experienceCount = this.experienceBuffer.experiences.length;

    // Trigger on experience threshold
    if (experienceCount >= this.learningTriggers.experienceThreshold) {
      this.emit('trigger_learning', {
        reason: 'experience_threshold',
        experienceCount
      });
    }

    // Trigger on time
    const timeSinceLastLearning = Date.now() - (this.stats.lastLearningSession || 0);
    if (timeSinceLastLearning >= this.learningTriggers.timeThreshold) {
      this.emit('trigger_learning', {
        reason: 'time_threshold',
        timeSinceLastLearning
      });
    }
  }

  /**
   * Sample experiences for learning
   */
  sampleExperiences(count = 100, strategy = 'prioritized') {
    try {
      return this.experienceBuffer.sample(count, strategy);
    } catch (error) {
      // Not enough experiences yet - return empty array
      console.log(`[${this.name}] Cannot sample yet: ${error.message}`);
      return { experiences: [], indices: [], weights: [] };
    }
  }

  /**
   * Get recent outcomes
   */
  getRecentOutcomes(count = 100) {
    try {
      return this.outcomeTracker.queryOutcomes({ limit: count, sortBy: 'timestamp', order: 'desc' });
    } catch (error) {
      console.log(`[${this.name}] Cannot get outcomes: ${error.message}`);
      return [];
    }
  }

  /**
   * Get learning statistics
   */
  getStats() {
    return {
      ...this.stats,
      experienceBufferSize: this.experienceBuffer.experiences.length,
      outcomeTrackerSize: this.outcomeTracker.outcomes.size,
      interactionLogSize: this.interactionLog.length,
      learningRate: this.stats.totalInteractions > 0
        ? this.stats.totalMemories / this.stats.totalInteractions
        : 0
    };
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Listen for learning triggers
    this.on('trigger_learning', async (data) => {
      console.log(`[${this.name}] 🎓 Learning triggered: ${data.reason}`);
      this.stats.lastLearningSession = Date.now();

      // Emit for nighttime learning to pick up
      this.emit('learning_ready', {
        experiences: this.sampleExperiences(500),
        outcomes: this.getRecentOutcomes(500),
        stats: this.getStats()
      });
    });
  }

  /**
   * Extract concepts from an interaction for knowledge graph
   * Simple keyword-based extraction - can be enhanced with NLP
   */
  _extractConceptsFromInteraction(interaction) {
    const concepts = [];

    try {
      const text = `${interaction.input} ${interaction.output}`.toLowerCase();

      // Domain keywords mapping
      const domainKeywords = {
        'programming': ['code', 'function', 'variable', 'class', 'api', 'debug', 'error', 'programming'],
        'ai': ['ai', 'machine learning', 'neural', 'model', 'training', 'inference', 'llm'],
        'data': ['data', 'database', 'query', 'sql', 'storage', 'cache'],
        'system': ['system', 'process', 'memory', 'cpu', 'performance', 'optimization'],
        'learning': ['learn', 'pattern', 'knowledge', 'understand', 'remember']
      };

      // Detect domains
      for (const [domain, keywords] of Object.entries(domainKeywords)) {
        for (const keyword of keywords) {
          if (text.includes(keyword)) {
            concepts.push({
              name: keyword,
              domain,
              confidence: 0.7,
              source: 'keyword_extraction'
            });
            break; // One per domain to avoid duplication
          }
        }
      }

      // Extract capitalized terms (likely proper nouns/concepts)
      const capitalizedTerms = (interaction.input || '').match(/\b[A-Z][a-z]+(?:[A-Z][a-z]+)*\b/g) || [];
      for (const term of capitalizedTerms.slice(0, 3)) { // Limit to 3
        if (term.length > 3) { // Skip short words
          concepts.push({
            name: term,
            domain: 'general',
            confidence: 0.6,
            source: 'proper_noun_extraction'
          });
        }
      }

    } catch (err) {
      console.warn(`[${this.name}] Concept extraction error: ${err.message}`);
    }

    return concepts.slice(0, 5); // Limit to top 5 concepts per interaction
  }

  /**
   * Shutdown
   */
  async shutdown() {
    console.log(`[${this.name}] Shutting down learning pipeline...`);

    // Stop auto-save and do final save for experiences
    const storageDir = this.config.storageDir || process.cwd() + '/.soma';
    const experiencesDir = storageDir + '/experiences';
    await this.experienceBuffer.stopAutoSave(experiencesDir);

    // Persist outcomes
    await this.outcomeTracker.persistOutcomes();

    console.log(`[${this.name}] ✅ All learning data persisted`);
    this.emit('shutdown');
  }
}

export default UniversalLearningPipeline;
