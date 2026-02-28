
import React, { useState, useRef } from 'react';
import { Terminal as TerminalIcon, X, RefreshCw, ChevronRight } from 'lucide-react';

interface TerminalWindowProps {
    isOpen: boolean;
    onClose: () => void;
    onExecute: (cmd: string) => Promise<string>;
    className?: string;
}

const TerminalWindow: React.FC<TerminalWindowProps> = ({ isOpen, onClose, onExecute, className }) => {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>(['$ Form Terminal Online v2.0']);
    const [isProcessing, setIsProcessing] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const cmd = input.trim();
        const newHistory = [...history, `$ \${cmd}`];
        setHistory(newHistory);
        setInput('');
        setIsProcessing(true);
        
        setTimeout(scrollToBottom, 10);

        try {
            const response = await onExecute(cmd);
            if (response) {
                const lines = response.split('\n');
                setHistory([...newHistory, ...lines]);
            }
        } catch (error) {
            setHistory([...newHistory, `Error: \${error}`]);
        } finally {
            setIsProcessing(false);
            setTimeout(scrollToBottom, 50);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`bg-[#09090b] flex flex-col font-mono text-sm shrink-0 \${className}`}>
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0">
                <div className="flex items-center space-x-2 text-zinc-400">
                    <TerminalIcon className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Live Shell</span>
                </div>
                <div className="flex items-center space-x-2">
                    <button onClick={() => setHistory([])} className="p-1 text-zinc-500 hover:text-zinc-300 transition-colors" title="Clear Console">
                        <RefreshCw className="w-3 h-3" />
                    </button>
                    <button onClick={onClose} className="p-1 text-zinc-500 hover:text-white transition-colors">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1 bg-black text-zinc-300 custom-scrollbar font-mono text-xs">
                {history.map((line, i) => (
                    <div key={i} className={`\${line.startsWith('$') ? 'text-blue-400 font-bold mt-2' : 'text-zinc-400'} break-words whitespace-pre-wrap`}>
                        {line}
                    </div>
                ))}
                {isProcessing && (
                    <div className="flex items-center space-x-2 text-emerald-500 animate-pulse mt-1">
                        <ChevronRight className="w-3 h-3" />
                        <span>Executing...</span>
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="p-3 border-t border-zinc-800 bg-zinc-900/50 flex items-center shrink-0">
                <span className="text-blue-500 mr-2 font-bold">$</span>
                <input
                    className="flex-1 bg-transparent border-none outline-none text-zinc-200 placeholder-zinc-700 text-xs font-mono"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Raw command mode..."
                    autoFocus
                    disabled={isProcessing}
                />
            </form>
        </div>
    );
};

export default TerminalWindow;
