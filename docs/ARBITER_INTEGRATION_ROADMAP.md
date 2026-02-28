# SOMA Arbiter Integration Roadmap

## 🎯 Goal
Wire all 13 core SOMA arbiters into universal frontend components that work across:
- Pulse (code generation)
- Command Bridge (main interface)
- Any future SOMA app

## 📦 Architecture

### Universal Services Layer
**Location:** `frontend/apps/command-bridge/components/shared/services/`

All clients follow this pattern:
```typescript
export class [Arbiter]Client {
  private baseUrl = '/api/[arbiter]';
  private timeoutMs = 20000;
  
  private async call<T>(endpoint: string, body?: any): Promise<T> {
    // Standard fetch with timeout & error handling
  }
  
  // Public methods for arbiter capabilities
}
```

### Universal UI Components
**Location:** `frontend/apps/command-bridge/components/shared/arbiters/`

Reusable React components that can be dropped into any app:
- Independent of app-specific state
- Accept props for data & callbacks
- Consistent SOMA aesthetic

### Backend Endpoints
**Location:** `server/soma-server.js`

Unified REST API:
```javascript
// Pattern: /api/[arbiter]/[action]
app.get('/api/fragments/all', async (req, res) => {
  const fragments = await fragmentRegistry.getAllFragments();
  res.json(fragments);
});
```

---

## 🚀 Implementation Order

### Phase 1: Core Intelligence (High Impact)
✅ **1. Fragment Registry** - AI agent evolution  
✅ **2. Security Council** - Deployment gates  
✅ **3. Engineering Swarm** - Parallel coding  
⬜ **4. Fragment Hub** - Multi-agent consensus  
⬜ **5. Vision Processing** - Enhanced image analysis  

### Phase 2: Smart Routing & Tools
⬜ **6. Adaptive Router** - Query routing intelligence  
⬜ **7. Tool Creator** - Custom tool generation  
⬜ **8. File System** - Project health  

### Phase 3: Advanced Features
⬜ **9. Workflow Engine** - FSM pipelines  
⬜ **10. Edge Orchestrator** - Web intelligence  
⬜ **11. Whisper** - Voice commands  
⬜ **12. Context Manager** - Advanced persistence  
⬜ **13. Finance Agent** - Market analysis  

---

## 📋 Checklist Per Feature

For each arbiter, complete:

- [ ] **Client Service** (`[Arbiter]Client.ts`)
  - [ ] TypeScript interfaces
  - [ ] CRUD methods
  - [ ] Error handling
  - [ ] Timeout logic

- [ ] **UI Component** (`[Arbiter]Panel.tsx`)
  - [ ] Status display
  - [ ] Real-time updates
  - [ ] Action buttons
  - [ ] Loading/error states

- [ ] **Backend Endpoints** (soma-server.js)
  - [ ] GET routes
  - [ ] POST routes
  - [ ] WebSocket events (if needed)
  - [ ] Error handling

- [ ] **Integration**
  - [ ] Wire into Pulse
  - [ ] Wire into Command Bridge
  - [ ] Add to universal dashboard
  - [ ] Test end-to-end

---

## 🎨 UI Components List

### 1. Fragment Registry
**Component:** `ActiveSpecialists.tsx`
- List of all fragments
- Expertise scores with progress bars
- Query count badges
- Click to consult specialist
- Genesis/Mitosis event notifications

### 2. Security Council
**Component:** `SecurityGate.tsx`
- Modal that blocks deployment
- Risk score (0-100)
- Vulnerability breakdown
- One-click fixes
- Override with justification

### 3. Engineering Swarm
**Component:** `SwarmPanel.tsx`
- Agent activity grid
- Real-time status per agent
- Code diff preview
- Review workflow
- Merge controls

### 4. Fragment Hub
**Component:** `ConsensusView.tsx`
- Contributing fragments list
- Confidence meter
- Consensus summary
- Conflict warnings
- Individual opinions (expandable)

### 5. Vision Processing
**Component:** `VisionAnalysis.tsx`
- Multi-image upload
- Analysis results
- Code generation
- Refinement loop
- Before/after comparison

### 6. Adaptive Router
**Component:** `RouterInsights.tsx`
- Routing decision tooltip
- Performance graph
- Manual overrides
- Learning progress

### 7. Tool Creator
**Component:** `ToolSuggestions.tsx`
- Detected patterns
- Suggested tools
- One-click generate
- Tool marketplace

### 8. File System
**Component:** `ProjectHealth.tsx`
- Dependency graph
- Duplicate files
- Dead code
- Circular dependencies
- Refactoring suggestions

### 9. Workflow Engine
**Component:** `WorkflowEditor.tsx`
- Visual FSM editor
- State nodes
- Transition edges
- Execution visualization
- Template library

### 10. Edge Orchestrator
**Component:** `InspirationGallery.tsx`
- Research results
- Screenshot gallery
- Documentation links
- Popularity metrics

### 11. Whisper
**Component:** `VoiceInput.tsx`
- Microphone button
- Real-time transcription
- Voice commands
- Language selection

