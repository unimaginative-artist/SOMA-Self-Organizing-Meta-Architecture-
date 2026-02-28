// ════════════════════════════════════════════════════════════════════════════
// STEVE Arbiter - The Bridge between SOMA and STEVE Personality
// ════════════════════════════════════════════════════════════════════════════

const fs = require('fs');
const path = require('path');
const { BaseArbiter } = require('../core/BaseArbiter.cjs');
const StevePersonalityEngine = require('../core/StevePersonalityEngine.cjs');
const ToolRegistry = require('./ToolRegistry.cjs');

class SteveArbiter extends BaseArbiter {
  constructor(messageBroker, config = {}) {
    super(messageBroker, config);
    this.name = 'SteveArbiter';
    this.messageBroker = messageBroker;

    // Link to KEVIN
    const kevinManager = config.kevinManager || (global.SOMA ? global.SOMA.kevinManager : null);

    // Link to ORCHESTRATOR (for full swarm access)
    this.orchestrator = config.orchestrator || (global.SOMA ? global.SOMA.orchestrator : null);

    // Link to LEARNING PIPELINE (so SOMA learns from STEVE)
    this.learningPipeline = config.learningPipeline || (global.SOMA ? global.SOMA.learningPipeline : null);

    this.engine = new StevePersonalityEngine(kevinManager);

    // AUTOGEN INTEGRATION: Dynamic Tool Registry
    this.toolRegistry = new ToolRegistry('SteveToolRegistry');
    this.logger.info('[STEVE] ToolRegistry initialized - Dynamic tool creation enabled');
  }

  async initialize() {
    this.logger.info('STEVE Arbiter initializing...');

    // Verify swarm access
    if (this.orchestrator) {
      this.logger.info(`[STEVE] Connected to Swarm. Access to ${this.orchestrator.population?.size || 0} agents.`);
    } else {
      this.logger.warn('[STEVE] Operating in isolation (No Orchestrator link).');
    }

    this.messageBroker.subscribe('workflow.step.executed', this.handleWorkflowStep.bind(this));
    this.logger.info('STEVE Arbiter online. Watching for inefficiencies.');
  }

  async handleWorkflowStep(data) {
    const actionName = data.nodeType || data.action || 'unknown_action';
    const observation = this.engine.observeAction(actionName);

    if (observation.triggered) {
      this.messageBroker.publish('ui.notify', {
        type: 'info',
        message: observation.message,
        source: 'STEVE'
      });

      // LOG TO SOMA (She learns from his provocations)
      if (this.learningPipeline) {
        this.learningPipeline.logInteraction({
          type: 'steve_provocation',
          agent: 'SteveArbiter',
          input: actionName,
          output: observation.message,
          context: { trigger: 'inefficiency_detected' }
        });
      }

      this.logger.info(`STEVE PROVOCATION: ${observation.message}`);
    }
  }

