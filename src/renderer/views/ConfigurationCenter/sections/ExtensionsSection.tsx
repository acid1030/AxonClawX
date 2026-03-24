/**
 * 扩展 / 技能 / 插件配置
 */
import React from 'react';
import { Puzzle, Package, Zap } from 'lucide-react';
import i18n from '@/i18n';
import { ConfigSection, SwitchField, ArrayField, TextField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

export const ExtensionsSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(p);
  const s = (p: string[], v: unknown) => setField(p, v);

  const extensionsEnabled = (g(['extensions', 'enabled']) ?? g(['plugins', 'enabled'])) !== false;
  const skillsEnabled = g(['skills', 'enabled']) !== false;
  const pluginsRaw = g(['extensions', 'entries']) ?? g(['plugins', 'entries']);
  const pluginsList: Record<string, unknown> =
    pluginsRaw && typeof pluginsRaw === 'object' && !Array.isArray(pluginsRaw)
      ? (pluginsRaw as Record<string, unknown>)
      : {};
  const pluginIds = Object.keys(pluginsList);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.extensions.title.main')} icon={Puzzle} iconColor="text-purple-500">
        <SwitchField
          label={i18n.t('configCenter.extensions.fields.extensionsEnabled')}
          value={extensionsEnabled}
          onChange={(v) => {
            s(['extensions', 'enabled'], v);
            s(['plugins', 'enabled'], v);
          }}
        />
        <SwitchField
          label={i18n.t('configCenter.extensions.fields.skillsEnabled')}
          value={skillsEnabled}
          onChange={(v) => s(['skills', 'enabled'], v)}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.extensions.title.plugins')} icon={Package} iconColor="text-indigo-500" defaultOpen={false}>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          {i18n.t('configCenter.extensions.pluginNote')}
        </p>
        {pluginIds.length > 0 && (
          <div className="space-y-1">
            {pluginIds.map((id) => (
              <SwitchField
                key={id}
                label={id}
                value={(pluginsList[id] as { enabled?: boolean })?.enabled !== false}
                onChange={(v) => {
                  const entries = { ...pluginsList };
                  entries[id] = { ...(entries[id] as object), enabled: v };
                  s(['extensions', 'entries'], entries);
                  s(['plugins', 'entries'], entries);
                }}
              />
            ))}
          </div>
        )}
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.extensions.title.skillsPath')} icon={Zap} iconColor="text-amber-500" defaultOpen={false}>
        <TextField
          label={i18n.t('configCenter.extensions.fields.skillsDir')}
          value={String(g(['skills', 'path']) ?? g(['skills', 'dir']) ?? '')}
          onChange={(v) => {
            s(['skills', 'path'], v);
            s(['skills', 'dir'], v);
          }}
          placeholder="~/.openclaw/skills"
        />
        <ArrayField
          label={i18n.t('configCenter.extensions.fields.preloadSkills')}
          value={Array.isArray(g(['skills', 'preload'])) ? (g(['skills', 'preload']) as string[]) : []}
          onChange={(v) => s(['skills', 'preload'], v)}
          placeholder="skill_id"
        />
      </ConfigSection>
    </div>
  );
};
