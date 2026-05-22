import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SectionProps } from '../sectionTypes';
import { ConfigSection } from '../fields';
import { getTranslation } from '../../../locales';
import { useToast } from '../../../components/Toast';
import { ProviderContent } from '@/pages/Setup';
import { SETUP_PROVIDERS } from '@/lib/providers';
import { hostApiFetch } from '@/lib/host-api';
import i18n from '@/i18n';
import { subscribeHostEvent } from '@/lib/host-events';
import { buildProviderListItems, fetchProviderSnapshot, hasConfiguredCredentials, type ProviderListItem } from '@/lib/provider-accounts';
import { getProviderIconUrl, shouldInvertInDark } from '@/lib/providers';

type OpenAiSessionState = {
  success?: boolean;
  accessToken?: string;
  loginInfo?: {
    loggedIn?: boolean;
    email?: string;
    name?: string;
    userId?: string;
  };
  error?: string;
};

function isLoginAuthMode(mode: string | null | undefined): boolean {
  return mode === 'oauth_browser' || mode === 'oauth_device';
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function pickConfigPayload(
  raw: Record<string, unknown> | { config?: Record<string, unknown> } | null | undefined,
): Record<string, unknown> {
  if (!raw || typeof raw !== 'object') return {};
  const record = raw as Record<string, unknown>;
  const nested = record.config;
  if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
    return nested as Record<string, unknown>;
  }
  return record;
}

