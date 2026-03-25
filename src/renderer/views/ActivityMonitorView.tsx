/**
 * AxonClaw - Activity Monitor View
 * AxonClawX 风格：会话活动监控、KPI 仪表盘、批量操作
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, ListChecks, Search } from 'lucide-react';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
import { KPIDashboard, type KPIDashboardProps } from '@/components/activity/KPIDashboard';
import { SessionCard, type SessionCardProps } from '@/components/activity/SessionCard';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTranslation } from 'react-i18next';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

type SortField = 'updated' | 'tokens' | 'name';

const AUTO_REFRESH_MS = 30_000;

function fmtRelativeTime(ts: number | undefined, _labels?: Record<string, string>): string {
  if (!ts) return i18n.t('views.activityMonitor.emptyMark', { defaultValue: '—' });
  const diff = Date.now() - ts;
  if (diff < 60_000) return i18n.t('views.activityMonitor.relative.justNow', { defaultValue: 'Just now' });
  if (diff < 3600_000) return i18n.t('views.activityMonitor.relative.minutesAgo', { count: Math.floor(diff / 60_000), defaultValue: '{{count}}m ago' });
  if (diff < 86400_000) return i18n.t('views.activityMonitor.relative.hoursAgo', { count: Math.floor(diff / 3600_000), defaultValue: '{{count}}h ago' });
  if (diff < 604800_000) return i18n.t('views.activityMonitor.relative.daysAgo', { count: Math.floor(diff / 86400_000), defaultValue: '{{count}}d ago' });
  return new Date(ts).toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US');
}

interface ActivityMonitorViewProps {
  onNavigateTo?: (viewId: string) => void;
}

const ActivityMonitorView: React.FC<ActivityMonitorViewProps> = ({ onNavigateTo }) => {
  const { t, i18n: i18nInst } = useTranslation();
  const isZh = i18nInst.language?.toLowerCase?.().startsWith('zh');
  const labels: Record<string, string> = useMemo(
    () => ({
      title: t('views.activityMonitor.title', { defaultValue: isZh ? '活动监控' : 'Activity Monitor' }),
      activityHelp: t('views.activityMonitor.activityHelp', { defaultValue: isZh ? '会话列表与用量分析' : 'Session list and usage analytics' }),
      sessions: t('views.activityMonitor.sessions', { defaultValue: isZh ? '会话' : 'Sessions' }),
      search: t('views.activityMonitor.search', { defaultValue: isZh ? '搜索…' : 'Search…' }),
      all: t('views.activityMonitor.all', { defaultValue: isZh ? '全部' : 'All' }),
      sortUpdated: t('views.activityMonitor.sortUpdated', { defaultValue: isZh ? '更新时间' : 'Updated Time' }),
      sortTokens: t('views.activityMonitor.sortTokens', { defaultValue: isZh ? 'Token 数' : 'Token Count' }),
      sortName: t('views.activityMonitor.sortName', { defaultValue: isZh ? '名称' : 'Name' }),
      refresh: t('views.activityMonitor.refresh', { defaultValue: isZh ? '刷新' : 'Refresh' }),
      exportCsv: t('views.activityMonitor.exportCsv', { defaultValue: isZh ? '导出 CSV' : 'Export CSV' }),
      batchMode: t('views.activityMonitor.batchMode', { defaultValue: isZh ? '批量' : 'Batch' }),
      lastRefresh: t('views.activityMonitor.lastRefresh', { defaultValue: isZh ? '上次刷新' : 'Last refresh' }),
      reset: t('views.activityMonitor.reset', { defaultValue: isZh ? '重置' : 'Reset' }),
      confirmReset: t('views.activityMonitor.confirmReset', { defaultValue: isZh ? '确认重置此会话？' : 'Reset this session?' }),
      resetOk: t('views.activityMonitor.resetOk', { defaultValue: isZh ? '重置完成' : 'Reset done' }),
      delete: t('views.activityMonitor.delete', { defaultValue: isZh ? '删除' : 'Delete' }),
      confirmDelete: t('views.activityMonitor.confirmDelete', { defaultValue: isZh ? '确认删除此会话？' : 'Delete this session?' }),
      confirmDeleteMain: t('views.activityMonitor.confirmDeleteMain', { defaultValue: isZh ? '确认删除主会话？' : 'Delete main session?' }),
      deleteOk: t('views.activityMonitor.deleteOk', { defaultValue: isZh ? '已删除' : 'Deleted' }),
      compact: t('views.activityMonitor.compact', { defaultValue: isZh ? '压缩' : 'Compact' }),
      confirmCompact: t('views.activityMonitor.confirmCompact', { defaultValue: isZh ? '确认压缩此会话？' : 'Compact this session?' }),
      compactOk: t('views.activityMonitor.compactOk', { defaultValue: isZh ? '压缩完成' : 'Compacted' }),
      batchDelete: t('views.activityMonitor.batchDelete', { defaultValue: isZh ? '批量删除' : 'Batch delete' }),
      confirmBatchDelete: t('views.activityMonitor.confirmBatchDelete', { defaultValue: isZh ? '确认批量删除' : 'Confirm delete' }),
      batchReset: t('views.activityMonitor.batchReset', { defaultValue: isZh ? '批量重置' : 'Batch reset' }),
      confirmBatchReset: t('views.activityMonitor.confirmBatchReset', { defaultValue: isZh ? '确认批量重置' : 'Confirm reset' }),
      selected: t('views.activityMonitor.selected', { defaultValue: isZh ? '已选' : 'selected' }),
      noSessions: t('views.activityMonitor.noSessions', { defaultValue: isZh ? '暂无会话' : 'No sessions' }),
      noSessionsHint: t('views.activityMonitor.noSessionsHint', { defaultValue: isZh ? '通过 Gateway 开始对话后，会话将显示在这里。' : 'Sessions will appear here after you start chatting via Gateway.' }),
      step1: t('views.activityMonitor.step1', { defaultValue: isZh ? '配置 Gateway' : 'Configure Gateway' }),
      step1Desc: t('views.activityMonitor.step1Desc', { defaultValue: isZh ? '连接 OpenClaw Gateway' : 'Connect OpenClaw Gateway' }),
      step2: t('views.activityMonitor.step2', { defaultValue: isZh ? '开始对话' : 'Start Chatting' }),
      step2Desc: t('views.activityMonitor.step2Desc', { defaultValue: isZh ? '在聊天中发送消息' : 'Send a message in chat' }),
      step3: t('views.activityMonitor.step3', { defaultValue: isZh ? '在此监控' : 'Monitor Here' }),
      step3Desc: t('views.activityMonitor.step3Desc', { defaultValue: isZh ? '会话会自动出现在这里' : 'Sessions will show up automatically' }),
      groupToday: t('views.activityMonitor.groupToday', { defaultValue: isZh ? '今天' : 'Today' }),
      groupYesterday: t('views.activityMonitor.groupYesterday', { defaultValue: isZh ? '昨天' : 'Yesterday' }),
      groupThisWeek: t('views.activityMonitor.groupThisWeek', { defaultValue: isZh ? '本周' : 'This Week' }),
      groupEarlier: t('views.activityMonitor.groupEarlier', { defaultValue: isZh ? '更早' : 'Earlier' }),
      direct: t('views.activityMonitor.direct', { defaultValue: isZh ? '直连' : 'Direct' }),
      group: t('views.activityMonitor.group', { defaultValue: isZh ? '分组' : 'Group' }),
      global: t('views.activityMonitor.global', { defaultValue: isZh ? '全局' : 'Global' }),
      unknown: t('views.activityMonitor.unknown', { defaultValue: isZh ? '未知' : 'Unknown' }),
      totalTokens: t('views.activityMonitor.totalTokens', { defaultValue: isZh ? '总 Tokens' : 'Total Tokens' }),
      input: t('views.activityMonitor.input', { defaultValue: isZh ? '输入' : 'Input' }),
      output: t('views.activityMonitor.output', { defaultValue: isZh ? '输出' : 'Output' }),
      active24h: t('views.activityMonitor.active24h', { defaultValue: isZh ? '24h 活跃' : '24h Active' }),
      activity7d: t('views.activityMonitor.activity7d', { defaultValue: isZh ? '7天活跃' : '7d Activity' }),
      messages: t('views.activityMonitor.messages', { defaultValue: isZh ? '消息' : 'Messages' }),
      userMsg: t('views.activityMonitor.userMsg', { defaultValue: isZh ? '用户' : 'User' }),
      assistantMsg: t('views.activityMonitor.assistantMsg', { defaultValue: isZh ? '助手' : 'Assistant' }),
      toolCallsLabel: t('views.activityMonitor.toolCallsLabel', { defaultValue: isZh ? '工具' : 'Tools' }),
      errors: t('views.activityMonitor.errors', { defaultValue: isZh ? '错误' : 'Errors' }),
      channels: t('views.activityMonitor.channels', { defaultValue: isZh ? '渠道' : 'Channels' }),
      costTrend: t('views.activityMonitor.costTrend', { defaultValue: isZh ? '7天费用' : '7d Cost' }),
      modelDist: t('views.activityMonitor.modelDist', { defaultValue: isZh ? '模型分布' : 'Models' }),
      aborted: t('views.activityMonitor.aborted', { defaultValue: isZh ? '中止' : 'Aborted' }),
      tokens: t('views.activityMonitor.tokens', { defaultValue: isZh ? 'Token' : 'Token' }),
      metadata: t('views.activityMonitor.metadata', { defaultValue: isZh ? '详情' : 'Details' }),
      openChat: t('views.activityMonitor.openChat', { defaultValue: isZh ? '打开对话' : 'Open Chat' }),
      latencyStats: t('views.activityMonitor.latencyStats', { defaultValue: isZh ? '延迟' : 'Latency' }),
      gateway: t('views.activityMonitor.gateway', { defaultValue: 'Gateway' }),
      online: t('views.activityMonitor.online', { defaultValue: isZh ? '在线' : 'Online' }),
      offline: t('views.activityMonitor.offline', { defaultValue: isZh ? '离线' : 'Offline' }),
    }),
    [t, isZh, i18nInst.language],
  );

  const listRef = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<{ sessions?: Record<string, unknown>[]; path?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const hasLoadedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [busy, setBusy] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [sortField, setSortField] = useState<SortField>('updated');
  const [batchSelected, setBatchSelected] = useState<Set<string>>(new Set());
  const [batchMode, setBatchMode] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [costTrend, setCostTrend] = useState<Array<{ date: string; totalCost: number }>>([]);
  const [cardDensity, setCardDensity] = useState<'compact' | 'normal' | 'large'>('normal');
  const [usageAggregates, setUsageAggregates] = useState<Record<string, unknown> | null>(null);
  const [usageByKey, setUsageByKey] = useState<Record<string, unknown>>({});

  const rpc = useGatewayStore((s) => s.rpc);

  const loadSessions = useCallback(async () => {
    const isInitial = !hasLoadedRef.current;
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const data = (await invokeIpc<{ sessions?: Record<string, unknown>[] }>('sessions.list', {
        limit: 500,
      })) as { sessions?: Record<string, unknown>[]; path?: string };
      setResult(data ?? { sessions: [] });
      setLastRefresh(Date.now());
      hasLoadedRef.current = true;
    } catch (e: unknown) {
      setError(String(e));
      setResult({ sessions: [] });
    }
    if (isInitial) setLoading(false);
    else setRefreshing(false);
  }, []);

  const loadCostTrend = useCallback(async () => {
    try {
      const data = (await hostApiFetch<{
        trend?: Array<{ date?: string; cost?: number; totalCost?: number }>;
      }>('/api/usage-cost?days=7').catch(() => null)) as {
        trend?: Array<{ date?: string; cost?: number; totalCost?: number }>;
      } | null;
      if (data?.trend && Array.isArray(data.trend)) {
        setCostTrend(
          data.trend.map((d) => ({
            date: d.date ?? '',
            totalCost: d.totalCost ?? d.cost ?? 0,
          }))
        );
      }
    } catch {
      /* non-critical */
    }
  }, []);

  const loadUsageAggregates = useCallback(async () => {
    try {
      const data = (await hostApiFetch<{
        aggregates?: Record<string, unknown>;
        sessions?: Array<{ key?: string; usage?: unknown }>;
      }>('/api/sessions/usage?limit=50').catch(() => null)) as {
        aggregates?: Record<string, unknown>;
        sessions?: Array<{ key?: string; usage?: unknown }>;
      } | null;
      if (data?.aggregates) setUsageAggregates(data.aggregates);
      if (data?.sessions && Array.isArray(data.sessions)) {
        const map: Record<string, unknown> = {};
        for (const s of data.sessions) {
          if (s.key && s.usage) map[s.key] = s.usage;
        }
        setUsageByKey(map);
      }
    } catch {
      /* non-critical */
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setSearchKeyword(searchInput.trim().toLowerCase()), 140);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    loadSessions();
    loadCostTrend();
    loadUsageAggregates();
  }, [loadSessions, loadCostTrend, loadUsageAggregates]);

  useEffect(() => {
    const visible = document.visibilityState === 'visible';
    if (!visible) return;
    const t = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadSessions();
        loadCostTrend();
        loadUsageAggregates();
      }
    }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [loadSessions, loadCostTrend, loadUsageAggregates]);

  const sessions: Record<string, unknown>[] = result?.sessions ?? [];
  const storePath = result?.path ?? '';

  const kpiStats = useMemo(() => {
    let totalTok = 0,
      totalIn = 0,
      totalOut = 0,
      active24h = 0,
      abortedCount = 0;
    const channelSet = new Set<string>();
    const now = Date.now();
    sessions.forEach((s) => {
      const tok = (s.totalTokens as number) ?? ((s.inputTokens as number) || 0) + ((s.outputTokens as number) || 0);
      totalTok += tok;
      totalIn += (s.inputTokens as number) || 0;
      totalOut += (s.outputTokens as number) || 0;
      if (s.updatedAt && now - (s.updatedAt as number) < 86_400_000) active24h++;
      if (s.abortedLastRun) abortedCount++;
      if (s.lastChannel) channelSet.add(s.lastChannel as string);
    });
    const avgTok = sessions.length ? Math.round(totalTok / sessions.length) : 0;
    return {
      totalTok,
      totalIn,
      totalOut,
      active24h,
      abortedCount,
      avgTok,
      channels: channelSet.size,
    };
  }, [sessions]);

  const kindCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    sessions.forEach((s) => {
      const k = (s.kind as string) || 'unknown';
      counts[k] = (counts[k] || 0) + 1;
    });
    return counts;
  }, [sessions]);

  const filtered = useMemo(() => {
    let list = sessions;
    if (kindFilter && kindFilter !== 'all') list = list.filter((s) => s.kind === kindFilter);
    if (searchKeyword) {
      const q = searchKeyword;
      list = list.filter(
        (s) =>
          (s.key as string)?.toLowerCase().includes(q) ||
          (s.label as string)?.toLowerCase().includes(q) ||
          (s.displayName as string)?.toLowerCase().includes(q) ||
          (s.model as string)?.toLowerCase().includes(q) ||
          (s.lastChannel as string)?.toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortField === 'tokens')
        return ((b.totalTokens as number) || 0) - ((a.totalTokens as number) || 0);
      if (sortField === 'name') return (a.key as string)?.localeCompare((b.key as string) || '');
      return ((b.updatedAt as number) || 0) - ((a.updatedAt as number) || 0);
    });
    return list;
  }, [sessions, kindFilter, searchKeyword, sortField]);

  const groupedSessions = useMemo(() => {
    const groups: { label: string; items: Record<string, unknown>[] }[] = [];
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 86_400_000;
    const weekStart = todayStart - now.getDay() * 86_400_000;
    const buckets: Record<string, Record<string, unknown>[]> = {
      today: [],
      yesterday: [],
      week: [],
      earlier: [],
    };
    filtered.forEach((s) => {
      const ts = (s.updatedAt as number) || 0;
      if (ts >= todayStart) buckets.today.push(s);
      else if (ts >= yesterdayStart) buckets.yesterday.push(s);
      else if (ts >= weekStart) buckets.week.push(s);
      else buckets.earlier.push(s);
    });
    if (buckets.today.length) groups.push({ label: labels.groupToday, items: buckets.today });
    if (buckets.yesterday.length)
      groups.push({ label: labels.groupYesterday, items: buckets.yesterday });
    if (buckets.week.length) groups.push({ label: labels.groupThisWeek, items: buckets.week });
    if (buckets.earlier.length) groups.push({ label: labels.groupEarlier, items: buckets.earlier });
    return groups;
  }, [filtered]);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCompactConfirm, setShowCompactConfirm] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [confirmMessage, setConfirmMessage] = useState('');

  const resetSession = useCallback(
    async (key: string) => {
      if (busy) return;
      setPendingKey(key);
      setConfirmMessage(labels.confirmReset);
      setShowResetConfirm(true);
    },
    [busy]
  );

  const handleResetConfirm = useCallback(async () => {
    if (!pendingKey) return;
      setBusy(true);
      try {
        await rpc('sessions.reset', { key: pendingKey });
        await loadSessions();
      } catch (e) {
        setError(String(e));
      }
      setBusy(false);
      setPendingKey(null);
      setShowResetConfirm(false);
  }, [pendingKey, rpc, loadSessions]);

  const deleteSession = useCallback(
    async (key: string) => {
      if (busy) return;
      const isMain = key.endsWith(':main');
      setPendingKey(key);
      setConfirmMessage(isMain ? labels.confirmDeleteMain : labels.confirmDelete);
      setShowDeleteConfirm(true);
    },
    [busy]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!pendingKey) return;
      setBusy(true);
      try {
        await rpc('sessions.delete', { key: pendingKey, deleteTranscript: true });
        await loadSessions();
      } catch (e) {
        setError(String(e));
      }
      setBusy(false);
      setPendingKey(null);
      setShowDeleteConfirm(false);
  }, [pendingKey, rpc, loadSessions]);

  const compactSession = useCallback(
    async (key: string) => {
      if (busy) return;
      setPendingKey(key);
      setConfirmMessage(labels.confirmCompact);
      setShowCompactConfirm(true);
    },
    [busy]
  );

  const handleCompactConfirm = useCallback(async () => {
    if (!pendingKey) return;
      setBusy(true);
      try {
        await rpc('sessions.compact', { key: pendingKey });
        await loadSessions();
      } catch (e) {
        setError(String(e));
      }
      setBusy(false);
      setPendingKey(null);
      setShowCompactConfirm(false);
  }, [pendingKey, rpc, loadSessions]);

  const toggleBatchItem = useCallback((key: string) => {
    setBatchSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const batchDelete = useCallback(async () => {
    if (batchSelected.size === 0) return;
    setBusy(true);
    for (const key of batchSelected) {
      try {
        await rpc('sessions.delete', { key, deleteTranscript: true });
      } catch {
        /* ignore */
      }
    }
    setBatchSelected(new Set());
    setBatchMode(false);
    await loadSessions();
    setBusy(false);
  }, [batchSelected, rpc, loadSessions]);

  const batchReset = useCallback(async () => {
    if (batchSelected.size === 0) return;
    setBusy(true);
    for (const key of batchSelected) {
      try {
        await rpc('sessions.reset', { key });
      } catch {
        /* ignore */
      }
    }
    setBatchSelected(new Set());
    setBatchMode(false);
    await loadSessions();
    setBusy(false);
  }, [batchSelected, rpc, loadSessions]);

  const exportCSV = useCallback(() => {
    const header =
      'key,kind,label,model,provider,totalTokens,inputTokens,outputTokens,updatedAt,lastChannel\n';
    const rows = sessions.map(
      (s) =>
        [
          s.key,
          s.kind,
          `"${((s.label as string) || '').replace(/"/g, '""')}"`,
          s.model || '',
          s.modelProvider || '',
          (s.totalTokens as number) || 0,
          (s.inputTokens as number) || 0,
          (s.outputTokens as number) || 0,
          s.updatedAt ? new Date(s.updatedAt as number).toISOString() : '',
          s.lastChannel || '',
        ].join(',')
    );
    const blob = new Blob([header + rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sessions-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [sessions]);

  const handleNavigateToChat = useCallback(
    (key: string) => {
      useChatStore.getState().switchSession(key);
      onNavigateTo?.('chat');
    },
    [onNavigateTo]
  );

  const isOnline = useGatewayStore((s) => s.status.state === 'running');

  return (
    <div className="flex-1 h-full min-h-0 flex flex-col overflow-hidden bg-[#0f172a] text-white">
      <div className="w-full h-full min-h-0 pt-0 pb-3 overflow-y-auto custom-scrollbar px-4">
        <PageHeader
          title={labels.title}
          subtitle={`${sessions.length} ${labels.sessions}${storePath ? ` · ${storePath}` : ''}`}
          sticky={false}
          stats={[
            { label: i18n.t('views.activityMonitor.stats.sessions', { defaultValue: 'Sessions' }), value: sessions.length },
            { label: i18n.t('views.activityMonitor.stats.totalTokens', { defaultValue: 'Total Tokens' }), value: kpiStats.totalTok >= 1000 ? `${(kpiStats.totalTok / 1000).toFixed(1)}K` : kpiStats.totalTok },
            { label: i18n.t('views.activityMonitor.stats.active24h', { defaultValue: '24h Active' }), value: kpiStats.active24h },
            { label: labels.gateway, value: isOnline ? labels.online : labels.offline, valueClassName: isOnline ? 'text-emerald-400' : 'text-amber-400' },
          ]}
          onRefresh={() => void loadSessions()}
          refreshing={loading || refreshing}
          statsBorderColor={
            !isOnline
              ? 'border-amber-500/40'
              : sessions.length > 0
                ? 'border-emerald-500/40'
                : 'border-indigo-500/40'
          }
          actions={
            <div className="flex items-center gap-1">
              {sessions.length > 0 && (
                <button
                  onClick={exportCSV}
                  className="p-1.5 rounded-lg text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                  title={labels.exportCsv}
                >
                  <Download className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => {
                  setBatchMode(!batchMode);
                  setBatchSelected(new Set());
                }}
                className={cn(
                  'p-1.5 rounded-lg transition-all',
                  batchMode ? 'text-indigo-400 bg-indigo-500/10' : 'text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10'
                )}
                title={labels.batchMode}
              >
                <ListChecks className="w-4 h-4" />
              </button>
              <button
                onClick={() =>
                  setCardDensity((d) => (d === 'compact' ? 'normal' : d === 'normal' ? 'large' : 'compact'))
                }
                className="p-1.5 rounded-lg text-white/40 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                title={`${i18n.t('views.activityMonitor.density', { defaultValue: 'Density' })}: ${cardDensity}`}
              >
                <span className="text-sm font-bold">{cardDensity === 'compact' ? 'S' : cardDensity === 'large' ? 'L' : 'M'}</span>
              </button>
            </div>
          }
        />
      <div className="flex flex-col px-0">
        <div
          className={cn(
            'shrink-0 py-3 border-b',
            sessions.length > 0 ? 'border-emerald-500/15' : 'border-indigo-500/20'
          )}
        >
        {sessions.length > 0 && (
          <KPIDashboard
            stats={kpiStats}
            sessions={sessions}
            labels={labels}
            costTrend={costTrend}
            usageAggregates={usageAggregates as KPIDashboardProps['usageAggregates']}
          />
        )}

        <div className="flex gap-1.5 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={labels.search}
              className="w-full h-8 pl-8 pr-2 rounded-lg bg-[#1e293b] border border-indigo-500/20 text-xs text-white/90 placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/40"
            />
          </div>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger
              className={cn(
                'h-8 w-[140px] rounded-lg bg-[#1e293b] text-xs text-white/80',
                kindFilter === 'all' ? 'border-indigo-500/25' : kindFilter === 'direct' ? 'border-blue-500/25' : kindFilter === 'group' ? 'border-purple-500/25' : kindFilter === 'global' ? 'border-amber-500/25' : 'border-white/15'
              )}
            >
              <SelectValue placeholder={`${labels.all} (${sessions.length})`} />
            </SelectTrigger>
            <SelectContent className="bg-[#1e293b] border-indigo-500/20 text-white/90">
              <SelectItem value="all">{`${labels.all} (${sessions.length})`}</SelectItem>
              {['direct', 'group', 'global', 'unknown']
                .filter((k) => kindCounts[k])
                .map((k) => (
                  <SelectItem key={k} value={k}>
                    {labels[k] || k} ({kindCounts[k]})
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={sortField} onValueChange={(v) => setSortField(v as SortField)}>
            <SelectTrigger
              className={cn(
                'h-8 w-[120px] rounded-lg bg-[#1e293b] text-xs text-white/80',
                sortField === 'updated' ? 'border-indigo-500/25' : sortField === 'tokens' ? 'border-amber-500/25' : 'border-blue-500/25'
              )}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#1e293b] border-indigo-500/20 text-white/90">
              <SelectItem value="updated">{labels.sortUpdated}</SelectItem>
              <SelectItem value="tokens">{labels.sortTokens}</SelectItem>
              <SelectItem value="name">{labels.sortName}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {batchMode && (
          <div className="flex items-center gap-2 mt-2 px-1">
            <span className="text-xs text-white/40">{batchSelected.size} {labels.selected}</span>
            <div className="flex-1" />
            <button
              onClick={batchReset}
              disabled={busy || batchSelected.size === 0}
              className="text-xs px-2 py-1 rounded bg-white/10 text-white/70 hover:text-indigo-400 disabled:opacity-30"
            >
              {labels.reset}
            </button>
            <button
              onClick={batchDelete}
              disabled={busy || batchSelected.size === 0}
              className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 disabled:opacity-30"
            >
              {labels.delete}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-2 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      <div ref={listRef} className="mt-1">
        {loading && !result ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl p-4 animate-pulse bg-[#1e293b] border border-indigo-500/20">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-12 h-4 rounded-full bg-indigo-500/20" />
                  <div className="flex-1 h-3 rounded bg-indigo-500/10" />
                </div>
                <div className="h-12 rounded-lg bg-indigo-500/10" />
                <div className="h-3 w-2/3 rounded bg-indigo-500/10 mt-3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 max-w-md mx-auto text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
              <Search className="w-8 h-8 text-indigo-400" />
            </div>
            <p className="text-sm font-bold text-white/70 mb-1">{labels.noSessions}</p>
            <p className="text-xs text-white/40 mb-6">{labels.noSessionsHint}</p>
            <div className="w-full space-y-2.5 text-start">
              {[
                { label: labels.step1, desc: labels.step1Desc },
                { label: labels.step2, desc: labels.step2Desc },
                { label: labels.step3, desc: labels.step3Desc },
              ].map((step, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-white/5 border border-white/10"
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 text-indigo-400 font-bold text-xs">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white/60">{step.label}</div>
                    <div className="text-[10px] text-white/40">{step.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {groupedSessions.map((group) => (
              <div key={group.label} className="mb-1">
                <div
          className={cn(
            'sticky top-0 z-10 py-1.5 text-[10px] font-bold text-white/40 uppercase tracking-wider bg-[#0f172a]/95 backdrop-blur-sm border-b',
            group.label === labels.groupToday ? 'border-emerald-500/20' : group.label === labels.groupYesterday ? 'border-blue-500/15' : 'border-white/10'
          )}
        >
                  {group.label} ({group.items.length})
                </div>
                <div
                  className={cn(
                    'grid gap-3 p-4',
                    cardDensity === 'compact' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5',
                    cardDensity === 'large' && 'grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-2',
                    cardDensity === 'normal' && 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  )}
                >
                  {group.items.slice(0, 60).map((row) => (
                    <div key={row.key as string} className="animate-in fade-in slide-in-from-bottom-2">
                      {batchMode && (
                        <div className="flex items-center gap-1.5 mb-1 ps-1">
                          <input
                            type="checkbox"
                            checked={batchSelected.has(row.key as string)}
                            onChange={() => toggleBatchItem(row.key as string)}
                            className="w-3.5 h-3.5 rounded border-white/20 text-indigo-500"
                          />
                        </div>
                      )}
                      <SessionCard
                        session={row}
                        sessionUsage={usageByKey[row.key as string] as SessionCardProps['sessionUsage']}
                        onChat={handleNavigateToChat}
                        onCompact={compactSession}
                        onReset={resetSession}
                        onDelete={deleteSession}
                        relativeTime={fmtRelativeTime(row.updatedAt as number, labels)}
                        labels={labels}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {lastRefresh > 0 && (
        <div className="shrink-0 py-1 border-t border-indigo-500/10 text-[9px] text-white/30 text-center">
          {labels.lastRefresh}: {new Date(lastRefresh).toLocaleTimeString(i18n.language === 'zh' ? 'zh-CN' : 'en-US')}
        </div>
      )}

      <ConfirmDialog
        open={showResetConfirm}
        title={labels.reset}
        message={confirmMessage}
        confirmLabel={labels.reset}
        cancelLabel={i18n.t('common.cancel')}
        variant="default"
        onConfirm={handleResetConfirm}
        onCancel={() => {
          setShowResetConfirm(false);
          setPendingKey(null);
        }}
      />
      <ConfirmDialog
        open={showDeleteConfirm}
        title={labels.delete}
        message={confirmMessage}
        confirmLabel={labels.delete}
        cancelLabel={i18n.t('common.cancel')}
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setPendingKey(null);
        }}
      />
      <ConfirmDialog
        open={showCompactConfirm}
        title={labels.compact}
        message={confirmMessage}
        confirmLabel={labels.compact}
        cancelLabel={i18n.t('common.cancel')}
        variant="default"
        onConfirm={handleCompactConfirm}
        onCancel={() => {
          setShowCompactConfirm(false);
          setPendingKey(null);
        }}
      />
      </div>
      </div>
    </div>
  );
};

export { ActivityMonitorView };
export default ActivityMonitorView;
