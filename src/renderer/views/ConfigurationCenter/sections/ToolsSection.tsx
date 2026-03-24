/**
 * 工具配置 - 权限 profile、网络搜索、网页抓取等
 * 参考 knowledge tips
 */
import React from 'react';
import { Wrench, Shield, Globe, FileSearch } from 'lucide-react';
import i18n from '@/i18n';
import { ConfigSection, SelectField, ArrayField, SwitchField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const PROFILE_OPTIONS = [
  { value: 'full', label: i18n.t('configCenter.tools.options.profile.full') },
  { value: 'minimal', label: i18n.t('configCenter.tools.options.profile.minimal') },
  { value: 'custom', label: i18n.t('configCenter.tools.options.profile.custom') },
];

export const ToolsSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['tools', ...p]);
  const s = (p: string[], v: unknown) => setField(['tools', ...p], v);

  const profile = String(g(['profile']) ?? 'full');
  const deny = (g(['deny']) as string[]) ?? [];
  const allow = (g(['allow']) as string[]) ?? [];

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.tools.title.permissions')} icon={Shield} iconColor="text-amber-500" desc={i18n.t('configCenter.tools.desc.permissions')}>
        <SelectField
          label={i18n.t('configCenter.tools.fields.profile')}
          value={profile}
          onChange={(v) => s(['profile'], v)}
          options={PROFILE_OPTIONS}
        />
        {profile === 'custom' && (
          <>
            <ArrayField
              label={i18n.t('configCenter.tools.fields.allow')}
              value={allow}
              onChange={(v) => s(['allow'], v)}
              placeholder="tool_id"
            />
            <ArrayField
              label={i18n.t('configCenter.tools.fields.deny')}
              value={deny}
              onChange={(v) => s(['deny'], v)}
              placeholder="tool_id"
            />
          </>
        )}
        {profile !== 'custom' && (
          <ArrayField
            label={i18n.t('configCenter.tools.fields.extraDeny')}
            value={deny}
            onChange={(v) => s(['deny'], v)}
            placeholder="web_search, code_exec…"
          />
        )}
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.tools.title.network')} icon={Globe} iconColor="text-blue-500" defaultOpen={true}>
        <SwitchField
          label={i18n.t('configCenter.tools.fields.webSearchEnabled')}
          value={g(['webSearch', 'enabled']) !== false}
          onChange={(v) => s(['webSearch', 'enabled'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.tools.fields.fetchUrlEnabled')}
          value={g(['fetchUrl', 'enabled']) !== false}
          onChange={(v) => s(['fetchUrl', 'enabled'], v)}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.tools.title.codeExec')} icon={Wrench} iconColor="text-indigo-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.tools.fields.codeExecEnabled')}
          value={g(['codeExec', 'enabled']) !== false}
          onChange={(v) => s(['codeExec', 'enabled'], v)}
        />
      </ConfigSection>
    </div>
  );
};
