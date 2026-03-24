/**
 * 浏览器配置 - 表单式 UI
 */
import React from 'react';
import { Globe, Shield } from 'lucide-react';
import i18n from '@/i18n';
import {
  ConfigSection,
  TextField,
  SwitchField,
  NumberField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';

export const BrowserSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['browser', ...p]);
  const s = (p: string[], v: unknown) => setField(['browser', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.browser.title.main')} icon={Globe} iconColor="text-emerald-500">
        <SwitchField
          label={i18n.t('configCenter.browser.fields.enabled')}
          value={g(['enabled']) === true}
          onChange={(v) => s(['enabled'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.browser.fields.evaluateEnabled')}
          value={g(['evaluateEnabled']) === true}
          onChange={(v) => s(['evaluateEnabled'], v)}
        />
        <TextField
          label={i18n.t('configCenter.browser.fields.cdpUrl')}
          value={String(g(['cdpUrl']) ?? '')}
          onChange={(v) => s(['cdpUrl'], v)}
          placeholder="http://localhost:9222"
        />
        <NumberField
          label={i18n.t('configCenter.browser.fields.remoteCdpTimeoutMs')}
          value={g(['remoteCdpTimeoutMs']) as number | undefined}
          onChange={(v) => s(['remoteCdpTimeoutMs'], v)}
          min={0}
          step={1000}
        />
        <TextField
          label={i18n.t('configCenter.browser.fields.executablePath')}
          value={String(g(['executablePath']) ?? '')}
          onChange={(v) => s(['executablePath'], v)}
        />
        <TextField
          label={i18n.t('configCenter.browser.fields.color')}
          value={String(g(['color']) ?? '')}
          onChange={(v) => s(['color'], v)}
          placeholder="#4285f4"
        />
        <SwitchField
          label={i18n.t('configCenter.browser.fields.headless')}
          value={g(['headless']) !== false}
          onChange={(v) => s(['headless'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.browser.fields.noSandbox')}
          value={g(['noSandbox']) === true}
          onChange={(v) => s(['noSandbox'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.browser.fields.attachOnly')}
          value={g(['attachOnly']) === true}
          onChange={(v) => s(['attachOnly'], v)}
        />
        <TextField
          label={i18n.t('configCenter.browser.fields.defaultProfile')}
          value={String(g(['defaultProfile']) ?? '')}
          onChange={(v) => s(['defaultProfile'], v)}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.browser.title.ssrfPolicy')} icon={Shield} iconColor="text-red-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.browser.fields.allowPrivateNetwork')}
          value={g(['ssrfPolicy', 'allowPrivateNetwork']) === true}
          onChange={(v) => s(['ssrfPolicy', 'allowPrivateNetwork'], v)}
        />
        <ArrayField
          label={i18n.t('configCenter.browser.fields.hostnameAllowlist')}
          value={(g(['ssrfPolicy', 'hostnameAllowlist']) as string[]) ?? []}
          onChange={(v) => s(['ssrfPolicy', 'hostnameAllowlist'], v)}
          placeholder="*.example.com"
        />
      </ConfigSection>
    </div>
  );
};
