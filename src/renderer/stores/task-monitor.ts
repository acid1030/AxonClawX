import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';

export type TaskRunStatus = 'pending' | 'running' | 'completed' | 'failed';
export type TaskEventType = 'queued' | 'started' | 'tool' | 'message' | 'completed' | 'failed';

export interface TaskTimelineEvent {
  id: string;
  at: number;
  type: TaskEventType;
  title: string;
  detail?: string;
}

export interface TaskRunRecord {
  localId: string;
  source: 'multi-agent' | 'chat' | 'external';
  sessionKey: string;
  runId: string | null;
  task: string;
  status: TaskRunStatus;
  createdAt: number;
  updatedAt: number;
  events: TaskTimelineEvent[];
  lastSignature?: string;
  agentId?: string;
  result?: string;
  childRunIds?: string[];
}

interface RegisterRunInput {
  sessionKey: string;
  task: string;
  runId?: string | null;
  source?: TaskRunRecord['source'];
}

interface TaskMonitorState {
  runs: TaskRunRecord[];
  hydrated: boolean;
  hydrating: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  nextOffset: number;
  ensureHydrated: () => Promise<void>;
  loadMore: () => Promise<void>;
  registerRun: (input: RegisterRunInput) => string;
  bindRunId: (localId: string, runId: string) => void;
  attachChildRun: (localId: string, childRunId: string, detail?: string) => void;
  appendRunEvent: (localId: string, event: { type: TaskEventType; title: string; detail?: string }) => void;
  markRunCompleted: (localId: string, detail?: string) => void;
  markRunFailed: (localId: string, error: string) => void;
  handleGatewayNotification: (notification: unknown) => void;
  clearFinished: () => void;
  removeRun: (localId: string) => void;
}

const INITIAL_PAGE_SIZE = 30;
const PAGE_SIZE = 30;
const MAX_EVENTS_PER_RUN = 100;

function makeId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractAgentId(sessionKey: string | null | undefined): string | undefined {
  if (!sessionKey) return undefined;
  const m = sessionKey.match(/^agent:([^:]+)/);
  return m?.[1] || undefined;
}

function clip(text: string, max = 2000): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

function normalizeStatus(status: unknown): TaskRunStatus {
  const s = String(status || '');
  if (s === 'pending' || s === 'running' || s === 'completed' || s === 'failed') return s;
  return 'running';
}

function normalizeRun(raw: unknown): TaskRunRecord | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const localId = String(r.localId || '').trim();
  if (!localId) return null;
  const eventsRaw = Array.isArray(r.events) ? r.events : [];
  const events: TaskTimelineEvent[] = eventsRaw
    .map((evt) => {
      if (!evt || typeof evt !== 'object') return null;
      const e = evt as Record<string, unknown>;
      return {
        id: String(e.id || makeId('evt')),
        at: Number(e.at || Date.now()),
        type: String(e.type || 'message') as TaskEventType,
        title: String(e.title || ''),
        detail: typeof e.detail === 'string' ? e.detail : undefined,
      };
    })
    .filter(Boolean) as TaskTimelineEvent[];

  return {
    localId,
    source: (String(r.source || 'external') as TaskRunRecord['source']),
    sessionKey: String(r.sessionKey || ''),
    runId: r.runId != null && String(r.runId).trim() ? String(r.runId) : null,
    task: String(r.task || ''),
    status: normalizeStatus(r.status),
    createdAt: Number(r.createdAt || Date.now()),
    updatedAt: Number(r.updatedAt || Date.now()),
    events,
    lastSignature: typeof r.lastSignature === 'string' ? r.lastSignature : undefined,
    agentId: typeof r.agentId === 'string' ? r.agentId : undefined,
    result: typeof r.result === 'string' ? r.result : undefined,
    childRunIds: Array.isArray(r.childRunIds) ? r.childRunIds.map((v) => String(v)).filter(Boolean) : [],
  };
}

