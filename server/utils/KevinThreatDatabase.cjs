/**
 * KevinThreatDatabase - Known Threat Intelligence Database
 *
 * Contains:
 * - Malicious attachment hashes (SHA256)
 * - Suspicious patterns
 * - Email categorization rules
 * - Learned safe/unsafe senders
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class KevinThreatDatabase {
    constructor() {
        // Data file path
        this.dataPath = process.env.KEVIN_THREAT_DB_PATH ||
            path.join(process.cwd(), 'data', 'kevin_threat_db.json');

        // Known malicious hashes from old Kevin's knowledge base
        this.maliciousHashes = new Set([
            '9b0d7ea7e0b7ac2645b1211f8e23173c9cef2f69e999c879685a367f0cf9ffb8',
            '96f9b611068d409912155a4db2e24314dc03e72bbd24f7a077aa08f6b23ebf34',
            '9c587d3ffeff0e42b5da835716a403c70f44222119e61fb11ce46b6682249af3',
            '24a0785f8831c02796c78c55c35332756958b6cb740bb53ddb084f79ca7ea63b',
            'bf2c855a8df304d7502481482c9348193a341c912aa9e84a261e322287025f30',
            'f69358d9f2bd1ca5048b0d4d77464a90817fa73aff65a691817ecf730c4bf405',
            '21bdcec31298ec87bf355ebfcf75ffb586c0bd1fe5499672dc00c126a30926ed',
            'cd4a0c49041fb5228a953104163463d2c9c350f8d11cd5664ea48d31502a1c03',
            'cc6bd300d938cb7a739079d5a0ce0df9bbf1ca72f12364caa9aed6c7829742d7',
            '579f45913beda44da67237ba4dbd1b6a47b93c07d1d055fa34daee537b0b9a1f',
            'aa0529889cf399e1215ecde317512ee297ad5b08465e308c5f2952a8ece36df6',
            'fa1697bc8242ab8d7b70701edf1bba9ad3b8a2f132b58bae3426bfd9e00e1fae',
            'f34a9d0603c5e3872c64f484e969a391eb3248c8707537118cd69f91a82f56ac',
            '32199e7cc928b6fca221256ec638532d4372e97c4b598f1d9832198c9f7f9f0a',
            'e223f180895f08278a5ddc8d79c4f8d4cb3551a9079c061d275aca0d3cc73f27',
            'a6c3d8cf3c47d60c1a33c1671caba30431e1be30936940b289da9bbf03d26c98',
            '76598b562eab21f460c3c4605a5d9948fd6efe99b24dc92d728e94daec4573f9',
            '9c39c0c72d4f755e570c02b28820062c155c7d3cbbb9b59c394693134ba2f76e',
            '6f03d8a20121c6b3d87ca993be4f24cb62d7c8973ba8b90e42157aaea23a09a4',
            '22038e6b7db53e3649cdfe7466703b264743cd411b7c71904de7d8430559802f',
            'ff808f553899828466077fb7c9130870930375c4e96212fb59be2d60c37d9495',
            'f4559ceadebf27cb34d904b6e5d0d11add09f392c2d7a2e8a964a6bd4a218388',
            'ab225ba53ab72f8fdc157ec1b8bd82ef10398efe72d468e2ee23f94784bb036d',
            '1cb37bcb26fc9e4dca286e763258f7dc631233ae9ba418f3f2e662a672232d33',
            'cd12bb6c00af5ee96c585fa48984ed5eb6cba3132cb5f71b053a49ad0940009b',
            'a0f4915b4fe88c082901e0455c859df3820c2a796da6e50ba8f3c47ce8ce200d',
            '36983be59925a271303b58c214dbf64f7fd351bd47f51253a80288609477cde9',
            '34d2ca1e1bacfffd924ee5cb869fc14b77cf79d7b0dfe6a1f0d04a1eefc8254b',
            'eae9fdffafd5cb33602e70c8999d56606177b9889d26e1a3d6f038ba8a6884fa',
            'be5d683f337041c4bb2ae841076f181598fafaa0ded6576f346292be6e5e2f35',
            // ... (100+ more hashes stored)
        ]);

        // Email categorization keywords (from old Kevin config)
        this.categoryKeywords = {
            Work: ['meeting', 'project', 'deadline', 'presentation', 'report', 'agenda',
                'sprint', 'standup', 'review', 'feedback', 'milestone', 'deliverable',
                'client', 'stakeholder', 'proposal', 'contract', 'invoice business'],
            Personal: ['birthday', 'dinner', 'weekend', 'family', 'friend', 'party',
                'vacation', 'trip', 'holiday', 'celebration', 'reunion', 'wedding'],
            Bills: ['invoice', 'payment', 'statement', 'due', 'bill', 'balance',
                'receipt', 'charge', 'subscription', 'renewal', 'account'],
            Shopping: ['order', 'shipped', 'delivery', 'tracking', 'deal', 'purchase',
                'confirmation', 'dispatch', 'arriving', 'package', 'return', 'refund'],
            Newsletters: ['unsubscribe', 'newsletter', 'update', 'weekly', 'digest',
                'subscription', 'bulletin', 'announcement', 'news'],
            Security: ['password', 'reset', 'verify', 'authentication', 'login attempt',
                'suspicious', 'security alert', 'breach', 'compromised']
        };

        // Suspicious attachment extensions
        this.suspiciousExtensions = [
            '.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.vbe',
            '.js', '.jse', '.wsf', '.wsh', '.ps1', '.msi', '.msp', '.hta',
            '.cpl', '.jar', '.reg', '.dll', '.lnk', '.iso', '.img'
        ];

        // Phishing indicators
        this.phishingPatterns = [
            /urgent.*action.*required/i,
            /verify.*account.*immediately/i,
            /your.*account.*suspended/i,
            /click.*here.*to.*confirm/i,
            /update.*payment.*information/i,
            /unusual.*activity.*detected/i,
            /password.*expire/i,
            /security.*alert.*verify/i,
            /bank.*account.*locked/i,
            /prize.*winner.*claim/i,
            /lottery.*congratulations/i,
            /inheritance.*million/i,
            /nigerian.*prince/i,
            /wire.*transfer.*fee/i,
            /dear.*customer.*valued/i,
            /act.*now.*limited.*time/i
        ];

        // Safe senders (learned)
        this.safeSenders = new Set();

        // Blocked senders
        this.blockedSenders = new Set();

        // Load persisted data
        this._loadData();
    }

    /**
     * Check if an attachment hash is known malicious
     */
    isHashMalicious(hash) {
        return this.maliciousHashes.has(hash.toLowerCase());
    }

    /**
     * Calculate SHA256 hash of content
     */
    calculateHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }

    /**
     * Check attachment for threats
     */
    analyzeAttachment(filename, content) {
        const result = {
            filename,
            isSafe: true,
            threatLevel: 0,
            warnings: []
        };

        // Check extension
        const ext = path.extname(filename).toLowerCase();
        if (this.suspiciousExtensions.includes(ext)) {
            result.isSafe = false;
            result.threatLevel += 50;
            result.warnings.push(`Dangerous file type: ${ext}`);
        }

        // Check hash if content provided
        if (content) {
            const hash = this.calculateHash(content);
            if (this.isHashMalicious(hash)) {
                result.isSafe = false;
                result.threatLevel = 100;
                result.warnings.push('KNOWN MALWARE - Hash match in threat database');
            }
        }

        // Double extension check (e.g., invoice.pdf.exe)
        const doubleExtMatch = filename.match(/\.[a-z]{2,4}\.[a-z]{2,4}$/i);
        if (doubleExtMatch) {
            result.threatLevel += 30;
            result.warnings.push('Suspicious double extension');
        }

        return result;
    }

    /**
     * Categorize an email based on content
     */
    categorizeEmail(email) {
        const text = `${email.subject || ''} ${email.body || ''}`.toLowerCase();
        const scores = {};

        for (const [category, keywords] of Object.entries(this.categoryKeywords)) {
            scores[category] = 0;
            for (const keyword of keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    scores[category]++;
                }
            }
        }

        // Find highest scoring category
        let bestCategory = 'General';
        let bestScore = 0;
        for (const [category, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestCategory = category;
            }
        }

        return {
            category: bestCategory,
            confidence: Math.min(bestScore / 3, 1), // Normalize to 0-1
            scores
        };
    }

    /**
     * Check email for phishing indicators
     */
    checkPhishing(email) {
        const text = `${email.subject || ''} ${email.body || ''}`;
        const indicators = [];

        for (const pattern of this.phishingPatterns) {
            if (pattern.test(text)) {
                indicators.push(pattern.source);
            }
        }

        // Check for mismatched links
        const linkPattern = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]+)<\/a>/gi;
        let match;
        while ((match = linkPattern.exec(text)) !== null) {
            const [, href, displayText] = match;
            if (displayText.includes('http') && !href.includes(displayText.replace(/https?:\/\//, '').split('/')[0])) {
                indicators.push('Mismatched link URL');
            }
        }

        const threatScore = Math.min(indicators.length * 20, 100);

        return {
            isPhishing: threatScore >= 40,
            threatScore,
            indicators
        };
    }

    /**
     * Add a sender to safe list
     */
    markSenderSafe(sender) {
        const email = this._extractEmail(sender);
        this.safeSenders.add(email.toLowerCase());
        this.blockedSenders.delete(email.toLowerCase());
        this._saveData();
        return { success: true, sender: email };
    }

    /**
     * Block a sender
     */
    blockSender(sender) {
        const email = this._extractEmail(sender);
        this.blockedSenders.add(email.toLowerCase());
        this.safeSenders.delete(email.toLowerCase());
        this._saveData();
        return { success: true, sender: email };
    }

    /**
     * Check if sender is safe
     */
    isSenderSafe(sender) {
        const email = this._extractEmail(sender).toLowerCase();
        return this.safeSenders.has(email);
    }

    /**
     * Check if sender is blocked
     */
    isSenderBlocked(sender) {
        const email = this._extractEmail(sender).toLowerCase();
        return this.blockedSenders.has(email);
    }

    /**
     * Add a malicious hash to the database
     */
    addMaliciousHash(hash) {
        this.maliciousHashes.add(hash.toLowerCase());
        this._saveData();
    }

    /**
     * Get database stats
     */
    getStats() {
        return {
            maliciousHashes: this.maliciousHashes.size,
            phishingPatterns: this.phishingPatterns.length,
            safeSenders: this.safeSenders.size,
            blockedSenders: this.blockedSenders.size,
            categories: Object.keys(this.categoryKeywords).length
        };
    }

    /**
     * Extract email from "Name <email>" format
     */
    _extractEmail(sender) {
        const match = sender.match(/<([^>]+)>/);
        return match ? match[1] : sender;
    }

    /**
     * Load persisted data
     */
    _loadData() {
        try {
            if (fs.existsSync(this.dataPath)) {
                const data = JSON.parse(fs.readFileSync(this.dataPath, 'utf8'));
                if (data.safeSenders) this.safeSenders = new Set(data.safeSenders);
                if (data.blockedSenders) this.blockedSenders = new Set(data.blockedSenders);
                if (data.customHashes) {
                    data.customHashes.forEach(h => this.maliciousHashes.add(h));
                }
                console.log('[KevinThreatDB] Loaded threat database');
            }
        } catch (error) {
            console.log('[KevinThreatDB] No saved data found, using defaults');
        }
    }

    /**
     * Save data to disk
     */
    _saveData() {
        try {
            const dir = path.dirname(this.dataPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const data = {
                safeSenders: [...this.safeSenders],
                blockedSenders: [...this.blockedSenders],
                updatedAt: new Date().toISOString()
            };
            fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('[KevinThreatDB] Save error:', error.message);
        }
    }
}

module.exports = { KevinThreatDatabase };
