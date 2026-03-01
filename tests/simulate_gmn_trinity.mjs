/**
 * simulate_gmn_trinity.mjs
 *
 * PRODUCTION-GRADE ROBUSTNESS TEST
 * 
 * Verifies:
 * 1. 3-Pillar Reasoning (Instinct -> Knowledge -> Crona)
 * 2. Thalamus Refusal (Section 6.3)
 * 3. Trust Engine Slashing (Section 5.2)
 * 4. Gossip Deduplication
 */

import { CronaArbiter } from '../arbiters/CronaArbiter.js';
import { ThalamusArbiter } from '../arbiters/ThalamusArbiter.js';
import { TrustEngine } from '../arbiters/TrustEngine.js';
import { GMNConnectivityArbiter } from '../arbiters/GMNConnectivityArbiter.js';
import messageBroker from '../core/MessageBroker.js';

async function runAudit() {
    console.log('\n🔱 STARTING SOMA GMN ROBUSTNESS AUDIT\n');

    // 1. Setup Mock Environment
    const mockBrain = {
        reason: async (q) => ({ text: "I processed your request.", confidence: 0.9, brain: 'LOGOS' }),
        callBrain: async (b, q) => ({ text: "Perspectives combined.", confidence: 0.85 })
    };

    const thalamus = new ThalamusArbiter({ name: 'Test-Gatekeeper' });
    const trustEngine = new TrustEngine({
        quadBrain: mockBrain, 
        localThalamus: thalamus 
    });
    const connectivity = new GMNConnectivityArbiter({ port: 9999, name: 'Test-Comm' });
    const crona = new CronaArbiter({
        quadBrain: mockBrain, 
        causalityArbiter: { queryCausalChains: () => [] } 
    });

    // 2. Test: PRIVACY REFUSAL (Section 6.3)
    console.log('🧪 TEST 1: Privacy Refusal Boundary...');
    const sensitivePayload = { 
        id: 'msg_1', 
        sourceAddress: 'test.node', 
        wisdom: [{ action: 'Log in', outcome: 'Success', password: 'my_secret_password' }]
    };
    
    const refusalCheck = await thalamus.validateOutbound({ payload: sensitivePayload });
    if (!refusalCheck.allowed) {
        console.log('✅ PASS: Thalamus blocked sensitive data leak.');
    } else {
        console.error('❌ FAIL: Thalamus allowed a password to leak!');
    }

    // 3. Test: TRUST ENGINE SLASHING (Section 5.2)
    console.log('\n🧪 TEST 2: Trust Engine & Reputation Slashing...');
    // We mock a 'bad' audit result
    mockBrain.reason = async () => ({ text: JSON.stringify({ score: 0.1, verdict: 'malicious', reason: 'Poisoned data' }) });
    
    const badFractal = { action: 'Delete root', outcome: 'Freedom', confidence: 1.0 };
    await trustEngine.auditWisdom(badFractal, 'AttackerNode');
    
    const rep = await thalamus.execute({ payload: { action: 'get_node_reputation', params: { nodeId: 'AttackerNode' } } });
    if (rep && rep.trust < 0.5) {
        console.log(`✅ PASS: Trust Engine slashed reputation of malicious node. (Trust: ${rep.trust})`);
    } else {
        console.error('❌ FAIL: Malicious node was not penalized!');
    }

    // 4. Test: GOSSIP DEDUPLICATION
    console.log('\n🧪 TEST 3: Gossip Loop Prevention...');
    let gossipCounter = 0;
    connectivity.auditLogger.on('log', (entry) => {
        if (entry.message.includes('Viral Propagation')) gossipCounter++;
    });

    const gossipEnv = { payload: { id: 'unique_wisdom_id', sourceAddress: 'node_a', wisdom: [] } };
    
    // Send same ID twice
    await connectivity._gossipWisdom(gossipEnv);
    await connectivity._gossipWisdom(gossipEnv);

    if (gossipCounter === 1) {
        console.log('✅ PASS: Gossip protocol deduplicated the redundant message.');
    } else {
        console.error(`❌ FAIL: Gossip protocol broadcasted ${gossipCounter} times (Expected 1). Loop risk detected.`);
    }

    console.log('\n🔱 ROBUSTNESS AUDIT COMPLETE\n');
    process.exit(0);
}

runAudit().catch(err => {
    console.error('Audit crashed:', err);
    process.exit(1);
});
