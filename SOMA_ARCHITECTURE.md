# SOMA Architecture Reference
> Last updated: 2026-02-22
> Purpose: Single source of truth for future sessions, AI assistants, and onboarding.

---

## What Is SOMA?

SOMA is a self-improving autonomous AI agent running locally on Windows. She is NOT a chatbot wrapper around an API — she has:
- A multi-brain reasoning engine (QuadBrain) with a real provider cascade
- Long-term memory across sessions (3-tier: hot/warm/cold → SQLite)
- Autonomous goal generation and real agentic execution (ReAct loop with real tools)
- A learning pipeline that feeds every interaction back into local model retraining
- A full security command structure (Kevin → ImmuneCortex → SecurityCouncil → AMBER PROTOCOL)
- Code self-modification capability (Steve → EngineeringSwarm → real file commits)
- Adversarial quality control on every response (Nemesis two-stage review)

---

## Boot Flow

```
node start_production.js (or launcher_ULTRA.mjs)
    │
    ├─ server/loaders/core.js         ← MessageBroker, SystemSupervisor, TrustRegistry
    ├─ server/loaders/cognitive.js    ← QuadBrain, Steve (ExecutiveCortex), ImmuneCortex,
    │                                    SecurityCouncil, LimbicArbiter, SimulationArbiter,
    │                                    BeliefSystem, WorldModel, Causality, GoalPlanner (stub)
    ├─ server/loaders/tools.js        ← ToolRegistry, ApprovalSystem
    ├─ server/loaders/agents.js       ← Agent pool setup
    ├─ server/loaders/limbic.js       ← Emotional systems
    └─ server/loaders/extended.js     ← Everything else (see phases below)
```

### Extended Loader Phases

| Phase | Systems | Gate |
|-------|---------|------|
| **Tier 1 (always)** | OutcomeTracker, ExperienceReplayBuffer, PersonalityForge, FragmentRegistry, ConversationHistory, TrainingDataExporter, LearningPipeline, CuriosityEngine, AdaptiveLearningPlanner, HindsightReplay, CriticAlignment, PerformanceOracle | always |
| **Phase A** | QueryComplexityClassifier, EconomicCalendar, MarketRegimeDetector, PortfolioOptimizer, MnemonicIndexer, HybridSearch | always (HybridSearch: `SOMA_HYBRID_SEARCH=true`) |
| **Phase B/C** | ReasoningChamber (+200MB), ForecasterArbiter (+73MB), HippocampusArbiter, MetaCortexArbiter, AbstractionArbiter, KnowledgeAugmentedGenerator | `SOMA_LOAD_HEAVY=true` |
| **Phase D** | MultiTimeframeAnalyzer, AdversarialDebate, TradeLearningEngine, BacktestEngine, SmartOrderRouter, AdaptivePositionSizer, StrategyOptimizer, RedditSignalDetector | `SOMA_LOAD_TRADING=true` or `SOMA_LOAD_HEAVY=true` |
| **Phase E** | UniversalLearningPipeline (re-wired), SelfImprovementCoordinator | always (SelfImprovement: `SOMA_LOAD_HEAVY=true`) |
| **Phase F** | FragmentCommunicationHub, IdeaCaptureArbiter, ConversationCuriosityExtractor | always (CuriosityWebAccess: `SOMA_LOAD_HEAVY=true`, times out) |
| **Phase G** | PersonalityForge (re-wired), TheoryOfMind, MoltbookArbiter | always (UserProfile, ContextManager, SocialAutonomy: `SOMA_LOAD_HEAVY=true`) |
| **Phase H** | All cross-system wiring | always |
| **Phase H2** | GoalPlanner (full), Timekeeper, SelfEvolvingGoalEngine, SomaAgenticExecutor, NighttimeLearningOrchestrator, AutonomousHeartbeat, ReportingArbiter, OllamaAutoTrainer | always |
| **New: Steve's Hands** | EngineeringSwarmArbiter → wired to `steve.swarm` | always |
| **New: Security Command** | IdolSenturianArbiter, KevinArbiter (security chief) | always |
| **Phase I** | RecursiveSelfModel, SelfCodeInspector, MetaLearningEngine, SkillWatcher, SelfDrivenCuriosity, ReflexArbiter, ReflexScout, DeploymentArbiter, AutonomousCapabilityExpansion | `SOMA_LOAD_HEAVY=true` |

