import React, { useState, useEffect } from 'react';
import { Smartphone, CheckCircle, XCircle, Send, Clock, Shield, MessageSquare, ChevronDown, Loader } from 'lucide-react';

const KevinSMSSettings = ({ isConnected }) => {
  const [config, setConfig] = useState(null);
  const [carriers, setCarriers] = useState([]);
  const [phone, setPhone] = useState('');
  const [selectedCarrier, setSelectedCarrier] = useState('');
  const [briefingTime, setBriefingTime] = useState('07:00');
  const [briefingEnabled, setBriefingEnabled] = useState(false);
  const [liveChatEnabled, setLiveChatEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [testStatus, setTestStatus] = useState(null);
  const [showCarriers, setShowCarriers] = useState(false);

  useEffect(() => {
    // Always fetch carriers on mount so dropdown isn't empty
    fetchCarriers();
    
    if (isConnected) {
      fetchConfig();
    }
  }, [isConnected]);

  const fetchConfig = async () => {
    try {
      const res = await fetch('/api/kevin/sms/config');
      if (res.ok) {
        const data = await res.json();
        setConfig(data);
        if (data.carrierId) setSelectedCarrier(data.carrierId);
        if (data.morningBriefing) {
          setBriefingTime(data.morningBriefing.time || '07:00');
          setBriefingEnabled(data.morningBriefing.enabled || false);
        }
        if (data.liveChatEnabled !== undefined) setLiveChatEnabled(data.liveChatEnabled);
      }
    } catch (e) {}
  };

  const fetchCarriers = async () => {
    try {
      const res = await fetch('/api/kevin/sms/carriers');
      if (res.ok) {
        const data = await res.json();
        if (data.carriers) {
            setCarriers(data.carriers);
        }
      }
    } catch (e) {
        console.error("Failed to fetch carriers:", e);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
      const res = await fetch('/api/kevin/sms/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: phone,
          carrier: selectedCarrier,
          morningBriefing: {
            enabled: briefingEnabled,
            time: briefingTime,
            includeThreats: true,
            includeCalendar: true,
            includeActionItems: true,
            includePendingEmails: true
          }
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (data.success) {
        setConfig(prev => ({ ...prev, enabled: data.enabled, phoneNumber: data.phoneNumber, carrier: data.carrier }));
        setTestStatus({ type: 'success', message: 'SMS configured!' });
      } else {
        setTestStatus({ type: 'error', message: data.error || 'Configuration failed' });
      }
    } catch (e) {
      if (e.name === 'AbortError') {
        setTestStatus({ type: 'error', message: 'Request timed out' });
      } else {
        setTestStatus({ type: 'error', message: 'Failed to save: ' + e.message });
      }
    } finally {
        clearTimeout(timeoutId);
        setLoading(false);
        setTimeout(() => setTestStatus(null), 3000);
    }
  };

  const handleTest = async () => {
    setLoading(true);
    setTestStatus(null);
    try {
      const res = await fetch('/api/kevin/sms/test', { method: 'POST' });
      const data = await res.json();
      setTestStatus(data.success
        ? { type: 'success', message: 'Test SMS sent! Check your phone.' }
        : { type: 'error', message: data.error || 'Failed to send test' }
      );
    } catch (e) {
      setTestStatus({ type: 'error', message: 'Connection error' });
    }
    setLoading(false);
    setTimeout(() => setTestStatus(null), 5000);
  };

  const formatPhone = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  return (
    <div className="bg-[#151518]/60 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-zinc-100 font-semibold text-sm flex items-center">
          <Smartphone className="w-4 h-4 mr-2 text-emerald-400" />
          Kevin SMS
        </h3>
        <div className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
          config?.enabled
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            : 'bg-zinc-700/30 text-zinc-500 border border-zinc-700/30'
        }`}>
          {config?.enabled ? 'Active' : 'Not Set Up'}
        </div>
      </div>

      {/* Status Bar */}
      {config?.enabled && (
        <div className="mb-4 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Texting {config.phoneNumber} via {config.carrier}</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-500 mt-1 ml-5">
            <MessageSquare className="w-3 h-3" />
            Live chat {liveChatEnabled ? 'ON' : 'OFF'}
            {briefingEnabled && (
              <span className="ml-2">| Briefing at {briefingTime}</span>
            )}
          </div>
        </div>
      )}

      {/* Phone Number Input */}
      <div className="space-y-3">
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">Phone Number</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(555) 123-4567"
            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 focus:border-emerald-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Carrier Selection */}
        <div>
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold block mb-1">Carrier</label>
          <div className="relative">
            <button
              onClick={() => setShowCarriers(!showCarriers)}
              className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-left flex items-center justify-between hover:border-white/20 transition-colors"
            >
              <span className={selectedCarrier ? 'text-zinc-200' : 'text-zinc-600'}>
                {selectedCarrier
                  ? carriers.find(c => c.id === selectedCarrier)?.name || selectedCarrier
                  : 'Select your carrier'
                }
              </span>
              <ChevronDown className={`w-4 h-4 text-zinc-500 transition-transform ${showCarriers ? 'rotate-180' : ''}`} />
            </button>

            {showCarriers && (
              <div className="absolute z-[100] mt-1 w-full bg-[#1a1a1d] border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                {carriers.length > 0 ? (
                    carriers.map(c => (
                    <button
                        key={c.id}
                        onClick={() => { setSelectedCarrier(c.id); setShowCarriers(false); }}
                        className={`w-full px-3 py-2 text-xs text-left hover:bg-white/5 transition-colors ${
                        selectedCarrier === c.id ? 'text-emerald-400 bg-emerald-500/10' : 'text-zinc-300'
                        }`}
                    >
                        {c.name}
                    </button>
                    ))
                ) : (
                    <div className="px-3 py-4 text-center text-[10px] text-zinc-500 italic">
                        No carriers found. Check backend.
                    </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Morning Briefing */}
        <div className="border border-white/5 rounded-lg p-3 bg-black/20">
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold flex items-center">
              <Clock className="w-3 h-3 mr-1.5" /> Morning Briefing
            </label>
            <button
              onClick={() => setBriefingEnabled(!briefingEnabled)}
              className={`w-8 h-4 rounded-full transition-colors relative ${
                briefingEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
              }`}
            >
              <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all ${
                briefingEnabled ? 'left-4.5 right-0.5' : 'left-0.5'
              }`} style={{ left: briefingEnabled ? '17px' : '2px' }} />
            </button>
          </div>

          {briefingEnabled && (
            <div className="mt-2">
              <input
                type="time"
                value={briefingTime}
                onChange={(e) => setBriefingTime(e.target.value)}
                className="bg-black/40 border border-white/10 rounded px-2 py-1 text-xs text-zinc-300 focus:outline-none focus:border-emerald-500/50"
              />
              <p className="text-[10px] text-zinc-600 mt-1">Kevin will text you threats, calendar, and action items</p>
            </div>
          )}
        </div>

        {/* Live Chat Toggle */}
        <div className="flex items-center justify-between border border-white/5 rounded-lg p-3 bg-black/20">
          <label className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold flex items-center">
            <MessageSquare className="w-3 h-3 mr-1.5" /> Live Two-Way Chat
          </label>
          <button
            onClick={() => setLiveChatEnabled(!liveChatEnabled)}
            className={`w-8 h-4 rounded-full transition-colors relative ${
              liveChatEnabled ? 'bg-emerald-500' : 'bg-zinc-700'
            }`}
          >
            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-all`}
              style={{ left: liveChatEnabled ? '17px' : '2px' }} />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleSave}
            disabled={loading || !phone || !selectedCarrier}
            className="flex-1 bg-emerald-600/80 hover:bg-emerald-600 disabled:bg-zinc-700 disabled:text-zinc-500 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader className="w-3 h-3 animate-spin" /> : <Shield className="w-3 h-3" />}
            Save Settings
          </button>

          {config?.enabled && (
            <button
              onClick={handleTest}
              disabled={loading}
              className="bg-blue-600/80 hover:bg-blue-600 disabled:bg-zinc-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" />
              Test
            </button>
          )}
        </div>

        {/* Status Message */}
        {testStatus && (
          <div className={`p-2 rounded-lg text-xs flex items-center gap-1.5 ${
            testStatus.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
              : 'bg-red-500/10 border border-red-500/20 text-red-400'
          }`}>
            {testStatus.type === 'success' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
            {testStatus.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default KevinSMSSettings;
