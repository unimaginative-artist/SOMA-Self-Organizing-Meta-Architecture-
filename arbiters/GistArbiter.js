/**
 * GistArbiter.js
 * 
 * The Hierarchical Summarization & Wisdom Layer.
 * Prevents "Context Bloat" by distilling raw history into semantic principles.
 * 
 * Capabilities:
 * - monitor-context: Watch history size and token usage.
 * - distill-wisdom: Convert raw conversation turns into high-level "Gists".
 * - memory-compaction: Purge raw data after distillation to keep context clean.
 * - principle-extraction: Identify user preferences, system failures, and core concepts.
 */

import BaseArbiterV4, { ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
const BaseArbiter = BaseArbiterV4; // Alias for compatibility

export class GistArbiter extends BaseArbiter {
    static role = ArbiterRole.ANALYST;
    static capabilities = [
        ArbiterCapability.MEMORY_ACCESS,
        ArbiterCapability.CONSOLIDATE_KNOWLEDGE
    ];

    constructor(config = {}) {
        super({
            name: 'GistArbiter',
            role: GistArbiter.role,
            capabilities: GistArbiter.capabilities,
            ...config
        });

        this.threshold = config.threshold || 20; // Trigger after 20 messages
        this.brain = null; // Will be injected
        this.mnemonic = null;
        this.history = null;
    }

    async initialize(deps = {}) {
        await super.initialize();
        this.brain = deps.brain;
        this.mnemonic = deps.mnemonic;
        this.history = deps.history;
        console.log(`[${this.name}] Wisdom Distiller online. Threshold: ${this.threshold} turns.`);
    }

    /**
     * Set central brain for distillation
     */
    setBrain(brain) {
        this.brain = brain;
    }

    /**
     * Analyze current context and decide if distillation is needed
     */
    async checkCompactionNeeded(messages) {
        if (messages.length >= this.threshold) {
            console.log(`[${this.name}] 🧠 Context threshold reached (${messages.length}). Initiating distillation...`);
            return await this.distill(messages);
        }
        return null;
    }

    /**
     * Distill raw messages into Principles/Wisdom
     */
    async distill(messages) {
        if (!this.brain) {
            console.warn(`[${this.name}] No brain connected. Distillation skipped.`);
            return null;
        }

        const chunkToDistill = messages.slice(0, 10); // Take the oldest 10 turns
        const rawText = chunkToDistill.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n');

        const prompt = `You are the GIST ARBITER. Your job is to extract high-level "WISDOM" from this raw conversation history.
        
        RAW HISTORY:
        ${rawText}
        
        TASK:
        1. Identify the CORE TOPICS discussed.
        2. Extract USER PREFERENCES (tone, detail level, interests).
        3. Note any MISTAKES the system made and the FIXED correction.
        4. Capture NEW KNOWLEDGE acquired. 
        
        Respond ONLY with a valid JSON object:
        {
            "topics": ["list", "of", "topics"],
            "preferences": ["user likes X", "user wants Y"],
            "wisdom": ["lesson learned from failure", "key principle"],
            "summary": "one paragraph consolidation of facts"
        }`;

        try {
            // Use LOGOS for high-precision distillation
            const result = await this.brain.callBrain('LOGOS', prompt, { temperature: 0.1 });
            const gist = this._parseJSON(result.text || result);

            console.log(`[${this.name}] ✅ Wisdom extracted: ${gist.topics.join(', ')}`);

            // Store the Gist in Mnemonic Arbiter (Permanent Wisdom)
            if (this.mnemonic) {
                await this.mnemonic.remember(
                    `WISDOM GIST: ${gist.summary}`, 
                    { 
                        type: 'gist', 
                        topics: gist.topics, 
                        importance: 0.9,
                        preferences: gist.preferences
                    }
                );
            }

            return {
                success: true,
                compactedCount: chunkToDistill.length,
                gist
            };

        } catch (err) {
            console.error(`Distillation failed: ${err.message}`);
            return { success: false, error: err.message };
        }
    }

    _parseJSON(text) {
        try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            return JSON.parse(jsonMatch ? jsonMatch[0] : text);
        } catch (e) {
            return { topics: [], preferences: [], wisdom: [], summary: text };
        }
    }
}
