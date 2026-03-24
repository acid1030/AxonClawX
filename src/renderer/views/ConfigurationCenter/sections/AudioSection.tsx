/**
 * 音频配置 - 表单式 UI（简化版）
 */
import React from 'react';
import { Volume2, Mic } from 'lucide-react';
import {
  ConfigSection,
  TextField,
  SelectField,
  SwitchField,
  NumberField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import i18n from '@/i18n';

export const AudioSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (path: string[]) => getField(path);
  const s = (path: string[], v: unknown) => setField(path, v);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.audio.talkTitle')} icon={Volume2} iconColor="text-fuchsia-500">
        <SelectField
          label="Provider"
          value={String(g(['talk', 'provider']) ?? '')}
          onChange={(v) => s(['talk', 'provider'], v)}
          options={[
            { value: '', label: '—' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'elevenlabs', label: 'ElevenLabs' },
            { value: 'edge', label: 'Edge' },
          ]}
        />
        <TextField
          label="Voice ID"
          value={String(g(['talk', 'voiceId']) ?? '')}
          onChange={(v) => s(['talk', 'voiceId'], v)}
        />
        <TextField
          label="Model ID"
          value={String(g(['talk', 'modelId']) ?? '')}
          onChange={(v) => s(['talk', 'modelId'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.audio.interruptOnSpeech')}
          value={g(['talk', 'interruptOnSpeech']) === true}
          onChange={(v) => s(['talk', 'interruptOnSpeech'], v)}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.audio.transcriptionTitle')} icon={Mic} iconColor="text-fuchsia-500" defaultOpen={false}>
        <TextField
          label={i18n.t('configCenter.audio.command')}
          value={String(g(['audio', 'transcription', 'command']) ?? '')}
          onChange={(v) => s(['audio', 'transcription', 'command'], v)}
        />
        <NumberField
          label={i18n.t('configCenter.audio.timeoutSeconds')}
          value={g(['audio', 'transcription', 'timeoutSeconds']) as number | undefined}
          onChange={(v) => s(['audio', 'transcription', 'timeoutSeconds'], v)}
          min={0}
        />
      </ConfigSection>
    </div>
  );
};
