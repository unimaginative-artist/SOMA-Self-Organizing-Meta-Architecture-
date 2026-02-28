/**
 * FragmentRegistry.js - Domain-Specific Micro-Brain Manager
 *
 * Manages specialized cognitive fragments that branch off the 4 core pillar brains.
 * Each fragment specializes in a narrow domain (e.g., medical diagnostics, legal analysis).
 *
 * Architecture:
 *   LOGOS (Analytical)    ──┬── Medical Diagnostics Fragment
 *                           ├── Legal Analysis Fragment
 *                           └── Code Analysis Fragment
 *
 *   AURORA (Creative)     ──┬── Story Writing Fragment
 *                           ├── Art Generation Fragment
 *                           └── Music Composition Fragment
 *
 *   PROMETHEUS (Strategy) ──┬── Business Planning Fragment
 *                           ├── Project Management Fragment
 *                           └── Risk Assessment Fragment
 *
 *   THALAMUS (Safety)     ──┬── Content Moderation Fragment
 *                           └── Ethics Review Fragment
 *
 * Features:
 * - Dynamic fragment spawning based on query patterns
 * - Fragment expertise tracking & improvement over time
 * - Hierarchical routing (pillar -> fragment)
 * - Fragment performance metrics
 * - Automatic fragment specialization through learning
 * 
 * NEW:
 * - Autonomous Genesis (creates new fragments without templates)
 * - Recursive Evolution (Mitosis & Neuroplasticity)
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

export class FragmentRegistry extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.name = 'FragmentRegistry';

    // Dependencies
    this.messageBroker = opts.messageBroker; // NEW: Required for indexing
    this.quadBrain = opts.quadBrain; // Reference to QuadBrain for delegation
    this.learningPipeline = opts.learningPipeline; // For learning from fragment usage
    this.mnemonic = opts.mnemonic; // For storing fragment knowledge

    // Fragment storage
    this.fragments = new Map(); // fragmentId -> Fragment instance
    this.pillarFragments = {
      LOGOS: new Map(),
      AURORA: new Map(),
      PROMETHEUS: new Map(),
      THALAMUS: new Map()
    };

    // Fragment templates (pre-defined specializations)
    this.fragmentTemplates = this._defineFragmentTemplates();

    // NEW: Genesis tracking (for autonomous creation)
    this.pendingGenesis = new Map(); // topic_hash -> { count, examples: [], timestamp }

    // Performance tracking
    this.stats = {
      totalFragments: 0,
      activeFragments: 0,
      fragmentQueries: 0,
      fragmentHits: 0,
      fragmentMisses: 0,
      avgFragmentConfidence: 0.0,
      genesisEvents: 0,
      mitosisEvents: 0,
      optimizations: 0
    };

    // Configuration
    this.config = {
      maxFragmentsPerPillar: opts.maxFragmentsPerPillar || 20,
      fragmentActivationThreshold: opts.fragmentActivationThreshold || 3, // Queries before fragment activates
      fragmentExpirationDays: opts.fragmentExpirationDays || 30, // Unused fragments expire
      minFragmentConfidence: opts.minFragmentConfidence || 0.7,
      genesisThreshold: 3, // Misses required to spawn new fragment
      mitosisThreshold: 50, // Queries required to consider splitting
      optimizationThreshold: 20 // Queries required to consider prompt tuning
    };

    // Vocabulary for procedural generation
    this.VOCAB = {
        ADJECTIVES: ['Silent', 'Recursive', 'Dormant', 'Volatile', 'Absolute', 'Kinetic', 'Luminous', 'Dark', 'Prime', 'Hyper', 'Quantum', 'Neural', 'Cognitive', 'Static', 'Fluid', 'Fractal', 'Ephemeral', 'Eternal', 'Broken', 'Shattered', 'Unified', 'Complex', 'Simple', 'Abstract', 'Concrete', 'Spectral', 'Holographic', 'Void', 'Solar', 'Lunar'],
        NOUNS: ['Protocol', 'Heuristic', 'Axiom', 'Synapse', 'Vector', 'Paradox', 'Entropy', 'Cipher', 'Nexus', 'Echo', 'Horizon', 'Vortex', 'Matrix', 'Cluster', 'Shard', 'Resonance', 'Gradient', 'Flux', 'Anchor', 'Beacon', 'Variable', 'Constant', 'Dream', 'Nightmare', 'Vision', 'Strategy', 'Tactic', 'Logic', 'Proof', 'Theorem', 'Signal', 'Noise', 'Core', 'Shell'],
        GREEK: ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Omega', 'Sigma', 'Theta', 'Omicron', 'Psi', 'Chi']
    };

    console.log(`[${this.name}] Initialized - ready to spawn domain fragments`);
  }

  /**
   * Initialize fragment registry
   */
  async initialize() {
    console.log(`[${this.name}] 🧩 Initializing Fragment Registry...`);

    // Try to load fragments from disk first
    const loaded = await this.loadFragments();

    // If few fragments loaded, spawn initial set + procedural seed
    if (loaded.count < 10) {
      console.log(`[${this.name}]    Low fragment count (${loaded.count}), seeding initial set...`);
      await this.spawnInitialFragments();
      await this.seedProceduralFragments(120); // Generate 120 procedural fragments
    } else {
      console.log(`[${this.name}]    📂 Restored ${loaded.count} fragments from disk`);
    }

    // Enable periodic auto-save (every 5 minutes)
    this._saveInterval = setInterval(async () => {
      await this.saveFragments();
    }, 300000); // 5 minutes

    // Enable periodic evolution check (every 10 minutes)
    this._evolutionInterval = setInterval(async () => {
      await this.checkAllFragmentsForEvolution();
    }, 600000);

    console.log(`[${this.name}] ✅ Fragment Registry ready`);
    return true;
  }

  /**
   * Lifecycle Hook: Register fragments as Virtual Arbiters
   */
  async onInitialize() {
    if (!this.messageBroker) return;

    console.log(`[${this.name}] 🧠 Indexing fragments into Neural Lobe...`);
    
    // Register self
    this.messageBroker.registerArbiter(this.name, {
        lobe: 'KNOWLEDGE',
        classification: 'REGISTRY',
        tags: ['fragments', 'domains', 'micro-brains']
    });

    // Register active fragments as Virtual Arbiters
    for (const [id, fragment] of this.fragments) {
        if (!fragment.active) continue;
        
        const name = `Fragment_${fragment.domain}_${fragment.specialization}`;
        this.messageBroker.registerArbiter(name, {
            lobe: 'KNOWLEDGE',
            classification: 'FRAGMENT',
            tags: fragment.keywords,
            instance: {
                handleMessage: async (msg) => {
                    // Virtual Arbiter Handler: Route directly to fragment logic
                    // This allows "sendMessage('Fragment_medical_diagnostics', ...)" to work!
                    return await this.routeToFragment(msg.payload.query, fragment.pillar);
                }
            }
        });
    }
    
    console.log(`[${this.name}] 🧠 Indexed ${this.stats.activeFragments} fragments as Virtual Arbiters.`);
  }

  /**
   * Seed procedural fragments to populate the graph
   */
  async seedProceduralFragments(count) {
    const pillars = ['LOGOS', 'AURORA', 'PROMETHEUS', 'THALAMUS'];
    const specializations = ['analysis', 'synthesis', 'pattern_recognition', 'heuristic', 'memory_shard', 'protocol'];
    
    console.log(`[${this.name}] 🌱 Seeding ${count} procedural fragments...`);

    for (let i = 0; i < count; i++) {
        // Generate Label
        const adj = this.VOCAB.ADJECTIVES[Math.floor(Math.random() * this.VOCAB.ADJECTIVES.length)];
        const noun = this.VOCAB.NOUNS[Math.floor(Math.random() * this.VOCAB.NOUNS.length)];
        const suffix = Math.random() > 0.85 ? ` ${this.VOCAB.GREEK[Math.floor(Math.random() * this.VOCAB.GREEK.length)]}` : (Math.random() > 0.75 ? `-${Math.floor(Math.random() * 99)}` : '');
        const label = `${adj} ${noun}${suffix}`;

        const pillar = pillars[Math.floor(Math.random() * pillars.length)];
        
        // Create template-like object
        const template = {
            pillar,
            domain: 'procedural',
            specialization: specializations[Math.floor(Math.random() * specializations.length)],
            keywords: [noun.toLowerCase(), adj.toLowerCase()],
            systemPrompt: `You are a specialized fragment named ${label}. Focus on ${noun} patterns within the ${pillar} domain.`,
            temperature: 0.5 + (Math.random() * 0.4),
            generated: true
        };

        const fragmentId = `seed_${pillar}_${Date.now()}_${i}`;
        
        const fragment = {
            id: fragmentId,
            templateId: 'procedural_seed',
            pillar: template.pillar,
            domain: template.domain,
            specialization: template.specialization,
            keywords: template.keywords,
            systemPrompt: template.systemPrompt,
            temperature: template.temperature,
            parentFragmentId: null,
            
            // Randomize stats for visual variety
            stats: {
                queriesHandled: Math.floor(Math.random() * 50),
                avgConfidence: 0.5 + (Math.random() * 0.4),
                successRate: 0.7 + (Math.random() * 0.3),
                totalReward: 0,
                createdAt: Date.now(),
                lastUsed: Date.now() - Math.floor(Math.random() * 86400000),
                activationCount: Math.floor(Math.random() * 20)
            },
            
            expertiseLevel: 0.1 + (Math.random() * 0.8), // Random expertise
            knowledgeBase: new Map(),
            active: true,
            spawned: true,
            label // Store the fancy label
        };

        // Register
        this.fragments.set(fragmentId, fragment);
        if (!this.pillarFragments[pillar]) {
            this.pillarFragments[pillar] = new Map();
        }
        this.pillarFragments[pillar].set(fragmentId, fragment);
        this.stats.totalFragments++;
        this.stats.activeFragments++;
    }
    
    // Save immediately to persist seed
    await this.saveFragments();
  }

  /**
   * Define pre-configured fragment templates
   */
  _defineFragmentTemplates() {
    const templates = new Map();

    // LOGOS fragments (Analytical)
    templates.set('medical_diagnostics', {
      pillar: 'LOGOS',
      domain: 'medical',
      specialization: 'diagnostics',
      keywords: ['symptom', 'diagnosis', 'disease', 'medical', 'patient', 'treatment', 'healthcare'],
      systemPrompt: 'You are a medical diagnostics specialist. Analyze symptoms, suggest diagnoses, and recommend evidence-based treatments.',
      temperature: 0.2,
      priority: 'high'
    });

    templates.set('legal_analysis', {
      pillar: 'LOGOS',
      domain: 'legal',
      specialization: 'analysis',
      keywords: ['law', 'legal', 'contract', 'regulation', 'compliance', 'court', 'attorney'],
      systemPrompt: 'You are a legal analysis expert. Interpret laws, analyze contracts, and provide compliance guidance.',
      temperature: 0.1,
      priority: 'medium'
    });

    templates.set('code_analysis', {
      pillar: 'LOGOS',
      domain: 'software',
      specialization: 'code_analysis',
      keywords: ['code', 'bug', 'debug', 'algorithm', 'optimize', 'refactor', 'function'],
      systemPrompt: 'You are a code analysis specialist. Debug issues, optimize algorithms, and suggest improvements.',
      temperature: 0.2,
      priority: 'high'
    });

    // AURORA fragments (Creative)
    templates.set('story_writing', {
      pillar: 'AURORA',
      domain: 'creative_writing',
      specialization: 'storytelling',
      keywords: ['story', 'narrative', 'character', 'plot', 'fiction', 'novel', 'tale'],
      systemPrompt: 'You are a creative storytelling expert. Craft engaging narratives, develop characters, and build compelling plots.',
      temperature: 0.9,
      priority: 'medium'
    });

    templates.set('art_generation', {
      pillar: 'AURORA',
      domain: 'visual_arts',
      specialization: 'art_concepts',
      keywords: ['art', 'design', 'visual', 'aesthetic', 'composition', 'color', 'style'],
      systemPrompt: 'You are a visual arts expert. Generate art concepts, suggest designs, and provide aesthetic guidance.',
      temperature: 0.85,
      priority: 'low'
    });

    // PROMETHEUS fragments (Strategic)
    templates.set('business_planning', {
      pillar: 'PROMETHEUS',
      domain: 'business',
      specialization: 'planning',
      keywords: ['business', 'strategy', 'market', 'revenue', 'growth', 'company', 'startup'],
      systemPrompt: 'You are a business strategy expert. Develop business plans, analyze markets, and forecast growth.',
      temperature: 0.3,
      priority: 'high'
    });

    templates.set('project_management', {
      pillar: 'PROMETHEUS',
      domain: 'project_management',
      specialization: 'planning',
      keywords: ['project', 'timeline', 'milestone', 'task', 'resource', 'schedule', 'deadline'],
      systemPrompt: 'You are a project management specialist. Plan projects, allocate resources, and optimize timelines.',
      temperature: 0.25,
      priority: 'medium'
    });

    // THALAMUS fragments (Safety)
    templates.set('content_moderation', {
      pillar: 'THALAMUS',
      domain: 'safety',
      specialization: 'content_moderation',
      keywords: ['moderate', 'filter', 'inappropriate', 'harmful', 'offensive', 'toxic'],
      systemPrompt: 'You are a content moderation specialist. Detect harmful content, assess safety risks, and recommend moderation actions.',
      temperature: 0.0,
      priority: 'critical'
    });

    return templates;
  }

  /**
   * Spawn initial high-priority fragments
   */
  async spawnInitialFragments() {
    const highPriority = Array.from(this.fragmentTemplates.entries())
      .filter(([id, template]) => template.priority === 'high' || template.priority === 'critical');

    for (const [templateId, template] of highPriority) {
      await this.spawnFragment(templateId, template);
    }
  }

  /**
   * Spawn a new domain fragment
   */
  async spawnFragment(templateId, template) {
    const fragmentId = `${template.pillar}_${templateId}_${Date.now()}`;

    const fragment = {
      id: fragmentId,
      templateId,
      pillar: template.pillar,
      domain: template.domain,
      specialization: template.specialization,
      keywords: template.keywords,
      systemPrompt: template.systemPrompt,
      temperature: template.temperature,
      parentFragmentId: template.parentId || null, // For recursive fractal structure

      // Performance tracking
      stats: {
        queriesHandled: 0,
        avgConfidence: 0.0,
        successRate: 0.0,
        totalReward: 0.0,
        createdAt: Date.now(),
        lastUsed: Date.now(),
        activationCount: 0
      },

      // Learning data
      expertiseLevel: 0.0, // 0.0 - 1.0
      knowledgeBase: new Map(), // domain-specific learned facts

      // State
      active: true,
      spawned: true
    };

    // Register fragment
    this.fragments.set(fragmentId, fragment);
    
    if (!this.pillarFragments[template.pillar]) {
        this.pillarFragments[template.pillar] = new Map();
    }
    this.pillarFragments[template.pillar].set(fragmentId, fragment);
    
    this.stats.totalFragments++;
    this.stats.activeFragments++;

    console.log(`[${this.name}] 🧩 Spawned fragment: ${templateId} (${template.pillar})`);
    this.emit('fragment:spawned', { fragmentId, template });

    return fragment;
  }

  /**
   * Route query to appropriate fragment
   * Returns best matching fragment or null if none match well
   */
  async routeToFragment(query, pillar, context = {}) {
    this.stats.fragmentQueries++;

    // Get all fragments for this pillar
    const pillarFragmentMap = this.pillarFragments[pillar];
    if (!pillarFragmentMap || pillarFragmentMap.size === 0) {
      // If no fragments, consider genesis
      await this.trackForGenesis(query, pillar);
      return null;
    }

    // Score each fragment
    const scores = [];
    for (const [fragmentId, fragment] of pillarFragmentMap) {
      if (!fragment.active) continue;

      const score = this.scoreFragmentMatch(query, fragment);
      if (score > this.config.minFragmentConfidence) {
        scores.push({ fragmentId, fragment, score });
      }
    }

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    if (scores.length === 0) {
      this.stats.fragmentMisses++;
      // NEW: Track for potential genesis since no fragment matched
      await this.trackForGenesis(query, pillar);
      return null; // No good fragment match
    }

    // Return best fragment
    const best = scores[0];
    this.stats.fragmentHits++;

    // Update fragment stats
    best.fragment.stats.lastUsed = Date.now();
    best.fragment.stats.activationCount++;

    this.emit('fragment:routed', {
      query,
      pillar,
      fragmentId: best.fragmentId,
      score: best.score
    });

    return {
      fragment: best.fragment,
      confidence: best.score,
      alternatives: scores.slice(1, 3) // Top 2 alternatives
    };
  }

  /**
   * Score how well a fragment matches a query
   */
  scoreFragmentMatch(query, fragment) {
    let score = 0.0;
    // Extract string from query (might be object or string)
    const queryStr = typeof query === 'string' ? query : ((query && query.query) || (query && query.text) || String(query));
    const queryLower = queryStr.toLowerCase();

    // Keyword matching
    const matchedKeywords = fragment.keywords.filter(kw =>
      queryLower.includes(kw.toLowerCase())
    );
    score += (matchedKeywords.length / fragment.keywords.length) * 0.6;

    // Expertise boost (fragments get better over time)
    score += fragment.expertiseLevel * 0.2;

    // Recency boost (recently used fragments are more likely to be relevant)
    const timeSinceUse = Date.now() - fragment.stats.lastUsed;
    const recencyBoost = Math.max(0, 1 - (timeSinceUse / (24 * 60 * 60 * 1000))); // 24hr decay
    score += recencyBoost * 0.1;

    // Success rate boost
    score += fragment.stats.successRate * 0.1;

    return Math.min(1.0, score);
  }

  /**
   * Record fragment usage and outcome
   */
  async recordFragmentOutcome(fragmentId, outcome) {
    const fragment = this.fragments.get(fragmentId);
    if (!fragment) return;

    fragment.stats.queriesHandled++;

    // Update confidence
    const alpha = 0.1; // Learning rate
    fragment.stats.avgConfidence =
      fragment.stats.avgConfidence * (1 - alpha) + outcome.confidence * alpha;

    // Update success rate
    if (outcome.success !== undefined) {
      fragment.stats.successRate =
        fragment.stats.successRate * (1 - alpha) + (outcome.success ? 1.0 : 0.0) * alpha;
    }

    // Update reward
    if (outcome.reward !== undefined) {
      fragment.stats.totalReward += outcome.reward;
    }

    // Increase expertise (caps at 1.0)
    fragment.expertiseLevel = Math.min(1.0,
      fragment.expertiseLevel + (outcome.success ? 0.01 : -0.005)
    );

    // Log to learning pipeline
    if (this.learningPipeline) {
      await this.learningPipeline.logInteraction({
        type: 'fragment_usage',
        agent: this.name,
        input: { fragmentId, query: outcome.query },
        output: outcome.response,
        context: { pillar: fragment.pillar, domain: fragment.domain },
        metadata: {
          success: outcome.success,
          confidence: outcome.confidence,
          expertiseLevel: fragment.expertiseLevel
        }
      });
    }

    // Trigger auto-save (debounced)
    await this._autoSave();
  }

  /**
   * Auto-spawn fragment if query pattern emerges
   */
  async considerAutoSpawn(query, pillar) {
    // 1. Check existing templates first (Standard logic)
    for (const [templateId, template] of this.fragmentTemplates) {
      if (template.pillar !== pillar) continue;

      const exists = Array.from(this.fragments.values()).some(
        f => f.templateId === templateId && f.active
      );
      if (exists) continue;

      const queryLower = query.toLowerCase();
      const matchCount = template.keywords.filter(kw =>
        queryLower.includes(kw.toLowerCase())
      ).length;

      if (matchCount >= 2) {
        console.log(`[${this.name}] 🌱 Auto-spawning template fragment: ${templateId}`);
        await this.spawnFragment(templateId, template);
        return true;
      }
    }

    // 2. NEW: Autonomous Genesis (No Template Rule)
    // If no template matched, track for genesis
    await this.trackForGenesis(query, pillar);
    return false;
  }

  /**
   * Track unmatched queries for potential autonomous creation
   */
  async trackForGenesis(query, pillar) {
    // Simple topic clustering (hash of first few significant words)
    const words = typeof query === 'string' ? query : String(query);
    
    // Clean query to remove non-alphanumeric characters
    const cleanQuery = words.toLowerCase().replace(new RegExp('[^\w\s]', 'g'), '');
    const topicKey = cleanQuery.split(new RegExp('\s+'))
        .filter(w => w.length > 4)
        .slice(0, 3)
        .sort()
        .join('_');

    if (!topicKey) return;

    const key = `${pillar}:${topicKey}`;
    
    if (!this.pendingGenesis.has(key)) {
      this.pendingGenesis.set(key, { count: 0, examples: [], pillar, timestamp: Date.now() });
    }

    const entry = this.pendingGenesis.get(key);
    entry.count++;
    entry.examples.push(words);
    
    // Prune old examples
    if (entry.examples.length > 5) entry.examples.shift();

    // Trigger genesis if threshold reached
    if (entry.count >= this.config.genesisThreshold) {
      this.pendingGenesis.delete(key); // Clear tracking
      await this.performGenesis(pillar, entry.examples);
    }
  }

  /**
   * Autonomous Genesis: Invent a new fragment using QuadBrain
   */
  async performGenesis(pillar, examples) {
    if (!this.quadBrain) return;
    console.log(`[${this.name}] 🧬 Initiating Autonomous Genesis for ${pillar}...`);

    try {
      // 1. Ask PROMETHEUS to design the fragment structure
      const designPrompt = `Analyze these user queries and design a specialized cognitive fragment (micro-brain) to handle them.
      
      QUERIES:
      ${examples.map(e => `- "${e}"`).join('\n')}
      
      PARENT PILLAR: ${pillar}
      
      OUTPUT JSON ONLY:
      {
        "domain": "short_domain_name",
        "specialization": "specific_role",
        "keywords": ["5-10", "keywords"],
        "description": "what this fragment does",
        "temperature": 0.1-1.0
      }`;

      const designRes = await this.quadBrain.callBrain('PROMETHEUS', designPrompt, {}, 'full');
      let design;
      try {
        design = JSON.parse(designRes.text.replace(/```json/g, '').replace(/```/g, '').trim());
      } catch (e) {
        console.error("Failed to parse Genesis design:", e);
        return;
      }

      // 2. Ask AURORA to write the System Prompt
      const promptPrompt = `Write a system prompt for a new AI persona.
      
      ROLE: ${design.specialization} (${design.domain})
      DESCRIPTION: ${design.description}
      PARENT BRAIN: ${pillar}
      
      The prompt should define the persona's core identity, output style, and constraints.
      Output ONLY the raw system prompt text.`;

      const promptRes = await this.quadBrain.callBrain('AURORA', promptPrompt, {}, 'full');
      const systemPrompt = promptRes.text.trim();

      // 3. Register the new fragment (Self-Evolution)
      const templateId = `genesis_${design.domain}_${Date.now()}`;
      const template = {
        pillar,
        domain: design.domain,
        specialization: design.specialization,
        keywords: design.keywords,
        systemPrompt,
        temperature: design.temperature || 0.5,
        priority: 'dynamic',
        generated: true
      };

      // Save template for future
      this.fragmentTemplates.set(templateId, template);
      
      // Spawn it immediately
      await this.spawnFragment(templateId, template);
      this.stats.genesisEvents++;
      console.log(`[${this.name}] 🧬 GENESIS COMPLETE: Created ${design.domain}/${design.specialization}`);

    } catch (err) {
      console.error(`[${this.name}] Genesis failed:`, err);
    }
  }

  /**
   * Monitor fragments for evolution (Mitosis or Neuroplasticity)
   */
  async checkAllFragmentsForEvolution() {
    console.log(`[${this.name}] 🔄 Checking fragments for evolution...`);
    
    for (const fragment of this.fragments.values()) {
      if (!fragment.active) continue;

      // 1. Check for Mitosis (Cell Division)
      // If fragment is very busy and has generic confidence, it might be too broad.
      if (fragment.stats.queriesHandled > this.config.mitosisThreshold && fragment.expertiseLevel > 0.6) {
        await this._triggerMitosis(fragment);
      }

      // 2. Check for Neuroplasticity (Prompt Optimization)
      // If fragment is moderately busy but success rate is stagnant, try to improve prompt.
      if (fragment.stats.queriesHandled > this.config.optimizationThreshold && 
          fragment.stats.successRate < 0.8 && 
          Date.now() - (fragment.lastOptimization || 0) > 86400000) { // Max once per day
        await this._optimizePrompt(fragment);
      }
    }
  }

  /**
   * Call the local SOMA-T1 model for background tasks.
   * Keeps Gemini free for user-facing chat.
   */
  async _callLocalModel(prompt, maxTokens = 512) {
    const res = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'soma-v2:latest',
        prompt,
        stream: false,
        options: { temperature: 0.7, num_predict: maxTokens }
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!res.ok) throw new Error(`Ollama ${res.status}`);
    const data = await res.json();
    return { text: data.response || '' };
  }

  /**
   * Mitosis: Split a broad fragment into specialized sub-fragments
   */
  async _triggerMitosis(fragment) {
    if (!this.quadBrain) return;
    console.log(`[${this.name}] ➗ Mitosis candidate: ${fragment.id}`);

    // Ask LOGOS if splitting is viable
    const analysisPrompt = `Analyze if this cognitive fragment is too broad and should be split into sub-specialties.
    
    CURRENT FRAGMENT: ${fragment.domain} / ${fragment.specialization}
    PROMPT: ${fragment.systemPrompt.slice(0, 200)}...
    
    Should it split? Output JSON:
    {
      "should_split": true/false,
      "reason": "why",
      "sub_fragments": [
        { "name": "sub1", "focus": "..." },
        { "name": "sub2", "focus": "..." }
      ]
    }`;

    try {
        // Skip if a user chat is in progress — don't compete with Gemini
        if (global.__SOMA_CHAT_ACTIVE) {
          console.log(`[${this.name}] ⏸ Mitosis deferred — chat in progress`);
          return;
        }
        // Use local SOMA-T1 model for background fragment analysis
        const res = await this._callLocalModel(analysisPrompt, 512);
        const decision = JSON.parse(res.text.replace(/```json/g, '').replace(/```/g, '').trim());

        if (decision.should_split && decision.sub_fragments.length >= 2) {
            console.log(`[${this.name}] ➗ Executing Mitosis for ${fragment.id} -> ${decision.sub_fragments.map(s => s.name).join(', ')}`);
            
            // Create sub-fragments
            for (const sub of decision.sub_fragments) {
                await this.performGenesis(fragment.pillar, [`${sub.name} related query`, `help with ${sub.focus}`]);
            }
            
            // Update stats
            this.stats.mitosisEvents++;
            
            // Optionally deprecate parent or keep as router (keeping as router is safer for now)
            // Reset parent stats to delay next check
            fragment.stats.queriesHandled = 0; 
        }
    } catch (e) {
        console.error("Mitosis failed:", e);
    }
  }

  /**
   * Neuroplasticity: Self-optimize system prompt
   */
  async _optimizePrompt(fragment) {
    if (!this.quadBrain) return;
    console.log(`[${this.name}] 🧠 Optimizing prompt for ${fragment.id}`);

    const optimizePrompt = `Optimize this system prompt to be more effective.
    
    CURRENT PROMPT:
    ${fragment.systemPrompt}
    
    GOAL: Improve clarity, expertise tone, and instruction following.
    OUTPUT: The new raw system prompt text only.`;

    try {
        // Skip if a user chat is in progress — don't compete with Gemini
        if (global.__SOMA_CHAT_ACTIVE) {
          console.log(`[${this.name}] ⏸ Prompt optimization deferred — chat in progress`);
          return;
        }
        // Use local SOMA-T1 model for background prompt optimization
        const res = await this._callLocalModel(optimizePrompt, 512);
        const newPrompt = res.text.trim();
        
        if (newPrompt.length > 50) {
            fragment.systemPrompt = newPrompt;
            fragment.lastOptimization = Date.now();
            this.stats.optimizations++;
            console.log(`[${this.name}] 🧠 Prompt optimized successfully`);
        }
    } catch (e) {
        console.error("Prompt optimization failed:", e);
    }
  }

  /**
   * Save all fragments to disk
   */
  async saveFragments() {
    const fs = await import('fs/promises');
    const path = await import('path');

    let fragmentsDir = path.join(process.cwd(), '.soma', 'fragments');
    try {
        await fs.access(fragmentsDir);
    } catch {
        const parentDir = path.join(process.cwd(), '..', '.soma', 'fragments');
        try {
            await fs.access(parentDir);
            fragmentsDir = parentDir;
        } catch {
            // If neither exists, we'll create in CWD below
        }
    }

    // Ensure directory exists
    try {
      await fs.mkdir(fragmentsDir, { recursive: true });
    } catch (error) {
      console.error(`[${this.name}] ❌ Failed to create fragments directory: ${error.message}`);
      return { success: false, error: error.message };
    }

    // Save each fragment
    const saved = [];
    for (const [fragmentId, fragment] of this.fragments) {
      try {
        const serialized = this._serializeFragment(fragment);
        const filename = `${fragmentId}.json`;
        const filepath = path.join(fragmentsDir, filename);

        await fs.writeFile(filepath, JSON.stringify(serialized, null, 2));
        saved.push(fragmentId);
      } catch (error) {
        console.error(`[${this.name}] ⚠️  Failed to save fragment ${fragmentId}: ${error.message}`);
      }
    }

    console.log(`[${this.name}] 💾 Saved ${saved.length} fragments to disk`);
    return { success: true, count: saved.length, fragments: saved };
  }

  /**
   * Load fragments from disk
   */
  async loadFragments() {
    const fs = await import('fs/promises');
    const path = await import('path');

    // DEBUG: Check paths with fallback
    let fragmentsDir = path.join(process.cwd(), '.soma', 'fragments');
    try {
        await fs.access(fragmentsDir);
    } catch {
        const parentDir = path.join(process.cwd(), '..', '.soma', 'fragments');
        try {
            await fs.access(parentDir);
            fragmentsDir = parentDir;
            console.log(`[${this.name}]    Found fragments in parent directory: ${fragmentsDir}`);
        } catch {
            console.log(`[${this.name}]    Could not find fragments dir in CWD or Parent. Defaulting to CWD: ${fragmentsDir}`);
        }
    }
    
    console.log(`[${this.name}] 📂 Loading fragments from: ${fragmentsDir}`);

    try {
      const files = await fs.readdir(fragmentsDir);
      console.log(`[${this.name}]    Found ${files.length} files in directory.`);
      
      const fragmentFiles = files.filter(f => f.endsWith('.json'));
      console.log(`[${this.name}]    Found ${fragmentFiles.length} JSON fragment files.`);

      const loaded = [];
      const recovered = [];
      const corrupted = [];
      
      for (const file of fragmentFiles) {
        try {
          const filepath = path.join(fragmentsDir, file);
          const content = await fs.readFile(filepath, 'utf8');
          
          // Validate JSON before parsing
          if (!content || content.trim().length === 0) {
            throw new Error('Empty file');
          }
          
          const data = JSON.parse(content);

          const fragment = this._deserializeFragment(data);

          // Register fragment
          this.fragments.set(fragment.id, fragment);
          if (!this.pillarFragments[fragment.pillar]) {
              this.pillarFragments[fragment.pillar] = new Map();
          }
          this.pillarFragments[fragment.pillar].set(fragment.id, fragment);

          if (fragment.active) {
            this.stats.activeFragments++;
          }
          this.stats.totalFragments++;

          loaded.push(fragment.id);
        } catch (error) {
          // Try to recover from template if it's a known template
          const templateMatch = file.match(/^(\w+)_(\w+)_(\d+)\.json$/);
          if (templateMatch) {
            const [, pillar, templateId, timestamp] = templateMatch;
            const template = this.fragmentTemplates.get(templateId);
            
            if (template) {
              console.log(`[${this.name}] 🔧 Recovering corrupted fragment ${file} from template...`);
              try {
                // Recreate from template
                const fragmentId = `${pillar}_${templateId}_${timestamp}`;
                const recoveredFragment = {
                  id: fragmentId,
                  templateId,
                  pillar: template.pillar,
                  domain: template.domain,
                  specialization: template.specialization,
                  keywords: template.keywords,
                  systemPrompt: template.systemPrompt,
                  temperature: template.temperature,
                  stats: {
                    queriesHandled: 0,
                    avgConfidence: 0.0,
                    successRate: 0.0,
                    totalReward: 0.0,
                    createdAt: parseInt(timestamp),
                    lastUsed: parseInt(timestamp),
                    activationCount: 0
                  },
                  expertiseLevel: 0.0,
                  knowledgeBase: new Map(),
                  active: true,
                  spawned: true,
                  parentFragmentId: null,
                  lastOptimization: null
                };
                
                // Save recovered fragment
                const filepath = path.join(fragmentsDir, file);
                const serialized = this._serializeFragment(recoveredFragment);
                await fs.writeFile(filepath, JSON.stringify(serialized, null, 2));
                
                // Register it
                this.fragments.set(recoveredFragment.id, recoveredFragment);
                if (!this.pillarFragments[recoveredFragment.pillar]) {
                  this.pillarFragments[recoveredFragment.pillar] = new Map();
                }
                this.pillarFragments[recoveredFragment.pillar].set(recoveredFragment.id, recoveredFragment);
                
                if (recoveredFragment.active) {
                  this.stats.activeFragments++;
                }
                this.stats.totalFragments++;
                
                recovered.push(file);
                console.log(`[${this.name}] ✅ Recovered ${file} successfully`);
                continue;
              } catch (recoverError) {
                console.warn(`[${this.name}] ⚠️  Failed to recover ${file}: ${recoverError.message}`);
              }
            }
          }
          
          // If recovery failed or not possible, move to .corrupted
          console.warn(`[${this.name}] ⚠️  Cannot recover ${file}, moving to .corrupted: ${error.message}`);
          corrupted.push(file);
          try {
            const corruptedDir = path.join(fragmentsDir, '.corrupted');
            await fs.mkdir(corruptedDir, { recursive: true });
            const filepath = path.join(fragmentsDir, file);
            const corruptedPath = path.join(corruptedDir, file);
            await fs.rename(filepath, corruptedPath);
          } catch (moveError) {
            // If move fails, just delete the corrupted file
            try {
              await fs.unlink(path.join(fragmentsDir, file));
            } catch {}
          }
        }
      }

      if (loaded.length > 0) {
        console.log(`[${this.name}] 📂 Loaded ${loaded.length} fragments from disk`);
      }
      
      if (recovered.length > 0) {
        console.log(`[${this.name}] 🔧 Recovered ${recovered.length} fragment(s) from templates`);
      }
      
      if (corrupted.length > 0) {
        console.log(`[${this.name}] 🗑️  Moved ${corrupted.length} unrecoverable fragment(s) to .corrupted/`);
      }

      return { 
        success: true, 
        count: loaded.length + recovered.length, 
        fragments: loaded, 
        recovered: recovered.length,
        corrupted: corrupted.length 
      };
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Directory doesn't exist yet - that's okay
        return { success: true, count: 0, fragments: [] };
      }
      console.error(`[${this.name}] ❌ Failed to load fragments: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Serialize fragment for JSON storage
   */
  _serializeFragment(fragment) {
    return {
      id: fragment.id,
      templateId: fragment.templateId,
      label: fragment.label, // Save label
      pillar: fragment.pillar,
      domain: fragment.domain,
      specialization: fragment.specialization,
      keywords: fragment.keywords,
      systemPrompt: fragment.systemPrompt,
      temperature: fragment.temperature,
      stats: fragment.stats,
      expertiseLevel: fragment.expertiseLevel,
      knowledgeBase: Array.from(fragment.knowledgeBase.entries()), // Convert Map to array
      active: fragment.active,
      spawned: fragment.spawned,
      parentFragmentId: fragment.parentFragmentId,
      lastOptimization: fragment.lastOptimization
    };
  }

  /**
   * Deserialize fragment from JSON
   */
  _deserializeFragment(data) {
    return {
      id: data.id,
      templateId: data.templateId,
      label: data.label || this._formatLabel(data.specialization, data.domain),
      pillar: data.pillar,
      domain: data.domain,
      specialization: data.specialization,
      keywords: data.keywords,
      systemPrompt: data.systemPrompt,
      temperature: data.temperature,
      stats: data.stats,
      expertiseLevel: data.expertiseLevel,
      knowledgeBase: new Map(data.knowledgeBase || []), // Convert array back to Map
      active: data.active,
      spawned: data.spawned,
      parentFragmentId: data.parentFragmentId,
      lastOptimization: data.lastOptimization
    };
  }

  /**
   * Helper to format a label from specialization/domain
   */
  _formatLabel(specialization, domain) {
      if (!specialization) return 'Unnamed Fragment';
      const spec = specialization.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
      return domain ? `${spec} (${domain})` : spec;
  }

  /**
   * Auto-save fragments after updates
   */
  async _autoSave() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }

    // Debounce saves to every 30 seconds
    this._saveTimeout = setTimeout(async () => {
      await this.saveFragments();
    }, 30000);
  }

  /**
   * Get fragment statistics
   */
  getStats() {
    return {
      ...this.stats,
      fragmentsByPillar: {
        LOGOS: this.pillarFragments.LOGOS.size,
        AURORA: this.pillarFragments.AURORA.size,
        PROMETHEUS: this.pillarFragments.PROMETHEUS.size,
        THALAMUS: this.pillarFragments.THALAMUS.size
      },
      hitRate: this.stats.fragmentQueries > 0
        ? (this.stats.fragmentHits / this.stats.fragmentQueries) * 100
        : 0
    };
  }

  /**
   * List all active fragments
   */
  listFragments(pillar = null) {
    if (pillar) {
      return Array.from(this.pillarFragments[pillar].values())
        .filter(f => f.active)
        .map(f => ({
          id: f.id,
          label: f.label,
          domain: f.domain,
          specialization: f.specialization,
          expertiseLevel: f.expertiseLevel,
          queriesHandled: f.stats.queriesHandled
        }));
    }

    return Array.from(this.fragments.values())
      .filter(f => f.active)
      .map(f => ({
        id: f.id,
        label: f.label,
        pillar: f.pillar,
        domain: f.domain,
        specialization: f.specialization,
        expertiseLevel: f.expertiseLevel,
        queriesHandled: f.stats.queriesHandled
      }));
  }

  /**
   * Shutdown - save fragments before exit
   */
  async shutdown() {
    console.log(`[${this.name}] 🛑 Shutting down...`);

    // Clear intervals
    if (this._saveInterval) {
      clearInterval(this._saveInterval);
    }
    if (this._evolutionInterval) {
        clearInterval(this._evolutionInterval);
    }
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }

    // Final save
    await this.saveFragments();

    console.log(`[${this.name}] ✅ Shutdown complete`);
    return { success: true };
  }
}

export default FragmentRegistry;
