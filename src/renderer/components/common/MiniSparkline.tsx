/**
 * Mini sparkline chart
 * AxonClawX style: small SVG line + gradient fill
 */
import { useId } from 'react';
import { cn } from '@/lib/utils';

interface MiniSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  id?: string;
  className?: string;
}

export function MiniSparkline({
  data,
  color = '#f59e0b',
  height = 32,
  width = 80,
  id,
  className,
}: MiniSparklineProps) {
  const fallbackId = useId();
  const gid = `spark-${(id || fallbackId).replace(/[^a-zA-Z0-9_-]/g, '')}`;

  if (!data.length) return null;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const pts = data
    .map(
      (v, i) =>
        `${(i / Math.max(data.length - 1, 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`
    )
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      className={cn('overflow-visible', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`${pts} ${width},${height} 0,${height}`} fill={`url(#${gid})`} />
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
