export interface RunMonitorState {
  sessionKey: string;
  runId: string | null;
  status: 'running' | 'stale' | 'stuck' | 'completed' | 'failed' | 'aborted';
  startedAt: number;
  lastEventAt: number;
  idleMs: number;
  eventCount: number;
  lastEventLabel: string;
}

export type RunMonitorPatch =
  Partial<Omit<RunMonitorState, 'sessionKey' | 'startedAt' | 'lastEventAt' | 'idleMs' | 'eventCount'>>
  & {
    runId?: string | null;
    lastEventLabel?: string;
    touch?: boolean;
    reset?: boolean;
    status?: RunMonitorState['status'];
  };

interface RunMonitorControllerOptions {
  getCurrentSessionKey: () => string;
  setVisibleMonitor: (monitor: RunMonitorState | null) => void;
}

const RUN_STALE_WARN_MS = 30_000;
const RUN_STUCK_WARN_MS = 75_000;

function getRunMonitorStatus(monitor: RunMonitorState): RunMonitorState['status'] {
  if (monitor.status === 'completed' || monitor.status === 'failed' || monitor.status === 'aborted') {
    return monitor.status;
  }
  if (monitor.idleMs >= RUN_STUCK_WARN_MS) return 'stuck';
  if (monitor.idleMs >= RUN_STALE_WARN_MS) return 'stale';
  return 'running';
}

export function createRunMonitorController(options: RunMonitorControllerOptions) {
  const monitorsBySession = new Map<string, RunMonitorState>();
  let timer: ReturnType<typeof setInterval> | null = null;

  const publishIfVisible = (sessionKey: string, monitor: RunMonitorState | null): void => {
    if (options.getCurrentSessionKey() === sessionKey) {
      options.setVisibleMonitor(monitor);
    }
  };

  const startTicker = (): void => {
    if (timer) return;
    timer = setInterval(() => {
      if (monitorsBySession.size === 0) {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        return;
      }

      const now = Date.now();
      for (const [sessionKey, monitor] of monitorsBySession.entries()) {
        if (monitor.status === 'completed' || monitor.status === 'failed' || monitor.status === 'aborted') {
          continue;
        }
        const next: RunMonitorState = {
          ...monitor,
          idleMs: Math.max(0, now - monitor.lastEventAt),
        };
        next.status = getRunMonitorStatus(next);
        monitorsBySession.set(sessionKey, next);
        publishIfVisible(sessionKey, next);
      }
    }, 1_000);
  };

  const update = (sessionKey: string, patch: RunMonitorPatch): void => {
    if (!sessionKey) return;
    const now = Date.now();
    const previous = monitorsBySession.get(sessionKey);
    const touch = patch.touch !== false;
    const next: RunMonitorState = {
      sessionKey,
      runId: patch.runId ?? previous?.runId ?? null,
      status: patch.status ?? previous?.status ?? 'running',
      startedAt: patch.reset || !previous ? now : previous.startedAt,
      lastEventAt: touch ? now : previous?.lastEventAt ?? now,
      idleMs: touch ? 0 : Math.max(0, now - (previous?.lastEventAt ?? now)),
      eventCount: patch.reset || !previous ? 1 : previous.eventCount + (touch ? 1 : 0),
      lastEventLabel: patch.lastEventLabel ?? previous?.lastEventLabel ?? 'activityPlanning',
    };
    next.status = getRunMonitorStatus(next);
    monitorsBySession.set(sessionKey, next);
    startTicker();
    publishIfVisible(sessionKey, next);
  };

  const finish = (sessionKey: string, status: RunMonitorState['status']): void => {
    const previous = monitorsBySession.get(sessionKey);
    if (!previous) {
      publishIfVisible(sessionKey, null);
      return;
    }

    const now = Date.now();
    const next: RunMonitorState = {
      ...previous,
      status,
      lastEventAt: now,
      idleMs: 0,
      eventCount: previous.eventCount + 1,
      lastEventLabel: status === 'completed'
        ? 'activityCompleted'
        : status === 'aborted'
          ? 'activityAborted'
          : 'activityFailed',
    };
    monitorsBySession.set(sessionKey, next);
    publishIfVisible(sessionKey, next);

    setTimeout(() => {
      const current = monitorsBySession.get(sessionKey);
      if (current?.lastEventAt === next.lastEventAt && current.status === status) {
        monitorsBySession.delete(sessionKey);
        publishIfVisible(sessionKey, null);
      }
    }, 4_000);
  };

  return {
    get(sessionKey: string): RunMonitorState | null {
      return monitorsBySession.get(sessionKey) ?? null;
    },
    update,
    finish,
  };
}
