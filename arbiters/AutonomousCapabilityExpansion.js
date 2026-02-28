/**
 * AutonomousCapabilityExpansion.js
 * Self-expanding capabilities: detects missing abilities, finds solutions on GitHub, proposes integration
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

const execAsync = promisify(exec);

export class AutonomousCapabilityExpansion extends EventEmitter {
  constructor(config = {}) {
    super();
    this.name = config.name || 'CapabilityExpansion';
    this.quadBrain = config.quadBrain;
    this.messageBroker = config.messageBroker;
    this.logger = config.logger || console;
    this.baseDir = config.baseDir || process.cwd();
    this.tempDir = path.join(this.baseDir, 'temp-capabilities');
    this.knownRepos = ['Shubhamsaboo/awesome-llm-apps', 'microsoft/autogen', 'langchain-ai/langchain'];
    console.log(`[${this.name}] Ready to expand capabilities autonomously`);
  }
  
  async initialize() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (e) { /* ignore */ }
    this.emit('initialized');
  }
  
  async detectMissingCapability(goal, availableArbiters) {
    const prompt = `Analyze: "${goal}"

Available: ${availableArbiters.map(a => a.name).join(', ')}

Can we accomplish this? If not, what's missing? Respond JSON:
{"canAccomplish": bool, "missingCapability": "what", "searchTerms": ["terms"]}`;

    try {
      const analysis = await this.quadBrain.reason(prompt, { brain: 'LOGOS', temperature: 0.2 });
      const jsonMatch = analysis.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : { canAccomplish: true };
    } catch (e) {
      return { canAccomplish: true };
    }
  }
  
  async searchGitHub(searchTerms) {
    try {
      const query = searchTerms.join(' ');
      const { stdout } = await execAsync(`gh search repos "${query}" --limit 3 --json fullName,description`, { timeout: 10000 });
      return JSON.parse(stdout);
    } catch (e) {
      return this.knownRepos.map(repo => ({ fullName: repo, description: 'Known repo' }));
    }
  }
  
  async expandCapability(goal, availableArbiters) {
    const detection = await this.detectMissingCapability(goal, availableArbiters);
    
    if (detection.canAccomplish) {
      return { success: true, message: 'Capability available' };
    }
    
    const repos = await this.searchGitHub(detection.searchTerms || ['agent']);
    
    return {
      success: false,
      requiresApproval: true,
      missingCapability: detection.missingCapability,
      suggestedRepos: repos,
      message: `Missing: "${detection.missingCapability}". Found ${repos.length} repos. Download?`,
      topRepo: repos[0]?.fullName
    };
  }
  
  async downloadAndAnalyze(repoName) {
    const clonePath = path.join(this.tempDir, repoName.replace('/', '_'));
    try {
      await execAsync(`gh repo clone ${repoName} "${clonePath}"`, { timeout: 60000 });
      return { success: true, path: clonePath, repo: repoName };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
}

export default AutonomousCapabilityExpansion;
