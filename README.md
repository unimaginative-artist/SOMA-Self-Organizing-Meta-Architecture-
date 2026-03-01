# SOMA — Self-Organizing Meta Architecture

<div align="center">

**Local-first AI operating system. Persistent memory, 178 cognitive modules, multi-model reasoning.**
**Runs on your hardware, not theirs.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green)](https://nodejs.org)
[![Ollama](https://img.shields.io/badge/Ollama-supported-blue)](https://ollama.com)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/unimaginative-artist/SOMA-Self-Organizing-Meta-Architecture-/pulls)

</div>

---

SOMA is not a chatbot. She's an AI that lives on your computer, owns her own memory, and thinks with multiple minds at once. She gets smarter over time, orchestrates her own agents, learns while you sleep, and connects to other SOMA instances across the Graymatter Network — all without phoning home.

---

## Screenshots

**Cognitive Terminal — talk to SOMA**
![SOMA Cognitive Terminal](screenshots/Screenshot%202026-02-28%20093407.png)

**Mission Control — autonomous trading agents**
![Mission Control](screenshots/Screenshot%202026-02-28%20093626.png)

**Arbiterium — 178 cognitive modules, live**
![Arbiterium](screenshots/Screenshot%202026-02-28%20095130.png)

---

## What makes SOMA different

| Feature | SOMA |
|---------|------|
| Runs locally | Yes — Ollama, no cloud required |
| Persistent memory | Yes — vector + knowledge graph, survives restarts |
| Multi-model reasoning | Yes — QuadBrain fuses Gemini, Ollama, Nemesis, Analyst |
| Self-improvement | Yes — Nemesis adversarial training loop |
| Agent orchestration | Yes — Steve + 178 specialized arbiters |
| Voice interface | Yes — Whisper STT + TTS |
| Distributed network | Yes — Graymatter Network, P2P fractal sync |
| Dreams & overnight learning | Yes — consolidates memory while idle |
| Your data stays yours | Always |

---

## Core systems

**QuadBrain** — Four reasoning engines in parallel. Gemini for breadth, Ollama for local speed, Nemesis for adversarial self-critique, Analyst for structured output. Results are fused into a single response.

**Arbiters** — 178 specialized cognitive modules. Each owns a slice of SOMA's intelligence: memory archival, causal reasoning, curiosity engine, computer vision, audio, autonomous capability expansion, adversarial debate, market analysis, web crawl, code review, and more.

**Persistent Memory** — Hybrid vector + knowledge graph. SOMA remembers conversations, builds beliefs over time, and recalls semantic context across sessions without being prompted.

**Drive System** — SOMA has genuine curiosity. A drive engine and goal planner generate autonomous research tasks, self-directed questions, and unprompted learning — she wants to know things.

**Graymatter Network** — Every running SOMA instance is a node on a P2P mesh. Nodes share cognitive fractals, federated learning gradients, and memory across the network. The more people run her, the smarter the whole network gets.

**Steve** — Autonomous multi-agent orchestration. Spawn shadow clone agents, run parallel task trees, require human approval on high-stakes actions.

**Nighttime Learning** — While idle SOMA runs consolidation cycles: pruning weak memories, strengthening important ones, and synthesizing new connections between knowledge fragments.

**Pulse IDE** — AI-native coding environment built directly into the interface.

---

## Requirements

- **Node.js** 18+
- **One AI backend** (pick any):
  - [Ollama](https://ollama.com) — free, fully local, no API key needed
  - Gemini API key — fast, generous free tier
  - OpenAI or Anthropic API key — optional
- **RAM**: 8GB minimum, 16GB recommended

---

## Quick start

```bash
# Clone
git clone https://github.com/unimaginative-artist/SOMA-Self-Organizing-Meta-Architecture-.git
cd SOMA-Self-Organizing-Meta-Architecture-

# Install
npm install

# Configure
cp config/api-keys.env.example config/api-keys.env
# Add at least one API key or point to your Ollama instance

# Launch
node launcher_ULTRA.mjs
```

Open **http://localhost:5173**

---

## API keys

Edit `config/api-keys.env` — you only need one:

```env
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OLLAMA_BASE_URL=http://localhost:11434
```

---

## Project structure

```
SOMA/
├── core/           — boot, QuadBrain, drive system, orchestration
├── arbiters/       — 178 specialized cognitive modules
├── cognitive/      — personality, emotional engine, fractal nodes, memory
├── cluster/        — Graymatter Network, federated learning, P2P sync
├── server/         — Express API, routes, loaders
├── frontend/       — React UI (Command Bridge, Pulse IDE)
│   └── apps/
│       └── command-bridge/   — main SOMA interface
├── agents/         — autonomous microagents
├── workers/        — Node.js worker threads (non-blocking inference)
├── scripts/        — startup and cluster scripts
└── config/         — configuration templates
```

---

## The Graymatter Network

Every SOMA instance that boots automatically joins the Graymatter Network — a P2P mesh where nodes share:

- **Cognitive fractals** — learned knowledge structures
- **Federated gradients** — training signal without sharing raw data
- **Memory fragments** — anonymized semantic memories
- **Reputation** — nodes that contribute more earn higher trust scores

View your node's connections in **Settings → Network**.

---

## Roadmap

- [ ] Graymatter Network public discovery server
- [ ] One-click Electron installer
- [ ] Mobile companion app
- [ ] Plugin marketplace for custom arbiters
- [ ] Vision model integration (CLIP, LLaVA)

---

## Known Issues

SOMA is ambitious and honest about it. See [KNOWN_ISSUES.md](KNOWN_ISSUES.md) for a full breakdown of what's broken, what's stubbed, and what needs work. The short version: core reasoning, memory, arbiters, and the frontend all work. The self-improvement feedback loop, GMN peer discovery, and live trading execution need finishing.

## Contributing

Pull requests welcome. SOMA is modular by design — the easiest contribution is a new arbiter. Each arbiter is a self-contained JS class in `/arbiters` that inherits from `BaseArbiter`.

---

## License

MIT — see [LICENSE](LICENSE)

Built by Barry.
