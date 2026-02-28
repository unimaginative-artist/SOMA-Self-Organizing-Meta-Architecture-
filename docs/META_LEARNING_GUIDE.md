# 🧠 Meta-Learning System - User Guide

## Overview

The Meta-Learning System makes SOMA **self-improving** by tracking which strategies work in which market regimes and automatically enabling/disabling strategies based on performance.

**Key Concept:** A strategy that works in a TRENDING_BULL market might FAIL in a RANGING market. SOMA learns this and adapts automatically.

---

## ✅ What It Does

### **Automatic Strategy Management**
- Tracks win rate by (strategy + regime) combination
- Disables strategies with <40% win rate (after 20+ trades)
- Enables strategies with >60% win rate
- Uses confidence intervals (not just raw win rate)
- Cooldown period (7 days) prevents flip-flopping

### **Statistical Rigor**
- Requires minimum 20 trades before making decisions
- Wilson score confidence intervals (reliable for small samples)
- Prevents premature optimization

### **Manual Overrides**
- Force enable/disable any strategy
- Useful for testing or when you know better than the data

---

## 🚀 Quick Start

### **1. Run Test**
```bash
node test-meta-learning.mjs
```

This will:
- Initialize meta-learner
- Simulate 3 strategies across 2 regimes
- Show auto-enable/disable decisions
- Demonstrate that same strategy performs differently in different markets

### **Expected Output:**
```
✅ Momentum Breakout:
   Decision: ENABLED
   Win Rate: 70.0% in TRENDING_BULL

❌ Mean Reversion:
   Decision: DISABLED
   Win Rate: 30.0% in TRENDING_BULL

But in RANGING market:

✅ Mean Reversion:
   Decision: ENABLED
   Win Rate: 75.0% in RANGING

❌ Momentum Breakout:
   Decision: DISABLED
   Win Rate: 35.0% in RANGING
```

**This is the power of meta-learning!**

---

## 📖 How To Use

### **Integrated Automatically**

Meta-learning is already integrated into `FinanceAgentArbiter`. When you close a trade, it automatically:
1. Records the outcome (win/loss) for that (strategy + regime)
2. Updates statistics
3. Checks if strategy should be enabled/disabled
4. Saves state to disk

```javascript
// Happens automatically when you close a trade
await financeArbiter.closeTrade('BTC-USD', 52000);

// Meta-learner records:
// - Strategy: "momentum_breakout"
// - Regime: "TRENDING_BULL"
// - Outcome: WIN (+5.2%)
```

### **Check Strategy Status**

```javascript
import { MetaLearner } from './arbiters/MetaLearner.js';

const metaLearner = new MetaLearner({ rootPath: '.' });
await metaLearner.initialize();

// Should we use this strategy in current regime?
const currentRegime = 'TRENDING_BULL';
const decision = metaLearner.shouldUseStrategy('Momentum Breakout', currentRegime);

console.log(`Use strategy: ${decision.shouldUse}`);
console.log(`Reason: ${decision.reason}`);
console.log(`Win Rate: ${decision.winRate}`);
```

### **Get Top Performers**

```javascript
// Get best strategies for current regime
const bestStrategies = metaLearner.getBestStrategies('TRENDING_BULL', 20, 5);

bestStrategies.forEach(s => {
    console.log(`${s.name}: ${(s.winRate * 100).toFixed(1)}% (${s.trades} trades)`);
});

// Output:
// Momentum Breakout: 72.5% (40 trades)
// Trend Following: 68.3% (30 trades)
// Breakout Trading: 65.0% (25 trades)
```

### **Get Dashboard Summary**

```javascript
const summary = metaLearner.getSummary('TRENDING_BULL');

console.log(`Enabled: ${summary.enabled}`);
console.log(`Disabled: ${summary.disabled}`);
console.log(`Learning: ${summary.learning}`);

// Show disabled strategies
summary.strategies.disabled.forEach(s => {
    console.log(`❌ ${s.name}: ${(s.winRate * 100).toFixed(1)}% - ${s.reason}`);
});
```

---

## 🎯 Examples

### **Example 1: Strategy Auto-Disabled**

