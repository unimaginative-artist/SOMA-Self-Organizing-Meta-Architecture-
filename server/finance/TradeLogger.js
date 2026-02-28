/**
 * TradeLogger - SQLite-backed trade persistence
 *
 * Records every trade entry/exit with:
 * - Fill prices and slippage
 * - P&L (realized)
 * - Strategy that generated the trade
 * - Market regime at time of trade
 * - Daily equity snapshots for equity curve
 *
 * Uses better-sqlite3 for synchronous, high-performance writes.
 */

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

class TradeLogger {
    constructor(dbPath = null) {
        const dataDir = path.join(process.cwd(), 'data', 'trading');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.dbPath = dbPath || path.join(dataDir, 'trades.db');
        this.db = null;
        this._stmts = {};
    }

    /**
     * Initialize database and create tables
     */
    initialize() {
        this.db = new Database(this.dbPath);
        this.db.pragma('journal_mode = WAL'); // Better concurrent read performance
        this.db.pragma('synchronous = NORMAL');

        // Create trades table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS trades (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_id TEXT,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                qty REAL NOT NULL,
                entry_price REAL,
                exit_price REAL,
                filled_price REAL,
                expected_price REAL,
                slippage_pct REAL,
                pnl REAL,
                pnl_pct REAL,
                strategy TEXT DEFAULT 'manual',
                regime TEXT,
                status TEXT DEFAULT 'open',
                entry_time TEXT,
                exit_time TEXT,
                exit_reason TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // Create daily snapshots table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS daily_snapshots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                date TEXT UNIQUE NOT NULL,
                equity REAL NOT NULL,
                cash REAL,
                positions_count INTEGER,
                daily_pnl REAL,
                daily_trades INTEGER,
                cumulative_pnl REAL,
                max_drawdown_pct REAL,
                win_rate REAL,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        // Create indexes
        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_trades_symbol ON trades(symbol);
            CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
            CREATE INDEX IF NOT EXISTS idx_trades_strategy ON trades(strategy);
            CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON trades(entry_time);
            CREATE INDEX IF NOT EXISTS idx_snapshots_date ON daily_snapshots(date);
        `);

        // Create learning events table
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS learning_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                description TEXT,
                strategy TEXT,
                metric_name TEXT,
                old_value REAL,
                new_value REAL,
                trigger_reason TEXT,
                created_at TEXT DEFAULT (datetime('now'))
            )
        `);

        this.db.exec(`
            CREATE INDEX IF NOT EXISTS idx_learning_events_type ON learning_events(event_type);
            CREATE INDEX IF NOT EXISTS idx_learning_events_created ON learning_events(created_at);
        `);

        // Prepare statements for performance
        this._stmts.insertTrade = this.db.prepare(`
            INSERT INTO trades (order_id, symbol, side, qty, entry_price, filled_price, expected_price, slippage_pct, strategy, regime, status, entry_time)
            VALUES (@order_id, @symbol, @side, @qty, @entry_price, @filled_price, @expected_price, @slippage_pct, @strategy, @regime, 'open', @entry_time)
        `);

        this._stmts.closeTrade = this.db.prepare(`
            UPDATE trades SET
                exit_price = @exit_price,
                pnl = @pnl,
                pnl_pct = @pnl_pct,
                status = 'closed',
                exit_time = @exit_time,
                exit_reason = @exit_reason
            WHERE id = @id
        `);

        this._stmts.insertSnapshot = this.db.prepare(`
            INSERT OR REPLACE INTO daily_snapshots (date, equity, cash, positions_count, daily_pnl, daily_trades, cumulative_pnl, max_drawdown_pct, win_rate)
            VALUES (@date, @equity, @cash, @positions_count, @daily_pnl, @daily_trades, @cumulative_pnl, @max_drawdown_pct, @win_rate)
        `);

