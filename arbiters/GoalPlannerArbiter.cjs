// ═══════════════════════════════════════════════════════════
// FILE: arbiters/GoalPlannerArbiter.cjs
// Phase 4: Proactive goal planning and execution coordination
// Enables autonomous goal generation, prioritization, and tracking
// ═══════════════════════════════════════════════════════════

const { BaseArbiter } = require('../core/BaseArbiter.cjs');
const messageBroker = require('../core/MessageBroker.cjs');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// NEMESIS Phase 2.2: Reality checks for autonomous goal generation
let PrometheusNemesis = null;
try {
  ({ PrometheusNemesis } = require('../cognitive/prometheus/PrometheusNemesis.cjs'));
} catch (_) {
  // Graceful degradation — NEMESIS optional
}

class GoalPlannerArbiter extends BaseArbiter {
  static role = 'goal-planner';
  static capabilities = ['create-goals', 'prioritize', 'coordinate-tasks', 'track-progress', 'autonomous-planning'];

  constructor(config = {}) {
    super(config);

    // Goal storage
    this.goals = new Map(); // goalId -> Goal object
    this.activeGoals = new Set(); // Set of active goal IDs
    this.completedGoals = []; // Archive of completed goals
    this.failedGoals = []; // Archive of failed goals
    
    // Configuration
    this.maxActiveGoals = config.maxActiveGoals || 20;
    this.maxCompletedHistory = config.maxCompletedHistory || 100;
    this.stalledThresholdDays = config.stalledThresholdDays || 7;
    this.planningIntervalHours = config.planningIntervalHours || 6;
    
    // Prioritization weights
    this.priorityWeights = {
      impact: 0.35,
      urgency: 0.25,
      feasibility: 0.25,
      resourceCost: 0.15
    };
    
    // Goal generation thresholds
    this.thresholds = {
      velocityWarning: 1.5, // Generate goal if < 1.5x target
      memoryWarning: 0.85, // Generate goal if > 85% usage
      fitnessWarning: 0.65, // Generate goal if < 0.65 fitness
      codeQualityWarning: 0.70 // Generate goal if < 70% quality
    };
    
    // Statistics
    this.stats = {
      goalsCreated: 0,
      goalsCompleted: 0,
      goalsFailed: 0,
      goalsDeferred: 0,
      autonomousGoals: 0,
      userRequestedGoals: 0,
      avgCompletionTime: 0,
      goalsPerWeek: 0
    };
    
    // Planning intervals
    this.planningInterval = null;
    this.monitoringInterval = null;
    this.autoSaveInterval = null;

    // Persistence
    this.dataDir = config.dataDir || path.join(process.cwd(), 'data');
    this.persistPath = path.join(this.dataDir, 'goals.json');
    this._dirty = false;

    // NEMESIS Phase 2.2: Reality check system
    this.nemesis = PrometheusNemesis ? new PrometheusNemesis({
      minFriction: 0.25,
      maxChargeWithoutFriction: 0.75,
      minValueDensity: 0.15,
      promotionScore: 0.85
    }) : null;
    this.nemesisStats = { checked: 0, rejected: 0, warned: 0, passed: 0 };

    this.logger.info(`[${this.name}] 🎯 GoalPlannerArbiter initializing...`);
    this.logger.info(`[${this.name}] Max active goals: ${this.maxActiveGoals}`);
    this.logger.info(`[${this.name}] Planning interval: ${this.planningIntervalHours}h`);
    if (this.nemesis) this.logger.info(`[${this.name}] 🔴 NEMESIS reality checks: ACTIVE`);
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ INITIALIZATION ░░
  // ═══════════════════════════════════════════════════════════

  async initialize() {
    await super.initialize();

    // Load persisted goals before anything else
    await this._loadFromDisk();

    this.registerWithBroker();
    this._subscribeBrokerMessages();

    // Start monitoring loops
    this.startPlanningLoop();
    this.startMonitoringLoop();

    // Auto-save every 5 minutes
    this.autoSaveInterval = setInterval(() => {
      if (this._dirty) this._saveToDisk();
    }, 5 * 60 * 1000);

    this.logger.info(`[${this.name}] ✅ Goal planning system active (${this.activeGoals.size} goals restored)`);
  }

  registerWithBroker() {
    try {
      messageBroker.registerArbiter(this.name, this, {
        type: GoalPlannerArbiter.role,
        capabilities: GoalPlannerArbiter.capabilities
      });
      this.logger.info(`[${this.name}] Registered with MessageBroker`);
    } catch (err) {
      this.logger.error(`[${this.name}] Failed to register: ${err.message}`);
      throw err;
    }
  }

  _subscribeBrokerMessages() {
    // Goal management
    messageBroker.subscribe(this.name, 'create_goal');
    messageBroker.subscribe(this.name, 'update_goal_progress');
    messageBroker.subscribe(this.name, 'query_goals');
    messageBroker.subscribe(this.name, 'cancel_goal');
    
    // System observations for autonomous goal generation
    messageBroker.subscribe(this.name, 'velocity_report');
    messageBroker.subscribe(this.name, 'code_analysis_complete');
    messageBroker.subscribe(this.name, 'memory_metrics');
    messageBroker.subscribe(this.name, 'fitness_score_update');
    messageBroker.subscribe(this.name, 'discovery_complete');
    messageBroker.subscribe(this.name, 'contradiction_detected'); // BeliefSystemArbiter
    messageBroker.subscribe(this.name, 'practice_reminder'); // SkillAcquisitionArbiter
    messageBroker.subscribe(this.name, 'skill_degraded'); // SkillAcquisitionArbiter
    messageBroker.subscribe(this.name, 'resource_pressure_critical'); // ResourceBudgetArbiter

    // Conflict resolution (Conservative vs Progressive)
    messageBroker.subscribe(this.name, 'arbitration_request'); // ProgressiveArbiter
    messageBroker.subscribe(this.name, 'goal_concern'); // ConservativeArbiter
    messageBroker.subscribe(this.name, 'goal_enhancement_suggestion'); // ProgressiveArbiter

    // Planning triggers
    messageBroker.subscribe(this.name, 'planning_pulse');
    messageBroker.subscribe(this.name, 'time_pulse');
    
    this.logger.info(`[${this.name}] Subscribed to message types`);
  }

  async handleMessage(message = {}) {
    try {
      const { type, payload, from } = message;
      
      switch (type) {
        case 'create_goal':
          return await this.createGoal(payload, from);
        
        case 'update_goal_progress':
          return await this.updateGoalProgress(payload.goalId, payload.progress, payload.metadata);
        
        case 'query_goals':
          return this.getActiveGoals(payload);
        
        case 'cancel_goal':
          return await this.cancelGoal(payload.goalId, payload.reason);
        
        case 'velocity_report':
          return await this.handleVelocityReport(payload);
        
        case 'code_analysis_complete':
          return await this.handleCodeAnalysis(payload);
        
        case 'memory_metrics':
          return await this.handleMemoryMetrics(payload);
        
        case 'fitness_score_update':
          return await this.handleFitnessUpdate(payload);
        
        case 'discovery_complete':
          return await this.handleDiscoveryComplete(payload);

        case 'contradiction_detected':
          return await this.handleContradictionDetected(payload);

        case 'practice_reminder':
          return await this.handlePracticeReminder(payload);

        case 'skill_degraded':
          return await this.handleSkillDegraded(payload);

        case 'resource_pressure_critical':
          return await this.handleResourcePressure(payload);

        case 'arbitration_request':
          return await this.mediateConflict(payload);

        case 'goal_concern':
          return await this.handleGoalConcern(payload);

        case 'goal_enhancement_suggestion':
          return await this.handleGoalEnhancement(payload);

        case 'planning_pulse':
        case 'time_pulse':
          return await this.runPlanningCycle();
        
        default:
          return { success: true, message: 'Event acknowledged' };
      }
    } catch (err) {
      this.logger.error(`[${this.name}] handleMessage error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ GOAL MANAGEMENT ░░
  // ═══════════════════════════════════════════════════════════

  async createGoal(goalData, source = 'user') {
    try {
      // Validate goal data
      if (!goalData.title || !goalData.category) {
        throw new Error('Goal must have title and category');
      }

      // Deduplication — reject if a similar active goal already exists
      if (source === 'autonomous') {
        const duplicate = this._findSimilarActiveGoal(goalData.category, goalData.title);
        if (duplicate) {
          this.logger.info(`[${this.name}] Skipping duplicate goal "${goalData.title}" — similar active goal exists: "${duplicate.title}"`);
          return { success: false, error: 'Duplicate goal exists', existingGoalId: duplicate.id };
        }
      }

      // Check active goal limit — HARD CAP
      if (this.activeGoals.size >= this.maxActiveGoals) {
        this.logger.warn(`[${this.name}] Active goal limit reached (${this.activeGoals.size}/${this.maxActiveGoals}), deferring low-priority goals...`);
        const deferred = await this.deferLowPriorityGoals(1);
        // If we couldn't free a slot, REJECT the new goal
        if (this.activeGoals.size >= this.maxActiveGoals) {
          this.logger.warn(`[${this.name}] ❌ Cannot create goal "${goalData.title}" — at hard cap (${this.activeGoals.size}/${this.maxActiveGoals})`);
          return { success: false, error: `Active goal limit reached (${this.maxActiveGoals}). Defer or complete existing goals first.` };
        }
      }
      
      // Create goal object
      const goal = {
        id: goalData.id || crypto.randomUUID(),
        type: goalData.type || 'operational',
        category: goalData.category,
        title: goalData.title,
        description: goalData.description || '',
        
        status: 'pending',
        priority: goalData.priority || 50,
        
        metrics: goalData.metrics || {
          target: null,
          current: null,
          progress: 0
        },
        
        dependencies: goalData.dependencies || [],
        prerequisites: goalData.prerequisites || [],
        
        createdAt: Date.now(),
        startedAt: null,
        completedAt: null,
        dueDate: goalData.dueDate || null,
        
        assignedTo: goalData.assignedTo || [],
        tasks: [],
        
        metadata: {
          source: source === 'user' ? 'user_requested' : 'autonomous',
          confidence: goalData.confidence || 1.0,
          rationale: goalData.rationale || '',
          ...goalData.metadata
        }
      };
      
      // Calculate priority if not provided
      if (!goalData.priority) {
        goal.priority = this.calculateGoalPriority(goal);
      }

      // NEMESIS Phase 2.2: Reality check for autonomous goals
      if (source === 'autonomous' && this.nemesis) {
        const nemesisResult = this._nemesisRealityCheck(goal);
        if (!nemesisResult.approved) {
          return {
            success: false,
            error: nemesisResult.reason,
            nemesisScore: nemesisResult.score,
            nemesisFate: nemesisResult.fate
          };
        }
      }

      // Store goal
      this.goals.set(goal.id, goal);
      this.activeGoals.add(goal.id);
      
      // Update statistics
      this.stats.goalsCreated++;
      if (source === 'user') {
        this.stats.userRequestedGoals++;
      } else {
        this.stats.autonomousGoals++;
      }
      
      // Broadcast goal creation
      await messageBroker.sendMessage({
        from: this.name,
        to: 'broadcast',
        type: 'goal_created',
        payload: { goal }
      });
      
      this.logger.info(`[${this.name}] 🎯 Created goal: ${goal.title} (${goal.id.slice(0, 8)})`);
      this.logger.info(`[${this.name}]    Type: ${goal.type}, Category: ${goal.category}, Priority: ${goal.priority}`);

      this._dirty = true;
      this._saveToDisk();

      // Start goal if no dependencies
      if (goal.dependencies.length === 0 && goal.prerequisites.length === 0) {
        await this.startGoal(goal.id);
      }
      
      return { success: true, goalId: goal.id, goal };
    } catch (err) {
      this.logger.error(`[${this.name}] Failed to create goal: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async startGoal(goalId) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      throw new Error(`Goal not found: ${goalId}`);
    }
    
    if (goal.status !== 'pending') {
      return { success: false, reason: 'Goal not in pending state' };
    }
    
    goal.status = 'active';
    goal.startedAt = Date.now();
    
    // Assign tasks if not already assigned
    if (goal.assignedTo.length > 0) {
      await this.assignGoalTasks(goal);
    }
    
    this.logger.info(`[${this.name}] ▶️  Started goal: ${goal.title}`);
    
    return { success: true };
  }

  async updateGoalProgress(goalId, progress, metadata = {}) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return { success: false, error: 'Goal not found' };
    }
    
    // Update progress
    if (typeof progress === 'number') {
      goal.metrics.progress = Math.min(100, Math.max(0, progress));
    }
    
    // Update current metrics
    if (metadata.current) {
      goal.metrics.current = metadata.current;
    }
    
    // Add task completion if provided
    if (metadata.taskId) {
      const task = goal.tasks.find(t => t.taskId === metadata.taskId);
      if (task) {
        task.status = metadata.taskStatus || 'completed';
        task.completedAt = Date.now();
      }
    }
    
    // Check if goal is complete
    if (goal.metrics.progress >= 100) {
      await this.completeGoal(goalId, { progress: 100, ...metadata });
    }
    
    this._dirty = true;

    this.logger.info(`[${this.name}] 📊 Updated goal progress: ${goal.title} - ${goal.metrics.progress}%`);

    return { success: true, goal };
  }

