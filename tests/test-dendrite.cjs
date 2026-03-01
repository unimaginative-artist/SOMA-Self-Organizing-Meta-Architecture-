#!/usr/bin/env node
/**
 * Test Dendrite web search
 */

const { Dendrite } = require('../cognitive/Dendrite.cjs');

async function test() {
  const dendrite = new Dendrite();
  
  console.log('\n🧪 Testing Dendrite Web Search\n');
  console.log('Query: "quantum realm color MCU"\n');
  
  const results = await dendrite.search('quantum realm color MCU');
  
  if (results.success) {
    console.log(`✅ Found ${results.count} results in ${results.elapsed}ms\n`);
    console.log('='.repeat(60) + '\n');
    
    results.results.forEach((result, index) => {
      console.log(`[${index + 1}] ${result.title}`);
      console.log(`    ${result.snippet.substring(0, 200)}...`);
      console.log(`    🔗 ${result.url}\n`);
    });
    
    console.log('='.repeat(60));
    console.log('\n📊 Metrics:', dendrite.getMetrics());
  } else {
    console.log('❌ Search failed:', results.error);
  }
}

test().catch(console.error);
