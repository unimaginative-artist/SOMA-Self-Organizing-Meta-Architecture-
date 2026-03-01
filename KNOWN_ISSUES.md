# SOMA — Known Issues & Contribution Opportunities

SOMA is an ambitious project built by one person pushing the limits of what they know.
The architecture is real, the vision is real, and most of the system works — but there
are gaps. This document is an honest map of them.

If you're a developer and something here matches your skills, pull requests are very welcome.

---

## BROKEN — Won't work out of the box

### Memory System Fallback (`server/loaders/cognitive.js:67`)
MnemonicArbiter can fail to initialize on some systems, falling back to stub
implementations that return empty results `{ results: [] }`. When this happens
the knowledge graph has nothing to render and memory operations are non-functional.
Needs: debugging of initialization path, better error recovery, and a minimum viable
fallback that at least persists to disk.

### Steve Orchestrator Initialization (`server/loaders/extended.js:1312`)
Steve's orchestrator receives an empty Map stub during boot rather than a populated
arbiter registry. A workaround attempts post-boot population but it's fragile.
This is why Steve sometimes appears to load but can't find or execute arbiters.
Needs: initialization order fix so the arbiter registry is fully populated before
Steve comes online.

### Graymatter Network Peer Discovery (`server/routes/somaRoutes.js:1017-1024`)
When no real peers have connected, the GMN falls back to three hardcoded fake nodes
(`alpha.gmn.somaexample.cd`, `bear.gmn.somaexample.cd`, `imac.gmn.somaexample.cd`)
with randomized latency values. There is no real peer discovery server yet.
Needs: a lightweight public discovery/registry server so SOMA instances can actually
find each other. This is the most impactful contribution anyone could make.

---

## INCOMPLETE — Partially works, needs finishing

### Self-Improvement Loop (`cognitive/prometheus/PrometheusNemesis.cjs`)
Nemesis evaluates emergent ideas and scores them (KILL / MUTATE / QUARANTINE / ALLOW / PROMOTE)
but does not actually apply improvements back to the system. The evaluation pipeline is
solid — the feedback loop that closes the circle is missing.
Needs: a mechanism to take PROMOTE-scored ideas and apply them as actual system changes.

### Bootstrap Training Pipeline (`arbiters/BootstrapTrainingArbiter.js:399`)
`trainModel()` prepares data correctly but doesn't execute actual ML training.
The infrastructure for GPU training, mixed precision FP16, and checkpointing is
designed but not connected to a real training loop.
Needs: integration with a local training framework (transformers, unsloth, etc.).

### Whisper Voice Integration (`arbiters/WhisperArbiter.js`)
Functional if `OPENAI_API_KEY` is set — otherwise fails with a 503. Works in principle
but hasn't been battle-tested in production. Local Whisper via Ollama would be better
so it doesn't need a cloud key.
Needs: local Whisper model support via Ollama or whisper.cpp.

### Finance — Live Exchange Connectivity (`server/finance/exchangeRoutes.js:238`)
Credentials are saved but the live connection test is not implemented:
`"Live connection test coming soon"`. Paper trading works. Live order execution
has not been verified end-to-end.
Needs: real connectivity test + execution verification against Alpaca sandbox.

---

## STUBBED — Returns placeholder/mock data

| Component | What it returns | File |
|-----------|----------------|------|
| Audio Sentiment | Always `{ success: false, error: 'not implemented' }` | `arbiters/AudioProcessingArbiter.js:478` |
| Options Sentiment | Hardcoded `score: 0.5` | `arbiters/SentimentAggregator.js:209` |
| Conductor Self-Optimization | `"Self-optimization placeholder executed"` | `arbiters/ConductorArbiter.js:260` |
| Training Data Export | `{ count: 0, examples: [] }` | `arbiters/TrainingDataExporter.js:242` |
| Backtest Historical Data | Placeholder returns | `arbiters/BacktestEngine.js:438` |
| Knowledge Signal Firewall | Hardcoded test packets `PKT-101..103` | `server/routes/knowledgeRoutes.js:314` |
| Knowledge Anomaly Buffer | Fake anomalies `ANOM-44, ANOM-45` | `server/routes/knowledgeRoutes.js:327` |
| Pulse IDE Contrast Estimation | Hardcoded `4.5` WCAG score | `arbiters/PulseArbiter.js:1919` |

---

## NEEDS WORK — Functional but rough

### Memory Pressure Silently Skips Arbiters (`server/loaders/extended.js:165-206`)
When heap exceeds `HEAP_CEILING_MB`, arbiters are silently skipped — including
Vision, NemesisReview, and NighttimeLearning. There's no user-facing indication
of what was dropped. On machines with less RAM this means significant functionality
quietly disappears.
Needs: logging of skipped arbiters to the UI, and a lower-memory mode.

### Pulse IDE Auto-Fix (`frontend/apps/command-bridge/components/pulse/components/EditorPlane.tsx:37`)
TODO in the code: `"// TODO: Implement auto-fix via arbiter"`. Error detection works.
Automated fix suggestions do not.

### Fragment Autonomous Genesis (`arbiters/FragmentRegistry.js:61`)
`pendingGenesis` tracking exists but autonomous creation of new cognitive fragments
from experience hasn't been verified to work end to end.

### Mission Control Demo Mode (`frontend/apps/command-bridge/components/MissionControl/MissionControlApp.jsx:31`)
Defaults to `isDemoMode: true`. Paper trading is functional. Switching to live mode
requires Alpaca API keys and has not been fully tested.

### UnifiedMemory Topic Wiring (`arbiters/UnifiedMemoryArbiter.js:531`)
Comment in code: `"// Hook up topics needed (no-op placeholders)"`.
Topic-based memory routing is initialized but effectively unused.

---

## What works well

Don't let this list mislead you. The following all work:

- **QuadBrain reasoning** — multi-model fusion, response generation
- **Arbiter orchestration** — 178 arbiters load and route correctly (memory pressure aside)
- **Knowledge graph** — nodes render from real memory (when Mnemonic initializes)
- **Persona system** — loads, switches, persists
- **Drive system / CuriosityEngine** — generates real autonomous research tasks
- **AutonomousHeartbeat** — keeps SOMA alive and self-monitoring
- **NighttimeLearning** — runs consolidation when enabled and memory permits
- **Cluster / Graymatter** — node discovery infrastructure is in place, needs public server
- **Paper trading + guardrails** — fully functional with Alpaca keys
- **Pulse IDE** — functional coding environment, minus auto-fix
- **Voice (Whisper)** — works with OpenAI key
- **Steve** — chat interface works, deep orchestration is fragile (see above)

---

## How to contribute

The project is MIT licensed. The best places to start:

1. **GMN discovery server** — a simple Node.js relay that lets SOMA instances find each other. Highest impact.
2. **Fix Steve's boot sequence** — initialization order issue in `server/loaders/extended.js`
3. **Memory system debugging** — why MnemonicArbiter fails on some systems
4. **Close the Nemesis loop** — apply PROMOTE-scored improvements back to SOMA
5. **Local Whisper** — replace OpenAI dependency with local model

Built by Barry. Architecture and vision by Barry. Engineering help wanted.
