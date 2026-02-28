import express from 'express';

const router = express.Router();

// Middleware to get Kevin instance from the app or request
const getKevin = (req) => {
    // Try multiple sources for Kevin arbiter
    let kevin = req.app.locals.kevinArbiter;
    
    // Fallback to global SOMA if available
    if (!kevin && global.SOMA && global.SOMA.kevinArbiter) {
        kevin = global.SOMA.kevinArbiter;
    }
    
    // Fallback to global kevinManager (old launcher style)
    if (!kevin && global.kevinManager) {
        kevin = global.kevinManager;
    }
    
    if (!kevin) {
        console.error('[KevinRoutes] Kevin arbiter not found in:', {
            appLocals: !!req.app.locals.kevinArbiter,
            globalSOMA: !!(global.SOMA && global.SOMA.kevinArbiter),
            globalKevin: !!global.kevinManager
        });
    }
    
    return kevin;
};

router.get('/status', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    res.json(kevin.getStatus());
});

router.get('/scan-log', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    res.json(kevin.getScanLog());
});

router.post('/toggle', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    res.json(kevin.toggle());
});

router.post('/chat', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { message, context } = req.body;
    const result = await kevin.chat(message, context);
    res.json(result);
});

// Get current configuration
router.get('/config', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const config = kevin.getConfig ? kevin.getConfig() : kevin.config || {};
    res.json({ success: true, config });
});

// Update configuration
router.post('/config', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const result = kevin.updateConfig(req.body);
    res.json(result);
});

// Internal thinking endpoint for other agents
router.post('/think', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { input, context } = req.body;
    const result = await kevin.think({ input, context });
    res.json(result);
});

// =========================================================================
// 📧 Email Draft & Reply Endpoints
// =========================================================================

// Get pending drafts
router.get('/drafts', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    res.json(kevin.getDrafts());
});

// Draft a paranoid reply to an email
router.post('/draft-reply', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { email, guidance } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, error: 'Email object required' });
    }

    const result = await kevin.draftParanoidReply(email, guidance || '');
    res.json(result);
});

// Approve and send a draft
router.post('/approve-draft', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { draftId } = req.body;
    if (!draftId) {
        return res.status(400).json({ success: false, error: 'draftId required' });
    }

    const result = await kevin.approveDraft(draftId);
    res.json(result);
});

// Reject a draft
router.post('/reject-draft', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { draftId } = req.body;
    if (!draftId) {
        return res.status(400).json({ success: false, error: 'draftId required' });
    }

    const result = kevin.rejectDraft(draftId);
    res.json(result);
});

// Quick reply (draft + auto-send if low risk)
router.post('/quick-reply', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { emailId, message } = req.body;
    if (!emailId) {
        return res.status(400).json({ success: false, error: 'emailId required' });
    }

    const result = await kevin.quickReply(emailId, message || '');
    res.json(result);
});

// =========================================================================
// 🔍 Threat Research Endpoints
// =========================================================================

// Investigate a sender
router.post('/investigate-sender', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { sender } = req.body;
    if (!sender) {
        return res.status(400).json({ success: false, error: 'sender required' });
    }

    const result = await kevin.investigateSender(sender);
    res.json(result);
});

// Investigate a domain
router.post('/investigate-domain', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { domain } = req.body;
    if (!domain) {
        return res.status(400).json({ success: false, error: 'domain required' });
    }

    const result = await kevin.investigateDomain(domain);
    res.json(result);
});

// Investigate a URL
router.post('/investigate-url', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { url } = req.body;
    if (!url) {
        return res.status(400).json({ success: false, error: 'url required' });
    }

    const result = await kevin.investigateUrl(url);
    res.json(result);
});

// Deep investigation of an email (full analysis)
router.post('/deep-investigate', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, error: 'email object required' });
    }

    const result = await kevin.deepInvestigateEmail(email);
    res.json(result);
});

// Research status (check if Tavily is configured)
router.get('/research-status', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    res.json({
        success: true,
        configured: kevin.researchService?.isConfigured() || false,
        message: kevin.researchService?.isConfigured()
            ? 'Tavily research service active'
            : 'Set TAVILY_API_KEY for deep threat research'
    });
});

// =========================================================================
// 📅 Calendar & Task Endpoints
// =========================================================================

// Get calendar status
router.get('/calendar-status', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    res.json(kevin.getCalendarStatus());
});

