/**
 * Repo Explainer
 * 
 * Analyzes GitHub repositories and generates comprehensive guides.
 * Uses MCP servers (GitHub MCP) + SOMA arbiters for deep analysis.
 */

import { pulseClient } from './pulseClient';

export interface RepoExplanation {
  overview: string;
  architecture: {
    description: string;
    patterns: string[];
    keyComponents: Array<{
      name: string;
      purpose: string;
      location: string;
    }>;
  };
  setup: {
    prerequisites: string[];
    steps: string[];
    environmentVariables?: string[];
  };
  codeFlow: {
    entryPoints: string[];
    dataFlow: string;
    keyFiles: Array<{
      path: string;
      purpose: string;
      importance: 'critical' | 'important' | 'supporting';
    }>;
  };
  techStack: {
    languages: string[];
    frameworks: string[];
    tools: string[];
    dependencies: Array<{
      name: string;
      purpose: string;
    }>;
  };
  bestPractices: string[];
  commonTasks: Array<{
    task: string;
    command: string;
    description: string;
  }>;
  contributing?: {
    guidelines: string;
    workflow: string;
  };
}

class RepoExplainerService {
  private explanationCache = new Map<string, RepoExplanation>();

  /**
   * Explain a GitHub repository
   */
  async explainRepo(repoUrl: string): Promise<RepoExplanation> {
    // Parse repo URL
    const { owner, repo } = this.parseGitHubUrl(repoUrl);
    const cacheKey = `${owner}/${repo}`;

    // Check cache
    if (this.explanationCache.has(cacheKey)) {
      return this.explanationCache.get(cacheKey)!;
    }

    try {
      // 1. Fetch repo info via MCP GitHub server
      const repoInfo = await this.fetchRepoInfoMCP(owner, repo);

      // 2. Analyze structure
      const structure = await this.analyzeStructure(owner, repo, repoInfo);

      // 3. Analyze code patterns
      const patterns = await this.analyzeCodePatterns(owner, repo, repoInfo);

      // 4. Generate explanation
      const explanation = await this.generateExplanation(repoInfo, structure, patterns);

      // Cache result
      this.explanationCache.set(cacheKey, explanation);

      return explanation;
    } catch (error) {
      console.error('[RepoExplainer] Failed to explain repo:', error);
      throw error;
    }
  }

  /**
   * Parse GitHub URL
   */
  private parseGitHubUrl(url: string): { owner: string; repo: string } {
    // Support formats:
    // - https://github.com/owner/repo
    // - github.com/owner/repo
    // - owner/repo
    const match = url.match(/(?:github\.com\/)?([^/]+)\/([^/]+)/);
    if (!match) {
      throw new Error('Invalid GitHub URL format');
    }

    return {
      owner: match[1],
      repo: match[2].replace('.git', '')
    };
  }