```javascript
// Mean Reversion in TRENDING_BULL market
// After 20 trades: 7 wins, 13 losses (35% win rate)

const decision = metaLearner.shouldUseStrategy('Mean Reversion', 'TRENDING_BULL');

// Output:
// {
//   shouldUse: false,
//   reason: 'Low win rate: 35.0% (CI: 16.4%-57.9%) in TRENDING_BULL',
//   winRate: 0.35,
//   trades: 20
// }

// SOMA will NOT use Mean Reversion in bull markets anymore!
```

### **Example 2: Same Strategy, Different Regime**

```javascript
// Mean Reversion in RANGING market
// After 20 trades: 15 wins, 5 losses (75% win rate)

const decision = metaLearner.shouldUseStrategy('Mean Reversion', 'RANGING');

// Output:
// {
//   shouldUse: true,
//   reason: 'High win rate: 75.0% (CI: 50.9%-91.3%) in RANGING',
//   winRate: 0.75,
//   trades: 20
// }

// SOMA WILL use Mean Reversion in ranging markets!
```

### **Example 3: Manual Override**

```javascript
// You want to test a strategy even though it's underperforming
metaLearner.forceStrategyState('Experimental Strategy', true, 'Testing new parameters');

// Or disable a strategy for any reason
metaLearner.forceStrategyState('Risky Strategy', false, 'Too volatile right now');

// Clear override later
metaLearner.clearOverride('Experimental Strategy');
```

### **Example 4: Generate Report**

```javascript
const report = metaLearner.generateReport('TRENDING_BULL');
console.log(report);
```

**Output:**
```
╔════════════════════════════════════════════════════════════════╗
║               META-LEARNING PERFORMANCE REPORT                 ║
╚════════════════════════════════════════════════════════════════╝

Current Regime: TRENDING_BULL

Strategy Status:
  ✅ Enabled:  3
  ❌ Disabled: 2
  📚 Learning: 1

❌ DISABLED STRATEGIES (Poor Performance):
────────────────────────────────────────────────────────────────
  Mean Reversion
    Win Rate: 30.0% (20 trades)
    Reason: Low win rate: 30.0% (CI: 12.8%-53.5%) in TRENDING_BULL

  Range Trading
    Win Rate: 35.0% (25 trades)
    Reason: Below threshold: 35.0% in TRENDING_BULL

🏆 TOP PERFORMERS (TRENDING_BULL):
────────────────────────────────────────────────────────────────
  1. Momentum Breakout
     Win Rate: 72.5% | Trades: 40 | Avg P&L: +4.23%
     CI: 56.1% - 85.4%

  2. Trend Following
     Win Rate: 68.3% | Trades: 30 | Avg P&L: +3.87%
     CI: 48.7% - 84.0%
```

---

## 🔧 Configuration

### **Adjust Thresholds**

Edit `arbiters/MetaLearner.js`:

```javascript
constructor({ rootPath, minSampleSize = 20 }) {
    // Minimum trades before making decisions
    this.minSampleSize = minSampleSize;  // Default: 20

    // Win rate thresholds
    this.disableThreshold = 0.40;  // Disable if <40%
    this.enableThreshold = 0.60;   // Enable if >60%

    // Cooldown period (prevents flip-flopping)
    this.cooldownPeriod = 7 * 24 * 60 * 60 * 1000;  // 7 days
}
```

**Recommendations:**
- **minSampleSize: 20-30** (too low = noise, too high = slow learning)
- **disableThreshold: 0.35-0.45** (lower = more aggressive)
- **enableThreshold: 0.55-0.65** (higher = more conservative)
- **cooldownPeriod: 5-10 days** (prevents daily flip-flopping)

---

## 📊 How It Works

### **Statistical Method: Wilson Score Confidence Interval**

Unlike naive win rate calculation, Wilson score provides reliable confidence intervals even with small samples.

**Example:**
- Strategy A: 7/10 wins = 70% ± 28% (CI: 42%-98%)
- Strategy B: 70/100 wins = 70% ± 9% (CI: 61%-79%)

Same win rate, but Strategy B is more reliable (larger sample).

### **Decision Logic:**

```
if (upperBound of CI < 40%) {
    DISABLE ("Even in best case, probably <40%")
}
else if (lowerBound of CI > 60%) {
    ENABLE ("Even in worst case, probably >60%")
}
else if (pointEstimate < 40%) {
    DISABLE ("Point estimate bad, CI uncertain")
}
else {
    ENABLE ("Uncertain, but not terrible")
}
```

### **Cooldown Period:**

