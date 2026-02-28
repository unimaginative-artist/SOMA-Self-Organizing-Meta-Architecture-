/**
 * Debate Arena API Routes
 * Real-time AI trading debates with SSE streaming
 */

import express from 'express';
import { DebateEngine, DEBATE_PERSONALITIES, DEBATE_ACTIONS } from './DebateEngine.js';

const router = express.Router();

// Store for SSE clients
const sseClients = new Map();

// AI Provider - connects to SOMA's existing AI infrastructure
const aiProvider = async (symbol, systemPrompt, userPrompt) => {
    // Try to use SOMA's Kevin/AI system
    try {
        const response = await fetch('http://localhost:3001/api/kevin/think', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                input: userPrompt,
                context: { systemPrompt, symbol, mode: 'debate' }
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.response || data.output || JSON.stringify(data);
        }
    } catch (e) {
        console.log('[Debate] Kevin not available, using fallback');
    }

    // Fallback: Generate structured response based on market data
    return generateFallbackResponse(symbol, userPrompt);
};

// Fallback response generator when AI is not available
// SAFETY: Always returns "hold" with 0 confidence so it can never trigger a real trade
const generateFallbackResponse = (symbol, prompt) => {
    return JSON.stringify({
        action: 'hold',
        confidence: 0,
        reasoning: `[FALLBACK] AI unavailable for ${symbol}. Defaulting to HOLD. No trade should be placed on fallback data.`,
        keyPoints: [
            'AI provider offline - no real analysis performed',
            'Manual review recommended before any action'
        ],
        riskLevel: 'high',
        positionSize: 'none'
    });
};

// Initialize debate engine
const debateEngine = new DebateEngine(aiProvider);

// Setup event listeners for SSE
debateEngine.on('debateStart', (data) => broadcastToSession(data.sessionId, 'debateStart', data));
debateEngine.on('roundStart', (data) => broadcastToSession(data.sessionId, 'roundStart', data));
debateEngine.on('message', (data) => broadcastToSession(data.sessionId, 'message', data));
debateEngine.on('roundEnd', (data) => broadcastToSession(data.sessionId, 'roundEnd', data));
debateEngine.on('votingStart', (data) => broadcastToSession(data.sessionId, 'votingStart', data));
debateEngine.on('vote', (data) => broadcastToSession(data.sessionId, 'vote', data));
debateEngine.on('debateComplete', (data) => broadcastToSession(data.sessionId, 'debateComplete', data));
debateEngine.on('debateError', (data) => broadcastToSession(data.sessionId, 'error', data));

// Broadcast to all SSE clients watching a session
function broadcastToSession(sessionId, event, data) {
    const clients = sseClients.get(sessionId) || [];
    clients.forEach(res => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    });
}

/**
 * GET /api/debate/personalities
 * List available AI personalities
 */
router.get('/personalities', (req, res) => {
    res.json({
        success: true,
        personalities: Object.entries(DEBATE_PERSONALITIES).map(([id, p]) => ({
            id,
            name: p.name,
            emoji: p.emoji,
            color: p.color,
            bias: p.bias
        }))
    });
});

/**
 * POST /api/debate/create
 * Create a new debate session
 */
router.post('/create', (req, res) => {
    try {
        const { symbol, participants, maxRounds } = req.body;

        if (!symbol) {
            return res.status(400).json({ success: false, error: 'Symbol is required' });
        }

        const session = debateEngine.createSession({
            symbol: symbol.toUpperCase(),
            participants: participants || ['bull', 'bear', 'analyst'],
            maxRounds: maxRounds || 3
        });

        res.json({
            success: true,
            session: {
                id: session.id,
                symbol: session.symbol,
                participants: session.participants,
                maxRounds: session.maxRounds,
                status: session.status
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/debate/:sessionId/start
 * Start a debate with market data
 */
router.post('/:sessionId/start', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { marketData } = req.body;

        // Default market data if not provided
        const data = marketData || {
            price: 100,
            change24h: 2.5,
            volume24h: 1000000,
            high24h: 105,
            low24h: 95,
            rsi: 55,
            macd: { value: 0.5, signal: 0.3, histogram: 0.2 },
            ema20: 98,
            ema50: 95,
            support: 90,
            resistance: 110,
            orderBookImbalance: 0.15,
            fundingRate: 0.0001,
            openInterest: 50000000
        };

        // Start debate asynchronously
        debateEngine.startDebate(sessionId, data).catch(err => {
            console.error('[Debate] Error:', err);
        });

        res.json({
            success: true,
            message: 'Debate started',
            sessionId
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/debate/:sessionId/stream
 * SSE endpoint for real-time debate updates
 */
router.get('/:sessionId/stream', (req, res) => {
    const { sessionId } = req.params;

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Add client to session
    if (!sseClients.has(sessionId)) {
        sseClients.set(sessionId, []);
    }
    sseClients.get(sessionId).push(res);

    // Send initial connection event
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({ sessionId })}\n\n`);

    // Cleanup on disconnect
    req.on('close', () => {
        const clients = sseClients.get(sessionId) || [];
        const index = clients.indexOf(res);
        if (index > -1) {
            clients.splice(index, 1);
        }
    });
});

/**
 * GET /api/debate/:sessionId
 * Get debate session details
 */
router.get('/:sessionId', (req, res) => {
    try {
        const { sessionId } = req.params;
        const session = debateEngine.getSession(sessionId);

        if (!session) {
            return res.status(404).json({ success: false, error: 'Session not found' });
        }

        res.json({
            success: true,
            session: {
                id: session.id,
                symbol: session.symbol,
                participants: session.participants,
                maxRounds: session.maxRounds,
                currentRound: session.currentRound,
                status: session.status,
                messages: session.messages,
                votes: session.votes,
                finalDecision: session.finalDecision,
                createdAt: session.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * GET /api/debate/sessions
 * List all debate sessions
 */
router.get('/', (req, res) => {
    try {
        const sessions = debateEngine.listSessions().map(s => ({
            id: s.id,
            symbol: s.symbol,
            status: s.status,
            currentRound: s.currentRound,
            maxRounds: s.maxRounds,
            createdAt: s.createdAt
        }));

        res.json({ success: true, sessions });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * POST /api/debate/:sessionId/cancel
 * Cancel a running debate
 */
router.post('/:sessionId/cancel', (req, res) => {
    try {
        const { sessionId } = req.params;
        debateEngine.cancelDebate(sessionId);
        res.json({ success: true, message: 'Debate cancelled' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
