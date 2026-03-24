/**
 * AxonClaw - Dashboard View
 * AxonClawX 风格布局：Gateway Hero、KPI 卡片、最近会话
 * 不改变技术架构，使用现有 stores + hostApiFetch + IPC
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MessageSquare,
  RefreshCw,
  FileText,
  Bot,
  Puzzle,
  MessageCircle,
  Calendar,
  Cpu,
  Router,
  DollarSign,
  Zap,
  AlertTriangle,
  Bell,
  ExternalLink,
  FolderOpen,
  Monitor,
  Shield,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import { useSkillsStore } from '@/stores/skills';
import { useChannelsStore } from '@/stores/channels';
import { useCronStore } from '@/stores/cron';
import { useProviderStore } from '@/stores/providers';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { HealthDot } from '@/components/common/HealthDot';
import { GaugeCard, formatBytes, formatUptime } from '@/components/common/GaugeCard';
import { MiniSparkline } from '@/components/common/MiniSparkline';
import { DualTrendChart } from '@/components/common/DualTrendChart';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function fmtTokens(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

interface SessionInfo {
  sessionKey: string;
  label?: string;
  lastMessage?: string;
  lastActivity?: number;
}

interface HostInfo {
  hostname: string;
  platform: string;
  arch: string;
  numCpu: number;
  cpuUsage?: number;
  coroutineCount?: number;
  sysMem?: {
    total: number;
    used: number;
    free: number;
    usedPct: number;
  };
  diskUsage?: Array<{
    path: string;
    total: number;
    used: number;
    free: number;
    usedPct: number;
  }>;
  uptimeMs?: number;
  openclawVersion?: string;
  /** 进程内存 (Node.js process.memoryUsage) */
  processMemory?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
    stackMemory?: number;
    gcCount?: number;
  };
  /** 进程运行时间 (秒) */
  processUptime?: number;
  /** Gateway 运行时间 (秒，来自 /health) */
  gatewayUptime?: number;
  /** 连接实例数 */
  connectionsCount?: number;
  /** 环境信息 */
  env?: {
    user: string;
    shell: string;
    cwd: string;
  };
}

interface UsageCost {
  totalCost?: number;
  todayCost?: number;
  inputTokens?: number;
  outputTokens?: number;
  trend?: Array<{ date: string; cost: number; tokens?: number }>;
}

interface AlertItem {
  id: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
}

interface DashboardViewProps {
  onNavigateTo?: (viewId: string) => void;
}

const FAST_INTERVAL = 25000;

