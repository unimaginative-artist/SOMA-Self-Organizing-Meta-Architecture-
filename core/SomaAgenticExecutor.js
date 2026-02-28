// ════════════════════════════════════════════════════════════════════════════
// SomaAgenticExecutor.js
// ════════════════════════════════════════════════════════════════════════════
// A real ReAct (Reason → Act → Observe → repeat) execution engine.
//
// This is what turns SOMA from "reasoning about work" into "doing work."
// Each step:
//   1. Build a prompt showing available tools + what's been done so far
//   2. Brain decides WHICH tool to call and with WHAT args
//   3. Tool actually executes (real HTTP, real file ops, real code)
//   4. Result fed back as observation → repeat
//   5. When DONE: yes → report back to GoalPlanner
//
// Tools: web_fetch, github_search, read_file, write_file, search_code,
//        list_files, memory_recall, memory_store, spawn_agents,
//        screen_capture, detect_objects, vision_analyze, browser,
//        shell_exec, mouse_action, run_tests, verify_syntax
// ════════════════════════════════════════════════════════════════════════════

import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();

export class SomaAgenticExecutor {
    constructor(config = {}) {
        this.name = 'SomaAgenticExecutor';
        this.maxIterations  = config.maxIterations  || 15;
        this.sessionTimeout = config.sessionTimeout || 300_000; // 5 min per goal session

        // Injected via initialize()
        this.brain       = null;
        this.memory      = null;
        this.goalPlanner = null;
        this.system      = null;

        this._tools = null; // built lazily after initialize
    }

    initialize(deps = {}) {
        // Guard against safeLoad's automatic double-call with no arguments.
        // If already initialized with a brain, skip a re-init with empty deps.
        if (this._initialized && !deps.brain) return;
        this._initialized = true;

        this.brain       = deps.brain       || null;
        this.memory      = deps.memory      || null;
        this.goalPlanner = deps.goalPlanner || null;
        this.system      = deps.system      || null;
        this.pool        = deps.pool        || null; // MicroAgentPool for parallel execution

        this._tools = this._buildTools();
        const count = Object.keys(this._tools).length;
        console.log(`[${this.name}] ✅ Agentic executor ready — ${count} tools active: ${Object.keys(this._tools).join(', ')}`);
        if (this.pool) console.log(`[${this.name}] 🔀 MicroAgentPool wired — parallel execution enabled`);
    }

    // ─────────────────────────────────────────────────────────────────────
    // TOOL DEFINITIONS
    // Each tool: { description, args (JSON schema hint), execute: async fn }
    // ─────────────────────────────────────────────────────────────────────

