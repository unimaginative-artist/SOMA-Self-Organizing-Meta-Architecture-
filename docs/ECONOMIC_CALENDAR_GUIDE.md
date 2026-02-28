# 📅 Economic Calendar - User Guide

## Overview

The Economic Calendar tracks major economic events (Fed meetings, earnings, GDP, CPI, jobs reports) and automatically adjusts trading behavior to avoid volatility.

---

## ✅ What It Does

### **Automatic Position Sizing**
- Reduces position size 24h before high-impact events
- Recommends exiting positions before major catalysts
- Prevents getting caught in volatile moves

### **Event Tracking**
- **Fed Meetings** (FOMC) - Interest rate decisions
- **Earnings** - Company quarterly reports
- **Economic Indicators** - GDP, CPI, jobs reports

### **Impact Classification**
- 🔴 **HIGH**: Reduce position to 30%, consider exiting
- 🟡 **MEDIUM**: Reduce position to 60%
- 🟢 **LOW**: Reduce position to 90%

---

## 🚀 Quick Start

### **1. Run Test**
```bash
node test-economic-calendar.mjs
```

This will:
- Initialize the calendar
- Fetch upcoming events
- Test position size adjustments
- Check API connectivity

### **2. Set Up API Keys (Optional but Recommended)**

#### **Alpha Vantage (Earnings)**
1. Get free API key: https://www.alphavantage.co/support/#api-key
2. Set environment variable:
   ```bash
   # Windows
   set ALPHA_VANTAGE_API_KEY=your_key_here

   # Linux/Mac
   export ALPHA_VANTAGE_API_KEY=your_key_here
   ```
3. **Cost:** FREE (5 calls per minute)

#### **FRED (Economic Data) - Optional**
1. Get free API key: https://fred.stlouisfed.org/docs/api/api_key.html
2. Set environment variable:
   ```bash
   # Windows
   set FRED_API_KEY=your_key_here

   # Linux/Mac
   export FRED_API_KEY=your_key_here
   ```
3. **Cost:** FREE (unlimited)
4. **Note:** System uses manual indicators as fallback if not configured

---

## 📖 How To Use

### **In Your Trading Code**

```javascript
import { EconomicCalendar } from './arbiters/EconomicCalendar.js';

const calendar = new EconomicCalendar({ rootPath: process.cwd() });
await calendar.initialize();

// Check if major event coming for a symbol
const hasEvent = calendar.hasUpcomingEvent('AAPL', 24, 'HIGH');
if (hasEvent) {
  console.log('⚠️  AAPL has high-impact event in next 24 hours');
}

// Get position size multiplier
const multiplier = calendar.getPositionMultiplier('BTC-USD', 24);
const adjustedSize = basePositionSize * multiplier;
console.log(`Position size: $${basePositionSize} → $${adjustedSize}`);

// Check if we should exit
if (calendar.shouldExitBefore('TSLA', 24)) {
  console.log('🔴 Recommend exiting TSLA before upcoming event');
}

// Get upcoming events
const events = calendar.getUpcoming(7); // Next 7 days
events.forEach(event => {
  const formatted = calendar.formatEvent(event);
  console.log(`${formatted.impactEmoji} ${formatted.title} - ${formatted.timeString}`);
});
```

### **Integrated with FinanceAgentArbiter**

Already integrated! When you run `analyzeStock()`, it automatically:
1. Checks for upcoming events
2. Adjusts position size
3. Warns about high-impact events
4. Includes events in analysis result

```javascript
const analysis = await financeArbiter.analyzeStock('AAPL');

// Check economic events
console.log('Economic Events:', analysis.economicEvents);
console.log('Event Multiplier:', analysis.eventMultiplier);
console.log('Should Exit:', analysis.shouldExitBeforeEvent);

// Position size already adjusted
console.log('Recommended Size:', analysis.positionSizing.positionSize);
if (analysis.positionSizing.eventAdjustment) {
  console.log('Adjustment:', analysis.positionSizing.eventAdjustment);
}
```

---

## 📊 Dashboard Integration

### **Get Calendar Summary**
```javascript
const summary = calendar.getSummary();

console.log(`High-impact events (next 24h): ${summary.highImpactNext24h}`);
console.log(`Total events (next 7 days): ${summary.totalNext7d}`);

if (summary.nextHighImpact) {
  const event = calendar.formatEvent(summary.nextHighImpact);
  console.log(`⚠️  NEXT: ${event.title} in ${event.timeString}`);
}
```

### **Display Events Timeline**
```javascript
const events = calendar.getUpcoming(7).map(e => calendar.formatEvent(e));

events.forEach(event => {
  console.log(`${event.impactEmoji} ${event.title}`);
  console.log(`   ${event.timeString} | ${event.formattedDate}`);
  console.log(`   Impact: ${event.impact}`);
  console.log();
});
```

---

## 🎯 Examples

