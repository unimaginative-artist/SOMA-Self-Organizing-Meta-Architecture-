
import React, { useState } from 'react';
import { ProjectState, WorkspaceTab, FleetRole } from '../types';
import {
  Layers, ChevronDown, Activity, MessageSquare,
  Terminal as TerminalIcon, BookOpen, Lock, Cpu, Eye, Archive, Crown, Clock,
  ChevronLeft, ChevronRight, Download, Zap, RefreshCw, Plus, Files, PenTool, Clipboard
} from 'lucide-react';

interface Props {
  state: ProjectState;
  onTabChange: (tab: WorkspaceTab) => void;
  onServiceAction?: (id: string, action: 'start' | 'stop') => void;
  onDownloadZip?: () => void;
  workspaces?: { id: string; name: string; path: string }[];
  onSwitchWorkspace?: (id: string) => void;
  onAddWorkspace?: () => void;
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<Props> = ({ state, onTabChange, onServiceAction, onDownloadZip, workspaces = [], onSwitchWorkspace, onAddWorkspace, isCollapsed, onToggle }) => {
  return (
    <aside className="h-full flex flex-col transition-all duration-300 ease-in-out relative group/sidebar">
      <div className={`p-3 border-b border-zinc-900 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed && <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-2">Studio</span>}
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-zinc-900 text-zinc-500 hover:text-white transition-colors"
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-4 space-y-6 custom-scrollbar">
        {/* Core Modules */}
        <div>
          {!isCollapsed && (
            <div className="flex items-center justify-between px-3 mb-2 text-[10px] font-bold text-zinc-600 uppercase tracking-widest animate-in fade-in">
              <span>Navigation</span>
            </div>
          )}
          <ul className="space-y-1">
            <SidebarItem isCollapsed={isCollapsed} icon={<MessageSquare className="w-4 h-4" />} label="Chat" active={state.currentPlane === 'code'} onClick={() => onTabChange('code' as WorkspaceTab)} />
            <SidebarItem isCollapsed={isCollapsed} icon={<Clipboard className="w-4 h-4" />} label="Planner" active={state.currentPlane === 'planning'} onClick={() => onTabChange('planning' as WorkspaceTab)} />
            <SidebarItem isCollapsed={isCollapsed} icon={<PenTool className="w-4 h-4" />} label="Editor" active={state.currentPlane === 'editor'} onClick={() => onTabChange('editor' as WorkspaceTab)} />
            <SidebarItem isCollapsed={isCollapsed} icon={<Files className="w-4 h-4" />} label="Explorer" active={state.activeTab === 'files'} onClick={() => onTabChange('files')} />
          </ul>
        </div>
      </nav>

      <div className={`p-4 mt-auto border-t border-zinc-900/50 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} text-[9px] font-bold text-zinc-700 uppercase tracking-widest overflow-hidden shrink-0`}>
        {!isCollapsed && <span className="animate-in fade-in whitespace-nowrap">SOMA Online</span>}
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)] shrink-0" />
      </div>
    </aside>
  );
};

const SidebarItem = ({ icon, label, active = false, onClick, isCollapsed }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void, isCollapsed: boolean }) => (
  <li>
    <button
      onClick={onClick}
      className={`w-full flex items-center \${isCollapsed ? 'justify-center px-0' : 'px-3 space-x-3'} py-2 rounded-lg transition-all text-xs font-medium relative group \${active ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent'}`}
      title={isCollapsed ? label : undefined}
    >
      <span className={`transition-transform duration-300 shrink-0 \${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</span>
      {!isCollapsed && <span className="truncate animate-in fade-in whitespace-nowrap font-bold tracking-tight">{label}</span>}
      {isCollapsed && active && <div className="absolute left-0 w-1 h-4 bg-blue-500 rounded-r-full" />}
    </button>
  </li>
);

export default Sidebar;
