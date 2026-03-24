/**
 * AxonClaw - 定时Schedule (AxonClawX 风格)
 * Schedule器概览 | Task列表 | 历史记录
 */
import { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  Clock,
  Play,
  Trash2,
  RefreshCw,
  X,
  Search,
  Pencil,
  Copy,
  List,
  Loader2,
  History,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useCronStore } from '@/stores/cron';
import { useGatewayStore } from '@/stores/gateway';
import { hostApiFetch } from '@/lib/host-api';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { formatRelativeTimeZh, cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { CronJob, CronJobCreateInput, ScheduleType } from '@/types/cron';

const schedulePresets: { key: string; value: string; type: ScheduleType }[] = [
  { key: 'everyMinute', value: '* * * * *', type: 'interval' },
  { key: 'every5Min', value: '*/5 * * * *', type: 'interval' },
  { key: 'every15Min', value: '*/15 * * * *', type: 'interval' },
  { key: 'everyHour', value: '0 * * * *', type: 'interval' },
  { key: 'daily9am', value: '0 9 * * *', type: 'daily' },
  { key: 'daily6pm', value: '0 18 * * *', type: 'daily' },
  { key: 'weeklyMon', value: '0 9 * * 1', type: 'weekly' },
  { key: 'monthly1st', value: '0 9 1 * *', type: 'monthly' },
];

function getScheduleShort(schedule: unknown): string {
  if (typeof schedule === 'string') {
    if (schedule === '* * * * *') return 'Every 1 min';
    if (schedule === '*/5 * * * *') return 'Every 5 min';
    if (schedule === '*/15 * * * *') return 'Every 15 min';
    if (schedule === '0 * * * *') return 'Every 1h';
    if (schedule === '0 9 * * *') return 'Daily 9:00';
    if (schedule === '0 18 * * *') return 'Daily 18:00';
    const parts = schedule.split(' ');
    if (parts[0]?.startsWith('*/') && parts[1] === '*') {
      const m = parseInt(parts[0].slice(2), 10);
      if (m < 60) return `Every ${m} min`;
    }
    if (parts[0] === '0' && parts[1] !== '*' && parts[2] === '*') {
      return `Daily ${parts[1]}:00`;
    }
  }
  if (schedule && typeof schedule === 'object') {
    const s = schedule as { kind?: string; expr?: string; everyMs?: number };
    if (s.kind === 'every' && typeof s.everyMs === 'number') {
      const ms = s.everyMs;
      if (ms < 60_000) return `Every ${Math.round(ms / 1000)} sec`;
      if (ms < 3_600_000) return `Every ${Math.round(ms / 60_000)} min`;
      if (ms < 86_400_000) return `Every ${Math.round(ms / 3_600_000)}h`;
      return `Every ${Math.round(ms / 86_400_000)} day(s)`;
    }
    if (s.kind === 'cron' && s.expr) return getScheduleShort(s.expr);
  }
  return String(schedule ?? '—');
}

function estimateNextRun(scheduleExpr: string): string | null {
  const now = new Date();
  const next = new Date(now.getTime());
  const parts = scheduleExpr.split(' ');
  if (parts.length !== 5) return null;
  if (scheduleExpr === '0 * * * *') {
    next.setMinutes(0, 0, 0);
    next.setHours(next.getHours() + 1);
    return next.toISOString();
  }
  if (scheduleExpr === '*/5 * * * *') {
    const delta = 5 - (next.getMinutes() % 5 || 5);
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + delta);
    return next.toISOString();
  }
  if (scheduleExpr === '* * * * *') {
    next.setSeconds(0, 0);
    next.setMinutes(next.getMinutes() + 1);
    return next.toISOString();
  }
  return null;
}

interface SchedulerSummary {
  status: string;
  statusText: string;
  taskCount: number;
  nextWakeup: string;
  running: number;
}

