/**
 * Chat Page
 * Native React implementation communicating with OpenClaw Gateway
 * via gateway:rpc IPC. Session selector, thinking toggle, and refresh
 * are in the toolbar; messages render with markdown + streaming.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertCircle, CheckCircle2, Clock3, ListChecks, Loader2, Sparkles } from 'lucide-react';
import { useChatStore, type RawMessage, type RunMonitorState } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { useAgentsStore } from '@/stores/agents';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatToolbar } from './ChatToolbar';
import { extractImages, extractText, extractThinking, extractToolUse } from './message-utils';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useStickToBottomInstant } from '@/hooks/use-stick-to-bottom-instant';
import { useMinLoading } from '@/hooks/use-min-loading';

export function Chat() {
  const { t } = useTranslation('chat');
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';

  const messages = useChatStore((s) => s.messages);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const loading = useChatStore((s) => s.loading);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const showThinking = useChatStore((s) => s.showThinking);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const pendingFinal = useChatStore((s) => s.pendingFinal);
  const activityLabel = useChatStore((s) => s.activityLabel);
  const runMonitor = useChatStore((s) => s.runMonitor);
  const messageQueue = useChatStore((s) => s.messageQueue);
  const currentSessionQueue = messageQueue.filter((item) => (
    !item.sessionKey || item.sessionKey === currentSessionKey
  ));
  const queuedCount = currentSessionQueue.length;
  const sendMessage = useChatStore((s) => s.sendMessage);
  const abortRun = useChatStore((s) => s.abortRun);
  const clearError = useChatStore((s) => s.clearError);
  const fetchAgents = useAgentsStore((s) => s.fetchAgents);

  const cleanupEmptySession = useChatStore((s) => s.cleanupEmptySession);

  const [streamingTimestamp, setStreamingTimestamp] = useState<number>(0);
  const minLoading = useMinLoading(loading && messages.length > 0);
  const { contentRef, scrollRef } = useStickToBottomInstant(currentSessionKey);
  const autoScrollRafRef = useRef<number | null>(null);

  const animateScrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    if (autoScrollRafRef.current != null) {
      cancelAnimationFrame(autoScrollRafRef.current);
      autoScrollRafRef.current = null;
    }

    const startTop = el.scrollTop;
    const targetTop = el.scrollHeight - el.clientHeight;
    const distance = targetTop - startTop;

    if (distance <= 1) {
      el.scrollTop = targetTop;
      return;
    }

    // Keep duration short and bounded; long histories still feel smooth.
    const duration = Math.max(280, Math.min(900, Math.abs(distance) * 0.35));
    const startTime = performance.now();

    const easeInOutCubic = (t: number) => (t < 0.5
      ? 4 * t * t * t
      : 1 - Math.pow(-2 * t + 2, 3) / 2);

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = easeInOutCubic(progress);
      el.scrollTop = startTop + distance * eased;

      if (progress < 1) {
        autoScrollRafRef.current = requestAnimationFrame(step);
      } else {
        autoScrollRafRef.current = null;
      }
    };

    autoScrollRafRef.current = requestAnimationFrame(step);
  }, [scrollRef]);

  // Load data when gateway is running.
  // When the store already holds messages for this session (i.e. the user
  // is navigating *back* to Chat), use quiet mode so the existing messages
  // stay visible while fresh data loads in the background.  This avoids
  // an unnecessary messages → spinner → messages flicker.
  useEffect(() => {
    return () => {
      // If the user navigates away without sending any messages, remove the
      // empty session so it doesn't linger as a ghost entry in the sidebar.
      cleanupEmptySession();
    };
  }, [cleanupEmptySession]);

  useEffect(() => {
    void fetchAgents();
  }, [fetchAgents]);

  // Update timestamp when sending starts
  useEffect(() => {
    if (sending && streamingTimestamp === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStreamingTimestamp(Date.now() / 1000);
    } else if (!sending && streamingTimestamp !== 0) {
      setStreamingTimestamp(0);
    }
  }, [sending, streamingTimestamp]);

  useEffect(() => {
    if (!loading) {
      // Session switched / history loaded / refresh completed → animate from top to bottom
      animateScrollToBottom();
    }
  }, [loading, currentSessionKey, messages.length, animateScrollToBottom]);

  useEffect(() => {
    return () => {
      if (autoScrollRafRef.current != null) {
        cancelAnimationFrame(autoScrollRafRef.current);
      }
    };
  }, []);

  // Gateway not running block has been completely removed so the UI always renders.

  const streamMsg = streamingMessage && typeof streamingMessage === 'object'
    ? streamingMessage as unknown as { role?: string; content?: unknown; timestamp?: number }
    : null;
  const streamText = streamMsg ? extractText(streamMsg) : (typeof streamingMessage === 'string' ? streamingMessage : '');
  const hasStreamText = streamText.trim().length > 0;
  const streamThinking = streamMsg ? extractThinking(streamMsg) : null;
  const hasStreamThinking = showThinking && !!streamThinking && streamThinking.trim().length > 0;
  const streamTools = streamMsg ? extractToolUse(streamMsg) : [];
  const hasStreamTools = streamTools.length > 0;
  const streamImages = streamMsg ? extractImages(streamMsg) : [];
  const hasStreamImages = streamImages.length > 0;
  const hasStreamToolStatus = streamingTools.length > 0;
  const shouldRenderStreaming = sending && (hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus);
  const hasAnyStreamContent = hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus;
  const displayActivityLabel = useCallback((value?: string | null) => {
    if (!value) return t('composer.running', { defaultValue: '任务执行中，等待模型返回' });
    if (value.startsWith('activityTool:')) {
      return t('composer.activityTool', {
        tool: value.slice('activityTool:'.length) || 'tool',
        defaultValue: '正在执行工具：{{tool}}',
      });
    }
    return t(`composer.${value}`, {
      defaultValue: t('composer.running', { defaultValue: '任务执行中，等待模型返回' }),
    });
  }, [t]);

  const isEmpty = messages.length === 0 && !sending;

  return (
    <div className={cn("relative flex flex-col w-full h-full min-h-0 transition-colors duration-500 dark:bg-background")}>
      {/* 标题 + 绿线，固定在顶部 */}
      <div className="sticky top-0 z-10 shrink-0 bg-background dark:bg-background pt-4 pb-2">
        <h1 className="text-base font-bold text-foreground mb-2">{t('title', { defaultValue: 'Chat' })}</h1>
        <div className={cn(
          'h-[3px] w-full transition-all duration-700 shrink-0 mb-2',
          isGatewayRunning ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400' : 'bg-black/10 dark:bg-white/10'
        )} />
      </div>
      {/* Toolbar */}
      <div className="flex shrink-0 items-center justify-end px-4 py-2">
        <ChatToolbar />
      </div>

      {(sending || queuedCount > 0 || streamingTools.length > 0 || activityLabel) && (
        <div className="shrink-0 px-4 pb-3">
          <TaskExecutionPanel
            activityLabel={displayActivityLabel(activityLabel)}
            sending={sending}
            pendingFinal={pendingFinal}
            tools={streamingTools}
            queuedMessages={currentSessionQueue}
            runMonitor={runMonitor}
          />
        </div>
      )}

      {/* Messages Area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        <div ref={contentRef} className="max-w-4xl mx-auto space-y-4">
          {isEmpty ? (
            <WelcomeScreen />
          ) : (
            <>
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id || `msg-${idx}`}
                  message={msg}
                  showThinking={showThinking}
                />
              ))}

              {/* Streaming message */}
              {shouldRenderStreaming && (
                <ChatMessage
                  message={(streamMsg
                    ? {
                        ...(streamMsg as Record<string, unknown>),
                        role: (typeof streamMsg.role === 'string' ? streamMsg.role : 'assistant') as RawMessage['role'],
                        content: streamMsg.content ?? streamText,
                        timestamp: streamMsg.timestamp ?? streamingTimestamp,
                      }
                    : {
                        role: 'assistant',
                        content: streamText,
                        timestamp: streamingTimestamp,
                      }) as RawMessage}
                  showThinking={showThinking}
                  isStreaming
                  streamingTools={streamingTools}
                />
              )}

              {/* Activity indicator: waiting for next AI turn after tool execution */}
              {sending && pendingFinal && !shouldRenderStreaming && (
                <ActivityIndicator phase="tool_processing" label={displayActivityLabel(activityLabel)} queuedCount={queuedCount} />
              )}

              {/* Typing indicator when sending but no stream content yet */}
              {sending && !pendingFinal && !hasAnyStreamContent && (
                <TypingIndicator label={displayActivityLabel(activityLabel)} queuedCount={queuedCount} />
              )}
            </>
          )}
        </div>
      </div>

      {/* Error bar */}
      {error && (
        <div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
            <button
              onClick={clearError}
              className="text-xs text-destructive/60 hover:text-destructive underline"
            >
              {t('common:actions.dismiss')}
            </button>
          </div>
        </div>
      )}

      {/* Input Area */}
      <ChatInput
        onSend={sendMessage}
        onStop={abortRun}
        disabled={!isGatewayRunning}
        sending={sending}
        isEmpty={isEmpty}
      />

      {/* Transparent loading overlay */}
      {minLoading && !sending && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/20 backdrop-blur-[1px] rounded-xl pointer-events-auto">
          <div className="bg-background shadow-lg rounded-full p-2.5 border border-border">
            <LoadingSpinner size="md" />
          </div>
        </div>
      )}
    </div>
  );
}

