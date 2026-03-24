import React, { useState, useCallback, useEffect } from 'react';
import { useMemory } from '../hooks/useMemory';
import MemoryCard from '../components/memory/MemoryCard';
import MemorySearch from '../components/memory/MemorySearch';
import type { MemoryEntry, MemoryCategory } from '../memory/types';

// Convert MemoryEntry to our UI format
const convertMemory = (entry: MemoryEntry) => ({
  id: entry.id,
  text: entry.text,
  category: entry.category,
  importance: entry.importance,
  createdAt: new Date(entry.createdAt).toISOString(),
  updatedAt: entry.updatedAt ? new Date(entry.updatedAt).toISOString() : undefined,
});

export const MemoryView: React.FC = () => {
  const { state, actions } = useMemory();
  const [memories, setMemories] = useState<Array<{
    id: string;
    text: string;
    category?: MemoryCategory;
    importance: number;
    createdAt: string;
    updatedAt?: string;
  }>>([]);
  const [selectedMemory, setSelectedMemory] = useState<typeof memories[0] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [editImportance, setEditImportance] = useState(0.7);
  const [editCategory, setEditCategory] = useState<MemoryCategory>('other');

  // Initialize and load memories on mount
  useEffect(() => {
    const load = async () => {
      if (!state.isInitialized) {
        await actions.initialize();
      }
      const all = await actions.getAllMemories();
      setMemories(all.map(convertMemory));
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle search
  const handleSearch = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (query.trim()) {
        const results = await actions.searchMemories({ query, limit: 50 });
        setMemories(results.map(r => convertMemory(r.entry)));
      } else {
        const all = await actions.getAllMemories();
        setMemories(all.map(convertMemory));
      }
    },
    [actions]
  );

  // Handle memory selection
  const handleSelectMemory = useCallback((memory: typeof memories[0]) => {
    setSelectedMemory(memory);
  }, []);

  // Handle delete
  const handleDelete = useCallback(
    async (id: string) => {
      if (window.confirm('确定要删除这条记忆吗？')) {
        try {
          await actions.deleteMemory(id);
          setMemories((prev) => prev.filter((m) => m.id !== id));
          if (selectedMemory?.id === id) {
            setSelectedMemory(null);
          }
        } catch (error) {
          console.error('Delete failed:', error);
          alert('删除失败，请重试');
        }
      }
    },
    [actions, selectedMemory]
  );

  // Handle edit
  const handleEdit = useCallback((memory: typeof memories[0]) => {
    setSelectedMemory(memory);
    setEditText(memory.text);
    setEditImportance(memory.importance);
    setEditCategory(memory.category || 'other');
    setIsEditing(true);
  }, []);

  // Save edit
  const handleSaveEdit = useCallback(async () => {
    if (!selectedMemory) return;

    try {
      const updated = await actions.updateMemory(selectedMemory.id, {
        text: editText,
        importance: editImportance,
        category: editCategory,
      });
      
      if (updated) {
        const converted = convertMemory(updated);
        setMemories((prev) =>
          prev.map((m) => (m.id === selectedMemory.id ? converted : m))
        );
        setSelectedMemory(converted);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Edit failed:', error);
      alert('保存失败，请重试');
    }
  }, [selectedMemory, editText, editImportance, editCategory, actions]);

  // Cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText('');
    setEditImportance(0.7);
    setEditCategory('other');
  }, []);

  // Calculate stats
  const stats = {
    total: memories.length,
    byCategory: memories.reduce((acc, m) => {
      const cat = m.category || 'other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    avgImportance:
      memories.length > 0
        ? memories.reduce((sum, m) => sum + m.importance, 0) / memories.length
        : 0,
  };

  const categoryLabels: Record<string, string> = {
    preference: '偏好',
    fact: '事实',
    decision: '决策',
    entity: '实体',
    other: '其他',
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 p-6 border-b border-gray-200 dark:border-white/10 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              记忆管理
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              查看、搜索和管理你的长期记忆
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="max-w-xl">
          <MemorySearch
            onSearch={handleSearch}
            placeholder="搜索记忆内容..."
          />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Memory List */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-gray-200 dark:border-white/10">
          {/* Stats Cards */}
          <div className="flex-shrink-0 p-4 grid grid-cols-4 gap-3 border-b border-gray-200 dark:border-white/10">
            <div className="bg-white/80 dark:bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {stats.total}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                总记忆数
              </div>
            </div>
            <div className="bg-white/80 dark:bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.byCategory.preference || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                偏好
              </div>
            </div>
            <div className="bg-white/80 dark:bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.byCategory.fact || 0}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                事实
              </div>
            </div>
            <div className="bg-white/80 dark:bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {(stats.avgImportance * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                平均重要性
              </div>
            </div>
          </div>

          {/* Memory List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {state.isLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-gray-500 dark:text-gray-400">
                <svg
                  className="w-12 h-12 mb-2 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
                <p className="text-sm">
                  {searchQuery ? '没有找到匹配的记忆' : '暂无记忆'}
                </p>
              </div>
            ) : (
              memories.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  onSelect={handleSelectMemory}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  isSelected={selectedMemory?.id === memory.id}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Panel - Memory Detail */}
        <div className="w-96 flex-shrink-0 bg-white/50 dark:bg-white/5 backdrop-blur-sm">
          {selectedMemory ? (
            <div className="h-full flex flex-col p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  记忆详情
                </h2>
                {!isEditing && (
                  <button
                    onClick={() => handleEdit(selectedMemory)}
                    className="px-3 py-1.5 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                  >
                    编辑
                  </button>
                )}
              </div>

              {isEditing ? (
                <div className="flex-1 flex flex-col space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      内容
                    </label>
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full h-40 px-3 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      类别
                    </label>
                    <select
                      value={editCategory}
                      onChange={(e) =>
                        setEditCategory(e.target.value as MemoryCategory)
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                    >
                      <option value="preference">偏好</option>
                      <option value="fact">事实</option>
                      <option value="decision">决策</option>
                      <option value="entity">实体</option>
                      <option value="other">其他</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      重要性：{(editImportance * 100).toFixed(0)}%
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.1"
                      value={editImportance}
                      onChange={(e) => setEditImportance(parseFloat(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={handleSaveEdit}
                      className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="flex-1 px-4 py-2 bg-gray-200 dark:bg-white/10 hover:bg-gray-300 dark:hover:bg-white/20 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                      {selectedMemory.text}
                    </p>
                  </div>

                  <div className="mt-6 space-y-3 pt-4 border-t border-gray-200 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        类别
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {categoryLabels[selectedMemory.category || 'other']}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        重要性
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {(selectedMemory.importance * 100).toFixed(0)}%
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        创建时间
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(selectedMemory.createdAt).toLocaleString(
                          'zh-CN'
                        )}
                      </span>
                    </div>

                    {selectedMemory.updatedAt && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          更新时间
                        </span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {new Date(selectedMemory.updatedAt).toLocaleString(
                            'zh-CN'
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
              <div className="text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-3 opacity-50"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <p className="text-sm">选择一条记忆查看详情</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MemoryView;
