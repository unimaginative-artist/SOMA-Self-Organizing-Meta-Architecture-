# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

SOMA (Self-Organizing Metacognitive Architecture) is an advanced AGI/ASI system featuring:
- **QuadBrain**: 4-phase cognitive system (LOGOS, AURORA, THALAMUS, PROMETHEUS)
- **Arbiter Swarm**: Population of specialized AI agents coordinated via message broker
- **Hybrid Memory**: 3-tier architecture (Redis hot, Vector warm, SQLite cold)
- **Continuous Learning**: Simulation-based learning with HER (Hindsight Experience Replay)
- **Electron Dashboard**: React-based command bridge UI with real-time monitoring

The system runs as an Electron app with a Node.js backend, frontend UI, and optional ML Flask backend.

## Development Commands

### Essential Commands

#### Running the Full System
```powershell
# Start all services (SOMA backend, Vite dev server, Electron app)
npm run start:all

# Alternative: Run individual services
npm run dev              # Vite dev server only (port 5173)
npm run dev:backend     # SOMA backend only (port 3001)
npm run server          # Backend server (alternative)
```

#### Quick Testing
```powershell
# Quick SOMA system test
npm run soma:test

# Run main SOMA launcher
npm run soma

# Health check
npm run health
```

#### Cluster Mode (Multi-machine coordination)
```powershell
# Start as coordinator
npm run soma:cluster:coordinator

# Start as worker
npm run soma:cluster:worker
```

#### Building
```powershell
# Build frontend for production
npm run build

# Build Electron app
npm run electron:build

# Pack Electron (no installer)
npm run electron:pack
```

#### Process Management
```powershell
# Kill all running processes
npm run kill

# Restart entire system
npm run restart
```

### Test Files Location
- `tests/` directory contains integration tests
- `tests/quick_test.mjs` - Fast system validation
- Use Node.js ESM modules (`.mjs`) for tests

## Architecture Overview

### System Entry Points

**Main Launcher**: `launcher_ULTRA.mjs`
- Bootstraps entire SOMA system
- Initializes all arbiters and services
- Sets up web server (Express + WebSocket)
- Port 3001 (backend), Port 5173 (Vite dev)

**Development Launcher**: `start-dev.cjs`
- Orchestrates multi-process development environment
- Starts Flask ML backend (port 5000)
- Starts SOMA backend (port 3001)  
- Starts Vite dev server (port 5173)
- Launches Electron in dev mode

**Electron Main**: `electron-main.cjs` (implied from package.json)
- Electron main process entry

### Core Architecture Components

#### 1. Arbiters (`arbiters/` directory)
The swarm of specialized AI agents. Key arbiters include:

- **SOMArbiterV2_QuadBrain.js**: 4-brain cognitive system (primary reasoning)
- **MnemonicArbiter.js**: 3-tier hybrid memory manager
- **UnifiedMemoryArbiter.js**: Consolidated memory interface
- **ArchivistArbiter.js**: Storage optimization
- **MetaLearningEngine.js**: Learning-to-learn capabilities
- **UniversalLearningPipeline.js**: Experience replay and training
- **TrainingCoordinator.js**: Live training orchestration
- **CodeObservationArbiter.js**: Self-code observation (265 files, 99K+ lines)
- **DreamArbiter.js**: Sleep cycle learning (REM/NREM/Deep)
- **TimekeeperArbiter.js**: Scheduled rhythms (nightly learning, weekly audits)
- **GoalPlannerArbiter.js**: Hierarchical goal management
- **BeliefSystemArbiter.js**: Belief tracking and contradiction detection
- **SelfModificationArbiter.js**: Sandboxed code evolution
- **GenomeArbiter.js**: Evolutionary optimization
- **KnowledgeGraphFusion.js**: Semantic graph with cross-domain reasoning
- **SkillAcquisitionArbiter.js**: Skill detection and proficiency tracking

All arbiters communicate via **MessageBroker** (`core/MessageBroker.js`).

#### 2. Core System (`core/` directory)

- **SomaBootstrap.js**: System initialization coordinator
- **SomaConfig.js**: Configuration management (reads .env)
- **ArbiterOrchestrator.cjs**: Spawns and manages arbiter population
- **KEVINManager.mjs**: Defensive AI system (threat detection)
- **SystemSupervisor.js**: Health monitoring and recovery
- **CognitiveBalancer.js**: Load balancing across cognitive systems
- **DaemonBridge.js**: Integration with background services
- **EmotionalEngine.js** (`src/cognitive/`): 20-peptide emotional system
- **CognitiveCore.js** (`src/cognitive/`): Manipulation-resistant emotional wrapper
- **Logger.js**: Centralized logging

#### 3. Memory System

**3-Tier Hybrid Architecture**:
1. **Hot Tier** (Redis): <1ms access, working memory (optional, can be disabled)
2. **Warm Tier** (Vectors): 10-50ms, semantic search (in-memory FAISS)
3. **Cold Tier** (SQLite): 50-200ms, long-term archive (`soma-memory.db`)

Current stats: 956 memories, 592 vectors loaded

#### 4. Frontend (`src/` and `frontend/apps/command-bridge/`)

