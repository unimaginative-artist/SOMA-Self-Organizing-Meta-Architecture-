/**
 * loaders/cognitive.js - PRODUCTION READY V4 (The Trinity & Cortexes)
 * 
 * Orchestrates SOMA's full cognitive architecture.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

import path from 'path';
import MnemonicArbiter from '../../arbiters/MnemonicArbiter.js';
import { AdaptiveLearningRouter } from '../../arbiters/AdaptiveLearningRouter.js';
import { SOMArbiterV3 } from '../../arbiters/SOMArbiterV3.js'; 
import CausalityArbiter from '../../arbiters/CausalityArbiter.js';
import WorldModelArbiter from '../../arbiters/WorldModelArbiter.js';
import { MuseEngine } from '../../arbiters/MuseEngine.js';
import { PerformanceAnalytics } from '../../arbiters/PerformanceAnalytics.js';
import SimulationArbiter from '../../arbiters/SimulationArbiter.js';
import messageBroker from '../../core/MessageBroker.js';

// CJS Imports
const GoalPlannerModule = require('../../arbiters/GoalPlannerArbiter.cjs');
const BeliefSystemModule = require('../../arbiters/BeliefSystemArbiter.cjs');
const LearningVelocityTrackerModule = require('../../arbiters/LearningVelocityTracker.cjs');
const ExecutiveCortexArbiter = require('../../arbiters/ExecutiveCortexArbiter.js').ExecutiveCortexArbiter || require('../../arbiters/ExecutiveCortexArbiter.js').default || require('../../arbiters/ExecutiveCortexArbiter.js');
const SensoryCortexArbiter = require('../../arbiters/SensoryCortexArbiter.js').SensoryCortexArbiter || require('../../arbiters/SensoryCortexArbiter.js').default || require('../../arbiters/SensoryCortexArbiter.js');
const ImmuneCortexArbiter = require('../../arbiters/ImmuneCortexArbiter.js').ImmuneCortexArbiter || require('../../arbiters/ImmuneCortexArbiter.js').default || require('../../arbiters/ImmuneCortexArbiter.js');
const StrategyCortexArbiter = require('../../arbiters/StrategyCortexArbiter.js').StrategyCortexArbiter || require('../../arbiters/StrategyCortexArbiter.js').default || require('../../arbiters/StrategyCortexArbiter.js');
const KnowledgeGraphFusion = require('../../arbiters/KnowledgeGraphFusion.js').KnowledgeGraphFusion || require('../../arbiters/KnowledgeGraphFusion.js').default || require('../../arbiters/KnowledgeGraphFusion.js');

export async function loadCognitiveSystems(toolRegistry = null) {
    console.log('\n[Loader] 🧠 Initializing Neural Cortexes & Trinity Pillars...');

    const system = {};

    if (toolRegistry) {
        console.log('      🛠️  ToolRegistry connected to cognitive systems');
    }

    // Helper for safe initialization
    const initIfPossible = async (obj, name) => {
        if (obj && typeof obj.initialize === 'function') {
            const res = obj.initialize();
            if (res instanceof Promise) await res;
            console.log(`      ✅ ${name} ready`);
        } else if (obj && typeof obj.onActivate === 'function') {
            const res = obj.onActivate();
            if (res instanceof Promise) await res;
            console.log(`      ✅ ${name} ready (onActivate)`);
        } else {
            console.log(`      ✅ ${name} ready`);
        }
    };

    // 1. Memory & Router
    let mnemonicArbiter;
    try {
        mnemonicArbiter = new MnemonicArbiter({
            name: 'MnemonicArbiter',
            messageBroker,
            skipEmbedder: true, // Fast startup - semantic search loads lazily
            redisUrl: null      // Don't require Redis - SQLite cold tier is sufficient
        });
        await mnemonicArbiter.initialize();
        console.log('      ✅ MnemonicArbiter ready (3-tier memory online)');
    } catch (memErr) {
        console.error('[Bootstrap] ⚠️ Memory system failed to init, using stub:', memErr.message);
        mnemonicArbiter = {
            initialize: async () => {},
            onInitialize: async () => {},
            remember: async () => ({ success: false, error: 'Memory offline' }),
            recall: async () => ({ results: [] }),
            getMemoryStats: () => ({ hot: { size: 0 }, warm: { size: 0 }, cold: { size: 0 } })
        };
    }
    const adaptiveRouter = new AdaptiveLearningRouter({ name: 'AdaptiveRouter', messageBroker });
    await initIfPossible(adaptiveRouter, 'AdaptiveRouter');

    // 2. Knowledge & Causal
    const causality = new CausalityArbiter({ 
        name: 'CausalityArbiter', 
        messageBroker,
        lobe: 'KNOWLEDGE',
        classification: 'COGNITION',
        tags: ['prediction', 'logic', 'inference']
    });
    const worldModel = new WorldModelArbiter({ 
        name: 'WorldModelArbiter', 
        messageBroker,
        lobe: 'KNOWLEDGE',
        classification: 'SIMULATION',
        tags: ['prediction', 'physics', 'future']
    });
    const knowledgeGraph = new KnowledgeGraphFusion({ 
        name: 'KnowledgeGraph', 
        messageBroker,
        savePath: path.join(process.cwd(), 'SOMA', 'soma-knowledge.json'),
        lobe: 'KNOWLEDGE',
        classification: 'GRAPH',
        tags: ['concepts', 'relations', 'rattling']
    });
    await Promise.all([
        initIfPossible(causality, 'CausalityArbiter'),
        initIfPossible(worldModel, 'WorldModelArbiter'),
        initIfPossible(knowledgeGraph, 'KnowledgeGraph')
    ]);

    // 3. Brain
    const quadBrain = new SOMArbiterV3({
        name: 'SomaBrain',
        router: adaptiveRouter,
        mnemonic: mnemonicArbiter,
        messageBroker: messageBroker,
        causalityArbiter: causality,
        worldModel: worldModel,
        knowledgeGraph: knowledgeGraph,
        toolRegistry: toolRegistry, // Enable tool execution
        asiEnabled: true,
        lobe: 'COGNITIVE',
        classification: 'CORE',
        tags: ['reasoning', 'decision', 'synthesis']
    });
    await quadBrain.initialize();

    // 4. Cortexes
    system.immuneCortex = new ImmuneCortexArbiter({ 
        messageBroker,
        lobe: 'COGNITIVE',
        classification: 'SECURITY',
        tags: ['shield', 'threat', 'filtering']
    });
    system.executiveCortex = new ExecutiveCortexArbiter({ 
        messageBroker, 
        quadBrain,
        lobe: 'EXECUTIVE',
        classification: 'OPERATIONS',
        tags: ['hands', 'exec', 'steve']
    });
    system.sensoryCortex = new SensoryCortexArbiter({ 
        messageBroker,
        lobe: 'COGNITIVE',
        classification: 'SENSORY',
        tags: ['input', 'vision', 'audio']
    });
    system.strategyCortex = new StrategyCortexArbiter({ 
        messageBroker, 
        quadBrain,
        lobe: 'COGNITIVE',
        classification: 'STRATEGY',
        tags: ['planning', 'long-term', 'goals']
    });

    await Promise.all([
        initIfPossible(system.immuneCortex, 'ImmuneCortex'),
        initIfPossible(system.executiveCortex, 'ExecutiveCortex'),
        initIfPossible(system.sensoryCortex, 'SensoryCortex'),
        initIfPossible(system.strategyCortex, 'StrategyCortex')
    ]);

    // 5. Dashboard Intelligence
    const GoalPlannerArbiter = GoalPlannerModule.GoalPlannerArbiter || GoalPlannerModule.default || GoalPlannerModule;
    const BeliefSystemArbiter = BeliefSystemModule.BeliefSystemArbiter || BeliefSystemModule.default || BeliefSystemModule;
    const LearningVelocityTracker = LearningVelocityTrackerModule.LearningVelocityTracker || LearningVelocityTrackerModule.default || LearningVelocityTrackerModule;

    system.goalPlanner = new GoalPlannerArbiter({ name: 'GoalPlanner', messageBroker, quadBrain });
    system.beliefSystem = new BeliefSystemArbiter({ name: 'BeliefSystem', messageBroker, quadBrain });
    system.museEngine = new MuseEngine({ name: 'MuseEngine', messageBroker, quadBrain });
    system.analytics = new PerformanceAnalytics({ rootPath: process.cwd() });
    system.velocityTracker = new LearningVelocityTracker(messageBroker, { name: 'VelocityTracker' });
    system.simulation = new SimulationArbiter({ name: 'Simulation', messageBroker });

    await Promise.all([
        initIfPossible(system.goalPlanner, 'GoalPlanner'),
        initIfPossible(system.beliefSystem, 'BeliefSystem'),
        initIfPossible(system.museEngine, 'MuseEngine'),
        initIfPossible(system.analytics, 'PerformanceAnalytics'),
        initIfPossible(system.velocityTracker, 'VelocityTracker'),
        initIfPossible(system.simulation, 'Simulation')
    ]);

    // 6. LEGACY ALIASES
    system.mnemonicArbiter = mnemonicArbiter;
    system.adaptiveRouter = adaptiveRouter;
    system.quadBrain = quadBrain;
    system.causality = causality;
    system.worldModel = worldModel;
    system.knowledgeGraph = knowledgeGraph;
    system.knowledge = knowledgeGraph;
    system.steveArbiter = system.executiveCortex;

    // 7. EARLY OUTCOME TRACKER — available from boot so chat can record outcomes immediately
    //    Extended loading will later create the full LearningPipeline which supersedes this.
    try {
        const OutcomeTracker = (await import('../../arbiters/OutcomeTracker.js')).default;
        system.outcomeTracker = new OutcomeTracker({
            storageDir: path.join(process.cwd(), 'data', 'outcomes'),
            maxInMemory: 10000,
            enablePersistence: true
        });
        if (typeof system.outcomeTracker.initialize === 'function') {
            await system.outcomeTracker.initialize();
        }
        console.log('[Cognitive] ✅ Early OutcomeTracker ready (chat can record outcomes from boot)');
    } catch (e) {
        console.warn('[Cognitive] ⚠️ Early OutcomeTracker failed:', e.message);
    }

    return system;
}