function extractFullText(message: unknown): string | null {
  if (!message || typeof message !== 'object') return null;
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  if (typeof content === 'string') {
    const t = content.trim();
    return t || null;
  }
  if (!Array.isArray(content)) return null;
  const parts: string[] = [];
  for (const block of content as Array<Record<string, unknown>>) {
    const text = typeof block.text === 'string'
      ? block.text
      : typeof block.thinking === 'string'
        ? block.thinking
        : '';
    const clean = String(text || '').trim();
    if (clean) parts.push(clean);
  }
  if (parts.length === 0) return null;
  return clip(parts.join('\n'), 4000);
}

function extractToolEvents(message: unknown): Array<{ signature: string; title: string; detail?: string }> {
  if (!message || typeof message !== 'object') return [];
  const msg = message as Record<string, unknown>;
  const events: Array<{ signature: string; title: string; detail?: string }> = [];
  const content = msg.content;
  if (Array.isArray(content)) {
    for (const block of content as Array<Record<string, unknown>>) {
      const blockType = String(block.type || '');
      if (blockType !== 'tool_use' && blockType !== 'toolCall' && blockType !== 'tool_result' && blockType !== 'toolResult') continue;
      const name = String(block.name || msg.toolName || 'tool');
      const toolCallId = String(block.id || msg.toolCallId || '');
      const detail = typeof block.text === 'string' ? clip(block.text, 800) : undefined;
      events.push({
        signature: `${blockType}:${toolCallId || name}:${detail || ''}`,
        title: name,
        detail,
      });
    }
  } else if (typeof msg.toolName === 'string') {
    const name = String(msg.toolName);
    const toolCallId = String(msg.toolCallId || '');
    events.push({
      signature: `tool:${toolCallId || name}`,
      title: name,
    });
  }
  return events;
}

function normalizeGatewayEvent(notification: unknown): {
  runId: string | null;
  sessionKey: string | null;
  agentId: string | undefined;
  state: string;
  phase: string;
  message: unknown;
  errorMessage: string | null;
} | null {
  if (!notification || typeof notification !== 'object') return null;
  const raw = notification as Record<string, unknown>;

  let payload: Record<string, unknown> = raw;
  if (raw.method === 'agent' && raw.params && typeof raw.params === 'object') {
    payload = raw.params as Record<string, unknown>;
  }

  const nested = payload.data && typeof payload.data === 'object'
    ? payload.data as Record<string, unknown>
    : {};

  const runIdRaw = payload.runId ?? nested.runId;
  const sessionKeyRaw = payload.sessionKey ?? nested.sessionKey;
  const phaseRaw = payload.phase ?? nested.phase;
  const stateRaw = payload.state ?? nested.state;
  const message = payload.message ?? nested.message;
  const errorRaw = payload.errorMessage ?? nested.errorMessage ?? payload.error ?? nested.error;
  const agentIdRaw = payload.agentId ?? nested.agentId;

  const phase = String(phaseRaw || '').trim().toLowerCase();
  let state = String(stateRaw || '').trim().toLowerCase();
  if (!state) {
    if (phase === 'started' || phase === 'start') state = 'started';
    else if (phase === 'completed' || phase === 'done' || phase === 'finished' || phase === 'end') state = 'final';
  }

  const runId = runIdRaw != null && String(runIdRaw).trim() ? String(runIdRaw) : null;
  const sessionKey = sessionKeyRaw != null && String(sessionKeyRaw).trim() ? String(sessionKeyRaw) : null;
  if (!runId && !sessionKey) return null;

  const agentId = (agentIdRaw != null && String(agentIdRaw).trim())
    ? String(agentIdRaw).trim()
    : extractAgentId(sessionKey) || undefined;

  return {
    runId,
    sessionKey,
    agentId,
    phase,
    state,
    message,
    errorMessage: errorRaw != null ? String(errorRaw) : null,
  };
}

function appendEvent(run: TaskRunRecord, event: Omit<TaskTimelineEvent, 'id' | 'at'>, signature?: string): TaskRunRecord {
  if (signature && run.lastSignature === signature) return run;
  const now = Date.now();
  const events = [...run.events, { ...event, id: makeId('evt'), at: now }];
  const trimmed = events.length > MAX_EVENTS_PER_RUN ? events.slice(events.length - MAX_EVENTS_PER_RUN) : events;
  return {
    ...run,
    updatedAt: now,
    events: trimmed,
    lastSignature: signature || run.lastSignature,
  };
}

