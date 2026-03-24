/**
 * 统一日志 Store
 * - 流式事件：主进程 chat.send 的 delta/final 等
 * - 系统日志：/api/logs 的 Gateway/Agent 日志
 */
import { create } from 'zustand';
import { hostApiFetch } from '@/lib/host-api';

export interface LogEntry {
  time: string;
  level: string;
  agent: string;
  message: string;
  source: 'streaming' | 'system';
}

interface GatewayLogsState {
  logs: LogEntry[];
  maxLogs: number;
  systemLogsLoading: boolean;
  systemLogsError: string | null;
  addStreamLog: (entry: Omit<LogEntry, 'source'>) => void;
  setSystemLogs: (content: string) => void;
  fetchSystemLogs: (tailLines?: number) => Promise<void>;
  clearLogs: () => void;
}

function parseSystemLogLines(content: string): Omit<LogEntry, 'source'>[] {
  if (!content?.trim()) return [];
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => ({
    time: '—',
    level: 'INFO',
    agent: '系统',
    message: line.trim(),
  }));
}

export const useGatewayLogsStore = create<GatewayLogsState>((set, get) => ({
  logs: [],
  maxLogs: 1000,
  systemLogsLoading: false,
  systemLogsError: null,
  addStreamLog: (entry) =>
    set((s) => ({
      logs: [
        ...s.logs.filter((l) => l.source === 'system'),
        ...s.logs.filter((l) => l.source === 'streaming').slice(-(s.maxLogs - 1)),
        { ...entry, source: 'streaming' as const },
      ],
    })),
  setSystemLogs: (content) =>
    set((s) => {
      const systemEntries = parseSystemLogLines(content).map((e) => ({ ...e, source: 'system' as const }));
      const streamEntries = s.logs.filter((l) => l.source === 'streaming');
      return { logs: [...systemEntries, ...streamEntries] };
    }),
  fetchSystemLogs: async (tailLines = 200) => {
    set({ systemLogsLoading: true, systemLogsError: null });
    try {
      const res = await hostApiFetch<{ content?: string }>(`/api/logs?tailLines=${tailLines}`);
      const content = res?.content ?? '';
      get().setSystemLogs(content);
    } catch (err) {
      set({ systemLogsError: String(err) });
      get().setSystemLogs(`(获取系统日志失败: ${err})`);
    } finally {
      set({ systemLogsLoading: false });
    }
  },
  clearLogs: () => set({ logs: [], systemLogsError: null }),
}));
