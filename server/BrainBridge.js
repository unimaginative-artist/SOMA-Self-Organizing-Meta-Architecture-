/**
 * server/BrainBridge.js
 *
 * Drop-in proxy for system.quadBrain that moves inference to a worker thread.
 *
 * Phase 1 (immediate): calls the real QuadBrain directly on the main thread.
 *   - Available from boot — no delay.
 *   - Falls back to this whenever the worker is unavailable.
 *
 * Phase 2 (after worker ready): routes reason() calls through BrainWorker.cjs.
 *   - Worker thread never blocks the HTTP event loop.
 *   - Main thread only sends/receives lightweight messages.
 *
 * Usage (SomaBootstrapV2.js):
 *   const bridge = new BrainBridge(system.quadBrain);
 *   system.quadBrain = bridge;
 *   bridge.startWorker().catch(err => console.warn('Worker failed:', err.message));
 */

import { Worker } from 'worker_threads';
import { EventEmitter } from 'events';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class BrainBridge extends EventEmitter {
    constructor(directBrain) {
        super();

        // The real QuadBrain instance — always available as fallback
        this._direct = directBrain;

        // Worker state
        this._worker = null;
        this._pending = new Map();   // msgId → { resolve, reject, startTime }
        this._msgId = 0;
        this._useWorker = false;
        this._workerStarting = false;

        // Expose name for logging/status
        this.name = 'BrainBridge';
        this.version = directBrain?.version || '3.0.0-Bridge';

        // Stats
        this._stats = {
            totalCalls: 0,
            workerCalls: 0,
            directCalls: 0,
            errors: 0,
            avgLatencyMs: 0
        };

        console.log('[BrainBridge] Initialized — Phase 1 (direct) active');
    }

    // ── Start the worker thread ────────────────────────────────
    async startWorker(workerData = {}) {
        if (this._workerStarting || this._useWorker) return;
        this._workerStarting = true;

        return new Promise((resolve, reject) => {
            const workerPath = join(__dirname, 'workers', 'BrainWorker.cjs');

            console.log('[BrainBridge] Starting BrainWorker thread...');
            this._worker = new Worker(workerPath, { workerData });

            // Timeout: if worker doesn't become ready in 120s, give up
            const startupTimeout = setTimeout(() => {
                if (!this._useWorker) {
                    console.warn('[BrainBridge] Worker startup timed out — staying on direct brain');
                    this._workerStarting = false;
                    reject(new Error('BrainWorker startup timeout'));
                }
            }, 120_000);

            this._worker.on('message', (msg) => {
                // ── Worker-ready signal ──
                if (msg.type === 'ready') {
                    clearTimeout(startupTimeout);
                    this._useWorker = true;
                    this._workerStarting = false;
                    console.log('[BrainBridge] ✅ Phase 2 active — inference is now non-blocking');
                    this.emit('worker_ready');
                    resolve();
                    return;
                }

                if (msg.type === 'init_error') {
                    clearTimeout(startupTimeout);
                    this._workerStarting = false;
                    console.warn('[BrainBridge] Worker init failed:', msg.error);
                    reject(new Error(msg.error));
                    return;
                }

                // ── Response to pending call ──
                if (msg.id !== undefined) {
                    const pending = this._pending.get(msg.id);
                    if (!pending) return;
                    this._pending.delete(msg.id);

                    const latency = Date.now() - pending.startTime;
                    this._updateLatency(latency);

                    if (msg.type === 'error') {
                        this._stats.errors++;
                        pending.reject(new Error(msg.error));
                    } else {
                        pending.resolve(msg.result);
                    }
                }
            });

            this._worker.on('error', (err) => {
                console.error('[BrainBridge] Worker error:', err.message);
                this._stats.errors++;
                if (!this._useWorker) {
                    clearTimeout(startupTimeout);
                    this._workerStarting = false;
                    reject(err);
                }
            });

            this._worker.on('exit', (code) => {
                this._useWorker = false;
                this._workerStarting = false;
                clearTimeout(startupTimeout);
                console.warn(`[BrainBridge] Worker exited (code ${code}) — falling back to direct brain`);

                // Reject all in-flight requests so they fall back via caller retry
                for (const [id, pending] of this._pending) {
                    pending.reject(new Error('BrainWorker exited unexpectedly'));
                }
                this._pending.clear();

                this.emit('worker_exit', code);
            });
        });
    }

    // ── Main inference call ────────────────────────────────────
    async reason(query, context = {}) {
        this._stats.totalCalls++;
        const startTime = Date.now();

        if (!this._useWorker) {
            // Phase 1: direct call on main thread
            this._stats.directCalls++;
            try {
                const result = await this._direct.reason(query, context);
                this._updateLatency(Date.now() - startTime);
                return result;
            } catch (err) {
                this._stats.errors++;
                throw err;
            }
        }

        // Phase 2: route to worker thread
        this._stats.workerCalls++;
        const id = ++this._msgId;

        return new Promise((resolve, reject) => {
            // Safety: if pending map grows huge, fall back to direct
            if (this._pending.size > 50) {
                console.warn('[BrainBridge] Worker queue full — falling back to direct for this call');
                this._stats.directCalls++;
                this._direct.reason(query, context).then(resolve).catch(reject);
                return;
            }

            this._pending.set(id, { resolve, reject, startTime });
            this._worker.postMessage({ id, type: 'reason', query, context });
        });
    }

    // ── Proxy other QuadBrain methods ──────────────────────────
    async initialize() {
        return this._direct?.initialize?.();
    }

    getStatus() {
        const direct = this._direct?.getStatus?.() ?? {};
        return {
            ...direct,
            name: this.name,
            bridge: {
                useWorker: this._useWorker,
                workerStarting: this._workerStarting,
                pendingCalls: this._pending.size,
                stats: this._stats
            }
        };
    }

    // Delegate everything else to the direct brain
    setPersonality(p) { return this._direct?.setPersonality?.(p); }
    setLimbicState(s) { return this._direct?.setLimbicState?.(s); }
    async handleMessage(envelope) { return this._direct?.handleMessage?.(envelope); }

    // ── Internal helpers ───────────────────────────────────────
    _updateLatency(ms) {
        const n = this._stats.totalCalls;
        this._stats.avgLatencyMs = Math.round(
            (this._stats.avgLatencyMs * (n - 1) + ms) / n
        );
    }

    async shutdown() {
        if (this._worker) {
            await this._worker.terminate();
            this._worker = null;
        }
        this._useWorker = false;
    }
}

export default BrainBridge;
