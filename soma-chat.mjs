import readline from 'readline';
import { randomBytes } from 'crypto';

// ═══════════════════════════════════════════════════════════
// SOMA ENHANCED CLI v2.0 - Neural Link Terminal
// ═══════════════════════════════════════════════════════════

const API_URL = 'http://127.0.0.1:3001/api/soma/chat';
const HEALTH_URL = 'http://127.0.0.1:3001/health';

// Session state
const session = {
    id: randomBytes(8).toString('hex'),
    startTime: Date.now(),
    messageCount: 0,
    deepThinking: false,
    history: [],
    reconnectAttempts: 0
};

// Configure readline with history support
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[32mYou > \x1b[0m',
    historySize: 100
});

// ═══════════════════════════════════════════════════════════
// UI Helpers
// ═══════════════════════════════════════════════════════════

function clearScreen() {
    console.clear();
    printBanner();
}

function printBanner() {
    console.log('\x1b[36m%s\x1b[0m', '╔════════════════════════════════════════════════════════╗');
    console.log('\x1b[36m%s\x1b[0m', '║   🦞 SOMA NEURAL LINK v2.0 - Enhanced CLI            ║');
    console.log('\x1b[36m%s\x1b[0m', '╚════════════════════════════════════════════════════════╝');
}

function startPulse() {
    const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
    let i = 0;
    process.stdout.write('\x1b[36m SOMA Thinking \x1b[0m');
    return setInterval(() => {
        const frame = frames[i % frames.length];
        readline.cursorTo(process.stdout, 15);
        process.stdout.write(`\x1b[36m${frame}\x1b[0m`);
        i++;
    }, 80);
}

function stopPulse(interval) {
    clearInterval(interval);
    // Clear the entire line where the thinking spinner was
    readline.cursorTo(process.stdout, 0);
    readline.clearLine(process.stdout, 0);
}

function formatMetadata(metadata, responseTime) {
    if (session.deepThinking) return '\x1b[36m[🧠 Deep Thinking]\x1b[0m';
    return '';
}

function printSessionStats() {
    const uptime = ((Date.now() - session.startTime) / 1000).toFixed(0);
    console.log('\n\x1b[36m═══ Session Statistics ═══\x1b[0m');
    console.log(`  Messages sent: ${session.messageCount}`);
    console.log(`  Session uptime: ${uptime}s`);
    console.log(`  Session ID: ${session.id.substring(0, 8)}`);
    console.log(`  Deep thinking: ${session.deepThinking ? 'ON' : 'OFF'}`);
    console.log('\x1b[36m════════════════════════════\x1b[0m\n');
}

// ═══════════════════════════════════════════════════════════
// Command Handlers
// ═══════════════════════════════════════════════════════════

function showHelp() {
    console.log('\n\x1b[36m═══ Available Commands ═══\x1b[0m');
    console.log('  \x1b[33m/help\x1b[0m       - Show this help message');
    console.log('  \x1b[33m/status\x1b[0m     - Check backend health and active brain');
    console.log('  \x1b[33m/deep\x1b[0m       - Toggle deep thinking mode (step-by-step reasoning)');
    console.log('  \x1b[33m/clear\x1b[0m      - Clear screen');
    console.log('  \x1b[33m/history\x1b[0m    - Show recent conversation history');
    console.log('  \x1b[33m/stats\x1b[0m      - Show session statistics');
    console.log('  \x1b[33m/exit\x1b[0m       - Close neural link and exit');
    console.log('\n  \x1b[90mTip: Use ↑/↓ arrows for command history\x1b[0m');
    console.log('\x1b[36m═════════════════════════════\x1b[0m\n');
}

async function showStatus() {
    const pulse = startPulse();
    try {
        const response = await fetch(HEALTH_URL);
        const data = await response.json();
        stopPulse(pulse);

        console.log('\n\x1b[36m═══ Backend Status ═══\x1b[0m');
        console.log(`  Status: \x1b[32m${data.ok ? '✓ ONLINE' : '✗ OFFLINE'}\x1b[0m`);
        console.log(`  Uptime: ${(data.uptime || 0).toFixed(1)}s`);
        console.log(`  Health: ${data.status || 'unknown'}`);
        console.log('\x1b[36m═════════════════════════\x1b[0m\n');
    } catch (error) {
        stopPulse(pulse);
        console.log('\n\x1b[31m✗ Backend unreachable\x1b[0m\n');
    }
}

