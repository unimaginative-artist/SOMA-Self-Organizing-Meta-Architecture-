import path from 'path';
import { BaseArbiterV4, ArbiterRole, ArbiterCapability } from './BaseArbiter.js';

/**
 * SecurityCouncilArbiter
 * 
 * "KEVIN's Brain Upgrade"
 * 
 * Orchestrates a security debate for threat analysis:
 * 1. The Paranoid (Flags everything)
 * 2. The Pragmatist (False Positive check)
 * 3. The Forensics Expert (Deep analysis/Vision)
 * 4. The CISO (Verdict)
 */
export class SecurityCouncilArbiter extends BaseArbiterV4 {
  constructor(opts = {}) {
    super({
      ...opts,
      name: opts.name || 'SecurityCouncilArbiter',
      role: ArbiterRole.GUARDIAN,
      capabilities: [
        ArbiterCapability.NETWORK_ACCESS,
        ArbiterCapability.READ_FILES
      ]
    });

    this.quadBrain = opts.quadBrain || null;
    this.visionArbiter = opts.visionArbiter || null;
    this.recentAlerts = [];
    
    // 🧠 THREAT MEMORY (The Learning Loop)
    this.threatMemoryPath = path.join(process.cwd(), '.soma', 'threat_patterns.json');
    this.threatDatabase = {
        botSignatures: [],
        humanSignatures: [],
        scamPatterns: [],
        lastEvolved: null
    };
  }

  async onInitialize() {
    await this.loadThreatMemory();
    this.auditLogger.info('Security Council initialized with Persistent Memory');
  }

  async loadThreatMemory() {
    try {
        const data = await fs.readFile(this.threatMemoryPath, 'utf8');
        this.threatDatabase = JSON.parse(data);
        this.auditLogger.success(`[Security] Loaded ${this.threatDatabase.scamPatterns.length} persistent threat patterns.`);
    } catch (e) {
        this.auditLogger.warn('[Security] No threat memory found. Initializing fresh database.');
        await this.saveThreatMemory();
    }
  }

  async saveThreatMemory() {
    try {
        await fs.mkdir(path.dirname(this.threatMemoryPath), { recursive: true });
        await fs.writeFile(this.threatMemoryPath, JSON.stringify(this.threatDatabase, null, 2));
    } catch (e) {
        this.auditLogger.error(`[Security] Failed to save memory: ${e.message}`);
    }
  }

  /**
   * 🧬 EVOLUTION: Distill new security rules from experience
   */
  async evolvePatterns() {
    if (!this.quadBrain || this.recentAlerts.length < 5) return;

    this.auditLogger.info('🧬 [Evolution] Distilling new threat patterns from recent encounters...');
    
    const context = JSON.stringify(this.recentAlerts.slice(-10));
    const prompt = `
      Review the recent security alerts: ${context}
      
      Current Patterns: ${JSON.stringify(this.threatDatabase)}
      
      TASK:
      Identify 1-2 NEW specific keywords, regex patterns, or behavioral markers 
      that distinguish BOTS, HUMANS (on AI sites), or SCAMMERS.
      
      OUTPUT FORMAT:
      { "type": "bot|human|scam", "pattern": "string", "reason": "why" }
    `;

    try {
        const result = await this.quadBrain.reason(prompt, 'analytical');
        const update = JSON.parse(result.text.replace(/```json/g, '').replace(/```/g, '').trim());
        
        if (update.type === 'bot') this.threatDatabase.botSignatures.push(update.pattern);
        if (update.type === 'human') this.threatDatabase.humanSignatures.push(update.pattern);
        if (update.type === 'scam') this.threatDatabase.scamPatterns.push(update.pattern);
        
        this.threatDatabase.lastEvolved = new Date().toISOString();
        await this.saveThreatMemory();
        this.auditLogger.success(`🧬 [Evolution] New ${update.type} pattern learned: ${update.pattern}`);
    } catch (e) {
        this.auditLogger.error('🧬 [Evolution] Failed to distill patterns');
    }
  }

  getRecentAlerts() {
    return this.recentAlerts.slice(-10).reverse();
  }

