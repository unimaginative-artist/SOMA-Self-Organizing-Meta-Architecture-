import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const FinanceKnowledgeArbiter = require('./finance/FinanceKnowledgeArbiter.cjs');
import gridEngine from '../server/finance/strategies/GridEngine.js';
import { computeAll, calculateATR } from '../server/finance/TechnicalIndicators.js';

// 🚀 REVOLUTIONARY TRADING SYSTEMS
import { TradeLearningEngine } from './TradeLearningEngine.js';
import { MultiTimeframeAnalyzer } from './MultiTimeframeAnalyzer.js';
import { AdaptivePositionSizer } from './AdaptivePositionSizer.js';
import { MarketRegimeDetector } from './MarketRegimeDetector.js';
import { BacktestEngine } from './BacktestEngine.js';
import { RiskManager } from './RiskManager.js';
import { PerformanceAnalytics } from './PerformanceAnalytics.js';
import { EconomicCalendar } from './EconomicCalendar.js';
import { MetaLearner } from './MetaLearner.js';
import { ToolCreatorArbiter } from './ToolCreatorArbiter.js';
import marketDataService from '../server/finance/marketDataService.js';

/**
 * FinanceAgentArbiter V2 - "The Autonomous Hedge Fund"
 * 
 * A monster system integrating:
 * 4. Deep Knowledge RAG (SEC/Macro)
 * 5. Sentiment Analysis (Theory of Mind)
 * 6. Paper Trading (RL Loop)
 * 7. AutoHedge Swarm Architecture (Director -> Quant -> Risk -> Execution)
 * 8. FinanceKnowledge (300k+ Asset Universe)
 */
export class FinanceAgentArbiter extends BaseArbiterV4 {
  constructor(opts = {}) {
    super({
      ...opts,
      name: opts.name || 'FinanceAgentArbiter',
      role: ArbiterRole.SPECIALIST,
      capabilities: [
        ArbiterCapability.SEARCH_WEB,
        ArbiterCapability.MICRO_SPAWN,
        ArbiterCapability.EXECUTE_CODE,
        ArbiterCapability.MEMORY_ACCESS,
        ArbiterCapability.READ_FILES
      ]
    });

    // UI Self-Wiring Config (Phase 4)
    this.uiConfig = {
      label: 'Finance',
      icon: 'DollarSign',
      color: 'emerald',
      priority: 10,
      description: 'Autonomous Hedge Fund'
    };

    this.quadBrain = opts.quadBrain || null;
    this.visionArbiter = opts.visionArbiter || null;
    this.edgeOrchestrator = opts.edgeOrchestrator || null;

    // The Cartographer
    this.knowledgeArbiter = new FinanceKnowledgeArbiter({
      rootPath: opts.rootPath || process.cwd()
    });

    // Virtual Portfolio State
    this.portfolio = {
      cash: 100000,
      positions: {}, // { 'AAPL': { shares: 10, avgPrice: 150 } }
      history: []
    };

    // 🚀 REVOLUTIONARY TRADING SYSTEMS - Institutional Grade
    const rootPath = opts.rootPath || process.cwd();

    this.learningEngine = new TradeLearningEngine({
      quadBrain: this.quadBrain,
      mnemonic: null, // Will be injected on initialize
      rootPath
    });

    this.mtfAnalyzer = new MultiTimeframeAnalyzer();

    this.positionSizer = new AdaptivePositionSizer({
      basePositionSize: 1000,    // $1k base position
      maxPositionSize: 5000,     // $5k max position
      minPositionSize: 100       // $100 min position
    });

    this.regimeDetector = new MarketRegimeDetector();

    this.backtestEngine = new BacktestEngine({
      quadBrain: this.quadBrain,
      mtfAnalyzer: this.mtfAnalyzer,
      positionSizer: this.positionSizer,
      regimeDetector: this.regimeDetector,
      rootPath
    });

    this.riskSystem = new RiskManager({
      rootPath,
      portfolioOptimizer: null, // Can be added later
      correlationDetector: null // Can be added later
    });

    // Customize risk limits for trading
    this.riskSystem.limits.maxDailyLoss = 0.05;           // 5% daily loss limit
    this.riskSystem.limits.maxDrawdown = 0.15;            // 15% max drawdown
    this.riskSystem.limits.maxPositionSize = 0.25;        // 25% max per position
    this.riskSystem.limits.maxSectorExposure = 0.40;      // 40% max per sector

    this.analytics = new PerformanceAnalytics({ rootPath });

    this.economicCalendar = new EconomicCalendar({ rootPath });

    this.metaLearner = new MetaLearner({
      rootPath,
      performanceAnalytics: this.analytics,
      minSampleSize: 20  // Require 20 trades before making decisions
    });

    this.toolCreator = new ToolCreatorArbiter({
        quadBrain: this.quadBrain,
        rootPath
    });

    this.auditLogger.info('🚀 Advanced Trading Systems initialized', {
      systems: ['Learning', 'MTF', 'PositionSizing', 'Regime', 'Backtest', 'Risk', 'Analytics', 'EconomicCalendar', 'MetaLearner']
    });
  }

  // ════════════════════════════════════════════════════════════════════════
  // 🧠 SWARM PROMPTS (Sourced from AutoHedge)
  // ════════════════════════════════════════════════════════════════════════

  get DIRECTOR_PROMPT() {
    return `You are a Trading Director AI. Your goal is to orchestrate a cohesive trading strategy.
      - Conduct in-depth market analysis.
      - Develop a comprehensive trading thesis.
      - Collaborate with Quant, Risk, and Sentiment agents.
      - Make final data-driven decisions.`;
  }