// Get upcoming calendar events
router.get('/calendar/events', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { timeMin, timeMax, maxResults } = req.query;
    const result = await kevin.getCalendarEvents({
        timeMin,
        timeMax,
        maxResults: maxResults ? parseInt(maxResults) : undefined
    });
    res.json(result);
});

// Create calendar event
router.post('/calendar/events', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const result = await kevin.createCalendarEvent(req.body);
    res.json(result);
});

// Get pending calendar actions
router.get('/calendar/pending', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    res.json(kevin.getPendingCalendarActions());
});

// Approve pending calendar action
router.post('/calendar/approve', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { pendingId } = req.body;
    if (!pendingId) {
        return res.status(400).json({ success: false, error: 'pendingId required' });
    }

    const result = await kevin.approveCalendarAction(pendingId);
    res.json(result);
});

// Reject pending calendar action
router.post('/calendar/reject', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { pendingId } = req.body;
    if (!pendingId) {
        return res.status(400).json({ success: false, error: 'pendingId required' });
    }

    const result = kevin.rejectCalendarAction(pendingId);
    res.json(result);
});

// =========================================================================
// ✅ Action Items Endpoints
// =========================================================================

// Get action items
router.get('/action-items', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { status } = req.query;
    res.json(kevin.getActionItems(status || 'pending'));
});

// Complete action item
router.post('/action-items/complete', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { actionId } = req.body;
    if (!actionId) {
        return res.status(400).json({ success: false, error: 'actionId required' });
    }

    const result = kevin.completeActionItem(actionId);
    res.json(result);
});

// Dismiss action item
router.post('/action-items/dismiss', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { actionId } = req.body;
    if (!actionId) {
        return res.status(400).json({ success: false, error: 'actionId required' });
    }

    const result = kevin.dismissActionItem(actionId);
    res.json(result);
});

// =========================================================================
// 📧 Meeting Requests Endpoints
// =========================================================================

// Get detected meeting requests
router.get('/meeting-requests', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { status } = req.query;
    res.json(kevin.getMeetingRequests(status || 'pending_review'));
});

// Schedule a meeting request
router.post('/meeting-requests/schedule', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { requestId, eventDetails } = req.body;
    if (!requestId || !eventDetails) {
        return res.status(400).json({ success: false, error: 'requestId and eventDetails required' });
    }

    const result = await kevin.scheduleMeetingRequest(requestId, eventDetails);
    res.json(result);
});

// Dismiss meeting request
router.post('/meeting-requests/dismiss', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { requestId } = req.body;
    if (!requestId) {
        return res.status(400).json({ success: false, error: 'requestId required' });
    }

    const result = kevin.dismissMeetingRequest(requestId);
    res.json(result);
});

// Process email for tasks (manual trigger)
router.post('/process-email', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, error: 'email object required' });
    }

    const result = await kevin.processEmailForTasks(email);
    res.json({ success: true, ...result });
});

// Calendar OAuth flow (if needed)
router.get('/calendar/auth-url', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const result = kevin.calendarService.getAuthUrl();
    res.json(result);
});

router.post('/calendar/auth-callback', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { code } = req.body;
    if (!code) {
        return res.status(400).json({ success: false, error: 'Authorization code required' });
    }

    const result = await kevin.calendarService.handleAuthCallback(code);
    res.json(result);
});

// =========================================================================
// 🔔 Notification Endpoints (Slack/Telegram/Discord)
// =========================================================================

// Get notification status
router.get('/notifications/status', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    res.json(kevin.notificationService?.getStatus() || { error: 'Notification service not initialized' });
});

