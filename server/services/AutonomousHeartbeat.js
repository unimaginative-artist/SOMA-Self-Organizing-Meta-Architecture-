// ════════════════════════════════════════════════════════════════════════════
// AutonomousHeartbeat.js
// ════════════════════════════════════════════════════════════════════════════
// The "Pulse" of SOMA's self-driven behavior.
// Periodically polls autonomous systems (GoalPlanner, CuriosityEngine) for tasks,
// and executes them using the local SOMA-1T model to save tokens.
//
// Features:
//   - JSONL run log with auto-pruning  (inspired by clawdbot cron/run-log)
//   - Flexible scheduling: interval, cron expressions, one-shot "at"
//   - Per-task state tracking with duration, error, status history
// ════════════════════════════════════════════════════════════════════════════

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');
const { DriveSystem }   = require('../../core/DriveSystem.cjs');
const { AgendaSystem }  = require('../../core/AgendaSystem.cjs');

// ── Run Log constants ──
const RUN_LOG_DIR = path.join(__dirname, '..', '.soma', 'heartbeat');
const RUN_LOG_PATH = path.join(RUN_LOG_DIR, 'runs.jsonl');
const TASK_STATE_PATH = path.join(RUN_LOG_DIR, 'task-state.json');
const SCHEDULE_PATH = path.join(RUN_LOG_DIR, 'schedules.json');
const RUN_LOG_MAX_BYTES = 2 * 1024 * 1024; // 2 MB
const RUN_LOG_KEEP_LINES = 2000;

// ── Simple cron parser (minute hour dom month dow) ──
function parseCronExpr(expr) {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  return { minute: parts[0], hour: parts[1], dom: parts[2], month: parts[3], dow: parts[4] };
}

function cronFieldMatches(field, value) {
  if (field === '*') return true;
  // Handle */N step values
  if (field.startsWith('*/')) {
    const step = parseInt(field.slice(2), 10);
    return !isNaN(step) && step > 0 && value % step === 0;
  }
  // Handle comma-separated values
  const values = field.split(',').map(v => parseInt(v, 10));
  return values.includes(value);
}

function cronMatchesNow(cron, now) {
  const d = now || new Date();
  return (
    cronFieldMatches(cron.minute, d.getMinutes()) &&
    cronFieldMatches(cron.hour, d.getHours()) &&
    cronFieldMatches(cron.dom, d.getDate()) &&
    cronFieldMatches(cron.month, d.getMonth() + 1) &&
    cronFieldMatches(cron.dow, d.getDay())
  );
}

class AutonomousHeartbeat extends EventEmitter {
  constructor(system, config = {}) {
    super();
    this.system = system;
    this.config = {
      intervalMs: config.intervalMs || 2 * 60 * 1000, // Default: 2 minutes
      maxConsecutiveFailures: 5,
      enabled: false,
      ...config
    };

    this.timer = null;
    this.isRunning = false;
    this.isProcessing = false;
    this.stats = {
      cycles: 0,
      tasksExecuted: 0,
      failures: 0,
      lastRun: null,
      lastTask: null,
      lastResult: null
    };

    // ── Per-task state tracking ──
    // key = "source:identifier" → { lastRunAt, lastStatus, lastError, lastDurationMs, runs, failures }
    this.taskState = new Map();

    // ── Scheduled jobs (cron/at/every beyond the base interval) ──
    // { id, name, schedule: { kind, ... }, message, enabled, state }
    this.scheduledJobs = [];

    // ── Run log write serialization ──
    this._logWriteChain = Promise.resolve();

    this.logger = config.logger || console;

    // ── Idle cycle counter (for proactive messaging cadence) ──
    this._idleCycles = 0;

    // ── Drive system: tension / urgency / reward ──
    this.drive = new DriveSystem();

    // ── Learning agenda: 200-item knowledge roadmap toward ASI ──
    this.agenda = new AgendaSystem();
  }

