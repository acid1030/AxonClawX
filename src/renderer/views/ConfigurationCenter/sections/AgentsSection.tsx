/**
 * Agent 配置 - 卡片网格 UI
 * 参考 designUI/axonclaw-design.html view-agents
 */
import React, { useState } from 'react';
import { Bot, Plus, Settings, Trash2 } from 'lucide-react';
import { ConfigSection, TextField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

const AGENT_ICONS = ['🛠', '🔍', '💻', '📊', '✏️', '🎯'];

interface AgentEntry {
  id: string;
  name?: string;
  role?: string;
  model?: string;
  tools?: Record<string, unknown> | string[];
  [k: string]: unknown;
}

export const AgentsSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['agents', ...p]);
  const s = (p: string[], v: unknown) => setField(['agents', ...p], v);

  const listRaw = g(['list']);
  const list: AgentEntry[] = Array.isArray(listRaw)
    ? listRaw
    : listRaw && typeof listRaw === 'object' && !Array.isArray(listRaw)
      ? Object.entries(listRaw as Record<string, AgentEntry>).map(([id, c]) => ({ ...c, id }))
      : [];

  const defaults = (g(['defaults']) as Record<string, unknown>) ?? {};
  const [editingId, setEditingId] = useState<string | null>(null);

  const addAgent = () => {
    const newId = `agent_${Date.now()}`;
    const next = [...list, { id: newId, name: newId }];
    s(['list'], next);
    setEditingId(newId);
  };

  const removeAgent = (idx: number) => {
    const next = list.filter((_, i) => i !== idx);
    s(['list'], next);
    if (editingId === list[idx]?.id) setEditingId(null);
  };

  const updateAgent = (idx: number, field: string, value: unknown) => {
    const next = [...list];
    next[idx] = { ...next[idx], [field]: value };
    s(['list'], next);
  };

  return (
    <div className="space-y-4">
      <ConfigSection
        title={i18n.t('configCenter.agents.defaultsTitle')}
        icon={Bot}
        iconColor="text-emerald-500"
        desc={i18n.t('configCenter.agents.defaultsDesc')}
      >
        <TextField
          label={i18n.t('configCenter.agents.defaultModel')}
          value={String(defaults.model ?? '')}
          onChange={(v) => s(['defaults', 'model'], v)}
          placeholder="anthropic/claude-sonnet-4"
        />
      </ConfigSection>

      <ConfigSection
        title={i18n.t('configCenter.agents.listTitle')}
        icon={Bot}
        iconColor="text-indigo-500"
        desc={i18n.t('configCenter.agents.listDesc')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((agent, idx) => {
            const icon = AGENT_ICONS[idx % AGENT_ICONS.length];
            const isEditing = editingId === agent.id;
            return (
              <div
                key={agent.id}
                className={cn(
                  'rounded-xl border overflow-hidden',
                  'border-slate-200 dark:border-white/[0.06]',
                  'bg-slate-50/80 dark:bg-white/[0.02]'
                )}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-lg bg-indigo-500/10">
                      {icon}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {(agent.name as string) || agent.id}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">id: {agent.id}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingId(isEditing ? null : agent.id)}
                      className="p-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeAgent(idx)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <p className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {(agent.role as string) || i18n.t('configCenter.agents.genericRole')}
                </p>

                {agent.model && (
                  <div className="px-3 pb-1">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono">
                      {(agent.model as string)}
                    </span>
                  </div>
                )}

                {isEditing && (
                  <div className="p-3 space-y-2 border-t border-slate-100 dark:border-white/[0.04]">
                    <TextField
                      label={i18n.t('configCenter.agents.name')}
                      value={String(agent.name ?? agent.id ?? '')}
                      onChange={(v) => updateAgent(idx, 'name', v)}
                    />
                    <TextField
                      label={i18n.t('configCenter.agents.model')}
                      value={String(agent.model ?? '')}
                      onChange={(v) => updateAgent(idx, 'model', v)}
                      placeholder={i18n.t('configCenter.agents.inheritDefault')}
                    />
                    <TextField
                      label={i18n.t('configCenter.agents.roleDesc')}
                      value={String(agent.role ?? '')}
                      onChange={(v) => updateAgent(idx, 'role', v)}
                      multiline
                    />
                  </div>
                )}
              </div>
            );
          })}

          <button
            onClick={addAgent}
            className={cn(
              'rounded-xl border-2 border-dashed min-h-[140px]',
              'border-slate-300 dark:border-white/20',
              'flex flex-col items-center justify-center gap-2',
              'text-slate-500 hover:text-indigo-500 hover:border-indigo-500/40 hover:bg-indigo-500/5',
              'transition-colors'
            )}
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm">{i18n.t('configCenter.agents.createAgent')}</span>
          </button>
        </div>
      </ConfigSection>
    </div>
  );
};
