import React, { useState, useEffect, useRef } from 'react';
import {
  Activity, Zap, Brain, MessageSquare, Clock, CheckCircle,
  AlertCircle, ArrowRight, Cpu, Network, Eye, Filter
} from 'lucide-react';

interface ArbiterEvent {
  id: string;
  timestamp: number;
  type: 'message' | 'request' | 'response' | 'error' | 'reasoning';
  from: string;
  to?: string;
  action: string;
  payload?: any;
  duration?: number;
  status?: 'pending' | 'success' | 'error';
}

interface ArbiterActivityFeedProps {
  events: ArbiterEvent[];
  onEventClick?: (event: ArbiterEvent) => void;
  maxEvents?: number;
  autoScroll?: boolean;
}

const ArbiterActivityFeed: React.FC<ArbiterActivityFeedProps> = ({
  events = [],
  onEventClick,
  maxEvents = 50,
  autoScroll = true
}) => {
  const [filter, setFilter] = useState<'all' | 'messages' | 'reasoning' | 'errors'>('all');
  const [selectedArbiter, setSelectedArbiter] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  // Get unique arbiters
  const arbiters = Array.from(new Set(events.flatMap(e => [e.from, e.to].filter(Boolean))));

  // Filter events
  const filteredEvents = events
    .filter(event => {
      if (filter === 'messages' && event.type !== 'message' && event.type !== 'request' && event.type !== 'response') {
        return false;
      }
      if (filter === 'reasoning' && event.type !== 'reasoning') {
        return false;
      }
      if (filter === 'errors' && event.type !== 'error') {
        return false;
      }
      if (selectedArbiter && event.from !== selectedArbiter && event.to !== selectedArbiter) {
        return false;
      }
      return true;
    })
    .slice(-maxEvents);

  const getEventIcon = (event: ArbiterEvent) => {
    switch (event.type) {
      case 'message':
      case 'request':
      case 'response':
        return MessageSquare;
      case 'reasoning':
        return Brain;
      case 'error':
        return AlertCircle;
      default:
        return Activity;
    }
  };

  const getEventColor = (event: ArbiterEvent) => {
    if (event.status === 'error' || event.type === 'error') {
      return {
        border: 'border-red-500/30',
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        icon: 'text-red-500'
      };
    }
    if (event.type === 'reasoning') {
      return {
        border: 'border-purple-500/30',
        bg: 'bg-purple-500/10',
        text: 'text-purple-400',
        icon: 'text-purple-500'
      };
    }
    if (event.status === 'success') {
      return {
        border: 'border-emerald-500/30',
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-400',
        icon: 'text-emerald-500'
      };
    }
    return {
      border: 'border-blue-500/30',
      bg: 'bg-blue-500/10',
      text: 'text-blue-400',
      icon: 'text-blue-500'
    };
  };

  const getArbiterColor = (arbiter: string) => {
    const hash = arbiter.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'text-blue-400',
      'text-emerald-400',
      'text-purple-400',
      'text-yellow-400',
      'text-pink-400',
      'text-cyan-400',
      'text-orange-400'
    ];
    return colors[hash % colors.length];
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '';
    if (duration < 1000) return `${duration}ms`;
    return `${(duration / 1000).toFixed(2)}s`;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800/50 bg-zinc-900/30 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Network className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-bold text-zinc-100">Arbiter Activity</h3>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Activity className="w-3 h-3 animate-pulse text-emerald-400" />
            <span>{filteredEvents.length} events</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-3 h-3 text-zinc-600" />
          {['all', 'messages', 'reasoning', 'errors'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider transition-all ${
                filter === f
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Arbiter Filter */}
        {arbiters.length > 0 && (
          <div className="mt-2 flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1">
            <button
              onClick={() => setSelectedArbiter(null)}
              className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-all ${
                !selectedArbiter
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
              }`}
            >
              All Arbiters
            </button>
            {arbiters.slice(0, 10).map((arbiter) => (
              <button
                key={arbiter}
                onClick={() => setSelectedArbiter(arbiter === selectedArbiter ? null : arbiter)}
                className={`px-2 py-1 rounded text-[10px] font-mono whitespace-nowrap transition-all ${
                  selectedArbiter === arbiter
                    ? 'bg-zinc-700 text-zinc-100'
                    : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50'
                }`}
              >
                {arbiter}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Event Feed */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
        {filteredEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Eye className="w-12 h-12 text-zinc-800 mb-4" />
            <p className="text-sm text-zinc-500">No arbiter activity</p>
            <p className="text-xs text-zinc-600 mt-1">Waiting for events...</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const Icon = getEventIcon(event);
            const colors = getEventColor(event);

            return (
              <div
                key={event.id}
                onClick={() => onEventClick?.(event)}
                className={`p-3 rounded-lg border ${colors.border} ${colors.bg} hover:bg-opacity-20 transition-all cursor-pointer group`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Icon className={`w-4 h-4 ${colors.icon} shrink-0`} />
                    
                    {/* From → To */}
                    <div className="flex items-center gap-2 text-xs font-mono overflow-hidden">
                      <span className={`truncate ${getArbiterColor(event.from)}`}>
                        {event.from}
                      </span>
                      {event.to && (
                        <>
                          <ArrowRight className="w-3 h-3 text-zinc-600 shrink-0" />
                          <span className={`truncate ${getArbiterColor(event.to)}`}>
                            {event.to}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="flex items-center gap-2 text-[9px] text-zinc-600 font-mono shrink-0 ml-2">
                    <Clock className="w-3 h-3" />
                    {formatTimestamp(event.timestamp)}
                  </div>
                </div>

                {/* Action */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs ${colors.text} font-medium`}>
                    {event.action}
                  </span>
                  
                  {/* Duration & Status */}
                  <div className="flex items-center gap-2">
                    {event.duration && (
                      <span className="text-[9px] text-zinc-600 font-mono">
                        {formatDuration(event.duration)}
                      </span>
                    )}
                    {event.status === 'success' && (
                      <CheckCircle className="w-3 h-3 text-emerald-500" />
                    )}
                    {event.status === 'error' && (
                      <AlertCircle className="w-3 h-3 text-red-500" />
                    )}
                  </div>
                </div>

                {/* Payload Preview (collapsed by default, expandable) */}
                {event.payload && (
                  <div className="mt-2 pt-2 border-t border-zinc-800/50">
                    <pre className="text-[10px] text-zinc-600 font-mono overflow-hidden text-ellipsis whitespace-nowrap">
                      {typeof event.payload === 'string' 
                        ? event.payload 
                        : JSON.stringify(event.payload).slice(0, 100)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer Stats */}
      <div className="px-4 py-2 border-t border-zinc-800/50 bg-zinc-900/30 flex items-center justify-between text-[10px] text-zinc-600">
        <span>{arbiters.length} active arbiters</span>
        <span className="flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Real-time monitoring
        </span>
      </div>
    </div>
  );
};

export default ArbiterActivityFeed;
