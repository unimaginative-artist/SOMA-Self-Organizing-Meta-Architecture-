
/**
 * ToolRegistry.js
 * 
 * Central registry for SOMA's tools.
 * Allows Arbiters to discover and execute tools.
 */

export class ToolRegistry {
  constructor() {
    this.tools = new Map();
  }

  /**
   * Register a new tool
   * @param {Object} tool - Tool definition
   * @param {string} tool.name - Unique name (e.g., 'calculator')
   * @param {string} tool.description - Description for the LLM
   * @param {Object} tool.parameters - JSON Schema for arguments
   * @param {Function} tool.execute - Async function(args) => result
   */
  registerTool(tool) {
    if (!tool.name || !tool.execute) {
      console.error('[ToolRegistry] Invalid tool definition:', tool);
      return;
    }
    this.tools.set(tool.name, tool);
    console.log(`[ToolRegistry] Registered tool: ${tool.name}`);
  }

  /**
   * Get all tools formatted for LLM system prompt
   */
  getToolsManifest() {
    return Array.from(this.tools.values()).map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }));
  }

  getTool(name) {
    return this.tools.get(name);
  }

  async execute(name, args) {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Tool ${name} not found`);
    
    try {
      console.log(`[ToolRegistry] Executing ${name} with args:`, args);
      const result = await tool.execute(args);
      return result;
    } catch (error) {
      console.error(`[ToolRegistry] Execution failed for ${name}:`, error);
      throw error;
    }
  }
}

export default new ToolRegistry();
