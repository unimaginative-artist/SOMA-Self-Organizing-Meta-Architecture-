/**
 * loaders/core.js - PRODUCTION READY V4
 * 
 * Foundational systems for SOMA Level 4.5.
 */

import { SystemValidator } from '../../core/SystemValidator.js';
import { SystemSupervisor } from '../../core/SystemSupervisor.js';
import { CognitiveBalancer } from '../../core/CognitiveBalancer.js';
import { DaemonBridge } from '../../core/DaemonBridge.js';
import { CommandBridgeInterface } from '../../core/CommandBridgeInterface.js';
import { getAnomalyDetector } from '../../arbiters/AnomalyDetector.js';
import PulseArbiter from '../../arbiters/PulseArbiter.js';
import { KevinArbiter } from '../../arbiters/KevinArbiter.js';
import { TrustRegistry } from '../../arbiters/TrustRegistry.js';
import { GossipArbiter } from '../../arbiters/GossipArbiter.js';
import { IdolSenturianArbiter } from '../../arbiters/IdolSenturianArbiter.js';
import { SecurityCouncilArbiter } from '../../arbiters/SecurityCouncilArbiter.js';
import { ImmuneCortexArbiter } from '../../arbiters/ImmuneCortexArbiter.js';
import messageBroker from '../../core/MessageBroker.js';
import { logger } from '../../core/Logger.js';

export async function loadCoreSystems() {
    console.log('\n[Loader] 🛡️  Initializing Distributed Security Ecology...');

    const core = { messageBroker };

    // 1. Foundation
    core.supervisor = new SystemSupervisor({ name: 'Supervisor-Main' });
    core.anomalyDetector = getAnomalyDetector({ rootPath: process.cwd() });
    await core.anomalyDetector.initialize();
    core.anomalyDetector.hookMessageBroker(messageBroker);
    
    // 2. SOCIAL SECURITY (The Reputation Layer)
    core.trustRegistry = new TrustRegistry({ messageBroker });
    await core.trustRegistry.initialize();

    // 3. NERVOUS SYSTEM (The Gossip Layer)
    core.gossipNet = new GossipArbiter({ messageBroker });
    await core.gossipNet.initialize();

    // 4. THE JURY (The Reasoning Layer)
    core.securityCouncil = new SecurityCouncilArbiter({ messageBroker });
    await core.securityCouncil.initialize();

    // 5. THE BODY (The Immune Layer)
    core.immuneCortex = new ImmuneCortexArbiter({
        messageBroker,
        trustRegistry: core.trustRegistry,
        gossipNet: core.gossipNet,
        securityCouncil: core.securityCouncil,
        watchdog: core.anomalyDetector
    });
    await core.immuneCortex.initialize();

    // 6. THE IDOL SENTURIAN (Existential Layer)
    core.idolSenturian = new IdolSenturianArbiter({ messageBroker });
    await core.idolSenturian.initialize();

    // 7. Legacy/Utility Guardians
    core.pulseArbiter = new PulseArbiter({ name: 'Pulse', messageBroker });
    core.kevinArbiter = new KevinArbiter({ name: 'KEVIN-Main', messageBroker });
    core.balancer = new CognitiveBalancer(null);
    
    await Promise.all([
        core.pulseArbiter.initialize(),
        core.kevinArbiter.initialize()
    ]);

    core.commandBridge = new CommandBridgeInterface();
    console.log('      ✅ Security Ecology Fully Integrated (Local & Global Active)');

    return core;
}