  async completeGoal(goalId, result = {}) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return { success: false, error: 'Goal not found' };
    }
    
    goal.status = 'completed';
    goal.completedAt = Date.now();
    goal.metrics.progress = 100;
    
    // Move to completed archive
    this.activeGoals.delete(goalId);
    this.completedGoals.unshift(goal);
    
    // Trim completed history
    if (this.completedGoals.length > this.maxCompletedHistory) {
      this.completedGoals = this.completedGoals.slice(0, this.maxCompletedHistory);
    }
    
    // Update statistics
    this.stats.goalsCompleted++;
    this.updateAverageCompletionTime(goal);
    
    // Broadcast completion
    await messageBroker.sendMessage({
      from: this.name,
      to: 'broadcast',
      type: 'goal_completed',
      payload: { goal, result }
    });
    
    this.logger.info(`[${this.name}] ✅ Completed goal: ${goal.title}`);
    this.logger.info(`[${this.name}]    Duration: ${((goal.completedAt - goal.startedAt) / 86400000).toFixed(1)} days`);

    this._dirty = true;
    this._saveToDisk();

    return { success: true, goal };
  }

  async failGoal(goalId, reason = '') {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return { success: false, error: 'Goal not found' };
    }
    
    goal.status = 'failed';
    goal.completedAt = Date.now();
    goal.metadata.failureReason = reason;
    
    // Move to failed archive
    this.activeGoals.delete(goalId);
    this.failedGoals.unshift(goal);
    
    // Update statistics
    this.stats.goalsFailed++;
    
    // Broadcast failure
    await messageBroker.sendMessage({
      from: this.name,
      to: 'broadcast',
      type: 'goal_failed',
      payload: { goal, reason }
    });
    
    this.logger.warn(`[${this.name}] ❌ Failed goal: ${goal.title} - ${reason}`);

    this._dirty = true;
    this._saveToDisk();

    return { success: true, goal };
  }

  async cancelGoal(goalId, reason = '') {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return { success: false, error: 'Goal not found' };
    }
    
    goal.status = 'deferred';
    goal.metadata.deferredReason = reason;
    
    this.activeGoals.delete(goalId);
    this.stats.goalsDeferred++;

    this._dirty = true;
    this._saveToDisk();

    this.logger.info(`[${this.name}] ⏸️  Deferred goal: ${goal.title} - ${reason}`);

    return { success: true, goal };
  }

  getActiveGoals(filter = {}) {
    const goals = Array.from(this.activeGoals).map(id => this.goals.get(id));
    
    // Apply filters
    let filtered = goals;
    if (filter.category) {
      filtered = filtered.filter(g => g.category === filter.category);
    }
    if (filter.type) {
      filtered = filtered.filter(g => g.type === filter.type);
    }
    if (filter.minPriority) {
      filtered = filtered.filter(g => g.priority >= filter.minPriority);
    }
    
    // Sort by priority
    filtered.sort((a, b) => b.priority - a.priority);
    
    return {
      success: true,
      goals: filtered,
      count: filtered.length,
      total: this.activeGoals.size
    };
  }

  getGoalStatus(goalId) {
    const goal = this.goals.get(goalId);
    if (!goal) {
      return { success: false, error: 'Goal not found' };
    }
    
    return {
      success: true,
      goal,
      age: Date.now() - goal.createdAt,
      isStalled: this.isGoalStalled(goal)
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ GOAL PRIORITIZATION ░░
  // ═══════════════════════════════════════════════════════════

  calculateGoalPriority(goal) {
    const scores = {
      impact: this.calculateImpactScore(goal),
      urgency: this.calculateUrgencyScore(goal),
      feasibility: this.calculateFeasibilityScore(goal),
      resourceCost: this.calculateResourceCostScore(goal)
    };
    
    const priority = 
      scores.impact * this.priorityWeights.impact +
      scores.urgency * this.priorityWeights.urgency +
      scores.feasibility * this.priorityWeights.feasibility +
      scores.resourceCost * this.priorityWeights.resourceCost;
    
    return Math.round(priority * 100);
  }

  calculateImpactScore(goal) {
    // Higher impact for strategic goals
    const typeScores = { strategic: 1.0, tactical: 0.7, operational: 0.5 };
    const typeScore = typeScores[goal.type] || 0.5;
    
    // Higher impact for certain categories
    const categoryScores = {
      learning: 0.9,
      optimization: 0.8,
      quality: 0.7,
      capability: 1.0
    };
    const categoryScore = categoryScores[goal.category] || 0.5;
    
    return (typeScore + categoryScore) / 2;
  }

  calculateUrgencyScore(goal) {
    if (!goal.dueDate) return 0.5;
    
    const daysUntilDue = (goal.dueDate - Date.now()) / 86400000;
    if (daysUntilDue < 1) return 1.0;
    if (daysUntilDue < 3) return 0.9;
    if (daysUntilDue < 7) return 0.7;
    if (daysUntilDue < 30) return 0.5;
    return 0.3;
  }

  calculateFeasibilityScore(goal) {
    // Base feasibility on dependencies and prerequisites
    const dependencyPenalty = goal.dependencies.length * 0.1;
    const prerequisitePenalty = goal.prerequisites.length * 0.15;
    
    const score = 1.0 - Math.min(0.5, dependencyPenalty + prerequisitePenalty);
    
    return Math.max(0.3, score);
  }

  calculateResourceCostScore(goal) {
    // Inverse score - lower cost = higher score
    const assigneeCount = goal.assignedTo.length;
    if (assigneeCount === 0) return 1.0;
    if (assigneeCount === 1) return 0.9;
    if (assigneeCount === 2) return 0.7;
    return 0.5;
  }

  async rebalancePriorities() {
    this.logger.info(`[${this.name}] 🔄 Rebalancing goal priorities...`);
    
    let updated = 0;
    for (const goalId of this.activeGoals) {
      const goal = this.goals.get(goalId);
      const newPriority = this.calculateGoalPriority(goal);
      
      if (Math.abs(newPriority - goal.priority) > 5) {
        goal.priority = newPriority;
        updated++;
      }
    }
    
    this.logger.info(`[${this.name}] Updated priorities for ${updated} goals`);
  }

  async deferLowPriorityGoals(count = 1) {
    // Prefer deferring pending goals first, then active goals — lowest priority first
    const goals = Array.from(this.activeGoals)
      .map(id => this.goals.get(id))
      .filter(g => g && (g.status === 'pending' || g.status === 'active'))
      .sort((a, b) => {
        // Pending before active (cheaper to defer)
        if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
        // Then lowest priority first
        return a.priority - b.priority;
      });

    const toDefer = goals.slice(0, count);

    for (const goal of toDefer) {
      await this.cancelGoal(goal.id, 'Auto-deferred due to goal limit');
    }

    return toDefer.length;
  }

  /**
   * Check if a similar active goal already exists (deduplication)
   * Matches on same category + overlapping keywords in title
   */
  _findSimilarActiveGoal(category, title) {
    const titleWords = new Set(title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
    for (const goalId of this.activeGoals) {
      const goal = this.goals.get(goalId);
      if (!goal || goal.category !== category) continue;
      const goalWords = new Set(goal.title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
      // Count overlapping words
      let overlap = 0;
      for (const w of titleWords) {
        if (goalWords.has(w)) overlap++;
      }
      // If >50% of words overlap, it's a duplicate
      if (titleWords.size > 0 && overlap / titleWords.size > 0.5) {
        return goal;
      }
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ EXECUTION COORDINATION ░░
  // ═══════════════════════════════════════════════════════════

  async assignGoalTasks(goal) {
    if (goal.assignedTo.length === 0) {
      this.logger.warn(`[${this.name}] No arbiters assigned to goal: ${goal.title}`);
      return;
    }
    
    for (const arbiter of goal.assignedTo) {
      const taskId = crypto.randomUUID();
      const task = {
        taskId,
        arbiter,
        status: 'assigned',
        assignedAt: Date.now(),
        completedAt: null
      };
      
      goal.tasks.push(task);
      
      // Send task assignment message
      await messageBroker.sendMessage({
        from: this.name,
        to: arbiter,
        type: 'goal_assigned',
        payload: {
          goalId: goal.id,
          taskId,
          goal: {
            title: goal.title,
            description: goal.description,
            category: goal.category,
            metrics: goal.metrics
          }
        }
      });
      
      this.logger.info(`[${this.name}] 📤 Assigned task ${taskId.slice(0, 8)} to ${arbiter}`);
    }
  }

  isGoalStalled(goal) {
    if (goal.status !== 'active') return false;
    
    const daysSinceStart = (Date.now() - goal.startedAt) / 86400000;
    const progressRate = goal.metrics.progress / Math.max(1, daysSinceStart);
    
    // Stalled if less than 1% progress per day for longer than threshold
    return daysSinceStart > this.stalledThresholdDays && progressRate < 1.0;
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ AUTONOMOUS GOAL GENERATION ░░
  // ═══════════════════════════════════════════════════════════

  async handleVelocityReport(payload) {
    try {
      // SelfEvolvingGoalEngine is active — it generates goals from real analysis, not metric templates
      if (this._selfEvolvingActive) return { success: true, goalsGenerated: 0 };

      const { currentVelocity, targetVelocity, trend } = payload;

      // Generate goal if velocity is below threshold
      if (currentVelocity < this.thresholds.velocityWarning * targetVelocity) {
        const gap = targetVelocity - currentVelocity;
        const improvement = ((gap / currentVelocity) * 100).toFixed(0);
        
        await this.createGoal({
          type: 'tactical',
          category: 'learning',
          title: `Increase learning velocity to ${targetVelocity}x target`,
          description: `Current velocity: ${currentVelocity.toFixed(2)}x, Target: ${targetVelocity}x. Need ${improvement}% improvement.`,
          metrics: {
            target: { metric: 'learning_velocity', value: targetVelocity },
            current: { metric: 'learning_velocity', value: currentVelocity },
            progress: 0
          },
          assignedTo: ['LearningVelocityTracker', 'EdgeWorkerOrchestrator'],
          confidence: 0.9,
          rationale: `Velocity ${improvement}% below target. ${trend === 'declining' ? 'Declining trend detected.' : ''}`,
          dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000) // 30 days
        }, 'autonomous');
        
        this.logger.info(`[${this.name}] 🎯 Generated learning velocity goal (current: ${currentVelocity.toFixed(2)}x)`);
      }
      
      return { success: true, goalsGenerated: 1 };
    } catch (err) {
      this.logger.error(`[${this.name}] handleVelocityReport error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleCodeAnalysis(payload) {
    try {
      // SelfEvolvingGoalEngine is active — it generates goals from real analysis, not metric templates
      if (this._selfEvolvingActive) return { success: true, goalsGenerated: 0 };

      const { issues, metrics, riskFiles } = payload;

      // Generate refactoring goals for high-risk modules
      if (riskFiles && riskFiles.length > 0 && metrics.quality < this.thresholds.codeQualityWarning) {
        const topRisks = riskFiles.slice(0, 5);
        const riskCount = topRisks.length;
        
        await this.createGoal({
          type: 'operational',
          category: 'quality',
          title: `Refactor ${riskCount} high-risk modules`,
          description: `Code quality: ${(metrics.quality * 100).toFixed(0)}%. High-risk files: ${topRisks.map(f => f.path).join(', ')}`,
          metrics: {
            target: { metric: 'code_quality', value: 0.85 },
            current: { metric: 'code_quality', value: metrics.quality },
            progress: 0
          },
          assignedTo: ['EngineeringSwarmArbiter'],
          confidence: 0.85,
          rationale: `${issues.length} code issues found. ${riskCount} files exceed complexity thresholds.`,
          dueDate: Date.now() + (14 * 24 * 60 * 60 * 1000) // 14 days
        }, 'autonomous');
        
        this.logger.info(`[${this.name}] 🎯 Generated code quality goal (${riskCount} files)`);
        return { success: true, goalsGenerated: 1 };
      }
      
      return { success: true, goalsGenerated: 0 };
    } catch (err) {
      this.logger.error(`[${this.name}] handleCodeAnalysis error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleMemoryMetrics(payload) {
    try {
      const { usage, tiers, efficiency } = payload;
      
      // Generate optimization goal if memory usage is high
      if (usage && usage.percentage > this.thresholds.memoryWarning) {
        const improvement = ((usage.percentage - 0.70) * 100).toFixed(0); // Target 70%
        
        await this.createGoal({
          type: 'tactical',
          category: 'optimization',
          title: `Optimize memory usage (reduce by ${improvement}%)`,
          description: `Current: ${(usage.percentage * 100).toFixed(0)}% (${(usage.used / 1e9).toFixed(2)} GB). Target: <70%`,
          metrics: {
            target: { metric: 'memory_usage_pct', value: 0.70 },
            current: { metric: 'memory_usage_pct', value: usage.percentage },
            progress: 0
          },
          assignedTo: ['MnemonicArbiter-REAL', 'ArchivistArbiter'],
          confidence: 0.88,
          rationale: `Memory usage at ${(usage.percentage * 100).toFixed(0)}%, exceeding ${(this.thresholds.memoryWarning * 100)}% threshold.`,
          dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        }, 'autonomous');
        
        this.logger.info(`[${this.name}] 🎯 Generated memory optimization goal (${(usage.percentage * 100).toFixed(0)}%)`);
        return { success: true, goalsGenerated: 1 };
      }
      
      // Generate compression goal if efficiency is low
      if (efficiency && efficiency.compressionRatio < 0.5) {
        await this.createGoal({
          type: 'operational',
          category: 'optimization',
          title: 'Improve memory compression efficiency',
          description: `Current compression ratio: ${(efficiency.compressionRatio * 100).toFixed(0)}%. Target: >50%`,
          metrics: {
            target: { metric: 'compression_ratio', value: 0.5 },
            current: { metric: 'compression_ratio', value: efficiency.compressionRatio },
            progress: 0
          },
          assignedTo: ['ArchivistArbiter'],
          confidence: 0.75,
          rationale: 'Low compression efficiency detected in cold tier storage.',
          dueDate: Date.now() + (14 * 24 * 60 * 60 * 1000)
        }, 'autonomous');
        
        this.logger.info(`[${this.name}] 🎯 Generated compression efficiency goal`);
        return { success: true, goalsGenerated: 1 };
      }
      
      return { success: true, goalsGenerated: 0 };
    } catch (err) {
      this.logger.error(`[${this.name}] handleMemoryMetrics error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleFitnessUpdate(payload) {
    try {
      const { arbiterName, fitnessScore, metrics } = payload;
      
      // Generate evolution goal if fitness is low
      if (fitnessScore < this.thresholds.fitnessWarning) {
        const improvement = ((this.thresholds.fitnessWarning - fitnessScore) * 100).toFixed(0);
        
        await this.createGoal({
          type: 'tactical',
          category: 'optimization',
          title: `Improve ${arbiterName} fitness to >0.65`,
          description: `Current fitness: ${(fitnessScore * 100).toFixed(0)}%. Target: >65%. Needs ${improvement}% improvement.`,
          metrics: {
            target: { metric: 'arbiter_fitness', value: 0.80 },
            current: { metric: 'arbiter_fitness', value: fitnessScore },
            progress: 0
          },
          assignedTo: ['GenomeArbiter', 'EngineeringSwarmArbiter'],
          confidence: 0.82,
          rationale: `${arbiterName} fitness at ${(fitnessScore * 100).toFixed(0)}%, below ${(this.thresholds.fitnessWarning * 100)}% threshold.`,
          dueDate: Date.now() + (21 * 24 * 60 * 60 * 1000) // 21 days
        }, 'autonomous');
        
        this.logger.info(`[${this.name}] 🎯 Generated fitness improvement goal for ${arbiterName}`);
        return { success: true, goalsGenerated: 1 };
      }
      
      return { success: true, goalsGenerated: 0 };
    } catch (err) {
      this.logger.error(`[${this.name}] handleFitnessUpdate error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleDiscoveryComplete(payload) {
    try {
      const { topic, coverage, gaps } = payload;

      // Generate learning goals for knowledge gaps
      if (gaps && gaps.length > 0) {
        const topGaps = gaps.slice(0, 3);
        const gapCount = topGaps.length;

        for (const gap of topGaps) {
          await this.createGoal({
            type: 'operational',
            category: 'learning',
            title: `Study ${gap.topic} (${gap.priority} priority)`,
            description: `Coverage: ${gap.coverage}%. Identified as knowledge gap during ${topic} discovery.`,
            metrics: {
              target: { metric: 'knowledge_coverage', value: 80 },
              current: { metric: 'knowledge_coverage', value: gap.coverage || 0 },
              progress: 0
            },
            assignedTo: ['KnowledgeDiscoveryWorker', 'WebScraperDendrite'],
            confidence: 0.70,
            rationale: `Knowledge gap detected: ${gap.rationale || 'No prior coverage'}`,
            dueDate: Date.now() + (30 * 24 * 60 * 60 * 1000)
          }, 'autonomous');
        }

        this.logger.info(`[${this.name}] 🎯 Generated ${gapCount} knowledge gap learning goals`);
        return { success: true, goalsGenerated: gapCount };
      }

      return { success: true, goalsGenerated: 0 };
    } catch (err) {
      this.logger.error(`[${this.name}] handleDiscoveryComplete error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleContradictionDetected(payload) {
    try {
      const { contradiction } = payload;

      // Only create goals for high/critical contradictions
      if (contradiction.severity === 'critical' || contradiction.severity === 'high') {
        const severity = contradiction.severity.toUpperCase();

        await this.createGoal({
          type: 'strategic',
          category: 'consistency',
          title: `[${severity}] Resolve belief contradiction`,
          description: `${contradiction.description}. Type: ${contradiction.type}`,
          metrics: {
            target: { metric: 'contradictions_resolved', value: 1 },
            current: { metric: 'contradictions_resolved', value: 0 },
            progress: 0
          },
          assignedTo: ['BeliefSystemArbiter', 'KnowledgeGraphFusion'],
          confidence: 0.95,
          rationale: `${severity} severity contradiction detected: ${contradiction.description}`,
          dueDate: Date.now() + (contradiction.severity === 'critical' ? 3 : 7) * 24 * 60 * 60 * 1000,
          metadata: {
            contradictionId: contradiction.id,
            beliefs: contradiction.beliefs
          }
        }, 'autonomous');

        this.logger.info(`[${this.name}] 🎯 Generated contradiction resolution goal (${severity})`);
        return { success: true, goalsGenerated: 1 };
      }

      return { success: true, goalsGenerated: 0 };
    } catch (err) {
      this.logger.error(`[${this.name}] handleContradictionDetected error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handlePracticeReminder(payload) {
    try {
      const { skillId, skillName, proficiency, proficiencyLevel } = payload;

      // Only create goals for skills below intermediate level
      if (proficiency < 0.5) {
        await this.createGoal({
          type: 'operational',
          category: 'learning',
          title: `Practice skill: ${skillName}`,
          description: `Current proficiency: ${(proficiency * 100).toFixed(0)}% (${proficiencyLevel}). Needs practice to advance.`,
          metrics: {
            target: { metric: 'skill_proficiency', value: 0.7 },
            current: { metric: 'skill_proficiency', value: proficiency },
            progress: 0
          },
          assignedTo: ['SkillAcquisitionArbiter'],
          confidence: 0.80,
          rationale: `Skill proficiency at ${(proficiency * 100).toFixed(0)}%, practice needed to reach intermediate level`,
          dueDate: Date.now() + (14 * 24 * 60 * 60 * 1000),
          metadata: {
            skillId,
            skillName,
            currentProficiency: proficiency
          }
        }, 'autonomous');

        this.logger.info(`[${this.name}] 🎯 Generated skill practice goal for ${skillName}`);
        return { success: true, goalsGenerated: 1 };
      }

      return { success: true, goalsGenerated: 0 };
    } catch (err) {
      this.logger.error(`[${this.name}] handlePracticeReminder error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleSkillDegraded(payload) {
    try {
      const { skillId, skillName, oldProficiency, newProficiency, proficiencyLevel } = payload;

      // Create urgent goal if significant degradation (>20% drop)
      const degradation = oldProficiency - newProficiency;
      if (degradation > 0.2) {
        await this.createGoal({
          type: 'tactical',
          category: 'learning',
          title: `[URGENT] Restore degraded skill: ${skillName}`,
          description: `Proficiency dropped from ${(oldProficiency * 100).toFixed(0)}% to ${(newProficiency * 100).toFixed(0)}% (-${(degradation * 100).toFixed(0)}%). Immediate practice needed.`,
          metrics: {
            target: { metric: 'skill_proficiency', value: oldProficiency },
            current: { metric: 'skill_proficiency', value: newProficiency },
            progress: 0
          },
          assignedTo: ['SkillAcquisitionArbiter'],
          confidence: 0.90,
          rationale: `Significant skill degradation: ${(degradation * 100).toFixed(0)}% drop from lack of practice`,
          dueDate: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days (urgent)
          metadata: {
            skillId,
            skillName,
            degradation,
            oldProficiency,
            newProficiency
          }
        }, 'autonomous');

        this.logger.info(`[${this.name}] 🎯 Generated URGENT skill restoration goal for ${skillName}`);
        return { success: true, goalsGenerated: 1 };
      }

      return { success: true, goalsGenerated: 0 };
    } catch (err) {
      this.logger.error(`[${this.name}] handleSkillDegraded error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleResourcePressure(payload) {
    try {
      const { resourceType, pressure, budget, urgency } = payload;

      this.logger.warn(`[${this.name}] 🚨 Resource pressure critical: ${resourceType}`);

      // Create optimization goal based on resource type
      const goalTemplates = {
        apiCalls: {
          title: `[URGENT] Reduce API call usage - budget critical`,
          description: `API budget pressure at ${(pressure * 100).toFixed(0)}%. Remaining: ${budget.remaining}/${budget.daily} calls. Need immediate optimization.`,
          assignedTo: ['ResourceBudgetArbiter', 'EngineeringSwarmArbiter'],
          dueDate: Date.now() + (3 * 24 * 60 * 60 * 1000) // 3 days
        },
        memory: {
          title: `[URGENT] Optimize memory usage - approaching limit`,
          description: `Memory pressure at ${(pressure * 100).toFixed(0)}%. Using ${budget.usedMB}/${budget.budgetMB} MB. Critical compression needed.`,
          assignedTo: ['MnemonicArbiter-REAL', 'ArchivistArbiter'],
          dueDate: Date.now() + (1 * 24 * 60 * 60 * 1000) // 1 day (urgent)
        },
        compute: {
          title: `[URGENT] Reduce compute usage - budget low`,
          description: `Compute budget pressure at ${(pressure * 100).toFixed(0)}%. Used ${budget.usedSeconds}/${budget.dailySeconds}s. Optimize algorithms.`,
          assignedTo: ['EngineeringSwarmArbiter', 'LoadPipelineArbiter'],
          dueDate: Date.now() + (2 * 24 * 60 * 60 * 1000) // 2 days
        }
      };

      const template = goalTemplates[resourceType];
      if (!template) {
        return { success: false, error: 'Unknown resource type' };
      }

      await this.createGoal({
        type: 'tactical',
        category: 'optimization',
        title: template.title,
        description: template.description,
        metrics: {
          target: { metric: `${resourceType}_pressure`, value: 0.5 },
          current: { metric: `${resourceType}_pressure`, value: pressure },
          progress: 0
        },
        assignedTo: template.assignedTo,
        confidence: 0.95,
        rationale: `Critical resource pressure - immediate optimization required`,
        dueDate: template.dueDate,
        metadata: {
          resourceType,
          pressure,
          budget,
          triggeredBy: 'ResourceBudgetArbiter'
        }
      }, 'autonomous');

      this.logger.info(`[${this.name}] 🎯 Generated resource optimization goal for ${resourceType}`);
      return { success: true, goalsGenerated: 1 };

    } catch (err) {
      this.logger.error(`[${this.name}] handleResourcePressure error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async mediateConflict(payload) {
    try {
      const { proposal, progressivePosition, conservativePosition } = payload;

      this.logger.info(`[${this.name}] ⚖️  Mediating Conservative vs Progressive conflict`);

      // Decision matrix: balance risk and opportunity
      const riskScore = conservativePosition?.conservativeRisk || 0.5;
      const opportunityScore = progressivePosition?.opportunityScore || 0.5;

      let decision;
      let reasoning = [];

      // High opportunity + acceptable risk = approve
      if (opportunityScore > 0.7 && riskScore < 0.5) {
        decision = 'APPROVE_PROGRESSIVE';
        reasoning.push('High opportunity with manageable risk');
      }
      // High risk + low opportunity = reject
      else if (riskScore > 0.7 && opportunityScore < 0.5) {
        decision = 'APPROVE_CONSERVATIVE';
        reasoning.push('Risk outweighs potential benefit');
      }
      // Both high = compromise
      else if (riskScore > 0.6 && opportunityScore > 0.6) {
        decision = 'COMPROMISE';
        reasoning.push('Both positions valid - deploy as controlled experiment');
      }
      // Both low = approve with monitoring
      else {
        decision = 'APPROVE_WITH_MONITORING';
        reasoning.push('Moderate risk and opportunity - proceed with caution');
      }

      this.logger.info(`[${this.name}]    Decision: ${decision}`);
      this.logger.info(`[${this.name}]    Risk: ${(riskScore * 100).toFixed(0)}%, Opportunity: ${(opportunityScore * 100).toFixed(0)}%`);

      // Send mediation result
      await messageBroker.sendMessage({
        from: this.name,
        to: 'broadcast',
        type: 'mediation_complete',
        payload: {
          proposal,
          decision,
          reasoning,
          riskScore,
          opportunityScore
        }
      });

      return { success: true, decision, reasoning };

    } catch (err) {
      this.logger.error(`[${this.name}] mediateConflict error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleGoalConcern(payload) {
    try {
      const { goalId, concern, conservativeAlternative } = payload;

      const goal = this.goals.get(goalId);
      if (!goal) {
        return { success: false, error: 'Goal not found' };
      }

      this.logger.warn(`[${this.name}] ⚠️  Conservative concern raised for goal: ${goal.title}`);
      this.logger.warn(`[${this.name}]    ${concern}`);

      // Add metadata noting the concern
      goal.metadata.conservativeConcerns = goal.metadata.conservativeConcerns || [];
      goal.metadata.conservativeConcerns.push({
        concern,
        alternative: conservativeAlternative,
        timestamp: Date.now()
      });

      // Lower priority slightly if multiple concerns
      if (goal.metadata.conservativeConcerns.length > 2) {
        goal.priority = Math.max(0, goal.priority - 10);
        this.logger.info(`[${this.name}]    Lowered priority to ${goal.priority} due to repeated concerns`);
      }

      return { success: true };

    } catch (err) {
      this.logger.error(`[${this.name}] handleGoalConcern error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  async handleGoalEnhancement(payload) {
    try {
      const { goalId, suggestion, progressiveEnhancement } = payload;

      const goal = this.goals.get(goalId);
      if (!goal) {
        return { success: false, error: 'Goal not found' };
      }

      this.logger.info(`[${this.name}] 💡 Progressive enhancement suggested for goal: ${goal.title}`);
      this.logger.info(`[${this.name}]    ${suggestion}`);

      // Add metadata noting the enhancement
      goal.metadata.progressiveEnhancements = goal.metadata.progressiveEnhancements || [];
      goal.metadata.progressiveEnhancements.push({
        suggestion,
        enhancement: progressiveEnhancement,
        timestamp: Date.now()
      });

      // Increase priority slightly if aligned with growth
      if (goal.category === 'capability' || goal.category === 'learning') {
        goal.priority = Math.min(100, goal.priority + 10);
        this.logger.info(`[${this.name}]    Increased priority to ${goal.priority} (aligned with growth)`);
      }

      return { success: true };

    } catch (err) {
      this.logger.error(`[${this.name}] handleGoalEnhancement error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ PLANNING LOOP ░░
  // ═══════════════════════════════════════════════════════════

  startPlanningLoop() {
    const intervalMs = this.planningIntervalHours * 60 * 60 * 1000;
    
    this.planningInterval = setInterval(async () => {
      await this.runPlanningCycle();
    }, intervalMs);
    
    this.logger.info(`[${this.name}] Planning loop started (every ${this.planningIntervalHours}h)`);
  }

  async runPlanningCycle() {
    this.logger.info(`[${this.name}] 🧠 Running planning cycle...`);
    
    try {
      // Rebalance priorities
      await this.rebalancePriorities();
      
      // Check for stalled goals
      await this.reviewStalledGoals();
      
      // Calculate statistics
      this.updateStatistics();
      
      this.logger.info(`[${this.name}] Planning cycle complete`);
      this.logger.info(`[${this.name}]    Active: ${this.activeGoals.size}, Completed: ${this.completedGoals.length}, Failed: ${this.failedGoals.length}`);
      
      return { success: true };
    } catch (err) {
      this.logger.error(`[${this.name}] Planning cycle error: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  startMonitoringLoop() {
    // Check stalled goals every hour
    this.monitoringInterval = setInterval(async () => {
      await this.reviewStalledGoals();
    }, 60 * 60 * 1000);
    
    this.logger.info(`[${this.name}] Monitoring loop started (every 1h)`);
  }

  async reviewStalledGoals() {
    const stalled = [];
    
    for (const goalId of this.activeGoals) {
      const goal = this.goals.get(goalId);
      if (this.isGoalStalled(goal)) {
        stalled.push(goal);
      }
    }
    
    if (stalled.length > 0) {
      this.logger.warn(`[${this.name}] ⚠️  Found ${stalled.length} stalled goals`);
      
      for (const goal of stalled) {
        this.logger.warn(`[${this.name}]    - ${goal.title} (${goal.metrics.progress}% progress)`);
        
        // Could implement auto-escalation or re-assignment here
      }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ STATISTICS ░░
  // ═══════════════════════════════════════════════════════════

  updateStatistics() {
    // Calculate goals per week
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    const recentGoals = this.completedGoals.filter(g => g.completedAt > oneWeekAgo);
    this.stats.goalsPerWeek = recentGoals.length;
  }

  updateAverageCompletionTime(completedGoal) {
    const duration = completedGoal.completedAt - completedGoal.startedAt;
    
    if (this.stats.goalsCompleted === 1) {
      this.stats.avgCompletionTime = duration;
    } else {
      // Running average
      this.stats.avgCompletionTime = 
        (this.stats.avgCompletionTime * (this.stats.goalsCompleted - 1) + duration) / 
        this.stats.goalsCompleted;
    }
  }

  getStatistics() {
    return {
      ...this.stats,
      activeGoals: this.activeGoals.size,
      completedGoals: this.completedGoals.length,
      failedGoals: this.failedGoals.length,
      successRate: this.stats.goalsCompleted / Math.max(1, this.stats.goalsCompleted + this.stats.goalsFailed),
      avgCompletionDays: this.stats.avgCompletionTime / 86400000,
      nemesis: this.getNemesisStats()
    };
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ PERSISTENCE ░░
  // ═══════════════════════════════════════════════════════════

  _saveToDisk() {
    try {
      // Ensure data directory exists
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }

      // Only persist active goals + recently deferred/completed (last 7 days)
      // This prevents the goals.json file from growing unbounded
      const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      const goalsToSave = {};
      for (const [id, goal] of this.goals) {
        if (this.activeGoals.has(id)) {
          goalsToSave[id] = goal; // Always save active goals
        } else {
          const age = now - (goal.completedAt || goal.createdAt || 0);
          if (age < SEVEN_DAYS) {
            goalsToSave[id] = goal; // Save recent non-active goals
          }
        }
      }

      const snapshot = {
        version: 1,
        savedAt: now,
        goals: goalsToSave,
        activeGoals: Array.from(this.activeGoals),
        completedGoals: this.completedGoals.slice(0, this.maxCompletedHistory),
        failedGoals: this.failedGoals.slice(0, 50),
        stats: this.stats
      };

      fs.writeFileSync(this.persistPath, JSON.stringify(snapshot, null, 2), 'utf8');
      this._dirty = false;
      this.logger.info(`[${this.name}] 💾 Saved ${this.goals.size} goals to disk`);
    } catch (err) {
      this.logger.error(`[${this.name}] Failed to save goals: ${err.message}`);
    }
  }

  async _loadFromDisk() {
    try {
      if (!fs.existsSync(this.persistPath)) {
        this.logger.info(`[${this.name}] No persisted goals found, starting fresh`);
        return;
      }

      const raw = fs.readFileSync(this.persistPath, 'utf8');
      const snapshot = JSON.parse(raw);

      // Restore goals map
      if (snapshot.goals) {
        this.goals = new Map(Object.entries(snapshot.goals));
      }

      // Restore active goals set
      if (snapshot.activeGoals) {
        this.activeGoals = new Set(snapshot.activeGoals.filter(id => this.goals.has(id)));
      }

      // ═══ ENFORCE maxActiveGoals ON RESTORE ═══
      // If disk had more active goals than our limit, trim to the highest-priority ones
      if (this.activeGoals.size > this.maxActiveGoals) {
        const sorted = Array.from(this.activeGoals)
          .map(id => this.goals.get(id))
          .filter(Boolean)
          .sort((a, b) => b.priority - a.priority); // highest priority first

        const keep = new Set(sorted.slice(0, this.maxActiveGoals).map(g => g.id));
        const excess = sorted.slice(this.maxActiveGoals);

        for (const goal of excess) {
          goal.status = 'deferred';
          goal.metadata = goal.metadata || {};
          goal.metadata.deferredReason = 'Trimmed on restore — exceeded maxActiveGoals';
          this.activeGoals.delete(goal.id);
        }

        this.logger.warn(`[${this.name}] ⚠️ Trimmed ${excess.length} excess active goals on restore (limit: ${this.maxActiveGoals})`);
      }

      // ═══ PRUNE OLD NON-ACTIVE GOALS FROM MAP ═══
      // Remove deferred/completed/failed goals older than 30 days to prevent unbounded Map growth
      const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
      const now = Date.now();
      let pruned = 0;
      for (const [id, goal] of this.goals) {
        if (this.activeGoals.has(id)) continue; // never prune active goals
        const age = now - (goal.completedAt || goal.createdAt || 0);
        if (age > THIRTY_DAYS && (goal.status === 'deferred' || goal.status === 'completed' || goal.status === 'failed')) {
          this.goals.delete(id);
          pruned++;
        }
      }
      if (pruned > 0) {
        this.logger.info(`[${this.name}] 🧹 Pruned ${pruned} old non-active goals from Map`);
      }

      // Restore archives (cap sizes)
      if (snapshot.completedGoals) {
        this.completedGoals = snapshot.completedGoals.slice(0, this.maxCompletedHistory);
      }
      if (snapshot.failedGoals) {
        this.failedGoals = snapshot.failedGoals.slice(0, 50);
      }

      // Restore stats
      if (snapshot.stats) {
        this.stats = { ...this.stats, ...snapshot.stats };
      }

      this.logger.info(`[${this.name}] 📂 Restored ${this.goals.size} goals (${this.activeGoals.size} active, ${this.completedGoals.length} completed)`);
    } catch (err) {
      this.logger.error(`[${this.name}] Failed to load goals: ${err.message} — starting fresh`);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ AUTOPILOT CONTROL ░░
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // ░░ NEMESIS PHASE 2.2: GOAL REALITY CHECKS ░░
  // ═══════════════════════════════════════════════════════════

  /**
   * Run NEMESIS numeric reality check on an autonomous goal proposal.
   *
   * Fate mapping (from PrometheusNemesis.determineFate):
   *   KILL     (<0.30) → Reject.  Goal is pure noise.
   *   MUTATE   (0.30-0.50) → Reject. Goal lacks substance/grounding.
   *   QUARANTINE (0.50-0.70) → Warn. Marginal but possible; tag nemesisWarning.
   *   ALLOW    (0.70-0.85) → Pass.  Decent goal.
   *   PROMOTE  (>=0.85) → Pass cleanly.  Well-grounded goal.
   */
  _nemesisRealityCheck(goal) {
    if (!this.nemesis) return { approved: true, score: 1.0, fate: 'PROMOTE' };

    this.nemesisStats.checked++;

    const desc = `${goal.title} ${goal.description} ${goal.metadata?.rationale || ''}`;

    // FRICTION: Concrete grounding in reality
    let friction = 0.2;
    if (/\d+/.test(desc)) friction += 0.15;                            // Has numbers
    if (goal.metrics?.target) friction += 0.15;                        // Has measurable target
    if (goal.dueDate) friction += 0.10;                                // Has due date
    if (/because|since|due to|based on|currently|threshold|detected/.test(desc.toLowerCase())) friction += 0.15;
    if (goal.description && goal.description.length > 50) friction += 0.10; // Substantive description
    friction = Math.min(1.0, friction);

    // CHARGE: Ambition level (higher = needs more friction to pass)
    const typeCharge = { strategic: 0.8, tactical: 0.55, operational: 0.45 };
    let charge = typeCharge[goal.type] || 0.5;
    if (/innovate|create|discover|transform|expand/.test(goal.title.toLowerCase())) charge += 0.1;
    charge = Math.min(1.0, charge);

    // MASS: Information density (confidence × normalized priority)
    const mass = Math.min(0.9, Math.max(0.1,
      (goal.metadata?.confidence || 0.5) * 0.6 + (goal.priority || 50) / 200
    ));

    const triography = { charge, friction, mass };
    const signature = `${goal.category}:${goal.title.substring(0, 50)}`;

    const result = this.nemesis.evaluateEmergent({
      triography,
      signature,
      sourceIds: [goal.metadata?.source || 'autonomous']
    });

    const score = result.aggregateScore;

    // KILL or MUTATE → reject (score < 0.50, 2+ critical tests failing)
    if (score < 0.50) {
      this.nemesisStats.rejected++;
      this.logger.warn(`[${this.name}] 🔴 NEMESIS REJECTED goal "${goal.title}" (score: ${score.toFixed(2)}, fate: ${result.fate})`);
      this.logger.warn(`[${this.name}]    friction=${friction.toFixed(2)}, charge=${charge.toFixed(2)}, mass=${mass.toFixed(2)} — goal lacks substance/grounding`);
      return {
        approved: false,
        score,
        fate: result.fate,
        reason: `NEMESIS ${result.fate}: score ${score.toFixed(2)} — goal lacks concrete grounding or measurable targets`
      };
    }

    // QUARANTINE (0.50-0.70) → warn but allow
    if (score < 0.70) {
      this.nemesisStats.warned++;
      this.logger.warn(`[${this.name}] ⚠️  NEMESIS QUARANTINE goal "${goal.title}" (score: ${score.toFixed(2)}) — marginal quality, tagging for review`);
      goal.metadata = goal.metadata || {};
      goal.metadata.nemesisWarning = true;
      goal.metadata.nemesisFate = result.fate;
      goal.metadata.nemesisScore = score;
    } else {
      // ALLOW or PROMOTE → clean pass
      this.nemesisStats.passed++;
      this.logger.info(`[${this.name}] ✅ NEMESIS ${result.fate} goal "${goal.title}" (score: ${score.toFixed(2)})`);
    }

    return { approved: true, score, fate: result.fate };
  }

  getNemesisStats() {
    const total = this.nemesisStats.checked;
    return {
      ...this.nemesisStats,
      rejectionRate: total > 0 ? ((this.nemesisStats.rejected / total) * 100).toFixed(1) + '%' : '0%',
      warnRate: total > 0 ? ((this.nemesisStats.warned / total) * 100).toFixed(1) + '%' : '0%'
    };
  }

  pauseAutonomous() {
    if (this._autonomousPaused) return;
    this._autonomousPaused = true;

    if (this.planningInterval) { clearInterval(this.planningInterval); this.planningInterval = null; }
    if (this.monitoringInterval) { clearInterval(this.monitoringInterval); this.monitoringInterval = null; }

    this.logger.info(`[${this.name}] ⏸️  Autonomous planning PAUSED`);
  }

  resumeAutonomous() {
    if (!this._autonomousPaused) return;
    this._autonomousPaused = false;

    this.startPlanningLoop();
    this.startMonitoringLoop();

    this.logger.info(`[${this.name}] ▶️  Autonomous planning RESUMED`);
  }

  isAutonomousActive() {
    return !this._autonomousPaused;
  }

  // ═══════════════════════════════════════════════════════════
  // ░░ LIFECYCLE ░░
  // ═══════════════════════════════════════════════════════════

  async shutdown() {
    this.logger.info(`[${this.name}] Shutting down...`);

    // Save before shutdown
    if (this._dirty) this._saveToDisk();

    if (this.planningInterval) {
      clearInterval(this.planningInterval);
    }
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }

    await super.shutdown();
  }
}

module.exports = GoalPlannerArbiter;
