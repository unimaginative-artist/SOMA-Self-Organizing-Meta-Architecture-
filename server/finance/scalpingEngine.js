/**
 * SOMA High-Frequency Scalping Engine
 *
 * Strategy: Mean-reversion with multi-signal confluence
 * - Bollinger Band oversold (price below lower band)
 * - RSI < 35 (momentum confirmation)
 * - MACD histogram turning positive (reversal signal)
 * - Market regime filter: only trade in RANGING or REVERSAL regimes
 *
 * Exit: Dynamic stop-loss via ATR, take-profit at middle Bollinger Band
 */

import lowLatencyEngine from './lowLatencyEngine.js';
import { calculateRSI, calculateMACD, calculateBollingerBands, calculateATR, calculateSMA } from './TechnicalIndicators.js';
import tradeLogger from './TradeLogger.js';
import { EventEmitter } from 'events';

class ScalpingEngine extends EventEmitter {
    constructor() {
        super();
        this.isActive = false;
        this.config = {
            minProfitTarget: 0.05,
            maxProfitTarget: 0.20,
            stopLossATRMultiplier: 1.5,  // Stop = 1.5x ATR below entry
            positionSize: 100,
            maxPositions: 5,             // Reduced from 10 - quality over quantity
            maxDailyTrades: 200,         // Reduced from 10000 - fewer, better trades
            maxDailyLoss: 500,
            cooldownMs: 2000,            // 2s cooldown - avoid overtrading
            minTickHistory: 30,          // Need 30 ticks before trading
            rsiOversold: 35,
            rsiBuyZone: 45,              // RSI must be below this for entry
            requiredSignals: 2           // Need at least 2 of 3 confluence signals
        };
        this.positions = new Map();
        this.recentTicks = new Map();
        this.stats = {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalProfit: 0,
            totalLoss: 0,
            dailyPnL: 0,
            lastTradeTime: 0,
            signalsChecked: 0,
            signalsRejected: 0
        };
    }

    async start(symbols = ['AAPL']) {
        this.isActive = true;
        await lowLatencyEngine.start(symbols);
        lowLatencyEngine.on('tick', (tick) => this.analyzeTick(tick));
        this.positionMonitor = setInterval(() => this.checkPositions(), 100);
        console.log('[Scalping] Started with multi-signal confluence strategy');
    }

    analyzeTick(tick) {
        const { symbol, price } = tick;
        if (!this.recentTicks.has(symbol)) this.recentTicks.set(symbol, []);
        const history = this.recentTicks.get(symbol);
        history.push(tick);
        if (history.length > 100) history.shift(); // Keep 100 ticks for indicator depth

        // Need minimum history for meaningful indicators
        if (history.length < this.config.minTickHistory) return;

        const position = this.positions.get(symbol);
        if (position) {
            this.checkExit(symbol, price, position, history);
        } else if (this.canTrade()) {
            this.checkEntry(symbol, price, history);
        }
    }

    /**
     * Multi-signal confluence entry check
     *
     * Requires at least 2 of these 3 signals:
     * 1. Price below lower Bollinger Band (oversold relative to recent range)
     * 2. RSI < 35 (momentum shows oversold)
     * 3. MACD histogram turning positive (reversal beginning)
     */
    checkEntry(symbol, price, history) {
        if (this.positions.size >= this.config.maxPositions) return;

        const prices = history.map(t => t.price);
        this.stats.signalsChecked++;

        // Refuse to trade on mock/stale data
        const lastTick = history[history.length - 1];
        if (lastTick.isMock || (Date.now() - (lastTick.timestamp || Date.now())) > 60000) {
            return; // Data older than 60s or flagged as mock
        }

        // Calculate indicators from tick prices
        const rsi = calculateRSI(prices, 14);
        const bb = calculateBollingerBands(prices, 20, 2);
        const macd = calculateMACD(prices, 12, 26, 9);
        const sma = calculateSMA(prices, 20);

        const macdHist = macd.histogram;
        const currentHist = macdHist[macdHist.length - 1];
        const prevHist = macdHist.length > 1 ? macdHist[macdHist.length - 2] : 0;

        // --- Signal 1: Bollinger Band oversold ---
        const bbOversold = price < bb.lower;

        // --- Signal 2: RSI oversold ---
        const rsiOversold = rsi < this.config.rsiOversold;
        const rsiInBuyZone = rsi < this.config.rsiBuyZone;

        // --- Signal 3: MACD histogram turning positive ---
        const macdTurning = prevHist < 0 && currentHist > prevHist;

        // Count active signals
        const signals = [bbOversold, rsiOversold || rsiInBuyZone, macdTurning];
        const activeSignals = signals.filter(Boolean).length;

        // Check if trading is halted by risk manager
        if (global.SOMA_TRADING?.riskManager?.riskState?.isHalted) {
            return; // Trading is halted by risk manager
        }

        // Regime-aware filtering (conditional — uses detector if loaded)
        const regimeDetector = global.SOMA_TRADING?.regimeDetector;
        let currentRegime = null;
        if (regimeDetector?.currentRegime) {
            currentRegime = regimeDetector.currentRegime;
            // Mean-reversion scalping fails in strong trending markets
            if (currentRegime === 'TRENDING_BULL' || currentRegime === 'TRENDING_BEAR') {
                if (regimeDetector.confidence > 0.6) {
                    this.stats.signalsRejected++;
                    return; // Skip — trend too strong for mean-reversion
                }
            }
            // Boost required signals in volatile/unclear regimes
            if (currentRegime === 'VOLATILE' || currentRegime === 'MIXED') {
                if (activeSignals < 3) {
                    this.stats.signalsRejected++;
                    return; // Need all 3 signals in uncertain conditions
                }
            }
        }

        // Require confluence
        if (activeSignals >= this.config.requiredSignals) {
            // Calculate dynamic stop-loss from ATR
            const atrResult = calculateATR(prices, prices, prices, 14); // Simplified: use close as H/L for tick data
            const dynamicStop = Math.max(this.config.minProfitTarget, atrResult.atr * this.config.stopLossATRMultiplier);
            const takeProfit = bb.middle - price; // Target: mean reversion to middle band

            if (takeProfit <= 0) return; // No upside - skip

            console.log(`[Scalping] ENTRY SIGNAL for ${symbol}: ${activeSignals}/3 signals (BB:${bbOversold} RSI:${rsi.toFixed(1)} MACD:${macdTurning})${currentRegime ? ` [${currentRegime}]` : ''}`);
            this.enterPosition(symbol, price, dynamicStop, Math.max(takeProfit, this.config.minProfitTarget), activeSignals / 3);
        } else {
            this.stats.signalsRejected++;
        }
    }