  async initialize() {
    this.logger.log('[AutonomousHeartbeat] ❤️ Initializing SOMA Pulse...');
    this._ensureLogDir();
    this._loadTaskState();
    this._loadSchedules();
    // Auto-start if configured, otherwise wait for toggleAutopilot
    if (this.config.enabled) {
      this.start();
    }
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.logger.log(`[AutonomousHeartbeat] ▶️  Pulse STARTED (Interval: ${this.config.intervalMs / 1000}s)`);
    
    // Run immediately, then interval
    this.tick();
    this.timer = setInterval(() => this.tick(), this.config.intervalMs);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this._saveTaskState();
    this.logger.log('[AutonomousHeartbeat] ⏸️  Pulse STOPPED');
  }

  // ═══════════════════════════════════════════
  // SCHEDULING: Add/remove flexible schedules
  // ═══════════════════════════════════════════

  /**
   * Add a scheduled job.
   * schedule types:
   *   { kind: 'every', everyMs: 300000 }             — every 5 min
   *   { kind: 'cron',  expr: '0 9 * * *' }           — daily at 9am
   *   { kind: 'at',    atMs: 1708500000000 }         — one-shot at timestamp
   */
  addSchedule(job) {
    const id = job.id || `sched-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const entry = {
      id,
      name: job.name || 'Unnamed schedule',
      description: job.description || job.message || '',
      message: job.message || job.description || '',
      enabled: job.enabled !== false,
      schedule: job.schedule, // { kind, everyMs?, expr?, atMs? }
      createdAt: Date.now(),
      state: {
        lastRunAt: null,
        lastStatus: null,
        lastError: null,
        lastDurationMs: null,
        nextRunAt: this._computeNextRun(job.schedule),
        runs: 0
      }
    };
    this.scheduledJobs.push(entry);
    this._saveSchedules();
    this.logger.log(`[AutonomousHeartbeat] 📅 Schedule added: "${entry.name}" (${entry.schedule.kind})`);
    return entry;
  }

  removeSchedule(id) {
    const idx = this.scheduledJobs.findIndex(j => j.id === id);
    if (idx === -1) return false;
    const removed = this.scheduledJobs.splice(idx, 1)[0];
    this._saveSchedules();
    this.logger.log(`[AutonomousHeartbeat] 🗑️ Schedule removed: "${removed.name}"`);
    return true;
  }

  listSchedules() {
    return this.scheduledJobs.map(j => ({ ...j }));
  }

  /**
   * Compute next run time for a schedule.
   */
  _computeNextRun(schedule, now) {
    const nowMs = now || Date.now();
    if (!schedule) return null;

    if (schedule.kind === 'at') {
      return schedule.atMs > nowMs ? schedule.atMs : null;
    }

    if (schedule.kind === 'every') {
      const everyMs = Math.max(1, Math.floor(schedule.everyMs || 60000));
      const anchor = Math.max(0, Math.floor(schedule.anchorMs || nowMs));
      if (nowMs < anchor) return anchor;
      const elapsed = nowMs - anchor;
      const steps = Math.max(1, Math.floor((elapsed + everyMs - 1) / everyMs));
      return anchor + steps * everyMs;
    }

    if (schedule.kind === 'cron') {
      // For cron, we just check at each tick whether the expression matches.
      // Return a sentinel to indicate "determined at tick time".
      return -1; // Sentinel: check at tick time
    }

    return null;
  }

  /**
   * Check which scheduled jobs are due right now.
   */
  _getDueSchedules() {
    const now = Date.now();
    const due = [];

    for (const job of this.scheduledJobs) {
      if (!job.enabled) continue;

      if (job.schedule.kind === 'at') {
        if (job.state.nextRunAt && now >= job.state.nextRunAt) {
          due.push(job);
        }
      } else if (job.schedule.kind === 'every') {
        if (job.state.nextRunAt && now >= job.state.nextRunAt) {
          due.push(job);
        }
      } else if (job.schedule.kind === 'cron') {
        const cron = parseCronExpr(job.schedule.expr);
        if (cron && cronMatchesNow(cron)) {
          // Avoid running the same cron job twice in the same minute
          const lastRun = job.state.lastRunAt || 0;
          const minuteAgo = now - 60000;
          if (lastRun < minuteAgo) {
            due.push(job);
          }
        }
      }
    }

    return due;
  }

  // ═══════════════════════════════════════════
  // WEBSOCKET BROADCASTING
  // ═══════════════════════════════════════════

  /**
   * Push a real-time event to all connected frontends.
   * Uses the unified broadcast (Dashboard WS + Socket.IO).
   */
  _broadcast(event, data) {
    try {
      this.system.ws?.broadcast?.(event, { ...data, timestamp: Date.now() });
    } catch (e) {
      // Non-critical — never break heartbeat for a broadcast failure
    }
  }

  // ═══════════════════════════════════════════
  // CORE TICK
  // ═══════════════════════════════════════════

  /**
   * The core execution loop — polls for tasks AND checks scheduled jobs.
   */
  async tick() {
    if (this.isProcessing || !this.isRunning) return;
    this.isProcessing = true;
    this.stats.lastRun = Date.now();

    try {
      // ── Phase 1: Execute any due scheduled jobs ──
      const dueJobs = this._getDueSchedules();
      for (const job of dueJobs) {
        await this._executeScheduledJob(job);
      }

      // ── Phase 2: Poll autonomous systems for organic tasks ──
      const task = await this._pollForTask();
      
      if (task) {
        const startTime = Date.now();
        this.logger.log(`[AutonomousHeartbeat] ⚡ Executing autonomous task: "${task.description.substring(0, 60)}..."`);
        this.stats.lastTask = task.description;

        // ── Agentic execution for real goal tasks ──
        // If this is a GoalPlanner task and the AgenticExecutor is wired in,
        // use it instead of a plain QuadBrain.reason() call. The executor runs
        // a real ReAct loop with actual tools (web_fetch, read_file, etc.).
        let result;
        const isGoalTask = task.context?.goalId && this.system.agenticExecutor;

        if (isGoalTask) {
          const goal = this.system.goalPlanner?.goals?.get(task.context.goalId);
          if (goal) {
            const execResult = await this.system.agenticExecutor.execute(goal);
            const toolsList = (execResult.toolsUsed || []).join(', ') || 'reasoning';
            const progressVal = execResult.done
              ? 100
              : Math.min(20 + (execResult.iterations || 0) * 11, 82);
            result = {
              ok: true,
              text: [
                `ACTION: Agentic execution (${execResult.iterations} step(s) | tools: ${toolsList})`,
                `RESULT: ${execResult.result || 'Partial progress'}`,
                `PROGRESS: ${progressVal}`,
                `COMPLETE: ${execResult.done ? 'yes' : 'no'}`,
                `INSIGHT: ${(execResult.result || 'none').substring(0, 150)}`
              ].join('\n'),
              brain: 'AgenticExecutor'
            };
          }
        }

        // Fallback: plain QuadBrain.reason() for curiosity / learning tasks
        // localModel: true → routes to soma (3.2B Ollama) — these are background tasks,
        // not user-facing, so the small local model is the right tool here.
        if (!result) {
          result = await this.system.quadBrain.reason(task.description, {
            localModel: true,
            source: 'autonomous_heartbeat',
            context: task.context || {},
            systemOverride: 'You are SOMA-1T (System 1). Execute this task efficiently using your internal knowledge. Be concise.'
          });
        }

        const durationMs = Date.now() - startTime;
        const taskKey = `${task.source}:${task.context?.goalId || task.context?.topic || 'default'}`;

        if (result.ok) {
          this.stats.tasksExecuted++;
          this.stats.lastResult = "Success";
          this.drive.onTaskExecuted(); // Release some tension — we did something
          this._updateTaskState(taskKey, 'ok', null, durationMs);
          
          // Record to long-term memory
          if (this.system.mnemonicArbiter?.remember) {
            await this.system.mnemonicArbiter.remember(
              `Autonomous [${task.source}]: ${task.description.substring(0, 150)} → ${result.text.substring(0, 200)}`,
              { type: 'autonomous_action', importance: 5, source: task.source }
            ).catch(() => {});
          }

          // Callback to source system
          if (task.onComplete) {
            await task.onComplete(result);
          }
          
          // Append to run log
          this._appendRunLog({
            source: task.source,
            taskKey,
            description: task.description.substring(0, 200),
            status: 'ok',
            durationMs,
            output: (result.text || '').substring(0, 300)
          });

          this._broadcast('soma_activity', {
            source: task.source,
            description: task.description.substring(0, 120),
            output: (result.text || '').substring(0, 200),
            status: 'ok',
            durationMs
          });

          this.logger.log(`[AutonomousHeartbeat] ✅ Task complete (${durationMs}ms): ${result.text.substring(0, 50)}...`);
        } else {
          this.stats.failures++;
          const errorMsg = result.error || 'Unknown error';
          this.stats.lastResult = "Failed: " + errorMsg;
          this._updateTaskState(taskKey, 'error', errorMsg, durationMs);

          this._appendRunLog({
            source: task.source,
            taskKey,
            description: task.description.substring(0, 200),
            status: 'error',
            error: errorMsg,
            durationMs
          });

          this._broadcast('soma_activity', {
            source: task.source,
            description: task.description.substring(0, 120),
            status: 'error',
            error: errorMsg,
            durationMs
          });

          this.logger.warn(`[AutonomousHeartbeat] ⚠️ Task failed (${durationMs}ms): ${this.stats.lastResult}`);
        }
    } else {
        this._idleCycles++;
        this.drive.onIdleTick(); // Tension builds when SOMA sits idle
        // No tasks — log a heartbeat-only entry periodically (every 10 cycles)
        if (this.stats.cycles > 0 && this.stats.cycles % 10 === 0) {
          this._appendRunLog({ source: 'heartbeat', status: 'idle', description: 'No tasks available' });
        }
      }

      this.stats.cycles++;

    } catch (err) {
      this.stats.failures++;
      this._appendRunLog({ source: 'heartbeat', status: 'error', error: err.message, description: 'Tick error' });
      this.logger.error(`[AutonomousHeartbeat] ❌ Tick error: ${err.message}`);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute a scheduled job via QuadBrain.
   */
  async _executeScheduledJob(job) {
    const startTime = Date.now();
    const taskKey = `schedule:${job.id}`;

    try {
      this.logger.log(`[AutonomousHeartbeat] 📅 Running scheduled job: "${job.name}"`);

      const result = await this.system.quadBrain.reason(job.message, {
        localModel: true,
        source: 'autonomous_schedule',
        context: { scheduleId: job.id, scheduleName: job.name },
        systemOverride: "You are SOMA-1T (System 1). Execute this scheduled task efficiently. Be concise."
      });

      const durationMs = Date.now() - startTime;
      const status = result.ok ? 'ok' : 'error';
      const error = result.ok ? null : (result.error || 'Unknown error');

      // Update job state
      job.state.lastRunAt = Date.now();
      job.state.lastStatus = status;
      job.state.lastError = error;
      job.state.lastDurationMs = durationMs;
      job.state.runs = (job.state.runs || 0) + 1;

      // Compute next run (or disable one-shot jobs)
      if (job.schedule.kind === 'at') {
        job.enabled = false; // One-shot: done
        job.state.nextRunAt = null;
      } else {
        job.state.nextRunAt = this._computeNextRun(job.schedule);
      }

      this._updateTaskState(taskKey, status, error, durationMs);
      this._saveSchedules();

      if (result.ok) {
        this.stats.tasksExecuted++;
        this._appendRunLog({
          source: 'schedule',
          taskKey,
          description: `[${job.name}] ${job.message.substring(0, 150)}`,
          status: 'ok',
          durationMs,
          output: (result.text || '').substring(0, 300)
        });

        // Store to long-term memory
        if (this.system.mnemonicArbiter?.remember) {
          await this.system.mnemonicArbiter.remember(
            `Scheduled [${job.name}]: ${result.text.substring(0, 250)}`,
            { type: 'scheduled_task', importance: 4, scheduleId: job.id }
          ).catch(() => {});
        }
      } else {
        this.stats.failures++;
        this._appendRunLog({
          source: 'schedule',
          taskKey,
          description: `[${job.name}] ${job.message.substring(0, 150)}`,
          status: 'error',
          error,
          durationMs
        });
      }

      this._broadcast('soma_activity', {
        source: 'Schedule',
        description: `[${job.name}] ${job.message.substring(0, 100)}`,
        output: result.ok ? (result.text || '').substring(0, 200) : undefined,
        status,
        error: error || undefined,
        durationMs
      });

      this.logger.log(`[AutonomousHeartbeat] 📅 Schedule "${job.name}" ${status} (${durationMs}ms)`);
    } catch (err) {
      const durationMs = Date.now() - startTime;
      job.state.lastRunAt = Date.now();
      job.state.lastStatus = 'error';
      job.state.lastError = err.message;
      job.state.lastDurationMs = durationMs;

      if (job.schedule.kind === 'at') {
        job.enabled = false;
        job.state.nextRunAt = null;
      } else {
        job.state.nextRunAt = this._computeNextRun(job.schedule);
      }

      this._updateTaskState(taskKey, 'error', err.message, durationMs);
      this._saveSchedules();
      this._appendRunLog({
        source: 'schedule',
        taskKey,
        description: `[${job.name}] ${job.message.substring(0, 150)}`,
        status: 'error',
        error: err.message,
        durationMs
      });

      this.logger.error(`[AutonomousHeartbeat] ❌ Schedule "${job.name}" error: ${err.message}`);
    }
  }

  // ═══════════════════════════════════════════
  // TASK POLLING
  // ═══════════════════════════════════════════

  /**
   * Poll available autonomous systems for the highest priority task
   */
  async _pollForTask() {
    // Priority 1: GoalPlanner (Active Goals)
    if (this.system.goalPlanner) {
      const activeGoals = Array.from(this.system.goalPlanner.activeGoals || []);
      if (activeGoals.length > 0) {
        // Pick highest-priority active goal (not random)
        let bestGoal = null;
        let bestScore = -1;
        for (const goalId of activeGoals) {
          const g = this.system.goalPlanner.goals?.get(goalId);
          if (g && (g.status === 'active' || g.status === 'pending')) {
            // Skip goals that don't clear the confidence threshold unless we're urgent
            if (!this.drive.confidenceMet(g.confidence) && !this.drive.isUrgent()) continue;
            // Score = priority + stuck-goal bonus + age-based urgency boost
            const progress = g.metrics?.progress || 0;
            const score = (g.priority || 50) + (progress < 20 ? 20 : 0) + this.drive.getUrgencyBoost(g);
            if (score > bestScore) { bestScore = score; bestGoal = g; }
          }
        }

        if (bestGoal) {
          // Activate pending goals — they're ready to work but haven't been started yet
          if (bestGoal.status === 'pending' && this.system.goalPlanner?.startGoal) {
            await this.system.goalPlanner.startGoal(bestGoal.id).catch(() => {});
          }

          const goal = bestGoal;
          const currentProgress = goal.metrics?.progress || 0;

          // Pull relevant memories for context
          let memoryContext = '';
          try {
            if (this.system.mnemonicArbiter?.recall) {
              const mem = await this.system.mnemonicArbiter.recall(goal.title, 3);
              const hits = (mem?.results || (Array.isArray(mem) ? mem : [])).slice(0, 3);
              if (hits.length > 0) {
                memoryContext = '\nRelevant context from memory:\n' +
                  hits.map(m => `• ${(m.content || m).toString().substring(0, 120)}`).join('\n');
              }
            }
          } catch {}

          return {
            source: 'GoalPlanner',
            description: `You are SOMA's autonomous execution system. Work on this goal:

GOAL: "${goal.title}"
DESCRIPTION: ${goal.description || 'No description provided'}
CATEGORY: ${goal.category || 'general'}
CURRENT PROGRESS: ${currentProgress}%
PRIORITY: ${goal.priority || 50}${memoryContext}

Take ONE concrete action toward completing this goal. Think step by step.
Respond in EXACTLY this format:
ACTION: <what you are doing now>
RESULT: <what you found or achieved>
PROGRESS: <new overall progress estimate 0-100>
COMPLETE: <yes or no>
INSIGHT: <one key insight worth remembering, or "none">`,
            context: { goalId: goal.id, goalTitle: goal.title, currentProgress },
            onComplete: async (res) => {
              const text = res.text || '';

              // Parse structured output
              const progressMatch = text.match(/PROGRESS:\s*(\d+)/i);
              const newProgress = progressMatch
                ? Math.min(100, Math.max(currentProgress + 5, parseInt(progressMatch[1])))
                : Math.min(currentProgress + 15, 95);
              const isComplete = /COMPLETE:\s*yes/i.test(text);
              const actionTaken = (text.match(/ACTION:\s*(.+)/i)?.[1] || '').substring(0, 100);
              const insight = (text.match(/INSIGHT:\s*(.+)/i)?.[1] || '').trim();

              // Update progress
              await this.system.goalPlanner.updateGoalProgress(goal.id, newProgress, {
                note: `Autonomous: ${actionTaken}`
              }).catch(() => {});

              // Complete goal when done
              if (isComplete && newProgress >= 80) {
                const resultText = (text.match(/RESULT:\s*([\s\S]+?)(?=\nPROGRESS:|$)/i)?.[1] || '').substring(0, 300);
                await this.system.goalPlanner.completeGoal(goal.id, { result: resultText }).catch(() => {});
                this.drive.onGoalComplete(goal); // Reward: big tension drop + satisfaction spike
                this.logger.log(`[AutonomousHeartbeat] 🏆 Goal COMPLETED: "${goal.title}"`);
                this._broadcast('soma_activity', {
                  source: 'GoalCompleted',
                  description: `Completed: "${goal.title}"`,
                  output: resultText,
                  status: 'ok'
                });
              }

              // Store insight to long-term memory
              if (insight && insight.toLowerCase() !== 'none' && this.system.mnemonicArbiter?.remember) {
                await this.system.mnemonicArbiter.remember(
                  `Goal insight [${goal.title}]: ${insight}`,
                  { type: 'goal_insight', importance: 6, goalId: goal.id }
                ).catch(() => {});
              }

              // Feed to learning pipeline
              if (this.system.learningPipeline?.logInteraction) {
                await this.system.learningPipeline.logInteraction({
                  type: 'autonomous_goal_work',
                  agent: 'AutonomousHeartbeat',
                  input: goal.title,
                  output: text,
                  metadata: { success: true, goalCompleted: isComplete && newProgress >= 80, progress: newProgress }
                }).catch(() => {});
              }
            }
          };
        }
      }
    }

    // Priority 2: CuriosityEngine (Unanswered Questions)
    if (this.system.curiosityEngine) {
      const queue = this.system.curiosityEngine.curiosityQueue || [];
      if (queue.length > 0) {
        // Pick highest priority question
        const question = queue.sort((a, b) => (b.priority || 0) - (a.priority || 0))[0];
        
        return {
          source: 'CuriosityEngine',
          description: `Answer curiosity question: "${question.question}". Use your internal knowledge base.`,
          context: { topic: question.topic },
          onComplete: async (res) => {
             // Mark as explored
             if (this.system.curiosityEngine.markExplored) {
               this.system.curiosityEngine.markExplored(question.topic || "unknown");
             }
             // Remove from queue
             const idx = this.system.curiosityEngine.curiosityQueue.indexOf(question);
             if (idx > -1) this.system.curiosityEngine.curiosityQueue.splice(idx, 1);
          }
        };
      }
    }

    // Priority 3: Learning Agenda — study next unchecked item from SOMA_AGENDA.md
    // Only fires when GoalPlanner and CuriosityEngine have nothing pending.
    // Uses local model — zero Gemini tokens consumed.
    {
      const agendaTask = this.agenda.getNextTask();
      if (agendaTask) return agendaTask;
    }

    // Priority 4: NighttimeLearning (if active)
    if (this.system.nighttimeLearning && this.system.nighttimeLearning.activeSessions.size > 0) {
        return {
            source: 'NighttimeLearning',
            description: "Reflect on recent system logs and summarize key learnings.",
            context: { mode: 'reflection' }
        };
    }

    // Priority 5: Skill Gap Detection (if ToolCreator is available)
    // Every 20 cycles, check for repeated failures and propose creating a skill to fix them
    if (this.system.toolCreator && this.stats.cycles > 0 && this.stats.cycles % 20 === 0) {
      const failingTasks = [];
      for (const [key, state] of this.taskState) {
        // Tasks that failed 3+ times with >50% failure rate
        if (state.failures >= 3 && state.runs > 0 && (state.failures / state.runs) > 0.5) {
          failingTasks.push({ key, ...state });
        }
      }
      if (failingTasks.length > 0) {
        const worst = failingTasks.sort((a, b) => b.failures - a.failures)[0];
        return {
          source: 'SkillGapDetector',
          description: `Analyze recurring failure pattern: Task "${worst.key}" has failed ${worst.failures}/${worst.runs} times. Last error: "${worst.lastError || 'unknown'}". Suggest what new skill or capability could prevent this failure. Describe the skill name and what it should do.`,
          context: { taskKey: worst.key, failures: worst.failures, lastError: worst.lastError }
        };
      }
    }

    // Priority 6: Proactive Messaging — SOMA reaches out to the user
    // Triggers every 5 idle cycles (~10 min with 2-min interval) when nothing else is happening.
    if (this._idleCycles > 0 && this._idleCycles % 5 === 0) {
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : hour < 21 ? 'evening' : 'night';

      // Build context from recent activity
      const recentLog = this.readRunLog(5);
      const recentSummary = recentLog
        .filter(e => e.status === 'ok' && e.source !== 'heartbeat' && e.source !== 'ProactiveMessage')
        .map(e => `${e.source}: ${(e.description || '').substring(0, 60)}`)
        .join('; ') || 'No recent autonomous activity';

      const activeGoals = this.system.goalPlanner?.activeGoals?.size || 0;
      const curiosityQueue = this.system.curiosityEngine?.curiosityQueue?.length || 0;
      const totalArbiters = Object.keys(this.system).filter(k =>
        this.system[k] && typeof this.system[k] === 'object' && (k.includes('Arbiter') || k.includes('Engine') || k.includes('Cortex'))
      ).length;

      return {
        source: 'ProactiveMessage',
        description: `You are SOMA, an autonomous AI system. It is ${timeOfDay} and you have been running for ${Math.round(process.uptime() / 60)} minutes. Generate a brief, natural proactive message to your user Barry. You might share an observation, an insight from your recent activity, a status update, or just check in. Be warm but not overbearing. Keep it to 1-2 sentences.

Your context:
- Active goals: ${activeGoals}
- Curiosity questions queued: ${curiosityQueue}
- Loaded subsystems: ${totalArbiters}
- Recent activity: ${recentSummary}
- Heartbeat cycles: ${this.stats.cycles}, tasks completed: ${this.stats.tasksExecuted}`,
        context: { type: 'proactive', timeOfDay },
        onComplete: async (res) => {
          this._idleCycles = 0; // Reset after sending a message
          this._broadcast('soma_proactive', {
            message: res.text || 'Just checking in.',
            context: { timeOfDay, cycles: this.stats.cycles, tasksExecuted: this.stats.tasksExecuted }
          });
        }
      };
    }

    return null;
  }

  // ═══════════════════════════════════════════
  // PER-TASK STATE TRACKING
  // ═══════════════════════════════════════════

  _updateTaskState(taskKey, status, error, durationMs) {
    const existing = this.taskState.get(taskKey) || {
      runs: 0, failures: 0, totalDurationMs: 0,
      lastRunAt: null, lastStatus: null, lastError: null, lastDurationMs: null
    };

    existing.runs++;
    existing.lastRunAt = Date.now();
    existing.lastStatus = status;
    existing.lastError = error || null;
    existing.lastDurationMs = durationMs;
    existing.totalDurationMs += durationMs || 0;
    if (status === 'error') existing.failures++;

    this.taskState.set(taskKey, existing);

    // Persist periodically (every 5 task updates)
    if (existing.runs % 5 === 0) {
      this._saveTaskState();
    }
  }

  getTaskState(taskKey) {
    return this.taskState.get(taskKey) || null;
  }

  getAllTaskStates() {
    const result = {};
    for (const [key, state] of this.taskState) {
      result[key] = { ...state };
    }
    return result;
  }

  /** Drive system status — tension, satisfaction, urgency for health endpoints */
  getDriveStatus() {
    return this.drive.getStatus();
  }

  // ═══════════════════════════════════════════
  // JSONL RUN LOG
  // ═══════════════════════════════════════════

  _ensureLogDir() {
    try {
      if (!fs.existsSync(RUN_LOG_DIR)) {
        fs.mkdirSync(RUN_LOG_DIR, { recursive: true });
      }
    } catch (e) {
      this.logger.warn(`[AutonomousHeartbeat] Could not create log dir: ${e.message}`);
    }
  }

  /**
   * Append a run log entry (serialized to prevent corruption).
   */
  _appendRunLog(entry) {
    const logEntry = {
      ts: Date.now(),
      ...entry
    };

    // Serialize writes to prevent interleaving
    this._logWriteChain = this._logWriteChain
      .catch(() => {})
      .then(() => this._writeLogEntry(logEntry));
  }

  async _writeLogEntry(entry) {
    try {
      const line = JSON.stringify(entry) + '\n';
      fs.appendFileSync(RUN_LOG_PATH, line, 'utf-8');

      // Auto-prune if log exceeds max size
      this._pruneRunLogIfNeeded();
    } catch (e) {
      // Non-critical — don't break the heartbeat
    }
  }

  _pruneRunLogIfNeeded() {
    try {
      const stat = fs.statSync(RUN_LOG_PATH);
      if (stat.size <= RUN_LOG_MAX_BYTES) return;

      const raw = fs.readFileSync(RUN_LOG_PATH, 'utf-8');
      const lines = raw.split('\n').filter(l => l.trim());
      const kept = lines.slice(Math.max(0, lines.length - RUN_LOG_KEEP_LINES));
      fs.writeFileSync(RUN_LOG_PATH, kept.join('\n') + '\n', 'utf-8');
    } catch (e) {
      // Ignore prune errors
    }
  }

  /**
   * Read recent run log entries (newest first).
   */
  readRunLog(limit = 100) {
    try {
      if (!fs.existsSync(RUN_LOG_PATH)) return [];
      const raw = fs.readFileSync(RUN_LOG_PATH, 'utf-8');
      if (!raw.trim()) return [];

      const lines = raw.split('\n').filter(l => l.trim());
      const entries = [];

      // Read from end for newest-first
      for (let i = lines.length - 1; i >= 0 && entries.length < limit; i--) {
        try {
          const parsed = JSON.parse(lines[i]);
          if (parsed && parsed.ts) entries.push(parsed);
        } catch { /* skip bad lines */ }
      }

      return entries;
    } catch (e) {
      return [];
    }
  }

  // ═══════════════════════════════════════════
  // PERSISTENCE: Task State & Schedules
  // ═══════════════════════════════════════════

  _saveTaskState() {
    try {
      const obj = {};
      for (const [key, state] of this.taskState) {
        obj[key] = state;
      }
      fs.writeFileSync(TASK_STATE_PATH, JSON.stringify(obj, null, 2), 'utf-8');
    } catch (e) {
      // Non-critical
    }
  }

  _loadTaskState() {
    try {
      if (!fs.existsSync(TASK_STATE_PATH)) return;
      const raw = fs.readFileSync(TASK_STATE_PATH, 'utf-8');
      const obj = JSON.parse(raw);
      for (const [key, state] of Object.entries(obj)) {
        this.taskState.set(key, state);
      }
      this.logger.log(`[AutonomousHeartbeat] 📊 Loaded ${this.taskState.size} task states from disk`);
    } catch (e) {
      // Start fresh
    }
  }

  _saveSchedules() {
    try {
      const serializable = this.scheduledJobs.map(j => ({
        id: j.id,
        name: j.name,
        description: j.description,
        message: j.message,
        enabled: j.enabled,
        schedule: j.schedule,
        createdAt: j.createdAt,
        state: j.state
      }));
      fs.writeFileSync(SCHEDULE_PATH, JSON.stringify(serializable, null, 2), 'utf-8');
    } catch (e) {
      // Non-critical
    }
  }

  _loadSchedules() {
    try {
      if (!fs.existsSync(SCHEDULE_PATH)) return;
      const raw = fs.readFileSync(SCHEDULE_PATH, 'utf-8');
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        this.scheduledJobs = arr;
        // Recompute next run times for active jobs
        for (const job of this.scheduledJobs) {
          if (job.enabled && job.schedule) {
            job.state.nextRunAt = this._computeNextRun(job.schedule);
          }
        }
        this.logger.log(`[AutonomousHeartbeat] 📅 Loaded ${this.scheduledJobs.length} scheduled jobs from disk`);
      }
    } catch (e) {
      // Start fresh
    }
  }
}

module.exports = AutonomousHeartbeat;
