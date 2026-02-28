/**
 * SimulationLearningEngine - SOMA Learns From Paper Trading
 *
 * This is the feedback loop that closes the gap between "paper trading runs"
 * and "SOMA gets smarter." Every N trades (or on a timer), it:
 *
 * 1. Reads closed trades from TradeLogger (SQLite)
 * 2. Calculates per-strategy and per-exit-reason performance
 * 3. Adjusts ScalpingEngine parameters (RSI thresholds, stop multiplier, etc.)
 * 4. Logs every adjustment as a learning event (persistent, visible in dashboard)
 * 5. Saves learning state to disk so it survives restarts
 *
 * Philosophy: Conservative adjustments. Never change a parameter by more than
 * 15% per cycle. Require statistical significance (min 20 trades) before acting.
 */

import tradeLogger from './TradeLogger.js';
import scalpingEngine from './scalpingEngine.js';
import performanceCalculator from './PerformanceCalculator.js';
import fs from 'fs';
import path from 'path';

class SimulationLearningEngine {
    constructor() {
        this.stateFile = path.join(process.cwd(), 'data', 'trading', 'learning-state.json');
        this.cycleIntervalMs = 5 * 60 * 1000; // Learn every 5 minutes
        this.minTradesForLearning = 20;        // Don't adjust with fewer trades
        this.maxAdjustmentPct = 0.15;          // Max 15% change per cycle
        this.intervalId = null;

        // Learning state (persisted to disk)
        this.state = {
            totalCycles: 0,
            lastCycleAt: null,
            tradesAnalyzedTotal: 0,
            adjustments: [],
            currentConfig: null, // Snapshot of current scalping config
            performanceTrend: [] // Rolling window of per-cycle metrics
        };

        this._loadState();
    }

    /**
     * Start the periodic learning loop
     */
    start() {
        if (this.intervalId) return;

        console.log('[SimLearning] Starting learning engine (cycle every 5min)');
        this.intervalId = setInterval(() => {
            this.runLearningCycle().catch(err => {
                console.error('[SimLearning] Cycle error:', err.message);
            });
        }, this.cycleIntervalMs);

        // Run first cycle after 30s to let trades accumulate
        setTimeout(() => {
            this.runLearningCycle().catch(err => {
                console.error('[SimLearning] Initial cycle error:', err.message);
            });
        }, 30000);
    }

