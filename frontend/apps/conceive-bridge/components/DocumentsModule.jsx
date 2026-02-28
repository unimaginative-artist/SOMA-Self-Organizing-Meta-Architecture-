/**
 * DocumentsModule.jsx
 * Full document management for Conceive.
 *
 * Features:
 *  - Local file system browser (File System Access API — same as FileIntelligenceApp)
 *  - PDF viewer (native browser iframe/object)
 *  - Excel viewer (xlsx parsing → interactive table)
 *  - SnipDoc: draw a box on any image/page → SOMA AI extracts and explains the number
 *  - Number Hunter: type a value → find it across all open files
 *  - Export engagement data to Excel (.xlsx)
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
    FolderOpen, File, FileText, FileSpreadsheet, Image,
    Search, Download, Upload, ChevronRight, ChevronDown,
    AlertTriangle, Brain, X, Loader,
    Scissors, Hash, RefreshCw, Check, Eye
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fileIcon = (name) => {
    const ext = name?.split('.').pop()?.toLowerCase() || '';
    if (['xlsx', 'xls', 'csv'].includes(ext)) return { Icon: FileSpreadsheet, color: 'text-emerald-400' };
    if (['pdf'].includes(ext)) return { Icon: FileText, color: 'text-red-400' };
    if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) return { Icon: Image, color: 'text-blue-400' };
    return { Icon: File, color: 'text-zinc-400' };
};

const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ── File Tree Node ────────────────────────────────────────────────────────────

function TreeNode({ node, depth = 0, onSelect, selectedId }) {
    const [open, setOpen] = useState(depth < 1);
    const { Icon, color } = fileIcon(node.name);
    const isDir = node.kind === 'directory';
    const isSelected = selectedId === node.id;

    return (
        <div>
            <button
                className={`w-full flex items-center space-x-1.5 px-2 py-1 rounded text-left text-xs transition-colors ${isSelected ? 'bg-blue-500/20 text-blue-300' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}
                style={{ paddingLeft: `${8 + depth * 14}px` }}
                onClick={() => {
                    if (isDir) setOpen(o => !o);
                    else onSelect(node);
                }}
            >
                {isDir ? (
                    <>
                        {open ? <ChevronDown className="w-3 h-3 shrink-0 text-zinc-500" /> : <ChevronRight className="w-3 h-3 shrink-0 text-zinc-500" />}
                        <FolderOpen className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    </>
                ) : (
                    <>
                        <span className="w-3 h-3 shrink-0" />
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${color}`} />
                    </>
                )}
                <span className="truncate flex-1">{node.name}</span>
                {!isDir && node.metadata?.size && (
                    <span className="text-zinc-700 shrink-0">{formatSize(node.metadata.size)}</span>
                )}
            </button>
            {isDir && open && node.children?.map(child => (
                <TreeNode key={child.id} node={child} depth={depth + 1} onSelect={onSelect} selectedId={selectedId} />
            ))}
        </div>
    );
}

// ── PDF Viewer ────────────────────────────────────────────────────────────────

function PDFViewer({ blobUrl }) {
    return (
        <div className="flex-1 flex flex-col min-h-0">
            <iframe
                src={blobUrl}
                className="flex-1 w-full border-0 bg-white"
                title="PDF Document"
            />
        </div>
    );
}

// ── Excel Viewer ──────────────────────────────────────────────────────────────

function ExcelViewer({ workbook, onNumberFound }) {
    const [activeSheet, setActiveSheet] = useState(0);
    const [search, setSearch] = useState('');
    const [highlight, setHighlight] = useState(null);

    const sheets = workbook.SheetNames || [];
    const sheetName = sheets[activeSheet];
    const ws = workbook.Sheets[sheetName];
    const data = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) : [];

    // Find first non-empty column count
    const colCount = Math.max(...data.map(row => (Array.isArray(row) ? row.length : 0)), 0);

    const matchSearch = (val) => {
        if (!search.trim()) return false;
        return String(val).toLowerCase().includes(search.toLowerCase().trim());
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-white">
            {/* Sheet tabs */}
            <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-2 pt-1 space-x-1">
                {sheets.map((name, i) => (
                    <button
                        key={i}
                        onClick={() => setActiveSheet(i)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 transition-colors ${i === activeSheet ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-zinc-500 hover:text-zinc-700'}`}
                    >
                        {name}
                    </button>
                ))}
                <div className="ml-auto flex items-center space-x-2 pb-1">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                        <input
                            className="pl-6 pr-3 py-1 text-xs border border-zinc-300 rounded focus:outline-none focus:border-emerald-500 w-48"
                            placeholder="Find a number or value..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setHighlight(null); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter' && search.trim()) {
                                    onNumberFound?.(search.trim(), sheetName, data);
                                }
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="text-xs border-collapse min-w-max">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className="bg-zinc-100 border border-zinc-200 px-2 py-1 text-zinc-500 font-normal w-8 text-center">#</th>
                            {Array.from({ length: colCount }, (_, i) => (
                                <th key={i} className="bg-zinc-100 border border-zinc-200 px-3 py-1 text-zinc-500 font-normal min-w-[80px] text-center">
                                    {String.fromCharCode(65 + (i % 26))}
                                    {i >= 26 ? String.fromCharCode(65 + Math.floor(i / 26) - 1) : ''}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, ri) => (
                            <tr key={ri} className="hover:bg-blue-50/30">
                                <td className="bg-zinc-50 border border-zinc-200 px-2 py-0.5 text-zinc-400 text-center font-mono">{ri + 1}</td>
                                {Array.from({ length: colCount }, (_, ci) => {
                                    const val = row[ci] ?? '';
                                    const isMatch = matchSearch(val);
                                    return (
                                        <td
                                            key={ci}
                                            className={`border border-zinc-200 px-2 py-0.5 font-mono whitespace-nowrap ${isMatch ? 'bg-yellow-200 font-bold text-yellow-900' : typeof val === 'number' ? 'text-right text-blue-700' : 'text-zinc-700'}`}
                                        >
                                            {val === '' ? '' : String(val)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 flex items-center justify-between">
                <span className="text-xs text-zinc-500">{data.length} rows · {colCount} columns</span>
                {search && (
                    <span className="text-xs text-emerald-700 font-medium">
                        {data.flat().filter(v => matchSearch(v)).length} matches for "{search}"
                    </span>
                )}
            </div>
        </div>
    );
}

// ── SnipDoc (image annotation) ────────────────────────────────────────────────

function SnipDoc({ blobUrl, onExtract }) {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const [rect, setRect] = useState(null);
    const [startPt, setStartPt] = useState(null);
    const [extracted, setExtracted] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    const getRelativePos = (e) => {
        const bounds = canvasRef.current?.getBoundingClientRect();
        return {
            x: e.clientX - bounds.left,
            y: e.clientY - bounds.top,
        };
    };

    const drawRect = (ctx, r) => {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.fillStyle = 'rgba(59,130,246,0.1)';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeRect(r.x, r.y, r.w, r.h);
    };

    const onMouseDown = (e) => {
        const pos = getRelativePos(e);
        setStartPt(pos);
        setDrawing(true);
        setRect(null);
        setExtracted(null);
    };

    const onMouseMove = (e) => {
        if (!drawing || !startPt) return;
        const pos = getRelativePos(e);
        const r = {
            x: Math.min(startPt.x, pos.x),
            y: Math.min(startPt.y, pos.y),
            w: Math.abs(pos.x - startPt.x),
            h: Math.abs(pos.y - startPt.y),
        };
        setRect(r);
        const ctx = canvasRef.current?.getContext('2d');
        if (ctx) drawRect(ctx, r);
    };

    const onMouseUp = async () => {
        if (!drawing || !rect || rect.w < 5 || rect.h < 5) {
            setDrawing(false);
            return;
        }
        setDrawing(false);

        // Crop the image at the rect coordinates and extract
        try {
            setAnalyzing(true);
            const img = containerRef.current?.querySelector('img');
            if (!img) throw new Error('No image');

            const scaleX = img.naturalWidth / img.clientWidth;
            const scaleY = img.naturalHeight / img.clientHeight;

            const cropCanvas = document.createElement('canvas');
            cropCanvas.width = Math.round(rect.w * scaleX);
            cropCanvas.height = Math.round(rect.h * scaleY);
            const ctx = cropCanvas.getContext('2d');
            ctx.drawImage(img,
                rect.x * scaleX, rect.y * scaleY, rect.w * scaleX, rect.h * scaleY,
                0, 0, cropCanvas.width, cropCanvas.height
            );
            const dataUrl = cropCanvas.toDataURL('image/png');
            onExtract?.(dataUrl, rect);
            setExtracted(dataUrl);
            setAnalyzing(false);
        } catch (err) {
            console.error(err);
            setAnalyzing(false);
        }
    };

    return (
        <div className="flex-1 flex flex-col min-h-0 relative" ref={containerRef}>
            <div className="px-3 py-2 bg-blue-900/20 border-b border-blue-500/20 text-xs text-blue-300 flex items-center space-x-2">
                <Scissors className="w-3.5 h-3.5" />
                <span>Draw a box around any number or table to extract it with SOMA AI</span>
                {analyzing && <Loader className="w-3 h-3 animate-spin ml-auto" />}
            </div>
            <div className="relative flex-1 overflow-auto bg-zinc-900 flex items-start justify-center p-4">
                <div className="relative inline-block">
                    <img
                        src={blobUrl}
                        alt="Document"
                        className="max-w-full select-none"
                        draggable={false}
                    />
                    <canvas
                        ref={canvasRef}
                        className="absolute inset-0 w-full h-full cursor-crosshair"
                        style={{ touchAction: 'none' }}
                        onMouseDown={onMouseDown}
                        onMouseMove={onMouseMove}
                        onMouseUp={onMouseUp}
                        onMouseLeave={onMouseUp}
                    />
                </div>
            </div>
            {extracted && (
                <div className="border-t border-white/10 p-3 bg-[#151518]">
                    <div className="flex items-start space-x-3">
                        <img src={extracted} alt="snip" className="max-h-20 border border-white/10 rounded" />
                        <div className="text-xs text-zinc-400">
                            <p className="font-medium text-white mb-1">Region captured</p>
                            <p>SOMA AI is analyzing this region. The result will appear in the chat panel.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// ── Number Hunter ─────────────────────────────────────────────────────────────

function NumberHunter({ openFiles, onLocate }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const hunt = () => {
        if (!query.trim()) return;
        setSearching(true);
        const q = query.trim().toLowerCase();
        const found = [];

        openFiles.forEach(f => {
            if (f.type === 'excel' && f.workbook) {
                f.workbook.SheetNames.forEach(sheetName => {
                    const ws = f.workbook.Sheets[sheetName];
                    const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                    data.forEach((row, ri) => {
                        (Array.isArray(row) ? row : []).forEach((cell, ci) => {
                            if (String(cell).toLowerCase().includes(q)) {
                                const col = String.fromCharCode(65 + (ci % 26));
                                found.push({
                                    file: f.name,
                                    fileId: f.id,
                                    location: `${sheetName}!${col}${ri + 1}`,
                                    value: String(cell),
                                    context: (Array.isArray(row) ? row : []).slice(Math.max(0, ci - 2), ci + 3).map(String).join(' | '),
                                });
                            }
                        });
                    });
                });
            } else if (f.type === 'text' && f.content) {
                const lines = f.content.split('\n');
                lines.forEach((line, li) => {
                    if (line.toLowerCase().includes(q)) {
                        found.push({
                            file: f.name,
                            fileId: f.id,
                            location: `Line ${li + 1}`,
                            value: line.trim().slice(0, 120),
                            context: '',
                        });
                    }
                });
            }
        });

        setResults(found);
        setSearching(false);
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-white/10">
                <div className="flex items-center space-x-2">
                    <Hash className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-white">Number Hunter</h3>
                </div>
                <p className="text-xs text-zinc-500 mt-1">Search for any value across all open files instantly.</p>
                <div className="mt-3 flex space-x-2">
                    <input
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                        placeholder="Enter a number, name, or text..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && hunt()}
                    />
                    <button
                        onClick={hunt}
                        disabled={!query.trim() || searching}
                        className="px-4 py-2.5 bg-amber-500 text-white text-sm font-medium rounded-lg hover:bg-amber-600 disabled:opacity-50 transition-colors"
                    >
                        {searching ? <Loader className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {results.length === 0 && query && !searching && (
                    <div className="py-10 text-center text-zinc-600">
                        <Search className="w-6 h-6 mx-auto mb-2 opacity-30" />
                        <p>No matches found for "{query}"</p>
                        <p className="text-xs mt-1">Try opening more files or adjusting the search term.</p>
                    </div>
                )}
                {results.length === 0 && !query && (
                    <div className="py-10 text-center text-zinc-700 text-sm">
                        <p>Open files using the browser on the left, then search.</p>
                        <p className="text-xs mt-2 text-zinc-600">Supports Excel (.xlsx), CSV, and text files.</p>
                    </div>
                )}
                {results.length > 0 && (
                    <div>
                        <div className="text-xs text-zinc-500 mb-3">
                            Found <span className="text-amber-400 font-bold">{results.length}</span> match{results.length !== 1 ? 'es' : ''} for "{query}"
                        </div>
                        <div className="space-y-2">
                            {results.map((r, i) => (
                                <button
                                    key={i}
                                    onClick={() => onLocate?.(r)}
                                    className="w-full text-left bg-[#151518] border border-white/5 hover:border-amber-500/30 rounded-xl p-3 transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <div className="flex items-center space-x-2 mb-1">
                                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                                                <span className="text-xs font-medium text-white">{r.file}</span>
                                                <span className="text-[10px] text-zinc-500 font-mono">{r.location}</span>
                                            </div>
                                            <div className="text-sm font-bold text-amber-400">{r.value}</div>
                                            {r.context && (
                                                <div className="text-xs text-zinc-600 mt-0.5 font-mono">...{r.context}...</div>
                                            )}
                                        </div>
                                        <Eye className="w-4 h-4 text-zinc-600 shrink-0 ml-2" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Excel Export ──────────────────────────────────────────────────────────────

export function exportEngagementToExcel(engagement, files, decisions) {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Engagement Summary
    const summaryData = [
        ['Engagement Report', '', '', ''],
        ['', '', '', ''],
        ['Title', engagement.title || ''],
        ['Client', engagement.client_name || ''],
        ['Type', engagement.type || ''],
        ['Status', engagement.status || ''],
        ['Priority', engagement.priority || ''],
        ['Progress', `${engagement.progress || 0}%`],
        ['Due Date', engagement.due_date || ''],
        ['Objective', engagement.objective || ''],
        ['Generated', new Date().toLocaleString()],
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    wsSummary['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
    wsSummary['!cols'] = [{ wch: 16 }, { wch: 50 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Sheet 2: Files
    if (files?.length) {
        const filesData = [
            ['File Name', 'Type', 'Size', 'SOMA Summary', 'Risk Signals', 'Date Added'],
            ...files.map(f => [
                f.name,
                f.type,
                f.size,
                f.soma_summary || '',
                (f.risk_signals || []).join('; '),
                new Date(f.created_at * 1000).toLocaleDateString(),
            ])
        ];
        const wsFiles = XLSX.utils.aoa_to_sheet(filesData);
        wsFiles['!cols'] = [{ wch: 35 }, { wch: 10 }, { wch: 10 }, { wch: 50 }, { wch: 40 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsFiles, 'Documents');
    }

    // Sheet 3: Decision Log
    if (decisions?.length) {
        const decisionsData = [
            ['Decision', 'Rationale', 'Confidence', 'Actor', 'Type', 'Conflict?', 'Note', 'Date'],
            ...decisions.map(d => [
                d.title,
                d.rationale || '',
                `${Math.round((d.confidence || 0) * 100)}%`,
                d.actor || '',
                d.change_type || '',
                d.is_conflict ? 'YES' : 'No',
                d.user_note || '',
                new Date(d.created_at * 1000).toLocaleDateString(),
            ])
        ];
        const wsDecisions = XLSX.utils.aoa_to_sheet(decisionsData);
        wsDecisions['!cols'] = [{ wch: 30 }, { wch: 50 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 40 }, { wch: 15 }];
        XLSX.utils.book_append_sheet(wb, wsDecisions, 'Decision Log');
    }

    const filename = `${(engagement.title || 'engagement').replace(/[^a-z0-9]/gi, '_')}_report.xlsx`;
    XLSX.writeFile(wb, filename);
    return filename;
}

// ── Main Documents Module ─────────────────────────────────────────────────────

export default function DocumentsModule({ engagement }) {
    const [fileTree, setFileTree] = useState(null);
    const [openFiles, setOpenFiles] = useState([]); // { id, name, type, blobUrl, workbook?, content? }
    const [activeFileId, setActiveFileId] = useState(null);
    const [activeDocTab, setActiveDocTab] = useState('viewer'); // viewer | snip | hunt | export
    const [loading, setLoading] = useState(false);
    const [snipResult, setSnipResult] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [engFiles, setEngFiles] = useState([]);
    const [engDecisions, setEngDecisions] = useState([]);

    // Load engagement files/decisions for export
    useEffect(() => {
        if (!engagement?.id) return;
        const load = async () => {
            try {
                const [fr, dr] = await Promise.all([
                    fetch(`/api/conceive/files?engagement_id=${engagement.id}`).then(r => r.json()),
                    fetch(`/api/conceive/decisions?engagement_id=${engagement.id}`).then(r => r.json()),
                ]);
                setEngFiles(fr.files || []);
                setEngDecisions(dr.decisions || []);
            } catch (_) {}
        };
        load();
    }, [engagement?.id]);

    const openFolder = async () => {
        try {
            const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
            setLoading(true);
            const nodes = await buildTree(dirHandle);
            setFileTree({ name: dirHandle.name, kind: 'directory', id: 'root', children: nodes });
            setLoading(false);
        } catch (err) {
            if (err.name !== 'AbortError') console.error(err);
            setLoading(false);
        }
    };

    const buildTree = async (dirHandle, depth = 0) => {
        const IGNORED = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__']);
        const SUPPORTED_EXT = new Set(['xlsx', 'xls', 'csv', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'txt', 'md', 'json']);
        const nodes = [];
        if (depth > 6) return nodes;
        for await (const entry of dirHandle.values()) {
            if (IGNORED.has(entry.name)) continue;
            const id = `${depth}_${entry.name}_${Math.random().toString(36).slice(2)}`;
            if (entry.kind === 'directory') {
                const children = await buildTree(entry, depth + 1);
                if (children.length > 0) nodes.push({ id, name: entry.name, kind: 'directory', handle: entry, children });
            } else {
                const ext = entry.name.split('.').pop()?.toLowerCase() || '';
                if (SUPPORTED_EXT.has(ext)) {
                    const file = await entry.getFile();
                    nodes.push({ id, name: entry.name, kind: 'file', handle: entry, ext, metadata: { size: file.size } });
                }
            }
        }
        return nodes.sort((a, b) => {
            if (a.kind !== b.kind) return a.kind === 'directory' ? -1 : 1;
            return a.name.localeCompare(b.name);
        });
    };

    const openFile = async (node) => {
        // Already open?
        const existing = openFiles.find(f => f.id === node.id);
        if (existing) { setActiveFileId(node.id); setActiveDocTab('viewer'); return; }

        try {
            const file = await node.handle.getFile();
            const ext = node.ext || node.name.split('.').pop()?.toLowerCase() || '';
            const id = node.id;
            const name = node.name;

            if (['xlsx', 'xls', 'csv'].includes(ext)) {
                const ab = await file.arrayBuffer();
                const workbook = XLSX.read(ab, { type: 'buffer', cellDates: true });
                setOpenFiles(prev => [...prev, { id, name, type: 'excel', workbook }]);
            } else if (ext === 'pdf') {
                const url = URL.createObjectURL(file);
                setOpenFiles(prev => [...prev, { id, name, type: 'pdf', blobUrl: url }]);
            } else if (['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext)) {
                const url = URL.createObjectURL(file);
                setOpenFiles(prev => [...prev, { id, name, type: 'image', blobUrl: url }]);
            } else {
                const content = await file.text();
                setOpenFiles(prev => [...prev, { id, name, type: 'text', content }]);
            }
            setActiveFileId(id);
            setActiveDocTab('viewer');
        } catch (err) {
            console.error('Failed to open file:', err);
        }
    };

    const closeFile = (id) => {
        const f = openFiles.find(f => f.id === id);
        if (f?.blobUrl) URL.revokeObjectURL(f.blobUrl);
        setOpenFiles(prev => prev.filter(f => f.id !== id));
        if (activeFileId === id) setActiveFileId(openFiles.find(f => f.id !== id)?.id || null);
    };

    const handleSnipExtract = async (dataUrl, rect) => {
        setSnipResult({ dataUrl, rect, analyzing: true, text: null });
        setActiveDocTab('viewer');
        try {
            // Send the captured image region as a base64 data URL so SOMA can actually see it
            const res = await fetch('/api/conceive/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `Analyze this document region (${Math.round(rect.w)}×${Math.round(rect.h)}px). The captured image is attached as a data URL. Identify any numbers, values, or data present and explain their likely audit significance.`,
                    image: dataUrl,
                    context: engagement ? { engagement_title: engagement.title, client_name: engagement.client_name } : {}
                })
            });
            const data = await res.json();
            setSnipResult(prev => ({ ...prev, analyzing: false, text: data.response || 'No analysis returned.' }));
        } catch (err) {
            setSnipResult(prev => ({ ...prev, analyzing: false, text: 'Could not analyze region. SOMA AI may be initializing.' }));
        }
    };

    const handleNumberFound = (query, sheetName) => {
        // Intentionally a no-op — the ExcelViewer inline search highlights matches directly in the table.
        // The Number Hunter tab in ExcelToolsModule handles cross-file hunting.
    };

    const activeFile = openFiles.find(f => f.id === activeFileId);

    return (
        <div className="flex h-full overflow-hidden">
            {/* Left: File browser */}
            <div className="w-56 shrink-0 border-r border-white/5 bg-[#0d0d0f] flex flex-col overflow-hidden">
                <div className="px-3 py-3 border-b border-white/5">
                    <button
                        onClick={openFolder}
                        disabled={loading}
                        className="w-full flex items-center justify-center space-x-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-medium rounded-lg transition-colors"
                    >
                        {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <FolderOpen className="w-3.5 h-3.5 text-amber-400" />}
                        <span>{loading ? 'Scanning...' : 'Open Folder'}</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto py-1">
                    {!fileTree && !loading && (
                        <div className="p-4 text-xs text-zinc-700 text-center">
                            <FolderOpen className="w-6 h-6 mx-auto mb-2 opacity-30" />
                            <p>Open a folder to browse files</p>
                        </div>
                    )}
                    {fileTree && (
                        <TreeNode
                            node={fileTree}
                            depth={0}
                            onSelect={openFile}
                            selectedId={activeFileId}
                        />
                    )}
                </div>
            </div>

            {/* Center: Document viewer */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Open file tabs */}
                {openFiles.length > 0 && (
                    <div className="flex items-center bg-[#0d0d0f] border-b border-white/5 overflow-x-auto shrink-0">
                        {openFiles.map(f => {
                            const { Icon, color } = fileIcon(f.name);
                            return (
                                <div
                                    key={f.id}
                                    className={`flex items-center space-x-2 px-3 py-2 border-r border-white/5 cursor-pointer shrink-0 text-xs transition-colors ${f.id === activeFileId ? 'bg-[#151518] text-white' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                                    onClick={() => setActiveFileId(f.id)}
                                >
                                    <Icon className={`w-3.5 h-3.5 ${color}`} />
                                    <span className="max-w-[140px] truncate">{f.name}</span>
                                    <button
                                        onClick={e => { e.stopPropagation(); closeFile(f.id); }}
                                        className="ml-1 text-zinc-600 hover:text-red-400 transition-colors"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Sub-tabs */}
                <div className="flex items-center space-x-1 px-4 py-2 bg-[#151518] border-b border-white/5 shrink-0">
                    {[
                        { id: 'viewer', label: 'Viewer', icon: Eye },
                        { id: 'snip', label: 'SnipDoc', icon: Scissors, disabled: !activeFile || activeFile.type !== 'image' },
                        { id: 'hunt', label: 'Number Hunter', icon: Hash },
                        { id: 'export', label: 'Export to Excel', icon: Download },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => !t.disabled && setActiveDocTab(t.id)}
                            disabled={t.disabled}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${t.disabled ? 'text-zinc-700 cursor-not-allowed' : activeDocTab === t.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <t.icon className="w-3.5 h-3.5" />
                            <span>{t.label}</span>
                        </button>
                    ))}

                    {engagement && (
                        <div className="ml-auto text-xs text-zinc-600">
                            Context: <span className="text-zinc-400">{engagement.title}</span>
                        </div>
                    )}
                </div>

                {/* Main content area */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {activeDocTab === 'viewer' && (
                        <>
                            {!activeFile ? (
                                <div className="flex-1 flex items-center justify-center text-zinc-700">
                                    <div className="text-center">
                                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">No document open</p>
                                        <p className="text-xs mt-1">Open a folder on the left and click a file to view it here.</p>
                                    </div>
                                </div>
                            ) : activeFile.type === 'pdf' ? (
                                <PDFViewer blobUrl={activeFile.blobUrl} />
                            ) : activeFile.type === 'excel' ? (
                                <ExcelViewer workbook={activeFile.workbook} onNumberFound={handleNumberFound} />
                            ) : activeFile.type === 'image' ? (
                                <div className="flex-1 overflow-auto bg-zinc-900 flex items-center justify-center p-4">
                                    <img src={activeFile.blobUrl} alt={activeFile.name} className="max-w-full max-h-full object-contain" />
                                </div>
                            ) : (
                                <div className="flex-1 overflow-auto p-4">
                                    <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap">{activeFile.content}</pre>
                                </div>
                            )}

                            {/* Snip result overlay */}
                            {snipResult && (
                                <div className="border-t border-white/10 bg-[#151518] p-4 max-h-40 overflow-y-auto">
                                    <div className="flex items-start space-x-3">
                                        <img src={snipResult.dataUrl} alt="snip" className="max-h-16 border border-white/10 rounded shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <Brain className="w-3.5 h-3.5 text-blue-400" />
                                                <span className="text-xs font-medium text-white">SOMA Analysis</span>
                                                {snipResult.analyzing && <Loader className="w-3 h-3 animate-spin text-zinc-500" />}
                                            </div>
                                            <p className="text-xs text-zinc-400 leading-relaxed">{snipResult.text || 'Analyzing...'}</p>
                                        </div>
                                        <button onClick={() => setSnipResult(null)} className="text-zinc-600 hover:text-white"><X className="w-4 h-4" /></button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {activeDocTab === 'snip' && activeFile?.type === 'image' && (
                        <SnipDoc blobUrl={activeFile.blobUrl} onExtract={handleSnipExtract} />
                    )}

                    {activeDocTab === 'hunt' && (
                        <NumberHunter openFiles={openFiles} onLocate={(r) => {
                            const f = openFiles.find(f => f.id === r.fileId);
                            if (f) { setActiveFileId(r.fileId); setActiveDocTab('viewer'); }
                        }} />
                    )}

                    {activeDocTab === 'export' && (
                        <div className="flex-1 p-6 space-y-6">
                            <div>
                                <h3 className="font-semibold text-white mb-1">Export to Excel</h3>
                                <p className="text-xs text-zinc-500">Generate a professional .xlsx workbook with the full engagement report.</p>
                            </div>

                            {!engagement ? (
                                <div className="py-8 text-center text-zinc-600 text-sm">
                                    <p>Select an engagement first to export its report.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-[#151518] border border-white/5 rounded-xl p-5 space-y-3">
                                        <h4 className="text-sm font-semibold text-white">{engagement.title}</h4>
                                        <div className="grid grid-cols-3 gap-3 text-xs text-zinc-500">
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-white">{engFiles.length}</div>
                                                <div>Documents</div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-white">{engDecisions.length}</div>
                                                <div>Decisions</div>
                                            </div>
                                            <div className="bg-white/5 rounded-lg p-3 text-center">
                                                <div className="text-lg font-bold text-white">{engagement.progress}%</div>
                                                <div>Progress</div>
                                            </div>
                                        </div>
                                        <div className="text-xs text-zinc-600">
                                            Will generate 3 sheets: Summary, Documents, Decision Log
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => {
                                            try {
                                                const filename = exportEngagementToExcel(engagement, engFiles, engDecisions);
                                                alert(`Saved: ${filename}`);
                                            } catch (err) {
                                                alert(`Export failed: ${err.message}`);
                                            }
                                        }}
                                        className="flex items-center space-x-2 px-6 py-3 bg-emerald-600 text-white font-medium rounded-xl hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-500/20"
                                    >
                                        <Download className="w-5 h-5" />
                                        <span>Download Excel Report</span>
                                    </button>

                                    <p className="text-xs text-zinc-700">
                                        The file will be downloaded to your browser's default download folder.
                                    </p>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
