/**
 * Chat Input Component
 * Textarea with send button and universal file upload support.
 * Enter to send, Shift+Enter for new line.
 * Supports: native file picker, clipboard paste, drag & drop.
 * Files are staged to disk via IPC — only lightweight path references
 * are sent with the message (no base64 over WebSocket).
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import { SendHorizontal, Square, X, Paperclip, FileText, Film, Music, FileArchive, File, Loader2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useGatewayStore } from '@/stores/gateway';
import { useChatStore } from '@/stores/chat';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────────

const OPENAI_CODEX_CHAT_MODELS = [
  { id: 'gpt-5.5', name: 'GPT-5.5' },
  { id: 'gpt-5.4-mini', name: 'GPT-5.4-Mini' },
  { id: 'gpt-5.3-codex', name: 'GPT-5.3-Codex' },
];

export interface FileAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  stagedPath: string;        // disk path for gateway
  preview: string | null;    // data URL for images, null for others
  status: 'staging' | 'ready' | 'error';
  error?: string;
}

interface ChatInputProps {
  onSend: (text: string, attachments?: FileAttachment[]) => void;
  onStop?: () => void;
  disabled?: boolean;
  sending?: boolean;
  isEmpty?: boolean;
  /** chat-page: 深色主题、更宽、Attachment在输入框左上角、单行起自动增高 */
  variant?: 'default' | 'chat-page';
  /** Attachment变化回调，用于在外部（如 ChatView）渲染Attachment预览 */
  onAttachmentsChange?: (attachments: FileAttachment[], removeAttachment: (id: string) => void) => void;
}

// ── Helpers ──────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function FileIcon({ mimeType, className }: { mimeType: string; className?: string }) {
  if (mimeType.startsWith('video/')) return <Film className={className} />;
  if (mimeType.startsWith('audio/')) return <Music className={className} />;
  if (mimeType.startsWith('text/') || mimeType === 'application/json' || mimeType === 'application/xml') return <FileText className={className} />;
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z')) return <FileArchive className={className} />;
  if (mimeType === 'application/pdf') return <FileText className={className} />;
  return <File className={className} />;
}

/**
 * Read a browser File object as base64 string (without the data URL prefix).
 */