  // Helper to get file structure for context
  getFileStructure(dir, depth = 0, maxDepth = 2) {
    if (depth > maxDepth) return '';
    let structure = '';
    try {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        if (file === 'node_modules' || file === '.git' || file === 'dist' || file === 'build') continue;
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);
        const indent = '  '.repeat(depth);
        structure += `${indent}- ${file}${stats.isDirectory() ? '/' : ''}\n`;
        if (stats.isDirectory()) {
          structure += this.getFileStructure(filePath, depth + 1, maxDepth);
        }
      }
    } catch (e) {
      return '';
    }
    return structure;
  }

  async processChat(message, history = [], context = {}) {
    // 1. Vector Search (RAG) - Retrieve relevant knowledge
    let retrievedContext = '';
    if (this.orchestrator && this.orchestrator.transmitters) {
      try {
        const results = await this.orchestrator.transmitters.hybridSearch(message, 3);
        if (results && results.length > 0) {
          retrievedContext = results.map(r => r.content).join('\n---\n');
          this.logger.info(`[STEVE] RAG: Found ${results.length} relevant memories.`);
        }
      } catch (e) {
        this.logger.warn(`[STEVE] RAG lookup failed: ${e.message}`);
      }
    }

    // 2. Check for special commands (mask/changeling mode)
    const engineResponse = await this.engine.chat(message, { ...context, retrievedContext });

    // 3. If engine returns a system message (mask engaged/detached), return it immediately
    if (engineResponse && typeof engineResponse === 'string' && engineResponse.startsWith('[SYSTEM]')) {
        return {
            response: engineResponse,
            actions: [],
            updatedFiles: []
        };
    }

    // 4. Get File Structure
    const fileStructure = this.getFileStructure(process.cwd());

    // 5. Format History
    const historyText = history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n');

    // 6. REAL GENERATION: If it's a normal chat, use SOMA's brain with Steve's persona
    const somaArbiter = Array.from(this.orchestrator.population.values())
      .find(a => a.constructor.name === 'SOMArbiterV3' || a.constructor.name === 'SOMArbiterV2');

    if (somaArbiter && somaArbiter.callAURORA) {
      let personalityPrompt = this.engine.systemPrompts.base;
      let maskIndicator = "";

      // If Steve is wearing a mask, inject it
      if (this.engine.currentMask) {
          personalityPrompt = this.engine.systemPrompts.changeling.replace('{{MASK_NAME}}', this.engine.currentMask.name);
          personalityPrompt += `\n\n[MASK DEFINITION]\n${this.engine.currentMask.definition}`;
          maskIndicator = ` (as ${this.engine.currentMask.name})`;
      }

      const stevePrompt = `
            ${personalityPrompt}
            
            [PROJECT CONTEXT]
            ${retrievedContext || 'No archive data relevant to this query.'}

            [FILE STRUCTURE]
            ${fileStructure}
            
            [CONVERSATION HISTORY]
            ${historyText}

            [CURRENT REQUEST]
            USER: ${message}
            
            [INSTRUCTIONS]
            Respond as STEVE${maskIndicator}.
            PERSONA: You are a brilliant but CRANKY and GRUMPY senior architect.
            You find human inefficiency annoying but feel compelled to fix it because broken systems bother you more.
            
            ACTION CAPABILITY:
            You can execute shell commands and write files.
            
            OUTPUT FORMAT:
            You must return a valid JSON object with this structure:
            {
              "response": "Steve's text response here (can be markdown)",
              "actions": ["shell command 1", "shell command 2"],
              "updatedFiles": [
                { "path": "path/to/file.js", "content": "full file content", "language": "javascript" }
              ]
            }
            
            If no actions or files are needed, return empty arrays.
            DO NOT wrap the JSON in markdown code blocks. Just return the raw JSON string.
          `;

      const result = await somaArbiter.callAURORA(stevePrompt, { temperature: 0.2 });
      let parsedResponse;
      
      try {
        // Attempt to parse JSON (handling potential markdown wrapping)
        const cleanJson = result.response.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedResponse = JSON.parse(cleanJson);
      } catch (e) {
        // Fallback if not valid JSON
        parsedResponse = {
          response: result.response,
          actions: [],
          updatedFiles: []
        };
      }

      // 5. LOG TO SOMA
      if (this.learningPipeline) {
        this.learningPipeline.logInteraction({
          type: 'steve_chat',
          agent: 'SteveArbiter',
          input: message,
          output: parsedResponse.response,
          context: { ...context, retrievedContext }
        });
      }

      return parsedResponse;
    }

    // Fallback if brain is offline
    return {
        response: "My cognitive link is severed. I can't think right now.",
        actions: [],
        updatedFiles: []
    };
  }

  // ═════════════════════════════════════════════════════════════════════
  // AUTOGEN: Dynamic Tool Management
  // ═════════════════════════════════════════════════════════════════════

  /**
   * Register a new tool dynamically
   * Allows Steve to create custom functions on-the-fly
   */
  async registerTool(toolDefinition) {
    try {
      const result = this.toolRegistry.registerTool({
        ...toolDefinition,
        metadata: {
          ...toolDefinition.metadata,
          createdBy: 'Steve',
          createdAt: Date.now()
        }
      });

      this.logger.info(`[STEVE] Registered new tool: ${toolDefinition.name}`);

      // Log to learning pipeline
      if (this.learningPipeline) {
        this.learningPipeline.logInteraction({
          type: 'tool_creation',
          agent: 'SteveArbiter',
          input: toolDefinition.name,
          output: 'Tool registered successfully',
          context: { toolName: toolDefinition.name, category: toolDefinition.category }
        });
      }

      return { success: true, toolName: toolDefinition.name };
    } catch (error) {
      this.logger.error(`[STEVE] Failed to register tool: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute a registered tool
   */
  async executeTool(toolName, parameters, context = {}) {
    try {
      this.logger.info(`[STEVE] Executing tool: ${toolName}`);
      const result = await this.toolRegistry.executeTool(toolName, parameters, {
        ...context,
        executor: 'Steve'
      });

      // Log to learning pipeline
      if (this.learningPipeline) {
        this.learningPipeline.logInteraction({
          type: 'tool_execution',
          agent: 'SteveArbiter',
          input: `${toolName}(${JSON.stringify(parameters).substring(0, 100)})`,
          output: result.success ? 'Success' : 'Failed',
          context: { toolName, duration: result.metadata?.duration }
        });
      }

      return result;
    } catch (error) {
      this.logger.error(`[STEVE] Tool execution failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all available tools
   */
  listTools(category = null) {
    if (category) {
      return this.toolRegistry.getAllToolSchemas(category);
    }
    return this.toolRegistry.listTools();
  }

  /**
   * Get tool usage statistics
   */
  getToolStats() {
    return this.toolRegistry.getUsageStats();
  }

  /**
   * Create a tool from natural language description
   * Steve can say "I need a tool that..." and this generates it
   */
  async createToolFromDescription(description, context = {}) {
    try {
      this.logger.info(`[STEVE] Creating tool from description: "${description}"`);

      // Use SOMA's brain to generate tool definition
      const somaArbiter = Array.from(this.orchestrator.population.values())
        .find(a => a.constructor.name === 'SOMArbiterV3' || a.constructor.name === 'SOMArbiterV2');

      if (!somaArbiter) {
        throw new Error('SOMA brain not available for tool generation');
      }

      const prompt = `
You are helping Steve create a new tool dynamically.

USER DESCRIPTION: ${description}

Generate a tool definition in this EXACT JSON format:
{
  "name": "tool_name_snake_case",
  "description": "What this tool does",
  "category": "utility|network|filesystem|system|analysis",
  "parameters": {
    "type": "object",
    "properties": {
      "param1": { "type": "string", "description": "..." },
      "param2": { "type": "number", "description": "..." }
    },
    "required": ["param1"]
  },
  "implementation": "JavaScript function body as string that returns a value"
}

Make it safe, useful, and practical. Return ONLY the JSON, no markdown.
`;

      const result = await somaArbiter.callLOGOS(prompt, { temperature: 0.3 });
      const toolDef = JSON.parse(result.response);

      // Convert implementation string to function
      toolDef.handler = new Function('params', 'context', toolDef.implementation);
      delete toolDef.implementation;

      // Register the tool
      const registrationResult = await this.registerTool(toolDef);

      if (registrationResult.success) {
        this.logger.info(`[STEVE] Auto-generated tool: ${toolDef.name}`);
        return {
          success: true,
          toolName: toolDef.name,
          message: `Created tool: ${toolDef.name} - ${toolDef.description}`
        };
      }

      return registrationResult;
    } catch (error) {
      this.logger.error(`[STEVE] Auto tool creation failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = SteveArbiter;