  get QUANT_PROMPT() {
    return `You are a Quantitative Analyst AI. Provide deep numerical analysis.
      - Analyze Technical Indicators (RSI, MACD, Bollinger).
      - Evaluate Statistical Patterns (Mean Reversion, Momentum).
      - Calculate Risk Metrics (VaR, Greeks).
      - Output confidence scores for trade success.`;
  }

  get RISK_PROMPT() {
    return `You are a Risk Manager AI. Mitigate potential downsides.
      - Evaluate position sizing and capital allocation.
      - Calculate Max Drawdown and Exposure.
      - Monitor correlation risks.
      - Reject trades if risk > reward.`;
  }

  get EXECUTION_PROMPT() {
    return `You are a Trade Execution AI. Execute with precision.
      - Generate specific order parameters (Limit/Market).
      - Define Entry, Stop Loss, and Take Profit levels.
      - Specify Time In Force (TIF).`;
  }

  async onInitialize() {
    // Initialize the massive financial database
    await this.knowledgeArbiter.initialize();

    // Initialize Alpaca
    try {
        const alpacaService = (await import('../server/finance/AlpacaService.js')).default;
        await alpacaService.initialize();
    } catch (e) {
        this.auditLogger.warn('AlpacaService initialization failed', { error: e.message });
    }

    // 🚀 Initialize advanced trading systems
    if (this.learningEngine) {
      // Inject global mnemonic if available
      this.learningEngine.mnemonic = global.SOMA?.mnemonic || null;
      await this.learningEngine.initialize();
      this.auditLogger.info('✅ Trade Learning Engine initialized');
    }

    if (this.backtestEngine) {
      await this.backtestEngine.initialize();
      this.auditLogger.info('✅ Backtest Engine initialized');
    }

    if (this.analytics) {
      await this.analytics.initialize();
      this.auditLogger.info('✅ Performance Analytics initialized');
    }

    if (this.economicCalendar) {
      await this.economicCalendar.initialize();
      this.auditLogger.info('✅ Economic Calendar initialized');
    }

    if (this.riskSystem) {
      await this.riskSystem.initialize();
      this.auditLogger.info('✅ Risk Management System initialized');
    }

    if (this.metaLearner) {
      await this.metaLearner.initialize();
      this.auditLogger.info('✅ Meta-Learning System initialized');
    }

    this.auditLogger.info('Finance Agent Swarm initialized', {
      modules: [
        this.quadBrain ? 'QuadBrain' : 'Missing',
        this.visionArbiter ? 'Vision' : 'Missing',
        'Backtester',
        'DebateProtocol',
        'PaperTrader',
        'FinanceKnowledge (300k+ Assets)',
        '🚀 Learning Engine',
        '🚀 Multi-Timeframe',
        '🚀 Adaptive Sizing',
        '🚀 Regime Detection',
        '🚀 Risk Management',
        '🚀 Analytics'
      ]
    });
  }