function showHistory() {
    if (session.history.length === 0) {
        console.log('\n\x1b[90mNo conversation history yet\x1b[0m\n');
        return;
    }

    const count = Math.min(session.history.length, 15);
    console.log(`\n\x1b[36m═══ Recent Conversation (${count}/${session.history.length}) ═══\x1b[0m`);
    session.history.slice(-15).forEach((entry, i) => {
        const role = entry.role === 'user' ? '\x1b[32mYou\x1b[0m' : '\x1b[35mSOMA\x1b[0m';
        const preview = entry.text.substring(0, 100) + (entry.text.length > 100 ? '...' : '');
        console.log(`  ${role}: ${preview}`);
    });
    console.log('\x1b[36m═══════════════════════════════\x1b[0m\n');
}

function toggleDeepThinking() {
    session.deepThinking = !session.deepThinking;
    const status = session.deepThinking ? '\x1b[32mON\x1b[0m' : '\x1b[90mOFF\x1b[0m';
    console.log(`\n🧠 Deep Thinking Mode: ${status}\n`);
}

// ═══════════════════════════════════════════════════════════
// Health Check
// ═══════════════════════════════════════════════════════════

async function checkHealth() {
    console.log('Connecting to SOMA at 127.0.0.1:3001...');
    const pulse = startPulse();

    try {
        const response = await fetch(HEALTH_URL, { signal: AbortSignal.timeout(15000) });
        const data = await response.json();
        stopPulse(pulse);

        if (data.ok) {
            console.log(`\x1b[32m✓ Neural link established\x1b[0m (uptime: ${(data.uptime || 0).toFixed(1)}s)`);
            console.log(`\x1b[90mSession ID: ${session.id}\x1b[0m`);
            console.log('\nType \x1b[33m/help\x1b[0m for commands or start chatting\n');
            return true;
        } else {
            console.log('\x1b[31m✗ Backend unhealthy\x1b[0m');
            return false;
        }
    } catch (error) {
        stopPulse(pulse);
        console.log('\x1b[31m✗ Connection failed\x1b[0m - Is SOMA running?');
        console.log(`   Error: ${error.message}\n`);

        if (session.reconnectAttempts < 3) {
            session.reconnectAttempts++;
            console.log(`Retrying (${session.reconnectAttempts}/3)...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return checkHealth();
        }

        return false;
    }
}

// ═══════════════════════════════════════════════════════════
// Chat Loop
// ═══════════════════════════════════════════════════════════

async function handleInput(input) {
    input = input.trim();
    if (!input) {
        rl.prompt();
        return;
    }

    // Direct shell execution shortcut (prefix "!")
    if (input.startsWith('!')) {
        const cmd = input.slice(1).trim();
        if (!cmd) {
            rl.prompt();
            return;
        }
        const pulse = startPulse();
        try {
            const resp = await fetch('http://127.0.0.1:3001/api/soma/shell/exec', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: cmd })
            });
            const data = await resp.json();
            stopPulse(pulse);
            if (data.success) {
                console.log(`\n\x1b[90m[SHELL]\x1b[0m ${data.output || ''}`);
            } else {
                console.log(`\n\x1b[31m[SHELL ERROR]\x1b[0m ${data.error || data.output || 'Unknown error'}`);
            }
        } catch (e) {
            stopPulse(pulse);
            console.log(`\n\x1b[31m[SHELL ERROR]\x1b[0m ${e.message}`);
        }
        rl.prompt();
        return;
    }

    // Handle commands
    if (input.startsWith('/')) {
        const cmd = input.toLowerCase();

        if (cmd === '/help') showHelp();
        else if (cmd === '/status') await showStatus();
        else if (cmd === '/deep') toggleDeepThinking();
        else if (cmd === '/clear') clearScreen();
        else if (cmd === '/history') showHistory();
        else if (cmd === '/stats') printSessionStats();
        else if (cmd === '/exit' || cmd === '/quit') {
            printSessionStats();
            console.log('Closing neural link...\n');
            rl.close();
            process.exit(0);
        }
        else console.log(`\x1b[31mUnknown command: ${cmd}\x1b[0m (type /help for commands)\n`);

        rl.prompt();
        return;
    }

    await chatLoop(input);
    rl.prompt();
}

/**
 * Recursive Chat Loop supporting Tool Execution
 */
async function chatLoop(message, isToolOutput = false) {
    const startTime = Date.now();
    const pulse = startPulse();

    try {
        const historyForBackend = session.history.slice(-55).map(h => ({
            role: h.role === 'user' ? 'user' : 'assistant',
            content: h.text
        }));

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                deepThinking: session.deepThinking,
                sessionId: session.id,
                source: 'cli_terminal',
                history: historyForBackend,
                isToolOutput // Flag to tell brain this is a tool result
            }),
            signal: AbortSignal.timeout(session.deepThinking ? 120000 : 45000) // 45s normal, 120s deep
        });

        const data = await response.json();
        const responseTime = Date.now() - startTime;
        stopPulse(pulse);

        if (data.success || data.response || data.message) {
            const replyText = data.message || data.response || data.text || "";
            const metadata = formatMetadata(data.metadata || {}, responseTime);

            // 1. If we have reply text, show it (The Acknowledgement)
            if (replyText.trim()) {
                console.log(`\n\x1b[35mSOMA >\x1b[0m ${metadata}`);
                console.log(replyText);
            }

            // 2. Handle Tool Call if present (or embedded JSON)
            let toolCall = data.toolCall;
            if (!toolCall && replyText) {
                const jsonBlock = replyText.match(/```json\s*([\s\S]*?)```/i);
                const inlineJson = replyText.match(/({\s*"tool"\s*:[\s\S]*?})/i);
                const candidate = jsonBlock?.[1] || inlineJson?.[1];
                if (candidate) {
                    try {
                        const parsed = JSON.parse(candidate);
                        if (parsed?.tool) toolCall = parsed;
                    } catch {
                        // ignore parse errors
                    }
                }
            }

            if (toolCall) {
                const { tool, args } = toolCall;
                console.log(`\x1b[90m  [EXECUTING: ${tool}...]\x1b[0m`);
                
                const toolPulse = startPulse();
                try {
                    const lowerTool = String(tool || '').toLowerCase();
                    const isShell =
                        lowerTool === 'shell_exec' ||
                        lowerTool === 'shell/exec' ||
                        lowerTool === 'run_shell' ||
                        lowerTool === 'execute_shell' ||
                        lowerTool === 'exec_shell' ||
                        lowerTool === 'command';

                    const endpoint = isShell
                        ? 'http://127.0.0.1:3001/api/soma/shell/exec'
                        : 'http://127.0.0.1:3001/api/soma/execute-tool';

                    const payload = isShell
                        ? { command: args?.command || args?.cmd || args?.shell || args?.input || args }
                        : { tool, args };

                    const toolExec = await fetch(endpoint, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    const toolData = await toolExec.json();
                    stopPulse(toolPulse);

                    if (toolData.success) {
                        const output = JSON.stringify(toolData.output ?? toolData.result ?? toolData.message ?? toolData);
                        console.log(`\x1b[90m  [SUCCESS: ${tool}]\x1b[0m`);
                        if (output && output !== '""') {
                            const preview = output.length > 2000 ? output.slice(0, 2000) + '…' : output;
                            console.log(`\x1b[90m  [TOOL OUTPUT]\x1b[0m ${preview}`);
                        }
                        
                        // Add to session history so brain sees it
                        session.history.push({ role: 'assistant', text: `[TOOL_CALL] ${tool}` });
                        session.history.push({ role: 'user', text: `[TOOL_OUTPUT] ${output}` });

                        // Recursively call chat with the tool output
                        return await chatLoop(`TOOL_OUTPUT: ${output}`, true);
                    } else {
                        stopPulse(toolPulse);
                        console.log(`\x1b[31m  [FAILED: ${tool}] ${toolData.error}\x1b[0m`);
                        return await chatLoop(`TOOL_ERROR: ${toolData.error}`, true);
                    }
                } catch (e) {
                    stopPulse(toolPulse);
                    console.log(`\x1b[31m  [ERROR] Tool execution request failed\x1b[0m`);
                }
            }

            // Update session for normal messages
            if (!isToolOutput) {
                session.messageCount++;
                session.history.push({ role: 'user', text: message });
                session.history.push({ role: 'soma', text: replyText });
            }

            if (!data.toolCall) console.log(''); // Trailing newline if no tool pending

        } else {
            console.log('\x1b[31mSOMA Error:\x1b[0m', data.error || 'Unknown error');
        }

    } catch (error) {
        stopPulse(pulse);
        console.log('\x1b[31m✗ Connection lost\x1b[0m');
    }
}

// ═══════════════════════════════════════════════════════════
// Main Entry Point
// ═══════════════════════════════════════════════════════════

async function main() {
    printBanner();

    const healthy = await checkHealth();
    if (!healthy) {
        console.log('Exiting...\n');
        process.exit(1);
    }

    rl.on('line', handleInput);
    rl.on('close', () => {
        console.log('\nNeural link closed. Goodbye.\n');
        process.exit(0);
    });

    // Handle Ctrl+C gracefully
    process.on('SIGINT', () => {
        console.log('\n\nInterrupted.');
        printSessionStats();
        console.log('Goodbye.\n');
        process.exit(0);
    });

    rl.prompt();
}

main();
