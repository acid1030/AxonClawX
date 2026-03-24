/**
 * AxonClaw - GaugeCard 组件
 * 圆形进度环卡片，用于展示 CPU、内存、磁盘使用率
 */

import React from 'react';
import { cn } from '@/lib/utils';

interface GaugeCardProps {
  /** 百分比 0-100 */
  pct: number;
  /** 标签 */
  label: string;
  /** 颜色（十六进制） */
  color: string;
  /** 背景渐变类 */
  gradient: string;
  /** 边框颜色类 */
  borderColor: string;
  /** 子元素（显示详情） */
  children?: React.ReactNode;
}

export function GaugeCard({ pct, label, color, gradient, borderColor, children }: GaugeCardProps) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(pct, 100) / 100) * c;

  // 超过 90% 红色，70-90% 黄色，否则用传入颜色
  const gaugeColor = pct > 90 ? '#ef4444' : pct > 70 ? '#f59e0b' : color;

  return (
    <div
      className={cn(
        'rounded-xl border p-3 flex items-center gap-3',
        gradient,
        borderColor
      )}
    >
      {/* 圆形进度环 */}
      <div className="relative w-16 h-16 shrink-0">
        <svg viewBox="0 0 80 80" className="w-full h-full -rotate-90">
          {/* 背景圆 */}
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className="text-[#334155]"
          />
          {/* 进度圆 */}
          <circle
            cx="40"
            cy="40"
            r={r}
            fill="none"
            stroke={gaugeColor}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
        </svg>
        {/* 百分比文本 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-black tabular-nums" style={{ color: gaugeColor }}>
            {pct.toFixed(0)}%
          </span>
        </div>
      </div>

      {/* 标签和详情 */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold uppercase tracking-wider" style={{ color }}>
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

/** 格式化字节为人类可读 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
}

/** 格式化运行时间 */
export function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
