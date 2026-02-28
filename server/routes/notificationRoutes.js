import express from 'express';
import notificationService from '../services/NotificationService.js';

const router = express.Router();

router.get('/settings', (req, res) => {
    res.json({ success: true, settings: notificationService.getSettings() });
});

router.post('/settings', (req, res) => {
    const { discordWebhookUrl } = req.body;
    const success = notificationService.saveSettings({ discordWebhookUrl });
    res.json({ success });
});

export default router;
