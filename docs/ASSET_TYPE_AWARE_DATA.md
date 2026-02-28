# 🎯 Asset-Type Aware Data Strategy

## Overview

SOMA's data sources adapt based on what you're trading:
- **Stocks** → Earnings, analyst ratings, SEC filings
- **Crypto** → Bitcoin halving, whale movements, exchange news
- **Futures** → Commodity reports, weather, geopolitical events

**No more irrelevant noise!**

---

## 📊 Asset Type Detection

### **Automatic Detection:**

```javascript
// EconomicCalendar automatically detects asset type
const assetType = economicCalendar.detectAssetType('BTC-USD');  // CRYPTO
const assetType = economicCalendar.detectAssetType('AAPL');     // STOCKS
const assetType = economicCalendar.detectAssetType('ES1!');     // FUTURES
```

### **Detection Rules:**

```javascript
detectAssetType(symbol) {
    // Crypto: BTC-USD, ETH-USD, *-USDT, *-USD (if ends in crypto ticker)
    if (symbol.includes('-USD') || symbol.includes('-USDT') ||
        isCryptoTicker(symbol)) {
        return 'CRYPTO';
    }

    // Futures: ES1!, NQ1!, *-PERP, CL1! (commodity codes)
    if (symbol.includes('1!') || symbol.includes('-PERP') ||
        isFuturesCode(symbol)) {
        return 'FUTURES';
    }

    // Default: Stocks (AAPL, TSLA, NVDA, etc.)
    return 'STOCKS';
}
```

---

## 🗓️ Economic Calendar (Asset-Aware)

### **STOCKS:**

**High-Impact Events:**
- ✅ Fed meetings (FOMC)
- ✅ CPI (inflation data)
- ✅ Jobs reports (non-farm payrolls)
- ✅ GDP releases
- ✅ Company earnings (symbol-specific)
- ✅ Analyst upgrades/downgrades

**Example:**
```javascript
// Trading AAPL
const events = calendar.getEventsForSymbol('AAPL', 7);

// Returns:
// - FOMC Meeting (affects all stocks)
// - AAPL Earnings (specific to AAPL)
// - CPI Release (affects all stocks)
```

---

### **CRYPTO:**

**High-Impact Events:**
- ✅ Bitcoin halving (every 4 years)
- ✅ Ethereum upgrades (Shanghai, Dencun, etc.)
- ✅ Exchange events (Binance maintenance, Coinbase listings)
- ✅ Regulatory news (SEC ETF decisions, lawsuits)
- ✅ Fed meetings (crypto correlates with risk assets)
- ❌ CPI, jobs reports (less relevant than stocks)
- ❌ Company earnings (not applicable)

**Example:**
```javascript
// Trading BTC-USD
const events = calendar.getEventsForSymbol('BTC-USD', 30);

// Returns:
// - Bitcoin Halving (April 2028)
// - SEC Bitcoin ETF Decision (March 2026)
// - FOMC Meeting (affects crypto as risk asset)
// - NOT stock earnings (filtered out)
```

**Crypto-Specific Events Added:**
```javascript
// Bitcoin Halving (every 4 years)
{
    title: 'Bitcoin Halving',
    description: 'Block reward halves (historically bullish)',
    type: 'CRYPTO_EVENT',
    impact: 'HIGH',
    assetTypes: ['CRYPTO']
}

// Ethereum Upgrades
{
    title: 'Ethereum Network Upgrade',
    description: 'Major protocol upgrade',
    type: 'CRYPTO_EVENT',
    impact: 'MEDIUM',
    assetTypes: ['CRYPTO']
}

// Regulatory Events
{
    title: 'Bitcoin ETF Decision',
    description: 'SEC decision on spot ETF applications',
    type: 'REGULATORY',
    impact: 'HIGH',
    assetTypes: ['CRYPTO']
}
```

---

### **FUTURES:**

**High-Impact Events:**
- ✅ Fed meetings (affects all markets)
- ✅ CPI, GDP (affects commodities)
- ✅ **Commodity-specific:**
  - Oil: OPEC meetings, inventory reports
  - Gold: Fed policy, inflation
  - Agriculture: Weather reports, crop estimates
  - Indices (ES, NQ): Same as stocks + Fed

**Example:**
```javascript
// Trading CL1! (Crude Oil futures)
const events = calendar.getEventsForSymbol('CL1!', 7);

// Returns:
// - OPEC Meeting (oil-specific)
// - EIA Inventory Report (oil-specific)
// - FOMC Meeting (affects all)
// - NOT AAPL earnings (filtered out)
```

