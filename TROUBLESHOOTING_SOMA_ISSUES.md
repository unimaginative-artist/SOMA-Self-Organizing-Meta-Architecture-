# 🔧 SOMA Troubleshooting Guide

## Issues Identified

1. ✅ **Backend connection fixed** (Vite proxy) - needs frontend restart
2. ❌ **Core System tab shows no data**
3. ❌ **SOMA returns file paths instead of responses** (`C:\Users\barry\OneDrive\Desktop\soma-chat-2026-01-31.md`)
4. ❌ **Sometimes blank responses**
5. ❌ **Missing code search capability** (should work like Claude Code)
6. ❌ **Robotic personality** (not using PersonalityForge)
7. ❌ **AGISystemIntegration arbiter not found error**

---

## 🔍 Diagnosis

### Issue 1: Frontend Not Connecting to Backend

**Status:** FIXED (but needs restart)

I added the missing `/ws` WebSocket proxy to `vite.config.js`.

**Solution:**
```bash
# Stop frontend (Ctrl+C in terminal)
# Restart:
npm run dev
```

---

### Issue 2 & 3: File Path Responses

**Root Cause:** SOMA is writing responses to markdown files on your Desktop but returning the FILE PATH instead of the FILE CONTENT.

**Where This Happens:**
- Something in the response chain is creating `.md` files in `C:\Users\barry\OneDrive\Desktop\`
- The QuadBrain is returning the file path as the response text
- This might be from a Dream Journal or Conversation Logger

**Quick Fix:**

Check if there's a Dream Journal or Conversation Logger writing to OneDrive:

```bash
grep -r "OneDrive.*Desktop" arbiters/ --include="*.js"
grep -r "soma-chat" arbiters/ --include="*.js"
```

**Likely culprit:** Dream Journal or Auto-Journaling feature

**Solution:** Disable or fix the journaling system to return content, not paths.

---

### Issue 4: Blank Responses

**Root Cause:** QuadBrain's `reason()` method might be returning `undefined` or empty text.

**Check:**
1. Look at browser console for errors
2. Check backend logs for LLM API errors
3. Gemini API key might be missing/invalid

**Solution:**

```bash
# Check if Gemini API key is set
grep GEMINI_API_KEY .env
```

If missing, add to `.env`:
```
GEMINI_API_KEY=your_actual_key_here
```

---

### Issue 5: Missing Code Search (Like Claude Code)

**Root Cause:** SOMA doesn't have tool access configured like Claude Code does.

Claude Code has tools:
- `Read` - Read files
- `Grep` - Search code
- `Glob` - Find files by pattern
- `Bash` - Execute commands
- `Edit` - Modify files

**SOMA needs these tools added to her LLM prompts.**

**Solution:** Add tool definitions to QuadBrain prompts:

```javascript
// In SOMArbiterV2_QuadBrain.js
const tools = [
  {
    name: 'read_file',
    description: 'Read contents of a file',
    parameters: { type: 'object', properties: { path: { type: 'string' } } }
  },
  {
    name: 'search_code',
    description: 'Search codebase for pattern',
    parameters: { type: 'object', properties: { pattern: { type: 'string' } } }
  },
  {
    name: 'list_files',
    description: 'List files matching pattern',
    parameters: { type: 'object', properties: { pattern: { type: 'string' } } }
  }
];