### **Example 1: Reduce Size Before FOMC**
```javascript
// Fed meeting tomorrow at 2 PM
const hasEvent = calendar.hasUpcomingEvent('BTC-USD', 24, 'HIGH');
// Returns: [{ title: 'FOMC Meeting', impact: 'HIGH', ... }]

const multiplier = calendar.getPositionMultiplier('BTC-USD', 24);
// Returns: 0.3 (reduce to 30%)

const baseSize = 1000;
const adjustedSize = baseSize * multiplier;
// adjustedSize = 300

console.log(`Reducing BTC position from $1000 to $300 due to FOMC meeting`);
```

### **Example 2: Exit Before Earnings**
```javascript
// AAPL earnings tomorrow
const shouldExit = calendar.shouldExitBefore('AAPL', 24);
// Returns: true

if (shouldExit) {
  console.log('🔴 AAPL earnings tomorrow - closing position');
  await closeTrade('AAPL');
}
```

### **Example 3: Check Multiple Symbols**
```javascript
const portfolio = ['BTC-USD', 'AAPL', 'TSLA', 'MSFT'];

for (const symbol of portfolio) {
  const events = calendar.getEventsForSymbol(symbol, 3); // Next 3 days

  if (events.length > 0) {
    console.log(`\n${symbol} - ${events.length} upcoming events:`);
    events.forEach(e => {
      const formatted = calendar.formatEvent(e);
      console.log(`  ${formatted.impactEmoji} ${formatted.title} - ${formatted.timeString}`);
    });
  }
}
```

---

## 🔧 Configuration

### **Adjust Impact Levels**

Edit `arbiters/EconomicCalendar.js` to customize:

```javascript
this.impactLevels = {
    HIGH: {
        positionMultiplier: 0.3,  // 30% of normal size
        exitBefore: true,         // Recommend exit
        bufferHours: 24          // 24h before event
    },
    MEDIUM: {
        positionMultiplier: 0.6,  // 60% of normal size
        exitBefore: false,
        bufferHours: 12
    },
    LOW: {
        positionMultiplier: 0.9,  // 90% of normal size
        exitBefore: false,
        bufferHours: 6
    }
};
```

### **Cache Expiry**

Events are cached for 1 hour by default. To change:

```javascript
this.cacheExpiry = 3600000; // 1 hour in milliseconds
```

---

## 📝 Event Types

### **1. Fed Meetings (FOMC)**
- **Frequency:** 8 per year
- **Impact:** HIGH
- **Affects:** All markets (stocks, crypto, forex)
- **Source:** Manually curated (Fed publishes schedule)

### **2. Earnings**
- **Frequency:** Quarterly per company
- **Impact:** HIGH for major stocks (AAPL, TSLA, etc.), MEDIUM otherwise
- **Affects:** Specific symbol only
- **Source:** Alpha Vantage API

### **3. Economic Indicators**
- **CPI (Inflation):** Monthly, HIGH impact
- **Jobs Report:** Monthly, HIGH impact
- **GDP:** Quarterly, HIGH impact
- **Source:** FRED API or manual schedule

---

## 🐛 Troubleshooting

### **No Events Showing Up**

**Check 1:** Run test script
```bash
node test-economic-calendar.mjs
```

**Check 2:** Verify API keys
```bash
echo %ALPHA_VANTAGE_API_KEY%  # Windows
echo $ALPHA_VANTAGE_API_KEY   # Linux/Mac
```

**Check 3:** Check cache
```bash
# Cache location
data/economic_calendar/cache/events.json
```

### **"Demo" API Key Warning**

Alpha Vantage's demo key has limited data. Get a free real key:
1. Visit: https://www.alphavantage.co/support/#api-key
2. Enter email
3. Copy API key
4. Set environment variable

### **Rate Limit Errors**

Free tier: 5 calls per minute

Solution: System automatically rate-limits. Wait 12 seconds between calls.

---

## 🚀 Production Deployment

### **Environment Variables**

Create `.env` file:
```bash
ALPHA_VANTAGE_API_KEY=your_key_here
FRED_API_KEY=your_key_here
```

Load in your app:
```javascript
import dotenv from 'dotenv';
dotenv.config();
```

### **Cron Job for Refresh**

Refresh events daily:
```bash
# crontab -e
0 6 * * * cd /path/to/SOMA && node -e "import('./arbiters/EconomicCalendar.js').then(m => { const c = new m.EconomicCalendar({rootPath: '.'}); c.initialize(); })"
```

---

## 📈 Future Enhancements

Planned features:
- [ ] Real-time event notifications (WebSocket)
- [ ] Historical event impact analysis
- [ ] Custom event addition
- [ ] Event outcome tracking (did volatility actually spike?)
- [ ] Integration with news sentiment

---

## ✅ Success Checklist

- [ ] Test script runs successfully
- [ ] API keys configured (or using manual fallback)
- [ ] Events showing up in calendar
- [ ] Position sizes adjusting correctly
- [ ] Dashboard displaying events
- [ ] System warns about upcoming high-impact events

---

**Feature #1 COMPLETE!** 🎉

Next: Meta-Learning System (Feature #2)
