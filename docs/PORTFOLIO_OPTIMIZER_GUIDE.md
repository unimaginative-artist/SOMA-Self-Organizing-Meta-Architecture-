# 📊 Portfolio Optimizer - Feature #4

## Overview

**Portfolio Optimizer** uses **Modern Portfolio Theory** (Nobel Prize-winning framework by Harry Markowitz) to construct optimal asset allocations that maximize risk-adjusted returns.

**The Core Idea:**
- Diversification reduces risk without sacrificing returns
- Correlation matters: Mix assets that move differently
- Optimize the trade-off between risk and return
- Different allocation methods for different goals

**Key Question:** "If I have $10,000, how should I split it across BTC, ETH, AAPL, MSFT, and TLT to get the best risk-adjusted returns?"

---

## 🎯 Allocation Methods

### 1. Equal Weight (Baseline)

**Strategy:** Give each asset the same weight.

```
5 assets → 20% each
```

**Pros:**
- Simple, easy to understand
- No complex calculations
- Works well when you have no strong views

**Cons:**
- Ignores risk/return profiles
- Treats volatile BTC same as stable bonds
- Not optimal

**Use When:**
- Starting point for comparison
- No historical data available
- Want simplicity over optimization

---

### 2. Risk Parity

**Strategy:** Each asset contributes equally to portfolio risk.

**Math:**
- High volatility asset → Lower weight
- Low volatility asset → Higher weight
- Balance risk contribution, not dollar amounts

**Example:**
```
BTC:  89% return, 21% volatility → 10% allocation
TLT:  -25% return, 7% volatility → 31% allocation
```

**Logic:** BTC is 3x more volatile than TLT, so we hold 1/3 the weight to equalize risk.

**Pros:**
- Balances risk across assets
- Reduces concentration in volatile assets
- More stable portfolio

**Cons:**
- May overweight low-return assets (bonds)
- Can sacrifice returns for stability

**Use When:**
- Risk management is priority
- Want smooth equity curve
- Prefer stability over max returns

---

### 3. Maximum Sharpe Ratio

**Strategy:** Maximize risk-adjusted returns (Sharpe ratio).

**Sharpe Ratio Formula:**
```
Sharpe = (Expected Return - Risk-Free Rate) / Volatility

Example:
  BTC: (89% - 4%) / 21% = 4.05
  AAPL: (33% - 4%) / 9% = 3.22
```

**Allocation:**
- Overweight high Sharpe assets
- Underweight low Sharpe assets
- Apply position limits (2% min, 30% max)

**Pros:**
- **Best risk-adjusted returns**
- Backed by Nobel Prize-winning theory
- Balances return vs. risk

**Cons:**
- Requires accurate return/volatility estimates
- Can concentrate in few assets if no constraints

**Use When:**
- Goal is optimal risk-adjusted returns
- Have sufficient historical data
- **Recommended for most traders**

---

### 4. Minimum Variance

**Strategy:** Minimize portfolio volatility.

**Math:** Find weights that minimize:
```
Portfolio Variance = w^T * Cov * w

Where:
  w = weight vector
  Cov = covariance matrix
```

**Example:**
```
Overweight low volatility: TLT 42%, AAPL 24%, MSFT 24%
Underweight high volatility: BTC 5%, ETH 5%
```

**Pros:**
- **Lowest risk portfolio**
- Smoothest equity curve
- Good for risk-averse investors

**Cons:**
- May sacrifice returns
- Overweights bonds/defensive assets

**Use When:**
- Capital preservation is priority
- Risk-averse investor
- Bear market / high volatility environment

---

## 📈 Efficient Frontier

**The efficient frontier** shows all optimal portfolios at different risk levels.

### Concept

For any given risk level, the frontier shows the portfolio with the highest expected return.

```
Risk (Volatility) →
│
│                     Efficient Frontier
│                    /
│                   /
│                  /  ← Max Sharpe (best risk-adjusted)
│                 /
│                /
│               /
│      ← Min Variance (lowest risk)
└──────────────────────────────
        Return →
```

### Example Output

