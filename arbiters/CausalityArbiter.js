/**
 * CausalityArbiter.js
 *
 * Builds causal models from experience to understand "why" things happen.
 * Distinguishes correlation from causation and enables counterfactual reasoning.
 *
 * This is a critical component for AGI - without causality, SOMA can only
 * correlate patterns but can't truly understand or predict outcomes.
 *
 * Key Capabilities:
 * - Causal graph construction from observations
 * - Intervention vs observation distinction
 * - Counterfactual reasoning ("what if I had done X?")
 * - Causal hypothesis generation and testing
 */

import { EventEmitter } from 'events';
import { promises as fs } from 'fs';
import path from 'path';

export class CausalityArbiter extends EventEmitter {
  constructor(config = {}) {
    super();

    this.name = config.name || 'CausalityArbiter';
    this.messageBroker = config.messageBroker || null;

    this.config = {
      minObservations: 10,          // Min observations before inferring causation
      confidenceThreshold: 0.7,     // Min confidence for causal link
      interventionWeight: 2.0,      // Weight interventions higher than observations
      decayRate: 0.95,              // Decay old causal beliefs
      maxGraphSize: 1000,           // Max nodes in causal graph
      ...config
    };

    // Causal graph: Map of node -> { causes: [], effects: [], strength: {} }
    this.causalGraph = new Map();

    // Observation history: Track co-occurrences
    this.observations = new Map(); // Map of "A,B" -> { count, contexts }

    // Intervention history: Track deliberate actions and outcomes
    this.interventions = [];

    // Counterfactuals: "What if" scenarios
    this.counterfactuals = new Map();

    // Causal hypotheses being tested
    this.hypotheses = [];

    // Statistics
    this.stats = {
      totalObservations: 0,
      totalInterventions: 0,
      causalLinksDiscovered: 0,
      hypothesesTested: 0
    };

    console.log('🔗 [CausalityArbiter] Initialized');
  }

  /**
   * Initialize the arbiter
   */
  async initialize({ experienceBuffer, metaLearning, mnemonic } = {}) {
    this.experienceBuffer = experienceBuffer;
    this.metaLearning = metaLearning;
    this.mnemonic = mnemonic;

    // Load existing causal graph
    await this.loadCausalGraph();

    // Register with MessageBroker
    if (this.messageBroker) {
      try {
        this.messageBroker.registerArbiter(this.name, this, {
          type: 'causality',
          capabilities: ['observe', 'recordIntervention', 'queryCausalChains', 'generateCounterfactual']
        });
        console.log(`🔗 [${this.name}] Registered with MessageBroker`);
      } catch (error) {
        console.error(`❌ [${this.name}] Failed to register with MessageBroker:`, error.message);
      }
    }

    console.log('✅ [CausalityArbiter] Ready');
    console.log(`   📊 Causal nodes: ${this.causalGraph.size}`);
    console.log(`   🔗 Causal links: ${this.stats.causalLinksDiscovered}`);

    return true;
  }

  /**
   * Observe an event and update causal model
   * @param {Object} observation - { event: string, context: Object, outcome: Object }
   */
  async observe(observation) {
    const { event, context = {}, outcome = {} } = observation;

    this.stats.totalObservations++;

    // Extract relevant variables from context
    const variables = this.extractVariables(context);

    // Track co-occurrence with outcome
    for (const variable of variables) {
      const key = `${variable},${JSON.stringify(outcome)}`;

      if (!this.observations.has(key)) {
        // Check map size limit before adding new entry (memory leak fix)
        if (this.observations.size >= 50000) {
          this._pruneObservations();
        }
        this.observations.set(key, { count: 0, contexts: [] });
      }

      const obs = this.observations.get(key);
      obs.count++;
      obs.contexts.push({ timestamp: Date.now(), context });

      // Limit stored contexts
      if (obs.contexts.length > 100) {
        obs.contexts.shift();
      }
    }

    // Check if we have enough data to infer causation
    if (this.stats.totalObservations % this.config.minObservations === 0) {
      await this.inferCausalLinks();
    }
  }

