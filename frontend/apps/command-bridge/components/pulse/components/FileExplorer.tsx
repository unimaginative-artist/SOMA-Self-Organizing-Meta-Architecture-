import React, { useState } from 'react';
import {
    Folder,
    File,
    FileCode,
    FileJson,
    FileImage,
    ChevronRight,
    ChevronDown,
    Plus,
    Trash2,
    Edit2
} from 'lucide-react';
import { BlueprintFile } from '../types';

interface Props {
    files: BlueprintFile[];
    onFileSelect: (file: BlueprintFile) => void;
    onFileDelete?: (path: string) => void;
    onFileCreate?: () => void;
    activeFile?: string | null;
}

const getFileIcon = (filename: string) => {
    if (filename.endsWith('.tsx') || filename.endsWith('.jsx')) return <FileCode className="w-3.5 h-3.5 text-blue-400" />;
    if (filename.endsWith('.ts') || filename.endsWith('.js')) return <FileCode className="w-3.5 h-3.5 text-yellow-400" />;
    if (filename.endsWith('.css')) return <FileCode className="w-3.5 h-3.5 text-pink-400" />;
    if (filename.endsWith('.json')) return <FileJson className="w-3.5 h-3.5 text-emerald-400" />;
    return <File className="w-3.5 h-3.5 text-zinc-500" />;
};

const FileExplorer: React.FC<Props> = ({ files, onFileSelect, onFileDelete, onFileCreate, activeFile }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="flex flex-col h-full bg-zinc-950/50">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-900/50 group">
                <div
                    className="flex items-center space-x-2 cursor-pointer hover:text-zinc-200 transition-colors"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <Folder className="w-4 h-4 text-blue-500/80" />
                    <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Project Files</span>
                </div>
                <button
                    onClick={onFileCreate}
                    className="p-1 hover:bg-zinc-800 rounded text-zinc-600 hover:text-blue-400 transition-colors opacity-0 group-hover:opacity-100"
                    title="New File"
                >
                    <Plus className="w-3.5 h-3.5" />
                </button>
            </div>

            {isExpanded && (
                <div className="flex-1 overflow-y-auto p-2 space-y-0.5 custom-scrollbar">
                    {files.length === 0 ? (
                        <div className="text-center py-8 text-zinc-700 text-[10px] italic">
                            No files in blueprint
                        </div>
                    ) : (
                        files.map((file, i) => (
                            <div
                                key={i}
                                className={`
                  flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all group
                  ${activeFile === file.path
                                        ? 'bg-blue-600/10 border border-blue-500/20 shadow-[0_0_10px_rgba(37,99,235,0.1)]'
                                        : 'hover:bg-zinc-900 border border-transparent'}
                `}
                                onClick={() => onFileSelect(file)}
                            >
                                <div className="flex items-center space-x-2.5 min-w-0">
                                    {getFileIcon(file.path)}
                                    <span className={`text-xs font-mono truncate ${activeFile === file.path ? 'text-blue-200' : 'text-zinc-400 group-hover:text-zinc-200'}`}>
                                        {file.path}
                                    </span>
                                </div>

                                {onFileDelete && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onFileDelete(file.path); }}
                                        className="p-1 text-zinc-700 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default FileExplorer;
