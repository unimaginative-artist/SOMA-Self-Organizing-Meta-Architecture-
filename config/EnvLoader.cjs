/**
 * EnvLoader.cjs - Secure environment configuration loader
 * 
 * Reads API keys and config from .env file (never hardcoded)
 * Provides typed access to all configuration values
 */

const fs = require('fs');
const path = require('path');

class EnvLoader {
  constructor() {
    this.config = {};
    this.loaded = false;
  }

  /**
   * Load environment variables from .env file
   * @param {string} envPath - Path to .env file (defaults to project root)
   * @returns {Object} Configuration object
   */
  load(envPath = null) {
    if (this.loaded) return this.config;

    // Determine .env file path
    const defaultPath = path.join(process.cwd(), '.env');
    const filepath = envPath || defaultPath;

    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️  .env file not found at ${filepath}. Using defaults.`);
      this.config = this._getDefaults();
      this.loaded = true;
      return this.config;
    }

    try {
      const content = fs.readFileSync(filepath, 'utf8');
      this.config = this._parseEnv(content);
      this.loaded = true;
      
      console.log('✅ Environment configuration loaded from .env');
      return this.config;
    } catch (error) {
      console.error(`❌ Failed to load .env file: ${error.message}`);
      this.config = this._getDefaults();
      this.loaded = true;
      return this.config;
    }
  }

  /**
   * Parse .env file content into config object
   * @private
   */
  _parseEnv(content) {
    const config = {};
    // Handle both Unix (\n) and Windows (\r\n) line endings
    const lines = content.replace(/\r\n/g, '\n').split('\n');

    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) continue;

      // Parse KEY=VALUE
      const match = line.match(/^([^=]+)=(.*)$/);
      if (!match) continue;

      const key = match[1].trim();
      const value = match[2].trim();

      config[key] = value;
    }

    return config;
  }

  /**
   * Get defaults for all config keys
   * @private
   */
  _getDefaults() {
    return {
      // OpenAI
      OPENAI_API_KEY: '',
      OPENAI_MODEL: 'gpt-4o-mini',

      // Gemini
      GEMINI_API_KEY: '',
      GEMINI_MODEL: 'gemini-2.0-flash-exp',

      // DeepSeek
      DEEPSEEK_API_KEY: '',
      DEEPSEEK_MODEL: 'deepseek-chat',

      // Ollama
      OLLAMA_ENDPOINT: 'http://localhost:11434',
      OLLAMA_MODEL: 'llama3.2',

      // SOMA
      SOMA_MODE: 'cluster',
      SOMA_CLUSTER: 'true',
      SOMA_ROLE: 'coordinator',
      SOMA_CLUSTER_PORT: '7777',
      SOMA_CLUSTER_DISCOVERY: 'true',
      SOMA_CLUSTER_NODES: '3',
      SOMA_GPU: 'true',
      SOMA_MULTIMODAL: 'true',
      SOMA_CONTINUOUS_LEARNING: 'true',
      SOMA_DASHBOARD: 'true',
      SOMA_FILE_WATCH: 'true',

      // Logging
      LOG_LEVEL: 'info',
      LOG_FILE: './logs/soma.log',

      // Storage
      SOMA_BASE_DIR: path.join(process.env.HOME || process.env.USERPROFILE, '.soma'),

      // Federated Learning
      FEDERATED_SYNC_INTERVAL: '3600000',
      FEDERATED_MIN_AGREEMENT: '66',

      // Redis
      REDIS_URL: 'redis://localhost:6379',

      // Database
      DATABASE_PATH: './soma-memory.db',
    };
  }

  /**
   * Get a single config value
   * @param {string} key - Config key
   * @param {*} defaultValue - Default value if not found
   */
  get(key, defaultValue = undefined) {
    if (!this.loaded) this.load();
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }

  /**
   * Get boolean config value
   * @param {string} key - Config key
   * @param {boolean} defaultValue - Default value
   */
  getBoolean(key, defaultValue = false) {
    if (!this.loaded) this.load();
    const value = this.config[key];
    if (value === undefined) return defaultValue;
    return value.toLowerCase() === 'true' || value === '1';
  }

  /**
   * Get number config value
   * @param {string} key - Config key
   * @param {number} defaultValue - Default value
   */
  getNumber(key, defaultValue = 0) {
    if (!this.loaded) this.load();
    const value = this.config[key];
    if (value === undefined) return defaultValue;
    const num = parseInt(value, 10);
    return isNaN(num) ? defaultValue : num;
  }

  /**
   * Get API provider configuration with fallback strategy
   * Returns first available API with valid key
   * Priority: Gemini (free) → DeepSeek (paid) → OpenAI (paid) → Ollama (local)
   */
  getApiProvider() {
    if (!this.loaded) this.load();

    // Priority 1: Gemini (free tier, fast)
    if (this.get('GEMINI_API_KEY')) {
      return {
        type: 'gemini',
        apiKey: this.get('GEMINI_API_KEY'),
        model: this.get('GEMINI_MODEL', 'gemini-2.0-flash-exp'),
        endpoint: 'https://generativelanguage.googleapis.com/v1'
      };
    }

    // Priority 2: DeepSeek (paid but cheap)
    if (this.get('DEEPSEEK_API_KEY')) {
      return {
        type: 'deepseek',
        apiKey: this.get('DEEPSEEK_API_KEY'),
        model: this.get('DEEPSEEK_MODEL', 'deepseek-chat'),
        endpoint: 'https://api.deepseek.com'
      };
    }

    // Priority 3: OpenAI (paid, premium)
    if (this.get('OPENAI_API_KEY')) {
      return {
        type: 'openai',
        apiKey: this.get('OPENAI_API_KEY'),
        model: this.get('OPENAI_MODEL', 'gpt-4o-mini'),
        endpoint: 'https://api.openai.com/v1'
      };
    }

    // Priority 3: DeepSeek
    if (this.get('DEEPSEEK_API_KEY')) {
      return {
        type: 'deepseek',
        apiKey: this.get('DEEPSEEK_API_KEY'),
        model: this.get('DEEPSEEK_MODEL', 'deepseek-chat'),
        endpoint: 'https://api.deepseek.com'
      };
    }

    // Priority 4: Ollama (local, free)
    return {
      type: 'ollama',
      apiKey: null, // Ollama doesn't require API key
      model: this.get('OLLAMA_MODEL', 'llama3.2'),
      endpoint: this.get('OLLAMA_ENDPOINT', 'http://localhost:11434')
    };
  }

  /**
   * Get specific provider configuration
   * @param {string} providerType - 'openai' | 'gemini' | 'deepseek' | 'ollama'
   */
  getProvider(providerType) {
    if (!this.loaded) this.load();

    switch (providerType) {
      case 'openai':
        return {
          type: 'openai',
          apiKey: this.get('OPENAI_API_KEY'),
          model: this.get('OPENAI_MODEL', 'gpt-4o-mini'),
          endpoint: 'https://api.openai.com/v1',
          available: !!this.get('OPENAI_API_KEY')
        };

      case 'gemini':
        return {
          type: 'gemini',
          apiKey: this.get('GEMINI_API_KEY'),
          model: this.get('GEMINI_MODEL', 'gemini-2.0-flash-exp'),
          endpoint: 'https://generativelanguage.googleapis.com/v1',
          available: !!this.get('GEMINI_API_KEY')
        };

      case 'deepseek':
        return {
          type: 'deepseek',
          apiKey: this.get('DEEPSEEK_API_KEY'),
          model: this.get('DEEPSEEK_MODEL', 'deepseek-chat'),
          endpoint: 'https://api.deepseek.com',
          available: !!this.get('DEEPSEEK_API_KEY')
        };

      case 'ollama':
        return {
          type: 'ollama',
          apiKey: null,
          model: this.get('OLLAMA_MODEL', 'llama3.2'),
          endpoint: this.get('OLLAMA_ENDPOINT', 'http://localhost:11434'),
          available: true // Ollama is local, always available if endpoint is reachable
        };

      default:
        throw new Error(`Unknown provider type: ${providerType}`);
    }
  }

  /**
   * Get all available providers (those with valid API keys or endpoints)
   */
  getAvailableProviders() {
    if (!this.loaded) this.load();

    const providers = [];

    if (this.get('OPENAI_API_KEY')) {
      providers.push(this.getProvider('openai'));
    }
    if (this.get('GEMINI_API_KEY')) {
      providers.push(this.getProvider('gemini'));
    }
    if (this.get('DEEPSEEK_API_KEY')) {
      providers.push(this.getProvider('deepseek'));
    }

    // Ollama is always "available" as option
    providers.push(this.getProvider('ollama'));

    return providers;
  }

  /**
   * Get full config object
   */
  getAll() {
    if (!this.loaded) this.load();
    return { ...this.config };
  }

  /**
   * Log current configuration (excluding sensitive keys)
   */
  logConfig() {
    if (!this.loaded) this.load();

    console.log('\n📋 SOMA Configuration:');
    console.log('═'.repeat(60));

    // Log providers
    console.log('\n🤖 Available Providers:');
    const available = this.getAvailableProviders();
    for (const provider of available) {
      if (provider.type !== 'ollama' || provider.available) {
        console.log(`  ✓ ${provider.type.toUpperCase()}: ${provider.model}`);
      }
    }

    console.log('\n⚙️  System:');
    console.log(`  Mode: ${this.get('SOMA_MODE')}`);
    console.log(`  Cluster: ${this.getBoolean('SOMA_CLUSTER')}`);
    console.log(`  GPU: ${this.getBoolean('SOMA_GPU')}`);
    console.log(`  Logging: ${this.get('LOG_LEVEL')}`);

    console.log('═'.repeat(60) + '\n');
  }
}

// Singleton instance
let instance = null;

function getEnvLoader() {
  if (!instance) {
    instance = new EnvLoader();
    instance.load();
  }
  return instance;
}

module.exports = { EnvLoader, getEnvLoader };