### 12. Context Manager
**Component:** `WorkspaceSnapshots.tsx`
- Timeline view
- Snapshot cards
- Restore button
- Diff viewer
- Share link

### 13. Finance Agent
**Component:** `MarketAnalysis.tsx`
- Market sentiment
- Trade recommendations
- Risk metrics
- Portfolio view

---

## 🔌 Universal Dashboard

**Component:** `ArbiterDashboard.tsx`

Master control panel showing all arbiters:
```typescript
interface ArbiterStatus {
  name: string;
  status: 'online' | 'offline' | 'error';
  lastActivity: number;
  metrics: {
    queries: number;
    avgResponseTime: number;
    successRate: number;
  };
}
```

Visual layout:
```
┌─ SOMA Arbiter Dashboard ────────────────────┐
│                                              │
│ ✅ Fragment Registry      892 fragments      │
│ ✅ Quad-Brain            4 hemispheres       │
│ ✅ Security Council      Risk: Low           │
│ ✅ Engineering Swarm     3 agents active     │
│ ✅ Memory System         1.2GB cached        │
│ ⚠️  Vision Processing    Queue: 2            │
│ ✅ Adaptive Router       99.2% optimal       │
│ ✅ Tool Creator          12 tools created    │
│ ✅ File System           Health: 95%         │
│ ⏸️  Workflow Engine      2 workflows saved   │
│ ✅ Edge Orchestrator     Research ready      │
│ ✅ Whisper              Listening...         │
│ ✅ Context Manager       45 snapshots        │
│ ⏸️  Finance Agent        Markets closed      │
│                                              │
└──────────────────────────────────────────────┘
```

---

## 📊 Backend API Structure

### Unified Route Pattern
```javascript
// Fragment Registry
app.get('/api/fragments/all');
app.get('/api/fragments/domain/:domain');
app.post('/api/fragments/:id/query');
app.get('/api/fragments/stats');

// Security Council
app.post('/api/security/audit');
app.get('/api/security/score');
app.post('/api/security/validate');

// Engineering Swarm
app.post('/api/swarm/spawn');
app.get('/api/swarm/status/:swarmId');
app.post('/api/swarm/:swarmId/stop');

// ... etc for all 13
```

### WebSocket Events
```javascript
wss.on('connection', (ws) => {
  // Subscribe to arbiter events
  fragmentRegistry.on('genesis', (fragment) => {
    ws.send(JSON.stringify({ type: 'fragment_genesis', data: fragment }));
  });
  
  swarm.on('agent_update', (agent) => {
    ws.send(JSON.stringify({ type: 'swarm_update', data: agent }));
  });
});
```

---

## 💡 Integration Points

### Pulse App
```typescript
// Add to App.tsx toolbar
<button onClick={() => setShowFragments(!showFragments)}>
  <Sparkles className="w-4 h-4" />
</button>

// Render panel
{showFragments && (
  <div className="w-80">
    <ActiveSpecialists domain={projectName} />
  </div>
)}
```

### Command Bridge
```typescript
// Add to SomaCommandBridge.jsx
import { ArbiterDashboard } from '../shared/arbiters/ArbiterDashboard';

// Render in sidebar
<ArbiterDashboard />
```

### Anywhere
```typescript
// Use clients directly
import { FragmentRegistryClient } from '../shared/services/FragmentRegistryClient';

const client = new FragmentRegistryClient();
const fragments = await client.getAllFragments();
```

---

## 🧪 Testing Strategy

### Unit Tests
- Test each client method
- Mock fetch responses
- Validate error handling

### Integration Tests
- Test UI component rendering
- Test user interactions
- Test backend endpoints

### E2E Tests
- Full workflow: Pulse → Backend → UI update
- WebSocket real-time updates
- Multi-app usage (Pulse + Command Bridge)

---

## 📈 Success Metrics

- [ ] All 13 arbiters have working clients
- [ ] All 13 have visual UI components
- [ ] Backend endpoints tested and documented
- [ ] Integrated into Pulse app
- [ ] Integrated into Command Bridge
- [ ] Universal dashboard functional
- [ ] WebSocket real-time updates working
- [ ] Performance: < 200ms API response time
- [ ] No console errors
- [ ] Mobile-responsive (bonus)

---

## 🚀 Next Actions

1. **Complete Phase 1** (5 features)
   - ✅ Fragment Registry client done
   - Create remaining 4 clients
   - Build all 5 UI components
   - Add backend endpoints
   - Test integration

2. **Build Universal Dashboard**
   - Master status panel
   - Real-time WebSocket updates
   - Can be embedded anywhere

3. **Wire into Apps**
   - Pulse integration
   - Command Bridge integration
   - Test cross-app functionality

4. **Phase 2 & 3**
   - Remaining 8 features
   - Same pattern as Phase 1

---

## 📝 Notes

- All clients use same timeout/error handling pattern
- All UIs use SOMA design system (zinc colors, neon accents)
- Backend arbiters are already initialized in soma-server.js
- Just need to expose them via REST/WebSocket APIs
- Components are framework-agnostic (can be ported to Vue/Svelte later)

---

**Ready to build all 13!** 🚀
