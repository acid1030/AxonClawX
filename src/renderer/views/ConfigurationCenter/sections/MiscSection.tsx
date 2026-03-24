/**
 * 杂项配置 - 表单式 UI
 */
import React from 'react';
import { Terminal, Download, Palette, LayoutDashboard, Cpu } from 'lucide-react';
import {
  ConfigSection,
  TextField,
  SelectField,
  SwitchField,
  NumberField,
  ArrayField,
  KeyValueField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import i18n from '@/i18n';

const UPDATE_CHANNEL_OPTIONS = [
  { value: 'stable', label: i18n.t('configCenter.misc.options.updateChannel.stable') },
  { value: 'beta', label: i18n.t('configCenter.misc.options.updateChannel.beta') },
  { value: 'dev', label: i18n.t('configCenter.misc.options.updateChannel.dev') },
];
const TAGLINE_OPTIONS = [
  { value: 'random', label: i18n.t('configCenter.misc.options.taglineMode.random') },
  { value: 'default', label: i18n.t('configCenter.misc.options.taglineMode.default') },
  { value: 'off', label: i18n.t('configCenter.misc.options.taglineMode.off') },
];

export const MiscSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const gg = (p: string[]) => getField(['gateway', ...p]);
  const gs = (p: string[], v: unknown) => setField(['gateway', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.misc.title.cli')} icon={Terminal} iconColor="text-emerald-500" defaultOpen={false}>
        <SelectField
          label={i18n.t('configCenter.misc.fields.taglineMode')}
          value={String(getField(['cli', 'banner', 'taglineMode']) ?? 'random')}
          onChange={(v) => setField(['cli', 'banner', 'taglineMode'], v)}
          options={TAGLINE_OPTIONS}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.misc.title.update')} icon={Download} iconColor="text-blue-500">
        <SelectField
          label={i18n.t('configCenter.misc.fields.updateChannel')}
          value={String(getField(['update', 'channel']) ?? 'stable')}
          onChange={(v) => setField(['update', 'channel'], v)}
          options={UPDATE_CHANNEL_OPTIONS}
        />
        <SwitchField
          label={i18n.t('configCenter.misc.fields.checkOnStart')}
          value={getField(['update', 'checkOnStart']) !== false}
          onChange={(v) => setField(['update', 'checkOnStart'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.misc.fields.autoUpdate')}
          value={getField(['update', 'auto', 'enabled']) === true}
          onChange={(v) => setField(['update', 'auto', 'enabled'], v)}
        />
        <NumberField
          label={i18n.t('configCenter.misc.fields.stableDelayHours')}
          value={getField(['update', 'auto', 'stableDelayHours']) as number | undefined}
          onChange={(v) => setField(['update', 'auto', 'stableDelayHours'], v)}
          min={0}
          max={168}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.misc.title.ui')} icon={Palette} iconColor="text-pink-500" defaultOpen={false}>
        <TextField
          label={i18n.t('configCenter.misc.fields.seamColor')}
          value={String(getField(['ui', 'seamColor']) ?? '')}
          onChange={(v) => setField(['ui', 'seamColor'], v)}
          placeholder="#hex"
        />
        <TextField
          label={i18n.t('configCenter.misc.fields.assistantName')}
          value={String(getField(['ui', 'assistant', 'name']) ?? '')}
          onChange={(v) => setField(['ui', 'assistant', 'name'], v)}
          placeholder={i18n.t('configCenter.misc.placeholders.assistantName')}
          mono={false}
        />
        <TextField
          label={i18n.t('configCenter.misc.fields.assistantAvatar')}
          value={String(getField(['ui', 'assistant', 'avatar']) ?? '')}
          onChange={(v) => setField(['ui', 'assistant', 'avatar'], v)}
          placeholder="https://..."
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.misc.title.controlUi')} icon={LayoutDashboard} iconColor="text-indigo-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.misc.fields.enabled')}
          value={gg(['controlUi', 'enabled']) !== false}
          onChange={(v) => gs(['controlUi', 'enabled'], v)}
        />
        <TextField
          label={i18n.t('configCenter.misc.fields.basePath')}
          value={String(gg(['controlUi', 'basePath']) ?? '')}
          onChange={(v) => gs(['controlUi', 'basePath'], v)}
          placeholder="/"
        />
        <ArrayField
          label={i18n.t('configCenter.misc.fields.allowedOrigins')}
          value={(gg(['controlUi', 'allowedOrigins']) as string[]) ?? []}
          onChange={(v) => gs(['controlUi', 'allowedOrigins'], v)}
          placeholder="https://..."
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.misc.title.env')} icon={Cpu} iconColor="text-slate-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.misc.fields.shellEnv')}
          value={getField(['env', 'shellEnv', 'enabled']) === true}
          onChange={(v) => setField(['env', 'shellEnv', 'enabled'], v)}
        />
        <NumberField
          label={i18n.t('configCenter.misc.fields.shellTimeoutMs')}
          value={getField(['env', 'shellEnv', 'timeoutMs']) as number | undefined}
          onChange={(v) => setField(['env', 'shellEnv', 'timeoutMs'], v)}
          min={0}
          step={1000}
        />
        <KeyValueField
          label={i18n.t('configCenter.misc.fields.envVars')}
          value={(getField(['env', 'vars']) as Record<string, string>) || {}}
          onChange={(v) => setField(['env', 'vars'], v)}
        />
      </ConfigSection>
    </div>
  );
};
