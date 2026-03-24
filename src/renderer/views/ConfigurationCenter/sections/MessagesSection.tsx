/**
 * 消息配置 - 表单式 UI
 */
import React from 'react';
import { Quote, ThumbsUp, Users, Inbox, Edit3, Mic } from 'lucide-react';
import {
  ConfigSection,
  TextField,
  SelectField,
  SwitchField,
  NumberField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import i18n from '@/i18n';

const ACK_SCOPE_OPTIONS = [
  { value: 'group-mentions', label: i18n.t('configCenter.messages.ackScope.groupMentions') },
  { value: 'group-all', label: i18n.t('configCenter.messages.ackScope.groupAll') },
  { value: 'direct', label: i18n.t('configCenter.messages.ackScope.direct') },
  { value: 'all', label: i18n.t('configCenter.messages.ackScope.all') },
];
const QUEUE_OPTIONS = [
  { value: 'fifo', label: 'FIFO' },
  { value: 'debounce', label: i18n.t('configCenter.messages.queueMode.debounce') },
  { value: 'off', label: i18n.t('configCenter.messages.queueMode.off') },
];
const TYPING_OPTIONS = [
  { value: 'never', label: i18n.t('configCenter.messages.typingMode.never') },
  { value: 'instant', label: i18n.t('configCenter.messages.typingMode.instant') },
  { value: 'thinking', label: i18n.t('configCenter.messages.typingMode.thinking') },
  { value: 'message', label: i18n.t('configCenter.messages.typingMode.message') },
];

export const MessagesSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['messages', ...p]);
  const s = (p: string[], v: unknown) => setField(['messages', ...p], v);
  const sg = (p: string[]) => getField(['session', ...p]);
  const ss = (p: string[], v: unknown) => setField(['session', ...p], v);
  const tg = (p: string[]) => getField(['tools', 'message', ...p]);
  const ts = (p: string[], v: unknown) => setField(['tools', 'message', ...p], v);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.messages.title.prefix')} icon={Quote} iconColor="text-cyan-500">
        <TextField
          label={i18n.t('configCenter.messages.fields.messagePrefix')}
          value={String(g(['messagePrefix']) ?? '')}
          onChange={(v) => s(['messagePrefix'], v)}
          placeholder={i18n.t('configCenter.messages.placeholders.userPrefix')}
          mono={false}
        />
        <TextField
          label={i18n.t('configCenter.messages.fields.responsePrefix')}
          value={String(g(['responsePrefix']) ?? '')}
          onChange={(v) => s(['responsePrefix'], v)}
          placeholder={i18n.t('configCenter.messages.placeholders.assistantPrefix')}
          mono={false}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.messages.title.ackReaction')} icon={ThumbsUp} iconColor="text-amber-500">
        <TextField
          label={i18n.t('configCenter.messages.fields.ackEmoji')}
          value={String(g(['ackReaction']) ?? '')}
          onChange={(v) => s(['ackReaction'], v)}
          placeholder="👍"
          mono={false}
        />
        <SelectField
          label={i18n.t('configCenter.messages.fields.ackScope')}
          value={String(g(['ackReactionScope']) ?? 'group-mentions')}
          onChange={(v) => s(['ackReactionScope'], v)}
          options={ACK_SCOPE_OPTIONS}
        />
        <SwitchField
          label={i18n.t('configCenter.messages.fields.removeAckAfterReply')}
          value={g(['removeAckAfterReply']) === true}
          onChange={(v) => s(['removeAckAfterReply'], v)}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.messages.title.groupChat')} icon={Users} iconColor="text-green-500" defaultOpen={false}>
        <ArrayField
          label={i18n.t('configCenter.messages.fields.mentionPatterns')}
          value={(g(['groupChat', 'mentionPatterns']) as string[]) ?? []}
          onChange={(v) => s(['groupChat', 'mentionPatterns'], v)}
          placeholder="@username"
        />
        <NumberField
          label={i18n.t('configCenter.messages.fields.historyLimit')}
          value={g(['groupChat', 'historyLimit']) as number | undefined}
          onChange={(v) => s(['groupChat', 'historyLimit'], v)}
          min={0}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.messages.title.queue')} icon={Inbox} iconColor="text-indigo-500" defaultOpen={false}>
        <SelectField
          label={i18n.t('configCenter.messages.fields.mode')}
          value={String(g(['queue', 'mode']) ?? 'debounce')}
          onChange={(v) => s(['queue', 'mode'], v)}
          options={QUEUE_OPTIONS}
        />
        <NumberField
          label={i18n.t('configCenter.messages.fields.debounceMs')}
          value={g(['queue', 'debounceMs']) as number | undefined}
          onChange={(v) => s(['queue', 'debounceMs'], v)}
          min={0}
          step={100}
        />
        <NumberField
          label={i18n.t('configCenter.messages.fields.queueCap')}
          value={g(['queue', 'cap']) as number | undefined}
          onChange={(v) => s(['queue', 'cap'], v)}
          min={1}
        />
        <SwitchField
          label={i18n.t('configCenter.messages.fields.dropWhenFull')}
          value={g(['queue', 'drop']) === true}
          onChange={(v) => s(['queue', 'drop'], v)}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.messages.title.typing')} icon={Edit3} iconColor="text-purple-500" defaultOpen={false}>
        <SelectField
          label={i18n.t('configCenter.messages.fields.mode')}
          value={String(sg(['typingMode']) ?? 'never')}
          onChange={(v) => ss(['typingMode'], v)}
          options={TYPING_OPTIONS}
        />
        <NumberField
          label={i18n.t('configCenter.messages.fields.typingIntervalSeconds')}
          value={sg(['typingIntervalSeconds']) as number | undefined}
          onChange={(v) => ss(['typingIntervalSeconds'], v)}
          min={1}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.messages.title.tts')} icon={Mic} iconColor="text-fuchsia-500" defaultOpen={false}>
        <SelectField
          label="TTS Provider"
          value={String(g(['tts', 'provider']) ?? '')}
          onChange={(v) => s(['tts', 'provider'], v)}
          options={[
            { value: '', label: '—' },
            { value: 'elevenlabs', label: 'ElevenLabs' },
            { value: 'openai', label: 'OpenAI' },
            { value: 'edge', label: 'Edge' },
          ]}
        />
        <SwitchField
          label={i18n.t('configCenter.messages.fields.autoTts')}
          value={g(['tts', 'auto']) === true}
          onChange={(v) => s(['tts', 'auto'], v)}
        />
        <TextField
          label="Voice ID"
          value={String(g(['tts', 'voiceId']) ?? '')}
          onChange={(v) => s(['tts', 'voiceId'], v)}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.messages.title.messageTools')} icon={Inbox} iconColor="text-cyan-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.messages.fields.crossContextSend')}
          value={tg(['crossContext']) === true}
          onChange={(v) => ts(['crossContext'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.messages.fields.broadcast')}
          value={tg(['broadcast']) === true}
          onChange={(v) => ts(['broadcast'], v)}
        />
      </ConfigSection>
    </div>
  );
};
