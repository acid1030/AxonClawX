/**
 * 双线趋势图（AxonClawX 风格：令牌 + 费用，含 x 轴日期）
 */
import { useId } from 'react';
import { cn } from '@/lib/utils';

export interface TrendPoint {
  date: string;
  cost: number;
  tokens?: number;
}

interface DualTrendChartProps {
  data: TrendPoint[];
  colorTokens?: string;
  colorCost?: string;
  height?: number;
  width?: number;
  className?: string;
}

function formatDateLabel(s: string): string {
  if (!s) return '';
  const m = s.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[2]}-${m[3]}`;
  const m2 = s.match(/(\d{2})-(\d{2})/);
  if (m2) return `${m2[1]}-${m2[2]}`;
  return s.slice(0, 5);
}

export function DualTrendChart({
  data,
  colorTokens = '#8b5cf6',
  colorCost = '#f59e0b',
  height = 120,
  width = 320,
  className,
}: DualTrendChartProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gidA = `dual-tokens-${id}`;
  const gidB = `dual-cost-${id}`;

  const pad = { top: 8, right: 8, bottom: 24, left: 8 };
  const chartH = height - pad.top - pad.bottom;
  const chartW = width - pad.left - pad.right;

  const today = new Date();
  const placeholderDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (4 - i));
    return d.toISOString().slice(0, 10);
  });
  const points = data.length >= 2
    ? data
    : data.length === 1
      ? [data[0], { ...data[0], date: data[0].date, cost: data[0].cost, tokens: data[0].tokens ?? 0 }]
      : [
          { date: placeholderDates[0], cost: 0.1, tokens: 1000 },
          { date: placeholderDates[1], cost: 0.15, tokens: 1500 },
          { date: placeholderDates[2], cost: 0.2, tokens: 2000 },
          { date: placeholderDates[3], cost: 0.18, tokens: 1800 },
          { date: placeholderDates[4], cost: 0.25, tokens: 2500 },
        ];

  const tokenVals = points.map((p) => p.tokens ?? 0);
  const costVals = points.map((p) => p.cost);
  const tMax = Math.max(...tokenVals, 1);
  const tMin = Math.min(...tokenVals, 0);
  const tRange = tMax - tMin || 1;
  const cMax = Math.max(...costVals, 0.01);
  const cMin = Math.min(...costVals, 0);
  const cRange = cMax - cMin || 0.01;

  const toTokenPoints = () =>
    tokenVals
      .map(
        (v, i) =>
          `${pad.left + (i / Math.max(points.length - 1, 1)) * chartW},${pad.top + chartH - ((v - tMin) / tRange) * chartH}`
      )
      .join(' ');
  const toCostPoints = () =>
    costVals
      .map(
        (v, i) =>
          `${pad.left + (i / Math.max(points.length - 1, 1)) * chartW},${pad.top + chartH - ((v - cMin) / cRange) * chartH}`
      )
      .join(' ');

  const ptsTokens = toTokenPoints();
  const ptsCost = toCostPoints();
  const firstDate = points[0]?.date ? formatDateLabel(points[0].date) : '';
  const lastDate = points[points.length - 1]?.date ? formatDateLabel(points[points.length - 1].date) : '';

  return (
    <div className={cn('relative', className)}>
      <svg width={width} height={height} className="overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={gidA} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorTokens} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colorTokens} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={gidB} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colorCost} stopOpacity="0.35" />
            <stop offset="100%" stopColor={colorCost} stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon
          points={`${ptsTokens} ${pad.left + chartW},${height - pad.bottom} ${pad.left},${height - pad.bottom}`}
          fill={`url(#${gidA})`}
        />
        <polyline
          points={ptsTokens}
          fill="none"
          stroke={colorTokens}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polygon
          points={`${ptsCost} ${pad.left + chartW},${height - pad.bottom} ${pad.left},${height - pad.bottom}`}
          fill={`url(#${gidB})`}
        />
        <polyline
          points={ptsCost}
          fill="none"
          stroke={colorCost}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-[10px] text-muted-foreground px-1">
        <span>{firstDate || '—'}</span>
        <span>{lastDate ? (firstDate === lastDate ? '' : `-${lastDate}`) : '—'}</span>
      </div>
    </div>
  );
}
