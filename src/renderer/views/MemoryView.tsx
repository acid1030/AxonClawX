/**
 * AxonClaw - Memory View
 * 记忆系统界面 - AxonClawX 风格内容复刻
 * LanceDB 语义检索 · 记忆与 Chat 打通
 */

import React, { useState } from 'react';
import { Search, Brain, Database, Settings2 } from 'lucide-react';
import { PageHeader } from '@/components/common/PageHeader';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

const MemoryView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState<'all' | 'tech' | 'preference' | 'config'>('all');
  const [writeMode, setWriteMode] = useState<'auto' | 'manual' | 'off'>('auto');

  const categories = [
    { id: 'all' as const, label: i18n.t('views.memory.categories.all') },
    { id: 'tech' as const, label: i18n.t('views.memory.categories.tech') },
    { id: 'preference' as const, label: i18n.t('views.memory.categories.preference') },
    { id: 'config' as const, label: i18n.t('views.memory.categories.config') },
  ];

  const writeModes = [
    { id: 'auto' as const, label: i18n.t('views.memory.writeModes.auto'), desc: i18n.t('views.memory.writeModesDesc.auto') },
    { id: 'manual' as const, label: i18n.t('views.memory.writeModes.manual'), desc: i18n.t('views.memory.writeModesDesc.manual') },
    { id: 'off' as const, label: i18n.t('views.memory.writeModes.off'), desc: i18n.t('views.memory.writeModesDesc.off') },
  ];

  const memories = [
    { id: '1', content: i18n.t('views.memory.samples.item1.content'), date: '2026-03-14', category: i18n.t('views.memory.samples.item1.category') },
    { id: '2', content: i18n.t('views.memory.samples.item2.content'), date: '2026-03-12', category: i18n.t('views.memory.samples.item2.category') },
    { id: '3', content: i18n.t('views.memory.samples.item3.content'), date: '2026-03-10', category: i18n.t('views.memory.samples.item3.category') },
    { id: '4', content: i18n.t('views.memory.samples.item4.content'), date: '2026-03-08', category: i18n.t('views.memory.samples.item4.category') },
  ];

  return (
    <div className="flex flex-col w-full h-full min-h-0 bg-[#0f172a] overflow-hidden">
      <div className="w-full flex flex-col h-full py-6 overflow-y-auto">
        <PageHeader
          title={i18n.t('views.memory.title')}
          subtitle={i18n.t('views.memory.subtitle')}
          stats={[
            { label: i18n.t('views.memory.stats.memories'), value: memories.length },
            { label: i18n.t('views.memory.stats.categories'), value: categories.length + 1 },
          ]}
          statsBorderColor="border-violet-500/40"
          actions={
            <div className="flex items-center gap-2 rounded-xl border-2 border-violet-500/40 bg-[#1e293b] px-3 py-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              placeholder={i18n.t('views.memory.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none text-sm text-foreground placeholder-muted-foreground w-40"
            />
            </div>
          }
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-w-5xl">
          {/* 记忆列表 */}
          <div className="rounded-xl border-2 border-violet-500/40 bg-[#1e293b] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-sm font-medium text-foreground">
                    {i18n.t('views.memory.listTitle')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {i18n.t('views.memory.listDesc', { count: memories.length })}
                  </div>
                </div>
                <div className="flex gap-1.5">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCategory(c.id)}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-colors',
                        category === c.id
                          ? 'bg-primary/15 text-primary'
                          : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="p-3 rounded-xl bg-[#1e293b] border border-violet-500/30 hover:bg-[#334155]/50 transition-colors cursor-pointer"
                  >
                    <div className="text-sm text-foreground mb-1">
                      {memory.content}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {memory.date} · {memory.category}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 记忆写入策略 */}
          <div className="rounded-xl border-2 border-violet-500/40 bg-[#1e293b] overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings2 className="w-4 h-4 text-muted-foreground" />
                <div className="text-sm font-medium text-foreground">
                  {i18n.t('views.memory.writePolicyTitle')}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {i18n.t('views.memory.writePolicyDesc')}
              </p>

              <div className="flex gap-2 mb-6">
                {writeModes.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setWriteMode(m.id)}
                    className={cn(
                      'px-3 py-2 rounded-xl text-xs font-medium transition-colors',
                      writeMode === m.id
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-black/5 dark:bg-white/5 text-muted-foreground hover:bg-black/10 dark:hover:bg-white/10'
                    )}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#0f172a] border border-violet-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Database className="w-4 h-4 text-primary" />
                    <span className="text-[18px] font-bold text-foreground">
                      {memories.length}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{i18n.t('views.memory.kpis.totalMemories')}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#0f172a] border border-violet-500/30">
                  <div className="flex items-center gap-2 mb-1">
                    <Brain className="w-4 h-4 text-primary" />
                    <span className="text-[18px] font-bold text-foreground">
                      3.2MB
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">{i18n.t('views.memory.kpis.vectorDbSize')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { MemoryView };
export default MemoryView;
