/**
 * Binance API Routes
 * Real-time crypto market data and trading
 */

import express from 'express';
import binanceService from './BinanceService.js';

const router = express.Router();

// ==================== CONNECTION ====================

/**
 * POST /api/binance/connect
 */
router.post('/connect', async (req, res) => {
    try {
        const { apiKey, secretKey, testnet = true } = req.body;

        if (!apiKey || !secretKey) {
            return res.status(400).json({ success: false, error: 'API Key and Secret Key required' });
        }

        const result = await binanceService.connect(apiKey, secretKey, testnet);
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/binance/disconnect
 */
router.post('/disconnect', (req, res) => {
    binanceService.disconnect();
    res.json({ success: true });
});

/**
 * GET /api/binance/status
 */
router.get('/status', (req, res) => {
    res.json({ success: true, status: binanceService.getStatus() });
});

// ==================== PUBLIC MARKET DATA ====================

/**
 * GET /api/binance/price/:symbol
 */
router.get('/price/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await binanceService.getPrice(symbol.toUpperCase());
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/binance/ticker/:symbol
 */
router.get('/ticker/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await binanceService.get24hTicker(symbol.toUpperCase());
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/binance/orderbook/:symbol
 */
router.get('/orderbook/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 20 } = req.query;
        const orderBook = await binanceService.getOrderBook(symbol.toUpperCase(), parseInt(limit));
        const metrics = binanceService.calculateOrderBookMetrics(orderBook);

        res.json({
            success: true,
            data: {
                ...orderBook,
                metrics
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/binance/klines/:symbol
 */
router.get('/klines/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { interval = '1h', limit = 100 } = req.query;
        const data = await binanceService.getKlines(symbol.toUpperCase(), interval, parseInt(limit));
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/binance/trades/:symbol
 */
router.get('/trades/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { limit = 50 } = req.query;
        const data = await binanceService.getRecentTrades(symbol.toUpperCase(), parseInt(limit));
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== FUTURES DATA ====================

/**
 * GET /api/binance/funding/:symbol
 */
router.get('/funding/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await binanceService.getFundingRate(symbol.toUpperCase());
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/binance/openinterest/:symbol
 */
router.get('/openinterest/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const data = await binanceService.getOpenInterest(symbol.toUpperCase());
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/binance/longshortratio/:symbol
 */
router.get('/longshortratio/:symbol', async (req, res) => {
    try {
        const { symbol } = req.params;
        const { period = '1h', limit = 10 } = req.query;
        const data = await binanceService.getLongShortRatio(symbol.toUpperCase(), period, parseInt(limit));
        res.json({ success: true, data });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== ACCOUNT & TRADING ====================

/**
 * GET /api/binance/account
 */
router.get('/account', async (req, res) => {
    try {
        const data = await binanceService.getAccount();
        res.json({
            success: true,
            data: {
                balances: data.balances?.filter(b => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0),
                canTrade: data.canTrade
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/binance/order
 */
router.post('/order', async (req, res) => {
    try {
        const { symbol, side, type, quantity, price } = req.body;

        if (!symbol || !side || !type || !quantity) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const order = await binanceService.placeOrder(symbol, side, type, quantity, price);
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/binance/futures/order
 */
router.post('/futures/order', async (req, res) => {
    try {
        const { symbol, side, type, quantity, price, leverage } = req.body;

        if (!symbol || !side || !type || !quantity) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const order = await binanceService.placeFuturesOrder(symbol, side, type, quantity, price, leverage);
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * DELETE /api/binance/order/:symbol/:orderId
 */
router.delete('/order/:symbol/:orderId', async (req, res) => {
    try {
        const { symbol, orderId } = req.params;
        const result = await binanceService.cancelOrder(symbol, orderId);
        res.json({ success: true, result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/binance/orders/open
 */
router.get('/orders/open', async (req, res) => {
    try {
        const { symbol } = req.query;
        const orders = await binanceService.getOpenOrders(symbol);
        res.json({ success: true, orders });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== EMERGENCY ====================

/**
 * POST /api/binance/emergency-stop
 * Cancel all orders + close all futures positions
 */
router.post('/emergency-stop', async (req, res) => {
    try {
        console.error('[Binance] *** EMERGENCY STOP TRIGGERED ***');

        if (!binanceService.isConnected) {
            return res.json({
                success: true,
                message: 'Not connected to Binance - no orders to cancel',
                result: { spotOrdersCancelled: 0, futuresOrdersCancelled: 0, futuresPositionsClosed: 0, errors: [] }
            });
        }

        const result = await binanceService.emergencyStop();

        res.json({
            success: true,
            message: 'EMERGENCY STOP: All Binance orders cancelled, futures positions closed',
            result
        });
    } catch (error) {
        console.error('[Binance] Emergency stop error:', error.message);
        res.status(500).json({
            success: false,
            error: `Emergency stop partially failed: ${error.message}`
        });
    }
});

export default router;
