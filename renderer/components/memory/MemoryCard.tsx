import React, { useState, useCallback } from 'react';
import type { MemoryCategory } from '../../memory/types';

export interface MemoryCardProps {
  memory: {
    id: string;
    text: string;
    category?: MemoryCategory;
    importance: number;
    createdAt: string;
    updatedAt?: string;
  };
  onSelect?: (memory: MemoryCardProps['memory']) => void;
  onEdit?: (memory: MemoryCardProps['memory']) => void;
  onDelete?: (id: string) => void;
  isSelected?: boolean;
}

export const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  onSelect,
  onEdit,
  onDelete,
  isSelected = false,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onSelect?.(memory);
  }, [memory, onSelect]);

  const handleEditClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEdit?.(memory);
    },
    [memory, onEdit]
  );

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete?.(memory.id);
    },
    [memory.id, onDelete]
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getImportanceColor = (importance: number) => {
    if (importance >= 0.8) return 'bg-red-500';
    if (importance >= 0.5) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getCategoryBadge = (category?: MemoryCategory) => {
    const badges: Record<string, { label: string; color: string }> = {
      preference: { label: '偏好', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
      fact: { label: '事实', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
      decision: { label: '决策', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
      entity: { label: '实体', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
      other: { label: '其他', color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' },
    };
    return category ? badges[category] : badges.other;
  };

  const categoryBadge = getCategoryBadge(memory.category);

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative p-4 rounded-xl border transition-all duration-200 cursor-pointer
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 shadow-md'
          : 'bg-white/80 dark:bg-white/5 border-gray-200 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/10 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Importance Indicator */}
        <div className="flex-shrink-0 mt-1">
          <div
            className={`w-2 h-2 rounded-full ${getImportanceColor(memory.importance)}`}
            title={`重要性：${(memory.importance * 100).toFixed(0)}%`}
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-white line-clamp-2 leading-relaxed">
            {memory.text}
          </p>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {/* Category Badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${categoryBadge.color}`}>
              {categoryBadge.label}
            </span>

            {/* Date */}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(memory.createdAt)}
            </span>

            {/* Importance Score */}
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {(memory.importance * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Actions */}
        <div
          className={`flex-shrink-0 flex items-center gap-1 transition-opacity duration-200 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <button
            onClick={handleEditClick}
            className="p-1.5 rounded-lg hover:bg-gray-200 dark:hover:bg-white/10 transition-colors"
            title="编辑"
          >
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
          <button
            onClick={handleDeleteClick}
            className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            title="删除"
          >
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemoryCard;
