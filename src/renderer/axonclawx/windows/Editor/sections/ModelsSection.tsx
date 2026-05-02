import React, { useMemo, useState } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection, SelectField, EmptyState } from '../fields';
import { getTranslation } from '../../../locales';
import i18n from '@/i18n';

type FlatModel = {
  path: string;
  providerId: string;
  modelId: string;
  displayName: string;
  configured: boolean;
};

function flattenModels(modelsNode: Record<string, unknown> | null | undefined): FlatModel[] {
  const providers = ((modelsNode?.providers as Record<string, unknown>) || {}) as Record<string, unknown>;
  const out: FlatModel[] = [];

  for (const [providerId, providerRaw] of Object.entries(providers)) {
    const providerObj = (providerRaw as Record<string, unknown>) || {};
    const authMode = String(providerObj.auth || '').trim().toLowerCase();
    const apiKey = String(providerObj.apiKey || '').trim();
    const configured = authMode === 'oauth' || apiKey.length > 0;
    const models = Array.isArray(providerObj.models) ? providerObj.models : [];
    for (const item of models) {
      if (typeof item === 'string') {
        const modelId = item.trim();
        if (!modelId) continue;
        out.push({
          path: `${providerId}/${modelId}`,
          providerId,
          modelId,
          displayName: modelId,
          configured,
        });
        continue;
      }
      const modelObj = (item as Record<string, unknown>) || {};
      const modelId = String(modelObj.id || '').trim();
      if (!modelId) continue;
      const displayName = String(modelObj.name || modelId).trim();
      out.push({
        path: `${providerId}/${modelId}`,
        providerId,
        modelId,
        displayName,
        configured,
      });
    }
  }

  return out;
}