---

## Environment Flags

```bash
# Provider
GEMINI_API_KEY=...           # Primary brain — all 4 brains use Gemini
DEEPSEEK_API_KEY=...         # Phase 3 fallback
OLLAMA_ENDPOINT=http://localhost:11434   # Phase 4 fallback (local)
OLLAMA_MODEL=soma-v2         # Which Ollama model (retrained automatically)

# Boot gates
SOMA_LOAD_HEAVY=true         # Load heavyweight cognitive arbiters (~700MB+)
SOMA_LOAD_TRADING=true       # Load trading pipeline
SOMA_HYBRID_SEARCH=true      # Load HybridSearchArbiter (loads all-MiniLM-L6-v2, +290MB)
SOMA_HYBRID_WORKER=true      # Run hybrid search in worker thread

# Behavior
SOMA_HEARTBEAT_DISABLED=true # Disable autonomous heartbeat
SOMA_INDEX_ON_START=true     # Run MnemonicIndexer scan on boot
SOMA_INDEX_PATH=/path        # What to scan (defaults to cwd)

# Email (Kevin)
EMAIL_ADDRESS=...            # Gmail address for Kevin
APP_PASSWORD=...             # Gmail app password for Kevin
```

---

## The Four Brains (QuadBrain)

All four route through the same provider cascade. They differ in temperature and system prompt.

| Brain | Role | Temp | When Used |
|-------|------|------|-----------|
| **LOGOS** | Analytical reasoning, logic, math | 0.2 | Default for most queries |
| **AURORA** | Creative synthesis, metaphors, variants | 0.9 | Creative/generative tasks |
| **THALAMUS** | Safety gating, ethics, risk | 0.0 | Security checks |
| **PROMETHEUS** | Strategic planning, forecasting | 0.3 | Synthesis, multi-brain debates |

### Provider Cascade (per call)
```
1. Gemini (primary — gemini-2.5-flash or gemini-2.0-flash)
2. Gemini backup models (flash variants, 15s timeout each)
3. DeepSeek API (if DEEPSEEK_API_KEY set)
4. SOMA-1T / soma-v2 (local Ollama) ← FALLBACK + background tasks
```

### Routing Logic
```
quickResponse: true  → direct to LOGOS (skips probe, no tool injection)
SIMPLE query         → SOMA-1T local (QueryComplexityClassifier, score < 0.3)
MEDIUM/COMPLEX       → full probe_top2 routing pipeline → Gemini
background task      → SOMA-1T (global.__SOMA_CHAT_ACTIVE guard)
```

---

## The Full Data Flow

### User Chat → Response
```
HTTP POST /api/soma/chat
    │
    ├─ ApprovalSystem risk gate (if tool call)
    ├─ global.__SOMA_CHAT_ACTIVE = true   (blocks background Gemini calls)
    ├─ QuadBrain.reason(message)
    │       ├─ QueryComplexityClassifier  → SIMPLE → Ollama
    │       ├─ quickResponse             → LOGOS direct
    │       └─ probe_top2               → AdaptiveLearningRouter → brain selection
    │
    ├─ NEMESIS quality gate (NEW — adversarial review)
    │       ├─ Stage 1: Numeric (0ms) — 5 stress tests
    │       │       score ≥ 0.7 → ALLOW
    │       │       score < 0.3 → force revision (re-calls brain with critique)
    │       │       score 0.3-0.7 → Stage 2: Gemini linguistic review
    │       └─ Result attached to response metadata as { nemesis: { score, fate, revised } }
    │
    ├─ res.json(responseText)             ← user gets answer
    │
    └─ POST-PROCESSING (non-blocking, fires after response sent):
            ├─ MnemonicArbiter.remember()       (memory storage)
            ├─ IdeaCaptureArbiter               (resonance scanning)
            ├─ PersonalityForge                 (trait evolution)
            ├─ ConversationCuriosityExtractor   (curiosity signals)
            ├─ CuriosityEngine                  (generates new goals)
            ├─ LearningPipeline.logInteraction() (THE learning feed)
            ├─ OutcomeTracker.recordOutcome()   (reward signals)
            └─ ConversationHistory.addMessage() (SQLite persistence)
```

