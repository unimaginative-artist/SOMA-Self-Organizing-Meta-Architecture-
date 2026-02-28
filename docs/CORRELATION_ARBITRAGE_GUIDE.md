# 📊 Correlation Arbitrage - Feature #3

## Overview

**Correlation Arbitrage** (also called **Pairs Trading**) is a market-neutral strategy that profits from temporary divergences between normally correlated assets.

**The Core Idea:**
- Assets that normally move together (BTC/ETH, AAPL/MSFT) will eventually return to their normal relationship
- When they diverge, we bet on the convergence
- Short the overperformer, long the underperformer
- Profit when the spread normalizes

**Market-Neutral:**
- $0 net investment (short proceeds fund long position)
- Makes money in bull or bear markets
- Only cares about relative performance, not market direction

---

## 🎯 How It Works

### Step 1: Find Correlated Pairs

We track pairs with high historical correlation (>0.7):

```javascript
// Known correlated pairs
const pairs = [
    // Crypto
    { pair: ['BTC-USD', 'ETH-USD'], correlation: 0.85 },

    // Tech stocks
    { pair: ['AAPL', 'MSFT'], correlation: 0.72 },
    { pair: ['NVDA', 'AMD'], correlation: 0.75 },

    // Indices
    { pair: ['SPY', 'QQQ'], correlation: 0.88 },

    // Energy
    { pair: ['XOM', 'CVX'], correlation: 0.82 }
];
```

### Step 2: Calculate Correlation

Using Pearson correlation coefficient:

```javascript
calculateCorrelation(prices1, prices2) {
    const mean1 = average(prices1);
    const mean2 = average(prices2);

    // Correlation coefficient
    const numerator = sum((prices1[i] - mean1) * (prices2[i] - mean2));
    const denominator = sqrt(sum(diff1²) * sum(diff2²));

    return numerator / denominator; // -1 to +1
}
```

