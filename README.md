# SOMA — Self-Organizing Meta Architecture

SOMA is a local-first AI operating system. It runs on your machine, owns its own memory, reasons with multiple AI models simultaneously, and gets smarter over time — without sending your data anywhere it shouldn't go.

---

## What it does

- **QuadBrain** — four reasoning engines working in parallel (Gemini, Ollama local models, Nemesis adversarial, Analyst)
- **Arbiters** — 50+ specialized cognitive modules (memory, vision, audio, trading, coding, web crawl, and more)
- **Persistent memory** — vector + graph memory that survives restarts and builds over time
- **Steve** — autonomous multi-agent task orchestration with shadow clones and approval queues
- **Knowledge Graph** — 3D real-time visualization of what SOMA knows and how concepts connect
- **Voice** — Whisper STT + TTS, always listening if you want it to be
- **Pulse IDE** — an in-browser AI coding environment built into SOMA
- **Finance modules** — market analysis, portfolio optimization, paper trading, adversarial debate
- **Conceive** — AI-powered audit and document intelligence (Excel analysis, number hunting, document review)

---

## Requirements

- Node.js 18+
- One of: Ollama (local), Gemini API key, or OpenAI API key
- 8GB RAM minimum, 16GB recommended for heavy arbiters

---

## Quick start

```bash
# 1. Clone
git clone https://github.com/unimaginative-artist/soma.git
cd soma

# 2. Install
npm install

# 3. Add your API keys
cp config/api-keys.env.example config/api-keys.env
# Edit config/api-keys.env with your keys

# 4. Start
node launcher_ULTRA.mjs
```

Open `http://localhost:5173` in your browser.

---

## API keys

SOMA works with whatever you have. Add keys to `config/api-keys.env`:

```env
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here       # optional
ANTHROPIC_API_KEY=your_key_here    # optional
```

If you have Ollama running locally, SOMA will find it automatically.

---

## Architecture

```
SOMA
├── core/          — boot, QuadBrain, cognitive orchestration
├── arbiters/      — 50+ specialized reasoning modules
├── server/        — Express API, routes, loaders
├── frontend/      — React UI (Command Bridge, Pulse IDE, Conceive)
├── agents/        — autonomous microagents
├── workers/       — Node.js worker threads for non-blocking inference
└── config/        — environment and configuration (keys not included)
```

---

## License

MIT — see [LICENSE](LICENSE)

Built by Barry.
