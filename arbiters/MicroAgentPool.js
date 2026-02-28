// ═══════════════════════════════════════════════════════════
// MicroAgentPool.js - Parallel Micro-Agent Workers
// Splits batches into sub-batches processed by worker agents
// Target: 1.3-1.5x additional speedup via parallel workers
// ═══════════════════════════════════════════════════════════

import { EventEmitter } from 'events';
import { Worker } from 'worker_threads';

/**
 * MicroAgentPool
 *
 * Pool of micro-agents for parallel sub-batch processing
 * - Spawns worker agents to process data in parallel
 * - Automatic load balancing across workers
 * - Queue management for pending work
 * - Dynamic worker scaling based on load
 * - Result aggregation from parallel workers
 */
export class MicroAgentPool extends EventEmitter {
  constructor(config = {}) {
    super();

    this.name = config.name || 'MicroAgentPool';
    this.loadPipeline = config.loadPipeline || null;

    // Pool configuration
    this.minWorkers = config.minWorkers || 2;
    this.maxWorkers = config.maxWorkers || 8;
    this.workerIdleTimeout = config.workerIdleTimeout || 30000; // 30s

    // Micro-agent configuration
    this.microBatchSize = config.microBatchSize || 8;

    // Worker pool
    this.workers = [];
    this.activeWorkers = 0;
    this.idleWorkers = [];

    // Work queue
    this.workQueue = [];
    this.processingJobs = new Map();

    // Metrics
    this.metrics = {
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      totalWorkerSpawns: 0,
      averageParallelism: 0,
      averageQueueTime: 0,
      peakWorkers: 0
    };

    // Agent Registry
    this.agentTypes = new Map();
    this.spawnedAgents = new Map();

    console.log(`[${this.name}] 🤖 Micro-Agent Pool initialized`);
    console.log(`[${this.name}]    Workers: ${this.minWorkers}-${this.maxWorkers}`);
    console.log(`[${this.name}]    Micro-Batch Size: ${this.microBatchSize}`);
  }

  /**
   * Register a new agent type (class)
   */
  registerAgentType(type, agentClass) {
    this.agentTypes.set(type, agentClass);
    console.log(`[${this.name}]    Registered agent type: ${type}`);
  }

  /**
   * Spawn a specific named agent instance
   */
  async spawnAgent(type, config) {
    const AgentClass = this.agentTypes.get(type);
    if (!AgentClass) {
      throw new Error(`Unknown agent type: ${type}`);
    }

    const agent = new AgentClass(config);
    this.spawnedAgents.set(config.name, agent);
    
    // Cleanup when agent terminates
    agent.on('terminated', () => {
        this.spawnedAgents.delete(config.name);
        console.log(`[${this.name}]    Cleaned up terminated agent: ${config.name}`);
    });

    // If agent has initialize, call it
    if (agent.initialize) {
        await agent.initialize();
    }

    console.log(`[${this.name}]    Spawned named agent: ${config.name}`);
    return agent;
  }

