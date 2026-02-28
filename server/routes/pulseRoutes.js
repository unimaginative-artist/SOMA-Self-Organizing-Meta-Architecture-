import express from 'express';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

// Convert module.exports = function(context) { ... } to export default function(context) { ... }
export default function (context) {
  const router = express.Router();
  const { quadBrain, goalPlanner, pulseArbiter, contextManager } = context;

  // Middleware to ensure components are ready
  const ensureReady = (component, name) => (req, res, next) => {
    if (!component) {
      return res.status(503).json({ success: false, error: `${name} not initialized` });
    }
    next();
  };

  // ═══════════════════════════════════════════════════════════
  // PLANNING ENDPOINTS
  // ═══════════════════════════════════════════════════════════

  router.post('/arbiter/generate-plan', ensureReady(quadBrain, 'QuadBrain'), async (req, res) => {
    try {
      const { goal, context } = req.body;
      if (!goal) return res.status(400).json({ error: 'Goal is required' });

      console.log(`[PulseRoutes] Generating plan for: "${goal}"`);

      const prompt = `You are an expert strategic planner.
User Goal: "${goal}"
Context: ${JSON.stringify(context || {})}

Create a detailed, step-by-step execution plan.
Return ONLY valid JSON in this format:
{
  "summary": "Brief overview of the approach",
  "reasoning": "Why this approach was chosen",
  "totalEstimate": "e.g. 2 hours",
  "arbitersUsed": ["List", "Relevant", "Arbiters"],
  "steps": [
    {
      "id": "step-1",
      "title": "Step Title",
      "description": "Detailed instructions",
      "complexity": "low|medium|high",
      "estimate": "e.g. 30m",
      "dependencies": [],
      "arbiterSuggestion": "SpecificArbiterName"
    }
  ]
}`;

      const response = await quadBrain.reason(prompt, {
        brain: 'PROMETHEUS', // Strategic brain
        temperature: 0.2
      });

      // Parse JSON from response (handle markdown blocks if present)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Failed to parse JSON from QuadBrain response");

      const plan = JSON.parse(jsonMatch[0]);

      // Optionally track in GoalPlanner if available
      if (goalPlanner) {
        try {
          const goalId = await goalPlanner.createGoal({
            title: goal,
            category: 'user_requested',
            description: plan.summary,
            metadata: { plan }
          });
          plan.planId = goalId.goalId; // Attach ID to response
        } catch (e) {
          console.warn("[PulseRoutes] Failed to track goal in GoalPlanner:", e.message);
        }
      }

      res.json({ success: true, ...plan });

    } catch (error) {
      console.error('[PulseRoutes] Plan generation error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/arbiter/plan/:planId', ensureReady(pulseArbiter, 'PulseArbiter'), async (req, res) => {
    try {
      const { planId } = req.params;
      const plan = await pulseArbiter.loadPlanFromContext(planId);
      if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });
      res.json({ success: true, plan });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/arbiter/plan/:planId/results', ensureReady(pulseArbiter, 'PulseArbiter'), async (req, res) => {
    try {
      const { planId } = req.params;
      await pulseArbiter.updatePlanWithResults(planId, req.body);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // FILE SYSTEM ENDPOINTS (REAL)
  // ═══════════════════════════════════════════════════════════

  // Helper to safely resolve paths
  const safeResolve = (targetPath) => {
    const root = process.cwd();
    const resolved = path.resolve(root, targetPath);
    if (!resolved.startsWith(root)) {
      throw new Error("Access denied: Path outside workspace");
    }
    return resolved;
  };

  router.post('/fs/create-dir', async (req, res) => {
    try {
      const { path: dirPath } = req.body;
      const resolved = safeResolve(dirPath);
      if (!fs.existsSync(resolved)) {
        fs.mkdirSync(resolved, { recursive: true });
      }
      res.json({ success: true, path: resolved });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/fs/read-file', async (req, res) => {
    try {
      const { path: filePath } = req.body;
      const resolved = safeResolve(filePath);

      if (!fs.existsSync(resolved)) {
        return res.status(404).json({ success: false, error: 'File not found' });
      }

      const content = fs.readFileSync(resolved, 'utf8');
      res.json({ success: true, content });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/fs/write-file', async (req, res) => {
    try {
      const { path: filePath, content } = req.body;
      const resolved = safeResolve(filePath);

      // Ensure dir exists
      fs.mkdirSync(path.dirname(resolved), { recursive: true });
      fs.writeFileSync(resolved, content, 'utf8');

      res.json({ success: true, path: resolved });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/fs/list', async (req, res) => {
    try {
      const { path: dirPath } = req.body;
      const resolved = safeResolve(dirPath || '.');

      const files = fs.readdirSync(resolved, { withFileTypes: true }).map(dirent => ({
        name: dirent.name, // Fixed bug: was dirPath.name
        isDirectory: dirent.isDirectory(), // Fixed bug: was dirPath.isDirectory()
        path: path.join(dirPath || '.', dirent.name) // Fixed bug: was dirPath.name
      }));

      res.json({ success: true, files });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // WORKSPACE & CONTEXT
  // ═══════════════════════════════════════════════════════════

  router.post('/workspace/save', ensureReady(contextManager, 'ContextManager'), async (req, res) => {
    try {
      const { workspaceId, workspace } = req.body;
      await contextManager.saveProject(workspaceId, workspace);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/workspace/load', ensureReady(contextManager, 'ContextManager'), async (req, res) => {
    try {
      const { workspaceId } = req.body;
      const result = await contextManager.loadProject(workspaceId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // SYSTEM & SHELL
  // ═══════════════════════════════════════════════════════════

  router.post('/shell/execute', async (req, res) => {
    try {
      const { command, cwd } = req.body;
      const execOptions = {
        cwd: cwd ? safeResolve(cwd) : process.cwd(),
        timeout: 10000,
        maxBuffer: 1024 * 1024 // 1MB
      };

      // Simple safety check (blacklist)
      const lowerCmd = command.toLowerCase();
      if (lowerCmd.includes('rm -rf /') || lowerCmd.includes(':(){:|:&};:')) {
        return res.status(400).json({ success: false, error: 'Command blocked by safety filter' });
      }

      exec(command, execOptions, (error, stdout, stderr) => {
        res.json({
          success: !error,
          output: stdout || stderr, // Combine for terminal view
          error: error ? error.message : null,
          code: error ? error.code : 0
        });
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // STEVE ASSIST (Real Agentic Endpoint)
  // ═══════════════════════════════════════════════════════════

  router.post('/arbiter/steve-assist', async (req, res) => {
    // We access steveArbiter from context directly here since it might be initialized late
    const steveArbiter = context.steveArbiter;

    if (!steveArbiter) {
      return res.status(503).json({ success: false, error: 'SteveArbiter not initialized' });
    }

    try {
      const { message, history, context: chatContext } = req.body;

      // Call Steve's real brain
      // Now returns structured JSON: { response, actions, updatedFiles }
      const result = await steveArbiter.processChat(message, history, chatContext);

      res.json({
        success: true,
        ...result, // Spread the structured result (response, actions, updatedFiles)
        arbitersConsulted: ['SteveArbiter', 'SOMArbiterV3'],
        agenticMode: true
      });
    } catch (error) {
      console.error('[PulseRoutes] Steve assist error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/steve/create-tool', async (req, res) => {
    const steveArbiter = context.steveArbiter;
    if (!steveArbiter) return res.status(503).json({ error: 'SteveArbiter not initialized' });

    try {
      const { description, context: toolContext } = req.body;
      const result = await steveArbiter.createToolFromDescription(description, toolContext);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.get('/steve/tools', async (req, res) => {
    const steveArbiter = context.steveArbiter;
    if (!steveArbiter) return res.status(503).json({ error: 'SteveArbiter not initialized' });

    try {
      const { category } = req.query;
      const tools = steveArbiter.listTools(category);
      res.json({ success: true, tools });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/steve/execute-tool', async (req, res) => {
    const steveArbiter = context.steveArbiter;
    if (!steveArbiter) return res.status(503).json({ error: 'SteveArbiter not initialized' });

    try {
      const { toolName, parameters, context: execContext } = req.body;
      const result = await steveArbiter.executeTool(toolName, parameters, execContext);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // ═══════════════════════════════════════════════════════════
  // ANALYSIS & WORKFLOW (Forward to PulseArbiter)
  // ═══════════════════════════════════════════════════════════

  router.post('/arbiter/analyze-preview', ensureReady(pulseArbiter, 'PulseArbiter'), async (req, res) => {
    try {
      const result = await pulseArbiter.handleMessage({
        type: 'analyze_preview',
        payload: req.body
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/arbiter/analyze-element', ensureReady(pulseArbiter, 'PulseArbiter'), async (req, res) => {
    try {
      const result = await pulseArbiter.handleMessage({
        type: 'analyze_element',
        payload: req.body
      });
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  router.post('/workflow/execute', ensureReady(pulseArbiter, 'PulseArbiter'), async (req, res) => {
    try {
      // Placeholder for workflow execution logic
      res.json({ success: true, message: 'Workflow execution not yet fully implemented in PulseRoutes' });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
};