interface TaskDialogProps {
  job?: CronJob;
  onClose: () => void;
  onSave: (input: CronJobCreateInput) => Promise<void>;
}

function TaskDialog({ job, onClose, onSave }: TaskDialogProps) {
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(job?.name || '');
  const [message, setMessage] = useState(job?.message || '');
  const initialSchedule = (() => {
    const s = job?.schedule;
    if (!s) return '0 9 * * *';
    if (typeof s === 'string') return s;
    if (typeof s === 'object' && 'expr' in s) return (s as { expr: string }).expr ?? '0 9 * * *';
    return '0 9 * * *';
  })();
  const [schedule, setSchedule] = useState(initialSchedule);
  const [customSchedule, setCustomSchedule] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [enabled, setEnabled] = useState(job?.enabled ?? true);

  const handleSubmit = async () => {
    if (!name.trim()) { toast.error('Please enter a task name'); return; }
    if (!message.trim()) { toast.error('Please enter a prompt'); return; }
    const finalSchedule = useCustom ? customSchedule : schedule;
    if (!finalSchedule.trim()) { toast.error('Please select or input a schedule'); return; }
    setSaving(true);
    try {
      await onSave({ name: name.trim(), message: message.trim(), schedule: finalSchedule, enabled });
      onClose();
      toast.success(job ? 'Updated' : 'Created');
    } catch (err) {
      toast.error(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <Card className="w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl border border-slate-700/60 bg-[#1f2937] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <CardHeader className="flex flex-row items-start justify-between pb-2 shrink-0 border-b border-white/10">
          <div>
            <h2 className="text-lg font-semibold text-white/90">{job ? 'Edit Task' : 'New Task'}</h2>
            <p className="text-sm text-white/50 mt-0.5">Supports periodic, scheduled, and cron expressions</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-lg h-8 w-8 text-white/60 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 overflow-y-auto flex-1 p-4">
          <div>
            <Label className="text-sm font-medium text-white/80">Task Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Memory sync" className="mt-1.5 h-9 bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-sm font-medium text-white/80">Prompt / Command</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Prompt to send to AI" rows={3} className="mt-1.5 bg-white/5 border-white/10 text-white resize-none" />
          </div>
          <div>
            <Label className="text-sm font-medium text-white/80">Schedule</Label>
            {!useCustom ? (
              <div className="grid grid-cols-2 gap-2 mt-1.5">
                {schedulePresets.map((p) => (
                  <Button key={p.value} type="button" variant="outline" size="sm" onClick={() => setSchedule(p.value)} className={cn('justify-start h-9', schedule === p.value ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-400' : 'bg-white/5 border-white/10 text-white/70')}>
                    {getScheduleShort(p.value)}
                  </Button>
                ))}
              </div>
            ) : (
              <Input value={customSchedule} onChange={(e) => setCustomSchedule(e.target.value)} placeholder="0 9 * * *" className="mt-1.5 h-9 bg-white/5 border-white/10 text-white font-mono" />
            )}
            <button type="button" onClick={() => setUseCustom(!useCustom)} className="text-xs text-white/50 hover:text-white/80 mt-1.5">
              {useCustom ? 'Use presets' : 'Custom cron'}
            </button>
          </div>
          <div className="flex items-center justify-between pt-2">
            <Label className="text-sm font-medium text-white/80">Enable after creation</Label>
            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded" />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="border-white/10 text-white/80">Cancel</Button>
            <Button onClick={handleSubmit} disabled={saving} className="bg-indigo-500 hover:bg-indigo-600 text-white">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {job ? 'Save' : 'Create'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface TaskCardProps {
  job: CronJob;
  onToggle: (enabled: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onTrigger: () => Promise<void>;
}

interface CronHistoryEntry {
  id: string;
  jobId: string;
  jobName: string;
  time: string;
  success: boolean;
  error?: string;
}

function CronHistorySection({ isOnline, onRefresh }: { isOnline: boolean; onRefresh: () => void }) {
  const [entries, setEntries] = useState<CronHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!isOnline) return;
    setLoading(true);
    try {
      const res = await hostApiFetch<{ entries?: CronHistoryEntry[] }>('/api/cron/history?limit=50');
      setEntries(Array.isArray(res?.entries) ? res.entries : []);
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    void fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#1f2937] mt-6 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-sky-400" />
          <span className="text-sm font-medium text-white/80">Run History</span>
        </div>
        <Button variant="ghost" size="sm" onClick={() => { fetchHistory(); onRefresh(); }} disabled={!isOnline || loading} className="h-7 px-2 text-white/50 hover:text-white/80">
          <RefreshCw className={cn('h-3.5 w-3.5', loading && 'animate-spin')} />
        </Button>
      </div>
      <div className="p-4">
        {!isOnline ? (
          <div className="py-8 text-center text-white/40 text-sm">Start Gateway first to view execution history</div>
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-white/40 text-sm">{loading ? 'Loading...' : 'No execution history'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-white/50 border-b border-white/10">
                  <th className="pb-2 pr-4 font-medium">Task</th>
                  <th className="pb-2 pr-4 font-medium">Execution Time</th>
                  <th className="pb-2 pr-4 font-medium">Status</th>
                  <th className="pb-2 font-medium">Notes</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-white/5 last:border-0">
                    <td className="py-2 pr-4 text-white/80">{e.jobName || e.jobId || '—'}</td>
                    <td className="py-2 pr-4 text-white/60">{formatRelativeTimeZh(e.time)}</td>
                    <td className="py-2 pr-4">
                      <span className={e.success ? 'text-emerald-400' : 'text-red-400'}>
                        {e.success ? <><CheckCircle2 className="h-3.5 w-3.5 inline mr-1" />Success</> : <><XCircle className="h-3.5 w-3.5 inline mr-1" />Failed</>}
                      </span>
                    </td>
                    <td className="py-2 text-white/40 text-xs max-w-[200px] truncate" title={e.error}>{e.error || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ job, onToggle, onEdit, onDuplicate, onDelete, onTrigger }: TaskCardProps) {
  const [triggering, setTriggering] = useState(false);
  const expr = typeof job.schedule === 'string' ? job.schedule : (job.schedule && typeof job.schedule === 'object' && 'expr' in job.schedule ? (job.schedule as { expr: string }).expr : '');
  const nextRun = job.nextRun || (expr ? estimateNextRun(expr) : null);
  const lastRun = job.lastRun?.time;

  const handleRun = async () => {
    setTriggering(true);
    try {
      await onTrigger();
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-700/60 bg-[#1f2937] p-4 hover:border-slate-600/80 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-base font-semibold text-white/90">{job.name}</h3>
            <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', job.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/10 text-white/50')}>
              {job.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
          <p className="text-sm text-white/50 mt-1">{getScheduleShort(job.schedule)}</p>
          <p className="text-sm text-white/60 mt-2 line-clamp-2 leading-relaxed">{job.message}</p>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="text-xs text-white/40">代理 ID: main</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-xs text-white/50">main</span>
            <span className="px-1.5 py-0.5 rounded bg-white/5 text-xs text-white/50">now</span>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-xs text-white/50">
            <span className={job.lastRun?.success !== false ? 'text-emerald-400' : 'text-red-400'}>Status: {job.lastRun?.success !== false ? 'ok' : 'error'}</span>
          </div>
          {nextRun && job.enabled && (
            <div className="text-xs text-sky-400 mt-0.5">Next run: {formatRelativeTimeZh(nextRun)}</div>
          )}
          {lastRun && (
            <div className="text-xs text-white/40 mt-0.5">Last: {formatRelativeTimeZh(lastRun)}</div>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t border-white/5">
        <Button variant="ghost" size="sm" onClick={onEdit} className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/5">
          <Pencil className="h-3.5 w-3.5 mr-1" />
          Edit
        </Button>
        <Button variant="ghost" size="sm" onClick={onDuplicate} className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/5">
          <Copy className="h-3.5 w-3.5 mr-1" />
          Duplicate
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onToggle(!job.enabled)} className="h-8 px-2 text-white/60 hover:text-white hover:bg-white/5">
          {job.enabled ? 'Disable' : 'Enable'}
        </Button>
        <Button variant="ghost" size="sm" onClick={handleRun} disabled={triggering} className="h-8 px-2 text-sky-400 hover:text-sky-300 hover:bg-sky-500/10">
          {triggering ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Play className="h-3.5 w-3.5 mr-1" />}
          Run
        </Button>
        <Button variant="ghost" size="sm" onClick={onDelete} className="h-8 px-2 text-red-400 hover:text-red-300 hover:bg-red-500/10">
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function Cron() {
  const { jobs, loading, error, fetchJobs, createJob, updateJob, toggleJob, deleteJob, triggerJob } = useCronStore();
  const gatewayStatus = useGatewayStore((s) => s.status);
  const [summary, setSummary] = useState<SchedulerSummary | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<CronJob | undefined>();
  const [jobToDelete, setJobToDelete] = useState<CronJob | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [sortBy, setSortBy] = useState<'next' | 'name'>('next');

  const isOnline = gatewayStatus.state === 'running';

  const refresh = useCallback(async () => {
    if (isOnline) {
      await fetchJobs();
      try {
        const s = await hostApiFetch<SchedulerSummary>('/api/scheduler/summary');
        setSummary(s);
      } catch {
        setSummary({ status: 'enabled', statusText: 'Enabled', taskCount: 0, nextWakeup: '—', running: 0 });
      }
    }
  }, [isOnline, fetchJobs]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  let filtered = safeJobs;
  if (filterStatus === 'enabled') filtered = filtered.filter((j) => j.enabled);
  else if (filterStatus === 'disabled') filtered = filtered.filter((j) => !j.enabled);
  if (search.trim()) filtered = filtered.filter((j) => j.name.toLowerCase().includes(search.toLowerCase()) || String(j.message).toLowerCase().includes(search.toLowerCase()));
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
    const na = a.nextRun ? new Date(a.nextRun).getTime() : 0;
    const nb = b.nextRun ? new Date(b.nextRun).getTime() : 0;
    return na - nb;
  });

  const handleSave = useCallback(async (input: CronJobCreateInput) => {
    if (editingJob) await updateJob(editingJob.id, input);
    else await createJob(input);
  }, [editingJob, createJob, updateJob]);

  const handleToggle = useCallback(async (id: string, enabled: boolean) => {
    await toggleJob(id, enabled);
    toast.success(enabled ? 'Enabled' : 'Disabled');
  }, [toggleJob]);

  const handleDuplicate = useCallback((job: CronJob) => {
    const input: CronJobCreateInput = {
      name: `${job.name} (Copy)`,
      message: job.message,
      schedule: typeof job.schedule === 'string' ? job.schedule : (job.schedule && typeof job.schedule === 'object' && 'expr' in job.schedule ? (job.schedule as { expr: string }).expr : '0 9 * * *'),
      enabled: job.enabled,
    };
    createJob(input).then(() => toast.success('Duplicated')).catch((e) => toast.error(String(e)));
  }, [createJob]);

  if (loading && safeJobs.length === 0) {
    return (
      <div className="flex flex-col w-full h-full min-h-0 bg-[#0b1220] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0b1220] overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-xl font-bold text-white/90">定时Schedule</h1>
              <p className="text-sm text-white/50 mt-1">
                定时Schedule用于配置 AI 代理的自动执行Task，Supports periodic, scheduled, and cron expressions三种Schedule方式
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={refresh} disabled={!isOnline || loading} className="border-white/10 text-white/70 hover:bg-white/5">
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
              </Button>
              <Button onClick={() => { setEditingJob(undefined); setShowDialog(true); }} disabled={!isOnline} className="bg-indigo-500 hover:bg-indigo-600 text-white">
                <Plus className="h-4 w-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>

          {/* Scheduler Overview */}
          <div className="rounded-xl border border-slate-700/60 bg-[#1f2937] overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
              <Clock className="h-4 w-4 text-sky-400" />
              <span className="text-sm font-medium text-white/80">Schedule器</span>
            </div>
            <div className="grid grid-cols-4 gap-px bg-border/40">
              <div className="p-4 bg-[#0b1220]">
                <div className="text-xs text-white/50">Status</div>
                <div className="text-sm font-medium text-emerald-400 mt-0.5">{summary?.statusText ?? 'Enabled'}</div>
              </div>
              <div className="p-4 bg-[#111827]">
                <div className="text-xs text-white/50">Task数</div>
                <div className="text-sm font-medium text-white/90 mt-0.5">{summary?.taskCount ?? safeJobs.length}</div>
              </div>
              <div className="p-4 bg-[#111827]">
                <div className="text-xs text-white/50">Next wake-up</div>
                <div className="text-sm font-medium text-sky-400 mt-0.5">{summary?.nextWakeup ?? '—'}</div>
              </div>
              <div className="p-4 bg-[#111827]">
                <div className="text-xs text-white/50">Run中</div>
                <div className="text-sm font-medium text-white/90 mt-0.5">{summary?.running ?? 0}</div>
              </div>
            </div>
          </div>

          {/* Task List */}
          <div className="rounded-xl border border-slate-700/60 bg-[#1f2937] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <List className="h-4 w-4 text-sky-400" />
                <span className="text-sm font-medium text-white/80">Task数 ({sorted.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-white/40" />
                  <Input placeholder="Search tasks..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-8 w-48 bg-white/5 border-white/10 text-sm" />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as 'all' | 'enabled' | 'disabled')} className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80">
                  <option value="all">All</option>
                  <option value="enabled">Enabled</option>
                  <option value="disabled">Disabled</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'next' | 'name')} className="h-8 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white/80">
                  <option value="next">Next run ↑</option>
                  <option value="name">By name</option>
                </select>
              </div>
            </div>
            <div className="p-4 space-y-3">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
              )}
              {!isOnline && (
                <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm text-center">
                  请先Start Gateway 以加载定时Task
                </div>
              )}
              {isOnline && sorted.length === 0 && (
                <div className="py-12 text-center text-white/50 text-sm">
                  {search.trim() ? 'No matching tasks' : 'No scheduled tasks'}
                </div>
              )}
              {sorted.map((job) => (
                <TaskCard
                  key={job.id}
                  job={job}
                  onToggle={(enabled) => handleToggle(job.id, enabled)}
                  onEdit={() => { setEditingJob(job); setShowDialog(true); }}
                  onDuplicate={() => handleDuplicate(job)}
                  onDelete={() => setJobToDelete(job)}
                  onTrigger={async () => { await triggerJob(job.id); await refresh(); }}
                />
              ))}
            </div>
          </div>

          {/* History */}
          <CronHistorySection isOnline={isOnline} onRefresh={refresh} />
        </div>
      </div>

      {showDialog && (
        <TaskDialog job={editingJob} onClose={() => { setShowDialog(false); setEditingJob(undefined); }} onSave={async (input) => { await handleSave(input); setShowDialog(false); setEditingJob(undefined); refresh(); }} />
      )}

      <ConfirmDialog
        open={!!jobToDelete}
        title="Confirm deletion"
        message={`确定DeleteTask「${jobToDelete?.name}"?`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={async () => {
          if (jobToDelete) {
            await deleteJob(jobToDelete.id);
            setJobToDelete(null);
            toast.success('Deleted');
            refresh();
          }
        }}
        onCancel={() => setJobToDelete(null)}
      />
    </div>
  );
}

export default Cron;
