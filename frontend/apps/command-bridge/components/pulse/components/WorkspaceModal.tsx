import React, { useState } from 'react';
import { Folder, GitBranch, Plus, X, Loader2 } from 'lucide-react';

interface WorkspaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: { name: string; path: string; repoUrl?: string }) => Promise<void>;
}

const WorkspaceModal: React.FC<WorkspaceModalProps> = ({ isOpen, onClose, onCreate }) => {
    const [name, setName] = useState('');
    const [path, setPath] = useState('');
    const [repoUrl, setRepoUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            await onCreate({ name, path, repoUrl: repoUrl || undefined });
            onClose();
            // Reset form
            setName('');
            setPath('');
            setRepoUrl('');
        } catch (err: any) {
            setError(err.message || 'Failed to create workspace');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="mb-6">
                    <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-blue-500" />
                        New Workspace
                    </h2>
                    <p className="text-zinc-400 text-sm mt-1">Create a new workspace or clone a repository.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                            Workspace Name
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="My Awesome Project"
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2.5 text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-zinc-700"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                            Local Path
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                placeholder="C:/Users/Dev/Projects/MyProject"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-zinc-700"
                                required
                            />
                            <Folder className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                        </div>
                        <p className="text-[10px] text-zinc-600 mt-1">
                            Use absolute path. If it doesn't exist, it will be created.
                        </p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                            Git Repository (Optional)
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={repoUrl}
                                onChange={(e) => setRepoUrl(e.target.value)}
                                placeholder="https://github.com/username/repo.git"
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-4 py-2.5 text-zinc-200 focus:outline-none focus:border-blue-500/50 transition-colors placeholder:text-zinc-700"
                            />
                            <GitBranch className="absolute left-3 top-2.5 w-4 h-4 text-zinc-600" />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
                            {error}
                        </div>
                    )}

                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg text-sm font-medium shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Workspace'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WorkspaceModal;
