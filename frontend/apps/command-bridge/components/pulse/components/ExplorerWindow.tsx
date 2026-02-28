
import React, { useState, useEffect } from 'react';
import { Folder, File, FileCode, ChevronRight, ChevronDown, X, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onFileList: (path?: string) => Promise<string[]>; // Returns list of file paths
    onFileClick: (path: string) => void;
}

const ExplorerWindow: React.FC<Props> = ({ isOpen, onClose, onFileList, onFileClick }) => {
    const [files, setFiles] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchFiles = async () => {
        setIsLoading(true);
        try {
            // Flattened list for now, tree view requires more logic
            const list = await onFileList('.');
            setFiles(list || []);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchFiles();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="w-64 bg-[#0d0d0e] border-r border-zinc-800 flex flex-col font-sans shrink-0 h-full"
        >
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 shrink-0 h-14">
                <div className="flex items-center space-x-2 text-zinc-400">
                    <FileCode className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Explorer</span>
                </div>
                <div className="flex items-center space-x-1">
                    <button onClick={fetchFiles} className={`p-1 text-zinc-500 hover:text-white ${isLoading ? 'animate-spin' : ''}`}><RefreshCw className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                {files.length === 0 && !isLoading && (
                    <div className="text-center text-zinc-600 text-xs mt-10">No files found.</div>
                )}

                <div className="space-y-0.5">
                    {files.map((file, idx) => (
                        <button
                            key={idx}
                            onClick={() => onFileClick(file)}
                            className="w-full flex items-center space-x-2 px-2 py-1.5 rounded hover:bg-zinc-800/50 text-left group transition-colors"
                        >
                            <File className="w-3.5 h-3.5 text-zinc-600 group-hover:text-blue-400 transition-colors" />
                            <span className="text-xs text-zinc-400 group-hover:text-zinc-200 truncate">{file}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ExplorerWindow;
