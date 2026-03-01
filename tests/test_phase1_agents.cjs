// test_phase1_agents.cjs
// Quick test to verify Phase 1 agents load and initialize

const BlackAgent = require('./microagents/BlackAgent.cjs');
const JetstreamAgent = require('./microagents/JetstreamAgent.cjs');
const KuzeAgent = require('./microagents/KuzeAgent.cjs');
const BatouAgent = require('./microagents/BatouAgent.cjs');

async function testAgents() {
  console.log('🧪 TESTING PHASE 1 AGENTS\n');
  console.log('='.repeat(60));
  
  const results = {
    passed: [],
    failed: []
  };
  
  // Test Black
  console.log('\n[1/4] Testing BlackAgent (System Health Monitor)...');
  try {
    const black = new BlackAgent({ 
      monitoringInterval: 60000,
      ttl: 300000 
    });
    await black.initialize();
    
    // Quick functionality test
    const scanResult = await black.executeTask({ 
      type: 'scan',
      payload: {}
    });
    
    const healthResult = await black.executeTask({
      type: 'health-check',
      payload: {}
    });
    
    console.log(`  ✅ Black initialized successfully`);
    console.log(`  ✅ Scan test passed: ${scanResult.result?.success ? 'OK' : 'FAIL'}`);
    console.log(`  ✅ Health check: ${healthResult.result?.health?.status || 'unknown'}`);
    console.log(`  📊 Status:`, black.getStatus());
    
    await black.terminate();
    results.passed.push('BlackAgent');
  } catch (error) {
    console.error(`  ❌ Black failed: ${error.message}`);
    results.failed.push({ agent: 'BlackAgent', error: error.message });
  }
  
  // Test Jetstream
  console.log('\n[2/4] Testing JetstreamAgent (Ops/Diagnostics)...');
  try {
    const jetstream = new JetstreamAgent({ 
      ttl: 300000,
      intelCacheTTL: 60000
    });
    await jetstream.initialize();
    
    // Quick functionality test
    const diagResult = await jetstream.executeTask({
      type: 'diagnostics',
      payload: { scope: 'system' }
    });
    
    const riskResult = await jetstream.executeTask({
      type: 'risk',
      payload: {}
    });
    
    console.log(`  ✅ Jetstream initialized successfully`);
    console.log(`  ✅ Diagnostic test: ${diagResult.result?.success ? 'OK' : 'FAIL'}`);
    console.log(`  ✅ Risk assessment: ${riskResult.result?.assessment?.severity || 'unknown'}`);
    console.log(`  📊 Status:`, jetstream.getStatus());
    
    await jetstream.terminate();
    results.passed.push('JetstreamAgent');
  } catch (error) {
    console.error(`  ❌ Jetstream failed: ${error.message}`);
    results.failed.push({ agent: 'JetstreamAgent', error: error.message });
  }
  
  // Test Kuze
  console.log('\n[3/4] Testing KuzeAgent (Analytical Intelligence)...');
  try {
    const kuze = new KuzeAgent({ 
      ttl: 300000,
      patternThreshold: 0.7
    });
    await kuze.initialize();
    
    // Quick functionality test with mock data
    const patternResult = await kuze.executeTask({
      type: 'pattern-detect',
      payload: {
        events: [
          { type: 'test', timestamp: Date.now() },
          { type: 'test', timestamp: Date.now() + 1000 },
          { type: 'test', timestamp: Date.now() + 2000 }
        ],
        context: 'test'
      }
    });
    
    const riskResult = await kuze.executeTask({
      type: 'risk-model',
      payload: {
        factors: [
          { name: 'test-factor', likelihood: 0.5, impact: 0.6 }
        ],
        context: 'test'
      }
    });
    
    console.log(`  ✅ Kuze initialized successfully`);
    console.log(`  ✅ Pattern detection: ${patternResult.result?.success ? 'OK' : 'FAIL'} (${patternResult.result?.analysis?.patterns?.length || 0} patterns)`);
    console.log(`  ✅ Risk modeling: ${riskResult.result?.success ? 'OK' : 'FAIL'} (risk: ${(riskResult.result?.model?.overallRisk * 100 || 0).toFixed(0)}%)`);
    console.log(`  📊 Status:`, kuze.getStatus());
    
    await kuze.terminate();
    results.passed.push('KuzeAgent');
  } catch (error) {
    console.error(`  ❌ Kuze failed: ${error.message}`);
    console.error(error.stack);
    results.failed.push({ agent: 'KuzeAgent', error: error.message });
  }
  
  // Test Batou
  console.log('\n[4/4] Testing BatouAgent (Tactical Security)...');
  try {
    const batou = new BatouAgent({ 
      ttl: 300000,
      continuousScan: false
    });
    await batou.initialize();
    
    // Quick functionality test
    const scanResult = await batou.executeTask({
      type: 'scan-threats',
      payload: { scope: 'system' }
    });
    
    const tacticalResult = await batou.executeTask({
      type: 'tactical',
      payload: {}
    });
    
    console.log(`  ✅ Batou initialized successfully`);
    console.log(`  ✅ Threat scan: ${scanResult.result?.success ? 'OK' : 'FAIL'} (${scanResult.result?.scan?.threats?.length || 0} threats)`);
    console.log(`  ✅ Tactical assessment: ${tacticalResult.result?.assessment?.situation || 'unknown'}`);
    console.log(`  ⚠️  Threat level: ${batou.threatLevel}`);
    console.log(`  📊 Status:`, batou.getStatus());
    
    await batou.terminate();
    results.passed.push('BatouAgent');
  } catch (error) {
    console.error(`  ❌ Batou failed: ${error.message}`);
    results.failed.push({ agent: 'BatouAgent', error: error.message });
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 TEST SUMMARY');
  console.log(`✅ Passed: ${results.passed.length}/4`);
  console.log(`❌ Failed: ${results.failed.length}/4`);
  
  if (results.passed.length > 0) {
    console.log('\n✅ Passed agents:');
    results.passed.forEach(agent => console.log(`   - ${agent}`));
  }
  
  if (results.failed.length > 0) {
    console.log('\n❌ Failed agents:');
    results.failed.forEach(({ agent, error }) => {
      console.log(`   - ${agent}: ${error}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.failed.length === 0) {
    console.log('\n🎉 ALL PHASE 1 AGENTS PASSED! Ready for Phase 2.\n');
    return 0;
  } else {
    console.log('\n⚠️  Some agents failed. Review errors above.\n');
    return 1;
  }
}

// Run tests
testAgents()
  .then(exitCode => process.exit(exitCode))
  .catch(err => {
    console.error('\n💥 TEST RUNNER CRASHED:', err);
    process.exit(1);
  });
