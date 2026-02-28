/**
 * SelfImprovementCoordinator.js
 *
 * ASI-Level Self-Improvement Orchestrator
 *
 * Coordinates 5 powerful arbiters to enable autonomous self-enhancement:
 * - NoveltyTracker: Prevents repetitive responses (major UX improvement)
 * - SkillAcquisitionArbiter: Learns new skills autonomously
 * - SelfModificationArbiter: Optimizes own code
 * - BeliefSystemArbiter: Maintains cognitive consistency
 * - AutonomousCapabilityExpansion: Finds missing abilities on GitHub
 *
 * This is the core of SOMA's ability to improve itself over time.
 */

import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export class SelfImprovementCoordinator extends BaseArbiterV4 {
    constructor(opts = {}) {
        super({
            name: opts.name || 'SelfImprovementCoordinator',
            role: ArbiterRole.COORDINATOR,
            capabilities: [
                ArbiterCapability.TRACK_LEARNING,
                ArbiterCapability.OPTIMIZE_LEARNING,
                ArbiterCapability.MODIFY_CODE,
                ArbiterCapability.COORDINATE_ASI
            ],
            ...opts
        });

        // Configuration
        this.config = {
            noveltyCheckEnabled: opts.noveltyCheckEnabled !== false,
            skillLearningEnabled: opts.skillLearningEnabled !== false,
            selfModificationEnabled: opts.selfModificationEnabled !== false,
            beliefSystemEnabled: opts.beliefSystemEnabled !== false,
            capabilityExpansionEnabled: opts.capabilityExpansionEnabled !== false,
            improvementCycleInterval: opts.improvementCycleInterval || 3600000, // 1 hour
            ...opts.config
        };

        // Component arbiters (initialized in onInitialize)
        this.noveltyTracker = null;
        this.skillAcquisition = null;
        this.selfModification = null;
        this.beliefSystem = null;
        this.capabilityExpansion = null;

        // State
        this.stats = {
            improvementCyclesRun: 0,
            repetitionsPrevented: 0,
            skillsAcquired: 0,
            codeOptimizationsProposed: 0,
            beliefsUpdated: 0,
            capabilitiesExpanded: 0,
            lastCycleTimestamp: 0
        };

        // Improvement cycle timer
        this.improvementCycleTimer = null;
    }

    async onInitialize() {
        this.log('info', '🚀 Initializing Self-Improvement Coordinator...');

        // Import and initialize component arbiters
        await this._initializeComponents();

        // Register with MessageBroker
        if (this.messageBroker) {
            this.messageBroker.registerArbiter(this.name, {
                role: this.role,
                capabilities: this.capabilities,
                instance: this
            });
        }

        // Start periodic improvement cycle
        if (this.config.improvementCycleInterval > 0) {
            this.startImprovementCycle();
        }

        this.log('success', '✅ Self-Improvement Coordinator initialized');
        this.log('info', `  - Novelty Tracking: ${this.noveltyTracker ? '✅' : '❌'}`);
        this.log('info', `  - Skill Acquisition: ${this.skillAcquisition ? '✅' : '❌'}`);
        this.log('info', `  - Self Modification: ${this.selfModification ? '✅' : '❌'}`);
        this.log('info', `  - Belief System: ${this.beliefSystem ? '✅' : '❌'}`);
        this.log('info', `  - Capability Expansion: ${this.capabilityExpansion ? '✅' : '❌'}`);

        return true;
    }

    async _initializeComponents() {
        const rootPath = process.cwd();

        // 1. NoveltyTracker (prevents repetitive responses)
        if (this.config.noveltyCheckEnabled) {
            try {
                const NoveltyTrackerModule = require('./NoveltyTracker.cjs');
                const NoveltyTracker = NoveltyTrackerModule.default || NoveltyTrackerModule.NoveltyTracker;
                this.noveltyTracker = new NoveltyTracker({ name: 'NoveltyTracker' });
                await this.noveltyTracker.initialize?.();
                this.log('success', '  ✅ NoveltyTracker loaded');
            } catch (error) {
                this.log('warn', `  ⚠️  NoveltyTracker failed to load: ${error.message}`);
            }
        }

        // 2. SkillAcquisitionArbiter (learns new skills)
        if (this.config.skillLearningEnabled) {
            try {
                const SkillAcquisitionModule = require('./SkillAcquisitionArbiter.cjs');
                const SkillAcquisitionArbiter = SkillAcquisitionModule.default || SkillAcquisitionModule.SkillAcquisitionArbiter;
                this.skillAcquisition = new SkillAcquisitionArbiter({ rootPath });
                await this.skillAcquisition.initialize?.();
                this.log('success', '  ✅ SkillAcquisitionArbiter loaded');
            } catch (error) {
                this.log('warn', `  ⚠️  SkillAcquisitionArbiter failed to load: ${error.message}`);
            }
        }

        // 3. SelfModificationArbiter (optimizes own code)
        if (this.config.selfModificationEnabled) {
            try {
                const SelfModificationModule = require('./SelfModificationArbiter.cjs');
                const SelfModificationArbiter = SelfModificationModule.default || SelfModificationModule.SelfModificationArbiter;
                this.selfModification = new SelfModificationArbiter({ rootPath });
                await this.selfModification.initialize?.();
                this.log('success', '  ✅ SelfModificationArbiter loaded');
            } catch (error) {
                this.log('warn', `  ⚠️  SelfModificationArbiter failed to load: ${error.message}`);
            }
        }

        // 4. BeliefSystemArbiter (maintains cognitive consistency)
        if (this.config.beliefSystemEnabled) {
            try {
                const BeliefSystemModule = require('./BeliefSystemArbiter.cjs');
                const BeliefSystemArbiter = BeliefSystemModule.default || BeliefSystemModule.BeliefSystemArbiter;
                this.beliefSystem = new BeliefSystemArbiter({ rootPath });
                await this.beliefSystem.initialize?.();
                this.log('success', '  ✅ BeliefSystemArbiter loaded');
            } catch (error) {
                this.log('warn', `  ⚠️  BeliefSystemArbiter failed to load: ${error.message}`);
            }
        }

        // 5. AutonomousCapabilityExpansion (finds missing abilities)
        if (this.config.capabilityExpansionEnabled) {
            try {
                const { AutonomousCapabilityExpansion } = await import('./AutonomousCapabilityExpansion.js');
                this.capabilityExpansion = new AutonomousCapabilityExpansion({ rootPath });
                await this.capabilityExpansion.initialize?.();
                this.log('success', '  ✅ AutonomousCapabilityExpansion loaded');
            } catch (error) {
                this.log('warn', `  ⚠️  AutonomousCapabilityExpansion failed to load: ${error.message}`);
            }
        }
    }

    // ===========================
    // Core Orchestration Methods
    // ===========================

    /**
     * Check if a response is novel (not repetitive)
     * Prevents SOMA from giving the same answers repeatedly
     */
    async checkResponseNovelty(response, context = {}) {
        if (!this.noveltyTracker) {
            return { isNovel: true, reason: 'NoveltyTracker not available' };
        }

        try {
            const result = await this.noveltyTracker.checkNovelty({
                response,
                context,
                query: context.query || ''
            });

            if (!result.isNovel) {
                this.stats.repetitionsPrevented++;
            }

            return result;
        } catch (error) {
            this.log('error', `Novelty check failed: ${error.message}`);
            return { isNovel: true, reason: 'Check failed' };
        }
    }

    /**
     * Detect and learn a new skill
     */
    async detectAndLearnSkill(skillName, examples = []) {
        if (!this.skillAcquisition) {
            return { learned: false, reason: 'SkillAcquisitionArbiter not available' };
        }

        try {
            const result = await this.skillAcquisition.learnSkill(skillName, examples);

            if (result.success) {
                this.stats.skillsAcquired++;
            }

            return result;
        } catch (error) {
            this.log('error', `Skill learning failed: ${error.message}`);
            return { learned: false, reason: error.message };
        }
    }

    /**
     * Propose code optimization for a file
     */
    async proposeCodeOptimization(filePath) {
        if (!this.selfModification) {
            return { optimizations: [], reason: 'SelfModificationArbiter not available' };
        }

        try {
            const result = await this.selfModification.analyzeCode(filePath);

            if (result.optimizations && result.optimizations.length > 0) {
                this.stats.codeOptimizationsProposed += result.optimizations.length;
            }

            return result;
        } catch (error) {
            this.log('error', `Code optimization failed: ${error.message}`);
            return { optimizations: [], reason: error.message };
        }
    }

    /**
     * Validate or update a belief
     */
    async validateBelief(belief, evidence = {}) {
        if (!this.beliefSystem) {
            return { valid: true, reason: 'BeliefSystemArbiter not available' };
        }

        try {
            const result = await this.beliefSystem.validateBelief(belief, evidence);

            if (result.updated) {
                this.stats.beliefsUpdated++;
            }

            return result;
        } catch (error) {
            this.log('error', `Belief validation failed: ${error.message}`);
            return { valid: true, reason: error.message };
        }
    }

    /**
     * Find missing capability needed for a goal
     */
    async findMissingCapability(goal) {
        if (!this.capabilityExpansion) {
            return { found: false, reason: 'AutonomousCapabilityExpansion not available' };
        }

        try {
            const result = await this.capabilityExpansion.findCapability(goal);

            if (result.found) {
                this.stats.capabilitiesExpanded++;
            }

            return result;
        } catch (error) {
            this.log('error', `Capability search failed: ${error.message}`);
            return { found: false, reason: error.message };
        }
    }

    /**
     * Run complete self-improvement cycle
     * This is called periodically to improve SOMA autonomously
     */
    async runSelfImprovementCycle() {
        this.log('info', '🔄 Running self-improvement cycle...');
        this.stats.improvementCyclesRun++;
        this.stats.lastCycleTimestamp = Date.now();

        const results = {
            timestamp: Date.now(),
            novelty: null,
            skills: null,
            optimization: null,
            beliefs: null,
            capabilities: null
        };

        try {
            // 1. Check novelty metrics (are we being repetitive?)
            if (this.noveltyTracker && typeof this.noveltyTracker.getStats === 'function') {
                results.novelty = this.noveltyTracker.getStats();
                this.log('info', `  Novelty: ${results.novelty.uniqueResponses || 0} unique responses`);
            }

            // 2. Review skill proficiency (what should we practice?)
            if (this.skillAcquisition && typeof this.skillAcquisition.getSkillGaps === 'function') {
                results.skills = await this.skillAcquisition.getSkillGaps();
                this.log('info', `  Skills: ${results.skills.gaps?.length || 0} skill gaps identified`);
            }

            // 3. Check for code optimization opportunities
            if (this.selfModification && typeof this.selfModification.scanForOptimizations === 'function') {
                results.optimization = await this.selfModification.scanForOptimizations();
                this.log('info', `  Optimizations: ${results.optimization.suggestions?.length || 0} suggestions`);
            }

            // 4. Validate belief system coherence
            if (this.beliefSystem && typeof this.beliefSystem.detectContradictions === 'function') {
                results.beliefs = await this.beliefSystem.detectContradictions();
                this.log('info', `  Beliefs: ${results.beliefs.contradictions?.length || 0} contradictions found`);
            }

            // 5. Identify missing capabilities
            if (this.capabilityExpansion && typeof this.capabilityExpansion.assessCapabilities === 'function') {
                results.capabilities = await this.capabilityExpansion.assessCapabilities();
                this.log('info', `  Capabilities: ${results.capabilities.missing?.length || 0} gaps identified`);
            }

            this.log('success', '✅ Self-improvement cycle complete');

            // Emit event for other systems to react
            this.emit('improvement_cycle_complete', results);

            return results;

        } catch (error) {
            this.log('error', `Self-improvement cycle failed: ${error.message}`);
            return { error: error.message, results };
        }
    }

    /**
     * Start periodic improvement cycle
     */
    startImprovementCycle() {
        if (this.improvementCycleTimer) {
            clearInterval(this.improvementCycleTimer);
        }

        this.log('info', `Starting improvement cycle (every ${this.config.improvementCycleInterval / 1000}s)`);

        this.improvementCycleTimer = setInterval(() => {
            this.runSelfImprovementCycle().catch(error => {
                this.log('error', `Improvement cycle error: ${error.message}`);
            });
        }, this.config.improvementCycleInterval);

        // Run first cycle immediately
        setTimeout(() => this.runSelfImprovementCycle(), 5000);
    }

    /**
     * Stop improvement cycle
     */
    stopImprovementCycle() {
        if (this.improvementCycleTimer) {
            clearInterval(this.improvementCycleTimer);
            this.improvementCycleTimer = null;
            this.log('info', 'Improvement cycle stopped');
        }
    }

    /**
     * Get coordinator statistics
     */
    getStats() {
        return {
            ...this.stats,
            componentsActive: {
                noveltyTracker: !!this.noveltyTracker,
                skillAcquisition: !!this.skillAcquisition,
                selfModification: !!this.selfModification,
                beliefSystem: !!this.beliefSystem,
                capabilityExpansion: !!this.capabilityExpansion
            },
            config: this.config
        };
    }

    /**
     * Message handler for inter-arbiter communication
     */
    async handleMessage(envelope) {
        const { type, payload } = envelope;

        switch (type) {
            case 'check_novelty':
                return await this.checkResponseNovelty(payload.response, payload.context);

            case 'learn_skill':
                return await this.detectAndLearnSkill(payload.skillName, payload.examples);

            case 'optimize_code':
                return await this.proposeCodeOptimization(payload.filePath);

            case 'validate_belief':
                return await this.validateBelief(payload.belief, payload.evidence);

            case 'find_capability':
                return await this.findMissingCapability(payload.goal);

            case 'run_cycle':
                return await this.runSelfImprovementCycle();

            case 'get_stats':
                return this.getStats();

            default:
                this.log('warn', `Unknown message type: ${type}`);
                return { error: 'Unknown message type' };
        }
    }

    async onShutdown() {
        this.stopImprovementCycle();
        this.log('info', 'Self-Improvement Coordinator shutting down');
        return true;
    }
}

export default SelfImprovementCoordinator;
