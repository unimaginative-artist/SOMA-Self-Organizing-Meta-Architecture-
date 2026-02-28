import React, { useState, useEffect } from 'react';
import { BlueprintFile } from '../types';
import { Save, AlertCircle, CheckCircle2, RotateCcw } from 'lucide-react';
import { CodeReviewPanel } from './CodeReviewPanel';
import { ReviewIssue } from '../services/codeReviewer';

interface Props {
    file: BlueprintFile | null;
    onSave: (path: string, newContent: string) => void;
}

const EditorPlane: React.FC<Props> = ({ file, onSave }) => {
    const [content, setContent] = useState('');
    const [isDirty, setIsDirty] = useState(false);
    const [showReview, setShowReview] = useState(true);

    useEffect(() => {
        if (file) {
            setContent(file.content);
            setIsDirty(false);
        }
    }, [file]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setContent(e.target.value);
        setIsDirty(true);
    };

    const handleSave = () => {
        if (file) {
            onSave(file.path, content);
            setIsDirty(false);
        }
    };

    const handleFixIssue = (issue: ReviewIssue) => {
        // TODO: Implement auto-fix via arbiter
        console.log('[EditorPlane] Auto-fix requested:', issue);
    };

    if (!file) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0d0e] text-zinc-500 p-8">
                <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4">
                    <div className="w-8 h-8 rounded bg-zinc-800 rotate-45" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest">No File Selected</p>
                <p className="text-[10px] mt-2 opacity-50">Select a file from the explorer to begin editing.</p>
            </div>
        );
    }

    const lineCount = content.split('\n').length;

    return (
        <div className="flex-1 flex flex-col h-full bg-[#1e1e1e] animate-in fade-in duration-300">
            {/* Editor Toolbar */}
            <div className="h-10 border-b border-zinc-800 bg-[#252526] flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center space-x-3">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">{file.path}</span>
                    {isDirty && (
                        <span className="flex items-center space-x-1 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            <AlertCircle className="w-3 h-3" />
                            <span>Unsaved Changes</span>
                        </span>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <button
                        onClick={() => setShowReview(!showReview)}
                        className={`p-1.5 rounded transition-colors ${
                            showReview 
                                ? 'bg-blue-600 text-white' 
                                : 'hover:bg-zinc-700 text-zinc-500 hover:text-white'
                        }`}
                        title="Toggle Code Review"
                    >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={() => { setContent(file.content); setIsDirty(false); }}
                        disabled={!isDirty}
                        className="p-1.5 rounded hover:bg-zinc-700 text-zinc-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                        title="Revert Changes"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!isDirty}
                        className={`
               flex items-center space-x-2 px-3 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-all
               ${isDirty
                                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                                : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
             `}
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save</span>
                    </button>
                </div>
            </div>

            {/* Main Editor Area */}
            <div className="flex-1 flex min-h-0 relative font-mono text-sm leading-6">
                {/* Line Numbers */}
                <div className="w-12 bg-[#1e1e1e] border-r border-zinc-800 text-zinc-600 text-right pr-3 pt-4 select-none shrink-0 font-medium opacity-50">
                    {Array.from({ length: lineCount }).map((_, i) => (
                        <div key={i} className="leading-6">{i + 1}</div>
                    ))}
                </div>

                {/* Text Area (Simulating Code Editor) */}
                <textarea
                    value={content}
                    onChange={handleInput}
                    className="flex-1 bg-[#1e1e1e] text-zinc-300 border-none outline-none resize-none p-4 custom-scrollbar leading-6 whitespace-pre"
                    spellCheck={false}
                    style={{ tabSize: 2 }}
                />
            </div>

            {/* Code Review Panel */}
            {showReview && file && (
                <CodeReviewPanel
                    file={file.path}
                    content={content}
                    onRequestFix={handleFixIssue}
                />
            )}

            {/* Status Bar */}
            <div className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[10px] font-medium shrink-0">
                <div className="flex items-center space-x-3">
                    <span>master*</span>
                    <span>Preview Mode</span>
                </div>
                <div className="flex items-center space-x-3">
                    <span>Ln {lineCount}, Col 1</span>
                    <span>UTF-8</span>
                    <span>{file.language.toUpperCase()}</span>
                    <span>Form Editor</span>
                </div>
            </div>
        </div>
    );
};

export default EditorPlane;