function sortRunsNewestFirst(runs: TaskRunRecord[]): TaskRunRecord[] {
  return [...runs].sort((a, b) => b.updatedAt - a.updatedAt);
}

async function persistRun(run: TaskRunRecord): Promise<void> {
  try {
    await hostApiFetch('/api/task-runs/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(run),
    });
  } catch {
    // ignore persistence errors to keep UI responsive
  }
}

async function removeRunFromDb(localId: string): Promise<void> {
  try {
    await hostApiFetch(`/api/task-runs/${encodeURIComponent(localId)}`, { method: 'DELETE' });
  } catch {
    // ignore
  }
}

async function clearFinishedFromDb(): Promise<void> {
  try {
    await hostApiFetch('/api/task-runs/clear-finished', { method: 'POST' });
  } catch {
    // ignore
  }
}

async function loadRunsFromDb(limit = INITIAL_PAGE_SIZE, offset = 0): Promise<{ runs: TaskRunRecord[]; hasMore: boolean; nextOffset: number }> {
  try {
    const res = await hostApiFetch<{ runs?: unknown[]; hasMore?: boolean; nextOffset?: number }>(`/api/task-runs?limit=${limit}&offset=${offset}`);
    const list = Array.isArray(res?.runs) ? res.runs.map(normalizeRun).filter(Boolean) as TaskRunRecord[] : [];
    return {
      runs: sortRunsNewestFirst(list),
      hasMore: Boolean(res?.hasMore),
      nextOffset: Number(res?.nextOffset ?? offset + list.length),
    };
  } catch {
    return { runs: [], hasMore: false, nextOffset: offset };
  }
}

