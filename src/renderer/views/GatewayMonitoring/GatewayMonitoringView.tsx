/**
 * AxonClaw - 网关监控视图
 * 复刻自 AxonClawX Gateway.tsx
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Router,
  RefreshCw,
  Play,
  Square,
  RotateCcw,
  Heart,
  Settings,
  Search,
  Download,
  Trash2,
  ChevronDown,
  ChevronUp,
  Copy,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Terminal,
  Radio,
  Bug,
  Server,
  Cable,
  Send,
  Code,
  Megaphone,
  Info,
  HardDrive,
  Laptop,
  Activity,
  Zap,
  Timer,
  Gauge,
  Settings2,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGatewayStore } from '@/stores/gateway';
import { useGatewayOnline } from '@/hooks/useGatewayOnline';
import { hostApiFetch } from '@/lib/host-api';
import { HealthDot } from '@/components/common/HealthDot';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import { EventsPanel } from './EventsPanel';
import { ChannelsPanel } from './ChannelsPanel';
import { DebugPanel } from './DebugPanel';
import { ServicePanel } from './ServicePanel';

// Types
interface GatewayStatus {
  running: boolean;
  runtime?: string;
  detail?: string;
  remote?: boolean;
  ws_connected?: boolean;
  ws_error?: string;
  uptime_sec?: number;
}

interface GatewayProfile {
  id: number;
  name: string;
  host: string;
  port: number;
  token: string;
  is_active: boolean;
}

const GW_PROFILES_STORAGE = 'axonclaw_gw_profiles_override';

const na = '—';

// 格式化运行时间
function fmtUptime(sec: number): string {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

// 判断是否本地网关
function isLocal(host: string): boolean {
  return ['127.0.0.1', 'localhost', '::1'].includes(host.trim());
}

function isLocalGatewayName(name: string, localGatewayLabel: string, zhLocalGatewayLabel = ''): boolean {
  const normalized = (name || '').trim().toLowerCase();
  return normalized === localGatewayLabel.trim().toLowerCase() || normalized === 'local gateway' || normalized === zhLocalGatewayLabel.trim().toLowerCase();
}

// Toast 简单实现
function useToast() {
  return {
    toast: (type: 'success' | 'error' | 'warning', msg: string) => {
      console.log(`[Toast ${type}] ${msg}`);
      if (type === 'error') alert(`❌ ${msg}`);
    },
  };
}

// Confirm 简单实现
function useConfirm() {
  return {
    confirm: async (opts: { title: string; message: string; danger?: boolean }): Promise<boolean> => {
      return window.confirm(`${opts.title}: ${opts.message}`);
    },
  };
}

export const GatewayMonitoringView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const gatewayStatus = useGatewayStore((s) => s.status);
  const { toast } = useToast();
  const { confirm } = useConfirm();

  // 状态
  const [status, setStatus] = useState<GatewayStatus | null>(null);
  const [initialDetecting, setInitialDetecting] = useState(false);

  // 日志
  const [logs, setLogs] = useState<string[]>([]);
  const [logSearch, setLogSearch] = useState('');
  const [autoFollow, setAutoFollow] = useState(true);
  const [levelFilters, setLevelFilters] = useState<Record<string, boolean>>({
    trace: true, debug: true, info: true, warn: true, error: true, fatal: true,
  });
  const [logLimit, setLogLimit] = useState(500);
  const [clearTimestamp, setClearTimestamp] = useState<string | null>(null);
  const [expandedExtras, setExpandedExtras] = useState<Set<number>>(new Set());

  // Tab
  const [activeTab, setActiveTab] = useState<'logs' | 'events' | 'channels' | 'service' | 'debug'>('logs');

  // 事件
  const [events, setEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventRisk, setEventRisk] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [eventKeyword, setEventKeyword] = useState('');
  const [eventType, setEventType] = useState<'all' | 'activity' | 'alert'>('all');
  const [eventSource, setEventSource] = useState('all');
  const [eventPage, setEventPage] = useState(1);
  const [eventTotal, setEventTotal] = useState(0);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [presetExceptionFilter, setPresetExceptionFilter] = useState(false);

  // 通道
  const [channelsList, setChannelsList] = useState<any[]>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelLogoutLoading, setChannelLogoutLoading] = useState<string | null>(null);

  // 看门狗
  const [healthCheckEnabled, setHealthCheckEnabled] = useState(false);
  const [healthStatus, setHealthStatus] = useState<{ fail_count: number; last_ok: string } | null>(null);
  const [watchdogAdvancedOpen, setWatchdogAdvancedOpen] = useState(false);
  const [watchdogIntervalSec, setWatchdogIntervalSec] = useState('30');
  const [watchdogMaxFails, setWatchdogMaxFails] = useState('3');
  const [watchdogBackoffCapMs, setWatchdogBackoffCapMs] = useState('30000');
  const [watchdogSaving, setWatchdogSaving] = useState(false);

  // 操作状态
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // 调试面板
  const [rpcMethod, setRpcMethod] = useState('');
  const [rpcParams, setRpcParams] = useState('{}');
  const [rpcResult, setRpcResult] = useState<string | null>(null);
  const [rpcError, setRpcError] = useState<string | null>(null);
  const [rpcLoading, setRpcLoading] = useState(false);
  const [rpcHistory, setRpcHistory] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('gw_rpcHistory') || '[]'); } catch { return []; }
  });
  const [debugStatus, setDebugStatus] = useState<any>(null);
  const [debugHealth, setDebugHealth] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);
  const [sysEventText, setSysEventText] = useState('');
  const [sysEventSending, setSysEventSending] = useState(false);
  const [sysEventResult, setSysEventResult] = useState<{ ok: boolean; text: string } | null>(null);

  const [profiles, setProfiles] = useState<GatewayProfile[]>([]);
  const [profilesLoading, setProfilesLoading] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [editingProfile, setEditingProfile] = useState<GatewayProfile | null>(null);
  const [formData, setFormData] = useState({ name: '', host: '127.0.0.1', port: 18789, token: '' });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [savingProfile, setSavingProfile] = useState(false);

  const logEndRef = useRef<HTMLDivElement>(null);

  const isOnline = useGatewayOnline(status);

  // 获取状态
  const fetchStatus = useCallback(async () => {
    try {
      const data = await hostApiFetch<GatewayStatus>('/api/gateway/status');
      setStatus(data);
    } catch {
      setStatus({ running: false, runtime: '', detail: '' });
    }
  }, []);

  // 获取日志
  const fetchLogs = useCallback(async () => {
    try {
      const data = await hostApiFetch<{ lines?: string[] }>('/api/gateway/logs', {
        method: 'POST',
        body: JSON.stringify({ limit: logLimit }),
      });
      if (data?.lines) setLogs(data.lines);
    } catch (err) {
      console.error('[Gateway] Failed to fetch logs:', err);
    }
  }, [logLimit]);

  // 获取事件
  const fetchEvents = useCallback(async (page?: number) => {
    setEventsLoading(true);
    try {
      const data = await hostApiFetch<{ list: any[]; total: number }>('/api/gateway/events', {
        method: 'POST',
        body: JSON.stringify({
          page: page ?? eventPage,
          page_size: 50,
          risk: eventRisk,
          type: eventType,
          source: eventSource,
          keyword: eventKeyword.trim() || undefined,
        }),
      });
      setEvents(data?.list || []);
      setEventTotal(data?.total || 0);
    } catch {
      setEvents([]);
    } finally {
      setEventsLoading(false);
    }
  }, [eventPage, eventRisk, eventType, eventSource, eventKeyword]);

  // 获取通道
  const fetchChannels = useCallback(async () => {
    setChannelsLoading(true);
    try {
      const data = await hostApiFetch<any[]>('/api/gateway/channels');
      setChannelsList(Array.isArray(data) ? data : []);
    } catch {
      setChannelsList([]);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  // 获取健康检查
  const fetchHealthCheck = useCallback(async () => {
    try {
      const data = await hostApiFetch<{ enabled: boolean; fail_count: number; last_ok: string }>('/api/gateway/health-check');
      setHealthCheckEnabled(data?.enabled || false);
      setHealthStatus({ fail_count: data?.fail_count || 0, last_ok: data?.last_ok || '' });
    } catch {}
  }, []);

  const persistProfiles = useCallback((list: GatewayProfile[]) => {
    try {
      localStorage.setItem(GW_PROFILES_STORAGE, JSON.stringify(list));
    } catch {
      /* ignore */
    }
    setProfiles(list);
  }, []);

  const fetchProfiles = useCallback(async () => {
    setProfilesLoading(true);
    try {
      const data = await hostApiFetch<GatewayProfile[]>('/api/gateway/profiles');
      let list = Array.isArray(data) && data.length > 0 ? data : [
        { id: 1, name: t('gw.localGateway'), host: '127.0.0.1', port: 18789, token: '', is_active: true },
      ];
      try {
        const raw = localStorage.getItem(GW_PROFILES_STORAGE);
        if (raw) {
          const parsed = JSON.parse(raw) as GatewayProfile[];
          if (Array.isArray(parsed) && parsed.length > 0) list = parsed;
        }
      } catch {
        /* keep list */
      }
      list = list.map((p) =>
        isLocal(p.host) && isLocalGatewayName(p.name, t('gw.localGateway'), t('gw.localGateway', { lng: 'zh' }))
          ? { ...p, name: t('gw.localGateway') }
          : p,
      );
      persistProfiles(list);
    } catch {
      persistProfiles([{ id: 1, name: t('gw.localGateway'), host: '127.0.0.1', port: 18789, token: '', is_active: true }]);
    } finally {
      setProfilesLoading(false);
    }
  }, [persistProfiles, t]);

  const activeProfile = useMemo(
    () => profiles.find((p) => p.is_active) || profiles[0] || null,
    [profiles],
  );

  useEffect(() => {
    const normalized = profiles.map((p) =>
      isLocal(p.host) && isLocalGatewayName(p.name, t('gw.localGateway'), t('gw.localGateway', { lng: 'zh' }))
        ? { ...p, name: t('gw.localGateway') }
        : p,
    );
    const changed = normalized.some((p, i) => p.name !== profiles[i]?.name);
    if (changed) persistProfiles(normalized);
  }, [persistProfiles, profiles, t]);

  const validateProfileForm = useCallback(() => {
    const errs: Record<string, string> = {};
    if (!formData.name.trim()) errs.name = t('gw.required');
    if (!formData.host.trim()) errs.host = t('gw.required');
    if (formData.port < 1 || formData.port > 65535) errs.port = t('gw.portRange');
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }, [formData]);

  const handleSaveProfile = useCallback(async () => {
    if (!validateProfileForm()) return;
    setSavingProfile(true);
    try {
      if (editingProfile) {
        const next = profiles.map((p) =>
          p.id === editingProfile.id
            ? { ...p, name: formData.name.trim(), host: formData.host.trim(), port: formData.port, token: formData.token }
            : p,
        );
        persistProfiles(next);
      } else {
        const next: GatewayProfile[] = [
          ...profiles.map((p) => ({ ...p, is_active: false })),
          {
            id: Date.now(),
            name: formData.name.trim(),
            host: formData.host.trim(),
            port: formData.port || 18789,
            token: formData.token,
            is_active: true,
          },
        ];
        persistProfiles(next);
      }
      setShowProfilePanel(false);
      setEditingProfile(null);
      setFormData({ name: '', host: '127.0.0.1', port: 18789, token: '' });
      setFormErrors({});
      toast('success', t('gw.patchOk'));
    } finally {
      setSavingProfile(false);
    }
  }, [editingProfile, formData, profiles, persistProfiles, toast, validateProfileForm]);

  const handleActivateProfile = useCallback(
    (id: number) => {
      const next = profiles.map((p) => ({ ...p, is_active: p.id === id }));
      persistProfiles(next);
    },
    [profiles, persistProfiles],
  );

  const handleDeleteProfile = useCallback(
    async (id: number) => {
      if (!(await confirm({ title: t('gw.deleteProfile'), message: t('gw.confirmDelete'), danger: true }))) return;
      const next = profiles.filter((p) => p.id !== id);
      if (next.length === 0) {
        toast('error', t('gw.keepOneGateway'));
        return;
      }
      if (!next.some((p) => p.is_active)) next[0] = { ...next[0], is_active: true };
      persistProfiles(next);
    },
    [confirm, profiles, persistProfiles, toast],
  );

  const openAddForm = useCallback(() => {
    setEditingProfile(null);
    setFormData({ name: '', host: '127.0.0.1', port: 18789, token: '' });
    setFormErrors({});
    setShowProfilePanel(true);
  }, []);

  const openEditForm = useCallback((p: GatewayProfile) => {
    setEditingProfile(p);
    setFormData({ name: p.name, host: p.host, port: p.port, token: p.token });
    setFormErrors({});
    setShowProfilePanel(true);
  }, []);

  // 初始化
  useEffect(() => {
    setInitialDetecting(true);
    Promise.allSettled([
      fetchProfiles(),
      fetchStatus(),
      fetchHealthCheck(),
      fetchChannels(),
      fetchLogs(),
    ]).finally(() => setInitialDetecting(false));
  }, [fetchProfiles, fetchStatus, fetchHealthCheck, fetchChannels, fetchLogs]);

  // 定时刷新（状态、看门狗），可见性隐藏时暂停
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = setInterval(() => {
      fetchStatus();
      fetchHealthCheck();
    }, 8000);
    const onVisibility = () => {
      if (document.hidden) {
        if (timer) { clearInterval(timer); timer = null; }
      } else {
        if (!timer) {
          timer = setInterval(() => { fetchStatus(); fetchHealthCheck(); }, 8000);
          fetchStatus();
          fetchHealthCheck();
        }
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      if (timer) clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [fetchStatus, fetchHealthCheck]);

  // 日志 tab 轮询（5s），可见性隐藏时暂停
  useEffect(() => {
    if (activeTab !== 'logs') return;
    let timer: ReturnType<typeof setInterval> | null = setInterval(() => fetchLogs(), 5000);
    const onVis = () => {
      if (document.hidden) { if (timer) { clearInterval(timer); timer = null; } }
      else if (!timer) { timer = setInterval(() => fetchLogs(), 5000); fetchLogs(); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', onVis); };
  }, [activeTab, fetchLogs]);

  // 事件 tab 轮询（10s），可见性隐藏时暂停
  useEffect(() => {
    if (activeTab !== 'events') return;
    let timer: ReturnType<typeof setInterval> | null = setInterval(() => fetchEvents(), 10000);
    const onVis = () => {
      if (document.hidden) { if (timer) { clearInterval(timer); timer = null; } }
      else if (!timer) { timer = setInterval(() => fetchEvents(), 10000); fetchEvents(); }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => { if (timer) clearInterval(timer); document.removeEventListener('visibilitychange', onVis); };
  }, [activeTab, fetchEvents]);

  // 日志自动滚动
  useEffect(() => {
    if (autoFollow) logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs, autoFollow]);

  // 解析日志行
  const parseLogLine = useCallback((line: string) => {
    if (!line.startsWith('{')) return null;
    try {
      const obj = JSON.parse(line);
      const meta = obj._meta;
      if (meta && typeof meta === 'object') {
        const level = (meta.logLevelName || 'INFO').toLowerCase();
        let time = '';
        const ts = obj.time || meta.date;
        if (typeof ts === 'string') {
          try { time = new Date(ts).toLocaleTimeString(i18n.language || 'en-US', { hour12: false }); } catch { time = ts; }
        }
        let message = typeof obj['0'] === 'string' ? obj['0'] : '';
        const extraParts: string[] = [];
        for (let i = 1; i <= 9; i++) {
          const val = obj[String(i)];
          if (val === undefined) break;
          if (typeof val === 'string' && val !== message) extraParts.push(val);
        }
        return { time, level, message, extra: extraParts.length > 0 ? extraParts.join(' | ') : undefined };
      }
      let level = '';
      if (typeof obj.level === 'number') {
        level = obj.level <= 10 ? 'trace' : obj.level <= 20 ? 'debug' : obj.level <= 30 ? 'info' : obj.level <= 40 ? 'warn' : obj.level <= 50 ? 'error' : 'fatal';
      } else if (typeof obj.level === 'string') {
        level = obj.level.toLowerCase();
      }
      let time = '';
      const ts = obj.time || obj.timestamp || obj.ts;
      if (typeof ts === 'number') {
        time = new Date(ts).toLocaleTimeString(i18n.language || 'en-US', { hour12: false });
      } else if (typeof ts === 'string') {
        try { time = new Date(ts).toLocaleTimeString(i18n.language || 'en-US', { hour12: false }); } catch { time = ts; }
      }
      const message = obj.msg || obj.message || obj.text || '';
      return { time, level: level || 'info', message, extra: undefined };
    } catch {
      return null;
    }
  }, [i18n.language]);

  // 过滤日志
  const filteredLogs = useMemo(() => {
    let visible = logs;
    if (clearTimestamp) {
      const clearTime = new Date(clearTimestamp).getTime();
      visible = logs.filter(line => {
        if (!line.startsWith('{')) return true;
        try {
          const obj = JSON.parse(line);
          const ts = obj.time || obj.timestamp || obj.ts;
          if (ts) {
            const logTime = typeof ts === 'number' ? ts : new Date(ts).getTime();
            return logTime > clearTime;
          }
        } catch {}
        return true;
      });
    }
    const needle = logSearch.trim().toLowerCase();
    return visible
      .map((line) => ({ line, parsed: parseLogLine(line) }))
      .filter(({ line, parsed }) => {
        if (parsed && parsed.level) {
          const lvl = parsed.level.toLowerCase();
          if (lvl in levelFilters && !levelFilters[lvl]) return false;
        }
        if (needle && !line.toLowerCase().includes(needle)) return false;
        return true;
      });
  }, [logs, clearTimestamp, logSearch, levelFilters, parseLogLine]);

  const renderedLogs = filteredLogs.slice(-300);
  const omittedLogCount = Math.max(0, filteredLogs.length - renderedLogs.length);

  // 日志级别统计（状态栏显示）
  const logStats = useMemo(() => {
    let errors = 0, warns = 0;
    filteredLogs.forEach(({ parsed }) => {
      if (!parsed) return;
      const lvl = parsed.level.toLowerCase();
      if (lvl === 'error' || lvl === 'fatal') errors++;
      else if (lvl === 'warn') warns++;
    });
    return { errors, warns };
  }, [filteredLogs]);

  // 操作
  const handleAction = useCallback(async (action: 'start' | 'stop' | 'restart' | 'kill') => {
    if (action === 'stop' || action === 'restart' || action === 'kill') {
      const ok = await confirm({
        title: gw[action],
        message: action === 'kill' ? t('gw.confirmKill') : `${t('gw.confirmAction')} ${gw[action]}?`,
        danger: action === 'kill',
      });
      if (!ok) return;
    }
    setActionLoading(action);
    try {
      await hostApiFetch(`/api/gateway/${action}`, { method: 'POST' });
      toast('success', `${gw[action]} ${t('gw.ok')}`);
      setTimeout(() => {
        fetchStatus();
        fetchHealthCheck();
        fetchChannels();
      }, 1000);
    } catch (err: any) {
      toast('error', `${gw[action]} ${t('gw.failed')}: ${err?.message || ''}`);
    } finally {
      setTimeout(() => setActionLoading(null), 1500);
    }
  }, [confirm, toast, fetchStatus, fetchHealthCheck, fetchChannels]);

  // 切换看门狗
  const toggleHealthCheck = useCallback(async () => {
    try {
      await hostApiFetch('/api/gateway/health-check', {
        method: 'POST',
        body: JSON.stringify({
          enabled: !healthCheckEnabled,
          interval_sec: parseInt(watchdogIntervalSec, 10) || 30,
          max_fails: parseInt(watchdogMaxFails, 10) || 3,
          reconnect_backoff_cap_ms: parseInt(watchdogBackoffCapMs, 10) || 30000,
        }),
      });
      setHealthCheckEnabled(!healthCheckEnabled);
      toast('success', t('gw.patchOk'));
    } catch (err: any) {
      toast('error', err?.message || '');
    }
  }, [healthCheckEnabled, watchdogIntervalSec, watchdogMaxFails, watchdogBackoffCapMs, toast]);

  // 保存看门狗高级设置
  const saveWatchdogAdvanced = useCallback(async () => {
    setWatchdogSaving(true);
    try {
      await hostApiFetch('/api/gateway/health-check', {
        method: 'POST',
        body: JSON.stringify({
          enabled: healthCheckEnabled,
          interval_sec: parseInt(watchdogIntervalSec, 10) || 30,
          max_fails: parseInt(watchdogMaxFails, 10) || 3,
          reconnect_backoff_cap_ms: parseInt(watchdogBackoffCapMs, 10) || 30000,
        }),
      });
      toast('success', t('gw.patchOk'));
    } catch (err: any) {
      toast('error', err?.message || '');
    } finally {
      setWatchdogSaving(false);
    }
  }, [healthCheckEnabled, watchdogIntervalSec, watchdogMaxFails, watchdogBackoffCapMs, toast]);

  // 复制日志
  const copyLogLine = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast('success', t('gw.copied'));
  }, [toast]);

  // 清空日志
  const handleClearLogs = useCallback(() => setClearTimestamp(new Date().toISOString()), []);

  // 导出日志
  const exportLogs = useCallback(() => {
    const blob = new Blob([filteredLogs.map(item => item.line).join('\n')], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `gateway-logs-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
  }, [filteredLogs]);

  // 导出事件
  const exportEvents = useCallback(() => {
    const header = 'id,type,risk,source,category,title,detail,timestamp\n';
    const rows = events.map((ev: any) =>
      [ev.id || '', ev.type || '', ev.risk || '', ev.source || '', ev.category || '',
       `"${(ev.title || '').replace(/"/g, '""')}"`, `"${(ev.detail || '').replace(/"/g, '""')}"`,
       ev.timestamp || ev.created_at || ''].join(',')
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `events-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [events]);

  // RPC 调用
  const handleRpcCall = useCallback(async () => {
    if (!rpcMethod.trim()) return;
    setRpcLoading(true);
    setRpcResult(null);
    setRpcError(null);
    try {
      const params = JSON.parse(rpcParams || '{}');
      const res = await hostApiFetch('/api/gateway/rpc', {
        method: 'POST',
        body: JSON.stringify({ method: rpcMethod.trim(), params }),
      });
      setRpcResult(JSON.stringify(res, null, 2));
      setRpcHistory(prev => {
        const m = rpcMethod.trim();
        const next = [m, ...prev.filter(h => h !== m)].slice(0, 20);
        try { localStorage.setItem('gw_rpcHistory', JSON.stringify(next)); } catch {}
        return next;
      });
    } catch (err: any) {
      setRpcError(err?.message || String(err));
    } finally {
      setRpcLoading(false);
    }
  }, [rpcMethod, rpcParams]);

  // 发送系统事件
  const handleSendSystemEvent = useCallback(async () => {
    if (!sysEventText.trim() || sysEventSending) return;
    setSysEventSending(true);
    setSysEventResult(null);
    try {
      await hostApiFetch('/api/gateway/system-event', {
        method: 'POST',
        body: JSON.stringify({ event: sysEventText.trim() }),
      });
      setSysEventResult({ ok: true, text: t('gw.systemEventOk') });
      setSysEventText('');
      setTimeout(() => setSysEventResult(null), 3000);
    } catch (err: any) {
      setSysEventResult({ ok: false, text: t('gw.systemEventFailed') + ': ' + (err?.message || '') });
    }
    setSysEventSending(false);
  }, [sysEventText, sysEventSending]);

  // 通道登出
  const handleChannelLogout = useCallback(async (channel: string) => {
    if (!window.confirm(`${t('gw.channelLogoutConfirm')}`)) return;
    setChannelLogoutLoading(channel);
    try {
      await hostApiFetch('/api/gateway/channels/logout', {
        method: 'POST',
        body: JSON.stringify({ channel }),
      });
      toast('success', t('gw.channelLoggedOut'));
      fetchChannels();
    } catch {
      toast('error', t('gw.channelLogoutFailed'));
    } finally {
      setChannelLogoutLoading(null);
    }
  }, [toast, fetchChannels]);

  // 刷新调试数据
  const fetchDebugData = useCallback(async () => {
    setDebugLoading(true);
    try {
      const [st, hl] = await Promise.all([
        hostApiFetch('/api/gateway/status').catch(() => null),
        hostApiFetch('/api/gateway/health').catch(() => null),
      ]);
      if (st) setDebugStatus(st);
      if (hl) setDebugHealth(hl);
    } finally {
      setDebugLoading(false);
    }
  }, []);

  // 运行时间显示
  const uptimeDisplay = status?.uptime_sec ? fmtUptime(status.uptime_sec) : na;

  /** 网关卡片边框/背景与当前展示状态一致（仅当前激活项反映实时状态） */
  const getProfileCardStyle = useCallback(
    (p: GatewayProfile) => {
      if (!p.is_active) {
        return 'border-white/15 bg-white/[0.02] shadow-none hover:border-white/25';
      }
      if (!isOnline) {
        return 'border-amber-500/55 bg-amber-500/[0.07] shadow-sm shadow-amber-500/20';
      }
      const wsOff = status?.ws_connected === false;
      const remote = !!status?.remote;
      if (remote && wsOff) {
        return 'border-red-500/55 bg-red-500/[0.07] shadow-sm shadow-red-500/20';
      }
      if (!isLocal(p.host) && wsOff) {
        return 'border-red-500/55 bg-red-500/[0.07] shadow-sm shadow-red-500/20';
      }
      if (wsOff) {
        return 'border-amber-500/55 bg-amber-500/[0.08] shadow-sm shadow-amber-500/15';
      }
      const hbBad = (healthStatus?.fail_count ?? 0) > 0;
      if (hbBad) {
        return 'border-orange-500/50 bg-orange-500/[0.07] shadow-sm shadow-orange-500/15';
      }
      if (healthCheckEnabled && !healthStatus?.last_ok) {
        return 'border-sky-500/45 bg-sky-500/[0.06] shadow-sm shadow-sky-500/15';
      }
      return 'border-emerald-500/50 bg-emerald-500/[0.08] shadow-sm shadow-emerald-500/20';
    },
    [
      isOnline,
      status?.remote,
      status?.ws_connected,
      healthCheckEnabled,
      healthStatus?.fail_count,
      healthStatus?.last_ok,
    ],
  );

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-[#0f172a] overflow-hidden">
      <Dialog open={showProfilePanel} onOpenChange={setShowProfilePanel}>
        <DialogContent className="sm:max-w-md bg-[#1e293b] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>{editingProfile ? t('gw.editGateway') : t('gw.addGateway')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-[10px] text-white/50 block mb-1">{t('gw.gwName')}</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                placeholder={t('gw.namePlaceholder')}
                className="w-full h-9 px-3 rounded-lg bg-black/20 border border-white/10 text-sm text-white"
              />
              {formErrors.name && <p className="text-[10px] text-red-400 mt-0.5">{formErrors.name}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-white/50 block mb-1">{t('gw.gwHost')}</label>
                <input
                  value={formData.host}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      host: e.target.value.replace(/^https?:\/\//i, '').replace(/\/+$/, ''),
                    }))
                  }
                  placeholder={t('gw.hostPlaceholder')}
                  className="w-full h-9 px-3 rounded-lg bg-black/20 border border-white/10 text-sm font-mono text-white"
                />
                {formErrors.host && <p className="text-[10px] text-red-400 mt-0.5">{formErrors.host}</p>}
              </div>
              <div>
                <label className="text-[10px] text-white/50 block mb-1">{t('gw.gwPort')}</label>
                <input
                  type="number"
                  value={formData.port}
                  onChange={(e) =>
                    setFormData((f) => ({
                      ...f,
                      port: Math.max(1, Math.min(65535, parseInt(e.target.value, 10) || 18789)),
                    }))
                  }
                  className="w-full h-9 px-3 rounded-lg bg-black/20 border border-white/10 text-sm font-mono text-white"
                />
                {formErrors.port && <p className="text-[10px] text-red-400 mt-0.5">{formErrors.port}</p>}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">{t('gw.gwToken')}</label>
              <input
                type="password"
                value={formData.token}
                onChange={(e) => setFormData((f) => ({ ...f, token: e.target.value }))}
                placeholder={t('gw.tokenPlaceholder')}
                className="w-full h-9 px-3 rounded-lg bg-black/20 border border-white/10 text-sm font-mono text-white"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="text-white/70" onClick={() => setShowProfilePanel(false)}>
              {t('gw.cancel')}
            </Button>
            <Button onClick={() => void handleSaveProfile()} disabled={savingProfile}>
              {savingProfile ? t('gw.saving') : t('gw.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="w-full shrink-0 flex flex-col px-4 py-3 space-y-3 border-b border-white/5">
        <PageHeader
          title={t('gw.monitorTitle')}
          subtitle={t('gw.monitorSubtitle')}
          stats={[
            { label: t('gw.status'), value: isOnline ? t('gw.running') : t('gw.stopped') },
            { label: t('gw.wsStatus'), value: status?.ws_connected ? t('gw.wsConnected') : t('gw.wsDisconnected') },
          ]}
          onRefresh={() => {
            fetchStatus();
            fetchHealthCheck();
            fetchProfiles();
            fetchChannels();
            if (activeTab === 'logs') fetchLogs();
            if (activeTab === 'events') fetchEvents();
          }}
          refreshing={initialDetecting}
          statsBorderColor="border-amber-500/40"
          actions={
            <Button
              type="button"
              size="sm"
              onClick={openAddForm}
              className="gap-1 shrink-0 border-2 border-primary/50 bg-primary/15 text-primary hover:bg-primary/25 hover:text-primary"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="whitespace-nowrap">{t('gw.addGateway')}</span>
            </Button>
          }
        />

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <h3 className="text-[10px] font-bold text-white/40 uppercase tracking-widest shrink-0">{t('gw.gwListTitle')}</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={openAddForm}
              className="gap-1 h-8 shrink-0 border-primary/40 text-primary bg-primary/10 hover:bg-primary/20"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('gw.addGateway')}
            </Button>
          </div>
          {profilesLoading && profiles.length === 0 ? (
            <div className="py-6 flex items-center justify-center gap-2 text-white/40 text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t('gw.loading')}
            </div>
          ) : profiles.length === 0 ? (
            <button
              type="button"
              onClick={openAddForm}
              className="w-full py-6 border-2 border-dashed border-white/10 rounded-xl text-white/40 text-xs hover:border-primary/40 hover:text-primary/80"
            >
              {t('gw.noProfiles')}
            </button>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => !p.is_active && handleActivateProfile(p.id)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !p.is_active) handleActivateProfile(p.id);
                  }}
                  className={cn(
                    'group relative shrink-0 w-44 sm:w-52 rounded-xl border-2 p-3 cursor-pointer transition-all duration-200 text-start',
                    getProfileCardStyle(p),
                  )}
                >
                  <div className="flex items-center justify-between mb-2 gap-1">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full shrink-0',
                          p.is_active && isOnline ? 'bg-emerald-400 animate-pulse' : p.is_active ? 'bg-amber-400 animate-pulse' : 'bg-white/25',
                        )}
                      />
                      <span
                        className={cn(
                          'text-[11px] font-bold uppercase truncate',
                          p.is_active && isOnline ? 'text-emerald-400' : p.is_active ? 'text-amber-400' : 'text-white/40',
                        )}
                      >
                        {p.is_active ? (isOnline ? t('gw.running') : t('gw.stopped')) : t('gw.inactive')}
                      </span>
                      {p.is_active && isOnline && (
                        <span
                          className={cn(
                            'text-[9px] px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5 shrink-0',
                            status?.ws_connected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400',
                          )}
                        >
                          <span
                            className={cn(
                              'w-1 h-1 rounded-full',
                              status?.ws_connected ? 'bg-emerald-400' : 'bg-red-400',
                            )}
                          />
                          WS
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded font-bold',
                          isLocal(p.host) ? 'bg-blue-500/15 text-blue-400' : 'bg-violet-500/15 text-violet-400',
                        )}
                      >
                        {isLocal(p.host) ? t('gw.local') : t('gw.remote')}
                      </span>
                      {p.is_active && isOnline && status?.runtime && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/45">{t('gw.runtimeProcess')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">
                      {isLocal(p.host) && isLocalGatewayName(p.name, t('gw.localGateway'), t('gw.localGateway', { lng: 'zh' })) ? t('gw.localGateway') : p.name}
                    </h4>
                    {p.is_active && isOnline && uptimeDisplay !== na && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold shrink-0">
                        {uptimeDisplay}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-white/40 font-mono mt-0.5 truncate">
                    {p.host}:{p.port}
                  </p>
                  <div className="absolute top-2 right-2 hidden group-hover:flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditForm(p);
                      }}
                      className="w-7 h-7 rounded-md flex items-center justify-center bg-white/10 hover:bg-primary/20 text-white/70"
                    >
                      <Settings2 className="w-3.5 h-3.5" />
                    </button>
                    {profiles.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleDeleteProfile(p.id);
                        }}
                        className="w-7 h-7 rounded-md flex items-center justify-center bg-white/10 hover:bg-red-500/20 text-white/70"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* 远程网关 WS 数据通道未连接提示 */}
      {!initialDetecting && status?.running && status?.remote && !status?.ws_connected && (
        <div className="rounded-xl border-2 p-3 mb-4 shrink-0 bg-amber-500/5" style={{ borderColor: 'rgba(245, 158, 11, 0.3)' }}>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold text-amber-400">{t('gw.wsDisconnected')}</span>
          </div>
          <p className="text-[10px] text-white/50 mt-1 ml-6 leading-relaxed">{t('gw.wsDisconnectedHint')}</p>
          {status?.ws_error && (
            <p className="text-[10px] text-red-400/80 mt-1 ml-6 font-mono break-all">{status.ws_error}</p>
          )}
        </div>
      )}

      {/* Gateway 状态面板：与 Dashboard 风格一致 */}
      <div className="rounded-xl border-2 p-4 sm:p-5 mb-4 shrink-0 bg-[#1e293b]"
        style={{ borderColor: isOnline ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.4)' }}
      >
        <div className="flex items-start justify-between gap-4">
          {/* 左侧：网关状态卡片 */}
          <div className="flex items-center gap-4">
            {/* 图标 */}
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center shrink-0',
              isOnline ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-white/5 border border-white/10'
            )}>
              <Router className={cn('w-7 h-7', isOnline ? 'text-emerald-400' : 'text-white/30')} />
            </div>
            
            {/* 状态信息 */}
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-white">
                  {activeProfile
                    ? isLocal(activeProfile.host) &&
                      isLocalGatewayName(activeProfile.name, t('gw.localGateway'), t('gw.localGateway', { lng: 'zh' }))
                      ? t('gw.localGateway')
                      : activeProfile.name
                    : t('gw.localGateway')}
                </h2>
                <span className={cn(
                  'text-[11px] font-bold px-2 py-0.5 rounded-full',
                  isOnline ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'
                )}>
                  {isOnline ? t('gw.running') : t('gw.stopped')}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-[11px] text-white/50 flex-wrap">
                {/* 运行时间 */}
                <div className="flex items-center gap-1.5">
                  <Timer className="w-3.5 h-3.5" />
                  <span>{t('gw.uptime')}: <span className="text-white/80 font-mono">{uptimeDisplay}</span></span>
                </div>
                
                {/* 运行模式 */}
                {status?.runtime && (
                  <div className="flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" />
                    <span>{t('gw.mode')}: <span className="text-white/80">{status.runtime}</span></span>
                  </div>
                )}
                
                {/* 连接状态 */}
                <div className="flex items-center gap-1.5">
                  {status?.ws_connected ? (
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <WifiOff className="w-3.5 h-3.5 text-red-400" />
                  )}
                  <span>{status?.ws_connected ? t('gw.wsConnected') : t('gw.wsDisconnected')}</span>
                </div>

                {/* 看门狗探测状态 */}
                {status?.running && (
                  <div className={cn(
                    'flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-bold',
                    !healthStatus?.last_ok
                      ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                      : healthStatus?.fail_count && healthStatus.fail_count > 0
                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  )}>
                    <Heart className={cn(
                      'w-3 h-3',
                      !healthStatus?.last_ok && 'animate-pulse',
                      healthStatus?.fail_count && healthStatus.fail_count > 0 ? 'text-red-400' : 'text-emerald-400'
                    )} />
                    {!healthStatus?.last_ok
                      ? t('gw.hbProbing')
                      : healthStatus?.fail_count && healthStatus.fail_count > 0
                        ? `${t('gw.hbUnhealthy')} (${healthStatus.fail_count})`
                        : t('gw.hbHealthy')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 右侧：控制按钮（远程网关不显示本机启停） */}
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {(!activeProfile || isLocal(activeProfile.host)) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('start')}
              disabled={!!actionLoading || isOnline}
              className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
            >
              {actionLoading === 'start' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              <span className="ml-1.5">{t('gw.start')}</span>
            </Button>
            )}
            {(!activeProfile || isLocal(activeProfile.host)) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAction('stop')}
              disabled={!!actionLoading || !isOnline}
              className="bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/25"
            >
              {actionLoading === 'stop' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Square className="w-4 h-4" />}
              <span className="ml-1.5">{t('gw.stop')}</span>
            </Button>
            )}
            
            <Button
              variant="default"
              size="sm"
              onClick={() => handleAction('restart')}
              disabled={!!actionLoading}
            >
              {actionLoading === 'restart' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
              <span className="ml-1.5">{t('gw.restart')}</span>
            </Button>

            <div className="w-px h-6 bg-white/10 mx-1" />

            {/* 看门狗开关 */}
            <Button
              variant="outline"
              size="sm"
              onClick={toggleHealthCheck}
              className={cn(
                healthCheckEnabled ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-white/50 border-white/10'
              )}
            >
              <Heart className={cn('w-4 h-4', healthCheckEnabled && 'animate-pulse')} />
              <span className="ml-1.5">{t('gw.healthCheck')}</span>
            </Button>

            {/* 看门狗高级设置 */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setWatchdogAdvancedOpen(v => !v)}
              className={cn(
                'gap-1',
                watchdogAdvancedOpen ? 'bg-primary/15 text-primary' : 'text-white/50'
              )}
            >
              <Settings2 className="w-4 h-4" />
              <span className="hidden sm:inline">{t('gw.watchdogAdvanced')}</span>
            </Button>
          </div>
        </div>

        {/* 看门狗高级设置面板 */}
        {watchdogAdvancedOpen && (
          <div className="mt-3 p-3 rounded-lg border border-white/10 bg-white/[0.02]">
            <div className="grid grid-cols-3 gap-3">
              <label className="text-[10px] text-white/50">
                {t('gw.watchdogInterval')}
                <input
                  type="number"
                  value={watchdogIntervalSec}
                  onChange={(e) => setWatchdogIntervalSec(e.target.value)}
                  min={5}
                  max={300}
                  className="mt-1 w-full h-7 px-2 bg-black/20 border border-white/10 rounded text-sm text-white"
                />
              </label>
              <label className="text-[10px] text-white/50">
                {t('gw.watchdogMaxFails')}
                <input
                  type="number"
                  value={watchdogMaxFails}
                  onChange={(e) => setWatchdogMaxFails(e.target.value)}
                  min={1}
                  max={20}
                  className="mt-1 w-full h-7 px-2 bg-black/20 border border-white/10 rounded text-sm text-white"
                />
              </label>
              <label className="text-[10px] text-white/50">
                {t('gw.watchdogBackoffCap')}
                <input
                  type="number"
                  value={watchdogBackoffCapMs}
                  onChange={(e) => setWatchdogBackoffCapMs(e.target.value)}
                  min={1000}
                  max={120000}
                  step={1000}
                  className="mt-1 w-full h-7 px-2 bg-black/20 border border-white/10 rounded text-sm text-white"
                />
              </label>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setWatchdogIntervalSec('30');
                  setWatchdogMaxFails('3');
                  setWatchdogBackoffCapMs('30000');
                }}
                className="text-white/50"
              >
                {t('gw.watchdogResetDefaults')}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={saveWatchdogAdvanced}
                disabled={watchdogSaving}
              >
                {watchdogSaving ? '...' : t('gw.watchdogApply')}
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Tab 面板：占满剩余高度，避免被上方内容挤没 */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden px-4 pb-4">
        <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-white/10 bg-[#0a121c] overflow-hidden shadow-inner">
        {/* Tab 栏 */}
        <div className="shrink-0 h-10 flex items-center gap-1 px-3 border-b border-white/5 bg-[#0f1419]">
          {(['logs', 'events', 'channels', 'service', 'debug'] as const).map((tab) => {
            const icons: Record<string, React.ReactNode> = {
              logs: <Terminal className="w-3.5 h-3.5" />,
              events: <Radio className="w-3.5 h-3.5" />,
              channels: <Wifi className="w-3.5 h-3.5" />,
              service: <Server className="w-3.5 h-3.5" />,
              debug: <Bug className="w-3.5 h-3.5" />,
            };
            const labels: Record<string, string> = {
              logs: t('gw.logs'),
              events: t('gw.events'),
              channels: t('gw.channels'),
              service: t('gw.service'),
              debug: t('gw.debug'),
            };
            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'debug') fetchDebugData();
                  if (tab === 'events') fetchEvents();
                  if (tab === 'channels') fetchChannels();
                }}
                className={cn(
                  'px-3 py-2 rounded-lg text-[12px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5',
                  activeTab === tab ? 'bg-white/10 text-white' : 'text-white/30 hover:text-white/60'
                )}
              >
                {icons[tab]}
                {labels[tab]}
              </button>
            );
          })}

          {/* 日志搜索和过滤 */}
          {activeTab === 'logs' && (
            <>
              <div className="flex-1" />
              <div className="relative w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  placeholder={t('gw.searchLogs')}
                  className="w-full h-7 pl-8 pr-2 bg-white/5 border border-white/5 rounded-lg text-[11px] text-white placeholder:text-white/20 focus:ring-1 focus:ring-primary/50 outline-none"
                />
              </div>
              <div className="w-px h-4 bg-white/10 mx-0.5" />
              <div className="flex items-center gap-0.5">
                {[120, 500, 1000].map((n) => (
                  <button
                    key={n}
                    onClick={() => { setLogLimit(n); fetchLogs(); }}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-[10px] font-bold transition-all',
                      logLimit === n ? 'bg-white/10 text-white/70' : 'bg-white/5 text-white/15 hover:text-white/40'
                    )}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5">
                {['trace', 'debug', 'info', 'warn', 'error', 'fatal'].map((lvl) => {
                  const colors: Record<string, string> = {
                    trace: 'bg-white/20', debug: 'bg-white/15', info: 'bg-blue-500',
                    warn: 'bg-yellow-500', error: 'bg-red-500', fatal: 'bg-red-700',
                  };
                  return (
                    <button
                      key={lvl}
                      onClick={() => setLevelFilters((f) => ({ ...f, [lvl]: !f[lvl] }))}
                      className={cn(
                        'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all',
                        levelFilters[lvl] ? `${colors[lvl]}/20 text-white/70` : 'bg-white/5 text-white/15 line-through'
                      )}
                    >
                      {lvl.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
              <button onClick={handleClearLogs} className="p-1.5 text-white/30 hover:text-white transition-colors" title={t('gw.clear')}>
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={exportLogs} className="p-1.5 text-white/30 hover:text-white transition-colors" title={t('gw.export')}>
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={() => setAutoFollow(!autoFollow)}
                className={cn('p-1.5 rounded transition-all', autoFollow ? 'text-primary' : 'text-white/30')}
                title={t('gw.autoFollow')}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </>
          )}
        </div>

        {/* Tab 内容 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {activeTab === 'logs' ? (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto font-mono text-[11px] p-4 custom-scrollbar">
                {filteredLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-white/15">
                    <Terminal className="w-8 h-8 mb-2" />
                    <span className="text-[10px]">{t('gw.noLogs')}</span>
                  </div>
                ) : (
                  renderedLogs.map(({ line: log, parsed }, idx) => {
                    const lineNum = omittedLogCount + idx + 1;
                    const needle = logSearch.trim().toLowerCase();
                    const highlightText = (text: string) => {
                      if (!needle || !text) return text;
                      const i = text.toLowerCase().indexOf(needle);
                      if (i === -1) return text;
                      return (
                        <>
                          {text.slice(0, i)}
                          <mark className="bg-yellow-400/30 text-inherit rounded px-0.5">
                            {text.slice(i, i + needle.length)}
                          </mark>
                          {text.slice(i + needle.length)}
                        </>
                      );
                    };
                    if (!parsed) {
                      return (
                        <div key={idx} className="flex gap-2 mb-0.5 group leading-relaxed hover:bg-white/[0.02] rounded px-1 -mx-1">
                          <span className="text-white/10 select-none w-6 text-end shrink-0 text-[10px]">{lineNum}</span>
                          <span className={cn(
                            'flex-1 text-white/60 break-all',
                            log.includes('ERROR') || log.includes('error') ? 'text-red-400' :
                            log.includes('WARN') || log.includes('warn') ? 'text-yellow-400' : ''
                          )}>
                            {highlightText(log)}
                          </span>
                          <button onClick={() => copyLogLine(log)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white shrink-0 transition-opacity">
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    }
                    const lvlColor =
                      parsed.level === 'error' || parsed.level === 'fatal' ? 'text-red-400' :
                      parsed.level === 'warn' ? 'text-yellow-400' :
                      parsed.level === 'debug' || parsed.level === 'trace' ? 'text-white/30' : 'text-white/60';
                    const lvlBg =
                      parsed.level === 'error' || parsed.level === 'fatal' ? 'bg-red-500/15' :
                      parsed.level === 'warn' ? 'bg-yellow-500/15' :
                      parsed.level === 'info' ? 'bg-blue-500/10' : 'bg-white/5';
                    const hasLongExtra = parsed.extra && parsed.extra.length > 80;
                    const isExtraExpanded = expandedExtras.has(idx);
                    return (
                      <div key={idx} className="flex gap-2 mb-0.5 group leading-relaxed hover:bg-white/[0.02] rounded px-1 -mx-1">
                        <span className="text-white/10 select-none w-6 text-end shrink-0 text-[10px]">{lineNum}</span>
                        <div className="flex-1 break-all">
                          {parsed.time && <span className="text-cyan-400/50 me-2">{parsed.time}</span>}
                          <span className={cn('inline-block px-1 rounded text-[11px] font-bold uppercase me-2', lvlColor, lvlBg)}>
                            {parsed.level}
                          </span>
                          <span className={lvlColor}>{highlightText(parsed.message)}</span>
                          {parsed.extra && (
                            hasLongExtra && !isExtraExpanded ? (
                              <button onClick={() => setExpandedExtras((prev) => new Set(prev).add(idx))} className="text-white/20 ms-2 text-[10px] hover:text-white/40">
                                {parsed.extra.slice(0, 80)}… ▸
                              </button>
                            ) : (
                              <span className="text-white/20 ms-2 text-[10px]">
                                {parsed.extra}
                                {hasLongExtra && (
                                  <button onClick={() => setExpandedExtras((prev) => { const n = new Set(prev); n.delete(idx); return n; })} className="text-primary/50 ms-1">▾</button>
                                )}
                              </span>
                            )
                          )}
                        </div>
                        <button onClick={() => copyLogLine(log)} className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-white shrink-0 transition-opacity">
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })
                )}
                <div ref={logEndRef} />
              </div>
              <div className="h-7 bg-black/40 px-4 flex items-center justify-between text-[11px] text-white/30 font-bold uppercase shrink-0">
                <div className="flex items-center gap-4">
                  <span>{filteredLogs.length} {t('gw.lines')}</span>
                  {omittedLogCount > 0 && <span>+{omittedLogCount}</span>}
                  {logStats.errors > 0 && <span className="text-red-400">{logStats.errors} ERR</span>}
                  {logStats.warns > 0 && <span className="text-yellow-400">{logStats.warns} WARN</span>}
                </div>
                <div className="flex items-center gap-3">
                  {activeProfile && (
                    <span className="text-primary/50 normal-case font-mono">
                      {activeProfile.host}:{activeProfile.port}
                    </span>
                  )}
                  <div className="flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    <span>{t('gw.secureSession')}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === 'events' ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <EventsPanel
              gw={gw}
              na={na}
              events={events}
              eventsLoading={eventsLoading}
              eventRisk={eventRisk}
              setEventRisk={setEventRisk}
              eventKeyword={eventKeyword}
              setEventKeyword={setEventKeyword}
              eventType={eventType}
              setEventType={setEventType}
              eventSource={eventSource}
              setEventSource={setEventSource}
              eventPage={eventPage}
              setEventPage={setEventPage}
              eventTotal={eventTotal}
              expandedEvents={expandedEvents}
              setExpandedEvents={setExpandedEvents}
              presetExceptionFilter={presetExceptionFilter}
              setPresetExceptionFilter={setPresetExceptionFilter}
              fetchEvents={fetchEvents}
              exportEvents={exportEvents}
            />
            </div>
          ) : activeTab === 'channels' ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ChannelsPanel
              gw={gw}
              channelsList={channelsList}
              channelsLoading={channelsLoading}
              channelLogoutLoading={channelLogoutLoading}
              fetchChannels={fetchChannels}
              handleChannelLogout={handleChannelLogout}
            />
            </div>
          ) : activeTab === 'service' ? (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <ServicePanel
              status={status}
              healthCheckEnabled={healthCheckEnabled}
              healthStatus={healthStatus}
              gw={gw}
              onCopy={(text) => {
                navigator.clipboard.writeText(text);
                toast('success', t('gw.serviceCopied'));
              }}
              toast={toast}
              remote={activeProfile ? !isLocal(activeProfile.host) : false}
            />
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <DebugPanel
              gw={gw}
              rpcMethod={rpcMethod}
              setRpcMethod={setRpcMethod}
              rpcParams={rpcParams}
              setRpcParams={setRpcParams}
              rpcResult={rpcResult}
              rpcError={rpcError}
              rpcLoading={rpcLoading}
              rpcHistory={rpcHistory}
              handleRpcCall={handleRpcCall}
              sysEventText={sysEventText}
              setSysEventText={setSysEventText}
              sysEventSending={sysEventSending}
              sysEventResult={sysEventResult}
              handleSendSystemEvent={handleSendSystemEvent}
              debugStatus={debugStatus}
              debugHealth={debugHealth}
              debugLoading={debugLoading}
              fetchDebugData={fetchDebugData}
            />
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};

export default GatewayMonitoringView;
