/**
 * AxonClaw - 用量统计
 * AxonClawX 风格完整复刻：Token/费用/消息数/延迟、缓存命中率、预算、Tab 导航
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Settings,
  Hexagon,
  Wallet,
  MessageSquare,
  Gauge,
  BarChart2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hostApiFetch } from '@/lib/host-api';
import { useGatewayStore } from '@/stores/gateway';
import { invokeIpc } from '@/lib/api-client';
import { UsageBarChart } from '@/components/usage';
import { FeedbackState } from '@/components/common/FeedbackState';
import { MiniSparkline } from '@/components/common/MiniSparkline';
import {
  filterUsageHistoryByWindow,
  groupUsageHistory,
  type UsageGroupBy,
  type UsageHistoryEntry,
  type UsageWindow,
} from '@/pages/Models/usage-history';
import { cn } from '@/lib/utils';

interface UsageCost {
  totalCost?: number;
  todayCost?: number;
  inputTokens?: number;
  outputTokens?: number;
  trend?: Array<{ date: string; cost: number; tokens?: number }>;
}

type UsageDateRange = 'today' | '7d' | '30d' | 'custom';
type UsageTab = 'overview' | 'by-model' | 'by-session' | 'timeseries' | 'logs';

const USAGE_FETCH_MAX_ATTEMPTS = 6;
const USAGE_FETCH_RETRY_DELAY_MS = 1500;
const USAGE_PAGE_SIZE = 5;

function formatTokenCount(value: number): string {
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return Intl.NumberFormat().format(value);
}

function formatUsageTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

const UsageView: React.FC = () => {
  const { t } = useTranslation();
  const initGateway = useGatewayStore((s) => s.init);
  const setStatus = useGatewayStore((s) => s.setStatus);
  const gatewayStatus = useGatewayStore((s) => s.status);

  const [connectionVerified, setConnectionVerified] = useState<boolean | null>(null);
  const isOnline = connectionVerified === true || (connectionVerified === null && gatewayStatus.state === 'running');

  const [usageCost, setUsageCost] = useState<UsageCost | null>(null);
  const [usageHistory, setUsageHistory] = useState<UsageHistoryEntry[]>([]);
  const [costLoading, setCostLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [usageGroupBy, setUsageGroupBy] = useState<UsageGroupBy>('model');
  const [usageWindow, setUsageWindow] = useState<UsageWindow>('7d');
  const [usagePage, setUsagePage] = useState(1);
  const [dateRange, setDateRange] = useState<UsageDateRange>('7d');
  const [activeTab, setActiveTab] = useState<UsageTab>('overview');
  const [trendGranularity, setTrendGranularity] = useState<'day' | 'week' | 'month'>('day');
  const historyFetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const historyFetchGenRef = useRef(0);

  const checkConnection = useCallback(async () => {
    try {
      await initGateway();
      const r = await invokeIpc<{ success: boolean; port?: number }>('gateway:checkConnection');
      setConnectionVerified(r?.success ?? false);
      if (r?.success && r?.port) setStatus({ state: 'running', port: r.port });
      return r?.success ?? false;
    } catch {
      setConnectionVerified(false);
      return false;
    }
  }, [initGateway, setStatus]);

  useEffect(() => {
    void checkConnection();
    const t = setInterval(() => void checkConnection(), 15000);
    return () => clearInterval(t);
  }, [checkConnection]);

  const fetchCost = useCallback(async () => {
    if (!isOnline) return;
    setCostLoading(true);
    try {
      const days = dateRange === 'today' ? 1 : dateRange === '7d' ? 7 : 30;
      const data = await hostApiFetch<UsageCost>(`/api/usage-cost?days=${days}`).catch(() => null);
      setUsageCost(data);
    } catch {
      setUsageCost(null);
    } finally {
      setCostLoading(false);
    }
  }, [isOnline, dateRange]);

  const fetchHistory = useCallback(async () => {
    if (!isOnline) return;
    setHistoryLoading(true);
    const gen = historyFetchGenRef.current + 1;
    historyFetchGenRef.current = gen;

    const fetchWithRetry = async (attempt: number) => {
      try {
        const entries = await hostApiFetch<UsageHistoryEntry[]>('/api/usage/recent-token-history');
        if (historyFetchGenRef.current !== gen) return;
        setUsageHistory(Array.isArray(entries) ? entries : []);
        if (
          (!Array.isArray(entries) || entries.length === 0) &&
          attempt < USAGE_FETCH_MAX_ATTEMPTS
        ) {
          historyFetchTimerRef.current = setTimeout(
            () => void fetchWithRetry(attempt + 1),
            USAGE_FETCH_RETRY_DELAY_MS
          );
        }
      } catch {
        if (historyFetchGenRef.current !== gen) return;
        setUsageHistory([]);
        if (attempt < USAGE_FETCH_MAX_ATTEMPTS) {
          historyFetchTimerRef.current = setTimeout(
            () => void fetchWithRetry(attempt + 1),
            USAGE_FETCH_RETRY_DELAY_MS
          );
        }
      } finally {
        if (historyFetchGenRef.current === gen) setHistoryLoading(false);
      }
    };
    void fetchWithRetry(0);
  }, [isOnline]);

  useEffect(() => {
    void fetchCost();
  }, [fetchCost]);

  useEffect(() => {
    if (historyFetchTimerRef.current) clearTimeout(historyFetchTimerRef.current);
    void fetchHistory();
    return () => {
      if (historyFetchTimerRef.current) clearTimeout(historyFetchTimerRef.current);
    };
  }, [fetchHistory]);

  const totalCost = usageCost?.totalCost ?? 0;
  const todayCost = usageCost?.todayCost ?? 0;
  const inputTokens = usageCost?.inputTokens ?? 0;
  const outputTokens = usageCost?.outputTokens ?? 0;
  const totalTokens = inputTokens + outputTokens;
  const msgCount = usageHistory.length;
  const cacheReadTotal = usageHistory.reduce((s, e) => s + (e.cacheReadTokens || 0), 0);
  const cacheHitRate = totalTokens + cacheReadTotal > 0 ? (cacheReadTotal / (totalTokens + cacheReadTotal)) * 100 : 0;
  const uniqueSessions = new Set(usageHistory.map((e) => e.sessionId)).size;
  const trendData = usageCost?.trend ?? [];
  const tokenTrendData = trendData.map((t) => t.tokens ?? 0);
  const costTrendData = trendData.map((t) => t.cost ?? 0);

  const filteredHistory = filterUsageHistoryByWindow(usageHistory, usageWindow);
  const modelGroups = groupUsageHistory(filteredHistory, 'model');
  const sessionGroups = groupUsageHistory(filteredHistory, 'session');
  const dayGroups = groupUsageHistory(filteredHistory, 'day');
  const usageGroups = activeTab === 'by-model' ? modelGroups : activeTab === 'by-session' ? sessionGroups : groupUsageHistory(filteredHistory, usageGroupBy);
  const totalPages = Math.max(1, Math.ceil(filteredHistory.length / USAGE_PAGE_SIZE));
  const safePage = Math.min(usagePage, totalPages);
  const pagedHistory = filteredHistory.slice(
    (safePage - 1) * USAGE_PAGE_SIZE,
    safePage * USAGE_PAGE_SIZE
  );

  const combinedLoading = costLoading || (isOnline && historyLoading && usageHistory.length === 0);

  const handleRefresh = useCallback(() => {
    void checkConnection();
    void fetchCost();
    void fetchHistory();
  }, [checkConnection, fetchCost, fetchHistory]);

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="flex flex-col h-full py-6 px-4 overflow-y-auto min-h-0">
        {/* 头部：标题 + 日期范围 + 下载/刷新 */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">{t('usage.title')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t('usage.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg p-0.5 border border-slate-600/50 bg-[#1e293b]">
              {(['today', '7d', '30d'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setDateRange(r)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    dateRange === r ? 'bg-blue-500/30 text-blue-400' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {r === 'today' ? t('usage.range.today') : r === '7d' ? t('usage.range.last7d') : t('usage.range.last30d')}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" title={t('usage.download')}>
              <Download className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground"
              title={t('usage.refresh')}
              onClick={handleRefresh}
              disabled={combinedLoading}
            >
              <RefreshCw className={cn('h-4 w-4', combinedLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* Tab 导航 */}
        <div className="flex gap-1 border-b border-slate-700/50 mb-4">
          {(
            [
              { id: 'overview' as const, label: t('usage.tabs.overview') },
              { id: 'by-model' as const, label: t('usage.tabs.byModel') },
              { id: 'by-session' as const, label: t('usage.tabs.bySession') },
              { id: 'timeseries' as const, label: t('usage.tabs.timeseries') },
              { id: 'logs' as const, label: t('usage.tabs.logs') },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === t.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {!isOnline && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
            {t('usage.gatewayOfflineHint')}
          </div>
        )}

        {/* Tab 内容区 - 按 activeTab 切换 */}
        {activeTab === 'overview' && (
          <>
        {/* 4 个指标卡片 - AxonClawX 风格 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t('usage.kpi.totalToken')}</span>
              <Hexagon className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{formatTokenCount(totalTokens)}</div>
            <div className="mt-2">
              <MiniSparkline data={tokenTrendData.length ? tokenTrendData : [0]} color="#a78bfa" height={24} width={60} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t('usage.kpi.totalCost')}</span>
              <Wallet className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-xl font-bold text-foreground">${totalCost.toFixed(2)}</div>
            <div className="mt-2">
              <MiniSparkline data={costTrendData.length ? costTrendData : [0]} color="#f97316" height={24} width={60} />
            </div>
          </div>
          <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t('usage.kpi.messages')}</span>
              <MessageSquare className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-foreground">{msgCount}</div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {t('usage.kpi.sessionsCount', { count: uniqueSessions })}
            </div>
          </div>
          <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{t('usage.kpi.avgLatency')}</span>
              <Gauge className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-xl font-bold text-foreground">—</div>
            <div className="text-[11px] text-muted-foreground mt-1">{t('usage.kpi.sessionsCount', { count: uniqueSessions })}</div>
          </div>
        </div>

        {/* 缓存命中率 + 输入/输出比 - 进度条 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">{t('usage.cache.hitRate')}</span>
              <span className="font-medium">{cacheHitRate.toFixed(1)}%</span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500/70 rounded-full transition-all"
                style={{ width: `${Math.min(100, cacheHitRate)}%` }}
              />
            </div>
          </div>
          <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground">{t('usage.cache.ioRatio')}</span>
              <span className="font-medium">
                {formatTokenCount(inputTokens)} / {formatTokenCount(outputTokens)}
              </span>
            </div>
            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden flex">
              <div
                className="h-full bg-purple-500/70 rounded-l-full transition-all"
                style={{
                  width: `${totalTokens > 0 ? (inputTokens / totalTokens) * 100 : 0}%`,
                }}
              />
              <div
                className="h-full bg-slate-600/50 rounded-r-full transition-all"
                style={{
                  width: `${totalTokens > 0 ? (outputTokens / totalTokens) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* 预算区块 */}
        <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-foreground">{t('usage.budget.title')}</h3>
              <p className="text-xs text-muted-foreground">{t('usage.budget.notSet')}</p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5">
            <Settings className="h-4 w-4" />
            {t('usage.budget.set')}
          </Button>
        </div>

        {/* 费用趋势 + {t('usage.group.byModel')} */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          <div className="lg:col-span-2 rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-foreground">{t('usage.trend.title')}</h3>
              <div className="flex rounded-lg p-0.5 border border-slate-600/50 bg-slate-800/50">
                {(['day', 'week', 'month'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setTrendGranularity(g)}
                    className={cn(
                      'px-2 py-1 text-xs rounded',
                      trendGranularity === g ? 'bg-slate-600 text-foreground' : 'text-muted-foreground'
                    )}
                  >
                    {g === 'day' ? t('usage.trend.day') : g === 'week' ? t('usage.trend.week') : t('usage.trend.month')}
                  </button>
                ))}
              </div>
            </div>
            {usageCost?.trend && usageCost.trend.length > 0 ? (
              <div className="space-y-2">
                {usageCost.trend.map((t) => (
                  <div key={t.date} className="flex items-center gap-2">
                    <span className="text-xs w-20 text-muted-foreground">{t.date}</span>
                    <div className="flex-1 h-6 bg-slate-700/50 rounded overflow-hidden">
                      <div
                        className="h-full bg-emerald-500/60 rounded"
                        style={{
                          width: `${Math.min(
                            100,
                            (t.cost / (Math.max(...usageCost.trend!.map((x) => x.cost), 0.01) || 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs w-16 text-right">${t.cost.toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('usage.empty.noTrend')}</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
            <h3 className="text-sm font-medium text-foreground mb-3">{t('usage.byModel.title')}</h3>
            {usageGroups.length > 0 ? (
              <div className="space-y-2">
                {usageGroups.slice(0, 5).map((g) => (
                  <div key={g.label} className="flex justify-between text-xs">
                    <span className="text-muted-foreground truncate max-w-[60%]">{g.label}</span>
                    <span className="font-medium">{formatTokenCount(g.totalTokens)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('usage.empty.noData')}</p>
            )}
          </div>
        </div>

        {/* Token 使用历史 */}
        <div>
          <h3 className="text-base font-semibold text-foreground mb-4">{t('usage.logs.tokenUsageTitle')}</h3>
          {historyLoading && usageHistory.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[#1e293b]/50 py-12 flex justify-center">
              <FeedbackState state="loading" title={t('usage.loading')} />
            </div>
          ) : usageHistory.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[#1e293b]/50 py-12 flex justify-center">
              <FeedbackState state="empty" title={t('usage.empty.noUsageRecords')} />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[#1e293b]/50 py-12 flex justify-center">
              <FeedbackState state="empty" title={t('usage.empty.noRecordsInRange')} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <div className="flex rounded-lg p-1 border border-indigo-500/30 bg-[#1e293b]">
                    <Button
                      variant={usageGroupBy === 'model' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setUsageGroupBy('model');
                        setUsagePage(1);
                      }}
                      className={
                        usageGroupBy === 'model'
                          ? 'rounded-md bg-indigo-500/20 text-indigo-400'
                          : 'rounded-md text-muted-foreground'
                      }
                    >
                      {t('usage.group.byModel')}
                    </Button>
                    <Button
                      variant={usageGroupBy === 'day' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setUsageGroupBy('day');
                        setUsagePage(1);
                      }}
                      className={
                        usageGroupBy === 'day'
                          ? 'rounded-md bg-indigo-500/20 text-indigo-400'
                          : 'rounded-md text-muted-foreground'
                      }
                    >
                      {t('usage.group.byDate')}
                    </Button>
                  </div>
                  <div className="flex rounded-lg p-1 border border-indigo-500/30 bg-[#1e293b]">
                    <Button
                      variant={usageWindow === '7d' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setUsageWindow('7d');
                        setUsagePage(1);
                      }}
                      className={
                        usageWindow === '7d'
                          ? 'rounded-md bg-indigo-500/20 text-indigo-400'
                          : 'rounded-md text-muted-foreground'
                      }
                    >
                      {t('usage.range.7dShort')}
                    </Button>
                    <Button
                      variant={usageWindow === '30d' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setUsageWindow('30d');
                        setUsagePage(1);
                      }}
                      className={
                        usageWindow === '30d'
                          ? 'rounded-md bg-indigo-500/20 text-indigo-400'
                          : 'rounded-md text-muted-foreground'
                      }
                    >
                      {t('usage.range.30dShort')}
                    </Button>
                    <Button
                      variant={usageWindow === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => {
                        setUsageWindow('all');
                        setUsagePage(1);
                      }}
                      className={
                        usageWindow === 'all'
                          ? 'rounded-md bg-indigo-500/20 text-indigo-400'
                          : 'rounded-md text-muted-foreground'
                      }
                    >
                      {t('usage.range.all')}
                    </Button>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t('usage.totalCount', { count: filteredHistory.length })}
                </span>
              </div>

              <UsageBarChart
                groups={usageGroups}
                emptyLabel={t('usage.empty.noData')}
                totalLabel={t('usage.labels.total')}
                inputLabel={t('usage.labels.input')}
                outputLabel={t('usage.labels.output')}
                cacheLabel={t('usage.labels.cache')}
              />

              <div className="space-y-3">
                {pagedHistory.map((entry) => (
                  <div
                    key={`${entry.sessionId}-${entry.timestamp}`}
                    className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-4 hover:bg-[#1e293b]/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">
                          {entry.model || t('usage.unknownModel')}
                        </p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {[entry.provider, entry.agentId, entry.sessionId].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{formatTokenCount(entry.totalTokens)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatUsageTimestamp(entry.timestamp)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        {t('usage.labels.input')} {formatTokenCount(entry.inputTokens)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        {t('usage.labels.output')} {formatTokenCount(entry.outputTokens)}
                      </span>
                      {(entry.cacheReadTokens > 0 || entry.cacheWriteTokens > 0) && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {t('usage.labels.cache')}{' '}
                          {formatTokenCount(entry.cacheReadTokens + entry.cacheWriteTokens)}
                        </span>
                      )}
                      {typeof entry.costUsd === 'number' && Number.isFinite(entry.costUsd) && (
                        <span className="ml-auto text-foreground/80 bg-indigo-500/10 px-2 py-0.5 rounded">
                          ${entry.costUsd.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {t('usage.page', { current: safePage, total: totalPages })}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsagePage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="h-8 border-indigo-500/40"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('usage.prevPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsagePage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="h-8 border-indigo-500/40"
                  >
                    {t('usage.nextPage')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
        </>
        )}

        {activeTab === 'by-model' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
                <span className="text-xs text-muted-foreground">{t('usage.kpi.totalToken')}</span>
                <div className="text-xl font-bold mt-1">{formatTokenCount(totalTokens)}</div>
              </div>
              <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
                <span className="text-xs text-muted-foreground">{t('usage.kpi.totalCost')}</span>
                <div className="text-xl font-bold mt-1">${totalCost.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
                <span className="text-xs text-muted-foreground">{t('usage.modelCount')}</span>
                <div className="text-xl font-bold mt-1">{modelGroups.length}</div>
              </div>
              <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
                <span className="text-xs text-muted-foreground">{t('usage.kpi.messages')}</span>
                <div className="text-xl font-bold mt-1">{msgCount}</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
              <h3 className="text-sm font-medium mb-4">{t('usage.byModel.distribution')}</h3>
              <UsageBarChart
                groups={modelGroups}
                emptyLabel={t('usage.empty.noData')}
                totalLabel={t('usage.labels.total')}
                inputLabel={t('usage.labels.input')}
                outputLabel={t('usage.labels.output')}
                cacheLabel={t('usage.labels.cache')}
              />
            </div>
            <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
              <h3 className="text-sm font-medium mb-3">{t('usage.byModel.details')}</h3>
              {modelGroups.length > 0 ? (
                <div className="space-y-2">
                  {modelGroups.map((g) => (
                    <div key={g.label} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                      <span className="text-sm truncate max-w-[70%]">{g.label}</span>
                      <div className="flex gap-4 text-xs">
                        <span>{t('usage.labels.input')} {formatTokenCount(g.inputTokens)}</span>
                        <span>{t('usage.labels.output')} {formatTokenCount(g.outputTokens)}</span>
                        <span className="font-medium">{t('usage.labels.total')} {formatTokenCount(g.totalTokens)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <FeedbackState state="empty" title={t('usage.empty.noModelData')} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'by-session' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
                <span className="text-xs text-muted-foreground">{t('usage.kpi.totalToken')}</span>
                <div className="text-xl font-bold mt-1">{formatTokenCount(totalTokens)}</div>
              </div>
              <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
                <span className="text-xs text-muted-foreground">{t('usage.sessionCount')}</span>
                <div className="text-xl font-bold mt-1">{uniqueSessions}</div>
              </div>
              <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
                <span className="text-xs text-muted-foreground">{t('usage.kpi.totalCost')}</span>
                <div className="text-xl font-bold mt-1">${totalCost.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
                <span className="text-xs text-muted-foreground">{t('usage.kpi.messages')}</span>
                <div className="text-xl font-bold mt-1">{msgCount}</div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
              <h3 className="text-sm font-medium mb-4">{t('usage.bySession.distribution')}</h3>
              <UsageBarChart
                groups={sessionGroups}
                emptyLabel={t('usage.empty.noData')}
                totalLabel={t('usage.labels.total')}
                inputLabel={t('usage.labels.input')}
                outputLabel={t('usage.labels.output')}
                cacheLabel={t('usage.labels.cache')}
              />
            </div>
            <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
              <h3 className="text-sm font-medium mb-3">{t('usage.bySession.details')}</h3>
              {sessionGroups.length > 0 ? (
                <div className="space-y-2">
                  {sessionGroups.map((g) => (
                    <div key={g.sessionId ?? g.label} className="flex justify-between items-center py-2 border-b border-slate-700/50 last:border-0">
                      <span className="text-xs font-mono truncate max-w-[60%]" title={g.sessionId}>{g.sessionId ?? g.label}</span>
                      <span className="font-medium">{formatTokenCount(g.totalTokens)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <FeedbackState state="empty" title={t('usage.empty.noSessionData')} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'timeseries' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
              <h3 className="text-sm font-medium mb-3">{t('usage.timeseries.tokenByDate')}</h3>
              <UsageBarChart
                groups={dayGroups}
                emptyLabel={t('usage.empty.noData')}
                totalLabel={t('usage.labels.total')}
                inputLabel={t('usage.labels.input')}
                outputLabel={t('usage.labels.output')}
                cacheLabel={t('usage.labels.cache')}
              />
            </div>
            <div className="rounded-xl border border-slate-600/50 bg-[#1e293b] p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">{t('usage.trend.title')}</h3>
                <div className="flex rounded-lg p-0.5 border border-slate-600/50 bg-slate-800/50">
                  {(['day', 'week', 'month'] as const).map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setTrendGranularity(g)}
                      className={cn(
                        'px-2 py-1 text-xs rounded',
                        trendGranularity === g ? 'bg-slate-600 text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {g === 'day' ? t('usage.trend.day') : g === 'week' ? t('usage.trend.week') : t('usage.trend.month')}
                    </button>
                  ))}
                </div>
              </div>
              {usageCost?.trend && usageCost.trend.length > 0 ? (
                <div className="space-y-3">
                  {usageCost.trend.map((t) => (
                    <div key={t.date} className="flex items-center gap-3">
                      <span className="text-xs w-24 text-muted-foreground">{t.date}</span>
                      <div className="flex-1 h-8 bg-slate-700/50 rounded overflow-hidden">
                        <div
                          className="h-full bg-emerald-500/60 rounded flex items-center justify-end pr-2"
                          style={{
                            width: `${Math.min(
                              100,
                              (t.cost / (Math.max(...usageCost.trend!.map((x) => x.cost), 0.01) || 1)) * 100
                            )}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm w-20 text-right">${t.cost.toFixed(2)}</span>
                      {t.tokens != null && (
                        <span className="text-xs text-muted-foreground w-16 text-right">{formatTokenCount(t.tokens)}</span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <FeedbackState state="empty" title={t('usage.empty.noTrend')} />
              )}
            </div>
          </div>
        )}

        {activeTab === 'logs' && (
          <div>
            <h3 className="text-base font-semibold text-foreground mb-4">{t('usage.tabs.logs')}</h3>
          {historyLoading && usageHistory.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[#1e293b]/50 py-12 flex justify-center">
              <FeedbackState state="loading" title={t('usage.loading')} />
            </div>
          ) : usageHistory.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[#1e293b]/50 py-12 flex justify-center">
              <FeedbackState state="empty" title={t('usage.empty.noUsageRecords')} />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[#1e293b]/50 py-12 flex justify-center">
              <FeedbackState state="empty" title={t('usage.empty.noRecordsInRange')} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  <div className="flex rounded-lg p-1 border border-indigo-500/30 bg-[#1e293b]">
                    <Button
                      variant={usageGroupBy === 'model' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => { setUsageGroupBy('model'); setUsagePage(1); }}
                      className={usageGroupBy === 'model' ? 'rounded-md bg-indigo-500/20 text-indigo-400' : 'rounded-md text-muted-foreground'}
                    >
                      {t('usage.group.byModel')}
                    </Button>
                    <Button
                      variant={usageGroupBy === 'day' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => { setUsageGroupBy('day'); setUsagePage(1); }}
                      className={usageGroupBy === 'day' ? 'rounded-md bg-indigo-500/20 text-indigo-400' : 'rounded-md text-muted-foreground'}
                    >
                      {t('usage.group.byDate')}
                    </Button>
                  </div>
                  <div className="flex rounded-lg p-1 border border-indigo-500/30 bg-[#1e293b]">
                    <Button
                      variant={usageWindow === '7d' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => { setUsageWindow('7d'); setUsagePage(1); }}
                      className={usageWindow === '7d' ? 'rounded-md bg-indigo-500/20 text-indigo-400' : 'rounded-md text-muted-foreground'}
                    >
                      {t('usage.range.7dShort')}
                    </Button>
                    <Button
                      variant={usageWindow === '30d' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => { setUsageWindow('30d'); setUsagePage(1); }}
                      className={usageWindow === '30d' ? 'rounded-md bg-indigo-500/20 text-indigo-400' : 'rounded-md text-muted-foreground'}
                    >
                      {t('usage.range.30dShort')}
                    </Button>
                    <Button
                      variant={usageWindow === 'all' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => { setUsageWindow('all'); setUsagePage(1); }}
                      className={usageWindow === 'all' ? 'rounded-md bg-indigo-500/20 text-indigo-400' : 'rounded-md text-muted-foreground'}
                    >
                      {t('usage.range.all')}
                    </Button>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{t('usage.totalCount', { count: filteredHistory.length })}</span>
              </div>

              <div className="space-y-3">
                {pagedHistory.map((entry) => (
                  <div
                    key={`${entry.sessionId}-${entry.timestamp}`}
                    className="rounded-xl border-2 border-indigo-500/30 bg-[#1e293b] p-4 hover:bg-[#1e293b]/80 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm text-foreground truncate">{entry.model || t('usage.unknownModel')}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {[entry.provider, entry.agentId, entry.sessionId].filter(Boolean).join(' • ')}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm">{formatTokenCount(entry.totalTokens)}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{formatUsageTimestamp(entry.timestamp)}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] font-medium text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-sky-500" />
                        {t('usage.labels.input')} {formatTokenCount(entry.inputTokens)}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-violet-500" />
                        {t('usage.labels.output')} {formatTokenCount(entry.outputTokens)}
                      </span>
                      {(entry.cacheReadTokens > 0 || entry.cacheWriteTokens > 0) && (
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500" />
                          {t('usage.labels.cache')} {formatTokenCount(entry.cacheReadTokens + entry.cacheWriteTokens)}
                        </span>
                      )}
                      {typeof entry.costUsd === 'number' && Number.isFinite(entry.costUsd) && (
                        <span className="ml-auto text-foreground/80 bg-indigo-500/10 px-2 py-0.5 rounded">
                          ${entry.costUsd.toFixed(4)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">{t('usage.page', { current: safePage, total: totalPages })}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsagePage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                    className="h-8 border-indigo-500/40"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    {t('usage.prevPage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUsagePage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage >= totalPages}
                    className="h-8 border-indigo-500/40"
                  >
                    {t('usage.nextPage')}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          </div>
        )}
      </div>
    </div>
  );
};

export { UsageView };
export default UsageView;