export const useTaskMonitorStore = create<TaskMonitorState>((set, get) => ({
  runs: [],
  hydrated: false,
  hydrating: false,
  loadingMore: false,
  hasMore: true,
  nextOffset: 0,

  ensureHydrated: async () => {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    const page = await loadRunsFromDb(INITIAL_PAGE_SIZE, 0);
    set((state) => {
      const merged = new Map<string, TaskRunRecord>();
      for (const run of page.runs) merged.set(run.localId, run);
      for (const run of state.runs) {
        const current = merged.get(run.localId);
        if (!current || run.updatedAt >= current.updatedAt) merged.set(run.localId, run);
      }
      const finalRuns = sortRunsNewestFirst([...merged.values()]);
      return { runs: finalRuns, hydrated: true, hydrating: false, hasMore: page.hasMore, nextOffset: page.nextOffset };
    });
  },

  loadMore: async () => {
    const state = get();
    if (state.loadingMore || !state.hasMore) return;
    set({ loadingMore: true });
    const page = await loadRunsFromDb(PAGE_SIZE, state.nextOffset);
    set((currentState) => {
      const merged = new Map<string, TaskRunRecord>();
      for (const run of currentState.runs) merged.set(run.localId, run);
      for (const run of page.runs) {
        const existing = merged.get(run.localId);
        if (!existing || run.updatedAt >= existing.updatedAt) merged.set(run.localId, run);
      }
      return {
        runs: sortRunsNewestFirst([...merged.values()]),
        loadingMore: false,
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
      };
    });
  },

  registerRun: (input) => {
    const localId = makeId('run');
    const now = Date.now();
    const source = input.source || 'external';
    const runId = input.runId && String(input.runId).trim() ? String(input.runId).trim() : null;
    const task = String(input.task || '').trim();
    const sessionKeyStr = String(input.sessionKey || '').trim();
    const record: TaskRunRecord = {
      localId,
      source,
      sessionKey: sessionKeyStr,
      runId,
      task,
      agentId: extractAgentId(sessionKeyStr),
      status: runId ? 'running' : 'pending',
      createdAt: now,
      updatedAt: now,
      events: [
        {
          id: makeId('evt'),
          at: now,
          type: 'queued',
          title: task || 'Task queued',
          detail: input.sessionKey,
        },
      ],
    };
    set((state) => ({ runs: sortRunsNewestFirst([...state.runs, record]) }));
    void persistRun(record);
    return localId;
  },

  bindRunId: (localId, runId) => {
    const normalized = String(runId || '').trim();
    if (!normalized) return;
    let updated: TaskRunRecord | null = null;
    set((state) => ({
      runs: state.runs.map((run) => {
        if (run.localId !== localId) return run;
        const next = { ...run, runId: normalized, status: run.status === 'pending' ? 'running' : run.status };
        updated = appendEvent(
          next,
          { type: 'started', title: 'Run started', detail: normalized },
          `started:${normalized}`,
        );
        return updated;
      }),
    }));
    if (updated) void persistRun(updated);
  },

  attachChildRun: (localId, childRunId, detail) => {
    const normalized = String(childRunId || '').trim();
    if (!normalized) return;
    let updated: TaskRunRecord | null = null;
    set((state) => ({
      runs: state.runs.map((run) => {
        if (run.localId !== localId) return run;
        const childRunIds = Array.from(new Set([...(run.childRunIds || []), normalized]));
        const next = { ...run, childRunIds, status: run.status === 'pending' ? 'running' as TaskRunStatus : run.status };
        updated = appendEvent(
          next,
          { type: 'started', title: 'Subtask started', detail: detail || normalized },
          `child-started:${normalized}`,
        );
        return updated;
      }),
    }));
    if (updated) void persistRun(updated);
  },

  appendRunEvent: (localId, event) => {
    let updated: TaskRunRecord | null = null;
    set((state) => ({
      runs: state.runs.map((run) => {
        if (run.localId !== localId) return run;
        const nextStatus: TaskRunStatus =
          event.type === 'failed'
            ? 'failed'
            : event.type === 'completed'
              ? 'completed'
              : run.status === 'pending'
                ? 'running'
                : run.status;
        const next = { ...run, status: nextStatus };
        updated = appendEvent(next, event);
        return updated;
      }),
    }));
    if (updated) void persistRun(updated);
  },

  markRunCompleted: (localId, detail) => {
    let updated: TaskRunRecord | null = null;
    set((state) => ({
      runs: state.runs.map((run) => {
        if (run.localId !== localId) return run;
        const next = { ...run, status: 'completed' as TaskRunStatus };
        updated = appendEvent(next, { type: 'completed', title: 'Run completed', detail }, `completed:${detail || ''}`);
        return updated;
      }),
    }));
    if (updated) void persistRun(updated);
  },

  markRunFailed: (localId, error) => {
    const message = String(error || '').trim() || 'Unknown error';
    let updated: TaskRunRecord | null = null;
    set((state) => ({
      runs: state.runs.map((run) => {
        if (run.localId !== localId) return run;
        const next = { ...run, status: 'failed' as TaskRunStatus };
        updated = appendEvent(next, { type: 'failed', title: 'Run failed', detail: clip(message, 2000) }, `failed:${clip(message, 120)}`);
        return updated;
      }),
    }));
    if (updated) void persistRun(updated);
  },

  handleGatewayNotification: (notification) => {
    const event = normalizeGatewayEvent(notification);
    if (!event) return;
    let updated: TaskRunRecord | null = null;
    set((state) => {
      const runs = [...state.runs];
      let idx = -1;
      if (event.runId) {
        idx = runs.findIndex((run) => run.runId === event.runId || (run.childRunIds || []).includes(event.runId));
      }

      if (idx < 0 && event.sessionKey) {
        for (let i = runs.length - 1; i >= 0; i -= 1) {
          const run = runs[i];
          if (run.sessionKey === event.sessionKey && (run.status === 'pending' || run.status === 'running')) {
            idx = i;
            break;
          }
        }
      }

      if (idx < 0) {
        const autoLocalId = makeId('run');
        const now = Date.now();
        runs.push({
          localId: autoLocalId,
          source: 'external',
          sessionKey: event.sessionKey || '',
          runId: event.runId,
          task: event.sessionKey || event.runId || 'External task',
          agentId: event.agentId || extractAgentId(event.sessionKey),
          status: event.state === 'error' || event.state === 'aborted' ? 'failed' : 'running',
          createdAt: now,
          updatedAt: now,
          events: [{
            id: makeId('evt'),
            at: now,
            type: 'started',
            title: 'Run detected',
            detail: event.runId || event.sessionKey || '',
          }],
        });
        idx = runs.length - 1;
      }

      const run = runs[idx];
      const isDifferentRunSameSession = Boolean(event.runId && run.runId && run.runId !== event.runId);
      const isKnownChildRun = Boolean(event.runId && (run.childRunIds || []).includes(event.runId));
      const isChildEvent = isKnownChildRun || isDifferentRunSameSession;
      let next: TaskRunRecord = {
        ...run,
        runId: run.runId || event.runId || null,
        agentId: run.agentId || event.agentId || extractAgentId(event.sessionKey),
        childRunIds: isChildEvent && event.runId
          ? Array.from(new Set([...(run.childRunIds || []), event.runId]))
          : run.childRunIds,
      };

      const stateName = event.state;
      const isStarted = stateName === 'started' || event.phase === 'started' || event.phase === 'start';
      const isError = stateName === 'error' || stateName === 'aborted';
      const isFinal = stateName === 'final'
        || event.phase === 'completed'
        || event.phase === 'done'
        || event.phase === 'finished'
        || event.phase === 'end';

      if (isStarted) {
        next.status = 'running';
        next = appendEvent(
          next,
          { type: 'started', title: isChildEvent ? 'Subtask started' : 'Run started', detail: event.runId || event.sessionKey || '' },
          `started:${event.runId || event.sessionKey || ''}`,
        );
      }

      const toolEvents = extractToolEvents(event.message);
      for (const tool of toolEvents) {
        next.status = 'running';
        next = appendEvent(
          next,
          { type: 'tool', title: isChildEvent ? `Subtask · ${tool.title}` : tool.title, detail: tool.detail },
          `tool:${event.runId || ''}:${tool.signature}`,
        );
      }

      const fullText = extractFullText(event.message);
      const preview = fullText ? clip(fullText, 800) : null;

      if (preview && !toolEvents.length && !isFinal && !isError) {
        next.status = 'running';
        if (fullText) next.result = fullText;
        next = appendEvent(
          next,
          { type: 'message', title: isChildEvent ? 'Subtask output' : 'Model output', detail: preview },
          `msg:${event.runId || ''}:${clip(preview, 120)}`,
        );
      }

      if (isError) {
        next.status = 'failed';
        const errorDetail = event.errorMessage || fullText || 'Run aborted';
        next.result = errorDetail;
        next = appendEvent(next, { type: 'failed', title: isChildEvent ? 'Subtask failed' : 'Run failed', detail: errorDetail }, `failed:${event.runId || ''}:${clip(errorDetail, 120)}`);
      } else if (isFinal) {
        next.status = isChildEvent ? next.status : 'completed';
        const completionDetail = fullText || preview || event.runId || event.sessionKey || '';
        next.result = fullText || next.result || '';
        next = appendEvent(
          next,
          { type: 'completed', title: isChildEvent ? 'Subtask completed' : 'Run completed', detail: completionDetail },
          `completed:${event.runId || ''}:${clip(completionDetail, 120)}`,
        );
      }

      runs[idx] = next;
      updated = next;
      return { runs: sortRunsNewestFirst(runs) };
    });
    if (updated) void persistRun(updated);
  },

  clearFinished: () => {
    set((state) => ({
      runs: state.runs.filter((run) => run.status === 'pending' || run.status === 'running'),
    }));
    void clearFinishedFromDb();
  },

  removeRun: (localId) => {
    const id = String(localId || '').trim();
    if (!id) return;
    set((state) => ({ runs: state.runs.filter((run) => run.localId !== id) }));
    void removeRunFromDb(id);
  },
}));

if (typeof window !== 'undefined') {
  setTimeout(() => {
    void useTaskMonitorStore.getState().ensureHydrated();
  }, 0);
}
