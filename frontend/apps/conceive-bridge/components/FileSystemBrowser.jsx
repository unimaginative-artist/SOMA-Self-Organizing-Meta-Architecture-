/**
 * FileSystemBrowser.jsx
 * Full computer-level file system browser for Conceive.
 *
 * Uses the backend /api/conceive/fs/* endpoints — no browser dialog required.
 * Shows all drives (C:\, D:\) immediately on open. Navigate anywhere on the machine.
 *
 * Features:
 *  · Drive picker (C:\, D:\, …)
 *  · Folder navigation with breadcrumb
 *  · Filename search (recursive, under current folder)
 *  · File preview: Excel table | PDF iframe | Image | Text
 *  · "Open in Number Hunter" button → passes file to ExcelToolsModule
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
    ChevronRight, Search, FolderOpen, HardDrive, X, Download,
    ArrowLeft, Hash, Loader, AlertTriangle, FileText, File,
    Image as ImageIcon, RefreshCw
} from 'lucide-react';

const FS_API = '/api/conceive/fs';

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtSize(bytes) {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function fmtDate(ms) {
    if (!ms) return '';
    return new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const EXT_STYLES = {
    xlsx: { color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
    xls:  { color: 'text-emerald-400', bg: 'bg-emerald-500/10', dot: 'bg-emerald-400' },
    csv:  { color: 'text-green-400',   bg: 'bg-green-500/10',   dot: 'bg-green-400'   },
    pdf:  { color: 'text-red-400',     bg: 'bg-red-500/10',     dot: 'bg-red-400'     },
    png:  { color: 'text-blue-400',    bg: 'bg-blue-500/10',    dot: 'bg-blue-400'    },
    jpg:  { color: 'text-blue-400',    bg: 'bg-blue-500/10',    dot: 'bg-blue-400'    },
    jpeg: { color: 'text-blue-400',    bg: 'bg-blue-500/10',    dot: 'bg-blue-400'    },
    gif:  { color: 'text-blue-400',    bg: 'bg-blue-500/10',    dot: 'bg-blue-400'    },
    txt:  { color: 'text-zinc-400',    bg: 'bg-zinc-500/10',    dot: 'bg-zinc-400'    },
    md:   { color: 'text-zinc-400',    bg: 'bg-zinc-500/10',    dot: 'bg-zinc-400'    },
    json: { color: 'text-amber-400',   bg: 'bg-amber-500/10',   dot: 'bg-amber-400'   },
    doc:  { color: 'text-blue-300',    bg: 'bg-blue-500/10',    dot: 'bg-blue-300'    },
    docx: { color: 'text-blue-300',    bg: 'bg-blue-500/10',    dot: 'bg-blue-300'    },
};

function FileDot({ ext }) {
    const s = EXT_STYLES[ext] || { dot: 'bg-zinc-600' };
    return <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />;
}

// ── Breadcrumb ────────────────────────────────────────────────────────────────

function Breadcrumb({ path, onNavigate }) {
    if (!path) return null;
    const normalized = path.replace(/\\/g, '/');
    const parts = normalized.split('/').filter(Boolean);

    const getPath = (idx) => {
        const segs = parts.slice(0, idx + 1).join('\\');
        return idx === 0 ? `${segs}\\` : segs;
    };

    return (
        <div className="flex items-center min-w-0 overflow-x-auto scrollbar-none text-xs">
            <button
                onClick={() => onNavigate(null)}
                className="text-zinc-600 hover:text-white transition-colors shrink-0 p-1"
                title="All Drives"
            >
                <HardDrive className="w-3.5 h-3.5" />
            </button>
            {parts.map((seg, i) => (
                <React.Fragment key={i}>
                    <ChevronRight className="w-3 h-3 text-zinc-700 shrink-0" />
                    <button
                        onClick={() => onNavigate(getPath(i))}
                        className={`px-1 py-0.5 rounded hover:text-white transition-colors shrink-0 max-w-[120px] truncate ${i === parts.length - 1 ? 'text-white font-medium' : 'text-zinc-500'}`}
                        title={getPath(i)}
                    >
                        {seg}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
}

// ── Excel Quick Preview ────────────────────────────────────────────────────────

function ExcelQuickPreview({ fileUrl, fileName }) {
    const [sheets, setSheets] = useState(null);
    const [activeSheet, setActiveSheet] = useState('');
    const [filter, setFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetch(fileUrl)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.arrayBuffer();
            })
            .then(buf => {
                const wb = XLSX.read(buf, { type: 'array', cellDates: true });
                const result = {};
                wb.SheetNames.forEach(name => {
                    result[name] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '' });
                });
                setSheets(result);
                setActiveSheet(wb.SheetNames[0] || '');
                setLoading(false);
            })
            .catch(err => { setError(err.message); setLoading(false); });
    }, [fileUrl]);

    if (loading) return (
        <div className="flex-1 flex items-center justify-center text-zinc-500">
            <Loader className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">Loading spreadsheet...</span>
        </div>
    );
    if (error) return (
        <div className="p-6 text-sm text-red-400 flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>{error}</span>
        </div>
    );

    const sheetNames = Object.keys(sheets || {});
    const rows = (sheets || {})[activeSheet] || [];
    const header = rows[0] || [];
    const dataRows = rows.slice(1);
    const filtered = filter
        ? dataRows.filter(r => r.some(c => String(c).toLowerCase().includes(filter.toLowerCase())))
        : dataRows;

    return (
        <div className="flex flex-col h-full">
            {/* Sheet tabs */}
            {sheetNames.length > 1 && (
                <div className="flex items-center space-x-1 px-3 py-2 border-b border-white/5 overflow-x-auto scrollbar-none shrink-0">
                    {sheetNames.map(name => (
                        <button
                            key={name}
                            onClick={() => { setActiveSheet(name); setFilter(''); }}
                            className={`px-3 py-1 text-xs rounded-lg shrink-0 transition-colors ${activeSheet === name ? 'bg-emerald-500/20 text-emerald-300 font-medium' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            )}
            {/* Row filter */}
            <div className="flex items-center space-x-2 px-3 py-2 border-b border-white/5 shrink-0">
                <Search className="w-3 h-3 text-zinc-600 shrink-0" />
                <input
                    className="bg-transparent text-xs text-white placeholder:text-zinc-600 focus:outline-none flex-1"
                    placeholder="Filter rows..."
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                />
                {filter && <span className="text-[10px] text-zinc-600">{filtered.length}/{dataRows.length}</span>}
                {filter && <button onClick={() => setFilter('')}><X className="w-3 h-3 text-zinc-600 hover:text-white" /></button>}
            </div>
            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="text-xs w-full border-collapse">
                    <thead className="sticky top-0 bg-[#1a1a1d] z-10">
                        <tr>
                            <th className="w-8 px-2 py-2 text-zinc-700 text-right border-b border-r border-white/5">#</th>
                            {header.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-zinc-400 font-medium text-left border-b border-r border-white/5 whitespace-nowrap">
                                    {h !== '' ? String(h) : <span className="text-zinc-700">{String.fromCharCode(65 + i)}</span>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.slice(0, 1000).map((row, ri) => (
                            <tr key={ri} className={filter && row.some(c => String(c).toLowerCase().includes(filter.toLowerCase())) ? 'bg-yellow-500/10' : 'hover:bg-white/3'}>
                                <td className="px-2 py-1 text-zinc-700 text-right border-r border-white/5 select-none">{ri + 2}</td>
                                {header.map((_, ci) => {
                                    const val = row[ci] ?? '';
                                    const isNum = typeof val === 'number' || (typeof val === 'string' && val !== '' && !isNaN(val.toString().replace(/[$,]/g, '')));
                                    const highlight = filter && String(val).toLowerCase().includes(filter.toLowerCase());
                                    return (
                                        <td key={ci} className={`px-3 py-1 border-r border-white/5 max-w-[200px] truncate ${isNum ? 'text-right text-blue-300 font-mono' : 'text-zinc-300'} ${highlight ? 'bg-yellow-500/20 text-yellow-200 font-medium' : ''}`} title={String(val)}>
                                            {val === '' ? '' : isNum && typeof val === 'number' ? val.toLocaleString() : String(val)}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filtered.length > 1000 && (
                    <div className="p-3 text-center text-xs text-zinc-600 border-t border-white/5">
                        Showing 1,000 of {filtered.length.toLocaleString()} rows
                    </div>
                )}
                {filtered.length === 0 && filter && (
                    <div className="py-12 text-center text-xs text-zinc-600">No rows match "{filter}"</div>
                )}
            </div>
            <div className="px-3 py-2 border-t border-white/5 shrink-0 flex items-center justify-between">
                <span className="text-[10px] text-zinc-600">{fileName} · {rows.length} rows · {header.length} cols</span>
                {sheetNames.length > 0 && <span className="text-[10px] text-zinc-600">{activeSheet}</span>}
            </div>
        </div>
    );
}

// ── Text Preview ──────────────────────────────────────────────────────────────

function TextPreview({ fileUrl }) {
    const [text, setText] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetch(fileUrl)
            .then(r => r.text())
            .then(t => setText(t.slice(0, 100_000)))
            .catch(err => setError(err.message));
    }, [fileUrl]);

    if (error) return <div className="p-4 text-sm text-red-400">{error}</div>;
    if (text === null) return (
        <div className="flex items-center justify-center h-full text-zinc-500">
            <Loader className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">Loading...</span>
        </div>
    );

    return (
        <div className="h-full overflow-auto p-4">
            <pre className="text-xs text-zinc-300 font-mono whitespace-pre-wrap leading-relaxed">{text}</pre>
        </div>
    );
}

// ── File Preview Pane ─────────────────────────────────────────────────────────

function FilePreview({ file, onClose, onOpenInExcel }) {
    const fileUrl = `${FS_API}/file?path=${encodeURIComponent(file.path)}`;
    const isExcel = ['xlsx', 'xls', 'csv'].includes(file.ext);
    const isPdf = file.ext === 'pdf';
    const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'tiff'].includes(file.ext);
    const isText = ['txt', 'md', 'json', 'rtf'].includes(file.ext);

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#151518] shrink-0">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <FileDot ext={file.ext} />
                    <div className="min-w-0">
                        <div className="text-sm font-semibold text-white truncate">{file.name}</div>
                        <div className="text-[10px] text-zinc-600 font-mono truncate">{file.path}</div>
                    </div>
                </div>
                <div className="flex items-center space-x-2 shrink-0 ml-3">
                    {isExcel && (
                        <button
                            onClick={() => onOpenInExcel(file)}
                            title="Open in Number Hunter (Excel Tools)"
                            className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-500/15 text-amber-400 border border-amber-500/20 rounded-lg text-xs font-medium hover:bg-amber-500/25 transition-colors"
                        >
                            <Hash className="w-3.5 h-3.5" />
                            <span>Number Hunter</span>
                        </button>
                    )}
                    <a
                        href={fileUrl}
                        download={file.name}
                        className="flex items-center space-x-1 px-2.5 py-1.5 bg-white/5 text-zinc-400 border border-white/5 rounded-lg text-xs hover:bg-white/10 hover:text-white transition-colors"
                        title="Download"
                    >
                        <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-zinc-600 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Metadata bar */}
            <div className="flex items-center space-x-4 px-4 py-1.5 bg-[#0d0d0f] border-b border-white/5 shrink-0">
                {file.size !== undefined && <span className="text-[10px] text-zinc-600">{fmtSize(file.size)}</span>}
                {file.modified && <span className="text-[10px] text-zinc-600">Modified {fmtDate(file.modified)}</span>}
                <span className="text-[10px] text-zinc-700 uppercase font-mono">{file.ext}</span>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden bg-[#09090b]">
                {isExcel && <ExcelQuickPreview fileUrl={fileUrl} fileName={file.name} />}

                {isPdf && (
                    <iframe
                        src={fileUrl}
                        className="w-full h-full border-0"
                        title={file.name}
                    />
                )}

                {isImage && (
                    <div className="h-full flex items-center justify-center p-6 overflow-auto">
                        <img
                            src={fileUrl}
                            alt={file.name}
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                        />
                    </div>
                )}

                {isText && <TextPreview fileUrl={fileUrl} />}

                {!isExcel && !isPdf && !isImage && !isText && (
                    <div className="h-full flex items-center justify-center text-zinc-700">
                        <div className="text-center">
                            <File className="w-14 h-14 mx-auto mb-4 opacity-15" />
                            <p className="text-sm font-medium">Preview not available</p>
                            <p className="text-xs mt-1 mb-4">This file type can't be displayed inline.</p>
                            <a
                                href={fileUrl}
                                download={file.name}
                                className="inline-flex items-center space-x-2 px-4 py-2 bg-white/5 text-zinc-300 rounded-lg text-sm hover:bg-white/10 transition-colors"
                            >
                                <Download className="w-4 h-4" />
                                <span>Download {file.name}</span>
                            </a>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main Browser ──────────────────────────────────────────────────────────────

export default function FileSystemBrowser({ onOpenInExcel }) {
    const [drives, setDrives] = useState([]);
    const [currentPath, setCurrentPath] = useState(null);   // null = show drive picker
    const [items, setItems] = useState([]);
    const [parentPath, setParentPath] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null); // null = not in search mode
    const [drivesLoading, setDrivesLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState(null);

    // Load drives on mount
    useEffect(() => {
        fetch(`${FS_API}/drives`)
            .then(r => r.json())
            .then(data => {
                if (data.success) setDrives(data.drives);
                setDrivesLoading(false);
            })
            .catch(err => { setError(err.message); setDrivesLoading(false); });
    }, []);

    const browse = useCallback(async (dirPath) => {
        if (!dirPath) {
            setCurrentPath(null);
            setItems([]);
            setParentPath(null);
            setSearchResults(null);
            setSearchQuery('');
            setSelectedFile(null);
            return;
        }
        setLoading(true);
        setError(null);
        setSearchResults(null);
        try {
            const res = await fetch(`${FS_API}/browse?path=${encodeURIComponent(dirPath)}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Could not open folder');
            setCurrentPath(data.path);
            setParentPath(data.parent);
            setItems(data.items);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    const doSearch = useCallback(async () => {
        const q = searchQuery.trim();
        if (!q || !currentPath) return;
        setSearching(true);
        setError(null);
        try {
            const res = await fetch(`${FS_API}/search?root=${encodeURIComponent(currentPath)}&query=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (!data.success) throw new Error(data.error);
            setSearchResults(data.results);
            if (data.results.length === 0) setSelectedFile(null);
        } catch (err) {
            setError(err.message);
        } finally {
            setSearching(false);
        }
    }, [searchQuery, currentPath]);

    const clearSearch = () => {
        setSearchQuery('');
        setSearchResults(null);
    };

    const handleOpenInExcel = (file) => {
        if (onOpenInExcel) onOpenInExcel(file);
    };

    const displayItems = searchResults !== null ? searchResults : items;
    const isSearchMode = searchResults !== null;

    return (
        <div className="flex h-full bg-[#09090b] overflow-hidden">

            {/* ── Left: file navigator ──────────────────────────────────────── */}
            <div className="w-[300px] shrink-0 border-r border-white/5 flex flex-col bg-[#0d0d0f]">

                {/* Search bar */}
                <div className="p-3 border-b border-white/5 space-y-2">
                    <div className={`flex items-center space-x-2 bg-white/5 border rounded-xl px-3 py-2 transition-all ${currentPath ? 'border-white/10 focus-within:border-blue-500/40' : 'border-white/5 opacity-50'}`}>
                        <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <input
                            className="bg-transparent flex-1 text-xs text-white placeholder:text-zinc-600 focus:outline-none"
                            placeholder={currentPath ? 'Search filenames here...' : 'Pick a drive first'}
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') doSearch();
                                if (e.key === 'Escape') clearSearch();
                            }}
                            disabled={!currentPath}
                        />
                        {searchQuery && (
                            <button onClick={clearSearch} className="text-zinc-600 hover:text-white transition-colors">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    {currentPath && searchQuery && (
                        <button
                            onClick={doSearch}
                            disabled={searching}
                            className="w-full py-1.5 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-medium hover:bg-blue-500/25 disabled:opacity-50 transition-colors"
                        >
                            {searching ? (
                                <span className="flex items-center justify-center space-x-1.5"><Loader className="w-3 h-3 animate-spin" /><span>Searching...</span></span>
                            ) : (
                                `Search "${searchQuery}"`
                            )}
                        </button>
                    )}
                </div>

                {/* Breadcrumb */}
                {currentPath && !isSearchMode && (
                    <div className="px-3 py-2 border-b border-white/5 min-w-0">
                        <Breadcrumb path={currentPath} onNavigate={browse} />
                    </div>
                )}

                {/* Search results header */}
                {isSearchMode && (
                    <div className="px-3 py-2 border-b border-white/5 flex items-center justify-between">
                        <span className="text-xs text-zinc-500">
                            <span className="text-white font-medium">{searchResults.length}</span> file{searchResults.length !== 1 ? 's' : ''} found
                        </span>
                        <button onClick={clearSearch} className="text-xs text-zinc-600 hover:text-white transition-colors">
                            ← Browse
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {drivesLoading ? (
                        <div className="flex items-center justify-center h-full text-zinc-600">
                            <Loader className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">Detecting drives...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 space-y-2">
                            <div className="flex items-start space-x-2 text-sm text-red-400">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                            <button onClick={() => { setError(null); if (currentPath) browse(currentPath); }} className="text-xs text-zinc-500 hover:text-white flex items-center space-x-1">
                                <RefreshCw className="w-3 h-3" /><span>Retry</span>
                            </button>
                        </div>
                    ) : !currentPath ? (
                        /* ── Drive picker ── */
                        <div className="p-3">
                            <p className="text-[10px] text-zinc-700 uppercase tracking-widest px-2 mb-2">Available Drives</p>
                            {drives.map(d => (
                                <button
                                    key={d.path}
                                    onClick={() => browse(d.path)}
                                    className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl hover:bg-white/5 text-left transition-colors group"
                                >
                                    <HardDrive className="w-6 h-6 text-zinc-500 group-hover:text-blue-400 transition-colors shrink-0" />
                                    <div>
                                        <div className="text-sm font-semibold text-white">{d.name}</div>
                                        <div className="text-[10px] text-zinc-600">Local Drive</div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-zinc-700 group-hover:text-zinc-400 ml-auto shrink-0 transition-colors" />
                                </button>
                            ))}
                            {drives.length === 0 && (
                                <p className="py-8 text-center text-zinc-700 text-sm">No drives detected</p>
                            )}
                        </div>
                    ) : loading ? (
                        <div className="flex items-center justify-center h-full text-zinc-600">
                            <Loader className="w-5 h-5 animate-spin mr-2" /><span className="text-sm">Loading...</span>
                        </div>
                    ) : isSearchMode ? (
                        /* ── Search results list ── */
                        <div className="p-2 space-y-0.5">
                            {searchResults.length === 0 ? (
                                <div className="py-16 text-center text-zinc-700 text-sm">
                                    <Search className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                    <p>No files found matching</p>
                                    <p className="text-zinc-600 font-medium mt-1">"{searchQuery}"</p>
                                </div>
                            ) : searchResults.map(f => (
                                <button
                                    key={f.path}
                                    onClick={() => setSelectedFile(f)}
                                    className={`w-full flex items-start space-x-2.5 px-3 py-2.5 rounded-xl text-left transition-colors ${selectedFile?.path === f.path ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                >
                                    <FileDot ext={f.ext} />
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-white truncate">{f.name}</div>
                                        <div className="text-[10px] text-zinc-600 truncate font-mono">{f.dir}</div>
                                        {f.size !== undefined && <div className="text-[10px] text-zinc-700">{fmtSize(f.size)} · {fmtDate(f.modified)}</div>}
                                    </div>
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* ── Directory listing ── */
                        <div>
                            {parentPath && (
                                <button
                                    onClick={() => browse(parentPath)}
                                    className="w-full flex items-center space-x-3 px-4 py-2.5 border-b border-white/5 text-zinc-500 hover:text-white hover:bg-white/5 transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
                                    <span className="text-xs">Up one level</span>
                                </button>
                            )}
                            <div className="p-2 space-y-0.5">
                                {displayItems.length === 0 && (
                                    <div className="py-12 text-center text-zinc-700 text-xs">
                                        <FolderOpen className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                        <p>Empty folder</p>
                                    </div>
                                )}
                                {displayItems.map(item => (
                                    <button
                                        key={item.path}
                                        onClick={() => item.type === 'directory' ? browse(item.path) : setSelectedFile(item)}
                                        className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-left transition-colors group ${selectedFile?.path === item.path ? 'bg-white/10' : 'hover:bg-white/5'}`}
                                    >
                                        {item.type === 'directory' ? (
                                            <FolderOpen className="w-4 h-4 text-amber-400/80 shrink-0" />
                                        ) : (
                                            <FileDot ext={item.ext} />
                                        )}
                                        <span className={`flex-1 min-w-0 text-xs truncate transition-colors ${item.type === 'directory' ? 'text-zinc-300 group-hover:text-white font-medium' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                            {item.name}
                                        </span>
                                        {item.type === 'file' && item.size !== undefined && (
                                            <span className="text-[10px] text-zinc-700 shrink-0 font-mono">{fmtSize(item.size)}</span>
                                        )}
                                        {item.type === 'directory' && (
                                            <ChevronRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-500 shrink-0 transition-colors" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Right: file preview ───────────────────────────────────────── */}
            <div className="flex-1 overflow-hidden">
                {selectedFile ? (
                    <FilePreview
                        file={selectedFile}
                        onClose={() => setSelectedFile(null)}
                        onOpenInExcel={handleOpenInExcel}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center px-12 text-center">
                        <div>
                            <div className="w-20 h-20 rounded-3xl bg-white/3 border border-white/5 flex items-center justify-center mx-auto mb-6">
                                <HardDrive className="w-9 h-9 text-zinc-700" />
                            </div>
                            <h3 className="text-lg font-semibold text-zinc-300 mb-2">Full Computer Access</h3>
                            <p className="text-sm text-zinc-600 leading-relaxed max-w-sm">
                                Navigate any drive or folder on this machine. Select a file to preview it.
                                Excel and CSV files open with full row filtering — click <span className="text-amber-400 font-medium">Number Hunter</span> to search a value across all sheets.
                            </p>
                            {!currentPath && drives.length > 0 && (
                                <div className="mt-8 flex flex-wrap gap-2 justify-center">
                                    {drives.map(d => (
                                        <button
                                            key={d.path}
                                            onClick={() => browse(d.path)}
                                            className="flex items-center space-x-2 px-4 py-2.5 bg-white/5 border border-white/5 text-zinc-300 rounded-xl text-sm hover:bg-white/10 hover:border-white/10 hover:text-white transition-all"
                                        >
                                            <HardDrive className="w-4 h-4 text-zinc-500" />
                                            <span>{d.name}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