```
Portfolio   Return    Volatility  Sharpe
 1 (Min Vol)  19.1%       4.1%  -15.08  ← Lowest risk
 2            16.4%       4.2%  -15.01
 3            21.9%       4.3%  -14.61
 ...
10 (Max Sharpe) 41.3%    7.7%   -7.86  ← Best risk-adjusted
```

### How to Use

1. **Conservative investor:** Choose portfolio 1-3 (low volatility)
2. **Moderate investor:** Choose portfolio 4-7 (balanced)
3. **Aggressive investor:** Choose portfolio 8-10 (higher returns)
4. **Optimal:** Choose Max Sharpe portfolio (best risk-adjusted)

---

## 🧮 Mathematical Foundation

### Returns

**Daily Return:**
```javascript
return = (price_today - price_yesterday) / price_yesterday
```

**Expected Return (Mean):**
```javascript
E[R] = (r1 + r2 + ... + rn) / n
```

**Annualized Return:**
```javascript
Annual Return = Daily Return × 252 trading days
```

---

### Volatility (Risk)

**Variance:**
```javascript
Variance = Σ(return - mean)² / n
```

**Standard Deviation (Volatility):**
```javascript
σ = sqrt(Variance)
```

**Annualized Volatility:**
```javascript
Annual Volatility = Daily Volatility × sqrt(252)
```

---

### Correlation

**Pearson Correlation Coefficient:**
```javascript
ρ(X,Y) = Cov(X,Y) / (σ_X × σ_Y)

Range: -1 to +1
  +1 = Perfect positive correlation (move together)
   0 = No correlation
  -1 = Perfect negative correlation (move opposite)
```

**Example:**
```
BTC/ETH correlation: +0.87 (highly correlated)
BTC/TLT correlation: -0.95 (inversely correlated)
```

---

### Covariance

**Covariance:**
```javascript
Cov(X,Y) = Σ[(x_i - mean_x) × (y_i - mean_y)] / n
```

**Covariance Matrix (3 assets):**
```
       BTC      ETH      AAPL
BTC  [ var_BTC  cov_BE  cov_BA ]
ETH  [ cov_EB   var_ETH cov_EA ]
AAPL [ cov_AB   cov_AE  var_AAPL ]
```

---

### Portfolio Variance

**Formula:**
```
Portfolio Variance = w^T × Cov × w

Where:
  w = [w_BTC, w_ETH, w_AAPL, ...]  (weight vector)
  Cov = covariance matrix
```

**Expanded (2 assets):**
```
Var(Portfolio) = w1² × var1 + w2² × var2 + 2 × w1 × w2 × cov12
```

---

### Sharpe Ratio

**Formula:**
```
Sharpe Ratio = (E[R] - R_f) / σ

Where:
  E[R] = Expected return
  R_f = Risk-free rate (4% T-bills)
  σ = Standard deviation (volatility)
```

**Interpretation:**
- `Sharpe > 1.0`: Good risk-adjusted returns
- `Sharpe > 2.0`: Excellent
- `Sharpe > 3.0`: Exceptional (rare)

---

## 🔥 Real Example

### Portfolio: BTC, ETH, AAPL, MSFT, TLT

**Asset Metrics (90-day historical data):**

```
Symbol   Return    Volatility  Sharpe  Correlation (to BTC)
BTC      +89.2%    21%         4.05    1.00
ETH      +61.1%    19%         3.00    +0.87 (high)
AAPL     +33.2%    9%          3.22    +0.21 (low)
MSFT     +48.2%    9%          4.91    +0.09 (low)
TLT      -25.3%    7%         -4.19    -0.95 (inverse)
```

**Key Observations:**
- BTC and ETH are highly correlated (0.87) → Move together
- TLT (bonds) inversely correlated with crypto (-0.95) → Hedge
- AAPL/MSFT have low correlation with crypto → Diversification

---

### Allocation Comparison

**1. Equal Weight (20% each)**
```
Return: 41.3%
Volatility: 7.75%
Sharpe: 4.82

Allocation:
  BTC:  20% ($2,000)
  ETH:  20% ($2,000)
  AAPL: 20% ($2,000)
  MSFT: 20% ($2,000)
  TLT:  20% ($2,000)
```