- **Technology**: React 18, Vite, Tailwind CSS, Radix UI
- **Entry**: `SomaCommandBridge.jsx`
- **Backend Client**: `somaBackend.js` (WebSocket + HTTP client)
- **Key Features**:
  - Real-time metrics dashboard
  - Orb voice interface (Whisper STT + ElevenLabs TTS)
  - Knowledge graph 3D visualization (Three.js)
  - Terminal integration
  - Approval queue for risky operations
  - 15+ specialized UI modules

#### 5. Backend Server (`server/` directory)

- **Main**: `index.cjs` or `soma-server.js`
- **API Server**: Express (port 3001)
- **WebSocket**: For real-time updates to frontend
- **Endpoints**: `/health`, `/stats`, `/remember`, `/recall`, `/forget`
- **Finance Routes**: `/api/scalping`, `/api/market`, `/api/lowlatency`

#### 6. Learning Systems

**Simulation Learning** (30-100x faster than real-world):
- **SimulationControllerArbiter**: Physics simulations
- **HER (Hindsight Experience Replay)**: Goal-relabeling for sparse rewards
- **ExperienceReplayBuffer**: Prioritized sampling
- **MetaLearningEngine**: Hyperparameter optimization
- **KnowledgeBridge**: Simulation → Cognition transfer (85-90% confidence)

**Continuous Learning**:
- **Scheduled Operations**:
  - Nightly learning: 4 AM daily
  - Weekly code audit: Sunday 2 AM
  - Daily web crawl: 3 AM
  - Goal planning: Every 6 hours
  - Belief management: Hourly contradiction checks

### Data Flow

```
User Input → Frontend (React) 
          → somaBackend.js (WebSocket/HTTP)
          → Backend Server (Express)
          → ArbiterOrchestrator
          → MessageBroker
          → Arbiter Swarm
          → Memory/Learning/Cognition
          → Response → WebSocket
          → Frontend Update
```

## Configuration & Environment

### Required Environment Variables

The system reads from `.env` file (create from example if needed):

```bash
# Core API Keys
GEMINI_API_KEY=          # Google Gemini API
OPENAI_API_KEY=          # OpenAI API (optional)

# KEVIN System (Email-based defensive AI)
KEVIN_EMAIL=             # Email for KEVIN system
KEVIN_APP_PASSWORD=      # App password for email

# Port Configuration
PORT=3001                # Backend server port
SOMA_CLUSTER_PORT=7777   # Cluster communication port

# Mode Settings
SOMA_MODE=cluster        # 'standalone' or 'cluster'
SOMA_ROLE=coordinator    # 'coordinator' or 'worker' (auto-detected by hostname)
SOMA_CLUSTER=false       # Enable cluster networking
SOMA_GPU=true            # Enable GPU acceleration
```

### Port Reference

| Service | Port | Purpose |
|---------|------|---------|
| SOMA Backend | 3001 | Main API server |
| Vite Dev Server | 5173 | Frontend development |
| Flask ML Backend | 5000 | Machine learning API (optional) |
| Cognitive Terminal | 4200 | Alternative CT server (optional) |
| Cluster Communication | 7777 | Multi-node coordination |

### Database Files

