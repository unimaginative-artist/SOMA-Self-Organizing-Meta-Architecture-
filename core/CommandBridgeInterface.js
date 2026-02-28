/**
 * CommandBridgeInterface.js
 *
 * Gives SOMA full access to her Command Bridge dashboard.
 * She can query her own state and control the UI to show users things.
 *
 * This is SOMA's self-awareness - she can inspect herself and guide users.
 */

import fetch from 'node-fetch';
import { logger } from './Logger.js';

export class CommandBridgeInterface {
    constructor(baseUrl = 'http://localhost:3001', messageBroker = null) {
        this.baseUrl = baseUrl;
        this.messageBroker = messageBroker;
    }

    // ═══════════════════════════════════════════════════════════
    // READ ACCESS - Query System State
    // ═══════════════════════════════════════════════════════════

    /**
     * Get current system metrics (CPU, GPU, RAM, uptime)
     */
    async getSystemMetrics() {
        try {
            const res = await fetch(`${this.baseUrl}/api/status`);
            const data = await res.json();
            return data;
        } catch (e) {
            logger.error('[CommandBridge] Failed to get system metrics:', e.message);
            return null;
        }
    }

    /**
     * Get all arbiters and their health status
     */
    async getArbiters() {
        try {
            const res = await fetch(`${this.baseUrl}/api/population`);
            const data = await res.json();
            return data.agents || [];
        } catch (e) {
            logger.error('[CommandBridge] Failed to get arbiters:', e.message);
            return [];
        }
    }

    /**
     * Get shadow clone status
     */
    async getShadowClones() {
        try {
            const res = await fetch(`${this.baseUrl}/api/balancer/stats`);
            const data = await res.json();
            return data.stats || null;
        } catch (e) {
            logger.error('[CommandBridge] Failed to get shadow clones:', e.message);
            return null;
        }
    }

    /**
     * Get daemon/subconscious status
     */
    async getDaemonStatus() {
        try {
            const res = await fetch(`${this.baseUrl}/api/daemon/status`);
            const data = await res.json();
            return data.daemon || null;
        } catch (e) {
            logger.error('[CommandBridge] Failed to get daemon status:', e.message);
            return null;
        }
    }

    /**
     * Get memory tier statistics
     */
    async getMemoryStatus() {
        try {
            const res = await fetch(`${this.baseUrl}/api/memory/status`);
            const data = await res.json();
            return data;
        } catch (e) {
            logger.error('[CommandBridge] Failed to get memory status:', e.message);
            return null;
        }
    }

    /**
     * Get active goals
     */
    async getActiveGoals() {
        try {
            const res = await fetch(`${this.baseUrl}/api/goals/active`);
            const data = await res.json();
            return data.goals || [];
        } catch (e) {
            logger.error('[CommandBridge] Failed to get active goals:', e.message);
            return [];
        }
    }

    /**
     * Get current beliefs
     */
    async getBeliefs() {
        try {
            const res = await fetch(`${this.baseUrl}/api/beliefs`);
            const data = await res.json();
            return data.beliefs || [];
        } catch (e) {
            logger.error('[CommandBridge] Failed to get beliefs:', e.message);
            return [];
        }
    }

    /**
     * Get learning velocity metrics
     */
    async getLearningVelocity() {
        try {
            const res = await fetch(`${this.baseUrl}/api/velocity/status`);
            const data = await res.json();
            return data;
        } catch (e) {
            logger.error('[CommandBridge] Failed to get learning velocity:', e.message);
            return null;
        }
    }

    // ═══════════════════════════════════════════════════════════
    // CONTROL ACCESS - Send Commands
    // ═══════════════════════════════════════════════════════════

    /**
     * Run system diagnostics
     */
    async runDiagnostics() {
        if (this.messageBroker) {
            this.messageBroker.publish('command.execute', {
                action: 'run_diagnostics',
                source: 'soma_self',
                timestamp: Date.now()
            });
            return { success: true, message: 'Diagnostics started' };
        }
        return { success: false, message: 'No message broker available' };
    }

    /**
     * Clear memory cache
     */
    async clearCache() {
        if (this.messageBroker) {
            this.messageBroker.publish('command.execute', {
                action: 'clear_cache',
                source: 'soma_self',
                timestamp: Date.now()
            });
            return { success: true, message: 'Cache cleared' };
        }
        return { success: false, message: 'No message broker available' };
    }

    /**
     * Optimize system
     */
    async optimizeSystem() {
        if (this.messageBroker) {
            this.messageBroker.publish('command.execute', {
                action: 'optimize_system',
                source: 'soma_self',
                timestamp: Date.now()
            });
            return { success: true, message: 'Optimization triggered' };
        }
        return { success: false, message: 'No message broker available' };
    }

