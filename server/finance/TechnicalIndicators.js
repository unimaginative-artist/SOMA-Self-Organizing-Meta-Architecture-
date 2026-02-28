/**
 * TechnicalIndicators - Pure, dependency-free indicator calculations
 *
 * Every function takes arrays of numbers and returns computed values.
 * No side effects, no state, no external dependencies.
 *
 * Used by:
 * - FinanceAgentArbiter (_runQuantAgent)
 * - ScalpingEngine (checkEntry)
 * - PositionGuardian (dynamic stop placement)
 */

/**
 * Simple Moving Average
 * @param {number[]} values - Price array (oldest first)
 * @param {number} period - Lookback period
 * @returns {number} SMA value
 */
export function calculateSMA(values, period) {
    if (values.length < period) return values[values.length - 1] || 0;
    const slice = values.slice(-period);
    return slice.reduce((sum, val) => sum + val, 0) / period;
}

/**
 * Exponential Moving Average
 * @param {number[]} values - Price array (oldest first)
 * @param {number} period - EMA period
 * @returns {number[]} Full EMA series (same length as input)
 */
export function calculateEMA(values, period) {
    if (values.length === 0) return [];
    if (values.length < period) {
        // Not enough data - return SMA-seeded partial
        const sma = values.reduce((a, b) => a + b, 0) / values.length;
        return values.map(() => sma);
    }

    const multiplier = 2 / (period + 1);
    const ema = new Array(values.length);

    // Seed with SMA of first `period` values
    let sum = 0;
    for (let i = 0; i < period; i++) {
        sum += values[i];
    }
    ema[period - 1] = sum / period;

    // Fill earlier slots with the seed value
    for (let i = 0; i < period - 1; i++) {
        ema[i] = ema[period - 1];
    }

    // Calculate EMA for remaining values
    for (let i = period; i < values.length; i++) {
        ema[i] = (values[i] - ema[i - 1]) * multiplier + ema[i - 1];
    }

    return ema;
}

/**
 * MACD (Moving Average Convergence Divergence)
 * @param {number[]} closes - Close prices (oldest first)
 * @param {number} fastPeriod - Fast EMA period (default 12)
 * @param {number} slowPeriod - Slow EMA period (default 26)
 * @param {number} signalPeriod - Signal line EMA period (default 9)
 * @returns {{ macdLine: number[], signalLine: number[], histogram: number[] }}
 */
export function calculateMACD(closes, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = calculateEMA(closes, fastPeriod);
    const slowEMA = calculateEMA(closes, slowPeriod);

    // MACD line = fast EMA - slow EMA
    const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);

    // Signal line = EMA of MACD line
    const signalLine = calculateEMA(macdLine, signalPeriod);

    // Histogram = MACD line - Signal line
    const histogram = macdLine.map((macd, i) => macd - signalLine[i]);

    return { macdLine, signalLine, histogram };
}

/**
 * Bollinger Bands
 * @param {number[]} closes - Close prices (oldest first)
 * @param {number} period - SMA period (default 20)
 * @param {number} stdDevMultiplier - Standard deviation multiplier (default 2)
 * @returns {{ upper: number, middle: number, lower: number, width: number, percentB: number }}
 */
