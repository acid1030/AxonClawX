/**
 * 日志配置 - 表单式 UI
 */
import React from 'react';
import { FileText, Bug, BarChart3, TrendingUp } from 'lucide-react';
import {
  ConfigSection,
  SelectField,
  TextField,
  NumberField,
  SwitchField,
  ArrayField,
} from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import i18n from '@/i18n';

const LOG_LEVEL_OPTIONS = [
  { value: 'silent', label: i18n.t('configCenter.logging.level.silent') },
  { value: 'fatal', label: i18n.t('configCenter.logging.level.fatal') },
  { value: 'error', label: i18n.t('configCenter.logging.level.error') },
  { value: 'warn', label: i18n.t('configCenter.logging.level.warn') },
  { value: 'info', label: i18n.t('configCenter.logging.level.info') },
  { value: 'debug', label: i18n.t('configCenter.logging.level.debug') },
  { value: 'trace', label: i18n.t('configCenter.logging.level.trace') },
];
const CONSOLE_STYLE_OPTIONS = [
  { value: 'pretty', label: i18n.t('configCenter.logging.consoleStyle.pretty') },
  { value: 'compact', label: i18n.t('configCenter.logging.consoleStyle.compact') },
  { value: 'json', label: 'JSON' },
];
const REDACT_OPTIONS = [
  { value: '', label: i18n.t('configCenter.logging.redact.off') },
  { value: 'off', label: i18n.t('configCenter.logging.redact.off') },
  { value: 'tools', label: i18n.t('configCenter.logging.redact.tools') },
];
const OTEL_PROTOCOL_OPTIONS = [
  { value: 'http/protobuf', label: 'HTTP/Protobuf' },
  { value: 'grpc', label: 'gRPC' },
];