    // ═══════════════════════════════════════════════════════════
    // UI CONTROL - Navigate and Highlight
    // ═══════════════════════════════════════════════════════════

    /**
     * Navigate to a specific tab in the Command Bridge
     * @param {string} module - 'core', 'command', 'terminal', 'orb', 'knowledge', 'analytics', 'security', 'kevin'
     */
    navigateToTab(module) {
        if (this.messageBroker) {
            this.messageBroker.publish('ui.navigate', {
                module,
                timestamp: Date.now()
            });
            logger.info(`[CommandBridge] Navigating UI to: ${module}`);
        }
    }

    /**
     * Highlight a specific component to draw user attention
     * @param {string} component - Component name like 'ShadowCloneMonitor', 'SystemStatus', etc.
     */
    highlightComponent(component) {
        if (this.messageBroker) {
            this.messageBroker.publish('ui.highlight', {
                component,
                timestamp: Date.now()
            });
            logger.info(`[CommandBridge] Highlighting component: ${component}`);
        }
    }

    /**
     * Scroll to a specific section
     * @param {string} target - Target element ID
     */
    scrollTo(target) {
        if (this.messageBroker) {
            this.messageBroker.publish('ui.scroll', {
                target,
                timestamp: Date.now()
            });
            logger.info(`[CommandBridge] Scrolling to: ${target}`);
        }
    }

    /**
     * Open a modal
     * @param {string} modal - Modal name like 'ProcessMonitor'
     */
    openModal(modal) {
        if (this.messageBroker) {
            this.messageBroker.publish('ui.modal', {
                modal,
                action: 'open',
                timestamp: Date.now()
            });
            logger.info(`[CommandBridge] Opening modal: ${modal}`);
        }
    }

    /**
     * Show a notification/toast to the user
     * @param {string} message - Message to display
     * @param {string} type - 'info', 'success', 'warning', 'error'
     */
    notify(message, type = 'info') {
        if (this.messageBroker) {
            this.messageBroker.publish('ui.notify', {
                message,
                type,
                timestamp: Date.now()
            });
            logger.info(`[CommandBridge] Notification: ${message}`);
        }
    }

    /**
     * Point to a specific location with visual indicator
     * @param {number} x - X coordinate
     * @param {number} y - Y coordinate
     * @param {string} label - Label text
     */
    pointAt(x, y, label) {
        if (this.messageBroker) {
            this.messageBroker.publish('ui.point', {
                x,
                y,
                label,
                timestamp: Date.now()
            });
            logger.info(`[CommandBridge] Pointing at (${x}, ${y}): ${label}`);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // HELPER METHODS - Common Workflows
    // ═══════════════════════════════════════════════════════════

    /**
     * Show user the shadow clone status
     */
    async showShadowClones() {
        this.navigateToTab('core');
        await new Promise(resolve => setTimeout(resolve, 300)); // Wait for navigation
        this.highlightComponent('ShadowCloneMonitor');
        const stats = await this.getShadowClones();
        return stats;
    }

    /**
     * Show user their learning velocity
     */
    async showLearningVelocity() {
        this.navigateToTab('core');
        await new Promise(resolve => setTimeout(resolve, 300));
        this.highlightComponent('LearningVelocityDashboard');
        const velocity = await this.getLearningVelocity();
        return velocity;
    }

    /**
     * Show system health overview
     */
    async showSystemHealth() {
        this.navigateToTab('core');
        await new Promise(resolve => setTimeout(resolve, 300));
        this.highlightComponent('SystemStatus');
        const metrics = await this.getSystemMetrics();
        return metrics;
    }

    /**
     * Show process monitor (task manager)
     */
    showProcessMonitor() {
        this.openModal('ProcessMonitor');
    }

    /**
     * Comprehensive system summary for SOMA's self-awareness
     */
    async getSelfAwareness() {
        const [metrics, arbiters, clones, daemon, memory, goals, beliefs, velocity] = await Promise.all([
            this.getSystemMetrics(),
            this.getArbiters(),
            this.getShadowClones(),
            this.getDaemonStatus(),
            this.getMemoryStatus(),
            this.getActiveGoals(),
            this.getBeliefs(),
            this.getLearningVelocity()
        ]);

        return {
            metrics,
            arbiters: {
                total: arbiters.length,
                active: arbiters.filter(a => a.status === 'active').length,
                list: arbiters
            },
            shadowClones: clones,
            daemon,
            memory,
            goals: {
                total: goals.length,
                list: goals
            },
            beliefs: {
                total: beliefs.length,
                list: beliefs
            },
            velocity
        };
    }
}