  async initialize() {
    console.log(`[${this.name}] Initializing micro-agent pool...`);

    try {
      // Spawn initial worker agents
      console.log(`[${this.name}]    Spawning ${this.minWorkers} initial workers...`);

      for (let i = 0; i < this.minWorkers; i++) {
        await this.spawnWorker();
      }

      console.log(`[${this.name}] ✅ Micro-agent pool ready with ${this.workers.length} workers`);
      this.emit('initialized');

      return {
        success: true,
        workers: this.workers.length
      };
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to initialize:`, error.message);
      throw error;
    }
  }

  /**
   * Spawn a new worker agent
   */
  async spawnWorker() {
    const workerId = `worker_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

    // In a real implementation, this would spawn a Worker thread
    // For demo, we simulate a worker
    const worker = {
      id: workerId,
      status: 'idle',
      tasksCompleted: 0,
      tasksActive: 0,
      spawnedAt: Date.now(),
      lastUsed: Date.now()
    };

    this.workers.push(worker);
    this.idleWorkers.push(worker);
    this.metrics.totalWorkerSpawns++;
    this.metrics.peakWorkers = Math.max(this.metrics.peakWorkers, this.workers.length);

    console.log(`[${this.name}]    Spawned worker: ${workerId}`);

    this.emit('worker_spawned', { workerId });

    return worker;
  }

  /**
   * Process batch with parallel micro-agents
   */
  async processBatch(data, config = {}) {
    console.log(`\n[${this.name}] 🚀 Processing batch with micro-agents...`);
    console.log(`[${this.name}]    Batch Size: ${data.length}`);
    console.log(`[${this.name}]    Micro-Batch Size: ${this.microBatchSize}`);

    const startTime = Date.now();

    try {
      // Split into micro-batches
      const microBatches = this.splitIntoMicroBatches(data);

      console.log(`[${this.name}]    Created ${microBatches.length} micro-batches`);

      // Check if we need more workers
      const requiredWorkers = Math.min(microBatches.length, this.maxWorkers);
      if (this.workers.length < requiredWorkers) {
        const toSpawn = requiredWorkers - this.workers.length;
        console.log(`[${this.name}]    Spawning ${toSpawn} additional workers...`);

        for (let i = 0; i < toSpawn; i++) {
          await this.spawnWorker();
        }
      }

      // Distribute micro-batches to workers
      console.log(`[${this.name}]    Distributing work to ${this.workers.length} workers...`);

      const results = await this.distributeWork(microBatches, config);

      // Aggregate results
      const aggregated = this.aggregateResults(results);

      const totalTime = Date.now() - startTime;
      const parallelism = microBatches.length / this.workers.length;

      this.metrics.totalJobs++;
      this.metrics.completedJobs++;
      this.metrics.averageParallelism =
        (this.metrics.averageParallelism * (this.metrics.completedJobs - 1) + parallelism) /
        this.metrics.completedJobs;

      console.log(`\n[${this.name}] ✅ Batch processing complete`);
      console.log(`[${this.name}]    Total Time: ${totalTime}ms`);
      console.log(`[${this.name}]    Workers Used: ${this.activeWorkers}`);
      console.log(`[${this.name}]    Parallelism: ${parallelism.toFixed(2)}x\n`);

      return {
        success: true,
        results: aggregated,
        totalTime,
        workersUsed: this.activeWorkers,
        parallelism
      };
    } catch (error) {
      console.error(`[${this.name}] ❌ Batch processing failed:`, error.message);
      this.metrics.failedJobs++;
      throw error;
    }
  }

  /**
   * Split data into micro-batches
   */
  splitIntoMicroBatches(data) {
    const microBatches = [];

    for (let i = 0; i < data.length; i += this.microBatchSize) {
      microBatches.push(data.slice(i, i + this.microBatchSize));
    }

    return microBatches;
  }

  /**
   * Distribute work to available workers
   */
  async distributeWork(microBatches, config) {
    const workPromises = [];

    this.activeWorkers = Math.min(microBatches.length, this.workers.length);

    // Assign micro-batches to workers in round-robin
    for (let i = 0; i < microBatches.length; i++) {
      const workerIndex = i % this.workers.length;
      const worker = this.workers[workerIndex];

      workPromises.push(
        this.executeWork(worker, microBatches[i], config)
      );
    }

    // Wait for all workers to complete
    const results = await Promise.all(workPromises);

    return results;
  }

  /**
   * Execute work on a specific worker
   */
  async executeWork(worker, microBatch, config) {
    worker.status = 'busy';
    worker.tasksActive++;
    worker.lastUsed = Date.now();

    try {
      // Simulate processing time (in real impl, would dispatch to Worker thread)
      const processingTime = 20 + Math.random() * 10; // 20-30ms per micro-batch
      await new Promise(resolve => setTimeout(resolve, processingTime));

      // Simulate result
      const result = {
        workerId: worker.id,
        batchSize: microBatch.length,
        processingTime,
        output: microBatch.map(item => ({
          ...item,
          processed: true,
          worker: worker.id
        }))
      };

      worker.tasksCompleted++;
      worker.tasksActive--;
      worker.status = 'idle';

      return result;
    } catch (error) {
      worker.tasksActive--;
      worker.status = 'error';

      throw error;
    }
  }

  /**
   * Aggregate results from multiple workers
   */
  aggregateResults(results) {
    const aggregated = {
      totalItems: 0,
      totalProcessingTime: 0,
      outputs: []
    };

    for (const result of results) {
      aggregated.totalItems += result.batchSize;
      aggregated.totalProcessingTime += result.processingTime;
      aggregated.outputs.push(...result.output);
    }

    return aggregated;
  }

  /**
   * Benchmark sequential vs parallel processing
   */
  async runBenchmark(config = {}) {
    const dataSize = config.dataSize || 1000;
    const iterations = config.iterations || 10;

    console.log(`\n[${this.name}] Running parallel processing benchmark...`);
    console.log(`[${this.name}]    Data Size: ${dataSize}`);
    console.log(`[${this.name}]    Iterations: ${iterations}\n`);

    const testData = Array.from({ length: dataSize }, (_, i) => ({
      id: i,
      value: Math.random()
    }));

    // Benchmark with micro-agents (parallel)
    console.log(`[${this.name}] 📊 Benchmarking parallel micro-agents...`);
    const parallelStart = Date.now();

    for (let i = 0; i < iterations; i++) {
      await this.processBatch(testData);
    }

    const parallelTime = Date.now() - parallelStart;
    const parallelThroughput = (dataSize * iterations / parallelTime) * 1000;

    console.log(`[${this.name}]    Parallel Time: ${parallelTime}ms`);
    console.log(`[${this.name}]    Parallel Throughput: ${parallelThroughput.toFixed(2)} items/sec\n`);

    // Benchmark sequential (simulated)
    console.log(`[${this.name}] 📊 Benchmarking sequential processing...`);
    const sequentialStart = Date.now();

    for (let i = 0; i < iterations; i++) {
      await this.processSequential(testData);
    }

    const sequentialTime = Date.now() - sequentialStart;
    const sequentialThroughput = (dataSize * iterations / sequentialTime) * 1000;

    console.log(`[${this.name}]    Sequential Time: ${sequentialTime}ms`);
    console.log(`[${this.name}]    Sequential Throughput: ${sequentialThroughput.toFixed(2)} items/sec\n`);

    // Calculate speedup
    const speedup = sequentialTime / parallelTime;

    console.log(`[${this.name}] ⚡ Performance Comparison:`);
    console.log(`[${this.name}]    Speedup: ${speedup.toFixed(2)}x faster`);
    console.log(`[${this.name}]    Throughput Gain: ${((parallelThroughput - sequentialThroughput) / sequentialThroughput * 100).toFixed(1)}%\n`);

    return {
      parallel: {
        time: parallelTime,
        throughput: parallelThroughput
      },
      sequential: {
        time: sequentialTime,
        throughput: sequentialThroughput
      },
      speedup
    };
  }

  /**
   * Process data sequentially (for comparison)
   */
  async processSequential(data) {
    const microBatches = this.splitIntoMicroBatches(data);

    for (const microBatch of microBatches) {
      const processingTime = 20 + Math.random() * 10;
      await new Promise(resolve => setTimeout(resolve, processingTime));
    }

    return { processed: data.length };
  }

  /**
   * Scale down idle workers
   */
  async scaleDown() {
    const now = Date.now();
    const workersToRemove = [];

    // Find workers that have been idle too long
    for (const worker of this.workers) {
      if (
        worker.status === 'idle' &&
        worker.tasksActive === 0 &&
        now - worker.lastUsed > this.workerIdleTimeout &&
        this.workers.length > this.minWorkers
      ) {
        workersToRemove.push(worker);
      }
    }

    // Remove idle workers
    for (const worker of workersToRemove) {
      this.removeWorker(worker.id);
    }

    if (workersToRemove.length > 0) {
      console.log(`[${this.name}]    Scaled down ${workersToRemove.length} idle workers`);
    }
  }

  /**
   * Remove a worker from the pool
   */
  removeWorker(workerId) {
    const index = this.workers.findIndex(w => w.id === workerId);

    if (index !== -1) {
      const worker = this.workers[index];

      // In real impl, would terminate Worker thread
      this.workers.splice(index, 1);

      const idleIndex = this.idleWorkers.indexOf(worker);
      if (idleIndex !== -1) {
        this.idleWorkers.splice(idleIndex, 1);
      }

      console.log(`[${this.name}]    Removed worker: ${workerId}`);
      this.emit('worker_removed', { workerId });
    }
  }

  /**
   * Get pool status
   */
  getStatus() {
    return {
      name: this.name,
      workers: {
        total: this.workers.length,
        active: this.workers.filter(w => w.status === 'busy').length,
        idle: this.workers.filter(w => w.status === 'idle').length,
        min: this.minWorkers,
        max: this.maxWorkers
      },
      queue: {
        pending: this.workQueue.length,
        processing: this.processingJobs.size
      },
      metrics: this.metrics,
      microBatchSize: this.microBatchSize
    };
  }

  async shutdown() {
    console.log(`[${this.name}] Shutting down micro-agent pool...`);

    // In real impl, would terminate all Worker threads
    for (const worker of this.workers) {
      console.log(`[${this.name}]    Terminating worker: ${worker.id}`);
    }

    this.workers = [];
    this.idleWorkers = [];
    this.workQueue = [];
    this.processingJobs.clear();

    this.emit('shutdown');
    return { success: true };
  }
}

export default MicroAgentPool;
