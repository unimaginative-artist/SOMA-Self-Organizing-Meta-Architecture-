/**
 * ConceiveCommandBridge.jsx
 * Standalone Conceive application — professional audit & finance platform
 * powered by SOMA AI. Stripped and rebranded for client deployment.
 *
 * Modules: Dashboard · Clients · Engagements · Documents · AI Chat · K.E.V.I.N. · Terminal · Settings
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Building2, Briefcase, FileText,
    Shield, Settings, ChevronRight, Plus, Trash2,
    Edit3, Search, AlertTriangle, Loader,
    Check, X, Download, RefreshCw,
    Mail, Terminal, LayoutDashboard, FolderOpen, Hash, GripVertical,
    HardDrive
} from 'lucide-react';

import { exportEngagementToExcel } from './components/DocumentsModule.jsx';
import ExcelToolsModule from './components/ExcelToolsModule.jsx';
import FileIntelligenceApp from '../command-bridge/components/FileIntelligence/FileIntelligenceApp.jsx';
import FileSystemBrowser from './components/FileSystemBrowser.jsx';
import SomaFloatingAssistant from './components/SomaFloatingAssistant.jsx';
import KevinInterface from '../command-bridge/KevinInterface.jsx';
import SomaCT from '../command-ct/SomaCT.jsx';

const API = '/api/conceive';

// ── API helper ────────────────────────────────────────────────────────────────

const apiFetch = async (path, opts = {}) => {
    const res = await fetch(`${API}${path}`, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Request failed');
    return data;
};

// ── Style helpers ─────────────────────────────────────────────────────────────

const priorityColors = {
    critical: 'bg-red-500/10 text-red-400 border-red-500/20',
    high:     'bg-orange-500/10 text-orange-400 border-orange-500/20',
    medium:   'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    low:      'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
};

const statusColors = {
    active:    'bg-blue-500/10 text-blue-400 border-blue-500/20',
    review:    'bg-purple-500/10 text-purple-400 border-purple-500/20',
    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    on_hold:   'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ stats, engagements, onSelectEngagement }) {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return (
        <div className="p-8 space-y-6 max-w-5xl">
            <div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{greeting}</h2>
                <p className="text-zinc-500 mt-1">Here's a snapshot of your active work.</p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Clients', value: stats.clients ?? 0, icon: Building2, color: 'blue' },
                    { label: 'Active Engagements', value: stats.active_engagements ?? 0, icon: Briefcase, color: 'purple' },
                    { label: 'Documents Filed', value: stats.files_processed ?? 0, icon: FileText, color: 'emerald' },
                    { label: 'Decisions Logged', value: stats.decisions_logged ?? 0, icon: Shield, color: 'amber' },
                ].map(s => (
                    <div key={s.label} className={`bg-[#151518] border border-white/5 rounded-2xl p-5 flex items-center space-x-4`}>
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-${s.color}-500/10`}>
                            <s.icon className={`w-6 h-6 text-${s.color}-400`} />
                        </div>
                        <div>
                            <div className="text-3xl font-bold text-white">{s.value}</div>
                            <div className="text-xs text-zinc-500 mt-0.5">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-[#151518] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="font-semibold text-white">Active Engagements</h3>
                    <span className="text-xs text-zinc-600">{engagements.filter(e => e.status === 'active').length} active</span>
                </div>
                {engagements.length === 0 ? (
                    <div className="p-16 text-center text-zinc-700">
                        <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-20" />
                        <p>No engagements yet. Add a client and create your first engagement.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {engagements.slice(0, 8).map(eng => (
                            <button
                                key={eng.id}
                                onClick={() => onSelectEngagement(eng)}
                                className="w-full px-6 py-4 flex items-center space-x-4 hover:bg-white/5 transition-colors text-left group"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="font-medium text-white truncate">{eng.title}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${priorityColors[eng.priority] || priorityColors.medium}`}>{eng.priority}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColors[eng.status] || statusColors.active}`}>{eng.status?.replace('_',' ')}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500 flex items-center space-x-2">
                                        {eng.client_name && <span>{eng.client_name}</span>}
                                        {eng.due_date && <><span>·</span><span>Due {eng.due_date}</span></>}
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="text-sm font-bold text-white">{eng.progress}%</div>
                                    <div className="mt-1 w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${eng.progress}%` }} />
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 transition-colors shrink-0" />
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Client CRUD ───────────────────────────────────────────────────────────────

function ClientModal({ client, onSave, onClose }) {
    const [form, setForm] = useState({
        name: client?.name || '', industry: client?.industry || '',
        contact_name: client?.contact_name || '', contact_email: client?.contact_email || '',
        notes: client?.notes || '',
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const save = async () => {
        if (!form.name.trim()) return;
        setSaving(true);
        setSaveError(null);
        try {
            if (client?.id) await apiFetch(`/clients/${client.id}`, { method: 'PUT', body: form });
            else await apiFetch('/clients', { method: 'POST', body: form });
            onSave();
        } catch (err) {
            console.error(err);
            setSaveError(err.message || 'Save failed — is the backend running?');
        } finally { setSaving(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                    <h3 className="font-bold text-white">{client ? 'Edit Client' : 'New Client'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {[['Company Name *','name','Acme Corp'],['Industry','industry','Financial Services'],['Contact Name','contact_name','Jane Smith'],['Contact Email','contact_email','jane@acme.com']].map(([label,key,ph]) => (
                        <div key={key}>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
                            <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50" placeholder={ph} value={form[key]} onChange={e => setForm(p => ({...p,[key]:e.target.value}))} />
                        </div>
                    ))}
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
                        <textarea className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 resize-none" rows={3} value={form.notes} onChange={e => setForm(p => ({...p,notes:e.target.value}))} />
                    </div>
                </div>
                {saveError && (
                    <div className="mx-6 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center space-x-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span>{saveError}</span>
                    </div>
                )}
                <div className="px-6 py-4 border-t border-white/5 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                    <button onClick={save} disabled={!form.name.trim() || saving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2">
                        {saving && <Loader className="w-3.5 h-3.5 animate-spin" />}
                        <span>{client ? 'Save' : 'Create'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function ClientsView({ clients, onRefresh }) {
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.industry?.toLowerCase().includes(search.toLowerCase()));
    const del = async (id) => { if (!confirm('Delete this client and all their data?')) return; await apiFetch(`/clients/${id}`,{method:'DELETE'}); onRefresh(); };
    return (
        <div className="p-8 space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-bold text-white">Clients</h2><p className="text-zinc-500 text-sm mt-0.5">{clients.length} client{clients.length!==1?'s':''}</p></div>
                <button onClick={() => {setEditing(null);setModal(true);}} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4"/><span>New Client</span></button>
            </div>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"/><input className="w-full bg-[#151518] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50" placeholder="Search clients..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
            {filtered.length === 0 ? (
                <div className="py-20 text-center text-zinc-600"><Building2 className="w-10 h-10 mx-auto mb-3 opacity-30"/><p>No clients yet</p></div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map(c => (
                        <div key={c.id} className="bg-[#151518] border border-white/5 rounded-xl p-5">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center"><Building2 className="w-5 h-5 text-blue-400"/></div>
                                    <div>
                                        <div className="font-semibold text-white">{c.name}</div>
                                        <div className="text-xs text-zinc-500">{c.industry}{c.contact_name && ` · ${c.contact_name}`}{c.contact_email && ` · ${c.contact_email}`}</div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button onClick={() => {setEditing(c);setModal(true);}} className="p-1.5 text-zinc-500 hover:text-white hover:bg-white/5 rounded-lg"><Edit3 className="w-4 h-4"/></button>
                                    <button onClick={() => del(c.id)} className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                                </div>
                            </div>
                            {c.notes && <p className="mt-2 text-xs text-zinc-600 pl-13">{c.notes}</p>}
                        </div>
                    ))}
                </div>
            )}
            {modal && <ClientModal client={editing} onSave={() => {setModal(false);onRefresh();}} onClose={() => setModal(false)}/>}
        </div>
    );
}

// ── Engagement CRUD ───────────────────────────────────────────────────────────

function EngagementModal({ engagement, clients, onSave, onClose }) {
    const [form, setForm] = useState({
        client_id: engagement?.client_id ?? '',
        title: engagement?.title || '',
        type: engagement?.type || 'Audit',
        status: engagement?.status || 'active',
        priority: engagement?.priority || 'medium',
        progress: engagement?.progress ?? 0,
        due_date: engagement?.due_date || '',
        objective: engagement?.objective || '',
        notes: engagement?.notes || '',
    });
    const [saving, setSaving] = useState(false);
    const [saveError, setSaveError] = useState(null);
    const save = async () => {
        if (!form.title.trim()) return;
        setSaving(true);
        setSaveError(null);
        try {
            if (engagement?.id) await apiFetch(`/engagements/${engagement.id}`,{method:'PUT',body:form});
            else await apiFetch('/engagements',{method:'POST',body:form});
            onSave();
        } catch(err) {
            console.error(err);
            setSaveError(err.message || 'Save failed — is the backend running?');
        } finally { setSaving(false); }
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-[#18181b] border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl" onClick={e=>e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/5">
                    <h3 className="font-bold text-white">{engagement ? 'Edit Engagement' : 'New Engagement'}</h3>
                    <button onClick={onClose}><X className="w-5 h-5 text-zinc-500 hover:text-white"/></button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Client</label>
                        <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none" value={form.client_id} onChange={e=>setForm(p=>({...p,client_id:e.target.value}))}>
                            <option value="">— No client —</option>
                            {clients.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Title *</label>
                        <input className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50" placeholder="Q4 Financial Audit" value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))}/>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[['Type','type',['Audit','Tax Review','Compliance','Forensic','Advisory','Due Diligence','Other']],['Priority','priority',['low','medium','high','critical']],['Status','status',['active','review','completed','on_hold']]].map(([label,key,opts])=>(
                            <div key={key}>
                                <label className="block text-xs font-medium text-zinc-400 mb-1.5">{label}</label>
                                <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50 appearance-none" value={form[key]} onChange={e=>setForm(p=>({...p,[key]:e.target.value}))}>
                                    {opts.map(o=><option key={o} value={o}>{o.replace('_',' ').replace(/^\w/,c=>c.toUpperCase())}</option>)}
                                </select>
                            </div>
                        ))}
                        <div>
                            <label className="block text-xs font-medium text-zinc-400 mb-1.5">Due Date</label>
                            <input type="date" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50" value={form.due_date} onChange={e=>setForm(p=>({...p,due_date:e.target.value}))}/>
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Progress: {form.progress}%</label>
                        <input type="range" min={0} max={100} step={5} className="w-full accent-blue-500" value={form.progress} onChange={e=>setForm(p=>({...p,progress:parseInt(e.target.value)}))}/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Objective</label>
                        <textarea className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 resize-none" rows={2} placeholder="Primary objective..." value={form.objective} onChange={e=>setForm(p=>({...p,objective:e.target.value}))}/>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1.5">Notes</label>
                        <textarea className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50 resize-none" rows={2} value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))}/>
                    </div>
                </div>
                {saveError && (
                    <div className="mx-6 mb-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400 flex items-center space-x-2">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" /><span>{saveError}</span>
                    </div>
                )}
                <div className="px-6 py-4 border-t border-white/5 flex justify-end space-x-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-zinc-400 hover:text-white">Cancel</button>
                    <button onClick={save} disabled={!form.title.trim() || saving} className="px-5 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2">
                        {saving && <Loader className="w-3.5 h-3.5 animate-spin" />}
                        <span>{engagement?'Save':'Create'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}

function EngagementsView({ engagements, clients, onRefresh, onSelectEngagement, onOpenDocuments }) {
    const [modal, setModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const filtered = engagements.filter(e => {
        const ms = e.title.toLowerCase().includes(search.toLowerCase()) || (e.client_name||'').toLowerCase().includes(search.toLowerCase());
        const mf = filterStatus === 'all' || e.status === filterStatus;
        return ms && mf;
    });
    const del = async (id) => { if (!confirm('Delete this engagement?')) return; await apiFetch(`/engagements/${id}`,{method:'DELETE'}); onRefresh(); };
    return (
        <div className="p-8 space-y-4 max-w-5xl">
            <div className="flex items-center justify-between">
                <div><h2 className="text-2xl font-bold text-white">Engagements</h2><p className="text-zinc-500 text-sm mt-0.5">{engagements.length} total</p></div>
                <button onClick={()=>{setEditing(null);setModal(true);}} className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"><Plus className="w-4 h-4"/><span>New Engagement</span></button>
            </div>
            <div className="flex space-x-3">
                <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"/><input className="w-full bg-[#151518] border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-blue-500/50" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)}/></div>
                <select className="bg-[#151518] border border-white/5 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none appearance-none" value={filterStatus} onChange={e=>setFilterStatus(e.target.value)}>
                    {['all','active','review','completed','on_hold'].map(s=><option key={s} value={s}>{s==='all'?'All Status':s.replace('_',' ').replace(/^\w/,c=>c.toUpperCase())}</option>)}
                </select>
            </div>
            {filtered.length === 0 ? (
                <div className="py-20 text-center text-zinc-600"><Briefcase className="w-10 h-10 mx-auto mb-3 opacity-30"/><p>No engagements found</p></div>
            ) : (
                <div className="grid gap-3">
                    {filtered.map(eng => (
                        <div key={eng.id} className="bg-[#151518] border border-white/5 rounded-xl hover:border-white/10 transition-all">
                            <button className="w-full px-6 py-4 flex items-start space-x-4 text-left" onClick={() => onSelectEngagement(eng)}>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <span className="font-semibold text-white">{eng.title}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${priorityColors[eng.priority]||priorityColors.medium}`}>{eng.priority}</span>
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${statusColors[eng.status]||statusColors.active}`}>{eng.status?.replace('_',' ')}</span>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase border border-white/10 text-zinc-400">{eng.type}</span>
                                    </div>
                                    <div className="text-xs text-zinc-500 flex items-center space-x-3">
                                        {eng.client_name && <span>{eng.client_name}</span>}
                                        {eng.due_date && <><span>·</span><span>Due {eng.due_date}</span></>}
                                    </div>
                                    <div className="mt-3 flex items-center space-x-2">
                                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{width:`${eng.progress}%`}}/></div>
                                        <span className="text-xs text-zinc-500">{eng.progress}%</span>
                                    </div>
                                </div>
                                <ChevronRight className="w-4 h-4 text-zinc-600 shrink-0 mt-1"/>
                            </button>
                            <div className="px-6 py-3 border-t border-white/5 flex justify-end space-x-2">
                                <button onClick={() => onOpenDocuments(eng)} className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-colors"><FolderOpen className="w-3.5 h-3.5"/><span>Documents</span></button>
                                <button onClick={()=>{setEditing(eng);setModal(true);}} className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><Edit3 className="w-3.5 h-3.5"/><span>Edit</span></button>
                                <button onClick={()=>del(eng.id)} className="flex items-center space-x-1.5 px-3 py-1.5 text-xs text-zinc-500 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5"/><span>Delete</span></button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            {modal && <EngagementModal engagement={editing} clients={clients} onSave={()=>{setModal(false);onRefresh();}} onClose={()=>setModal(false)}/>}
        </div>
    );
}

// ── Settings ──────────────────────────────────────────────────────────────────

function SettingsView() {
    const [somaStatus, setSomaStatus]   = useState(null); // null | 'checking' | 'ok' | 'error'
    const [somaMsg, setSomaMsg]         = useState('');

    const testSoma = async () => {
        setSomaStatus('checking');
        setSomaMsg('');
        try {
            const r = await fetch('/api/conceive/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Reply with exactly two words: SOMA READY', context: {} }),
            });
            const d = await r.json();
            if (d.success && d.response) {
                setSomaStatus('ok');
                setSomaMsg(d.response.slice(0, 120));
            } else {
                setSomaStatus('error');
                setSomaMsg(d.error || 'No response');
            }
        } catch (err) {
            setSomaStatus('error');
            setSomaMsg(err.message);
        }
    };

    return (
        <div className="p-8 space-y-6 max-w-2xl">
            <div><h2 className="text-2xl font-bold text-white">Settings</h2><p className="text-zinc-500 text-sm mt-0.5">Configure your Conceive workspace.</p></div>

            {/* SOMA AI Status */}
            <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white">SOMA AI Connection</h3>
                    <button
                        onClick={testSoma}
                        disabled={somaStatus === 'checking'}
                        className="flex items-center space-x-2 px-4 py-2 text-xs font-medium rounded-lg border transition-colors disabled:opacity-50 border-white/10 text-zinc-400 hover:text-white hover:bg-white/5"
                    >
                        {somaStatus === 'checking'
                            ? <><Loader className="w-3.5 h-3.5 animate-spin" /><span>Testing...</span></>
                            : <><RefreshCw className="w-3.5 h-3.5" /><span>Test connection</span></>}
                    </button>
                </div>
                {somaStatus === 'ok' && (
                    <div className="flex items-start space-x-2 text-sm text-emerald-400 bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-3">
                        <Check className="w-4 h-4 shrink-0 mt-0.5" />
                        <div><div className="font-medium">SOMA is online</div><div className="text-emerald-600 text-xs mt-0.5 font-mono">{somaMsg}</div></div>
                    </div>
                )}
                {somaStatus === 'error' && (
                    <div className="flex items-start space-x-2 text-sm text-red-400 bg-red-500/5 border border-red-500/15 rounded-xl p-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div><div className="font-medium">SOMA is not responding</div><div className="text-red-600 text-xs mt-0.5 font-mono">{somaMsg}</div></div>
                    </div>
                )}
                {somaStatus === null && (
                    <p className="text-sm text-zinc-600">Click "Test connection" to verify SOMA AI is running and responsive.</p>
                )}
            </div>

            {/* About */}
            <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-white">About Conceive</h3>
                <div className="space-y-2 text-sm text-zinc-400">
                    <div className="flex justify-between"><span>Version</span><span className="text-white font-mono">1.0.0</span></div>
                    <div className="flex justify-between"><span>AI Engine</span><span className="text-white">SOMA QuadBrain</span></div>
                    <div className="flex justify-between"><span>Storage</span><span className="text-white">Local SQLite</span></div>
                    <div className="flex justify-between"><span>File Browser</span><span className="text-white">Server-side full filesystem</span></div>
                    <div className="flex justify-between"><span>Excel Engine</span><span className="text-white">SheetJS (xlsx)</span></div>
                </div>
            </div>

            {/* Data & Privacy */}
            <div className="bg-[#151518] border border-white/5 rounded-2xl p-6 space-y-4">
                <h3 className="font-semibold text-white">Data & Privacy</h3>
                <p className="text-sm text-zinc-500">All engagement data is stored locally on this machine. No data is sent to external servers — SOMA AI runs entirely on your local machine.</p>
                <p className="text-sm text-zinc-500">File browsing is read-only — Conceive never modifies your files.</p>
            </div>
        </div>
    );
}