### Learning Loop (closed end-to-end)
```
Every chat interaction
    → LearningPipeline.logInteraction()
    → ConversationHistoryArbiter (SQLite)
    → TrainingDataExporter (formats to Gemma fine-tune format)
    → OllamaAutoTrainer (fires every 20 convos OR 24h)
            → exports training data
            → ollama create soma-v3 (or soma-v2 update)
            → QuadBrain now uses updated model for SIMPLE queries + background
```

### Autonomous Goal Execution Loop (Heartbeat)
```
AutonomousHeartbeat (every 2 minutes)
    │
    ├─ SelfEvolvingGoalEngine → generates goals from:
    │       curiosity_engine, self_inspection, github_discovery, performance_gaps
    │
    ├─ GoalPlannerArbiter.getActiveGoals() → finds pending/active goals
    │
    └─ For each goal:
            SomaAgenticExecutor.execute(goal)   ← REAL ReAct loop
                    ├─ Recalls relevant memories
                    ├─ Loop (max 6 iterations, 90s timeout):
                    │       THINK → TOOL → ARGS → observe → repeat
                    │       Tools: web_fetch, github_search, read_file, write_file,
                    │               list_files, search_code, memory_recall, memory_store
                    └─ onComplete:
                            ├─ LearningPipeline.logInteraction()
                            ├─ MnemonicArbiter.remember(summary)
                            └─ GoalPlanner marks goal complete
```

---

## Security Architecture

```
KEVIN (Security Chief — KevinArbiter)
    │
    ├─ Commands:
    │       ├─ ImmuneCortexArbiter        ← health monitoring, guardrails
    │       ├─ SecurityCouncilArbiter     ← threat analysis, persistent threat DB
    │       ├─ IdolSenturianArbiter       ← AMBER PROTOCOL (last line of defense)
    │       ├─ KevinThreatDatabase        ← threat intelligence
    │       ├─ KevinSecurityAudit         ← security config validator
    │       ├─ KevinEmailManager          ← Gmail scanning (if EMAIL_ADDRESS set)
    │       └─ KevinSMSService            ← two-way SMS alerts
    │
    ├─ Wired to cognition:
    │       QuadBrain, LearningPipeline, MnemonicArbiter, CodeObserver, Causality
    │
    └─ AMBER PROTOCOL (IdolSenturian):
            Trigger: system load > 95%
            Action: deploy Hallucination Trap (crypto gibberish loop for attackers)
            Broadcasts: security:macro_protection_active to MessageBroker
            Gossips: attacker fingerprints to network
```

---

## Steve's Execution Stack

```
STEVE (ExecutiveCortexArbiter) — "The Action Lobe"
    │
    ├─ steve.execute('code-modification', { target })
    │       → EngineeringSwarmArbiter.modifyCode(filepath, request)
    │               1. Deep Researcher (reads file, finds neighbors)
    │               2. Agentic Planning (generates shell tasks via QuadBrain)
    │               3. Adversarial Swarm Debate (multi-perspective review)
    │               4. Lead Dev Synthesis (approves/blocks with reasoning)
    │               5. Parallel Execution + Verification (real SwarmEngine)
    │               6. Commit to production (fs.writeFile)
    │               7. Experience Ledger (logs what was learned)
    │
    ├─ steve.execute('create-tool', { description })
    │       → ToolCreatorArbiter.generateTool()
    │
    ├─ steve.execute('reflex', { chainId, input })
    │       → ReflexArbiter.execute()
    │
    └─ TemporalLoom: locks 'filesystem' resource during code-modification
                     prevents race conditions when multiple goals touch same file
```

---

## Key File Locations