export const ModelsSection: React.FC<SectionProps> = ({ setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProviderId, setNewProviderId] = useState('openai');
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');

  const modelsNode = ((getField(['models']) as Record<string, unknown>) || {}) as Record<string, unknown>;
  const flatModels = useMemo(() => flattenModels(modelsNode), [modelsNode]);
  const configuredCount = useMemo(() => new Set(flatModels.filter((m) => m.configured).map((m) => m.providerId)).size, [flatModels]);
  const primaryFromAgents = String(getField(['agents', 'defaults', 'model', 'primary']) ?? '').trim();
  const primaryModel = primaryFromAgents;
  const rawFallbacks = getField(['agents', 'defaults', 'model', 'fallbacks']);
  const fallbacks: string[] = Array.isArray(rawFallbacks)
    ? rawFallbacks.map((item) => String(item || '').trim()).filter(Boolean)
    : [];

  const modelOptions = useMemo(() => {
    const options = flatModels.map((item) => ({
      value: item.path,
      label: `${item.displayName} (${item.providerId})`,
    }));
    if (primaryModel && !options.some((item) => item.value === primaryModel)) {
      options.unshift({ value: primaryModel, label: primaryModel });
    }
    return options;
  }, [flatModels, primaryModel]);

  const setPrimary = (path: string) => {
    setField(['agents', 'defaults', 'model', 'primary'], path);
  };

  const addModel = () => {
    const providerId = newProviderId.trim();
    const modelId = newModelId.trim();
    const modelName = newModelName.trim();
    if (!providerId || !modelId) return;

    const models = ((getField(['models']) as Record<string, unknown>) || {}) as Record<string, unknown>;
    const providers = ((models.providers as Record<string, unknown>) || {}) as Record<string, unknown>;
    const providerNode = (((providers[providerId] as Record<string, unknown>) || {}) as Record<string, unknown>);
    const nextModels = Array.isArray(providerNode.models) ? [...providerNode.models] : [];

    const exists = nextModels.some((item) => {
      if (typeof item === 'string') return item.trim() === modelId;
      return String((item as Record<string, unknown>)?.id || '').trim() === modelId;
    });
    if (exists) return;

    nextModels.push(modelName ? { id: modelId, name: modelName } : modelId);
    const nextProviderNode: Record<string, unknown> = { ...providerNode, models: nextModels };
    const nextProviders: Record<string, unknown> = { ...providers, [providerId]: nextProviderNode };
    setField(['models'], { ...models, providers: nextProviders });

    setNewModelId('');
    setNewModelName('');
    setShowAddForm(false);
  };

  const removeModel = (targetProviderId: string, targetModelId: string) => {
    const models = ((getField(['models']) as Record<string, unknown>) || {}) as Record<string, unknown>;
    const providers = ((models.providers as Record<string, unknown>) || {}) as Record<string, unknown>;
    const providerNode = (((providers[targetProviderId] as Record<string, unknown>) || {}) as Record<string, unknown>);
    const currentModels = Array.isArray(providerNode.models) ? providerNode.models : [];
    const nextModels = currentModels.filter((item) => {
      if (typeof item === 'string') return item.trim() !== targetModelId;
      return String((item as Record<string, unknown>)?.id || '').trim() !== targetModelId;
    });
    const nextProviderNode: Record<string, unknown> = { ...providerNode, models: nextModels };
    const nextProviders: Record<string, unknown> = { ...providers, [targetProviderId]: nextProviderNode };
    setField(['models'], { ...models, providers: nextProviders });
  };

  const toggleFallback = (path: string) => {
    const next = [...fallbacks];
    const index = next.indexOf(path);
    if (index >= 0) next.splice(index, 1);
    else next.push(path);
    setField(['agents', 'defaults', 'model', 'fallbacks'], next);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setShowAddForm((v) => !v)}
          className="h-8 px-3 rounded-md text-[12px] border border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5"
        >
          {showAddForm
            ? i18n.t('models.btnCancelAdd', { defaultValue: '取消添加' })
            : i18n.t('models.btnAddModel', { defaultValue: '添加模型' })}
        </button>
      </div>

      {showAddForm && (
        <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 p-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={newProviderId}
              onChange={(e) => setNewProviderId(e.target.value)}
              placeholder={i18n.t('models.fieldProvider', { defaultValue: '供应商 ID（如 openai）' })}
              className="h-9 px-3 rounded-md border border-slate-200 dark:border-white/15 bg-transparent text-sm"
            />
            <input
              value={newModelId}
              onChange={(e) => setNewModelId(e.target.value)}
              placeholder={i18n.t('models.fieldModelId', { defaultValue: '模型 ID（如 gpt-5.3-codex）' })}
              className="h-9 px-3 rounded-md border border-slate-200 dark:border-white/15 bg-transparent text-sm"
            />
            <input
              value={newModelName}
              onChange={(e) => setNewModelName(e.target.value)}
              placeholder={i18n.t('models.fieldModelName', { defaultValue: '模型名称（可选）' })}
              className="h-9 px-3 rounded-md border border-slate-200 dark:border-white/15 bg-transparent text-sm"
            />
            <button
              type="button"
              onClick={addModel}
              disabled={!newProviderId.trim() || !newModelId.trim()}
              className="h-9 px-3 rounded-md text-[12px] border border-primary/40 bg-primary/10 text-primary disabled:opacity-50"
            >
              {i18n.t('models.btnConfirmAdd', { defaultValue: '确认添加' })}
            </button>
          </div>
        </div>
      )}

      <ConfigSection
        title={String(es.secModels || i18n.t('configCenter.models.title', { defaultValue: '模型配置' }))}
        icon="psychology"
        iconColor="text-blue-500"
        desc={i18n.t('configCenter.models.subtitle', { defaultValue: '简单配置默认模型与备用模型，认证请到「模型认证」页面。' })}
      >
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2">
            <div className="text-[11px] text-slate-400">{i18n.t('models.totalModels', { defaultValue: '总模型' })}</div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">{flatModels.length}</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2">
            <div className="text-[11px] text-slate-400">{i18n.t('models.providerCount', { defaultValue: '服务商数' })}</div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">{configuredCount}</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2">
            <div className="text-[11px] text-slate-400">{i18n.t('models.badgeDefault', { defaultValue: '默认模型' })}</div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-100 truncate">{primaryModel || '—'}</div>
          </div>
          <div className="rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-black/20 px-3 py-2">
            <div className="text-[11px] text-slate-400">{String(es.fallback || i18n.t('models.fallback', { defaultValue: '备用模型' }))}</div>
            <div className="text-sm font-semibold text-slate-700 dark:text-slate-100">{fallbacks.length}</div>
          </div>
        </div>

        <SelectField
          label={String(es.primaryModel || i18n.t('configCenter.models.globalDefault', { defaultValue: '全局默认模型' }))}
          value={primaryModel}
          onChange={setPrimary}
          options={modelOptions}
          allowEmpty
        />

        <div className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
          {i18n.t('configCenter.auth.gotoHint', { defaultValue: '如需新增供应商或登录授权，请前往左侧「模型认证」。' })}
        </div>
      </ConfigSection>

      <ConfigSection
        title={String(es.models || i18n.t('models.title', { defaultValue: '模型列表' }))}
        icon="list_alt"
        iconColor="text-indigo-500"
        desc={i18n.t('models.subtitleAvailable', { count: flatModels.length, defaultValue: `当前可用 ${flatModels.length} 个模型` })}
      >
        {flatModels.length === 0 ? (
          <EmptyState
            message={String(es.noModelsAdded || i18n.t('models.pendingConfig', { defaultValue: '暂无模型，请先在模型认证页完成配置' }))}
            icon="psychology_alt"
          />
        ) : (
          <div className="space-y-2">
            {flatModels.map((item) => {
              const isPrimary = primaryModel === item.path;
              const isFallback = fallbacks.includes(item.path);
              return (
                <div
                  key={item.path}
                  className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-3 ${
                    isPrimary
                      ? 'border-primary/40 bg-primary/5'
                      : 'border-slate-200 dark:border-white/10 bg-white dark:bg-black/20'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-100">{item.displayName}</span>
                      {isPrimary && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                          {i18n.t('models.badgeDefault', { defaultValue: '默认' })}
                        </span>
                      )}
                      {!item.configured && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-500 font-semibold">
                          {i18n.t('models.badgeNoKey', { defaultValue: '未认证' })}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">{item.path}</div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleFallback(item.path)}
                      className={`h-7 px-2.5 rounded-md text-[11px] border ${
                        isFallback
                          ? 'border-amber-500/40 bg-amber-500/10 text-amber-500'
                          : 'border-slate-200 dark:border-white/15 text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {String(es.fallback || i18n.t('models.fallback', { defaultValue: '备用' }))}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrimary(item.path)}
                      disabled={isPrimary}
                      className={`h-7 px-2.5 rounded-md text-[11px] border ${
                        isPrimary
                          ? 'border-primary/30 bg-primary/10 text-primary cursor-default'
                          : 'border-slate-200 dark:border-white/15 text-slate-600 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                      {isPrimary
                        ? i18n.t('models.btnCurrentDefault', { defaultValue: '当前默认' })
                        : String(es.setPrimary || i18n.t('models.btnSetDefault', { defaultValue: '设为默认' }))}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeModel(item.providerId, item.modelId)}
                      className="h-7 px-2.5 rounded-md text-[11px] border border-rose-500/30 text-rose-500 hover:bg-rose-500/10"
                    >
                      {i18n.t('models.btnDelete', { defaultValue: '删除' })}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ConfigSection>
    </div>
  );
};

export default ModelsSection;
