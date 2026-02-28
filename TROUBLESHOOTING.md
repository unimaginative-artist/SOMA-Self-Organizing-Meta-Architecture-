# SOMA Troubleshooting Guide

## Quick Commands (Use These First!)

### Check if everything is healthy
```bash
npm run health
```
This will tell you if the backend is hung or if services aren't responding.

### Kill everything and restart cleanly
```bash
npm run restart
```

### Just kill all processes (without restarting)
```bash
npm run kill
```

---

## Common Issues & Solutions

### ❌ Backend Not Connecting / "Neural Link Severed"

**Symptoms:**
- No connection toast notifications in Electron
- Electron shows blank or partial UI
- DevTools console shows connection errors

**Cause:**
The backend is likely hung during initialization.

**Solution:**
```bash
# 1. Check if backend is hung
npm run health

# 2. If it says "TIMEOUT" or "HUNG", restart everything:
npm run restart

# 3. Wait for these messages in console:
#    ✅ SOMA Server initialized
#    ✨ SOMA Server running on port 3001
#    🔄 Starting arbiter population spawn...
```

**Prevention:**
The backend now spawns arbiters in the BACKGROUND after starting the HTTP server. This was fixed in `server/index.cjs:69-86`.

---

### ❌ Backend Hangs During Startup

**Symptoms:**
- `npm run start:all` starts but never shows "SOMA Server running"
- Port 3001 is listening but not responding
- `npm run health` shows TIMEOUT

**Cause:**
Arbiter population spawn is blocking the HTTP server from starting.

**What Was Fixed:**
Changed `server/index.cjs` so that:
1. HTTP server starts FIRST (fast, responds immediately)
2. Arbiters spawn in BACKGROUND (non-blocking)

**If this happens again:**
```bash
# Kill the hung process
npm run kill

# Check the code wasn't reverted
# server/index.cjs line 1609-1612 should have:
# server.initializePopulation().catch(err => {
#   console.error('Background population initialization failed:', err);
# });

# Restart
npm run start:all
```

---

### 🔄 Two Electron Windows Opening

**Symptoms:**
- Two windows appear: one titled "SOMA", another "SOMA Command Bridge"

**Cause:**
Multiple Electron processes or old processes not killed properly.

**Solution:**
```bash
# Kill everything first
npm run kill

# Wait a moment
timeout /t 2

# Start fresh
npm run start:all
```

**Note:** There are two Electron apps in this repo:
- Main SOMA app (root directory)
- Cognitive Terminal (`a cognitive terminal/` folder)

Make sure only one is starting.

---

### ❌ Backend Crashes with "dashboardClients is not defined"

**Symptoms:**
- Backend crashes immediately after "System Ready" message
- Error: `ReferenceError: dashboardClients is not defined`
- Frontend shows 500 Internal Server Error on `/health` endpoint
- WebSocket connection refused (ERR_CONNECTION_REFUSED)

**Cause:**
The `dashboardClients` variable is defined inside `startWebServer()` but is referenced in the `main()` function's metrics broadcast loop without proper scoping.

**What Was Fixed:**
In `launcher_ULTRA.mjs`:
- Line 3837: Changed `dashboardClients` to `serverState.dashboardClients` with null check
- Line 3866: Changed `dashboardClients.forEach` to `serverState.dashboardClients.forEach`

**Expected Behavior:**
- Backend starts and reaches "System Ready" without crashing
- `/health` endpoint responds with 200 OK
- Frontend connects successfully to WebSocket on port 3001

**If this happens again:**
```bash
# Kill everything
npm run kill

# Verify the fix in launcher_ULTRA.mjs:
# Line 3837 should have: if (!serverState.dashboardClients || serverState.dashboardClients.size === 0) return;
# Line 3866 should have: serverState.dashboardClients.forEach((client) => {

# Restart
npm run start:all
```

---

### ⚠️ Steve Chat Appearing Everywhere

**Symptoms:**
- Steve's floating chat appears on all tabs (terminal, orb, etc.)
- Multiple Steve buttons visible