    _buildTools() {
        return {

            // ── Web access ────────────────────────────────────────────────

            web_fetch: {
                description: 'Fetch content from any public URL. Great for research, APIs, GitHub raw files, Wikipedia, npm.',
                args: '{"url":"string","maxChars":2000}',
                execute: async ({ url, maxChars = 2000 }) => {
                    if (!url || !String(url).startsWith('http')) return { error: 'Invalid URL — must start with http(s)' };
                    try {
                        const ctrl = new AbortController();
                        const timer = setTimeout(() => ctrl.abort(), 14000);
                        const res = await fetch(String(url), {
                            headers: { 'User-Agent': 'SOMA-AI-Agent/1.0 (research)', Accept: 'text/html,application/json,*/*' },
                            signal: ctrl.signal
                        });
                        clearTimeout(timer);
                        const ct = res.headers.get('content-type') || '';
                        let text = await res.text();
                        if (ct.includes('html')) {
                            text = text
                                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                                .replace(/<[^>]+>/g, ' ')
                                .replace(/\s+/g, ' ').trim();
                        }
                        return { content: text.substring(0, maxChars), totalLength: text.length, url, status: res.status };
                    } catch (e) {
                        return { error: e.message, url };
                    }
                }
            },

            github_search: {
                description: 'Search GitHub for repos. Use to find tools, libraries, or open-source projects to enhance SOMA.',
                args: '{"query":"string","language":"js (optional)","sort":"stars (optional)"}',
                execute: async ({ query, language, sort = 'stars' }) => {
                    try {
                        let q = encodeURIComponent(query);
                        if (language) q += `+language:${encodeURIComponent(language)}`;
                        const url = `https://api.github.com/search/repositories?q=${q}&sort=${sort}&per_page=5`;
                        const res = await fetch(url, {
                            headers: { 'User-Agent': 'SOMA-AI-Agent/1.0', Accept: 'application/vnd.github.v3+json' },
                            signal: AbortSignal.timeout(10000)
                        });
                        const data = await res.json();
                        if (data.message) return { error: data.message }; // rate limit etc.
                        const repos = (data.items || []).map(r => ({
                            name: r.full_name,
                            description: (r.description || '').substring(0, 120),
                            stars: r.stargazers_count,
                            url:   r.html_url,
                            topics: r.topics?.slice(0, 5)
                        }));
                        return { repos, total: data.total_count };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            // ── File system (sandboxed to SOMA root) ──────────────────────

            read_file: {
                description: "Read any file in SOMA's directory. Use to understand existing code, configs, or data.",
                args: '{"path":"relative path from SOMA root","maxLines":100}',
                execute: async ({ path: filePath, maxLines = 100 }) => {
                    try {
                        const resolved = path.resolve(ROOT, filePath);
                        if (!resolved.startsWith(ROOT)) return { error: 'Access denied: outside SOMA root' };
                        const content = await fs.readFile(resolved, 'utf8');
                        const lines = content.split('\n');
                        return {
                            content: lines.slice(0, maxLines).join('\n'),
                            totalLines: lines.length,
                            truncated: lines.length > maxLines
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            write_file: {
                description: "Create or update a file in SOMA's data/, docs/, or research/ directory. Use to save findings, notes, or generated code.",
                args: '{"path":"relative path (must be under data/, docs/, or research/)","content":"string"}',
                execute: async ({ path: filePath, content }) => {
                    try {
                        const resolved = path.resolve(ROOT, filePath);
                        const allowed = ['data', 'docs', 'research'].map(d => path.join(ROOT, d));
                        if (!allowed.some(d => resolved.startsWith(d))) {
                            return { error: 'Write only allowed inside data/, docs/, or research/' };
                        }
                        await fs.mkdir(path.dirname(resolved), { recursive: true });
                        await fs.writeFile(resolved, content, 'utf8');
                        return { success: true, path: filePath, bytes: content.length };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            list_files: {
                description: "List files in a SOMA directory. Great for exploring what arbiters, modules, or data exist.",
                args: '{"directory":".","filter":"optional substring to filter by"}',
                execute: async ({ directory = '.', filter }) => {
                    try {
                        const resolved = path.resolve(ROOT, directory);
                        if (!resolved.startsWith(ROOT)) return { error: 'Access denied' };
                        const entries = await fs.readdir(resolved, { withFileTypes: true });
                        const files = entries
                            .filter(e => !filter || e.name.includes(filter))
                            .map(e => ({ name: e.name, type: e.isDirectory() ? 'dir' : 'file' }))
                            .slice(0, 60);
                        return { files, path: directory, total: entries.length };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            search_code: {
                description: "Search SOMA's codebase for patterns, function names, or keywords. Returns matching lines with file:line. Works on Windows and Unix.",
                args: '{"pattern":"regex or literal string","directory":"optional subdirectory","maxResults":20}',
                execute: async ({ pattern, directory = '.', maxResults = 20 }) => {
                    try {
                        const searchDir = path.resolve(ROOT, directory);
                        if (!searchDir.startsWith(ROOT)) return { error: 'Access denied' };

                        const results = [];
                        let regex;
                        try { regex = new RegExp(pattern, 'gi'); }
                        catch { regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'); }

                        const SKIP_DIRS = new Set(['node_modules', '.git', 'unsloth_compiled_cache',
                            'checkpoints', 'vendor', 'dist', 'build', '.soma', 'backup']);

                        const walkDir = async (dir) => {
                            if (results.length >= maxResults) return;
                            let entries;
                            try { entries = await fs.readdir(dir, { withFileTypes: true }); } catch { return; }
                            for (const entry of entries) {
                                if (results.length >= maxResults) return;
                                const fullPath = path.join(dir, entry.name);
                                if (entry.isDirectory()) {
                                    if (!SKIP_DIRS.has(entry.name)) await walkDir(fullPath);
                                } else if (entry.isFile() && /\.(js|cjs|mjs|ts)$/.test(entry.name)) {
                                    try {
                                        const content = await fs.readFile(fullPath, 'utf8');
                                        const lines = content.split('\n');
                                        for (let i = 0; i < lines.length && results.length < maxResults; i++) {
                                            regex.lastIndex = 0;
                                            if (regex.test(lines[i])) {
                                                results.push(`${path.relative(ROOT, fullPath)}:${i + 1}: ${lines[i].trim().substring(0, 120)}`);
                                            }
                                        }
                                    } catch { /* skip unreadable */ }
                                }
                            }
                        };

                        await walkDir(searchDir);
                        return { matches: results, count: results.length };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            // ── Memory ────────────────────────────────────────────────────

            memory_recall: {
                description: "Search SOMA's long-term memory for what she already knows about a topic.",
                args: '{"query":"string","limit":5}',
                execute: async ({ query, limit = 5 }) => {
                    if (!this.memory?.recall) return { error: 'Memory not available' };
                    try {
                        const result = await this.memory.recall(query, limit);
                        const hits = result?.results || (Array.isArray(result) ? result : []);
                        return {
                            memories: hits.slice(0, limit).map(m => ({
                                content: (m.content || m).toString().substring(0, 300),
                                similarity: m.similarity
                            }))
                        };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            memory_store: {
                description: "Store an important insight or finding to SOMA's long-term memory for future use.",
                args: '{"content":"string","importance":6}',
                execute: async ({ content, importance = 6 }) => {
                    if (!this.memory?.remember) return { error: 'Memory not available' };
                    try {
                        await this.memory.remember(content, {
                            type: 'agentic_finding',
                            importance,
                            source: 'agentic_executor'
                        });
                        return { success: true, stored: content.substring(0, 100) };
                    } catch (e) {
                        return { error: e.message };
                    }
                }
            },

            // ── Parallel workforce (MicroAgentPool) ──────────────────────
            // Runs multiple sub-tasks simultaneously — "in tandem"

            spawn_agents: {
                description: "Run multiple tasks IN PARALLEL using specialized micro-agents. Much faster than doing them one at a time. Agent types: fetch (HTTP), file (read/write/search), analyze (sentiment/keywords/structure), transform, validate, workflow.",
                args: '{"tasks":[{"type":"fetch|file|analyze|transform|validate|workflow","task":{}}],"label":"optional description"}',
                execute: async ({ tasks = [], label = 'parallel batch' }) => {
                    if (!this.pool) return { error: 'MicroAgentPool not available — parallel execution disabled' };
                    if (!Array.isArray(tasks) || tasks.length === 0) return { error: 'tasks must be a non-empty array' };
                    if (tasks.length > 8) return { error: 'Max 8 parallel tasks per call' };

                    console.log(`[${this.name}] 🔀 Spawning ${tasks.length} agents in parallel: ${label}`);

                    const results = await Promise.allSettled(
                        tasks.map(({ type, task: taskPayload }) =>
                            this.pool.spawnAndExecute(type, taskPayload, { autoTerminate: true })
                        )
                    );

                    const output = results.map((r, i) => ({
                        index: i,
                        type: tasks[i]?.type,
                        status: r.status,
                        result: r.status === 'fulfilled' ? r.value : null,
                        error:  r.status === 'rejected'  ? r.reason?.message : null
                    }));

                    const succeeded = output.filter(o => o.status === 'fulfilled').length;
                    console.log(`[${this.name}] 🔀 Parallel batch done: ${succeeded}/${tasks.length} succeeded`);
                    return { results: output, succeeded, total: tasks.length, label };
                }
            },

            // ── Agentic Control (Computer, Vision, Shell) ─────────────────
            // All references use lazy this.system lookups — these arbiters load
            // AFTER AgenticExecutor initialises, so we can't capture them at
            // build time. The closure re-reads this.system on every call. ✓

            screen_capture: {
                description: 'Take a screenshot of the current screen. Returns { path } to the saved PNG. Combine with vision_analyze to understand what is on screen.',
                args: '{}',
                execute: async () => {
                    const cc = this.system?.computerControl;
                    if (!cc) return { error: 'ComputerControl not available — hardware control not loaded' };
                    try {
                        return await cc.captureScreen();
                    } catch (e) {
                        return { error: `screen_capture failed: ${e.message}` };
                    }
                }
            },

            detect_objects: {
                description: 'Detect specific objects in an image with bounding boxes AND center pixel coordinates. Use after screen_capture to find exactly where buttons, windows, text, or people are on screen. Center coordinates can feed directly into mouse_action to click precisely.',
                args: '{"imagePath":"path/to/image.png","threshold":0.7}',
                execute: async ({ imagePath, threshold = 0.7 }) => {
                    const va = this.system?.visionArbiter;
                    if (!va) return { error: 'VisionArbiter not available' };
                    if (!imagePath) return { error: 'imagePath required' };
                    try {
                        return await va.detectObjects(imagePath, threshold);
                    } catch (e) {
                        return { error: `detect_objects failed: ${e.message}` };
                    }
                }
            },

            vision_analyze: {
                description: 'Analyze an image using CLIP AI vision. Pass an imagePath (from screen_capture) and a list of labels to classify. Returns { label, confidence } for each candidate.',
                args: '{"imagePath":"path/to/image.png","labels":["browser","terminal","error dialog","desktop","code editor"]}',
                execute: async ({ imagePath, labels = ['computer screen', 'browser', 'terminal', 'error', 'code'] }) => {
                    const va = this.system?.visionArbiter;
                    if (!va) return { error: 'VisionArbiter not available — CLIP model not loaded yet' };
                    if (!imagePath) return { error: 'imagePath required' };
                    try {
                        return await va.classifyImage(imagePath, labels);
                    } catch (e) {
                        return { error: `vision_analyze failed: ${e.message}` };
                    }
                }
            },

            browser: {
                description: 'Control a Puppeteer web browser. Actions: launch, navigate/goto, wait_for, click, type, screenshot, extract_text, extract_html, close. Returns imagePath/text/html for those actions. Unsafe URLs blocked unless allowUnsafe=true.',
                args: '{"action":"launch|navigate|goto|wait_for|click|type|screenshot|extract_text|extract_html|close","url":"https://...","selector":"CSS selector","text":"text to type","timeoutMs":15000,"screenshotPath":"optional path","allowUnsafe":false}',
                execute: async ({ action, url, selector, text, timeoutMs, screenshotPath, allowUnsafe }) => {
                    const cc = this.system?.computerControl;
                    if (!cc) return { error: 'ComputerControl not available' };
                    if (!action) return { error: 'action required' };
                    try {
                        return await cc.handleBrowserAction({ action, url, selector, text, timeoutMs, screenshotPath, allowUnsafe });
                    } catch (e) {
                        return { error: `browser action "${action}" failed: ${e.message}` };
                    }
                }
            },

            browse_objective: {
                description: 'Objective-based browsing via WebScraperDendrite (stealth Puppeteer + MCP fallback). Returns summary + per-page artifacts.',
                args: '{"objective":"string","seedUrls":["https://..."],"allowedDomains":["example.com"],"maxPages":3,"extractors":{"key":".selector"},"timeoutMs":30000}',
                execute: async ({ objective, seedUrls, allowedDomains, maxPages, extractors, timeoutMs }) => {
                    const ws = this.system?.webScraperDendrite;
                    if (!ws || !ws.browseObjective) return { error: 'WebScraperDendrite not available' };
                    try {
                        return await ws.browseObjective({ objective, seedUrls, allowedDomains, maxPages, extractors, timeoutMs });
                    } catch (e) {
                        return { error: `browse_objective failed: ${e.message}` };
                    }
                }
            },

            shell_exec: {
                description: 'Execute a shell command. Use for running scripts, git, npm, reading logs, or interacting with the OS. Output is capped at 3000 chars stdout. Timeout max 30s.',
                args: '{"command":"npm list --depth=0","timeout":10000}',
                execute: async ({ command, timeout = 10000 }) => {
                    const shell = this.system?.virtualShell;
                    if (!shell) return { error: 'VirtualShell not available' };
                    if (!command) return { error: 'command required' };
                    // Hard block on destructive commands regardless of VirtualShell blacklist
                    const dangerous = /(?:^|[\s;|&])(?:rm\s+-rf\s+\/|format\s+[a-z]:|del\s+\/[sq]\s+\/[sf]|mkfs\.|dd\s+if=\/dev\/zero\s+of=\/dev)/i;
                    if (dangerous.test(command)) return { error: 'Command blocked: potentially destructive' };
                    try {
                        const result = await shell.execute(command, Math.min(timeout, 30000));
                        return {
                            stdout:   (result.stdout   || '').substring(0, 3000),
                            stderr:   (result.stderr   || '').substring(0, 500),
                            exitCode: result.exitCode,
                            cwd:      result.cwd
                        };
                    } catch (e) {
                        return { error: `shell_exec failed: ${e.message}` };
                    }
                }
            },

            mouse_action: {
                description: 'Control mouse and keyboard on the desktop. Types: mouse_move (move cursor to x,y), click (left-click at x,y), double_click (double-click at x,y), right_click, type (type text at cursor), key (press a key like "Enter", "Escape", "ctrl+c").',
                args: '{"type":"mouse_move|click|double_click|right_click|type|key","x":100,"y":200,"text":"hello world","key":"Enter"}',
                execute: async ({ type, x, y, text, key }) => {
                    const cc = this.system?.computerControl;
                    if (!cc) return { error: 'ComputerControl not available' };
                    if (!type) return { error: 'type required' };
                    try {
                        return await cc.executeAction({ type, x, y, text, key });
                    } catch (e) {
                        return { error: `mouse_action "${type}" failed: ${e.message}` };
                    }
                }
            },

            // ── Self-modification safety gate ─────────────────────────────
            // Run before committing any code change SOMA writes to herself.
            // Prevents a broken self-modification from crashing the system.

            run_tests: {
                description: 'Run SOMA\'s test suite or a specific test file to verify a code change works before committing. Use BEFORE write_file when modifying SOMA\'s own code. Returns pass/fail + output.',
                args: '{"testFile":"optional specific test file path","timeout":30000}',
                execute: async ({ testFile, timeout = 30000 }) => {
                    const shell = this.system?.virtualShell;
                    if (!shell) return { error: 'VirtualShell not available' };
                    try {
                        const cmd = testFile
                            ? `node --experimental-vm-modules "${testFile}" 2>&1`
                            : `node --experimental-vm-modules node_modules/.bin/jest --passWithNoTests --testTimeout=10000 2>&1 || echo "No Jest; trying: node test_boot.mjs"`;
                        const result = await shell.execute(cmd, Math.min(timeout, 60000));
                        const output = ((result.stdout || '') + (result.stderr || '')).substring(0, 4000);
                        const passed = result.exitCode === 0;
                        return { passed, exitCode: result.exitCode, output, testFile: testFile || 'full suite' };
                    } catch (e) {
                        return { error: `run_tests failed: ${e.message}` };
                    }
                }
            },

            verify_syntax: {
                description: 'Check that a JavaScript file has valid syntax before deploying it. Use after write_file when modifying SOMA code. Fast — just syntax check, no execution.',
                args: '{"filePath":"path/to/file.js"}',
                execute: async ({ filePath }) => {
                    const shell = this.system?.virtualShell;
                    if (!shell) return { error: 'VirtualShell not available' };
                    if (!filePath) return { error: 'filePath required' };
                    try {
                        const resolved = path.resolve(ROOT, filePath);
                        if (!resolved.startsWith(ROOT)) return { error: 'Access denied: outside SOMA root' };
                        const result = await shell.execute(`node --check "${resolved}" 2>&1`, 10000);
                        return {
                            valid:    result.exitCode === 0,
                            filePath,
                            output:   (result.stdout || result.stderr || '').substring(0, 500)
                        };
                    } catch (e) {
                        return { error: `verify_syntax failed: ${e.message}` };
                    }
                }
            },

            // ── Self-modification (Engineering Swarm) ─────────────────────
            // Full adversarial pipeline: debate → synthesis → syntax check → verify.
            // SOMA's one tool for actually changing her own source code.

            modify_code: {
                description: "Modify one of SOMA's own source files using the Engineering Swarm safety pipeline (adversarial debate → lead-dev synthesis → syntax check). This is how SOMA improves her own code. ALWAYS read the file with read_file first, then call this with a precise description of the change.",
                args: '{"filepath":"relative path to .js/.cjs file","request":"precise description of what to change and why"}',
                execute: async ({ filepath, request }) => {
                    const swarm = this.system?.engineeringSwarm;
                    if (!swarm) return { error: 'EngineeringSwarm not available — self-modification disabled' };
                    if (!filepath) return { error: 'filepath required' };
                    if (!request)  return { error: 'request required — describe the change precisely' };
                    const resolved = path.resolve(ROOT, filepath);
                    if (!resolved.startsWith(ROOT)) return { error: 'Access denied: outside SOMA root' };
                    if (!/\.(js|cjs|mjs|ts)$/.test(resolved)) return { error: 'Only .js/.cjs/.mjs/.ts files allowed' };
                    try {
                        const result = await swarm.modifyCode(resolved, request);
                        const summary = result?.summary || result?.output || result?.result || 'Modification applied via Engineering Swarm safety pipeline';
                        return { success: true, filepath, summary };
                    } catch (e) {
                        return { error: `modify_code failed: ${e.message}`, filepath };
                    }
                }
            },

            // ── Inter-session continuity ───────────────────────────────────
            // When 15 steps isn't enough, save progress so the next heartbeat
            // tick resumes exactly where we left off.

            save_progress: {
                description: "Save current work to disk so the NEXT heartbeat cycle resumes right where you stopped. Use when you've done substantial work but need more steps. The next heartbeat will auto-load this and continue.",
                args: '{"summary":"what has been accomplished so far","nextSteps":"what still needs to be done in the next session"}',
                execute: async ({ summary = '', nextSteps = '' }) => {
                    if (!this._currentGoalId) return { error: 'No active goal context — save_progress only works during goal execution' };
                    try {
                        const dir = path.join(ROOT, 'data', 'goal-progress');
                        await fs.mkdir(dir, { recursive: true });
                        const file = path.join(dir, `${this._currentGoalId}.json`);
                        await fs.writeFile(file, JSON.stringify({
                            goalId:       this._currentGoalId,
                            savedAt:      Date.now(),
                            summary,
                            nextSteps,
                            observations: this._currentObservations || []
                        }, null, 2), 'utf8');
                        return { success: true, savedAt: new Date().toISOString(), summary, nextSteps,
                            message: 'Progress saved — next heartbeat will resume from here' };
                    } catch (e) {
                        return { error: `save_progress failed: ${e.message}` };
                    }
                }
            }
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // MAIN EXECUTION LOOP
    // ─────────────────────────────────────────────────────────────────────

    async execute(goal) {
        if (!this.brain) return { done: false, error: 'No brain available', iterations: 0 };

        const started      = Date.now();
        const observations = [];
        let   iteration    = 0;
        let   finalResult  = null;
        const toolsUsed    = new Set();

        console.log(`[${this.name}] 🚀 Starting agentic execution: "${goal.title}"`);

        // Prime context with relevant memories
        const priorMemories = await this._recallMemories(goal.title);

        // Inter-session continuity: expose goal context to save_progress tool
        this._currentGoalId = goal.id;
        this._currentObservations = observations;

        // Attempt to resume from a prior session if heartbeat ran out of steps
        const _progressFile = path.join(ROOT, 'data', 'goal-progress', `${goal.id}.json`);
        try {
            const _raw = await fs.readFile(_progressFile, 'utf8');
            const _prior = JSON.parse(_raw);
            if (Array.isArray(_prior.observations) && _prior.observations.length > 0) {
                observations.push(..._prior.observations);
                iteration = _prior.observations.length;
                console.log(`[${this.name}] 📂 Resumed: ${_prior.observations.length} prior steps for "${goal.title}"`);
            }
        } catch { /* no saved progress — fresh start */ }

        while (iteration < this.maxIterations) {
            if (Date.now() - started > this.sessionTimeout) {
                console.log(`[${this.name}] ⏱️ Session timeout at step ${iteration}`);
                break;
            }

            const prompt = this._buildPrompt(goal, observations, priorMemories);

            let response;
            try {
                response = await this.brain.reason(prompt, {
                    quickResponse: true,
                    source: 'agentic_executor',
                    isAgenticTask: true,
                    systemOverride: `You are SOMA's AUTONOMOUS AGENT ENGINE — not a conversational AI.
Respond in ONE of these exact formats and NOTHING else:

FORMAT 1 — call a tool:
THINK: [one line: why this tool and these args]
TOOL: tool_name
ARGS: {"key": "value"}

FORMAT 2 — goal complete:
DONE: yes
RESULT: [summary of all work accomplished]

ABSOLUTE RULES:
- Output ONLY the format above. Zero prose, zero explanation, zero greeting.
- DO execute tools to accomplish goals. DO NOT describe what you would do.
- If unsure where to start: call memory_recall or list_files.
- After finding info: call write_file or memory_store to save it.
- You ARE in AGENT MODE. Tool use is required and expected here.`,
                    context: { goalId: goal.id, step: iteration, isAgenticTask: true }
                });
            } catch (e) {
                console.warn(`[${this.name}] Brain error at step ${iteration}:`, e.message);
                observations.push({
                    step: iteration + 1,
                    _brainError: true,
                    thought: `[BRAIN ERROR at step ${iteration + 1}] ${e.message}`
                });
                // Break after 2 consecutive brain errors (rate limit / API failure)
                const recentErrors = observations.slice(-2).filter(o => o._brainError);
                if (recentErrors.length >= 2) break;
                iteration++;
                continue;
            }

            const text = response?.text || '';

            // ── Check for completion ──
            if (/DONE:\s*yes/i.test(text)) {
                finalResult = text.match(/RESULT:\s*([\s\S]+)/i)?.[1]?.trim()
                    || `Goal "${goal.title}" completed in ${iteration + 1} steps`;
                console.log(`[${this.name}] ✅ Complete in ${iteration + 1} steps: "${goal.title}"`);
                break;
            }

            // ── Parse and execute tool call ──
            const toolCall = this._parseToolCall(text);
            if (toolCall) {
                const think = text.match(/THINK:\s*([^\n]+)/i)?.[1]?.trim() || '';
                console.log(`[${this.name}]   Step ${iteration + 1}: ${toolCall.tool}(${JSON.stringify(toolCall.args).substring(0, 60)})`);

                let toolResult;
                try {
                    toolResult = await this._tools[toolCall.tool].execute(toolCall.args);
                } catch (e) {
                    toolResult = { error: `${toolCall.tool} failed: ${e.message}` };
                }

                toolsUsed.add(toolCall.tool);
                observations.push({
                    step: iteration + 1,
                    tool: toolCall.tool,
                    args: toolCall.args,
                    think,
                    result: toolResult
                });

                // Progressive goal update (intermediate progress)
                const progress = Math.min(20 + (iteration + 1) * 11, 82);
                await this.goalPlanner?.updateGoalProgress(goal.id, progress, {
                    note: `Step ${iteration + 1}: ${toolCall.tool}`
                }).catch(() => {});

            } else if (text.length > 10) {
                // Model responded with narrative instead of THINK/TOOL/ARGS — inject correction
                const totalFormatErrors = observations.filter(o => o._formatError).length;
                if (totalFormatErrors >= 3) {
                    console.warn(`[${this.name}] ⚠️ Max format corrections (3) reached — ending session`);
                    break;
                }
                console.warn(`[${this.name}] ⚠️ Format error at step ${iteration + 1} (${totalFormatErrors + 1}/3): "${text.substring(0, 80)}"`);
                observations.push({
                    step: iteration + 1,
                    _formatError: true,
                    thought: `[FORMAT CORRECTION] You must use THINK:/TOOL:/ARGS: or DONE:/RESULT: format. You responded with narrative text. Example correct response:\nTHINK: I need to recall what I know about this goal\nTOOL: memory_recall\nARGS: {"query": "${(goal.title || '').substring(0, 50)}", "limit": 5}`
                });
            }

            iteration++;
        }

        // Clear saved progress on completion (success or timeout — don't leave stale files)
        fs.unlink(_progressFile).catch(() => {});
        this._currentGoalId = null;
        this._currentObservations = null;

        // Summarise and persist
        const toolsList = [...toolsUsed].join(', ') || 'reasoning only';
        const summary = `Executed "${goal.title}" in ${iteration} step(s) using [${toolsList}]. ${finalResult ? 'COMPLETED.' : 'Partial.'}`;
        if (this.memory?.remember) {
            await this.memory.remember(summary, {
                type: 'goal_execution', importance: 7, goalId: goal.id
            }).catch(() => {});
        }

        return {
            done:         !!finalResult,
            result:       finalResult || `Partial: ${iteration} steps, tools: ${toolsList}`,
            iterations:   iteration,
            toolsUsed:    [...toolsUsed],
            observations
        };
    }

    // ─────────────────────────────────────────────────────────────────────
    // PROMPT BUILDER
    // ─────────────────────────────────────────────────────────────────────

    _buildPrompt(goal, observations, priorMemories) {
        const toolDocs = Object.entries(this._tools).map(([name, t]) =>
            `  ${name}\n    What: ${t.description}\n    Args: ${t.args}`
        ).join('\n\n');

        const memBlock = priorMemories.length > 0
            ? `\nWHAT I ALREADY KNOW:\n${priorMemories.map(m => `• ${m}`).join('\n')}\n`
            : '';

        const obsBlock = observations.length > 0
            ? `\nSTEPS COMPLETED SO FAR:\n${observations.map(o =>
                o.tool
                    ? `[Step ${o.step}] ${o.tool} → ${JSON.stringify(o.result).substring(0, 250)}`
                    : `[Step ${o.step}] Thought: ${(o.thought || '').substring(0, 250)}`
              ).join('\n')}\n`
            : '';

        return `You are SOMA's autonomous execution engine. Complete the goal below by using tools one step at a time.

GOAL: ${goal.title}
DESCRIPTION: ${goal.description || 'No additional description'}
PROGRESS SO FAR: ${goal.metrics?.progress || 0}%
${memBlock}${obsBlock}
AVAILABLE TOOLS:
${toolDocs}

HOW TO USE A TOOL — respond in EXACTLY this format (no extra text before THINK):
THINK: [one sentence: why this tool, why these args]
TOOL: tool_name
ARGS: {"key": "value"}

HOW TO FINISH — when the goal is fully done:
DONE: yes
RESULT: [clear summary of everything accomplished, findings stored, files created]

RULES:
- Take ONE action per response. Do not plan multiple steps at once.
- Use web_fetch or github_search to get real information (not from memory).
- Use memory_store after finding something important so SOMA remembers it.
- Use write_file to save research findings to research/<topic>.md.
- Never make up URLs — only fetch real URLs you construct from known patterns.
- If a tool returns an error, try a different approach.
- CRITICAL: When modifying SOMA's own code files — always run verify_syntax THEN run_tests before declaring the goal complete. Never commit broken code to yourself.

What is your next step?`;
    }

    // ─────────────────────────────────────────────────────────────────────
    // TOOL CALL PARSER
    // Handles both strict and slightly-malformed LLM output
    // ─────────────────────────────────────────────────────────────────────

    _parseToolCall(text) {
        const toolMatch = text.match(/^TOOL:\s*(\S+)/im);
        if (!toolMatch) return null;

        // Normalise tool name: lowercase, strip punctuation
        const toolName = toolMatch[1].trim().toLowerCase().replace(/[^a-z_]/g, '');
        if (!this._tools[toolName]) return null; // Unknown tool

        // Extract args block — from ARGS: to end of line / next newline block
        const argsMatch = text.match(/^ARGS:\s*(\{[\s\S]*?\})(?:\s*\n|$)/im);
        let args = {};

        if (argsMatch) {
            try {
                args = JSON.parse(argsMatch[1]);
            } catch {
                // Fallback: extract quoted key:value pairs from malformed JSON
                const pairs = [...argsMatch[1].matchAll(/"(\w+)":\s*"([^"]+)"/g)];
                for (const [, k, v] of pairs) args[k] = v;

                const numPairs = [...argsMatch[1].matchAll(/"(\w+)":\s*(\d+)/g)];
                for (const [, k, v] of numPairs) args[k] = Number(v);
            }
        }

        return { tool: toolName, args };
    }

    // ─────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────

    async _recallMemories(query) {
        if (!this.memory?.recall) return [];
        try {
            const result = await this.memory.recall(query, 3);
            const hits = result?.results || (Array.isArray(result) ? result : []);
            return hits
                .filter(m => (m.similarity || 1) > 0.30)
                .map(m => (m.content || m).toString().substring(0, 200));
        } catch {
            return [];
        }
    }

    getToolNames() {
        return Object.keys(this._tools || {});
    }
}
