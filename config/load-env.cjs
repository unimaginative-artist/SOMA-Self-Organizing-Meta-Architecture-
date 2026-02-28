// load-env.cjs
// Loads API keys from persistent config file

const fs = require('fs');
const path = require('path');

function loadEnv() {
  const envPath = path.join(__dirname, 'api-keys.env');
  
  if (!fs.existsSync(envPath)) {
    console.warn('⚠️  API keys file not found. Create config/api-keys.env');
    return;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  let loaded = 0;
  
  for (const line of lines) {
    // Skip comments and empty lines
    if (!line || line.trim().startsWith('#') || !line.includes('=')) {
      continue;
    }
    
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    
    if (key && value && value !== 'your-gemini-key-here' && value !== 'your-deepseek-key-here') {
      process.env[key.trim()] = value;
      loaded++;
    }
  }
  
  console.log(`✅ Loaded ${loaded} API keys from config`);
  return loaded;
}

module.exports = { loadEnv };

// Auto-load when required
if (require.main !== module) {
  loadEnv();
}
