/**
 * SomaFloatingAssistant.jsx
 *
 * A persistent floating SOMA orb that lives over the entire Conceive app.
 * SOMA can navigate the app, open engagements, switch tabs, and guide the
 * user while maintaining a live conversation — all without leaving the chat.
 *
 * Action tags (stripped from displayed text, executed by the app):
 *   [ACTION:navigate:MODULE]         — switch to a nav module
 *   [ACTION:doc_tab:TAB]             — switch Documents sub-tab
 *   [ACTION:open_engagement:TITLE]   — open an engagement by name
 *   [ACTION:say:TEXT]                — SOMA says something mid-sequence
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Loader } from 'lucide-react';

const ACTION_RE = /\[ACTION:([^\]]+)\]/g;

function parseResponse(text) {
    const actions = [];
    const clean = text.replace(ACTION_RE, (_, cmd) => {
        const parts = cmd.split(':');
        const type = parts[0];
        const arg  = parts.slice(1).join(':');
        actions.push({ type, arg });
        return '';
    }).replace(/\s{2,}/g, ' ').trim();
    return { clean, actions };
}

function TypingDots() {
    return (
        <div className="flex space-x-1 py-1">
            {[0, 150, 300].map(d => (
                <span
                    key={d}
                    className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce"
                    style={{ animationDelay: `${d}ms` }}
                />
            ))}
        </div>
    );
}

export default function SomaFloatingAssistant({ appControls, engagement, onUnreadChange }) {
    const [open, setOpen]           = useState(false);
    const [msgs, setMsgs]           = useState([{
        id: 0, role: 'soma',
        text: "Hi! I'm SOMA. Ask me anything about your work — or ask me to find something and I'll navigate the app for you while we chat.",
    }]);
    const [input, setInput]         = useState('');
    const [loading, setLoading]     = useState(false);
    const [acting, setActing]       = useState(false);
    const [unread, setUnread]       = useState(0);
    const [hovered, setHovered]     = useState(false);

    const endRef      = useRef(null);
    const inputRef    = useRef(null);
    const openRef     = useRef(open);
    const hasGreeted  = useRef(false);
    useEffect(() => { openRef.current = open; }, [open]);

    const handleOpen = (val) => {
        setOpen(val);
        if (val) {
            setUnread(0);
            onUnreadChange?.(0);
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    };

    useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

    // ── Proactive background checks ─────────────────────────────────────────
    // SOMA watches the workspace and nudges the user when something is worth noting.
    useEffect(() => {
        const engs    = appControls.getEngagements?.() || [];
        const clients = appControls.getClients?.()     || [];
        if (!engs.length && !clients.length) return; // nothing to comment on yet

        // After 8 seconds, if SOMA hasn't said anything new, push a context-aware nudge
        const timer = setTimeout(() => {
            if (hasGreeted.current) return;
            hasGreeted.current = true;

            const overdue   = engs.filter(e => e.due_date && new Date(e.due_date) < new Date() && e.status !== 'completed');
            const active    = engs.filter(e => e.status === 'active');
            const highRisk  = engs.filter(e => e.priority === 'critical' || e.priority === 'high');

            let nudge = null;
            if (overdue.length > 0) {
                nudge = `Heads up — ${overdue.length === 1 ? `"${overdue[0].title}" is` : `${overdue.length} engagements are`} past their due date. Want me to pull them up?`;
            } else if (highRisk.length > 0) {
                nudge = `You have ${highRisk.length} high-priority engagement${highRisk.length > 1 ? 's' : ''} active. Let me know if you need a status summary.`;
            } else if (active.length > 0) {
                nudge = `You have ${active.length} active engagement${active.length > 1 ? 's' : ''}. I'm here if you need anything — ask me to find a file, summarise an engagement, or navigate anywhere.`;
            }

            if (nudge) addMsg({ id: Date.now(), role: 'soma', text: nudge });
        }, 8000);

        return () => clearTimeout(timer);
    // Only run once after first real data load
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appControls.getEngagements?.()?.length, appControls.getClients?.()?.length]);

    const addMsg = useCallback((msg) => {
        setMsgs(prev => [...prev, msg]);
        if (!openRef.current) {
            setUnread(prev => {
                const next = prev + 1;
                onUnreadChange?.(next);
                return next;
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const executeActions = useCallback(async (actions, engs) => {
        if (!actions.length) return;
        setActing(true);
        for (const { type, arg } of actions) {
            await new Promise(r => setTimeout(r, 450));
            switch (type) {
                case 'navigate':
                    appControls.navigate(arg);
                    break;
                case 'doc_tab':
                    appControls.setDocTab(arg);
                    break;
                case 'open_engagement': {
                    const match = (engs || []).find(e =>
                        String(e.id) === arg ||
                        e.title.toLowerCase().includes(arg.toLowerCase())
                    );
                    if (match) appControls.openEngagement(match);
                    break;
                }
                case 'say':
                    addMsg({ id: Date.now(), role: 'soma', text: arg });
                    break;
                default:
                    break;
            }
        }
        setActing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appControls]);

    const send = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');
        setMsgs(prev => [...prev, { id: Date.now(), role: 'user', text }]);
        setLoading(true);

        try {
            const engs    = appControls.getEngagements?.() || [];
            const clients = appControls.getClients?.()     || [];

            const context = {
                engagement_title: engagement?.title,
                client_name:      engagement?.client_name,
                // Let SOMA know what's available so she can navigate intelligently
                app_context: [
                    `Available navigation modules: dashboard, clients, engagements, documents, assistant, kevin, settings.`,
                    `Documents has three sub-tabs: computer (full filesystem browser), intelligence (semantic file search), excel (Excel tools + Number Hunter).`,
                    `Current engagements: ${engs.slice(0, 8).map(e => `"${e.title}" (${e.status})`).join(', ') || 'none yet'}.`,
                    `Clients: ${clients.slice(0, 6).map(c => c.name).join(', ') || 'none yet'}.`,
                    `You can navigate the app by embedding action tags in your response (they are invisible to the user):`,
                    `  [ACTION:navigate:MODULE] — go to a module`,
                    `  [ACTION:doc_tab:TAB] — switch documents sub-tab (computer | intelligence | excel)`,
                    `  [ACTION:open_engagement:TITLE] — open an engagement by name`,
                    `  [ACTION:say:MESSAGE] — say something mid-navigation sequence`,
                    `Be proactive. If the user asks to find something, navigate there AND explain what you did.`,
                    `Keep responses short, warm, and confident. You are an expert auditor's AI partner.`,
                ].join(' '),
            };

            const res  = await fetch('/api/conceive/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text, context }),
            });
            const data = await res.json();
            const raw  = data.success ? data.response : `I couldn't reach the backend right now. Make sure SOMA is running.`;

            const { clean, actions } = parseResponse(raw);

            addMsg({
                id:         Date.now() + 1,
                role:       'soma',
                text:       clean,
                didNavigate: actions.some(a => a.type !== 'say'),
            });

            if (actions.length) executeActions(actions, engs);

        } catch (err) {
            addMsg({ id: Date.now() + 1, role: 'soma', text: `Connection error: ${err.message}` });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="absolute bottom-6 right-6 z-50 flex flex-col items-end space-y-3 pointer-events-none">

            {/* ── Chat panel ────────────────────────────────────────────── */}
            {open && (
                <div
                    className="w-[320px] bg-[#111113] border border-white/10 rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden pointer-events-auto"
                    style={{ height: 440 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#18181b] shrink-0">
                        <div className="flex items-center space-x-2">
                            <div className={`w-2 h-2 rounded-full transition-colors ${acting ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                            <span className="text-sm font-bold text-white">SOMA</span>
                            {acting
                                ? <span className="text-[10px] text-amber-400 animate-pulse">taking control…</span>
                                : <span className="text-[10px] text-zinc-600">audit intelligence</span>
                            }
                        </div>
                        <button
                            onClick={() => handleOpen(false)}
                            className="text-zinc-600 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* App control indicator */}
                    {acting && (
                        <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/10 shrink-0">
                            <p className="text-[10px] text-amber-400 flex items-center space-x-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-ping shrink-0" />
                                <span>SOMA is navigating the app for you…</span>
                            </p>
                        </div>
                    )}

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
                        {msgs.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role === 'soma' && (
                                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                                        <Sparkles className="w-3 h-3 text-white" />
                                    </div>
                                )}
                                <div className={`max-w-[84%] text-xs leading-relaxed px-3 py-2.5 rounded-2xl ${
                                    msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-tr-sm'
                                        : 'bg-white/5 border border-white/5 text-zinc-200 rounded-tl-sm'
                                }`}>
                                    {msg.text}
                                    {msg.didNavigate && (
                                        <div className="mt-1.5 text-[10px] text-amber-400/80 flex items-center space-x-1">
                                            <span>↳</span><span>navigated the app</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 mr-2 mt-0.5">
                                    <Loader className="w-3 h-3 text-white animate-spin" />
                                </div>
                                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-sm px-3 py-2">
                                    <TypingDots />
                                </div>
                            </div>
                        )}
                        <div ref={endRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 border-t border-white/5 shrink-0">
                        <div className="flex items-center space-x-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 focus-within:border-blue-500/40 transition-colors">
                            <input
                                ref={inputRef}
                                className="flex-1 bg-transparent text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                                placeholder="Ask SOMA anything…"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
                                }}
                            />
                            <button
                                onClick={send}
                                disabled={!input.trim() || loading}
                                className="text-zinc-600 hover:text-blue-400 disabled:opacity-30 transition-colors shrink-0"
                            >
                                <Send className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        <p className="text-[9px] text-zinc-700 mt-1.5 text-center">SOMA can navigate the app for you</p>
                    </div>
                </div>
            )}

            {/* ── Orb button ────────────────────────────────────────────── */}
            <div className="relative pointer-events-auto">
                {/* Unread badge */}
                {unread > 0 && !open && (
                    <div className="absolute -top-1.5 -right-1.5 z-10 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1 shadow-lg">
                        <span className="text-[9px] text-white font-bold leading-none">
                            {unread > 9 ? '9+' : unread}
                        </span>
                    </div>
                )}
                <button
                    onClick={() => handleOpen(!open)}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    title="Talk to SOMA"
                    className={`
                        flex items-center justify-center
                        bg-gradient-to-br from-blue-500 to-purple-600
                        shadow-2xl transition-all duration-200
                        active:scale-95
                        ${open || hovered || acting
                            ? 'w-14 h-14 rounded-2xl shadow-purple-500/40 opacity-100'
                            : 'w-4 h-4 rounded-full shadow-none opacity-50 hover:opacity-100'}
                        ${acting ? 'ring-2 ring-amber-400/60' : ''}
                        ${open   ? 'ring-2 ring-white/20' : ''}
                    `}
                >
                    {(open || hovered || acting) && (
                        <Sparkles className={`text-white w-6 h-6 ${acting ? 'animate-spin' : ''}`} />
                    )}
                </button>
            </div>
        </div>
    );
}
