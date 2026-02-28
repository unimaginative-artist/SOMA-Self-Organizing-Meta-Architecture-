// FederatedLearning.cjs
// Federated learning orchestration and model aggregation

const fetch = require('node-fetch');
const EventEmitter = require('events');

class FederatedLearning extends EventEmitter {
  constructor(config = {}) {
    super();
    
    this.nodeId = config.nodeId;
    this.clusterNode = config.clusterNode;
    this.role = config.role || 'worker'; // 'coordinator' or 'worker'
    
    this.logger = config.logger || console;
    
    // Training state
    this.currentRound = 0;
    this.trainingInProgress = false;
    this.localModel = null;
    this.globalModel = null;
    
    // Aggregation (coordinator only)
    this.roundModels = new Map(); // nodeId -> model updates
    this.minParticipants = config.minParticipants || 1;
    
    // Training history
    this.history = [];
  }
  
  // === WORKER METHODS ===
  
  async trainLocal(trainingData, config = {}) {
    this.logger.info(`[FederatedLearning:${this.nodeId}] Starting local training...`);
    
    this.trainingInProgress = true;
    
    try {
      // Simulate local training
      const modelUpdates = await this._performLocalTraining(trainingData, config);
      
      const result = {
        nodeId: this.nodeId,
        round: this.currentRound,
        updates: modelUpdates,
        metrics: {
          samplesProcessed: trainingData.length,
          loss: Math.random() * 0.5, // Simulated
          accuracy: 0.7 + Math.random() * 0.2, // Simulated
          trainingTime: Date.now()
        }
      };
      
      this.localModel = modelUpdates;
      
      this.logger.info(`[FederatedLearning:${this.nodeId}] Local training complete`);
      
      this.emit('training_complete', result);
      
      return result;
      
    } catch (err) {
      this.logger.error(`[FederatedLearning:${this.nodeId}] Training error: ${err.message}`);
      throw err;
    } finally {
      this.trainingInProgress = false;
    }
  }
  
  async _performLocalTraining(trainingData, config) {
    // Placeholder for actual training logic
    // In real implementation, this would:
    // 1. Load current global model
    // 2. Train on local data
    // 3. Compute weight updates/gradients
    // 4. Return model deltas
    
    await this._sleep(config.trainingDuration || 1000);
    
    // Simulated model updates
    return {
      weights: this._generateRandomWeights(),
      biases: this._generateRandomBiases(),
      metadata: {
        epochs: config.epochs || 1,
        batchSize: config.batchSize || 32,
        learningRate: config.learningRate || 0.01
      }
    };
  }
  
