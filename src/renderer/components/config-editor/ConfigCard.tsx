/**
 * 配置编辑器 - 子卡片
 */
import React, { useState } from 'react';
import { ChevronDown, Trash2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfigCardProps {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  onDelete?: () => void;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export const ConfigCard: React.FC<ConfigCardProps> = ({
  title,
  icon: Icon,
  children,
  onDelete,
  actions,
  collapsible = true,
  defaultOpen = false,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const toggleCard = () => {
    if (collapsible) setOpen(!open);
  };

  return (
    <div className="border border-slate-200 dark:border-white/[0.06] rounded-lg overflow-hidden bg-white dark:bg-white/[0.01] mt-2.5">
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-white/[0.02]',
          collapsible && 'cursor-pointer hover:bg-slate-100 dark:hover:bg-white/[0.04]'
        )}
        onClick={toggleCard}
        role={collapsible ? 'button' : undefined}
        aria-expanded={collapsible ? open : undefined}
      >
        {Icon && <Icon className="h-4 w-4 text-slate-500 shrink-0" />}
        <span className="text-[11px] md:text-xs font-bold text-slate-700 dark:text-slate-300 flex-1 truncate">
          {title}
        </span>
        {actions && <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>{actions}</div>}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-slate-400 hover:text-red-500 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {collapsible && (
          <ChevronDown
            className={cn('h-3.5 w-3.5 text-slate-400 transition-transform', open && 'rotate-180')}
          />
        )}
      </div>
      {(!collapsible || open) && <div className="px-3 pb-2.5">{children}</div>}
    </div>
  );
};