        console.log('[TradeLogger] SQLite initialized at', this.dbPath);
    }

    /**
     * Log a trade entry
     */
    logTradeEntry(trade) {
        if (!this.db) return null;

        const result = this._stmts.insertTrade.run({
            order_id: trade.orderId || null,
            symbol: trade.symbol,
            side: trade.side,
            qty: trade.qty,
            entry_price: trade.entryPrice || trade.filledPrice || 0,
            filled_price: trade.filledPrice || null,
            expected_price: trade.expectedPrice || null,
            slippage_pct: trade.slippagePct || null,
            strategy: trade.strategy || 'manual',
            regime: trade.regime || null,
            entry_time: new Date().toISOString()
        });

        return result.lastInsertRowid;
    }

    /**
     * Log a trade exit (close an open trade)
     */
    logTradeExit(tradeIdOrSymbol, exitData) {
        if (!this.db) return;

        let tradeId = tradeIdOrSymbol;

        // If passed a symbol, find the most recent open trade for it
        if (typeof tradeIdOrSymbol === 'string' && isNaN(tradeIdOrSymbol)) {
            const openTrade = this.db.prepare(
                `SELECT id, entry_price, qty FROM trades WHERE symbol = ? AND status = 'open' ORDER BY id DESC LIMIT 1`
            ).get(tradeIdOrSymbol);

            if (!openTrade) {
                console.warn(`[TradeLogger] No open trade found for ${tradeIdOrSymbol}`);
                return;
            }
            tradeId = openTrade.id;

            // Auto-calculate PnL if not provided
            if (exitData.exitPrice && !exitData.pnl) {
                const side = this.db.prepare(`SELECT side FROM trades WHERE id = ?`).get(tradeId)?.side;
                const multiplier = side === 'buy' ? 1 : -1;
                exitData.pnl = (exitData.exitPrice - openTrade.entry_price) * openTrade.qty * multiplier;
                exitData.pnlPct = ((exitData.exitPrice - openTrade.entry_price) / openTrade.entry_price) * 100 * multiplier;
            }
        }

        this._stmts.closeTrade.run({
            id: tradeId,
            exit_price: exitData.exitPrice || 0,
            pnl: exitData.pnl || 0,
            pnl_pct: exitData.pnlPct || 0,
            exit_time: new Date().toISOString(),
            exit_reason: exitData.reason || 'manual'
        });
    }

    /**
     * Save daily equity snapshot
     */
    saveDailySnapshot(snapshot) {
        if (!this.db) return;

        const today = new Date().toISOString().split('T')[0];
        const stats = this.getStats();

        this._stmts.insertSnapshot.run({
            date: snapshot.date || today,
            equity: snapshot.equity || 0,
            cash: snapshot.cash || 0,
            positions_count: snapshot.positionsCount || 0,
            daily_pnl: snapshot.dailyPnl || 0,
            daily_trades: stats.totalTrades || 0,
            cumulative_pnl: stats.totalPnl || 0,
            max_drawdown_pct: snapshot.maxDrawdownPct || 0,
            win_rate: stats.winRate || 0
        });
    }

    /**
     * Get all closed trades (for performance calculation)
     */
    getClosedTrades(days = null) {
        if (!this.db) return [];

        let query = `SELECT * FROM trades WHERE status = 'closed'`;
        const params = [];

        if (days) {
            query += ` AND exit_time >= datetime('now', ?)`;
            params.push(`-${days} days`);
        }

        query += ` ORDER BY exit_time ASC`;
        return this.db.prepare(query).all(...params);
    }

    /**
     * Get open trades
     */
    getOpenTrades() {
        if (!this.db) return [];
        return this.db.prepare(`SELECT * FROM trades WHERE status = 'open' ORDER BY entry_time DESC`).all();
    }

    /**
     * Get aggregate stats
     */
    getStats(days = null) {
        if (!this.db) return this._emptyStats();

        const trades = this.getClosedTrades(days);
        if (trades.length === 0) return this._emptyStats();

        const wins = trades.filter(t => t.pnl > 0);
        const losses = trades.filter(t => t.pnl <= 0);
        const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const totalProfit = wins.reduce((sum, t) => sum + t.pnl, 0);
        const totalLoss = losses.reduce((sum, t) => sum + Math.abs(t.pnl), 0);

        return {
            totalTrades: trades.length,
            wins: wins.length,
            losses: losses.length,
            winRate: trades.length > 0 ? (wins.length / trades.length * 100) : 0,
            totalPnl,
            totalProfit,
            totalLoss,
            avgWin: wins.length > 0 ? totalProfit / wins.length : 0,
            avgLoss: losses.length > 0 ? totalLoss / losses.length : 0,
            profitFactor: totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0,
            largestWin: wins.length > 0 ? Math.max(...wins.map(t => t.pnl)) : 0,
            largestLoss: losses.length > 0 ? Math.min(...losses.map(t => t.pnl)) : 0,
            avgSlippage: trades.filter(t => t.slippage_pct != null).length > 0
                ? trades.filter(t => t.slippage_pct != null).reduce((sum, t) => sum + t.slippage_pct, 0) / trades.filter(t => t.slippage_pct != null).length
                : 0
        };
    }

    /**
     * Get stats by strategy
     */
    getStatsByStrategy() {
        if (!this.db) return [];

        return this.db.prepare(`
            SELECT
                strategy,
                COUNT(*) as total_trades,
                SUM(CASE WHEN pnl > 0 THEN 1 ELSE 0 END) as wins,
                SUM(CASE WHEN pnl <= 0 THEN 1 ELSE 0 END) as losses,
                ROUND(SUM(pnl), 2) as total_pnl,
                ROUND(AVG(pnl), 2) as avg_pnl,
                ROUND(AVG(CASE WHEN pnl > 0 THEN pnl END), 2) as avg_win,
                ROUND(AVG(CASE WHEN pnl <= 0 THEN pnl END), 2) as avg_loss
            FROM trades
            WHERE status = 'closed'
            GROUP BY strategy
            ORDER BY total_pnl DESC
        `).all();
    }

    /**
     * Get daily equity curve
     */
    getEquityCurve(days = 30) {
        if (!this.db) return [];

        return this.db.prepare(`
            SELECT * FROM daily_snapshots
            WHERE date >= date('now', ?)
            ORDER BY date ASC
        `).all(`-${days} days`);
    }

    /**
     * Get recent trades
     */
    getRecentTrades(limit = 20) {
        if (!this.db) return [];

        return this.db.prepare(`
            SELECT * FROM trades
            ORDER BY COALESCE(exit_time, entry_time) DESC
            LIMIT ?
        `).all(limit);
    }

    // ═══════════════════════════════════════════════════════════
    // LEARNING EVENTS
    // ═══════════════════════════════════════════════════════════

    /**
     * Log a learning event (strategy adjustment, parameter change, etc.)
     */
    logLearningEvent({ eventType, description, strategy = null, metricName = null, oldValue = null, newValue = null, triggerReason = null }) {
        if (!this.db) return null;

        try {
            const stmt = this.db.prepare(`
                INSERT INTO learning_events (event_type, description, strategy, metric_name, old_value, new_value, trigger_reason)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `);
            const result = stmt.run(eventType, description, strategy, metricName, oldValue, newValue, triggerReason);
            return result.lastInsertRowid;
        } catch (err) {
            console.warn('[TradeLogger] Failed to log learning event:', err.message);
            return null;
        }
    }

    /**
     * Get recent learning events
     */
    getLearningEvents(limit = 10) {
        if (!this.db) return [];
        return this.db.prepare(`
            SELECT * FROM learning_events ORDER BY created_at DESC LIMIT ?
        `).all(limit);
    }

    /**
     * Get learning events by type
     */
    getLearningEventsByType(eventType, limit = 20) {
        if (!this.db) return [];
        return this.db.prepare(`
            SELECT * FROM learning_events WHERE event_type = ? ORDER BY created_at DESC LIMIT ?
        `).all(eventType, limit);
    }

    _emptyStats() {
        return {
            totalTrades: 0, wins: 0, losses: 0, winRate: 0,
            totalPnl: 0, totalProfit: 0, totalLoss: 0,
            avgWin: 0, avgLoss: 0, profitFactor: 0,
            largestWin: 0, largestLoss: 0, avgSlippage: 0
        };
    }

    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }
}

// Singleton
const tradeLogger = new TradeLogger();
export default tradeLogger;
