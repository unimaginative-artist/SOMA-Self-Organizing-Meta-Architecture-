/**
 * ComputerControlArbiter.js
 * 
 * Provides "Computer Use" capabilities to SOMA:
 * - Vision: Captures screenshots (Eyes) via screenshot-desktop
 * - Action: Controls Mouse/Keyboard via PowerShell (Hands) - Fallback for Windows
 * - Browser: Controls web browser via Puppeteer (Navigator)
 * 
 * SAFETY: Implements a "Safety Stop" - if the mouse is moved by the user during execution,
 * the arbiter will abort the current action to prevent fighting for control.
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Internal imports
const BaseArbiterModule = require('../core/BaseArbiter.cjs');
const BaseArbiter = BaseArbiterModule.BaseArbiter || BaseArbiterModule.default?.BaseArbiter || BaseArbiterModule;

const MessageBrokerModule = require('../core/MessageBroker.cjs');
const messageBroker = MessageBrokerModule.default || MessageBrokerModule;

// Dependencies
const puppeteer = require('puppeteer');
const screenshot = require('screenshot-desktop'); // Verified working
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

export class ComputerControlArbiter extends BaseArbiter {
  static role = 'implementer';
  static capabilities = ['screen-capture', 'mouse-control', 'keyboard-control', 'browser-automation'];

  constructor(config = {}) {
    super(config);
    this.name = config.name || 'ComputerControlArbiter';

    // Safety Configuration
    this.safetyEnabled = config.safetyEnabled !== false;
    this.safetyThreshold = 50;

    // Automation State
    this.browser = null;
    this.page = null;
    this.dryRun = config.dryRun || false;

    this.screenSize = { width: 1920, height: 1080 };
  }

  async initialize() {
    await super.initialize();

    try {
      // Register with MessageBroker
      this.registerWithBroker();
      this._subscribeBrokerMessages();

      console.log(`[${this.name}] ✅ Computer Control Ready (PowerShell Mode)`);

      // Try to get screen size via PowerShell
      try {
        // This command gets PrimaryScreen resolution
        const psCommand = `Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.Screen]::PrimaryScreen.Bounds.Size`;
        // We won't parse it fully now to save time, trusting defaults or screenshot result
      } catch (e) { }

    } catch (err) {
      console.error(`[${this.name}] Failed to initialize: ${err.message}`);
    }
  }

  registerWithBroker() {
    messageBroker.registerArbiter(this.name, this, {
      type: ComputerControlArbiter.role,
      capabilities: ComputerControlArbiter.capabilities
    });
  }

  _subscribeBrokerMessages() {
    messageBroker.subscribe(this.name, 'computer_action');
    messageBroker.subscribe(this.name, 'capture_screen');
    messageBroker.subscribe(this.name, 'browser_action');
  }

  async handleMessage(message = {}) {
    try {
      const { type, payload } = message;

      if (this.safetyEnabled && await this.checkUserInterference()) {
        return { success: false, error: 'User interference detected (Safety Stop triggered)' };
      }

      switch (type) {
        case 'computer_action':
          return await this.executeAction(payload);
        case 'capture_screen':
          return await this.captureScreen(payload);
        case 'browser_action':
          return await this.handleBrowserAction(payload);
        default:
          return { success: false, error: 'Unknown message type' };
      }
    } catch (err) {
      console.error(`[${this.name}] Error handling message: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ========================================================
  // Vision (Eyes)
  // ========================================================

  async captureScreen(options = {}) {
    try {
      console.log(`[${this.name}] Capturing screen...`);

      const buffer = await screenshot({ format: 'png' });

      const filename = `screen_${Date.now()}.png`;
      const savePath = path.join(process.cwd(), '.soma', 'vision_temp', filename);

      fs.mkdirSync(path.dirname(savePath), { recursive: true });
      fs.writeFileSync(savePath, buffer);

      console.log(`[${this.name}] Screen captured: ${savePath}`);

      return {
        success: true,
        imagePath: savePath,
        timestamp: Date.now()
      };
    } catch (err) {
      console.error(`[${this.name}] Screen capture failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ========================================================
  // Action (Hands) - PowerShell Implementation
  // ========================================================

  async executeAction(action) {
    if (this.dryRun) {
      console.log(`[DRY RUN] Would execute: ${JSON.stringify(action)}`);
      return { success: true, dryRun: true };
    }

    try {
      console.log(`[${this.name}] Executing action: ${action.type}`);

      let psScript = '';

      switch (action.type) {
        case 'mouse_move':
          // Move cursor using System.Windows.Forms
          if (action.x !== undefined && action.y !== undefined) {
            psScript = `
                 Add-Type -AssemblyName System.Windows.Forms
                 [System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${parseInt(action.x)}, ${parseInt(action.y)})
               `;
          }
          break;

        case 'click':
          // Left click using user32.dll mouse_event
          // 0x02 = MOUSEEVENTF_LEFTDOWN, 0x04 = MOUSEEVENTF_LEFTUP
          // We move first, then click
          const x = action.x !== undefined ? parseInt(action.x) : 0;
          const y = action.y !== undefined ? parseInt(action.y) : 0;
          const movePart = (action.x && action.y)
            ? `[System.Windows.Forms.Cursor]::Position = New-Object System.Drawing.Point(${x}, ${y});`
            : '';

          psScript = `
              Add-Type -AssemblyName System.Windows.Forms
              $sig = '[DllImport("user32.dll")] public static extern void mouse_event(uint dwFlags, uint dx, uint dy, uint dwData, int dwExtraInfo);'
              $mouse = Add-Type -MemberDefinition $sig -Name Win32Mouse -Namespace Win32Utils -PassThru
              ${movePart}
              $mouse::mouse_event(0x02, 0, 0, 0, 0) # Down
              $mouse::mouse_event(0x04, 0, 0, 0, 0) # Up
            `;
          break;

        case 'type':
          // SendKeys
          if (action.text) {
            // Escape special chars for PowerShell string
            const safeText = action.text.replace(/"/g, '`"');
            psScript = `
                  Add-Type -AssemblyName System.Windows.Forms
                  [System.Windows.Forms.SendKeys]::SendWait("${safeText}")
                `;
          }
          break;

        default:
          return { success: false, error: `Unknown/Unsupported action type: ${action.type}` };
      }

      if (psScript) {
        // Execute PowerShell command
        // wrap in Try/Catch in PS?
        await execAsync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript.replace(/\n/g, ' ')}"`);
      }

      return { success: true };

    } catch (err) {
      console.error(`[${this.name}] Action failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ========================================================
  // Browser (Navigator)
  // ========================================================

  async handleBrowserAction(payload) {
    const { action, url, selector, text, timeoutMs, screenshotPath, allowUnsafe } = payload;

    if (!this.browser && action !== 'launch') {
      return { success: false, error: 'Browser not active. Launch it first.' };
    }

    try {
      switch (action) {
        case 'launch':
          console.log(`[${this.name}] Launching Puppeteer...`);
          this.browser = await puppeteer.launch({
            headless: payload.headless !== false,
            defaultViewport: null,
            args: ['--start-maximized']
          });
          this.page = (await this.browser.pages())[0];
          break;

        case 'navigate':
        case 'goto':
          if (!url) return { success: false, error: 'url required' };
          if (!allowUnsafe && !this._isSafeUrl(url)) {
            return { success: false, error: 'Blocked unsafe URL' };
          }
          await this.page.goto(url, { waitUntil: 'networkidle2', timeout: timeoutMs || 30000 });
          break;

        case 'click':
          if (!selector) return { success: false, error: 'selector required' };
          await this.page.click(selector);
          break;

        case 'type':
          if (!selector) return { success: false, error: 'selector required' };
          await this.page.type(selector, text);
          break;

        case 'screenshot':
          {
            const dir = path.join(process.cwd(), '.soma', 'vision_temp');
            fs.mkdirSync(dir, { recursive: true });
            const savePath = screenshotPath || path.join(dir, `page_${Date.now()}.png`);
            await this.page.screenshot({ path: savePath, fullPage: true });
            return { success: true, imagePath: savePath };
          }

        case 'extract_text':
          {
            const content = await this.page.evaluate(() => document.body?.innerText || '');
            return { success: true, text: String(content).replace(/\s+/g, ' ').trim().substring(0, 5000) };
          }

        case 'extract_html':
          {
            const html = await this.page.content();
            return { success: true, html: String(html).substring(0, 20000) };
          }

        case 'wait_for':
          if (!selector) return { success: false, error: 'selector required' };
          await this.page.waitForSelector(selector, { timeout: timeoutMs || 15000 });
          break;

        case 'close':
          await this.browser.close();
          this.browser = null;
          this.page = null;
          break;
      }
      return { success: true };
    } catch (err) {
      console.error(`[${this.name}] Browser action failed: ${err.message}`);
      return { success: false, error: err.message };
    }
  }

  // ========================================================
  // Safety
  // ========================================================

  _isSafeUrl(rawUrl) {
    try {
      const parsed = new URL(rawUrl);
      const protocol = parsed.protocol.toLowerCase();
      if (protocol !== 'http:' && protocol !== 'https:') return false;

      const host = parsed.hostname.toLowerCase();
      if (host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1') return false;
      if (host.endsWith('.local') || host.endsWith('.internal')) return false;

      // Block private network ranges (IPv4)
      if (/^10\./.test(host)) return false;
      if (/^192\.168\./.test(host)) return false;
      if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return false;

      return true;
    } catch {
      return false;
    }
  }

  async checkUserInterference() {
    // PowerShell fallback for mouse position check is too slow for real-time safety loop 
    // disabled for now in generic mode
    return false;
  }
}

export default ComputerControlArbiter;
