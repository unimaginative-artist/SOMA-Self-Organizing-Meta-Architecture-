/**
 * KevinSMSService - Two-Way SMS Communication via Email-to-SMS Gateways
 *
 * Features:
 * - Auto-detect carrier from phone number (via lookup API)
 * - Send SMS via email-to-SMS gateways (free!)
 * - Receive SMS replies (carrier sends email back)
 * - Scheduled morning briefings
 * - Live two-way chat with Kevin
 *
 * Supported Carriers (US):
 * - AT&T, Verizon, T-Mobile, Sprint, US Cellular, Metro PCS, Boost, Cricket, etc.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');

// Email-to-SMS gateway domains by carrier
const CARRIER_GATEWAYS = {
    'att': { name: 'AT&T', sms: 'txt.att.net', mms: 'mms.att.net' },
    'verizon': { name: 'Verizon', sms: 'vtext.com', mms: 'vzwpix.com' },
    'tmobile': { name: 'T-Mobile', sms: 'tmomail.net', mms: 'tmomail.net' },
    'sprint': { name: 'Sprint', sms: 'messaging.sprintpcs.com', mms: 'pm.sprint.com' },
    'uscellular': { name: 'US Cellular', sms: 'email.uscc.net', mms: 'mms.uscc.net' },
    'metropcs': { name: 'Metro PCS', sms: 'mymetropcs.com', mms: 'mymetropcs.com' },
    'boost': { name: 'Boost Mobile', sms: 'sms.myboostmobile.com', mms: 'myboostmobile.com' },
    'cricket': { name: 'Cricket', sms: 'sms.cricketwireless.net', mms: 'mms.cricketwireless.net' },
    'virgin': { name: 'Virgin Mobile', sms: 'vmobl.com', mms: 'vmpix.com' },
    'googlefi': { name: 'Google Fi', sms: 'msg.fi.google.com', mms: 'msg.fi.google.com' },
    'xfinity': { name: 'Xfinity Mobile', sms: 'vtext.com', mms: 'mypixmessages.com' },
    'visible': { name: 'Visible', sms: 'vtext.com', mms: 'vzwpix.com' },
    'mint': { name: 'Mint Mobile', sms: 'tmomail.net', mms: 'tmomail.net' }
};

class KevinSMSService extends EventEmitter {
    constructor(options = {}) {
        super();

        this.configPath = options.configPath ||
            path.join(process.cwd(), 'data', 'kevin', 'sms_config.json');
        this.emailManager = options.emailManager; // Reference to KevinEmailManager

        // User configuration
        this.config = {
            enabled: false,
            phoneNumber: null,
            carrier: null,
            carrierGateway: null,

            // Scheduled messages
            morningBriefing: {
                enabled: false,
                time: '07:00', // 24h format
                timezone: 'America/New_York',
                includeThreats: true,
                includeCalendar: true,
                includeActionItems: true,
                includePendingEmails: true
            },

            // Live chat
            liveChatEnabled: true,

            // Rate limiting
            maxMessagesPerHour: 20,
            maxMessageLength: 160 // SMS limit
        };

        // Message history
        this.messageHistory = [];
        this.pendingReplies = new Map();

        // Rate limiting
        this.messageCount = 0;
        this.messageCountResetAt = Date.now() + 3600000;

        // Scheduled job reference
        this.morningJob = null;

        this._loadConfig();
    }

    _loadConfig() {
        try {
            if (fs.existsSync(this.configPath)) {
                const saved = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
                Object.assign(this.config, saved);
                console.log('[KevinSMS] Loaded configuration');

                if (this.config.enabled && this.config.phoneNumber) {
                    console.log(`[KevinSMS] SMS enabled for: ${this._maskPhone(this.config.phoneNumber)}`);
                }
            }
        } catch (e) {
            console.warn('[KevinSMS] No saved config found');
        }
    }

    _saveConfig() {
        try {
            const dir = path.dirname(this.configPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
        } catch (e) {
            console.error('[KevinSMS] Failed to save config:', e.message);
        }
    }

    _maskPhone(phone) {
        if (!phone) return 'none';
        const clean = phone.replace(/\D/g, '');
        return `***-***-${clean.slice(-4)}`;
    }

    _normalizePhone(phone) {
        // Remove all non-digits
        let clean = phone.replace(/\D/g, '');
        // Remove leading 1 if 11 digits
        if (clean.length === 11 && clean.startsWith('1')) {
            clean = clean.slice(1);
        }
        return clean;
    }

    /**
     * Get supported carriers list
     */
    getSupportedCarriers() {
        return Object.entries(CARRIER_GATEWAYS).map(([id, info]) => ({
            id,
            name: info.name
        }));
    }

    /**
     * Auto-detect carrier from phone number using free lookup
     * Falls back to manual selection if lookup fails
     */
    async detectCarrier(phoneNumber) {
        const normalized = this._normalizePhone(phoneNumber);

        if (normalized.length !== 10) {
            return {
                success: false,
                error: 'Invalid phone number. Please enter a 10-digit US number.'
            };
        }

        // Try NumVerify or similar free API
        // For now, we'll use a simple prefix-based heuristic as fallback
        // In production, you'd use a carrier lookup API

        try {
            // Attempt carrier lookup via free API
            const result = await this._lookupCarrier(normalized);
            if (result.success) {
                return result;
            }
        } catch (e) {
            console.log('[KevinSMS] Carrier lookup failed, using manual selection');
        }

        // Return list for manual selection
        return {
            success: false,
            requiresManualSelection: true,
            carriers: this.getSupportedCarriers(),
            message: 'Could not auto-detect carrier. Please select from the list.'
        };
    }

    async _lookupCarrier(phoneNumber) {
        // Free carrier lookup using numverify.com (requires free API key)
        // Or use freecarrierlookup.com (no API needed, scraping)

        // For simplicity, we'll just return manual selection needed
        // In production, integrate with a proper carrier lookup API

        return { success: false };
    }

    /**
     * Configure SMS settings
     */
    async configure(settings) {
        console.log('[KevinSMS] Configuring SMS settings...');
        const { phoneNumber, carrier, morningBriefing } = settings;

        if (phoneNumber) {
            const normalized = this._normalizePhone(phoneNumber);
            if (normalized.length !== 10) {
                return { success: false, error: 'Invalid phone number' };
            }
            this.config.phoneNumber = normalized;
        }

        if (carrier) {
            if (!CARRIER_GATEWAYS[carrier]) {
                return {
                    success: false,
                    error: 'Unknown carrier',
                    supportedCarriers: this.getSupportedCarriers()
                };
            }
            this.config.carrier = carrier;
            this.config.carrierGateway = CARRIER_GATEWAYS[carrier].sms;
        }

        if (morningBriefing) {
            Object.assign(this.config.morningBriefing, morningBriefing);
        }

        // Enable if we have both phone and carrier
        if (this.config.phoneNumber && this.config.carrier) {
            this.config.enabled = true;
        }

        this._saveConfig();
        console.log('[KevinSMS] Configuration saved');

        // Schedule morning briefing if enabled
        if (this.config.morningBriefing.enabled) {
            this._scheduleMorningBriefing();
            console.log('[KevinSMS] Briefing scheduled');
        }

        console.log('[KevinSMS] Configure complete');
        return {
            success: true,
            enabled: this.config.enabled,
            phoneNumber: this._maskPhone(this.config.phoneNumber),
            carrier: CARRIER_GATEWAYS[this.config.carrier]?.name,
            morningBriefing: this.config.morningBriefing
        };
    }

    /**
     * Get current configuration (masked)
     */
    getConfig() {
        return {
            enabled: this.config.enabled,
            phoneNumber: this._maskPhone(this.config.phoneNumber),
            carrier: this.config.carrier ? CARRIER_GATEWAYS[this.config.carrier]?.name : null,
            carrierId: this.config.carrier,
            morningBriefing: this.config.morningBriefing,
            liveChatEnabled: this.config.liveChatEnabled,
            messageHistory: this.messageHistory.slice(-20)
        };
    }

    /**
     * Get the email address to send SMS to
     */
    getSMSEmailAddress() {
        if (!this.config.phoneNumber || !this.config.carrierGateway) {
            return null;
        }
        return `${this.config.phoneNumber}@${this.config.carrierGateway}`;
    }

    /**
     * Send an SMS message via email gateway
     */
    async sendSMS(message, options = {}) {
        if (!this.config.enabled) {
            return { success: false, error: 'SMS not configured' };
        }

        // Rate limiting
        if (Date.now() > this.messageCountResetAt) {
            this.messageCount = 0;
            this.messageCountResetAt = Date.now() + 3600000;
        }

        if (this.messageCount >= this.config.maxMessagesPerHour) {
            return { success: false, error: 'Rate limit exceeded' };
        }

        const smsEmail = this.getSMSEmailAddress();
        if (!smsEmail) {
            return { success: false, error: 'SMS gateway not configured' };
        }

        // Truncate message if too long
        let truncatedMessage = message;
        if (message.length > this.config.maxMessageLength) {
            truncatedMessage = message.substring(0, this.config.maxMessageLength - 3) + '...';
        }

        // Format message with Kevin signature
        const formattedMessage = options.skipSignature
            ? truncatedMessage
            : `${truncatedMessage}\n-KEVIN`;

        try {
            // Use email manager to send
            if (!this.emailManager) {
                console.error('[KevinSMS] Email manager not available');
                return { success: false, error: 'Email manager not available. Configure email credentials first.' };
            }

            // Check if email credentials are configured
            if (!process.env.EMAIL_ADDRESS || !process.env.APP_PASSWORD) {
                console.error('[KevinSMS] Email credentials not configured');
                return { 
                    success: false, 
                    error: 'Email credentials not configured. Set EMAIL_ADDRESS and APP_PASSWORD in .env to enable SMS.' 
                };
            }

            console.log(`[KevinSMS] Sending SMS to: ${smsEmail}`);
            const result = await this.emailManager.sendEmail(
                smsEmail,
                '', // SMS gateways ignore subject
                formattedMessage,
                { isPlainText: true }
            );

            if (result.success) {
                this.messageCount++;

                // Log message
                this.messageHistory.push({
                    direction: 'outbound',
                    message: truncatedMessage,
                    timestamp: new Date().toISOString(),
                    type: options.type || 'general'
                });

                // Keep history limited
                if (this.messageHistory.length > 100) {
                    this.messageHistory = this.messageHistory.slice(-100);
                }

                console.log('[KevinSMS] SMS sent successfully');
                this.emit('sms:sent', { message: truncatedMessage });
            } else {
                console.error('[KevinSMS] Failed to send SMS:', result.error);
            }

            return result;

        } catch (error) {
            console.error('[KevinSMS] Send error:', error.message);
            return { 
                success: false, 
                error: `Failed to send SMS: ${error.message}. Ensure email credentials are valid.` 
            };
        }
    }

    /**
     * Handle incoming SMS (received as email from carrier gateway)
     */
    async handleIncomingSMS(email) {
        // Check if this email is from our configured phone's carrier gateway
        const fromAddress = email.from?.toLowerCase() || '';
        const expectedDomain = this.config.carrierGateway;

        if (!expectedDomain || !fromAddress.includes(expectedDomain)) {
            return { handled: false };
        }

        // Extract the phone number from the from address
        const phoneMatch = fromAddress.match(/(\d{10})/);
        if (!phoneMatch) {
            return { handled: false };
        }

        const fromPhone = phoneMatch[1];

        // Verify it's from our configured number
        if (fromPhone !== this.config.phoneNumber) {
            return { handled: false };
        }

        // Extract message content (SMS replies are usually plain text)
        const messageBody = email.textBody || email.body || '';
        const cleanMessage = messageBody.trim();

        if (!cleanMessage) {
            return { handled: true, response: null };
        }

        // Log incoming message
        this.messageHistory.push({
            direction: 'inbound',
            message: cleanMessage,
            timestamp: new Date().toISOString(),
            type: 'chat'
        });

        console.log(`[KevinSMS] Received SMS: "${cleanMessage}"`);

        // Emit event for Kevin to process
        this.emit('sms:received', {
            message: cleanMessage,
            from: this._maskPhone(fromPhone),
            timestamp: new Date().toISOString()
        });

        return {
            handled: true,
            message: cleanMessage,
            requiresResponse: this.config.liveChatEnabled
        };
    }

    /**
     * Send morning briefing
     */
    async sendMorningBriefing(briefingData) {
        if (!this.config.enabled || !this.config.morningBriefing.enabled) {
            return { success: false, error: 'Morning briefing not enabled' };
        }

        const parts = [];

        // Greeting
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good morning' : 'Good afternoon';
        parts.push(`${greeting}! Here's your briefing:`);

        // Threat summary
        if (this.config.morningBriefing.includeThreats && briefingData.threats) {
            if (briefingData.threats.count > 0) {
                parts.push(`🚨 ${briefingData.threats.count} threats blocked overnight`);
            } else {
                parts.push(`✅ No threats detected overnight`);
            }
        }

        // Pending emails
        if (this.config.morningBriefing.includePendingEmails && briefingData.pendingEmails) {
            parts.push(`📧 ${briefingData.pendingEmails} emails need attention`);
        }

        // Calendar
        if (this.config.morningBriefing.includeCalendar && briefingData.calendar) {
            if (briefingData.calendar.length > 0) {
                parts.push(`📅 ${briefingData.calendar.length} events today`);
                // Add first event
                const first = briefingData.calendar[0];
                parts.push(`  Next: ${first.title} at ${first.time}`);
            } else {
                parts.push(`📅 No events scheduled`);
            }
        }

        // Action items
        if (this.config.morningBriefing.includeActionItems && briefingData.actionItems) {
            if (briefingData.actionItems.length > 0) {
                parts.push(`📋 ${briefingData.actionItems.length} action items pending`);
            }
        }

        // Combine into SMS (respect length limit)
        let message = parts.join('\n');

        // If too long, send as multiple messages
        if (message.length > 300) {
            // Send summary first
            await this.sendSMS(parts.slice(0, 3).join('\n'), { type: 'briefing', skipSignature: true });

            // Then details
            if (parts.length > 3) {
                await this.sendSMS(parts.slice(3).join('\n'), { type: 'briefing' });
            }
        } else {
            await this.sendSMS(message, { type: 'briefing' });
        }

        return { success: true, message: 'Briefing sent' };
    }

    /**
     * Schedule the morning briefing
     */
    _scheduleMorningBriefing() {
        // Clear existing job
        if (this.morningJob) {
            clearTimeout(this.morningJob);
        }

        if (!this.config.morningBriefing.enabled) {
            return;
        }

        const scheduleNext = () => {
            const now = new Date();
            const [hours, minutes] = this.config.morningBriefing.time.split(':').map(Number);

            let next = new Date(now);
            next.setHours(hours, minutes, 0, 0);

            // If time already passed today, schedule for tomorrow
            if (next <= now) {
                next.setDate(next.getDate() + 1);
            }

            const msUntil = next.getTime() - now.getTime();

            console.log(`[KevinSMS] Morning briefing scheduled for ${next.toLocaleString()}`);

            this.morningJob = setTimeout(async () => {
                // Emit event to gather briefing data
                this.emit('briefing:needed', {
                    callback: async (data) => {
                        await this.sendMorningBriefing(data);
                    }
                });

                // Schedule next day
                scheduleNext();
            }, msUntil);
        };

        scheduleNext();
    }

    /**
     * Send a test SMS
     */
    async sendTest() {
        return await this.sendSMS('This is a test message from KEVIN. If you received this, SMS is working! Reply to chat.', {
            type: 'test'
        });
    }

    /**
     * Disable SMS
     */
    disable() {
        this.config.enabled = false;
        if (this.morningJob) {
            clearTimeout(this.morningJob);
            this.morningJob = null;
        }
        this._saveConfig();
        return { success: true, message: 'SMS disabled' };
    }
}

module.exports = { KevinSMSService, CARRIER_GATEWAYS };