  /**
   * Prune low-count observations to prevent unbounded growth
   * @private
   */
  _pruneObservations() {
    // Convert to array and sort by count
    const entries = Array.from(this.observations.entries());
    entries.sort((a, b) => a[1].count - b[1].count);

    // Remove bottom 10% (lowest count observations, likely noise)
    const toRemove = Math.floor(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.observations.delete(entries[i][0]);
    }

    console.log(`[${this.name}] Pruned ${toRemove} low-count observations (${this.observations.size} remaining)`);
  }

  /**
   * Record an intervention (deliberate action) and its outcome
   * This is MORE valuable than observation for causal inference
   * @param {Object} intervention - { action: string, context: Object, outcome: Object, success: boolean }
   */
  async recordIntervention(intervention) {
    const { action, context = {}, outcome = {}, success = false } = intervention;

    this.stats.totalInterventions++;

    // Store intervention
    this.interventions.push({
      action,
      context,
      outcome,
      success,
      timestamp: Date.now()
    });

    // Limit stored interventions
    if (this.interventions.length > 1000) {
      this.interventions.shift();
    }

    // Update causal graph with strong evidence
    await this.updateCausalGraphFromIntervention(action, outcome, success);

    // Check if this confirms or refutes any hypotheses
    await this.testHypotheses(intervention);
  }

  /**
   * Update causal graph from intervention data
   */
  async updateCausalGraphFromIntervention(action, outcome, success) {
    // Ensure nodes exist
    if (!this.causalGraph.has(action)) {
      this.causalGraph.set(action, { causes: [], effects: [], strength: {} });
    }

    const outcomeKey = JSON.stringify(outcome);
    if (!this.causalGraph.has(outcomeKey)) {
      this.causalGraph.set(outcomeKey, { causes: [], effects: [], strength: {} });
    }

    // Add causal link: action → outcome
    const actionNode = this.causalGraph.get(action);
    const outcomeNode = this.causalGraph.get(outcomeKey);

    if (!actionNode.effects.includes(outcomeKey)) {
      actionNode.effects.push(outcomeKey);
    }

    if (!outcomeNode.causes.includes(action)) {
      outcomeNode.causes.push(action);
    }

    // Update strength (interventions weighted higher)
    const currentStrength = actionNode.strength[outcomeKey] || 0;
    const delta = success ? 1 : -0.5; // Success increases, failure decreases
    actionNode.strength[outcomeKey] = Math.max(0, Math.min(1,
      currentStrength + (delta * this.config.interventionWeight) / 10
    ));

    this.stats.causalLinksDiscovered++;

    console.log(`🔗 [Causality] ${action} → ${outcomeKey.substring(0, 50)} (strength: ${actionNode.strength[outcomeKey].toFixed(2)})`);
  }

  /**
   * Infer causal links from observational data
   * Uses temporal precedence and conditional probability + BRAIN VALIDATION
   */
  async inferCausalLinks() {
    this.log('info', `Checking ${this.observations.size} observation pairs for causal patterns...`);
    
    for (const [key, obs] of this.observations.entries()) {
      if (obs.count < this.config.minObservations) continue;

      const [variable, outcomeStr] = key.split(',', 2);

      // Calculate P(outcome | variable) vs P(outcome)
      const pOutcomeGivenVar = this.calculateConditionalProbability(variable, outcomeStr);
      const pOutcome = this.calculateBaseProbability(outcomeStr);

      // If P(outcome | variable) > P(outcome), there's likely a causal relationship
      if (pOutcomeGivenVar > pOutcome * 1.5) { // 50% increase suggests causation
        const confidence = Math.min(0.9, (pOutcomeGivenVar - pOutcome) / pOutcome);

        if (confidence >= this.config.confidenceThreshold) {
          // --- HIGH-END UPGRADE: Brain Validation ---
          // Ask Prometheus to explain the link before accepting it
          const explanation = await this._verifyLinkWithBrain(variable, outcomeStr);
          
          if (explanation.logical) {
            console.log(`✅ [Causality] Brain confirmed link: ${variable} -> ${outcomeStr}`);
            await this.addCausalLink(variable, outcomeStr, confidence * explanation.weight, explanation.reasoning);
          } else {
            console.log(`❌ [Causality] Brain rejected link: ${variable} -> ${outcomeStr} (Reason: ${explanation.reasoning})`);
          }
        }
      }
    }
  }