  /**
   * Fetch repo info via MCP GitHub server
   */
  private async fetchRepoInfoMCP(owner: string, repo: string): Promise<any> {
    try {
      // Use MCP server to fetch repo data
      // This would call your MCP GitHub server
      const response = await fetch(`/api/mcp/github/repo/${owner}/${repo}`);
      
      if (!response.ok) {
        throw new Error(`MCP GitHub server error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.warn('[RepoExplainer] MCP fetch failed, using GitHub API fallback:', error);
      
      // Fallback to direct GitHub API
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`);
      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.statusText}`);
      }
      
      const repoData = await response.json();
      
      // Also fetch README
      const readmeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/readme`);
      let readme = '';
      if (readmeResponse.ok) {
        const readmeData = await readmeResponse.json();
        readme = atob(readmeData.content);
      }

      // Fetch file tree
      const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${repoData.default_branch}?recursive=1`);
      let tree = [];
      if (treeResponse.ok) {
        const treeData = await treeResponse.json();
        tree = treeData.tree;
      }

      return {
        ...repoData,
        readme,
        tree
      };
    }
  }

  /**
   * Analyze repository structure
   */
  private async analyzeStructure(owner: string, repo: string, repoInfo: any): Promise<any> {
    const tree = repoInfo.tree || [];
    
    // Identify project type
    const hasPackageJson = tree.some((f: any) => f.path === 'package.json');
    const hasRequirementsTxt = tree.some((f: any) => f.path === 'requirements.txt');
    const hasGoMod = tree.some((f: any) => f.path === 'go.mod');
    const hasCargoToml = tree.some((f: any) => f.path === 'Cargo.toml');
    const hasPomXml = tree.some((f: any) => f.path === 'pom.xml');

    let projectType = 'unknown';
    if (hasPackageJson) projectType = 'node';
    else if (hasRequirementsTxt) projectType = 'python';
    else if (hasGoMod) projectType = 'go';
    else if (hasCargoToml) projectType = 'rust';
    else if (hasPomXml) projectType = 'java';

    // Identify frameworks
    const frameworks: string[] = [];
    if (hasPackageJson) {
      if (tree.some((f: any) => f.path.includes('next.config'))) frameworks.push('Next.js');
      else if (tree.some((f: any) => f.path.includes('vite.config'))) frameworks.push('Vite');
      else if (tree.some((f: any) => f.path.includes('react'))) frameworks.push('React');
    }

    // Identify key directories
    const keyDirs = tree
      .filter((f: any) => f.type === 'tree')
      .map((f: any) => f.path)
      .filter((p: string) => {
        const firstDir = p.split('/')[0];
        return ['src', 'lib', 'app', 'pages', 'components', 'services', 'api', 'server', 'client'].includes(firstDir);
      });

    return {
      projectType,
      frameworks,
      keyDirs,
      fileCount: tree.filter((f: any) => f.type === 'blob').length,
      dirCount: tree.filter((f: any) => f.type === 'tree').length
    };
  }

  /**
   * Analyze code patterns using SOMA arbiters
   */
  private async analyzeCodePatterns(owner: string, repo: string, repoInfo: any): Promise<any> {
    try {
      // Use CodeObservationArbiter for pattern detection
      const result = await pulseClient.analyzeCode(
        repoInfo.readme || '',
        `${owner}/${repo}`,
        'pattern-analysis'
      );

      return result.patterns || [];
    } catch (error) {
      console.warn('[RepoExplainer] Pattern analysis failed:', error);
      return [];
    }
  }

  /**
   * Generate explanation using ReasoningChamber
   */
  private async generateExplanation(
    repoInfo: any,
    structure: any,
    patterns: any
  ): Promise<RepoExplanation> {
    // Build explanation from analysis
    const explanation: RepoExplanation = {
      overview: repoInfo.description || 'No description available',
      
      architecture: {
        description: this.generateArchitectureDescription(structure),
        patterns: patterns.length > 0 ? patterns : ['Standard project structure'],
        keyComponents: this.identifyKeyComponents(structure, repoInfo.tree || [])
      },

      setup: this.generateSetupInstructions(structure, repoInfo.readme),

      codeFlow: this.analyzeCodeFlow(structure, repoInfo.tree || []),

      techStack: this.identifyTechStack(structure, repoInfo),

      bestPractices: this.extractBestPractices(repoInfo.readme),

      commonTasks: this.identifyCommonTasks(structure, repoInfo.readme)
    };

    // Add contributing guidelines if available
    if (repoInfo.readme && repoInfo.readme.toLowerCase().includes('contribut')) {
      explanation.contributing = {
        guidelines: 'See CONTRIBUTING.md or README',
        workflow: 'Standard fork-and-pull-request workflow'
      };
    }

    return explanation;
  }

  /**
   * Generate architecture description
   */
  private generateArchitectureDescription(structure: any): string {
    const { projectType, frameworks } = structure;
    
    let desc = `This is a ${projectType} project`;
    if (frameworks.length > 0) {
      desc += ` using ${frameworks.join(', ')}`;
    }
    desc += `. It contains ${structure.fileCount} files across ${structure.dirCount} directories.`;

    return desc;
  }

  /**
   * Identify key components
   */
  private identifyKeyComponents(structure: any, tree: any[]): any[] {
    const components: any[] = [];

    // Look for main entry points
    const mainFiles = ['index.js', 'index.ts', 'main.js', 'main.ts', 'app.js', 'app.ts', 'server.js'];
    mainFiles.forEach(file => {
      const found = tree.find((f: any) => f.path.endsWith(file));
      if (found) {
        components.push({
          name: file,
          purpose: 'Application entry point',
          location: found.path
        });
      }
    });

    // Look for config files
    const configFiles = ['package.json', 'tsconfig.json', 'webpack.config.js', 'vite.config.ts'];
    configFiles.forEach(file => {
      const found = tree.find((f: any) => f.path === file);
      if (found) {
        components.push({
          name: file,
          purpose: 'Configuration file',
          location: found.path
        });
      }
    });

    return components;
  }

  /**
   * Generate setup instructions
   */
  private generateSetupInstructions(structure: any, readme: string): any {
    const instructions: any = {
      prerequisites: [],
      steps: []
    };

    // Infer from project type
    if (structure.projectType === 'node') {
      instructions.prerequisites.push('Node.js (v16+)');
      instructions.prerequisites.push('npm or yarn');
      instructions.steps.push('npm install');
      instructions.steps.push('npm run dev');
    } else if (structure.projectType === 'python') {
      instructions.prerequisites.push('Python 3.8+');
      instructions.prerequisites.push('pip');
      instructions.steps.push('pip install -r requirements.txt');
      instructions.steps.push('python main.py');
    }

    // Extract from README if available
    if (readme) {
      const installMatch = readme.match(/```(?:bash|sh)?\s*(npm install|pip install|cargo build)/i);
      if (installMatch) {
        // Found setup instructions in README
      }
    }

    return instructions;
  }

  /**
   * Analyze code flow
   */
  private analyzeCodeFlow(structure: any, tree: any[]): any {
    const entryPoints: string[] = [];
    const keyFiles: any[] = [];

    // Find entry points
    ['index', 'main', 'app', 'server'].forEach(name => {
      const found = tree.find((f: any) => 
        f.path.includes(name) && 
        (f.path.endsWith('.js') || f.path.endsWith('.ts') || f.path.endsWith('.tsx'))
      );
      if (found) entryPoints.push(found.path);
    });

    // Identify important files by location
    tree.forEach((f: any) => {
      if (f.type !== 'blob') return;
      
      const path = f.path.toLowerCase();
      if (path.includes('router') || path.includes('route')) {
        keyFiles.push({
          path: f.path,
          purpose: 'Routing logic',
          importance: 'critical' as const
        });
      } else if (path.includes('api') || path.includes('service')) {
        keyFiles.push({
          path: f.path,
          purpose: 'API/Service layer',
          importance: 'important' as const
        });
      } else if (path.includes('config')) {
        keyFiles.push({
          path: f.path,
          purpose: 'Configuration',
          importance: 'supporting' as const
        });
      }
    });

    return {
      entryPoints,
      dataFlow: 'Request → Router → Controller → Service → Model → Response',
      keyFiles: keyFiles.slice(0, 10) // Limit to top 10
    };
  }

  /**
   * Identify tech stack
   */
  private identifyTechStack(structure: any, repoInfo: any): any {
    const stack: any = {
      languages: [],
      frameworks: structure.frameworks || [],
      tools: [],
      dependencies: []
    };

    // Languages
    if (repoInfo.language) {
      stack.languages.push(repoInfo.language);
    }

    // Tools (from config files)
    const tree = repoInfo.tree || [];
    if (tree.some((f: any) => f.path === '.eslintrc.js')) stack.tools.push('ESLint');
    if (tree.some((f: any) => f.path === '.prettierrc')) stack.tools.push('Prettier');
    if (tree.some((f: any) => f.path === 'jest.config.js')) stack.tools.push('Jest');
    if (tree.some((f: any) => f.path === 'Dockerfile')) stack.tools.push('Docker');

    return stack;
  }

  /**
   * Extract best practices from README
   */
  private extractBestPractices(readme: string): string[] {
    const practices: string[] = [];

    if (!readme) return practices;

    // Look for common sections
    if (readme.toLowerCase().includes('test')) {
      practices.push('Project includes tests');
    }
    if (readme.toLowerCase().includes('ci/cd') || readme.includes('.github/workflows')) {
      practices.push('Uses CI/CD pipeline');
    }
    if (readme.toLowerCase().includes('typescript')) {
      practices.push('TypeScript for type safety');
    }
    if (readme.toLowerCase().includes('lint')) {
      practices.push('Code linting enabled');
    }

    return practices;
  }

  /**
   * Identify common tasks
   */
  private identifyCommonTasks(structure: any, readme: string): any[] {
    const tasks: any[] = [];

    if (structure.projectType === 'node') {
      tasks.push({
        task: 'Install dependencies',
        command: 'npm install',
        description: 'Installs all required packages'
      });
      tasks.push({
        task: 'Start development server',
        command: 'npm run dev',
        description: 'Starts the development server with hot reload'
      });
      tasks.push({
        task: 'Run tests',
        command: 'npm test',
        description: 'Executes the test suite'
      });
      tasks.push({
        task: 'Build for production',
        command: 'npm run build',
        description: 'Creates optimized production build'
      });
    }

    return tasks;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.explanationCache.clear();
  }
}

export const repoExplainer = new RepoExplainerService();
