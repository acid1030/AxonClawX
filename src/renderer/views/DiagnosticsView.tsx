/**
 * AxonClaw - 健康中心（AxonClawX Doctor 布局对齐）
 * standalone：侧栏「健康中心」全页；embedded：系统 → 健康中心 Tab
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Wrench,
  ChevronRight,
  Activity,
  AlertTriangle,
  FlaskConical,
  Heart,
  Copy,
  LayoutGrid,
  Brain,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Grid3X3,
  ListOrdered,
  Gauge,
  Hash,
  Filter,
  Network,
  Lightbulb,
  Cpu,
} from 'lucide-react';
import { toast } from 'sonner';
import { useGatewayStore } from '@/stores/gateway';
import { useChannelsStore } from '@/stores/channels';
import { useSkillsStore } from '@/stores/skills';
import { useCronStore } from '@/stores/cron';
import { useAgentsStore } from '@/stores/agents';
import { invokeIpc } from '@/lib/api-client';
import { hostApiFetch } from '@/lib/host-api';
import { HealthDot } from '@/components/common/HealthDot';
import { PageHeader } from '@/components/common/PageHeader';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { cn } from '@/lib/utils';

type TimeRange = '1h' | '6h' | '24h';
const TIME_RANGE_KEY = 'axonclaw.doctor.timeRange';
const SOURCE_FILTER_KEY = 'axonclaw.doctor.sourceFilter';
const RISK_FILTER_KEY = 'axonclaw.doctor.riskFilter';

interface OverviewPoint {
  timestamp: string;
  label: string;
  healthScore: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
  errors: number;
}

interface CheckItem {
  id: string;
  code?: string;
  name: string;
  status: 'ok' | 'warn' | 'error';
  category?: string;
  detail: string;
  suggestion?: string;
  fixable?: boolean;
}

interface DoctorSummary {
  score: number;
  status: 'ok' | 'warn' | 'error';
  summary: string;
  updatedAt: string;
  gateway: { running: boolean; detail: string };
  healthCheck: { enabled: boolean; failCount: number; maxFails: number; lastOk: string };
  trend24h?: OverviewPoint[];
  exceptionStats: {
    medium5m: number;
    high5m: number;
    critical5m: number;
    total1h: number;
    total24h: number;
  };
  sessionErrors: { totalErrors: number; sessionCount: number; errorSessions: number };
  recentIssues: Array<{
    id: string;
    source: string;
    category: string;
    risk: string;
    title: string;
    detail?: string;
    timestamp: string;
  }>;
  securityAudit?: {
    critical: number;
    warn: number;
    total: number;
    items: Array<{ id: string; name: string; status: 'ok' | 'warn' | 'error'; detail: string; suggestion?: string }>;
  };
}

interface DiagResult {
  items: CheckItem[];
  summary: string;
  score: number;
}

interface DoctorCliResult {
  mode: 'diagnose' | 'fix';
  success: boolean;
  exitCode: number | null;
  stdout: string;
  stderr: string;
  command: string;
  cwd: string;
  durationMs: number;
  error?: string;
}

type TabId = 'diagnose' | 'testing';

function filterTrendByRange(trend: OverviewPoint[], range: TimeRange): OverviewPoint[] {
  if (!trend?.length) return [];
  const now = Date.now();
  const ms = range === '1h' ? 3_600_000 : range === '6h' ? 21_600_000 : 86_400_000;
  return trend.filter((p) => new Date(p.timestamp).getTime() >= now - ms);
}

function fmtRelativeTime(ts: string | undefined, t: (k: string, o?: any) => string, locale: string): string {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60_000) return t('diagnostics.justNow');
  if (diff < 3600_000) return t('diagnostics.minutesAgo', { count: Math.floor(diff / 60_000) });
  if (diff < 86400_000) return t('diagnostics.hoursAgo', { count: Math.floor(diff / 3600_000) });
  return new Date(ts).toLocaleString(locale === 'zh' ? 'zh-CN' : locale);
}

function detectSummarySourceKey(source?: string, category?: string): string {
  const s = `${source || ''} ${category || ''}`.toLowerCase();
  if (s.includes('security')) return 'security';
  if (s.includes('alert')) return 'alert';
  if (s.includes('gateway')) return 'gateway';
  if (s.includes('cron')) return 'cron';
  if (s.includes('chat') || s.includes('session')) return 'chat';
  if (s.includes('tool')) return 'tool';
  if (s.includes('doctor')) return 'doctor';
  return 'system';
}

const SOURCE_META: Record<string, { label: string; color: string }> = {
  security: { label: 'diagnostics.source.security', color: '#6366f1' },
  alert: { label: 'diagnostics.source.alert', color: '#ef4444' },
  gateway: { label: 'diagnostics.source.gateway', color: '#10b981' },
  cron: { label: 'diagnostics.source.cron', color: '#06b6d4' },
  chat: { label: 'diagnostics.source.chat', color: '#3b82f6' },
  tool: { label: 'diagnostics.source.tool', color: '#8b5cf6' },
  doctor: { label: 'diagnostics.source.doctor', color: '#f59e0b' },
  system: { label: 'diagnostics.source.system', color: '#64748b' },
};

interface DiagnosticsViewProps {
  embedded?: boolean;
  /** 侧栏「健康中心」独立全页 */
  standalone?: boolean;
  onNavigateTo?: (viewId: string) => void;
}