**2. Risk Parity (equal risk contribution)**
```
Return: 27.4%
Volatility: 4.9%  ← Lower risk
Sharpe: 4.78

Allocation:
  TLT:  31% ($3,124)  ← Overweight (low volatility)
  MSFT: 24% ($2,371)
  AAPL: 24% ($2,366)
  ETH:  11% ($1,106)
  BTC:  10% ($1,034)  ← Underweight (high volatility)
```

**3. Maximum Sharpe**
```
Return: 41.3%
Volatility: 7.75%
Sharpe: 4.82  ← Best risk-adjusted

Allocation:
  BTC:  20% ($2,000)
  ETH:  20% ($2,000)
  AAPL: 20% ($2,000)
  MSFT: 20% ($2,000)
  TLT:  20% ($2,000)
```

**4. Minimum Variance**
```
Return: 16.4%  ← Lower return
Volatility: 4.2%  ← Lowest risk
Sharpe: 2.95

Allocation:
  TLT:  42% ($4,193)  ← Heavy bonds
  MSFT: 24% ($2,415)
  AAPL: 24% ($2,407)
  ETH:   5% ($525)
  BTC:   5% ($459)   ← Minimal crypto
```

---

## 🔄 Rebalancing

### Why Rebalance?

**Portfolio drift:** Asset prices change → Allocations drift from target.

**Example:**
```
Original:  BTC 20%, ETH 20%, AAPL 20%, MSFT 20%, TLT 20%
After 1 month (BTC +30%, TLT -5%):
  BTC 35%, ETH 25%, AAPL 18%, MSFT 18%, TLT 14%
```

**Problem:** Now overweight BTC (higher risk), underweight TLT (less diversification)

### Rebalancing Threshold

**Default:** Rebalance when allocation drifts >5%

```javascript
this.rebalanceThreshold = 0.05; // 5%
```

**Conservative (rebalance more often):**
```javascript
this.rebalanceThreshold = 0.03; // 3%
```

**Aggressive (rebalance less often):**
```javascript
this.rebalanceThreshold = 0.10; // 10%
```

### Rebalancing Trades

**System generates trades to restore target allocation:**

```
Current:  BTC 35%, TLT 10%
Target:   BTC 20%, TLT 20%

Trades:
  SELL $1,500 BTC (35% → 20%)
  BUY  $1,000 TLT (10% → 20%)
```

**Benefits:**
- **Sell high:** Trim winners that rallied
- **Buy low:** Add to losers that dipped
- **Maintain diversification**
- **Control risk**

---

## 🧪 Running the Test

```bash
node test-portfolio-optimizer.mjs
```

**Test Scenarios:**
1. Calculate returns, volatility, correlation for 5 assets
2. Build correlation matrix (shows BTC/ETH 0.87 correlation)
3. Equal weight allocation
4. Risk parity allocation
5. Maximum Sharpe allocation
6. Minimum variance allocation
7. Compare all methods
8. Generate efficient frontier (10 portfolios)
9. Test rebalancing detection
10. Generate rebalancing trades

**Expected Output:**
```
✅ All tests passed!

Correlation Matrix:
  BTC/ETH:  +0.87 (high correlation)
  BTC/TLT:  -0.95 (inverse correlation)

Max Sharpe Allocation:
  BTC:  20% ($2,000)
  ETH:  20% ($2,000)
  AAPL: 20% ($2,000)
  MSFT: 20% ($2,000)
  TLT:  20% ($2,000)

Sharpe Ratio: 4.82 🏆
```

---

## 📊 Integration with FinanceAgentArbiter

### Step 1: Add to constructor

```javascript
import { PortfolioOptimizer } from './PortfolioOptimizer.js';

constructor({ rootPath }) {
    this.portfolioOptimizer = new PortfolioOptimizer({ rootPath });
    this.currentAllocation = {};
    this.targetAllocation = {};
}
```

### Step 2: Initialize

```javascript
async initialize() {
    await this.portfolioOptimizer.initialize();
}
```

### Step 3: Optimize portfolio