const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTo }) => {
  const { t } = useTranslation();
  const gatewayStatus = useGatewayStore((s) => s.status);
  const lastError = useGatewayStore((s) => s.lastError);
  const initGateway = useGatewayStore((s) => s.init);
  const startGateway = useGatewayStore((s) => s.start);
  const clearError = useGatewayStore((s) => s.clearError);

  const [connectionVerified, setConnectionVerified] = useState<boolean | null>(null);
  const [starting, setStarting] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [logContent, setLogContent] = useState('');
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [refreshCountdown, setRefreshCountdown] = useState(FAST_INTERVAL / 1000);

  // 主机信息状态
  const [hostInfo, setHostInfo] = useState<HostInfo | null>(null);
  const [loadingHostInfo, setLoadingHostInfo] = useState(false);

  // 使用成本
  const [usage, setUsage] = useState<UsageCost | null>(null);

  // 最近告警 + 汇总
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [alertSummary, setAlertSummary] = useState<{
    high: number;
    medium: number;
    count1h: number;
    count24h: number;
    healthScore: number;
  } | null>(null);
  // 从日志解析的异常事件（AxonClawX 风格：ERROR/WARN/exception/failed）
  const [logAbnormal, setLogAbnormal] = useState<Array<{ id: string; level: 'critical' | 'warning' | 'info'; title: string; message: string }>>([]);

  const setStatus = useGatewayStore((s) => s.setStatus);
  const checkConnection = useCallback(
    async (showLoading = false) => {
      if (showLoading) setConnectionVerified(null);
      try {
        const r = await invokeIpc<{ success: boolean; port?: number; error?: string }>('gateway:checkConnection');
        setConnectionVerified(r?.success ?? false);
        if (r?.success && r?.port) {
          setStatus({ state: 'running', port: r.port });
        }
        return r?.success ?? false;
      } catch {
        setConnectionVerified(false);
        return false;
      }
    },
    [setStatus]
  );

  const isOnline =
    connectionVerified === true ||
    (connectionVerified === null && gatewayStatus.state === 'running');
  const hasStartError = Boolean(lastError || gatewayStatus?.error);
  const isStarting = gatewayStatus?.state === 'starting' || starting;

  const loadSessions = useChatStore((s) => s.loadSessions);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);

  const agents = useAgentsStore((s) => s.agents);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const skills = useSkillsStore((s) => s.skills);
  const fetchSkills = useSkillsStore((s) => s.fetchSkills);
  const channels = useChannelsStore((s) => s.channels);
  const fetchChannels = useChannelsStore((s) => s.fetchChannels);
  const cronJobs = useCronStore((s) => s.jobs);
  const fetchCronJobs = useCronStore((s) => s.fetchJobs);
  const providerStatuses = useProviderStore((s) => s.statuses);
  const refreshProviderSnapshot = useProviderStore((s) => s.refreshProviderSnapshot);

  // 加载会话列表
  const fetchSessions = useCallback(async () => {
    setLoading(true);
    try {
      const result = (await window.electron.ipcRenderer.invoke('sessions.list', {
        limit: 10,
      })) as { sessions?: Array<{ sessionKey?: string; key?: string; label?: string; displayName?: string; lastMessage?: string; updatedAt?: number; lastActivity?: number }> };
      if (result?.sessions && Array.isArray(result.sessions)) {
        setSessions(
          result.sessions.map((s) => ({
            sessionKey: s.sessionKey ?? s.key ?? '',
            label: s.label ?? s.displayName,
            lastMessage: s.lastMessage?.slice(0, 50),
            lastActivity: s.updatedAt ?? s.lastActivity,
          }))
        );
      }
    } catch {
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载主机信息
  const fetchHostInfo = useCallback(async () => {
    setLoadingHostInfo(true);
    try {
      const data = await hostApiFetch<HostInfo>('/api/host-info', { method: 'GET' });
      if (data && typeof data === 'object') {
        setHostInfo(data);
      }
    } catch (err) {
      console.error('[Dashboard] Failed to fetch host info:', err);
    } finally {
      setLoadingHostInfo(false);
    }
  }, []);

  // 加载使用成本
  const fetchUsage = useCallback(async () => {
    if (!isOnline) return;
    try {
      const data = await hostApiFetch<UsageCost>('/api/usage-cost?days=7').catch(() => null);
      setUsage(data ?? null);
    } catch {
      setUsage(null);
    }
  }, [isOnline]);

  // 加载告警
  const fetchAlerts = useCallback(async () => {
    type AlertsRes = { alerts?: AlertItem[]; summary?: { high: number; medium: number; count1h: number; count24h: number; healthScore: number } };
    const empty: AlertsRes = {};
    try {
      const data: AlertsRes = await hostApiFetch<AlertsRes>('/api/alerts').catch(() => empty);
      setAlerts(Array.isArray(data.alerts) ? data.alerts : []);
      setAlertSummary(data.summary ?? null);
    } catch {
      setAlerts([]);
      setAlertSummary(null);
    }
  }, []);

  // 从日志解析异常事件（AxonClawX 风格）
  const fetchLogAbnormal = useCallback(async () => {
    try {
      const res = await hostApiFetch<{ events?: Array<{ id: string; level: 'critical' | 'warning' | 'info'; title: string; message: string }> }>('/api/logs/abnormal?limit=10');
      setLogAbnormal(Array.isArray(res?.events) ? res.events : []);
    } catch {
      setLogAbnormal([]);
    }
  }, []);

  useEffect(() => {
    initGateway().catch(console.error);
  }, [initGateway]);

  useEffect(() => {
    checkConnection(true);
    const t = setInterval(() => checkConnection(false), 15000);
    return () => clearInterval(t);
  }, [checkConnection]);

  // 进程内存、环境、告警、日志异常、服务商来自主进程，不依赖 Gateway，始终加载并定期刷新
  useEffect(() => {
    void fetchHostInfo();
    void fetchAlerts();
    void fetchLogAbnormal();
    void refreshProviderSnapshot();
    const t = setInterval(() => {
      void fetchHostInfo();
      void fetchAlerts();
      void fetchLogAbnormal();
      void refreshProviderSnapshot();
    }, 30000);
    return () => clearInterval(t);
  }, [fetchHostInfo, fetchAlerts, fetchLogAbnormal, refreshProviderSnapshot]);

  useEffect(() => {
    if (isOnline) {
      loadSessions().catch(console.error);
      fetchSessions();
      void fetchAgents();
      void fetchSkills();
      void fetchChannels();
      void fetchCronJobs();
      void fetchHostInfo();
      void fetchUsage();
      void fetchAlerts();
      void fetchLogAbnormal();
      void refreshProviderSnapshot();
    }
  }, [isOnline, fetchAgents, fetchSkills, fetchChannels, fetchCronJobs, fetchHostInfo, fetchSessions, loadSessions, fetchUsage, fetchAlerts, fetchLogAbnormal, refreshProviderSnapshot]);

  const refreshAll = useCallback(async () => {
    await checkConnection(true);
    void fetchHostInfo();
    void fetchAlerts();
    void fetchLogAbnormal();
    if (isOnline) {
      loadSessions().catch(console.error);
      fetchSessions();
      void fetchAgents();
      void fetchSkills();
      void fetchChannels();
      void fetchCronJobs();
      void fetchUsage();
      void refreshProviderSnapshot();
    }
    setLastUpdate(new Date());
    setRefreshCountdown(FAST_INTERVAL / 1000);
  }, [checkConnection, isOnline, fetchHostInfo, fetchSessions, fetchAgents, fetchSkills, fetchChannels, fetchCronJobs, fetchUsage, fetchAlerts, fetchLogAbnormal, refreshProviderSnapshot, loadSessions]);

  useEffect(() => {
    const timer = setInterval(() => setRefreshCountdown((p) => Math.max(p - 1, 0)), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleStartGateway = async () => {
    setStarting(true);
    clearError();
    try {
      await startGateway();
      // 启动请求已发出，等待几秒后验证连接
      setTimeout(() => {
        void checkConnection(true);
      }, 3000);
    } catch (e) {
      console.error('Gateway start error:', e);
    } finally {
      setStarting(false);
    }
  };

  const restartGateway = useGatewayStore((s) => s.restart);

  const handleRestartGateway = async () => {
    setShowRestartConfirm(false);
    setRestarting(true);
    clearError();
    try {
      await restartGateway();
      await initGateway();
      // 重启后重新检测连接，确认新进程已就绪
      await checkConnection(true);
    } catch (e) {
      console.error('Gateway restart error:', e);
    } finally {
      setRestarting(false);
    }
  };

  const stopGateway = useGatewayStore((s) => s.stop);

  const handleStopGateway = async () => {
    setShowStopConfirm(false);
    setStopping(true);
    clearError();
    try {
      await stopGateway();
      // 不调用 checkConnection：停止后若存在外部网关，checkConnection 会重新检测到并覆盖为 running
      await initGateway();
    } catch (e) {
      console.error('Gateway stop error:', e);
    } finally {
      setStopping(false);
    }
  };

  const handleShowLogs = async () => {
    setShowLogsModal(true);
    setLoadingLogs(true);
    setLogContent('');
    try {
      const data = await hostApiFetch<{ content?: string }>('/api/logs?tailLines=100');
      setLogContent(data?.content ?? t('dashboard.noLogContent'));
    } catch {
      setLogContent(t('dashboard.loadLogsFailed'));
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleOpenLogDir = async () => {
    try {
      const { dir } = await hostApiFetch<{ dir: string | null }>('/api/logs/dir');
      if (dir) await invokeIpc('shell:showItemInFolder', dir);
    } catch {
      /* ignore */
    }
  };

  const safeChannels = Array.isArray(channels) ? channels : [];
  const safeAgents = Array.isArray(agents) ? agents : [];
  const safeCronJobs = Array.isArray(cronJobs) ? cronJobs : [];
  const activeChannels = safeChannels.filter((c) => c.status === 'connected').length;
  const totalChannels = safeChannels.length || 1;
  const eligibleSkills = Array.isArray(skills) ? skills.filter((s) => s.enabled || s.isCore).length : 0;
  const skillCount = Array.isArray(skills) ? skills.length : 0;

  const timeFormatter = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' });

  // 资源告警：CPU/内存/磁盘 > 90%
  const cpuPct = hostInfo?.cpuUsage ?? 0;
  const memPct = hostInfo?.sysMem?.usedPct ?? 0;
  const diskPct = hostInfo?.diskUsage?.[0]?.usedPct ?? 0;
  const resourceAlerts: string[] = [];
  if (cpuPct > 90) resourceAlerts.push(`CPU ${cpuPct.toFixed(0)}%`);
  if (memPct > 90) resourceAlerts.push(t('dashboard.resource.memPct', { pct: memPct.toFixed(0) }));
  if (diskPct > 90) resourceAlerts.push(t('dashboard.resource.diskPct', { pct: diskPct.toFixed(0) }));
  const hasResourceAlert = resourceAlerts.length > 0;

  // 今日费用趋势（双线：令牌 + 费用）
  const trend = usage?.trend ?? [];
  const costTrend = trend.map((t) => t.cost);
  const sparklineData = costTrend.length > 0 ? costTrend : [0, 0.1, 0.2, 0.15, 0.25, 0.2, (usage?.todayCost ?? 0) || 0.2];

  const totalCost = usage?.totalCost ?? 0;
  const todayCost = usage?.todayCost ?? 0;
  const todayTokens = (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0);
  const sevenDayTokens = trend.reduce((s, t) => s + (t.tokens ?? 0), 0);
  const sevenDayCost = trend.reduce((s, t) => s + t.cost, 0);

  const safeProviders = Array.isArray(providerStatuses) ? providerStatuses : [];
  const trendChartRef = useRef<HTMLDivElement>(null);
  const [trendChartWidth, setTrendChartWidth] = useState(480);
  useEffect(() => {
    const el = trendChartRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      if (el) setTrendChartWidth(Math.max(320, el.offsetWidth));
    });
    ro.observe(el);
    setTrendChartWidth(Math.max(320, el.offsetWidth));
    return () => ro.disconnect();
  }, []);
  // AxonClawX 风格健康评分：告警 + 网关 + 服务商
  const computedHealthScore = (() => {
    const base = alertSummary?.healthScore ?? 100;
    let score = base;
    if (!isOnline) score -= 15;
    if (safeProviders.length === 0) score -= 5;
    else if (safeProviders.every((p) => !p.hasKey)) score -= 10;
    return Math.max(0, Math.min(100, Math.round(score)));
  })();

  const kpiCards = [
    { icon: MessageSquare, label: t('dashboard.kpi.sessions'), value: loading ? '--' : `${sessions.length}`, color: '#6366f1', borderClass: 'border-indigo-500/40', target: 'run' },
    { icon: Zap, label: t('dashboard.kpi.todayToken'), value: todayTokens > 0 ? fmtTokens(todayTokens) : '--', color: '#f59e0b', borderClass: 'border-amber-500/40', target: 'usage' },
    { icon: DollarSign, label: t('dashboard.kpi.totalCost'), value: totalCost > 0 ? `$${totalCost.toFixed(2)}` : '--', color: '#10b981', borderClass: 'border-emerald-500/40', target: 'usage' },
    { icon: MessageCircle, label: t('dashboard.kpi.channels'), value: `${activeChannels}/${totalChannels}`, color: '#06b6d4', borderClass: 'border-cyan-500/40', target: 'channel' },
    { icon: Bot, label: 'Agent', value: `${safeAgents.length}`, color: '#14b8a6', borderClass: 'border-teal-500/40', target: 'agent' },
    { icon: Puzzle, label: t('dashboard.kpi.skills'), value: skillCount > 0 ? `${eligibleSkills}/${skillCount}` : '0', color: '#ec4899', borderClass: 'border-pink-500/40', target: 'skill' },
    { icon: Calendar, label: t('dashboard.kpi.cronJobs'), value: `${safeCronJobs.length}`, color: '#0ea5e9', borderClass: 'border-sky-500/40', target: 'cron' },
    { icon: FileText, label: t('dashboard.kpi.logs'), value: isOnline ? t('dashboard.online') : t('dashboard.offline'), color: isOnline ? '#22c55e' : '#94a3b8', borderClass: isOnline ? 'border-green-500/40' : 'border-slate-500/40', target: 'run' },
  ];

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6">
      <div className="flex flex-col flex-1 min-h-0 pt-4">
        {/* 标题 + 绿线：固定在顶部 */}
        <div className="sticky top-0 z-10 shrink-0 pb-4 bg-[#0f172a]">
          <div className="flex items-start sm:items-center justify-between gap-2 mb-2">
            <div>
              <h1 className="text-base font-bold text-foreground">{t('dashboard.title')}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                {lastUpdate && (
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.updatedAt')}: {timeFormatter.format(lastUpdate)}
                  </p>
                )}
                {refreshCountdown > 0 && refreshCountdown < FAST_INTERVAL / 1000 && (
                  <span className="text-xs text-muted-foreground/70 tabular-nums">
                    {refreshCountdown}s {t('dashboard.refreshIn')}
                  </span>
                )}
              </div>
            </div>
            <button
              aria-label={t('common.refresh')}
              onClick={refreshAll}
              disabled={loading}
              className="h-9 w-9 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5 transition-all disabled:opacity-40 shrink-0"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
          </div>
          <div
            className={cn(
              'h-[3px] w-full transition-all duration-700 shrink-0',
              isOnline ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400' : 'bg-black/10 dark:bg-white/10'
            )}
          />
        </div>

        <div className="flex flex-col gap-y-4 sm:gap-y-6 flex-1 overflow-y-auto min-h-0 pb-8">
          {/* 资源告警：在 Gateway 上方 */}
          {hasResourceAlert && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{t('dashboard.resource.alert', { details: resourceAlerts.join('、') })}</span>
            </div>
          )}

          {/* Gateway 独立区域：仅包含 Gateway 面板，不包含 KPI 及其他 */}
          <div className="flex-shrink-0 w-full">
            <div
              className={cn(
                'relative overflow-hidden rounded-xl border-2 p-4 sm:p-5 w-full',
                isOnline
                  ? 'border-green-500/30 bg-[#1e293b]'
                  : 'border-amber-500/40 bg-[#1e293b]'
              )}
            >
            <div className="flex items-start sm:items-center gap-3 sm:gap-4">
              <div
                className={cn(
                  'w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shadow-inner shrink-0',
                  isOnline ? 'bg-green-500/15' : 'bg-slate-100 dark:bg-white/5'
                )}
              >
                <Router
                  className={cn(
                    'w-7 h-7 sm:w-8 sm:h-8',
                    isOnline ? 'text-green-500' : 'text-slate-400'
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-foreground">
                    Gateway
                  </h2>
                  <div
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-0.5 rounded-full',
                      isOnline ? 'bg-green-500/15' : 'bg-slate-200 dark:bg-white/10'
                    )}
                  >
                    <HealthDot ok={isOnline} />
                    <span
                      className={cn(
                        'text-xs font-bold uppercase',
                        isOnline ? 'text-green-500' : 'text-muted-foreground'
                      )}
                    >
                      {isOnline ? t('dashboard.running') : t('dashboard.stopped')}
                    </span>
                  </div>
                  {connectionVerified === null && (
                    <span className="text-xs text-amber-500">{t('dashboard.detecting')}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-5 gap-y-1 mt-1.5 text-xs text-muted-foreground items-center">
                  {gatewayStatus?.port && (
                    <span className="font-mono">
                      {`127.0.0.1:${gatewayStatus.port ?? 18789}`}
                    </span>
                  )}
                  {isOnline && (
                    <span className="flex items-center gap-1.5">
                      {t('dashboard.todayCost')}
                      <MiniSparkline data={sparklineData} color="#f59e0b" width={64} height={20} />
                      <span className="font-semibold text-amber-500">
                        ${(todayCost || 0).toFixed(2)}
                      </span>
                    </span>
                  )}
                </div>
              </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  {hasStartError && (
                    <span
                      className="flex items-center gap-1 text-[10px] text-red-400 max-w-[140px] truncate"
                      title={lastError || gatewayStatus?.error}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      {lastError || gatewayStatus?.error}
                    </span>
                  )}
                  <div className="flex gap-1">
                  {!isOnline ? (
                    <button
                      onClick={() => void handleStartGateway()}
                      disabled={isStarting}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-bold transition-colors flex items-center gap-1',
                        hasStartError
                          ? 'bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-500/20 border border-red-500/30'
                          : 'bg-green-500/10 text-green-600 dark:text-green-400 hover:bg-green-500/20'
                      )}
                    >
                      {isStarting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          {t('dashboard.starting')}
                        </>
                      ) : (
                        t('dashboard.start')
                      )}
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setShowRestartConfirm(true)}
                        disabled={restarting}
                        className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold hover:bg-amber-500/20 disabled:opacity-40 transition-colors"
                      >
                        {restarting ? t('dashboard.restarting') : t('dashboard.restart')}
                      </button>
                      <button
                        onClick={() => setShowStopConfirm(true)}
                        disabled={stopping}
                        className="px-2 py-1 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold hover:bg-red-500/20 disabled:opacity-40 transition-colors"
                      >
                        {stopping ? t('dashboard.stopping') : t('dashboard.stop')}
                      </button>
                      <button
                        onClick={handleShowLogs}
                        className="px-2 py-1 rounded-lg bg-slate-500/10 text-slate-600 dark:text-slate-400 text-xs font-bold hover:bg-slate-500/20 transition-colors"
                      >
                        {t('dashboard.logs')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          </div>

          {/* KPI 及以下所有面板：在 Gateway 父区域之外，与 Gateway 平级 */}
          <div className="flex flex-col gap-y-4 sm:gap-y-6 flex-shrink-0 w-full mt-6 sm:mt-8">
          {/* KPI 卡片 */}
          <div className="flex-shrink-0 w-full grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 sm:gap-5">
            {kpiCards.map((kpi) => (
              <button
                key={kpi.label}
                onClick={() => onNavigateTo?.(kpi.target)}
                className={cn(
                  'relative overflow-hidden rounded-xl border-2 p-3.5 text-start transition-all cursor-pointer group',
                  kpi.borderClass,
                  'bg-[#1e293b] hover:bg-[#334155]/50'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      {kpi.label}
                    </p>
                    <p className="text-base sm:text-lg font-black tabular-nums mt-0.5" style={{ color: kpi.color }}>
                      {kpi.value}
                    </p>
                  </div>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform"
                    style={{ background: `${kpi.color}15` }}
                  >
                    <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* 安全状态信息面板 (AxonClawX 风格：宿主机上方，始终显示) */}
          {(() => {
            const secCritical = alertSummary?.high ?? 0;
            const secWarn = alertSummary?.medium ?? 0;
            const secTotal = secCritical + secWarn;
            const secStatus = secCritical > 0 ? 'error' : secWarn > 0 ? 'warn' : 'ok';
            const borderClass = secStatus === 'error' ? 'border-red-500/40 bg-gradient-to-r from-red-500/10 to-transparent' : secStatus === 'warn' ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-transparent' : 'border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 to-transparent';
            const iconBgClass = secStatus === 'error' ? 'bg-red-500/10' : secStatus === 'warn' ? 'bg-amber-500/10' : 'bg-emerald-500/10';
            const iconColorClass = secStatus === 'error' ? 'text-red-500' : secStatus === 'warn' ? 'text-amber-500' : 'text-emerald-500';
            return (
              <button
                type="button"
                onClick={() => onNavigateTo?.('health')}
                className={cn('w-full rounded-xl border-2 p-3.5 text-start transition-all hover:shadow-md', borderClass)}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', iconBgClass)}>
                    {secStatus === 'ok' ? (
                      <ShieldCheck className={cn('w-5 h-5', iconColorClass)} />
                    ) : (
                      <Shield className={cn('w-5 h-5', iconColorClass)} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-foreground">{t('dashboard.security.title')}</p>
                      {secStatus === 'ok' && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-emerald-500/10 text-emerald-500">
                          {t('dashboard.security.allPassed')}
                        </span>
                      )}
                      {secCritical > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-500/10 text-red-500">
                          {t('dashboard.security.critical', { count: secCritical })}
                        </span>
                      )}
                      {secWarn > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-amber-500/10 text-amber-500">
                          {t('dashboard.security.warn', { count: secWarn })}
                        </span>
                      )}
                    </div>
                    {secTotal > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {t('dashboard.security.totalFindings', { count: secTotal })}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-primary shrink-0">
                    <span>{t('dashboard.viewDetails')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            );
          })()}

          {/* 宿主机信息 (AxonClawX) */}
          <div className="rounded-xl border-2 border-cyan-500/40 bg-[#1e293b] px-5 py-3.5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Monitor className="w-5 h-5 text-cyan-500" />
              <div>
                <h3 className="text-sm font-bold text-foreground">{t('dashboard.host.title')}</h3>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {hostInfo?.hostname || (loadingHostInfo ? t('dashboard.loading') : '--')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {hostInfo?.platform && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold capitalize">
                  {hostInfo.platform === 'darwin' ? 'macOS' : hostInfo.platform}
                </span>
              )}
              {hostInfo?.arch && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-500/20 text-slate-400 font-bold">
                  {hostInfo.arch}
                </span>
              )}
            </div>
          </div>

          {/* 主机信息：CPU | 系统内存 | 磁盘空间 (AxonClawX GaugeCards) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            <GaugeCard
              pct={hostInfo?.cpuUsage ?? 0}
              label={t('dashboard.cpuUsage')}
              color="#3b82f6"
              gradient="bg-[#1e293b]"
              borderColor="border-blue-500/40"
            >
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('dashboard.host.coresArch', { cores: hostInfo?.numCpu ?? 0, arch: hostInfo?.arch ?? '--' })}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('dashboard.host.coroutinesGc', { coroutines: hostInfo?.coroutineCount ?? 0, gc: hostInfo?.processMemory?.gcCount ?? 0 })}
              </p>
            </GaugeCard>
            <GaugeCard
              pct={hostInfo?.sysMem?.usedPct ?? 0}
              label={t('dashboard.systemMemory')}
              color="#8b5cf6"
              gradient="bg-[#1e293b]"
              borderColor="border-violet-500/40"
            >
              {hostInfo?.sysMem && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatBytes(hostInfo.sysMem.used)} / {formatBytes(hostInfo.sysMem.total)}
                </p>
              )}
            </GaugeCard>
            <GaugeCard
              pct={hostInfo?.diskUsage?.[0]?.usedPct ?? 0}
              label={t('dashboard.diskSpace')}
              color="#10b981"
              gradient="bg-[#1e293b]"
              borderColor="border-emerald-500/40"
            >
              {hostInfo?.diskUsage?.[0] ? (
                <>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatBytes(hostInfo.diskUsage[0].used)} / {formatBytes(hostInfo.diskUsage[0].total)}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-0.5">
                    {t('dashboard.host.diskFree', { free: formatBytes(hostInfo.diskUsage[0].free), path: hostInfo.diskUsage[0].path })}
                  </p>
                  <div className="h-1 bg-[#334155] rounded-full overflow-hidden mt-1">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${Math.min(hostInfo.diskUsage[0].usedPct, 100)}%`,
                        background:
                          hostInfo.diskUsage[0].usedPct > 90
                            ? '#ef4444'
                            : hostInfo.diskUsage[0].usedPct > 70
                              ? '#f59e0b'
                              : '#10b981',
                      }}
                    />
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground mt-0.5">{t('dashboard.noData')}</p>
              )}
            </GaugeCard>
          </div>

          {/* 路径信息 (AxonClawX) */}
          {hostInfo?.env?.cwd && hostInfo?.diskUsage?.[0] && (
            <div className="rounded-xl border-2 border-emerald-500/40 bg-[#1e293b] p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-emerald-500" />
                <span className="font-mono text-sm text-foreground truncate" title={hostInfo.env.cwd}>
                  {hostInfo.env.cwd}
                </span>
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {hostInfo.diskUsage[0].usedPct.toFixed(0)}% {formatBytes(hostInfo.diskUsage[0].used)}/{formatBytes(hostInfo.diskUsage[0].total)}
              </span>
            </div>
          )}

          {/* 协程数 | 进程运行 | 服务器运行 (AxonClawX) */}
          <div className="grid grid-cols-3 gap-6 sm:gap-8">
            <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4 text-center">
              <p className="text-2xl font-black tabular-nums text-indigo-400">{hostInfo?.coroutineCount ?? 0}</p>
              <p className="text-xs text-slate-400 mt-1">{t('dashboard.host.coroutines')}</p>
            </div>
            <div className="rounded-xl border-2 border-amber-500/40 bg-[#1e293b] p-4 text-center">
              <p className="text-2xl font-black tabular-nums text-amber-400">
                {hostInfo?.processUptime != null ? formatUptime(hostInfo.processUptime * 1000) : '--'}
              </p>
              <p className="text-xs text-slate-400 mt-1">{t('dashboard.host.processUptime')}</p>
            </div>
            <div className={cn(
              'rounded-xl border-2 bg-[#1e293b] p-4 text-center',
              isOnline ? 'border-emerald-500/40' : 'border-slate-500/40'
            )}>
              <p className={cn(
                'text-2xl font-black tabular-nums',
                isOnline ? 'text-emerald-400' : 'text-slate-400'
              )}>
                {hostInfo?.gatewayUptime != null ? formatUptime(hostInfo.gatewayUptime * 1000) : (isOnline ? t('dashboard.running') : t('dashboard.zeroHours'))}
              </p>
              <p className="text-xs text-slate-400 mt-1">{t('dashboard.host.serverUptime')}</p>
            </div>
          </div>

          {/* 进程内存 | 环境 (AxonClawX 风格) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div className="rounded-xl border-2 border-violet-500/40 bg-[#1e293b] p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                <RefreshCw className="w-3.5 h-3.5 text-violet-500" />
                {t('dashboard.processMemory.title')}
              </h3>
              {loadingHostInfo && !hostInfo ? (
                <div className="space-y-1.5 animate-pulse">
                  <div className="h-4 w-24 bg-[#334155]/50 rounded" />
                  <div className="h-4 w-20 bg-[#334155]/50 rounded" />
                </div>
              ) : hostInfo?.processMemory ? (
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                  <span className="text-muted-foreground">{t('dashboard.processMemory.heap')}</span>
                  <span className="font-mono text-blue-400">{formatBytes(hostInfo.processMemory.heapUsed)}</span>
                  <span className="text-muted-foreground">{t('dashboard.processMemory.stack')}</span>
                  <span className="font-mono text-blue-400">{formatBytes(hostInfo.processMemory.stackMemory ?? 0)}</span>
                  <span className="text-muted-foreground">{t('dashboard.processMemory.system')}</span>
                  <span className="font-mono text-foreground">{formatBytes(hostInfo.processMemory.rss)}</span>
                  <span className="text-muted-foreground">{t('dashboard.processMemory.gcCount')}</span>
                  <span className="font-mono text-emerald-500">{hostInfo.processMemory.gcCount ?? 0}</span>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t('dashboard.noData')}</p>
              )}
            </div>
            <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
                <FolderOpen className="w-3.5 h-3.5 text-indigo-500" />
                {t('dashboard.environment.title')}
              </h3>
              {hostInfo?.env ? (
                <div className="space-y-0.5 text-xs">
                  <p className="truncate"><span className="text-muted-foreground">{t('dashboard.environment.user')}</span> {hostInfo.env.user}</p>
                  <p className="truncate"><span className="text-muted-foreground">Shell</span> {hostInfo.env.shell.split('/').pop() || hostInfo.env.shell}</p>
                  <p className="truncate font-mono" title={hostInfo.env.cwd}>
                    <span className="text-muted-foreground">{t('dashboard.environment.cwd')}</span> {hostInfo.env.cwd.length > 24 ? '...' + hostInfo.env.cwd.slice(-21) : hostInfo.env.cwd}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">{t('dashboard.noData')}</p>
              )}
            </div>
          </div>

          {/* 中部：系统健康 | 最近异常事件 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
            <div className="lg:col-span-2 rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                  {t('dashboard.health.title')}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">
                  {t('dashboard.health.score', { score: computedHealthScore })}
                </span>
              </div>
              {alertSummary != null && (
                <div className="flex items-center gap-2 mb-3 flex-wrap flex-shrink-0">
                  <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-xs font-medium">{t('dashboard.health.high', { count: alertSummary.high })}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 text-xs font-medium">{t('dashboard.health.medium', { count: alertSummary.medium })}</span>
                  <span className="text-xs text-muted-foreground">
                    {t('dashboard.health.window', { count1h: alertSummary.count1h, count24h: alertSummary.count24h })}
                  </span>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 flex-shrink-0">
                <div className="rounded-lg border border-slate-600/40 bg-slate-800/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <HealthDot ok={isOnline} />
                    <span className="text-xs text-muted-foreground">{t('dashboard.health.gatewayStatus')}</span>
                  </div>
                  <p className={cn('text-sm font-semibold', isOnline ? 'text-emerald-500' : 'text-slate-400')}>{isOnline ? t('dashboard.healthy') : t('dashboard.offline')}</p>
                </div>
                <div className="rounded-lg border border-slate-600/40 bg-slate-800/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-xs text-muted-foreground">{t('dashboard.health.channels')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{activeChannels}/{totalChannels}</p>
                </div>
                <div className="rounded-lg border border-slate-600/40 bg-slate-800/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <HealthDot ok={true} />
                    <span className="text-xs text-muted-foreground">{t('dashboard.health.cron')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{t('dashboard.health.cronCount', { count: safeCronJobs.length })}</p>
                </div>
                <div className="rounded-lg border border-slate-600/40 bg-slate-800/30 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <HealthDot ok={true} />
                    <span className="text-xs text-muted-foreground">{t('dashboard.health.agents')}</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{safeAgents.length}</p>
                </div>
              </div>
              {/* 服务商状态（AxonClawX：真实数据，在趋势图上方） */}
              <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-indigo-500/20 flex-shrink-0">
                {safeProviders.length > 0 ? (
                  <>
                    {safeProviders.slice(0, 8).map((p) => (
                      <span key={p.id} className="flex items-center gap-1.5 text-xs">
                        <HealthDot ok={p.hasKey} />
                        <span className={cn('truncate max-w-[120px]', p.hasKey ? 'text-foreground' : 'text-muted-foreground')}>
                          {p.name || p.id}
                        </span>
                        <span className={cn('text-[10px]', p.hasKey ? 'text-emerald-500' : 'text-slate-500')}>
                          {p.hasKey ? t('dashboard.configured') : t('dashboard.notConfigured')}
                        </span>
                      </span>
                    ))}
                    <span className="text-xs text-muted-foreground">{t('dashboard.providers.status')}</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">{t('dashboard.providers.status')}</span>
                )}
              </div>
              {/* 今日费用 趋势（靠底部，无空白） */}
              <div className="flex-1 min-h-0 flex flex-col justify-end pt-3 border-t border-indigo-500/20">
                <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('dashboard.costTrend.title')}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span><span className="inline-block w-2 h-2 rounded-full bg-violet-500 mr-1" />{t('dashboard.costTrend.tokens')}</span>
                    <span>-</span>
                    <span><span className="inline-block w-2 h-2 rounded-full bg-amber-500 mr-1" />{t('dashboard.costTrend.cost')}</span>
                  </div>
                </div>
                <div ref={trendChartRef} className="flex-shrink-0 w-full min-w-0">
                  <DualTrendChart
                    data={trend.length ? trend.map((t) => ({ date: t.date, cost: t.cost, tokens: t.tokens ?? 0 })) : []}
                    colorTokens="#8b5cf6"
                    colorCost="#f59e0b"
                    width={trendChartWidth}
                    height={120}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-xl border-2 border-orange-500/40 bg-[#1e293b] p-4 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-3 flex-shrink-0">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-orange-500" />
                  {t('dashboard.recentIncidents')}
                </h3>
                {(alerts.length > 0 || logAbnormal.length > 0) && (
                  <button
                    onClick={() => onNavigateTo?.(alerts.length > 0 ? 'alerts' : 'logs')}
                    className="text-xs text-primary font-bold hover:underline"
                  >
                    {t('dashboard.viewAll')}
                  </button>
                )}
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-1.5">
                {(() => {
                  // 合并告警 + 日志解析的异常（AxonClawX：告警优先，不足时用日志补充）
                  const merged = [
                    ...alerts.slice(0, 5),
                    ...logAbnormal.slice(0, Math.max(0, 5 - alerts.length)),
                  ].slice(0, 5);
                  if (merged.length === 0) {
                    return <p className="text-xs text-muted-foreground py-4 text-center">{t('dashboard.noAlerts')}</p>;
                  }
                  return merged.map((a) => (
                    <div
                      key={a.id}
                      className={cn(
                        'flex items-start gap-2 px-2 py-1.5 rounded-lg text-xs',
                        a.level === 'critical' && 'bg-red-500/10 text-red-400',
                        a.level === 'warning' && 'bg-amber-500/10 text-amber-400',
                        a.level === 'info' && 'bg-blue-500/10 text-blue-400'
                      )}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{a.title}</p>
                        <p className="text-muted-foreground truncate">{a.message}</p>
                      </div>
                    </div>
                  ));
                })()}
              </div>
              {/* {t('dashboard.sevenDaysToken')}（靠面板底部，仅保留合适高度） */}
              <div className="flex-shrink-0 pt-4 mt-4 border-t border-orange-500/20">
                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-violet-500" />
                  {t('dashboard.sevenDaysToken')}
                </h3>
                <div className="flex items-baseline gap-4">
                  <span className="text-2xl font-black text-foreground tabular-nums">{fmtTokens(sevenDayTokens) || '--'}</span>
                  <span className="text-lg font-bold text-amber-500">${sevenDayCost.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 连接实例 */}
          <div className="rounded-xl border-2 border-blue-500/40 bg-[#1e293b] p-4">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-blue-500" />
              {t('dashboard.connections')} ({hostInfo?.connectionsCount ?? 0})
            </h3>
          </div>

          {/* 最近会话 */}
          <div className="rounded-xl border-2 border-indigo-500/40 bg-[#1e293b] p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                {t('dashboard.recentSessions')}
              </h3>
              {sessions.length > 6 && (
                <button
                  onClick={() => onNavigateTo?.('run')}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  {t('dashboard.viewAll')}
                </button>
              )}
            </div>
            <div className="space-y-1.5">
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                  <span className="text-xs">{loading ? t('dashboard.loadingEllipsis') : t('dashboard.noSessions')}</span>
                </div>
              ) : (
                sessions.slice(0, 6).map((session, i) => (
                  <button
                    key={session.sessionKey || i}
                    onClick={() => onNavigateTo?.('run')}
                    className="w-full flex items-center gap-3 py-1.5 px-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-start cursor-pointer group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center text-xs font-bold text-indigo-500">
                      {i + 1}
                    </div>
                    <span className="text-xs font-medium text-foreground truncate flex-1">
                      {session.label || session.sessionKey || t('dashboard.sessionNumber', { num: i + 1 })}
                    </span>
                    {(session.lastActivity || 0) > 0 && (
                      <span className="text-xs text-muted-foreground shrink-0">
                        {timeFormatter.format(new Date(session.lastActivity!))}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
          </div>
        </div>
      </div>
      </div>

      {/* 重启确认 */}
      <ConfirmDialog
        open={showRestartConfirm}
        title={t('dashboard.restartGateway')}
        message={t('dashboard.restartConfirmMessage')}
        confirmLabel={t('dashboard.restart')}
        cancelLabel={t('common.cancel')}
        variant="default"
        onConfirm={handleRestartGateway}
        onCancel={() => setShowRestartConfirm(false)}
      />

      {/* 停止确认 */}
      <ConfirmDialog
        open={showStopConfirm}
        title={t('dashboard.stopGateway')}
        message={t('dashboard.stopConfirmMessage')}
        confirmLabel={t('dashboard.stop')}
        cancelLabel={t('common.cancel')}
        variant="destructive"
        onConfirm={handleStopGateway}
        onCancel={() => setShowStopConfirm(false)}
      />

      {/* 日志弹窗 */}
      <Dialog open={showLogsModal} onOpenChange={setShowLogsModal}>
        <DialogContent className="sm:max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              {t('dashboard.systemLogs')}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-0 flex flex-col gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowLogs}
                disabled={loadingLogs}
                className="rounded-lg"
              >
                <RefreshCw className={cn('w-4 h-4 mr-1.5', loadingLogs && 'animate-spin')} />
                {t('common.refresh')}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenLogDir}
                className="rounded-lg"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                {t('dashboard.openLogDir')}
              </Button>
            </div>
            <pre className="flex-1 overflow-auto rounded-xl border border-slate-600/30 bg-slate-900/40 p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap break-words max-h-[50vh]">
              {loadingLogs ? t('dashboard.loadingEllipsis') : logContent || t('dashboard.noLogs')}
            </pre>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
};

export default DashboardView;
export { DashboardView };