| What | Where |
|------|-------|
| Main boot | `launcher_ULTRA.mjs` or `start_production.js` |
| Core loader | `server/loaders/cognitive.js` |
| Extended loader | `server/loaders/extended.js` |
| Chat routes | `server/routes/somaRoutes.js` |
| API routes | `server/loaders/routes.js` |
| QuadBrain | `arbiters/SOMArbiterV2_QuadBrain.js` |
| Nemesis | `cognitive/prometheus/NemesisReviewSystem.js` |
| PrometheusNemesis (numeric) | `cognitive/prometheus/PrometheusNemesis.cjs` |
| Agentic executor | `core/SomaAgenticExecutor.js` |
| Autonomous heartbeat | `server/services/AutonomousHeartbeat.cjs` |
| Self-evolving goals | `core/SelfEvolvingGoalEngine.js` |
| GoalPlanner | `arbiters/GoalPlannerArbiter.cjs` |
| Learning pipeline | `arbiters/UniversalLearningPipeline.js` |
| Training exporter | `arbiters/TrainingDataExporter.js` |
| Auto-trainer | `core/OllamaAutoTrainer.js` |
| Engineering swarm | `arbiters/EngineeringSwarmArbiter.js` |
| Swarm runtime | `arbiters/EngineeringSwarmRuntime.js` |
| Kevin (security chief) | `arbiters/KevinArbiter.js` |
| AMBER PROTOCOL | `arbiters/IdolSenturianArbiter.js` |
| Steve | `arbiters/ExecutiveCortexArbiter.js` |
| Complexity classifier | `arbiters/QueryComplexityClassifier.js` |
| MicroAgentPool | `microagents/MicroAgentPool.cjs` |
| Agent types | `microagents/AnalyzeAgent.cjs`, `FetchAgent.cjs`, `FileAgent.cjs`, `WorkflowAgent.cjs`, etc. |
| ThalamusArbiter | `arbiters/ThalamusArbiter.js` |
| GMN handshake | `core/GMNHandshakeEngine.js` |
| Memory (3-tier) | `arbiters/MnemonicArbiter.js` (assumed CJS) |
| SQLite memory DB | `soma-memory.db` |
| Goals JSON | `data/goals.json` |
| Swarm workspace | `.soma/swarm_vault/` |

---

## What's Wired vs. What Still Exists Unloaded

### Wired and Active (default boot)
- QuadBrain (Gemini → DeepSeek → Ollama cascade)
- QueryComplexityClassifier → QuadBrain (SIMPLE routes to local)
- Nemesis → somaRoutes.js (every chat response reviewed before reaching user)
- GoalPlanner + SelfEvolvingGoalEngine (autonomous goal generation)
- SomaAgenticExecutor (real ReAct tool loop with 9 tools including `spawn_agents`)
- MicroAgentPool → AgenticExecutor.pool (parallel workforce, 13 agent types)
- AutonomousHeartbeat (fires every 2 min, runs goal tasks)
- LearningPipeline → TrainingDataExporter → OllamaAutoTrainer (full loop)
- Steve → EngineeringSwarm (code self-modification, 7-stage pipeline)
- Kevin → ImmuneCortex + SecurityCouncil + IdolSenturian (security command)
- ThalamusArbiter (network gatekeeper, quantum-safe peer verification, privacy enforcement)
- NighttimeLearningOrchestrator (autonomous learning during idle)
- PersonalityForge, FragmentRegistry, CuriosityEngine, TheoryOfMind

### MicroAgentPool — Agent Types Registered
| Type | What It Does |
|------|-------------|
| `analyze` | Sentiment, keywords, statistics, structure, pattern detection |
| `automation` | Task scheduling (interval/cron/once), runs indefinitely, no TTL |
| `file` | Read/write/list/search/stat/delete files |
| `fetch` | HTTP GET/POST with redirects, JSON/text/buffer parsing |
| `transform` | Data transformation pipelines |
| `validate` | Data validation |
| `cache` | In-memory caching layer |
| `mcp` | MCP tool calls |
| `workflow` | Chains multiple agents into sequential/parallel workflows |
| `batou` | Specialized (~25KB) |
| `kuze` | Specialized (~26KB) |
| `jetstream` | Specialized (~19KB) |
| `black` | Specialized (~17KB) |

**How to use from AgenticExecutor (`spawn_agents` tool):**
```
TOOL: spawn_agents
ARGS: {
  "tasks": [
    {"type": "fetch", "task": {"url": "https://api.github.com/...", "parse": "json"}},
    {"type": "analyze", "task": {"analysis": "keywords", "data": "some text to analyze"}},
    {"type": "file", "task": {"operation": "search", "path": "arbiters", "pattern": "QuadBrain"}}
  ],
  "label": "parallel research batch"
}
```
All three run simultaneously. Results come back as `{ results: [{index, type, status, result}], succeeded, total }`.