  async submitModelUpdate(coordinatorNode, modelUpdate) {
    this.logger.info(`[FederatedLearning:${this.nodeId}] Submitting model update to coordinator...`);
    
    const url = `http://${coordinatorNode.host}:${coordinatorNode.port}/federated/submit`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId: this.nodeId,
          round: this.currentRound,
          modelUpdate,
          timestamp: Date.now()
        }),
        timeout: 15000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      this.logger.info(`[FederatedLearning:${this.nodeId}] Model update submitted successfully`);
      
      return result;
      
    } catch (err) {
      this.logger.error(`[FederatedLearning:${this.nodeId}] Failed to submit model: ${err.message}`);
      throw err;
    }
  }
  
  async fetchGlobalModel(coordinatorNode) {
    this.logger.info(`[FederatedLearning:${this.nodeId}] Fetching global model...`);
    
    const url = `http://${coordinatorNode.host}:${coordinatorNode.port}/federated/model`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        timeout: 10000
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      this.globalModel = data.model;
      this.currentRound = data.round;
      
      this.logger.info(`[FederatedLearning:${this.nodeId}] Global model fetched (round ${this.currentRound})`);
      
      return this.globalModel;
      
    } catch (err) {
      this.logger.error(`[FederatedLearning:${this.nodeId}] Failed to fetch global model: ${err.message}`);
      throw err;
    }
  }
  
  // === COORDINATOR METHODS ===
  
  async initiateRound(trainingConfig = {}) {
    if (this.role !== 'coordinator') {
      throw new Error('Only coordinator can initiate training rounds');
    }
    
    this.currentRound++;
    this.roundModels.clear();
    
    this.logger.info(`[FederatedLearning:${this.nodeId}] Initiating round ${this.currentRound}...`);
    
    const nodes = Array.from(this.clusterNode.knownNodes.values())
      .filter(n => n.role === 'worker');
    
    if (nodes.length < this.minParticipants) {
      throw new Error(`Not enough participants: ${nodes.length} < ${this.minParticipants}`);
    }
    
    // Broadcast training request
    const requests = nodes.map(node => 
      this._requestTraining(node, trainingConfig)
    );
    
    const results = await Promise.allSettled(requests);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    
    this.logger.info(`[FederatedLearning:${this.nodeId}] Round ${this.currentRound}: ${successful}/${nodes.length} nodes responded`);
    
    return {
      round: this.currentRound,
      participatingNodes: successful,
      totalNodes: nodes.length
    };
  }
  
  async _requestTraining(node, config) {
    const url = `http://${node.host}:${node.port}/federated/train`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        round: this.currentRound,
        config,
        timestamp: Date.now()
      }),
      timeout: 10000
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  }
  
  receiveModelUpdate(nodeId, modelUpdate) {
    if (this.role !== 'coordinator') {
      throw new Error('Only coordinator can receive model updates');
    }
    
    this.logger.info(`[FederatedLearning:${this.nodeId}] Received model update from ${nodeId}`);
    
    this.roundModels.set(nodeId, modelUpdate);
    
    // Check if we have enough participants
    if (this.roundModels.size >= this.minParticipants) {
      this.logger.info(`[FederatedLearning:${this.nodeId}] Sufficient updates received, ready to aggregate`);
      this.emit('ready_to_aggregate', {
        round: this.currentRound,
        updates: this.roundModels.size
      });
    }
    
    return {
      success: true,
      round: this.currentRound,
      receivedUpdates: this.roundModels.size,
      requiredUpdates: this.minParticipants
    };
  }
  
  async aggregateModels(strategy = 'federated_averaging') {
    if (this.role !== 'coordinator') {
      throw new Error('Only coordinator can aggregate models');
    }
    
    if (this.roundModels.size < this.minParticipants) {
      throw new Error(`Not enough model updates: ${this.roundModels.size} < ${this.minParticipants}`);
    }
    
    this.logger.info(`[FederatedLearning:${this.nodeId}] Aggregating ${this.roundModels.size} models using ${strategy}...`);
    
    const aggregatedModel = this._performAggregation(
      Array.from(this.roundModels.values()),
      strategy
    );
    
    this.globalModel = aggregatedModel;
    
    // Record history
    this.history.push({
      round: this.currentRound,
      participants: this.roundModels.size,
      timestamp: Date.now(),
      strategy,
      metrics: this._computeAggregateMetrics()
    });
    
    this.logger.info(`[FederatedLearning:${this.nodeId}] Aggregation complete for round ${this.currentRound}`);
    
    this.emit('aggregation_complete', {
      round: this.currentRound,
      model: this.globalModel
    });
    
    return this.globalModel;
  }
  
  _performAggregation(modelUpdates, strategy) {
    switch (strategy) {
      case 'federated_averaging':
        return this._federatedAveraging(modelUpdates);
      
      case 'weighted_averaging':
        return this._weightedAveraging(modelUpdates);
      
      default:
        return this._federatedAveraging(modelUpdates);
    }
  }
  
  _federatedAveraging(modelUpdates) {
    // Simple average of all model weights
    // In reality, this would operate on actual tensors/matrices
    
    const n = modelUpdates.length;
    
    return {
      weights: this._averageWeights(modelUpdates.map(m => m.updates.weights)),
      biases: this._averageBiases(modelUpdates.map(m => m.updates.biases)),
      round: this.currentRound,
      participants: n,
      aggregationMethod: 'federated_averaging'
    };
  }
  
  _weightedAveraging(modelUpdates) {
    // Weight by number of samples
    const totalSamples = modelUpdates.reduce((sum, m) => sum + (m.metrics?.samplesProcessed || 1), 0);
    
    // Similar to federated averaging but with sample weighting
    return {
      weights: this._weightedAverageWeights(modelUpdates, totalSamples),
      biases: this._weightedAverageBiases(modelUpdates, totalSamples),
      round: this.currentRound,
      participants: modelUpdates.length,
      aggregationMethod: 'weighted_averaging'
    };
  }
  
  _averageWeights(weightsList) {
    // PRODUCTION: Real federated averaging - element-wise mean of weight vectors
    if (!weightsList || weightsList.length === 0) return [];
    
    // Get dimension from first weights array
    const dim = weightsList[0].length;
    const averaged = Array(dim).fill(0);
    
    // Sum all weights element-wise
    for (const weights of weightsList) {
      if (!Array.isArray(weights) || weights.length !== dim) {
        throw new Error(`Weight dimension mismatch: expected ${dim}, got ${weights.length}`);
      }
      for (let i = 0; i < dim; i++) {
        averaged[i] += weights[i];
      }
    }
    
    // Divide by number of participants
    for (let i = 0; i < dim; i++) {
      averaged[i] /= weightsList.length;
    }
    
    return averaged;
  }
  
  _averageBiases(biasesList) {
    // PRODUCTION: Real federated averaging - element-wise mean of bias vectors
    if (!biasesList || biasesList.length === 0) return [];
    
    // Get dimension from first biases array
    const dim = biasesList[0].length;
    const averaged = Array(dim).fill(0);
    
    // Sum all biases element-wise
    for (const biases of biasesList) {
      if (!Array.isArray(biases) || biases.length !== dim) {
        throw new Error(`Bias dimension mismatch: expected ${dim}, got ${biases.length}`);
      }
      for (let i = 0; i < dim; i++) {
        averaged[i] += biases[i];
      }
    }
    
    // Divide by number of participants
    for (let i = 0; i < dim; i++) {
      averaged[i] /= biasesList.length;
    }
    
    return averaged;
  }
  
  _weightedAverageWeights(modelUpdates, totalSamples) {
    // PRODUCTION: Weighted averaging by sample count - higher sample weight gets more influence
    if (!modelUpdates || modelUpdates.length === 0) return [];
    if (totalSamples <= 0) return this._averageWeights(modelUpdates.map(m => m.updates.weights));
    
    const dim = modelUpdates[0].updates.weights.length;
    const weighted = Array(dim).fill(0);
    
    // Sum weights scaled by sample count
    for (const update of modelUpdates) {
      const weights = update.updates.weights;
      const samplesProcessed = update.metrics?.samplesProcessed || 1;
      const weight = samplesProcessed / totalSamples;
      
      if (!Array.isArray(weights) || weights.length !== dim) {
        throw new Error(`Weight dimension mismatch: expected ${dim}, got ${weights.length}`);
      }
      
      for (let i = 0; i < dim; i++) {
        weighted[i] += weights[i] * weight;
      }
    }
    
    return weighted;
  }
  
  _weightedAverageBiases(modelUpdates, totalSamples) {
    // PRODUCTION: Weighted averaging by sample count - higher sample weight gets more influence
    if (!modelUpdates || modelUpdates.length === 0) return [];
    if (totalSamples <= 0) return this._averageBiases(modelUpdates.map(m => m.updates.biases));
    
    const dim = modelUpdates[0].updates.biases.length;
    const weighted = Array(dim).fill(0);
    
    // Sum biases scaled by sample count
    for (const update of modelUpdates) {
      const biases = update.updates.biases;
      const samplesProcessed = update.metrics?.samplesProcessed || 1;
      const weight = samplesProcessed / totalSamples;
      
      if (!Array.isArray(biases) || biases.length !== dim) {
        throw new Error(`Bias dimension mismatch: expected ${dim}, got ${biases.length}`);
      }
      
      for (let i = 0; i < dim; i++) {
        weighted[i] += biases[i] * weight;
      }
    }
    
    return weighted;
  }
  
  _computeAggregateMetrics() {
    const updates = Array.from(this.roundModels.values());
    
    const avgLoss = updates.reduce((sum, u) => sum + (u.metrics?.loss || 0), 0) / updates.length;
    const avgAccuracy = updates.reduce((sum, u) => sum + (u.metrics?.accuracy || 0), 0) / updates.length;
    
    return {
      averageLoss: avgLoss,
      averageAccuracy: avgAccuracy,
      totalSamples: updates.reduce((sum, u) => sum + (u.metrics?.samplesProcessed || 0), 0)
    };
  }
  
  // === UTILITY METHODS ===
  
  _generateRandomWeights() {
    // Simulated weight matrix
    return Array(10).fill(0).map(() => Math.random() * 2 - 1);
  }
  
  _generateRandomBiases() {
    // Simulated bias vector
    return Array(10).fill(0).map(() => Math.random() * 0.2 - 0.1);
  }
  
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  getStats() {
    return {
      nodeId: this.nodeId,
      role: this.role,
      currentRound: this.currentRound,
      trainingInProgress: this.trainingInProgress,
      hasGlobalModel: !!this.globalModel,
      hasLocalModel: !!this.localModel,
      receivedUpdates: this.roundModels.size,
      history: this.history
    };
  }
  
  getHistory() {
    return this.history;
  }
}

module.exports = { FederatedLearning };
