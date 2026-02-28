/**
 * Autonomous Trading API Routes
 * Controls the server-side autonomous trading engine
 */

import express from 'express';
import autonomousTrader from './autonomousTrader.js';

const router = express.Router();

/**
 * POST /api/autonomous/start
 * Start autonomous trading for a symbol
 * Body: { symbol, preset?, config? }
 */
router.post('/start', async (req, res) => {
    try {
        const { symbol, preset, config } = req.body;

        if (!symbol) {
            return res.status(400).json({ success: false, error: 'Symbol is required' });
        }

        const result = await autonomousTrader.start(symbol, preset, config || {});

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json(result);
    } catch (error) {
        console.error('[Autonomous API] Start error:', error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/autonomous/stop
 * Stop autonomous trading
 */
router.post('/stop', (req, res) => {
    try {
        const result = autonomousTrader.stop();
        res.json(result);
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/autonomous/status
 * Get current autonomous trading status
 */
router.get('/status', (req, res) => {
    try {
        const status = autonomousTrader.getStatus();
        res.json({ success: true, ...status });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/autonomous/decisions
 * Get the decision log (why trades were made or skipped)
 * Query: ?limit=50
 */
router.get('/decisions', (req, res) => {
    try {
        const { limit = 50 } = req.query;
        const decisions = autonomousTrader.getDecisions(parseInt(limit));
        res.json({ success: true, decisions, count: decisions.length });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * PUT /api/autonomous/config
 * Update autonomous trader config while running
 * Body: partial config object
 */
router.put('/config', (req, res) => {
    try {
        const config = autonomousTrader.updateConfig(req.body);
        res.json({ success: true, config });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