**Futures-Specific Events (Future Enhancement):**
```javascript
// Oil
{ title: 'OPEC Meeting', assetTypes: ['FUTURES'], symbols: ['CL1!'] }
{ title: 'EIA Inventory', assetTypes: ['FUTURES'], symbols: ['CL1!'] }

// Agriculture
{ title: 'USDA Crop Report', assetTypes: ['FUTURES'], symbols: ['ZC1!', 'ZS1!'] }
{ title: 'Weather Forecast', assetTypes: ['FUTURES'], symbols: ['ZC1!'] }

// Gold
{ title: 'Fed Policy', assetTypes: ['FUTURES'], symbols: ['GC1!'] }
```

---

## 📰 News & Sentiment (Asset-Type Specific)

### **STOCKS:**

**News Sources:**
- Yahoo Finance, CNBC, Bloomberg
- Company press releases
- SEC filings (8-K, 10-Q, 10-K)
- Analyst reports

**Sentiment Sources:**
- r/stocks, r/investing (Reddit)
- StockTwits
- Financial Twitter ($AAPL mentions)
- Earnings call transcripts

**Example:**
```javascript
// For AAPL
sentiment.analyze('AAPL', 'STOCKS');

// Fetches:
// - AAPL news headlines
// - r/stocks posts mentioning AAPL
// - StockTwits $AAPL sentiment
// - Analyst upgrades/downgrades
```

---

### **CRYPTO:**

**News Sources:**
- CoinDesk, CoinTelegraph, Decrypt
- Crypto exchange announcements
- Regulatory filings (SEC, CFTC)
- Protocol Twitter accounts (@ethereum, @bitcoin)

**Sentiment Sources:**
- r/cryptocurrency, r/bitcoin, r/ethereum
- r/satoshistreetbets (degen plays)
- Crypto Twitter (CT)
- Telegram groups (optional)
- **Whale movements** (large transfers on-chain)

**Example:**
```javascript
// For BTC-USD
sentiment.analyze('BTC-USD', 'CRYPTO');

// Fetches:
// - CoinDesk BTC news
// - r/bitcoin hot posts
// - Crypto Twitter $BTC sentiment
// - Whale alerts (>1000 BTC moved)
// - Exchange inflow/outflow
```

**Crypto-Specific Signals:**
- 🐋 Whale movements (Whale Alert)
- 📈 Exchange net flow (deposits = bearish, withdrawals = bullish)
- 💬 Social volume spike (mentions increase 10x)
- 🚀 Rocket emoji count (seriously, this works)

---

### **FUTURES:**

**News Sources:**
- CME Group, Bloomberg Commodities
- USDA (agriculture), EIA (energy)
- Weather forecasts (agriculture)
- Geopolitical news (oil)

**Sentiment Sources:**
- r/commodities, r/wallstreetbets (futures)
- Commodity-specific forums
- Trading chat rooms

**Example:**
```javascript
// For CL1! (Oil)
sentiment.analyze('CL1!', 'FUTURES');

// Fetches:
// - Oil news (OPEC, Middle East)
// - EIA inventory reports
// - Geopolitical events
// - Weather (affects heating oil)
```

---

## 🎯 Implementation Framework

### **1. News Service (Asset-Aware)**

```javascript
// server/finance/newsService.js

class NewsService {
    async getNews(symbol, assetType) {
        switch(assetType) {
            case 'STOCKS':
                return this.getStockNews(symbol);
            case 'CRYPTO':
                return this.getCryptoNews(symbol);
            case 'FUTURES':
                return this.getFuturesNews(symbol);
        }
    }

    async getStockNews(symbol) {
        // Yahoo Finance, CNBC, Bloomberg
        return [
            { title: 'AAPL hits new high', source: 'CNBC' },
            { title: 'Analyst upgrades AAPL to buy', source: 'Bloomberg' }
        ];
    }

    async getCryptoNews(symbol) {
        // CoinDesk, CoinTelegraph
        return [
            { title: 'Bitcoin breaks $50k', source: 'CoinDesk' },
            { title: 'Whale moves 10,000 BTC', source: 'WhaleAlert' }
        ];
    }

    async getFuturesNews(symbol) {
        // CME, Bloomberg Commodities
        return [
            { title: 'OPEC cuts production', source: 'Bloomberg' },
            { title: 'Oil inventory rises', source: 'EIA' }
        ];
    }
}
```

---

### **2. Reddit Sentiment (Asset-Aware)**

