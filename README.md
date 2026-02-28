# SOMA — Self-Organizing Meta Architecture

> Local-first AI operating system. Persistent memory, 178 cognitive modules, multi-model reasoning. Runs on your hardware, not theirs.

SOMA is not a chatbot. She's an AI that lives on your computer, owns her own memory, and thinks with multiple minds at once. She gets smarter over time, orchestrates her own agents, and can control your desktop — all without phoning home.

---

## What makes SOMA different

| Feature | SOMA |
|---------|------|
| Runs locally | Yes — Ollama, no cloud required |
| Persistent memory | Yes — vector + graph, survives restarts |
| Multi-model reasoning | Yes — Gemini, Ollama, Anthropic, OpenAI |
| Self-improvement | Yes — Nemesis adversarial training loop |
| Agent orchestration | Yes — Steve + 178 specialized arbiters |
| Voice interface | Yes — Whisper STT + TTS |
| Your data stays yours | Yes |

---

## Core systems

**QuadBrain** — Four reasoning engines running in parallel. Gemini for breadth, Ollama for local speed, Nemesis for adversarial self-critique, Analyst for structured output. Results are fused into a single response.

**Arbiters** — 178 specialized cognitive modules. Each one owns a slice of SOMA's intelligence: memory archival, causal reasoning, computer vision, audio processing, autonomous capability expansion, adversarial debate, market analysis, web crawl, code review, and more.

**Persistent Memory** — Hybrid vector + knowledge graph. SOMA remembers conversations, builds beliefs over time, and can recall semantic context across sessions.

**Steve** — Autonomous multi-agent orchestration. Spawn shadow clone agents, run parallel task trees, require human approval on high-stakes actions.

**Pulse IDE** — AI-native coding environment built directly into SOMA's interface.

**Conceive** — Document and audit intelligence. Load Excel files, hunt numbers across sheets, analyze documents, ask SOMA to explain any cell in audit context.

---

## Requirements

- **Node.js** 18+
- **One AI backend** (any of the following):
  - [Ollama](https://ollama.com) — free, fully local
  - Gemini API key — fast, generous free tier
  - OpenAI or Anthropic API key — optional
- **RAM**: 8GB minimum, 16GB recommended

---

## Quick start

```bash
# Clone
git clone https://github.com/unimaginative-artist/soma.git
cd soma

# Install dependencies
npm install

# Set up your API keys
cp config/api-keys.env.example config/api-keys.env
# Open config/api-keys.env and add your keys

# Launch
node launcher_ULTRA.mjs
```

Then open **http://localhost:5173**

---

## API keys

Edit `config/api-keys.env` — you only need one to get started:

```env
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
ANTHROPIC_API_KEY=your_key_here
OLLAMA_BASE_URL=http://localhost:11434   # if using Ollama
```

---

## Project structure

```
soma/
├── core/           — boot sequence, QuadBrain, cognitive orchestration
├── arbiters/       — 178 specialized reasoning modules
├── server/         — Express API server and routes
├── frontend/       — React UI (Command Bridge, Pulse IDE, Conceive)
│   └── apps/
│       ├── command-bridge/    — main SOMA interface
│       ├── command-ct/        — cognitive terminal
│       └── conceive-bridge/   — audit & document intelligence
├── agents/         — autonomous microagents
├── workers/        — Node.js worker threads (non-blocking inference)
├── cognitive/      — personality, emotional engine, voice
├── scripts/        — startup and utility scripts
└── config/         — configuration (add your own api-keys.env)
```

---

## Screenshots

*Coming soon*

---

## License

MIT — see [LICENSE](LICENSE)

Built by Barry.
