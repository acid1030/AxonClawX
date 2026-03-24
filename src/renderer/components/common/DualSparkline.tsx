/**
 * 双线迷你图（AxonClawX 风格：令牌 + 费用）
 */
import { useId } from 'react';
import { cn } from '@/lib/utils';

interface DualSparklineProps {
  dataA: number[];
  dataB: number[];
  colorA?: string;
  colorB?: string;
  height?: number;
  width?: number;
  className?: string;
}

export function DualSparkline({
  dataA,
  dataB,
  colorA = '#3b82f6',
  colorB = '#f59e0b',
  height = 80,
  width = 200,
  className,
}: DualSparklineProps) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const gidA = `dual-a-${id}`;
  const gidB = `dual-b-${id}`;

  const pad = 4;
  const chartH = height - 2 * pad;
  const chartW = width - 2 * pad;

  const toPoints = (data: number[]) => {
    if (!data.length) return '';
    const dMax = Math.max(...data, 1);
    const dMin = Math.min(...data, 0);
    const dRange = dMax - dMin || 1;
    return data
      .map(
        (v, i) =>
          `${(i / Math.max(data.length - 1, 1)) * chartW + pad},${height - pad - ((v - dMin) / dRange) * chartH}`
      )
      .join(' ');
  };

  const ptsA = dataA.length ? toPoints(dataA) : '';
  const ptsB = dataB.length ? toPoints(dataB) : '';

  if (!ptsA && !ptsB) return null;

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gidA} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorA} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colorA} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={gidB} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={colorB} stopOpacity="0.3" />
          <stop offset="100%" stopColor={colorB} stopOpacity="0" />
        </linearGradient>
      </defs>
      {ptsA && (
        <>
          <polygon
            points={`${ptsA} ${width - pad},${height - pad} ${pad},${height - pad}`}
            fill={`url(#${gidA})`}
          />
          <polyline
            points={ptsA}
            fill="none"
            stroke={colorA}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
      {ptsB && (
        <>
          <polygon
            points={`${ptsB} ${width - pad},${height - pad} ${pad},${height - pad}`}
            fill={`url(#${gidB})`}
          />
          <polyline
            points={ptsB}
            fill="none"
            stroke={colorB}
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );
}
