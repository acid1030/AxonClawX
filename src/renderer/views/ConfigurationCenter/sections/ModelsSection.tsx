/**
 * 模型/API 密钥配置 - 提供商卡片式 UI
 * 参考 designUI/deckx/settings.html
 */
import React from 'react';
import { Target, Key } from 'lucide-react';
import { ConfigSection, TextField, SelectField } from '@/components/config-editor';
import type { SectionProps } from '../sectionTypes';
import { cn } from '@/lib/utils';
import i18n from '@/i18n';

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', icon: '🤖', placeholder: 'sk-ant-api03-…', baseUrl: 'https://api.anthropic.com' },
  { id: 'openai', name: 'OpenAI', icon: '🔗', placeholder: 'sk-…', baseUrl: 'https://api.openai.com' },
  { id: 'zai', name: 'Zhipu GLM', icon: '🇨🇳', placeholder: 'Zhipu API Key', baseUrl: 'https://open.bigmodel.cn/api' },
  { id: 'google', name: 'Google', icon: '🔷', placeholder: 'AIza…', baseUrl: 'https://generativelanguage.googleapis.com' },
  { id: 'ollama', name: 'Ollama', icon: '🦙', placeholder: 'ollama-local (no key required)', baseUrl: 'http://localhost:11434' },
];

const COMMON_MODELS = [
  { value: 'anthropic/claude-sonnet-4', label: 'Claude Sonnet 4' },
  { value: 'anthropic/claude-opus-4', label: 'Claude Opus 4' },
  { value: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5' },
  { value: 'openai/gpt-4o', label: 'GPT-4o' },
  { value: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'zai/glm-5', label: 'Zhipu GLM-5' },
  { value: 'ollama/llama3.2', label: 'Ollama Llama 3.2' },
];

function buildModelOptions(currentValue: string): { value: string; label: string }[] {
  if (!currentValue || COMMON_MODELS.some((m) => m.value === currentValue)) {
    return COMMON_MODELS;
  }
  const modelTail = currentValue.includes('/') ? currentValue.split('/').slice(1).join('/') : currentValue;
  return [{ value: currentValue, label: `${modelTail} (${i18n.t('configCenter.models.currentConfig')})` }, ...COMMON_MODELS];
}

function ProviderCard({
  provider,
  apiKey,
  baseUrl,
  defaultModel,
  hasKey,
  onApiKeyChange,
  onBaseUrlChange,
  onDefaultModelChange,
  isDefaultProvider,
}: {
  provider: (typeof PROVIDERS)[0];
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
  hasKey: boolean;
  onApiKeyChange: (v: string) => void;
  onBaseUrlChange: (v: string) => void;
  onDefaultModelChange: (v: string) => void;
  isDefaultProvider?: boolean;
}) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-slate-50/80 dark:bg-white/[0.02] overflow-hidden',
        'border-slate-200 dark:border-white/[0.06]'
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100 dark:border-white/[0.04]">
        <span className="text-base">{provider.icon}</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{provider.name}</span>
        {hasKey && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-500">{i18n.t('configCenter.models.configured')}</span>
        )}
        {!hasKey && provider.id !== 'ollama' && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500">{i18n.t('configCenter.models.notConfigured')}</span>
        )}
      </div>
      <div className="p-3 space-y-3">
        {provider.id !== 'ollama' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">API Key</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => onApiKeyChange(e.target.value)}
              placeholder={provider.placeholder}
              className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{i18n.t('configCenter.models.defaultModel')}</label>
          <select
            value={defaultModel}
            onChange={(e) => onDefaultModelChange(e.target.value)}
            className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-slate-900/80 text-xs text-foreground cursor-pointer"
          >
            <option value="">{i18n.t('configCenter.models.select')}</option>
            {COMMON_MODELS.filter((m) => m.value.startsWith(provider.id + '/')).map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        {provider.id !== 'ollama' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => onBaseUrlChange(e.target.value)}
              placeholder={provider.baseUrl}
              className="h-8 px-2.5 rounded-md border border-slate-200 dark:border-white/10 bg-transparent font-mono text-xs text-foreground placeholder:text-muted-foreground"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export const ModelsSection: React.FC<SectionProps> = ({ setField, getField }) => {
  const g = (p: string[]) => getField(['models', ...p]);
  const s = (p: string[], v: unknown) => setField(['models', ...p], v);
  const globalDefaultFromAgents = String(getField(['agents', 'defaults', 'model', 'primary']) ?? '');
  const globalDefaultFromModels = String(g(['default']) ?? '');
  const globalDefaultModel = globalDefaultFromAgents || globalDefaultFromModels;

  const providers = (g(['providers']) as Record<string, Record<string, unknown>>) ?? {};

  return (
    <div className="space-y-4">
      <ConfigSection title={i18n.t('configCenter.models.defaultSection')} icon={Target} iconColor="text-indigo-500">
        <SelectField
          label={i18n.t('configCenter.models.globalDefault')}
          value={globalDefaultModel}
          onChange={(v) => {
            setField(['agents', 'defaults', 'model', 'primary'], v);
            s(['default'], v);
          }}
          options={buildModelOptions(globalDefaultModel)}
          allowEmpty
        />
      </ConfigSection>

      <ConfigSection title={i18n.t('configCenter.models.providersSection')} icon={Key} iconColor="text-amber-500" desc={i18n.t('configCenter.models.providersDesc')}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {PROVIDERS.map((provider) => {
            const prov = (providers[provider.id] as Record<string, unknown>) ?? {};
            const apiKey = String(prov.apiKey ?? prov.key ?? '');
            const baseUrl = String(prov.baseUrl ?? prov.base_url ?? '');
            const defaultModel = String(prov.defaultModel ?? prov.default_model ?? '');

            return (
              <ProviderCard
                key={provider.id}
                provider={provider}
                apiKey={apiKey}
                baseUrl={baseUrl}
                defaultModel={defaultModel}
                hasKey={!!apiKey || provider.id === 'ollama'}
                onApiKeyChange={(v) =>
                  s(['providers', provider.id], {
                    ...prov,
                    apiKey: v,
                    key: v,
                  })
                }
                onBaseUrlChange={(v) =>
                  s(['providers', provider.id], {
                    ...prov,
                    baseUrl: v,
                    base_url: v,
                  })
                }
                onDefaultModelChange={(v) =>
                  s(['providers', provider.id], {
                    ...prov,
                    defaultModel: v,
                    default_model: v,
                  })
                }
              />
            );
          })}
        </div>
      </ConfigSection>
    </div>
  );
};