**Interpretation:**
- `0.7 to 1.0`: Strong positive correlation (trade these!)
- `0.3 to 0.7`: Moderate correlation
- `-0.3 to 0.3`: No correlation (don't trade)
- `-1.0 to -0.3`: Negative correlation

### Step 3: Calculate Spread Divergence

We track the **spread ratio** (price1 / price2) over time:

```javascript
// Historical spreads
const spreads = prices1.map((p1, i) => p1 / prices2[i]);

// Current spread
const currentSpread = currentPrice1 / currentPrice2;
```

### Step 4: Calculate Z-Score

The **z-score** tells us how many standard deviations the current spread is from its historical mean:

```javascript
calculateZScore(currentSpread, historicalSpreads) {
    const mean = average(historicalSpreads);
    const stdDev = standardDeviation(historicalSpreads);

    return (currentSpread - mean) / stdDev;
}
```

**Z-Score Interpretation:**
- `> +2.0`: Asset 1 is overperforming → SHORT asset 1, LONG asset 2
- `-2.0 to +2.0`: Normal range → HOLD
- `< -2.0`: Asset 2 is overperforming → SHORT asset 2, LONG asset 1

**Exit Signal:**
- When `|z-score| < 0.5`: Spread normalized → CLOSE POSITION

---

## 📈 Real Example: BTC vs ETH

### Historical Relationship

**Normal correlation:** BTC and ETH move together 85% of the time.

**Example:**
```
Jan 1:  BTC +5%, ETH +4%  ✅ Normal
Jan 2:  BTC +2%, ETH +2%  ✅ Normal
Jan 3:  BTC -3%, ETH -3%  ✅ Normal
```

### Divergence Detected!

**Jan 4-8:** BTC rallies +10%, but ETH stays flat

```
Day   BTC Price   ETH Price   Spread (BTC/ETH)   Z-Score
---   ---------   ---------   ----------------   --------
60    $50,000     $3,000      16.67              0.0σ (mean)
61    $51,000     $3,003      16.99              +1.2σ
62    $52,020     $3,006      17.31              +2.4σ ⚠️ ENTRY!
63    $53,060     $3,009      17.64              +3.6σ
64    $54,121     $3,012      17.97              +4.8σ
```

**Z-Score > +2.0** → BTC is overperforming relative to ETH!

### Trading Signal

```
📊 ENTRY SIGNAL:
  Pair: BTC-USD / ETH-USD
  Correlation: 85%
  Current Spread: 17.97
  Mean Spread: 16.67
  Z-Score: +4.8σ

  Action:
    SHORT BTC-USD @ $54,121 (overperformer)
    LONG ETH-USD @ $3,012 (underperformer)
```

### Trade Execution

**Capital:** $1,000 per side

```
SHORT BTC:
  Shares: 0.0185 BTC ($1,000 / $54,121)
  Proceeds: $1,000

LONG ETH:
  Shares: 0.332 ETH ($1,000 / $3,012)
  Cost: $1,000

Net Investment: $0 (market-neutral)
```

### Profit Scenario

**Convergence:** BTC and ETH return to normal relationship

```
Day 70:
  BTC drops to $52,500 (-3%)
  ETH rises to $3,150 (+4.6%)
  New Spread: 16.67 (back to mean!)
  Z-Score: 0.0σ → EXIT SIGNAL

SHORT BTC Profit:
  Sold @ $54,121
  Bought back @ $52,500
  Profit: 0.0185 BTC × $1,621 = $30.00

LONG ETH Profit:
  Bought @ $3,012
  Sold @ $3,150
  Profit: 0.332 ETH × $138 = $45.82

Total Profit: $75.82 (7.58% return)
```

**Why it works:** Mean reversion! Correlated assets return to their normal relationship.

---

## 🧪 Running the Test

```bash
node test-correlation-arbitrage.mjs
```

**Output:**
```
[Test 4] Analyzing BTC/ETH pair...

  Tradeable: ✅ YES
  Correlation: 74.0%
  Current Spread: 18.28
  Mean Spread: 16.73
  Z-Score: +5.17σ
  Signal: ENTRY

  📊 Action:
    Type: MEAN_REVERSION
    Short: BTC-USD (overperformer)
    Long: ETH-USD (underperformer)
    Reason: BTC-USD overvalued vs ETH-USD (z-score: 5.17)
```

---

## ⚙️ Configuration

### Entry/Exit Thresholds

```javascript
// In CorrelationArbitrage.js
this.entryZScore = 2.0;  // Enter when spread > 2σ
this.exitZScore = 0.5;   // Exit when spread < 0.5σ
this.minCorrelation = 0.7; // Only trade pairs with >0.7 correlation
```

**Conservative (lower risk):**
```javascript
this.entryZScore = 2.5;  // Wait for larger divergence
this.exitZScore = 0.3;   // Exit earlier
this.minCorrelation = 0.75; // Only trade highly correlated pairs
```

**Aggressive (higher risk):**
```javascript
this.entryZScore = 1.5;  // Enter earlier
this.exitZScore = 0.8;   // Stay in trade longer
this.minCorrelation = 0.6; // Trade more pairs
```

### Lookback Periods

```javascript
this.lookbackPeriods = [30, 60, 90]; // Days for correlation calculation
```

**Short-term (faster signals):**
```javascript
this.lookbackPeriods = [15, 30, 45];
```

**Long-term (more stable):**
```javascript
this.lookbackPeriods = [60, 90, 120];
```

---

## 📊 Integration with FinanceAgentArbiter

### Step 1: Add to constructor

```javascript
import { CorrelationArbitrage } from './CorrelationArbitrage.js';

constructor({ rootPath }) {
    this.correlationArbitrage = new CorrelationArbitrage({ rootPath });
}
```

### Step 2: Initialize

```javascript
async initialize() {
    await this.correlationArbitrage.initialize();
}
```

### Step 3: Check for opportunities

```javascript
async analyzeMarket() {
    // Get recent price data for all tracked symbols
    const priceData = {
        'BTC-USD': await this.getPriceHistory('BTC-USD', 90),
        'ETH-USD': await this.getPriceHistory('ETH-USD', 90),
        'AAPL': await this.getPriceHistory('AAPL', 90),
        'MSFT': await this.getPriceHistory('MSFT', 90),
        // ... etc
    };

    // Find pair trading opportunities
    const opportunities = await this.correlationArbitrage.findOpportunities(priceData);

    if (opportunities.length > 0) {
        console.log(`Found ${opportunities.length} pair trading opportunities`);

        // Generate trade parameters for top opportunity
        const topOpp = opportunities[0];
        const tradeParams = this.correlationArbitrage.generateTradeParams(topOpp, 1000);

        console.log('Top Opportunity:', this.correlationArbitrage.formatOpportunity(topOpp));

        // Execute trade
        await this.executePairTrade(tradeParams);
    }
}
```

### Step 4: Execute pair trade

```javascript
async executePairTrade(tradeParams) {
    const { pair, entry, zScore, correlation } = tradeParams;

    console.log(`Executing pair trade: ${pair.join(' / ')}`);
    console.log(`  Z-Score: ${zScore.toFixed(2)}σ`);
    console.log(`  Correlation: ${(correlation * 100).toFixed(1)}%`);

    // Execute long position
    await this.executeTrade({
        symbol: entry.long.symbol,
        action: 'BUY',
        shares: entry.long.shares,
        price: entry.long.price,
        type: 'PAIRS_TRADE_LONG'
    });

    // Execute short position
    await this.executeTrade({
        symbol: entry.short.symbol,
        action: 'SELL_SHORT',
        shares: entry.short.shares,
        price: entry.short.price,
        type: 'PAIRS_TRADE_SHORT'
    });

    // Track active pair trade
    this.activePairTrades.push({
        pair,
        entry: tradeParams,
        entryTime: Date.now()
    });
}
```

### Step 5: Monitor for exit

```javascript
async monitorPairTrades() {
    for (const pairTrade of this.activePairTrades) {
        const [symbol1, symbol2] = pairTrade.pair;

        // Get current prices
        const prices1 = await this.getPriceHistory(symbol1, pairTrade.entry.lookback);
        const prices2 = await this.getPriceHistory(symbol2, pairTrade.entry.lookback);

        // Check if we should exit
        if (this.correlationArbitrage.shouldExitPair(pairTrade, prices1, prices2)) {
            console.log(`Exit signal for ${symbol1}/${symbol2} pair trade`);
            await this.closePairTrade(pairTrade);
        }
    }
}
```

---

## 🎯 API Reference

### `analyzePair(symbol1, symbol2, prices1, prices2, lookback)`

Analyzes a pair for trading opportunity.

**Parameters:**
- `symbol1`: First asset symbol (e.g., 'BTC-USD')
- `symbol2`: Second asset symbol (e.g., 'ETH-USD')
- `prices1`: Array of historical prices for asset 1
- `prices2`: Array of historical prices for asset 2
- `lookback`: Number of periods to analyze (default: 60)

**Returns:**
```javascript
{
    tradeable: true,
    correlation: 0.85,
    currentSpread: 17.97,
    meanSpread: 16.67,
    zScore: 4.8,
    signal: 'ENTRY', // 'ENTRY', 'EXIT', or 'HOLD'
    action: {
        type: 'MEAN_REVERSION',
        short: 'BTC-USD',
        long: 'ETH-USD',
        reason: 'BTC-USD overvalued vs ETH-USD (z-score: 4.8)'
    },
    prices: {
        'BTC-USD': 54121,
        'ETH-USD': 3012
    }
}
```

### `findOpportunities(priceData)`

Scans all known pairs for trading opportunities.

**Parameters:**
- `priceData`: Object mapping symbols to price arrays

**Returns:**
```javascript
[
    {
        pair: ['BTC-USD', 'ETH-USD'],
        sector: 'Crypto',
        analysis: { /* analysis object */ },
        lookback: 60,
        expectedCorrelation: 0.85
    },
    // ... more opportunities
]
```

### `generateTradeParams(opportunity, capitalPerSide)`

Generates trade execution parameters.

**Parameters:**
- `opportunity`: Opportunity object from `findOpportunities()`
- `capitalPerSide`: Dollar amount per side (default: 1000)

**Returns:**
```javascript
{
    pair: ['BTC-USD', 'ETH-USD'],
    entry: {
        long: {
            symbol: 'ETH-USD',
            shares: 0.332,
            price: 3012,
            cost: 1000
        },
        short: {
            symbol: 'BTC-USD',
            shares: 0.0185,
            price: 54121,
            proceeds: 1000
        }
    },
    zScore: 4.8,
    correlation: 0.85,
    reason: 'BTC-USD overvalued vs ETH-USD (z-score: 4.8)'
}
```

---

## ⚠️ Risk Management

### 1. Stop Loss

Set a stop loss if correlation breaks down:

```javascript
if (currentCorrelation < this.minCorrelation * 0.8) {
    console.warn('Correlation breakdown! Exiting trade.');
    await this.closePairTrade(pairTrade);
}
```

### 2. Maximum Holding Period

Exit if trade hasn't converged within time limit:

```javascript
const holdingDays = (Date.now() - pairTrade.entryTime) / (1000 * 60 * 60 * 24);

if (holdingDays > 30) {
    console.warn('Max holding period reached. Exiting trade.');
    await this.closePairTrade(pairTrade);
}
```

### 3. Correlation Breakdown Protection

```javascript
// In analyzePair()
if (correlation < this.minCorrelation) {
    return {
        tradeable: false,
        reason: `Low correlation: ${(correlation * 100).toFixed(1)}%`
    };
}
```

### 4. Position Sizing

Start small and scale up:

```javascript
// Start with $500/side for new pairs
const capitalPerSide = pairTrade.proven ? 1000 : 500;
```

---

## 📊 Performance Metrics

Track these metrics for each pair:

```javascript
{
    pair: ['BTC-USD', 'ETH-USD'],
    totalTrades: 15,
    winners: 11,
    losers: 4,
    winRate: 0.73,
    avgProfit: 75.82,
    avgLoss: -32.15,
    profitFactor: 2.36,
    bestTrade: 150.00,
    worstTrade: -55.00,
    avgHoldingDays: 7.2,
    sharpeRatio: 1.85
}
```

---

## 🚀 Production Checklist

- [x] Core system implemented
- [x] Test suite created
- [x] Documentation written
- [ ] Integrate into FinanceAgentArbiter
- [ ] Add risk management (stop loss, max hold period)
- [ ] Add performance tracking
- [ ] Backtest on historical data
- [ ] Paper trade for 1 month
- [ ] Go live with small capital

---

## 💡 Pro Tips

1. **Start with highly correlated pairs** (>0.80) like BTC/ETH, SPY/QQQ
2. **Use multiple lookback periods** to confirm divergence across timeframes
3. **Don't force trades** - wait for z-score > 2.0
4. **Exit early if correlation breaks** - this invalidates the strategy
5. **Track pair-specific performance** - some pairs are more reliable than others
6. **Consider transaction costs** - pairs trading involves 4 trades (2 entry, 2 exit)
7. **Use margin carefully** - you need margin for short positions

---

## 📚 Mathematical Background

### Correlation Coefficient Formula

```
r = Σ[(xi - x̄)(yi - ȳ)] / √[Σ(xi - x̄)² × Σ(yi - ȳ)²]

Where:
  r = correlation coefficient
  xi, yi = individual prices
  x̄, ȳ = mean prices
```

### Z-Score Formula

```
z = (X - μ) / σ

Where:
  X = current spread
  μ = mean spread
  σ = standard deviation of spread
```

### Why Z-Score Matters

- **z = +2.0**: Current spread is 2 standard deviations above mean → 97.7th percentile
- **z = +3.0**: 99.9th percentile → extremely rare divergence
- **Probability of reversion:** Higher z-score = higher probability spread returns to mean

---

## 🎯 Next Steps

Feature #3 is complete! Next up:

**Feature #4: Portfolio Optimizer**
- Construct optimal portfolios using correlation matrix
- Maximize Sharpe ratio subject to risk constraints
- Dynamic rebalancing based on market regime

**Feature #5: Smart Order Routing**
- TWAP/VWAP execution algorithms
- Minimize market impact
- Best execution across venues

Continue building? Let me know! 🚀
