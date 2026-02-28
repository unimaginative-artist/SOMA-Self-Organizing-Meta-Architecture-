import React, { useState, useEffect, useRef } from 'react';
import {
  Shield, Activity, Lock, Power, Terminal, AlertTriangle,
  Cpu, Zap, Eye, Database, Network, Server, Unlock, Plus, Mail, Key, X,
  CheckCircle, ChevronRight, Settings, Radio, RefreshCw, Filter, Globe, Map, Target, Send, Bell,
  Info, ExternalLink, Copy, ArrowRight, HelpCircle, Cloud, AtSign, Inbox, MailOpen
} from 'lucide-react';
import { toast } from 'react-toastify';
import { KEVIN_QUOTES } from './data/kevinQuotes';
import KevinSMSSettings from './components/KevinSMSSettings';

const KevinInterface = () => {
  // State
  const [isOnline, setIsOnline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [usingRealEmail, setUsingRealEmail] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [sensitivity, setSensitivity] = useState(85);
  const [protocols, setProtocols] = useState({
    heuristics: true, zeroTrust: true, toneAnalysis: false, linkDetonation: false,
    autoDraft: true, smartPriority: true, actionExtract: true, styleLearn: false
  });
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showEmailSetup, setShowEmailSetup] = useState(false);
  const [agentEmail, setAgentEmail] = useState('');
  const [agentPassword, setAgentPassword] = useState('');
  const [notificationStatus, setNotificationStatus] = useState({});
  const [notificationSettings, setNotificationSettings] = useState({
    slackWebhook: '', telegramBotToken: '', telegramChatId: '', discordWebhook: ''
  });

  const [kevinMood, setKevinMood] = useState('idle'); // idle, scanning, threat
  const [quote, setQuote] = useState(KEVIN_QUOTES.idle[0]);

  const emailProviders = {
    gmail: {
      name: 'Gmail / Google Workspace',
      iconType: 'google',
      color: '#EA4335',
      imapServer: 'imap.gmail.com',
      imapPort: 993,
      steps: [
        { title: 'Enable 2FA', desc: 'Go to your Google Account settings and enable 2-Step Verification.' },
        { title: 'Create App Password', desc: 'Search for "App Passwords" in your account settings. Create one for "Mail" on "Windows Computer".', link: 'https://myaccount.google.com/apppasswords', linkText: 'Google App Passwords' },
        { title: 'Copy Password', desc: 'Copy the 16-character code and paste it into the "App Password" field here.' }
      ],
      notes: 'Gmail requires an App Password. Your regular password will not work.'
    },
    outlook: {
      name: 'Outlook / Office 365',
      iconType: 'outlook',
      color: '#0078D4',
      imapServer: 'outlook.office365.com',
      imapPort: 993,
      steps: [
        { title: 'Security Settings', desc: 'Go to Security -> Advanced Security Options.', link: 'https://account.microsoft.com/security', linkText: 'Microsoft Security' },
        { title: 'App Passwords', desc: 'Look for "App passwords" section and click "Create a new app password".' },
        { title: 'Enable IMAP', desc: 'Ensure IMAP is enabled in your Outlook.com settings (Settings -> Mail -> Sync email).' }
      ]
    }
  };

  const renderProviderIcon = (type, size, color) => {
    return <Mail className={`${size === 'lg' ? 'w-6 h-6' : 'w-4 h-4'}`} style={{ color }} />;
  };
  
    // Chat State
    const [chatInput, setChatInput] = useState('');
    const [isKevinThinking, setIsKevinThinking] = useState(false);
    const [messages, setMessages] = useState([]); // { role: 'user' | 'assistant', content: string }
  
    const [scanLog, setScanLog] = useState([]);
    
    const [stats, setStats] = useState({});
    const [accounts, setAccounts] = useState([]);

  // Fetch Kevin Data - REAL DATA ONLY
  useEffect(() => {
    const fetchKevinData = async () => {
      try {
        const statusRes = await fetch('/api/kevin/status');
        const logRes = await fetch('/api/kevin/scan-log');

        if (statusRes.ok) {
          const data = await statusRes.json();
          if (data.success) {
            // Update UI state based on Backend state
            setIsOnline(data.status.online);
            setUsingRealEmail(data.status.usingRealEmail || false);
            if (data.status.stats) {
              setStats(data.status.stats);
            }

            // Sync with real config from backend
            if (data.status.config) {
                const cfg = data.status.config;
                setSensitivity(cfg.sensitivity || 85);
                if (cfg.protocols) setProtocols(prev => ({ ...prev, ...cfg.protocols }));
                
                // Map monitored_accounts to our UI list format
                if (cfg.monitored_accounts) {
                    setAccounts(cfg.monitored_accounts.map((email, idx) => ({
                        id: idx + 1,
                        email,
                        status: 'secure',
                        lastScan: 'Active'
                    })));
                }
            }

            if (Math.random() > 0.8 && !isKevinThinking) {
                setKevinMood(data.status.mood);
            }
          }
        }

        if (logRes.ok) {
          const data = await logRes.json();
          if (data.success) {
            setScanLog(data.logs);
          }
        }
      } catch (e) {
        console.error("Kevin connection failed", e);
      }
    };

    // Fetch immediately on mount
    fetchKevinData();
    
    // Poll regardless of local isOnline state so we can detect if backend starts/stops
    const interval = setInterval(fetchKevinData, 3000);

    return () => clearInterval(interval);
  }, [isKevinThinking]); // Removed isOnline from dependency so it runs always

  // Handle Kevin Chat
  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !isOnline || isKevinThinking) return;

    const message = chatInput.trim();
    setChatInput('');
    setIsKevinThinking(true);
    setKevinMood('scanning');

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: message }]);

    try {
      const res = await fetch('/api/kevin/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await res.json();
      if (data.success) {
        setQuote(data.response);
        setKevinMood('idle');
        // Add Kevin response
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
      }
    } catch (e) {
      toast.error("Communication with Kevin interrupted.");
    } finally {
      setIsKevinThinking(false);
    }
  };

  const togglePower = async () => {
    try {
      const res = await fetch('/api/kevin/toggle', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const newStatus = data.status === 'started';
        setIsOnline(newStatus);
        if (newStatus) {
          setQuote("I'm awake! Let's protect some emails. 🛡️");
          setKevinMood('idle');
          toast.success('KEVIN Engine Activated');
        } else {
          setQuote("Going to sleep... stay safe! 💤");
          setKevinMood('offline');
          toast.info('KEVIN Engine Disengaged');
        }
      }
    } catch (e) {
      toast.error('Failed to toggle Kevin process');
    }
  };

  const handleAddAccount = async () => {
    if (!newEmail.includes('@')) {
      toast.error('Invalid email format');
      return;
    }
    
    const newId = accounts.length + 1;
    const newAccount = { id: newId, email: newEmail, status: 'pending', lastScan: 'Queued' };
    const updatedAccounts = [...accounts, newAccount];
    
    // Save immediately
    try {
      const res = await fetch('/api/kevin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          thresholds: {
            spam: (100 - sensitivity) / 100,
            phishing: (100 - (sensitivity * 0.9)) / 100
          },
          monitored_accounts: updatedAccounts.map(a => a.email),
          protocols
        })
      });
      
      if (res.ok) {
        setAccounts(updatedAccounts);
        setNewEmail('');
        toast.success(`${newEmail} added and saved!`);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
        toast.error('Failed to save: ' + errorData.error);
      }
    } catch (e) {
      toast.error('Failed to add account: ' + e.message);
    }
  };

  const handleSaveSettings = async () => {
    console.log('[Kevin Settings] Starting save...');
    try {
      // UX Improvement: If agentEmail is provided, ensure it's in the monitored accounts list
      let finalMonitoredEmails = accounts.map(a => a.email);
      if (agentEmail && !finalMonitoredEmails.includes(agentEmail)) {
          finalMonitoredEmails.push(agentEmail);
          console.log('[Kevin Settings] Auto-adding connection email to monitored list:', agentEmail);
      }

      // 1. Save Kevin Config
      const configRes = await fetch('/api/kevin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensitivity,
          monitored_accounts: finalMonitoredEmails,
          protocols
        })
      });

      if (!configRes.ok) {
        throw new Error('Failed to save configuration');
      }

      // 2. Save Credentials (if provided)
      if (agentEmail && agentPassword) {
        console.log('[Kevin Settings] Saving email credentials...');
        const envRes = await fetch('/api/setup/env', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            EMAIL_ADDRESS: agentEmail,
            APP_PASSWORD: agentPassword
          })
        });

        if (!envRes.ok) {
          const errorData = await envRes.json();
          throw new Error('Failed to save credentials: ' + (errorData.error || envRes.statusText));
        }
        console.log('[Kevin Settings] Credentials saved');
        toast.success('Email credentials updated successfully!');
      } else {
        toast.success('Configuration saved successfully!');
      }

      setShowSettings(false);
    } catch (e) {
      console.error('[Kevin Settings] Save failed:', e);
      toast.error('Failed to save configuration: ' + e.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'safe': return <span className="px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded-full text-[10px] font-bold border border-fuchsia-500/20">SAFE</span>;
      case 'threat': return <span className="px-2 py-1 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-bold border border-rose-500/20 animate-pulse">THREAT</span>;
      case 'spam': return <span className="px-2 py-1 bg-fuchsia-500/10 text-fuchsia-400 rounded-full text-[10px] font-bold border border-fuchsia-500/20">SPAM</span>;
      default: return <span className="px-2 py-1 bg-zinc-800 text-zinc-500 rounded-full text-[10px] font-bold border border-white/5">{status.toUpperCase()}</span>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#09090b] text-zinc-200 font-sans p-6 rounded-xl border border-white/5 relative overflow-hidden">
      <style>{`
        @keyframes slowWobble {
          0%, 100% { transform: rotate(-3deg) translateY(0px); }
          50% { transform: rotate(3deg) translateY(-2px); }
        }
        .kevin-wobble {
          animation: slowWobble 6s ease-in-out infinite;
        }
      `}</style>

      {showSettings && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-lg max-h-[90vh] bg-[#151518] border border-white/10 rounded-2xl shadow-2xl flex flex-col">
            <div className="flex justify-between items-center p-6 pb-4 border-b border-white/5">
              <h2 className="text-xl font-bold text-white flex items-center"><Settings className="w-5 h-5 mr-2 text-zinc-400" /> Kevin Settings</h2>
              <button onClick={() => setShowSettings(false)} className="p-2 hover:bg-white/5 rounded-full transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-6 overflow-y-auto flex-1 p-6 custom-scrollbar">
              <div>
                <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest flex items-center justify-between">
                  <span>Active Protocols</span>
                  <span className="text-[9px] text-zinc-600 font-normal normal-case tracking-normal">Security + Productivity</span>
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    // Security Protocols
                    { id: 'heuristics', label: 'Hyper-Heuristics', desc: 'Predictive pattern matching', type: 'security' },
                    { id: 'zeroTrust', label: 'Zero-Trust Auth', desc: 'Verify every header', type: 'security' },
                    { id: 'toneAnalysis', label: 'Tone Analysis', desc: 'Detect social engineering', type: 'security' },
                    { id: 'linkDetonation', label: 'Link Detonation', desc: 'Sandbox URL execution', type: 'security' },
                    // Productivity Protocols
                    { id: 'autoDraft', label: 'Auto-Draft', desc: 'Generate smart replies', type: 'productivity' },
                    { id: 'smartPriority', label: 'Smart Priority', desc: 'AI-based inbox sorting', type: 'productivity' },
                    { id: 'actionExtract', label: 'Action Extraction', desc: 'Find tasks & deadlines', type: 'productivity' },
                    { id: 'styleLearn', label: 'Style Learning', desc: 'Adapt to your tone', type: 'productivity' },
                  ].map(p => {
                    const isActive = protocols[p.id];
                    const isSecurity = p.type === 'security';

                    return (
                      <button
                        key={p.id}
                        onClick={() => setProtocols(prev => ({ ...prev, [p.id]: !prev[p.id] }))}
                        className={`text-left p-3 rounded-lg border transition-all ${isActive
                          ? isSecurity
                            ? 'bg-fuchsia-500/10 border-fuchsia-500/30'
                            : 'bg-emerald-500/10 border-emerald-500/30'
                          : 'bg-zinc-900 border-white/5 opacity-50'
                          }`}
                      >
                        <div className={`text-sm font-bold ${isActive
                          ? isSecurity
                            ? 'text-fuchsia-400'
                            : 'text-emerald-400'
                          : 'text-zinc-400'
                          }`}>
                          {p.label}
                        </div>
                        <div className="text-[10px] text-zinc-500">{p.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest flex items-center justify-between">
                  <span>Email Connection</span>
                  <div className="flex items-center gap-2">
                    {usingRealEmail && <span className="text-[9px] text-emerald-500 font-bold">CONNECTED</span>}
                    <button
                      onClick={() => setShowEmailSetup(true)}
                      className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                      title="Setup Help"
                    >
                      <HelpCircle className="w-3 h-3" />
                      Setup Guide
                    </button>
                  </div>
                </h3>
                <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
                  {/* Provider Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Email Provider</label>
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(emailProviders).slice(0, 6).map(([key, provider]) => (
                        <button
                          key={key}
                          onClick={() => { setSelectedProvider(key); setShowEmailSetup(true); }}
                          className={`p-2 rounded-lg border text-center transition-all hover:border-white/20 ${
                            selectedProvider === key
                              ? 'border-fuchsia-500/50 bg-fuchsia-500/10'
                              : 'border-white/5 bg-black/20'
                          }`}
                        >
                          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-black/30 border border-white/10">
                            {renderProviderIcon(provider.iconType, 'md', provider.color)}
                          </div>
                          <div className="text-[9px] text-zinc-400 truncate">{provider.name.split('/')[0].trim()}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-zinc-500 font-bold uppercase">Email Address</label>
                    <input
                      type="email"
                      value={agentEmail}
                      onChange={(e) => setAgentEmail(e.target.value)}
                      placeholder={usingRealEmail ? "Connected (Enter to update)" : "your-email@provider.com"}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-500/30 text-zinc-300"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-zinc-500 font-bold uppercase">App Password</label>
                      <button
                        onClick={() => { if (!selectedProvider) setSelectedProvider('gmail'); setShowEmailSetup(true); }}
                        className="text-[9px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5"
                      >
                        <Info className="w-3 h-3" />
                        How to get this?
                      </button>
                    </div>
                    <input
                      type="password"
                      value={agentPassword}
                      onChange={(e) => setAgentPassword(e.target.value)}
                      placeholder={usingRealEmail ? "••••••••••••" : "xxxx xxxx xxxx xxxx"}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-500/30 text-zinc-300 font-mono"
                    />
                  </div>
                  
                  {/* Direct Save/Test Button for Credentials */}
                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        if (!agentEmail || !agentPassword) {
                          toast.error('Enter email and app password first');
                          return;
                        }
                        setIsKevinThinking(true);
                        try {
                          // Ensure it's in monitored list
                          let finalMonitoredEmails = accounts.map(a => a.email);
                          if (!finalMonitoredEmails.includes(agentEmail)) {
                              finalMonitoredEmails.push(agentEmail);
                          }

                          // Save credentials
                          const envRes = await fetch('/api/setup/env', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              EMAIL_ADDRESS: agentEmail,
                              APP_PASSWORD: agentPassword
                            })
                          });

                          const envData = await envRes.json();
                          if (envRes.ok && envData.success) {
                            // Also update monitored list
                            await fetch('/api/kevin/config', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  sensitivity,
                                  monitored_accounts: finalMonitoredEmails,
                                  protocols
                                })
                            });
                            
                            toast.success('Connection Verified & Saved!');
                            setUsingRealEmail(true);
                            setAgentPassword(''); // Clear from UI state for safety
                          } else {
                            toast.error('Verification failed: ' + (envData.error || 'Check credentials'));
                          }
                        } catch (e) {
                          toast.error('Connection failed: ' + e.message);
                        } finally {
                          setIsKevinThinking(false);
                        }
                      }}
                      disabled={isKevinThinking || !agentEmail || !agentPassword}
                      className="w-full py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2"
                    >
                      {isKevinThinking ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Verifying Link...
                        </>
                      ) : (
                        <>
                          <Zap className="w-3 h-3" />
                          Verify & Save Connection
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest">Monitored Accounts</h3>
                <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                  {accounts.map(acc => (
                    <div key={acc.id} className="flex justify-between items-center p-2.5 bg-[#09090b]/60 rounded-lg border border-white/5">
                      <div className="flex items-center space-x-3"><Mail className="w-3.5 h-3.5 text-zinc-500" /><span className="text-sm text-zinc-300">{acc.email}</span></div>
                      <button 
                        onClick={async () => {
                          const updatedAccounts = accounts.filter(a => a.id !== acc.id);
                          try {
                            const res = await fetch('/api/kevin/config', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                thresholds: {
                                  spam: (100 - sensitivity) / 100,
                                  phishing: (100 - (sensitivity * 0.9)) / 100
                                },
                                monitored_accounts: updatedAccounts.map(a => a.email),
                                protocols
                              })
                            });
                            if (res.ok) {
                              setAccounts(updatedAccounts);
                              toast.success(`${acc.email} removed and saved!`);
                            } else {
                              toast.error('Failed to remove account');
                            }
                          } catch (e) {
                            toast.error('Failed to remove: ' + e.message);
                          }
                        }}
                        className="text-rose-400 hover:text-rose-300 text-[10px] font-bold uppercase"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="new-email@soma.dev" className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-500/30" />
                  <button onClick={handleAddAccount} className="px-4 py-2 bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-lg text-xs font-bold uppercase hover:bg-fuchsia-600/30 transition-all">Add</button>
                </div>
              </div>
              <div>
                <h3 className="text-xs font-bold text-zinc-500 mb-3 uppercase tracking-widest flex items-center justify-between">
                  <span>Alert Notifications</span>
                  <span className="text-[9px] text-zinc-600 font-normal normal-case tracking-normal">Slack / Telegram / Discord</span>
                </h3>
                <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
                  {/* Slack */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Slack Webhook URL</label>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-zinc-600 hover:text-blue-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[10px] text-zinc-300 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
                            <div className="font-bold text-white mb-1">How to get this:</div>
                            <ol className="list-decimal list-inside space-y-0.5">
                              <li>Go to your Slack workspace</li>
                              <li>Apps → Incoming Webhooks</li>
                              <li>Add New Webhook to Workspace</li>
                              <li>Choose channel & copy URL</li>
                            </ol>
                            <a href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-1 inline-block">Slack Docs →</a>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-white/10 rotate-45"></div>
                          </div>
                        </div>
                      </div>
                      {notificationStatus.slack?.enabled && <span className="text-[9px] text-emerald-500 font-bold">ACTIVE</span>}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={notificationSettings.slackWebhook}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, slackWebhook: e.target.value }))}
                        placeholder="https://hooks.slack.com/services/..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-500/30 text-zinc-300 font-mono text-[11px]"
                      />
                      <button
                        onClick={async () => {
                          if (!notificationSettings.slackWebhook) {
                            toast.error('Enter a Slack webhook URL first');
                            return;
                          }
                          try {
                            const res = await fetch('/api/kevin/notifications/configure', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                channel: 'slack',
                                config: { webhookUrl: notificationSettings.slackWebhook, enabled: true }
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              toast.success('Slack webhook saved!');
                              // Refresh status
                              const statusRes = await fetch('/api/kevin/notifications/status');
                              const statusData = await statusRes.json();
                              setNotificationStatus(statusData);
                            } else {
                              toast.error('Failed to save: ' + (data.error || 'Unknown error'));
                            }
                          } catch (e) {
                            toast.error('Save failed: ' + e.message);
                          }
                        }}
                        className="px-4 py-2 bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-lg text-xs font-bold uppercase hover:bg-fuchsia-600/30 transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  {/* Telegram */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Telegram Bot</label>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-zinc-600 hover:text-blue-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[10px] text-zinc-300 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
                            <div className="font-bold text-white mb-1">Setup:</div>
                            <ol className="list-decimal list-inside space-y-0.5">
                              <li>Message @BotFather on Telegram</li>
                              <li>Send /newbot and follow prompts</li>
                              <li>Copy bot token</li>
                              <li>Add bot to your channel/group</li>
                              <li>Get chat ID from getUpdates API</li>
                            </ol>
                            <a href="https://core.telegram.org/bots#botfather" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-1 inline-block">Docs →</a>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-white/10 rotate-45"></div>
                          </div>
                        </div>
                      </div>
                      {notificationStatus.telegram?.enabled && <span className="text-[9px] text-emerald-500 font-bold">ACTIVE</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={notificationSettings.telegramBotToken}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                        placeholder="Bot Token: 123456:ABC..."
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-500/30 text-zinc-300 font-mono text-[11px]"
                      />
                      <input
                        type="text"
                        value={notificationSettings.telegramChatId}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                        placeholder="Chat ID: -1001234..."
                        className="bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-500/30 text-zinc-300 font-mono text-[11px]"
                      />
                    </div>
                    <button
                      onClick={async () => {
                        if (!notificationSettings.telegramBotToken || !notificationSettings.telegramChatId) {
                          toast.error('Enter both bot token and chat ID');
                          return;
                        }
                        try {
                          const res = await fetch('/api/kevin/notifications/configure', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              channel: 'telegram',
                              config: {
                                botToken: notificationSettings.telegramBotToken,
                                chatId: notificationSettings.telegramChatId,
                                enabled: true
                              }
                            })
                          });
                          const data = await res.json();
                          if (data.success) {
                            toast.success('Telegram bot saved!');
                            const statusRes = await fetch('/api/kevin/notifications/status');
                            const statusData = await statusRes.json();
                            setNotificationStatus(statusData);
                          } else {
                            toast.error('Failed to save: ' + (data.error || 'Unknown error'));
                          }
                        } catch (e) {
                          toast.error('Save failed: ' + e.message);
                        }
                      }}
                      className="w-full px-4 py-2 bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-lg text-xs font-bold uppercase hover:bg-fuchsia-600/30 transition-all"
                    >
                      Save Telegram Bot
                    </button>
                  </div>
                  {/* Discord */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-zinc-500 font-bold uppercase">Discord Webhook URL</label>
                        <div className="group relative">
                          <Info className="w-3 h-3 text-zinc-600 hover:text-blue-400 cursor-help" />
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 border border-white/10 rounded-lg text-[10px] text-zinc-300 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-xl">
                            <div className="font-bold text-white mb-1">How to get this:</div>
                            <ol className="list-decimal list-inside space-y-0.5">
                              <li>Open Discord channel settings</li>
                              <li>Integrations → Webhooks</li>
                              <li>New Webhook → Copy URL</li>
                            </ol>
                            <a href="https://support.discord.com/hc/en-us/articles/228383668" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline mt-1 inline-block">Discord Docs →</a>
                            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 bg-zinc-900 border-r border-b border-white/10 rotate-45"></div>
                          </div>
                        </div>
                      </div>
                      {notificationStatus.discord?.enabled && <span className="text-[9px] text-emerald-500 font-bold">ACTIVE</span>}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={notificationSettings.discordWebhook}
                        onChange={(e) => setNotificationSettings(prev => ({ ...prev, discordWebhook: e.target.value }))}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-fuchsia-500/30 text-zinc-300 font-mono text-[11px]"
                      />
                      <button
                        onClick={async () => {
                          if (!notificationSettings.discordWebhook) {
                            toast.error('Enter a Discord webhook URL first');
                            return;
                          }
                          try {
                            const res = await fetch('/api/kevin/notifications/configure', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                channel: 'discord',
                                config: { webhookUrl: notificationSettings.discordWebhook, enabled: true }
                              })
                            });
                            const data = await res.json();
                            if (data.success) {
                              toast.success('Discord webhook saved!');
                              const statusRes = await fetch('/api/kevin/notifications/status');
                              const statusData = await statusRes.json();
                              setNotificationStatus(statusData);
                            } else {
                              toast.error('Failed to save: ' + (data.error || 'Unknown error'));
                            }
                          } catch (e) {
                            toast.error('Save failed: ' + e.message);
                          }
                        }}
                        className="px-4 py-2 bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-lg text-xs font-bold uppercase hover:bg-fuchsia-600/30 transition-all"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 pt-2 border-t border-white/5">
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/kevin/notifications/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ channel: 'slack' })
                        });
                        const data = await res.json();
                        if (data.success) toast.success('Slack test sent!');
                        else toast.error('Slack test failed: ' + (data.error || 'Not configured'));
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#4A154B]/20 text-[#E01E5A] border border-[#4A154B]/30 rounded text-[10px] font-bold uppercase hover:bg-[#4A154B]/30 transition-all"
                    >
                      Test Slack
                    </button>
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/kevin/notifications/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ channel: 'telegram' })
                        });
                        const data = await res.json();
                        if (data.success) toast.success('Telegram test sent!');
                        else toast.error('Telegram test failed: ' + (data.error || 'Not configured'));
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#0088cc]/20 text-[#0088cc] border border-[#0088cc]/30 rounded text-[10px] font-bold uppercase hover:bg-[#0088cc]/30 transition-all"
                    >
                      Test Telegram
                    </button>
                    <button
                      onClick={async () => {
                        const res = await fetch('/api/kevin/notifications/test', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ channel: 'discord' })
                        });
                        const data = await res.json();
                        if (data.success) toast.success('Discord test sent!');
                        else toast.error('Discord test failed: ' + (data.error || 'Not configured'));
                      }}
                      className="flex-1 px-3 py-1.5 bg-[#5865F2]/20 text-[#5865F2] border border-[#5865F2]/30 rounded text-[10px] font-bold uppercase hover:bg-[#5865F2]/30 transition-all"
                    >
                      Test Discord
                    </button>
                  </div>
                  <p className="text-[9px] text-zinc-600 mt-2">Click Save after entering webhook URLs. Kevin will send threat alerts to all configured channels.</p>
                </div>
              </div>

              {/* SMS Settings Section */}
              <div>
                <KevinSMSSettings isConnected={isOnline} />
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Security Sensitivity</h3>
                  <span className="text-fuchsia-400 font-mono text-xs font-bold">{sensitivity}%</span>
                </div>
                <div className="flex items-center space-x-4">
                  <span className="text-[10px] text-zinc-600 font-bold uppercase">Relaxed</span>
                  <input type="range" min="0" max="100" value={sensitivity} onChange={(e) => setSensitivity(parseInt(e.target.value))} className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-fuchsia-500" />
                  <span className="text-[10px] text-zinc-600 font-bold uppercase">Paranoid</span>
                </div>
              </div>
            </div>
            <div className="p-6 pt-4 border-t border-white/5 flex justify-end">
              <button onClick={handleSaveSettings} className="px-8 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-lg shadow-fuchsia-900/20">Apply Configuration</button>
            </div>
          </div>
        </div>
      )}

      {/* Email Setup Wizard Modal */}
      {showEmailSetup && (
        <div className="absolute inset-0 z-[60] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#151518] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between" style={{ backgroundColor: selectedProvider ? emailProviders[selectedProvider]?.color + '10' : '#1a1a1a' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-black/30 border border-white/10 flex items-center justify-center">
                  {selectedProvider ? renderProviderIcon(emailProviders[selectedProvider]?.iconType, 'lg', emailProviders[selectedProvider]?.color) : <Mail className="w-6 h-6 text-zinc-400" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    {selectedProvider ? `${emailProviders[selectedProvider]?.name} Setup` : 'Email Setup Guide'}
                  </h2>
                  <p className="text-xs text-zinc-400">Follow these steps to connect Kevin to your email</p>
                </div>
              </div>
              <button onClick={() => setShowEmailSetup(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            {/* Provider Selection (if none selected) */}
            {!selectedProvider && (
              <div className="p-6">
                <h3 className="text-sm font-bold text-zinc-300 mb-4">Select your email provider:</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(emailProviders).map(([key, provider]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedProvider(key)}
                      className="p-4 rounded-xl border border-white/10 bg-black/20 hover:border-white/30 hover:bg-black/40 transition-all flex items-center gap-3 text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                        {renderProviderIcon(provider.iconType, 'lg', provider.color)}
                      </div>
                      <div>
                        <div className="font-bold text-white">{provider.name}</div>
                        <div className="text-[10px] text-zinc-500">IMAP: {provider.imapServer}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step by Step Guide */}
            {selectedProvider && (
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {/* Steps */}
                <div className="space-y-4">
                  {emailProviders[selectedProvider]?.steps.map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 pt-1">
                        <h4 className="font-bold text-white text-sm mb-1">{step.title}</h4>
                        <p className="text-xs text-zinc-400 mb-2">{step.desc}</p>
                        {step.link && (
                          <a
                            href={step.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-500/20 transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {step.linkText || 'Open Link'}
                            <Copy
                              className="w-3 h-3 ml-1 opacity-50 hover:opacity-100 cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigator.clipboard.writeText(step.link);
                                toast.success('Link copied!');
                              }}
                            />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notes Section */}
                {emailProviders[selectedProvider]?.notes && (
                  <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <div className="flex items-start gap-2">
                      <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-200">{emailProviders[selectedProvider].notes}</p>
                    </div>
                  </div>
                )}

                {/* Technical Details */}
                <div className="mt-6 p-4 bg-black/30 border border-white/5 rounded-xl">
                  <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Technical Details</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">IMAP Server:</span>
                      <span className="text-zinc-300 font-mono">{emailProviders[selectedProvider]?.imapServer}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Port:</span>
                      <span className="text-zinc-300 font-mono">{emailProviders[selectedProvider]?.imapPort}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-between bg-black/20">
              {selectedProvider ? (
                <>
                  <button
                    onClick={() => setSelectedProvider(null)}
                    className="px-4 py-2 text-zinc-400 hover:text-white text-xs font-bold uppercase transition-colors"
                  >
                    ← Back to Providers
                  </button>
                  <button
                    onClick={() => setShowEmailSetup(false)}
                    className="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold text-xs uppercase rounded-lg transition-all"
                  >
                    Got it, Close
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowEmailSetup(false)}
                  className="ml-auto px-4 py-2 text-zinc-400 hover:text-white text-xs font-bold uppercase transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header Area */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className={`w-16 h-16 rounded-full bg-zinc-800 border-2 overflow-hidden flex items-center justify-center transition-all duration-500 ${isOnline ? (kevinMood === 'threat' ? 'border-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.4)]' : 'border-fuchsia-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]') : 'border-zinc-700 opacity-50 grayscale'}`}>
              <img
                src="/kevin_icon.png"
                alt="Kevin"
                className="w-full h-full object-cover kevin-wobble"
                onError={(e) => { e.target.src = '/kevin_profile.ico'; }}
              />
            </div>
            {isOnline && <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#09090b] ${kevinMood === 'threat' ? 'bg-rose-500 animate-pulse' : kevinMood === 'scanning' ? 'bg-amber-500 animate-bounce' : 'bg-fuchsia-500'}`} />}
          </div>
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">K.E.V.I.N.</h2>
            <div className="text-xs text-zinc-500 mb-1">Knowledge Engine with Variable Inner Narratives</div>
            <div className="flex items-center space-x-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-fuchsia-500' : 'bg-zinc-600'}`} />
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest">
                {isOnline ? (usingRealEmail ? `GMAIL LINK ACTIVE // ${kevinMood.toUpperCase()}` : `SYSTEM ${kevinMood.toUpperCase()}`) : 'OFFLINE'}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowSettings(true)}
            className="p-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl transition-colors group"
          >
            <Settings className="w-5 h-5 text-zinc-400 group-hover:text-white" />
          </button>
          <button
            onClick={togglePower}
            className={`flex items-center space-x-3 px-6 py-3 rounded-xl font-bold transition-all border ${isOnline
              ? 'bg-zinc-800/50 text-zinc-400 border-white/5 hover:bg-zinc-800'
              : 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20 hover:bg-fuchsia-500/20'
              }`}
          >
            <Power className="w-5 h-5" />
            <span className="text-xs uppercase tracking-widest">{isOnline ? 'Disengage' : 'Wake Kevin'}</span>
          </button>
        </div>
      </div>

      {/* Message Center (Replaced by Chat Column) */}
      <div className="mb-4">
        {/* Optional: Status ticker or system alerts can go here instead of the chat console */}
      </div>

      {/* Main Content Grid */}
      <div className={`grid grid-cols-12 gap-6 flex-1 min-h-0 transition-opacity duration-500 ${isOnline ? 'opacity-100' : 'opacity-25 pointer-events-none'}`}>

        {/* LEFT COLUMN: Stats (3 cols) */}
        <div className="col-span-3 flex flex-col gap-4">
          <div className="bg-[#151518]/60 p-4 rounded-xl border border-white/5">
            <div className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-1">Scanned</div>
            <div className="text-2xl font-mono text-white">{(Number(stats?.scanned) || 0).toLocaleString()}</div>
          </div>

          <div className="bg-[#151518]/60 p-4 rounded-xl border border-white/5">
            <div className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mb-1">Blocked</div>
            <div className="text-2xl font-mono text-rose-400">{Number(stats?.threats) || 0}</div>
          </div>

          <div className="bg-[#151518]/60 p-4 rounded-xl border border-white/5 relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/10 transition-colors" />
            <div className="flex justify-between items-start mb-2 relative z-10">
              <div className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest leading-tight">Global<br />Intel</div>
              <Globe className={`w-4 h-4 ${stats?.hiveMind?.active ? 'text-blue-400 animate-pulse' : 'text-zinc-600'}`} />
            </div>
            <div className="relative z-10">
              <div className="text-xl font-mono text-blue-400 mb-1">{(stats?.hiveMind?.sharedThreats || 0).toLocaleString()}</div>
            </div>
          </div>

          <div className="flex-1 bg-[#151518]/60 rounded-xl border border-white/5 p-4 flex flex-col overflow-hidden min-h-[150px]">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Watchlist</h3>
              <span className="text-[9px] bg-fuchsia-500/10 text-fuchsia-400 px-1.5 py-0.5 rounded-full font-bold uppercase border border-fuchsia-500/20">SECURE</span>
            </div>
            <div className="space-y-2 overflow-y-auto custom-scrollbar flex-1 pr-1">
              {accounts.map(acc => (
                <div key={acc.id} className="p-2 bg-black/20 rounded-lg border border-white/5 flex items-center justify-between group hover:border-white/10 transition-colors">
                  <div className="flex items-center space-x-2 overflow-hidden">
                    <Mail className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-[10px] text-zinc-300 font-medium truncate">{acc.email}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Packet Analysis (5 cols) */}
        <div className="col-span-5 bg-[#151518]/60 rounded-xl border border-white/5 p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center">
              <Activity className="w-4 h-4 mr-2 text-blue-400" /> Live Analysis
            </h3>
            <div className="flex items-center space-x-2 text-[9px] text-zinc-500 font-mono">
              <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
              <span>ACTIVE</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-y-1">
              <thead className="text-[9px] text-zinc-600 font-bold uppercase tracking-widest sticky top-0 bg-[#151518] z-10">
                <tr>
                  <th className="pb-2 pl-2">Time</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Subject</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {scanLog.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group cursor-default">
                    <td className="py-2 pl-2 text-zinc-600 font-mono text-[10px] w-16 border-y border-white/5 border-l rounded-l-lg">{log.time.split(' ')[0]}</td>
                    <td className="py-2 w-20 border-y border-white/5">{getStatusBadge(log.status)}</td>
                    <td className="py-2 text-zinc-400 border-y border-white/5 border-r rounded-r-lg max-w-[120px] truncate text-[10px]">{log.subject}</td>
                  </tr>
                ))}
                {scanLog.length === 0 && (
                  <tr><td colSpan={3} className="py-12 text-center text-zinc-700 italic text-xs">System idle.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: Chat (4 cols) - NEW */}
        <div className="col-span-4 bg-[#0c0c0e] rounded-xl border border-white/10 flex flex-col shadow-inner overflow-hidden relative">
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />

          {/* Chat Header */}
          <div className="p-3 border-b border-white/5 bg-zinc-900/50 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Terminal className={`w-4 h-4 ${isOnline ? 'text-fuchsia-400' : 'text-zinc-600'}`} />
              <span className="text-xs font-mono font-bold text-zinc-400">SEC_UPLINK</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${isKevinThinking ? 'bg-amber-400 animate-ping' : 'bg-zinc-700'}`} />
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 flex flex-col-reverse">
            {messages.length === 0 && (
              <div className="text-center text-zinc-700 italic text-xs mt-10">
                {isOnline ? "Link established. Kevin is listening." : "Link offline."}
              </div>
            )}

            {/* We reverse map to show newest at bottom if using flex-col, 
                    but standard chat is top-down. Let's use standard order.
                    Actually, modifying the container to justify-end is better for sticky bottom. */}
            {[...messages].reverse().map((msg, idx) => (
              <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[90%] rounded-lg p-2.5 text-xs ${msg.role === 'user'
                  ? 'bg-zinc-800 text-zinc-200 border border-white/5'
                  : 'bg-fuchsia-900/10 text-fuchsia-200 border border-fuchsia-500/20'
                  }`}>
                  {msg.content}
                </div>
                <span className="text-[9px] text-zinc-700 mt-1 uppercase font-mono">{msg.role === 'user' ? 'YOU' : 'K.E.V.I.N.'}</span>
              </div>
            ))}

            {/* Initial Greeting if empty */}
            {messages.length === 0 && isOnline && (
              <div className="flex flex-col items-start animate-in fade-in">
                <div className="max-w-[90%] rounded-lg p-2.5 text-xs bg-fuchsia-900/10 text-fuchsia-200 border border-fuchsia-500/20">
                  {quote}
                </div>
                <span className="text-[9px] text-zinc-700 mt-1 uppercase font-mono">K.E.V.I.N.</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-3 bg-zinc-900/80 border-t border-white/5 backdrop-blur-sm">
            <form onSubmit={handleChatSubmit} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder={isOnline ? "Type command..." : "System offline"}
                disabled={!isOnline}
                className="flex-1 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-fuchsia-500 placeholder-zinc-700 focus:outline-none focus:border-fuchsia-500/50 transition-colors disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={!isOnline || isKevinThinking || !chatInput.trim()}
                className="p-2 bg-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30 rounded-lg hover:bg-fuchsia-600/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-3 h-3" />
              </button>
            </form>
          </div>
        </div>

      </div>
    </div>
  );
};

export default KevinInterface;