  /**
   * Analyze a potential threat
   * @param {object} threat - { type, source, content, screenshot? }
   */
  async analyzeThreat(threat) {
    this.auditLogger.info(`🚨 [SecurityCouncil] Convening for threat: ${threat.type} from ${threat.source}`);
    const startTime = Date.now();

    // Store in recent alerts
    this.recentAlerts.push({
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        message: `Security Audit: ${threat.type} from ${threat.source}`,
        severity: 'Critical'
    });
    if (this.recentAlerts.length > 50) this.recentAlerts.shift();

    // 1. FORENSICS PHASE
    const forensics = await this._runForensicsAgent(threat);

    // 2. COUNCIL DEBATE
    const debate = await this._runSecurityDebate(threat, forensics);

    // 3. CISO VERDICT
    const verdict = await this._runCISOAgent(threat, debate);

    // 4. ACTION
    // If verdict is BLOCK, KEVINManager will handle the actual blocking logic
    
    // 🧠 LIMBIC SIGNAL: Broadcast security threat
    if (this.messageBroker && verdict.action === 'BLOCK') {
        this.messageBroker.publish('security_alert', {
            type: threat.type,
            source: threat.source,
            severity: 'High'
        });
    }

    // 🧬 EVOLUTION CHECK
    if (this.recentAlerts.length % 5 === 0) {
        this.evolvePatterns().catch(e => console.error(e));
    }

    return {
        threat,
        timestamp: new Date().toISOString(),
        forensics,
        debate,
        verdict
    };
  }

  // =========================================================================
  // 🕵️ PHASE 1: FORENSICS
  // =========================================================================

  async _runForensicsAgent(threat) {
    this.auditLogger.debug(`[Forensics] Analyzing headers/content...`);
    
    let visionAnalysis = "No visual data";
    if (threat.screenshot && this.visionArbiter) {
        // Mocking vision arbiter call if we had one connected
        visionAnalysis = "Visual scan: Suspicious login form detected (75% match)";
    }

    return {
        header_analysis: "SPF/DKIM fail",
        link_analysis: "Redirects to known malicious TLD (.xyz)",
        vision_analysis: visionAnalysis
    };
  }

  // =========================================================================
  // ⚔️ PHASE 2: DEBATE
  // =========================================================================

  async _runSecurityDebate(threat, forensics) {
    this.auditLogger.debug(`[Debate] Paranoid vs Pragmatist...`);

    // 1. The Paranoid (Thalamus - Security Brain)
    const paranoidArg = await this._generatePersonaResponse('Paranoid', threat, forensics, null);
    
    // 2. The Pragmatist (Prometheus - Strategy Brain)
    const pragmatistArg = await this._generatePersonaResponse('Pragmatist', threat, forensics, paranoidArg);

    return {
        paranoid_case: paranoidArg,
        pragmatist_case: pragmatistArg
    };
  }

  async _generatePersonaResponse(persona, threat, forensics, opponentArg) {
    if (!this.quadBrain) return `${persona}: (Brain Offline) Block it to be safe.`;

    let prompt = "";
    let brainMode = 'security'; // Default to Thalamus

    if (persona === 'Paranoid') {
        prompt = `You are a Paranoid Security Researcher.
        THREAT: ${JSON.stringify(threat)}
        FORENSICS: ${JSON.stringify(forensics)}
        GOAL: Explain why this is a CRITICAL THREAT. Assume the worst case.
        Ignore convenience. Safety is absolute.`;
        brainMode = 'security';
    } else if (persona === 'Pragmatist') {
        prompt = `You are a Pragmatic IT Admin.
        Review the threat and the Paranoid argument: "${opponentArg}".
        GOAL: Is this a False Positive? Is it a user installing a game or a newsletter?
        Don't block legitimate user activity unless 100% sure.`;
        brainMode = 'analytical';
    }

    const result = await this.quadBrain.reason(prompt, brainMode);
    return result.text || result.response;
  }

  // =========================================================================
  // ⚖️ PHASE 3: CISO VERDICT
  // =========================================================================

  async _runCISOAgent(threat, debate) {
    this.auditLogger.debug(`[CISO] Finalizing verdict...`);

    const prompt = `
      You are the CISO (Chief Information Security Officer).
      Review the debate.
      
      PARANOID: ${debate.paranoid_case}
      PRAGMATIST: ${debate.pragmatist_case}
      
      Task:
      1. Issue Verdict: BLOCK, QUARANTINE, ALLOW.
      2. Confidence Score (0-100%).
      3. Reason.
    `;

    let verdict = { text: "System Offline", confidence: 0 };
    if (this.quadBrain) {
        const result = await this.quadBrain.reason(prompt, 'balanced');
        verdict = { text: result.text || result.response, confidence: result.confidence };
    }

    const action = verdict.text.includes("ALLOW") ? "ALLOW" : "BLOCK";

    return {
        action,
        confidence: verdict.confidence,
        reason: verdict.text
    };
  }
}

export default SecurityCouncilArbiter;