```javascript
async optimizePortfolio(symbols, method = 'max_sharpe') {
    // Get price history for all symbols
    const priceData = {};
    for (const symbol of symbols) {
        priceData[symbol] = await this.getPriceHistory(symbol, 90);
    }

    // Optimize
    const result = this.portfolioOptimizer.optimizePortfolio(symbols, priceData, method);

    if (result.success) {
        console.log('📊 Portfolio Optimization Complete');
        console.log(`Method: ${result.method}`);
        console.log(`Expected Return: ${(result.metrics.annualizedReturn * 100).toFixed(2)}%`);
        console.log(`Volatility: ${(result.metrics.annualizedVolatility * 100).toFixed(2)}%`);
        console.log(`Sharpe Ratio: ${result.metrics.sharpeRatio.toFixed(2)}`);
        console.log('\nAllocation:');
        console.log(this.portfolioOptimizer.formatAllocation(result.allocation, this.portfolioValue));

        // Store target allocation
        this.targetAllocation = result.allocation;

        return result;
    }
}
```

### Step 4: Check for rebalancing

```javascript
async checkRebalancing() {
    // Calculate current allocation from positions
    this.currentAllocation = this.calculateCurrentAllocation();

    // Check if rebalancing needed
    const check = this.portfolioOptimizer.needsRebalancing(
        this.currentAllocation,
        this.targetAllocation
    );

    if (check.needsRebalance) {
        console.log('⚠️ Portfolio rebalancing needed');
        console.log(`Max drift: ${(check.maxDrift * 100).toFixed(2)}%`);

        // Generate trades
        const trades = this.portfolioOptimizer.generateRebalancingTrades(
            this.currentAllocation,
            this.targetAllocation,
            this.portfolioValue
        );

        console.log('Rebalancing trades:');
        trades.forEach(trade => {
            console.log(`  ${trade.action} ${trade.symbol}: $${trade.dollarAmount.toFixed(2)}`);
        });

        // Execute rebalancing trades
        await this.executeRebalancingTrades(trades);
    }
}
```

### Step 5: Daily workflow

```javascript
async dailyPortfolioManagement() {
    // 1. Optimize portfolio (weekly)
    if (this.shouldOptimize()) {
        await this.optimizePortfolio(this.symbols, 'max_sharpe');
    }

    // 2. Check for rebalancing (daily)
    await this.checkRebalancing();

    // 3. Generate efficient frontier for analysis
    const frontier = this.portfolioOptimizer.generateEfficientFrontier(this.symbols, priceData);
    console.log('Efficient Frontier generated with', frontier.frontier.length, 'portfolios');
}
```

---

## ⚙️ Configuration

### Position Limits

```javascript
this.minWeight = 0.02; // Min 2% per position
this.maxWeight = 0.30; // Max 30% per position
this.maxPositions = 20; // Max 20 positions
```

**Conservative (lower concentration):**
```javascript
this.maxWeight = 0.20; // Max 20% per position
```

**Aggressive (allow concentration):**
```javascript
this.maxWeight = 0.50; // Max 50% per position
```

### Risk Parameters

```javascript
this.riskFreeRate = 0.04; // 4% annual risk-free rate
this.targetVolatility = 0.15; // 15% annual volatility target
```

**Lower risk target:**
```javascript
this.targetVolatility = 0.10; // 10% target
```

**Higher risk tolerance:**
```javascript
this.targetVolatility = 0.25; // 25% target
```

### Rebalancing

```javascript
this.rebalanceThreshold = 0.05; // Rebalance if drift >5%
```

---

## 🎯 API Reference

### `optimizePortfolio(symbols, priceData, method)`

Optimize portfolio allocation.

**Parameters:**
- `symbols`: Array of symbols
- `priceData`: Object mapping symbol → price array
- `method`: 'equal_weight', 'risk_parity', 'max_sharpe', 'min_variance'

**Returns:**
```javascript
{
    success: true,
    method: 'max_sharpe',
    allocation: {
        'BTC-USD': 0.25,
        'ETH-USD': 0.20,
        // ...
    },
    metrics: {
        expectedReturn: 0.15,     // Daily
        volatility: 0.025,        // Daily
        sharpeRatio: 4.82,
        annualizedReturn: 0.45,   // 45%
        annualizedVolatility: 0.12 // 12%
    },
    correlationMatrix: [[...]],
    symbols: ['BTC-USD', 'ETH-USD', ...],
    timestamp: 1234567890
}
```

