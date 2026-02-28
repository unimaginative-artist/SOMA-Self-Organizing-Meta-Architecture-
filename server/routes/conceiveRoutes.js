/**
 * conceiveRoutes.js
 * REST API for Conceive — SOMA's professional audit & finance collaboration module.
 *
 * Tables: conceive_clients, conceive_engagements, conceive_files, conceive_decisions
 *
 * GET    /api/conceive/clients                    — list all clients
 * POST   /api/conceive/clients                    — create client
 * PUT    /api/conceive/clients/:id                — update client
 * DELETE /api/conceive/clients/:id                — delete client
 *
 * GET    /api/conceive/engagements?client_id=     — list engagements (optionally filtered)
 * POST   /api/conceive/engagements                — create engagement
 * PUT    /api/conceive/engagements/:id            — update engagement
 * DELETE /api/conceive/engagements/:id            — delete engagement
 *
 * GET    /api/conceive/files?engagement_id=       — list files for engagement
 * POST   /api/conceive/files                      — attach file record
 * DELETE /api/conceive/files/:id                  — remove file record
 *
 * GET    /api/conceive/decisions?engagement_id=   — decision ledger
 * POST   /api/conceive/decisions                  — add decision node
 *
 * POST   /api/conceive/chat                       — AI assistant (routes to SOMA brain)
 * GET    /api/conceive/stats                      — dashboard stats
 */

import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import fsPromises from 'fs/promises';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();

// ── Database setup ────────────────────────────────────────────────────────────

