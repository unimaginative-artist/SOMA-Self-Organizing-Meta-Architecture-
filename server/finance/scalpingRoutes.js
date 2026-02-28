import express from 'express';
import scalpingEngine from './scalpingEngine.js';

const router = express.Router();

router.post('/start', async (req, res) => {
    try {
        const { symbols } = req.body;
        await scalpingEngine.start(symbols);
        res.json({ success: true, message: 'Scalping engine started' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

router.post('/stop', (req, res) => {
    scalpingEngine.stop();
    res.json({ success: true, stats: scalpingEngine.getStats() });
});

router.get('/stats', (req, res) => {
    res.json({ success: true, stats: scalpingEngine.getStats() });
});

router.put('/config', (req, res) => {
    scalpingEngine.config = { ...scalpingEngine.config, ...req.body };
    res.json({ success: true, config: scalpingEngine.config });
});

export default router;
