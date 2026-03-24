/**
 * 记忆配置 - 表单式 UI
 */
import React from 'react';
import { Brain, Database } from 'lucide-react';
import i18n from '@/i18n';
import { ConfigSection, SelectField, TextField, NumberField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

const BACKEND_OPTIONS = [
  { value: 'builtin', label: i18n.t('configCenter.memory.options.backend.builtin') },
  { value: 'qmd', label: 'QMD' },
];
const CITATIONS_OPTIONS = [
  { value: 'auto', label: i18n.t('configCenter.memory.options.citations.auto') },
  { value: 'on', label: i18n.t('configCenter.memory.options.citations.on') },
  { value: 'off', label: i18n.t('configCenter.memory.options.citations.off') },
];

export const MemorySection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['memory', ...p]);
  const s = (p: string[], v: unknown) => setField(['memory', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.memory.title.main')} icon={Brain} iconColor="text-sky-500">
        <SelectField
          label={i18n.t('configCenter.memory.fields.backend')}
          value={String(g(['backend']) ?? 'builtin')}
          onChange={(v) => s(['backend'], v)}
          options={BACKEND_OPTIONS}
        />
        <SelectField
          label={i18n.t('configCenter.memory.fields.citations')}
          value={String(g(['citations']) ?? 'auto')}
          onChange={(v) => s(['citations'], v)}
          options={CITATIONS_OPTIONS}
        />
        <TextField
          label={i18n.t('configCenter.memory.fields.searchProvider')}
          value={String(g(['search', 'provider']) ?? '')}
          onChange={(v) => s(['search', 'provider'], v)}
          placeholder="openai/text-embedding-3-small"
        />
        <TextField
          label={i18n.t('configCenter.memory.fields.searchFallback')}
          value={String(g(['search', 'fallback']) ?? '')}
          onChange={(v) => s(['search', 'fallback'], v)}
          placeholder="builtin"
        />
      </ConfigSection>

      {g(['backend']) === 'qmd' && (
        <ConfigSection title={i18n.t('configCenter.memory.title.qmd')} icon={Database} iconColor="text-sky-500" defaultOpen={false}>
          <TextField
            label={i18n.t('configCenter.memory.fields.qmdCommand')}
            value={String(g(['qmd', 'command']) ?? '')}
            onChange={(v) => s(['qmd', 'command'], v)}
          />
          <TextField
            label={i18n.t('configCenter.memory.fields.dataPath')}
            value={String(g(['qmd', 'paths', 'data']) ?? '')}
            onChange={(v) => s(['qmd', 'paths', 'data'], v)}
          />
          <NumberField
            label={i18n.t('configCenter.memory.fields.maxEntries')}
            value={g(['qmd', 'limits', 'maxEntries']) as number | undefined}
            onChange={(v) => s(['qmd', 'limits', 'maxEntries'], v)}
            min={1}
          />
          <TextField
            label={i18n.t('configCenter.memory.fields.scope')}
            value={String(g(['qmd', 'scope']) ?? '')}
            onChange={(v) => s(['qmd', 'scope'], v)}
          />
        </ConfigSection>
      )}
    </div>
  );
};
