/**
 * 配置编辑器 - 配置区块容器
 */
import React, { useState } from 'react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigSectionProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  desc?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
}

export const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  icon: Icon,
  iconColor = 'text-indigo-500',
  desc,
  children,
  collapsible = true,
  defaultOpen = true,
  actions,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const toggleSection = () => {
    if (collapsible) setOpen(!open);
  };

  return (
    <div
      className={cn(
        'bg-slate-50/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] rounded-xl transition-colors',
        open ? 'overflow-visible' : 'overflow-hidden'
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2.5 px-3 md:px-4 py-3 md:py-2.5',
          collapsible && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.06]'
        )}
        onClick={toggleSection}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? open : undefined}
      >
        <Icon className={cn('h-[18px] w-[18px] shrink-0', iconColor)} />
        <div className="flex-1 min-w-0">
          <h3 className="text-xs md:text-sm font-bold text-slate-800 dark:text-white truncate">
            {title}
          </h3>
          {desc && (
            <p className="text-[11px] text-slate-400 dark:text-white/50 truncate">{desc}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        {collapsible && (
          <ChevronDown
            className={cn('h-4 w-4 text-slate-400 dark:text-white/40 transition-transform', open && 'rotate-180')}
          />
        )}
      </div>
      {open && (
        <div className="px-3 md:px-4 pb-3.5 md:pb-3 border-t border-slate-100 dark:border-white/[0.06]">
          {children}
        </div>
      )}
    </div>
  );
};