  /**
   * Use SomaBrain to verify if a statistical correlation is logically sound.
   */
  async _verifyLinkWithBrain(cause, effect) {
    if (!this.messageBroker) return { logical: true, weight: 0.7, reasoning: 'No broker' };

    try {
        const prompt = `[CAUSAL ANALYSIS]
        I have detected a statistical correlation: "${cause}" often precedes "${effect}".
        
        TASK:
        Evaluate if this is likely a real CAUSAL relationship or just noise.
        
        Return JSON:
        {
          "is_logical": true/false,
          "reasoning": "brief explanation",
          "causal_weight": 0.1-1.0
        }`;

        // Find the brain via broker
        const response = await this.messageBroker.sendMessage({
            to: 'SomaBrain',
            type: 'reason',
            payload: { query: prompt, context: { mode: 'fast', brain: 'PROMETHEUS' } }
        });

        if (response && response.text) {
            const cleanText = response.text.replace(/```json/g, '').replace(/```/g, '').trim();
            const result = JSON.parse(cleanText);
            return {
                logical: result.is_logical,
                weight: result.causal_weight || 0.7,
                reasoning: result.reasoning
            };
        }
    } catch (e) {
        console.warn(`[Causality] Brain verification failed: ${e.message}`);
    }
    return { logical: true, weight: 0.7, reasoning: 'Fallback to statistical only' };
  }

  /**
   * Add a causal link to the graph
   */
  async addCausalLink(cause, effect, strength, reasoning = '') {
    if (!this.causalGraph.has(cause)) {
      this.causalGraph.set(cause, { causes: [], effects: [], strength: {}, reasoning: {} });
    }
    if (!this.causalGraph.has(effect)) {
      this.causalGraph.set(effect, { causes: [], effects: [], strength: {}, reasoning: {} });
    }

    const causeNode = this.causalGraph.get(cause);
    const effectNode = this.causalGraph.get(effect);

    if (!causeNode.effects.includes(effect)) {
      causeNode.effects.push(effect);
    }
    if (!effectNode.causes.includes(cause)) {
      effectNode.causes.push(cause);
    }

    causeNode.strength[effect] = strength;
    if (reasoning) {
        causeNode.reasoning[effect] = reasoning;
    }

    this.emit('causalLinkDiscovered', { cause, effect, strength, reasoning });
  }

  log(level, msg) {
      console.log(`[${level.toUpperCase()}] [${this.name}] ${msg}`);
  }

  /**
   * Generate counterfactual: "What if I had done X instead of Y?"
   * @param {Object} situation - { actualAction: string, context: Object, actualOutcome: Object }
   * @param {string} alternativeAction - What action to consider instead
   * @returns {Object} - Predicted outcome and confidence
   */
  generateCounterfactual(situation, alternativeAction) {
    const { actualAction, context, actualOutcome } = situation;

    // Predict outcome of alternative action using causal graph
    const predicted = this.predictOutcome(alternativeAction, context);

    // Store counterfactual for learning
    const counterfactual = {
      actualAction,
      alternativeAction,
      context,
      actualOutcome,
      predictedOutcome: predicted.outcome,
      confidence: predicted.confidence,
      timestamp: Date.now()
    };

    const key = `${actualAction}→${alternativeAction}`;
    if (!this.counterfactuals.has(key)) {
      this.counterfactuals.set(key, []);
    }
    this.counterfactuals.get(key).push(counterfactual);

    console.log(`🤔 [Counterfactual] What if "${alternativeAction}" instead of "${actualAction}"?`);
    console.log(`   Predicted: ${JSON.stringify(predicted.outcome).substring(0, 100)}`);
    console.log(`   Confidence: ${(predicted.confidence * 100).toFixed(1)}%`);

    return counterfactual;
  }

  /**
   * Predict outcome of an action given context
   * @param {string} action
   * @param {Object} context
   * @returns {Object} - { outcome: Object, confidence: number }
   */
  predictOutcome(action, context) {
    if (!this.causalGraph.has(action)) {
      return { outcome: {}, confidence: 0 };
    }

    const actionNode = this.causalGraph.get(action);

    // Find most likely outcome based on causal strengths and context
    let bestOutcome = null;
    let bestStrength = 0;

    for (const effect of actionNode.effects) {
      const strength = actionNode.strength[effect] || 0;
      if (strength > bestStrength) {
        bestStrength = strength;
        try {
          bestOutcome = JSON.parse(effect);
        } catch (e) {
          bestOutcome = { result: effect };
        }
      }
    }

    return {
      outcome: bestOutcome || {},
      confidence: bestStrength
    };
  }

