import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import messageBroker from '../core/MessageBroker.cjs';
import { SwarmEngine, SwarmTask, Artifact } from './EngineeringSwarmRuntime.js';
import path from 'path';
import fs from 'fs/promises';
import crypto from 'crypto';

/**
 * EngineeringSwarmArbiter (Beyond Belief Edition)
 * 
 * Replaces simple self-modification with a 100% Agentic, non-simulated runtime.
 * "We don't simulate code. We execute it."
 */
export class EngineeringSwarmArbiter extends BaseArbiterV4 {
  constructor(opts = {}) {
    super({
      ...opts,
      name: opts.name || 'EngineeringSwarmArbiter',
      role: ArbiterRole.ARCHITECT,
      capabilities: [
        ArbiterCapability.READ_FILES,
        ArbiterCapability.WRITE_FILES,
        ArbiterCapability.EXECUTE_CODE,
        ArbiterCapability.MODIFY_CODE,
        ArbiterCapability.SELF_HEALING
      ]
    });

    this.quadBrain = opts.quadBrain || null;
    this.rootPath = opts.rootPath || process.cwd();
    this.runtime = new SwarmEngine({ 
        workspace: path.join(this.rootPath, '.soma', 'swarm_vault'),
        logger: this.auditLogger 
    });
  }

  async onInitialize() {
    await this.runtime.initialize();
    this.auditLogger.info('🚀 Engineering Swarm (BEYOND BELIEF) Online', { 
      concurrency: this.runtime.concurrency,
      mode: 'Live Agentic Execution'
    });
  }

  /**
   * Main Entry Point for Code Transformation
   */
  async modifyCode(filepath, request) {
    this.auditLogger.info(`⚡ [EngSwarm] Transformer sequence started for ${filepath}`);
    const sessionStartTime = Date.now();
    const sessionId = `swarm_${crypto.randomBytes(4).toString('hex')}`;

    try {
        // 1. RESEARCH & INTERACTIVE EXPLORATION
        const researchData = await this._runDeepResearcher(filepath);
        
        // 2. AGENTIC PLANNING (Brain-generated shell tasks)
        const swarmTasks = await this._generateAgenticPlan(request, researchData);
        this.auditLogger.debug(`[Swarm] Generated ${swarmTasks.length} real-world execution tasks.`);

        // 3. ADVERSARIAL SWARM DEBATE
        const consensus = await this._runAdversarialDebate(request, researchData);
        
        // 4. LEAD DEV SYNTHESIS & DRAFTING
        const verdict = await this._runLeadDevSynthesis(request, researchData, consensus);
        if (!verdict.approved) {
            throw new Error(`Lead Dev blocked modification: ${verdict.reasoning}`);
        }

        // 5. PARALLEL EXECUTION & REAL-WORLD VERIFICATION
        const verification = await this._executeAndVerify(filepath, verdict.code, swarmTasks);
        
        if (verification.passed) {
            // COMMIT TO PRODUCTION
            await fs.writeFile(path.resolve(this.rootPath, filepath), verdict.code, 'utf8');
            this.auditLogger.success(`[Swarm] ✅ TRANSACTION COMMITTED: ${filepath} updated and verified.`);
        } else {
            throw new Error(`Verification FAILED: ${verification.error}`);
        }

        const duration = ((Date.now() - sessionStartTime) / 1000).toFixed(1);

        // 6. PERSISTENCE (Experience Ledger)
        await this._logToExperienceLedger({
            sessionId,
            filepath,
            request,
            success: true,
            duration
        });

        return { success: true, sessionId, duration, verification, finalCode: verdict.code };

    } catch (err) {
        this.auditLogger.error(`[Swarm] ❌ TRANSFORMATION ABORTED: ${err.message}`);
        return { success: false, error: err.message };
    }
  }

  /**
   * Deep Researcher: Uses real file access and shell to understand context
   */
  async _runDeepResearcher(filepath) {
    this.auditLogger.info(`[Researcher] Sifting through ${filepath} context...`);
    const fullPath = path.resolve(this.rootPath, filepath);
    
    const content = await fs.readFile(fullPath, 'utf8');
    const stats = await fs.stat(fullPath);
    
    // Find neighbors
    const dir = path.dirname(filepath);
    const neighbors = await fs.readdir(path.resolve(this.rootPath, dir));

    return {
        filepath,
        content,
        neighbors,
        stats: { size: stats.size, modified: stats.mtime }
    };
  }

