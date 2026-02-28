import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import AgentMemoryManager from '../services/AgentMemoryManager.js';

const router = express.Router();
const SESSION_DIR = path.join(process.cwd(), 'data', 'arbiterium-sessions');

/**
 * Resolve an arbiter role string to an actual arbiter instance.
 * Falls back to QuadBrain if no specialist is found.
 */
function resolveArbiter(system, role) {
    const map = {
        // Core
        'general':        system.quadBrain,
        'finance':        system.finance,
        'trading':        system.finance,
        'research':       system.enrichmentArbiter || system.webResearcher || system.knowledgeGraph,
        'coding':         system.engineeringSwarm,
        'security':       system.securityCouncil || system.immuneCortex,
        'vision':         system.visionArbiter,
        // Specialists
        'forecasting':    system.forecaster,
        'reasoning':      system.reasoning || system.causality,
        'planning':       system.goalPlanner || system.strategyCortex,
        'creative':       system.muse,
        'memory':         system.mnemonicArbiter || system.hippocampus,
        'learning':       system.learningPipeline,
        'analysis':       system.reasoning || system.metaCortex,
        'debate':         system.adversarialDebate || system.devilsAdvocate,
        'portfolio':      system.portfolioOptimizer,
        'backtest':       system.backtestEngine,
        'sentiment':      system.sentimentAggregator,
        'tools':          system.toolCreator,
        // Extended
        'regime':         system.regimeDetector,
        'calendar':       system.economicCalendar,
        'position':       system.positionSizer,
        'strategy':       system.strategyOptimizer,
        'social':         system.socialAutonomy || system.redditSignals || system.sentimentAggregator,
        'curiosity':      system.curiosityEngine,
        'abstraction':    system.abstractionArbiter,
        'metacognition':  system.metaCortex,
        'personality':    system.personalityForge,
        'context':        system.contextManager,
        'improvement':    system.selfImprovement,
        'critique':       system.criticAlignment || system.devilsAdvocate,
        'summarize':      system.gistArbiter,
        'ideas':          system.ideaCapture,
        'knowledge-gen':  system.knowledgeGenerator,
        'performance':    system.performanceOracle,
        'order-routing':  system.smartOrderRouter,
        'hindsight':      system.hindsightReplay,
        'fragments':      system.fragmentComms || system.fragmentRegistry,
        'user-profile':   system.userProfile,
        'moltbook':       system.socialAutonomy || system.moltbook,
        'web-research':   system.webResearcher,
        // Phase I: Self-Awareness & Autonomy
        'self-awareness': system.recursiveSelfModel,
        'self-inspect':   system.selfCodeInspector,
        'meta-learning':  system.metaLearning,
        'enrichment':     system.enrichmentArbiter,
        'reflex':         system.reflexArbiter,
        'deployment':     system.deploymentArbiter,
        'training-data':  system.trainingDataExporter,
        'history':        system.conversationHistory,
        'expand':         system.autonomousExpansion,
        'skills':         system.skillWatcher
    };
    return map[role?.toLowerCase()] || system.quadBrain;
}