const dataDir = path.join(process.cwd(), 'data', 'conceive');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'conceive.db'));
db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS conceive_clients (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        name        TEXT NOT NULL,
        industry    TEXT DEFAULT '',
        contact_name  TEXT DEFAULT '',
        contact_email TEXT DEFAULT '',
        notes       TEXT DEFAULT '',
        created_at  INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS conceive_engagements (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id   INTEGER REFERENCES conceive_clients(id) ON DELETE CASCADE,
        title       TEXT NOT NULL,
        type        TEXT DEFAULT 'Audit',
        status      TEXT DEFAULT 'active',
        priority    TEXT DEFAULT 'medium',
        progress    INTEGER DEFAULT 0,
        due_date    TEXT DEFAULT '',
        objective   TEXT DEFAULT '',
        notes       TEXT DEFAULT '',
        created_at  INTEGER DEFAULT (unixepoch()),
        updated_at  INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS conceive_files (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        engagement_id   INTEGER REFERENCES conceive_engagements(id) ON DELETE CASCADE,
        name            TEXT NOT NULL,
        type            TEXT DEFAULT '',
        size            TEXT DEFAULT '',
        soma_summary    TEXT DEFAULT '',
        risk_signals    TEXT DEFAULT '[]',
        relevance_score REAL DEFAULT 0.0,
        created_at      INTEGER DEFAULT (unixepoch())
    );

    CREATE TABLE IF NOT EXISTS conceive_decisions (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        engagement_id   INTEGER REFERENCES conceive_engagements(id) ON DELETE CASCADE,
        title           TEXT NOT NULL,
        rationale       TEXT DEFAULT '',
        confidence      REAL DEFAULT 0.5,
        actor           TEXT DEFAULT 'USER',
        change_type     TEXT DEFAULT 'ADDITION',
        is_conflict     INTEGER DEFAULT 0,
        user_note       TEXT DEFAULT '',
        created_at      INTEGER DEFAULT (unixepoch())
    );
`);

// Prepared statements
const stmts = {
    // clients
    getAllClients:      db.prepare('SELECT * FROM conceive_clients ORDER BY name'),
    insertClient:       db.prepare('INSERT INTO conceive_clients (name, industry, contact_name, contact_email, notes) VALUES (?, ?, ?, ?, ?)'),
    updateClient:       db.prepare('UPDATE conceive_clients SET name=?, industry=?, contact_name=?, contact_email=?, notes=? WHERE id=?'),
    deleteClient:       db.prepare('DELETE FROM conceive_clients WHERE id=?'),

    // engagements
    getAllEngagements:  db.prepare('SELECT e.*, c.name as client_name FROM conceive_engagements e LEFT JOIN conceive_clients c ON c.id = e.client_id ORDER BY e.updated_at DESC'),
    getEngagementsByClient: db.prepare('SELECT * FROM conceive_engagements WHERE client_id=? ORDER BY updated_at DESC'),
    insertEngagement:   db.prepare('INSERT INTO conceive_engagements (client_id, title, type, status, priority, progress, due_date, objective, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
    updateEngagement:   db.prepare('UPDATE conceive_engagements SET title=?, type=?, status=?, priority=?, progress=?, due_date=?, objective=?, notes=?, updated_at=unixepoch() WHERE id=?'),
    deleteEngagement:   db.prepare('DELETE FROM conceive_engagements WHERE id=?'),

    // files
    getFilesByEngagement: db.prepare('SELECT * FROM conceive_files WHERE engagement_id=? ORDER BY created_at DESC'),
    insertFile:         db.prepare('INSERT INTO conceive_files (engagement_id, name, type, size, soma_summary, risk_signals, relevance_score) VALUES (?, ?, ?, ?, ?, ?, ?)'),
    deleteFile:         db.prepare('DELETE FROM conceive_files WHERE id=?'),

    // decisions
    getDecisionsByEngagement: db.prepare('SELECT * FROM conceive_decisions WHERE engagement_id=? ORDER BY created_at DESC'),
    insertDecision:     db.prepare('INSERT INTO conceive_decisions (engagement_id, title, rationale, confidence, actor, change_type, is_conflict, user_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),

    // stats
    statsClients:       db.prepare('SELECT COUNT(*) as count FROM conceive_clients'),
    statsEngagements:   db.prepare("SELECT COUNT(*) as count FROM conceive_engagements WHERE status='active'"),
    statsFiles:         db.prepare('SELECT COUNT(*) as count FROM conceive_files'),
    statsDecisions:     db.prepare('SELECT COUNT(*) as count FROM conceive_decisions'),
};

// ── Clients ───────────────────────────────────────────────────────────────────

router.get('/clients', (req, res) => {
    try {
        res.json({ success: true, clients: stmts.getAllClients.all() });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/clients', (req, res) => {
    try {
        const { name, industry = '', contact_name = '', contact_email = '', notes = '' } = req.body;
        if (!name) return res.status(400).json({ success: false, error: 'name is required' });
        const result = stmts.insertClient.run(name, industry, contact_name, contact_email, notes);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/clients/:id', (req, res) => {
    try {
        const { name, industry = '', contact_name = '', contact_email = '', notes = '' } = req.body;
        stmts.updateClient.run(name, industry, contact_name, contact_email, notes, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/clients/:id', (req, res) => {
    try {
        stmts.deleteClient.run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Engagements ───────────────────────────────────────────────────────────────

router.get('/engagements', (req, res) => {
    try {
        const { client_id } = req.query;
        const rows = client_id
            ? stmts.getEngagementsByClient.all(client_id)
            : stmts.getAllEngagements.all();
        res.json({ success: true, engagements: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/engagements', (req, res) => {
    try {
        const {
            client_id, title, type = 'Audit', status = 'active',
            priority = 'medium', progress = 0, due_date = '',
            objective = '', notes = ''
        } = req.body;
        if (!title) return res.status(400).json({ success: false, error: 'title is required' });
        const result = stmts.insertEngagement.run(client_id || null, title, type, status, priority, progress, due_date, objective, notes);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.put('/engagements/:id', (req, res) => {
    try {
        const {
            title, type = 'Audit', status = 'active',
            priority = 'medium', progress = 0, due_date = '',
            objective = '', notes = ''
        } = req.body;
        stmts.updateEngagement.run(title, type, status, priority, progress, due_date, objective, notes, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/engagements/:id', (req, res) => {
    try {
        stmts.deleteEngagement.run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Files ─────────────────────────────────────────────────────────────────────

router.get('/files', (req, res) => {
    try {
        const { engagement_id } = req.query;
        if (!engagement_id) return res.status(400).json({ success: false, error: 'engagement_id required' });
        const files = stmts.getFilesByEngagement.all(engagement_id).map(f => ({
            ...f,
            risk_signals: JSON.parse(f.risk_signals || '[]'),
        }));
        res.json({ success: true, files });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/files', async (req, res) => {
    try {
        const { engagement_id, name, type = '', size = '' } = req.body;
        if (!engagement_id || !name) return res.status(400).json({ success: false, error: 'engagement_id and name are required' });

        // Ask SOMA brain to analyze the file if system is available
        let soma_summary = '';
        let risk_signals = [];
        let relevance_score = 0.5;

        try {
            const brain = req.app.locals.quadBrain || global.SOMA?.quadBrain || global.SOMA?.brain;
            if (brain?.reason) {
                const prompt = `A file named "${name}" (${type}, ${size}) was uploaded to an audit engagement. In 1-2 sentences, describe what this file likely contains and note any potential audit risks. Format: SUMMARY: <text> | RISK: <comma separated risks or NONE>`;
                const response = await brain.reason(prompt, { mode: 'analytical' });
                const text = typeof response === 'string' ? response : response?.response || '';
                const summaryMatch = text.match(/SUMMARY:\s*(.+?)(?:\s*\|\s*RISK:|$)/s);
                const riskMatch = text.match(/RISK:\s*(.+)/s);
                if (summaryMatch) soma_summary = summaryMatch[1].trim();
                if (riskMatch && riskMatch[1].trim().toUpperCase() !== 'NONE') {
                    risk_signals = riskMatch[1].split(',').map(r => r.trim()).filter(Boolean);
                }
                relevance_score = risk_signals.length > 0 ? 0.8 : 0.5;
            }
        } catch (_) { /* brain not ready — proceed without analysis */ }

        const result = stmts.insertFile.run(engagement_id, name, type, size, soma_summary, JSON.stringify(risk_signals), relevance_score);
        res.json({ success: true, id: result.lastInsertRowid, soma_summary, risk_signals, relevance_score });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.delete('/files/:id', (req, res) => {
    try {
        stmts.deleteFile.run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Decisions ─────────────────────────────────────────────────────────────────

router.get('/decisions', (req, res) => {
    try {
        const { engagement_id } = req.query;
        if (!engagement_id) return res.status(400).json({ success: false, error: 'engagement_id required' });
        res.json({ success: true, decisions: stmts.getDecisionsByEngagement.all(engagement_id) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

router.post('/decisions', (req, res) => {
    try {
        const {
            engagement_id, title, rationale = '', confidence = 0.5,
            actor = 'USER', change_type = 'ADDITION', is_conflict = 0, user_note = ''
        } = req.body;
        if (!engagement_id || !title) return res.status(400).json({ success: false, error: 'engagement_id and title are required' });
        const result = stmts.insertDecision.run(engagement_id, title, rationale, confidence, actor, change_type, is_conflict ? 1 : 0, user_note);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── AI Chat ───────────────────────────────────────────────────────────────────

router.post('/chat', async (req, res) => {
    try {
        const { message, context = {} } = req.body;
        if (!message) return res.status(400).json({ success: false, error: 'message is required' });

        const brain = req.app.locals.quadBrain
            || global.SOMA?.quadBrain
            || global.SOMA?.brain;

        if (!brain?.reason) {
            return res.json({ success: true, response: 'SOMA AI is initializing. Please try again in a moment.' });
        }

        // Build context-aware prompt for audit/finance
        const { engagement_title, client_name, recent_files, recent_decisions, app_context } = context;
        let contextBlock = '';
        if (engagement_title) contextBlock += `Engagement: "${engagement_title}"`;
        if (client_name) contextBlock += ` | Client: ${client_name}`;
        if (recent_files?.length) contextBlock += ` | Recent files: ${recent_files.slice(0, 3).join(', ')}`;
        if (recent_decisions?.length) contextBlock += ` | Recent decisions: ${recent_decisions.slice(0, 2).join('; ')}`;

        const promptParts = ['You are SOMA AI, an expert audit and finance assistant.'];
        if (contextBlock) promptParts.push(`Current context — ${contextBlock}.`);
        if (app_context) promptParts.push(app_context);
        const systemPrompt = promptParts.join(' ');

        const fullMessage = `${systemPrompt}\n\nUser: ${message}`;
        const result = await brain.reason(fullMessage, { mode: 'analytical' });
        const response = typeof result === 'string' ? result : result?.response || result?.answer || JSON.stringify(result);

        res.json({ success: true, response });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── Stats ─────────────────────────────────────────────────────────────────────

router.get('/stats', (req, res) => {
    try {
        res.json({
            success: true,
            stats: {
                clients:          stmts.statsClients.get().count,
                active_engagements: stmts.statsEngagements.get().count,
                files_processed:  stmts.statsFiles.get().count,
                decisions_logged: stmts.statsDecisions.get().count,
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// ── File System API ───────────────────────────────────────────────────────────
// Gives Conceive full read-only access to the local filesystem via the backend.
// The frontend FileSystemBrowser uses these endpoints instead of the browser's
// File System Access API — works in any browser, shows all drives immediately.

const FS_ALLOWED_EXTENSIONS = new Set([
    'xlsx','xls','csv','pdf','png','jpg','jpeg','gif','bmp','webp','tiff',
    'txt','md','json','doc','docx','ppt','pptx','rtf'
]);

const FS_IGNORED_DIRS = new Set([
    'node_modules','.git','dist','build','__pycache__',
    '$Recycle.Bin','System Volume Information','Windows\\WinSxS',
    'AppData\\Local\\Temp','Temp'
]);

// Resolve Windows drives
async function getWindowsDrives() {
    return new Promise((resolve) => {
        exec('wmic logicaldisk get name', (err, stdout) => {
            if (err) {
                // Fallback: try common drives
                const drives = [];
                for (const letter of ['C','D','E','F','G']) {
                    try { fs.accessSync(`${letter}:\\`); drives.push(`${letter}:\\`); } catch(_) {}
                }
                return resolve(drives.length ? drives : ['C:\\']);
            }
            const drives = stdout.split('\n')
                .map(l => l.trim())
                .filter(l => /^[A-Z]:$/.test(l))
                .map(l => `${l}\\`);
            resolve(drives.length ? drives : ['C:\\']);
        });
    });
}

// GET /api/conceive/fs/drives — list available drives
router.get('/fs/drives', async (req, res) => {
    try {
        const drives = await getWindowsDrives();
        const driveInfo = await Promise.all(drives.map(async (d) => {
            try {
                const stat = await fsPromises.stat(d);
                return { path: d, name: d, type: 'drive', accessible: true };
            } catch (_) {
                return { path: d, name: d, type: 'drive', accessible: false };
            }
        }));
        res.json({ success: true, drives: driveInfo.filter(d => d.accessible) });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/conceive/fs/browse?path=C:\Users\barry\Documents
router.get('/fs/browse', async (req, res) => {
    try {
        const { path: dirPath } = req.query;
        if (!dirPath) return res.status(400).json({ success: false, error: 'path required' });

        const resolved = path.resolve(dirPath);
        const entries = await fsPromises.readdir(resolved, { withFileTypes: true });

        const items = [];
        for (const entry of entries) {
            // Skip hidden and system dirs
            if (entry.name.startsWith('.') && entry.name !== '..') continue;
            if (FS_IGNORED_DIRS.has(entry.name)) continue;

            const fullPath = path.join(resolved, entry.name);
            const item = { name: entry.name, path: fullPath, type: entry.isDirectory() ? 'directory' : 'file' };

            if (entry.isFile()) {
                const ext = entry.name.split('.').pop()?.toLowerCase() || '';
                if (!FS_ALLOWED_EXTENSIONS.has(ext)) continue; // Only show relevant files
                item.ext = ext;
                try {
                    const stat = await fsPromises.stat(fullPath);
                    item.size = stat.size;
                    item.modified = stat.mtimeMs;
                } catch (_) {}
            }

            items.push(item);
        }

        // Dirs first, then files sorted by name
        items.sort((a, b) => {
            if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
        });

        res.json({
            success: true,
            path: resolved,
            parent: path.dirname(resolved) !== resolved ? path.dirname(resolved) : null,
            items
        });
    } catch (err) {
        if (err.code === 'EACCES') return res.json({ success: true, path: req.query.path, parent: null, items: [], error: 'Access denied' });
        if (err.code === 'ENOENT') return res.status(404).json({ success: false, error: 'Path not found' });
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/conceive/fs/file?path=...  — stream a file to the browser
router.get('/fs/file', async (req, res) => {
    try {
        const { path: filePath } = req.query;
        if (!filePath) return res.status(400).json({ success: false, error: 'path required' });

        const resolved = path.resolve(filePath);
        const ext = resolved.split('.').pop()?.toLowerCase() || '';

        if (!FS_ALLOWED_EXTENSIONS.has(ext)) {
            return res.status(403).json({ success: false, error: 'File type not permitted' });
        }

        await fsPromises.access(resolved, fs.constants.R_OK);
        const stat = await fsPromises.stat(resolved);

        const mimeTypes = {
            pdf: 'application/pdf',
            xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            xls: 'application/vnd.ms-excel',
            csv: 'text/csv',
            png: 'image/png',
            jpg: 'image/jpeg', jpeg: 'image/jpeg',
            gif: 'image/gif',
            bmp: 'image/bmp',
            webp: 'image/webp',
            tiff: 'image/tiff',
            txt: 'text/plain',
            md: 'text/markdown',
            json: 'application/json',
            doc: 'application/msword',
            docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        };

        res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `inline; filename="${path.basename(resolved)}"`);
        res.setHeader('Cache-Control', 'private, max-age=60');

        fs.createReadStream(resolved).pipe(res);
    } catch (err) {
        if (err.code === 'EACCES') return res.status(403).json({ success: false, error: 'Access denied' });
        if (err.code === 'ENOENT') return res.status(404).json({ success: false, error: 'File not found' });
        res.status(500).json({ success: false, error: err.message });
    }
});

// GET /api/conceive/fs/search?root=C:\Users\barry&query=invoice&ext=xlsx
router.get('/fs/search', async (req, res) => {
    try {
        const { root, query, ext } = req.query;
        if (!root || !query) return res.status(400).json({ success: false, error: 'root and query required' });

        const resolved = path.resolve(root);
        const filterExt = ext ? ext.toLowerCase().split(',') : null;
        const results = [];
        const MAX_RESULTS = 200;

        const walk = async (dir, depth = 0) => {
            if (depth > 8 || results.length >= MAX_RESULTS) return;
            let entries;
            try { entries = await fsPromises.readdir(dir, { withFileTypes: true }); }
            catch (_) { return; }

            for (const entry of entries) {
                if (results.length >= MAX_RESULTS) return;
                if (entry.name.startsWith('.')) continue;
                if (FS_IGNORED_DIRS.has(entry.name)) continue;

                const fullPath = path.join(dir, entry.name);

                if (entry.isDirectory()) {
                    await walk(fullPath, depth + 1);
                } else {
                    const entryExt = entry.name.split('.').pop()?.toLowerCase() || '';
                    if (!FS_ALLOWED_EXTENSIONS.has(entryExt)) continue;
                    if (filterExt && !filterExt.includes(entryExt)) continue;
                    if (!entry.name.toLowerCase().includes(query.toLowerCase())) continue;

                    try {
                        const stat = await fsPromises.stat(fullPath);
                        results.push({
                            name: entry.name,
                            path: fullPath,
                            ext: entryExt,
                            size: stat.size,
                            modified: stat.mtimeMs,
                            dir: dir,
                        });
                    } catch (_) {}
                }
            }
        };

        await walk(resolved);

        results.sort((a, b) => b.modified - a.modified); // Most recently modified first

        res.json({ success: true, results, total: results.length, truncated: results.length >= MAX_RESULTS });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

export default router;
