/**
 * TasksView — 任务总览页面
 * 展示所有进行中和已完成的任务、子任务进度、时间线、完整输出内容
 */
import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useTaskMonitorStore, type TaskRunRecord, type TaskRunStatus, type TaskTimelineEvent } from '@/stores/task-monitor';
import { useChatStore, type ToolStatus } from '@/stores/chat';
import { useAgentsStore } from '@/stores/agents';
import { Trash2 } from 'lucide-react';

type TabKey = 'running' | 'completed' | 'failed' | 'all';

/** Pulsing dot indicator */
function PulseDot({ color = 'bg-blue-400' }: { color?: string }) {
  return (
    <span className="relative flex h-2 w-2 flex-shrink-0">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${color} opacity-60`} />
      <span className={`relative inline-flex rounded-full h-2 w-2 ${color}`} />
    </span>
  );
}

function StatusBadge({ status }: { status: TaskRunStatus }) {
  const { t } = useTranslation('tasks');
  const styles: Record<TaskRunStatus, string> = {
    pending: 'bg-amber-500/20 text-amber-300',
    running: 'bg-blue-500/20 text-blue-300',
    completed: 'bg-emerald-500/20 text-emerald-300',
    failed: 'bg-rose-500/20 text-rose-300',
  };
  const labels: Record<TaskRunStatus, string> = {
    pending: t('statusPending'),
    running: t('statusRunning'),
    completed: t('statusCompleted'),
    failed: t('statusFailed'),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status === 'running' && <PulseDot color="bg-blue-400" />}
      {labels[status]}
    </span>
  );
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString();
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

function EventIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    queued: '⏳',
    started: '▶️',
    completed: '✅',
    failed: '❌',
    message: '💬',
    tool: '🔧',
  };
  return <span className="text-xs">{icons[type] || '•'}</span>;
}

/** Resolve agent display info from agents store */
function useAgentInfo(agentId: string | undefined) {
  const agents = useAgentsStore((s) => s.agents);
  const identity = useAgentsStore((s) => s.identity);

  return useMemo(() => {
    if (!agentId) return null;
    const agent = agents.find((a) => a.id === agentId);
    if (!agent) return { id: agentId, name: agentId, emoji: '' };
    const id = identity[agent.id];
    const name = id?.name?.trim() || agent.name?.trim() || agent.id;
    const emoji = id?.emoji?.trim() || id?.avatar?.trim() || '';
    return { id: agent.id, name, emoji };
  }, [agentId, agents, identity]);
}

/** Agent name + icon badge */
function AgentBadge({ agentId }: { agentId?: string }) {
  const info = useAgentInfo(agentId);
  if (!info) return null;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/20 text-[11px] text-purple-300">
      {info.emoji ? (
        <span className="text-sm leading-none">{info.emoji}</span>
      ) : (
        <span className="w-3.5 h-3.5 rounded-full bg-purple-500/30 flex items-center justify-center text-[9px] text-purple-200 font-bold flex-shrink-0">
          {info.name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="truncate max-w-[120px]">{info.name}</span>
    </span>
  );
}

/** Expandable text block with "show more / show less" */
function ExpandableText({ text, previewLines = 6 }: { text: string; previewLines?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = text.split('\n');
  const needsExpand = lines.length > previewLines || text.length > 300;

  if (!needsExpand) {
    return <div className="text-[11px] text-white/60 mt-1 whitespace-pre-wrap break-words">{text}</div>;
  }

  const displayText = isExpanded ? text : lines.slice(0, previewLines).join('\n') + (lines.length > previewLines ? '\n...' : '');

  return (
    <div className="mt-1">
      <div className="text-[11px] text-white/60 whitespace-pre-wrap break-words">{displayText}</div>
      <button
        onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
        className="text-[10px] text-cyan-400 hover:text-cyan-300 mt-1 transition-colors"
      >
        {isExpanded ? '▲ 收起' : '▼ 展开全部'}
      </button>
    </div>
  );
}

/** Result / output content card shown below the task header */
function ResultCard({ result, status }: { result: string; status: TaskRunStatus }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const borderColor = status === 'failed' ? 'border-rose-500/20' : 'border-emerald-500/20';
  const bgColor = status === 'failed' ? 'bg-rose-500/5' : 'bg-emerald-500/5';
  const labelColor = status === 'failed' ? 'text-rose-300' : 'text-emerald-300';
  const label = status === 'failed' ? '错误输出' : '完成输出';

  return (
    <div className={`mx-4 mb-3 rounded-lg border ${borderColor} ${bgColor} overflow-hidden`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className={`text-xs font-medium ${labelColor}`}>{label}</span>
        <span className="text-white/30 text-xs">{isExpanded ? '▾' : '▸'}</span>
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 max-h-96 overflow-y-auto">
              <div className="text-[12px] text-white/70 whitespace-pre-wrap break-words leading-relaxed font-mono">
                {result}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Single timeline event row */
function TimelineEventRow({ evt, isLast }: { evt: TaskTimelineEvent; isLast: boolean }) {
  return (
    <div className="flex gap-2">
      {/* Timeline connector */}
      <div className="flex flex-col items-center w-5 flex-shrink-0">
        <EventIcon type={evt.type} />
        {!isLast && <div className="flex-1 w-px bg-white/10 my-0.5" />}
      </div>
      {/* Event content */}
      <div className="flex-1 p-2 rounded-lg bg-white/[0.03] min-w-0 mb-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-white/85 text-xs font-medium truncate">{evt.title}</span>
          <span className="text-[10px] text-white/35 flex-shrink-0">
            {formatTime(evt.at)}
          </span>
        </div>
        {evt.detail && (
          <ExpandableText text={evt.detail} previewLines={evt.type === 'message' || evt.type === 'completed' || evt.type === 'failed' ? 10 : 4} />
        )}
      </div>
    </div>
  );
}

/** Single task card with expandable timeline */
function TaskCard({ run, onDelete }: { run: TaskRunRecord; onDelete: (localId: string) => void }) {
  const [expanded, setExpanded] = useState(run.status === 'running');
  const { t } = useTranslation('tasks');
  const duration = run.updatedAt - run.createdAt;

  const hasResult = Boolean(run.result && run.result.trim());
  const childRunCount = run.childRunIds?.length || 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/[0.03] overflow-hidden"
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <StatusBadge status={run.status} />
              {run.agentId && <AgentBadge agentId={run.agentId} />}
              <span className="text-[11px] text-white/40">{run.source}</span>
            </div>
            <h4 className="text-white font-medium text-sm">
              {run.task || run.sessionKey || t('untitled')}
            </h4>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-white/40">
              <span>{formatTime(run.createdAt)}</span>
              {duration > 0 && <span>{formatDuration(duration)}</span>}
              <span>{run.events.length} {t('eventsCount')}</span>
              {childRunCount > 0 && <span>{childRunCount} {t('childRunsCount', { defaultValue: '子任务' })}</span>}
              {hasResult && <span className="text-emerald-400/60">● 有输出</span>}
            </div>
          </div>
          <div className="flex-shrink-0 text-white/30 text-sm mt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(run.localId);
                }}
                className="p-1 rounded-md text-white/35 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                title={t('deleteRecord')}
                aria-label={t('deleteRecord')}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <span>{expanded ? '▾' : '▸'}</span>
            </div>
          </div>
        </div>

        {/* Session / Run ID */}
        {run.sessionKey && (
          <div className="mt-2 text-[11px] text-white/35 truncate">
            {t('sessionLabel')}: {run.sessionKey}
            {run.runId && <span className="ml-3">{t('runLabel')}: {run.runId}</span>}
          </div>
        )}
      </button>

      {/* Result output card - always visible when task has result (above timeline) */}
      {hasResult && run.result && (run.status === 'completed' || run.status === 'failed') && (
        <ResultCard result={run.result} status={run.status} />
      )}

      {/* Expandable Timeline */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-white/5 pt-3">
              <div className="space-y-0.5 max-h-[600px] overflow-y-auto pr-1">
                {run.events.map((evt, idx) => (
                  <TimelineEventRow key={evt.id} evt={evt} isLast={idx === run.events.length - 1} />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/** Live streaming tools panel (shown when tasks are actively running) */
function LiveToolsPanel() {
  const { t } = useTranslation('tasks');
  const streamingTools = useChatStore((s) => s.streamingTools);
  const sending = useChatStore((s) => s.sending);

  if (!sending && streamingTools.length === 0) return null;

  const completed = streamingTools.filter((t) => t.status === 'completed').length;
  const total = streamingTools.length;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <PulseDot color="bg-cyan-400" />
          <h3 className="text-white font-semibold text-sm">{t('liveExecution')}</h3>
        </div>
        {total > 0 && (
          <span className="text-[11px] text-white/50">{completed}/{total}</span>
        )}
      </div>

      {total > 0 && (
        <div className="w-full h-1 rounded-full bg-white/10 overflow-hidden mb-3">
          <div
            className="h-full rounded-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${total > 0 ? (completed / total) * 100 : 0}%` }}
          />
        </div>
      )}

      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {streamingTools.map((tool) => (
          <div
            key={tool.toolCallId || tool.id || tool.name}
            className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-white/[0.03]"
          >
            <div className="flex items-center gap-2 min-w-0">
              {tool.status === 'running' ? (
                <PulseDot color="bg-cyan-400" />
              ) : tool.status === 'completed' ? (
                <span className="text-emerald-400 text-[10px]">✓</span>
              ) : (
                <span className="text-rose-400 text-[10px]">✗</span>
              )}
              <span className="text-white/85 text-xs truncate">{tool.name}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {tool.durationMs != null && (
                <span className="text-[10px] text-white/35">{formatDuration(tool.durationMs)}</span>
              )}
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                tool.status === 'error' ? 'bg-rose-500/20 text-rose-300'
                  : tool.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-cyan-500/20 text-cyan-300'
              }`}>
                {tool.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/** Empty state placeholder */
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-white/40">
      <div className="text-4xl mb-3">📋</div>
      <div className="text-sm">{message}</div>
    </div>
  );
}

export function TasksView() {
  const { t } = useTranslation('tasks');
  const runs = useTaskMonitorStore((s) => s.runs);
  const removeRun = useTaskMonitorStore((s) => s.removeRun);
  const ensureHydrated = useTaskMonitorStore((s) => s.ensureHydrated);
  const loadMore = useTaskMonitorStore((s) => s.loadMore);
  const loadingMore = useTaskMonitorStore((s) => s.loadingMore);
  const hasMore = useTaskMonitorStore((s) => s.hasMore);
  const hydrating = useTaskMonitorStore((s) => s.hydrating);
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  useEffect(() => {
    void ensureHydrated();
  }, [ensureHydrated]);

  const visibleRuns = useMemo(
    () => runs,
    [runs],
  );

  const tabs: { key: TabKey; label: string; count: number }[] = useMemo(() => {
    const running = visibleRuns.filter((r) => r.status === 'running' || r.status === 'pending');
    const completed = visibleRuns.filter((r) => r.status === 'completed');
    const failed = visibleRuns.filter((r) => r.status === 'failed');
    return [
      { key: 'all', label: t('tabAll'), count: visibleRuns.length },
      { key: 'running', label: t('tabRunning'), count: running.length },
      { key: 'completed', label: t('tabCompleted'), count: completed.length },
      { key: 'failed', label: t('tabFailed'), count: failed.length },
    ];
  }, [visibleRuns, t]);

  const filteredRuns = useMemo(() => {
    let filtered: TaskRunRecord[];
    switch (activeTab) {
      case 'running':
        filtered = visibleRuns.filter((r) => r.status === 'running' || r.status === 'pending');
        break;
      case 'completed':
        filtered = visibleRuns.filter((r) => r.status === 'completed');
        break;
      case 'failed':
        filtered = visibleRuns.filter((r) => r.status === 'failed');
        break;
      default:
        filtered = visibleRuns;
    }
    return [...filtered].sort((a, b) => b.updatedAt - a.updatedAt);
  }, [visibleRuns, activeTab]);

  const stats = useMemo(() => {
    const running = visibleRuns.filter((r) => r.status === 'running' || r.status === 'pending').length;
    const completed = visibleRuns.filter((r) => r.status === 'completed').length;
    const failed = visibleRuns.filter((r) => r.status === 'failed').length;
    const total = visibleRuns.length;
    return { running, completed, failed, total };
  }, [visibleRuns]);

  const clearFinishedVisible = () => {
    const done = visibleRuns.filter((r) => r.status === 'completed' || r.status === 'failed');
    for (const run of done) {
      removeRun(run.localId);
    }
  };

  const loadMoreButton = hasMore ? (
    <div className="flex justify-center pt-2">
      <button
        type="button"
        onClick={() => void loadMore()}
        disabled={loadingMore}
        className="px-4 py-2 rounded-lg text-xs text-white/70 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loadingMore ? t('loadingMore') : t('loadMore')}
      </button>
    </div>
  ) : null;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-5 pb-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-semibold text-white">{t('title')}</h1>
            <p className="text-sm text-white/50 mt-0.5">{t('subtitle')}</p>
          </div>
          {stats.total > 0 && (
            <button
              onClick={clearFinishedVisible}
              className="px-3 py-1.5 rounded-lg text-xs text-white/60 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
            >
              {t('clearFinished')}
            </button>
          )}
        </div>

        {/* Stats summary */}
        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/15">
            {stats.running > 0 && <PulseDot />}
            <span className="text-xs text-blue-300">{stats.running} {t('statRunning')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/15">
            <span className="text-xs text-emerald-300">{stats.completed} {t('statCompleted')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/15">
            <span className="text-xs text-rose-300">{stats.failed} {t('statFailed')}</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
            <span className="text-xs text-white/60">{stats.total} {t('statTotal')}</span>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                activeTab === tab.key
                  ? 'bg-white/15 text-white font-medium'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">{tab.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
        <div className="space-y-4 max-w-4xl">
          {/* Live execution panel */}
          <LiveToolsPanel />

          {/* Task list */}
          {filteredRuns.length > 0 ? (
            <div className="space-y-3">
              {filteredRuns.map((run) => (
                <TaskCard key={run.localId} run={run} onDelete={removeRun} />
              ))}
              {loadMoreButton}
            </div>
          ) : hydrating ? (
            <EmptyState message={t('loading')} />
          ) : (
            <>
              <EmptyState message={t('empty')} />
              {loadMoreButton}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
