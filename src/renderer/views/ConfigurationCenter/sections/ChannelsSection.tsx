/**
 * 频道配置 - 卡片式 UI
 * 参考 designUI/axonclaw-design.html view-channels
 */
import React, { useState } from 'react';
import { Radio, Plus, Settings, Trash2 } from 'lucide-react';
import i18n from '@/i18n';
import { ConfigSection, TextField, SelectField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import { cn } from '@/lib/utils';

const CHANNEL_TYPES = [
  { value: 'telegram', label: 'Telegram', icon: '✈️' },
  { value: 'discord', label: 'Discord', icon: '💬' },
  { value: 'slack', label: 'Slack', icon: '🔔' },
  { value: 'webhook', label: 'Webhook', icon: '🔗' },
  { value: 'cli', label: 'CLI', icon: '⌨️' },
];

interface ChannelEntry {
  id?: string;
  type?: string;
  token?: string;
  botToken?: string;
  enabled?: boolean;
  [k: string]: unknown;
}

export const ChannelsSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['channels', ...p]);
  const s = (p: string[], v: unknown) => setField(['channels', ...p], v);

  const channelsRaw = getField(['channels']);
  const channelsList: ChannelEntry[] = Array.isArray(channelsRaw)
    ? channelsRaw
    : channelsRaw && typeof channelsRaw === 'object' && !Array.isArray(channelsRaw)
      ? Object.entries(channelsRaw as Record<string, ChannelEntry>).map(([id, c]) => ({ ...c, id }))
      : [];

  const [editingId, setEditingId] = useState<string | null>(null);

  const addChannel = () => {
    const newId = `channel_${Date.now()}`;
    const next = [...channelsList, { id: newId, type: 'telegram', enabled: true }];
    setField(['channels'], next);
    setEditingId(newId);
  };

  const removeChannel = (idx: number) => {
    const next = channelsList.filter((_, i) => i !== idx);
    setField(['channels'], next);
    if (editingId === channelsList[idx]?.id) setEditingId(null);
  };

  const updateChannel = (idx: number, field: string, value: unknown) => {
    const next = [...channelsList];
    next[idx] = { ...next[idx], [field]: value };
    setField(['channels'], next);
  };

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.channels.title.list')} icon={Radio} iconColor="text-blue-500" desc={i18n.t('configCenter.channels.desc.list')}>
        <div className="flex flex-wrap gap-3">
          {channelsList.map((ch, idx) => {
            const typeInfo = CHANNEL_TYPES.find((t) => t.value === (ch.type ?? 'telegram'));
            const isConnected = !!(ch.token || ch.botToken);
            return (
              <div
                key={ch.id ?? idx}
                className={cn(
                  'rounded-xl border w-full sm:w-72 overflow-hidden',
                  'border-slate-200 dark:border-white/[0.06]',
                  'bg-slate-50/80 dark:bg-white/[0.02]'
                )}
              >
                <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-100 dark:border-white/[0.04]">
                  <div className="flex items-center gap-2">
                    <span>{typeInfo?.icon ?? '📡'}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {(ch.id as string) || typeInfo?.label || i18n.t('configCenter.channels.defaults.unnamed')}
                    </span>
                    {isConnected && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500">
                        {i18n.t('configCenter.channels.badges.configured')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingId(editingId === (ch.id ?? `${idx}`) ? null : (ch.id as string) ?? `${idx}`)}
                      className="p-1.5 rounded hover:bg-slate-200/50 dark:hover:bg-white/5 text-slate-500"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => removeChannel(idx)}
                      className="p-1.5 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {editingId === (ch.id ?? `${idx}`) && (
                  <div className="p-3 space-y-2 border-t border-slate-100 dark:border-white/[0.04]">
                    <SelectField
                      label={i18n.t('configCenter.channels.fields.type')}
                      value={String(ch.type ?? 'telegram')}
                      onChange={(v) => updateChannel(idx, 'type', v)}
                      options={CHANNEL_TYPES}
                    />
                    <TextField
                      label={i18n.t('configCenter.channels.fields.token')}
                      value={String(ch.token ?? ch.botToken ?? '')}
                      onChange={(v) => {
                        updateChannel(idx, 'token', v);
                        updateChannel(idx, 'botToken', v);
                      }}
                      placeholder="Bot token…"
                    />
                    <TextField
                      label={i18n.t('configCenter.channels.fields.idOptional')}
                      value={String(ch.id ?? '')}
                      onChange={(v) => updateChannel(idx, 'id', v)}
                      placeholder="channel_1"
                    />
                  </div>
                )}
              </div>
            );
          })}
          <button
            onClick={addChannel}
            className={cn(
              'w-full sm:w-72 rounded-xl border-2 border-dashed min-h-[100px]',
              'border-slate-300 dark:border-white/20',
              'flex flex-col items-center justify-center gap-2',
              'text-slate-500 hover:text-indigo-500 hover:border-indigo-500/40 hover:bg-indigo-500/5',
              'transition-colors'
            )}
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm">{i18n.t('configCenter.channels.addChannel')}</span>
          </button>
        </div>
      </ConfigSection>
    </div>
  );
};
