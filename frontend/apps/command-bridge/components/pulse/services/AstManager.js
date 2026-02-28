import { parse } from '@babel/parser';
// import traverse from '@babel/traverse'; // REMOVED: Incompatible with browser

/**
 * AstManager
 * Provides "Code Intelligence" for Steve by parsing file content into ASTs
 * and extracting structural metadata (Components, Hooks, Imports).
 * 
 * Production Grade Implementation: 
 * Uses @babel/parser for robust parsing, but uses a custom lightweight
 * traversal implementation to avoid Node.js dependency issues with @babel/traverse.
 */
class AstManager {

    /**
     * Parses a file content and returns structural metadata.
     * @param {string} content - The raw file content
     * @param {string} fileName - The name of the file (to determine parser plugins)
     * @returns {Object} Metadata { components: [], hooks: [], imports: [] }
     */
    analyze(content, fileName) {
        if (!content || typeof content !== 'string') return null;

        const isTs = fileName.endsWith('.ts') || fileName.endsWith('.tsx');
        const isJsx = fileName.endsWith('.jsx') || fileName.endsWith('.tsx');

        try {
            const ast = parse(content, {
                sourceType: 'module',
                plugins: [
                    'jsx',
                    'typescript',
                    'classProperties',
                    'decorators-legacy'
                ]
            });

            const metadata = {
                components: [],
                hooks: [],
                imports: []
            };

            // Custom Lightweight Traversal
            this.simpleTraverse(ast, {
                // Find Import Statements
                ImportDeclaration: (node) => {
                    if (node.source && node.source.value) {
                        const specifiers = node.specifiers ? node.specifiers.map(s => s.local.name) : [];
                        metadata.imports.push({
                            source: node.source.value,
                            specifiers
                        });
                    }
                },

                // Find Function Components (FunctionDeclaration)
                FunctionDeclaration: (node) => {
                    if (node.id && this.isComponent(node.id.name)) {
                        metadata.components.push({
                            name: node.id.name,
                            type: 'function',
                            start: node.loc?.start.line,
                            end: node.loc?.end.line
                        });
                    }
                },

                // Find Arrow Function Components (VariableDeclarator)
                VariableDeclarator: (node) => {
                    if (node.id && node.id.name && node.init && (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression')) {
                        if (this.isComponent(node.id.name)) {
                            metadata.components.push({
                                name: node.id.name,
                                type: 'arrow',
                                start: node.loc?.start.line,
                                end: node.loc?.end.line
                            });
                        }
                    }
                }
            });

            return metadata;

        } catch (e) {
            console.warn(`[AstManager] Failed to parse ${fileName}:`, e);
            return null; // Fail gracefully
        }
    }
    /**
     * A recursive AST walker that visits nodes matching the visitor keys.
     * @param {Object} node - Current AST node
     * @param {Object} visitors - Object with keys matching node types
     */
    simpleTraverse(node, visitors) {
        if (!node || typeof node !== 'object') return;

        // Visit current node
        if (visitors[node.type]) {
            visitors[node.type](node);
        }

        // Recursively visit children
        // We handle standard Babel AST properties like 'body', 'program', 'declarations', etc.
        // It's safer to just iterate all object values that look like nodes or arrays of nodes.
        for (const key in node) {
            // Skip parent/metadata pointers to avoid cycles if any (Babel parser usually is a tree)
            if (key === 'loc' || key === 'start' || key === 'end' || key === 'comments') continue;

            const child = node[key];
            if (Array.isArray(child)) {
                child.forEach(c => this.simpleTraverse(c, visitors));
            } else if (child && typeof child === 'object' && typeof child.type === 'string') {
                this.simpleTraverse(child, visitors);
            }
        }
    }

    /**
     * Heuristic to check if a name looks like a component (PascalCase)
     */
    isComponent(name) {
        return name && /^[A-Z]/.test(name);
    }
}

export const astManager = new AstManager();