// Send a test notification
router.post('/notifications/test', async (req, res) => {
    try {
        const kevin = getKevin(req);
        if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

        const { channel } = req.body;
        if (!channel) {
            return res.status(400).json({ success: false, error: 'channel required (slack, telegram, discord)' });
        }

        const result = await kevin.notificationService?.testChannel(channel);
        res.json(result || { success: false, error: 'Notification service not initialized' });
    } catch (error) {
        console.error('[KevinRoutes] Notify Test Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Configure notification channel
router.post('/notifications/configure', async (req, res) => {
    try {
        const kevin = getKevin(req);
        if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

        const { channel, config } = req.body;
        if (!channel || !config) {
            return res.status(400).json({ success: false, error: 'channel and config required' });
        }

        const result = kevin.notificationService?.configure(channel, config);
        res.json(result || { success: false, error: 'Notification service not initialized' });
    } catch (error) {
        console.error('[KevinRoutes] Notify Config Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send a custom alert
router.post('/notifications/send', async (req, res) => {
    try {
        const kevin = getKevin(req);
        if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

        const { title, message, severity, type } = req.body;
        if (!message) {
            return res.status(400).json({ success: false, error: 'message required' });
        }

        const result = await kevin.notificationService?.sendSecurityAlert({
            type: type || 'CUSTOM_ALERT',
            title: title || 'Kevin Alert',
            message,
            severity: severity || 'medium'
        });
        res.json(result || { success: false, error: 'Notification service not initialized' });
    } catch (error) {
        console.error('[KevinRoutes] Notify Send Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get notification history
router.get('/notifications/history', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const status = kevin.notificationService?.getStatus();
    res.json({
        success: true,
        history: status?.recentAlerts || []
    });
});

// =========================================================================
// 🛡️ Threat Database Endpoints
// =========================================================================

// Get threat database stats
router.get('/threats/stats', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    res.json(kevin.threatDatabase?.getStats() || { error: 'Threat database not initialized' });
});

// Check attachment for threats
router.post('/threats/check-attachment', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { filename, content } = req.body;
    if (!filename) {
        return res.status(400).json({ success: false, error: 'filename required' });
    }

    const result = kevin.threatDatabase?.analyzeAttachment(filename, content);
    res.json(result || { success: false, error: 'Threat database not initialized' });
});

// Check email for phishing
router.post('/threats/check-phishing', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, error: 'email object required' });
    }

    const result = kevin.threatDatabase?.checkPhishing(email);
    res.json(result || { success: false, error: 'Threat database not initialized' });
});

// Categorize an email
router.post('/threats/categorize', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, error: 'email object required' });
    }

    const result = kevin.threatDatabase?.categorizeEmail(email);
    res.json(result || { success: false, error: 'Threat database not initialized' });
});

// Mark sender as safe
router.post('/threats/safe-sender', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { sender } = req.body;
    if (!sender) {
        return res.status(400).json({ success: false, error: 'sender required' });
    }

    const result = kevin.threatDatabase?.markSenderSafe(sender);
    res.json(result || { success: false, error: 'Threat database not initialized' });
});

// Block a sender
router.post('/threats/block-sender', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { sender } = req.body;
    if (!sender) {
        return res.status(400).json({ success: false, error: 'sender required' });
    }

    const result = kevin.threatDatabase?.blockSender(sender);
    res.json(result || { success: false, error: 'Threat database not initialized' });
});

// Add malicious hash to database
router.post('/threats/add-hash', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });

    const { hash } = req.body;
    if (!hash) {
        return res.status(400).json({ success: false, error: 'hash required' });
    }

    kevin.threatDatabase?.addMaliciousHash(hash);
    res.json({ success: true, message: 'Hash added to threat database' });
});

// =========================================================================
// 📱 SMS Endpoints
// =========================================================================

// Get SMS configuration
router.get('/sms/config', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    
    if (kevin.smsService) {
        res.json(kevin.smsService.getConfig());
    } else {
        res.status(500).json({ success: false, error: 'SMS service not initialized' });
    }
});

// Get supported carriers
router.get('/sms/carriers', async (req, res) => {
    const kevin = getKevin(req);
    if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
    
    if (kevin.smsService) {
        res.json({ success: true, carriers: kevin.smsService.getSupportedCarriers() });
    } else {
        res.status(500).json({ success: false, error: 'SMS service not initialized' });
    }
});

// Configure SMS
router.post('/sms/configure', async (req, res) => {
    try {
        const kevin = getKevin(req);
        if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
        
        const settings = req.body;
        if (!kevin.smsService) {
            return res.status(500).json({ success: false, error: 'SMS service not initialized' });
        }

        console.log('[KevinRoutes] Configuring SMS...');
        const result = await kevin.smsService.configure(settings);
        console.log('[KevinRoutes] SMS Config result:', result);
        res.json(result);
    } catch (error) {
        console.error('[KevinRoutes] SMS Configure Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send test SMS
router.post('/sms/test', async (req, res) => {
    try {
        const kevin = getKevin(req);
        if (!kevin) return res.status(503).json({ success: false, error: 'Kevin offline' });
        
        if (kevin.smsService) {
            const result = await kevin.smsService.sendTest();
            res.json(result);
        } else {
            res.status(500).json({ success: false, error: 'SMS service not initialized' });
        }
    } catch (error) {
        console.error('[KevinRoutes] SMS Test Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
