/**
 * Hooks 配置 - 表单式 UI
 */
import React from 'react';
import { Settings, Route, Mail, Network } from 'lucide-react';
import {
  ConfigSection,
  ConfigCard,
  TextField,
  NumberField,
  SwitchField,
  ArrayField,
  AddButton,
  EmptyState,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import i18n from '@/i18n';

export const HooksSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['hooks', ...p]);
  const s = (p: string[], v: unknown) => setField(['hooks', ...p], v);
  const mappingsRaw = g(['mappings']);
  const mappings: Record<string, unknown>[] = Array.isArray(mappingsRaw) ? mappingsRaw : [];

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.hooks.title.basic')} icon={Settings} iconColor="text-pink-500">
        <SwitchField
          label={i18n.t('configCenter.hooks.fields.enabled')}
          value={g(['enabled']) === true}
          onChange={(v) => s(['enabled'], v)}
        />
        <TextField
          label={i18n.t('configCenter.hooks.fields.path')}
          value={String(g(['path']) ?? '')}
          onChange={(v) => s(['path'], v)}
          placeholder="/webhook"
        />
        <TextField
          label={i18n.t('configCenter.hooks.fields.token')}
          value={String(g(['token']) ?? '')}
          onChange={(v) => s(['token'], v)}
        />
        <NumberField
          label={i18n.t('configCenter.hooks.fields.maxBodyBytes')}
          value={g(['maxBodyBytes']) as number | undefined}
          onChange={(v) => s(['maxBodyBytes'], v)}
          min={0}
        />
        <ArrayField
          label={i18n.t('configCenter.hooks.fields.presets')}
          value={(g(['presets']) as string[]) ?? []}
          onChange={(v) => s(['presets'], v)}
          placeholder="preset-name"
        />
      </ConfigSection>

      <ConfigSection
        title={i18n.t('configCenter.hooks.title.mappings')}
        icon={Route}
        iconColor="text-pink-500"
        desc={i18n.t('configCenter.hooks.mappingCount', { count: mappings.length })}
        defaultOpen={false}
      >
        {mappings.length === 0 ? (
          <EmptyState message={i18n.t('configCenter.hooks.emptyMappings')} icon={Route} />
        ) : (
          mappings.map((m: Record<string, unknown>, i: number) => (
            <ConfigCard
              key={i}
              title={String(m.match || m.action || i18n.t('configCenter.hooks.mappingTitle', { index: i + 1 }))}
              icon={Route}
              onDelete={() => {
                const next = mappings.filter((_, j) => j !== i);
                s(['mappings'], next);
              }}
            >
              <TextField
                label={i18n.t('configCenter.hooks.fields.match')}
                value={String(m.match ?? '')}
                onChange={(v) => {
                  const next = [...mappings];
                  next[i] = { ...next[i], match: v };
                  s(['mappings'], next);
                }}
                placeholder="pattern"
              />
              <TextField
                label={i18n.t('configCenter.hooks.fields.action')}
                value={String(m.action ?? '')}
                onChange={(v) => {
                  const next = [...mappings];
                  next[i] = { ...next[i], action: v };
                  s(['mappings'], next);
                }}
                placeholder="send"
              />
              <TextField
                label={i18n.t('configCenter.hooks.fields.channel')}
                value={String(m.channel ?? '')}
                onChange={(v) => {
                  const next = [...mappings];
                  next[i] = { ...next[i], channel: v };
                  s(['mappings'], next);
                }}
                placeholder="telegram"
              />
              <TextField
                label={i18n.t('configCenter.hooks.fields.model')}
                value={String(m.model ?? '')}
                onChange={(v) => {
                  const next = [...mappings];
                  next[i] = { ...next[i], model: v };
                  s(['mappings'], next);
                }}
                placeholder="gpt-4"
              />
            </ConfigCard>
          ))
        )}
        <AddButton
          label={i18n.t('configCenter.hooks.addMapping')}
          onClick={() => s(['mappings'], [...mappings, { match: '', action: 'send' }])}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.hooks.title.gmail')} icon={Mail} iconColor="text-red-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.hooks.fields.gmailEnabled')}
          value={g(['gmail', 'enabled']) === true}
          onChange={(v) => s(['gmail', 'enabled'], v)}
        />
        <TextField
          label={i18n.t('configCenter.hooks.fields.credentialsPath')}
          value={String(g(['gmail', 'credentialsPath']) ?? '')}
          onChange={(v) => s(['gmail', 'credentialsPath'], v)}
        />
        <TextField
          label={i18n.t('configCenter.hooks.fields.gmailTokenPath')}
          value={String(g(['gmail', 'tokenPath']) ?? '')}
          onChange={(v) => s(['gmail', 'tokenPath'], v)}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.hooks.title.internal')} icon={Network} iconColor="text-slate-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.hooks.fields.internalEnabled')}
          value={g(['internal', 'enabled']) === true}
          onChange={(v) => s(['internal', 'enabled'], v)}
        />
      </ConfigSection>
    </div>
  );
};
