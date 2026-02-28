# SOMA Simulation Learning - Diagnostic Guide

**Purpose:** Verify all AGI systems are connected and functioning correctly
**Date:** 2025-12-28

---

## Quick Health Check

### Step 1: Check Simulation Stats API

```bash
curl http://localhost:3001/api/simulation/stats
```

**Expected Response:**
```json
{
  "success": true,
  "simulation": {
    "framesSimulated": 1542,
    "actionsTaken": 154,
    "tasksCompleted": 5,
    "episodesCompleted": 5
  },
  "controller": {
    "actionsExecuted": 154,
    "episodesCompleted": 5,
    "averageReward": 34.5,
    "explorationRate": 0.28,
    "qTableSize": 45,
    "isActive": true,
    "agiFeatures": {
      "worldModel": {
        "connected": true,
        "hasPredict": true,
        "hasObserveTransition": true,
        "hasSave": true
      },
      "causalityArbiter": {
        "connected": true
      },
      "dreamArbiter": {
        "connected": true
      },
      "metaLearning": {
        "connected": true
      },
      "abstraction": {
        "connected": true,
        "hasSave": true
      },
      "curiosity": {
        "connected": true
      }
    }
  }
}
```

### Step 2: Check Console Logs on Startup

**What to look for:**

✅ **All 6 AGI arbiters spawned:**
```
🌱 Spawning complete arbiter population...
   ✅ Spawned WorldModelArbiter successfully
   ✅ Spawned CausalityArbiter successfully
   ✅ Spawned DreamArbiter successfully
   ✅ Spawned MetaLearningEngine successfully
   ✅ Spawned AbstractionArbiter successfully
   ✅ Spawned CuriosityEngine successfully
   ✅ Spawned SimulationControllerArbiter successfully
```

✅ **SimulationController connects to all 6:**
```
[SimulationControllerArbiter] 🔌 Connecting to AGI arbiters...
[SimulationControllerArbiter]    ✅ Connected to WorldModel (prediction)
[SimulationControllerArbiter]    ✅ Connected to Causality (cause-effect)
[SimulationControllerArbiter]    ✅ Connected to Dream (consolidation)
[SimulationControllerArbiter]    ✅ Connected to MetaLearning (optimization)
[SimulationControllerArbiter]    ✅ Connected to Abstraction (patterns)
[SimulationControllerArbiter]    ✅ Connected to Curiosity (exploration)
[SimulationControllerArbiter] 🧠 Connected 6/6 AGI systems for accelerated learning!
```

✅ **Q-table loads from disk:**
```
[SimulationControllerArbiter] 📂 Loaded Q-learning state: 234 states
[SimulationControllerArbiter] 📊 Episodes completed: 50, Avg reward: 45.60
[SimulationControllerArbiter] ⏰ Auto-save enabled (every 300s)
```

---

## Warning Signs (Things That Might Be Broken)

### ⚠️ Missing AGI Systems Warning

**Console shows:**
```
[SimulationControllerArbiter] ⚠️  Missing AGI systems: WorldModel, Causality, Dream
[SimulationControllerArbiter] ⚠️  Will use basic Q-learning fallback for missing features
```

**What this means:**
- Some AGI arbiters didn't spawn or aren't connecting
- Learning will be MUCH slower (no model-based planning, no dreams, etc.)
- Check if arbiters are in spawn list: `core/ArbiterOrchestrator.cjs` line ~444

**Fix:**
1. Verify all 6 arbiters are in genome list (line ~91)
2. Verify all 6 are in spawn population (line ~444)
3. Restart server and check for spawn errors

---

### ⚠️ WorldModel Save Failed

**Console shows:**
```
[SimulationControllerArbiter] ⚠️  WorldModel save failed: <error message>
```

**What this means:**
- WorldModel is connected but can't save its state
- Physics learning won't persist across restarts
- Possible causes: File permissions, disk space, module compatibility

**Fix:**
1. Check if `SOMA/world-model/` directory exists and is writable
2. Check WorldModelArbiter.js line ~460 for ES6 module compatibility
3. Verify fs.promises import is working

---

### ⚠️ Causality Feed Failed

**Console shows (occasionally):**
```
[SimulationControllerArbiter] ⚠️  Causality feed failed: <error message>
```

**What this means:**
- CausalityArbiter isn't receiving transition events
- Cause-effect learning isn't happening
- MessageBroker might not be relaying events

**Fix:**
1. Check if MessageBroker is initialized
2. Verify 'transition_observed' event is registered
3. Check AGI-Integration.cjs event handlers (line ~164)

