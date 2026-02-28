# 🚀 SOMA Quick Start

## ✨ **ONE COMMAND TO RULE THEM ALL**

```bash
npm run start:all
```

That's it! This gives you **EVERYTHING**:

---

## 🎯 **What You Get:**

### **1. Electron Dev Window**
- ✅ **HOT RELOAD ENABLED** - Edit files, see changes instantly!
- ✅ Connected to backend automatically
- ✅ No rebuild needed after edits
- ✅ Full feature access

### **2. Full Backend Stack**
- ✅ SOMA Core (port 3001)
- ✅ CT Backend (port 4200)
- ✅ Whisper Service (port 5002)
- ✅ All APIs ready

---

## 💻 **Development Workflow:**

### **Step 1:** Start Everything
```bash
npm run start:all
```

### **Step 2:** Code Away!
```bash
# Edit any file:
frontend/apps/command-bridge/components/FinanceModule.jsx

# Save the file
# Electron window auto-refreshes instantly! 🔥
```

### **Step 3:** Test Features
- All backend connections work automatically
- Finance tab connects to Alpaca
- Kevin chat works
- Everything just works!

---

## 🛠️ **Common Tasks:**

### **Restart Everything:**
```bash
npm run restart
```

### **Stop Everything:**
```bash
npm run kill
```
or just `Ctrl+C` in the terminal

### **Backend Changes:**
If you edit backend files (server/*, arbiters/*):
```bash
npm run restart
```

### **Frontend Changes:**
If you edit React files - **just save!** Window auto-refreshes.

---

## 🎨 **What's Running:**

| Service | Port | Status |
|---------|------|--------|
| SOMA Backend | 3001 | ✅ Always running |
| CT Backend | 4200 | ✅ Always running |
| Whisper | 5002 | ✅ Always running |
| Vite Dev Server | 5173 | ✅ Hot reload enabled |
| **Electron Window** | - | **✅ AUTO-RELOAD** |

---

## 🔥 **Key Features:**

1. **One Window** - Single Electron window, no confusion
2. **Hot Reload** - Edit code, see changes instantly (no rebuild!)
3. **Backend Connected** - All APIs work automatically
4. **Full Stack** - Everything runs together seamlessly

---

## 🐛 **Troubleshooting:**

### "Port already in use"
```bash
npm run kill
npm run start:all
```

### "Changes not showing"
- Wait 1-2 seconds after saving file
- Electron should refresh automatically
- Check terminal for errors

### "Backend API failing"
- Check console for "SOMA Core: http://localhost:3001"
- If not there, restart: `npm run restart`

### "Multiple windows opened"
```bash
npm run kill
npm run start:all
```

---

## 📋 **File Structure:**

```
SOMA/
├── frontend/apps/command-bridge/  ← Edit React components here
│   ├── components/
│   │   ├── FinanceModule.jsx     ← Finance tab
│   │   ├── KevinInterface.jsx     ← Kevin chat
│   │   └── ...
│   └── SomaCommandBridge.jsx      ← Main app
├── server/
│   ├── soma-server.js             ← Main backend
│   └── finance/
│       ├── AlpacaService.js       ← Trading API
│       └── TradingGuardrails.js   ← Safety checks
└── arbiters/                      ← AI agents
```

---

## 🎯 **Common Use Cases:**

### **Adding a new feature:**
1. `npm run start:all`
2. Edit files in `frontend/apps/command-bridge/`
3. Save → See changes instantly in Electron window
4. Done!

### **Testing Alpaca trading:**
1. `npm run start:all`
2. Navigate to Finance tab
3. Accept disclaimer
4. Connect Alpaca with paper trading keys
5. Run analysis and execute trades!

### **Working on UI styling:**
1. `npm run start:all`
2. Edit CSS/Tailwind classes
3. Save → See results instantly in Electron
4. No rebuild needed!

---

**That's it! One command, full system, hot reload. Happy coding! 🚀**
