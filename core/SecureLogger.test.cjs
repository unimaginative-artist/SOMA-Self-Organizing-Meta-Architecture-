/**
 * SecureLogger Test - Verify sensitive data redaction works
 * Run with: node core/SecureLogger.test.js
 */

const logger = require('./SecureLogger.cjs');

console.log('\n🧪 TESTING SECURE LOGGER\n');
console.log('═'.repeat(60));

// Test 1: API Key redaction
console.log('\n✅ Test 1: API Key Redaction');
console.log('Before redaction:', { api_key: 'sk-1234567890abcdef', message: 'Hello' });
logger.info('After redaction:', { api_key: 'sk-1234567890abcdef', message: 'Hello' });

// Test 2: Password redaction
console.log('\n✅ Test 2: Password Redaction');
logger.info('Login attempt:', { username: 'barry', password: 'supersecret123', timestamp: Date.now() });

// Test 3: Nested object redaction
console.log('\n✅ Test 3: Nested Object Redaction');
logger.info('Config loaded:', {
  server: { port: 3001, host: 'localhost' },
  auth: {
    api_key: 'AIzaSyCkHgyLEpVF1MS5fbWgF3w3tM_T5vRU48M',
    secret: 'my-secret-key',
    token: 'bearer-token-12345'
  },
  features: { multimodal: true }
});

// Test 4: Token redaction
console.log('\n✅ Test 4: Bearer Token Redaction');
logger.info('API request:', {
  headers: { Authorization: 'Bearer sk-abc123xyz', 'Content-Type': 'application/json' }
});

// Test 5: Multiple patterns
console.log('\n✅ Test 5: Multiple Sensitive Fields');
logger.info('Full credentials:', {
  GEMINI_API_KEY: 'AIzaSyCkHgyLEpVF1MS5fbWgF3w3tM_T5vRU48M',
  DEEPSEEK_API_KEY: 'sk-f4c19f3599604bb3936426356290bf71',
  password: 'admin123',
  session_id: 'sess_1234567890',
  user: 'barry',
  email: 'barry@example.com'
});

// Test 6: Log levels
console.log('\n✅ Test 6: Different Log Levels');
logger.debug('Debug message with api_key:', { api_key: 'secret' });
logger.info('Info message');
logger.warn('Warning message with token:', { token: 'abc123' });
logger.error('Error message with password:', { password: '12345' });

// Test 7: Array redaction
console.log('\n✅ Test 7: Array Redaction');
logger.info('User list:', [
  { name: 'User1', api_key: 'key1' },
  { name: 'User2', api_key: 'key2' }
]);

console.log('\n' + '═'.repeat(60));
console.log('✅ ALL TESTS COMPLETE - Verify API keys are ***REDACTED***\n');
