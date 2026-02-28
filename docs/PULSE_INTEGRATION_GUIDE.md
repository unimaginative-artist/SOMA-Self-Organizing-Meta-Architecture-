# Pulse App Integration Guide

## 🎯 Overview
This guide shows how to integrate the three new SOMA-powered features into the Pulse app.

---

## ✅ Completed Components

### 1. Service Clients (Backend Communication)
- ✅ **MCPClient.ts** - Dream Arbiter integration
- ✅ **QuadBrainClient.ts** - 4-hemisphere reasoning
- ✅ **MnemonicClient.ts** - Memory & persistence
- ✅ **PulseClient.ts** - Centralized networking (already done)

### 2. UI Components
- ✅ **DreamInsights.tsx** - AI pattern analysis panel
- ✅ **MemoryInsights.tsx** - Project history & learned patterns
- ✅ **SteveChat.tsx** - Enhanced with Quad-Brain toggle

---

## 🔧 Integration Steps

### Step 1: Add Sidebar Panels to PulseApp

Location: `frontend/apps/command-bridge/components/pulse/PulseApp.tsx`

```typescript
import DreamInsights from './components/DreamInsights';
import MemoryInsights from './components/MemoryInsights';
import { MnemonicClient, ProjectSnapshot } from './services/MnemonicClient';

const mnemonicClient = new MnemonicClient();

// Inside PulseApp component state:
const [showDreamInsights, setShowDreamInsights] = useState(false);
const [showMemoryInsights, setShowMemoryInsights] = useState(false);

// Add toggle buttons to toolbar:
<button 
  onClick={() => setShowDreamInsights(!showDreamInsights)}
  className="p-2 hover:bg-zinc-800 rounded-lg"
  title="Dream Insights"
>
  <Brain className="w-4 h-4" />
</button>

<button 
  onClick={() => setShowMemoryInsights(!showMemoryInsights)}
  className="p-2 hover:bg-zinc-800 rounded-lg"
  title="Memory"
>
  <Database className="w-4 h-4" />
</button>

// Add panels to layout (right sidebar):
<div className="flex flex-1 overflow-hidden">
  {/* Main content */}
  <div className="flex-1">
    {/* ... existing Pulse content ... */}
  </div>
  
  {/* Right Sidebar Panels */}
  {showDreamInsights && (
    <div className="w-80">
      <DreamInsights projectName={projectName} />
    </div>
  )}
  
  {showMemoryInsights && (
    <div className="w-80">
      <MemoryInsights 
        projectName={projectName}
        onRestoreSnapshot={handleRestoreSnapshot}
      />
    </div>
  )}
</div>
```

---

### Step 2: Enable Auto-Save for Projects

```typescript
import { MnemonicClient } from './services/MnemonicClient';

const mnemonicClient = new MnemonicClient();

// On project load, attempt to restore from memory:
useEffect(() => {
  async function restoreProject() {
    const saved = await mnemonicClient.loadProject(projectName);
    if (saved && saved.blueprint) {
      setBlueprint(saved.blueprint);
      console.log('[Pulse] Restored project from memory');
    }
  }
  
  if (projectName) {
    restoreProject();
  }
}, [projectName]);

// Enable auto-save when project is active:
useEffect(() => {
  if (projectName && blueprint.length > 0) {
    const getSnapshot = () => ({
      projectName,
      blueprint,
      timestamp: Date.now(),
      metadata: {
        filesCount: blueprint.length,
        linesOfCode: blueprint.reduce((sum, f) => sum + f.content.split('\n').length, 0),
        description: blueprint[0]?.path || 'Untitled'
      }
    });
    
    mnemonicClient.startAutoSave(projectName, getSnapshot, 60000); // Every 60s
    
    return () => {
      mnemonicClient.stopAutoSave();
    };
  }
}, [projectName, blueprint]);

// Handle manual snapshot restore:
const handleRestoreSnapshot = (snapshot: ProjectSnapshot) => {
  setBlueprint(snapshot.blueprint);
  console.log('[Pulse] Restored snapshot from', new Date(snapshot.timestamp));
};
```

---

### Step 3: Integrate Quad-Brain with Steve

Steve's chat component is already enhanced! Just need to update the message handler to support multi-perspective:

