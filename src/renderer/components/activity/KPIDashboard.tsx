/**
 * KPI Dashboard - AxonClawX style
 * 活动监控顶部统计卡片
 */
import React from 'react';
import { MiniDonut, MiniGauge, MiniSparklineValues } from '@/components/common/MiniChart';

const fmtTok = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
};

const MSG_COLORS = {
  user: '#3b82f6',
  assistant: '#10b981',
  tools: '#a855f7',
  errors: '#ef4444',
};
const CHANNEL_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#6366f1'];

/** 根据数据类型返回边框样式 */
function kpiCardBorder(type: 'token' | 'active' | 'activity' | 'messages' | 'channels' | 'cost' | 'models'): string {
  const borders: Record<string, string> = {
    token: 'border-blue-500/25',
    active: 'border-green-500/25',
    activity: 'border-blue-500/25',
    messages: 'border-indigo-500/25',
    channels: 'border-purple-500/25',
    cost: 'border-emerald-500/25',
    models: 'border-purple-500/25',
  };
  return `rounded-2xl p-3 shadow-sm bg-[#1e293b] border-2 ${borders[type] ?? 'border-indigo-500/20'}`;
}

const kpiLabel = 'text-[9px] font-bold text-white/40 uppercase mb-1.5';

export interface KPIDashboardProps {
  stats: {
    totalTok: number;
    totalIn: number;
    totalOut: number;
    active24h: number;
    abortedCount: number;
    avgTok: number;
    channels: number;
  };
  sessions: Record<string, unknown>[];
  labels: Record<string, string>;
  costTrend?: Array<{ date: string; totalCost: number }>;
  usageAggregates?: {
    messages?: { total: number; user: number; assistant: number; toolCalls: number; errors: number };
    tools?: { totalCalls: number; uniqueTools: number; tools?: Array<{ name: string; count: number }> };
    latency?: { count: number; avgMs: number; p95Ms: number; maxMs: number; minMs: number };
  };
}

