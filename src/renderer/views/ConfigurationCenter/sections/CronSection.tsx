/**
 * 定时任务配置 - 表单式 UI
 */
import React from 'react';
import { Clock } from 'lucide-react';
import i18n from '@/i18n';
import { ConfigSection, TextField, NumberField, SwitchField, SelectField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const WAKE_OPTIONS = [
  { value: 'now', label: i18n.t('configCenter.cron.options.wake.now') },
  { value: 'next-heartbeat', label: i18n.t('configCenter.cron.options.wake.nextHeartbeat') },
];

export const CronSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['cron', ...p]);
  const s = (p: string[], v: unknown) => setField(['cron', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.cron.title.main')} icon={Clock} iconColor="text-lime-500">
        <SwitchField
          label={i18n.t('configCenter.cron.fields.enabled')}
          value={g(['enabled']) !== false}
          onChange={(v) => s(['enabled'], v)}
        />
        <TextField
          label={i18n.t('configCenter.cron.fields.store')}
          value={String(g(['store']) ?? '')}
          onChange={(v) => s(['store'], v)}
          placeholder={i18n.t('configCenter.cron.placeholders.store')}
        />
        <NumberField
          label={i18n.t('configCenter.cron.fields.maxConcurrentRuns')}
          value={g(['maxConcurrentRuns']) as number | undefined}
          onChange={(v) => s(['maxConcurrentRuns'], v)}
          min={1}
        />
        <SelectField
          label={i18n.t('configCenter.cron.fields.wakeMode')}
          value={String(g(['wakeMode']) ?? 'now')}
          onChange={(v) => s(['wakeMode'], v)}
          options={WAKE_OPTIONS}
        />
        <SwitchField
          label={i18n.t('configCenter.cron.fields.lightContext')}
          value={g(['lightContext']) === true}
          onChange={(v) => s(['lightContext'], v)}
        />
      </ConfigSection>
    </div>
  );
};