export const LoggingSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (path: string[]) => getField(path);

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.logging.title')} icon={FileText} iconColor="text-yellow-500">
        <SelectField
          label={i18n.t('configCenter.logging.fields.logLevel')}
          value={String(g(['logging', 'level']) ?? 'info')}
          onChange={(v) => setField(['logging', 'level'], v)}
          options={LOG_LEVEL_OPTIONS}
        />
        <TextField
          label={i18n.t('configCenter.logging.fields.logFile')}
          value={String(g(['logging', 'file']) ?? '')}
          onChange={(v) => setField(['logging', 'file'], v)}
          placeholder="gateway.log"
        />
        <NumberField
          label={i18n.t('configCenter.logging.fields.maxFileBytes')}
          value={g(['logging', 'maxFileBytes']) as number | undefined}
          onChange={(v) => setField(['logging', 'maxFileBytes'], v)}
          min={0}
        />
        <SelectField
          label={i18n.t('configCenter.logging.fields.consoleLevel')}
          value={String(g(['logging', 'consoleLevel']) ?? 'info')}
          onChange={(v) => setField(['logging', 'consoleLevel'], v)}
          options={LOG_LEVEL_OPTIONS}
        />
        <SelectField
          label={i18n.t('configCenter.logging.fields.consoleStyle')}
          value={String(g(['logging', 'consoleStyle']) ?? 'pretty')}
          onChange={(v) => setField(['logging', 'consoleStyle'], v)}
          options={CONSOLE_STYLE_OPTIONS}
        />
        <SelectField
          label={i18n.t('configCenter.logging.fields.redactSensitive')}
          value={String(g(['logging', 'redactSensitive']) ?? '')}
          onChange={(v) => setField(['logging', 'redactSensitive'], v)}
          options={REDACT_OPTIONS}
        />
        <ArrayField
          label={i18n.t('configCenter.logging.fields.redactPatterns')}
          value={(g(['logging', 'redactPatterns']) as string[]) ?? []}
          onChange={(v) => setField(['logging', 'redactPatterns'], v)}
          placeholder="regex-pattern"
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.logging.diagnostics.title')} icon={Bug} iconColor="text-yellow-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.logging.diagnostics.enabled')}
          value={g(['diagnostics', 'enabled']) === true}
          onChange={(v) => setField(['diagnostics', 'enabled'], v)}
        />
        <ArrayField
          label={i18n.t('configCenter.logging.diagnostics.flags')}
          value={(g(['diagnostics', 'flags']) as string[]) ?? []}
          onChange={(v) => setField(['diagnostics', 'flags'], v)}
          placeholder="flag-name"
        />
        <NumberField
          label={i18n.t('configCenter.logging.diagnostics.stuckWarnMs')}
          value={g(['diagnostics', 'stuckSessionWarnMs']) as number | undefined}
          onChange={(v) => setField(['diagnostics', 'stuckSessionWarnMs'], v)}
          min={0}
          step={1000}
        />
      </ConfigSection>

      <ConfigSection title="OpenTelemetry" icon={BarChart3} iconColor="text-indigo-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.logging.fields.enabled')}
          value={g(['diagnostics', 'otel', 'enabled']) === true}
          onChange={(v) => setField(['diagnostics', 'otel', 'enabled'], v)}
        />
        <TextField
          label={i18n.t('configCenter.logging.fields.endpoint')}
          value={String(g(['diagnostics', 'otel', 'endpoint']) ?? '')}
          onChange={(v) => setField(['diagnostics', 'otel', 'endpoint'], v)}
          placeholder="http://localhost:4318"
        />
        <SelectField
          label={i18n.t('configCenter.logging.fields.protocol')}
          value={String(g(['diagnostics', 'otel', 'protocol']) ?? 'http/protobuf')}
          onChange={(v) => setField(['diagnostics', 'otel', 'protocol'], v)}
          options={OTEL_PROTOCOL_OPTIONS}
        />
        <TextField
          label={i18n.t('configCenter.logging.fields.serviceName')}
          value={String(g(['diagnostics', 'otel', 'serviceName']) ?? '')}
          onChange={(v) => setField(['diagnostics', 'otel', 'serviceName'], v)}
          placeholder="openclaw-gateway"
        />
        <SwitchField
          label={i18n.t('configCenter.logging.fields.traces')}
          value={g(['diagnostics', 'otel', 'traces']) !== false}
          onChange={(v) => setField(['diagnostics', 'otel', 'traces'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.logging.fields.metrics')}
          value={g(['diagnostics', 'otel', 'metrics']) !== false}
          onChange={(v) => setField(['diagnostics', 'otel', 'metrics'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.logging.fields.logs')}
          value={g(['diagnostics', 'otel', 'logs']) !== false}
          onChange={(v) => setField(['diagnostics', 'otel', 'logs'], v)}
        />
        <NumberField
          label={i18n.t('configCenter.logging.fields.sampleRate')}
          value={g(['diagnostics', 'otel', 'sampleRate']) as number | undefined}
          onChange={(v) => setField(['diagnostics', 'otel', 'sampleRate'], v)}
          min={0}
          max={1}
          step={0.1}
        />
        <NumberField
          label={i18n.t('configCenter.logging.fields.flushIntervalMs')}
          value={g(['diagnostics', 'otel', 'flushIntervalMs']) as number | undefined}
          onChange={(v) => setField(['diagnostics', 'otel', 'flushIntervalMs'], v)}
          min={0}
          step={1000}
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.logging.cacheTrace.title')} icon={TrendingUp} iconColor="text-amber-500" defaultOpen={false}>
        <SwitchField
          label={i18n.t('configCenter.logging.fields.enabled')}
          value={g(['diagnostics', 'cacheTrace', 'enabled']) === true}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'enabled'], v)}
        />
        <TextField
          label={i18n.t('configCenter.logging.cacheTrace.filePath')}
          value={String(g(['diagnostics', 'cacheTrace', 'filePath']) ?? '')}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'filePath'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.logging.cacheTrace.includeMessages')}
          value={g(['diagnostics', 'cacheTrace', 'includeMessages']) === true}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'includeMessages'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.logging.cacheTrace.includePrompt')}
          value={g(['diagnostics', 'cacheTrace', 'includePrompt']) === true}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'includePrompt'], v)}
        />
        <SwitchField
          label={i18n.t('configCenter.logging.cacheTrace.includeSystem')}
          value={g(['diagnostics', 'cacheTrace', 'includeSystem']) === true}
          onChange={(v) => setField(['diagnostics', 'cacheTrace', 'includeSystem'], v)}
        />
      </ConfigSection>
    </div>
  );
};
