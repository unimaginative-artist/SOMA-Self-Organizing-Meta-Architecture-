
type Callback = (payload: any) => void;

interface ArbiterConfig {
  role: string;
  version: string;
  instance: any;
  lastHeartbeat?: number;
}

class MessageBroker {
  private subscriptions: Map<string, Set<Callback>> = new Map();
  private threads: Map<string, any[]> = new Map();
  private arbiters: Map<string, ArbiterConfig> = new Map();

  subscribe(topic: string, callback: Callback) {
    if (!this.subscriptions.has(topic)) {
      this.subscriptions.set(topic, new Set());
    }
    this.subscriptions.get(topic)!.add(callback);
    return () => this.subscriptions.get(topic)?.delete(callback);
  }

  async publish(topic: string, payload: any) {
    // Wildcard matching for topics like 'system/task_update.*'
    const handlers = new Set<Callback>();
    
    this.subscriptions.forEach((callbacks, registeredTopic) => {
      const regex = new RegExp('^' + registeredTopic.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
      if (regex.test(topic)) {
        callbacks.forEach(cb => handlers.add(cb));
      }
    });

    handlers.forEach(cb => cb(payload));

    // Update threads for stateful checks (like stop signals)
    if (!this.threads.has(topic)) {
      this.threads.set(topic, []);
    }
    this.threads.get(topic)!.push(payload);

    // If it's a heartbeat, update the local arbiter state
    if (topic === 'heartbeat' && payload.id) {
      const arbiter = this.arbiters.get(payload.id);
      if (arbiter) {
        arbiter.lastHeartbeat = Date.now();
      }
    }
  }

  getThread(topic: string): any[] {
    return this.threads.get(topic) || [];
  }

  clearThread(topic: string) {
    this.threads.delete(topic);
  }

  registerArbiter(name: string, config: ArbiterConfig) {
    this.arbiters.set(name, { ...config, lastHeartbeat: Date.now() });
    console.log(`[BROKER] Registered Arbiter: ${name} as ${config.role} (v${config.version})`);
  }

  getArbiter(name: string): ArbiterConfig | undefined {
    return this.arbiters.get(name);
  }

  getArbiters() {
    return Array.from(this.arbiters.entries());
  }
}

const broker = new MessageBroker();
export default broker;
