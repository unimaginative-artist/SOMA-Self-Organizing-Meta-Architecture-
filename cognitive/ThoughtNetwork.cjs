/**
 * ThoughtNetwork.cjs
 * 
 * Manages the entire Fractal Thought Network.
 * Handles node creation, connections, queries, and growth.
 */

const { FractalNode } = require('./FractalNode.cjs');
const fs = require('fs').promises;
const path = require('path');

class ThoughtNetwork {
    constructor(config = {}) {
        this.name = config.name || 'ThoughtNetwork';
        this.nodes = new Map(); // id -> FractalNode
        this.roots = new Set(); // Top-level concepts (no parents)
        this.savePath = config.savePath || path.join(process.cwd(), 'SOMA', 'thought-network.json');
        
        // Integration with existing SOMA systems
        this.mnemonicArbiter = config.mnemonicArbiter || null; // Memory storage
        this.archivistArbiter = config.archivistArbiter || null; // Long-term archiving
        
        // Network stats
        this.stats = {
            totalNodes: 0,
            totalConnections: 0,
            averageDepth: 0,
            lastGrowth: Date.now(),
            growthRate: 0
        };

        this.autonomousSynthesisTimer = null;  // Timer cleanup
        this.brain = null; // Reference to QuadBrain/TriBrain

        console.log(`[${this.name}] Initialized (integrated with ${this.mnemonicArbiter ? 'MnemonicArbiter' : 'standalone'})`);
    }

    /**
     * Inject brain for semantic reasoning
     */
    setBrain(brain) {
        this.brain = brain;
        console.log(`[${this.name}] Brain connected for semantic fractal growth`);
    }
    
    /**
     * Create a new node and add to network
     */
    createNode(content, config = {}) {
        const node = new FractalNode({
            ...config,
            content
        });
        
        this.nodes.set(node.id, node);
        
        if (!config.parent) {
            this.roots.add(node);
        }
        
        this.stats.totalNodes++;
        this.updateStats();
        
        return node;
    }
    
