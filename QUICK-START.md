# SOMA Quick Start

## Start SOMA
```bash
npm run start:all
```

## Check Health
```bash
npm run health
```
✅ = All good
⚠️ = Issues detected
🚨 = Backend is HUNG (needs restart)

## Restart Everything
```bash
npm run restart
```

## Kill All Processes
```bash
npm run kill
```

---

## What to Watch For When Starting

1. **Backend should start in ~2 seconds:**
   ```
   ✅ SOMA Server initialized
   ✨ SOMA Server running on port 3001
   ```

2. **Arbiters spawn in background:**
   ```
   🔄 Starting arbiter population spawn...
   (This is OK to take time - doesn't block the server)
   ```

3. **Electron opens and shows:**
   - Toast: "SOMA Neural Link Established" (green)
   - Backend connection indicator (green)

---

## Troubleshooting

**Backend not connecting?**
```bash
npm run health
```
If it says "TIMEOUT" → Backend is hung:
```bash
npm run restart
```

**Everything frozen?**
```bash
npm run kill
npm run start:all
```

**Full guide:** See `TROUBLESHOOTING.md`