- **soma-memory.db**: SQLite database (cold tier memory)
- **polymer-storage.db**: Polymer storage system
- **server/hippocampus/**: JSON memory files
- **server/.arbiter-state/**: Arbiter persistent state

## Key Development Patterns

### 1. Working with Arbiters

When modifying or creating arbiters:

```javascript
import { BaseArbiter } from '../core/BaseArbiter.js';

export class MyNewArbiter extends BaseArbiter {
  constructor(opts) {
    super(opts);
    this.name = 'MyNewArbiter';
    // Subscribe to message broker topics
    if (opts.messageBroker) {
      this.messageBroker = opts.messageBroker;
      this.messageBroker.subscribe('topic_name', this.handleMessage.bind(this));
    }
  }
  
  async handleMessage(message) {
    // Process incoming messages
  }
  
  async sendMessage(topic, data) {
    this.messageBroker?.publish(topic, data);
  }
}
```

### 2. Memory Operations

Always use MnemonicArbiter for memory operations:

```javascript
// Store memory
await mnemonic.remember({
  content: 'Key information',
  embedding: vectorEmbedding,  // Optional
  metadata: { source: 'user', importance: 0.8 }
});

// Retrieve memory
const results = await mnemonic.recall({
  query: 'search term',
  limit: 10,
  minRelevance: 0.7
});

// Forget memory
await mnemonic.forget({ id: 'memory_id' });
```

### 3. QuadBrain Integration

When adding features that need cognitive processing:

```javascript
const response = await quadBrain.process({
  query: 'User question or task',
  context: {
    history: conversationHistory,
    emotionalState: currentEmotionalState
  },
  preferredBrain: 'auto' // or 'LOGOS', 'AURORA', 'THALAMUS', 'PROMETHEUS'
});

// Response includes:
// - brain: Which brain processed it
// - confidence: 0-1 confidence score
// - text: Response text
// - metadata: Additional context
```

### 4. Learning Pipeline

Recording experiences for training:

```javascript
await learningPipeline.storeExperience({
  input: userQuery,
  output: systemResponse,
  reward: successScore,  // 0-1 or -1 to 1
  metadata: {
    brain: 'LOGOS',
    duration: processingTime,
    confidence: 0.85
  }
});
```

### 5. WebSocket Communication

Backend to frontend real-time updates:

```javascript
// In backend (server/index.cjs)
wss.clients.forEach(client => {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({
      type: 'metric_update',
      data: {
        memory: memoryStats,
        cognitive: cognitiveStats
      }
    }));
  }
});
```

## Testing Approach

### Quick Validation
```powershell
node tests/quick_test.mjs
```

### Component-Specific Tests
```powershell
# Memory system
node tests/test-memory.js

# Learning capture
node tests/test-learning-capture.mjs

# Cluster distribution
node tests/test-real-cluster-distribution.mjs

# Audio processing
node tests/test-audio-processing.mjs
```

### Health Monitoring
```powershell
node health-check.cjs
```

## Important Notes

### Windows-Specific Considerations

This is a **Windows development environment** (PowerShell):
- Use `npm run` commands as-is
- Process killing: `npm run kill` uses `taskkill /F /IM`
- Path separators: Use forward slashes in code, system handles conversion

### Code Modification Guidelines

1. **Arbiter Changes**: When modifying arbiters, ensure:
   - Message broker topics are properly registered
   - Cleanup in destructor (unsubscribe from topics)
   - Error handling for async operations
   - Logging via centralized Logger

2. **Memory Operations**: Always check:
   - Hot tier (Redis) is optional and may be disabled
   - Vector search works with in-memory FAISS
   - Cold tier (SQLite) is always available

3. **Frontend Changes**:
   - Vite hot reload is active in dev mode
   - Backend connection is localhost:3001
   - CSP (Content Security Policy) is configured in Electron
   - Use Tailwind CSS classes (no CDN)

4. **Learning System**:
   - Simulation learning is 30-100x faster than real-world
   - HER (Hindsight Experience Replay) is active
   - Nightly learning scheduled at 4 AM
   - Don't modify learning schedules without understanding TimekeeperArbiter

5. **Self-Modification**:
   - System has CodeObservationArbiter (can see its own code)
   - SelfModificationArbiter runs in sandbox mode
   - Threshold: 10% improvement required for self-modifications
   - Weekly code audit on Sundays at 2 AM

### System Status

**AI Readiness: 100/100** (as of December 11, 2025)

All major ASI components are integrated and running:
- ✅ Autonomous learning (nightly)
- ✅ Code evolution (weekly)
- ✅ Web crawling (daily)
- ✅ Goal planning (6-hour cycles)
- ✅ Belief management (continuous)
- ✅ Distributed execution
- ✅ Memory consolidation (dream cycles)
- ✅ Knowledge graph fusion
- ✅ Skill acquisition tracking

## Documentation Reference

Key documentation files:
- **CURRENT_STATUS.md**: System status and integration checklist
- **ARCHITECTURE_DIAGRAM.md**: Visual system architecture
- **INTEGRATION_GUIDE.md**: CognitiveCore integration details
- **LEARNING_PIPELINE_ARCHITECTURE.md**: Learning system details
- **AUTOMATION-ARCHITECTURE.md**: Automated processes
- **ASI_ROADMAP.md**: Future ASI development roadmap
- **DARPA_PROPOSAL.md**: System capabilities and vision

## Common Pitfalls to Avoid

1. **Don't assume Redis is available**: Check hot tier state before using
2. **Don't modify learning schedules**: They're carefully tuned (4 AM, 2 AM Sunday, etc.)
3. **Don't bypass MessageBroker**: All arbiter communication should use it
4. **Don't ignore emotional/cognitive context**: System is emotionally aware
5. **Don't commit without testing**: Run `npm run soma:test` first
6. **Don't ignore TypeScript errors in development**: Frontend uses React with TS patterns
7. **Port conflicts**: Ensure 3001, 5173, 5000 are available
8. **Process cleanup**: Always use `npm run kill` before restart to avoid zombies

## Quick Reference: File Locations

| Component | Location |
|-----------|----------|
| Main Launcher | `launcher_ULTRA.mjs` |
| Dev Launcher | `start-dev.cjs` |
| Backend Server | `server/index.cjs`, `server/soma-server.js` |
| Frontend Entry | `frontend/apps/command-bridge/SomaCommandBridge.jsx` |
| Arbiters | `arbiters/*.js` |
| Core Systems | `core/*.js`, `core/*.cjs` |
| Memory DB | `soma-memory.db` |
| Config | `core/SomaConfig.js` |
| Tests | `tests/*.mjs`, `tests/*.js` |
| Cognitive Systems | `src/cognitive/*.js` |
| UI Components | `src/`, `frontend/` |

## Getting Help

- Check `CURRENT_STATUS.md` for system state
- Review `ARCHITECTURE_DIAGRAM.md` for component relationships  
- Check logs in console output (centralized Logger)
- Use `npm run health` for system diagnostics
- Review arbiter message broker traffic for debugging inter-arbiter issues