  /**
   * Generate a causal hypothesis to test
   * @returns {Object} - Hypothesis to test
   */
  generateHypothesis() {
    // Find variables that co-occur but don't have confirmed causal link
    const candidates = [];

    for (const [key, obs] of this.observations.entries()) {
      if (obs.count < this.config.minObservations) continue;

      const [variable, outcome] = key.split(',', 2);

      // Check if already have strong causal link
      const node = this.causalGraph.get(variable);
      if (node && node.strength[outcome] > 0.8) continue;

      candidates.push({
        cause: variable,
        effect: outcome,
        observationCount: obs.count
      });
    }

    // Pick highest observation count
    if (candidates.length === 0) return null;

    candidates.sort((a, b) => b.observationCount - a.observationCount);
    const hypothesis = candidates[0];

    hypothesis.id = `hyp_${Date.now()}`;
    hypothesis.generated = Date.now();
    hypothesis.status = 'pending';

    this.hypotheses.push(hypothesis);

    console.log(`💡 [Hypothesis] Does "${hypothesis.cause}" cause "${hypothesis.effect.substring(0, 50)}"?`);

    return hypothesis;
  }

  /**
   * Test hypotheses against new intervention data
   */
  async testHypotheses(intervention) {
    for (const hypothesis of this.hypotheses) {
      if (hypothesis.status !== 'pending') continue;

      const { action, outcome } = intervention;
      const outcomeStr = JSON.stringify(outcome);

      if (hypothesis.cause === action && hypothesis.effect === outcomeStr) {
        // Hypothesis confirmed!
        hypothesis.status = 'confirmed';
        hypothesis.confirmedAt = Date.now();

        this.stats.hypothesesTested++;

        console.log(`✅ [Hypothesis Confirmed] "${hypothesis.cause}" → "${hypothesis.effect.substring(0, 50)}"`);

        this.emit('hypothesisConfirmed', hypothesis);
      }
    }
  }

  /**
   * Query causal chains starting from a concept/keyword
   * This is the method QuadBrain uses for causal reasoning!
   * @param {string} concept - Starting concept (e.g., "exercise", "stress", "learning")
   * @param {Object} options - { maxDepth: 2, minConfidence: 0.3 }
   * @returns {Array} - Causal chains [{ cause, effect, confidence, depth }]
   */
  queryCausalChains(concept, options = {}) {
    const { maxDepth = 2, minConfidence = 0.3 } = options;
    const chains = [];

    // Find all nodes matching the concept (fuzzy match)
    const matchingNodes = [];
    for (const nodeId of this.causalGraph.keys()) {
      if (nodeId.toLowerCase().includes(concept.toLowerCase())) {
        matchingNodes.push(nodeId);
      }
    }

    if (matchingNodes.length === 0) {
      console.log(`🔗 [Causality] No causal chains found for "${concept}"`);
      return [];
    }

    // Traverse causal graph from each matching node
    for (const startNode of matchingNodes) {
      this._traverseCausalChains(startNode, [], chains, maxDepth, minConfidence);
    }

    // Sort by confidence
    chains.sort((a, b) => b.confidence - a.confidence);

    console.log(`🔗 [Causality] Found ${chains.length} causal chains for "${concept}"`);
    return chains.slice(0, 10); // Return top 10
  }

  /**
   * Recursively traverse causal chains
   * @private
   */
  _traverseCausalChains(currentNode, path, chains, maxDepth, minConfidence, depth = 0) {
    if (depth >= maxDepth) return;

    const node = this.causalGraph.get(currentNode);
    if (!node) return;

    // Explore effects (what this causes)
    for (const effect of node.effects) {
      const strength = node.strength[effect] || 0;

      if (strength >= minConfidence) {
        // Add this causal link
        chains.push({
          cause: currentNode,
          effect: effect,
          confidence: strength,
          depth: depth + 1,
          path: [...path, currentNode]
        });

        // Continue traversing (multi-hop causality)
        if (depth + 1 < maxDepth) {
          this._traverseCausalChains(effect, [...path, currentNode], chains, maxDepth, minConfidence, depth + 1);
        }
      }
    }
  }

