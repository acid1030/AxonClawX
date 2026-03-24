/**
 * PageHeader - 统一页面标题区
 * 含：标题、副标题、统计面板、操作按钮、Gateway 状态
 */

import React from 'react';
import { RefreshCw, Power } from 'lucide-react';
import { useGatewayStore } from '@/stores/gateway';
import { useGatewayOnline } from '@/hooks/useGatewayOnline';
import { cn } from '@/lib/utils';

export interface PageStat {
  label: string;
  value: string | number;
  /** 边框/强调色，如 border-emerald-500/40 */
  accent?: string;
  /** 数值文字色，如 text-emerald-400 */
  valueClassName?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** 统计项，展示在标题下方 */
  stats?: PageStat[];
  /** 右侧操作区 */
  actions?: React.ReactNode;
  /** 是否显示Refresh按钮（传入 onClick） */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Refresh按钮文案，默认「Refresh」 */
  refreshLabel?: string;
  /** 统计面板边框色，默认 indigo */
  statsBorderColor?: string;
  /** 副标题下方的分割线样式，如 'bg-gradient-to-r from-emerald-400...'，不传则默认绿色（online时） */
  dividerClassName?: string;
  /** 为 true 时：副标题 → 分割线 → 操作/统计（分割线紧贴副标题下方） */
  dividerUnderSubtitle?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  stats = [],
  actions,
  onRefresh,
  refreshing = false,
  refreshLabel = 'Refresh',
  statsBorderColor = 'border-indigo-500/40',
  dividerClassName,
  dividerUnderSubtitle = false,
}: PageHeaderProps) {
  const initGateway = useGatewayStore((s) => s.init);
  const startGateway = useGatewayStore((s) => s.start);
  const isOnline = useGatewayOnline();
  const [starting, setStarting] = React.useState(false);

  const handleStartGateway = async () => {
    setStarting(true);
    try {
      await initGateway();
      const { status } = useGatewayStore.getState();
      if (status.state !== 'running') {
        await startGateway();
      }
    } catch (e) {
      console.error('[PageHeader] Gateway start failed:', e);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="sticky top-0 z-10 shrink-0 pt-4 pb-4 -mt-4 -mx-4 px-4 bg-[#0f172a] mb-0">
      {/* 标题行：dividerUnderSubtitle 时只显示标题+副标题，操作区移到分割线下方 */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-0 min-w-0">
        <div className="min-w-0 flex-1 pr-2">
          <h1 className="text-base font-bold text-foreground truncate">{title}</h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{subtitle}</p>
          )}
        </div>
        {!dividerUnderSubtitle && (
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors shrink-0',
                  'bg-[#1e293b] border-2 text-foreground/80 hover:bg-[#334155] disabled:opacity-50',
                  statsBorderColor
                )}
              >
                <RefreshCw className={cn('w-4 h-4 shrink-0', refreshing && 'animate-spin')} />
                {refreshLabel}
              </button>
            )}
            {actions}
          </div>
        )}
      </div>

      {/* 副标题下方的分割线：紧贴副标题，评分/操作在其下方 */}
      <div
        className={cn(
          'h-[3px] w-full rounded-full transition-all duration-700 shrink-0 mt-2 mb-3',
          dividerClassName ?? (isOnline ? 'bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-400' : 'bg-black/10 dark:bg-white/10')
        )}
      />

      {/* 分割线下方的操作区（仅 dividerUnderSubtitle 时显示） */}
      {dividerUnderSubtitle && (onRefresh || actions) && (
        <div className="flex items-center gap-2 flex-wrap mt-3 mb-0">
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors shrink-0',
                'bg-[#1e293b] border-2 text-foreground/80 hover:bg-[#334155] disabled:opacity-50',
                statsBorderColor
              )}
            >
              <RefreshCw className={cn('w-4 h-4 shrink-0', refreshing && 'animate-spin')} />
              {refreshLabel}
            </button>
          )}
          {actions}
        </div>
      )}

      {/* Gateway 状态条：未连接时显示 */}
      {!isOnline && (
        <div
          className={cn(
            'mt-3 flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border-2',
            'bg-amber-500/10 border-amber-500/30'
          )}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm text-amber-600 dark:text-amber-400">
              Gateway 未连接，部分功能不可用
            </span>
          </div>
          <button
            onClick={handleStartGateway}
            disabled={starting}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium',
              'bg-amber-500/20 text-amber-600 dark:text-amber-400',
              'hover:bg-amber-500/30 transition-colors disabled:opacity-50'
            )}
          >
            <Power className="w-3.5 h-3.5" />
            {starting ? 'Starting...' : 'Start Gateway'}
          </button>
        </div>
      )}

      {/* 统计面板 */}
      {stats.length > 0 && (
        <div
          className={cn(
            'mt-3 flex flex-wrap gap-3 rounded-xl border-2 bg-[#1e293b] p-3',
            statsBorderColor
          )}
        >
          {stats.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{s.label}</span>
              <span className={cn('text-sm font-semibold tabular-nums', s.valueClassName ?? 'text-foreground')}>
                {s.value}
              </span>
              {i < stats.length - 1 && (
                <span className="text-muted-foreground/50">·</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