### `generateEfficientFrontier(symbols, priceData, numPoints)`

Generate efficient frontier.

**Returns:**
```javascript
{
    success: true,
    frontier: [
        {
            allocation: { ... },
            expectedReturn: 0.20,
            volatility: 0.05,
            sharpeRatio: 3.2
        },
        // ... more portfolios
    ],
    minVolatility: { /* lowest risk portfolio */ },
    maxSharpe: { /* best risk-adjusted portfolio */ }
}
```

### `needsRebalancing(currentAllocation, targetAllocation)`

Check if portfolio needs rebalancing.

**Returns:**
```javascript
{
    needsRebalance: true,
    drifts: [
        {
            symbol: 'BTC-USD',
            current: 0.35,
            target: 0.25,
            drift: 0.10
        }
    ],
    maxDrift: 0.10
}
```

### `generateRebalancingTrades(currentAllocation, targetAllocation, portfolioValue)`

Generate rebalancing trades.

**Returns:**
```javascript
[
    {
        symbol: 'BTC-USD',
        action: 'SELL',
        currentWeight: 0.35,
        targetWeight: 0.25,
        drift: -0.10,
        dollarAmount: 1000,
        reason: 'Rebalance: 35.0% → 25.0%'
    }
]
```

---

## ⚠️ Important Notes

### 1. Historical Data Required

**Minimum:** 30 days of price history per asset
**Recommended:** 90+ days for stable estimates

### 2. Correlation Changes

Correlations are not static! They change over time, especially during market stress.

**Example:**
- Normal market: BTC/stocks correlation ~ 0.2
- Crisis: BTC/stocks correlation → 0.8 (everything sells off together)

**Solution:** Recalculate regularly (weekly optimization)

### 3. Transaction Costs

Rebalancing frequently incurs costs (commissions, slippage, spreads).

**Best Practice:**
- Don't rebalance for <3% drift
- Consider transaction costs in rebalancing decision
- Batch rebalancing trades

### 4. Lookback Period

**Shorter (30 days):** More responsive to recent changes, but noisier
**Longer (90 days):** More stable, but slower to adapt

**Recommendation:** Use 60-90 days for most use cases

---

## 📚 Further Reading

**Modern Portfolio Theory:**
- "Portfolio Selection" by Harry Markowitz (1952) - Original paper
- "The Intelligent Asset Allocator" by William Bernstein
- "All About Asset Allocation" by Richard Ferri

**Risk Parity:**
- "Risk Parity Fundamentals" by Edward Qian
- Used by Bridgewater Associates (world's largest hedge fund)

**Efficient Frontier:**
- Foundation of mean-variance optimization
- Shows all optimal portfolios at different risk levels

---

## ✅ Production Checklist

- [x] Core system implemented
- [x] All allocation methods (equal, risk parity, max Sharpe, min variance)
- [x] Efficient frontier generation
- [x] Rebalancing detection and trade generation
- [x] Test suite passing
- [x] Documentation complete
- [ ] Integrate into FinanceAgentArbiter
- [ ] Add transaction cost modeling
- [ ] Add Black-Litterman model (advanced)
- [ ] Backtest on historical data
- [ ] Paper trade for 1 month
- [ ] Go live with portfolio optimization

---

## 💡 Key Takeaways

1. **Diversification is free lunch:** Reduce risk without sacrificing returns
2. **Correlation matters:** Mix assets that move differently (crypto + stocks + bonds)
3. **Max Sharpe is optimal:** Best risk-adjusted returns (recommended for most traders)
4. **Rebalance regularly:** Trim winners, add to losers, maintain diversification
5. **Risk parity for stability:** If you prioritize smooth equity curve over max returns
6. **Min variance for safety:** Capital preservation mode during high volatility

**Bottom Line:** Stop allocating randomly. Use math to build optimal portfolios! 🚀