```typescript
import { QuadBrainClient } from './services/QuadBrainClient';

const quadBrainClient = new QuadBrainClient();

// In your Steve message handler:
const handleSteveSend = async (message: string) => {
  setIsProcessing(true);
  setMessages(prev => [...prev, { role: 'user', content: message }]);
  
  try {
    // Check if multi-perspective mode is enabled (passed from SteveChat)
    if (multiPerspectiveMode) {
      // Query all 4 hemispheres
      const response = await quadBrainClient.queryAllHemispheres(message, {
        projectName,
        blueprint,
        currentContext: /* ... */
      });
      
      setMessages(prev => [...prev, {
        role: 'steve',
        content: response.consensus || 'Analysis complete. Click a hemisphere to view.',
        perspectives: response.perspectives
      }]);
    } else {
      // Normal single response via existing geminiService
      const response = await getSteveResponse(message, history, context);
      setMessages(prev => [...prev, {
        role: 'steve',
        content: response.response,
        actions: response.actions,
        updatedFiles: response.updatedFiles
      }]);
    }
  } catch (error) {
    console.error('Steve request failed:', error);
  } finally {
    setIsProcessing(false);
  }
};
```

---

### Step 4: Backend API Endpoints (Required)

The frontend clients expect these backend endpoints. Add to `server/soma-server.js`:

#### MCP Dream Endpoints
```javascript
// Proxy to MCP server
app.post('/api/mcp', async (req, res) => {
  try {
    // Forward JSON-RPC call to mcp-server-soma-dreams.js
    const response = await fetch('http://localhost:3001/mcp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Quad-Brain Endpoints
```javascript
app.post('/api/quadbrain/query', async (req, res) => {
  const { hemisphere, message, context, temperature } = req.body;
  
  try {
    // Route to specific hemisphere in SOMArbiterV2_QuadBrain
    const result = await quadBrain.queryHemisphere(hemisphere, message, {
      temperature,
      ...context
    });
    
    res.json({
      hemisphere,
      response: result.response,
      confidence: result.confidence || 0.8,
      timestamp: Date.now()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### Memory Endpoints
```javascript
// Store in memory
app.post('/api/memory/store', async (req, res) => {
  const { type, key, data, tier, metadata } = req.body;
  
  try {
    const id = await mnemonicArbiter.store({
      type,
      key,
      data,
      tier: tier || 'warm',
      metadata: {
        ...metadata,
        created: metadata.created || Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0
      }
    });
    
    res.json({ id, tier });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Recall from memory
app.post('/api/memory/recall', async (req, res) => {
  const { type, key } = req.body;
  
  try {
    const result = await mnemonicArbiter.recall({ type, key });
    res.json(result);
  } catch (error) {
    res.status(404).json({ error: 'Not found' });
  }
});

// Search memory
app.post('/api/memory/search', async (req, res) => {
  const { query, type, topK, threshold } = req.body;
  
  try {
    const results = await mnemonicArbiter.search({
      query,
      type,
      topK: topK || 5,
      threshold: threshold || 0.6
    });
    
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get memory stats
app.get('/api/memory/stats', async (req, res) => {
  try {
    const stats = await mnemonicArbiter.getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get learned patterns
app.post('/api/memory/patterns', async (req, res) => {
  const { domain, type } = req.body;
  
  try {
    const patterns = await learningPipeline.getPatterns({ domain, type });
    res.json(patterns);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📊 Complete Feature Summary

### Feature 1: Dream Insights
**What it does:** Analyzes your Pulse work sessions, finds patterns, suggests improvements

**User Experience:**
1. Click Brain icon in toolbar
2. Dream Insights panel slides in from right
3. See recent AI analysis reports
4. Click "Run Dream Cycle" for immediate analysis
5. Toggle background dreams for nightly automatic runs

**Backend Dependency:** MCP server must be running (`mcp-server-soma-dreams.js`)

---

### Feature 2: Quad-Brain Multi-Perspective
**What it does:** Get 4 different AI perspectives on your code (analytical, creative, strategic, security)

**User Experience:**
1. Open Steve chat
2. Click Brain icon in header to toggle Quad-Brain mode
3. Send message as normal
4. Steve responds with 4 hemisphere buttons
5. Click any hemisphere to see that perspective's detailed analysis

**Backend Dependency:** QuadBrain endpoints connected to SOMArbiterV2_QuadBrain

---

### Feature 3: Project Memory & Auto-Save
**What it does:** Never lose work, see project history, get similar code suggestions

**User Experience:**
1. Projects auto-save every 60 seconds
2. Click Database icon to see Memory Insights panel
3. View project snapshots with timestamps
4. Click any snapshot to restore that version
5. See learned coding patterns
6. View memory distribution across Hot/Warm/Cold tiers

**Backend Dependency:** Mnemonic Arbiter and Universal Learning Pipeline

---

## 🚀 Testing Checklist

### Dream Insights
- [ ] Panel opens/closes with toolbar button
- [ ] Status shows active/idle correctly
- [ ] "Run Dream Cycle" button triggers analysis
- [ ] Reports list populates with mock or real data
- [ ] Toggle background dreams works

### Quad-Brain
- [ ] Brain toggle in Steve header works
- [ ] Multi-perspective mode shows "Quad-Brain Mode" label
- [ ] All 4 hemispheres render with correct colors
- [ ] Clicking hemisphere shows detailed response
- [ ] Can toggle back to single perspective

### Memory
- [ ] Auto-save triggers every 60s (check console logs)
- [ ] Memory panel shows stats (Hot/Warm/Cold)
- [ ] Project history lists snapshots
- [ ] Clicking snapshot restores blueprint
- [ ] Learned patterns display (if any exist)

---

## 🎨 UI Layout Example

```
┌─────────────────────────────────────────────────────────────┐
│  PULSE APP                       [Brain] [Database] [...]   │
├─────────────────────────────────────────────────────────────┤
│                                  │                           │
│                                  │  ┌─ Dream Insights ──┐   │
│      Main Pulse Content          │  │ Status: Active    │   │
│      (Blueprint, Terminal,       │  │ [Run Cycle]       │   │
│       Code Editor, etc.)         │  │                   │   │
│                                  │  │ Recent Reports:   │   │
│                                  │  │ • Dream #abc123   │   │
│                                  │  │ • Dream #def456   │   │
│                                  │  └───────────────────┘   │
│                                  │                           │
│                                  │  ┌─ Memory Insights ─┐   │
│                                  │  │ Hot: 12  Warm: 45 │   │
│                                  │  │ Cold: 234         │   │
│                                  │  │                   │   │
│                                  │  │ History:          │   │
│                                  │  │ • 5m ago (12 files)│  │
│                                  │  │ • 2h ago (12 files)│  │
│                                  │  └───────────────────┘   │
└─────────────────────────────────────────────────────────────┘

  [Steve Chat - Floating]
  ┌──────────────────────┐
  │ 🤖 Agent Steve       │
  │ [🧠] Quad-Brain Mode │
  ├──────────────────────┤
  │ Your message here    │
  │                      │
  │ Steve: Analysis...   │
  │ ┌──┬──┐             │
  │ │🔬│✨│ Hemispheres │
  │ ├──┼──┤             │
  │ │🎯│🛡️│             │
  │ └──┴──┘             │
  └──────────────────────┘
```

---

## 💡 Next Steps

1. **Wire Backend Endpoints** - Add the API routes to `soma-server.js`
2. **Test with Backend Running** - Start SOMA backend and MCP server
3. **Integrate into PulseApp** - Follow Step 1-3 above
4. **Polish UI/UX** - Adjust spacing, colors, animations
5. **Add Loading States** - Handle slow API responses gracefully
6. **Error Boundaries** - Wrap panels in error boundaries for stability

---

## 🐛 Known Issues & Workarounds

### Issue: MCP Server Not Running
**Symptom:** Dream Insights shows "Dream engine unavailable"
**Fix:** Start MCP server: `node server/mcp-server-soma-dreams.js`

### Issue: Memory Endpoints Return 404
**Symptom:** Memory Insights panel shows no data
**Fix:** Ensure Mnemonic Arbiter is initialized in backend

### Issue: Quad-Brain Queries Timeout
**Symptom:** Steve hangs when multi-perspective enabled
**Fix:** Check QuadBrain is initialized, increase timeout in QuadBrainClient

---

## 📚 Further Reading

- See `PULSE_ARCHITECTURE_ENHANCEMENTS.md` for full architecture overview
- Check `services/` folder for client implementation details
- Review SOMA backend `soma-server.js` for existing arbiter patterns