    /**
     * Find nodes by content similarity (simple text match for now)
     */
    findSimilar(query, threshold = 0.5, limit = 10) {
        const results = [];
        
        for (const node of this.nodes.values()) {
            const similarity = this.calculateSimilarity(query, node.content);
            if (similarity >= threshold) {
                results.push({ node, similarity });
            }
        }
        
        return results
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, limit)
            .map(r => r.node);
    }
    
    /**
     * Simple text similarity (can be replaced with embedding similarity)
     */
    calculateSimilarity(text1, text2) {
        const words1 = new Set(text1.toLowerCase().split(/\s+/));
        const words2 = new Set(text2.toLowerCase().split(/\s+/));
        
        const intersection = new Set([...words1].filter(w => words2.has(w)));
        const union = new Set([...words1, ...words2]);
        
        return intersection.size / union.size; // Jaccard similarity
    }
    
    /**
     * Ask LOGOS/Brain to find the best parent node for a new concept
     */
    async _findSemanticParent(concept) {
        if (!this.brain) return null;

        // Get candidates (roots and high-level nodes)
        const candidates = Array.from(this.roots).map(n => ({ id: n.id, content: n.content }));
        
        // If too many, just take top 20 roots
        const limitedCandidates = candidates.slice(0, 20);

        if (limitedCandidates.length === 0) return null;

        const prompt = `You are organizing a Fractal Knowledge Graph.
        
        NEW CONCEPT: "${concept}"
        
        EXISTING ROOT CONCEPTS:
        ${limitedCandidates.map((c, i) => `${i + 1}. ${c.content}`).join('\n')}
        
        TASK:
        Determine if the NEW CONCEPT is a child/sub-concept of one of the EXISTING ROOTS.
        
        OUTPUT JSON ONLY:
        {
            "isChild": true/false,
            "parentId": "exact content of parent OR null if new root",
            "reason": "short reason"
        }`;

        try {
            // Use Auto-Reasoning: Let the best brain for this concept decide its place
            // e.g. "Quantum" -> LOGOS, "Beauty" -> AURORA
            const result = await this.brain.reason({ 
                query: prompt, 
                mode: 'auto' 
            }); 
            
            // Handle response
            const text = result.response || result.text || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const decision = JSON.parse(jsonMatch[0]);
                if (decision.isChild && decision.parentId) {
                    // Find the node by content match
                    const parent = Array.from(this.roots).find(n => n.content === decision.parentId);
                    return parent || null;
                }
            }
        } catch (e) {
            console.warn(`[${this.name}] Semantic parent search failed: ${e.message}`);
        }
        
        return null; // Default to new root
    }

    /**
     * Get or create a node for a concept
     */
    async getOrCreateConcept(concept, config = {}) {
        // Try to find existing similar node
        const similar = this.findSimilar(concept, 0.8, 1);
        
        if (similar.length > 0) {
            similar[0].access(); // Mark as accessed
            return similar[0];
        }
        
        // Semantic Placement: Decide where it goes
        let parentNode = null;
        if (this.brain) {
            parentNode = await this._findSemanticParent(concept);
        }

        // Create new node
        return this.createNode(concept, {
            type: 'concept',
            parent: parentNode,
            ...config
        });
    }
    
    /**
     * Connect two concepts with a relationship
     */
    connectConcepts(concept1, concept2, relationshipType = 'related', weight = 1.0) {
        const node1 = typeof concept1 === 'string' 
            ? this.nodes.get(concept1) 
            : concept1;
        const node2 = typeof concept2 === 'string' 
            ? this.nodes.get(concept2) 
            : concept2;
            
        if (!node1 || !node2) {
            throw new Error('Both nodes must exist to create connection');
        }
        
        node1.connect(node2, weight, relationshipType);
        node2.connect(node1, weight, relationshipType); // Bidirectional
        
        this.stats.totalConnections++;
    }
    
    /**
     * Grow network from a conversation or memory
     */
    async growFromContent(content, metadata = {}) {
        console.log(`[${this.name}] Growing network from content...`);
        
        // Extract key concepts (simplified - can use NLP)
        const concepts = this.extractConcepts(content);
        
        const nodes = [];
        for (const concept of concepts) {
            const node = await this.getOrCreateConcept(concept, {
                source: metadata.source || 'conversation',
                tags: metadata.tags || []
            });
            nodes.push(node);
        }
        
        // Connect related concepts
        for (let i = 0; i < nodes.length - 1; i++) {
            this.connectConcepts(nodes[i], nodes[i + 1], 'co-occurred', 0.5);
        }
        
        this.stats.lastGrowth = Date.now();
        console.log(`[${this.name}] Added ${concepts.length} concepts`);
        
        return nodes;
    }
    
    /**
     * Start autonomous synthesis loop (The "Creative Spark")
     */
    startAutonomousSynthesis(interval = 600000) { // Every 10 minutes
        this.autonomousSynthesisTimer = setInterval(async () => {
            if (this.nodes.size < 5) return;

            // serendipity: Pick two random nodes
            const keys = Array.from(this.nodes.keys());
            const keyA = keys[Math.floor(Math.random() * keys.length)];
            const keyB = keys[Math.floor(Math.random() * keys.length)];

            if (keyA !== keyB) {
                await this.synthesize(keyA, keyB);
            }
        }, interval);
        console.log(`[${this.name}] Autonomous synthesis loop started`);
    }

    /**
     * Attempt to synthesize two concepts into a new one (Human + Horse = Minotaur)
     */
    async synthesize(nodeIdA, nodeIdB) {
        if (!this.brain) return;

        const nodeA = this.nodes.get(nodeIdA);
        const nodeB = this.nodes.get(nodeIdB);
        if (!nodeA || !nodeB) return;

        console.log(`[${this.name}] ⚗️  Attempting synthesis: ${nodeA.content} + ${nodeB.content}`);

        const prompt = `You are a Conceptual Synthesis Engine.
        
        CONCEPT A: "${nodeA.content}"
        CONCEPT B: "${nodeB.content}"
        
        TASK:
        Merge these two concepts into a NEW, creative, or higher-order concept.
        Examples:
        - Human + Horse -> Minotaur
        - Logic + Creativity -> Insight
        - Network + Compute -> Cloud
        
        If they are too unrelated to merge meaningfuly, return null.
        
        OUTPUT JSON ONLY:
        {
            "success": true/false,
            "synthesis": "Name of new concept",
            "rationale": "Why this merger makes sense",
            "type": "creative_hybrid" or "logical_inference"
        }`;

        try {
            // Use CONSENSUS to get all brains to agree on the merger
            // AURORA (Creative) + LOGOS (Logic) working together
            let result;
            if (this.brain.consensus) {
                result = await this.brain.consensus(prompt, { mode: 'synthesis' });
            } else {
                result = await this.brain.reason({ query: prompt, mode: 'creative' });
            }

            // Handle response
            const text = result.response || result.text || '';
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                const decision = JSON.parse(jsonMatch[0]);
                
                if (decision.success && decision.synthesis) {
                    // Create the new fractal
                    const newNode = await this.createNode(decision.synthesis, {
                        type: decision.type,
                        source: 'fractal_synthesis',
                        tags: ['synthesis', nodeA.content, nodeB.content]
                    });
                    
                    // Link to parents
                    this.connectConcepts(newNode, nodeA, 'synthesized_from', 0.8);
                    this.connectConcepts(newNode, nodeB, 'synthesized_from', 0.8);
                    
                    console.log(`[${this.name}] ✨ CREATED SYNTHESIS: ${decision.synthesis} (${decision.rationale})`);
                    return newNode;
                } else {
                    console.log(`[${this.name}] Synthesis rejected: Incompatible concepts`);
                }
            }
        } catch (e) {
            console.warn(`[${this.name}] Synthesis failed: ${e.message}`);
        }
    }

    /**
     * Extract concepts from text (simplified)
     */
    extractConcepts(text) {
        // Remove common words and extract meaningful terms
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
        
        const words = text.toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 3 && !stopWords.has(w));
        
        // Return unique concepts
        return [...new Set(words)];
    }
    
    /**
     * Apply decay to all nodes (periodic maintenance)
     */
    applyDecay() {
        let prunedCount = 0;
        
        for (const [id, node] of this.nodes.entries()) {
            node.applyDecay();
            
            if (node.shouldPrune()) {
                this.pruneNode(id);
                prunedCount++;
            }
        }
        
        if (prunedCount > 0) {
            console.log(`[${this.name}] Pruned ${prunedCount} weak nodes`);
            this.updateStats();
        }
    }
    
    /**
     * Remove a node from the network
     */
    pruneNode(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) return;
        
        // Remove from parent's children
        if (node.parent) {
            node.parent.removeChild(node);
        }
        
        // Remove from roots if it's a root
        this.roots.delete(node);
        
        // Remove all connections
        for (const conn of node.getConnections()) {
            conn.node.connections.delete(nodeId);
        }
        
        // Delete the node
        this.nodes.delete(nodeId);
        this.stats.totalNodes--;
    }
    
    /**
     * Update network statistics
     */
    updateStats() {
        this.stats.totalNodes = this.nodes.size;
        
        let totalConnections = 0;
        let totalDepth = 0;
        
        for (const node of this.nodes.values()) {
            totalConnections += node.connections.size;
            totalDepth += node.getDepth();
        }
        
        this.stats.totalConnections = totalConnections / 2; // Bidirectional, so divide by 2
        this.stats.averageDepth = this.nodes.size > 0 ? totalDepth / this.nodes.size : 0;
    }
    
    /**
     * Save network to disk
     */
    async save() {
        try {
            const data = {
                name: this.name,
                stats: this.stats,
                nodes: Array.from(this.nodes.values()).map(n => n.toJSON()),
                roots: Array.from(this.roots).map(n => n.id),
                savedAt: Date.now()
            };
            
            // Ensure directory exists
            await fs.mkdir(path.dirname(this.savePath), { recursive: true });
            
            await fs.writeFile(this.savePath, JSON.stringify(data, null, 2));
            console.log(`[${this.name}] Saved ${this.nodes.size} nodes to ${this.savePath}`);
        } catch (error) {
            console.error(`[${this.name}] Save failed:`, error.message);
        }
    }
    
    /**
     * Load network from disk
     */
    async load() {
        try {
            const data = JSON.parse(await fs.readFile(this.savePath, 'utf8'));
            
            // Clear existing
            this.nodes.clear();
            this.roots.clear();
            
            // Recreate nodes
            const nodeMap = new Map();
            for (const nodeData of data.nodes) {
                const node = FractalNode.fromJSON(nodeData, nodeMap);
                this.nodes.set(node.id, node);
            }
            
            // Rebuild connections and relationships
            for (const nodeData of data.nodes) {
                const node = this.nodes.get(nodeData.id);
                
                // Reconnect parent
                if (nodeData.parent) {
                    node.parent = this.nodes.get(nodeData.parent);
                }
                
                // Reconnect children
                for (const childId of nodeData.children) {
                    const child = this.nodes.get(childId);
                    if (child) {
                        node.children.add(child);
                    }
                }
                
                // Reconnect connections
                for (const connData of nodeData.connections) {
                    const otherNode = this.nodes.get(connData.id);
                    if (otherNode) {
                        node.connections.set(connData.id, {
                            node: otherNode,
                            weight: connData.weight,
                            type: connData.type
                        });
                    }
                }
            }
            
            // Rebuild roots
            for (const rootId of data.roots) {
                const root = this.nodes.get(rootId);
                if (root) {
                    this.roots.add(root);
                }
            }
            
            this.stats = data.stats;
            console.log(`[${this.name}] Loaded ${this.nodes.size} nodes from ${this.savePath}`);
            
            // Start the creative engine once loaded
            this.startAutonomousSynthesis();
            
        } catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`[${this.name}] Load failed:`, error.message);
            }
            // Even if load fails (empty), start synthesis (will wait for nodes)
            this.startAutonomousSynthesis();
        }
    }
    
    /**
     * Consolidate the entire network by merging redundant concepts
     * This is the 'Sleep Cycle' cleanup logic
     */
    async consolidateNetwork(threshold = 0.85) {
        console.log(`[${this.name}] 💤 Starting network consolidation (Sleep Cycle)...`);
        const initialCount = this.nodes.size;
        let mergedCount = 0;

        const processed = new Set();
        const nodes = Array.from(this.nodes.values());

        for (const node of nodes) {
            if (processed.has(node.id)) continue;

            // Find all nodes highly similar to this one
            const cluster = this.findSimilar(node.content, threshold, 5);
            const siblings = cluster.filter(n => n.id !== node.id && !processed.has(n.id));

            if (siblings.length > 0) {
                console.log(`[${this.name}] 🧬 Found redundancy cluster for: "${node.content}" (${siblings.length} siblings)`);
                
                // Use Brain to create a unified concept name
                let unifiedName = node.content;
                if (this.brain) {
                    try {
                        const prompt = `You are a Knowledge Architect. Combine these similar concepts into ONE high-order, precise term:
                        - ${node.content}
                        ${siblings.map(s => `- ${s.content}`).join('\n')}
                        
                        Unified Term (3 words max):`;
                        
                        const result = await this.brain.reason({ query: prompt, mode: 'fast' });
                        unifiedName = (result.response || result.text || node.content).trim().replace(/["']/g, '');
                    } catch (e) {
                        console.warn(`[${this.name}] ⚠️ Brain-led consolidation failed, using primary: ${e.message}`);
                    }
                }

                // Create/Update the unified node
                const superNode = await this.getOrCreateConcept(unifiedName, {
                    type: 'super_concept',
                    source: 'sleep_consolidation',
                    strength: 1.0,
                    tags: ['consolidated', ...node.tags]
                });

                // Collapse siblings into superNode
                const toMerge = [node, ...siblings];
                for (const mNode of toMerge) {
                    if (mNode.id === superNode.id) continue;

                    // Move connections to superNode
                    for (const conn of mNode.getConnections()) {
                        if (conn.node.id !== superNode.id) {
                            this.connectConcepts(superNode, conn.node, conn.type, conn.weight);
                        }
                    }

                    // Prune the merged node
                    this.pruneNode(mNode.id);
                    processed.add(mNode.id);
                    mergedCount++;
                }
                
                processed.add(superNode.id);
            }
        }

        console.log(`[${this.name}] ✅ Consolidation complete. Merged ${mergedCount} nodes. Final size: ${this.nodes.size}`);
        await this.save();
        return { initialCount, finalCount: this.nodes.size, merged: mergedCount };
    }

    /**
     * Get network statistics
     */
    getStats() {
        this.updateStats();
        return {
            ...this.stats,
            roots: this.roots.size
        };
    }

    /**
     * Shutdown and cleanup timers
     */
    shutdown() {
        if (this.autonomousSynthesisTimer) {
            clearInterval(this.autonomousSynthesisTimer);
            this.autonomousSynthesisTimer = null;
            console.log(`[${this.name}] Autonomous synthesis stopped`);
        }
    }
}

module.exports = { ThoughtNetwork };
