/**
 * AxonClaw - Activity View
 * 活动流：Gateway 事件、消息收发、工具调用记录
 * AxonClawX 风格
 */

import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Filter, Zap } from 'lucide-react';
import { useGatewayLogsStore } from '@/stores/gateway-logs';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

type EventFilter = 'ALL' | 'MESSAGE' | 'TOOL' | 'SESSION' | 'INFO';

interface ActivityViewProps {
  /** 嵌入模式：在 RunView 等复合视图中使用 */
  embedded?: boolean;
}

const ActivityView: React.FC<ActivityViewProps> = ({ embedded }) => {
  const {
    logs,
    addStreamLog,
    fetchSystemLogs,
    clearLogs,
    systemLogsLoading,
    systemLogsError,
  } = useGatewayLogsStore();

  const [eventFilter, setEventFilter] = useState<EventFilter>('ALL');

  useEffect(() => {
    void fetchSystemLogs(200);
  }, [fetchSystemLogs]);

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    if (!ipc?.on) return;
    const unsub = ipc.on(
      'app:gateway-log',
      (payload: { time?: string; level?: string; agent?: string; message?: string }) => {
        addStreamLog({
          time: payload.time ?? new Date().toLocaleTimeString(i18n.language === 'zh' ? 'zh-CN' : 'en-US', { hour12: false }),
          level: payload.level ?? 'INFO',
          agent: payload.agent ?? 'Gateway',
          message: payload.message ?? '',
        });
      },
    );
    return unsub;
  }, [addStreamLog]);

  const filteredLogs = logs.filter((log) => {
    if (eventFilter === 'ALL') return true;
    const msg = (log.message ?? '').toLowerCase();
    if (eventFilter === 'MESSAGE') return msg.includes('message') || msg.includes('chat') || msg.includes('send');
    if (eventFilter === 'TOOL') return msg.includes('tool') || msg.includes('invoke');
    if (eventFilter === 'SESSION') return msg.includes('session');
    if (eventFilter === 'INFO') return log.level === 'INFO';
    return true;
  });

  const eventFilters: { value: EventFilter; label: string }[] = [
    { value: 'ALL', label: i18n.t('views.activity.filters.all') },
    { value: 'MESSAGE', label: i18n.t('views.activity.filters.message') },
    { value: 'TOOL', label: i18n.t('views.activity.filters.tool') },
    { value: 'SESSION', label: i18n.t('views.activity.filters.session') },
    { value: 'INFO', label: i18n.t('views.activity.filters.info') },
  ];

  return (
    <div
      className={cn(
        'flex flex-col bg-[#0f172a] overflow-hidden',
        'h-full min-h-0'
      )}
    >
      <div className="w-full flex flex-col h-full py-6 min-h-0">
        <PageHeader
          title={i18n.t('views.activity.title')}
          subtitle={i18n.t('views.activity.subtitle')}
          stats={[{ label: i18n.t('views.activity.stats.eventCount'), value: filteredLogs.length }]}
          onRefresh={() => void fetchSystemLogs(200)}
          refreshing={systemLogsLoading}
          statsBorderColor="border-amber-500/40"
          actions={
            <button
              onClick={clearLogs}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-500/20 transition-colors"
            >
              {i18n.t('views.activity.actions.clear')}
            </button>
          }
        />

        {systemLogsError && (
          <div className="mb-4 px-4 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm">
            {systemLogsError}
          </div>
        )}

        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          {eventFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setEventFilter(f.value)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                eventFilter === f.value
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'text-muted-foreground hover:bg-white/5'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex-1 rounded-xl border-2 border-amber-500/40 bg-[#1e293b] overflow-hidden flex flex-col min-h-[280px]">
          <div className="flex-1 overflow-y-auto p-4 font-mono text-xs">
            {filteredLogs.length === 0 ? (
              <div className="text-muted-foreground py-8 text-center">
                {systemLogsLoading
                  ? i18n.t('views.activity.loading')
                  : eventFilter !== 'ALL'
                    ? i18n.t('views.activity.noTypeEvents', { type: eventFilter })
                    : i18n.t('views.activity.empty')}
              </div>
            ) : (
              filteredLogs.map((log, index) => (
                <div
                  key={`${log.source}-${index}`}
                  className="flex items-baseline gap-2 py-1 hover:bg-white/5 rounded px-1 -mx-1"
                >
                  <span className="text-muted-foreground/70 min-w-[70px] shrink-0">{log.time}</span>
                  <span
                    className={cn(
                      'min-w-[52px] font-medium shrink-0',
                      log.level === 'ERROR' && 'text-red-400',
                      log.level === 'WARN' && 'text-amber-400',
                      log.level === 'INFO' && 'text-cyan-400',
                      log.level === 'DEBUG' && 'text-muted-foreground/70'
                    )}
                  >
                    [{log.level}]
                  </span>
                  <span className="min-w-[80px] shrink-0 text-emerald-400/90">[{log.agent}]</span>
                  <span className="text-slate-200 dark:text-foreground/90 flex-1 break-all">
                    {log.message}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-4 px-4 py-2 border-t border-slate-700/50 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{i18n.t('views.activity.realtime')}</span>
            </div>
            <span>{i18n.t('views.activity.recordCount', { count: filteredLogs.length })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ActivityView };
export default ActivityView;
