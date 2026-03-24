export type UsageHistoryEntry = {
  timestamp: string;
  sessionId: string;
  agentId: string;
  model?: string;
  provider?: string;
  content?: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
  totalTokens: number;
  costUsd?: number;
};

export type UsageWindow = '7d' | '30d' | 'all';
export type UsageGroupBy = 'model' | 'day' | 'session';

export type UsageGroup = {
  label: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  sortKey: number | string;
  /** sessionId when groupBy='session' */
  sessionId?: string;
};

export function formatUsageDay(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return timestamp;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

export function getUsageDaySortKey(timestamp: string): number {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 0;
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function groupUsageHistory(
  entries: UsageHistoryEntry[],
  groupBy: UsageGroupBy,
): UsageGroup[] {
  const grouped = new Map<string, UsageGroup>();

  for (const entry of entries) {
    const key =
      groupBy === 'model'
        ? (entry.model || 'Unknown')
        : groupBy === 'session'
          ? (entry.sessionId || 'unknown')
          : formatUsageDay(entry.timestamp);
    const label =
      groupBy === 'session' && key.length > 10
        ? `${key.slice(0, 8)}…`
        : key;
    const current = grouped.get(key) ?? {
      label,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      cacheTokens: 0,
      sortKey:
        groupBy === 'day'
          ? getUsageDaySortKey(entry.timestamp)
          : groupBy === 'session'
            ? entry.timestamp
            : key.toLowerCase(),
      sessionId: groupBy === 'session' ? entry.sessionId : undefined,
    };
    current.totalTokens += entry.totalTokens;
    current.inputTokens += entry.inputTokens;
    current.outputTokens += entry.outputTokens;
    current.cacheTokens += entry.cacheReadTokens + entry.cacheWriteTokens;
    grouped.set(key, current);
  }

  const sorted = Array.from(grouped.values()).sort((a, b) => {
    if (groupBy === 'day') {
      return Number(a.sortKey) - Number(b.sortKey);
    }
    if (groupBy === 'session') {
      return String(b.sortKey).localeCompare(String(a.sortKey), undefined, { numeric: true });
    }
    return b.totalTokens - a.totalTokens;
  });

  return groupBy === 'model' ? sorted.slice(0, 8) : groupBy === 'session' ? sorted.slice(0, 12) : sorted;
}

export function filterUsageHistoryByWindow(
  entries: UsageHistoryEntry[],
  window: UsageWindow,
  now = Date.now(),
): UsageHistoryEntry[] {
  if (window === 'all') return entries;

  const days = window === '7d' ? 7 : 30;
  const cutoff = now - days * 24 * 60 * 60 * 1000;

  return entries.filter((entry) => {
    const timestamp = Date.parse(entry.timestamp);
    return Number.isFinite(timestamp) && timestamp >= cutoff;
  });
}
