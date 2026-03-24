/**
 * AxonClaw - 调试面板
 * 复刻自 AxonClawX DebugPanel.tsx
 */

import React from 'react';
import {
  RefreshCw,
  Send,
  Code,
  Megaphone,
  Copy,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const RPC_PRESETS = [
  'system-presence', 'sessions.list', 'sessions.preview', 'config.get',
  'config.channels', 'health', 'status', 'channels.status',
];

export interface DebugPanelProps {
  gw: Record<string, any>;
  rpcMethod: string;
  setRpcMethod: (v: string) => void;
  rpcParams: string;
  setRpcParams: (v: string) => void;
  rpcResult: string | null;
  rpcError: string | null;
  rpcLoading: boolean;
  rpcHistory: string[];
  handleRpcCall: () => void;
  sysEventText: string;
  setSysEventText: (v: string) => void;
  sysEventSending: boolean;
  sysEventResult: { ok: boolean; text: string } | null;
  handleSendSystemEvent: () => void;
  debugStatus: any;
  debugHealth: any;
  debugLoading: boolean;
  fetchDebugData: () => void;
}

export const DebugPanel: React.FC<DebugPanelProps> = ({
  gw,
  rpcMethod,
  setRpcMethod,
  rpcParams,
  setRpcParams,
  rpcResult,
  rpcError,
  rpcLoading,
  rpcHistory,
  handleRpcCall,
  sysEventText,
  setSysEventText,
  sysEventSending,
  sysEventResult,
  handleSendSystemEvent,
  debugStatus,
  debugHealth,
  debugLoading,
  fetchDebugData,
}) => {
  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar space-y-4">
      {/* System Event */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
          <Megaphone className="w-4 h-4 text-indigo-400" />
          <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wider">{gw.systemEvent}</h3>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-[10px] text-white/30">{gw.systemEventDesc}</p>
          <div className="flex gap-2">
            <input
              value={sysEventText}
              onChange={(e) => setSysEventText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSendSystemEvent(); }}
              placeholder={gw.systemEventPlaceholder}
              className="flex-1 h-8 px-3 bg-white/5 border border-white/5 rounded-lg text-[11px] text-white/80 placeholder:text-white/20 focus:ring-1 focus:ring-primary/50 outline-none"
            />
            <Button
              onClick={handleSendSystemEvent}
              disabled={sysEventSending || !sysEventText.trim()}
              className="h-8"
            >
              {sysEventSending ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              {sysEventSending ? '...' : gw.systemEventSend}
            </Button>
          </div>
          {sysEventResult && (
            <div className={cn(
              'px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5',
              sysEventResult.ok ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            )}>
              {sysEventResult.ok ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {sysEventResult.text}
            </div>
          )}
        </div>
      </div>

      {/* Manual RPC */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-2">
          <Code className="w-4 h-4 text-primary" />
          <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wider">{gw.rpc}</h3>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1 block">
              {gw.rpcMethod}
            </label>
            <div className="flex gap-2">
              <input
                value={rpcMethod}
                onChange={(e) => setRpcMethod(e.target.value)}
                placeholder="system-presence"
                className="flex-1 h-8 px-3 bg-white/5 border border-white/5 rounded-lg text-[11px] font-mono text-white/80 placeholder:text-white/20 focus:ring-1 focus:ring-primary/50 outline-none"
                onKeyDown={(e) => e.key === 'Enter' && handleRpcCall()}
              />
              <select
                value=""
                onChange={(e) => { if (e.target.value) setRpcMethod(e.target.value); }}
                className="h-8 px-2 bg-white/5 border border-white/5 rounded-lg text-[10px] text-white/50"
              >
                <option value="">{gw.rpcPresets || 'Presets ▾'}</option>
                {RPC_PRESETS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {rpcHistory.length > 0 && (
                  <option disabled>── {gw.rpcRecent || 'Recent'} ──</option>
                )}
                {rpcHistory.filter((h) => !RPC_PRESETS.includes(h)).map((m) => (
                  <option key={m} value={m}>↩ {m}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1 block">
              {gw.rpcParams}
            </label>
            <textarea
              value={rpcParams}
              onChange={(e) => setRpcParams(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 bg-white/5 border border-white/5 rounded-lg text-[11px] font-mono text-white/80 placeholder:text-white/20 focus:ring-1 focus:ring-primary/50 outline-none resize-none"
            />
          </div>
          <Button onClick={handleRpcCall} disabled={rpcLoading || !rpcMethod.trim()}>
            {rpcLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : null}
            {gw.rpcCall}
          </Button>
          {rpcError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-[10px] font-bold text-red-400 mb-1">{gw.rpcError}</p>
              <pre className="text-[10px] text-red-300/80 font-mono whitespace-pre-wrap break-all">{rpcError}</pre>
            </div>
          )}
          {rpcResult && (
            <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
              <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1">{gw.rpcResult}</p>
              <pre className="text-[10px] text-emerald-400/80 font-mono whitespace-pre-wrap break-all max-h-[300px] overflow-y-auto custom-scrollbar">
                {rpcResult}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Snapshots */}
      <div className="rounded-xl border border-white/5 bg-white/[0.02] overflow-hidden">
        <div className="px-4 py-2.5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Copy className="w-4 h-4 text-amber-400" />
            <h3 className="text-[11px] font-bold text-white/80 uppercase tracking-wider">{gw.snapshots}</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchDebugData}
            disabled={debugLoading}
            className="text-white/30 hover:text-white"
          >
            {debugLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </Button>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1.5">{gw.status}</p>
            <pre className="text-[10px] text-white/50 font-mono whitespace-pre-wrap break-all bg-white/[0.02] rounded-lg p-3 max-h-[200px] overflow-y-auto custom-scrollbar border border-white/5">
              {debugStatus ? JSON.stringify(debugStatus, null, 2) : '{}'}
            </pre>
          </div>
          <div>
            <p className="text-[11px] font-bold text-white/30 uppercase tracking-wider mb-1.5">{gw.gwHealth}</p>
            <pre className="text-[10px] text-white/50 font-mono whitespace-pre-wrap break-all bg-white/[0.02] rounded-lg p-3 max-h-[200px] overflow-y-auto custom-scrollbar border border-white/5">
              {debugHealth ? JSON.stringify(debugHealth, null, 2) : '{}'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;
