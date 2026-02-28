/**
 * HippocampusArbiter.js
 * 
 * THE MEMORY CORTEX
 * 
 * Consolidates all memory-related subsystems into a single unified lobe:
 * - MnemonicArbiter (Hybrid Storage: Hot/Warm/Cold)
 * - ThoughtNetwork (Fractal Reasoning Graph)
 * - ArchivistArbiter (Long-term Optimization)
 * 
 * PURPOSE: 
 * Ensures neural consistency. Every memory stored is simultaneously 
 * vectorized for search AND connected for reasoning.
 */

import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import MnemonicArbiter from './MnemonicArbiter.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ThoughtNetwork } = require('../cognitive/ThoughtNetwork.cjs');

export class HippocampusArbiter extends BaseArbiterV4 {
    constructor(config = {}) {
        super({
            name: 'HippocampusArbiter',
            role: ArbiterRole.MEMORY_CORTEX,
            capabilities: [
                ArbiterCapability.UNIFIED_MEMORY, 
                ArbiterCapability.SEMANTIC_GROWTH, 
                ArbiterCapability.FRACTAL_SYNC
            ],
            ...config
        });

        // 1. Initialize Subsystems (The Lobe's Organs)
        this.mnemonic = config.mnemonic || new MnemonicArbiter({
            name: 'Hippocampus-Mnemonic',
            ...config.mnemonicConfig
        });

        this.thoughtNetwork = config.thoughtNetwork || new ThoughtNetwork({
            name: 'Hippocampus-ThoughtNetwork',
            mnemonicArbiter: this.mnemonic,
            ...config.thoughtConfig
        });

        this.archivist = config.archivist || null; // Will be injected if available
    }

    async onInitialize() {
        this.log('info', '🧠 Initializing Memory Cortex (Hippocampus)...');

        // Initialize mnemonic — degrade gracefully if it fails (e.g. DB lock, corrupt file)
        if (!this.mnemonic.initialized) {
            try {
                await this.mnemonic.initialize();
            } catch (err) {
                this.log('warn', `⚠️ Mnemonic init failed — memory degraded: ${err.message}`);
                console.error('[HippocampusArbiter] Mnemonic init error (full):', err);
                // Don't rethrow — Hippocampus can still operate with ThoughtNetwork only
            }
        }

        // Initialize thought network (already handles its own errors internally)
        await this.thoughtNetwork.load();

        this.log('info', '✅ Memory subsystems unified');
    }

    /**
     * Unified Storage: The core fix for Neural Dissonance
     */
    async remember(content, metadata = {}) {
        this.log('debug', `Storing unified memory: ${content.substring(0, 50)}...`);

        // 1. Store in searchable tiers (Mnemonic)
        const mnemonicResult = await this.mnemonic.remember(content, metadata);

        // 2. Grow the reasoning graph (ThoughtNetwork)
        const nodes = await this.thoughtNetwork.growFromContent(content, {
            ...metadata,
            mnemonicId: mnemonicResult.id
        });

        return {
            success: true,
            mnemonicId: mnemonicResult.id,
            nodeCount: nodes.length,
            nodes: nodes.map(n => n.id)
        };
    }

    /**
     * Unified Recall: Multi-strategy retrieval
     */
    async recall(query, opts = {}) {
        // Try both semantic search and graph-based retrieval
        const [semanticResults, graphResults] = await Promise.all([
            this.mnemonic.recall(query, opts.topK || 5),
            this.thoughtNetwork.findSimilar(query, opts.threshold || 0.6, opts.topK || 3)
        ]);

        // Merge results (Production logic: prefer graph nodes if they have high similarity)
        return {
            semantic: semanticResults.results,
            graph: graphResults,
            tier: semanticResults.tier
        };
    }

    /**
     * Synthesis Bridge
     */
    async synthesize() {
        // Trigger the ThoughtNetwork to merge concepts autonomously
        return await this.thoughtNetwork.startAutonomousSynthesis();
    }

    getStatus() {
        return {
            mnemonic: this.mnemonic.getMemoryStats(),
            thoughtNetwork: this.thoughtNetwork.getStats(),
            status: 'online'
        };
    }

    async onShutdown() {
        await this.mnemonic.shutdown();
        await this.thoughtNetwork.save();
        await super.onShutdown();
    }
}