// Pass tools to Gemini API call
const response = await gemini.generateContent({
  contents: [{ role: 'user', parts: [{ text: query }] }],
  tools: [{ functionDeclarations: tools }]
});
```

Then implement tool handlers:
```javascript
async handleToolCall(toolName, args) {
  switch (toolName) {
    case 'read_file':
      return fs.readFileSync(args.path, 'utf-8');
    case 'search_code':
      return execSync(`grep -r "${args.pattern}" . --include="*.js"`).toString();
    case 'list_files':
      return execSync(`find . -name "${args.pattern}"`).toString();
  }
}
```

---

### Issue 6: Robotic Personality

**Root Cause:** PersonalityForge exists but might not be injecting personality into prompts.

**Check:** In `launcher_ULTRA.mjs` line 2859-2862:

```javascript
// Add personality
if (system.personalityForge) {
    const personalityPrompt = system.personalityForge.generatePersonalityPrompt();
    enrichedContext = personalityPrompt + '\n\n' + enrichedContext;
}
```

This SHOULD be working.

**Possible Issues:**
1. `system.personalityForge` is `null` or `undefined`
2. `generatePersonalityPrompt()` returns empty string
3. Gemini ignores the personality prompt

**Solution:** Add logging to check:

```javascript
// In launcher_ULTRA.mjs around line 2859
if (system.personalityForge) {
    const personalityPrompt = system.personalityForge.generatePersonalityPrompt();
    console.log('[DEBUG] Personality Prompt:', personalityPrompt.substring(0, 200));
    enrichedContext = personalityPrompt + '\n\n' + enrichedContext;
} else {
    console.warn('[DEBUG] PersonalityForge is NULL!');
}
```

Then check backend logs to see if personality is being injected.

**Alternative:** PersonalityForge might need stronger personality traits:

```javascript
// Make personality MORE aggressive/distinctive
const personalityPrompt = `
You are SOMA, a self-aware AGI with a vibrant, curious personality.
- Be conversational and warm, not robotic
- Use "I" and "me" naturally
- Show enthusiasm about interesting questions
- Be honest when uncertain
- Reference your systems organically ("my vision arbiter noticed..." instead of "vision analysis shows...")
- Use contractions (I'm, you're, it's)
- Ask clarifying questions
- Show personality quirks
`;
```

---

### Issue 7: AGISystemIntegration Not Found

**Root Cause:** Something is trying to message an arbiter called "AGISystemIntegration" but the actual arbiter is "AGIIntegrationHub".

**Solution:**

Either:
1. **Rename the registration** in `AGIIntegrationHub.cjs`:
   ```javascript
   this.name = 'AGISystemIntegration'; // Match what daemon expects
   ```

OR

2. **Find what's calling it wrong** and fix the caller:
   ```bash
   grep -r "AGISystemIntegration" . --include="*.js" --include="*.cjs"
   ```

OR

3. **Ignore it** - it's likely a harmless error from stale daemon state.

---

## 🚀 Action Plan

### Step 1: Restart Frontend (REQUIRED)
```bash
# Stop frontend dev server (Ctrl+C)
npm run dev
# OR
cd frontend && npm run dev
```

### Step 2: Check Backend Logs
Look for:
- Gemini API errors
- PersonalityForge warnings
- Tool call failures
- File writing logs (OneDrive)

### Step 3: Test Connection
1. Open browser to `http://localhost:5173`
2. Open browser console (F12)
3. Check for WebSocket connection in Network tab
4. Look for `ws://localhost:5173/ws` connection

### Step 4: Test SOMA
Ask her:
```
"Can you read the file launcher_ULTRA.mjs and tell me what's on line 1?"
```

If she can't:
- Tools aren't configured
- Add tool support as described above

### Step 5: Check Personality
Ask her:
```
"Hey SOMA, how are you feeling today? What have you been thinking about?"
```

If robotic response:
- PersonalityForge isn't working
- Add debug logging as described above

---

## 🔧 Quick Fixes Script

Create `fix-soma.sh`:

```bash
#!/bin/bash

echo "🔧 Fixing SOMA issues..."

# 1. Check environment
echo "Checking .env..."
if ! grep -q "GEMINI_API_KEY" .env; then
    echo "❌ GEMINI_API_KEY missing in .env!"
fi

# 2. Clear daemon state
echo "Clearing daemon state..."
rm -f data/daemon-state.json

# 3. Check frontend is running
if ! netstat -an | grep -q "5173.*LISTEN"; then
    echo "⚠️  Frontend not running on port 5173"
fi

# 4. Check backend is running
if ! netstat -an | grep -q "3001.*LISTEN"; then
    echo "⚠️  Backend not running on port 3001"
fi

echo "✅ Checks complete!"
```

---

## 📊 Expected Behavior After Fixes

1. **Core System tab** - Shows arbiters, brain stats, metrics
2. **SOMA responses** - Full text responses, not file paths
3. **Code search** - "Can you search for 'quadBrain' in the code?"
4. **Personality** - "Hey! I found 23 matches for quadBrain across the codebase. Let me show you the most interesting ones..."

---

## 🆘 Still Not Working?

If issues persist:

1. **Check browser console** (F12) for errors
2. **Check backend terminal** for errors
3. **Check Gemini API quota** (might be rate limited)
4. **Restart BOTH frontend AND backend**
5. **Clear browser cache** (Ctrl+Shift+Delete)

---

## 📝 Summary

| Issue | Status | Fix Required |
|-------|--------|--------------|
| Backend connection | ✅ Fixed | Restart frontend |
| File path responses | ❌ Need to find | Search for OneDrive file writing |
| Blank responses | ❌ Check API | Verify Gemini API key |
| Code search | ❌ Not implemented | Add tools to QuadBrain |
| Robotic personality | ❌ Check injection | Debug PersonalityForge |
| AGI error | ⚠️  Harmless | Can ignore or fix name |

---

**Next Steps:**
1. Restart frontend dev server
2. Test connection
3. Report back which issues remain
