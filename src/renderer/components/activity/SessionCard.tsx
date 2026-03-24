/**
 * Session Card - AxonClawX style
 * 活动监控中的会话卡片
 */
import React, { useState } from 'react';
import { MessageSquare, Zap, Trash2, RotateCcw, Minimize2 } from 'lucide-react';
import { MiniDonut, MiniGauge } from '@/components/common/MiniChart';

const KIND_COLORS: Record<string, string> = {
  direct: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  group: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  global: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
};

function activeHeatClass(updatedAt: number | undefined): string {
  if (!updatedAt) return 'bg-white/15';
  const age = Date.now() - updatedAt;
  if (age < 300_000) return 'bg-green-400 animate-pulse';
  if (age < 3_600_000) return 'bg-green-400';
  if (age < 86_400_000) return 'bg-amber-400';
  return 'bg-white/15';
}

function formatCost(cost: number | undefined): string | null {
  if (!cost || cost <= 0) return null;
  return cost < 0.01 ? `<$0.01` : `$${cost.toFixed(2)}`;
}

function fmtTok(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export interface SessionCardProps {
  session: Record<string, unknown>;
  sessionUsage?: {
    messageCounts?: { total: number; user: number; assistant: number; toolCalls: number; errors: number };
    toolUsage?: { totalCalls: number; tools?: Array<{ name: string; count: number }> };
    latency?: { avgMs: number; p95Ms: number };
  };
  onChat?: (key: string) => void;
  onCompact?: (key: string) => void;
  onReset?: (key: string) => void;
  onDelete?: (key: string) => void;
  relativeTime: string;
  labels: Record<string, string>;
}

export const SessionCard: React.FC<SessionCardProps> = ({
  session: s,
  sessionUsage,
  onChat,
  onCompact,
  onReset,
  onDelete,
  relativeTime,
  labels: a,
}) => {
  const [metaOpen, setMetaOpen] = useState(false);
  const inp = (s.inputTokens as number) || 0;
  const out = (s.outputTokens as number) || 0;
  const total = inp + out;

  const maxCtx = (s.maxContextTokens as number) || 0;
  const ctxPct = maxCtx > 0 ? Math.min((total / maxCtx) * 100, 100) : 0;

  const displayName =
    ((s.derivedTitle as string) || (s.displayName as string) || (s.label as string) || '').trim();
  const costStr = formatCost(
    (s.responseUsage as { totalCost?: number; cost?: number })?.totalCost ??
      (s.responseUsage as { totalCost?: number; cost?: number })?.cost
  );

  const age = s.updatedAt ? Date.now() - (s.updatedAt as number) : Infinity;
  const isHot = age < 300_000;
  const isWarm = age < 3_600_000;
  const isStreaming = !!(s.activeRun || s.isStreaming);

  const msgCount = (s.messageCount as number) || (s.messages as number) || 0;
  const avgLatency =
    (s.responseUsage as { avgLatency?: number })?.avgLatency ?? (s.avgLatency as number);

  const topBarColor = isStreaming
    ? 'from-indigo-400/50'
    : isHot
      ? 'from-green-400/40'
      : isWarm
        ? 'from-amber-400/30'
        : 'from-white/10';

  return (
    <div
      className={`
        group relative rounded-2xl border cursor-pointer transition-all duration-200 overflow-hidden
        ${
          isStreaming
            ? 'border-indigo-400/40 bg-indigo-500/[0.02] shadow-lg shadow-indigo-500/10 ring-1 ring-indigo-500/15 animate-pulse'
            : isHot
              ? 'border-green-400/30 bg-green-500/[0.02] shadow-md hover:shadow-lg hover:-translate-y-0.5'
              : isWarm
                ? 'border-amber-400/20 bg-amber-500/[0.01] hover:shadow-lg hover:-translate-y-0.5'
                : 'border-white/[0.08] bg-[#1e293b] hover:shadow-lg hover:-translate-y-0.5'
        }
      `}
    >
      <div className={`h-1 w-full bg-gradient-to-r ${topBarColor} to-transparent`} />

      <div className="p-4 pt-3">
        <div className="absolute top-4 end-3 flex items-center gap-1.5">
          {s.abortedLastRun && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              <span className="text-[8px] font-bold text-red-500">{a.aborted || 'ERR'}</span>
            </span>
          )}
          <span
            className={`w-2 h-2 rounded-full ${activeHeatClass(s.updatedAt as number)}`}
            title={relativeTime}
          />
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <span
            className={`text-[9px] px-2 py-0.5 rounded-full font-bold ${
              KIND_COLORS[s.kind as string] || 'bg-white/10 text-white/50'
            }`}
          >
            {a[s.kind as string] || (s.kind as string) || a.unknown || 'unknown'}
          </span>
          <span className="text-[10px] font-mono text-white/40 truncate flex-1">
            {s.key as string}
          </span>
        </div>
        {displayName && (
          <p className="text-[12px] font-semibold text-white/70 truncate mb-2 pe-16">
            {displayName}
          </p>
        )}

        {s.model && (
          <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-medium mb-2.5">
            <Zap className="w-3 h-3 text-amber-500" />
            <span className="truncate max-w-[100px]">{s.model as string}</span>
          </div>
        )}

        <div className="flex items-start gap-3 mb-3">
          <div className="flex flex-col items-center gap-1.5">
            {maxCtx > 0 ? (
              <MiniGauge size={52} percent={ctxPct} strokeWidth={4.5} label={`${ctxPct.toFixed(0)}%`} />
            ) : total > 0 ? (
              <MiniDonut
                size={48}
                slices={[
                  { value: inp, color: '#3b82f6' },
                  { value: out, color: '#f59e0b' },
                ]}
                innerRadius={0.55}
              />
            ) : (
              <div className="w-12 h-12 shrink-0 rounded-full bg-white/5 flex items-center justify-center">
                <span className="text-[10px] text-white/15">—</span>
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 mb-1">
              <span className="text-[18px] font-extrabold tabular-nums text-white/80 leading-none">
                {fmtTok(total)}
              </span>
              <span className="text-[8px] font-bold text-white/25 uppercase">
                {a.tokens || 'TOKENS'}
              </span>
            </div>

            <div className="mb-1.5">
              <div className="h-2.5 rounded-full bg-white/5 overflow-hidden flex">
                {total > 0 && (
                  <>
                    <div
                      className="h-full bg-blue-500/80 rounded-s-full transition-all"
                      style={{ width: `${(inp / total) * 100}%` }}
                    />
                    <div className="h-full bg-amber-500/80 flex-1 rounded-e-full" />
                  </>
                )}
              </div>
              <div className="flex justify-between mt-0.5">
                <span className="text-[8px] text-blue-500 font-bold tabular-nums">
                  ● {a.input || 'In'} {fmtTok(inp)}
                </span>
                <span className="text-[8px] text-amber-500 font-bold tabular-nums">
                  ● {a.output || 'Out'} {fmtTok(out)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[9px]">
              {msgCount > 0 && (
                <span className="flex items-center gap-0.5 text-slate-500 dark:text-white/35">
                  <MessageSquare className="w-3 h-3" />
                  <span className="font-bold tabular-nums">{msgCount}</span>
                </span>
              )}
              {avgLatency && (
                <span className="flex items-center gap-0.5 text-slate-500 dark:text-white/35">
                  <Zap className="w-3 h-3" />
                  <span className="font-bold tabular-nums">
                    {typeof avgLatency === 'number' ? `${(avgLatency / 1000).toFixed(1)}s` : avgLatency}
                  </span>
                </span>
              )}
              {costStr && (
                <span className="flex items-center gap-0.5 text-emerald-500 dark:text-emerald-400 font-bold">
                  {costStr}
                </span>
              )}
            </div>
          </div>
        </div>

        {sessionUsage && (() => {
          const mc = sessionUsage.messageCounts;
          const tu = sessionUsage.toolUsage;
          const lat = sessionUsage.latency;
          const hasMessages = mc && mc.total > 0;
          const hasTools = tu && tu.totalCalls > 0;
          const hasLatency = lat && lat.avgMs > 0;
          if (!hasMessages && !hasTools && !hasLatency) return null;
          const panelBorder =
            hasTools ? 'border-purple-500/25' : hasLatency && lat!.avgMs > 2000 ? 'border-amber-500/25' : hasMessages ? 'border-blue-500/25' : 'border-white/10';
          return (
            <div className={`mb-3 p-2.5 rounded-xl bg-[#1e293b]/80 border ${panelBorder}`}>
              {hasMessages && (
                <div className="mb-2">
                  <div className="flex justify-between mb-1">
                    <span className="text-[8px] font-bold text-white/30 uppercase">
                      {a.messages || 'Messages'}
                    </span>
                    <span className="text-[9px] font-extrabold tabular-nums">{mc!.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden flex">
                    {mc!.total > 0 && (
                      <>
                        <div
                          className="h-full bg-blue-400/80"
                          style={{ width: `${(mc!.user / mc!.total) * 100}%` }}
                        />
                        <div
                          className="h-full bg-emerald-400/80"
                          style={{ width: `${(mc!.assistant / mc!.total) * 100}%` }}
                        />
                      </>
                    )}
                  </div>
                </div>
              )}
              {hasLatency && (
                <div className="text-[7px] text-white/25">
                  {a.latencyStats || 'Latency'}: {(lat!.avgMs / 1000).toFixed(1)}s (p95 {(lat!.p95Ms / 1000).toFixed(1)}s)
                </div>
              )}
            </div>
          );
        })()}

        <div className="flex items-center gap-2 text-[9px] text-white/25 mb-2">
          <span className="flex-1" />
          <span title={s.updatedAt ? new Date(s.updatedAt as number).toLocaleString() : ''}>
            {relativeTime}
          </span>
        </div>

        {s.lastMessagePreview && (
          <p className="text-[9px] text-white/20 line-clamp-2 leading-relaxed mb-2">
            {s.lastMessagePreview as string}
          </p>
        )}

        <div className="absolute bottom-3 end-3 flex items-center gap-1 opacity-0 md:group-hover:opacity-100 transition-opacity">
          {onChat && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChat(s.key as string);
              }}
              className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 transition"
              title={a.openChat || 'Chat'}
            >
              <MessageSquare className="w-3.5 h-3.5" />
            </button>
          )}
          {onCompact && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCompact(s.key as string);
              }}
              className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-amber-500 transition"
              title={a.compact || 'Compact'}
            >
              <Minimize2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onReset && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReset(s.key as string);
              }}
              className="p-1.5 rounded-lg bg-white/5 text-white/40 hover:text-indigo-500 transition"
              title={a.reset || 'Reset'}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(s.key as string);
              }}
              className="p-1.5 rounded-lg bg-red-500/5 text-red-400 hover:text-red-500 transition"
              title={a.delete || 'Delete'}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