    /**
     * Dynamic exit: ATR-based stop, Bollinger middle band take-profit
     */
    checkExit(symbol, price, position, history) {
        const pnl = price - position.entryPrice;
        const holdTime = Date.now() - position.entryTime;

        // Dynamic stop-loss (ATR-based, set at entry)
        if (pnl <= -position.stopLoss) {
            this.exitPosition(symbol, price, 'STOP');
            return;
        }

        // Dynamic take-profit (middle Bollinger Band target)
        if (pnl >= position.takeProfit) {
            this.exitPosition(symbol, price, 'TARGET');
            return;
        }

        // Trailing stop: if we're profitable, tighten stop to breakeven
        if (pnl > position.stopLoss && position.stopLoss > 0) {
            position.stopLoss = Math.max(0, pnl * 0.5); // Lock in 50% of unrealized profit
        }

        // Time-based exit: close after 5 minutes if no clear direction
        if (holdTime > 300000 && Math.abs(pnl) < position.stopLoss * 0.3) {
            this.exitPosition(symbol, price, 'TIMEOUT');
        }
    }

    async enterPosition(symbol, entryPrice, stopLoss, takeProfit, signalStrength = 0.67) {
        // Dynamic position sizing via AdaptivePositionSizer (if loaded)
        let positionDollars = this.config.positionSize;
        const positionSizer = global.SOMA_TRADING?.positionSizer;
        if (positionSizer?.calculatePositionSize) {
            try {
                const winRate = this.stats.totalTrades > 0
                    ? this.stats.winningTrades / this.stats.totalTrades
                    : 0.5;
                const sizing = positionSizer.calculatePositionSize({
                    confidence: signalStrength,
                    historicalWinRate: winRate,
                    volatility: 0.5, // Could be refined with ATR data
                    riskScore: 50
                }, positionDollars * 100); // Approximate account balance
                positionDollars = sizing.positionSize || positionDollars;
            } catch (e) {
                // Fall back to config.positionSize on any error
            }
        }

        const qty = Math.floor(positionDollars / entryPrice);
        if (qty < 1) return;

        try {
            const order = await lowLatencyEngine.executeOrderFast(symbol, 'buy', qty);
            this.positions.set(symbol, {
                symbol,
                entryPrice,
                qty,
                entryTime: Date.now(),
                stopLoss,
                takeProfit
            });
            this.stats.lastTradeTime = Date.now();
            console.log(`[Scalping] BUY ${qty} ${symbol} @ $${entryPrice.toFixed(2)} | Stop: $${(entryPrice - stopLoss).toFixed(2)} | TP: $${(entryPrice + takeProfit).toFixed(2)}`);

            // Persist trade entry to SQLite
            try {
                tradeLogger.logTradeEntry({
                    orderId: order?.orderId || null,
                    symbol,
                    side: 'buy',
                    qty,
                    entryPrice,
                    filledPrice: entryPrice,
                    expectedPrice: entryPrice,
                    slippagePct: null,
                    strategy: 'scalping_confluence',
                    regime: global.SOMA_TRADING?.regimeDetector?.currentRegime || null
                });
            } catch (logErr) {
                console.warn(`[Scalping] Trade log failed:`, logErr.message);
            }

            this.emit('entry', { symbol, entryPrice, qty, stopLoss, takeProfit });
        } catch (err) {
            console.error(`[Scalping] Entry failed for ${symbol}:`, err.message);
        }
    }

