const { spawn } = require('child_process');
const path = require('path');

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m"
};

const log = (service, msg, color = colors.reset) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${color}[${timestamp}] [${service}] ${msg}${colors.reset}`);
};

async function main() {
  console.clear();
  console.log(`${colors.cyan}
  ╔════════════════════════════════════════════════════════════════╗
  ║                 🚀 SOMA PRODUCTION LAUNCHER                    ║
  ║                                                                ║
  ║      • SOMA Core Backend (Port 3001)                          ║
  ║      • Electron Window (Production Build)                     ║
  ╚════════════════════════════════════════════════════════════════╝
  ${colors.reset}`);

  const processes = [];

  // 1. Start SOMA Backend
  log('SYSTEM', '📡 Starting SOMA Core Backend...', colors.yellow);
  const backend = spawn('node', ['launcher_ULTRA.mjs'], {
    cwd: __dirname,
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, PORT: 3001 }
  });

  backend.stdout.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) console.log(`${colors.green}[BACKEND] ${line}${colors.reset}`);
    });
  });

  backend.stderr.on('data', (data) => {
    const lines = data.toString().trim().split('\n');
    lines.forEach(line => {
      if (line.trim()) console.error(`${colors.red}[BACKEND ERR] ${line}${colors.reset}`);
    });
  });

  processes.push(backend);

  // Wait for backend to be ready (5 seconds)
  log('SYSTEM', 'Waiting for backend to initialize...', colors.cyan);
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 2. Launch Electron (Production mode - loads from dist/)
  log('SYSTEM', '🖥️  Launching Electron in PRODUCTION mode...', colors.magenta);
  const electronProc = spawn('npx', ['electron', '.'], {
    cwd: __dirname,
    shell: true,
    stdio: 'pipe',
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: undefined,
      VITE_DEV_SERVER_URL: undefined  // No dev server URL = load from dist/
    }
  });

  electronProc.stdout.on('data', (data) => {
    console.log(`${colors.magenta}[ELECTRON] ${data.toString().trim()}${colors.reset}`);
  });

  electronProc.stderr.on('data', (data) => {
    console.error(`${colors.red}[ELECTRON ERR] ${data.toString().trim()}${colors.reset}`);
  });

  electronProc.on('close', (code) => {
    log('SYSTEM', `Electron window closed`, colors.yellow);
  });

  processes.push(electronProc);

  console.log(`
${colors.green}╔════════════════════════════════════════════════════════════════╗
║                    ✅ SOMA PRODUCTION ONLINE                  ║
╚════════════════════════════════════════════════════════════════╝${colors.reset}

${colors.cyan}📡 BACKEND:${colors.reset}
   • SOMA Core:        http://localhost:3001

${colors.magenta}🖥️  ELECTRON:${colors.reset}
   • Loading from:     dist/ (production build)
   • Connected to:     Backend on port 3001

${colors.green}🚀 Production app ready!${colors.reset}
`);

  // Handle shutdown
  const shutdown = () => {
    console.log(`\n${colors.red}🛑 Shutting down...${colors.reset}`);
    processes.forEach(proc => {
      try {
        proc.kill();
      } catch (e) {
        // Ignore
      }
    });
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch(err => {
  console.error(`${colors.red}Fatal error:${colors.reset}`, err);
  process.exit(1);
});
