import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  compact?: boolean;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'info', title, description, compact = false }) => {
  return (
    <div className={`w-full flex flex-col items-center justify-center text-center ${compact ? 'py-4' : 'py-10'}`}>
      <span className={`material-symbols-outlined text-slate-400 dark:text-white/30 ${compact ? 'text-xl mb-1' : 'text-3xl mb-2'}`}>
        {icon}
      </span>
      <div className={`font-medium text-slate-700 dark:text-white/70 ${compact ? 'text-xs' : 'text-sm'}`}>{title}</div>
      {description && !compact && (
        <div className="text-xs text-slate-500 dark:text-white/40 mt-1 max-w-md">{description}</div>
      )}
    </div>
  );
};

export default EmptyState;
