import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GlobalControls } from './components/GlobalControls.jsx';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';
import { useMarketEngine, MarketMonitor, MarketDeepScan } from './components/MarketRadar.jsx';
import { StrategyBrain } from './components/StrategyBrain.jsx';
import { TradeStream } from './components/TradeStream.jsx';
import { CommandPanel } from './components/CommandPanel.jsx';
import { MainChart } from './components/MainChart.jsx';
import { RiskPanel } from './components/RiskPanel.jsx';
import { AIAnalysisModal } from './components/AIAnalysisModal.jsx';
import { SettingsModal } from './components/SettingsModal.jsx';
import { LearningDashboard } from './components/LearningDashboard.jsx';
import { DemoTrainingPanel } from './components/DemoTrainingPanel.jsx';
import { ManualWorkstation } from './components/ManualWorkstation.jsx'; // Import Manual Mode
import CustomMarketView from './CustomMarketView/CustomMarketView.jsx';
import { TradeMode, AssetType } from './types.js';

import { INITIAL_TICKERS, STRATEGY_PRESETS } from './constants.js';
import './mission-control.css';

const MissionControlApp = ({ somaBackend, isConnected }) => {
    // --- STATE MANAGEMENT ---
    const [mode, setMode] = useState(TradeMode.AUTONOMOUS);
    const [tradingActive, setTradingActive] = useState(false);
    const [selectedSymbol, setSelectedSymbol] = useState('BTC-USD');
    const [assetType, setAssetType] = useState(AssetType.CRYPTO);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
    const [isRadarCollapsed, setIsRadarCollapsed] = useState(false);

    // Demo/Live Mode State
    const [isDemoMode, setIsDemoMode] = useState(true);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [exchangeKeys, setExchangeKeys] = useState(null);
    const [showLearningPanel, setShowLearningPanel] = useState(true);

    // Training State (Lifted from DemoTrainingPanel)
    const [isTraining, setIsTraining] = useState(false);
    const [trainingStats, setTrainingStats] = useState(null);
    const [isTrainingLoading, setIsTrainingLoading] = useState(false);
    const [isTrainingMinimized, setIsTrainingMinimized] = useState(false);

    // Data State
    const [tickers, setTickers] = useState(INITIAL_TICKERS);
    const [activeStrategies, setActiveStrategies] = useState(STRATEGY_PRESETS[1].strategies); // Default to BTC Native
    const [currentPresetId, setCurrentPresetId] = useState('BTC_NATIVE');
    const [trades, setTrades] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [timeframe, setTimeframe] = useState('1Min');
    const [dataSource, setDataSource] = useState('CONNECTING'); // 'REAL' | 'SIMULATION' | 'CONNECTING'

    // Autonomous trading state
    const [autonomousStatus, setAutonomousStatus] = useState(null);

    // Live positions & orders from broker
    const [brokerPositions, setBrokerPositions] = useState([]);
    const [brokerOrders, setBrokerOrders] = useState([]);
    const [liveReadiness, setLiveReadiness] = useState(null); // Paper→live readiness report
    const [marketRegime, setMarketRegime] = useState(null); // MarketRegimeDetector state

    // Risk State (switches between demo and real balances)
    const [riskMetrics, setRiskMetrics] = useState({
        initialBalance: 100000,  // Start with demo balance
        walletBalance: 150000,
        equity: 100000,
        dailyDrawdown: 0,
        maxDrawdownLimit: 5.0,
        netExposure: 0
    });

    // Fetch real account balance from Alpaca when switching to live mode
    const fetchRealBalance = async () => {
        try {
            const res = await fetch('/api/alpaca/account');
            if (res.ok) {
                const data = await res.json();
                if (data.success && data.data) {
                    const acct = data.data.account || {};
                    const equity = parseFloat(acct.equity) || 0;
                    const cash = parseFloat(acct.cash) || 0;
                    setRiskMetrics(prev => ({
                        ...prev,
                        initialBalance: equity,
                        walletBalance: cash,
                        equity: equity
                    }));
                    // Also update positions from account fetch
                    if (data.data.positions) {
                        setBrokerPositions(data.data.positions);
                    }
                }
            }
        } catch (error) {
            console.error('[MissionControl] Failed to fetch real balance:', error);
        }
    };

    // Sync tradingActive with backend state on mount — engine may already be running
    useEffect(() => {
        fetch('/api/autonomous/status')
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data?.isRunning) {
                    setTradingActive(true);
                    setIsTraining(true);
                    console.log('[MissionControl] Synced: autonomous engine already running');
                }
            })
            .catch(() => {}); // Backend offline — stay at default state
    }, []);

    // Poll broker positions & orders when trading is active
    useEffect(() => {
        if (!tradingActive) return;

        const fetchBrokerData = async () => {
            try {
                const [posRes, ordRes] = await Promise.all([
                    fetch('/api/alpaca/account'),
                    fetch('/api/alpaca/orders?status=all&limit=20')
                ]);

                if (posRes.ok) {
                    const posData = await posRes.json();
                    if (posData.success && posData.data?.positions) {
                        setBrokerPositions(posData.data.positions);
                    }
                }

                if (ordRes.ok) {
                    const ordData = await ordRes.json();
                    if (ordData.success && ordData.orders) {
                        setBrokerOrders(ordData.orders);
                    }
                }
            } catch (err) {
                // Silently fail — broker might not be connected
            }
        };

        fetchBrokerData();
        const interval = setInterval(fetchBrokerData, 10000); // Poll every 10s
        return () => clearInterval(interval);
    }, [tradingActive]);

    // Fetch paper→live readiness report periodically
    useEffect(() => {
        const fetchReadiness = async () => {
            try {
                const res = await fetch('/api/learning/report');
                if (res.ok) {
                    const data = await res.json();
                    if (data.success && data.report) {
                        setLiveReadiness(data.report);
                    }
                }
            } catch (err) { /* ignore */ }
        };

        fetchReadiness();
        const interval = setInterval(fetchReadiness, 60000); // Every minute
        return () => clearInterval(interval);
    }, []);

    // Fetch account data immediately on mount (so users see their balance before engaging)
    useEffect(() => {
        fetchRealBalance();
    }, []);

    // Reset chart data when symbol changes so stale data from previous symbol is cleared
    useEffect(() => {
        setChartData([]);
        setDataSource('CONNECTING');
    }, [selectedSymbol]);

    // Fetch market regime from MarketRegimeDetector (if loaded)
    useEffect(() => {
        const fetchRegime = async () => {
            try {
                const res = await fetch(`/api/trading/regime?symbol=${selectedSymbol}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.success) {
                        setMarketRegime(data);
                    }
                }
            } catch (err) { /* ignore — detector may not be loaded */ }
        };

        fetchRegime();
        const interval = setInterval(fetchRegime, 30000); // Every 30s
        return () => clearInterval(interval);
    }, [selectedSymbol]);

    // ENGINE HOOK
    const engine = useMarketEngine(riskMetrics, isDemoMode, tickers, selectedSymbol);

    // Derived State
    const currentTicker = tickers.find(t => t.symbol === selectedSymbol) || tickers[0];
    const filteredTickers = tickers.filter(t => t.type === assetType);
    const marketSentiment = tickers.reduce((acc, t) => acc + t.sentiment, 0) > 0 ? 'BULL' : 'BEAR';

    // PnL Calculation (Restored)
    const symbolPnl = useMemo(() => {
        return trades
            .filter(t => t.symbol === selectedSymbol && t.pnl)
            .reduce((sum, t) => sum + (t.pnl || 0), 0);
    }, [trades, selectedSymbol]);

    // --- REAL-TIME DATA (Alpaca Paper for Demo, Live for Real) ---
    useEffect(() => {
        if (!selectedSymbol) return;

        let intervalId;
        let consecutiveFailures = 0;

        const fetchRealTimeData = async () => {
            // Helper function to update chart and ticker state
            const updateMarketState = (bars) => {
                consecutiveFailures = 0; // Reset on success
                setChartData(bars);
                const latestBar = bars[bars.length - 1];
                if (latestBar) {
                    setTickers(prev => prev.map(t => {
                        if (t.symbol === selectedSymbol) {
                            const prevPrice = t.price || latestBar.open;
                            const change = latestBar.close - prevPrice;
                            return {
                                ...t,
                                price: latestBar.close,
                                change: change,
                                changePercent: (change / prevPrice) * 100
                            };
                        }
                        return t;
                    }));
                }
            };

            // STRATEGY 1: Fetch from SOMA Backend (always try — same origin)
            {
                try {
                    const barsRes = await fetch(`/api/market/bars/${selectedSymbol}?timeframe=${timeframe}&limit=100`);
                    if (barsRes.ok) {
                        const barsData = await barsRes.json();
                        if (barsData.success && barsData.bars && barsData.bars.length > 0) {
                            console.log(`[MarketData] Backend data received for ${selectedSymbol}`);
                            updateMarketState(barsData.bars);
                            setDataSource('REAL');
                            return;
                        }
                    } else {
                        console.warn(`[MarketData] Backend fetch failed: ${barsRes.status}`);
                    }
                } catch (error) {
                    console.warn('[MarketData] Backend unreachable:', error.message);
                }
            }

            // Direct Binance browser calls fail with CORS from localhost - skip to simulation
            consecutiveFailures++;
            if (consecutiveFailures <= 2) {
                console.log("[MarketData] Backend data unavailable. Using simulation.");
            }
            setDataSource('SIMULATION');
            // STRATEGY 3: Simulation (Fallback)
            const basePrice = (currentTicker && currentTicker.price) || 64000;
            const now = Date.now();

            // Simulation Parameters
            const volatility = 0.002; // 0.2% per bar
            const cycleLength = 20; // Bars per trend cycle

            setChartData(prev => {
                let newChart;
                if (prev.length === 0) {
                    // Initialize with History
                    newChart = Array.from({ length: 100 }, (_, i) => {
                        const timeOffset = (100 - i);
                        // Combine Sine Wave (Trend) + Random Walk (Noise)
                        const trend = Math.sin(i / cycleLength) * (basePrice * 0.015);
                        const noise = (Math.random() - 0.5) * (basePrice * volatility * 10);
                        const price = basePrice + trend + noise;

                        return {
                            time: new Date(now - timeOffset * 60000).toLocaleTimeString(),
                            open: price - Math.random() * 50,
                            high: price + Math.random() * 80,
                            low: price - Math.random() * 80,
                            close: price,
                            volume: Math.floor(1000 + Math.random() * 9000 + (Math.abs(trend) * 0.1)) // Volume follows volatility
                        };
                    });
                } else {
                    // Add new bar based on previous close
                    const latest = prev[prev.length - 1];
                    const i = prev.length; // Monotonically increasing index for sine wave

                    // Trend Component (Sine Wave)
                    const trendDelta = (Math.sin(i / cycleLength) - Math.sin((i - 1) / cycleLength)) * (basePrice * 0.015);

                    // Noise Component
                    const noise = (Math.random() - 0.5) * (basePrice * volatility);

                    // Momentum Factor (continue direction with decay)
                    const momentum = (latest.close - latest.open) * 0.3;

                    const newClose = latest.close + trendDelta + noise + momentum;
                    const high = Math.max(latest.close, newClose) + Math.random() * (basePrice * 0.001);
                    const low = Math.min(latest.close, newClose) - Math.random() * (basePrice * 0.001);

                    newChart = [...prev.slice(-99), {
                        time: new Date().toLocaleTimeString(),
                        open: latest.close,
                        high: high,
                        low: low,
                        close: newClose,
                        volume: Math.floor(1000 + Math.random() * 9000)
                    }];
                }

                // Sync tickers with simulation for HUD accuracy
                const lastBar = newChart[newChart.length - 1];
                setTickers(tPrev => tPrev.map(t => {
                    if (t.symbol === selectedSymbol) {
                        return {
                            ...t,
                            price: lastBar.close,
                            change: lastBar.close - lastBar.open,
                            changePercent: ((lastBar.close - lastBar.open) / lastBar.open) * 100
                        };
                    }
                    return t;
                }));

                return newChart;
            });
        };

        // Initial fetch
        fetchRealTimeData();

        // Poll with backoff: 5s normally, slower when backend data is unavailable
        const poll = () => {
            const delay = consecutiveFailures > 2 ? 15000 : 5000; // Back off to 15s after 2 failures
            intervalId = setTimeout(() => {
                fetchRealTimeData().finally(poll);
            }, delay);
        };
        poll();

        return () => clearTimeout(intervalId);
    }, [selectedSymbol, timeframe]);

    // --- AUTONOMOUS TRADING: Poll decisions & status when active ---
    useEffect(() => {
        if (!tradingActive) return;

        let intervalId;

        const fetchAutonomousData = async () => {
            try {
                // 1. Poll autonomous engine status + decisions
                const [statusRes, decisionsRes] = await Promise.allSettled([
                    fetch('/api/autonomous/status'),
                    fetch('/api/autonomous/decisions?limit=30')
                ]);

                let latestDecisions = [];

                if (decisionsRes.status === 'fulfilled' && decisionsRes.value.ok) {
                    const decData = await decisionsRes.value.json();
                    if (decData.success && decData.decisions) {
                        latestDecisions = decData.decisions;
                        // Map autonomous decisions into the trades stream format
                        const tradeDecisions = decData.decisions
                            .filter(d => d.category === 'TRADE' || d.category === 'MANAGE')
                            .map(d => ({
                                id: d.id,
                                timestamp: d.timestamp,
                                symbol: d.symbol,
                                side: d.action === 'BUY' || d.action === 'TAKE_PROFIT' ? 'BUY' : d.action === 'SELL' || d.action === 'STOP_LOSS' ? 'SELL' : d.action,
                                price: d.price || 0,
                                quantity: d.qty || 0,
                                reason: d.reason?.slice(0, 80) || d.category,
                                riskScore: d.confidence ? Math.round(d.confidence * 100) : 0,
                                pnl: d.pnl || 0,
                                status: d.status || d.action
                            }));
                        if (tradeDecisions.length > 0) {
                            setTrades(tradeDecisions);
                        }
                    }
                }

                if (statusRes.status === 'fulfilled' && statusRes.value.ok) {
                    const statusData = await statusRes.value.json();
                    if (statusData.success) {
                        // Attach latest decisions so the HUD Decision Feed can render them
                        statusData._latestDecisions = latestDecisions;
                        setAutonomousStatus(statusData);
                        // Update open positions from autonomous engine
                        if (statusData.openPositions) {
                            setBrokerPositions(statusData.openPositions);
                        }

                        // Live equity update: allocation + unrealized P&L + realized P&L
                        const unrealizedPnl = (statusData.openPositions || []).reduce(
                            (sum, p) => sum + (p.unrealizedPnl || 0), 0
                        );
                        const realizedPnl = statusData.stats?.sessionPnL || 0;
                        setRiskMetrics(prev => ({
                            ...prev,
                            equity: prev.initialBalance + unrealizedPnl + realizedPnl,
                            netExposure: (statusData.openPositions || []).reduce(
                                (sum, p) => sum + (p.marketValue || 0), 0
                            ),
                            dailyDrawdown: Math.max(prev.dailyDrawdown,
                                unrealizedPnl + realizedPnl < 0
                                    ? Math.abs((unrealizedPnl + realizedPnl) / prev.initialBalance) * 100
                                    : 0
                            )
                        }));

                        // Update StrategyBrain agent cards with live confidence from AI swarm
                        if (statusData.agentConfidences) {
                            const ac = statusData.agentConfidences;
                            const totalPnl = unrealizedPnl + realizedPnl;
                            setActiveStrategies(prev => prev.map(s => {
                                let conf = s.confidence;
                                if (s.id === 'tech') conf = Math.round((ac.technical || 0) * 100);
                                else if (s.id === 'director') conf = Math.round((ac.strategy || 0) * 100);
                                else if (s.id === 'risk') conf = Math.round((ac.risk || 0) * 100);
                                else if (s.id === 'strategist') conf = Math.round((ac.strategy || 0) * 100);
                                else if (s.id === 'sentiment') conf = Math.round((ac.sentiment || 0) * 100);
                                return { ...s, confidence: conf, pnl: Math.round(totalPnl * (s.allocation / 100)) };
                            }));
                        }
                    }
                }
            } catch (e) {
                console.error("Autonomous poll error:", e);
            }
        };

        fetchAutonomousData();
        intervalId = setInterval(fetchAutonomousData, 5000); // Poll every 5s

        return () => clearInterval(intervalId);
    }, [tradingActive]);

    // Keep simulation only if NOT connected
    useEffect(() => {
        if (isConnected) return; // Disable simulation when connected

        // Initialize Chart Data (Simulation Fallback)
        const simPrice = (currentTicker && currentTicker.price) || 64000;
        const initialChart = Array.from({ length: 60 }, (_, i) => ({
            time: new Date(Date.now() - (60 - i) * 1000).toLocaleTimeString(),
            open: simPrice,
            high: simPrice * 1.001,
            low: simPrice * 0.999,
            close: simPrice,
            volume: 1000 + Math.random() * 5000,
            prediction: simPrice * (1 + (Math.random() - 0.5) * 0.002)
        }));
        setChartData(initialChart);

        // ... (Original Simulation Logic would go here if we kept it, but clearing it for cleaner file)
    }, [selectedSymbol, isConnected]);


    // Training Logic
    useEffect(() => {
        let interval;
        if (isTraining) {
            const fetchStats = async () => {
                try {
                    const response = await fetch('/api/scalping/stats');
                    const data = await response.json();
                    if (data.success) setTrainingStats(data.stats);
                } catch (error) { console.error('Failed to fetch stats:', error); }
            };
            fetchStats();
            interval = setInterval(fetchStats, 5000);
        }
        return () => clearInterval(interval);
    }, [isTraining]);

    const handleStartTraining = async () => {
        setIsTrainingLoading(true);
        try {
            // 1. Quick Alpaca check with 3s timeout (don't let it hang)
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);
            try {
                const statusRes = await fetch('/api/alpaca/status', { signal: controller.signal });
                clearTimeout(timeout);
                const statusData = await statusRes.json();
                if (!statusData.success || !statusData.status?.connected) {
                    alert('Alpaca not connected! Go to Settings and add your paper trading keys.');
                    return;
                }
            } catch (e) {
                clearTimeout(timeout);
                // Status check timed out or failed — try to start anyway
                console.warn('[MissionControl] Alpaca status check failed, attempting start anyway');
            }

            // 2. Start autonomous engine
            const engageRes = await fetch('/api/autonomous/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ symbol: selectedSymbol, preset: currentPresetId })
            });
            const engageData = await engageRes.json();

            if (!engageData.success && !engageData.error?.includes('Already running')) {
                alert(`Failed to engage: ${engageData.error}`);
                return;
            }

            // 3. Engage the UI immediately
            setTradingActive(true);
            setIsTraining(true);
            console.log('[MissionControl] Paper trading ENGAGED for', selectedSymbol);
        } catch (e) {
            console.error('Start training error:', e);
            alert(`Failed to start paper trading: ${e.message}`);
        } finally {
            setIsTrainingLoading(false);
        }
    };

    const handleStopTraining = async () => {
        setIsTrainingLoading(true);
        try {
            // Stop autonomous engine + sub-engines in parallel
            await Promise.allSettled([
                fetch('/api/autonomous/stop', { method: 'POST' }),
                fetch('/api/scalping/stop', { method: 'POST' }),
                fetch('/api/lowlatency/stop', { method: 'POST' })
            ]);
            setTradingActive(false);
            setIsTraining(false);
            console.log('[MissionControl] Paper trading STOPPED');
        } catch (e) { console.error(e); } finally { setIsTrainingLoading(false); }
    };

    // Training Button Component (Passed to GlobalControls)
    const trainingBrainButton = (isTrainingMinimized && mode !== TradeMode.MANUAL) ? (
        <button
            onClick={() => setIsTrainingMinimized(false)}
            className="w-10 h-10 bg-yellow-400/90 hover:bg-yellow-400 border-2 border-white/20 rounded-xl shadow-lg flex items-center justify-center transition-all hover:scale-110 animate-pulse group"
            title="Restore Training Panel"
        >
            <Activity className="w-5 h-5 text-black group-hover:rotate-12 transition-transform" />
        </button>
    ) : null;

    const handlePresetSelect = (preset) => {
        setCurrentPresetId(preset.id);
        setActiveStrategies(preset.strategies);
    };

    const handleUpdateAllocation = (amount) => {
        setRiskMetrics(prev => ({ ...prev, initialBalance: amount, equity: amount })); // Reset session PnL on rellocation
    };

    const handleUpdateWallet = (amount) => {
        setRiskMetrics(prev => ({ ...prev, walletBalance: amount }));
    };

    const toggleTrading = async () => {
        if (!tradingActive) {
            // START autonomous trading on the server
            try {
                const res = await fetch('/api/autonomous/start', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        symbol: selectedSymbol,
                        preset: currentPresetId
                    })
                });
                const data = await res.json();
                if (data.success || data.error?.includes('Already running')) {
                    // "Already running" means engine is active — just sync the UI
                    setTradingActive(true);
                    setIsTraining(true);
                    console.log('[MissionControl] Autonomous trading ENGAGED for', selectedSymbol);
                } else {
                    alert(`Failed to start: ${data.error}`);
                }
            } catch (e) {
                alert(`Failed to start autonomous trading: ${e.message}`);
            }
        } else {
            // STOP autonomous trading on the server
            try {
                await fetch('/api/autonomous/stop', { method: 'POST' });
            } catch (e) { /* best effort */ }
            setTradingActive(false);
            setIsTraining(false);
            console.log('[MissionControl] Autonomous trading STOPPED');
        }
    };

    const killSwitch = async () => {
        setTradingActive(false);
        try {
            // Stop autonomous engine + hit both brokers in parallel
            const [autonomousResult, alpacaResult, binanceResult] = await Promise.allSettled([
                fetch('/api/autonomous/stop', { method: 'POST' }),
                fetch('/api/alpaca/emergency-stop', { method: 'POST' }).then(r => r.json()),
                fetch('/api/binance/emergency-stop', { method: 'POST' }).then(r => r.json())
            ]);

            const messages = [];
            if (alpacaResult.status === 'fulfilled' && alpacaResult.value.success) {
                messages.push(`Alpaca: ${alpacaResult.value.message}`);
            } else if (alpacaResult.status === 'rejected') {
                messages.push(`Alpaca: Could not reach broker`);
            }
            if (binanceResult.status === 'fulfilled' && binanceResult.value.success) {
                messages.push(`Binance: ${binanceResult.value.message}`);
            } else if (binanceResult.status === 'rejected') {
                messages.push(`Binance: Could not reach broker`);
            }

            setTrades([]);
            alert(`EMERGENCY STOP:\n${messages.join('\n')}`);
        } catch (err) {
            alert(`EMERGENCY STOP: Trading halted locally. Could not reach backend: ${err.message}`);
        }
    };

    const handleModeToggle = async () => {
        if (!isDemoMode) {
            // Switching FROM live TO demo - no confirmation needed
            setIsDemoMode(true);
            setRiskMetrics(prev => ({
                ...prev,
                initialBalance: 100000,
                walletBalance: 150000,
                equity: 100000
            }));

            // Connect to Alpaca Paper API for demo training
            if (exchangeKeys && exchangeKeys.alpaca) {
                try {
                    const response = await fetch('/api/alpaca/connect', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            apiKey: exchangeKeys.alpaca.apiKey,
                            secretKey: exchangeKeys.alpaca.secretKey,
                            paperTrading: true  // ← Demo always uses paper
                        })
                    });
                    const data = await response.json();
                    if (data.success) {
                        console.log('✅ Connected to Alpaca Paper Trading for demo');
                    }
                } catch (error) {
                    console.error('Failed to connect paper trading:', error);
                }
            }
        } else {
            // Switching FROM demo TO live - require confirmation + readiness check
            if (!exchangeKeys) {
                alert('⚠️ You must configure exchange API keys in Settings first!');
                setIsSettingsOpen(true);
                return;
            }

            // Check paper trading readiness report
            let readinessWarning = '';
            try {
                const reportRes = await fetch('/api/learning/report');
                const reportData = await reportRes.json();
                if (reportData.success && reportData.report?.verdict) {
                    const verdict = reportData.report.verdict;
                    setLiveReadiness(reportData.report);

                    if (verdict.recommendation === 'DO_NOT_GO_LIVE') {
                        readinessWarning = '\n\n🚨 SOMA RECOMMENDS: DO NOT GO LIVE\n' +
                            'Issues:\n' + (verdict.issues || []).map(i => `  • ${i}`).join('\n') +
                            '\n\nYou can still proceed, but SOMA has not validated this strategy yet.';
                    } else if (verdict.recommendation === 'CAUTION') {
                        readinessWarning = '\n\n⚠️ SOMA SAYS: PROCEED WITH CAUTION\n' +
                            'Issues:\n' + (verdict.issues || []).map(i => `  • ${i}`).join('\n');
                    } else if (verdict.recommendation === 'GO_LIVE') {
                        readinessWarning = '\n\n✅ SOMA SAYS: STRATEGY VALIDATED\n' +
                            'Strengths:\n' + (verdict.strengths || []).map(s => `  • ${s}`).join('\n');
                    }
                }
            } catch (err) {
                readinessWarning = '\n\n⚠️ Could not fetch readiness report.';
            }

            const confirmed = confirm(
                '⚠️ WARNING: You are about to switch to LIVE TRADING with REAL MONEY.\n\n' +
                'Make sure you understand the risks.' + readinessWarning + '\n\nContinue?'
            );
            if (confirmed) {
                setIsDemoMode(false);
                // Fetch real balance from exchange
                fetchRealBalance();
            }
        }
    };

    const handleSaveKeys = (keys) => {
        setExchangeKeys(keys);
    };

    // MANUAL TRADE EXECUTION HANDLER
    const handleManualExecute = async (tradeOrder) => {
        console.log("MANUAL EXECUTION:", tradeOrder);

        try {
            // Execute trade via backend
            const response = await fetch('/api/finance/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    symbol: tradeOrder.symbol,
                    side: tradeOrder.side,
                    quantity: tradeOrder.quantity,
                    type: tradeOrder.type,
                    price: tradeOrder.price
                })
            });

            const result = await response.json();

            if (result.success) {
                // Add to trades stream with order confirmation
                setTrades(prev => [{
                    id: result.order.id,
                    timestamp: Date.now(),
                    symbol: result.order.symbol,
                    side: result.order.side,
                    price: tradeOrder.price,
                    quantity: result.order.quantity,
                    type: result.order.type,
                    reason: 'MANUAL_EXEC',
                    status: result.order.status,
                    riskScore: 0,
                    pnl: 0
                }, ...prev]);

                alert(`✅ ${result.message}`);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Trade execution failed:', error);
            alert(`❌ Trade execution failed: ${error.message}`);
        }
    };

    return (
        <div className={`flex flex-col h-full bg-transparent text-zinc-200 font-sans overflow-hidden relative ${!isDemoMode ? 'live-trading-mode' : ''
            }`}>

            {/* Live Trading Warning Border */}
            {!isDemoMode && (
                <div className="absolute inset-0 pointer-events-none z-[100] rounded-xl border-4 border-rose-500 animate-pulse-glow" />
            )}

            {/* Demo Training Panel — only show in MANUAL mode (autonomous mode uses ENGAGE button) */}
            {!isTrainingMinimized && mode === TradeMode.MANUAL && (
                <DemoTrainingPanel
                    isDemoMode={isDemoMode}
                    isTraining={isTraining}
                    stats={trainingStats}
                    loading={isTrainingLoading}
                    onStart={handleStartTraining}
                    onStop={handleStopTraining}
                    onMinimize={() => setIsTrainingMinimized(true)}
                />
            )}

            {/* 1. TOP BAR */}
            <GlobalControls
                mode={mode}
                setMode={(newMode) => {
                    console.log("[MissionControl] Switching Mode to:", newMode);
                    setMode(newMode);
                }}
                tradingActive={tradingActive}
                toggleTrading={toggleTrading}
                killSwitch={killSwitch}
                marketSentiment={marketSentiment}
                isDemoMode={isDemoMode}
                onModeToggle={handleModeToggle}
                onOpenSettings={() => setIsSettingsOpen(true)}
                trainingButton={trainingBrainButton}
                marketRegime={marketRegime}
                // Global Asset Controls
                assetType={assetType}
                setAssetType={setAssetType}
                currentSymbol={selectedSymbol}
                onSymbolChange={setSelectedSymbol}
            />

            {/* 2. MAIN WORKSPACE (SWITCHABLE) */}
            {mode === TradeMode.MANUAL ? (
                // MANUAL WORKSTATION LAYOUT
                <div className="flex-1 overflow-hidden bg-black/90 border border-white/5 m-0 relative z-10">
                    <ManualWorkstation
                        tickerData={currentTicker}
                        chartData={chartData}
                        onExecuteTrade={handleManualExecute}
                        accountBalance={riskMetrics.equity}
                        positions={brokerPositions}
                        orders={brokerOrders}
                        // New Props for Navigation
                        assetType={assetType}
                        setAssetType={setAssetType}
                        selectedSymbol={selectedSymbol}
                        setSelectedSymbol={setSelectedSymbol}
                        // Custom View Props
                        dataSource={dataSource}
                        activeProtocol={currentPresetId}
                    />
                </div>
            ) : (
                // AUTONOMOUS (L-SHAPED) LAYOUT
                <div className="flex-1 flex overflow-hidden bg-[#151518]/60 backdrop-blur-md border border-white/5 rounded-xl m-4 mt-0">

                    {/* --- LEFT SIDEBAR (FIXED WIDTH) --- */}
                    <div className="w-[300px] flex flex-col border-r border-white/5 h-full">
                        {/* Strategy Brain OR Learning Dashboard Toggle */}
                        <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
                            {/* Toggle Tabs */}
                            <div className="flex border-b border-white/5 bg-black/20">
                                <button
                                    onClick={() => setShowLearningPanel(false)}
                                    className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${!showLearningPanel
                                        ? 'bg-indigo-500/20 text-indigo-300 border-b-2 border-indigo-500'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    Agents
                                </button>
                                <button
                                    onClick={() => setShowLearningPanel(true)}
                                    className={`flex-1 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-all ${showLearningPanel
                                        ? 'bg-emerald-500/20 text-emerald-300 border-b-2 border-emerald-500'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                        }`}
                                >
                                    Learning
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-hidden">
                                {showLearningPanel ? (
                                    <div className="h-full overflow-y-auto custom-scrollbar p-3">
                                        <LearningDashboard isDemo={isDemoMode} />
                                    </div>
                                ) : (
                                    <StrategyBrain strategies={activeStrategies} />
                                )}
                            </div>
                        </div>
                        {/* Market Monitor (P&L/Storm) - Fixed Height */}
                        <div className="h-[200px] border-t border-white/5 shrink-0">
                            <MarketMonitor engine={engine} />
                        </div>
                    </div>

                    {/* --- RIGHT CONTENT (FLEX) --- */}
                    <div className="flex-1 flex flex-col min-w-0 h-full">

                        {/* TOP GRID (Chart/Command/Risk) */}
                        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-0 min-h-0">
                            {/* Center Col: Chart & Command */}
                            <div className="flex-1 lg:col-span-8 border-r border-white/5 relative flex flex-col min-h-0">
                                {/* Chart Area - Auto resize based on remaining space */}
                                <div className="flex-1 relative border-b border-white/5 transition-all duration-300">
                                    <CustomMarketView selectedSymbol={selectedSymbol} data={chartData} dataSource={dataSource} activeProtocol={currentPresetId} />
                                    {!tradingActive && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20 pointer-events-none">
                                            <div className="text-center p-3 border border-white/10 bg-[#18181b] rounded-lg shadow-2xl pointer-events-auto">
                                                <h2 className="text-xl font-bold text-white mb-1">STANDBY</h2>
                                                <button onClick={toggleTrading} className="px-4 py-1 bg-soma-accent text-black font-bold text-sm rounded hover:bg-cyan-300 transition-colors">
                                                    ENGAGE SYSTEM
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {/* Command Center */}
                                <div className="h-[220px] overflow-hidden">
                                    <CommandPanel
                                        currentSymbol={selectedSymbol}
                                        onSymbolSelect={setSelectedSymbol}
                                        currentPresetId={currentPresetId}
                                        onPresetSelect={handlePresetSelect}
                                        assetType={assetType}
                                        setAssetType={setAssetType}
                                        onAnalyze={() => setIsAnalysisOpen(true)}
                                    />
                                </div>
                            </div>

                            {/* Right Col: Trade Stream & Risk */}
                            <div className="flex-1 lg:col-span-4 flex flex-col h-full overflow-hidden border-t lg:border-t-0 border-white/5">
                                <div className="h-1/2 border-b border-white/5 overflow-hidden">
                                    <TradeStream trades={trades} />
                                </div>
                                <div className="h-1/2 overflow-hidden">
                                    <RiskPanel
                                        metrics={riskMetrics}
                                        onUpdateAllocation={handleUpdateAllocation}
                                        onUpdateWallet={handleUpdateWallet}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* BOTTOM PANEL — Live Trading HUD */}
                        <div className={`border-t border-white/5 bg-[#0a0a0c]/80 overflow-hidden relative transition-all duration-300 ease-in-out ${isRadarCollapsed ? 'h-[32px]' : 'h-[180px] shrink-0'}`}>

                            {/* COLLAPSED STATE */}
                            <div
                                className={`absolute inset-0 flex items-center justify-between px-4 cursor-pointer hover:bg-white/5 transition-all z-50 ${isRadarCollapsed ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                                onClick={() => setIsRadarCollapsed(false)}
                            >
                                <div className="flex items-center gap-3">
                                    <Activity className={`w-4 h-4 ${tradingActive ? 'text-emerald-400 animate-pulse' : 'text-soma-accent'}`} />
                                    <span className="text-xs font-bold text-soma-accent uppercase tracking-widest">
                                        {tradingActive ? 'AUTONOMOUS ENGINE ACTIVE' : 'Trading HUD'}
                                    </span>
                                    {autonomousStatus?.stats && (
                                        <span className="text-[10px] font-mono text-zinc-500">
                                            {autonomousStatus.stats.tradesExecuted} trades | {autonomousStatus.stats.signalsHold} holds
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-500">
                                    <ChevronUp className="w-4 h-4" />
                                </div>
                            </div>

                            {/* EXPANDED: Live Trading HUD */}
                            <div className={`w-full h-full flex transition-opacity duration-300 ${isRadarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

                                {/* Left: Autonomous Status */}
                                <div className="w-[240px] border-r border-white/5 p-3 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Engine</h4>
                                        <button onClick={() => setIsRadarCollapsed(true)} className="p-0.5 rounded hover:bg-white/10 text-zinc-600 hover:text-white">
                                            <ChevronDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className={`flex items-center gap-2 px-2 py-1.5 rounded border ${tradingActive ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-zinc-800/50 border-white/5'}`}>
                                        <div className={`w-2 h-2 rounded-full ${tradingActive ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-600'}`} />
                                        <span className={`text-xs font-bold ${tradingActive ? 'text-emerald-400' : 'text-zinc-500'}`}>
                                            {tradingActive ? 'RUNNING' : 'STANDBY'}
                                        </span>
                                    </div>
                                    {autonomousStatus?.stats && (() => {
                                        const unrealizedPnl = brokerPositions.reduce((sum, p) => sum + (p.unrealizedPnl || parseFloat(p.unrealized_pl) || 0), 0);
                                        const totalPnl = (autonomousStatus.stats.sessionPnL || 0) + unrealizedPnl;
                                        return (
                                        <div className="grid grid-cols-2 gap-1.5">
                                            <div className="bg-black/40 rounded p-1.5 border border-white/5">
                                                <div className="text-[8px] text-zinc-600">TRADES</div>
                                                <div className="text-sm font-mono font-bold text-white">{autonomousStatus.stats.tradesExecuted}</div>
                                            </div>
                                            <div className="bg-black/40 rounded p-1.5 border border-white/5">
                                                <div className="text-[8px] text-zinc-600">TOTAL P&L</div>
                                                <div className={`text-sm font-mono font-bold ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="bg-black/40 rounded p-1.5 border border-white/5">
                                                <div className="text-[8px] text-zinc-600">UNREALIZED</div>
                                                <div className={`text-sm font-mono font-bold ${unrealizedPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {unrealizedPnl >= 0 ? '+' : ''}${unrealizedPnl.toFixed(2)}
                                                </div>
                                            </div>
                                            <div className="bg-black/40 rounded p-1.5 border border-white/5">
                                                <div className="text-[8px] text-zinc-600">ERRORS</div>
                                                <div className={`text-sm font-mono ${autonomousStatus.stats.errors > 0 ? 'text-amber-400' : 'text-zinc-400'}`}>{autonomousStatus.stats.errors}</div>
                                            </div>
                                        </div>
                                        );
                                    })()}
                                </div>

                                {/* Center: Open Positions */}
                                <div className="flex-1 border-r border-white/5 p-3 overflow-y-auto custom-scrollbar">
                                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Open Positions</h4>
                                    {brokerPositions.length === 0 ? (
                                        <div className="flex items-center justify-center h-[100px] text-zinc-600 text-xs italic">No open positions</div>
                                    ) : (
                                        <div className="space-y-1">
                                            {brokerPositions.map((pos, i) => (
                                                <div key={i} className="flex items-center justify-between bg-black/30 rounded px-2 py-1.5 border border-white/5 hover:border-white/10 transition-colors">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[9px] font-bold px-1 py-0.5 rounded ${pos.side === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                                            {(pos.side || 'long').toUpperCase()}
                                                        </span>
                                                        <span className="text-xs font-mono font-bold text-white">{pos.symbol}</span>
                                                        <span className="text-[10px] text-zinc-500">{pos.qty} @ ${pos.entryPrice?.toFixed(2) || pos.avg_entry_price || '—'}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className={`text-xs font-mono font-bold ${(pos.unrealizedPnl || parseFloat(pos.unrealized_pl) || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                            {(pos.unrealizedPnl || parseFloat(pos.unrealized_pl) || 0) >= 0 ? '+' : ''}
                                                            ${(pos.unrealizedPnl || parseFloat(pos.unrealized_pl) || 0).toFixed(2)}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Right: Decision Feed (recent non-trade decisions) */}
                                <div className="w-[320px] p-3 overflow-y-auto custom-scrollbar">
                                    <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Decision Feed</h4>
                                    {(!autonomousStatus || !tradingActive) ? (
                                        <div className="flex items-center justify-center h-[100px] text-zinc-600 text-xs italic">Engage autonomous mode to see decisions</div>
                                    ) : (
                                        <div className="space-y-1">
                                            {(autonomousStatus._latestDecisions || []).slice(0, 8).map((d, i) => (
                                                <div key={i} className="text-[10px] px-2 py-1 rounded bg-black/30 border-l-2" style={{
                                                    borderColor: d.action === 'BUY' ? '#34d399' : d.action === 'SELL' ? '#f87171' : d.action === 'HOLD' ? '#60a5fa' : d.action === 'BLOCKED' || d.action === 'FAIL' ? '#f59e0b' : '#3f3f46'
                                                }}>
                                                    <div className="flex justify-between">
                                                        <span className="font-bold text-zinc-300">{d.category} → {d.action}</span>
                                                        <span className="text-zinc-600">{new Date(d.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <div className="text-zinc-500 truncate">{d.reason}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>

                </div>
            )}

            {/* MODALS */}
            <AIAnalysisModal
                isOpen={isAnalysisOpen}
                onClose={() => setIsAnalysisOpen(false)}
                symbol={selectedSymbol}
                tickerData={currentTicker}
                chartData={chartData}
                allTickers={filteredTickers}
                riskMetrics={riskMetrics}
                presets={STRATEGY_PRESETS}
            />

            <SettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSaveKeys={handleSaveKeys}
            />
        </div>
    );
};

export default MissionControlApp;