  /**
   * Get causal explanation for an outcome
   * @param {Object} outcome
   * @returns {Array} - List of likely causes with confidence
   */
  explainOutcome(outcome) {
    const outcomeKey = JSON.stringify(outcome);

    if (!this.causalGraph.has(outcomeKey)) {
      return [];
    }

    const outcomeNode = this.causalGraph.get(outcomeKey);
    const explanations = [];

    for (const cause of outcomeNode.causes) {
      const causeNode = this.causalGraph.get(cause);
      const strength = causeNode?.strength[outcomeKey] || 0;

      if (strength > 0.3) {
        explanations.push({
          cause,
          confidence: strength,
          type: this.interventions.some(i => i.action === cause) ? 'intervention' : 'observation'
        });
      }
    }

    // Sort by confidence
    explanations.sort((a, b) => b.confidence - a.confidence);

    return explanations;
  }

  /**
   * Extract variables from context
   */
  extractVariables(context) {
    const variables = [];

    for (const [key, value] of Object.entries(context)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        variables.push(`${key}:${value}`);
      }
    }

    return variables;
  }

  /**
   * Calculate conditional probability P(outcome | variable)
   */
  calculateConditionalProbability(variable, outcome) {
    const key = `${variable},${outcome}`;
    const obs = this.observations.get(key);
    if (!obs) return 0;

    // Count total observations with this variable
    let totalWithVariable = 0;
    for (const [k, o] of this.observations.entries()) {
      if (k.startsWith(variable + ',')) {
        totalWithVariable += o.count;
      }
    }

    return totalWithVariable > 0 ? obs.count / totalWithVariable : 0;
  }

  /**
   * Calculate base probability P(outcome)
   */
  calculateBaseProbability(outcome) {
    let totalOutcomeCount = 0;
    let totalCount = 0;

    for (const [k, obs] of this.observations.entries()) {
      if (k.endsWith(',' + outcome)) {
        totalOutcomeCount += obs.count;
      }
      totalCount += obs.count;
    }

    return totalCount > 0 ? totalOutcomeCount / totalCount : 0;
  }

  /**
   * Load causal graph from disk
   */
  async loadCausalGraph() {
    try {
      const dataPath = path.join('SOMA', 'causality');
      await fs.mkdir(dataPath, { recursive: true });

      const graphPath = path.join(dataPath, 'causal-graph.json');
      const data = await fs.readFile(graphPath, 'utf8');
      const saved = JSON.parse(data);

      // Restore Map from JSON
      this.causalGraph = new Map(saved.graph);
      this.observations = new Map(saved.observations);
      this.interventions = saved.interventions || [];
      this.stats = saved.stats || this.stats;

      console.log('📂 [CausalityArbiter] Loaded existing causal graph');
    } catch (error) {
      // No existing graph, start fresh
      console.log('📂 [CausalityArbiter] Starting with empty causal graph');
    }
  }

  /**
   * Save causal graph to disk
   */
  async saveCausalGraph() {
    try {
      const dataPath = path.join('SOMA', 'causality');
      await fs.mkdir(dataPath, { recursive: true });

      const graphPath = path.join(dataPath, 'causal-graph.json');

      const data = {
        graph: Array.from(this.causalGraph.entries()),
        observations: Array.from(this.observations.entries()),
        interventions: this.interventions.slice(-1000), // Keep last 1000
        stats: this.stats,
        savedAt: new Date().toISOString()
      };

      await fs.writeFile(graphPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ [CausalityArbiter] Failed to save causal graph:', error);
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      ...this.stats,
      graphNodes: this.causalGraph.size,
      observations: this.observations.size,
      interventions: this.interventions.length,
      pendingHypotheses: this.hypotheses.filter(h => h.status === 'pending').length,
      confirmedHypotheses: this.hypotheses.filter(h => h.status === 'confirmed').length
    };
  }

  /**
   * Export causal graph for visualization
   */
  exportGraph() {
    const nodes = [];
    const edges = [];

    for (const [nodeId, node] of this.causalGraph.entries()) {
      nodes.push({
        id: nodeId,
        label: nodeId.substring(0, 30)
      });

      for (const effect of node.effects) {
        edges.push({
          from: nodeId,
          to: effect,
          strength: node.strength[effect] || 0
        });
      }
    }

    return { nodes, edges };
  }
}

export default CausalityArbiter;
