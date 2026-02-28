/**
 * ExcelToolsModule.jsx — Production-grade Excel tools for Conceive
 *
 * Features:
 *  · Viewer     — multi-sheet viewer, column sort, search with prev/next nav,
 *                 cell selection, formula bar, copy value, row pagination,
 *                 jump-to-cell from Number Hunter, date/number formatting,
 *                 drag-and-drop file open
 *  · Ask SOMA   — select any cell → ask SOMA to explain it in audit context
 *  · Hunter     — cross-file search, exact-match toggle, jump-to-cell,
 *                 export results as CSV
 *  · Export     — engagement report as styled .xlsx workbook
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { exportEngagementToExcel } from './DocumentsModule.jsx';
import {
    FileSpreadsheet, Search, Download, Upload, X, Hash,
    Loader, AlertTriangle, Check, RefreshCw,
    ChevronUp, ChevronDown, ArrowUp, ArrowDown, ArrowUpDown,
    Sparkles, Copy, Filter
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────────────────────────────

const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatCellValue = (val) => {
    if (val === '' || val === null || val === undefined) return '\u00a0';
    if (val instanceof Date) return val.toLocaleDateString();
    if (typeof val === 'number') return val.toLocaleString();
    return String(val);
};

const colLabel = (ci) =>
    ci < 26
        ? String.fromCharCode(65 + ci)
        : String.fromCharCode(65 + Math.floor(ci / 26) - 1) + String.fromCharCode(65 + (ci % 26));

const ROWS_PER_PAGE = 500;

// ── Sort icon ─────────────────────────────────────────────────────────────────

function SortIcon({ col, sortCol, sortDir }) {
    if (sortCol !== col)
        return <ArrowUpDown className="w-3 h-3 text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />;
    return sortDir === 'asc'
        ? <ArrowUp className="w-3 h-3 text-blue-500 shrink-0" />
        : <ArrowDown className="w-3 h-3 text-blue-500 shrink-0" />;
}

// ── Ask SOMA panel ────────────────────────────────────────────────────────────

function SomaPanel({ cell, engagement, onClose }) {
    const [response, setResponse] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!cell) return;
        setLoading(true);
        setResponse(null);
        const prompt = [
            `I'm reviewing a spreadsheet${engagement ? ` for the engagement "${engagement.title}"` : ''}.`,
            `Cell ${colLabel(cell.col)}${cell.row + 1} on sheet "${cell.sheet}" contains the value: "${cell.value}".`,
            cell.colHeader ? `The column header is "${cell.colHeader}".` : '',
            `Briefly explain what this value likely represents in an audit context and flag anything worth noting.`,
        ].filter(Boolean).join(' ');

        fetch('/api/conceive/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: prompt,
                context: engagement ? { engagement_title: engagement.title, client_name: engagement.client_name } : {},
            }),
        })
            .then(r => r.json())
            .then(d => setResponse(d.success ? d.response : d.error || 'No response.'))
            .catch(err => setResponse(`Error: ${err.message}`))
            .finally(() => setLoading(false));
    }, [cell]);

    if (!cell) return null;

    return (
        <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-3 shrink-0 max-h-36 overflow-y-auto">
            <div className="flex items-start justify-between mb-1.5">
                <div className="flex items-center space-x-2">
                    <Sparkles className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    <span className="text-xs font-semibold text-zinc-700">
                        SOMA on {colLabel(cell.col)}{cell.row + 1}
                        {cell.colHeader ? ` · ${cell.colHeader}` : ''}
                        {' '}= <span className="text-blue-700 font-mono">{String(cell.value)}</span>
                    </span>
                </div>
                <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 ml-2 shrink-0">
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
            {loading ? (
                <div className="flex items-center space-x-2 text-xs text-zinc-500">
                    <Loader className="w-3 h-3 animate-spin" /><span>Asking SOMA...</span>
                </div>
            ) : (
                <p className="text-xs text-zinc-600 leading-relaxed">{response}</p>
            )}
        </div>
    );
}

// ── Excel Viewer ──────────────────────────────────────────────────────────────

function ExcelViewer({ workbook, fileName, highlightCell, engagement, onCellSelect }) {
    const [activeSheet, setActiveSheet]   = useState(0);
    const [search, setSearch]             = useState('');
    const [matchIndex, setMatchIndex]     = useState(0);
    const [sortCol, setSortCol]           = useState(null);
    const [sortDir, setSortDir]           = useState('asc');
    const [selectedCell, setSelectedCell] = useState(null); // { ri, ci } — display-row index
    const [rowLimit, setRowLimit]         = useState(ROWS_PER_PAGE);
    const [somaCell, setSomaCell]         = useState(null);
    const highlightRef                    = useRef(null);

    const sheets     = workbook?.SheetNames || [];
    const sheetName  = sheets[activeSheet];
    const ws         = workbook?.Sheets[sheetName];
    const rawData    = ws ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) : [];
    const headerRow  = rawData[0] || [];
    const bodyRows   = rawData.slice(1);
    const colCount   = Math.max(...rawData.map(r => Array.isArray(r) ? r.length : 0), 0);

    // Sorted body rows (header stays at top)
    const sortedBody = sortCol !== null
        ? [...bodyRows].sort((a, b) => {
            const av = a[sortCol] ?? '';
            const bv = b[sortCol] ?? '';
            const an = typeof av === 'number' ? av : parseFloat(String(av).replace(/[$,%]/g, ''));
            const bn = typeof bv === 'number' ? bv : parseFloat(String(bv).replace(/[$,%]/g, ''));
            const cmp = (!isNaN(an) && !isNaN(bn))
                ? an - bn
                : String(av).localeCompare(String(bv), undefined, { sensitivity: 'base', numeric: true });
            return sortDir === 'asc' ? cmp : -cmp;
        })
        : bodyRows;

    // Paginated display data: row 0 = header, rows 1+ = body (up to rowLimit)
    const displayData = [headerRow, ...sortedBody.slice(0, rowLimit)];
    const hasMore     = bodyRows.length > rowLimit;

    // Build match positions over displayData
    const matchQ = search.toLowerCase().trim();
    const matchPositions = [];
    if (matchQ) {
        displayData.forEach((row, ri) => {
            (Array.isArray(row) ? row : []).forEach((cell, ci) => {
                if (String(cell).toLowerCase().includes(matchQ)) matchPositions.push({ ri, ci });
            });
        });
    }
    const totalMatches    = matchPositions.length;
    const safeMatchIdx    = totalMatches > 0 ? matchIndex % totalMatches : 0;
    const currentMatchPos = matchPositions[safeMatchIdx];

    // Jump to cell from Number Hunter
    useEffect(() => {
        if (!highlightCell) return;
        // Reset sort so original row indices are preserved
        setSortCol(null);
        setSortDir('asc');
        const idx = sheets.indexOf(highlightCell.sheet);
        if (idx >= 0) setActiveSheet(idx);
        // +1 because displayData[0] is the header
        const displayRow = highlightCell.row + 1;
        setSelectedCell({ ri: displayRow, ci: highlightCell.col });
        // Expand pagination if the target row is beyond the current limit
        if (highlightCell.row >= rowLimit) {
            setRowLimit(Math.ceil((highlightCell.row + 50) / ROWS_PER_PAGE) * ROWS_PER_PAGE);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [highlightCell]);

    // Scroll highlighted cell into view
    useEffect(() => {
        if (highlightRef.current) {
            highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
    });

    const handleSortClick = (ci) => {
        if (sortCol === ci) {
            if (sortDir === 'asc') setSortDir('desc');
            else { setSortCol(null); setSortDir('asc'); }
        } else {
            setSortCol(ci);
            setSortDir('asc');
        }
    };

    const prevMatch = () => setMatchIndex(i => (i - 1 + totalMatches) % totalMatches);
    const nextMatch = () => setMatchIndex(i => (i + 1) % totalMatches);

    const isCellHighlighted = (ri, ci) => {
        if (selectedCell?.ri === ri && selectedCell?.ci === ci) return true;
        // Also highlight the jump-target if it's in the current sheet
        if (highlightCell && sheetName === highlightCell.sheet &&
            ri === highlightCell.row + 1 && ci === highlightCell.col) return true;
        return false;
    };

    const isCurrentSearchMatch = (ri, ci) =>
        currentMatchPos?.ri === ri && currentMatchPos?.ci === ci;

    const isAnySearchMatch = (ri, ci) =>
        matchQ && String((displayData[ri] || [])[ci] || '').toLowerCase().includes(matchQ);

    const selectedValue = selectedCell
        ? (displayData[selectedCell.ri] || [])[selectedCell.ci] ?? ''
        : null;

    const handleAskSoma = () => {
        if (!selectedCell) return;
        const val = (displayData[selectedCell.ri] || [])[selectedCell.ci] ?? '';
        const colHeader = String(headerRow[selectedCell.ci] ?? '');
        setSomaCell({ value: val, row: selectedCell.ri - 1, col: selectedCell.ci, colHeader, sheet: sheetName });
        onCellSelect?.({ value: val, row: selectedCell.ri - 1, col: selectedCell.ci, colHeader, sheet: sheetName });
    };

    return (
        <div className="flex flex-col h-full bg-white">

            {/* Formula bar */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 border-b border-zinc-200 shrink-0 transition-colors ${selectedCell ? 'bg-zinc-50' : 'bg-zinc-50/50'}`}>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-200 px-2 py-0.5 rounded min-w-[48px] text-center select-none">
                    {selectedCell ? `${colLabel(selectedCell.ci)}${selectedCell.ri}` : '—'}
                </span>
                <span className="text-xs text-zinc-600 font-mono flex-1 truncate min-w-0">
                    {selectedCell ? String(selectedValue) : ''}
                </span>
                {selectedCell && (
                    <>
                        <button
                            onClick={() => navigator.clipboard?.writeText(String(selectedValue))}
                            title="Copy value"
                            className="p-1 text-zinc-400 hover:text-zinc-700 transition-colors shrink-0"
                        >
                            <Copy className="w-3 h-3" />
                        </button>
                        <button
                            onClick={handleAskSoma}
                            title="Ask SOMA to explain this value"
                            className="flex items-center space-x-1 px-2 py-0.5 bg-purple-500/10 text-purple-700 text-[10px] font-semibold rounded hover:bg-purple-500/20 transition-colors shrink-0"
                        >
                            <Sparkles className="w-3 h-3" /><span>Ask SOMA</span>
                        </button>
                        <button onClick={() => setSelectedCell(null)} className="text-zinc-300 hover:text-zinc-600 shrink-0">
                            <X className="w-3 h-3" />
                        </button>
                    </>
                )}
            </div>

            {/* Sheet tabs + search */}
            <div className="flex items-center border-b border-zinc-200 bg-zinc-50 px-2 pt-2 space-x-1 shrink-0 flex-wrap gap-y-1">
                <div className="flex items-center space-x-1 flex-1 min-w-0 overflow-x-auto">
                    {sheets.map((name, i) => (
                        <button
                            key={i}
                            onClick={() => { setActiveSheet(i); setSearch(''); setSortCol(null); setSelectedCell(null); setRowLimit(ROWS_PER_PAGE); setSomaCell(null); }}
                            className={`px-3 py-1.5 text-xs font-medium rounded-t border-b-2 whitespace-nowrap transition-colors ${i === activeSheet ? 'border-emerald-500 text-emerald-700 bg-white' : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:bg-white'}`}
                        >
                            {name}
                        </button>
                    ))}
                </div>
                <div className="flex items-center space-x-1.5 pb-1.5 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-zinc-400" />
                        <input
                            className="pl-6 pr-3 py-1.5 text-xs border border-zinc-300 rounded-lg focus:outline-none focus:border-emerald-500 w-52"
                            placeholder="Find a value... (Enter = next)"
                            value={search}
                            onChange={e => { setSearch(e.target.value); setMatchIndex(0); }}
                            onKeyDown={e => {
                                if (e.key === 'Enter') { e.shiftKey ? prevMatch() : nextMatch(); }
                                if (e.key === 'Escape') { setSearch(''); }
                            }}
                        />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                    {search && (
                        <div className="flex items-center space-x-0.5">
                            <span className={`text-xs font-medium whitespace-nowrap mr-1 ${totalMatches > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {totalMatches > 0 ? `${safeMatchIdx + 1}/${totalMatches}` : 'no matches'}
                            </span>
                            {totalMatches > 1 && (
                                <>
                                    <button onClick={prevMatch} title="Previous (Shift+Enter)" className="p-0.5 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-200 transition-colors">
                                        <ChevronUp className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={nextMatch} title="Next (Enter)" className="p-0.5 text-zinc-400 hover:text-zinc-700 rounded hover:bg-zinc-200 transition-colors">
                                        <ChevronDown className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                    {sortCol !== null && (
                        <button
                            onClick={() => { setSortCol(null); setSortDir('asc'); }}
                            title="Clear sort"
                            className="flex items-center space-x-1 px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-medium rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                        >
                            <Filter className="w-3 h-3" />
                            <span>Sorted {sortDir === 'asc' ? '↑' : '↓'} col {colLabel(sortCol)}</span>
                            <X className="w-2.5 h-2.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto">
                <table className="text-xs border-collapse min-w-max">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className="bg-zinc-100 border border-zinc-200 px-2 py-1.5 text-zinc-400 font-normal w-10 text-center select-none">
                                #
                            </th>
                            {Array.from({ length: colCount }, (_, ci) => (
                                <th
                                    key={ci}
                                    onClick={() => handleSortClick(ci)}
                                    title={`Sort by column ${colLabel(ci)}${headerRow[ci] ? ` (${headerRow[ci]})` : ''}`}
                                    className="bg-zinc-100 border border-zinc-200 px-3 py-1.5 text-zinc-500 font-semibold min-w-[90px] text-center select-none cursor-pointer hover:bg-zinc-200 active:bg-zinc-300 transition-colors group"
                                >
                                    <div className="flex items-center justify-center space-x-1">
                                        <span>{colLabel(ci)}</span>
                                        <SortIcon col={ci} sortCol={sortCol} sortDir={sortDir} />
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayData.map((row, ri) => {
                            const rowHasMatch = matchQ && (Array.isArray(row) ? row : []).some((_, ci) => isAnySearchMatch(ri, ci));
                            const isHeader    = ri === 0;
                            return (
                                <tr
                                    key={ri}
                                    className={rowHasMatch && !isHeader ? 'bg-yellow-50' : isHeader ? '' : 'hover:bg-blue-50/30'}
                                >
                                    <td className="bg-zinc-50 border border-zinc-200 px-2 py-0.5 text-zinc-400 text-center font-mono select-none">
                                        {isHeader ? '—' : ri}
                                    </td>
                                    {Array.from({ length: colCount }, (_, ci) => {
                                        const val             = (Array.isArray(row) ? row[ci] : undefined) ?? '';
                                        const highlighted     = isCellHighlighted(ri, ci);
                                        const isCurrentMatch  = isCurrentSearchMatch(ri, ci);
                                        const anyMatch        = isAnySearchMatch(ri, ci);
                                        const isNum           = typeof val === 'number';
                                        const isDate          = val instanceof Date;
                                        const isHead          = ri === 0;

                                        const needsRef = highlighted || isCurrentMatch;
                                        return (
                                            <td
                                                key={ci}
                                                ref={needsRef ? highlightRef : null}
                                                onClick={() => !isHead && setSelectedCell({ ri, ci })}
                                                className={`border border-zinc-200 px-2.5 py-0.5 whitespace-nowrap ${
                                                    highlighted || isCurrentMatch
                                                        ? 'bg-blue-100 ring-2 ring-inset ring-blue-400 font-bold text-blue-900 cursor-pointer'
                                                        : anyMatch
                                                        ? 'bg-yellow-200 font-bold text-yellow-900 cursor-pointer'
                                                        : isHead
                                                        ? 'bg-zinc-50 font-semibold text-zinc-700 cursor-default'
                                                        : (isNum || isDate)
                                                        ? 'text-right font-mono text-blue-700 cursor-pointer'
                                                        : 'text-zinc-700 cursor-pointer'
                                                } ${selectedCell?.ri === ri && selectedCell?.ci === ci && !highlighted ? 'bg-blue-50 ring-1 ring-inset ring-blue-300' : ''}`}
                                            >
                                                {formatCellValue(val)}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {hasMore && (
                    <div className="py-4 text-center border-t border-zinc-200 bg-zinc-50 sticky bottom-0">
                        <p className="text-xs text-zinc-500 mb-2">
                            Showing {rowLimit.toLocaleString()} of {bodyRows.length.toLocaleString()} rows
                        </p>
                        <button
                            onClick={() => setRowLimit(r => r + ROWS_PER_PAGE)}
                            className="px-4 py-1.5 text-xs font-medium text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors"
                        >
                            Load {Math.min(ROWS_PER_PAGE, bodyRows.length - rowLimit).toLocaleString()} more rows
                        </button>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="border-t border-zinc-200 bg-zinc-50 px-4 py-2 flex items-center justify-between shrink-0">
                <span className="text-xs text-zinc-500">
                    {fileName} · {bodyRows.length.toLocaleString()} rows · {colCount} cols · sheet {activeSheet + 1}/{sheets.length}
                </span>
                <button
                    onClick={() => {
                        const csv = XLSX.utils.sheet_to_csv(ws);
                        const blob = new Blob([csv], { type: 'text/csv' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `${sheetName}.csv`;
                        a.click();
                    }}
                    className="text-xs text-zinc-500 hover:text-emerald-600 transition-colors flex items-center space-x-1"
                >
                    <Download className="w-3 h-3" /><span>Export CSV</span>
                </button>
            </div>

            {/* SOMA analysis panel */}
            {somaCell && (
                <SomaPanel
                    cell={somaCell}
                    engagement={engagement}
                    onClose={() => setSomaCell(null)}
                />
            )}
        </div>
    );
}

// ── Number Hunter ─────────────────────────────────────────────────────────────

function NumberHunter({ openFiles, onJumpTo }) {
    const [query, setQuery]         = useState('');
    const [results, setResults]     = useState(null);
    const [exactMatch, setExactMatch] = useState(false);

    const hunt = useCallback(() => {
        if (!query.trim() || openFiles.length === 0) return;
        const q   = query.trim().toLowerCase();
        const found = [];

        openFiles.forEach(f => {
            if (!f.workbook) return;
            f.workbook.SheetNames.forEach(sheetName => {
                const ws   = f.workbook.Sheets[sheetName];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
                data.forEach((row, ri) => {
                    if (!Array.isArray(row)) return;
                    row.forEach((cell, ci) => {
                        const cellStr = String(cell).toLowerCase();
                        const match   = exactMatch ? cellStr === q : cellStr.includes(q);
                        if (!match) return;
                        const context = row
                            .slice(Math.max(0, ci - 2), ci + 3)
                            .map(v => (v === '' ? '…' : String(v)))
                            .join('  |  ');
                        found.push({
                            file:     f.name,
                            fileId:   f.id,
                            sheet:    sheetName,
                            cell:     `${colLabel(ci)}${ri + 1}`,
                            value:    String(cell),
                            context,
                            rowIndex: ri,
                            colIndex: ci,
                        });
                    });
                });
            });
        });

        setResults(found);
    }, [query, openFiles, exactMatch]);

    const exportResults = () => {
        if (!results?.length) return;
        const header = 'File,Sheet,Cell,Value,Context\n';
        const rows   = results.map(r =>
            `"${r.file}","${r.sheet}","${r.cell}","${r.value}","${r.context.replace(/"/g, '""')}"`
        ).join('\n');
        const blob = new Blob([header + rows], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `hunt_${query.replace(/[^a-z0-9]/gi, '_')}.csv`;
        a.click();
    };

    return (
        <div className="flex flex-col h-full bg-[#09090b]">
            <div className="p-5 border-b border-white/10 space-y-3">
                <div className="flex items-center space-x-2">
                    <Hash className="w-5 h-5 text-amber-400" />
                    <h3 className="font-semibold text-white">Number Hunter</h3>
                    <span className="text-xs text-zinc-600">
                        across {openFiles.length} open file{openFiles.length !== 1 ? 's' : ''}
                    </span>
                </div>
                <div className="flex space-x-2">
                    <input
                        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-amber-500/50"
                        placeholder="Enter any number, name, or text..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && hunt()}
                    />
                    <button
                        onClick={hunt}
                        disabled={!query.trim() || openFiles.length === 0}
                        className="px-5 py-2.5 bg-amber-500 text-black text-sm font-bold rounded-lg hover:bg-amber-400 disabled:opacity-40 transition-colors flex items-center space-x-2"
                    >
                        <Search className="w-4 h-4" /><span>Hunt</span>
                    </button>
                </div>
                <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 cursor-pointer select-none">
                        <div
                            onClick={() => setExactMatch(v => !v)}
                            className={`w-8 h-4 rounded-full transition-colors relative cursor-pointer ${exactMatch ? 'bg-amber-500' : 'bg-white/10'}`}
                        >
                            <div className={`w-3 h-3 bg-white rounded-full absolute top-0.5 transition-transform ${exactMatch ? 'translate-x-4' : 'translate-x-0.5'}`} />
                        </div>
                        <span className="text-xs text-zinc-500">Exact match only</span>
                    </label>
                    {results?.length > 0 && (
                        <button
                            onClick={exportResults}
                            className="flex items-center space-x-1 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
                        >
                            <Download className="w-3 h-3" /><span>Export {results.length} results</span>
                        </button>
                    )}
                </div>
                {openFiles.length === 0 && (
                    <p className="text-xs text-zinc-700">Open Excel files in the Viewer tab first.</p>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-5">
                {results === null && (
                    <div className="py-16 text-center text-zinc-700">
                        <Hash className="w-8 h-8 mx-auto mb-3 opacity-20" />
                        <p className="font-medium">Search across all open spreadsheets at once</p>
                        <p className="text-xs mt-1">Click any result to jump directly to that cell.</p>
                    </div>
                )}
                {results !== null && results.length === 0 && (
                    <div className="py-16 text-center text-zinc-700">
                        <Search className="w-6 h-6 mx-auto mb-2 opacity-30" />
                        <p>No matches for "<span className="text-amber-400">{query}</span>"</p>
                        {exactMatch && <p className="text-xs mt-1 text-zinc-600">Try disabling exact match.</p>}
                    </div>
                )}
                {results !== null && results.length > 0 && (
                    <div className="space-y-2">
                        <div className="text-xs text-zinc-500 mb-4">
                            <span className="text-amber-400 font-bold text-sm">{results.length}</span>
                            {' '}match{results.length !== 1 ? 'es' : ''} for "<span className="text-white">{query}</span>"
                            {onJumpTo && <span className="ml-2 text-zinc-700">· click any result to jump</span>}
                        </div>
                        {results.map((r, i) => (
                            <div
                                key={i}
                                onClick={() => onJumpTo?.(r)}
                                className={`bg-[#151518] border border-white/5 rounded-xl p-4 transition-all ${onJumpTo ? 'hover:border-amber-500/30 cursor-pointer hover:bg-[#1a1a1d]' : ''}`}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="min-w-0 flex-1">
                                        <div className="flex items-center space-x-2 mb-1.5 flex-wrap gap-y-1">
                                            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span className="text-xs font-semibold text-white truncate">{r.file}</span>
                                            <span className="text-[10px] text-zinc-600 bg-white/5 px-1.5 py-0.5 rounded font-mono shrink-0">
                                                {r.sheet}!{r.cell}
                                            </span>
                                        </div>
                                        <div className="text-lg font-bold text-amber-400 mb-1">{r.value}</div>
                                        <div className="text-[11px] text-zinc-600 font-mono truncate">…{r.context}…</div>
                                    </div>
                                    {onJumpTo && (
                                        <span className="text-[10px] text-amber-600/60 shrink-0 ml-3 mt-1">↩ jump</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Excel Export ──────────────────────────────────────────────────────────────

function ExcelExportPanel({ engagement }) {
    const [engFiles, setEngFiles]       = useState(null);
    const [engDecisions, setEngDecisions] = useState(null);
    const [loading, setLoading]         = useState(false);
    const [exported, setExported]       = useState(false);

    const loadData = async () => {
        if (!engagement?.id) return { files: [], decisions: [] };
        const [fr, dr] = await Promise.all([
            fetch(`/api/conceive/files?engagement_id=${engagement.id}`).then(r => r.json()),
            fetch(`/api/conceive/decisions?engagement_id=${engagement.id}`).then(r => r.json()),
        ]);
        const files     = fr.files     || [];
        const decisions = dr.decisions || [];
        setEngFiles(files);
        setEngDecisions(decisions);
        return { files, decisions };
    };

    const handleExportClick = async () => {
        if (!engagement || loading) return;
        setLoading(true);
        try {
            const data = (engFiles === null || engDecisions === null)
                ? await loadData()
                : { files: engFiles, decisions: engDecisions };
            exportEngagementToExcel(engagement, data.files, data.decisions);
            setExported(true);
            setTimeout(() => setExported(false), 3000);
        } catch (err) {
            alert(`Export failed: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#09090b] p-6 space-y-6 overflow-y-auto">
            <div>
                <div className="flex items-center space-x-2 mb-1">
                    <Download className="w-5 h-5 text-emerald-400" />
                    <h3 className="font-semibold text-white">Export to Excel</h3>
                </div>
                <p className="text-xs text-zinc-500">Generate a professional .xlsx workbook — summary, documents, and decision log.</p>
            </div>

            {!engagement ? (
                <div className="py-12 text-center text-zinc-700 bg-[#151518] rounded-2xl border border-white/5">
                    <AlertTriangle className="w-8 h-8 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">No engagement selected</p>
                    <p className="text-xs mt-1">Select an engagement via the Engagements tab, then click "Documents".</p>
                </div>
            ) : (
                <>
                    <div className="bg-[#151518] border border-white/5 rounded-2xl p-5 space-y-4">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center shrink-0">
                                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <div className="font-semibold text-white">{engagement.title}</div>
                                <div className="text-xs text-zinc-500">{engagement.client_name || 'No client'} · {engagement.type}</div>
                            </div>
                            {!engFiles && !loading && (
                                <button onClick={handleExportClick} className="ml-auto text-xs text-zinc-500 hover:text-white flex items-center space-x-1 transition-colors">
                                    <RefreshCw className="w-3.5 h-3.5" /><span>Load data</span>
                                </button>
                            )}
                        </div>

                        {engFiles !== null && (
                            <div className="grid grid-cols-3 gap-3">
                                {[
                                    { label: 'Documents',  value: engFiles.length,          color: 'blue'    },
                                    { label: 'Decisions',  value: engDecisions?.length ?? 0, color: 'purple'  },
                                    { label: 'Progress',   value: `${engagement.progress}%`, color: 'emerald' },
                                ].map(s => (
                                    <div key={s.label} className="bg-white/5 rounded-xl p-3 text-center">
                                        <div className={`text-xl font-bold text-${s.color}-400`}>{s.value}</div>
                                        <div className="text-[10px] text-zinc-500 mt-0.5">{s.label}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="text-xs text-zinc-600 space-y-1">
                            {['Sheet 1: Engagement Summary', 'Sheet 2: Documents + SOMA AI Analysis', 'Sheet 3: Decision Log with confidence scores'].map(s => (
                                <div key={s} className="flex items-center space-x-2">
                                    <Check className="w-3 h-3 text-zinc-600" /><span>{s}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button
                        onClick={handleExportClick}
                        disabled={loading}
                        className={`flex items-center justify-center space-x-2 px-8 py-4 rounded-2xl font-semibold text-sm transition-all shadow-lg ${
                            exported
                                ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                                : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/20 active:scale-95'
                        }`}
                    >
                        {loading   ? <><Loader className="w-5 h-5 animate-spin" /><span>Loading data...</span></>
                        : exported ? <><Check  className="w-5 h-5" /><span>Downloaded!</span></>
                        :            <><Download className="w-5 h-5" /><span>Download Excel Report</span></>}
                    </button>

                    <p className="text-xs text-zinc-700 text-center">Saves to your browser's download folder</p>
                </>
            )}
        </div>
    );
}

// ── Main Module ───────────────────────────────────────────────────────────────

export default function ExcelToolsModule({ engagement, pendingFile, onFileLoaded }) {
    const [tab, setTab]                   = useState('viewer');
    const [openFiles, setOpenFiles]       = useState([]);
    const [activeFileId, setActiveFileId] = useState(null);
    const [jumpTarget, setJumpTarget]     = useState(null);  // { sheet, row, col } for ExcelViewer
    const [isDragging, setIsDragging]     = useState(false);
    const fileInputRef                    = useRef(null);

    // Load a file from the server filesystem (triggered by Browse → Number Hunter)
    useEffect(() => {
        if (!pendingFile?.path) return;
        const load = async () => {
            try {
                const res = await fetch(`/api/conceive/fs/file?path=${encodeURIComponent(pendingFile.path)}`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const ab       = await res.arrayBuffer();
                const workbook = XLSX.read(ab, { type: 'array', cellDates: true });
                const id       = `server_${Date.now()}_${pendingFile.name}`;
                setOpenFiles(prev => {
                    if (prev.find(f => f.name === pendingFile.name)) return prev;
                    return [...prev, { id, name: pendingFile.name, size: pendingFile.size, workbook }];
                });
                setActiveFileId(id);
                setTab('hunter');
            } catch (err) {
                console.error('[ExcelTools] Failed to load server file:', err.message);
            } finally {
                onFileLoaded?.();
            }
        };
        load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pendingFile]);

    const processFiles = async (fileList) => {
        for (const file of Array.from(fileList)) {
            const ext = file.name.split('.').pop()?.toLowerCase() || '';
            if (!['xlsx', 'xls', 'csv'].includes(ext)) continue;
            const ab       = await file.arrayBuffer();
            const workbook = XLSX.read(ab, { type: 'buffer', cellDates: true });
            const id       = `${Date.now()}_${file.name}`;
            setOpenFiles(prev => {
                if (prev.find(f => f.name === file.name)) return prev;
                return [...prev, { id, name: file.name, size: file.size, workbook }];
            });
            setActiveFileId(id);
        }
    };

    const handleFileOpen  = async (e) => { await processFiles(e.target.files); e.target.value = ''; };
    const handleDrop      = async (e) => { e.preventDefault(); setIsDragging(false); await processFiles(e.dataTransfer.files); };
    const handleDragOver  = (e) => { e.preventDefault(); setIsDragging(true); };
    const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setIsDragging(false); };

    const closeFile = (id) => {
        setOpenFiles(prev => prev.filter(f => f.id !== id));
        if (activeFileId === id) setActiveFileId(openFiles.find(f => f.id !== id)?.id || null);
        if (jumpTarget) setJumpTarget(null);
    };

    // Jump-to from Number Hunter: switch file + tab + pass cell target to viewer
    const handleJumpTo = (result) => {
        setActiveFileId(result.fileId);
        setJumpTarget({ sheet: result.sheet, row: result.rowIndex, col: result.colIndex });
        setTab('viewer');
    };

    const activeFile = openFiles.find(f => f.id === activeFileId);

    return (
        <div
            className={`flex flex-col h-full bg-[#09090b] overflow-hidden relative transition-colors ${isDragging ? 'ring-2 ring-inset ring-emerald-500/60' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
        >
            {/* Drag overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-20 bg-emerald-500/10 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                        <FileSpreadsheet className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                        <p className="text-emerald-300 font-semibold">Drop to open</p>
                    </div>
                </div>
            )}

            {/* Tab bar + open file tabs */}
            <div className="flex items-center px-4 py-2 bg-[#151518] border-b border-white/5 space-x-3 shrink-0 overflow-hidden">
                {/* Tabs */}
                <div className="flex items-center space-x-1 shrink-0">
                    {[
                        { id: 'viewer',  label: 'Viewer',        icon: FileSpreadsheet },
                        { id: 'hunter',  label: 'Number Hunter', icon: Hash            },
                        { id: 'export',  label: 'Export Report', icon: Download        },
                    ].map(t => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all ${tab === t.id ? 'bg-white/10 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <t.icon className="w-3.5 h-3.5" /><span>{t.label}</span>
                        </button>
                    ))}
                </div>

                {/* Open file tabs */}
                <div className="flex items-center space-x-1 overflow-x-auto flex-1 min-w-0">
                    {openFiles.map(f => (
                        <div
                            key={f.id}
                            onClick={() => { setActiveFileId(f.id); setTab('viewer'); setJumpTarget(null); }}
                            className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs border cursor-pointer shrink-0 transition-all ${f.id === activeFileId ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300' : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'}`}
                        >
                            <FileSpreadsheet className="w-3 h-3 shrink-0" />
                            <span className="max-w-[120px] truncate">{f.name}</span>
                            {f.size && <span className="text-zinc-700 text-[10px]">{formatSize(f.size)}</span>}
                            <button
                                onClick={e => { e.stopPropagation(); closeFile(f.id); }}
                                className="text-zinc-600 hover:text-red-400 ml-0.5"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    ))}
                </div>

                {/* Open file button */}
                <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Open Excel file (or drag & drop)"
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-xs font-medium rounded-lg transition-colors shrink-0"
                >
                    <Upload className="w-3.5 h-3.5" /><span>Open Excel</span>
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    multiple
                    className="hidden"
                    onChange={handleFileOpen}
                />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden">
                {tab === 'viewer' && (
                    activeFile ? (
                        <ExcelViewer
                            workbook={activeFile.workbook}
                            fileName={activeFile.name}
                            highlightCell={jumpTarget}
                            engagement={engagement}
                        />
                    ) : (
                        <div className="h-full flex items-center justify-center text-zinc-700">
                            <div className="text-center">
                                <FileSpreadsheet className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                <p className="font-medium text-zinc-500">No spreadsheet open</p>
                                <p className="text-xs mt-1">Click "Open Excel" or drag a file anywhere onto this panel.</p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="mt-4 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
                                >
                                    Open Excel file
                                </button>
                            </div>
                        </div>
                    )
                )}
                {tab === 'hunter' && <NumberHunter openFiles={openFiles} onJumpTo={handleJumpTo} />}
                {tab === 'export'  && <ExcelExportPanel engagement={engagement} />}
            </div>
        </div>
    );
}