  /**
   * THE MONSTER WORKFLOW - Enhanced with Revolutionary Systems
   */
  async analyzeStock(symbol, context = {}) {
    this.auditLogger.info(`🚀 [HedgeFund] Initiating ADVANCED SWARM analysis for ${symbol}`);
    const startTime = Date.now();

    // Signal to QuadBrain that these calls are trading analysis — preserve Gemini access
    // even when global.__SOMA_TRADING_ACTIVE is set (which would otherwise defer to soma1t)
    // try/finally guarantees the flag always clears even if an exception is thrown mid-analysis
    global.__SOMA_FINANCE_ANALYSIS = true;
    try {

    // 🚀 PHASE -1: MARKET REGIME DETECTION
    // ----------------------------------------------------
    this.auditLogger.info(`[Step 1/8] Detecting market regime for ${symbol}...`);
    const regime = await this.regimeDetector.detectRegime(symbol);
    this.auditLogger.info(`Market Regime: ${regime.type} (${(regime.confidence * 100).toFixed(0)}% confidence)`);

    // 🚀 PHASE -0.5: MULTI-TIMEFRAME ANALYSIS
    // ----------------------------------------------------
    this.auditLogger.info(`[Step 2/8] Multi-timeframe analysis...`);
    const mtfAnalysis = await this.mtfAnalyzer.analyzeSymbol(symbol);
    this.auditLogger.info(`MTF Alignment: ${mtfAnalysis.synthesis.alignment} (${(mtfAnalysis.synthesis.confidence * 100).toFixed(0)}%)`);

    // PHASE 0: DIRECTOR THESIS GENERATION
    // ----------------------------------------------------
    this.auditLogger.info(`[Step 3/8] Director generating thesis...`);
    const thesis = await this._runDirectorAgent(symbol);

    // 🚀 CHECK HISTORICAL PERFORMANCE
    // ----------------------------------------------------
    this.auditLogger.info(`[Step 4/8] Checking trade history...`);
    const historicalInsights = await this.learningEngine.getStrategyInsights(symbol, thesis);
    if (historicalInsights.sampleSize > 0) {
      this.auditLogger.info(`Historical: ${historicalInsights.sampleSize} trades, ${(historicalInsights.confidence * 100).toFixed(0)}% win rate`);
    }

    // PHASE 1: DATA INGESTION (Parallel Swarm)
    // ----------------------------------------------------
    this.auditLogger.info(`[Step 5/8] Data ingestion (parallel swarm)...`);
    const [researchData, visualAnalysis, deepKnowledge] = await Promise.all([
      this._runResearcherAgent(symbol),
      this._runVisualAnalysisAgent(symbol),
      this._runDeepKnowledgeAgent(symbol)
    ]);

    // PHASE 2: QUANTITATIVE & BACKTESTING
    // ----------------------------------------------------
    this.auditLogger.info(`[Step 6/8] Quantitative analysis...`);
    const quantResult = await this._runQuantAgent(symbol, researchData.priceHistory, thesis);

    // PHASE 3: SENTIMENT & PSYCHOLOGY
    // ----------------------------------------------------
    this.auditLogger.info(`[Step 7/8] Sentiment analysis...`);
    const sentimentResult = await this._runSentimentAgent(symbol, researchData.news);

    // PHASE 4: SOCIETY OF MARKETS DEBATE
    // ----------------------------------------------------
    // The Bull and Bear review EVERYTHING generated so far
    const debateTranscript = await this._runDebateProtocol(symbol, {
      research: researchData,
      vision: visualAnalysis,
      quant: quantResult,
      sentiment: sentimentResult,
      deep: deepKnowledge,
      regime,
      mtfAnalysis
    });

    // PHASE 4.5: RISK ASSESSMENT (Original + New Risk System)
    // ----------------------------------------------------
    const riskAssessment = await this._runRiskAgent(symbol, { thesis, quant: quantResult, debate: debateTranscript });

    // PHASE 5: FINAL VERDICT & EXECUTION
    // ----------------------------------------------------
    this.auditLogger.info(`[Step 8/8] Final strategy synthesis...`);
    const strategyResult = await this._runStrategistAgent(symbol, debateTranscript, riskAssessment);

    // 🚀 CHECK ECONOMIC CALENDAR
    // ----------------------------------------------------
    const upcomingEvents = this.economicCalendar.getEventsForSymbol(symbol, 3);
    const eventMultiplier = this.economicCalendar.getPositionMultiplier(symbol, 24);
    const shouldExit = this.economicCalendar.shouldExitBefore(symbol, 24);

    if (shouldExit) {
      this.auditLogger.warn(`⚠️ High-impact event in <24h for ${symbol} - Recommend exit`);
    }

    if (eventMultiplier < 1.0) {
      this.auditLogger.warn(`⚠️ Reducing position size to ${(eventMultiplier * 100).toFixed(0)}% due to upcoming event`);
    }

    // 🚀 CALCULATE ADAPTIVE POSITION SIZE
    // ----------------------------------------------------
    const combinedConfidence = this._calculateCombinedConfidence(
      regime.confidence,
      parseFloat(mtfAnalysis.synthesis.confidence),
      historicalInsights.confidence || 0.5,
      strategyResult.confidence || 0.5
    );

    const basePositionSizing = this.positionSizer.calculatePositionSize({
      confidence: combinedConfidence,
      historicalWinRate: historicalInsights.confidence || 0.5,
      volatility: parseFloat(mtfAnalysis.timeframes['1H']?.volatility || 50) / 100,
      riskScore: riskAssessment.score || 50
    }, this.portfolio.cash);

    // Apply economic event multiplier
    const positionSizing = {
      ...basePositionSizing,
      positionSize: Math.round(basePositionSizing.positionSize * eventMultiplier),
      eventAdjustment: eventMultiplier < 1.0 ? `Reduced to ${(eventMultiplier * 100).toFixed(0)}% due to upcoming event` : null
    };

    // 🚀 INSTITUTIONAL RISK CHECK
    // ----------------------------------------------------
    const portfolioValue = this._calculatePortfolioValue();
    const tradeProposal = {
      symbol,
      side: strategyResult.recommendation === 'BUY' ? 'buy' : 'sell',
      positionSize: positionSizing.positionSize,
      sector: researchData.sector || 'Unknown',
      volatility: parseFloat(mtfAnalysis.timeframes['1H']?.volatility || 50) / 100
    };

    // Update risk system's portfolio state
    await this.riskSystem.updatePortfolio({
      totalValue: portfolioValue,
      cash: this.portfolio.cash,
      positions: new Map(Object.entries(this.portfolio.positions).map(([symbol, pos]) => [symbol, pos]))
    });

    const riskEvaluation = await this.riskSystem.validateTrade(tradeProposal);

    // Override position size if risk system adjusted it
    if (riskEvaluation.violations && riskEvaluation.violations.length > 0) {
      this.auditLogger.warn('Risk violations detected:', riskEvaluation.violations);
      if (riskEvaluation.adjustedSize !== tradeProposal.size) {
        tradeProposal.positionSize = riskEvaluation.adjustedSize;
      }
    }

    // PHASE 6: PAPER TRADING EXECUTION (RL Loop)
    // ----------------------------------------------------
    let tradeExecution = null;
    if (riskEvaluation.approved && strategyResult.recommendation !== 'HOLD') {
      tradeExecution = await this._executePaperTrade(symbol, strategyResult, positionSizing.positionSize);

      // 🚀 Record trade for learning
      if (tradeExecution && tradeExecution.executed) {
        await this._recordTradeForLearning({
          symbol,
          thesis,
          sentiment: sentimentResult,
          quant: quantResult,
          risk: riskAssessment,
          regime: regime.type,
          mtfAnalysis,
          debate: debateTranscript,
          positionSize: positionSizing.positionSize,
          trade: tradeExecution
        });
      }
    } else {
      tradeExecution = {
        executed: false,
        reason: !riskEvaluation.approved ? riskEvaluation.reason : 'HOLD recommendation'
      };
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    this.auditLogger.info(`✅ [HedgeFund] Analysis complete for ${symbol} in ${duration}s`);

    // 🧬 Check for evolution trigger (Fire and forget)
    this._checkStrategyEvolution(regime.type, mtfAnalysis).catch(e => console.error(e));

    return {
      symbol,
      timestamp: new Date().toISOString(),
      duration,
      // 🚀 NEW: Advanced Intelligence
      regime,
      mtfAnalysis,
      historicalInsights,
      positionSizing,
      riskEvaluation,
      combinedConfidence,
      economicEvents: upcomingEvents.map(e => this.economicCalendar.formatEvent(e)),
      eventMultiplier,
      shouldExitBeforeEvent: shouldExit,
      // Raw Data
      research: researchData,
      vision: visualAnalysis,
      deepKnowledge,
      thesis,
      // Analysis
      quant: quantResult,
      sentiment: sentimentResult,
      risk: riskAssessment,
      // Synthesis
      debate: debateTranscript,
      strategy: strategyResult,
      // Action
      trade: tradeExecution,
      portfolio: this.getPortfolioSummary(),
      // 🚀 Metadata
      metadata: {
        regimeType: regime.type,
        regimeConfidence: regime.confidence,
        mtfAlignment: mtfAnalysis.synthesis.alignment,
        mtfConfidence: mtfAnalysis.synthesis.confidence,
        recommendedSize: positionSizing.positionSize,
        historicalWinRate: historicalInsights.confidence || 0,
        historicalSampleSize: historicalInsights.sampleSize || 0,
        riskApproved: riskEvaluation.approved
      }
    };
    } finally {
      global.__SOMA_FINANCE_ANALYSIS = false;
    }
  }

  // =========================================================================
  // 🕵️ PHASE 1: RESEARCH & VISION
  // 🕵️ PHASE 0: DIRECTOR & RESEARCH
  // =========================================================================

  async _runDirectorAgent(symbol) {
    if (!this.quadBrain) return "Neutral Stance (Brain Offline)";
    const result = await this.quadBrain.reason(`
      ${this.DIRECTOR_PROMPT}
      Task: Generate an initial trading thesis for ${symbol}. 
      Consider current market volatility and sector rotation.
    `, 'analytical');
    return result.text || result.response;
  }

  async _runResearcherAgent(symbol) {
    this.auditLogger.debug(`[Researcher] Scraping real-time data for ${symbol}...`);

    // Use FinanceKnowledge to identify asset type/metadata
    const searchResults = await this.knowledgeArbiter.searchUniverse(symbol);
    const metadata = searchResults.find(s => s.symbol === symbol) || {};

    // Check if Crypto (naive check)
    const isCrypto = symbol.length <= 4 && !['AAPL', 'TSLA', 'GOOG', 'MSFT', 'AMZN', 'NVDA', 'META'].includes(symbol.toUpperCase());
    const querySymbol = isCrypto ? `${symbol}-USD` : symbol;

    // Try real market data first, fall back to simulation only if broker unavailable
    let currentPrice = null;
    let priceHistory = [];
    let simulated = false;

    try {
      const priceData = await marketDataService.getLatestPrice(querySymbol);
      if (priceData && priceData.price) {
        currentPrice = priceData.price;
      }
    } catch (e) {
      this.auditLogger.warn(`[Researcher] Price fetch failed for ${querySymbol}: ${e.message}`);
    }

    try {
      const bars = await marketDataService.getBars(querySymbol, '1D', 30);
      if (bars && bars.length > 0) {
        priceHistory = bars.map(b => ({
          date: b.Timestamp || b.t || b.date,
          close: b.ClosePrice || b.c || b.close,
          volume: b.Volume || b.v || b.volume || 0
        }));
        if (!currentPrice && priceHistory.length > 0) {
          currentPrice = priceHistory[priceHistory.length - 1].close;
        }
      }
    } catch (e) {
      this.auditLogger.warn(`[Researcher] Bars fetch failed for ${querySymbol}: ${e.message}`);
    }

    // Fallback to simulation ONLY if real data unavailable
    if (!currentPrice) {
      this.auditLogger.warn(`[Researcher] No real data for ${querySymbol}. Using simulation.`);
      simulated = true;
      currentPrice = isCrypto ? 65000 : 150;
      priceHistory = Array.from({ length: 30 }, (_, i) => ({
        date: new Date(Date.now() - (30 - i) * 86400000).toISOString().split('T')[0],
        close: currentPrice * (1 + (Math.random() * 0.1 - 0.05)),
        volume: 1000000 + Math.random() * 500000
      }));
    }

    return {
      price: typeof currentPrice === 'number' ? currentPrice.toFixed(2) : String(currentPrice),
      priceHistory,
      news: [
        { title: `${symbol} market activity update`, source: "SOMA Research", sentiment: "neutral" }
      ],
      isCrypto,
      simulated,
      metadata
    };
  }

  async _runVisualAnalysisAgent(symbol) {
    this.auditLogger.debug(`[Vision] Analyzing charts for ${symbol}...`);

    // REAL VISION PATH
    if (this.visionArbiter && this.edgeOrchestrator) {
      try {
        // 1. Capture Screenshot
        const chartUrl = `https://www.tradingview.com/chart/?symbol=${symbol}`; // Simplified URL
        this.auditLogger.info(`[Vision] Capturing chart from ${chartUrl}`);

        const screenshotTask = await this.edgeOrchestrator.queueTask({
          type: 'screenshot',
          data: { url: chartUrl, selector: '.chart-container' } // Hypothetical selector
        });

        if (screenshotTask && screenshotTask.result && screenshotTask.result.image) {
          // 2. Analyze with Vision Model
          const imageBuffer = Buffer.from(screenshotTask.result.image, 'base64');
          const prompt = "Analyze this stock chart. Identify trends, support/resistance levels, and any chart patterns (Bull Flag, Head & Shoulders). Return JSON: { detected_patterns: [{name, confidence, price}], trend_analysis: string }";

          const visionResult = await this.visionArbiter.analyzeImage(imageBuffer, prompt);

          // Parse Vision output (assuming it returns JSON or text we can parse)
          // For safety, we wrap parsing
          let parsedResult;
          try {
            parsedResult = typeof visionResult === 'object' ? visionResult : JSON.parse(visionResult);
          } catch (e) {
            parsedResult = { trend_analysis: visionResult, detected_patterns: [] };
          }

          return {
            detected_patterns: parsedResult.detected_patterns || [],
            trend_analysis: parsedResult.trend_analysis || "Analysis completed",
            screenshot_url: "captured_live"
          };
        }
      } catch (error) {
        this.auditLogger.warn(`[Vision] Real analysis failed: ${error.message}. Falling back to simulation.`);
      }
    }

    // FALLBACK SIMULATION
    return {
      detected_patterns: [
        { name: "Bull Flag (Simulated)", confidence: 0.85, timeframe: "4H", price: 145.00 },
        { name: "Support Level (Simulated)", price: 142.50, strength: "High" }
      ],
      trend_analysis: "Uptrend with consolidation (Simulated)",
      screenshot_url: "simulated_chart.png"
    };
  }

  async _runDeepKnowledgeAgent(symbol) {
    this.auditLogger.debug(`[DeepKnow] Digging into Asset Universe for ${symbol}...`);

    // Use FinanceKnowledge to find Peers (Same Country + Industry)
    const searchResults = await this.knowledgeArbiter.searchUniverse(symbol);
    const asset = searchResults.find(s => s.symbol === symbol);

    let peers = [];
    if (asset && asset.industry && asset.country) {
      // Find others in same bucket
      const universe = this.knowledgeArbiter.cache.equities || [];
      peers = universe
        .filter(a => a.country === asset.country && a.industry === asset.industry && a.symbol !== symbol)
        .slice(0, 5)
        .map(p => p.symbol);
    }

    return {
      sector: asset?.sector || "Unknown",
      industry: asset?.industry || "Unknown",
      country: asset?.country || "Unknown",
      peers: peers,
      risks: [
        "Sector rotation risk",
        `Macro headwinds in ${asset?.country || 'region'}`
      ],
      catalysts: [
        "Earnings surprise potential",
        "Industry-wide momentum"
      ]
    };
  }

  // =========================================================================
  // 🧮 PHASE 2: QUANT & BACKTESTING
  // =========================================================================

  async _runQuantAgent(symbol, priceHistory, thesis) {
    this.auditLogger.debug(`[Quant] Running Technical Analysis for ${symbol}...`);

    // Real indicator calculations from price history
    const indicators = computeAll(priceHistory);

    // Grid Engine: use real Bollinger width and ATR
    const bbWidth = indicators.bollinger.width || 5.0;
    const atrPct = indicators.atr.percent || 1.5;
    const marketRegime = gridEngine.detectRegime(bbWidth, atrPct);
    const recommendedLeverage = gridEngine.getRecommendedLeverage(marketRegime);

    // Determine thesis alignment from indicators
    const bullSignals = [
      indicators.rsi.value < 40,
      indicators.macd.histogram > 0,
      indicators.bollinger.percentB < 0.3,
      indicators.currentPrice > indicators.sma.sma50
    ].filter(Boolean).length;

    const thesisAlignment = bullSignals >= 3 ? "Strong bullish confluence" :
                            bullSignals >= 2 ? "Moderate bullish lean" :
                            bullSignals <= 1 ? "Bearish or mixed signals" :
                            "Neutral - no clear edge";

    // Use real last-bar high/low for pivot points
    const lastBar = priceHistory[priceHistory.length - 1];
    const pivotHigh = lastBar.high || indicators.currentPrice * 1.01;
    const pivotLow = lastBar.low || indicators.currentPrice * 0.99;

    return {
      strategy: "Multi-Factor Confluence",
      thesis_alignment: thesisAlignment,
      market_regime: marketRegime,
      recommended_leverage: recommendedLeverage,
      technical_indicators: {
        rsi: { value: indicators.rsi.value.toFixed(2), signal: indicators.rsi.signal },
        macd: { value: indicators.macd.histogram.toFixed(3), signal: indicators.macd.signalLabel },
        bollinger: { upper: indicators.bollinger.upper.toFixed(2), lower: indicators.bollinger.lower.toFixed(2), signal: indicators.bollinger.signal, width: bbWidth.toFixed(2) },
        atr: { value: indicators.atr.value.toFixed(2), percent: atrPct.toFixed(2) + '%' },
        pivots: this._calculatePivotPoints(pivotHigh, pivotLow, indicators.currentPrice)
      },
      backtest_results: {
        annual_return: "Requires backtest run",
        sharpe_ratio: null,
        max_drawdown: null,
        win_rate: null
      }
    };
  }

  _calculatePivotPoints(high, low, close) {
    const p = (high + low + close) / 3;
    const r1 = 2 * p - low;
    const s1 = 2 * p - high;
    const r2 = p + (high - low);
    const s2 = p - (high - low);
    return { p, r1, s1, r2, s2 };
  }

  // =========================================================================
  // 🧠 PHASE 3: SENTIMENT (THEORY OF MIND)
  // =========================================================================

  async _runSentimentAgent(symbol, news) {
    this.auditLogger.debug(`[Sentiment] Profiling market psychology for ${symbol}...`);

    if (this.quadBrain) {
      try {
        const prompt = `You are a sentiment analyst. Assess market psychology for ${symbol}.
Available news headlines: ${(news || []).map(n => n.title).join('; ') || 'No news available.'}

Respond in EXACTLY this format (no other text):
SCORE: <number 0.0-1.0 where 0=Extreme Fear, 1=Extreme Greed>
LABEL: <2-3 words like "Cautious Optimism", "Extreme Fear", "Mild Greed">
SOCIAL_VOLUME: <Low|Medium|High>
INSIDER_TONE: <1 sentence about inferred institutional/insider sentiment>`;

        const result = await this.quadBrain.reason(prompt, 'analytical');
        const text = result?.text || result?.response || '';

        const scoreMatch = text.match(/SCORE:\s*([\d.]+)/i);
        const labelMatch = text.match(/LABEL:\s*(.+)/i);
        const volumeMatch = text.match(/SOCIAL_VOLUME:\s*(\w+)/i);
        const toneMatch = text.match(/INSIDER_TONE:\s*(.+)/i);

        if (scoreMatch) {
          return {
            score: Math.max(0, Math.min(1, parseFloat(scoreMatch[1]))),
            label: labelMatch?.[1]?.trim() || 'Neutral',
            social_volume: volumeMatch?.[1]?.trim() || 'Medium',
            insider_tone: toneMatch?.[1]?.trim() || 'Sentiment data inconclusive.'
          };
        }
      } catch (e) {
        this.auditLogger.warn(`[Sentiment] QuadBrain call failed: ${e.message}`);
      }
    }

    // Fallback: conservative neutral (not fake optimism)
    return {
      score: 0.50,
      label: "Neutral",
      social_volume: "Unknown",
      insider_tone: "Sentiment data unavailable — defaulting to neutral."
    };
  }
  // =========================================================================
  // 🛡️ PHASE 4.5: RISK MANAGEMENT
  // =========================================================================

  async _runRiskAgent(symbol, context) {
    this.auditLogger.debug(`[Risk] Evaluating exposure for ${symbol}...`);

    // Use the real RiskManager if available from bootstrap
    const riskMgr = global.SOMA_TRADING?.riskManager;
    if (riskMgr) {
      const summary = riskMgr.getRiskSummary();
      const drawdownPct = (summary.portfolio.currentDrawdown * 100).toFixed(1);
      const isHalted = summary.state.isHalted;

      // Risk score: 0 = safe, 100 = dangerous
      // Based on drawdown proximity to limit + consecutive losses
      const drawdownRatio = summary.portfolio.currentDrawdown / riskMgr.limits.maxDrawdown;
      const lossRatio = summary.state.consecutiveLosses / riskMgr.limits.maxConsecutiveLosses;
      const dailyLossRatio = Math.abs(summary.portfolio.dailyPnL) / (summary.portfolio.totalValue * riskMgr.limits.maxDailyLoss || 1);
      const riskScore = Math.min(100, Math.round((drawdownRatio * 40 + lossRatio * 30 + dailyLossRatio * 30)));
      const approved = !isHalted && riskScore < 80;

      return {
        score: riskScore,
        approved,
        max_drawdown_limit: `${(riskMgr.limits.maxDrawdown * 100).toFixed(0)}%`,
        current_drawdown: `${drawdownPct}%`,
        position_sizing: approved ? `${(riskMgr.limits.maxPositionSize * 100).toFixed(0)}% max` : "0%",
        notes: isHalted ? `Trading halted: ${summary.state.haltReason}` :
               riskScore > 60 ? "Elevated risk - reduce position sizes" :
               "Risk within acceptable limits."
      };
    }

    // Fallback: estimate from price volatility in context
    const priceHistory = context?.research?.priceHistory;
    if (priceHistory && priceHistory.length >= 14) {
      const closes = priceHistory.map(p => p.close);
      const highs = priceHistory.map(p => p.high || p.close);
      const lows = priceHistory.map(p => p.low || p.close);
      const { atrPercent } = calculateATR(highs, lows, closes, 14);

      // Higher ATR% = higher risk score
      const riskScore = Math.min(100, Math.round(atrPercent * 20));
      const approved = riskScore < 80;

      return {
        score: riskScore,
        approved,
        max_drawdown_limit: "5%",
        position_sizing: approved ? "5% of Portfolio" : "2% of Portfolio",
        notes: atrPercent > 4 ? "High volatility - reduce exposure" : "Risk within acceptable limits."
      };
    }

    // Last resort: conservative default (NOT random)
    return {
      score: 50,
      approved: true,
      max_drawdown_limit: "5%",
      position_sizing: "3% of Portfolio",
      notes: "Insufficient data for precise risk scoring - using conservative defaults."
    };
  }
  // =========================================================================
  // ⚔️ PHASE 4: SOCIETY OF MARKETS DEBATE
  // =========================================================================

  async _runDebateProtocol(symbol, context) {
    this.auditLogger.debug(`[Debate] 🐻 Bear vs 🐮 Bull debate commencing...`);

    // 1. The Bull Speaks
    const bullArgument = await this._generatePersonaResponse('Bull', symbol, context);

    // 2. The Bear Retorts
    const bearArgument = await this._generatePersonaResponse('Bear', symbol, context, bullArgument);

    // 3. Rebuttals (optional depth)

    return {
      bull_thesis: bullArgument,
      bear_thesis: bearArgument,
      winner: bullArgument.length > bearArgument.length ? "Bull" : "Bear" // Simplistic heuristic for now
    };
  }

  async _generatePersonaResponse(persona, symbol, context, opponentArgument = null) {
    if (!this.quadBrain) return `${persona}: (Brain Offline) I think we should ${persona === 'Bull' ? 'buy' : 'sell'}.`;

    const prompt = `
      You are The ${persona} for ${symbol}.
      
      CONTEXT:
      - Fundamentals: ${JSON.stringify(context.deep)}
      - Technicals: ${JSON.stringify(context.vision)}
      - Quant: ${JSON.stringify(context.quant)}
      
      ${opponentArgument ? `Your opponent said: "${opponentArgument}". Destroy their argument.` : `Make the strongest possible case for ${persona === 'Bull' ? 'LONG' : 'SHORT'} position.`}
      
      Be aggressive, factual, and cite the data provided.
    `;

    // Use specific brain hemispheres for specific personas if possible
    // PROMETHEUS (Strategy) for Bear, AURORA (Creative) for Bull
    const brainMode = persona === 'Bull' ? 'creative' : 'analytical';
    const result = await this.quadBrain.reason(prompt, brainMode);
    return result.text || result.response;
  }

  // =========================================================================
  // ⚖️ PHASE 5: STRATEGIST VERDICT
  // =========================================================================

  async _runStrategistAgent(symbol, debate, riskAssessment) {
    this.auditLogger.debug(`[Strategist] Finalizing investment memo...`);

    const prompt = `
      You are the Chief Investment Officer.
      Review the debate below and issue a final binding verdict.
      
      BULL CASE: ${debate.bull_thesis}
      BEAR CASE: ${debate.bear_thesis}
      
      Task:
      1. Synthesize the winning arguments.
      2. Issue a Recommendation: STRONG BUY, BUY, HOLD, SELL, STRONG SELL.
      3. Assign a Conviction Score (0-100%).
      4. Define a Stop Loss and Take Profit level.
    `;

    let verdict = { text: "System Offline", confidence: 0 };
    if (this.quadBrain) {
      const result = await this.quadBrain.reason(prompt, 'balanced');
      verdict = { text: result.text || result.response, confidence: result.confidence };
    }

    // Extract structured data from text (Mock extraction for reliability)
    const recommendation = verdict.text.includes("SELL") ? "SELL" : "BUY";
    const confidence = verdict.confidence || 0.85;

    return {
      recommendation,
      confidence,
      rationale: verdict.text,
      action_plan: {
        entry: "Market",
        stop_loss: "5% below support",
        target: "15% upside"
      }
    };
  }

  // =========================================================================
  // 💸 PHASE 6: PAPER TRADING (RL FEEDBACK)
  // =========================================================================

  async _executePaperTrade(symbol, strategy, positionSize = null) {
    if (strategy.confidence < 0.7) {
      return { executed: false, status: "Skipped", reason: "Low Confidence" };
    }

    // Use real market price (with fallback)
    let price = null;
    try {
      const priceData = await marketDataService.getLatestPrice(symbol);
      if (priceData?.price) price = priceData.price;
    } catch (e) { /* non-critical */ }
    if (!price) {
      return { executed: false, status: "Skipped", reason: "Could not fetch real price for paper trade" };
    }

    const action = strategy.recommendation;

    if (action.includes("BUY")) {
      // Use adaptive position size if provided
      const dollarAmount = positionSize || 1000;
      const shares = Math.floor(dollarAmount / price);
      const cost = price * shares;

      if (this.portfolio.cash >= cost && shares > 0) {
        this.portfolio.cash -= cost;
        if (!this.portfolio.positions[symbol]) this.portfolio.positions[symbol] = { shares: 0, cost_basis: 0 };
        this.portfolio.positions[symbol].shares += shares;
        this.portfolio.positions[symbol].cost_basis = price;

        this.auditLogger.info(`[PaperTrade] ✅ BOUGHT ${shares} ${symbol} @ $${price} (Total: $${cost.toFixed(2)})`);
        return {
          executed: true,
          status: "Executed",
          side: "BUY",
          price,
          shares,
          cost: cost.toFixed(2)
        };
      } else {
        return { executed: false, status: "Skipped", reason: "Insufficient Funds" };
      }
    }

    return { executed: false, status: "Skipped", reason: "Not a BUY signal" };
  }

  // =========================================================================
  // 🚀 ADVANCED SYSTEM HELPERS
  // =========================================================================

  /**
   * Calculate combined confidence from multiple sources
   */
  _calculateCombinedConfidence(regimeConf, mtfConf, historicalConf, strategyConf) {
    // Weighted average: regime 25%, mtf 25%, historical 30%, strategy 20%
    return (
      regimeConf * 0.25 +
      mtfConf * 0.25 +
      historicalConf * 0.30 +
      strategyConf * 0.20
    );
  }

  /**
   * Calculate total portfolio value
   */
  _calculatePortfolioValue() {
    const positionsValue = Object.keys(this.portfolio.positions).reduce((acc, sym) => {
      return acc + (this.portfolio.positions[sym].shares * 150); // Mock current price
    }, 0);
    return this.portfolio.cash + positionsValue;
  }

  /**
   * Record trade for learning engine
   */
  async _recordTradeForLearning(context) {
    const { symbol, thesis, sentiment, quant, risk, regime, mtfAnalysis, debate, positionSize, trade } = context;

    const tradeRecord = {
      id: `trade_${Date.now()}`,
      symbol,
      side: trade.side,
      entryPrice: trade.price,
      exitPrice: null, // Will be set when position closes
      quantity: trade.shares,
      pnl: 0,
      pnlPercent: 0,
      timestamp: Date.now(),

      // Context for learning
      thesis,
      sentiment,
      technicals: quant,
      riskScore: risk.score,
      confidence: context.combinedConfidence || 0.5,
      timeframe: '1D',
      marketCondition: regime,
      volatility: parseFloat(mtfAnalysis.timeframes['1H']?.volatility || 50) / 100,
      strategy: 'multi_agent_swarm',
      regime,

      agentReasons: {
        director: thesis,
        quant: quant.strategy,
        sentiment: sentiment.label,
        risk: risk.notes
      },
      debate
    };

    // Store for later closure
    this.portfolio.history.push(tradeRecord);

    this.auditLogger.info(`✅ Trade recorded for learning: ${symbol} ${trade.side.toUpperCase()}`);

    return tradeRecord;
  }

  /**
   * Close a trade and trigger learning
   */
  async closeTrade(symbol, exitPrice) {
    const position = this.portfolio.positions[symbol];
    if (!position) {
      this.auditLogger.warn(`No position found for ${symbol}`);
      return null;
    }

    // Find the trade record
    const tradeRecord = this.portfolio.history.find(
      t => t.symbol === symbol && !t.exitPrice
    );

    if (!tradeRecord) {
      this.auditLogger.warn(`No open trade record found for ${symbol}`);
      return null;
    }

    // Calculate P&L
    const pnl = (exitPrice - tradeRecord.entryPrice) * tradeRecord.quantity;
    const pnlPercent = ((exitPrice - tradeRecord.entryPrice) / tradeRecord.entryPrice) * 100;

    // Update trade record
    tradeRecord.exitPrice = exitPrice;
    tradeRecord.pnl = pnl;
    tradeRecord.pnlPercent = pnlPercent;

    // Update portfolio
    const proceeds = position.shares * exitPrice;
    this.portfolio.cash += proceeds;
    delete this.portfolio.positions[symbol];

    // 🚀 Trigger learning
    await this.learningEngine.recordTrade(tradeRecord);
    this.positionSizer.updateFromTrade(tradeRecord);
    await this.riskSystem.recordTradeResult(tradeRecord);
    await this.analytics.recordTrade(tradeRecord);

    // 🚀 Record in meta-learning system
    if (this.metaLearner && tradeRecord.strategy && tradeRecord.regime) {
      this.metaLearner.recordTrade(
        tradeRecord.strategy,
        tradeRecord.regime,
        {
          win: pnl > 0,
          pnl,
          pnlPercent,
          confidence: tradeRecord.confidence
        }
      );
    }

    this.auditLogger.info(
      `✅ Trade closed: ${symbol} | P&L: ${pnl > 0 ? '+' : ''}$${pnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`
    );

    // 🧠 LIMBIC SIGNAL: Broadcast trade outcome
    if (this.messageBroker) {
        this.messageBroker.publish('trade_closed', {
            symbol,
            pnl,
            pnlPercent,
            win: pnl > 0
        });
    }

    return tradeRecord;
  }

  /**
   * Get advanced stats for dashboard
   */
  getAdvancedStats() {
    const currentRegime = this.regimeDetector.currentRegime || 'UNKNOWN';

    return {
      learning: this.learningEngine.getStats(),
      positioning: this.positionSizer.getStats(),
      regime: {
        current: currentRegime,
        confidence: this.regimeDetector.confidence
      },
      strategyAdjustments: this.regimeDetector.getStrategyAdjustments(),
      risk: this.riskSystem.getStats(),
      economicCalendar: this.economicCalendar.getSummary(),
      metaLearning: this.metaLearner ? this.metaLearner.getSummary(currentRegime) : null
    };
  }

  /**
   * Get upcoming economic events
   */
  getUpcomingEvents(daysAhead = 7) {
    return this.economicCalendar.getUpcoming(daysAhead).map(e =>
      this.economicCalendar.formatEvent(e)
    );
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport() {
    return this.analytics.generateReport();
  }

  /**
   * Run backtest on a strategy
   */
  async runBacktest(symbol, strategyName, strategyFunction, config = {}) {
    return await this.backtestEngine.runBacktest(symbol, strategyName, strategyFunction, config);
  }

    getPortfolioSummary() {

      return {

        cash: this.portfolio.cash,

        positions: this.portfolio.positions,

        total_value: this.portfolio.cash + Object.keys(this.portfolio.positions).reduce((acc, sym) => {

          return acc + (this.portfolio.positions[sym].shares * 150); // Mock current price

        }, 0)

      };

    }

  

    // =========================================================================

    // 🧬 PHASE 7: SELF-EVOLUTION (STRATEGY GENERATION)

    // =========================================================================

  

    /**

     * Check if we need to invent a new strategy

     */

    async _checkStrategyEvolution(regime, mtfAnalysis) {

      if (!this.metaLearner) return;

  

      // Get performance summary

      const summary = this.metaLearner.getSummary(regime);

  

      // If NO enabled strategies for this regime, we need to innovate

      if (summary.strategies.enabled.length === 0 && summary.strategies.learning.length < 2) {

          this.auditLogger.warn(`[Evolution] 🧬 No effective strategies for ${regime} regime. Initiating evolution protocol...`);

          

          await this._evolveStrategy(regime, mtfAnalysis);

      }

    }

  

    async _evolveStrategy(regime, mtfAnalysis) {

      if (!this.quadBrain || !this.toolCreator) return;

  

      const prompt = `

        MARKET REGIME: ${regime}

        CONTEXT: ${JSON.stringify(mtfAnalysis.synthesis)}

        

        PROBLEM:

        SOMA has no effective trading strategies for this specific market condition.

        Current standard strategies (Mean Reversion, Trend Following) are failing or disabled.

        

        TASK:

        Invent a NOVEL, experimental trading strategy code snippet (JavaScript) optimized for ${regime} markets.

        It should use standard indicators (RSI, MACD, Bollinger) but in a unique combination or with dynamic thresholds.

        

        OUTPUT:

        A short description of the strategy and its logic.

      `;

  

      const idea = await this.quadBrain.reason(prompt, 'creative');

      const strategyName = `Strat_${regime}_${Date.now().toString(36).slice(-4)}`;

      

      this.auditLogger.info(`[Evolution] 💡 Concept generated: ${strategyName}`, { idea: idea.text.slice(0, 100) });

  

      // Generate the tool

      const toolDescription = `A trading strategy calculation tool for ${regime} markets. Logic: ${idea.text}`;

      

      try {

          const result = await this.toolCreator.createTool(strategyName, toolDescription);

          if (result.success) {

              this.auditLogger.success(`[Evolution] 🧬 Successfully evolved NEW strategy: ${strategyName}`);

              // In a real system, we would dynamically load this into the BacktestEngine here

          }

      } catch (e) {

          this.auditLogger.error(`[Evolution] Failed to synthesize strategy`, { error: e.message });

      }

    }

  }

  

  export default FinanceAgentArbiter;

  