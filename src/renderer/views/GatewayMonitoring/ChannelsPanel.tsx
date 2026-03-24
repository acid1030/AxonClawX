/**
 * AxonClaw - 通道面板
 * 复刻自 AxonClawX ChannelsPanel.tsx
 */

import React from 'react';
import {
  RefreshCw,
  Wifi,
  WifiOff,
  AlertTriangle,
  LogOut,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChannelsPanelProps {
  gw: Record<string, any>;
  channelsList: any[];
  channelsLoading: boolean;
  channelLogoutLoading: string | null;
  fetchChannels: (force?: boolean) => void;
  handleChannelLogout: (channel: string) => void;
}

function fmtAgo(ts: number | null | undefined, gw: Record<string, any>): string | null {
  if (!ts) return null;
  const sec = Math.floor((Date.now() - ts) / 1000);
  if (sec < 60) return `${sec}${gw.unitSec || 's'}`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}${gw.unitMin || 'm'}`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}${gw.unitHr || 'h'}`;
  return `${Math.floor(hr / 24)}${gw.unitDay || 'd'}`;
}

export const ChannelsPanel: React.FC<ChannelsPanelProps> = ({
  gw,
  channelsList,
  channelsLoading,
  channelLogoutLoading,
  fetchChannels,
  handleChannelLogout,
}) => {
  const now = Date.now();
  const stuckCount = channelsList.filter((c: any) => {
    const busy = c.busy === true || (typeof c.activeRuns === 'number' && c.activeRuns > 0);
    const lra = typeof c.lastRunActivityAt === 'number' ? c.lastRunActivityAt : null;
    return busy && lra != null && (now - lra) > 25 * 60_000;
  }).length;
  const disconnectedCount = channelsList.filter((c: any) =>
    c.enabled !== false && (c.lastError || c.connected === false) && c.running !== true
  ).length;

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-5 custom-scrollbar">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[12px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-2">
          <Wifi className="w-4 h-4 text-primary" />
          {gw.channels || 'Channels'}
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => fetchChannels(true)}
          disabled={channelsLoading}
          className="text-white/60"
        >
          {channelsLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          {gw.refresh}
        </Button>
      </div>

      {channelsLoading && channelsList.length === 0 ? (
        <div className="flex items-center justify-center py-10 text-white/30 text-[11px]">
          <RefreshCw className="w-4 h-4 animate-spin mr-2" />
          {gw.loading}
        </div>
      ) : channelsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/20">
          <WifiOff className="w-9 h-9 mb-3" />
          <p className="text-[12px]">{gw.noChannels || 'No channels configured'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {(stuckCount > 0 || disconnectedCount > 0) && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3 flex items-center gap-3 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <div className="text-[11px] text-red-300/80 space-x-3">
                {stuckCount > 0 && <span className="font-bold">{stuckCount} {gw.chStuckCount || 'channel(s) stuck'}</span>}
                {disconnectedCount > 0 && <span className="font-bold">{disconnectedCount} {gw.chDisconnectedCount || 'channel(s) disconnected'}</span>}
              </div>
            </div>
          )}

          {channelsList.map((ch: any) => {
            const name = ch.name || ch.channel || ch.id || 'unknown';
            const rawStatus = String(ch.status || ch.state || '').toLowerCase();
            const isConnected = ch.connected === true || rawStatus === 'connected' || rawStatus === 'open' || (ch.running === true && ch.connected !== false);
            const isDisconnected = ch.lastError || rawStatus === 'disconnected' || rawStatus === 'closed' || rawStatus === 'error' || rawStatus === 'failed';
            const isIdle = (!isConnected && !isDisconnected && ch.running === true) || rawStatus === 'idle' || rawStatus === 'waiting';
            const isDisabled = ch.enabled === false || rawStatus === 'disabled' || rawStatus === 'off';
            const isBusy = ch.busy === true || (typeof ch.activeRuns === 'number' && ch.activeRuns > 0);
            const STUCK_THRESHOLD_MS = 25 * 60_000;
            const lastRunAt = typeof ch.lastRunActivityAt === 'number' ? ch.lastRunActivityAt : null;
            const isStuck = isBusy && lastRunAt != null && (Date.now() - lastRunAt) > STUCK_THRESHOLD_MS;

            const statusColor = isStuck ? 'bg-red-500' : isConnected ? 'bg-emerald-500' : isDisconnected ? 'bg-red-500' : isIdle ? 'bg-amber-500' : isDisabled ? 'bg-white/20' : 'bg-white/15';
            const statusText = isConnected ? (gw.channelConnected || 'Connected')
              : isDisconnected ? (gw.channelDisconnected || 'Disconnected')
              : isIdle ? (gw.channelIdle || 'Idle')
              : isDisabled ? (gw.channelDisabled || 'Disabled')
              : (gw.channelUnknown || 'Unknown');
            const statusTextColor = isConnected ? 'text-emerald-400' : isDisconnected ? 'text-red-400' : isIdle ? 'text-amber-400' : 'text-white/30';

            const lastEvent = ch.lastEventAt || ch.lastEvent || ch.last_event || ch.lastActivity || ch.last_activity;
            const lastEventStr = lastEvent ? new Date(lastEvent).toLocaleString() : null;
            const lastInAgo = fmtAgo(ch.lastInboundAt, gw);
            const lastOutAgo = fmtAgo(ch.lastOutboundAt, gw);

            return (
              <div
                key={`${ch.channel || name}-${ch.accountId || ''}`}
                className="rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className={cn('w-3 h-3 rounded-full shadow-lg', statusColor)} />
                    {isConnected && <div className={cn('absolute inset-0 w-3 h-3 rounded-full animate-ping opacity-40', statusColor)} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[13px] font-bold text-white/80 truncate">{name}</span>
                      {ch.accountId && ch.accountId !== 'default' && (
                        <span className="text-[9px] font-mono text-white/25 bg-white/5 px-1.5 py-0.5 rounded">{ch.accountId}</span>
                      )}
                      <span className={cn('text-[10px] font-bold uppercase', statusTextColor)}>{statusText}</span>
                      {isBusy && (
                        <span className="text-[9px] font-bold uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <Clock className="w-2.5 h-2.5" />
                          {gw.chBusy || 'Busy'}{typeof ch.activeRuns === 'number' ? ` (${ch.activeRuns})` : ''}
                        </span>
                      )}
                      {isStuck && (
                        <span className="text-[9px] font-bold uppercase text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5 animate-pulse">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          {gw.chStuck || 'Stuck'}
                        </span>
                      )}
                      {ch.restartPending && (
                        <span className="text-[9px] font-bold uppercase text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                          <RotateCcw className="w-2.5 h-2.5" />
                          {gw.chRestarting || 'Restarting'}
                        </span>
                      )}
                    </div>
                    {lastEventStr && (
                      <p className="text-[10px] text-white/30 mt-0.5">
                        {gw.channelLastEvent || 'Last Activity'}: {lastEventStr}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleChannelLogout(ch.channel || name)}
                      disabled={channelLogoutLoading === (ch.channel || name) || isDisabled}
                      className="bg-red-500/10 text-red-400 hover:bg-red-500/20"
                    >
                      {channelLogoutLoading === (ch.channel || name) ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <LogOut className="w-3 h-3" />
                      )}
                      {gw.channelLogout || 'Logout'}
                    </Button>
                  </div>
                </div>

                {(ch.reconnectAttempts > 0 || lastInAgo || lastOutAgo || ch.lastError) && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-white/30 pl-7">
                    {typeof ch.reconnectAttempts === 'number' && ch.reconnectAttempts > 0 && (
                      <span className="flex items-center gap-1">
                        <RotateCcw className="w-3 h-3 text-orange-400" />
                        {gw.chReconnects || 'Reconnects'}: <span className="text-orange-400 font-bold">{ch.reconnectAttempts}</span>
                      </span>
                    )}
                    {lastInAgo && (
                      <span className="flex items-center gap-1">
                        <ArrowDownLeft className="w-3 h-3" />
                        {gw.chLastIn || 'In'}: {lastInAgo}
                      </span>
                    )}
                    {lastOutAgo && (
                      <span className="flex items-center gap-1">
                        <ArrowUpRight className="w-3 h-3" />
                        {gw.chLastOut || 'Out'}: {lastOutAgo}
                      </span>
                    )}
                  </div>
                )}

                {ch.lastError && (
                  <div className="mt-1.5 pl-7">
                    <p className="text-[10px] font-mono text-red-400/70 bg-red-500/5 border border-red-500/10 rounded px-2 py-1 break-all line-clamp-2">
                      {ch.lastError}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ChannelsPanel;