---

### ⚠️ Abstraction Save Failed

**Console shows:**
```
[SimulationControllerArbiter] ⚠️  Abstraction save failed: <error message>
```

**What this means:**
- AbstractionArbiter can't persist patterns
- Transfer learning won't work across restarts
- Pattern extraction is lost

**Fix:**
1. Check `SOMA/abstractions/` directory permissions
2. Verify AbstractionArbiter.js save method (line ~583)
3. Check for ES6 module compatibility

---

## Feature Verification Tests

### Test 1: Q-Learning Persistence

**Objective:** Verify Q-table saves and loads correctly

**Steps:**
1. Start fresh (delete `SOMA/simulation-learning/q-learning-state.json` if exists)
2. Run 10 episodes
3. Check console for:
   ```
   [SimulationControllerArbiter] 💾 Auto-saving learning state...
   [SimulationControllerArbiter] 💾 Saved Q-learning state: N states
   ```
4. Restart server
5. Check console for:
   ```
   [SimulationControllerArbiter] 📂 Loaded Q-learning state: N states
   [SimulationControllerArbiter] 📊 Episodes completed: 10, Avg reward: X.XX
   ```
6. Run 10 more episodes
7. Verify episodes count continues from 10 (not restarting at 0)

**Expected:** Episodes accumulate across restarts

---

### Test 2: WorldModel Predictions

**Objective:** Verify WorldModel is predicting and improving

**Steps:**
1. Watch console during simulation
2. Look for WorldModel prediction logs (5% of the time):
   ```
   [SimulationControllerArbiter] 🔮 WorldModel: push_right (R:0.85, C:0.67)
   ```
3. After 50+ episodes, predictions should have higher confidence (C > 0.7)
4. Restart server
5. Verify predictions still occur (model persisted)

**Expected:** Predictions get more confident over time and persist

---

### Test 3: Dream Consolidation

**Objective:** Verify DreamArbiter receives experience batches

**Steps:**
1. Run 10 episodes
2. Check console for:
   ```
   [SimulationControllerArbiter] 💤 Triggering dream consolidation...
   ```
3. Check `.arbiter-state/` directory for dream reports
4. Verify files exist: `dream_report_<timestamp>.json`

**Expected:** Dream reports generated every 10 episodes

---

### Test 4: Auto-Save Timer

**Objective:** Verify periodic saves work

**Steps:**
1. Start server
2. Check console for:
   ```
   [SimulationControllerArbiter] ⏰ Auto-save enabled (every 300s)
   ```
3. Wait 5 minutes (or change config to 60s for faster test)
4. Check console for:
   ```
   [SimulationControllerArbiter] 💾 Auto-saving (300s interval)...
   [SimulationControllerArbiter] 💾 Saved Q-learning state: N states
   ```
5. Verify `SOMA/simulation-learning/q-learning-state.json` timestamp updates

**Expected:** Saves occur every 5 minutes automatically

---

### Test 5: Shutdown Save

**Objective:** Verify final save on server stop

**Steps:**
1. Run server
2. Press Ctrl+C to stop
3. Check console for:
   ```
   [SimulationControllerArbiter] 🛑 Shutting down controller...
   [SimulationControllerArbiter] 💾 Final save: N state-action values
   [SimulationControllerArbiter] 💾 Saved Q-learning state: N states
   ```
4. Verify file was updated (check timestamp)

**Expected:** Final save occurs before shutdown completes

---

## File Verification

### Check Persistent Storage Files

```bash
# Check if learning state exists
dir C:\Users\barry\Desktop\SOMA\SOMA\simulation-learning\

# Expected: q-learning-state.json

# Check contents
type C:\Users\barry\Desktop\SOMA\SOMA\simulation-learning\q-learning-state.json

# Should see JSON with qTable, stats, episodeRewards
```

```bash
# Check WorldModel state
dir C:\Users\barry\Desktop\SOMA\SOMA\world-model\

# Expected: transitions.json

# Check Abstractions
dir C:\Users\barry\Desktop\SOMA\SOMA\abstractions\

# Expected: patterns.json

# Check Dream reports
dir C:\Users\barry\Desktop\SOMA\.arbiter-state\

# Expected: dream_report_*.json files
```

---

## API Diagnostic Endpoint

### Get Full AGI Status

```bash
curl http://localhost:3001/api/simulation/stats | jq '.controller.agiFeatures'
```

**Response Interpretation:**

