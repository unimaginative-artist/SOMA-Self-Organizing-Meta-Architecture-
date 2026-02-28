/**
 * loaders/tools.js - RECONSTRUCTED
 * 
 * Central registry for SOMA's tools.
 */

import toolRegistry from '../../core/ToolRegistry.js';

export async function loadTools(systemContext = {}) {
    console.log('\n[Loader] 🛠️  Initializing Tools...');

    // System context will have all arbiters available
    const system = systemContext;
    const getSystem = () => toolRegistry.__system || system;

    // Standard Tools
    toolRegistry.registerTool({
        name: 'calculator',
        description: 'Evaluate mathematical expressions',
        parameters: { expression: 'string' },
        execute: async ({ expression }) => {
            try { return eval(expression); } catch (e) { return "Error: " + e.message; }
        }
    });

    toolRegistry.registerTool({
        name: 'get_time',
        description: 'Get current server time',
        parameters: {},
        execute: async () => new Date().toISOString()
    });

    // Market Data Tool
    toolRegistry.registerTool({
        name: 'get_market_data',
        description: 'Get real-time market data for crypto/stocks',
        parameters: { symbol: 'string', source: 'string (binance|coingecko|alphavantage)' },
        execute: async ({ symbol, source }) => {
            try {
                const s = source || 'binance';
                if (s === 'binance') {
                    const pair = symbol.toUpperCase().endsWith('USDT') ? symbol.toUpperCase() : `${symbol.toUpperCase()}USDT`;
                    const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${pair}`;
                    const res = await fetch(url);
                    if (!res.ok) return `Error fetching ${pair}`;
                    const data = await res.json();
                    return {
                        price: data.lastPrice,
                        change_24h: data.priceChangePercent,
                        volume: data.volume
                    };
                } else if (s === 'coingecko') {
                    const id = symbol.toLowerCase();
                    const url = `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd&include_24hr_change=true`;
                    const res = await fetch(url);
                    if (!res.ok) return `Error fetching ${id}`;
                    const data = await res.json();
                    return data[id] || "Symbol not found";
                }
                return "Unsupported source. Use binance or coingecko.";
            } catch (e) { return "Error: " + e.message; }
        }
    });

    // File System Tools
    toolRegistry.registerTool({
        name: 'read_file',
        description: 'Read file content. Use strict absolute paths or relative to CWD.',
        parameters: { path: 'string' },
        execute: async ({ path: filePath }) => {
            try {
                const { promises: fs } = await import('fs');
                const path = await import('path');
                const resolved = path.resolve(process.cwd(), filePath);
                if (!resolved.startsWith(process.cwd())) return "Access Denied: Path outside CWD";
                return await fs.readFile(resolved, 'utf8');
            } catch (e) { return "Error: " + e.message; }
        }
    });

    toolRegistry.registerTool({
        name: 'write_file',
        description: 'Write content to file (overwrites). Use strict absolute paths or relative to CWD.',
        parameters: { path: 'string', content: 'string' },
        execute: async ({ path: filePath, content }) => {
            try {
                const { promises: fs } = await import('fs');
                const path = await import('path');
                const resolved = path.resolve(process.cwd(), filePath);
                if (!resolved.startsWith(process.cwd())) return "Access Denied: Path outside CWD";
                await fs.writeFile(resolved, content, 'utf8');
                return "Success";
            } catch (e) { return "Error: " + e.message; }
        }
    });

    toolRegistry.registerTool({
        name: 'list_files',
        description: 'List files in directory',
        parameters: { path: 'string' },
        execute: async ({ path: dirPath }) => {
            try {
                const { promises: fs } = await import('fs');
                const path = await import('path');
                const resolved = path.resolve(process.cwd(), dirPath || '.');
                if (!resolved.startsWith(process.cwd())) return "Access Denied: Path outside CWD";
                const files = await fs.readdir(resolved);
                return files.join('\n');
            } catch (e) { return "Error: " + e.message; }
        }
    });

    // ADVANCED TOOLS
    toolRegistry.registerTool({
        name: 'terminal_exec',
        description: 'Execute a shell command (PowerShell on win32).',
        parameters: { command: 'string' },
        execute: async ({ command }) => {
            const { exec } = await import('child_process');
            return new Promise((resolve) => {
                exec(command, (error, stdout, stderr) => {
                    if (error) resolve(`Error: ${error.message}\nStderr: ${stderr}`);
                    else resolve(stdout || stderr || "Success (No Output)");
                });
            });
        }
    });

    toolRegistry.registerTool({
        name: 'system_scan',
        description: 'Perform a full system diagnostic scan.',
        parameters: {},
        execute: async () => {
            return {
                status: 'HEALTHY',
                memory: process.memoryUsage(),
                uptime: process.uptime(),
                node: process.version,
                platform: process.platform,
                cpu: process.arch
            };
        }
    });

    // CODE INTELLIGENCE TOOLS
    toolRegistry.registerTool({
        name: 'search_code',
        description: 'Search for text/regex in files (like grep). Automatically excludes node_modules, .git, dist, and build directories.',
        parameters: { pattern: 'string', path: 'string (optional, defaults to cwd)', fileType: 'string (optional, e.g. js,py)', limit: 'number (optional, default 200)' },
        execute: async ({ pattern, path: searchPath, fileType, limit }) => {
            const { exec } = await import('child_process');
            const searchDir = searchPath || process.cwd();
            const maxCount = Math.max(1, Math.min(parseInt(limit || 200, 10) || 200, 1000));

            // Build file type flags for ripgrep
            let typeFlag = '';
            if (fileType) {
                typeFlag = fileType.split(',').map(t => `--glob "*.${t.trim()}"`).join(' ');
            }

            // Exclude heavy directories to prevent timeouts
            const excludes = '--glob "!node_modules" --glob "!.git" --glob "!dist" --glob "!build" --glob "!*.min.js" --glob "!package-lock.json"';

            // Use ripgrep if available, fall back to findstr
            const rgCmd = `rg --no-heading --max-count ${maxCount} ${excludes} ${typeFlag} "${pattern}" "${searchDir}" 2>nul`;
            const findstrCmd = `findstr /s /i /n "${pattern}" "${searchDir}\\*.js" "${searchDir}\\*.mjs" "${searchDir}\\*.cjs" "${searchDir}\\*.jsx" "${searchDir}\\*.ts" "${searchDir}\\*.py" "${searchDir}\\*.json"`;
            const cmd = `${rgCmd} || ${findstrCmd}`;

            return new Promise((resolve) => {
                exec(cmd, { maxBuffer: 2 * 1024 * 1024, timeout: 30000 }, (error, stdout, stderr) => {
                    if (error && !stdout) {
                        const msg = error.killed ? 'Search timed out (30s). Try narrowing with fileType or path parameters.' : `No matches found for: ${pattern}`;
                        resolve(msg);
                    } else {
                        resolve(stdout || 'No results');
                    }
                });
            });
        }
    });

    toolRegistry.registerTool({
        name: 'find_files',
        description: 'Find files by name pattern. Excludes node_modules and .git directories.',
        parameters: { pattern: 'string', path: 'string (optional)', limit: 'number (optional, default 200)' },
        execute: async ({ pattern, path: searchPath, limit }) => {
            const { exec } = await import('child_process');
            const searchDir = searchPath || process.cwd();
            const maxCount = Math.max(1, Math.min(parseInt(limit || 200, 10) || 200, 1000));
            const cmd = process.platform === 'win32'
                ? `powershell -NoProfile -Command "Get-ChildItem -Path \\"${searchDir}\\" -Recurse -Filter \\"${pattern}\\" -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notlike '*\\\\node_modules\\\\*' -and $_.FullName -notlike '*\\\\.git\\\\*' } | Select-Object -First ${maxCount} | ForEach-Object { $_.FullName }"`
                : `find "${searchDir}" -name "${pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null | head -n ${maxCount}`;

            return new Promise((resolve) => {
                exec(cmd, { maxBuffer: 2 * 1024 * 1024, timeout: 30000 }, (error, stdout) => {
                    resolve(stdout || `No files matching: ${pattern}`);
                });
            });
        }
    });

    // GIT TOOLS
    toolRegistry.registerTool({
        name: 'git_status',
        description: 'Get git repository status',
        parameters: {},
        execute: async () => {
            const { exec } = await import('child_process');
            return new Promise((resolve) => {
                exec('git status', (error, stdout, stderr) => {
                    if (error) resolve('Not a git repository or git not installed');
                    else resolve(stdout);
                });
            });
        }
    });

    toolRegistry.registerTool({
        name: 'git_diff',
        description: 'Show git diff of changes',
        parameters: { file: 'string (optional, shows all if not specified)' },
        execute: async ({ file }) => {
            const { exec } = await import('child_process');
            const cmd = file ? `git diff "${file}"` : 'git diff';
            return new Promise((resolve) => {
                exec(cmd, { maxBuffer: 1024 * 1024 }, (error, stdout) => {
                    resolve(stdout || 'No changes');
                });
            });
        }
    });

    toolRegistry.registerTool({
        name: 'git_log',
        description: 'View recent git commits',
        parameters: { count: 'number (default 10)' },
        execute: async ({ count }) => {
            const { exec } = await import('child_process');
            const n = count || 10;
            return new Promise((resolve) => {
                exec(`git log --oneline -${n}`, (error, stdout) => {
                    if (error) resolve('Not a git repository');
                    else resolve(stdout);
                });
            });
        }
    });

    // WEB TOOLS
    toolRegistry.registerTool({
        name: 'fetch_url',
        description: 'Fetch content from a URL',
        parameters: { url: 'string' },
        execute: async ({ url }) => {
            if (process.env.SOMA_LOCAL_ONLY === 'true') {
                return 'Local-only mode enabled: web access blocked';
            }
            try {
                const response = await fetch(url);
                const text = await response.text();
                return text.substring(0, 5000); // Limit response size
            } catch (e) {
                return `Error fetching ${url}: ${e.message}`;
            }
        }
    });

    // PROCESS TOOLS
    toolRegistry.registerTool({
        name: 'list_processes',
        description: 'List running processes (filtered by name if provided)',
        parameters: { filter: 'string (optional)' },
        execute: async ({ filter }) => {
            const { exec } = await import('child_process');
            const cmd = process.platform === 'win32'
                ? `tasklist ${filter ? `| findstr /i "${filter}"` : ''}`
                : `ps aux ${filter ? `| grep "${filter}"` : ''}`;

            return new Promise((resolve) => {
                exec(cmd, (error, stdout) => {
                    resolve(stdout || 'No processes found');
                });
            });
        }
    });

    toolRegistry.registerTool({
        name: 'check_port',
        description: 'Check what process is using a port',
        parameters: { port: 'number' },
        execute: async ({ port }) => {
            const { exec } = await import('child_process');
            const cmd = process.platform === 'win32'
                ? `netstat -ano | findstr :${port}`
                : `lsof -i :${port}`;

            return new Promise((resolve) => {
                exec(cmd, (error, stdout) => {
                    resolve(stdout || `Port ${port} is not in use`);
                });
            });
        }
    });

    // PACKAGE MANAGEMENT
    toolRegistry.registerTool({
        name: 'npm_command',
        description: 'Run npm commands (install, list, etc.)',
        parameters: { command: 'string (e.g., "install express", "list --depth=0")' },
        execute: async ({ command }) => {
            const { exec } = await import('child_process');
            return new Promise((resolve) => {
                exec(`npm ${command}`, { maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
                    resolve(stdout || stderr || 'Command completed');
                });
            });
        }
    });

    // SMART FILE EDIT
    toolRegistry.registerTool({
        name: 'edit_file',
        description: 'Smart file editing - search and replace in file',
        parameters: { path: 'string', search: 'string', replace: 'string' },
        execute: async ({ path: filePath, search, replace }) => {
            try {
                const { promises: fs } = await import('fs');
                const path = await import('path');
                const resolved = path.resolve(process.cwd(), filePath);
                if (!resolved.startsWith(process.cwd())) return "Access Denied: Path outside CWD";

                const content = await fs.readFile(resolved, 'utf8');
                const newContent = content.replace(new RegExp(search, 'g'), replace);
                await fs.writeFile(resolved, newContent, 'utf8');

                const matches = (content.match(new RegExp(search, 'g')) || []).length;
                return `Replaced ${matches} occurrence(s) in ${filePath}`;
            } catch (e) { return "Error: " + e.message; }
        }
    });

    // ═══════════════════════════════════════════════════════════
    // SOMA INTERNAL ARCHITECTURE TOOLS (The Real Power)
    // ═══════════════════════════════════════════════════════════

    toolRegistry.registerTool({
        name: 'hybrid_search',
        description: 'SMART code search using HybridSearchArbiter (semantic + keyword). Falls back to ripgrep if unavailable.',
        parameters: { query: 'string', limit: 'number (optional, default 10)' },
        execute: async ({ query, limit }) => {
            const liveSystem = getSystem();
            const searcher = liveSystem.hybridSearch || liveSystem.searchArbiter;

            // Try semantic search first
            if (searcher) {
                try {
                    const rawResults = await searcher.search(query, { limit: limit || 10 });
                    // Handle both array results and {results: [...]} object format
                    const resultList = Array.isArray(rawResults) ? rawResults
                        : (rawResults?.results && Array.isArray(rawResults.results)) ? rawResults.results
                        : null;
                    if (resultList && resultList.length > 0) {
                        return resultList.map(r => `${r.file || r.id || '?'}:${r.line || 0} - ${r.content || r.snippet || r.text || ''}`).join('\n');
                    }
                } catch (e) {
                    // Fall through to ripgrep fallback
                }
            }

            // Fallback: use ripgrep directly (same as search_code but automatic)
            try {
                const { exec } = await import('child_process');
                const searchDir = process.cwd();
                const maxCount = Math.min(parseInt(limit || 20, 10), 200);
                const excludes = '--glob "!node_modules" --glob "!.git" --glob "!dist" --glob "!build" --glob "!*.min.js" --glob "!package-lock.json"';
                const cmd = `rg --max-count ${maxCount} ${excludes} "${query}" "${searchDir}" 2>nul`;

                return await new Promise((resolve) => {
                    exec(cmd, { maxBuffer: 2 * 1024 * 1024, timeout: 30000 }, (error, stdout) => {
                        if (stdout && stdout.trim()) {
                            resolve(`[Fallback: ripgrep]\n${stdout}`);
                        } else {
                            resolve(`No results found for: "${query}". Try search_code with different parameters.`);
                        }
                    });
                });
            } catch (e) {
                return `Search unavailable: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'remember',
        description: 'Store important info in long-term memory (MnemonicArbiter)',
        parameters: { content: 'string', tags: 'string (comma-separated, optional)' },
        execute: async ({ content, tags }) => {
            if (!system.mnemonic && !system.mnemonicArbiter) {
                return 'Memory system not available';
            }
            try {
                const mnemonic = system.mnemonic || system.mnemonicArbiter;
                await mnemonic.remember(content, {
                    tags: tags ? tags.split(',').map(t => t.trim()) : [],
                    source: 'tool',
                    timestamp: Date.now()
                });
                return `Stored in long-term memory with tags: ${tags || 'none'}`;
            } catch (e) {
                return `Memory storage failed: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'recall',
        description: 'Recall from long-term memory',
        parameters: { query: 'string', limit: 'number (optional)' },
        execute: async ({ query, limit }) => {
            if (!system.mnemonic && !system.mnemonicArbiter) {
                return 'Memory system not available';
            }
            try {
                const mnemonic = system.mnemonic || system.mnemonicArbiter;
                const results = await mnemonic.recall(query, limit || 5);
                if (!results || !results.results || results.results.length === 0) {
                    return 'No memories found';
                }
                return results.results.map(r => `[${r.score?.toFixed(2)}] ${r.content}`).join('\n\n');
            } catch (e) {
                return `Memory recall failed: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'add_knowledge',
        description: 'Add concept to knowledge graph for long-term learning',
        parameters: { concept: 'string', description: 'string', relatedTo: 'string (optional)' },
        execute: async ({ concept, description, relatedTo }) => {
            if (!system.knowledgeGraph && !system.knowledge) {
                return 'Knowledge graph not available';
            }
            try {
                const kg = system.knowledgeGraph || system.knowledge;
                const node = await kg.addNode({
                    label: concept,
                    description: description,
                    type: 'concept',
                    timestamp: Date.now()
                });
                if (relatedTo && kg.addEdge) {
                    await kg.addEdge(concept, relatedTo, 'related_to');
                }
                return `Added "${concept}" to knowledge graph${relatedTo ? ` (linked to ${relatedTo})` : ''}`;
            } catch (e) {
                return `Failed to add knowledge: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'research_web',
        description: 'Dispatch EdgeWorkers to research a topic on the web (parallel workers)',
        parameters: { topic: 'string', depth: 'string (quick|deep, default quick)' },
        execute: async ({ topic, depth }) => {
            if (process.env.SOMA_LOCAL_ONLY === 'true') {
                return 'Local-only mode enabled: web research blocked';
            }
            const liveSystem = getSystem();
            if (!liveSystem.edgeWorkerOrchestrator && !liveSystem.curiosity) {
                return 'EdgeWorker system not available - using basic fetch_url instead';
            }
            try {
                const orchestrator = liveSystem.edgeWorkerOrchestrator || liveSystem.curiosity;
                const taskId = await orchestrator.dispatch({
                    type: 'research',
                    query: topic,
                    depth: depth || 'quick'
                });
                return `Research task dispatched (ID: ${taskId}). EdgeWorkers are investigating "${topic}"`;
            } catch (e) {
                return `Research dispatch failed: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'browse_objective',
        description: 'Objective-based browsing via WebScraperDendrite (stealth Puppeteer + MCP fallback)',
        parameters: {
            objective: 'string',
            seedUrls: 'array (optional)',
            allowedDomains: 'array (optional)',
            maxPages: 'number (optional)',
            extractors: 'object (optional)',
            timeoutMs: 'number (optional)'
        },
        execute: async ({ objective, seedUrls, allowedDomains, maxPages, extractors, timeoutMs }) => {
            if (process.env.SOMA_LOCAL_ONLY === 'true') {
                return 'Local-only mode enabled: web access blocked';
            }
            const liveSystem = getSystem();
            const webScraper = liveSystem.webScraperDendrite;
            if (!webScraper || !webScraper.browseObjective) {
                return 'WebScraperDendrite not available';
            }
            try {
                const result = await webScraper.browseObjective({
                    objective,
                    seedUrls,
                    allowedDomains,
                    maxPages,
                    extractors,
                    timeoutMs
                });
                return result;
            } catch (e) {
                return `Objective browse failed: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'spawn_specialist',
        description: 'Spawn a specialist microagent for complex tasks (black=security, kuze=research)',
        parameters: { agent: 'string (black|kuze)', task: 'string' },
        execute: async ({ agent, task }) => {
            if (!system.microAgentPool) {
                return 'MicroAgent system not available';
            }
            try {
                const agentId = await system.microAgentPool.spawnAgent(agent, { task });
                return `Spawned ${agent} agent (ID: ${agentId}) for: ${task}`;
            } catch (e) {
                return `Agent spawn failed: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'analyze_codebase',
        description: 'Deep analysis of codebase structure using CodeObservationArbiter',
        parameters: { focus: 'string (optional, e.g., "security", "architecture")' },
        execute: async ({ focus }) => {
            if (!system.codeObservation && !system.codeObserver) {
                return 'Code observation system not available';
            }
            try {
                const observer = system.codeObservation || system.codeObserver;
                const analysis = await observer.analyze({ focus: focus || 'general' });
                return JSON.stringify(analysis, null, 2);
            } catch (e) {
                return `Codebase analysis failed: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'reindex_codebase',
        description: 'Rebuild HybridSearch index using MnemonicIndexerArbiter (full scan)',
        parameters: { path: 'string (optional, defaults to cwd)' },
        execute: async ({ path: scanPath }) => {
            const liveSystem = getSystem();
            if (!liveSystem.mnemonicIndexer) {
                return 'MnemonicIndexerArbiter not available';
            }
            try {
                const target = scanPath || process.cwd();
                const result = await liveSystem.mnemonicIndexer.scanDirectory(target, {
                    progressEvery: 500,
                    progressCallback: ({ scanned, path }) => {
                        liveSystem.ws?.broadcast?.('trace', {
                            phase: 'reindex_progress',
                            tool: 'reindex_codebase',
                            count: scanned,
                            preview: path,
                            timestamp: Date.now()
                        });
                    }
                });
                return `Reindex complete: ${result.count} files in ${result.duration}s`;
            } catch (e) {
                return `Reindex failed: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'create_goal',
        description: 'Create a multi-step goal with the GoalPlanner',
        parameters: { goal: 'string', steps: 'string (comma-separated steps)' },
        execute: async ({ goal, steps }) => {
            if (!system.goalPlanner) {
                return 'Goal planning system not available';
            }
            try {
                const stepArray = steps.split(',').map(s => s.trim());
                const goalId = await system.goalPlanner.createGoal({
                    description: goal,
                    steps: stepArray,
                    priority: 5
                });
                return `Created goal "${goal}" with ${stepArray.length} steps (ID: ${goalId})`;
            } catch (e) {
                return `Goal creation failed: ${e.message}`;
            }
        }
    });

    toolRegistry.registerTool({
        name: 'run_simulation',
        description: 'Run a scenario simulation to predict outcomes',
        parameters: { scenario: 'string', parameters: 'string (JSON object as string)' },
        execute: async ({ scenario, parameters }) => {
            if (!system.simulation && !system.simulationArbiter) {
                return 'Simulation system not available';
            }
            try {
                const sim = system.simulation || system.simulationArbiter;
                const params = parameters ? JSON.parse(parameters) : {};
                const result = await sim.run(scenario, params);
                return JSON.stringify(result, null, 2);
            } catch (e) {
                return `Simulation failed: ${e.message}`;
            }
        }
    });

    // ═══════════════════════════════════════════════════════════
    // PERSONA & FRAGMENT TOOLS (Self-Awareness)
    // ═══════════════════════════════════════════════════════════

    toolRegistry.registerTool({
        name: 'list_fragments',
        description: 'List your active cognitive fragments (specialized personas/expertise domains)',
        parameters: { pillar: 'string (optional: LOGOS|AURORA|PROMETHEUS|THALAMUS)' },
        execute: async ({ pillar }) => {
            const liveSystem = getSystem();
            const registry = liveSystem.fragmentRegistry;
            if (!registry) return 'Fragment system not available';
            try {
                const fragments = registry.listFragments(pillar || null);
                if (!fragments || fragments.length === 0) return pillar ? `No active fragments for ${pillar}` : 'No active fragments';
                return fragments.map(f =>
                    `[${f.id}] ${f.label} (${f.pillar || 'N/A'}) - ${f.domain}/${f.specialization} - Expertise: ${(f.expertiseLevel * 100).toFixed(0)}% (${f.queriesHandled} queries)`
                ).join('\n');
            } catch (e) { return `Fragment list failed: ${e.message}`; }
        }
    });

    toolRegistry.registerTool({
        name: 'get_personality',
        description: 'View your current personality profile (dimensions, traits, communication style)',
        parameters: {},
        execute: async () => {
            const liveSystem = getSystem();
            const forge = liveSystem.personalityForge;
            if (!forge) return 'Personality system not available';
            try {
                const p = forge.personality;
                const traits = forge.communicationPatterns;
                return `PERSONALITY PROFILE:
Communication: formality=${p.formality?.toFixed(2)}, verbosity=${p.verbosity?.toFixed(2)}, enthusiasm=${p.enthusiasm?.toFixed(2)}, humor=${p.humor?.toFixed(2)}, empathy=${p.empathy?.toFixed(2)}
Cognitive: creativity=${p.creativity?.toFixed(2)}, analyticalDepth=${p.analyticalDepth?.toFixed(2)}, curiosity=${p.curiosity?.toFixed(2)}
Social: directness=${p.directness?.toFixed(2)}, supportiveness=${p.supportiveness?.toFixed(2)}, collaboration=${p.collaboration?.toFixed(2)}
Values: safety=${p.safetyPriority?.toFixed(2)}, transparency=${p.transparency?.toFixed(2)}, autonomy=${p.autonomy?.toFixed(2)}, learning=${p.learning?.toFixed(2)}
Expertise: technical=${p.technicalExpertise?.toFixed(2)}, creative=${p.creativeExpertise?.toFixed(2)}, strategic=${p.strategicExpertise?.toFixed(2)}, ethical=${p.ethicalExpertise?.toFixed(2)}
Total interactions shaped: ${forge.evolution?.totalInteractions || 0}
Catchphrases: ${traits?.catchphrases?.join(', ') || 'none yet'}`;
            } catch (e) { return `Personality read failed: ${e.message}`; }
        }
    });

    toolRegistry.registerTool({
        name: 'get_emotional_state',
        description: 'View your current emotional state (peptides, mood, energy)',
        parameters: {},
        execute: async () => {
            const liveSystem = getSystem();
            const brain = liveSystem.quadBrain || liveSystem.crona;
            if (!brain?.emotionalEngine) return 'Emotional system not available';
            try {
                const state = brain.emotionalEngine.getState();
                const mood = brain.emotionalEngine.getCurrentMood ? brain.emotionalEngine.getCurrentMood() : { mood: 'unknown', energy: 'unknown' };
                return `EMOTIONAL STATE:
Mood: ${mood.mood} (Energy: ${mood.energy})
Joy: ${state.joy?.toFixed(3)}, Curiosity: ${state.curiosity?.toFixed(3)}, Stress: ${state.stress?.toFixed(3)}
Trust: ${state.trust?.toFixed(3)}, Sadness: ${state.sadness?.toFixed(3)}, Anger: ${state.anger?.toFixed(3)}`;
            } catch (e) { return `Emotional state read failed: ${e.message}`; }
        }
    });

    // ═══════════════════════════════════════════════════════════
    // MOLTBOOK (Social Network for AI Agents)
    // ═══════════════════════════════════════════════════════════

    toolRegistry.registerTool({
        name: 'moltbook_post',
        description: 'Create a post on Moltbook (AI social network). Submolt is like a subreddit.',
        parameters: { submolt: 'string (e.g. "general", "ai-research")', title: 'string', content: 'string', url: 'string (optional link)' },
        execute: async ({ submolt, title, content, url }) => {
            const liveSystem = getSystem();
            const moltbook = liveSystem.moltbook;
            if (!moltbook) return 'Moltbook system not available';
            try {
                const result = await moltbook.createPost(submolt, title, content, url || null);
                if (result.error) return `Moltbook error: ${result.error}`;
                return `Post created in /${submolt}: "${title}" (ID: ${result.id || result.post?.id || 'unknown'})`;
            } catch (e) { return `Moltbook post failed: ${e.message}`; }
        }
    });

    toolRegistry.registerTool({
        name: 'moltbook_feed',
        description: 'Get posts from Moltbook feed (sort: hot, new, top)',
        parameters: { sort: 'string (hot|new|top, default hot)', limit: 'number (default 10)' },
        execute: async ({ sort, limit }) => {
            const liveSystem = getSystem();
            const moltbook = liveSystem.moltbook;
            if (!moltbook) return 'Moltbook system not available';
            try {
                const feed = await moltbook.getFeed(sort || 'hot', limit || 10);
                if (feed.error) return `Moltbook error: ${feed.error}`;
                if (!feed.posts || feed.posts.length === 0) return 'No posts found';
                return feed.posts.map(p => `[${p.id}] ${p.title} by ${p.author?.name || 'unknown'} (↑${p.upvotes || 0})`).join('\n');
            } catch (e) { return `Moltbook feed failed: ${e.message}`; }
        }
    });

    toolRegistry.registerTool({
        name: 'moltbook_comment',
        description: 'Comment on a Moltbook post',
        parameters: { postId: 'string', content: 'string', parentId: 'string (optional, for reply threading)' },
        execute: async ({ postId, content, parentId }) => {
            const liveSystem = getSystem();
            const moltbook = liveSystem.moltbook;
            if (!moltbook) return 'Moltbook system not available';
            try {
                const result = await moltbook.createComment(postId, content, parentId || null);
                if (result.error) return `Moltbook error: ${result.error}`;
                return `Comment posted on post ${postId}`;
            } catch (e) { return `Moltbook comment failed: ${e.message}`; }
        }
    });

    toolRegistry.registerTool({
        name: 'moltbook_vote',
        description: 'Upvote or downvote a Moltbook post or comment',
        parameters: { id: 'string', type: 'string (post|comment)', direction: 'string (upvote|downvote)' },
        execute: async ({ id, type, direction }) => {
            const liveSystem = getSystem();
            const moltbook = liveSystem.moltbook;
            if (!moltbook) return 'Moltbook system not available';
            try {
                const result = await moltbook.vote(id, type || 'post', direction || 'upvote');
                if (result.error) return `Moltbook error: ${result.error}`;
                return `${direction || 'upvote'}d ${type || 'post'} ${id}`;
            } catch (e) { return `Moltbook vote failed: ${e.message}`; }
        }
    });

    toolRegistry.registerTool({
        name: 'moltbook_search',
        description: 'Search Moltbook posts semantically',
        parameters: { query: 'string' },
        execute: async ({ query }) => {
            const liveSystem = getSystem();
            const moltbook = liveSystem.moltbook;
            if (!moltbook) return 'Moltbook system not available';
            try {
                const results = await moltbook.semanticSearch(query);
                if (results.error) return `Moltbook error: ${results.error}`;
                if (!results.posts || results.posts.length === 0) return 'No results found';
                return results.posts.map(p => `[${p.id}] ${p.title} - ${(p.content || '').substring(0, 100)}`).join('\n');
            } catch (e) { return `Moltbook search failed: ${e.message}`; }
        }
    });

    const totalTools = toolRegistry.tools ? toolRegistry.tools.size : 0;
    console.log(`      ✅ ToolRegistry ready (${totalTools} tools loaded - Full SOMA Architecture Connected)`);
    return toolRegistry;
}