// ── Nav definition (outside component so it's stable) ─────────────────────────

const DEFAULT_NAV = [
    { id: 'dashboard',   label: 'Dashboard',  icon: LayoutDashboard, color: 'blue'    },
    { id: 'clients',     label: 'Clients',     icon: Building2,       color: 'blue'    },
    { id: 'engagements', label: 'Engagements', icon: Briefcase,       color: 'purple'  },
    { id: 'documents',   label: 'Documents',   icon: FolderOpen,      color: 'emerald' },
    { id: 'assistant',   label: 'Assistant',   icon: Terminal,        color: 'amber'   },
    { id: 'kevin',       label: 'K.E.V.I.N.', icon: Mail,            color: 'red'     },
    { id: 'settings',    label: 'Settings',    icon: Settings,        color: 'stone'   },
];

// ── Main App ──────────────────────────────────────────────────────────────────

export default function ConceiveCommandBridge() {
    const [activeModule, setActiveModule]     = useState('dashboard');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [clients, setClients]               = useState([]);
    const [engagements, setEngagements]       = useState([]);
    const [stats, setStats]                   = useState({});
    const [backendError, setBackendError]     = useState(null);
    const [selectedEngagement, setSelectedEngagement] = useState(null);
    const [loading, setLoading]               = useState(true);
    const [docTab, setDocTab]                 = useState('intelligence');
    const [pendingExcelFile, setPendingExcelFile] = useState(null);
    const [somaUnread, setSomaUnread]         = useState(0);

    // ── Draggable nav order (persisted to localStorage) ────────────────────
    const [navOrder, setNavOrder] = useState(() => {
        try {
            const saved = localStorage.getItem('conceive_nav_order');
            if (saved) {
                const order = JSON.parse(saved);
                if (DEFAULT_NAV.every(m => order.includes(m.id))) return order;
            }
        } catch (_) {}
        return DEFAULT_NAV.map(m => m.id);
    });
    const draggedId  = useRef(null);
    const [dragOverId, setDragOverId] = useState(null);

    const navModules = navOrder.map(id => DEFAULT_NAV.find(m => m.id === id)).filter(Boolean);

    const handleDragStart = (e, id) => {
        draggedId.current = id;
        e.dataTransfer.effectAllowed = 'move';
    };
    const handleDragOver = (e, id) => {
        e.preventDefault();
        if (draggedId.current !== id) setDragOverId(id);
    };
    const handleDrop = (e, targetId) => {
        e.preventDefault();
        const from = draggedId.current;
        if (!from || from === targetId) { setDragOverId(null); return; }
        setNavOrder(prev => {
            const arr = [...prev];
            const fi = arr.indexOf(from);
            const ti = arr.indexOf(targetId);
            arr.splice(fi, 1);
            arr.splice(ti, 0, from);
            localStorage.setItem('conceive_nav_order', JSON.stringify(arr));
            return arr;
        });
        draggedId.current = null;
        setDragOverId(null);
    };
    const handleDragEnd = () => { draggedId.current = null; setDragOverId(null); };

    // ── Data loading ────────────────────────────────────────────────────────
    const loadAll = useCallback(async () => {
        setLoading(true);
        setBackendError(null);
        try {
            const [cr, er, sr] = await Promise.all([
                apiFetch('/clients'),
                apiFetch('/engagements'),
                apiFetch('/stats'),
            ]);
            setClients(cr.clients || []);
            setEngagements(er.engagements || []);
            setStats(sr.stats || {});
        } catch (err) {
            console.error('[Conceive]', err);
            setBackendError(err.message || 'Could not reach backend — is SOMA running?');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { loadAll(); }, [loadAll]);

    const handleSelectEngagement = (eng) => {
        setSelectedEngagement(eng);
        setActiveModule('engagements');
    };
    const handleOpenDocuments = (eng) => {
        setSelectedEngagement(eng);
        setActiveModule('documents');
    };
    const handleOpenInExcel = (fsFile) => {
        setPendingExcelFile(fsFile);
        setDocTab('excel');
        setActiveModule('documents');
    };

    // Full-height modules (manage their own scroll)
    const fullHeightModules = new Set(['documents', 'kevin', 'assistant']);

    return (
        <div className="relative flex h-screen w-screen bg-[#09090b] text-white overflow-hidden">
            {/* Sidebar */}
            <aside className={`${sidebarCollapsed ? 'w-16' : 'w-60'} bg-[#0d0d0f] border-r border-white/5 flex flex-col transition-all duration-300 overflow-hidden shrink-0`}>

                {/* Brand — click to collapse/expand */}
                <button
                    onClick={() => setSidebarCollapsed(c => !c)}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    className={`flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'space-x-3 px-5'} py-5 border-b border-white/5 w-full hover:bg-white/3 transition-colors group`}
                >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shrink-0 group-hover:opacity-80 transition-opacity">
                        <Briefcase className="w-4 h-4 text-white" />
                    </div>
                    {!sidebarCollapsed && (
                        <div className="min-w-0 text-left">
                            <div className="font-bold text-white text-lg leading-none">Conceive</div>
                            <div className="text-[10px] text-zinc-600 mt-0.5 uppercase tracking-widest">Audit Intelligence</div>
                        </div>
                    )}
                </button>

                {/* Nav — grip handle to reorder, button to navigate */}
                <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
                    {navModules.map(mod => (
                        <div
                            key={mod.id}
                            onDragOver={e => handleDragOver(e, mod.id)}
                            onDrop={e => handleDrop(e, mod.id)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center group transition-opacity ${dragOverId === mod.id ? 'opacity-30 scale-95' : 'opacity-100'}`}
                        >
                            {/* Grip handle — only when sidebar is expanded, only visible on hover */}
                            {!sidebarCollapsed && (
                                <span
                                    draggable
                                    onDragStart={e => handleDragStart(e, mod.id)}
                                    title="Drag to reorder"
                                    className="pl-1 pr-0.5 py-2.5 text-zinc-700 hover:text-zinc-400 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0 select-none"
                                >
                                    <GripVertical className="w-3.5 h-3.5" />
                                </span>
                            )}
                            {/* Nav button */}
                            <button
                                onClick={() => { setActiveModule(mod.id); if (mod.id === 'assistant') setSomaUnread(0); }}
                                title={sidebarCollapsed ? mod.label : undefined}
                                className={`relative flex-1 flex items-center ${sidebarCollapsed ? 'justify-center px-3' : 'space-x-3 px-3'} py-2.5 rounded-xl transition-all duration-200 ${activeModule === mod.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-200'}`}
                            >
                                <mod.icon className={`w-5 h-5 shrink-0 ${activeModule === mod.id ? `text-${mod.color}-400` : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                                {!sidebarCollapsed && <span className="font-medium text-sm">{mod.label}</span>}
                                {/* Unread badge for Assistant tab */}
                                {mod.id === 'assistant' && somaUnread > 0 && (
                                    <span className={`${sidebarCollapsed ? 'absolute top-1 right-1' : 'ml-auto'} min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center px-1`}>
                                        <span className="text-[9px] text-white font-bold leading-none">{somaUnread > 9 ? '9+' : somaUnread}</span>
                                    </span>
                                )}
                            </button>
                        </div>
                    ))}
                </nav>

                {/* Stats footer (no button — logo handles collapse) */}
                {!sidebarCollapsed && (
                    <div className="border-t border-white/5 p-4 space-y-1.5">
                        <div className="flex justify-between text-xs"><span className="text-zinc-700">Clients</span><span className="text-zinc-500">{stats.clients ?? 0}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-zinc-700">Active</span><span className="text-zinc-500">{stats.active_engagements ?? 0}</span></div>
                        <div className="flex justify-between text-xs"><span className="text-zinc-700">Files</span><span className="text-zinc-500">{stats.files_processed ?? 0}</span></div>
                    </div>
                )}
            </aside>

            {/* Main content */}
            <main className={`flex-1 flex flex-col ${fullHeightModules.has(activeModule) ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                {loading ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-zinc-600">
                            <Loader className="w-8 h-8 animate-spin mx-auto mb-3" />
                            <p className="text-sm">Connecting to SOMA backend...</p>
                        </div>
                    </div>
                ) : backendError ? (
                    <div className="flex-1 flex items-center justify-center p-8">
                        <div className="max-w-md text-center space-y-4">
                            <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
                                <AlertTriangle className="w-7 h-7 text-red-400" />
                            </div>
                            <h2 className="text-lg font-semibold text-white">Backend not reachable</h2>
                            <p className="text-sm text-zinc-500 leading-relaxed">
                                Make sure SOMA is running (<span className="font-mono text-zinc-400">npm run start:all</span>), then retry.
                            </p>
                            <p className="text-xs text-zinc-700 font-mono">{backendError}</p>
                            <button
                                onClick={loadAll}
                                className="flex items-center space-x-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors mx-auto"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Retry connection</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        {activeModule === 'dashboard' && (
                            <Dashboard stats={stats} engagements={engagements} onSelectEngagement={handleSelectEngagement} />
                        )}

                        {activeModule === 'clients' && (
                            <ClientsView clients={clients} onRefresh={loadAll} />
                        )}

                        {activeModule === 'engagements' && (
                            <EngagementsView
                                engagements={engagements}
                                clients={clients}
                                onRefresh={loadAll}
                                onSelectEngagement={handleSelectEngagement}
                                onOpenDocuments={handleOpenDocuments}
                            />
                        )}

                        {activeModule === 'documents' && (
                            <div className="flex-1 flex flex-col overflow-hidden h-full">
                                {/* Top bar */}
                                <div className="flex items-center justify-between px-5 py-3 bg-[#151518] border-b border-white/5 shrink-0">

                                    {/* Tab switcher */}
                                    <div className="flex items-center space-x-1 bg-black/20 rounded-xl p-1">
                                        {[
                                            { id: 'intelligence', label: 'Intelligence',  sub: 'Semantic search',  icon: Search,    color: 'blue'    },
                                            { id: 'computer',     label: 'Browse',        sub: 'Full filesystem',  icon: HardDrive, color: 'emerald' },
                                            { id: 'excel',        label: 'Excel',         sub: 'Number Hunter',    icon: Hash,      color: 'amber'   },
                                        ].map(t => (
                                            <button
                                                key={t.id}
                                                onClick={() => setDocTab(t.id)}
                                                className={`flex items-center space-x-2.5 px-4 py-2 rounded-lg transition-all ${docTab === t.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                            >
                                                <t.icon className={`w-4 h-4 shrink-0 transition-colors ${docTab === t.id ? `text-${t.color}-400` : ''}`} />
                                                <div className="text-left leading-none">
                                                    <div className="text-xs font-semibold">{t.label}</div>
                                                    <div className="text-[10px] text-zinc-600 mt-0.5">{t.sub}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>

                                    {/* Engagement context pill */}
                                    {selectedEngagement ? (
                                        <div className="flex items-center space-x-2 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2">
                                            <Briefcase className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                            <div className="leading-none">
                                                <div className="text-xs font-medium text-white">{selectedEngagement.title}</div>
                                                {selectedEngagement.client_name && (
                                                    <div className="text-[10px] text-zinc-500 mt-0.5">{selectedEngagement.client_name}</div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => setSelectedEngagement(null)}
                                                className="text-zinc-700 hover:text-zinc-400 transition-colors ml-1"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setActiveModule('engagements')}
                                            className="flex items-center space-x-1.5 text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                                        >
                                            <Briefcase className="w-3.5 h-3.5" />
                                            <span>Link engagement</span>
                                        </button>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 overflow-hidden">
                                    {docTab === 'computer' && (
                                        <FileSystemBrowser onOpenInExcel={handleOpenInExcel} />
                                    )}
                                    {docTab === 'intelligence' && <FileIntelligenceApp />}
                                    {docTab === 'excel' && (
                                        <ExcelToolsModule
                                            engagement={selectedEngagement}
                                            pendingFile={pendingExcelFile}
                                            onFileLoaded={() => setPendingExcelFile(null)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}

                        {activeModule === 'assistant' && (
                            <div className="flex-1 overflow-hidden">
                                <SomaCT hidePulse />
                            </div>
                        )}

                        {activeModule === 'kevin' && (
                            <div className="flex-1 overflow-hidden">
                                <KevinInterface />
                            </div>
                        )}

                        {activeModule === 'settings' && <SettingsView />}
                    </>
                )}
            </main>

            {/* ── Floating SOMA assistant orb ───────────────────────── */}
            <SomaFloatingAssistant
                engagement={selectedEngagement}
                onUnreadChange={setSomaUnread}
                appControls={{
                    navigate:        (mod) => { setActiveModule(mod); if (mod === 'assistant') setSomaUnread(0); },
                    setDocTab:       (tab) => { setDocTab(tab); setActiveModule('documents'); },
                    openEngagement:  handleSelectEngagement,
                    getEngagements:  () => engagements,
                    getClients:      () => clients,
                }}
            />
        </div>
    );
}