export const AuthSection: React.FC<SectionProps> = ({ setField, getField, language }) => {
  const es = useMemo(() => (getTranslation(language) as any).es || {}, [language]);
  const { toast } = useToast();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [configured, setConfigured] = useState(false);
  const [authItems, setAuthItems] = useState<ProviderListItem[]>([]);
  const [authLoading, setAuthLoading] = useState(false);
  const [authLoadError, setAuthLoadError] = useState<string | null>(null);
  const [authLoadWarning, setAuthLoadWarning] = useState<string | null>(null);
  const [authActionLoadingId, setAuthActionLoadingId] = useState<string | null>(null);
  const [openAiSession, setOpenAiSession] = useState<OpenAiSessionState | null>(null);
  const authActionRef = useRef<{ accountId: string; providerId: string } | null>(null);

  const primaryModel = String(getField(['agents', 'defaults', 'model', 'primary']) ?? '').trim();
  const setupProviderNameMap = useMemo(
    () => new Map(SETUP_PROVIDERS.map((provider) => [provider.id, provider.name])),
    [],
  );

  const syncFromBackend = useCallback(async () => {
    try {
      let rawConfig: Record<string, unknown> | { config?: Record<string, unknown> };
      try {
        rawConfig = await hostApiFetch<Record<string, unknown> | { config?: Record<string, unknown> }>('/api/v1/config');
      } catch {
        rawConfig = await hostApiFetch<Record<string, unknown> | { config?: Record<string, unknown> }>('/api/config');
      }
      const cfg = pickConfigPayload(rawConfig);
      const models = ((cfg.models as Record<string, unknown>) || {}) as Record<string, unknown>;
      const agents = ((cfg.agents as Record<string, unknown>) || {}) as Record<string, unknown>;
      const defaults = ((agents.defaults as Record<string, unknown>) || {}) as Record<string, unknown>;
      const modelDefaults = ((defaults.model as Record<string, unknown>) || {}) as Record<string, unknown>;
      const primary = String(modelDefaults.primary || '').trim();

      setField(['models'], models);
      if (primary) {
        setField(['agents', 'defaults', 'model', 'primary'], primary);
      }
    } catch (error) {
      console.error('[Editor.AuthSection] sync config failed:', error);
      toast('error', i18n.t('setup:provider.saveFailed', { defaultValue: '保存模型认证失败' }));
    }
  }, [setField, toast]);

  const maskToken = useCallback((token?: string): string | null => {
    const value = String(token || '').trim();
    if (!value) return null;
    if (value.length <= 12) return `${value.slice(0, 4)}***${value.slice(-2)}`;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  }, []);

  const refreshOpenAiSession = useCallback(async (targetItems: ProviderListItem[]) => {
    const hasOpenAi = targetItems.some((item) => item.account.vendorId === 'openai');
    if (!hasOpenAi) {
      setOpenAiSession(null);
      return null;
    }
    try {
      const sessionState = await withTimeout(
        hostApiFetch<OpenAiSessionState>('/api/app/codex/session-token'),
        6000,
        'session-token timeout',
      );
      setOpenAiSession(sessionState || null);
      return sessionState || null;
    } catch {
      setOpenAiSession(null);
      return null;
    }
  }, []);

  const loadAuthItems = useCallback(async () => {
    setAuthLoading(true);
    setAuthLoadError(null);
    setAuthLoadWarning(null);
    try {
      const snapshot = await withTimeout(
        fetchProviderSnapshot(),
        8000,
        'provider snapshot timeout',
      );
      const allItems = buildProviderListItems(
        snapshot.accounts,
        snapshot.statuses,
        snapshot.vendors,
        snapshot.defaultAccountId,
      );
      const sessionState = await withTimeout(
        refreshOpenAiSession(allItems),
        5000,
        'openai session refresh timeout',
      );
      const openAiSessionReady = Boolean(
        sessionState?.success
        && String(sessionState?.accessToken || '').trim(),
      );
      const readyItems = allItems.filter((item) => {
        if (hasConfiguredCredentials(item.account, item.status)) return true;
        if (item.account.vendorId === 'openai' && openAiSessionReady) return true;
        return false;
      });
      setAuthItems(readyItems);
    } catch (error) {
      console.error('[Editor.AuthSection] failed to load auth list:', error);
      try {
        const cfg = await withTimeout(
          hostApiFetch<Record<string, unknown>>('/api/config'),
          4000,
          'config fallback timeout',
        );
        const providersNode = ((((cfg.models as Record<string, unknown>) || {}).providers as Record<string, unknown>) || {}) as Record<string, unknown>;
        const now = new Date().toISOString();
        const fallbackItems: ProviderListItem[] = [];
        const seenSingleVendors = new Set<string>();

        for (const [providerId, providerRaw] of Object.entries(providersNode)) {
          const providerObj = (providerRaw as Record<string, unknown>) || {};
          const vendorId = providerId === 'openai-codex' ? 'openai' : providerId;
          const apiKey = String(providerObj.apiKey || '').trim();
          const authModeRaw = String(providerObj.authMode || '').trim();
          const models = Array.isArray(providerObj.models) ? providerObj.models : [];
          const firstModelId = (() => {
            const first = models[0];
            if (typeof first === 'string') return first.trim();
            if (first && typeof first === 'object') return String((first as Record<string, unknown>).id || '').trim();
            return '';
          })();
          const guessedAuthMode = (authModeRaw === 'api_key' || authModeRaw === 'oauth_browser' || authModeRaw === 'oauth_device' || authModeRaw === 'local')
            ? authModeRaw
            : (vendorId === 'ollama' || vendorId === 'claude-code'
            ? 'local'
            : (vendorId === 'openai' && !apiKey ? 'oauth_browser' : 'api_key'));
          if (!apiKey && guessedAuthMode === 'api_key') continue;
          if (vendorId !== 'custom') {
            if (seenSingleVendors.has(vendorId)) continue;
            seenSingleVendors.add(vendorId);
          }

          fallbackItems.push({
            account: {
              id: String(providerObj.accountId || providerId).trim() || providerId,
              vendorId: vendorId as ProviderListItem['account']['vendorId'],
              label: setupProviderNameMap.get(vendorId) || vendorId,
              authMode: guessedAuthMode,
              model: firstModelId || undefined,
              enabled: true,
              isDefault: false,
              createdAt: now,
              updatedAt: now,
            },
          });
        }

        if (fallbackItems.length > 0) {
          setAuthItems(fallbackItems);
          await withTimeout(
            refreshOpenAiSession(fallbackItems),
            5000,
            'openai session refresh timeout',
          );
          setAuthLoadWarning(
            i18n.t('setup:provider.authListFallbackMode', {
              defaultValue: '认证列表已切换为离线回退模式（网关暂不可用）',
            }),
          );
        } else {
          setAuthItems([]);
          setOpenAiSession(null);
          setAuthLoadError(
            i18n.t('setup:provider.authListLoadFailed', {
              defaultValue: '认证列表加载失败（网关响应超时或不可用）',
            }),
          );
        }
      } catch {
        setAuthItems([]);
        setOpenAiSession(null);
        setAuthLoadError(
          i18n.t('setup:provider.authListLoadFailed', {
            defaultValue: '认证列表加载失败（网关响应超时或不可用）',
          }),
        );
      }
    } finally {
      setAuthLoading(false);
    }
  }, [refreshOpenAiSession, setupProviderNameMap]);

  const handleReauthenticate = useCallback(async (item: ProviderListItem) => {
    const accountId = item.account.id;
    const providerId = item.account.vendorId;
    const isOAuthMode = item.account.authMode === 'oauth_browser' || item.account.authMode === 'oauth_device';

    if (!isOAuthMode && providerId !== 'openai') {
      setSelectedProvider(providerId);
      setConfigured(false);
      toast('success', i18n.t('setup:provider.reconfigureHint', {
        defaultValue: '该供应商为 API Key 模式，请在下方修改并保存认证信息',
      }));
      return;
    }

    setAuthActionLoadingId(accountId);
    authActionRef.current = { accountId, providerId };
    try {
      await hostApiFetch('/api/providers/oauth/start', {
        method: 'POST',
        body: JSON.stringify({
          provider: providerId,
          accountId,
          label: item.account.label || providerId,
          forceReauth: true,
        }),
      });
      toast('success', i18n.t('provider.oauth.reauthStarted', {
        defaultValue: '已发起重新认证，请在弹出窗口完成登录',
      }));
    } catch (error) {
      authActionRef.current = null;
      setAuthActionLoadingId(null);
      toast('error', `${i18n.t('provider.oauth.reauthFailed', { defaultValue: '重新认证失败' })}: ${String(error)}`);
    }
  }, [toast]);

  const handleLogout = useCallback(async (item: ProviderListItem) => {
    if (item.account.vendorId !== 'openai') return;
    const accountId = item.account.id;
    setAuthActionLoadingId(accountId);
    authActionRef.current = { accountId, providerId: item.account.vendorId };
    try {
      await hostApiFetch('/api/app/codex/logout', {
        method: 'POST',
        body: JSON.stringify({ clearProviderAuth: true }),
      });
      await loadAuthItems();
      toast('success', i18n.t('provider.oauth.loggedOut', { defaultValue: '已退出登录' }));
    } catch (error) {
      toast('error', `${i18n.t('provider.oauth.logoutFailed', { defaultValue: '退出登录失败' })}: ${String(error)}`);
    } finally {
      authActionRef.current = null;
      setAuthActionLoadingId(null);
    }
  }, [loadAuthItems, toast]);

  const handleSelectProvider = useCallback((id: string | null) => {
    setSelectedProvider(id);
    setConfigured(false);
  }, []);

  useEffect(() => {
    void loadAuthItems();
  }, [loadAuthItems]);

  useEffect(() => {
    const offSuccess = subscribeHostEvent('oauth:success', async (raw) => {
      const action = authActionRef.current;
      if (!action) return;
      const payload = (raw as { accountId?: string; provider?: string } | undefined) || undefined;
      if (payload?.accountId && payload.accountId !== action.accountId) return;
      if (payload?.provider && payload.provider !== action.providerId) return;
      authActionRef.current = null;
      setAuthActionLoadingId(null);
      await loadAuthItems();
      setConfigured(true);
      toast('success', i18n.t('provider.oauth.success', { defaultValue: '认证成功' }));
    });
    const offError = subscribeHostEvent('oauth:error', (raw) => {
      const action = authActionRef.current;
      if (!action) return;
      const payload = (raw as { message?: string } | undefined) || undefined;
      authActionRef.current = null;
      setAuthActionLoadingId(null);
      toast('error', payload?.message || i18n.t('provider.oauth.failed', { defaultValue: '认证失败' }));
    });
    return () => {
      offSuccess();
      offError();
    };
  }, [loadAuthItems, toast]);

  useEffect(() => {
    if (!selectedProvider && primaryModel.includes('/')) {
      setSelectedProvider(primaryModel.split('/')[0] || null);
    }
  }, [primaryModel, selectedProvider]);

  useEffect(() => {
    if (!configured) return;
    void syncFromBackend();
    void loadAuthItems();
  }, [configured, loadAuthItems, syncFromBackend]);

  return (
    <div className="space-y-4">
      <ConfigSection
        title={i18n.t('setup:provider.authListTitle', { defaultValue: '已认证列表' })}
        icon="fact_check"
        iconColor="text-emerald-500"
        desc={i18n.t('setup:provider.authListDesc', { defaultValue: '显示已完成认证的供应商，可重新认证或退出认证。' })}
      >
        {authLoadWarning && (
          <div className="mb-2 rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            {authLoadWarning}
          </div>
        )}
        {authLoading ? (
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-300">
            <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
            <span>{i18n.t('setup:provider.authListLoading', { defaultValue: '正在加载认证列表...' })}</span>
          </div>
        ) : authLoadError ? (
          <div className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-3">
            <div className="text-xs text-amber-200">{authLoadError}</div>
            <div className="mt-2">
              <button
                type="button"
                onClick={() => void loadAuthItems()}
                className="rounded-md border border-amber-300/30 bg-amber-400/15 px-2.5 py-1.5 text-[11px] text-amber-100 hover:bg-amber-400/25"
              >
                {i18n.t('setup:provider.authListRetry', { defaultValue: '重试加载' })}
              </button>
            </div>
          </div>
        ) : authItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-3 text-xs text-slate-400">
            {i18n.t('setup:provider.authListEmpty', { defaultValue: '暂无已认证账号，请先完成下方认证。' })}
          </div>
        ) : (
          <div className="space-y-2">
            {authItems.map((item) => {
              const isBusy = authActionLoadingId === item.account.id;
              const iconUrl = getProviderIconUrl(item.account.vendorId);
              const providerName = item.vendor?.name || item.account.vendorId;
              const isOpenAi = item.account.vendorId === 'openai';
              const identity = openAiSession?.loginInfo?.email
                || openAiSession?.loginInfo?.name
                || openAiSession?.loginInfo?.userId
                || item.account.metadata?.email
                || item.account.label
                || providerName;
              const tokenPreview = isOpenAi ? maskToken(openAiSession?.accessToken) : null;
              const canLogout = isOpenAi;
              const actionLabel = item.account.authMode === 'api_key'
                ? i18n.t('setup:provider.reconfigure', { defaultValue: '重新配置' })
                : i18n.t('provider.oauth.reloginButton', { defaultValue: '重新登录' });

              return (
                <div
                  key={item.account.id}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex items-start gap-2.5">
                      <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-cyan-500/20 flex items-center justify-center text-sm">
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt={providerName}
                            className={`h-4 w-4 ${shouldInvertInDark(item.account.vendorId) ? 'dark:invert' : ''}`}
                          />
                        ) : (
                          <span>{item.vendor?.icon || '🤖'}</span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-100">{item.account.label || providerName}</span>
                          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">
                            {i18n.t('setup:provider.authReady', { defaultValue: '已认证' })}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-slate-400">
                          {i18n.t('setup:provider.authProviderLine', {
                            defaultValue: '供应商：{{provider}} · 方式：{{mode}}',
                            provider: providerName,
                            mode: item.account.authMode,
                          })}
                        </div>
                        {isOpenAi && (
                          <div className="mt-1 text-[11px] text-slate-300">
                            {i18n.t('provider.oauth.loggedInAs', {
                              defaultValue: '当前登录：{{identity}}',
                              identity,
                            })}
                          </div>
                        )}
                        {isOpenAi && (
                          <div className="mt-1 text-[11px] text-slate-400">
                            {tokenPreview
                              ? i18n.t('provider.oauth.tokenReady', { defaultValue: '令牌状态：已获取 {{token}}', token: tokenPreview })
                              : i18n.t('provider.oauth.tokenMissing', { defaultValue: '令牌状态：未获取' })}
                          </div>
                        )}
                        {isOpenAi && openAiSession?.error && (
                          <div className="mt-1 text-[11px] text-amber-300">{openAiSession.error}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReauthenticate(item)}
                        disabled={isBusy}
                        className="rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-[11px] text-slate-200 hover:bg-white/10 disabled:opacity-50"
                      >
                        {isBusy
                          ? i18n.t('provider.oauth.waiting', { defaultValue: '处理中...' })
                          : actionLabel}
                      </button>
                      {canLogout && (
                        <button
                          type="button"
                          onClick={() => handleLogout(item)}
                          disabled={isBusy}
                          className="rounded-md border border-red-400/30 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200 hover:bg-red-500/20 disabled:opacity-50"
                        >
                          {i18n.t('provider.oauth.logoutButton', { defaultValue: '退出登录' })}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ConfigSection>

      <ConfigSection
        title={i18n.t('setup:steps.provider.title', { defaultValue: '模型认证' })}
        icon="verified_user"
        iconColor="text-red-500"
        desc={i18n.t('setup:steps.provider.description', { defaultValue: '选择供应商、认证方式并完成登录授权' })}
      >
        <ProviderContent
          providers={SETUP_PROVIDERS}
          selectedProvider={selectedProvider}
          onSelectProvider={handleSelectProvider}
          apiKey={apiKey}
          onApiKeyChange={setApiKey}
          onConfiguredChange={setConfigured}
        />
      </ConfigSection>

      {configured && (
        <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
          {es.connected || i18n.t('setup:provider.valid', { defaultValue: '认证成功' })}
        </div>
      )}
    </div>
  );
};

export default AuthSection;