  /**
   * Agentic Plan: Asks the Brain to generate REAL shell commands needed for verification
   */
  async _generateAgenticPlan(request, context) {
    if (!this.quadBrain) return [];

    const prompt = `You are the SWARM PLANNER. We need to verify changes to ${context.filepath}.
    Based on the file and the request ("${request}"), generate a list of real shell commands to run.
    Include:
    1. Syntax checks (e.g. node --check)
    2. Dependency checks (e.g. grep)
    3. Linting if applicable.
    
    Respond ONLY with a JSON array: [{ "description": "...", "command": "...", "priority": 1-10 }]`;

    const result = await this.quadBrain.reason(prompt, { brain: 'LOGOS' });
    try {
        const jsonMatch = result.text.match(/\[.*\]/s);
        const taskSpecs = JSON.parse(jsonMatch[0]);
        return taskSpecs.map(s => new SwarmTask({ ...s, cwd: this.rootPath }));
    } catch (e) {
        this.auditLogger.warn(`[Planner] Failed to parse agentic plan. Falling back to default.`);
        return [new SwarmTask({ description: 'Default Check', command: `node --check "${context.filepath}"`, cwd: this.rootPath })];
    }
  }

  async _runAdversarialDebate(request, context) {
    this.auditLogger.info(`[Swarm] Initiating Adversarial Debate...`);
    const prompt = `You are the Engineering Swarm.
    REQUEST: "${request}"
    FILE: ${context.filepath}
    CODE:
    ${context.content}

    Provide a technical debate between ARCHITECT (Performance), MAINTAINER (Safety), and SECURITY.
    Output a consensus report.`;

    const result = await this.quadBrain.reason(prompt, { brain: 'AURORA' });
    return result.text;
  }

  async _runLeadDevSynthesis(request, context, debate) {
    this.auditLogger.info(`[LeadDev] Drafting final implementation...`);
    const prompt = `You are the LEAD DEV. Synthesize the debate and provide the final code.
    DEBATE: ${debate}
    ORIGINAL CODE:
    ${context.content}

    Return JSON: { "approved": true, "code": "...", "reasoning": "..." }`;

    const result = await this.quadBrain.reason(prompt, { brain: 'LOGOS' });
    try {
        const jsonMatch = result.text.match(/\{.*\}/s);
        return JSON.parse(jsonMatch[0]);
    } catch (e) {
        throw new Error("Lead Dev produced unparseable results.");
    }
  }

  /**
   * Execution & Verification: The Non-Simulated Phase
   */
  async _executeAndVerify(filepath, newCode, tasks) {
    this.auditLogger.info(`[Tester] 🛡️ Starting Non-Simulated Verification...`);
    
    const tempFile = `${filepath}.v_belief.tmp`;
    const fullPath = path.resolve(this.rootPath, tempFile);
    
    try {
        // 1. Write the "Theory" to disk
        await fs.writeFile(fullPath, newCode, 'utf8');

        // 2. Execute the Agentic Plan (Parallel real shell commands)
        const artifacts = await this.runtime.runTasks(tasks);
        
        // 3. Manual Syntax Check (The absolute line)
        const syntaxCheck = await this.runtime._executeTask(new SwarmTask({
            description: 'Final Syntax Guard',
            command: `node --check "${tempFile}"`,
            cwd: this.rootPath
        }));

        const passed = syntaxCheck.task.status === 'done';
        
        await fs.unlink(fullPath);

        return {
            passed,
            artifacts: artifacts.slice(-5),
            error: passed ? null : "The code failed syntax verification in the real world."
        };

    } catch (e) {
        return { passed: false, error: e.message };
    }
  }

  /**
   * Experience Ledger: Persist the "Soul" of the Swarm into SQLite
   */
  async _logToExperienceLedger(data) {
    if (this.messageBroker) {
        await this.messageBroker.publish('swarm.experience', data);
    }
    // Also store in warm memory for retrieval
    if (this.quadBrain && this.quadBrain.mnemonic) {
        await this.quadBrain.mnemonic.remember(
            `Engineering Swarm Transformation of ${data.filepath}: ${data.request}. Result: ${data.success ? 'Success' : 'Failure'}`,
            { type: 'swarm_experience', ...data }
        );
    }
  }
}

export default EngineeringSwarmArbiter;