    async exitPosition(symbol, exitPrice, reason) {
        const pos = this.positions.get(symbol);
        if (!pos) return;
        const pnl = (exitPrice - pos.entryPrice) * pos.qty;

        try {
            await lowLatencyEngine.executeOrderFast(symbol, 'sell', pos.qty);
        } catch (err) {
            console.error(`[Scalping] Exit failed for ${symbol}:`, err.message);
            return; // Don't remove position if exit order failed
        }

        this.stats.totalTrades++;
        if (pnl > 0) { this.stats.winningTrades++; this.stats.totalProfit += pnl; }
        else { this.stats.losingTrades++; this.stats.totalLoss += Math.abs(pnl); }
        this.stats.dailyPnL += pnl;
        this.positions.delete(symbol);

        console.log(`[Scalping] ${reason} ${symbol} @ $${exitPrice.toFixed(2)} | PnL: $${pnl.toFixed(2)}`);

        // Persist trade exit to SQLite
        try {
            const pnlPct = pos.entryPrice > 0 ? ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0;
            tradeLogger.logTradeExit(symbol, {
                exitPrice,
                pnl,
                pnlPct,
                reason: reason.toLowerCase()
            });
        } catch (logErr) {
            console.warn(`[Scalping] Trade exit log failed:`, logErr.message);
        }

        this.emit('exit', { symbol, exitPrice, pnl, reason });

        // Report loss to guardrails
        if (pnl < 0 && global.SOMA_TRADING?.guardrails) {
            global.SOMA_TRADING.guardrails.recordLoss(Math.abs(pnl));
        }

        // Feed closed trade to AdaptivePositionSizer (if loaded)
        if (global.SOMA_TRADING?.positionSizer?.updateFromTrade) {
            try {
                const pnlPct = pos.entryPrice > 0 ? ((exitPrice - pos.entryPrice) / pos.entryPrice) * 100 : 0;
                global.SOMA_TRADING.positionSizer.updateFromTrade({ pnl, pnlPercent: pnlPct });
            } catch (e) { /* non-critical */ }
        }

        // Feed to TradeLearningEngine for QuadBrain analysis (if loaded)
        if (global.SOMA_TRADING?.tradeLearning?.recordTrade) {
            try {
                global.SOMA_TRADING.tradeLearning.recordTrade({
                    id: `scalp_${symbol}_${Date.now()}`,
                    symbol,
                    side: 'buy',
                    entryPrice: pos.entryPrice,
                    exitPrice,
                    quantity: pos.qty,
                    pnl,
                    thesis: 'Mean-reversion scalp (Bollinger + RSI + MACD confluence)',
                    confidence: 0.67,
                    riskScore: 50,
                    timeframe: 'tick',
                    marketCondition: global.SOMA_TRADING?.regimeDetector?.currentRegime || 'unknown'
                });
            } catch (e) { /* non-critical */ }
        }
    }

    canTrade() {
        return this.stats.totalTrades < this.config.maxDailyTrades &&
            this.stats.dailyPnL > -this.config.maxDailyLoss &&
            Date.now() - this.stats.lastTradeTime > this.config.cooldownMs;
    }

    checkPositions() {
        if (!this.isActive) return;
        for (const [symbol, pos] of this.positions.entries()) {
            const tick = lowLatencyEngine.getOrderBook()[symbol];
            if (tick) {
                const history = this.recentTicks.get(symbol) || [];
                this.checkExit(symbol, tick.price, pos, history);
            }
        }
    }

    getStats() {
        const winRate = this.stats.totalTrades > 0
            ? (this.stats.winningTrades / this.stats.totalTrades * 100).toFixed(1)
            : '0.0';
        const profitFactor = this.stats.totalLoss > 0
            ? (this.stats.totalProfit / this.stats.totalLoss).toFixed(2)
            : 'Inf';
        return {
            ...this.stats,
            netProfit: this.stats.totalProfit - this.stats.totalLoss,
            winRate: winRate + '%',
            profitFactor,
            openPositions: this.positions.size,
            signalHitRate: this.stats.signalsChecked > 0
                ? ((this.stats.signalsChecked - this.stats.signalsRejected) / this.stats.signalsChecked * 100).toFixed(1) + '%'
                : '0.0%'
        };
    }

    stop() {
        this.isActive = false;
        if (this.positionMonitor) clearInterval(this.positionMonitor);
        console.log('[Scalping] Stopped');
    }
}

const scalpingEngine = new ScalpingEngine();
export default scalpingEngine;
