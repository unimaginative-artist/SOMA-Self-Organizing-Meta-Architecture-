/**
 * Notification Service
 * Sends alerts to external services (Discord)
 */

import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), '.soma', 'notifications.json');

class NotificationService {
    constructor() {
        this.settings = {
            discordWebhookUrl: null
        };
        this.loadSettings();
    }

    loadSettings() {
        try {
            if (fs.existsSync(SETTINGS_FILE)) {
                const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
                this.settings = JSON.parse(data);
            }
        } catch (e) {
            console.error('[Notifications] Failed to load settings:', e.message);
        }
    }

    saveSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        try {
            const dir = path.dirname(SETTINGS_FILE);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
            return true;
        } catch (e) {
            console.error('[Notifications] Failed to save settings:', e.message);
            return false;
        }
    }

    getSettings() {
        return this.settings;
    }

    /**
     * Send a Discord webhook for a closed trade
     * @param {object} trade - The closed trade object
     */
    async sendTradeNotification(trade) {
        if (!this.settings.discordWebhookUrl) return;

        try {
            const isProfit = trade.pnl > 0;
            const embed = {
                title: `✅ Trade Closed: ${trade.symbol}`,
                color: isProfit ? 3581519 : 13632027, // Green or Red
                fields: [
                    { name: "Side", value: trade.side.toUpperCase(), inline: true },
                    { name: "Quantity", value: `${trade.qty}`, inline: true },
                    { name: "P&L", value: `$${trade.pnl.toFixed(2)} (${trade.pnlPct.toFixed(2)}%)`, inline: true },
                    { name: "Entry Price", value: `$${trade.entryPrice.toFixed(2)}`, inline: true },
                    { name: "Exit Price", value: `$${trade.exitPrice.toFixed(2)}`, inline: true },
                    { name: "Reason", value: trade.reason, inline: true }
                ],
                timestamp: new Date().toISOString()
            };

            await fetch(this.settings.discordWebhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed] })
            });
        } catch (e) {
            console.error('[Notifications] Discord webhook failed:', e.message);
        }
    }
}

const notificationService = new NotificationService();
export default notificationService;
