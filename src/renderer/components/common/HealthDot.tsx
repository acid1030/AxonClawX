/**
 * Health status indicator dot
 * AxonClawX style: green pulse when ok, gray when not
 */
import { cn } from '@/lib/utils';

interface HealthDotProps {
  ok: boolean;
  className?: string;
}

export function HealthDot({ ok, className }: HealthDotProps) {
  return (
    <div
      className={cn(
        'w-2.5 h-2.5 rounded-full shadow-sm',
        ok ? 'bg-green-500 motion-safe:animate-pulse' : 'bg-slate-400 dark:bg-slate-500',
        className
      )}
    />
  );
}
