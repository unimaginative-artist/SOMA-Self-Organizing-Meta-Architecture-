/**
 * loaders/websocket.js - UNIFIED PRODUCTION TELEMETRY
 * 
 * Merges:
 * - Raw WebSocket (Dashboard Metrics)
 * - Socket.IO (CTTerminal Chat)
 * - Kernel Pulse (Single-source truth)
 */

import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../../core/Logger.js';
import { createRequire } from 'module';
import { buildSystemSnapshot, buildPulsePayload } from '../utils/systemState.js';
import { executeCommand } from '../utils/commandRouter.js';
const require = createRequire(import.meta.url);
const { getApprovalSystem } = require('../ApprovalSystem.cjs');

export function setupWebSocket(server, wss, system) {
    console.log('\n[Loader] ⚡ Initializing Unified WebSocket Systems...');

    // 1. Socket.IO (For CTTerminal & Chat Clients)
    // Configure with robust CORS and allow both polling and websocket
    const io = new SocketIOServer(server, {
        path: '/socket.io/',
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            credentials: false
        },
        allowEIO3: true,
        transports: ['polling', 'websocket']
    });

    // ── Full ApprovalSystem (trust learning, pattern memory, persistence) ──
    const approvalSystem = getApprovalSystem();
    approvalSystem.initialize().catch(e => logger.warn('[ApprovalSystem] Init warning:', e.message));
    system.approvalSystem = approvalSystem;

    // ── Lightweight Approval Gate (backwards-compatible for existing routes) ──
    const pendingApprovals = new Map(); // id → { resolve, reject, timer }

    const approvalGate = {
        /**
         * Request approval from the user before executing a risky action.
         * @param {object} opts - { action, type, details, riskScore, trustScore, timeoutMs }
         * @returns {Promise<{ approved: boolean, rememberPattern: boolean }>}
         */
        request(opts = {}) {
            const id = `approval-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
            const timeoutMs = opts.timeoutMs || 60000;
            const riskScore = opts.riskScore ?? 0.5;
            const trustScore = opts.trustScore ?? 0.5;

            const payload = {
                id,
                action: opts.action || 'Unknown action',
                type: opts.type || 'system',
                details: opts.details || {},
                riskScore,
                trustScore,
                expiresAt: Date.now() + timeoutMs
            };

            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    pendingApprovals.delete(id);
                    resolve({ approved: false, reason: 'timeout' });
                }, timeoutMs);

                pendingApprovals.set(id, { resolve, timer });

                // Emit to ALL connected Socket.IO clients
                io.emit('approval_required', payload);
                logger.info(`[Approval] Requested: "${opts.action}" (risk: ${(riskScore * 100).toFixed(0)}%)`);
            });
        },

        /**
         * Calculate risk score for an action.
         */
        scoreRisk(action, type) {
            const dangerous = ['rm ', 'del ', 'rmdir', 'format', 'DROP ', 'DELETE FROM', 'shutdown', 'kill', 'taskkill'];
            const moderate = ['mv ', 'rename', 'chmod', 'npm install', 'pip install', 'git push', 'git reset'];
            const actionLower = (action || '').toLowerCase();

            if (dangerous.some(d => actionLower.includes(d.toLowerCase()))) return 0.9;
            if (moderate.some(m => actionLower.includes(m.toLowerCase()))) return 0.5;
            if (type === 'shell') return 0.4;
            if (type === 'file_delete') return 0.7;
            if (type === 'file_write') return 0.3;
            if (type === 'trade') return 0.8;
            return 0.2;
        }
    };

    io.on('connection', (socket) => {
        logger.info(`[Socket.IO] Client connected: ${socket.id}`);

        socket.on('command', async (data) => {
            const { text } = data;
            const brain = system.quadBrain;
            if (!text || !brain) return;

            socket.emit('thinking', { message: 'Processing...' });
            try {
                // Track conversation history
                if (system.conversationHistory) await system.conversationHistory.addMessage('user', text);

                const result = await brain.reason(text, 'balanced', { source: 'ct_terminal' });
                const response = result.text || result.response || result;

                if (system.conversationHistory) await system.conversationHistory.addMessage('assistant', response);

                socket.emit('response', { text: response, metadata: { confidence: result.confidence || 0.8 } });
            } catch (e) {
                logger.error('[Socket.IO] Processing error:', e.message);
                socket.emit('error', { message: e.message });
            }
        });

        // Handle approval responses from the frontend
        socket.on('approval_response', (data) => {
            const { approvalId, response } = data;

            // Try full ApprovalSystem first (trust learning + persistence)
            if (approvalSystem) {
                const handled = approvalSystem.respondToApproval({
                    requestId: approvalId,
                    approved: response.approved,
                    rememberDecision: response.rememberPattern || false,
                    reason: response.reason || 'user_response'
                });
                if (handled) {
                    logger.info(`[ApprovalSystem] ${response.approved ? 'Approved' : 'Denied'}: ${approvalId}`);
                    return;
                }
            }

            // Fallback to lightweight gate
            const pending = pendingApprovals.get(approvalId);
            if (pending) {
                clearTimeout(pending.timer);
                pendingApprovals.delete(approvalId);
                pending.resolve({
                    approved: response.approved,
                    rememberPattern: response.rememberPattern || false,
                    reason: response.reason || 'user_response'
                });
                logger.info(`[Approval] ${response.approved ? 'Approved' : 'Denied'}: ${approvalId}`);
            }
        });

        socket.on('disconnect', () => {
            logger.info(`[Socket.IO] Client disconnected: ${socket.id}`);
        });
    });

    // 2. Dashboard WebSocket (Standard WS via 'ws' package)
    // Note: 'wss' is already attached to 'server' via launcher_ULTRA.mjs
    const dashboardClients = new Set();

    const broadcast = (type, payload) => {
        const message = JSON.stringify({ type, payload });
        dashboardClients.forEach(client => {
            if (client.readyState === 1) client.send(message);
        });
        io.emit(type, payload);
    };

    approvalSystem.addWebSocketListener((event, data) => broadcast(event, data));

    wss.on('connection', (ws, req) => {
        dashboardClients.add(ws);
        logger.info(`[WS] Dashboard client connected from ${req.socket.remoteAddress}`);

        const snapshot = buildSystemSnapshot(system);
        ws.send(JSON.stringify({
            type: 'init',
            data: {
                status: 'connected',
                ready: snapshot.ready,
                uptime: snapshot.uptime,
                agents: snapshot.agents,
                brainStats: {
                    quadBrain: !!system.quadBrain,
                    totalArbiters: snapshot.agents.length,
                    ready: snapshot.ready
                },
                memory: snapshot.memory
            }
        }));

        ws.on('message', async (message) => {
            let data = null;
            try {
                data = JSON.parse(message);
            } catch (e) {
                logger.warn('[WS] Invalid JSON message');
                return;
            }

            const { type, payload } = data || {};
            if (!type) return;

            try {
                if (type === 'command') {
                    const { action, params } = payload || {};
                    const result = await executeCommand(action, params, system, broadcast);
                    ws.send(JSON.stringify({ type: 'command_result', payload: { action, ...result } }));
                    return;
                }

                if (type === 'agent_control') {
                    const { arbiterName, action } = payload || {};
                    const mappedAction = action === 'restart'
                        ? 'restart_agent'
                        : action === 'terminate'
                            ? 'terminate_agent'
                            : 'toggle_agent';
                    const result = await executeCommand(mappedAction, { name: arbiterName }, system, broadcast);
                    ws.send(JSON.stringify({ type: 'agent_result', payload: { action, arbiterName, ...result } }));
                    return;
                }

                if (type === 'tool_execute') {
                    const toolName = payload?.name;
                    const args = payload?.args || {};
                    if (!toolName) {
                        ws.send(JSON.stringify({ type: 'tool_result', payload: { success: false, error: 'Tool name required' } }));
                        return;
                    }
                    if (!system.toolRegistry?.execute) {
                        ws.send(JSON.stringify({ type: 'tool_result', payload: { success: false, error: 'Tool registry not available' } }));
                        return;
                    }

                    if (system.approvalSystem?.requestApproval) {
                        const classification = system.approvalSystem.classifyTool?.(toolName, args) || { riskType: 'file_execute', riskScore: 0.5 };
                        const approval = await system.approvalSystem.requestApproval({
                            type: classification.riskType,
                            action: `tool:${toolName}`,
                            details: { args, tool: toolName },
                            context: { source: 'ws' },
                            riskOverride: classification.riskScore
                        });
                        if (!approval.approved) {
                            ws.send(JSON.stringify({ type: 'tool_result', payload: { success: false, error: `Denied: ${approval.reason || 'not approved'}` } }));
                            return;
                        }
                    }

                    const result = await system.toolRegistry.execute(toolName, args);
                    ws.send(JSON.stringify({ type: 'tool_result', payload: { success: true, name: toolName, result } }));
                    return;
                }
            } catch (e) {
                logger.error('[WS] Message handling error:', e.message);
                ws.send(JSON.stringify({ type: 'error', payload: { message: e.message } }));
            }
        });

        ws.on('close', () => dashboardClients.delete(ws));
    });

    // 3. Telemetry Pulse (Broadcast Metrics to Dashboard)
    setInterval(() => {
        if (dashboardClients.size === 0) return;

        const snapshot = buildSystemSnapshot(system);
        const metricsPayload = {
            uptime: snapshot.uptime,
            cpu: snapshot.cpu,
            ram: snapshot.ram,
            gpu: snapshot.gpu,
            network: snapshot.network,
            status: snapshot.status,
            agents: snapshot.agents,
            systemDetail: snapshot.systemDetail,
            neuralLoad: snapshot.neuralLoad,
            contextWindow: snapshot.contextWindow,
            counts: snapshot.counts,
            cognitive: snapshot.cognitive
        };
        broadcast('metrics', metricsPayload);
        broadcast('pulse', buildPulsePayload(snapshot));
    }, 2000);

    console.log('      ✅ Socket.IO & WebSocket Manager ready (Unified + Approval Gate)');
    return { io, dashboardClients, approvalGate, broadcast };
}
