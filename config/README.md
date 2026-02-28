# 🔑 API Configuration

## Setup Your API Keys

1. **Edit `api-keys.env`** and add your actual keys:

```bash
# Open the config file
nano config/api-keys.env

# Or use any text editor
open -e config/api-keys.env
```

2. **Add your keys:**

```env
GEMINI_API_KEY=AIzaSy...your-actual-gemini-key
DEEPSEEK_API_KEY=sk-...your-actual-deepseek-key
```

3. **Save the file** - Your keys are now persistent across all restarts!

## Get API Keys

### Gemini (Google AI)
1. Visit: https://makersuite.google.com/app/apikey
2. Create/sign in to Google account
3. Click "Create API Key"
4. Copy and paste into `GEMINI_API_KEY`

### DeepSeek
1. Visit: https://platform.deepseek.com
2. Sign up/login
3. Go to API Keys section
4. Create new key
5. Copy and paste into `DEEPSEEK_API_KEY`

## Starting with API Keys

### Automatic (Recommended)
```bash
./scripts/start-with-api-keys.sh coordinator  # On iMac
./scripts/start-with-api-keys.sh worker       # On other machines
```

### Manual
```bash
# Load keys manually
export $(grep -v '^#' config/api-keys.env | xargs)

# Then start normally
node scripts/start-cluster-coordinator.cjs
```

## Security

⚠️ **Keep your keys private!**
- Never commit `api-keys.env` to git
- Don't share screenshots with visible keys
- Rotate keys if accidentally exposed

✅ This file is in iCloud but only you can access it
✅ Keys persist across restarts and reboots
✅ All cluster nodes can share the same config

## Verification

Check if keys are loaded:
```bash
./scripts/start-with-api-keys.sh coordinator
# Should see: "✅ API keys loaded"
```

Test the Tercet brains:
```bash
curl http://localhost:4200/tercet/test
```
