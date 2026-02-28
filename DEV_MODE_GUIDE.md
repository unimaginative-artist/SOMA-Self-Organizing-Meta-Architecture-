# SOMA Development Mode Guide

## 🔧 The Problem (FIXED!)

Previously, `npm run electron:dev` only started the Vite dev server without the backend, causing API calls to fail.

## ✅ The Solution

Created a unified dev launcher (`start-dev.cjs`) that starts **everything** you need for development:

---

## 🚀 Usage

### **Development Mode** (Hot Reload - Use This!)

```bash
npm run electron:dev
```

or

```bash
npm run dev
```

**What it does:**
- ✅ Starts SOMA Backend on port **3001**
- ✅ Starts Vite Dev Server on port **5173**
- ✅ Launches Electron with DevTools
- ✅ **Hot reload enabled** - See changes instantly!

**When to use:**
- During active development
- When testing new features
- When debugging
- When you want instant feedback on code changes

---

### **Production Mode** (Full System)

```bash
npm run start:all
```

**What it does:**
- ✅ Starts SOMA Backend (port 3001)
- ✅ Starts CT Backend (port 4200)
- ✅ Starts Whisper Service (port 5002)
- ✅ Starts Vite Preview (port 4173)
- ✅ Launches Electron with production build

**When to use:**
- Testing the full integrated system
- Before releases
- When you need all services running

---

## 🎯 Quick Reference

| Command | Mode | Backend | Hot Reload | Services | Use Case |
|---------|------|---------|------------|----------|----------|
| `npm run dev` | Dev | ✅ | ✅ | Core Only | **Development** |
| `npm run electron:dev` | Dev | ✅ | ✅ | Core Only | **Development** |
| `npm run start:all` | Prod | ✅ | ❌ | All Services | Testing/Release |

---

## 🔥 Development Workflow

### Step 1: Start Dev Mode
```bash
npm run electron:dev
```

### Step 2: Make Changes
Edit any file in:
- `frontend/apps/command-bridge/`
- `frontend/apps/command-bridge/components/`
- React components, CSS, etc.

### Step 3: See Changes Instantly
- Vite will detect changes
- Browser auto-refreshes
- No rebuild needed!

### Step 4: Test Backend Changes
If you modify backend files:
- `server/soma-server.js`
- `server/finance/AlpacaService.js`
- `arbiters/*.js`

**You need to restart:**
```bash
# Kill and restart
npm run kill
npm run electron:dev
```

---

## 🐛 Troubleshooting

### "API calls failing"
- Make sure backend is running (check console for `Backend ready on port 3001`)
- Check that Vite proxy is configured (it is by default)

### "Changes not showing up"
- Hard refresh: `Ctrl+R` in Electron
- Or restart: `npm run kill && npm run electron:dev`

### "Port already in use"
```bash
npm run kill
```

Then restart with:
```bash
npm run electron:dev
```

### "Backend not starting"
Check for errors in console. Common issues:
- Missing API keys (OPENAI_API_KEY, etc.)
- Port 3001 already in use
- Missing dependencies: `npm install`

---

## 📋 Available Scripts

### Development
- `npm run dev` - Full dev environment with hot reload
- `npm run dev:vite` - Only Vite dev server (needs backend separately)
- `npm run dev:backend` - Only backend server

### Production
- `npm run start:all` - Full production stack
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Utilities
- `npm run kill` - Kill all running processes
- `npm run restart` - Kill and restart production
- `npm run health` - Check system health

---

## 🎨 What's Different in Dev Mode?

### **Development Mode:**
- Uses Vite dev server (super fast rebuilds)
- Hot Module Replacement (HMR)
- DevTools open by default
- Source maps enabled
- Detailed error messages
- No optimization/minification

### **Production Mode:**
- Uses built/optimized files
- Smaller bundle size
- Better performance
- No DevTools by default
- All services running (CT, Whisper, etc.)

---

## 🚨 Important Notes

1. **Backend changes require restart** - Only frontend has hot reload
2. **Don't use `npm run electron:dev` for production** - It's development only
3. **Kill processes properly** - Use `npm run kill` to avoid port conflicts
4. **API keys needed** - Set up `.env` for full functionality

---

## ✨ New Features Added

As part of fixing this, we also added:

✅ **Alpaca Trading Integration** - Real money trading with safety checks
✅ **Trading Guardrails** - 7 layers of safety for automated trades
✅ **Epic Disclaimer Modal** - Legal protection before using Finance tab
✅ **14 New API Endpoints** - Complete trading infrastructure

---

**Happy coding! 🎉**