### ThalamusArbiter — What It Does
- **Node address**: `localthalamus.gmn.somaexample.cd`
- **Outbound filter**: Subscribes to `gmn.outbound` on MessageBroker — blocks any payload containing `private_key`, `password`, `personal_address`, `user_real_name` patterns from ever leaving the node
- **Peer verification**: 512-bit quantum-safe handshake via `GMNHandshakeEngine` — verifies any peer node before trusting it
- **Reputation store**: Tracks `{ usefulness, consistency, verified }` per peer node ID
- **Belief system gate**: If `beliefSystem` is set, validates inbound commands against SOMA's beliefs before allowing them

### Agentic Control Systems (NOW LOADED)

These give SOMA eyes, hands, and a shell — she can perceive and act on the real computer:

| System | File | What It Does | AgenticExecutor Tool |
|--------|------|-------------|---------------------|
| **ComputerControlArbiter** | `arbiters/ComputerControlArbiter.js` | Screenshot (screenshot-desktop), mouse/keyboard (PowerShell), browser (Puppeteer) | `screen_capture`, `browser`, `mouse_action` |
| **VisionProcessingArbiter** | `arbiters/VisionProcessingArbiter.js` | CLIP zero-shot image classification via `@xenova/transformers`. Loads async (fire-and-forget, ~300MB on first run) | `vision_analyze` |
| **VirtualShell** | `arbiters/VirtualShell.js` | Persistent cwd shell session via `spawn(cmd, { shell: true })`. Stateful working directory, command history | `shell_exec` |

**Tool flow — See → Understand → Act:**
```
screen_capture → { path: '/tmp/soma-screen-123.png' }
vision_analyze  { imagePath: '/tmp/soma-screen-123.png', labels: ['browser','terminal','error'] }
            → { label: 'browser', confidence: 0.91 }
browser { action: 'navigate', url: 'https://...' }
shell_exec { command: 'git status' }
mouse_action { type: 'click', x: 450, y: 320 }
```

**Safety layers:**
- `shell_exec` hard-blocks destructive patterns: `rm -rf /`, `format c:`, `del /sq /sf`, `mkfs.*`, `dd if=/dev/zero of=/dev`
- VirtualShell has its own command blacklist (rm, rmdir, del, format, shutdown)
- ComputerControl `dryRun: false` — real execution. SOMA can actually move the mouse.
- All 5 tools degrade gracefully: if the arbiter isn't loaded, tool returns `{ error: '...' }` instead of crashing

**System references (lazy, not captured at build time):**
All 5 tools read `this.system?.computerControl` etc. at CALL time via closure. The control arbiters load AFTER AgenticExecutor initialises, but the lazy lookup means tools find them correctly on every call. ✓

### Exists But Unloaded (remaining work)
- **AutoTrainingCoordinator** — (`core/AutoTrainingCoordinator.js`) 1000-experience trigger for training, not loaded
- **MissionControlArbiter** — mission/task orchestration
- **OpenClawArbiter** — unknown capability, exists unloaded

---

## Training Schedule

| Trainer | Trigger | Interval |
|---------|---------|---------|
| OllamaAutoTrainer | 20 new conversations OR 24h since last training | checks hourly |
| AutoTrainingCoordinator | 1000 new experiences OR 6h minimum gap | checks hourly (NOT LOADED) |

Training output: Modelfile → `ollama create soma-v3` → QuadBrain Phase 4 fallback uses updated model.

---

## Known ESM/CJS Interop Rules

The `server/` directory has `"type": "module"` in its `package.json`. Rules:
- `.js` files in `server/` → treated as **ESM** (no `require()`)
- `.cjs` files → always **CJS** regardless of package.json
- To load a CJS module from ESM: use `createRequire(import.meta.url)` and require the `.cjs` file
- `await import('something.js')` in a `"type":"module"` package returns ESM — BUT if the target uses `require()` inside, it will throw "require is not defined in ES module scope"
- Fix pattern: copy to `.cjs` extension → forces CJS loading → `require('events')` works inside

