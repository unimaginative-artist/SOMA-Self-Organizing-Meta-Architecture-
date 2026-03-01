const { spawn } = require('child_process');
const path = require('path');

console.clear();
console.log('\x1b[36m🚀 SOMA REPAIR LAUNCHER \x1b[0m');

// 1. Start Backend
console.log('\x1b[33m[1/3] Starting SOMA Core (3001)...\x1b[0m');
const backend = spawn('node', ['launcher_ULTRA.mjs'], { 
    stdio: 'inherit', 
    env: { ...process.env, PORT: 3001 } 
});

// 2. Start Frontend (Vite)
console.log('\x1b[33m[2/3] Starting Vite Dev Server (5173)...\x1b[0m');
const vite = spawn('npx.cmd', ['vite'], { 
    stdio: 'inherit', 
    shell: true 
});

// 3. Wait & Launch Electron
setTimeout(() => {
    console.log('\x1b[33m[3/3] Launching Electron...\x1b[0m');
    const electron = spawn('npx.cmd', ['electron', '.'], {
        stdio: 'inherit',
        shell: true,
        env: { 
            ...process.env, 
            VITE_DEV_SERVER_URL: 'http://localhost:5173',
            ELECTRON_enable_security_warnings: 'false'
        }
    });
}, 5000);

// Cleanup
process.on('SIGINT', () => {
    backend.kill();
    vite.kill();
    process.exit();
});