export default function(system) {
    // Initialize AgentMemoryManager
    const agentMemory = new AgentMemoryManager({
        mnemonic: system.mnemonicArbiter || system.mnemonic,
        knowledgeGraph: system.knowledgeGraph || system.knowledge,
        brain: system.quadBrain,
        outcomeTracker: system.outcomeTracker
    });
    agentMemory.initialize();

    // Ensure session directory exists
    fs.mkdir(SESSION_DIR, { recursive: true }).catch(() => {});

    // ═══════════════════════════════════════════
    // SESSION PERSISTENCE ENDPOINTS
    // ═══════════════════════════════════════════

    // POST /api/arbiterium/sessions/save
    router.post('/sessions/save', async (req, res) => {
        try {
            const { session } = req.body;
            if (!session || !session.id) {
                return res.status(400).json({ success: false, error: 'Session data with id required' });
            }

            const filePath = path.join(SESSION_DIR, `${session.id}.json`);
            await fs.writeFile(filePath, JSON.stringify(session, null, 2), 'utf8');

            res.json({ success: true, sessionId: session.id });
        } catch (error) {
            console.error('[Arbiterium] Session save error:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/arbiterium/sessions
    router.get('/sessions', async (req, res) => {
        try {
            await fs.mkdir(SESSION_DIR, { recursive: true }).catch(() => {});
            const files = await fs.readdir(SESSION_DIR);
            const sessions = [];

            for (const file of files.filter(f => f.endsWith('.json'))) {
                try {
                    const content = await fs.readFile(path.join(SESSION_DIR, file), 'utf8');
                    const session = JSON.parse(content);
                    // Return summary only (not full messages/plan for listing)
                    sessions.push({
                        id: session.id,
                        title: session.title,
                        lastActive: session.lastActive,
                        messageCount: session.messages?.length || 0,
                        hasplan: !!session.plan,
                        stepCount: session.plan?.steps?.length || 0
                    });
                } catch (e) {
                    // Skip corrupt files
                }
            }

            // Sort by lastActive descending
            sessions.sort((a, b) => (b.lastActive || 0) - (a.lastActive || 0));

            res.json({ success: true, sessions });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/arbiterium/sessions/:id
    router.get('/sessions/:id', async (req, res) => {
        try {
            const filePath = path.join(SESSION_DIR, `${req.params.id}.json`);
            const content = await fs.readFile(filePath, 'utf8');
            res.json({ success: true, session: JSON.parse(content) });
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // DELETE /api/arbiterium/sessions/:id
    router.delete('/sessions/:id', async (req, res) => {
        try {
            const filePath = path.join(SESSION_DIR, `${req.params.id}.json`);
            await fs.unlink(filePath);
            res.json({ success: true });
        } catch (error) {
            if (error.code === 'ENOENT') {
                return res.json({ success: true }); // Already gone
            }
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // POST /api/arbiterium/workflow-complete — store workflow results in long-term memory
    router.post('/workflow-complete', async (req, res) => {
        try {
            const { plan } = req.body;
            if (!plan) return res.status(400).json({ success: false, error: 'Plan required' });
            const result = await agentMemory.rememberWorkflow(plan);
            res.json({ success: true, stored: !!result });
        } catch (error) {
            console.error('[Arbiterium] Workflow memory error:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/arbiterium/memory/stats
    router.get('/memory/stats', (req, res) => {
        res.json({ success: true, stats: agentMemory.getStats() });
    });

    // GET /api/arbiterium/registry
    // Scans arbiters/ directory and returns all available arbiters with loaded status
    router.get('/registry', async (req, res) => {
        try {
            const arbitersDir = path.join(process.cwd(), 'arbiters');
            const files = await fs.readdir(arbitersDir);
            const arbiterFiles = files.filter(f => (f.endsWith('.js') || f.endsWith('.cjs')) && !f.startsWith('.'));

            // Get names of loaded arbiters from the system object
            const loadedNames = new Set();
            for (const [key, value] of Object.entries(system)) {
                if (value && typeof value === 'object') {
                    loadedNames.add(key.toLowerCase());
                    if (value.name) loadedNames.add(value.name.toLowerCase());
                    if (value.constructor?.name) loadedNames.add(value.constructor.name.toLowerCase());
                }
            }

            const registry = [];
            for (const file of arbiterFiles) {
                // Read first 25 lines for class name and description
                let name = file.replace(/\.(js|cjs)$/, '');
                let description = '';
                let role = 'specialist';

                try {
                    const filePath = path.join(arbitersDir, file);
                    const content = await fs.readFile(filePath, 'utf8');
                    const lines = content.split('\n').slice(0, 30);
                    const header = lines.join('\n');

                    // Extract class name
                    const classMatch = header.match(/(?:export\s+)?class\s+(\w+)/);
                    if (classMatch) name = classMatch[1];

                    // Extract JSDoc description
                    const descMatch = header.match(/\*\s+(.+?)(?:\n|\*\/)/);
                    if (descMatch) description = descMatch[1].trim().replace(/^\*\s*/, '');

                    // Extract role
                    const roleMatch = header.match(/role:\s*(?:ArbiterRole\.)?['"]?(\w+)/i);
                    if (roleMatch) role = roleMatch[1].toLowerCase();
                } catch (e) {
                    // Skip unreadable files
                }

                const loaded = loadedNames.has(name.toLowerCase()) ||
                               loadedNames.has(name.replace(/Arbiter$/i, '').toLowerCase());

                registry.push({ file, name, description, role, loaded });
            }

            // Sort: loaded first, then alphabetical
            registry.sort((a, b) => {
                if (a.loaded !== b.loaded) return b.loaded - a.loaded;
                return a.name.localeCompare(b.name);
            });

            res.json({
                success: true,
                total: registry.length,
                loaded: registry.filter(a => a.loaded).length,
                available: registry.filter(a => !a.loaded).length,
                arbiters: registry
            });
        } catch (error) {
            console.error('[Arbiterium] Registry error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/arbiterium/tools
    // Returns available tools from the ToolRegistry for frontend display
    router.get('/tools', (req, res) => {
        const registry = system.toolRegistry;
        if (!registry) {
            return res.json({ success: true, tools: [] });
        }
        res.json({ success: true, tools: registry.getToolsManifest() });
    });

    // POST /api/arbiterium/orchestrate
    // Takes a goal string and returns a structured workflow plan
    router.post('/orchestrate', async (req, res) => {
        try {
            const { goal } = req.body;
            
            if (!goal) {
                return res.status(400).json({ success: false, error: 'Goal is required' });
            }

            console.log(`[Arbiterium] Orchestrating goal: "${goal}"`);

            const brain = system.quadBrain || system.somArbiter;
            if (!brain) {
                throw new Error('SOMA Brain (QuadBrain) not available');
            }

            // Recall relevant past workflows for context
            let memoryContext = '';
            let memoriesRecalled = [];
            try {
                const recall = await agentMemory.recallForGoal(goal);
                memoryContext = recall.context;
                memoriesRecalled = recall.memories;
            } catch (memErr) {
                console.warn('[Arbiterium] Memory recall skipped:', memErr.message);
            }

            // Build dynamic tools list from registry
            const toolRegistry = system.toolRegistry;
            let toolsList = '';
            if (toolRegistry) {
                const manifest = toolRegistry.getToolsManifest();
                toolsList = manifest.map(t => {
                    const params = Object.keys(t.parameters || {}).join(', ');
                    return `- ${t.name}(${params}) — ${t.description}`;
                }).join('\n');
            }

            const planPrompt = `
You are the SOMA ORCHESTRATOR. The user has a goal: "${goal}".

Create a step-by-step execution plan using the available specialist arbiters AND executable tools.
${memoryContext ? `\n${memoryContext}\n` : ''}
Available Arbiter Roles (use EXACT key names):

COGNITIVE:
- general — default brain, handles anything not specialized
- reasoning — causal analysis, counterfactual thinking, logic problems
- debate — challenge assumptions, critique proposals, devil's advocate
- creative — brainstorming, creative generation, ideation
- analysis — data analysis, breakdown, quantitative assessment
- planning — multi-step goal decomposition, strategy design
- memory — recall past context, search knowledge base
- learning — capture insights, record outcomes for future use
- summarize — distill long content into concise summaries
- metacognition — self-reflection, strategy evaluation
- abstraction — pattern recognition, concept generalization
- knowledge-gen — knowledge-augmented text generation
- fragments — cognitive fragment management
- ideas — idea capture and creative sparks

RESEARCH & WEB:
- research — deep web research, fact-finding
- web-research — autonomous web crawling and data extraction
- enrichment — enrich data with additional context
- curiosity — explore knowledge gaps, autonomous learning

TRADING & FINANCE:
- finance — stock/crypto analysis, market research
- trading — trade execution, order management
- portfolio — asset allocation, rebalancing
- backtest — test strategies on historical data
- sentiment — market/social sentiment aggregation
- regime — market regime detection (bull/bear/ranging)
- calendar — economic calendar events
- position — position sizing and risk management
- strategy — strategy optimization
- order-routing — smart order routing across exchanges
- forecasting — predictions, probability analysis

DEVELOPMENT:
- coding — write, modify, debug, review code
- tools — create new tools or utilities on-the-fly

SECURITY:
- security — threat analysis, vulnerability assessment
- critique — alignment checking, value verification

SOCIAL & IDENTITY:
- social — social media interaction
- moltbook — internal social network
- user-profile — user preference modeling
- personality — personality trait management
- context — workspace state and project context

SELF-AWARENESS:
- self-awareness — recursive self-model inspection
- self-inspect — source code self-analysis
- meta-learning — learn how to learn better
- improvement — self-improvement coordination

INFRASTRUCTURE:
- performance — performance monitoring
- hindsight — experience replay and reflection
- history — conversation history recall
- deployment — deployment verification
- reflex — fast-path reflexive responses
- expand — autonomous capability expansion
- skills — skill watching and tool discovery

Available Executable Tools (include in "tools" array when a step needs real data):
${toolsList || '(Tool registry not available)'}

Return valid JSON:
{
  "goal": "${goal}",
  "summary": "Brief summary of the approach",
  "steps": [
    {
      "id": "step-1",
      "description": "Exact instruction for this step",
      "assignedArbiterRole": "role_key",
      "dependencies": [],
      "tools": ["tool_name"]  // optional: tools to execute for this step
    }
  ]
}

Rules:
1. Use the most specific role available
2. Include tool names in the "tools" array when a step needs real data (market prices, web content, files, search results)
3. For tool parameters, embed them in the description (e.g., "Fetch BTC price using get_market_data with symbol=BTC")
4. Keep steps atomic — one clear action per step
5. Dependencies must reference valid step IDs

JSON ONLY:`

            const result = await brain.reason(planPrompt, {
                systemOverride: "You are the SOMA Orchestrator. Output strictly JSON plans. Include tool suggestions when steps need real data.",
                temperature: 0.2
            });

            // Parse the JSON from the response
            let planData;
            try {
                const jsonMatch = result.text.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    planData = JSON.parse(jsonMatch[0]);
                } else {
                    planData = JSON.parse(result.text);
                }
            } catch (e) {
                console.warn('[Arbiterium] Plan parsing failed, using fallback plan', e);
                planData = {
                    goal,
                    summary: "Direct execution (parsing failed)",
                    steps: [
                        {
                            id: "step-1",
                            description: `Execute goal: ${goal}`,
                            assignedArbiterRole: "general",
                            dependencies: [],
                            tools: []
                        }
                    ]
                };
            }

            // Ensure each step has a tools array
            if (planData.steps) {
                planData.steps = planData.steps.map(step => ({
                    ...step,
                    tools: Array.isArray(step.tools) ? step.tools : []
                }));
            }

            planData.createdAt = Date.now();
            planData.memoriesRecalled = memoriesRecalled;
            res.json({ success: true, plan: planData });

        } catch (error) {
            console.error('[Arbiterium] Orchestration error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // POST /api/arbiterium/execute-step
    // Dispatches a single step to the correct specialist arbiter + executes tools
    router.post('/execute-step', async (req, res) => {
        try {
            const { stepId, description, arbiterRole, context, tools: toolHints } = req.body;

            const arbiter = resolveArbiter(system, arbiterRole);
            const brain = system.quadBrain || system.somArbiter;
            const arbiterName = arbiter?.name || arbiter?.constructor?.name || arbiterRole;
            const toolRegistry = system.toolRegistry;

            console.log(`[Arbiterium] Step ${stepId}: "${description}" → ${arbiterName} (role: ${arbiterRole})${toolHints?.length ? ` [tools: ${toolHints.join(', ')}]` : ''}`);

            // Recall relevant memories for this step
            let stepMemoryContext = null;
            try {
                stepMemoryContext = await agentMemory.recallForGoal(description, 800);
            } catch (e) { /* non-critical */ }

            // Build budget-aware context (replaces raw truncation)
            const budgetContext = agentMemory.buildStepContext({
                description,
                goal: context?.goal,
                previousResults: context?.previousResults || {},
                toolOutputs: {},  // Will be filled after tool execution
                recalledMemories: stepMemoryContext
            });
            let contextStr = budgetContext ? `\n${budgetContext}` : '';

            let result = null;
            let dispatched = false;
            let toolsUsed = [];
            let toolOutputs = {};

            // ═══════════════════════════════════════════
            // LAYER 1: Execute tool hints directly
            // If the orchestrator suggested specific tools, run them first
            // ═══════════════════════════════════════════
            if (toolRegistry && Array.isArray(toolHints) && toolHints.length > 0) {
                for (const toolName of toolHints) {
                    const tool = toolRegistry.getTool(toolName);
                    if (!tool) {
                        console.warn(`[Arbiterium] Tool "${toolName}" not found in registry`);
                        continue;
                    }

                    try {
                        // Extract parameters from the step description using QuadBrain
                        const paramNames = Object.keys(tool.parameters || {});
                        let toolArgs = {};

                        if (paramNames.length > 0 && brain) {
                            const paramPrompt = `Extract parameters for the tool "${toolName}" from this task description.
Task: "${description}"
Goal: "${context?.goal || ''}"

Required parameters: ${JSON.stringify(tool.parameters)}

Return ONLY a JSON object with the parameter values. Example: {"symbol": "BTC", "source": "binance"}
If a parameter is unclear, use a reasonable default.

JSON ONLY:`;
                            try {
                                const paramResult = await brain.reason(paramPrompt, { temperature: 0.1 });
                                const paramMatch = paramResult.text.match(/\{[\s\S]*\}/);
                                if (paramMatch) toolArgs = JSON.parse(paramMatch[0]);
                            } catch (pe) {
                                console.warn(`[Arbiterium] Param extraction failed for ${toolName}:`, pe.message);
                            }
                        }

                        console.log(`[Arbiterium] 🔧 Executing tool: ${toolName}`, toolArgs);
                        const toolResult = await toolRegistry.execute(toolName, toolArgs);
                        const toolResultStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2);
                        toolOutputs[toolName] = toolResultStr;
                        toolsUsed.push({ name: toolName, args: toolArgs, success: true });
                        console.log(`[Arbiterium] ✅ Tool ${toolName} returned ${toolResultStr.length} chars`);
                    } catch (toolErr) {
                        console.warn(`[Arbiterium] ⚠️ Tool ${toolName} failed:`, toolErr.message);
                        toolOutputs[toolName] = `Error: ${toolErr.message}`;
                        toolsUsed.push({ name: toolName, args: {}, success: false, error: toolErr.message });
                    }
                }
            }

            // ═══════════════════════════════════════════
            // LAYER 2: Try specialist arbiter
            // ═══════════════════════════════════════════
            const toolContext = Object.keys(toolOutputs).length > 0
                ? "\nTOOL RESULTS:\n" + Object.entries(toolOutputs).map(([k, v]) => `[${k}]: ${String(v).substring(0, 2000)}`).join('\n')
                : '';

            if (arbiter && arbiter !== brain) {
                try {
                    const fullInput = `${description}\n${contextStr}${toolContext}`;
                    if (typeof arbiter.reason === 'function') {
                        result = await arbiter.reason(fullInput, { temperature: 0.7 });
                    } else if (typeof arbiter.execute === 'function') {
                        result = await arbiter.execute(description, { ...context, toolOutputs });
                    } else if (typeof arbiter.process === 'function') {
                        result = await arbiter.process(fullInput);
                    } else if (typeof arbiter.analyze === 'function') {
                        result = await arbiter.analyze(fullInput);
                    } else if (typeof arbiter.getForecast === 'function') {
                        const forecast = await arbiter.getForecast(description);
                        result = { text: typeof forecast === 'string' ? forecast : JSON.stringify(forecast, null, 2), confidence: 0.8 };
                    } else if (typeof arbiter.challenge === 'function') {
                        const critique = await arbiter.challenge(description, '');
                        result = { text: typeof critique === 'string' ? critique : JSON.stringify(critique, null, 2), confidence: 0.8 };
                    } else if (typeof arbiter.run === 'function') {
                        const output = await arbiter.run(fullInput);
                        result = { text: typeof output === 'string' ? output : JSON.stringify(output, null, 2), confidence: 0.7 };
                    }

                    if (result) {
                        dispatched = true;
                        console.log(`[Arbiterium] ✅ Dispatched to ${arbiterName}`);
                    }
                } catch (arbiterErr) {
                    console.warn(`[Arbiterium] ⚠️ ${arbiterName} failed, falling back to brain:`, arbiterErr.message);
                    result = null;
                }
            }

            // ═══════════════════════════════════════════
            // LAYER 3: QuadBrain with tool-augmented reasoning
            // If no specialist handled it, or if we have tool data to synthesize
            // ═══════════════════════════════════════════
            if (!result) {
                // If we have tool outputs, ask brain to synthesize them
                if (Object.keys(toolOutputs).length > 0) {
                    const synthesisPrompt = `TASK: "${description}"
ROLE: ${arbiterRole}
${contextStr}

You have access to real tool outputs. Synthesize them into a clear, actionable result.
${toolContext}

Provide a comprehensive response using the real data above. Be specific and cite the data.`;
                    result = await brain.reason(synthesisPrompt, { temperature: 0.4, role: arbiterRole });
                } else if (toolRegistry && !toolHints?.length) {
                    // No tool hints provided — ask brain if it wants to use tools
                    const toolManifest = toolRegistry.getToolsManifest().slice(0, 20); // Top 20 tools
                    const toolPickPrompt = `TASK: "${description}"
ROLE: ${arbiterRole}
${contextStr}

You have access to these executable tools:
${toolManifest.map(t => `- ${t.name}: ${t.description} (params: ${JSON.stringify(t.parameters)})`).join('\n')}

If ANY tool would help complete this task, respond with JSON: {"use_tools": [{"name": "tool_name", "args": {"param": "value"}}]}
If no tools are needed, respond with JSON: {"use_tools": []}

JSON ONLY:`;
                    try {
                        const pickResult = await brain.reason(toolPickPrompt, { temperature: 0.1 });
                        const pickMatch = pickResult.text.match(/\{[\s\S]*\}/);
                        if (pickMatch) {
                            const picked = JSON.parse(pickMatch[0]);
                            if (picked.use_tools && picked.use_tools.length > 0) {
                                // Execute the tools the brain picked
                                for (const toolCall of picked.use_tools.slice(0, 5)) { // Max 5 tools
                                    try {
                                        console.log(`[Arbiterium] 🧠🔧 Brain picked tool: ${toolCall.name}`, toolCall.args);
                                        const toolResult = await toolRegistry.execute(toolCall.name, toolCall.args || {});
                                        const toolResultStr = typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2);
                                        toolOutputs[toolCall.name] = toolResultStr;
                                        toolsUsed.push({ name: toolCall.name, args: toolCall.args, success: true, brainPicked: true });
                                    } catch (toolErr) {
                                        toolOutputs[toolCall.name] = `Error: ${toolErr.message}`;
                                        toolsUsed.push({ name: toolCall.name, args: toolCall.args, success: false, error: toolErr.message, brainPicked: true });
                                    }
                                }

                                // Now synthesize with real tool data
                                const newToolContext = "\nTOOL RESULTS:\n" + Object.entries(toolOutputs).map(([k, v]) => `[${k}]: ${String(v).substring(0, 2000)}`).join('\n');
                                const synthesisPrompt = `TASK: "${description}"
ROLE: ${arbiterRole}
${contextStr}
${newToolContext}

Synthesize the tool results into a clear, actionable response. Cite the real data.`;
                                result = await brain.reason(synthesisPrompt, { temperature: 0.4, role: arbiterRole });
                            }
                        }
                    } catch (pickErr) {
                        console.warn('[Arbiterium] Tool pick parsing failed:', pickErr.message);
                    }
                }

                // Final fallback: straight brain reasoning
                if (!result) {
                    const prompt = `EXECUTE TASK: "${description}"\nROLE: ${arbiterRole}\n${contextStr}\n\nPerform the task. If it requires code, write the code. If it requires analysis, provide the analysis.\nReturn the result directly.`;
                    result = await brain.reason(prompt, { temperature: 0.7, role: arbiterRole });
                }
            }

            // Record outcome for learning
            if (system.outcomeTracker) {
                system.outcomeTracker.recordOutcome({
                    id: stepId,
                    action: description,
                    role: arbiterRole,
                    arbiter: arbiterName,
                    result: (result.text || '').substring(0, 500),
                    confidence: result.confidence,
                    dispatched,
                    toolsUsed: toolsUsed.map(t => t.name),
                    timestamp: Date.now()
                }).catch(() => {});
            }

            // Auto-remember significant step results
            agentMemory.rememberStep(
                { id: stepId, description, assignedArbiterRole: arbiterRole, output: result.text || '', tools: toolHints, toolsUsed },
                context?.goal || description
            ).catch(() => {}); // Fire and forget

            res.json({
                success: true,
                output: result.text || (typeof result === 'string' ? result : JSON.stringify(result)),
                status: 'completed',
                metadata: {
                    arbiter: arbiterName,
                    brain: result.brain,
                    confidence: result.confidence,
                    dispatched,
                    toolsUsed
                }
            });

        } catch (error) {
            console.error('[Arbiterium] Execution error:', error);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    // GET /api/arbiterium/autonomous/status — heartbeat and autopilot status
    router.get('/autonomous/status', (req, res) => {
        const heartbeat = system.autonomousHeartbeat;
        const goalPlanner = system.goalPlanner;
        const curiosityEngine = system.curiosityEngine;

        res.json({
            success: true,
            heartbeat: {
                running: heartbeat?.isRunning ?? false,
                stats: heartbeat?.stats ?? null,
                intervalMs: heartbeat?.config?.intervalMs ?? null
            },
            sources: {
                activeGoals: goalPlanner?.activeGoals?.size ?? 0,
                curiosityQueue: curiosityEngine?.curiosityQueue?.length ?? 0,
                nighttimeSessions: system.nighttimeLearning?.activeSessions?.size ?? 0
            },
            autopilot: {
                goals: goalPlanner?.isAutonomousActive?.() ?? false,
                rhythms: system.timekeeper?.isAutonomousActive?.() ?? false,
                social: system.socialAutonomy?.isActive ?? false
            },
            taskStates: heartbeat?.getAllTaskStates?.() ?? {},
            scheduledJobs: (heartbeat?.listSchedules?.() ?? []).length
        });
    });

    // POST /api/arbiterium/autonomous/toggle — start/stop the heartbeat
    router.post('/autonomous/toggle', (req, res) => {
        const { enabled } = req.body;
        const heartbeat = system.autonomousHeartbeat;

        if (!heartbeat) {
            return res.status(503).json({ success: false, error: 'AutonomousHeartbeat not loaded' });
        }

        if (enabled) {
            heartbeat.start();
        } else {
            heartbeat.stop();
        }

        res.json({ success: true, running: heartbeat.isRunning, stats: heartbeat.stats });
    });

    // GET /api/arbiterium/autonomous/log — read the JSONL run history
    router.get('/autonomous/log', (req, res) => {
        const heartbeat = system.autonomousHeartbeat;
        if (!heartbeat) {
            return res.status(503).json({ success: false, error: 'AutonomousHeartbeat not loaded' });
        }
        const limit = Math.min(500, Math.max(1, parseInt(req.query.limit, 10) || 100));
        const entries = heartbeat.readRunLog(limit);
        res.json({ success: true, count: entries.length, entries });
    });

    // GET /api/arbiterium/autonomous/task-states — per-task execution history
    router.get('/autonomous/task-states', (req, res) => {
        const heartbeat = system.autonomousHeartbeat;
        if (!heartbeat) {
            return res.status(503).json({ success: false, error: 'AutonomousHeartbeat not loaded' });
        }
        res.json({ success: true, taskStates: heartbeat.getAllTaskStates() });
    });

    // GET /api/arbiterium/autonomous/schedules — list all scheduled jobs
    router.get('/autonomous/schedules', (req, res) => {
        const heartbeat = system.autonomousHeartbeat;
        if (!heartbeat) {
            return res.status(503).json({ success: false, error: 'AutonomousHeartbeat not loaded' });
        }
        res.json({ success: true, schedules: heartbeat.listSchedules() });
    });

    // POST /api/arbiterium/autonomous/schedules — add a scheduled job
    // Body: { name, message, schedule: { kind: 'cron'|'every'|'at', expr?, everyMs?, atMs? } }
    router.post('/autonomous/schedules', (req, res) => {
        const heartbeat = system.autonomousHeartbeat;
        if (!heartbeat) {
            return res.status(503).json({ success: false, error: 'AutonomousHeartbeat not loaded' });
        }
        const { name, message, description, schedule, enabled } = req.body;
        if (!schedule || !schedule.kind) {
            return res.status(400).json({ success: false, error: 'schedule.kind is required (cron, every, or at)' });
        }
        if (!message && !description) {
            return res.status(400).json({ success: false, error: 'message or description is required' });
        }
        const entry = heartbeat.addSchedule({ name, message, description, schedule, enabled });
        res.json({ success: true, schedule: entry });
    });

    // DELETE /api/arbiterium/autonomous/schedules/:id — remove a scheduled job
    router.delete('/autonomous/schedules/:id', (req, res) => {
        const heartbeat = system.autonomousHeartbeat;
        if (!heartbeat) {
            return res.status(503).json({ success: false, error: 'AutonomousHeartbeat not loaded' });
        }
        const removed = heartbeat.removeSchedule(req.params.id);
        if (!removed) {
            return res.status(404).json({ success: false, error: 'Schedule not found' });
        }
        res.json({ success: true });
    });

    // ═══════════════════════════════════════════
    // SKILLS: Create, list, manage hot-loaded skills
    // ═══════════════════════════════════════════

    // GET /api/arbiterium/skills — list all loaded skills
    router.get('/skills', (req, res) => {
        const watcher = system.skillWatcher;
        if (!watcher) {
            return res.json({ success: true, skills: [], message: 'SkillWatcher not loaded' });
        }
        const owner = req.query.owner || null;
        const skills = watcher.getSkills(owner).map(s => ({
            name: s.name,
            description: s.description,
            owner: s.owner,
            path: s.path,
            parameters: s.parameters
        }));
        res.json({ success: true, skills, count: skills.length });
    });

    // POST /api/arbiterium/skills/create — create a new skill via ToolCreator + QuadBrain
    // Body: { name: 'my_tool', description: 'What it should do' }
    router.post('/skills/create', async (req, res) => {
        const creator = system.toolCreator;
        if (!creator) {
            return res.status(503).json({ success: false, error: 'ToolCreatorArbiter not loaded' });
        }
        const { name, description } = req.body;
        if (!name || !description) {
            return res.status(400).json({ success: false, error: 'name and description are required' });
        }
        // Sanitize tool name
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
        try {
            const result = await creator.createTool(safeName, description);
            res.json({ success: true, ...result });
        } catch (error) {
            console.error('[Arbiterium] Skill creation error:', error.message);
            res.status(500).json({ success: false, error: error.message });
        }
    });

    return router;
}
