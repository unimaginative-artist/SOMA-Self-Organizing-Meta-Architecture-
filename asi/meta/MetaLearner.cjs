/**
 * MetaLearner.cjs - The "Brain's Coach"
 * 
 * Responsible for "Learning to Learn".
 * Sits above the StrategyOptimizer and tunes the learning process itself.
 * 
 * Capabilities:
 * 1. Transfer Learning: Applies successful strategies from one domain to similar domains.
 * 2. Hyperparameter Tuning: Adjusts the exploration/exploitation balance (epsilon) based on system maturity.
 * 3. Learning Velocity Analysis: Detects if the system is learning faster or slower.
 */

class MetaLearner {
  constructor(config = {}) {
    this.strategyOptimizer = null;
    this.outcomeTracker = null;
    
    this.state = {
      maturityLevel: 0, // 0.0 to 1.0 (Novice to Expert)
      learningVelocity: [],
      transferMap: new Map() // sourceDomain -> [targetDomains]
    };

    // Configuration
    this.config = {
      minMaturityForTransfer: 0.3,
      velocityWindow: 50,
      ...config
    };
  }

  async initialize() {
    console.log('[MetaLearner] 🧠 Initializing Meta-Learning Subsystem...');
    
    // Dynamic imports for ES modules
    try {
      const { getStrategyOptimizer } = await import('../../arbiters/StrategyOptimizer.js');
      const { getOutcomeTracker } = await import('../../arbiters/OutcomeTracker.js');
      
      this.strategyOptimizer = getStrategyOptimizer();
      this.outcomeTracker = getOutcomeTracker();
      
      await this.strategyOptimizer.initialize();
      await this.outcomeTracker.initialize();
    } catch (error) {
      console.warn('[MetaLearner] ⚠️ Could not load StrategyOptimizer/OutcomeTracker:', error.message);
      // Create mock implementations to prevent crashes
      this.strategyOptimizer = {
        initialize: async () => {},
        getStats: () => ({ totalRecommendations: 0, successfulRecommendations: 0 }),
        getDomainStats: () => null,
        recordOutcome: () => {},
        config: { epsilonGreedy: 0.1, decayFactor: 0.95 }
      };
      this.outcomeTracker = {
        initialize: async () => {}
      };
    }
    
    // Analyze historical data to set initial state
    await this.assessSystemMaturity();
    console.log(`[MetaLearner] ✅ System Maturity: ${(this.state.maturityLevel * 100).toFixed(1)}%`);
  }

  /**
   * Assess how "mature" the system is based on successful outcomes.
   * Higher maturity = Less random exploration, more exploitation.
   */
  async assessSystemMaturity() {
    const stats = this.strategyOptimizer.getStats();
    
    if (stats.totalRecommendations < 10) {
      this.state.maturityLevel = 0.1; // Novice
    } else {
      // Calculate sigmoid function of success rate * volume
      const successVolume = stats.successfulRecommendations;
      this.state.maturityLevel = 1 / (1 + Math.exp(-0.01 * (successVolume - 50)));
    }

    // Tune the optimizer's parameters based on maturity
    this.tuneHyperparameters();
  }

  /**
   * Adjust StrategyOptimizer's exploration parameters dynamically
   */
  tuneHyperparameters() {
    // As maturity increases, reduce random exploration (epsilon)
    // Novice: 0.2 (20% random) -> Expert: 0.05 (5% random)
    const newEpsilon = 0.2 - (0.15 * this.state.maturityLevel);
    
    this.strategyOptimizer.config.epsilonGreedy = Math.max(0.05, newEpsilon);
    
    // As maturity increases, trust recent data more (higher decay factor)
    // Novice: 0.90 -> Expert: 0.99
    this.strategyOptimizer.config.decayFactor = 0.90 + (0.09 * this.state.maturityLevel);
    
    console.log(`[MetaLearner] 🔧 Tuned Hyperparameters: Epsilon=${newEpsilon.toFixed(3)}, Decay=${this.strategyOptimizer.config.decayFactor.toFixed(3)}`);
  }

  /**
   * Attempt to transfer knowledge from a source domain to a target domain.
   * e.g., If 'memoization' works for 'sorting', try it for 'searching'.
   */
  async transferKnowledge(sourceDomain, targetDomain) {
    if (this.state.maturityLevel < this.config.minMaturityForTransfer) {
      return { success: false, reason: 'System too immature for transfer learning' };
    }

    const sourceStats = this.strategyOptimizer.getDomainStats(sourceDomain);
    if (!sourceStats || sourceStats.strategies.length === 0) {
      return { success: false, reason: 'Source domain has no data' };
    }

    console.log(`[MetaLearner] 🔄 Attempting Transfer: ${sourceDomain} -> ${targetDomain}`);

    // Get top strategies from source
    const topStrategies = sourceStats.strategies
      .filter(s => s.successRate > 0.7) // Only high performing strategies
      .map(s => s.name);

    if (topStrategies.length === 0) {
      return { success: false, reason: 'No high-quality strategies to transfer' };
    }

    // Seed the target domain with these strategies (give them a small "bonus" to encourage exploration)
    for (const strategy of topStrategies) {
      // We "fake" a small positive outcome to jumpstart UCB1 exploration for this strategy in the new domain
      // This is the mathematical equivalent of "giving it a try because it worked elsewhere"
      this.strategyOptimizer.recordOutcome(targetDomain, strategy, {
        success: true,
        reward: 0.5, // Small positive reward
        context: { transfer: true, source: sourceDomain }
      });
    }

    return { 
      success: true, 
      transferred: topStrategies,
      count: topStrategies.length 
    };
  }

  /**
   * Main entry point for the ASI Orchestrator to trigger meta-learning
   */
  async runOptimizationCycle() {
    await this.assessSystemMaturity();
    
    // Check for transfer opportunities
    // For now, hardcoded mappings, but this could be learned
    const transferMap = [
      ['code_optimization', 'query_optimization'],
      ['data_compression', 'memory_consolidation']
    ];

    const results = [];
    for (const [source, target] of transferMap) {
      const res = await this.transferKnowledge(source, target);
      if (res.success) results.push(res);
    }

    return {
      maturity: this.state.maturityLevel,
      transfers: results
    };
  }
}

module.exports = MetaLearner;