**Cause:**
Conditional rendering in `SomaCommandBridge.jsx` not properly scoped.

**What Was Fixed:**
In `frontend/apps/command-bridge/SomaCommandBridge.jsx` around line 1739, Steve components are now wrapped in:
```jsx
{(activeModule === 'workflow' && !showPulse) && (
  <FloatingChat ... />
  <SteveSystemChat ... />
  <SteveAgentButton ... />
)}
```

**Expected Behavior:**
- Steve only appears in the **workflow tab**
- When Pulse app opens, it has its own Steve (from `pulse/App.tsx`)
- No Steve in other tabs (terminal, orb, kevin, etc.)

---

## Diagnostic Commands

### Check which ports are in use
```bash
netstat -ano | findstr :3001
netstat -ano | findstr :4173
netstat -ano | findstr :5173
```

### Kill a specific hung process
```bash
# Find the PID from netstat, then:
powershell -Command "Stop-Process -Id <PID> -Force"
```

### Check if backend responds
```bash
node diagnostic-check.cjs
```

### Manual connection test
```bash
curl http://localhost:3001/health
```
Should respond within 1-2 seconds with: `{"status":"healthy","timestamp":...}`

If it hangs for more than 5 seconds, the backend is HUNG.

---

## Architecture Notes

### How SOMA Starts (start-soma-complete.cjs)

1. **SOMA Core Backend** (port 3001) - The main orchestrator
2. **CT Backend Server** (port 4200) - Cognitive Terminal backend
3. **Whisper Service** (Python) - Voice/audio processing
4. **Frontend** (port 4173 in preview mode) - React UI via Vite
5. **Electron** - Loads from `dist/index.html` or dev server

### Backend Initialization Flow (server/index.cjs)

```
main()
  ├─ server.initialize()  ← Sets up Express, routes, WebSocket (FAST)
  ├─ server.start()       ← Starts listening on port 3001 (FAST)
  └─ server.initializePopulation() ← Spawns 68 arbiters (SLOW, in background)
```

**Critical:** The HTTP server is ready BEFORE arbiter spawning starts.

---

## Prevention Checklist

### Before Every Session:
1. ✅ Run `npm run health` to verify everything is working
2. ✅ If anything is hung, run `npm run restart`

### If You Modify Backend Code:
1. ⚠️ Never add blocking `await` calls before `server.start()`
2. ⚠️ Heavy initialization should go in `initializePopulation()` (background)
3. ⚠️ Test with `npm run health` after changes

### If SOMA Won't Start:
1. `npm run kill` - Kill everything
2. `npm run start:all` - Start fresh
3. `npm run health` - Verify it's working

---

## Emergency Recovery

If SOMA is completely broken and nothing works:

```bash
# 1. Nuclear option - kill everything
taskkill /F /IM electron.exe /T
taskkill /F /IM node.exe /T
taskkill /F /IM python.exe /T

# 2. Clean build
npm run build

# 3. Start fresh
npm run start:all

# 4. Verify
npm run health
```

---

## Files Modified to Fix Backend Issues

1. **server/index.cjs** (lines 32-86, 1600-1612)
   - Split initialization into `initialize()` and `initializePopulation()`
   - Server starts listening BEFORE arbiter population spawns

2. **launcher_ULTRA.mjs** (lines 3837, 3866)
   - Fixed `dashboardClients` scope issue causing backend crashes
   - Changed references to use `serverState.dashboardClients`
   - Added null check to prevent crashes when dashboard clients not initialized

3. **package.json** (lines 22-24)
   - Added `npm run health`, `npm run kill`, `npm run restart`

4. **health-check.cjs** (new file)
   - Quick diagnostic to detect hung backend

5. **diagnostic-check.cjs** (existing file)
   - Tests if backend responds to /health endpoint

---

## Contact

If you encounter new issues not covered here, document:
1. What you were doing when it broke
2. Console output from `npm run start:all`
3. Output from `npm run health`
4. Any error messages in Electron DevTools (F12)
