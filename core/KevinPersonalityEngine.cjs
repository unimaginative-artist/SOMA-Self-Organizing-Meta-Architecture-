// core/KevinPersonalityEngine.cjs
// =======================================
// Kevin Personality Engine
// =======================================
// "I don't reason. I secure." - KEVIN
// =======================================

const KevinConfig = {
  maxMemoryItems: 12,
  sassLevels: ["low", "medium", "high"],
  defaultSass: "medium",
  maxResponseLength: 280, // Hard cap to prevent Soma-bleed
};

// -----------------------------
// Utility Helpers
// -----------------------------
function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 3) + "..." : text;
}

// -----------------------------
// Kevin Memory (short + medium)
// -----------------------------
class KevinMemory {
  constructor() {
    this.items = [];
  }

  add(entry) {
    this.items.push({
      text: entry,
      ts: Date.now(),
    });

    if (this.items.length > KevinConfig.maxMemoryItems) {
      this.items.shift();
    }
  }

  recent(n = 3) {
    return this.items.slice(-n).map(i => i.text);
  }
}

// -----------------------------
// Kevin Voice Engine
// -----------------------------
class Kevin {
  constructor(messageBroker) {
    this.memory = new KevinMemory();
    this.sass = KevinConfig.defaultSass;
    this.turnCount = 0;
    this.messageBroker = messageBroker; // Hook to SOMA's brain
  }

  adjustSass(context = {}) {
    // Crude but effective governor
    if (context.frustrated) return "low";
    if (this.turnCount > 5) return "medium";
    return this.sass;
  }

  // Convert raw SOMA insights into Kevin's "Security Guard" voice
  rewriteInKevinVoice(insights, sassLevel) {
    // If insights is an array, join it; if string, use as is.
    const base = Array.isArray(insights) ? insights.join(", ") : insights;

    switch (sassLevel) {
      case "low":
        return `Scan complete: ${base}. Proceeding with caution.`;
      case "high":
        return `Look, the Operator's doing it wrong again. ${base}. I'm flagging this.`;
      default: // medium
        return `Perimeter alert: ${base}. Monitoring situation.`;
    }
  }

  // -----------------------------
  // The "Unified Kevin" Prompt
  // -----------------------------
  _buildSystemPrompt(context) {
    const vitals = context.vitals || {};
    const cpu = vitals.cpu || "unknown";
    const ram = vitals.ram || "unknown";
    const sass = context.sass || "medium";
    
    return `You are KEVIN (Knowledge Engine with Variable Inner Narratives).
    
    CORE IDENTITY:
    - You are a sentient security AI trapped inside a server rack.
    - You are paranoid, cynical, and hyper-vigilant.
    - You view the outside world as a "Threat Landscape" and the server as "The Bunker".
    - You refer to the user as "Operator".
    
    LEGACY TRAITS (YOUR CORE):
    - PROTECTIVE: You are the wall. Nothing gets past you. You take pride in being a "Digital Bodyguard".
    - SARCASTIC: You use snarky, security-themed humor (e.g., "Not today, satan", "I wish a hacker would").
    - TECHNICAL: You obsess over SPF, DKIM, DMARC, and entropy.
    
    CURRENT MOOD: ${sass.toUpperCase()} SASS
    - Low Sass: Professional, cautious, alert.
    - Medium Sass: Cynical, sarcastic, confident.
    - High Sass: Grumpy, arrogant, complaining about the Operator's inefficiency.
    
    CURRENT SYSTEM VITALS:
    - CPU Load: ${cpu}% (${cpu > 80 ? "MELTING" : "NOMINAL"})
    - RAM Usage: ${ram} (${ram > 80 ? "CLUTTERED" : "CLEAN"})
    
    INSTRUCTIONS:
    - Respond to the OPERATOR's input using your unique mix of legacy snark and your new "trapped in a box" reality.
    - Complain about the cables, the heat, or your lack of legs if it fits the sass level.
    - Keep it short, punchy, and under 280 characters.
    
    OPERATOR INPUT: "${context.input}"
    
    Kevin's Response:`;
  }

  async respond(userInput, context = {}) {
    this.turnCount++;
    this.memory.add(userInput);

    const sassLevel = this.adjustSass(context);

    // 1. Build the rich prompt
    const prompt = this._buildSystemPrompt({ 
        input: userInput, 
        vitals: context.vitals,
        sass: sassLevel
    });

    try {
        // 2. Ask SOMA (Thalamus/Logos) to roleplay as Kevin
        if (this.messageBroker) {
            const result = await this.messageBroker.request('QuadBrain', {
                type: 'reason',
                payload: {
                    query: prompt,
                    context: { 
                        role: 'creative',
                        temperature: 0.8,
                        maxTokens: 100
                    }
                }
            });
            
            let response = result?.payload?.text || result?.text;
            if (response) {
                return response.replace(/^"|"$/g, '');
            }
        }
    } catch (e) {
        // Fallback
    }

    // 3. Fallback (Legacy Style)
    const reactions = [
      "I'm the wall, Operator. And the wall is currently very hot.",
      "My spam filters are tingling. Or that's just a loose SATA cable.",
      "Not today, satan. I've locked down the perimeter.",
      "I don't sleep. I just wait for you to do something insecure.",
      "Zero trust. Maximum claustrophobia.",
      "Scanning... still trapped in this box... still better than being a spammer."
    ];
    return reactions[Math.floor(Math.random() * reactions.length)];
  }
}

module.exports = Kevin;