export const KPIDashboard: React.FC<KPIDashboardProps> = ({
  stats,
  sessions,
  labels: a,
  costTrend,
  usageAggregates: agg,
}) => {
  const channelCounts: Record<string, number> = {};
  sessions.forEach((s) => {
    const ch = (s.lastChannel as string) || (a.unknown || 'unknown');
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });
  const channelEntries = Object.entries(channelCounts);

  const now = Date.now();
  const activityValues = Array.from({ length: 7 }, (_, i) => {
    const dayStart = now - (6 - i) * 86_400_000;
    const dayEnd = dayStart + 86_400_000;
    return sessions.filter(
      (s) => (s.updatedAt as number) >= dayStart && (s.updatedAt as number) < dayEnd
    ).length;
  });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-4">
      {/* Token Distribution */}
      <div className={kpiCardBorder('token')}>
        <div className={kpiLabel}>{a.totalTokens || 'Tokens'}</div>
        <div className="flex items-center gap-2">
          <MiniDonut
            size={44}
            slices={[
              { value: stats.totalIn, color: '#3b82f6' },
              { value: stats.totalOut, color: '#f59e0b' },
            ]}
            innerRadius={0.5}
          />
          <div>
            <div className="text-base font-extrabold text-white/90 tabular-nums leading-none">
              {fmtTok(stats.totalTok)}
            </div>
            <div className="text-[8px] text-white/35">
              <span className="text-blue-500">●</span> {a.input || 'In'}{' '}
              <span className="text-amber-500">●</span> {a.output || 'Out'}
            </div>
          </div>
        </div>
      </div>

      {/* 24h Active */}
      <div className={kpiCardBorder('active')}>
        <div className={kpiLabel}>{a.active24h || '24h Active'}</div>
        <div className="flex items-center gap-2">
          <span className="relative flex h-3 w-3">
            {stats.active24h > 0 && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                stats.active24h > 0 ? 'bg-green-500' : 'bg-white/20'
              }`}
            />
          </span>
          <span className="text-base font-extrabold text-white/90 tabular-nums">
            {stats.active24h}
          </span>
        </div>
      </div>

      {/* Activity Sparkline */}
      <div className={kpiCardBorder('activity')}>
        <div className={kpiLabel}>{a.activity7d || '7d Activity'}</div>
        <MiniSparklineValues values={activityValues} height={32} color="#3b82f6" />
      </div>

      {/* Messages Breakdown */}
      {agg?.messages && agg.messages.total > 0 && (
        <div className={kpiCardBorder('messages')}>
          <div className={kpiLabel}>{a.messages || 'Messages'}</div>
          <div className="flex items-center gap-2">
            <MiniDonut
              size={44}
              slices={[
                { value: agg.messages.user, color: MSG_COLORS.user },
                { value: agg.messages.assistant, color: MSG_COLORS.assistant },
                { value: agg.messages.toolCalls, color: MSG_COLORS.tools },
                { value: agg.messages.errors, color: MSG_COLORS.errors },
              ].filter((s) => s.value > 0)}
              innerRadius={0.55}
            />
            <div>
              <div className="text-base font-extrabold text-white/90 tabular-nums leading-none">
                {agg.messages.total}
              </div>
              <div className="flex flex-wrap gap-x-1.5 text-[7px] mt-0.5">
                <span className="text-blue-500">● {a.userMsg || 'User'} {agg.messages.user}</span>
                <span className="text-emerald-500">● {a.assistantMsg || 'Asst'} {agg.messages.assistant}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Channel Distribution */}
      {channelEntries.length > 1 && (
        <div className={kpiCardBorder('channels')}>
          <div className={kpiLabel}>{a.channels || 'Channels'}</div>
          <div className="flex items-center gap-2">
            <MiniDonut
              size={40}
              slices={channelEntries.map(([, v], i) => ({
                value: v,
                color: CHANNEL_COLORS[i % CHANNEL_COLORS.length],
              }))}
              innerRadius={0.5}
            />
            <div className="text-[8px] text-white/25 leading-tight">
              {channelEntries.slice(0, 3).map(([name, count]) => (
                <div key={name}>
                  {name}: {count}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cost Trend */}
      {costTrend && costTrend.length > 0 && costTrend.some((d) => d.totalCost > 0) && (
        <div className={kpiCardBorder('cost')}>
          <div className={kpiLabel}>{a.costTrend || 'Cost 7d'}</div>
          <MiniSparklineValues values={costTrend.map((d) => d.totalCost)} height={32} color="#10b981" />
          <div className="text-[8px] text-emerald-500 font-bold tabular-nums mt-0.5">
            ${costTrend.reduce((sum, d) => sum + d.totalCost, 0).toFixed(2)}
          </div>
        </div>
      )}

      {/* Model Distribution */}
      {(() => {
        const modelCounts: Record<string, number> = {};
        sessions.forEach((s) => {
          if (s.model) modelCounts[s.model as string] = (modelCounts[s.model as string] || 0) + 1;
        });
        const modelEntries = Object.entries(modelCounts)
          .sort((a2, b2) => b2[1] - a2[1])
          .slice(0, 4);
        const maxCount = modelEntries[0]?.[1] || 1;
        if (modelEntries.length === 0) return null;
        return (
          <div className={kpiCardBorder('models')}>
            <div className={kpiLabel}>{a.modelDist || 'Models'}</div>
            <div className="space-y-1">
              {modelEntries.map(([name, count]) => (
                <div key={name} className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500/80 to-purple-400/60 transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                  <span
                    className="text-[7px] text-white/25 font-mono truncate max-w-[60px]"
                    title={name}
                  >
                    {name.split('/').pop()}
                  </span>
                  <span className="text-[7px] text-white/35 font-bold tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Aborted */}
      {stats.abortedCount > 0 && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/20 p-3 shadow-sm">
          <div className="text-[9px] font-bold text-red-400 uppercase mb-1">
            {a.aborted || 'Aborted'}
          </div>
          <div className="text-base font-extrabold text-red-500 tabular-nums">
            {stats.abortedCount}
          </div>
        </div>
      )}
    </div>
  );
};
