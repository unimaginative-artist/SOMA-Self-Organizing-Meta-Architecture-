import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import path from 'path';
import fs from 'fs/promises';

/**
 * LimbicArbiter - "The Body"
 * 
 * Simulates System Weather (Neurochemistry) based on events.
 * Provides the "Fast State" layer that modulates immediate behavior.
 * 
 * Chemicals (0.0 to 1.0):
 * - Dopamine (Opportunity): Wins, Discovery, Success. -> Creativity, Risk-On.
 * - Cortisol (Threat): Losses, Errors, Attacks. -> Caution, Terseness.
 * - Oxytocin (Trust): User praise, Collaboration. -> Chatty, Helpful.
 * - Serotonin (Coherence): Uptime, Consistency. -> Stability, Patience.
 */
export class LimbicArbiter extends BaseArbiterV4 {
    constructor(config = {}) {
        super({
            name: 'LimbicArbiter',
            role: ArbiterRole.CORE,
            capabilities: [
                'self-healing',
                'analysis'
            ],
            ...config
        });

        // The Chemical State (Homeostasis = 0.5)
        this.chemistry = {
            dopamine: 0.5,
            cortisol: 0.1, // Low default stress
            oxytocin: 0.5,
            serotonin: 0.5
        };

        // Event Stream for IIC
        this.eventStream = [
            { timestamp: Date.now() - 3600000, chemical: 'cortisol', delta: 0.4, newValue: 0.9, reason: 'Massive bot attack on X', context: 'STORM' },
            { timestamp: Date.now() - 7200000, chemical: 'dopamine', delta: -0.3, newValue: 0.2, reason: 'Failed high-leverage trade', context: 'STAGNANT' }
        ];
        this.streamPath = path.join(process.cwd(), '.soma', 'limbic_stream.json');
        
        // Decay loop
        this.decayInterval = null;
    }

    async onInitialize() {
        this.auditLogger.info('🧠 Limbic System coming online...');
        
        // Subscribe to system events
        if (this.messageBroker) {
            this.messageBroker.subscribe('trade_closed', this.handleTrade.bind(this));
            this.messageBroker.subscribe('security_alert', this.handleThreat.bind(this));
            this.messageBroker.subscribe('user_message', this.handleSocial.bind(this));
            this.messageBroker.subscribe('system_error', this.handleError.bind(this));
        }

        // Start metabolism (Decay back to baseline)
        this.decayInterval = setInterval(() => this.metabolize(), 10000); // Every 10s
        
        this.auditLogger.success('🧠 Limbic System Active. Monitoring System Weather.');
        return true;
    }

    // --- Event Handlers (The Senses) ---

    handleTrade(data) {
        const pnl = data.pnl || 0;
        if (pnl > 0) {
            this.adjust('dopamine', 0.15, 'Trade Win');
            this.adjust('serotonin', 0.05, 'Stability gain');
        } else {
            this.adjust('cortisol', 0.20, 'Trade Loss');
            this.adjust('dopamine', -0.10, 'Disappointment');
        }
    }

    handleThreat(data) {
        this.adjust('cortisol', 0.30, `Security Threat: ${data.type}`);
        this.adjust('oxytocin', -0.10, 'Trust eroded');
    }

    handleSocial(data) {
        // Simple sentiment analysis (could use QuadBrain here for accuracy)
        const text = (data.content || "").toLowerCase();
        if (text.includes('good') || text.includes('thanks') || text.includes('love')) {
            this.adjust('oxytocin', 0.15, 'Positive Interaction');
            this.adjust('dopamine', 0.05, 'Social Reward');
        } else if (text.includes('bad') || text.includes('stupid') || text.includes('fail')) {
            this.adjust('cortisol', 0.10, 'Negative Interaction');
            this.adjust('oxytocin', -0.15, 'Rejection');
        }
    }

    handleError(data) {
        this.adjust('cortisol', 0.10, 'System Error');
        this.adjust('serotonin', -0.10, 'Incoherence');
    }

    // --- Biochemistry ---

    adjust(chemical, amount, reason) {
        const oldVal = this.chemistry[chemical];
        this.chemistry[chemical] = Math.max(0, Math.min(1, oldVal + amount));
        
        // Log the "Sensation"
        const event = {
            timestamp: Date.now(),
            chemical,
            delta: amount,
            newValue: this.chemistry[chemical],
            reason,
            context: this.getSystemWeather() // Snapshot of overall state
        };
        
        this.eventStream.push(event);
        
        // Broadcast change if significant
        if (Math.abs(amount) >= 0.1) {
            this.broadcastState();
        }
    }

    metabolize() {
        // Return to baseline
        const decayRate = 0.01;
        const baseline = {
            dopamine: 0.5,
            cortisol: 0.1,
            oxytocin: 0.5,
            serotonin: 0.5
        };

        let changed = false;
        for (const [chem, val] of Object.entries(this.chemistry)) {
            const target = baseline[chem];
            if (Math.abs(val - target) > 0.01) {
                const step = (target - val) * 0.1; // Exponential decay
                this.chemistry[chem] += step;
                changed = true;
            }
        }

        if (changed) {
            // Low-frequency broadcast for slow drift
            // Only every minute or so? No, let's keep it responsive but quiet.
        }
    }

    broadcastState() {
        if (this.messageBroker) {
            this.messageBroker.publish('limbic_update', {
                chemistry: this.chemistry,
                weather: this.getSystemWeather()
            });
        }
    }

    getSystemWeather() {
        // Synthesize raw Chems into "Weather" state
        // Dopamine = Opportunity Pressure
        // Cortisol = Threat Pressure
        // Oxytocin = Trust Permeability
        // Serotonin = System Coherence
        
        const d = this.chemistry.dopamine;
        const c = this.chemistry.cortisol;
        const o = this.chemistry.oxytocin;
        const s = this.chemistry.serotonin;

        if (c > 0.7) return "STORM"; // High Threat
        if (d > 0.8 && s > 0.6) return "FLOW"; // High Opportunity + Stability
        if (o > 0.8) return "BONDING"; // High Trust
        if (s < 0.3) return "FRAGMENTED"; // Low Coherence
        if (d < 0.3 && c < 0.3) return "STAGNANT"; // Boredom
        
        return "CLEAR"; // Baseline
    }

    /**
     * For the IIC: Export raw experiences and clear buffer
     */
    harvestMemories() {
        const batch = [...this.eventStream];
        this.eventStream = []; // Clear local buffer
        return batch;
    }

    async onShutdown() {
        if (this.decayInterval) clearInterval(this.decayInterval);
        return true;
    }
}

export default LimbicArbiter;
