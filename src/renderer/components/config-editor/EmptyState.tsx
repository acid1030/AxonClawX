/**
 * 配置编辑器 - 空状态
 */
import React from 'react';
import { Inbox, type LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  message: string;
  icon?: LucideIcon;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ message, icon: Icon = Inbox }) => (
  <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
    <Icon className="h-8 w-8 mb-2" />
    <span className="text-[11px]">{message}</span>
  </div>
);
