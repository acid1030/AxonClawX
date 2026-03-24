/**
 * 认证配置 - 表单式 UI
 */
import React from 'react';
import { SortAsc, Key, Timer } from 'lucide-react';
import i18n from '@/i18n';
import {
  ConfigSection,
  ConfigCard,
  TextField,
  SelectField,
  ArrayField,
  AddButton,
  EmptyState,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const AUTH_MODE_OPTIONS = [
  { value: 'api-key', label: i18n.t('configCenter.auth.options.mode.apiKey') },
  { value: 'oauth', label: 'OAuth' },
  { value: 'token', label: i18n.t('configCenter.auth.options.mode.token') },
];

export const AuthSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const rawProfiles = getField(['auth', 'profiles']);
  const profiles: Record<string, unknown>[] = Array.isArray(rawProfiles) ? rawProfiles : [];
  const rawOrder = getField(['auth', 'order']);
  const order: string[] = Array.isArray(rawOrder) ? rawOrder : [];

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.auth.title.order')} icon={SortAsc} iconColor="text-red-500">
        <ArrayField
          label={i18n.t('configCenter.auth.fields.providerOrder')}
          desc={i18n.t('configCenter.auth.fields.providerOrderDesc')}
          value={order}
          onChange={(v) => setField(['auth', 'order'], v)}
          placeholder="provider-name"
        />
      </ConfigSection>

      <ConfigSection
        title={i18n.t('configCenter.auth.title.profiles')}
        icon={Key}
        iconColor="text-red-500"
        desc={i18n.t('configCenter.auth.profileCount', { count: profiles.length })}
      >
        {profiles.length === 0 ? (
          <EmptyState message={i18n.t('configCenter.auth.emptyProfiles')} icon={Key} />
        ) : (
          profiles.map((p: Record<string, unknown>, i: number) => (
            <ConfigCard
              key={i}
              title={String(p.provider || i18n.t('configCenter.auth.profileTitle', { index: i + 1 }))}
              icon={Key}
              onDelete={() => {
                const next = profiles.filter((_, j) => j !== i);
                setField(['auth', 'profiles'], next);
              }}
            >
              <TextField
                label={i18n.t('configCenter.auth.fields.provider')}
                value={String(p.provider ?? '')}
                onChange={(v) => {
                  const next = [...profiles];
                  next[i] = { ...next[i], provider: v };
                  setField(['auth', 'profiles'], next);
                }}
              />
              <SelectField
                label={i18n.t('configCenter.auth.fields.mode')}
                value={AUTH_MODE_OPTIONS.some((o) => o.value === String(p.mode ?? 'api-key')) ? String(p.mode ?? 'api-key') : 'api-key'}
                onChange={(v) => {
                  const next = [...profiles];
                  next[i] = { ...next[i], mode: v };
                  setField(['auth', 'profiles'], next);
                }}
                options={AUTH_MODE_OPTIONS}
              />
              <TextField
                label={i18n.t('configCenter.auth.fields.email')}
                value={String(p.email ?? '')}
                onChange={(v) => {
                  const next = [...profiles];
                  next[i] = { ...next[i], email: v };
                  setField(['auth', 'profiles'], next);
                }}
                placeholder="user@example.com"
              />
            </ConfigCard>
          ))
        )}
        <AddButton
          label={i18n.t('configCenter.auth.addProfile')}
          onClick={() => setField(['auth', 'profiles'], [...profiles, { provider: '', mode: 'api-key' }])}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.auth.title.cooldowns')} icon={Timer} iconColor="text-red-500" defaultOpen={false}>
        <TextField
          label={i18n.t('configCenter.auth.fields.cooldownsJson')}
          desc={i18n.t('configCenter.auth.fields.cooldownsJsonDesc')}
          value={JSON.stringify(getField(['auth', 'cooldowns']) || {}, null, 2)}
          onChange={(v) => {
            try {
              setField(['auth', 'cooldowns'], JSON.parse(v));
            } catch {
              /* ignore */
            }
          }}
          multiline
        />
      </ConfigSection>
    </div>
  );
};