function TaskExecutionPanel({
  activityLabel,
  sending,
  pendingFinal,
  tools,
  queuedMessages,
  runMonitor,
}: {
  activityLabel: string;
  sending: boolean;
  pendingFinal: boolean;
  tools: Array<{ name: string; status: 'running' | 'completed' | 'error'; summary?: string; updatedAt: number }>;
  queuedMessages: Array<{ id: string; text: string; createdAt: number }>;
  runMonitor: RunMonitorState | null;
}) {
  const { t } = useTranslation('chat');
  const [queueOpen, setQueueOpen] = useState(false);
  const activeTools = tools.filter((tool) => tool.status === 'running');
  const finishedTools = tools.filter((tool) => tool.status !== 'running').slice(-3);
  const visibleQueuedMessages = queueOpen ? queuedMessages : queuedMessages.slice(0, 5);
  const activeTitle = activeTools[0]?.name
    ? t('taskPanel.runningTool', { tool: activeTools[0].name, defaultValue: '正在执行：{{tool}}' })
    : activityLabel;
  const waitingText = pendingFinal
    ? t('taskPanel.waitingNext', { defaultValue: '工具结果已返回，等待模型整理下一步' })
    : t('taskPanel.waitingModel', { defaultValue: '等待模型返回或工具事件' });
  const idleSeconds = Math.max(0, Math.floor((runMonitor?.idleMs ?? 0) / 1000));
  const elapsedSeconds = Math.max(0, Math.floor(((Date.now()) - (runMonitor?.startedAt ?? Date.now())) / 1000));
  const monitorTone = runMonitor?.status === 'stuck'
    ? 'error'
    : runMonitor?.status === 'stale'
      ? 'queued'
      : runMonitor?.status === 'completed'
        ? 'done'
        : 'active';
  const monitorDescription = runMonitor
    ? t('taskPanel.monitorDesc', {
      idle: idleSeconds,
      elapsed: elapsedSeconds,
      events: runMonitor.eventCount,
      defaultValue: '已运行 {{elapsed}} 秒，最后事件 {{idle}} 秒前，事件 {{events}} 个',
    })
    : waitingText;
  const monitorTitle = runMonitor
    ? displayMonitorLabel(runMonitor.lastEventLabel, t)
    : activeTitle;

  return (
    <div className="mx-auto max-w-4xl rounded-2xl border border-[#334155] bg-[#111827]/92 shadow-[0_18px_50px_rgba(15,23,42,0.32)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#334155]/80 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#2563eb]/20 text-[#60a5fa]">
            <ListChecks className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#e5e7eb]">
              {t('taskPanel.title', { defaultValue: '任务执行面板' })}
            </div>
            <div className="text-[11px] text-[#94a3b8]">
              {t('taskPanel.subtitle', { defaultValue: '实时显示当前动作、等待状态和排队事项' })}
            </div>
          </div>
        </div>
        <div className="rounded-full border border-[#334155] bg-[#0f172a] px-3 py-1 text-[11px] text-[#93c5fd]">
          {sending
            ? t('taskPanel.running', { defaultValue: '运行中' })
            : t('taskPanel.idle', { defaultValue: '空闲' })}
        </div>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-[#334155]/70 bg-[#0f172a]/80 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#cbd5e1]">
              {t('taskPanel.current', { defaultValue: '正在进行' })}
            </span>
            {sending && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#60a5fa]" />}
          </div>
          <div className="space-y-2">
            <TaskPanelRow
              tone={monitorTone}
              title={monitorTitle}
              description={monitorDescription}
            />
            {runMonitor?.status === 'stale' && (
              <TaskPanelRow
                tone="queued"
                title={t('taskPanel.staleTitle', { defaultValue: '响应变慢' })}
                description={t('taskPanel.staleDesc', { defaultValue: '超过 30 秒没有收到模型或工具事件，正在自动轮询历史记录。' })}
              />
            )}
            {runMonitor?.status === 'stuck' && (
              <TaskPanelRow
                tone="error"
                title={t('taskPanel.stuckTitle', { defaultValue: '疑似卡住' })}
                description={t('taskPanel.stuckDesc', { defaultValue: '长时间没有收到事件。可以继续等待，也可以点击输入框旁的停止后重试。' })}
              />
            )}
            {activeTools.map((tool) => (
              <TaskPanelRow
                key={`${tool.name}-${tool.updatedAt}`}
                tone="active"
                title={tool.name}
                description={tool.summary || t('taskPanel.toolRunning', { defaultValue: '工具正在执行，等待结果返回' })}
              />
            ))}
            {finishedTools.map((tool) => (
              <TaskPanelRow
                key={`${tool.name}-${tool.updatedAt}`}
                tone={tool.status === 'error' ? 'error' : 'done'}
                title={tool.name}
                description={tool.summary || (tool.status === 'error'
                  ? t('taskPanel.toolFailed', { defaultValue: '工具执行失败' })
                  : t('taskPanel.toolDone', { defaultValue: '工具已完成' }))}
              />
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[#334155]/70 bg-[#0f172a]/80 p-3">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold text-[#cbd5e1]">
              {t('taskPanel.todo', { defaultValue: '待完成事项' })}
            </span>
            <button
              type="button"
              className="rounded-full bg-[#6366f1]/20 px-2 py-0.5 text-[11px] text-[#c4b5fd] transition hover:bg-[#6366f1]/30"
              onClick={() => setQueueOpen((value) => !value)}
              disabled={queuedMessages.length === 0}
              title={t('taskPanel.toggleQueue', { defaultValue: '展开/收起待执行队列' })}
            >
              {queueOpen
                ? t('taskPanel.collapseQueue', { count: queuedMessages.length, defaultValue: '收起 {{count}} 项' })
                : t('taskPanel.expandQueue', { count: queuedMessages.length, defaultValue: '查看 {{count}} 项' })}
            </button>
          </div>
          <div className={cn('space-y-2', queueOpen && 'max-h-64 overflow-y-auto pr-1')}>
            {queuedMessages.length > 0 ? visibleQueuedMessages.map((item, index) => (
              <TaskPanelRow
                key={item.id}
                tone="queued"
                title={t('taskPanel.queuedItem', { index: index + 1, defaultValue: '排队消息 {{index}}' })}
                description={item.text || t('taskPanel.fileOnly', { defaultValue: '附件消息' })}
              />
            )) : (
              <TaskPanelRow
                tone="done"
                title={t('taskPanel.noQueuedTitle', { defaultValue: '暂无排队消息' })}
                description={t('taskPanel.noQueuedDesc', { defaultValue: '你可以继续输入，执行中的任务不会被打断。' })}
              />
            )}
            {!queueOpen && queuedMessages.length > visibleQueuedMessages.length && (
              <button
                type="button"
                className="w-full rounded-lg border border-dashed border-[#334155] px-3 py-2 text-[11px] text-[#93c5fd] hover:bg-[#1d4ed8]/10"
                onClick={() => setQueueOpen(true)}
              >
                {t('taskPanel.moreQueue', {
                  count: queuedMessages.length - visibleQueuedMessages.length,
                  defaultValue: '还有 {{count}} 条，点击展开',
                })}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function displayMonitorLabel(label: string | null | undefined, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (!label) return t('composer.running', { defaultValue: '任务执行中，等待模型返回' });
  if (label.startsWith('activityTool:')) {
    return t('composer.activityTool', {
      tool: label.slice('activityTool:'.length) || 'tool',
      defaultValue: '正在执行工具：{{tool}}',
    });
  }
  return t(`composer.${label}`, {
    defaultValue: t('composer.running', { defaultValue: '任务执行中，等待模型返回' }),
  });
}

function TaskPanelRow({
  tone,
  title,
  description,
}: {
  tone: 'active' | 'queued' | 'done' | 'error';
  title: string;
  description: string;
}) {
  const toneClass = {
    active: 'border-[#2563eb]/40 bg-[#1d4ed8]/10 text-[#93c5fd]',
    queued: 'border-[#a855f7]/40 bg-[#7e22ce]/10 text-[#d8b4fe]',
    done: 'border-[#22c55e]/30 bg-[#16a34a]/10 text-[#86efac]',
    error: 'border-[#ef4444]/40 bg-[#991b1b]/10 text-[#fca5a5]',
  }[tone];
  const Icon = tone === 'done' ? CheckCircle2 : tone === 'queued' ? Clock3 : tone === 'error' ? AlertCircle : Loader2;
  return (
    <div className={cn('flex gap-2 rounded-lg border px-3 py-2', toneClass)}>
      <Icon className={cn('mt-0.5 h-3.5 w-3.5 shrink-0', tone === 'active' && 'animate-spin')} />
      <div className="min-w-0">
        <div className="truncate text-[12px] font-semibold">{title}</div>
        <div className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-[#94a3b8]">{description}</div>
      </div>
    </div>
  );
}

// ── Welcome Screen ──────────────────────────────────────────────

function WelcomeScreen() {
  const { t } = useTranslation('chat');
  const quickActions = [
    { key: 'askQuestions', label: t('welcome.askQuestions') },
    { key: 'creativeTasks', label: t('welcome.creativeTasks') },
    { key: 'brainstorming', label: t('welcome.brainstorming') },
  ];

  return (
    <div className="flex flex-col items-center justify-center text-center h-[60vh]">
      <h1 className="text-4xl md:text-5xl font-serif text-foreground/80 mb-8 font-normal tracking-tight" style={{ fontFamily: 'Georgia, Cambria, "Times New Roman", Times, serif' }}>
        {t('welcome.subtitle')}
      </h1>

      <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-lg w-full">
        {quickActions.map(({ key, label }) => (
          <button 
            key={key}
            className="px-4 py-1.5 rounded-full border border-black/10 dark:border-white/10 text-[13px] font-medium text-foreground/70 hover:bg-black/5 dark:hover:bg-white/5 transition-colors bg-black/[0.02]"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Typing Indicator ────────────────────────────────────────────

function TypingIndicator({ label, queuedCount = 0 }: { label?: string | null; queuedCount?: number }) {
  const { t } = useTranslation('chat');
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-1 bg-black/5 dark:bg-white/5 text-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="bg-black/5 dark:bg-white/5 text-foreground rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{label || t('composer.running', { defaultValue: '任务执行中，等待模型返回' })}</span>
          <span className="inline-flex gap-1">
            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </span>
          {queuedCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {t('composer.queuedCount', { count: queuedCount, defaultValue: '队列 {{count}} 条' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Activity Indicator (shown between tool cycles) ─────────────

function ActivityIndicator({ phase, label, queuedCount = 0 }: { phase: 'tool_processing'; label?: string | null; queuedCount?: number }) {
  const { t } = useTranslation('chat');
  void phase;
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full mt-1 bg-black/5 dark:bg-white/5 text-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="bg-black/5 dark:bg-white/5 text-foreground rounded-2xl px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          <span>{label || t('composer.processingTools', { defaultValue: '正在处理工具结果，等待下一步输出' })}</span>
          {queuedCount > 0 && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              {t('composer.queuedCount', { count: queuedCount, defaultValue: '队列 {{count}} 条' })}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Chat;