export function calculateBollingerBands(closes, period = 20, stdDevMultiplier = 2) {
    if (closes.length < period) {
        const avg = closes.reduce((a, b) => a + b, 0) / closes.length;
        return { upper: avg, middle: avg, lower: avg, width: 0, percentB: 0.5 };
    }

    const slice = closes.slice(-period);
    const middle = slice.reduce((sum, val) => sum + val, 0) / period;

    // Standard deviation
    const squaredDiffs = slice.map(val => Math.pow(val - middle, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / period;
    const stdDev = Math.sqrt(variance);

    const upper = middle + stdDevMultiplier * stdDev;
    const lower = middle - stdDevMultiplier * stdDev;
    const width = ((upper - lower) / middle) * 100; // Width as percentage
    const currentPrice = closes[closes.length - 1];
    const percentB = (upper - lower) !== 0 ? (currentPrice - lower) / (upper - lower) : 0.5;

    return { upper, middle, lower, width, percentB };
}

/**
 * Average True Range (Wilder's method)
 * @param {number[]} highs - High prices
 * @param {number[]} lows - Low prices
 * @param {number[]} closes - Close prices
 * @param {number} period - ATR period (default 14)
 * @returns {{ atr: number, atrPercent: number }}
 */
export function calculateATR(highs, lows, closes, period = 14) {
    if (closes.length < 2) return { atr: 0, atrPercent: 0 };

    // True Range = max(H-L, |H-prevC|, |L-prevC|)
    const trueRanges = [];
    for (let i = 1; i < closes.length; i++) {
        const hl = highs[i] - lows[i];
        const hpc = Math.abs(highs[i] - closes[i - 1]);
        const lpc = Math.abs(lows[i] - closes[i - 1]);
        trueRanges.push(Math.max(hl, hpc, lpc));
    }

    if (trueRanges.length < period) {
        const avg = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
        const currentPrice = closes[closes.length - 1];
        return { atr: avg, atrPercent: (avg / currentPrice) * 100 };
    }

    // Wilder's smoothed ATR: first ATR = simple average, then smoothed
    let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
    for (let i = period; i < trueRanges.length; i++) {
        atr = (atr * (period - 1) + trueRanges[i]) / period;
    }

    const currentPrice = closes[closes.length - 1];
    return {
        atr,
        atrPercent: (atr / currentPrice) * 100
    };
}

/**
 * Relative Strength Index (Wilder's smoothed)
 * @param {number[]} closes - Close prices (oldest first)
 * @param {number} period - RSI period (default 14)
 * @returns {number} RSI value (0-100)
 */
export function calculateRSI(closes, period = 14) {
    if (closes.length < period + 1) return 50; // Neutral default

    // Price changes
    const changes = [];
    for (let i = 1; i < closes.length; i++) {
        changes.push(closes[i] - closes[i - 1]);
    }

    // First average gain/loss (simple average of first `period` changes)
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
        if (changes[i] > 0) avgGain += changes[i];
        else avgLoss += Math.abs(changes[i]);
    }
    avgGain /= period;
    avgLoss /= period;

    // Wilder's smoothing for remaining changes
    for (let i = period; i < changes.length; i++) {
        const gain = changes[i] > 0 ? changes[i] : 0;
        const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;
    if (avgGain === 0) return 0;

    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

/**
 * Volume Weighted Average Price (intraday)
 * @param {number[]} closes - Close prices
 * @param {number[]} volumes - Volume data
 * @returns {number} VWAP value
 */
export function calculateVWAP(closes, volumes) {
    if (closes.length === 0 || volumes.length === 0) return 0;
    const len = Math.min(closes.length, volumes.length);
    let cumulativePV = 0;
    let cumulativeVolume = 0;
    for (let i = 0; i < len; i++) {
        cumulativePV += closes[i] * volumes[i];
        cumulativeVolume += volumes[i];
    }
    return cumulativeVolume > 0 ? cumulativePV / cumulativeVolume : closes[closes.length - 1];
}

/**
 * Pivot Points (Standard)
 * @param {number} high - Previous period high
 * @param {number} low - Previous period low
 * @param {number} close - Previous period close
 * @returns {{ pivot: number, r1: number, r2: number, r3: number, s1: number, s2: number, s3: number }}
 */
export function calculatePivotPoints(high, low, close) {
    const pivot = (high + low + close) / 3;
    return {
        pivot,
        r1: 2 * pivot - low,
        r2: pivot + (high - low),
        r3: high + 2 * (pivot - low),
        s1: 2 * pivot - high,
        s2: pivot - (high - low),
        s3: low - 2 * (high - pivot)
    };
}

/**
 * Compute all indicators at once for a price series
 * @param {{ close: number, high?: number, low?: number, volume?: number }[]} bars
 * @returns {object} All indicator values
 */
export function computeAll(bars) {
    const closes = bars.map(b => b.close);
    const highs = bars.map(b => b.high || b.close);
    const lows = bars.map(b => b.low || b.close);
    const volumes = bars.map(b => b.volume || 0);

    const currentPrice = closes[closes.length - 1];
    const rsi = calculateRSI(closes, 14);
    const macd = calculateMACD(closes);
    const bb = calculateBollingerBands(closes, 20, 2);
    const atr = calculateATR(highs, lows, closes, 14);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const ema12 = calculateEMA(closes, 12);
    const ema26 = calculateEMA(closes, 26);
    const vwap = calculateVWAP(closes, volumes);

    // Derive signals
    const macdCurrent = macd.histogram[macd.histogram.length - 1];
    const macdPrevious = macd.histogram.length > 1 ? macd.histogram[macd.histogram.length - 2] : 0;
    const macdTurningPositive = macdPrevious < 0 && macdCurrent > 0;
    const macdTurningNegative = macdPrevious > 0 && macdCurrent < 0;

    const rsiSignal = rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral';
    const macdSignal = macdTurningPositive ? 'Bullish Crossover' :
                       macdTurningNegative ? 'Bearish Crossover' :
                       macdCurrent > 0 ? 'Bullish' : 'Bearish';
    const bbSignal = currentPrice > bb.upper ? 'Upper Breakout' :
                     currentPrice < bb.lower ? 'Lower Breakout' :
                     bb.percentB < 0.2 ? 'Near Lower Band' :
                     bb.percentB > 0.8 ? 'Near Upper Band' : 'Within Bands';

    // Pivot points from last bar
    const lastBar = bars[bars.length - 1];
    const pivots = calculatePivotPoints(
        lastBar.high || lastBar.close,
        lastBar.low || lastBar.close,
        lastBar.close
    );

    return {
        currentPrice,
        rsi: { value: rsi, signal: rsiSignal },
        macd: {
            line: macd.macdLine[macd.macdLine.length - 1],
            signal: macd.signalLine[macd.signalLine.length - 1],
            histogram: macdCurrent,
            turningPositive: macdTurningPositive,
            turningNegative: macdTurningNegative,
            signalLabel: macdSignal
        },
        bollinger: {
            upper: bb.upper,
            middle: bb.middle,
            lower: bb.lower,
            width: bb.width,
            percentB: bb.percentB,
            signal: bbSignal
        },
        atr: { value: atr.atr, percent: atr.atrPercent },
        sma: { sma20, sma50 },
        ema: { ema12: ema12[ema12.length - 1], ema26: ema26[ema26.length - 1] },
        vwap,
        pivots
    };
}