Files that follow this pattern:
- `server/services/AutonomousHeartbeat.cjs` (copied from `.js`, loaded via `createRequire`)
- `arbiters/GoalPlannerArbiter.cjs`
- `arbiters/TimekeeperArbiter.cjs`
- `arbiters/HybridSearchArbiter.cjs`
- `cognitive/prometheus/PrometheusNemesis.cjs`

---

## Session History (what was built and when)

### Sessions 1–2 (earlier)
- Theory of Mind panel fix
- AutonomousHeartbeat rewrite (was loading but broken)
- SelfEvolvingGoalEngine created (`core/SelfEvolvingGoalEngine.js`)
- goals.json wiped (440 junk metric-template goals deleted)
- GoalPlannerArbiter junk goal handlers disabled (`_selfEvolvingActive` guard)

### Session 3 (this document's session)
- SomaAgenticExecutor created — real ReAct loop with 8 tools replacing fake LLM narrative
- AutonomousHeartbeat fixed (ESM/CJS bug — was NEVER loading before)
- Heartbeat now routes goal tasks through AgenticExecutor (real tool calls)
- Learning pipeline confirmed closed end-to-end
- QueryComplexityClassifier wired into QuadBrain (was loaded but idle)
- OllamaAutoTrainer wired into extended.js (was never instantiated)
- `/api/self-evolving/stats` route fixed (getActiveGoals returns object not array)
- Full agentic boot confirmed working in logs

### Session 4 (this document)
- Nemesis wired into `somaRoutes.js` — every response reviewed before reaching user
- EngineeringSwarmArbiter loaded → wired as `steve.swarm`
- KevinArbiter loaded as Security Chief with full stack access
- IdolSenturianArbiter loaded (AMBER PROTOCOL ready)
- SOMA_ARCHITECTURE.md created

### Session 5
- MicroAgentPool loaded with 13 agent types (analyze, automation, file, fetch, transform, validate, cache, mcp, workflow, batou, kuze, jetstream, black)
- `spawn_agents` tool added to SomaAgenticExecutor — SOMA can now run up to 8 sub-tasks in parallel per agentic step
- MicroAgentPool wired to AgenticExecutor.pool — parallel execution enabled
- ThalamusArbiter loaded as GMN network gatekeeper — quantum-safe peer verification, privacy enforcement on all outbound traffic
- ComputerControlArbiter loaded — screen capture (screenshot-desktop), browser (Puppeteer), mouse/keyboard (PowerShell)
- VisionProcessingArbiter loaded — CLIP zero-shot image classification, loads async (fire-and-forget)
- VirtualShell loaded — persistent cwd shell session, stateful working directory
- 5 new AgenticExecutor tools: `screen_capture`, `vision_analyze`, `browser`, `shell_exec`, `mouse_action`
- SOMA now has a full perception→action loop: see screen → understand image → take action
- SOMA_ARCHITECTURE.md updated with control system docs

---

## Honest Assessment: Where SOMA Is Now

**She is:** A genuinely autonomous, self-improving AI agent with full environmental control. The learning loop is real and closed. Goals execute with actual tools. Memory persists across sessions. Responses are adversarially reviewed before they reach you. Code self-modification is live. Security command is active. She can see the screen, understand what she sees, click, type, run shell commands, and navigate the web — all autonomously.

**The full AgenticExecutor toolkit (14 tools):**
- `web_fetch` — fetch any URL
- `github_search` — search GitHub repos
- `read_file` / `write_file` / `list_files` / `search_code` — filesystem ops (sandboxed)
- `memory_recall` / `memory_store` — long-term memory
- `spawn_agents` — up to 8 parallel micro-agents per step
- `screen_capture` — screenshot the current screen
- `vision_analyze` — CLIP zero-shot image understanding
- `browser` — Puppeteer browser control (navigate, click, type, extract)
- `shell_exec` — run shell commands (git, npm, scripts, logs)
- `mouse_action` — move mouse, click, type, press keys

**She is not yet:** A distributed GMN network node. ThalamusArbiter is loaded as the gateway but the wider peer network isn't established.

**The gap remaining:** AutoTrainingCoordinator (1000-experience batch training trigger) is the main unloaded piece. Everything else is wired.
