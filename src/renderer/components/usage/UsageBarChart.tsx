/**
 * Token 用量柱状图 - 按模型/日期聚合
 */

import React from 'react';

export interface UsageGroup {
  label: string;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheTokens: number;
  sortKey: number | string;
}

function formatTokenCount(value: number): string {
  return Intl.NumberFormat().format(value);
}

export function UsageBarChart({
  groups,
  emptyLabel,
  totalLabel,
  inputLabel,
  outputLabel,
  cacheLabel,
}: {
  groups: UsageGroup[];
  emptyLabel: string;
  totalLabel: string;
  inputLabel: string;
  outputLabel: string;
  cacheLabel: string;
}) {
  if (groups.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-indigo-500/30 bg-[#1e293b]/50 p-8 text-center text-sm font-medium text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }

  const maxTokens = Math.max(...groups.map((group) => group.totalTokens), 1);

  return (
    <div className="space-y-4 rounded-2xl border-2 border-indigo-500/30 bg-[#1e293b] p-5">
      <div className="flex flex-wrap gap-4 text-xs font-medium text-muted-foreground mb-2">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
          {inputLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
          {outputLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
          {cacheLabel}
        </span>
      </div>
      {groups.map((group) => (
        <div key={group.label} className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-[13px]">
            <span className="truncate font-semibold text-foreground">{group.label}</span>
            <span className="text-muted-foreground font-medium">
              {totalLabel}: {formatTokenCount(group.totalTokens)}
            </span>
          </div>
          <div className="h-3.5 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="flex h-full overflow-hidden rounded-full"
              style={{
                width:
                  group.totalTokens > 0
                    ? `${Math.max((group.totalTokens / maxTokens) * 100, 6)}%`
                    : '0%',
              }}
            >
              {group.inputTokens > 0 && (
                <div
                  className="h-full bg-sky-500"
                  style={{
                    width: `${(group.inputTokens / group.totalTokens) * 100}%`,
                  }}
                />
              )}
              {group.outputTokens > 0 && (
                <div
                  className="h-full bg-violet-500"
                  style={{
                    width: `${(group.outputTokens / group.totalTokens) * 100}%`,
                  }}
                />
              )}
              {group.cacheTokens > 0 && (
                <div
                  className="h-full bg-amber-500"
                  style={{
                    width: `${(group.cacheTokens / group.totalTokens) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
