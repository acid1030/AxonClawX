/**
 * 配置编辑器 - 通用字段行容器
 * AxonClawX 风格表单式 UI
 */
import React, { useState, useRef, useEffect } from 'react';
import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigFieldProps {
  label: string;
  desc?: string;
  tooltip?: string;
  error?: string;
  children: React.ReactNode;
  inline?: boolean;
}

export const ConfigField: React.FC<ConfigFieldProps> = ({
  label,
  desc,
  tooltip,
  error,
  children,
  inline = true,
}) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showTooltip) return;
    const handler = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setShowTooltip(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [showTooltip]);

  return (
    <div
      className={cn(
        inline ? 'flex flex-col md:grid md:grid-cols-12 md:items-start gap-2 md:gap-3 py-2 md:py-1.5' : 'flex flex-col gap-2 py-2 md:py-1.5'
      )}
    >
      <div className={inline ? 'md:col-span-4 lg:col-span-5 flex flex-col' : 'flex flex-col'}>
        <div className="flex items-center gap-1.5">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 select-none">
            {label}
          </label>
          {tooltip && (
            <div ref={ref} className="relative inline-flex">
              <button
                type="button"
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onClick={() => setShowTooltip((s) => !s)}
                className="text-slate-400 hover:text-indigo-500 transition-colors"
              >
                <Info className="h-3.5 w-3.5" />
              </button>
              {showTooltip && (
                <div className="absolute z-50 bottom-full start-0 mb-1.5 px-3 py-2 bg-slate-800 dark:bg-slate-700 text-white text-[11px] leading-relaxed rounded-lg shadow-lg max-w-[260px] w-max pointer-events-none whitespace-pre-line">
                  {tooltip}
                </div>
              )}
            </div>
          )}
        </div>
        {desc && <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{desc}</span>}
      </div>
      <div className={inline ? 'md:col-span-8 lg:col-span-7 flex flex-col gap-1.5 min-w-0' : 'flex flex-col gap-1.5'}>
        {children}
        {error && <span className="text-[11px] text-red-500">{error}</span>}
      </div>
    </div>
  );
};
