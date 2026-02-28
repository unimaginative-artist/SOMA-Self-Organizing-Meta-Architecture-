import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Dynamic Plugin Loader
 * Allows extending SOMA without modifying the core Bootstrap file.
 */
export class PluginLoader {
    constructor(system) {
        this.system = system;
        this.pluginsDir = path.resolve(process.cwd(), 'plugins');
    }

    async loadPlugins() {
        console.log('\n🔌 Scanning for plugins...');
        try {
            await fs.access(this.pluginsDir);
        } catch {
            console.log('   (No plugins directory found, creating one...)');
            await fs.mkdir(this.pluginsDir, { recursive: true });
            return;
        }

        const files = await fs.readdir(this.pluginsDir);
        const pluginFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.mjs'));

        if (pluginFiles.length === 0) {
            console.log('   (No plugins found)');
            return;
        }

        for (const file of pluginFiles) {
            await this.loadPlugin(file);
        }
    }

    async loadPlugin(filename) {
        try {
            const filePath = path.join(this.pluginsDir, filename);
            const fileUrl = pathToFileURL(filePath).href;

            console.log(`   - Loading plugin: ${filename}...`);
            const module = await import(fileUrl);

            // Assume default export is the Arbiter class, or the first named export
            const ArbiterClass = module.default || Object.values(module).find(exp => typeof exp === 'function' && exp.name.includes('Arbiter'));

            if (typeof ArbiterClass !== 'function') {
                console.warn(`   ⚠️ ${filename} does not export a valid Arbiter class.`);
                return;
            }

            const name = ArbiterClass.name || filename.replace(/\.(m)?js$/, '');

            // Instantiate
            const instance = new ArbiterClass({ name });

            // Initialize with System context (Dependency Injection)
            // We pass { system: this.system } so plugins can access messageBroker, quadBrain, etc.
            if (instance.initialize) {
                await instance.initialize({
                    system: this.system
                });
            }

            // Register with Message Broker
            if (this.system.messageBroker) {
                this.system.messageBroker.registerArbiter(name, { instance });
            }

            // Attach to system object (camelCase)
            // e.g. MyCoolArbiter -> system.myCoolArbiter
            const propName = name.charAt(0).toLowerCase() + name.slice(1);
            if (!this.system[propName]) {
                this.system[propName] = instance;
            }

            console.log(`   ✅ Plugin ${name} loaded and active.`);

        } catch (err) {
            console.error(`   ❌ Failed to load plugin ${filename}:`, err);
        }
    }
}
