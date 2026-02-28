import React, { useState, useEffect, useCallback } from 'react';
import { Zap, ZapOff, Target, Clock, Users } from 'lucide-react';

const AutopilotToggle = ({ enabled = true }) => {
    const [status, setStatus] = useState({ enabled: false, components: { goals: false, rhythms: false, social: false } });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchStatus = useCallback(async () => {
        if (!enabled) return;
        try {
            const res = await fetch('/api/autopilot/status');
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            if (data.success) {
                setStatus({ enabled: data.enabled, components: data.components });
                setError(null);
            }
        } catch (e) {
            setError('Backend offline');
        }
    }, [enabled]);

    useEffect(() => {
        if (!enabled) return;
        fetchStatus();
        const t = setInterval(fetchStatus, 10000);
        return () => clearInterval(t);
    }, [enabled, fetchStatus]);

    const toggle = async (nextEnabled, component) => {
        if (!enabled) return;
        setLoading(true);
        try {
            const body = component ? { enabled: nextEnabled, component } : { enabled: nextEnabled };
            const res = await fetch('/api/autopilot/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            const data = await res.json();
            if (data.success) {
                setStatus({ enabled: data.enabled, components: data.components });
                setError(null);
            }
        } catch (e) {
            setError('Backend offline');
        } finally { setLoading(false); }
    };

    const allOn = status.components.goals && status.components.rhythms && status.components.social;
    const anyOn = status.components.goals || status.components.rhythms || status.components.social;
    const glowColor = allOn ? 'shadow-[0_0_12px_rgba(34,197,94,0.5)]' : anyOn ? 'shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'shadow-[0_0_12px_rgba(239,68,68,0.3)]';
    const borderColor = allOn ? 'border-emerald-500/40' : anyOn ? 'border-amber-500/40' : 'border-red-500/30';

    const components = [
        { key: 'goals', label: 'Goals', icon: Target, color: 'text-rose-400' },
        { key: 'rhythms', label: 'Rhythms', icon: Clock, color: 'text-cyan-400' },
        { key: 'social', label: 'Social', icon: Users, color: 'text-amber-400' }
    ];

    const controlsDisabled = !enabled || loading;

    return (
        <div className={`rounded-xl border ${borderColor} bg-black/40 backdrop-blur-sm p-3 ${glowColor} transition-all duration-500 ${!enabled ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    {allOn ? <Zap className="w-3.5 h-3.5 text-emerald-400" /> : <ZapOff className="w-3.5 h-3.5 text-zinc-500" />}
                    <span className="text-[10px] uppercase tracking-[0.3em] text-zinc-400 font-bold">Autopilot</span>
                </div>
                <button
                    onClick={() => toggle(!allOn)}
                    disabled={controlsDisabled}
                    className={`relative w-9 h-5 rounded-full transition-colors duration-300 ${allOn ? 'bg-emerald-500/60' : 'bg-zinc-700'}`}
                >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform duration-300 ${allOn ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
            </div>
            {error && (
                <div className="mb-2 text-[9px] text-rose-400 uppercase tracking-[0.25em] font-bold">{error}</div>
            )}
            <div className="flex gap-1.5">
                {components.map(({ key, label, icon: Icon, color }) => (
                    <button
                        key={key}
                        onClick={() => toggle(!status.components[key], key)}
                        disabled={controlsDisabled}
                        className={`flex-1 flex items-center justify-center gap-1 px-1.5 py-1 rounded-md text-[9px] font-mono transition-all
                            ${status.components[key] ? `bg-white/[0.06] ${color} border border-white/10` : 'bg-white/[0.02] text-zinc-600 border border-white/5'}`}
                    >
                        <Icon className="w-2.5 h-2.5" />
                        {label}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default AutopilotToggle;