const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({ embedded, standalone, onNavigateTo }) => {
  const { t, i18n } = useTranslation();
  const gatewayStatus = useGatewayStore((s) => s.status);
  const channels = useChannelsStore((s) => s.channels);
  const skills = useSkillsStore((s) => s.skills);
  const cronJobs = useCronStore((s) => s.jobs);
  const agents = useAgentsStore((s) => s.agents);
  const fetchChannels = useChannelsStore((s) => s.fetchChannels);
  const fetchSkills = useSkillsStore((s) => s.fetchSkills);
  const fetchCronJobs = useCronStore((s) => s.fetchJobs);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);
  const rpc = useGatewayStore((s) => s.rpc);

  const [activeTab, setActiveTab] = useState<TabId>('diagnose');
  const [timeRange, setTimeRange] = useState<TimeRange>(() => {
    if (typeof window === 'undefined') return '24h';
    const v = window.localStorage.getItem(TIME_RANGE_KEY);
    return v === '1h' || v === '6h' || v === '24h' ? v : '24h';
  });
  const [summarySourceFilter, setSummarySourceFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    return window.localStorage.getItem(SOURCE_FILTER_KEY) || 'all';
  });
  const [summaryRiskFilter, setSummaryRiskFilter] = useState<string>(() => {
    if (typeof window === 'undefined') return 'all';
    return window.localStorage.getItem(RISK_FILTER_KEY) || 'all';
  });

  const [summary, setSummary] = useState<DoctorSummary | null>(null);
  const [result, setResult] = useState<DiagResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const [showFixConfirm, setShowFixConfirm] = useState(false);
  const [connectionVerified, setConnectionVerified] = useState<boolean | null>(null);
  const [doctorCli, setDoctorCli] = useState<DoctorCliResult | null>(null);
  const [doctorCliRunning, setDoctorCliRunning] = useState<'diagnose' | 'fix' | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<{
    agentId: string;
    provider?: string;
    embedding: { ok: boolean; error?: string };
  } | null>(null);
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [hostInfo, setHostInfo] = useState<{ sysMem?: { usedPct: number } } | null>(null);

  useEffect(() => {
    window.localStorage.setItem(TIME_RANGE_KEY, timeRange);
  }, [timeRange]);
  useEffect(() => {
    window.localStorage.setItem(SOURCE_FILTER_KEY, summarySourceFilter);
  }, [summarySourceFilter]);
  useEffect(() => {
    window.localStorage.setItem(RISK_FILTER_KEY, summaryRiskFilter);
  }, [summaryRiskFilter]);

  const loadHostInfo = useCallback(async () => {
    try {
      const data = await hostApiFetch<{ sysMem?: { usedPct: number } }>('/api/host-info');
      setHostInfo(data);
    } catch {
      setHostInfo(null);
    }
  }, []);

  useEffect(() => {
    void loadHostInfo();
  }, [loadHostInfo]);

  const checkConnection = useCallback(async () => {
    try {
      const r = await invokeIpc<{ success: boolean }>('gateway:checkConnection');
      setConnectionVerified(r?.success ?? false);
      return r?.success ?? false;
    } catch {
      setConnectionVerified(false);
      return false;
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await hostApiFetch<DoctorSummary>('/api/doctor/summary');
      setSummary(data);
    } catch (err) {
      console.error('[HealthCenter] loadSummary error:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  const runDoctor = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hostApiFetch<DiagResult>('/api/doctor');
      setResult(data);
      await loadSummary();
    } catch (err) {
      console.error('[HealthCenter] runDoctor error:', err);
    } finally {
      setLoading(false);
    }
  }, [loadSummary]);

  const loadMemoryStatus = useCallback(async () => {
    if (gatewayStatus.state !== 'running') {
      setMemoryStatus(null);
      return;
    }
    setMemoryLoading(true);
    try {
      const data = await rpc<{
        agentId: string;
        provider?: string;
        embedding: { ok: boolean; error?: string };
      }>('doctor.memory.status');
      setMemoryStatus(data);
    } catch {
      setMemoryStatus(null);
    } finally {
      setMemoryLoading(false);
    }
  }, [gatewayStatus.state, rpc]);

  const fetchAll = useCallback(async () => {
    await checkConnection();
    await Promise.all([
      fetchChannels().catch(() => {}),
      fetchSkills().catch(() => {}),
      fetchCronJobs().catch(() => {}),
      fetchAgents().catch(() => {}),
    ]);
    await loadSummary();
    await loadMemoryStatus();
    await loadHostInfo();
  }, [checkConnection, fetchChannels, fetchSkills, fetchCronJobs, fetchAgents, loadSummary, loadMemoryStatus, loadHostInfo]);

  const handleFix = useCallback(async () => {
    setShowFixConfirm(false);
    setFixing(true);
    try {
      await hostApiFetch('/api/doctor/fix', { method: 'POST', body: JSON.stringify({}) });
      await fetchAll();
      await runDoctor();
    } catch (err) {
      console.error('[HealthCenter] fix error:', err);
    } finally {
      setFixing(false);
    }
  }, [fetchAll, runDoctor]);

  const runOpenClawDoctor = useCallback(async (mode: 'diagnose' | 'fix') => {
    setDoctorCliRunning(mode);
    try {
      const res = await hostApiFetch<DoctorCliResult>('/api/app/openclaw-doctor', {
        method: 'POST',
        body: JSON.stringify({ mode }),
      });
      setDoctorCli(res);
      if (res.success) {
        toast.success(mode === 'fix' ? t('diagnostics.toast.fixDone') : t('diagnostics.toast.diagnoseDone'));
      } else {
        toast.error(res.error || t('diagnostics.toast.doctorFailed'));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error(msg);
      setDoctorCli({
        mode,
        success: false,
        exitCode: null,
        stdout: '',
        stderr: '',
        command: 'openclaw doctor',
        cwd: '',
        durationMs: 0,
        error: msg,
      });
    } finally {
      setDoctorCliRunning(null);
    }
  }, []);

  const copyDoctorOutput = useCallback(async () => {
    if (!doctorCli) return;
    const text = [
      `command: ${doctorCli.command}`,
      `cwd: ${doctorCli.cwd}`,
      `exitCode: ${doctorCli.exitCode ?? 'null'}`,
      `durationMs: ${doctorCli.durationMs}`,
      '',
      '[stdout]',
      doctorCli.stdout.trim() || '(empty)',
      '',
      '[stderr]',
      doctorCli.stderr.trim() || '(empty)',
    ].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success(t('diagnostics.toast.copyOk'));
    } catch {
      toast.error(t('diagnostics.toast.copyFailed'));
    }
  }, [doctorCli]);

  useEffect(() => {
    void checkConnection();
  }, [checkConnection]);
  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);
  useEffect(() => {
    if (connectionVerified) void fetchAll();
  }, [connectionVerified, fetchAll]);

  const isOnline = connectionVerified === true || (connectionVerified === null && gatewayStatus.state === 'running');
  const safeChannels = Array.isArray(channels) ? channels : [];
  const safeSkills = Array.isArray(skills) ? skills : [];
  const activeChannels = safeChannels.filter((c) => c.status === 'connected').length;
  const totalChannels = safeChannels.length || 1;
  const eligibleSkills = safeSkills.filter((s) => s.enabled || s.isCore).length;
  const totalSkills = safeSkills.length || 1;

  const allCheckItems: CheckItem[] = useMemo(() => {
    const base = result?.items ?? [];
    const extras: CheckItem[] = [
      {
        id: 'channels',
        name: t('diagnostics.items.channelStatus'),
        status: activeChannels > 0 ? 'ok' : totalChannels > 0 ? 'warn' : 'ok',
        category: 'channel',
        detail: t('diagnostics.items.channelDetail', { active: activeChannels, total: totalChannels }),
        fixable: false,
      },
      {
        id: 'skills',
        name: t('diagnostics.items.skillLoad'),
        status: totalSkills > 0 ? 'ok' : 'warn',
        category: 'skill',
        detail: t('diagnostics.items.skillDetail', { enabled: eligibleSkills, total: totalSkills }),
        fixable: false,
      },
      {
        id: 'cron',
        name: t('diagnostics.items.cronJobs'),
        status: (cronJobs?.length ?? 0) > 0 ? 'ok' : 'warn',
        category: 'cron',
        detail: t('diagnostics.items.cronDetail', { count: cronJobs?.length ?? 0 }),
        fixable: false,
      },
      {
        id: 'agents',
        name: 'Agent',
        status: (agents?.length ?? 0) > 0 ? 'ok' : 'warn',
        category: 'agent',
        detail: t('diagnostics.items.agentDetail', { count: agents?.length ?? 0 }),
        fixable: false,
      },
    ];
    return [...base, ...extras];
  }, [result?.items, activeChannels, totalChannels, eligibleSkills, totalSkills, cronJobs, agents]);

  const fixableCount = allCheckItems.filter((i) => i.fixable).length;
  const currentStatus = summary?.status ?? (isOnline ? 'ok' : 'error');
  const currentScore = summary?.score ?? result?.score ?? (isOnline ? 85 : 50);
  const numericScore = Math.min(100, Math.max(0, currentScore));

  // 评分分段：同时驱动顶部细线、边框、文字色
  const scoreLevel =
    numericScore >= 90 ? 'excellent' : numericScore >= 75 ? 'good' : numericScore >= 60 ? 'watch' : 'risk';
  const scoreLabel =
    numericScore >= 90 ? t('diagnostics.score.excellent') : numericScore >= 75 ? t('diagnostics.score.good') : numericScore >= 60 ? t('diagnostics.score.attention') : t('diagnostics.score.risk');
  const scoreBorderClass =
    scoreLevel === 'excellent'
      ? 'border-emerald-500/40 bg-gradient-to-br from-emerald-500/[0.07] via-[#0f172a] to-[#0f172a]'
      : scoreLevel === 'good'
        ? 'border-sky-500/40 bg-gradient-to-br from-sky-500/[0.07] via-[#0f172a] to-[#0f172a]'
        : scoreLevel === 'watch'
          ? 'border-amber-500/40 bg-gradient-to-br from-amber-500/[0.08] via-[#0f172a] to-[#0f172a]'
          : 'border-red-500/40 bg-gradient-to-br from-red-500/[0.08] via-[#0f172a] to-[#0f172a]';
  const scoreBarClass =
    scoreLevel === 'excellent'
      ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400'
      : scoreLevel === 'good'
        ? 'bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400'
        : scoreLevel === 'watch'
          ? 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400'
          : 'bg-gradient-to-r from-red-400 via-red-500 to-red-400';
  const gaugeColor =
    numericScore >= 80 ? '#10b981' : numericScore >= 60 ? '#f59e0b' : numericScore >= 30 ? '#f97316' : '#ef4444';
  const scoreTextClass =
    scoreLevel === 'excellent' ? 'text-emerald-400' : scoreLevel === 'good' ? 'text-sky-400' : scoreLevel === 'watch' ? 'text-amber-400' : 'text-red-400';

  const gaugeRadius = 52;
  const gaugeCircumference = Math.PI * gaugeRadius;
  const gaugeOffset = gaugeCircumference - (numericScore / 100) * gaugeCircumference;

  const trend = useMemo(
    () => filterTrendByRange(summary?.trend24h ?? [], timeRange),
    [summary?.trend24h, timeRange],
  );

  const trendPolyline = useMemo(() => {
    if (trend.length < 2) return '';
    return trend
      .map((p, i) => {
        const x = (i / Math.max(trend.length - 1, 1)) * 100;
        const y = 100 - p.healthScore;
        return `${x},${y}`;
      })
      .join(' ');
  }, [trend]);

  const trendFillPoints = useMemo(() => {
    if (!trendPolyline) return '';
    return `${trendPolyline} 100,100 0,100`;
  }, [trendPolyline]);

  const chatSessionErrors = useMemo(() => {
    const issues = summary?.recentIssues ?? [];
    const chatIssues = issues.filter((i) => detectSummarySourceKey(i.source, i.category) === 'chat');
    return {
      totalErrors: Math.max(summary?.sessionErrors?.totalErrors ?? 0, chatIssues.length),
      errorSessions: summary?.sessionErrors?.errorSessions ?? new Set(chatIssues.map((x) => x.id)).size,
    };
  }, [summary?.recentIssues, summary?.sessionErrors]);

  const deductions = useMemo(() => {
    if (!summary) return [];
    const stats = summary.exceptionStats || {
      medium5m: 0,
      high5m: 0,
      critical5m: 0,
      total1h: 0,
      total24h: 0,
    };
    const gw = summary.gateway;
    const hc = summary.healthCheck;
    const items: Array<{ key: string; label: string; points: number; maxPoints: number; color: string }> = [];
    if (!gw?.running) items.push({ key: 'gateway', label: t('diagnostics.deductions.gatewayOffline'), points: 35, maxPoints: 35, color: '#ef4444' });
    const critPts = Math.min(50, (stats.critical5m || 0) * 25);
    if (critPts > 0)
      items.push({ key: 'critical', label: t('diagnostics.deductions.critical5m'), points: critPts, maxPoints: 50, color: '#ef4444' });
    const highPts = Math.min(30, (stats.high5m || 0) * 10);
    if (highPts > 0) items.push({ key: 'high', label: t('diagnostics.deductions.high5m'), points: highPts, maxPoints: 30, color: '#f97316' });
    const medPts = Math.min(10, (stats.medium5m || 0) * 2);
    if (medPts > 0) items.push({ key: 'medium', label: t('diagnostics.deductions.medium5m'), points: medPts, maxPoints: 10, color: '#f59e0b' });
    if (hc?.enabled && (hc.failCount || 0) > 0) {
      const hcPts = Math.min(25, (hc.failCount || 0) * 10);
      items.push({ key: 'healthcheck', label: t('diagnostics.deductions.watchdogFail'), points: hcPts, maxPoints: 25, color: '#8b5cf6' });
    }
    if (chatSessionErrors.totalErrors > 0) {
      const sessPts = Math.min(10, (chatSessionErrors.errorSessions || 1) * 3);
      items.push({ key: 'session', label: t('diagnostics.deductions.sessionErrors'), points: sessPts, maxPoints: 10, color: '#ec4899' });
    }
    const sec = summary.securityAudit;
    if (sec && sec.critical > 0) {
      const secPts = Math.min(40, sec.critical * 15);
      items.push({ key: 'security', label: t('diagnostics.summary.securityAudit'), points: secPts, maxPoints: 40, color: '#6366f1' });
    }
    return items.sort((a, b) => b.points - a.points);
  }, [summary, chatSessionErrors]);

  const sourceDistribution = useMemo(() => {
    const issues = summary?.recentIssues || [];
    const counts = new Map<string, number>();
    issues.forEach((issue) => {
      const k = detectSummarySourceKey(issue.source, issue.category);
      counts.set(k, (counts.get(k) || 0) + 1);
    });
    return Array.from(counts.entries())
      .filter(([, c]) => c > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([key, count]) => ({
        key,
        count,
        label: t(SOURCE_META[key]?.label || key),
        color: SOURCE_META[key]?.color || '#64748b',
      }));
  }, [summary?.recentIssues]);

  const sourceTotal = sourceDistribution.reduce((s, d) => s + d.count, 0);

  /** {t('diagnostics.suggestedActions')}（AxonClawX）：根据扣分和问题动态生成 */
  const suggestedActions = useMemo(() => {
    const actions: Array<{ label: string; risk: string; onClick?: () => void }> = [];
    if ((summary?.recentIssues?.length ?? 0) > 0) {
      actions.push({ label: t('diagnostics.actions.viewAlerts'), risk: 'medium', onClick: () => onNavigateTo?.('alerts') });
    }
    if (!summary?.gateway?.running || deductions.some((d) => d.key === 'gateway')) {
      actions.push({ label: t('diagnostics.actions.openGatewayEvents'), risk: 'low', onClick: () => onNavigateTo?.('gateway-monitor') });
    }
    if (deductions.some((d) => d.key === 'healthcheck')) {
      actions.push({ label: t('diagnostics.actions.checkWatchdog'), risk: 'high', onClick: () => onNavigateTo?.('gateway-monitor') });
    }
    if (actions.length === 0) {
      actions.push({ label: t('diagnostics.actions.viewAlerts'), risk: 'low', onClick: () => onNavigateTo?.('alerts') });
    }
    return actions;
  }, [summary?.recentIssues?.length, summary?.gateway?.running, deductions, onNavigateTo]);

  const filteredIssues = useMemo(() => {
    let list = summary?.recentIssues ?? [];
    if (summarySourceFilter !== 'all') {
      list = list.filter((i) => detectSummarySourceKey(i.source, i.category) === summarySourceFilter);
    }
    if (summaryRiskFilter !== 'all') {
      list = list.filter((i) => i.risk === summaryRiskFilter);
    }
    return list;
  }, [summary?.recentIssues, summarySourceFilter, summaryRiskFilter]);

  const heatmapHours = useMemo(() => {
    const pts = summary?.trend24h ?? [];
    const buckets = new Array(24).fill(0);
    pts.forEach((p) => {
      const h = new Date(p.timestamp).getHours();
      buckets[h] += p.medium + p.high + p.critical;
    });
    const max = Math.max(1, ...buckets);
    return { buckets, max };
  }, [summary?.trend24h]);

  /** AxonClawX 风格：source × hour 二维热力图数据，行=来源，列=0-23时 */
  const heatmapSourceHours = useMemo(() => {
    const issues = summary?.recentIssues ?? [];
    const grid = new Map<string, number[]>();
    const initRow = () => Array.from({ length: 24 }, () => 0);
    issues.forEach((issue) => {
      const k = detectSummarySourceKey(issue.source, issue.category);
      if (!grid.has(k)) grid.set(k, initRow());
      const row = grid.get(k)!;
      const h = new Date(issue.timestamp).getHours();
      row[h] += 1;
    });
    const rows = Array.from(grid.entries())
      .map(([key, buckets]) => ({ key, label: t(SOURCE_META[key]?.label || key), color: SOURCE_META[key]?.color || '#64748b', buckets }))
      .sort((a, b) => b.buckets.reduce((s, v) => s + v, 0) - a.buckets.reduce((s, v) => s + v, 0));
    const maxVal = Math.max(1, ...rows.flatMap((r) => r.buckets));
    if (rows.length === 0) {
      return { rows: [{ key: 'gateway', label: t('diagnostics.summary.gateway'), color: '#10b981', buckets: initRow() }, { key: 'security', label: t('diagnostics.summary.securityAudit'), color: '#6366f1', buckets: initRow() }], maxVal: 1 };
    }
    return { rows, maxVal };
  }, [summary?.recentIssues]);

  const headerActions = (
    <div className="flex items-center gap-2 flex-wrap justify-end">
      <span
        className={cn(
          'px-2.5 py-1 rounded-lg text-xs font-bold',
          scoreLevel === 'excellent' && 'bg-emerald-500/10 text-emerald-400',
          scoreLevel === 'good' && 'bg-sky-500/10 text-sky-400',
          scoreLevel === 'watch' && 'bg-amber-500/10 text-amber-400',
          scoreLevel === 'risk' && 'bg-red-500/10 text-red-400',
        )}
      >
        {scoreLabel} · {numericScore}
      </span>
      {summaryLoading && <span className="text-xs text-muted-foreground animate-pulse">{t('diagnostics.syncing')}</span>}
      {activeTab === 'diagnose' && (
        <>
          <button
            type="button"
            onClick={() => void runDoctor()}
            disabled={loading}
            className="h-8 px-3 rounded-lg text-xs font-bold border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:border-amber-500/50 disabled:opacity-50 flex items-center gap-1.5"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            {loading ? t('diagnostics.diagnosing') : t('diagnostics.diagnoseNow')}
          </button>
          <button
            type="button"
            onClick={() => setShowFixConfirm(true)}
            disabled={fixing || fixableCount === 0}
            className="h-8 px-3 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40"
          >
            {fixing ? t('diagnostics.fixing') : t('diagnostics.fixNow')}
          </button>
        </>
      )}
    </div>
  );

  const tabRow = (
    <div className="flex items-center gap-2 overflow-x-auto pt-3 pb-2 shrink-0">
      {(
        [
          { id: 'diagnose' as TabId, icon: Activity, label: t('diagnostics.tabs.diagnose') },
          { id: 'testing' as TabId, icon: FlaskConical, label: t('diagnostics.tabs.testing') },
        ] as const
      ).map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => setActiveTab(tab.id)}
          className={cn(
            'h-10 px-5 rounded-xl text-sm font-bold flex items-center gap-2 whitespace-nowrap transition-all',
            activeTab === tab.id
              ? 'bg-sky-900/80 text-sky-400 border border-sky-500/30'
              : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10 hover:text-foreground/80',
          )}
        >
          <tab.icon className="w-4 h-4 shrink-0" />
          {tab.label}
        </button>
      ))}
    </div>
  );

  const diagnoseBody = (
    <div className="space-y-4 w-full pt-4 pb-16">
      {summary && (
        <div>
          <div
            className={cn(
              'rounded-2xl border-2 p-5 shadow-lg overflow-hidden',
              scoreBorderClass,
            )}
          >
            <div className="flex flex-col lg:flex-row items-start gap-6">
            <div className="shrink-0 flex flex-col items-center mx-auto lg:mx-0">
              {/* 评分置于{t('diagnostics.snapshot.title')}上方 */}
              <p className={cn('text-2xl font-black tabular-nums mb-0.5', scoreTextClass)}>{numericScore}</p>
              <p className={cn('text-[10px] font-bold mb-2', scoreTextClass)}>{scoreLabel}</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t('diagnostics.snapshot.title')}</p>
              <svg viewBox="0 0 120 72" className="w-36 h-auto">
                <path
                  d="M 10 65 A 52 52 0 0 1 110 65"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="9"
                  className="text-slate-700"
                  strokeLinecap="round"
                />
                <path
                  d="M 10 65 A 52 52 0 0 1 110 65"
                  fill="none"
                  stroke={gaugeColor}
                  strokeWidth="9"
                  strokeLinecap="round"
                  strokeDasharray={gaugeCircumference}
                  strokeDashoffset={gaugeOffset}
                  className="transition-all duration-700"
                />
              </svg>
            </div>
            <div className="flex-1 min-w-0 space-y-3">
              <p className="text-sm font-semibold text-foreground leading-relaxed">{summary.summary}</p>
              <p className="text-[10px] text-muted-foreground">{t('diagnostics.snapshot.updatedAt')}: {summary.updatedAt ? new Date(summary.updatedAt).toLocaleString(i18n.language === 'zh' ? 'zh-CN' : i18n.language) : '—'}</p>
              <div className="flex items-center gap-1 mt-2 flex-wrap">
                {(['1h', '6h', '24h'] as TimeRange[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTimeRange(r)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all',
                      timeRange === r ? 'bg-sky-600 text-white' : 'bg-white/5 text-muted-foreground hover:bg-white/10',
                    )}
                  >
                    {r === '1h' ? t('diagnostics.range.1h') : r === '6h' ? t('diagnostics.range.6h') : t('diagnostics.range.24h')}
                  </button>
                ))}
                <span className="text-[10px] text-muted-foreground/70 ml-1.5">{t('diagnostics.snapshot.windowHint')}</span>
              </div>
            </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2.5 mt-6">
            <button
              type="button"
              onClick={() => onNavigateTo?.('gateway-monitor')}
              className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-start hover:border-emerald-500/35 transition-colors"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('diagnostics.gateway.title')}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className={cn('text-sm font-bold', summary.gateway?.running ? 'text-emerald-400' : 'text-red-400')}>
                  {summary.gateway?.running ? t('diagnostics.gateway.ok') : t('diagnostics.gateway.offline')}
                </p>
                {summary.gateway?.running ? <ArrowUp className="w-3.5 h-3.5 text-emerald-400" /> : <ArrowDown className="w-3.5 h-3.5 text-red-400" />}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{summary.gateway?.detail || '—'}</p>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTo?.('gateway-monitor')}
              className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-start hover:border-violet-500/35 transition-colors"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Heart className="w-3 h-3 text-violet-400" />
                {t('diagnostics.healthCheck.title')}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className={cn('text-sm font-bold', summary.healthCheck?.enabled ? 'text-violet-300' : 'text-white/70')}>
                  {summary.healthCheck?.enabled ? `${summary.healthCheck.failCount || 0}/${summary.healthCheck.maxFails || 3}` : t('diagnostics.healthCheck.off')}
                </p>
                {summary.healthCheck?.enabled && (summary.healthCheck.failCount || 0) > 0 && (
                  <ArrowUp className="w-3.5 h-3.5 text-red-400" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">
                {summary.healthCheck?.lastOk ? new Date(summary.healthCheck.lastOk).toLocaleTimeString('zh-CN') : '—'}
              </p>
            </button>
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-start">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('diagnostics.recent5m')}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-sm font-bold text-foreground">
                  {summary.exceptionStats?.critical5m ?? 0} / {summary.exceptionStats?.high5m ?? 0} /{' '}
                  {summary.exceptionStats?.medium5m ?? 0}
                </p>
                {((summary.exceptionStats?.critical5m ?? 0) + (summary.exceptionStats?.high5m ?? 0)) > 0 && (
                  <ArrowUp className="w-3.5 h-3.5 text-red-400" />
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">{t('diagnostics.severityLegend')}</p>
            </div>
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-start">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('diagnostics.recentTotal')}</p>
              <p className="text-sm font-bold text-foreground mt-1">
                {summary.exceptionStats?.total1h ?? 0} <span className="text-white/30">/</span>{' '}
                {summary.exceptionStats?.total24h ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">{t('diagnostics.windowLegend')}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTo?.('alerts')}
              className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-start hover:border-amber-500/35"
            >
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{t('diagnostics.sessionErrors')}</p>
              <p
                className={cn(
                  'text-sm font-bold mt-1',
                  (summary.sessionErrors?.totalErrors ?? 0) > 0 ? 'text-pink-400' : 'text-foreground',
                )}
              >
                {summary.sessionErrors?.totalErrors ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {t('diagnostics.sessionErrorsDetail', { errors: summary.sessionErrors?.totalErrors ?? 0, sessions: summary.sessionErrors?.errorSessions ?? 0 })}
              </p>
            </button>
            <div className="rounded-xl bg-white/[0.04] border border-white/10 p-3 text-start">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                <Brain className="w-3 h-3 text-slate-400" />
                {t('diagnostics.memory.title')}
              </p>
              {memoryLoading ? (
                <div className="flex items-center gap-1 mt-1">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                </div>
              ) : memoryStatus?.embedding?.ok ? (
                <>
                  <p className="text-sm font-bold text-emerald-400 mt-1">OK</p>
                  <p className="text-[10px] text-muted-foreground mt-1 truncate">{memoryStatus.provider || '—'}</p>
                </>
              ) : (
                <p className="text-sm font-bold text-amber-400 mt-1">{t('diagnostics.memory.unavailable')}</p>
              )}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* {t('diagnostics.anomalySource')}（AxonClawX 环形图风格） */}
      <div className="rounded-xl border border-white/10 bg-black/15 p-4">
        <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <LayoutGrid className="w-3.5 h-3.5" />
          {t('diagnostics.anomalySource')}
        </h4>
        <div className="flex flex-wrap items-center gap-6">
          <div className="relative w-28 h-28 shrink-0">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              {sourceDistribution.length > 0 ? (
                sourceDistribution.reduce<{ offset: number; els: JSX.Element[] }>(
                  (acc, s, i) => {
                    const pct = s.count / sourceTotal;
                    const dash = pct * 100;
                    acc.els.push(
                      <circle
                        key={s.key}
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke={s.color}
                        strokeWidth="3"
                        strokeDasharray={`${dash} ${100 - dash}`}
                        strokeDashoffset={-acc.offset}
                        className="transition-all duration-300"
                      />,
                    );
                    acc.offset += dash;
                    return acc;
                  },
                  { offset: 0, els: [] },
                ).els
              ) : (
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="currentColor" strokeWidth="2" className="text-white/10" />
              )}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">{sourceTotal}</span>
              <span className="text-[10px] text-muted-foreground ml-0.5">{t('diagnostics.total')}</span>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            {sourceDistribution.slice(0, 6).map((s) => (
              <div key={s.key} className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground" style={{ color: s.color }}>{s.label}</span>
                <span className="text-[11px] font-mono font-semibold">{s.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* {t('diagnostics.heatmap.title')}（AxonClawX 风格：source × hour 二维网格） */}
      <div className="rounded-xl border border-white/10 bg-black/15 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Grid3X3 className="w-3.5 h-3.5" />
            {t('diagnostics.heatmap.title')}
          </h4>
          <p className="text-[10px] text-muted-foreground/70">{t('diagnostics.heatmap.hint')}</p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[480px]">
            <div className="flex gap-0.5 mb-1 text-[9px] text-muted-foreground/70 font-mono items-center">
              <span className="w-14 shrink-0" />
              <div className="flex-1 flex">
                {[0, 4, 8, 12, 16, 20].map((h) => (
                  <span key={h} className="flex-1 text-center">{h.toString().padStart(2, '0')}</span>
                ))}
              </div>
            </div>
            {heatmapSourceHours.rows.map((row) => (
              <div key={row.key} className="flex items-center gap-1 mb-1">
                <span className="w-14 shrink-0 text-[10px] text-muted-foreground truncate" style={{ color: row.color }}>{row.label}</span>
                <div className="flex-1 flex gap-0.5">
                  {row.buckets.map((v, i) => {
                    const intensity = v / heatmapSourceHours.maxVal;
                    return (
                      <div
                        key={i}
                        className="flex-1 min-w-0 h-4 rounded-sm transition-colors"
                        style={{
                          backgroundColor: intensity > 0 ? `${row.color}` : 'rgba(255,255,255,0.03)',
                          opacity: intensity > 0 ? 0.2 + intensity * 0.8 : 0.1,
                        }}
                        title={`${row.label} ${i}:00 — ${v} ${t('diagnostics.anomaly')}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {trend.length >= 2 && (
        <div className="rounded-xl border border-white/10 bg-black/20 p-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5" />
            {t('diagnostics.trend.title')}
          </h4>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-28">
            <defs>
              <linearGradient id="hcTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={gaugeColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={gaugeColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon fill="url(#hcTrendFill)" points={trendFillPoints} />
            <polyline
              fill="none"
              stroke={gaugeColor}
              strokeWidth="0.6"
              vectorEffect="non-scaling-stroke"
              points={trendPolyline}
            />
          </svg>
          <p className="text-[10px] text-muted-foreground text-center mt-1">{t('diagnostics.trend.hint')}</p>
        </div>
      )}

      {deductions.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <BarChart3 className="w-3 h-3" />
              {t('diagnostics.deductions.title')} <span className="font-bold text-red-400">-{deductions.reduce((s, d) => s + d.points, 0)}</span>
            </p>
            <p className="text-[10px] text-muted-foreground/70">{t('diagnostics.deductions.hint')}</p>
          </div>
          <div className="flex flex-wrap gap-4">
            {deductions.map((d) => {
              const pct = Math.min(1, d.points / d.maxPoints);
              const r = 18;
              const circ = Math.PI * r;
              return (
                <div key={d.key} className="flex items-center gap-2 min-w-[100px]">
                  <svg viewBox="0 0 44 26" className="w-10 h-6 shrink-0">
                    <path d="M 4 24 A 18 18 0 0 1 40 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-white/10" strokeLinecap="round" />
                    <path
                      d="M 4 24 A 18 18 0 0 1 40 24"
                      fill="none"
                      stroke={d.color}
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={circ}
                      strokeDashoffset={circ - pct * circ}
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div>
                    <p className="text-[10px] text-foreground/70 truncate">{d.label}</p>
                    <p className="text-sm font-bold leading-tight" style={{ color: d.color }}>-{d.points}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border-2 border-slate-600/40 bg-[#1e293b]/80 p-4 backdrop-blur-sm">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2 mb-4">
          <Wrench className="w-3.5 h-3.5" />
          {t('diagnostics.checkItems')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {allCheckItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                'rounded-xl border-2 p-3 transition-shadow',
                item.status === 'ok' && 'border-emerald-500/30 bg-emerald-500/[0.04]',
                item.status === 'warn' && 'border-amber-500/30 bg-amber-500/[0.04]',
                item.status === 'error' && 'border-red-500/30 bg-red-500/[0.04]',
              )}
            >
              <div className="flex items-center gap-2 mb-2">
                <HealthDot ok={item.status === 'ok'} />
                <span className="text-sm font-medium text-foreground">{item.name}</span>
                {item.status === 'ok' && <CheckCircle2 className="w-4 h-4 text-emerald-500 ml-auto" />}
                {item.status === 'error' && <XCircle className="w-4 h-4 text-red-500 ml-auto" />}
                {item.status === 'warn' && <AlertCircle className="w-4 h-4 text-amber-500 ml-auto" />}
              </div>
              <p className="text-xs text-muted-foreground">{item.detail}</p>
              {item.suggestion && (
                <p className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  {item.suggestion}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom area (AxonClawX): left {t('diagnostics.issues.title')} + right 2x2 metrics + {t('diagnostics.suggestedActions')} */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-xl border border-white/10 bg-black/15 p-4">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
            <ListOrdered className="w-3.5 h-3.5" />
            {t('diagnostics.issues.title')}
          </h4>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {[
              { id: 'all', icon: Filter, label: t('diagnostics.filter.all') },
              { id: 'gateway', icon: Network, label: t('diagnostics.summary.gateway') },
              { id: 'security', icon: Shield, label: t('diagnostics.summary.securityAudit') },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSummarySourceFilter(f.id === 'all' ? 'all' : f.id)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                  summarySourceFilter === (f.id === 'all' ? 'all' : f.id)
                    ? 'bg-sky-600 text-white'
                    : 'bg-white/5 text-muted-foreground hover:bg-white/10',
                )}
              >
                <f.icon className="w-3 h-3" />
                {f.label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3 text-[10px]">
            <span className="text-muted-foreground">{t('diagnostics.count.all')} <span className="font-mono font-semibold text-foreground">{filteredIssues.length}</span></span>
            <span className="text-red-400">{t('diagnostics.risk.critical')} <span className="font-mono">{filteredIssues.filter((i) => i.risk === 'critical').length}</span></span>
            <span className="text-orange-400">{t('diagnostics.risk.high')} <span className="font-mono">{filteredIssues.filter((i) => i.risk === 'high').length}</span></span>
            <span className="text-amber-400">{t('diagnostics.risk.medium')} <span className="font-mono">{filteredIssues.filter((i) => i.risk === 'medium').length}</span></span>
          </div>
          <div className="relative pl-4 border-l border-dashed border-white/20 space-y-3 max-h-64 overflow-y-auto">
            {filteredIssues.slice(0, 12).map((issue) => (
              <div
                key={issue.id}
                className={cn(
                  'rounded-lg border p-3 -ml-px pl-3',
                  issue.risk === 'critical' && 'bg-red-500/10 border-red-500/25',
                  issue.risk === 'high' && 'bg-orange-500/10 border-orange-500/25',
                  issue.risk === 'medium' && 'bg-amber-500/10 border-amber-500/25',
                  issue.risk === 'low' && 'bg-blue-500/10 border-blue-500/25',
                  !['critical', 'high', 'medium', 'low'].includes(issue.risk) && 'bg-white/5 border-white/10',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <Shield className="w-4 h-4 shrink-0 mt-0.5 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground line-clamp-2">{issue.title}</p>
                      {issue.detail && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{issue.detail}</p>}
                    </div>
                  </div>
                  <span className={cn(
                    'shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold',
                    issue.risk === 'critical' && 'bg-red-500/30 text-red-300',
                    issue.risk === 'high' && 'bg-orange-500/30 text-orange-300',
                    issue.risk === 'medium' && 'bg-amber-500/30 text-amber-300',
                    issue.risk === 'low' && 'bg-blue-500/30 text-blue-300',
                  )}>
                    {issue.risk === 'critical' ? t('diagnostics.risk.critical') : issue.risk === 'high' ? t('diagnostics.risk.high') : issue.risk === 'medium' ? t('diagnostics.risk.medium') : t('diagnostics.risk.low')}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">{fmtRelativeTime(issue.timestamp)}</p>
              </div>
            ))}
            
            {filteredIssues.length === 0 && (
              <p className="text-xs text-muted-foreground py-4">{t('diagnostics.noIssues')}</p>
            )}
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Gauge className="w-3 h-3" />
                {t('diagnostics.cards.gatewayAvailability')}
              </h4>
              <p className={cn(
                'text-3xl font-black tabular-nums',
                summary?.gateway?.running ? 'text-emerald-400' : 'text-red-400',
              )}>
                {summary?.gateway?.running ? '100' : '0'}%
              </p>
              <span className={cn('inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold', summary?.gateway?.running ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400')}>
                {summary?.gateway?.running ? t('diagnostics.status.ok') : t('diagnostics.status.bad')}
              </span>
              <p className="text-[9px] text-muted-foreground mt-1">{t('diagnostics.cards.gatewayPassRate')}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Hash className="w-3 h-3" />
                {t('diagnostics.cards.events24h')}
              </h4>
              <p className="text-2xl font-black tabular-nums text-foreground">{summary?.exceptionStats?.total24h ?? 0}</p>
              <span className={cn('inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold', ((summary?.exceptionStats?.high5m ?? 0) + (summary?.exceptionStats?.critical5m ?? 0)) > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400')}>
                {((summary?.exceptionStats?.high5m ?? 0) + (summary?.exceptionStats?.critical5m ?? 0)) > 0 ? t('diagnostics.status.bad') : t('diagnostics.status.ok')}
              </span>
              <p className="text-[9px] text-muted-foreground mt-1">{t('diagnostics.cards.eventsHint')}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                {t('diagnostics.cards.anomalies1h')}
              </h4>
              <p className="text-2xl font-black tabular-nums text-foreground">{summary?.exceptionStats?.total1h ?? 0}</p>
              <span className={cn('inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold', (summary?.exceptionStats?.total1h ?? 0) > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400')}>
                {(summary?.exceptionStats?.total1h ?? 0) > 0 ? t('diagnostics.status.bad') : t('diagnostics.status.ok')}
              </span>
              <p className="text-[9px] text-muted-foreground mt-1">{t('diagnostics.cards.anomaliesHint')}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/15 p-4">
              <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Cpu className="w-3 h-3" />
                {t('diagnostics.cards.memoryPressure')}
              </h4>
              <p className={cn('text-2xl font-black tabular-nums', (hostInfo?.sysMem?.usedPct ?? 0) > 90 ? 'text-red-400' : 'text-emerald-400')}>
                {hostInfo?.sysMem?.usedPct != null ? Math.round(hostInfo.sysMem.usedPct) : '—'}
                {hostInfo?.sysMem?.usedPct != null ? '%' : ''}
              </p>
              <span className={cn('inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold', (hostInfo?.sysMem?.usedPct ?? 0) > 90 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400')}>
                {(hostInfo?.sysMem?.usedPct ?? 0) > 90 ? t('diagnostics.status.bad') : t('diagnostics.status.ok')}
              </span>
              <p className="text-[9px] text-muted-foreground mt-1">{t('diagnostics.cards.memoryHint')}</p>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/15 p-4">
            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
              <Lightbulb className="w-3.5 h-3.5" />
              {t('diagnostics.suggestedActions')}
            </h4>
            <div className="space-y-2">
              {suggestedActions.slice(0, 4).map((action, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={action.onClick}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-left transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-[10px] font-bold',
                    action.risk === 'critical' && 'bg-red-500/30 text-red-300',
                    action.risk === 'high' && 'bg-orange-500/30 text-orange-300',
                    action.risk === 'medium' && 'bg-amber-500/30 text-amber-300',
                    (action.risk === 'low' || !action.risk) && 'bg-slate-500/30 text-slate-300',
                  )}>
                    {action.risk === 'critical' ? t('diagnostics.risk.critical') : action.risk === 'high' ? t('diagnostics.risk.high') : action.risk === 'medium' ? t('diagnostics.risk.medium') : t('diagnostics.risk.low')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {(summary?.recentIssues?.length ?? 0) > 0 && (
        <div className="rounded-2xl border-2 border-orange-500/35 bg-[#1e293b]/90 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
              {t('diagnostics.recentIssues')}
            </h3>
            <button
              type="button"
              onClick={() => onNavigateTo?.('alerts')}
              className="text-xs text-sky-400 font-bold hover:underline flex items-center gap-1"
            >
              {t('diagnostics.alertsCenter')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            <select
              value={summarySourceFilter}
              onChange={(e) => setSummarySourceFilter(e.target.value)}
              className="text-[11px] rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-foreground"
            >
              <option value="all">{t('diagnostics.filter.allSources')}</option>
              {Array.from(new Set((summary?.recentIssues ?? []).map((i) => detectSummarySourceKey(i.source, i.category)))).map(
                (k) => (
                  <option key={k} value={k}>
                    {t(SOURCE_META[k]?.label || k)}
                  </option>
                ),
              )}
            </select>
            <select
              value={summaryRiskFilter}
              onChange={(e) => setSummaryRiskFilter(e.target.value)}
              className="text-[11px] rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-foreground"
            >
              <option value="all">{t('diagnostics.filter.allRisks')}</option>
              <option value="critical">{t('diagnostics.risk.critical')}</option>
              <option value="high">{t('diagnostics.risk.high')}</option>
              <option value="medium">{t('diagnostics.risk.medium')}</option>
              <option value="low">{t('diagnostics.risk.low')}</option>
            </select>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredIssues.slice(0, 12).map((issue) => (
              <div
                key={issue.id}
                className={cn(
                  'flex items-start gap-2 px-3 py-2 rounded-xl text-xs border border-transparent',
                  issue.risk === 'critical' && 'bg-red-500/10 text-red-300 border-red-500/20',
                  issue.risk === 'high' && 'bg-orange-500/10 text-orange-300 border-orange-500/15',
                  issue.risk === 'medium' && 'bg-amber-500/10 text-amber-200 border-amber-500/15',
                  issue.risk === 'low' && 'bg-blue-500/10 text-blue-300 border-blue-500/15',
                )}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{issue.title}</p>
                  <p className="text-[10px] text-white/50 truncate">
                    {t(SOURCE_META[detectSummarySourceKey(issue.source, issue.category)]?.label || issue.source)} ·{' '}
                    {issue.timestamp ? new Date(issue.timestamp).toLocaleString('zh-CN') : ''}
                  </p>
                </div>
              </div>
            ))}
            {filteredIssues.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">{t('diagnostics.noMatch')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const testingBody = (
    <div className="space-y-4 pt-4 pb-8">
      <div className="rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/10 to-[#1e293b] p-6">
        <h3 className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-violet-400" />
          OpenClaw Doctor（CLI）
        </h3>
        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          <code className="text-violet-300">openclaw doctor</code>
          
        </p>
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            disabled={!!doctorCliRunning}
            onClick={() => void runOpenClawDoctor('diagnose')}
            className="h-9 px-4 rounded-lg text-xs font-bold bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
          >
            {doctorCliRunning === 'diagnose' ? t('diagnostics.running') : t('diagnostics.runDiagnose')}
          </button>
          <button
            type="button"
            disabled={!!doctorCliRunning}
            onClick={() => void runOpenClawDoctor('fix')}
            className="h-9 px-4 rounded-lg text-xs font-bold border border-violet-500/50 text-violet-300 hover:bg-violet-500/10 disabled:opacity-50"
          >
            {doctorCliRunning === 'fix' ? t('diagnostics.running') : t('diagnostics.runFix')}
          </button>
          {doctorCli && (
            <button
              type="button"
              onClick={() => void copyDoctorOutput()}
              className="h-9 px-3 rounded-lg text-xs font-bold border border-white/15 flex items-center gap-1.5 hover:bg-white/5"
            >
              <Copy className="w-3.5 h-3.5" />
              {t('diagnostics.copyOutput')}
            </button>
          )}
        </div>
        {doctorCli && (
          <div className="rounded-xl border border-white/10 bg-black/40 overflow-hidden">
            <div className="flex flex-wrap gap-3 px-3 py-2 text-[10px] text-muted-foreground border-b border-white/10">
              <span>exit: {doctorCli.exitCode ?? '—'}</span>
              <span>{doctorCli.durationMs} ms</span>
              <span className={doctorCli.success ? 'text-emerald-400' : 'text-red-400'}>
                {doctorCli.success ? t('diagnostics.success') : t('diagnostics.failed')}
              </span>
            </div>
            <pre className="p-3 text-[10px] font-mono text-white/80 max-h-64 overflow-auto whitespace-pre-wrap break-all">
              {(doctorCli.stdout || doctorCli.stderr || doctorCli.error || t('diagnostics.noOutput')).slice(0, 12000)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );

  if (standalone) {
    return (
      <div className="flex flex-col flex-1 min-h-0 bg-[#0f172a] overflow-hidden">
        <PageHeader
          title={t('diagnostics.title')}
          subtitle={t('diagnostics.subtitle')}
          dividerClassName={scoreBarClass}
          dividerUnderSubtitle
          onRefresh={() => void fetchAll()}
          refreshing={summaryLoading}
          refreshLabel={t('diagnostics.refreshSummary')}
          actions={headerActions}
        />
        <div className="px-4 shrink-0 pt-4">{tabRow}</div>
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4">
          {activeTab === 'diagnose' && diagnoseBody}
          {activeTab === 'testing' && testingBody}
        </div>
        <ConfirmDialog
          open={showFixConfirm}
          title={t('diagnostics.fixTitle')}
          message={t('diagnostics.fixMessage')}
          confirmLabel={t('common.confirm')}
          cancelLabel={t('common.cancel')}
          variant="default"
          onConfirm={handleFix}
          onCancel={() => setShowFixConfirm(false)}
        />
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col bg-[#0f172a]', embedded ? 'flex-1 min-h-0 overflow-hidden' : 'h-full min-h-0 overflow-hidden')}>
      {!embedded && (
        <div className="sticky top-0 z-10 shrink-0 bg-[#0f172a] pt-3 pb-0 px-4">
          <h2 className="text-base font-bold text-foreground">{t('diagnostics.title')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('diagnostics.subtitle')}</p>
          <div className={cn('h-[3px] w-full rounded-full transition-all duration-700 mt-2 mb-2', scoreBarClass)} />
        </div>
      )}
      <div className={cn('shrink-0 px-4 pt-4')}>{tabRow}</div>
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4">
        <div className="flex justify-end py-2">{headerActions}</div>
        {activeTab === 'diagnose' && diagnoseBody}
        {activeTab === 'testing' && testingBody}
      </div>
      <ConfirmDialog
        open={showFixConfirm}
        title={t('diagnostics.fixTitle')}
        message={t('diagnostics.fixConfirmMessage')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        variant="default"
        onConfirm={handleFix}
        onCancel={() => setShowFixConfirm(false)}
      />
    </div>
  );
};

export { DiagnosticsView };
export default DiagnosticsView;