```json
{
  "worldModel": {
    "connected": true,        // ✅ WorldModel arbiter found
    "hasPredict": true,       // ✅ Can predict outcomes
    "hasObserveTransition": true,  // ✅ Learning from transitions
    "hasSave": true           // ✅ Can persist state
  },
  "causalityArbiter": {
    "connected": true         // ✅ Receiving cause-effect events
  },
  "dreamArbiter": {
    "connected": true         // ✅ Consolidating experiences
  },
  "metaLearning": {
    "connected": true         // ✅ Optimizing hyperparameters
  },
  "abstraction": {
    "connected": true,        // ✅ Extracting patterns
    "hasSave": true           // ✅ Persisting patterns
  },
  "curiosity": {
    "connected": true         // ✅ Exploring novel states
  },
  "onlineRL": {
    "connected": false        // ⚠️ Optional - not critical
  }
}
```

**If any show `false`:**
- ❌ That feature is NOT working
- Check spawn list in ArbiterOrchestrator
- Check console warnings for why it failed to connect

---

## Performance Benchmarks

### Expected Learning Curves

**With ALL 6 AGI systems connected:**
- Episode 10: ~30% success rate
- Episode 50: ~70% success rate
- Episode 100: ~85% success rate

**With 0 AGI systems (basic Q-learning only):**
- Episode 10: ~5% success rate
- Episode 50: ~15% success rate
- Episode 100: ~25% success rate

**To measure:**
```bash
# After 100 episodes
curl http://localhost:3001/api/simulation/stats | jq '.controller.averageReward'

# Higher = better learning
# Should trend upward over time
```

---

## Common Issues and Fixes

### Issue: "Cannot find module 'fs/promises'"

**Symptom:**
```
Error: Cannot find module 'fs/promises'
```

**Fix:**
```javascript
// Change ES6 import
import { promises as fs } from 'fs';

// To CommonJS
const fs = require('fs').promises;
```

---

### Issue: WorldModel/Abstraction not spawning

**Symptom:**
```
⚠️  Missing AGI systems: WorldModel, Abstraction
```

**Fix:**
Check if files use ES6 imports:
```javascript
// arbiters/WorldModelArbiter.js
export class WorldModelArbiter { ... }  // ❌ ES6

// Should be CommonJS:
class WorldModelArbiter { ... }
module.exports = WorldModelArbiter;  // ✅
```

Or convert to .cjs and use require() syntax.

---

### Issue: Events not reaching arbiters

**Symptom:**
```
⚠️  Causality feed failed: Cannot publish
```

**Fix:**
1. Verify MessageBroker is initialized
2. Check AGI-Integration.cjs subscriptions (line ~117)
3. Verify event names match exactly

---

## Success Criteria Checklist

Use this checklist to verify everything is working:

- [ ] All 6 AGI arbiters spawn successfully
- [ ] SimulationController connects to all 6
- [ ] Q-table loads from disk on startup
- [ ] Auto-save timer starts (every 5 min)
- [ ] WorldModel predictions appear in logs
- [ ] Dream consolidation triggers every 10 episodes
- [ ] Episode count persists across restarts
- [ ] Q-table size grows over time
- [ ] Exploration rate decays over time
- [ ] Average reward trends upward
- [ ] Files created in SOMA/ directory
- [ ] API shows all agiFeatures.connected = true
- [ ] No ⚠️ warnings about missing systems
- [ ] Final save occurs on shutdown

---

## Getting Help

If diagnostics show failures:

1. **Check console logs** - Look for specific error messages
2. **Check file permissions** - Ensure SOMA/ directories are writable
3. **Check module compatibility** - ES6 vs CommonJS issues
4. **Verify spawn config** - All arbiters in ArbiterOrchestrator.cjs
5. **Test individually** - Try spawning each arbiter alone to isolate issues

---

## Summary

**Green Flags (Everything Working):**
- ✅ "Connected 6/6 AGI systems"
- ✅ "Loaded Q-learning state: N states"
- ✅ "Auto-save enabled"
- ✅ Regular WorldModel predictions
- ✅ Dream consolidation triggers
- ✅ Files in SOMA/ directory
- ✅ All agiFeatures.connected = true

**Red Flags (Something Broken):**
- ❌ "Missing AGI systems: ..."
- ❌ "Starting with empty Q-table" (every restart)
- ❌ No WorldModel predictions
- ❌ No dream consolidation
- ❌ agiFeatures show false
- ❌ Warnings about save failures

---

🎯 **Goal:** All green flags, zero red flags = Full AGI simulation ready!
