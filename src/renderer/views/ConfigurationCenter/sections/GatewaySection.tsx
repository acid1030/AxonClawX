/**
 * 网关配置 - 表单式 UI
 */
import React from 'react';
import { Settings, Lock, Gauge } from 'lucide-react';
import {
  ConfigSection,
  NumberField,
  SelectField,
  TextField,
  SwitchField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import i18n from '@/i18n';

const BIND_OPTIONS = [
  { value: 'auto', label: i18n.t('configCenter.gateway.bind.auto') },
  { value: 'lan', label: i18n.t('configCenter.gateway.bind.lan') },
  { value: 'loopback', label: i18n.t('configCenter.gateway.bind.loopback') },
  { value: 'custom', label: i18n.t('configCenter.gateway.bind.custom') },
];
const MODE_OPTIONS = [
  { value: 'local', label: i18n.t('configCenter.gateway.mode.local') },
  { value: 'remote', label: i18n.t('configCenter.gateway.mode.remote') },
];
const AUTH_MODE_OPTIONS = [
  { value: '', label: i18n.t('configCenter.gateway.authMode.select') },
  { value: 'token', label: 'Token' },
  { value: 'password', label: i18n.t('configCenter.gateway.authMode.password') },
  { value: 'trusted-proxy', label: i18n.t('configCenter.gateway.authMode.trustedProxy') },
  { value: 'none', label: i18n.t('configCenter.gateway.authMode.none') },
];

function ensureInOptions(value: string, options: { value: string }[]): string {
  if (!value) return '';
  return options.some((o) => o.value === value) ? value : '';
}
const RELOAD_MODE_OPTIONS = [
  { value: 'off', label: i18n.t('configCenter.gateway.reloadMode.off') },
  { value: 'restart', label: i18n.t('configCenter.gateway.reloadMode.restart') },
  { value: 'hot', label: i18n.t('configCenter.gateway.reloadMode.hot') },
  { value: 'hybrid', label: i18n.t('configCenter.gateway.reloadMode.hybrid') },
];

export const GatewaySection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['gateway', ...p]);
  const s = (p: string[], v: unknown) => setField(['gateway', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.gateway.title.basic')} icon={Settings} iconColor="text-teal-500">
        <NumberField
          label={i18n.t('configCenter.gateway.fields.port')}
          value={g(['port']) as number | undefined}
          onChange={(v) => s(['port'], v)}
          min={1}
          max={65535}
        />
        <SelectField
          label={i18n.t('configCenter.gateway.fields.mode')}
          value={ensureInOptions(String(g(['mode']) ?? 'local'), MODE_OPTIONS) || 'local'}
          onChange={(v) => s(['mode'], v)}
          options={MODE_OPTIONS}
        />
        <SelectField
          label={i18n.t('configCenter.gateway.fields.bindAddress')}
          value={ensureInOptions(String(g(['bind']) ?? 'auto'), BIND_OPTIONS) || 'auto'}
          onChange={(v) => s(['bind'], v)}
          options={BIND_OPTIONS}
        />
        {g(['bind']) === 'custom' && (
          <TextField
            label={i18n.t('configCenter.gateway.fields.customBindHost')}
            value={String(g(['customBindHost']) ?? '')}
            onChange={(v) => s(['customBindHost'], v)}
            placeholder="0.0.0.0"
          />
        )}
        <NumberField
          label={i18n.t('configCenter.gateway.fields.channelHealthCheckMinutes')}
          value={g(['channelHealthCheckMinutes']) as number | undefined}
          onChange={(v) => s(['channelHealthCheckMinutes'], v)}
          min={0}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.gateway.title.auth')} icon={Lock} iconColor="text-red-500">
        <SelectField
          label={i18n.t('configCenter.gateway.fields.authMode')}
          value={ensureInOptions(String(g(['auth', 'mode']) ?? ''), AUTH_MODE_OPTIONS)}
          onChange={(v) => s(['auth', 'mode'], v)}
          options={AUTH_MODE_OPTIONS}
        />
        {(g(['auth', 'mode']) === 'token' || !g(['auth', 'mode'])) && (
          <TextField
            label="Token"
            value={String(g(['auth', 'token']) ?? '')}
            onChange={(v) => s(['auth', 'token'], v)}
          />
        )}
        {(g(['auth', 'mode']) === 'password' || !g(['auth', 'mode'])) && (
          <TextField
            label={i18n.t('configCenter.gateway.fields.password')}
            value={String(g(['auth', 'password']) ?? '')}
            onChange={(v) => s(['auth', 'password'], v)}
          />
        )}
        {g(['auth', 'mode']) === 'trusted-proxy' && (
          <>
            <TextField
              label={i18n.t('configCenter.gateway.fields.userHeader')}
              value={String(g(['auth', 'trustedProxy', 'userHeader']) ?? '')}
              onChange={(v) => s(['auth', 'trustedProxy', 'userHeader'], v)}
              placeholder="X-Forwarded-User"
            />
            <ArrayField
              label={i18n.t('configCenter.gateway.fields.requiredHeaders')}
              value={(g(['auth', 'trustedProxy', 'requiredHeaders']) as string[]) ?? []}
              onChange={(v) => s(['auth', 'trustedProxy', 'requiredHeaders'], v)}
              placeholder="X-Custom-Header"
            />
            <ArrayField
              label={i18n.t('configCenter.gateway.fields.allowUsers')}
              value={(g(['auth', 'trustedProxy', 'allowUsers']) as string[]) ?? []}
              onChange={(v) => s(['auth', 'trustedProxy', 'allowUsers'], v)}
              placeholder="admin"
            />
          </>
        )}
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.gateway.title.authRateLimit')} icon={Gauge} iconColor="text-orange-500" defaultOpen={false}>
        <NumberField
          label={i18n.t('configCenter.gateway.fields.maxAttempts')}
          value={g(['auth', 'rateLimit', 'maxAttempts']) as number | undefined}
          onChange={(v) => s(['auth', 'rateLimit', 'maxAttempts'], v)}
          min={1}
        />
        <NumberField
          label={i18n.t('configCenter.gateway.fields.windowMs')}
          value={g(['auth', 'rateLimit', 'windowMs']) as number | undefined}
          onChange={(v) => s(['auth', 'rateLimit', 'windowMs'], v)}
          min={0}
          step={1000}
        />
        <NumberField
          label={i18n.t('configCenter.gateway.fields.lockoutMs')}
          value={g(['auth', 'rateLimit', 'lockoutMs']) as number | undefined}
          onChange={(v) => s(['auth', 'rateLimit', 'lockoutMs'], v)}
          min={0}
          step={1000}
        />
        <SwitchField
          label={i18n.t('configCenter.gateway.fields.exemptLoopback')}
          value={g(['auth', 'rateLimit', 'exemptLoopback']) === true}
          onChange={(v) => s(['auth', 'rateLimit', 'exemptLoopback'], v)}
        />
      </ConfigSection>
    </div>
  );
};
