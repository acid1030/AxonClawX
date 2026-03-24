/**
 * 命令配置 - 表单式 UI
 */
import React from 'react';
import { ToggleLeft, Terminal, Shield } from 'lucide-react';
import i18n from '@/i18n';
import {
  ConfigSection,
  SelectField,
  NumberField,
  SwitchField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const TRISTATE_OPTIONS = [
  { value: 'auto', label: i18n.t('configCenter.commands.options.tristate.auto') },
  { value: 'true', label: i18n.t('configCenter.commands.options.tristate.on') },
  { value: 'false', label: i18n.t('configCenter.commands.options.tristate.off') },
];

export const CommandsSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['commands', ...p]);
  const s = (p: string[], v: unknown) => setField(['commands', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.commands.title.switches')} icon={ToggleLeft} iconColor="text-amber-500">
        <SelectField
          label={i18n.t('configCenter.commands.fields.native')}
          desc={i18n.t('configCenter.commands.fields.nativeDesc')}
          value={TRISTATE_OPTIONS.some((o) => o.value === String(g(['native']) ?? 'auto')) ? String(g(['native']) ?? 'auto') : 'auto'}
          onChange={(v) => s(['native'], v)}
          options={TRISTATE_OPTIONS}
        />
        <SelectField
          label={i18n.t('configCenter.commands.fields.nativeSkills')}
          value={TRISTATE_OPTIONS.some((o) => o.value === String(g(['nativeSkills']) ?? 'auto')) ? String(g(['nativeSkills']) ?? 'auto') : 'auto'}
          onChange={(v) => s(['nativeSkills'], v)}
          options={TRISTATE_OPTIONS}
        />
        <SwitchField
          label={i18n.t('configCenter.commands.fields.text')}
          value={g(['text']) !== false}
          onChange={(v) => s(['text'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.commands.fields.bash')}
          value={g(['bash']) !== false}
          onChange={(v) => s(['bash'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.commands.fields.config')}
          value={g(['config']) !== false}
          onChange={(v) => s(['config'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.commands.fields.debug')}
          value={g(['debug']) === true}
          onChange={(v) => s(['debug'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.commands.fields.restart')}
          value={g(['restart']) !== false}
          onChange={(v) => s(['restart'], v)}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.commands.title.bash')} icon={Terminal} iconColor="text-green-500" defaultOpen={false}>
        <NumberField
          label={i18n.t('configCenter.commands.fields.bashForegroundMs')}
          desc={i18n.t('configCenter.commands.fields.bashForegroundMsDesc')}
          value={g(['bashForegroundMs']) as number | undefined}
          onChange={(v) => s(['bashForegroundMs'], v)}
          min={0}
          max={30000}
          step={500}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.commands.title.access')} icon={Shield} iconColor="text-red-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.commands.fields.useAccessGroups')}
          value={g(['useAccessGroups']) === true}
          onChange={(v) => s(['useAccessGroups'], v)}
        />
        <ArrayField
          label={i18n.t('configCenter.commands.fields.ownerAllowFrom')}
          desc={i18n.t('configCenter.commands.fields.ownerAllowFromDesc')}
          value={Array.isArray(g(['ownerAllowFrom'])) ? (g(['ownerAllowFrom']) as unknown[]).map(String) : []}
          onChange={(v) => s(['ownerAllowFrom'], v)}
          placeholder={i18n.t('configCenter.commands.placeholders.ownerAllowFrom')}
        />
      </ConfigSection>
    </div>
  );
};