function readFileAsBase64(file: globalThis.File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (!dataUrl || !dataUrl.includes(',')) {
        reject(new Error(`Invalid data URL from FileReader for ${file.name}`));
        return;
      }
      const base64 = dataUrl.split(',')[1];
      if (!base64) {
        reject(new Error(`Empty base64 data for ${file.name}`));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

// ── Component ────────────────────────────────────────────────────

export function ChatInput({
  onSend,
  onStop,
  disabled = false,
  sending = false,
  isEmpty = false,
  variant = 'default',
  onAttachmentsChange,
}: ChatInputProps) {
  const { t } = useTranslation('chat');
  const SESSION_MODEL_PREFS_KEY = 'axon.chat.sessionModelPrefs.v1';
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [modelOptions, setModelOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [sessionModelPrefs, setSessionModelPrefs] = useState<Record<string, { model: string; provider: string }>>({});
  const [prefsHydrated, setPrefsHydrated] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelApplying, setModelApplying] = useState(false);
  const [modelTesting, setModelTesting] = useState(false);
  const [pendingModelSwitch, setPendingModelSwitch] = useState<{
    from: string;
    fromProvider: string;
    to: string;
    toProvider: string;
  } | null>(null);
  const [queueExpanded, setQueueExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);
  const gatewayStatus = useGatewayStore((s) => s.status);
  const currentSessionKey = useChatStore((s) => s.currentSessionKey);
  const sessions = useChatStore((s) => s.sessions);
  const messageQueue = useChatStore((s) => s.messageQueue);
  const queuedCount = messageQueue.length;
  const activityLabel = useChatStore((s) => s.activityLabel);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const isChatPage = variant === 'chat-page';
  const activeSessionModel = sessions.find((s) => s.key === currentSessionKey)?.model || '';

  const normalizeProviderAlias = useCallback((providerValue: string): string => {
    const raw = String(providerValue || '').trim();
    if (!raw) return '';
    return raw;
  }, []);

  const normalizeModelAlias = useCallback((modelValue: string): string => {
    const raw = String(modelValue || '').trim();
    if (!raw) return '';

    const normalizeLeaf = (leaf: string): string => {
      let next = String(leaf || '').trim().replace(/cdoex/gi, 'codex');
      if (/^\d+(?:\.\d+)?-codex$/i.test(next)) {
        next = `gpt-${next}`;
      }
      if (/^gpt-5\.4$/i.test(next)) {
        next = 'gpt-5.4-mini';
      }
      return next;
    };

    if (raw.includes('/')) {
      const [provider, ...rest] = raw.split('/');
      if (!provider || rest.length === 0) return normalizeLeaf(raw);
      const leaf = normalizeLeaf(rest.join('/'));
      const normalizedProvider = normalizeProviderAlias(provider);
      const providerForModel = normalizedProvider.toLowerCase() === 'openai' && /^gpt-5\.(?:3-codex|4-mini|5)$/i.test(leaf)
        ? 'openai-codex'
        : normalizedProvider;
      return `${providerForModel}/${leaf}`;
    }
    return normalizeLeaf(raw);
  }, [normalizeProviderAlias]);

  const providerFromModel = useCallback((modelValue: string): string => {
    const value = normalizeModelAlias(String(modelValue || '').trim());
    if (!value) return '';
    return value.includes('/') ? String(value.split('/')[0] || '').trim() : '';
  }, [normalizeModelAlias]);

  const canonicalizeModel = useCallback((modelValue: string, providerHint?: string) => {
    const raw = normalizeModelAlias(String(modelValue || '').trim());
    if (!raw) return '';
    if (raw.includes('/')) return raw;
    const hint = String(providerHint || '').trim();
    if (hint) {
      const hinted = `${hint}/${raw}`;
      const exists = modelOptions.some((opt) => String(opt.value || '').trim() === hinted);
      if (exists) return hinted;
    }
    const matches = modelOptions
      .map((opt) => String(opt.value || '').trim())
      .filter((value) => value.endsWith(`/${raw}`));
    if (matches.length === 1) return matches[0];
    return hint ? `${hint}/${raw}` : raw;
  }, [modelOptions, normalizeModelAlias]);

  const persistSessionPref = useCallback((sessionKey: string, modelValue: string, providerValue?: string) => {
    if (!sessionKey) return;
    const model = canonicalizeModel(String(modelValue || '').trim(), String(providerValue || '').trim());
    const provider = String(providerValue || providerFromModel(model)).trim();
    setSessionModelPrefs((state) => ({
      ...state,
      [sessionKey]: { model, provider },
    }));
  }, [canonicalizeModel, providerFromModel]);

  const normalizeModelId = useCallback((providerId: string, modelIdRaw: unknown): string => {
    const modelId = normalizeModelAlias(String(modelIdRaw || '').trim());
    if (!modelId) return '';
    if (modelId.includes('/')) return modelId;
    const normalizedProvider = normalizeProviderAlias(providerId);
    const provider = normalizedProvider.toLowerCase() === 'openai' && /^gpt-5\.(?:3-codex|4-mini|5)$/i.test(modelId)
      ? 'openai-codex'
      : normalizedProvider;
    return provider ? `${provider}/${modelId}` : modelId;
  }, [normalizeModelAlias, normalizeProviderAlias]);

  const buildOptionsFromConfig = useCallback((cfg: Record<string, unknown>) => {
    const models = ((cfg.models as Record<string, unknown>) || {}) as Record<string, unknown>;
    const providers = ((models.providers as Record<string, unknown>) || {}) as Record<string, unknown>;
    const collected: Array<{ value: string; label: string }> = [];
    for (const [providerId, providerRaw] of Object.entries(providers)) {
      const provider = (providerRaw as Record<string, unknown>) || {};
      const modelList = Array.isArray(provider.models) ? provider.models : [];
      for (const item of modelList) {
        const rec = (typeof item === 'string' ? { id: item, name: item } : ((item as Record<string, unknown>) || {})) as Record<string, unknown>;
        const modelId = String(rec.id || '').trim();
        if (!modelId) continue;
        const fullId = normalizeModelId(providerId, modelId);
        if (!fullId) continue;
        const name = String(rec.name || modelId).trim();
        collected.push({ value: fullId, label: `${name} (${providerId})` });
      }
    }
    const modelsPrimary = String(models.primary || '').trim();
    if (modelsPrimary) {
      collected.push({ value: modelsPrimary, label: modelsPrimary });
    }
    const modelFallbacks = Array.isArray(models.fallbacks) ? models.fallbacks : [];
    for (const item of modelFallbacks) {
      const mid = String(item || '').trim();
      if (mid) collected.push({ value: mid, label: mid });
    }
    const agents = ((cfg.agents as Record<string, unknown>) || {}) as Record<string, unknown>;
    const defaults = ((agents.defaults as Record<string, unknown>) || {}) as Record<string, unknown>;
    const modelDefaults = ((defaults.model as Record<string, unknown>) || {}) as Record<string, unknown>;
    const primary = String(modelDefaults.primary || '').trim();
    if (primary) collected.push({ value: primary, label: primary });
    const fallbacks = Array.isArray(modelDefaults.fallbacks) ? modelDefaults.fallbacks : [];
    for (const item of fallbacks) {
      const mid = String(item || '').trim();
      if (mid) collected.push({ value: mid, label: mid });
    }
    return Array.from(new Map(collected.map((o) => [o.value, o])).values());
  }, [normalizeModelId]);

  const loadModelOptions = useCallback(async () => {
    if (gatewayStatus.state !== 'running') return;
    setModelLoading(true);
    try {
      // Fetch from both /api/v1/config (effective config) and /api/config (raw user config)
      // to ensure all configured models are visible in the dropdown
      const [cfgResult, rawCfgResult, statusResult, providersResult] = await Promise.allSettled([
        hostApiFetch<{ config?: Record<string, unknown> } | Record<string, unknown>>('/api/v1/config'),
        hostApiFetch<Record<string, unknown>>('/api/config'),
        hostApiFetch<{
          models?: Array<{ provider?: string; model?: string; role?: string }>;
          fallbacks?: Array<{ role?: string; chain?: Array<{ provider?: string; model?: string }> }>;
        }>('/api/v1/llm/models-status'),
        hostApiFetch<Array<{
          id?: string;
          type?: string;
          hasKey?: boolean;
          enabled?: boolean;
          authMode?: string;
          apiProtocol?: string;
        }>>('/api/providers'),
      ]);

      const opts: Array<{ value: string; label: string; source?: string }> = [];
      if (cfgResult.status === 'fulfilled') {
        const container = cfgResult.value as Record<string, unknown>;
        const cfg = ((container.config as Record<string, unknown>) || container || {}) as Record<string, unknown>;
        opts.push(...buildOptionsFromConfig(cfg));
      }

      // Also parse the raw user config (/api/config) which the setup wizard writes to
      if (rawCfgResult.status === 'fulfilled' && rawCfgResult.value) {
        const rawCfg = rawCfgResult.value as Record<string, unknown>;
        opts.push(...buildOptionsFromConfig(rawCfg));
      }

      // OpenAI Codex Auth uses a managed model catalog. Keep the current known
      // Codex routes visible even when the local OpenClaw config has not been
      // rewritten yet.
      for (const model of OPENAI_CODEX_CHAT_MODELS) {
        opts.push({
          value: `openai-codex/${model.id}`,
          label: `${model.name} (openai-codex)`,
          source: 'builtin-codex',
        });
      }

      if (statusResult.status === 'fulfilled') {
        const models = Array.isArray(statusResult.value?.models) ? statusResult.value.models : [];
        for (const rec of models) {
          const provider = String(rec?.provider || '').trim();
          const rawModel = String(rec?.model || '').trim();
          const fullId = normalizeModelId(provider, rawModel);
          if (!fullId) continue;
          opts.push({ value: fullId, label: provider ? `${rawModel} (${provider})` : rawModel });
        }
        const fallbacks = Array.isArray(statusResult.value?.fallbacks) ? statusResult.value.fallbacks : [];
        for (const fb of fallbacks) {
          const chain = Array.isArray(fb?.chain) ? fb.chain : [];
          for (const node of chain) {
            const provider = String(node?.provider || '').trim();
            const rawModel = String(node?.model || '').trim();
            const fullId = normalizeModelId(provider, rawModel);
            if (!fullId) continue;
            opts.push({ value: fullId, label: provider ? `${rawModel} (${provider})` : rawModel });
          }
        }
      }

      const usableProviders = new Set<string>();
      if (providersResult.status === 'fulfilled' && Array.isArray(providersResult.value)) {
        for (const item of providersResult.value) {
          const providerId = normalizeProviderAlias(String(item.id || item.type || '').trim());
          const providerKey = providerId.toLowerCase();
          const authMode = String(item.authMode || '').trim();
          const apiProtocol = String(item.apiProtocol || '').trim();
          const isOAuthProvider = authMode === 'oauth_browser'
            || authMode === 'oauth_device'
            || apiProtocol === 'openai-codex-responses'
            || providerKey === 'openai-codex';
          if (!providerId || item.enabled === false || (item.hasKey !== true && !isOAuthProvider)) continue;
          usableProviders.add(providerId);
        }
      }

      const deduped = Array.from(new Map(opts.map((o) => [o.value, o])).values())
        .filter((opt) => {
          if (usableProviders.size === 0) return true;
          const provider = normalizeProviderAlias(String(opt.value || '').split('/')[0] || '');
          return provider ? usableProviders.has(provider) : true;
        })
        .sort((a, b) => a.label.localeCompare(b.label));
      setModelOptions(deduped);
    } catch {
      setModelOptions([]);
    } finally {
      setModelLoading(false);
    }
  }, [buildOptionsFromConfig, gatewayStatus.state, normalizeModelId]);

  useEffect(() => {
    void loadModelOptions();
  }, [loadModelOptions, currentSessionKey]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_MODEL_PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { model?: string; provider?: string }>;
        if (parsed && typeof parsed === 'object') {
          const next: Record<string, { model: string; provider: string }> = {};
          for (const [sessionKey, pref] of Object.entries(parsed)) {
            if (!sessionKey) continue;
            const hintedProvider = String(pref?.provider || '').trim();
            const model = canonicalizeModel(String(pref?.model || '').trim(), hintedProvider);
            const provider = String(pref?.provider || providerFromModel(model)).trim();
            next[sessionKey] = { model, provider };
          }
          setSessionModelPrefs(next);
        }
      }
    } catch {
      // ignore parse errors
    } finally {
      setPrefsHydrated(true);
    }
  }, [SESSION_MODEL_PREFS_KEY, canonicalizeModel, providerFromModel]);

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        const raw = localStorage.getItem(SESSION_MODEL_PREFS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as Record<string, { model?: string; provider?: string }>;
        if (!parsed || typeof parsed !== 'object') return;
        setSessionModelPrefs((state) => {
          const next = { ...state };
          for (const [sessionKey, pref] of Object.entries(parsed)) {
            if (!sessionKey) continue;
            const hintedProvider = String(pref?.provider || '').trim();
            const model = canonicalizeModel(String(pref?.model || '').trim(), hintedProvider);
            const provider = String(pref?.provider || providerFromModel(model)).trim();
            next[sessionKey] = { model, provider };
          }
          return next;
        });
      } catch {
        // ignore parse errors
      }
    };

    const onModelPrefUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ sessionKey?: string; model?: string; provider?: string }>).detail;
      const sessionKey = String(detail?.sessionKey || '').trim();
      const hintedProvider = String(detail?.provider || '').trim();
      const model = canonicalizeModel(String(detail?.model || '').trim(), hintedProvider);
      const provider = String(hintedProvider || providerFromModel(model)).trim();
      if (!sessionKey) {
        syncFromStorage();
        return;
      }
      setSessionModelPrefs((state) => ({
        ...state,
        [sessionKey]: { model, provider },
      }));
      if (sessionKey === currentSessionKey) {
        setSelectedModel(model);
        setProviderFilter(provider);
      }
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('axon:session-model-pref-updated', onModelPrefUpdated as EventListener);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('axon:session-model-pref-updated', onModelPrefUpdated as EventListener);
    };
  }, [SESSION_MODEL_PREFS_KEY, canonicalizeModel, currentSessionKey, providerFromModel]);

  useEffect(() => {
    if (!prefsHydrated) return;
    try {
      localStorage.setItem(SESSION_MODEL_PREFS_KEY, JSON.stringify(sessionModelPrefs));
    } catch {
      // ignore
    }
  }, [SESSION_MODEL_PREFS_KEY, prefsHydrated, sessionModelPrefs]);

  useEffect(() => {
    const model = canonicalizeModel(String(activeSessionModel || '').trim(), providerFromModel(activeSessionModel));
    const saved = currentSessionKey ? sessionModelPrefs[currentSessionKey] : undefined;
    const savedModel = canonicalizeModel(String(saved?.model || '').trim(), String(saved?.provider || '').trim());
    const effectiveModel = String(savedModel || model).trim();
    const effectiveProvider = String(saved?.provider || providerFromModel(effectiveModel) || '').trim();
    setSelectedModel(effectiveModel);
    setProviderFilter(effectiveProvider);
    if (effectiveModel) {
      setModelOptions((prev) => (
        prev.some((o) => o.value === effectiveModel)
          ? prev
          : [{ value: effectiveModel, label: effectiveModel }, ...prev]
      ));
    }
  }, [activeSessionModel, canonicalizeModel, currentSessionKey, providerFromModel, sessionModelPrefs]);

  useEffect(() => {
    setPendingModelSwitch(null);
  }, [currentSessionKey]);

  const applyModelChange = useCallback(async (
    targetSessionKey: string,
    fromModel: string,
    fromProvider: string,
    toModel: string,
    toProvider: string,
  ) => {
    setModelApplying(true);
    try {
      const rpcResult = await invokeIpc<{ success?: boolean; ok?: boolean; error?: string }>(
        'gateway:rpc', 'sessions.patch', {
          key: targetSessionKey,
          model: toModel || null,
        },
      );
      if (rpcResult && (rpcResult.success === false || rpcResult.ok === false)) {
        console.warn('[ChatInput] sessions.patch failed:', rpcResult.error);
        setSelectedModel(fromModel);
        setProviderFilter(fromProvider);
        toast.error(t('chatView.modelSwitchFailed', {
          defaultValue: '切换模型失败：{{error}}',
          error: String(rpcResult.error || 'sessions.patch failed'),
        }));
        return;
      }

      useChatStore.setState((state) => ({
        sessions: state.sessions.map((session) => (
          session.key === targetSessionKey ? { ...session, model: toModel, modelProvider: toProvider } : session
        )),
      }));
      await loadSessions();
      persistSessionPref(targetSessionKey, toModel, toProvider);
      setSelectedModel(toModel);
      setProviderFilter(toProvider);
      window.dispatchEvent(new CustomEvent('axon:session-model-pref-updated', {
        detail: { sessionKey: targetSessionKey, model: toModel, provider: toProvider },
      }));
      toast.success(t('chatView.modelSwitchOk', {
        defaultValue: '已切换会话模型：{{model}}',
        model: toModel,
      }));
    } catch (err) {
      setSelectedModel(fromModel);
      setProviderFilter(fromProvider);
      toast.error(t('chatView.modelSwitchFailed', {
        defaultValue: '切换模型失败：{{error}}',
        error: String(err),
      }));
    } finally {
      setModelApplying(false);
      setPendingModelSwitch(null);
    }
  }, [loadSessions, persistSessionPref, t]);

  const handleModelChange = useCallback(async (nextValue: string) => {
    const prev = canonicalizeModel(String(activeSessionModel || '').trim(), providerFromModel(activeSessionModel));
    const prevProvider = String(providerFromModel(prev)).trim();
    const nextRaw = String(nextValue || '').trim();
    const hintedProvider = providerFromModel(nextRaw) || providerFilter;
    const next = canonicalizeModel(nextRaw, hintedProvider);
    const nextProvider = String(providerFromModel(next) || hintedProvider).trim();
    setSelectedModel(next);
    setProviderFilter(nextProvider);
    if (!currentSessionKey || next === prev) {
      setPendingModelSwitch(null);
      return;
    }
    setPendingModelSwitch({
      from: prev,
      fromProvider: prevProvider,
      to: next,
      toProvider: nextProvider,
    });
  }, [activeSessionModel, canonicalizeModel, currentSessionKey, providerFilter, providerFromModel]);

  const confirmModelSwitch = useCallback(async () => {
    const pending = pendingModelSwitch;
    if (!pending || !currentSessionKey) return;
    await applyModelChange(
      currentSessionKey,
      pending.from,
      pending.fromProvider,
      pending.to,
      pending.toProvider,
    );
  }, [applyModelChange, currentSessionKey, pendingModelSwitch]);

  const cancelModelSwitch = useCallback(() => {
    const pending = pendingModelSwitch;
    if (!pending) return;
    setSelectedModel(pending.from);
    setProviderFilter(pending.fromProvider);
    setPendingModelSwitch(null);
  }, [pendingModelSwitch]);

  const providerOptions = Array.from(new Set(
    modelOptions
      .map((opt) => String(opt.value || '').split('/')[0]?.trim())
      .filter((provider) => !!provider),
  )).sort();

  const filteredModelOptions = providerFilter
    ? modelOptions.filter((opt) => {
      const value = String(opt.value || '');
      return value.startsWith(`${providerFilter}/`) || value === providerFilter;
    })
    : modelOptions;

  const handleModelTest = useCallback(async () => {
    const current = String(selectedModel || activeSessionModel || '').trim();
    if (!current) {
      toast.error(t('composer.modelTestNeedModel', { defaultValue: '请先选择模型' }));
      return;
    }
    const provider = current.includes('/') ? current.split('/')[0] : current;
    if (!provider) {
      toast.error(t('composer.modelTestNeedModel', { defaultValue: '请先选择模型' }));
      return;
    }
    setModelTesting(true);
    try {
      const result = await hostApiFetch<{ okCount?: number; failCount?: number; results?: Array<{ error?: string }> }>('/api/v1/llm/probe', {
        method: 'POST',
        body: JSON.stringify({
          provider,
          timeoutMs: 12000,
          maxTokens: 16,
        }),
      });
      const okCount = Number(result?.okCount || 0);
      if (okCount > 0) {
        toast.success(t('composer.modelTestOk', { model: current, defaultValue: '模型连通成功：{{model}}' }));
        return;
      }
      const fallbackErr = result?.results?.find((r) => String(r?.error || '').trim())?.error
        || t('composer.modelTestFailedNoReason', { defaultValue: '无可用认证或网络不可达' });
      toast.error(t('composer.modelTestFail', { model: current, reason: fallbackErr, defaultValue: '模型连通失败：{{model}}（{{reason}}）' }));
    } catch (error) {
      toast.error(t('composer.modelTestFail', {
        model: current,
        reason: String(error),
        defaultValue: '模型连通失败：{{model}}（{{reason}}）',
      }));
    } finally {
      setModelTesting(false);
    }
  }, [activeSessionModel, selectedModel, t]);

  // Auto-resize textarea (single line default, grow upward)
  useEffect(() => {
    if (textareaRef.current) {
      const maxH = variant === 'chat-page' ? 192 : 200;
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, maxH)}px`;
    }
  }, [input, variant]);

  // Focus textarea on mount (avoids Windows focus loss after session delete + native dialog)
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  // Docs级粘贴拦截（capture 阶段），仅 preventDefault 阻止默认行为，事件仍会冒泡到 onPaste 处理
  useEffect(() => {
    if (variant !== 'chat-page') return;
    const onDocPaste = (e: ClipboardEvent) => {
      const dt = e.clipboardData;
      // clipboardData 为 null 时（Electron 粘贴图片常见），必须阻止默认行为防止页面跳转
      if (!dt) {
        e.preventDefault();
        return;
      }
      const hasFiles = dt.files?.length || Array.from(dt.items || []).some((it) => it.kind === 'file');
      const hasImageType = dt.types.some((t) =>
        t === 'Files' || t.startsWith('image/') || t === 'public.png' || t === 'public.jpeg');
      if (hasFiles || hasImageType) {
        e.preventDefault();
      }
    };
    document.addEventListener('paste', onDocPaste, true);
    return () => document.removeEventListener('paste', onDocPaste, true);
  }, [variant]);

  // ── File staging via native dialog ─────────────────────────────

  const pickFiles = useCallback(async () => {
    try {
      const result = await invokeIpc('dialog:open', {
        properties: ['openFile', 'multiSelections'],
      }) as { canceled: boolean; filePaths?: string[] };
      if (result.canceled || !result.filePaths?.length) return;

      // Add placeholder entries immediately
      const tempIds: string[] = [];
      for (const filePath of result.filePaths) {
        const tempId = crypto.randomUUID();
        tempIds.push(tempId);
        // Handle both Unix (/) and Windows (\) path separators
        const fileName = filePath.split(/[\\/]/).pop() || 'file';
        setAttachments(prev => [...prev, {
          id: tempId,
          fileName,
          mimeType: '',
          fileSize: 0,
          stagedPath: '',
          preview: null,
          status: 'staging' as const,
        }]);
      }

      // Stage all files via IPC
      console.log('[pickFiles] Staging files:', result.filePaths);
      const staged = await hostApiFetch<Array<{
        id: string;
        fileName: string;
        mimeType: string;
        fileSize: number;
        stagedPath: string;
        preview: string | null;
      }>>('/api/files/stage-paths', {
        method: 'POST',
        body: JSON.stringify({ filePaths: result.filePaths }),
      });
      console.log('[pickFiles] Stage result:', staged?.map(s => ({ id: s?.id, fileName: s?.fileName, mimeType: s?.mimeType, fileSize: s?.fileSize, stagedPath: s?.stagedPath, hasPreview: !!s?.preview })));

      // Update each placeholder with real data
      setAttachments(prev => {
        let updated = [...prev];
        for (let i = 0; i < tempIds.length; i++) {
          const tempId = tempIds[i];
          const data = staged[i];
          if (data) {
            updated = updated.map(a =>
              a.id === tempId
                ? { ...data, status: 'ready' as const }
                : a,
            );
          } else {
            console.warn(`[pickFiles] No staged data for tempId=${tempId} at index ${i}`);
            updated = updated.map(a =>
              a.id === tempId
                ? { ...a, status: 'error' as const, error: 'Staging failed' }
                : a,
            );
          }
        }
        return updated;
      });
    } catch (err) {
      console.error('[pickFiles] Failed to stage files:', err);
      // Mark any stuck 'staging' attachments as 'error' so the user can remove them
      // and the send button isn't permanently blocked
      setAttachments(prev => prev.map(a =>
        a.status === 'staging'
          ? { ...a, status: 'error' as const, error: String(err) }
          : a,
      ));
    }
  }, []);

  // ── Stage browser File objects (paste / drag-drop) ─────────────
  // 缓存到 axonclaw-staged 目录，Send时把路径传给 OpenClaw

  const stageBufferFiles = useCallback(async (files: globalThis.File[]) => {
    for (const file of files) {
      const tempId = crypto.randomUUID();
      // 图片立即用 object URL 显示预览，不等 IPC 返回
      const instantPreview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : null;
      setAttachments(prev => [...prev, {
        id: tempId,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        stagedPath: '',
        preview: instantPreview,
        status: 'staging' as const,
      }]);

      try {
        console.log(`[stageBuffer] Reading file: ${file.name} (${file.type}, ${file.size} bytes)`);
        const base64 = await readFileAsBase64(file);
        console.log(`[stageBuffer] Base64 length: ${base64?.length ?? 'null'}`);
        const staged = await hostApiFetch<{
          id: string;
          fileName: string;
          mimeType: string;
          fileSize: number;
          stagedPath: string;
          preview: string | null;
        }>('/api/files/stage-buffer', {
          method: 'POST',
          body: JSON.stringify({
            base64,
            fileName: file.name,
            mimeType: file.type || 'application/octet-stream',
          }),
        });
        console.log(`[stageBuffer] Staged: id=${staged?.id}, path=${staged?.stagedPath}, size=${staged?.fileSize}`);
        if (instantPreview) URL.revokeObjectURL(instantPreview);
        setAttachments(prev => prev.map(a =>
          a.id === tempId ? { ...staged, status: 'ready' as const } : a,
        ));
      } catch (err) {
        console.error(`[stageBuffer] Error staging ${file.name}:`, err);
        if (instantPreview) URL.revokeObjectURL(instantPreview);
        setAttachments(prev => prev.map(a =>
          a.id === tempId
            ? { ...a, status: 'error' as const, error: String(err), preview: null }
            : a,
        ));
      }
    }
  }, []);

  // ── Attachment management ──────────────────────────────────────

  const removeAttachment = useCallback((id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  }, []);

  // 通知父组件Attachment变化，用于在外部渲染预览
  useEffect(() => {
    onAttachmentsChange?.(attachments, removeAttachment);
  }, [attachments, removeAttachment, onAttachmentsChange]);

  const allReady = attachments.length === 0 || attachments.every(a => a.status === 'ready');
  const hasFailedAttachments = attachments.some((a) => a.status === 'error');
  const canSend = (input.trim() || attachments.length > 0) && allReady && !disabled;
  const canStop = sending && !disabled && !!onStop;
  const displayActivityLabel = useCallback((value: string | null) => {
    if (!value) return t('composer.running', { defaultValue: '任务执行中，等待模型返回' });
    if (value.startsWith('activityTool:')) {
      return t('composer.activityTool', {
        tool: value.slice('activityTool:'.length) || 'tool',
        defaultValue: '正在执行工具：{{tool}}',
      });
    }
    return t(`composer.${value}`, {
      defaultValue: t('composer.running', { defaultValue: '任务执行中，等待模型返回' }),
    });
  }, [t]);

  const handleSend = useCallback(() => {
    if (!canSend) return;
    const readyAttachments = attachments.filter(a => a.status === 'ready');
    // Capture values before clearing — clear input immediately for snappy UX,
    // but keep attachments available for the async send
    const textToSend = input.trim();
    const attachmentsToSend = readyAttachments.length > 0 ? readyAttachments : undefined;
    console.log(`[handleSend] text="${textToSend.substring(0, 50)}", attachments=${attachments.length}, ready=${readyAttachments.length}, sending=${!!attachmentsToSend}`);
    if (attachmentsToSend) {
      console.log('[handleSend] Attachment details:', attachmentsToSend.map(a => ({
        id: a.id, fileName: a.fileName, mimeType: a.mimeType, fileSize: a.fileSize,
        stagedPath: a.stagedPath, status: a.status, hasPreview: !!a.preview,
      })));
    }
    setInput('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onSend(textToSend, attachmentsToSend);
  }, [input, attachments, canSend, onSend]);

  const handleStop = useCallback(() => {
    if (!canStop) return;
    onStop?.();
  }, [canStop, onStop]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        const nativeEvent = e.nativeEvent as KeyboardEvent;
        if (isComposingRef.current || nativeEvent.isComposing || nativeEvent.keyCode === 229) {
          return;
        }
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, input],
  );

  // Handle paste (Ctrl/Cmd+V with files/images)
  // 优先使用 clipboardData.files，再遍历 items；无文件时尝试 Electron clipboard
  const handlePaste = useCallback(
    async (e: React.ClipboardEvent) => {
      const dt = e.clipboardData;

      // clipboardData 为 null（Electron 中粘贴图片常见），阻止默认行为并通过 IPC 读取剪贴板图片
      if (!dt) {
        e.preventDefault();
        e.stopPropagation();
        try {
          const result = await invokeIpc<{ base64: string; mimeType: string } | null>('clipboard:readImage');
          if (result?.base64) {
            const tempId = crypto.randomUUID();
            setAttachments(prev => [...prev, {
              id: tempId,
              fileName: `pasted-${Date.now()}.png`,
              mimeType: result.mimeType || 'image/png',
              fileSize: 0,
              stagedPath: '',
              preview: `data:${result.mimeType || 'image/png'};base64,${result.base64}`,
              status: 'staging' as const,
            }]);
            const staged = await hostApiFetch<{
              id: string;
              fileName: string;
              mimeType: string;
              fileSize: number;
              stagedPath: string;
              preview: string | null;
            }>('/api/files/stage-buffer', {
              method: 'POST',
              body: JSON.stringify({
                base64: result.base64,
                fileName: `pasted-${Date.now()}.png`,
                mimeType: result.mimeType || 'image/png',
              }),
            });
            setAttachments(prev => prev.map(a =>
              a.id === tempId ? { ...staged, status: 'ready' as const } : a,
            ));
          }
        } catch {
          // 忽略，已阻止默认行为
        }
        return;
      }

      let pastedFiles: globalThis.File[] = [];
      // 1. 直接取 files（部分系统粘贴图片时只在这里有）
      if (dt.files?.length) {
        pastedFiles = Array.from(dt.files);
      }
      // 2. 遍历 items 作为补充
      if (pastedFiles.length === 0 && dt.items) {
        for (const item of Array.from(dt.items)) {
          if (item.kind === 'file') {
            const file = item.getAsFile();
            if (file) pastedFiles.push(file);
          }
        }
      }

      const hasImageType = dt.types.some((t) =>
        t === 'Files' || t.startsWith('image/') || t === 'public.png' || t === 'public.jpeg');

      if (pastedFiles.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        stageBufferFiles(pastedFiles);
      } else if (hasImageType) {
        // 剪贴板有图片但 Web API 未解析出文件：阻止默认行为，避免跳转空页面
        e.preventDefault();
        e.stopPropagation();
        // 尝试从 Electron 主进程读取图片（macOS 等场景）
        try {
          const result = await invokeIpc<{ base64: string; mimeType: string } | null>('clipboard:readImage');
          if (result?.base64) {
            const tempId = crypto.randomUUID();
            setAttachments(prev => [...prev, {
              id: tempId,
              fileName: `pasted-${Date.now()}.png`,
              mimeType: result.mimeType || 'image/png',
              fileSize: 0,
              stagedPath: '',
              preview: `data:${result.mimeType || 'image/png'};base64,${result.base64}`,
              status: 'staging' as const,
            }]);
            const staged = await hostApiFetch<{
              id: string;
              fileName: string;
              mimeType: string;
              fileSize: number;
              stagedPath: string;
              preview: string | null;
            }>('/api/files/stage-buffer', {
              method: 'POST',
              body: JSON.stringify({
                base64: result.base64,
                fileName: `pasted-${Date.now()}.png`,
                mimeType: result.mimeType || 'image/png',
              }),
            });
            setAttachments(prev => prev.map(a =>
              a.id === tempId ? { ...staged, status: 'ready' as const } : a,
            ));
          }
        } catch {
          // 忽略，已阻止默认行为
        }
      }
    },
    [stageBufferFiles],
  );

  // Handle drag & drop
  const [dragOver, setDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (e.dataTransfer?.files?.length) {
        stageBufferFiles(Array.from(e.dataTransfer.files));
      }
    },
    [stageBufferFiles],
  );

  return (
    <div
      className={cn(
        "w-full transition-all duration-300",
        isChatPage ? "p-0" : "p-4 pb-6 mx-auto",
        !isChatPage && (isEmpty ? "max-w-3xl" : "max-w-4xl")
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="w-full">
        {/* Input Row - chat-page: Attachment在输入框内左上角 */}
        <div
          className={cn(
            "relative rounded-2xl border transition-all",
            isChatPage
              ? "bg-[#1e293b] border-[#334155] focus-within:border-[#6366f1] p-4"
              : "bg-white dark:bg-card shadow-sm p-3",
            isChatPage && dragOver && "border-[#6366f1] ring-1 ring-[#6366f1]",
            !isChatPage && (dragOver ? 'border-primary ring-1 ring-primary' : 'border-black/10 dark:border-white/10')
          )}
          onPaste={handlePaste}
        >
          {/* Attachments - 当未提供 onAttachmentsChange 时在输入框内显示预览 */}
          {!onAttachmentsChange && attachments.length > 0 && (
            <div className={cn(
              "flex gap-2 flex-wrap items-start",
              isChatPage ? "mb-3 justify-start" : "mb-3"
            )}>
              {attachments.map((att) => (
                <AttachmentPreview
                  key={att.id}
                  attachment={att}
                  onRemove={() => removeAttachment(att.id)}
                  variant={variant}
                />
              ))}
            </div>
          )}
          <div className="flex items-end gap-1.5">
            {!isChatPage && (
              <>
                {/* Session Model Selector */}
                <div className="shrink-0 w-[160px]">
                  <select
                    value={selectedModel}
                    onChange={(e) => { void handleModelChange(e.target.value); }}
                    disabled={disabled || sending || modelApplying}
                    title={t('composer.modelSelector', { defaultValue: 'Session Model' })}
                    className="h-10 w-full rounded-xl border px-2 text-xs outline-none bg-white dark:bg-card border-black/10 dark:border-white/10 text-foreground"
                  >
                    <option value="">{t('composer.modelAuto', { defaultValue: 'Follow default model' })}</option>
                    {filteredModelOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <Button
                  variant="ghost"
                  type="button"
                  className="shrink-0 h-10 rounded-xl px-2.5 text-xs text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10"
                  disabled={disabled || sending || modelLoading || modelApplying || modelTesting}
                  onClick={() => { void handleModelTest(); }}
                  title={t('composer.modelTest', { defaultValue: 'Test' })}
                >
                  {modelTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('composer.modelTest', { defaultValue: 'Test' })}
                </Button>
              </>
            )}
            {/* Attach Button */}
            <Button
              variant="ghost"
              size="icon"
              type="button"
              className={cn(
                "shrink-0 h-10 w-10 rounded-full transition-colors",
                isChatPage
                  ? "text-[#94a3b8] hover:bg-[#6366f1]/10 hover:text-[#6366f1]"
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
              )}
              onClick={pickFiles}
              disabled={disabled}
              title={t('composer.attachFiles')}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {/* Textarea - chat-page: 单行起，向上自动增高 */}
            <div className="flex-1 relative min-w-0">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onCompositionStart={() => {
                  isComposingRef.current = true;
                }}
                onCompositionEnd={() => {
                  isComposingRef.current = false;
                }}
                placeholder={disabled ? t('composer.gatewayDisconnectedPlaceholder') : (isChatPage ? 'Type a message...' : '')}
                disabled={disabled}
                className={cn(
                  "resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 shadow-none bg-transparent py-2.5 px-2 leading-relaxed",
                  isChatPage
                    ? "min-h-[36px] max-h-[220px] text-[14px] text-[#f8fafc] placeholder:text-[#64748b]"
                    : "min-h-[40px] max-h-[200px] text-[15px] placeholder:text-muted-foreground/60"
                )}
                rows={1}
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={sending && !input.trim() && attachments.length === 0 ? handleStop : handleSend}
              disabled={sending && !input.trim() && attachments.length === 0 ? !canStop : !canSend}
              size="icon"
              className={cn(
                "shrink-0 h-10 w-10 rounded-full transition-colors",
                isChatPage
                  ? (sending || canSend)
                    ? "bg-[#6366f1] text-white hover:bg-[#4f46e5]"
                    : "bg-[#334155] text-[#64748b] cursor-not-allowed opacity-0.6"
                  : (sending || canSend)
                    ? 'bg-black/5 dark:bg-white/10 text-foreground hover:bg-black/10 dark:hover:bg-white/20'
                    : 'text-muted-foreground/50 hover:bg-transparent bg-transparent'
              )}
              variant="ghost"
              title={sending && !input.trim() && attachments.length === 0 ? t('composer.stop') : t('composer.send')}
            >
              {sending && !input.trim() && attachments.length === 0 ? (
                <Square className="h-4 w-4" fill="currentColor" />
              ) : (
                <SendHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
              )}
            </Button>
          </div>
          {(sending || queuedCount > 0 || activityLabel) && (
            <div className={cn(
              'mt-2 flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-[11px]',
              isChatPage
                ? 'bg-[#0f172a]/80 text-[#94a3b8] border border-[#334155]'
                : 'bg-black/[0.03] dark:bg-white/[0.04] text-muted-foreground border border-black/10 dark:border-white/10',
            )}>
              <span className="inline-flex items-center gap-2">
                {sending && <Loader2 className="h-3.5 w-3.5 animate-spin text-[#60a5fa]" />}
                {displayActivityLabel(activityLabel)}
              </span>
              {queuedCount > 0 && (
                <button
                  type="button"
                  onClick={() => setQueueExpanded((value) => !value)}
                  className="shrink-0 inline-flex items-center gap-1 rounded-full bg-[#6366f1]/20 px-2 py-0.5 text-[#c4b5fd] hover:bg-[#6366f1]/30 transition-colors"
                  title={t('composer.toggleQueue', { defaultValue: '展开/收起待执行队列' })}
                >
                  {t('composer.queuedCount', { count: queuedCount, defaultValue: '队列 {{count}} 条' })}
                  <ChevronDown className={cn('h-3 w-3 transition-transform', queueExpanded && 'rotate-180')} />
                </button>
              )}
            </div>
          )}
          {queueExpanded && queuedCount > 0 && (
            <div className={cn(
              'mt-1 rounded-lg border px-3 py-2 text-[11px]',
              isChatPage
                ? 'bg-[#0b1120]/95 text-[#94a3b8] border-[#334155]'
                : 'bg-black/[0.03] dark:bg-white/[0.04] text-muted-foreground border-black/10 dark:border-white/10',
            )}>
              <div className="mb-1 font-medium text-[#cbd5e1]">
                {t('composer.queueTitle', { defaultValue: '待执行队列' })}
              </div>
              <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                {messageQueue.map((item, index) => (
                  <div key={item.id} className="flex items-start gap-2 rounded-md bg-white/[0.03] px-2 py-1">
                    <span className="mt-0.5 shrink-0 text-[#818cf8]">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate">
                      {item.text?.trim() || t('composer.queuedItem', { index: index + 1, defaultValue: '排队消息 {{index}}' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {pendingModelSwitch && (
            <div className={cn(
              'mt-3 rounded-lg border px-3 py-2.5',
              isChatPage
                ? 'border-[#334155] bg-[#0f172a]/80 text-[#e2e8f0]'
                : 'border-black/10 dark:border-white/10 bg-black/[0.03] dark:bg-white/[0.03] text-foreground',
            )}>
              <div className="text-[12px] font-semibold">
                {t('chatView.modelSwitchConfirmTitle', { defaultValue: '确认切换会话模型？' })}
              </div>
              <div className={cn(
                'mt-1 text-[11px]',
                isChatPage ? 'text-[#94a3b8]' : 'text-muted-foreground',
              )}>
                {t('chatView.modelSwitchConfirmBody', {
                  defaultValue: '当前：{{from}} → 目标：{{to}}。仅影响后续消息，不会重算历史消息。',
                  from: pendingModelSwitch.from || t('chatView.modelAuto', { defaultValue: '默认模型' }),
                  to: pendingModelSwitch.to || t('chatView.modelAuto', { defaultValue: '默认模型' }),
                })}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  type="button"
                  className={cn(
                    'h-8 rounded-md px-3 text-xs',
                    isChatPage
                      ? 'text-[#cbd5e1] hover:bg-[#1e293b]'
                      : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10',
                  )}
                  disabled={modelApplying}
                  onClick={cancelModelSwitch}
                >
                  {t('chatView.modelSwitchCancel', { defaultValue: '取消' })}
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  className={cn(
                    'h-8 rounded-md px-3 text-xs',
                    isChatPage
                      ? 'bg-[#2563eb] text-white hover:bg-[#1d4ed8]'
                      : 'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                  disabled={modelApplying}
                  onClick={() => { void confirmModelSwitch(); }}
                >
                  {modelApplying
                    ? t('chatView.modelSwitchApplying', { defaultValue: '切换中...' })
                    : t('chatView.modelSwitchConfirm', { defaultValue: '确认切换' })}
                </Button>
              </div>
            </div>
          )}
          {isChatPage && (
            <div className="mt-3 flex items-center gap-2">
              <select
                value={providerFilter}
                onChange={(e) => {
                  const nextProvider = String(e.target.value || '').trim();
                  setProviderFilter(nextProvider);
                }}
                disabled={disabled || sending || modelApplying}
                title={t('composer.providerFilter', { defaultValue: 'Provider' })}
                className="h-9 w-[150px] rounded-lg border px-2 text-xs outline-none bg-[#0f172a] border-[#334155] text-[#e2e8f0]"
              >
                <option value="">{t('composer.providerAll', { defaultValue: 'All Providers' })}</option>
                {providerOptions.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
              <div className="w-[150px]">
                <select
                  value={selectedModel}
                  onChange={(e) => { void handleModelChange(e.target.value); }}
                  disabled={disabled || sending || modelApplying}
                  title={t('composer.modelSelector', { defaultValue: 'Session Model' })}
                  className="h-9 w-full rounded-lg border px-2 text-xs outline-none bg-[#0f172a] border-[#334155] text-[#e2e8f0]"
                >
                  <option value="">{t('composer.modelAuto', { defaultValue: 'Follow default model' })}</option>
                  {filteredModelOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <Button
                variant="ghost"
                type="button"
                className="h-9 rounded-lg px-3 text-xs text-[#93c5fd] hover:bg-[#1d4ed8]/20 hover:text-[#bfdbfe]"
                disabled={disabled || sending || modelLoading || modelApplying || modelTesting}
                onClick={() => { void handleModelTest(); }}
                title={t('composer.modelTest', { defaultValue: 'Test' })}
              >
                {modelTesting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t('composer.modelTest', { defaultValue: 'Test' })}
              </Button>
            </div>
          )}
          {!isChatPage && (modelLoading || modelApplying) && (
            <div className={cn("absolute end-16 top-3", isChatPage ? "text-[#64748b]" : "text-muted-foreground")}>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            </div>
          )}
        </div>
        {!isChatPage && (
        <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-muted-foreground/60 px-4">
          <div className="flex items-center gap-1.5">
            <div className={cn("w-1.5 h-1.5 rounded-full", gatewayStatus.state === 'running' ? "bg-green-500/80" : "bg-red-500/80")} />
            <span>
              {t('composer.gatewayStatus', {
                state: gatewayStatus.state === 'running'
                  ? t('composer.gatewayConnected')
                  : gatewayStatus.state,
                port: gatewayStatus.port,
                pid: gatewayStatus.pid ? `| pid: ${gatewayStatus.pid}` : '',
              })}
            </span>
          </div>
          {hasFailedAttachments && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-[11px]"
              onClick={() => {
                setAttachments((prev) => prev.filter((att) => att.status !== 'error'));
                void pickFiles();
              }}
            >
              {t('composer.retryFailedAttachments')}
            </Button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

// ── Attachment Preview ───────────────────────────────────────────

export function AttachmentPreview({
  attachment,
  onRemove,
  variant = 'default',
}: {
  attachment: FileAttachment;
  onRemove: () => void;
  variant?: 'default' | 'chat-page';
}) {
  const isImage = attachment.mimeType.startsWith('image/') && attachment.preview;
  const isChatPage = variant === 'chat-page';
  // chat-page: 小预览框 48x48，紧凑显示在输入框左上角
  const thumbSize = isChatPage ? 'w-12 h-12' : 'w-16 h-16';

  return (
    <div className={cn(
      "relative group rounded-lg overflow-hidden border shrink-0",
      isChatPage ? "border-[#334155] bg-[#0f172a]" : "border-border"
    )}>
      {isImage ? (
        // Image thumbnail - 小预览
        <div className={thumbSize}>
          <img
            src={attachment.preview!}
            alt={attachment.fileName}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        // Generic file card
        <div className={cn(
          "flex items-center gap-2 px-3 py-2 max-w-[200px]",
          isChatPage ? "bg-[#0f172a]" : "bg-muted/50"
        )}>
          <FileIcon mimeType={attachment.mimeType} className={cn("h-5 w-5 shrink-0", isChatPage ? "text-[#94a3b8]" : "text-muted-foreground")} />
          <div className="min-w-0 overflow-hidden">
            <p className={cn("text-xs font-medium truncate", isChatPage && "text-[#e2e8f0]")}>{attachment.fileName}</p>
            <p className={cn("text-[10px]", isChatPage ? "text-[#64748b]" : "text-muted-foreground")}>
              {attachment.fileSize > 0 ? formatFileSize(attachment.fileSize) : '...'}
            </p>
          </div>
        </div>
      )}

      {/* Staging overlay */}
      {attachment.status === 'staging' && (
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <Loader2 className="h-4 w-4 text-white animate-spin" />
        </div>
      )}

      {/* Error overlay */}
      {attachment.status === 'error' && (
        <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center">
          <span className="text-[10px] text-destructive font-medium px-1">Error</span>
        </div>
      )}

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
