/**
 * 会话配置 - 表单式 UI
 */
import React from 'react';
import { GitBranch, RotateCcw, Layers, Link2, Wrench, ArrowLeftRight } from 'lucide-react';
import { ConfigSection, SelectField, NumberField, TextField, ArrayField, SwitchField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import i18n from '@/i18n';

const SCOPE_OPTIONS = [
  { value: 'per-sender', label: i18n.t('configCenter.session.scope.perSender') },
  { value: 'global', label: i18n.t('configCenter.session.scope.global') },
];
const DM_SCOPE_OPTIONS = [
  { value: 'main', label: i18n.t('configCenter.session.dmScope.main') },
  { value: 'per-peer', label: i18n.t('configCenter.session.dmScope.perPeer') },
  { value: 'per-channel-peer', label: i18n.t('configCenter.session.dmScope.perChannelPeer') },
  { value: 'per-account-channel-peer', label: i18n.t('configCenter.session.dmScope.perAccountChannelPeer') },
];
const RESET_MODE_OPTIONS = [
  { value: 'daily', label: i18n.t('configCenter.session.resetMode.daily') },
  { value: 'idle', label: i18n.t('configCenter.session.resetMode.idle') },
  { value: 'off', label: i18n.t('configCenter.session.resetMode.off') },
];
const MAINT_MODE_OPTIONS = [
  { value: 'enforce', label: i18n.t('configCenter.session.maintMode.enforce') },
  { value: 'warn', label: i18n.t('configCenter.session.maintMode.warn') },
];

export const SessionSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['session', ...p]);
  const s = (p: string[], v: unknown) => setField(['session', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.session.title.scope')} icon={GitBranch} iconColor="text-indigo-500">
        <SelectField
          label={i18n.t('configCenter.session.fields.scope')}
          desc={i18n.t('configCenter.session.fields.scopeDesc')}
          value={String(g(['scope']) ?? 'per-sender')}
          onChange={(v) => s(['scope'], v)}
          options={SCOPE_OPTIONS}
        />
        <SelectField
          label={i18n.t('configCenter.session.fields.dmScope')}
          value={String(g(['dmScope']) ?? 'main')}
          onChange={(v) => s(['dmScope'], v)}
          options={DM_SCOPE_OPTIONS}
        />
        <NumberField
          label={i18n.t('configCenter.session.fields.idleMinutes')}
          value={g(['idleMinutes']) as number | undefined}
          onChange={(v) => s(['idleMinutes'], v)}
          min={0}
        />
        <TextField
          label={i18n.t('configCenter.session.fields.storePath')}
          value={String(g(['store']) ?? '')}
          onChange={(v) => s(['store'], v)}
        />
        <TextField
          label={i18n.t('configCenter.session.fields.mainKey')}
          value={String(g(['mainKey']) ?? '')}
          onChange={(v) => s(['mainKey'], v)}
          placeholder="main"
        />
        <NumberField
          label={i18n.t('configCenter.session.fields.parentForkMaxTokens')}
          value={g(['parentForkMaxTokens']) as number | undefined}
          onChange={(v) => s(['parentForkMaxTokens'], v)}
          min={0}
        />
        <ArrayField
          label={i18n.t('configCenter.session.fields.resetTriggers')}
          value={(g(['resetTriggers']) as string[]) ?? []}
          onChange={(v) => s(['resetTriggers'], v)}
          placeholder="/reset"
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.session.title.reset')} icon={RotateCcw} iconColor="text-orange-500">
        <SelectField
          label={i18n.t('configCenter.session.fields.resetMode')}
          value={String(g(['reset', 'mode']) ?? 'idle')}
          onChange={(v) => s(['reset', 'mode'], v)}
          options={RESET_MODE_OPTIONS}
        />
        {g(['reset', 'mode']) === 'daily' && (
          <NumberField
            label={i18n.t('configCenter.session.fields.resetHour')}
            value={g(['reset', 'atHour']) as number | undefined}
            onChange={(v) => s(['reset', 'atHour'], v)}
            min={0}
            max={23}
          />
        )}
        {g(['reset', 'mode']) === 'idle' && (
          <NumberField
            label={i18n.t('configCenter.session.fields.resetIdleMinutes')}
            value={g(['reset', 'idleMinutes']) as number | undefined}
            onChange={(v) => s(['reset', 'idleMinutes'], v)}
            min={1}
          />
        )}
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.session.title.resetByType')} icon={Layers} iconColor="text-teal-500" defaultOpen={false}>
        <SelectField
          label={i18n.t('configCenter.session.fields.dm')}
          value={String(g(['resetByType', 'dm', 'mode']) ?? '')}
          onChange={(v) => s(['resetByType', 'dm', 'mode'], v)}
          options={RESET_MODE_OPTIONS}
          allowEmpty
        />
        <SelectField
          label={i18n.t('configCenter.session.fields.group')}
          value={String(g(['resetByType', 'group', 'mode']) ?? '')}
          onChange={(v) => s(['resetByType', 'group', 'mode'], v)}
          options={RESET_MODE_OPTIONS}
          allowEmpty
        />
        <SelectField
          label={i18n.t('configCenter.session.fields.thread')}
          value={String(g(['resetByType', 'thread', 'mode']) ?? '')}
          onChange={(v) => s(['resetByType', 'thread', 'mode'], v)}
          options={RESET_MODE_OPTIONS}
          allowEmpty
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.session.title.threadBindings')} icon={Link2} iconColor="text-cyan-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.session.fields.enabled')}
          value={g(['threadBindings', 'enabled']) === true}
          onChange={(v) => s(['threadBindings', 'enabled'], v)}
        />
        <NumberField
          label={i18n.t('configCenter.session.fields.idleHours')}
          value={g(['threadBindings', 'idleHours']) as number | undefined}
          onChange={(v) => s(['threadBindings', 'idleHours'], v)}
          min={0}
        />
        <NumberField
          label={i18n.t('configCenter.session.fields.maxAgeHours')}
          value={g(['threadBindings', 'maxAgeHours']) as number | undefined}
          onChange={(v) => s(['threadBindings', 'maxAgeHours'], v)}
          min={0}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.session.title.maintenance')} icon={Wrench} iconColor="text-amber-500" defaultOpen={false}>
        <SelectField
          label={i18n.t('configCenter.session.fields.maintenanceMode')}
          value={String(g(['maintenance', 'mode']) ?? 'enforce')}
          onChange={(v) => s(['maintenance', 'mode'], v)}
          options={MAINT_MODE_OPTIONS}
        />
        <TextField
          label={i18n.t('configCenter.session.fields.pruneAfter')}
          value={String(g(['maintenance', 'pruneAfter']) ?? '')}
          onChange={(v) => s(['maintenance', 'pruneAfter'], v)}
          placeholder="30d"
        />
        <NumberField
          label={i18n.t('configCenter.session.fields.maxEntries')}
          value={g(['maintenance', 'maxEntries']) as number | undefined}
          onChange={(v) => s(['maintenance', 'maxEntries'], v)}
          min={1}
        />
        <TextField
          label={i18n.t('configCenter.session.fields.rotateBytes')}
          value={String(g(['maintenance', 'rotateBytes']) ?? '')}
          onChange={(v) => s(['maintenance', 'rotateBytes'], v)}
          placeholder="50mb"
        />
        <TextField
          label={i18n.t('configCenter.session.fields.maxDiskBytes')}
          value={String(g(['maintenance', 'maxDiskBytes']) ?? '')}
          onChange={(v) => s(['maintenance', 'maxDiskBytes'], v)}
          placeholder="500mb"
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.session.title.agentToAgent')} icon={ArrowLeftRight} iconColor="text-violet-500" defaultOpen={false}>
        <NumberField
          label={i18n.t('configCenter.session.fields.maxPingPongTurns')}
          value={g(['agentToAgent', 'maxPingPongTurns']) as number | undefined}
          onChange={(v) => s(['agentToAgent', 'maxPingPongTurns'], v)}
          min={1}
        />
      </ConfigSection>
    </div>
  );
};