Prevents this:
```
Day 1: 5/10 wins (50%) → DISABLED
Day 2: 7/10 wins (70%) → ENABLED
Day 3: 4/10 wins (40%) → DISABLED
Day 4: ...
```

With cooldown:
```
Day 1: 5/10 wins (50%) → DISABLED
Day 2-8: (cooldown, no change)
Day 9: Now allowed to re-evaluate
```

---

## 🗂️ Data Storage

### **File Location:**
```
data/meta_learning/meta_learning_state.json
```

### **Structure:**
```json
{
  "timestamp": 1706573821000,
  "strategyPerformance": [
    {
      "strategy": "Momentum Breakout",
      "regimes": [
        {
          "regime": "TRENDING_BULL",
          "stats": {
            "wins": 29,
            "losses": 11,
            "winRate": 0.725,
            "totalPnL": 145.6,
            "avgPnL": 3.64,
            "confidenceInterval": {
              "lower": 0.561,
              "upper": 0.854
            }
          }
        }
      ]
    }
  ],
  "strategyStates": [
    ["Momentum Breakout", {
      "enabled": true,
      "lastChange": 1706400000000,
      "reason": "High win rate: 72.5% in TRENDING_BULL"
    }]
  ]
}
```

---

## 🐛 Troubleshooting

### **Strategy Not Being Disabled Despite Poor Performance**

**Check 1:** Sample size
```javascript
const stats = metaLearner.getStrategyStats('Strategy Name', 'TRENDING_BULL');
console.log(`Trades: ${stats.wins + stats.losses}`);
```
Needs 20+ trades (configurable).

**Check 2:** Cooldown period
```javascript
const state = metaLearner.strategyStates.get('Strategy Name');
if (state) {
    const hoursSinceChange = (Date.now() - state.lastChange) / (60 * 60 * 1000);
    console.log(`Hours since last change: ${hoursSinceChange.toFixed(1)}`);
}
```
Needs 7 days (168 hours) since last change.

**Check 3:** Manual override
```javascript
const override = metaLearner.overrides.get('Strategy Name');
if (override) {
    console.log('Manual override active:', override.reason);
}
```

### **Strategy Flip-Flopping**

Increase cooldown period:
```javascript
this.cooldownPeriod = 14 * 24 * 60 * 60 * 1000;  // 14 days
```

Or increase min sample size:
```javascript
this.minSampleSize = 30;  // Require 30 trades
```

---

## 🚀 Production Deployment

### **Monitoring**

Add to your monitoring dashboard:
```javascript
// Check every hour
setInterval(() => {
    const summary = metaLearner.getSummary(currentRegime);

    if (summary.disabled > 0) {
        console.warn(`⚠️  ${summary.disabled} strategies disabled`);

        summary.strategies.disabled.forEach(s => {
            console.warn(`  - ${s.name}: ${s.reason}`);
        });
    }
}, 3600000);  // 1 hour
```

### **Alerts**

Alert when high-performing strategy gets disabled:
```javascript
// In updateStrategyState method
if (previousState === true && shouldEnable === false) {
    const overall = this.getOverallStats(strategyName);

    if (overall.winRate > 0.6) {
        console.error(`🚨 ALERT: Previously good strategy disabled: ${strategyName}`);
        console.error(`   Overall: ${(overall.winRate * 100).toFixed(1)}%`);
        console.error(`   In ${currentRegime}: ${(winRate * 100).toFixed(1)}%`);
        // Send notification
    }
}
```

---

## ✅ Success Checklist

- [ ] Test script runs successfully
- [ ] Strategies being tracked after trades
- [ ] Auto-disable working (test with mock bad performance)
- [ ] Auto-enable working (test with mock good performance)
- [ ] Manual overrides working
- [ ] Reports generating correctly
- [ ] Dashboard showing meta-learning stats

---

## 🎯 Expected Results

After 50-100 trades across different regimes:

**Before Meta-Learning:**
- Use all strategies equally
- Win rate: ~50% (random)

**After Meta-Learning:**
- Auto-disable 30-40% of strategies (poor performers)
- Focus on top performers
- Win rate: ~60-65% (selective)

**Key Insight:** You don't need ALL strategies to win. You need the RIGHT strategies for the RIGHT market.

---

**Feature #2 COMPLETE!** 🎉

Next: Correlation Arbitrage (Feature #3)
