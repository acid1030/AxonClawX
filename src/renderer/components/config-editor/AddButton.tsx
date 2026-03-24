/**
 * 配置编辑器 - 添加按钮
 */
import React from 'react';
import { Plus } from 'lucide-react';

interface AddButtonProps {
  label: string;
  onClick: () => void;
}

export const AddButton: React.FC<AddButtonProps> = ({ label, onClick }) => (
  <button
    onClick={onClick}
    className="mt-2.5 w-full h-9 border border-dashed border-slate-300 dark:border-white/10 rounded-lg text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-500 hover:border-indigo-500 dark:hover:text-indigo-400 dark:hover:border-indigo-400 transition-colors flex items-center justify-center gap-1"
  >
    <Plus className="h-3.5 w-3.5" />
    {label}
  </button>
);