```javascript
// server/finance/redditService.js

class RedditService {
    getSubreddits(assetType) {
        const subreddits = {
            'STOCKS': [
                'wallstreetbets',  // Momentum plays
                'stocks',          // Analysis
                'investing',       // Long-term
                'options',         // Derivatives
                'earnings'         // Earnings plays
            ],
            'CRYPTO': [
                'cryptocurrency',      // General crypto
                'bitcoin',            // BTC discussion
                'ethereum',           // ETH discussion
                'satoshistreetbets',  // Crypto degen plays
                'cryptomarkets'       // Trading
            ],
            'FUTURES': [
                'commodities',
                'wallstreetbets',  // Also trades futures
                'daytrading'       // Active futures traders
            ]
        };

        return subreddits[assetType] || subreddits['STOCKS'];
    }

    async getSentiment(symbol, assetType) {
        const subreddits = this.getSubreddits(assetType);
        const posts = [];

        for (const sub of subreddits) {
            const subPosts = await this.fetchSubreddit(sub);
            const filtered = subPosts.filter(p =>
                p.title.includes(symbol) || p.text.includes(symbol)
            );
            posts.push(...filtered);
        }

        return this.analyzeSentiment(posts);
    }
}
```

---

### **3. Unified API Interface**

```javascript
// In FinanceAgentArbiter
async analyzeStock(symbol) {
    // Detect asset type
    const assetType = this.detectAssetType(symbol);

    // Asset-aware data fetching
    const events = this.economicCalendar.getEventsForSymbol(symbol);  // Already filtered
    const news = await this.newsService.getNews(symbol, assetType);
    const sentiment = await this.redditService.getSentiment(symbol, assetType);

    // Regime detection (same for all)
    const regime = await this.regimeDetector.detectRegime(symbol);

    // Asset-specific analysis
    let specializedAnalysis = {};
    switch(assetType) {
        case 'CRYPTO':
            specializedAnalysis = await this.analyzeCryptoSpecifics(symbol);
            break;
        case 'FUTURES':
            specializedAnalysis = await this.analyzeFuturesSpecifics(symbol);
            break;
    }

    return { assetType, events, news, sentiment, regime, ...specializedAnalysis };
}
```

---

## 📋 Data Source Summary

| Data Type | Stocks | Crypto | Futures |
|-----------|--------|--------|---------|
| **Calendar Events** ||||
| Fed Meetings | ✅ | ✅ | ✅ |
| CPI/GDP/Jobs | ✅ | ⚠️ (less impact) | ✅ |
| Earnings | ✅ | ❌ | ❌ |
| Halving/Upgrades | ❌ | ✅ | ❌ |
| OPEC/Inventory | ❌ | ❌ | ✅ |
| **News Sources** ||||
| Yahoo/CNBC | ✅ | ❌ | ❌ |
| CoinDesk/CT | ❌ | ✅ | ❌ |
| CME/EIA | ❌ | ❌ | ✅ |
| **Reddit** ||||
| r/stocks | ✅ | ❌ | ❌ |
| r/cryptocurrency | ❌ | ✅ | ❌ |
| r/commodities | ❌ | ❌ | ✅ |
| r/wallstreetbets | ✅ | ⚠️ | ✅ |
| **Special Signals** ||||
| Analyst ratings | ✅ | ❌ | ❌ |
| Whale alerts | ❌ | ✅ | ❌ |
| Weather | ❌ | ❌ | ✅ (agriculture) |

---

## ✅ Current Status

**Already Implemented:**
- ✅ Asset type detection
- ✅ Economic Calendar filters by asset type
- ✅ Crypto-specific events (halving, ETF, upgrades)
- ✅ Stock earnings filtered to stocks only

**Coming in Feature #8 (Sentiment Enhancement):**
- ⬜ Asset-aware Reddit scraping
- ⬜ Asset-aware news sources
- ⬜ Crypto whale alerts
- ⬜ Futures-specific data (OPEC, EIA, USDA)

---

## 🎯 Example Usage

### **Trading Stocks:**
```javascript
const analysis = await arbiter.analyzeStock('AAPL');

// Relevant events:
// ✅ AAPL Earnings (Feb 1)
// ✅ FOMC Meeting (Jan 28)
// ✅ CPI Release (Feb 12)
// ❌ Bitcoin Halving (not relevant)
```

### **Trading Crypto:**
```javascript
const analysis = await arbiter.analyzeStock('BTC-USD');

// Relevant events:
// ✅ Bitcoin Halving (April 2028)
// ✅ SEC ETF Decision (March 2026)
// ✅ FOMC Meeting (affects crypto)
// ❌ AAPL Earnings (not relevant)
```

### **Trading Futures:**
```javascript
const analysis = await arbiter.analyzeStock('CL1!');

// Relevant events:
// ✅ OPEC Meeting (oil-specific)
// ✅ EIA Inventory (oil-specific)
// ✅ FOMC Meeting (affects all)
// ❌ AAPL Earnings (not relevant)
```

---

**Your question was spot-on! Data should absolutely adapt based on asset type.** 🎯

**Now updated in Economic Calendar, and will be asset-aware in all future features!**
