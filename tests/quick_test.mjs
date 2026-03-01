#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════
// quick_test.mjs - Quick System Verification
// Tests: GPU detection, hardware profiling, basic routing
// ═══════════════════════════════════════════════════════════

import { LoadPipelineArbiter } from '../arbiters/LoadPipelineArbiter.js';

console.log('🧪 SOMA ULTRA - Quick Test\n');

async function runTests() {
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function test(name, fn) {
    return async () => {
      try {
        console.log(`   Testing: ${name}...`);
        await fn();
        results.passed++;
        results.tests.push({ name, status: 'PASS' });
        console.log(`   ✅ PASS: ${name}\n`);
      } catch (err) {
        results.failed++;
        results.tests.push({ name, status: 'FAIL', error: err.message });
        console.error(`   ❌ FAIL: ${name}`);
        console.error(`      Error: ${err.message}\n`);
      }
    };
  }

  // ═══════════════════════════════════════════════════════════
  // Test 1: LoadPipelineArbiter Initialization
  // ═══════════════════════════════════════════════════════════
  
  let arbiter = null;
  
  await test('LoadPipelineArbiter Initialization', async () => {
    arbiter = new LoadPipelineArbiter({
      name: 'TestArbiter',
      mode: 'standalone'
    });
    
    if (!arbiter) throw new Error('Failed to create arbiter');
  })();

  // ═══════════════════════════════════════════════════════════
  // Test 2: Hardware Profiling
  // ═══════════════════════════════════════════════════════════
  
  let profile = null;
  
  await test('Hardware Profiling', async () => {
    profile = await arbiter.profileHardware();
    
    if (!profile) throw new Error('Profile returned null');
    if (!profile.cpu) throw new Error('CPU profile missing');
    if (!profile.memory) throw new Error('Memory profile missing');
    if (!profile.gpu) throw new Error('GPU profile missing');
    if (!profile.tier) throw new Error('Tier assignment missing');
    if (typeof profile.score !== 'number') throw new Error('Score missing');
    
    console.log(`      Detected: ${profile.tier} tier (score: ${profile.score})`);
    console.log(`      GPU: ${profile.gpu.available ? profile.gpu.type : 'None'}`);
    console.log(`      CPU: ${profile.cpu.cores} cores @ ${profile.cpu.speed}MHz`);
    console.log(`      RAM: ${profile.memory.totalGB}GB`);
  })();

  // ═══════════════════════════════════════════════════════════
  // Test 3: Routing Table
  // ═══════════════════════════════════════════════════════════
  
  await test('Routing Table Generation', async () => {
    const status = arbiter.getStatus();
    
    if (!status.cluster) throw new Error('Cluster status missing');
    if (!status.cluster.routingTable) throw new Error('Routing table missing');
    
    const roles = Object.keys(status.cluster.routingTable);
    if (roles.length === 0) throw new Error('Routing table is empty');
    
    console.log(`      Roles available: ${roles.join(', ')}`);
  })();

  // ═══════════════════════════════════════════════════════════
  // Test 4: Task Routing
  // ═══════════════════════════════════════════════════════════
  
  await test('Task Routing', async () => {
    const result = await arbiter.routeTask({
      task: {
        type: 'gpu_training',
        taskId: 'test-task-1'
      }
    });
    
    if (!result.success) throw new Error('Task routing failed');
    if (!result.targetNode) throw new Error('Target node not assigned');
    
    console.log(`      Task routed to: ${result.targetNode}`);
    console.log(`      Role: ${result.role}`);
  })();

  // ═══════════════════════════════════════════════════════════
  // Test 5: Performance Scoring
  // ═══════════════════════════════════════════════════════════
  
  await test('Performance Scoring', async () => {
    if (!profile) throw new Error('Profile not available');
    
    // CPU score should be reasonable
    const cpuCores = profile.cpu.cores;
    if (cpuCores < 1 || cpuCores > 256) {
      throw new Error(`Unreasonable CPU core count: ${cpuCores}`);
    }
    
    // Memory should be positive
    const memGB = parseFloat(profile.memory.totalGB);
    if (memGB <= 0) {
      throw new Error(`Invalid memory size: ${memGB}GB`);
    }
    
    // Score should be in valid range
    if (profile.score < 0 || profile.score > 1500) {
      throw new Error(`Score out of range: ${profile.score}`);
    }
    
    console.log(`      CPU: ${cpuCores} cores ✓`);
    console.log(`      Memory: ${memGB}GB ✓`);
    console.log(`      Score: ${profile.score} ✓`);
  })();

  // ═══════════════════════════════════════════════════════════
  // Test 6: GPU Detection Accuracy
  // ═══════════════════════════════════════════════════════════
  
  await test('GPU Detection Accuracy', async () => {
    const gpu = profile.gpu;
    
    if (gpu.available) {
      if (!gpu.type) throw new Error('GPU type missing');
      if (!gpu.vendor) throw new Error('GPU vendor missing');
      if (gpu.compute <= 0) throw new Error('Invalid compute score');
      
      console.log(`      GPU: ${gpu.vendor} ${gpu.type} ✓`);
      console.log(`      Compute score: ${gpu.compute} ✓`);
      
      // Validate GPU-specific flags
      if (gpu.vendor === 'NVIDIA' && !gpu.cuda) {
        throw new Error('NVIDIA GPU should have CUDA flag');
      }
      if (gpu.vendor === 'Apple' && !gpu.metal) {
        throw new Error('Apple GPU should have Metal flag');
      }
    } else {
      console.log(`      No GPU detected (CPU-only mode) ✓`);
    }
  })();

  // ═══════════════════════════════════════════════════════════
  // Test 7: Cleanup
  // ═══════════════════════════════════════════════════════════
  
  await test('Cleanup & Shutdown', async () => {
    await arbiter.shutdown();
    console.log(`      Arbiter shut down cleanly ✓`);
  })();

  // ═══════════════════════════════════════════════════════════
  // Summary
  // ═══════════════════════════════════════════════════════════
  
  console.log('━'.repeat(60));
  console.log(`\n📊 Test Results:\n`);
  console.log(`   Total: ${results.passed + results.failed}`);
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log('');
  
  if (results.failed === 0) {
    console.log('🎉 ALL TESTS PASSED! System is ready.\n');
    
    if (profile) {
      console.log('📋 System Summary:');
      console.log(`   • Hardware Tier: ${profile.tier}`);
      console.log(`   • Performance Score: ${profile.score}`);
      console.log(`   • GPU: ${profile.gpu.available ? profile.gpu.type : 'None (CPU only)'}`);
      console.log(`   • Optimal Roles: ${profile.optimalRoles.join(', ')}`);
      console.log('');
    }
    
    console.log('✅ SOMA ULTRA is ready for launch!');
    console.log('   Run: node launcher_ULTRA.mjs\n');
    
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review errors above.\n');
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('\n❌ Fatal test error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
