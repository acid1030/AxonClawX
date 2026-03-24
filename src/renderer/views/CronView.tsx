/**
 * AxonClaw - Cron View
 * 定时任务界面 - AxonClawX 风格，useCronStore 真实数据
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Clock,
  Play,
  Pause,
  Trash2,
  Calendar,
} from 'lucide-react';
import { useCronStore } from '@/stores/cron';
import { useGatewayStore } from '@/stores/gateway';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

function formatSchedule(schedule: unknown): string {
  if (typeof schedule === 'string') return schedule;
  if (schedule && typeof schedule === 'object') {
    const s = schedule as { kind?: string; expr?: string; everyMs?: number; at?: string };
    if (s.kind === 'cron' && s.expr) return s.expr;
    if (s.kind === 'every' && s.everyMs) {
      const ms = s.everyMs;
      if (ms < 60_000) return i18n.t('views.cron.schedule.everySeconds', { count: Math.round(ms / 1000) });
      if (ms < 3_600_000) return i18n.t('views.cron.schedule.everyMinutes', { count: Math.round(ms / 60_000) });
      if (ms < 86_400_000) return i18n.t('views.cron.schedule.everyHours', { count: Math.round(ms / 3_600_000) });
      return i18n.t('views.cron.schedule.everyDays', { count: Math.round(ms / 86_400_000) });
    }
    if (s.kind === 'at' && s.at) return s.at;
  }
  return String(schedule ?? i18n.t('views.cron.common.emptyMark'));
}

function formatLastRun(lastRun?: { time?: string; success?: boolean }): string {
  if (!lastRun?.time) return i18n.t('views.cron.common.emptyMark');
  try {
    const d = new Date(lastRun.time);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 60_000) return i18n.t('views.cron.lastRun.justNow');
    if (diff < 3_600_000) return i18n.t('views.cron.lastRun.minutesAgo', { count: Math.floor(diff / 60_000) });
    if (diff < 86_400_000) return i18n.t('views.cron.lastRun.hoursAgo', { count: Math.floor(diff / 3_600_000) });
    return d.toLocaleDateString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch {
    return lastRun.time;
  }
}

const CronView: React.FC = () => {
  const jobs = useCronStore((s) => s.jobs);
  const loading = useCronStore((s) => s.loading);
  const error = useCronStore((s) => s.error);
  const fetchJobs = useCronStore((s) => s.fetchJobs);
  const toggleJob = useCronStore((s) => s.toggleJob);
  const triggerJob = useCronStore((s) => s.triggerJob);
  const deleteJob = useCronStore((s) => s.deleteJob);

  const gatewayStatus = useGatewayStore((s) => s.status);
  const isOnline = gatewayStatus.state === 'running';

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    await fetchJobs();
  }, [fetchJobs]);

  useEffect(() => {
    if (isOnline) {
      fetchJobs().catch(console.error);
    }
  }, [isOnline, fetchJobs]);

  const handleToggle = async (id: string, enabled: boolean) => {
    try {
      await toggleJob(id, enabled);
    } catch (e) {
      console.error('Toggle failed:', e);
    }
  };

  const handleTrigger = async (id: string) => {
    try {
      await triggerJob(id);
    } catch (e) {
      console.error('Trigger failed:', e);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(i18n.t('views.cron.confirmDelete'))) return;
    setDeletingId(id);
    try {
      await deleteJob(id);
    } catch (e) {
      console.error('Delete failed:', e);
    } finally {
      setDeletingId(null);
    }
  };

  const safeJobs = Array.isArray(jobs) ? jobs : [];
  const enabledCount = safeJobs.filter((j) => j.enabled).length;

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0b1220] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        <PageHeader
          title={i18n.t('views.cron.title')}
          subtitle={i18n.t('views.cron.subtitle')}
          stats={[
            { label: i18n.t('views.cron.stats.running'), value: `${enabledCount}/${safeJobs.length}` },
            { label: i18n.t('views.cron.stats.gateway'), value: isOnline ? i18n.t('views.cron.gateway.online') : i18n.t('views.cron.gateway.offline') },
          ]}
          onRefresh={refresh}
          refreshing={loading}
          statsBorderColor="border-amber-500/40"
        />

        {error && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {error}
          </div>
        )}

        {!isOnline ? (
          <div className="rounded-xl border-2 border-slate-700/60 bg-[#1f2937] p-8 text-center">
            <p className="text-muted-foreground text-sm">{i18n.t('views.cron.gatewayRequired')}</p>
            <p className="text-muted-foreground/70 text-xs mt-1">{i18n.t('views.cron.clickStartGateway')}</p>
          </div>
        ) : safeJobs.length === 0 ? (
          <div className="rounded-xl border-2 border-slate-700/60 bg-[#1f2937] p-8 flex flex-col items-center justify-center">
            <Clock className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground text-sm">{i18n.t('views.cron.empty')}</p>
          </div>
        ) : (
          <div className="space-y-3 max-w-3xl">
            {safeJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border-2 border-slate-700/60 bg-[#1f2937] p-4 flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
                      job.enabled ? 'bg-amber-500/15' : 'bg-black/5 dark:bg-white/5'
                    )}
                  >
                    <Calendar
                      className={cn(
                        'w-5 h-5',
                        job.enabled ? 'text-amber-500' : 'text-muted-foreground'
                      )}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-foreground">
                      {job.name}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-0.5">
                      {formatSchedule(job.schedule)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">{i18n.t('views.cron.lastRun.label')}</div>
                    <div className="text-xs text-foreground/80">
                      {formatLastRun(job.lastRun)}
                    </div>
                  </div>
                  <span
                    className={cn(
                      'px-2 py-1 rounded-lg text-xs font-medium',
                      job.enabled
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-black/5 dark:bg-white/5 text-muted-foreground'
                    )}
                  >
                    {job.enabled ? i18n.t('views.cron.badges.running') : i18n.t('views.cron.badges.paused')}
                  </span>
                  <button
                    onClick={() => handleToggle(job.id, !job.enabled)}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title={job.enabled ? i18n.t('views.cron.actions.pause') : i18n.t('views.cron.actions.enable')}
                  >
                    {job.enabled ? (
                      <Pause className="w-4 h-4 text-slate-500" />
                    ) : (
                      <Play className="w-4 h-4 text-emerald-500" />
                    )}
                  </button>
                  <button
                    onClick={() => handleTrigger(job.id)}
                    className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    title={i18n.t('views.cron.actions.runNow')}
                  >
                    <Play className="w-4 h-4 text-primary" />
                  </button>
                  <button
                    onClick={() => handleDelete(job.id)}
                    disabled={deletingId === job.id}
                    className="p-1.5 rounded-lg hover:bg-red-500/10 text-muted-foreground hover:text-red-500 transition-colors disabled:opacity-50"
                    title={i18n.t('views.cron.actions.delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { CronView };
export default CronView;