    /**
     * Stop the learning loop
     */
    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        console.log('[SimLearning] Stopped');
    }

    /**
     * Run a single learning cycle
     */
    async runLearningCycle() {
        const closedTrades = tradeLogger.getClosedTrades();
        if (closedTrades.length < this.minTradesForLearning) {
            return { skipped: true, reason: `Only ${closedTrades.length} trades (need ${this.minTradesForLearning})` };
        }

        console.log(`[SimLearning] Running learning cycle (${closedTrades.length} trades)...`);

        const adjustments = [];
        const config = scalpingEngine.config;

        // ─── Analysis 1: Exit Reason Breakdown ───
        const exitReasons = this._analyzeExitReasons(closedTrades);

        // If too many stops are hitting, widen the stop
        if (exitReasons.stopPct > 60 && closedTrades.length >= this.minTradesForLearning) {
            const oldVal = config.stopLossATRMultiplier;
            const newVal = Math.min(3.0, oldVal * (1 + this.maxAdjustmentPct * 0.5));
            if (newVal !== oldVal) {
                config.stopLossATRMultiplier = parseFloat(newVal.toFixed(2));
                adjustments.push(this._logAdjustment(
                    'stopLossATRMultiplier', oldVal, newVal,
                    `${exitReasons.stopPct.toFixed(0)}% of exits are stops — widening stop multiplier`,
                    'scalping_confluence'
                ));
            }
        }

        // If too many timeouts, tighten take-profit or increase signal quality
        if (exitReasons.timeoutPct > 40 && closedTrades.length >= this.minTradesForLearning) {
            const oldVal = config.requiredSignals;
            const newVal = Math.min(3, oldVal + 1);
            if (newVal !== oldVal) {
                config.requiredSignals = newVal;
                adjustments.push(this._logAdjustment(
                    'requiredSignals', oldVal, newVal,
                    `${exitReasons.timeoutPct.toFixed(0)}% of exits are timeouts — requiring more confluence`,
                    'scalping_confluence'
                ));
            }
        }

        // ─── Analysis 2: Win Rate Adaptation ───
        const stats = tradeLogger.getStats();

        // If win rate is strong, allow slightly more aggressive trading
        if (stats.winRate > 60 && closedTrades.length >= 50) {
            // Lower RSI threshold slightly (allow more entries)
            const oldRsi = config.rsiOversold;
            const newRsi = Math.max(25, oldRsi - 2);
            if (newRsi !== oldRsi) {
                config.rsiOversold = newRsi;
                adjustments.push(this._logAdjustment(
                    'rsiOversold', oldRsi, newRsi,
                    `Win rate ${stats.winRate.toFixed(1)}% — allowing slightly more aggressive RSI entries`,
                    'scalping_confluence'
                ));
            }

            // Increase max positions slightly
            const oldMax = config.maxPositions;
            const newMax = Math.min(8, oldMax + 1);
            if (newMax !== oldMax) {
                config.maxPositions = newMax;
                adjustments.push(this._logAdjustment(
                    'maxPositions', oldMax, newMax,
                    `Strong performance — increasing max concurrent positions`,
                    'scalping_confluence'
                ));
            }
        }

        // If win rate is poor, tighten entry criteria
        if (stats.winRate < 40 && closedTrades.length >= 30) {
            const oldRsi = config.rsiOversold;
            const newRsi = Math.min(40, oldRsi + 2);
            if (newRsi !== oldRsi) {
                config.rsiOversold = newRsi;
                adjustments.push(this._logAdjustment(
                    'rsiOversold', oldRsi, newRsi,
                    `Win rate ${stats.winRate.toFixed(1)}% — tightening RSI entry threshold`,
                    'scalping_confluence'
                ));
            }

            // Reduce max positions
            const oldMax = config.maxPositions;
            const newMax = Math.max(2, oldMax - 1);
            if (newMax !== oldMax) {
                config.maxPositions = newMax;
                adjustments.push(this._logAdjustment(
                    'maxPositions', oldMax, newMax,
                    `Poor performance — reducing concurrent positions`,
                    'scalping_confluence'
                ));
            }

            // Increase cooldown to avoid overtrading
            const oldCool = config.cooldownMs;
            const newCool = Math.min(10000, oldCool + 1000);
            if (newCool !== oldCool) {
                config.cooldownMs = newCool;
                adjustments.push(this._logAdjustment(
                    'cooldownMs', oldCool, newCool,
                    `Increasing cooldown to reduce overtrading`,
                    'scalping_confluence'
                ));
            }
        }

        // ─── Analysis 3: Risk/Reward Adaptation ───
        if (stats.avgWin > 0 && stats.avgLoss > 0) {
            const rrRatio = stats.avgWin / stats.avgLoss;

            // If risk/reward is poor, adjust profit targets
            if (rrRatio < 1.0 && closedTrades.length >= 30) {
                const oldMin = config.minProfitTarget;
                const newMin = Math.min(0.15, oldMin * 1.1);
                if (newMin !== oldMin) {
                    config.minProfitTarget = parseFloat(newMin.toFixed(3));
                    adjustments.push(this._logAdjustment(
                        'minProfitTarget', oldMin, newMin,
                        `R:R ratio ${rrRatio.toFixed(2)} < 1.0 — raising minimum profit target`,
                        'scalping_confluence'
                    ));
                }
            }
        }

        // ─── Analysis 4: Max Daily Loss Adaptation ───
        // If daily losses are consistently hitting the cap, it might be too tight
        // or the strategy needs to cool down
        if (stats.totalPnl < -config.maxDailyLoss * 0.8 && closedTrades.length >= 20) {
            const oldDailyMax = config.maxDailyTrades;
            const newDailyMax = Math.max(50, oldDailyMax - 25);
            if (newDailyMax !== oldDailyMax) {
                config.maxDailyTrades = newDailyMax;
                adjustments.push(this._logAdjustment(
                    'maxDailyTrades', oldDailyMax, newDailyMax,
                    `Approaching daily loss limit — reducing max daily trades`,
                    'scalping_confluence'
                ));
            }
        }

        // ─── Record Cycle ───
        this.state.totalCycles++;
        this.state.lastCycleAt = new Date().toISOString();
        this.state.tradesAnalyzedTotal = closedTrades.length;
        this.state.currentConfig = { ...config };
        this.state.adjustments = adjustments;

        // Track performance trend (last 50 cycles)
        this.state.performanceTrend.push({
            cycle: this.state.totalCycles,
            timestamp: this.state.lastCycleAt,
            trades: closedTrades.length,
            winRate: stats.winRate,
            totalPnl: stats.totalPnl,
            profitFactor: stats.profitFactor === Infinity ? 999 : stats.profitFactor,
            adjustmentsMade: adjustments.length
        });
        if (this.state.performanceTrend.length > 50) {
            this.state.performanceTrend = this.state.performanceTrend.slice(-50);
        }

        this._saveState();

        if (adjustments.length > 0) {
            console.log(`[SimLearning] Cycle complete: ${adjustments.length} adjustments made`);
        } else {
            console.log(`[SimLearning] Cycle complete: no adjustments needed`);
        }

        return {
            skipped: false,
            cycle: this.state.totalCycles,
            tradesAnalyzed: closedTrades.length,
            adjustments,
            currentConfig: { ...config }
        };
    }

    /**
     * Analyze exit reasons to understand what's going wrong
     */
    _analyzeExitReasons(trades) {
        const reasons = { stop: 0, target: 0, timeout: 0, other: 0 };
        for (const t of trades) {
            const reason = (t.exit_reason || '').toLowerCase();
            if (reason.includes('stop')) reasons.stop++;
            else if (reason.includes('target')) reasons.target++;
            else if (reason.includes('timeout') || reason.includes('time')) reasons.timeout++;
            else reasons.other++;
        }
        const total = trades.length || 1;
        return {
            stopPct: (reasons.stop / total) * 100,
            targetPct: (reasons.target / total) * 100,
            timeoutPct: (reasons.timeout / total) * 100,
            otherPct: (reasons.other / total) * 100,
            raw: reasons
        };
    }

    /**
     * Log a parameter adjustment both in-memory and to SQLite
     */
    _logAdjustment(metricName, oldValue, newValue, description, strategy) {
        const adjustment = {
            metricName,
            oldValue,
            newValue,
            description,
            strategy,
            timestamp: new Date().toISOString()
        };

        // Persist to learning_events table
        tradeLogger.logLearningEvent({
            eventType: 'PARAMETER_ADJUSTMENT',
            description,
            strategy,
            metricName,
            oldValue,
            newValue,
            triggerReason: `cycle_${this.state.totalCycles + 1}`
        });

        console.log(`[SimLearning] ADJUST ${metricName}: ${oldValue} → ${newValue} (${description})`);
        return adjustment;
    }

    /**
     * Get the full performance report (for the paper→live gate)
     */
    getPerformanceReport() {
        const closedTrades = tradeLogger.getClosedTrades(30); // Last 30 days
        const equityCurve = tradeLogger.getEquityCurve(30);
        const report = performanceCalculator.calculateReport(closedTrades, equityCurve);
        return report;
    }

    /**
     * Get current learning state (for API)
     */
    getState() {
        return {
            isRunning: !!this.intervalId,
            ...this.state,
            scalpingConfig: { ...scalpingEngine.config }
        };
    }

    /**
     * Force a learning cycle (manual trigger from API)
     */
    async forceCycle() {
        return await this.runLearningCycle();
    }

    // ─── Persistence ───

    _loadState() {
        try {
            if (fs.existsSync(this.stateFile)) {
                const data = JSON.parse(fs.readFileSync(this.stateFile, 'utf8'));
                this.state = { ...this.state, ...data };

                // Restore scalping config if we have a saved one
                if (data.currentConfig && scalpingEngine) {
                    const saved = data.currentConfig;
                    const config = scalpingEngine.config;
                    // Only restore tunable parameters (don't overwrite structural config)
                    if (saved.rsiOversold) config.rsiOversold = saved.rsiOversold;
                    if (saved.rsiBuyZone) config.rsiBuyZone = saved.rsiBuyZone;
                    if (saved.requiredSignals) config.requiredSignals = saved.requiredSignals;
                    if (saved.stopLossATRMultiplier) config.stopLossATRMultiplier = saved.stopLossATRMultiplier;
                    if (saved.maxPositions) config.maxPositions = saved.maxPositions;
                    if (saved.cooldownMs) config.cooldownMs = saved.cooldownMs;
                    if (saved.minProfitTarget) config.minProfitTarget = saved.minProfitTarget;
                    if (saved.maxDailyTrades) config.maxDailyTrades = saved.maxDailyTrades;
                    console.log('[SimLearning] Restored learned config from disk');
                }
            }
        } catch (err) {
            console.warn('[SimLearning] Failed to load state:', err.message);
        }
    }

    _saveState() {
        try {
            const dir = path.dirname(this.stateFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.stateFile, JSON.stringify(this.state, null, 2));
        } catch (err) {
            console.warn('[SimLearning] Failed to save state:', err.message);
        }
    }
}

// Singleton
const simulationLearningEngine = new SimulationLearningEngine();
export default simulationLearningEngine;
