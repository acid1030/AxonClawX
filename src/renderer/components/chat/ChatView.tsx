/**
 * ChatView - 对话界面
 * 按 design_v2.html 布局与样式实现
 * 支持图片/文件展示、上传、粘贴
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useChatStore } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronsDown, Bot, Wrench, Lightbulb, RefreshCw, File, LightbulbOff, Pencil, History } from 'lucide-react';
import { MarkdownContent } from './MarkdownContent';
import { TypewriterMarkdown } from './TypewriterMarkdown';
import { ChatInput, AttachmentPreview } from '@/pages/Chat/ChatInput';
import type { FileAttachment } from '@/pages/Chat/ChatInput';
import { extractImages, extractText, extractThinking, extractFilePathsFromText, stripFilePathsFromText } from '@/pages/Chat/message-utils';
import { invokeIpc } from '@/lib/api-client';
import type { RawMessage, AttachedFileMeta } from '@/stores/chat';

// 可折叠组件
const CollapsibleBlock: React.FC<{
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ icon, label, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);
  return (
    <div className="border border-[#4b5563]/50 rounded-lg overflow-hidden my-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-[#1f2937] hover:bg-[#374151] transition-colors text-sm"
      >
        {isOpen ? (
          <ChevronDown className="w-3 h-3 text-[#94a3b8]" />
        ) : (
          <span className="w-3 h-3 text-[#94a3b8]">▶</span>
        )}
        {icon}
        <span className="text-[#94a3b8] text-sm">{label}</span>
      </button>
      {isOpen && (
        <div className="px-3 py-2 bg-[#111827] text-sm text-[#e2e8f0] whitespace-pre-wrap">
          {children}
        </div>
      )}
    </div>
  );
};

function getSessionDisplayName(
  sessionKey: string,
  sessions: { key: string; displayName?: string }[],
  sessionLabels: Record<string, string>
): string {
  return sessionLabels[sessionKey]
    || sessions.find((s) => s.key === sessionKey)?.displayName
    || sessionKey;
}

function imageSrc(img: { url?: string; data?: string; mimeType: string }): string | null {
  if (img.url) return img.url;
  if (img.data) return `data:${img.mimeType};base64,${img.data}`;
  return null;
}

export const ChatView: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loadHistoryOpen, setLoadHistoryOpen] = useState(false);
  const [loadHistoryDate, setLoadHistoryDate] = useState('');
  const [aliasEditOpen, setAliasEditOpen] = useState(false);
  const [aliasEditSessionKey, setAliasEditSessionKey] = useState<string | null>(null);
  const [aliasEditValue, setAliasEditValue] = useState('');
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [sessionLoadingAnim, setSessionLoadingAnim] = useState(false);

  // 附件状态镜像，由 ChatInput 通过 onAttachmentsChange 同步
  const [viewAttachments, setViewAttachments] = useState<FileAttachment[]>([]);
  const removeAttachmentRef = useRef<(id: string) => void>(() => {});
  const handleAttachmentsChange = useCallback((atts: FileAttachment[], removeFn: (id: string) => void) => {
    setViewAttachments(atts);
    removeAttachmentRef.current = removeFn;
  }, []);

  const { status: gatewayStatus, health, checkHealth } = useGatewayStore();
  const {
    messages,
    sending,
    sendMessage,
    abortRun,
    sessions,
    currentSessionKey,
    sessionLabels,
    streamingText,
    streamingMessage,
    error,
    clearError,
    switchSession,
    newSession,
    refresh,
    loadHistory,
    loadHistoryWithOptions,
    loading,
    showThinking,
    toggleThinking,
    setSessionLabel,
  } = useChatStore();

  // 持久化会话别名：刷新/重启后仍保留
  useEffect(() => {
    try {
      const raw = localStorage.getItem('axon.chat.sessionLabels.v1');
      if (!raw) return;
      const saved = JSON.parse(raw) as Record<string, string>;
      if (!saved || typeof saved !== 'object') return;
      const current = useChatStore.getState().sessionLabels;
      const merged = { ...saved, ...current };
      useChatStore.setState({ sessionLabels: merged });
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('axon.chat.sessionLabels.v1', JSON.stringify(sessionLabels || {}));
    } catch {
      // ignore
    }
  }, [sessionLabels]);

  const animateTopToBottom = async (el: HTMLDivElement, durationMs = 900): Promise<void> => {
    const target = Math.max(0, el.scrollHeight - el.clientHeight);
    if (target <= 0) return;
    el.scrollTop = 0;

    // 超长会话走快速模式，避免大列表 smooth 造成卡顿
    if (target > 24000) {
      el.scrollTop = target;
      await new Promise((resolve) => setTimeout(resolve, 120));
      return;
    }

    // 使用原生 smooth scroll，避免逐帧 JS 动画在大列表下卡顿
    el.scrollTo({ top: target, behavior: 'smooth' });
    await new Promise((resolve) => setTimeout(resolve, durationMs));
  };

  const suppressAutoScrollRef = useRef(false);

  const runWithSessionLoading = async (
    fn: () => Promise<void>,
    opts: { preserveScroll?: boolean; scanFromTop?: boolean } = {},
  ) => {
    const el = chatAreaRef.current;
    const preserveScroll = !!opts.preserveScroll;
    const scanFromTop = !!opts.scanFromTop;
    const prevTop = preserveScroll && el ? el.scrollTop : 0;
    const prevHeight = preserveScroll && el ? el.scrollHeight : 0;

    suppressAutoScrollRef.current = true;
    setSessionLoadingAnim(true);
    const startedAt = Date.now();
    try {
      await fn();
      if (scanFromTop && el) {
        await animateTopToBottom(el, 1100);
      } else if (preserveScroll && el) {
        requestAnimationFrame(() => {
          const delta = el.scrollHeight - prevHeight;
          el.scrollTop = prevTop + Math.max(0, delta);
        });
      }
    } finally {
      const elapsed = Date.now() - startedAt;
      const remain = Math.max(0, 700 - elapsed);
      setTimeout(() => {
        setSessionLoadingAnim(false);
        suppressAutoScrollRef.current = false;
      }, remain);
    }
  };

  const handleRefresh = async () => {
    try {
      await runWithSessionLoading(async () => {
        await refresh();
        await checkHealth();
      }, { scanFromTop: true });
    } catch (err) {
      console.error(t('chatView.refreshFailed'), err);
    }
  };

  const openAliasEdit = (sessionKey: string) => {
    const current = sessionLabels[sessionKey] || sessions.find((s) => s.key === sessionKey)?.displayName || sessionKey;
    setAliasEditSessionKey(sessionKey);
    setAliasEditValue(typeof current === 'string' ? current : sessionKey);
    setAliasEditOpen(true);
  };

  const confirmAliasEdit = () => {
    if (aliasEditSessionKey) {
      setSessionLabel(aliasEditSessionKey, aliasEditValue.trim());
      setAliasEditOpen(false);
      setAliasEditSessionKey(null);
    }
  };

  const handleEditSessionLabel = (e: React.MouseEvent, sessionKey: string) => {
    e.stopPropagation();
    openAliasEdit(sessionKey);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatAreaRef = useRef<HTMLDivElement>(null);
  const loadHistoryRef = useRef<HTMLDivElement>(null);
  const aliasInputRef = useRef<HTMLInputElement>(null);
  const [showBackToBottom, setShowBackToBottom] = useState(false);
  const [showNewMessageHint, setShowNewMessageHint] = useState(false);
  const prevMessageCountRef = useRef(0);
  const isConnected = gatewayStatus.state === 'running';

  // thinking 动画完成标记：thinking 打字机追赶到末尾后才显示正文
  const [thinkingAnimDone, setThinkingAnimDone] = useState(false);
  const prevThinkingLenRef = useRef(0);
  // 打字机仅用于「模型实时流式返回」；messages 来自本地会话，一律用 MarkdownContent 直接显示
  const prevStreamingLenRef = useRef({ thinking: 0, text: 0 });
  const [useTypewriterForThinking, setUseTypewriterForThinking] = useState(false);
  const [useTypewriterForText, setUseTypewriterForText] = useState(false);

  // 安全防护：阻止粘贴剪贴板图片/文件时导致 Electron 页面跳转空白
  // ChatInput 的 document capture handler 在 clipboardData 为 null 时会 early return，
  // 导致 e.preventDefault() 未被调用，Electron/Chromium 触发默认导航行为。
  // 此处作为兜底，在 capture 阶段拦截所有可能导致页面跳转的粘贴事件。
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const dt = e.clipboardData;
      // clipboardData 为 null 或 types 为空 → Electron 中常见的图片粘贴场景，必须阻止默认导航
      if (!dt || dt.types.length === 0) {
        e.preventDefault();
        return;
      }
      // 检测文件/图片类型
      const hasNonText =
        (dt.files?.length ?? 0) > 0 ||
        Array.from(dt.items || []).some((it) => it.kind === 'file') ||
        dt.types.some(
          (t) => t === 'Files' || t.startsWith('image/') || t === 'public.png' || t === 'public.jpeg',
        );
      if (hasNonText) {
        e.preventDefault();
      }
    };
    document.addEventListener('paste', onPaste, true);
    return () => document.removeEventListener('paste', onPaste, true);
  }, []);

  useEffect(() => {
    if (isConnected) {
      refresh();
    }
  }, [isConnected, refresh]);

  useEffect(() => {
    if (dropdownOpen && isConnected) {
      checkHealth();
    }
  }, [dropdownOpen, isConnected, checkHealth]);

  const scrollToBottom = useCallback(() => {
    const el = chatAreaRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      setShowNewMessageHint(false);
    }
  }, []);

  useEffect(() => {
    if (suppressAutoScrollRef.current) return;
    scrollToBottom();
  }, [messages, streamingText, streamingMessage, scrollToBottom]);

  const handleChatAreaScroll = useCallback(() => {
    const el = chatAreaRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const threshold = 10;
    const nearBottom = scrollHeight - scrollTop - clientHeight < threshold;
    setShowBackToBottom(!nearBottom);
    if (nearBottom) setShowNewMessageHint(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(handleChatAreaScroll, 100);
    return () => clearTimeout(t);
  }, [messages, streamingText, streamingMessage, handleChatAreaScroll]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const curr = messages.length;
    if (curr > prev) {
      const el = chatAreaRef.current;
      if (el) {
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        if (distanceFromBottom > 80) {
          setShowNewMessageHint(true);
        }
      }
    }
    prevMessageCountRef.current = curr;
  }, [messages.length]);

  useEffect(() => {
    if (!loadHistoryOpen) return;
    const onDocClick = (e: MouseEvent) => {
      if (loadHistoryRef.current && !loadHistoryRef.current.contains(e.target as Node)) {
        setLoadHistoryOpen(false);
      }
    };
    document.addEventListener('click', onDocClick, { capture: true });
    return () => document.removeEventListener('click', onDocClick, { capture: true });
  }, [loadHistoryOpen]);

  useEffect(() => {
    if (aliasEditOpen) {
      aliasInputRef.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setAliasEditOpen(false);
          setAliasEditSessionKey(null);
        }
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [aliasEditOpen]);


  // 检查流式内容是否已在 messages 中（避免重复 + 会话消息一律直接显示）
  const lastAssistantMsg = messages.length > 0
    ? [...messages].reverse().find(m => m.role === 'assistant')
    : null;
  const lastMsgText = lastAssistantMsg ? extractText(lastAssistantMsg) : '';
  const rawStreamingText = streamingText || (streamingMessage && typeof streamingMessage === 'object'
    ? extractText(streamingMessage as RawMessage)
    : '');
  const rawStreamingTrim = rawStreamingText.trim();
  const lastMsgTrim = lastMsgText.trim();
  // 流式内容已在会话中：完全一致，或最后一条已包含流式内容（已写入）；避免短前缀误判
  const isStreamingMsgAlreadyInHistory = !!(
    rawStreamingTrim &&
    lastMsgTrim &&
    (rawStreamingTrim === lastMsgTrim || (rawStreamingTrim.length >= 20 && lastMsgTrim.includes(rawStreamingTrim)))
  );

  const streamingDisplayText = isStreamingMsgAlreadyInHistory ? '' : rawStreamingText;

  const streamingThinking = isStreamingMsgAlreadyInHistory
    ? null
    : streamingMessage && typeof streamingMessage === 'object'
      ? extractThinking(streamingMessage as RawMessage)
      : null;

  // 仅当 sending 且流式内容尚未写入 messages 时显示流式块；会话消息一律从 messages 渲染，用 MarkdownContent
  const isFromModelStream = sending && !isStreamingMsgAlreadyInHistory && (!!streamingDisplayText || !!streamingThinking);

  // 流式输出期间持续滚动到底部
  useEffect(() => {
    if (!sending && !streamingDisplayText && !streamingThinking) return;
    scrollToBottom();
    const timer = setInterval(scrollToBottom, 150);
    return () => clearInterval(timer);
  }, [sending, streamingDisplayText, streamingThinking, scrollToBottom]);

  // 当 thinking 文本增长（新 token 到达），重置完成标记
  useEffect(() => {
    const len = streamingThinking?.length ?? 0;
    if (len > prevThinkingLenRef.current) {
      setThinkingAnimDone(false);
    }
    if (len === 0) {
      // 无 thinking 时直接标记完成，不阻塞正文
      setThinkingAnimDone(true);
    }
    prevThinkingLenRef.current = len;
  }, [streamingThinking]);

  // 发送结束时立即关闭打字机（流式块会消失，历史消息用 MarkdownContent）
  useEffect(() => {
    if (!sending) {
      setUseTypewriterForThinking(false);
      setUseTypewriterForText(false);
    }
  }, [sending]);

  // 仅当来源为模型实时流且内容增量到达时使用打字机；本地会话消息一律不用
  const STREAMING_DELTA_THRESHOLD = 80; // 单次增长超过此值视为非流式
  const STABLE_MS = 180; // 内容无增长超过此时间视为完成，不再打字机
  useEffect(() => {
    if (!isFromModelStream) {
      setUseTypewriterForThinking(false);
      setUseTypewriterForText(false);
      return;
    }
    const thinkingLen = streamingThinking?.length ?? 0;
    const textLen = streamingDisplayText?.length ?? 0;
    const prev = prevStreamingLenRef.current;
    const thinkingDelta = thinkingLen - prev.thinking;
    const textDelta = textLen - prev.text;
    prevStreamingLenRef.current = { thinking: thinkingLen, text: textLen };

    const thinkingStreaming = thinkingLen > 0 && thinkingDelta > 0 && thinkingDelta < STREAMING_DELTA_THRESHOLD;
    const textStreaming = textLen > 0 && textDelta > 0 && textDelta < STREAMING_DELTA_THRESHOLD;

    if (thinkingStreaming || textStreaming) {
      setUseTypewriterForThinking(thinkingStreaming);
      setUseTypewriterForText(textStreaming);
      return;
    }
    const bigChunk = (thinkingDelta > 0 && thinkingDelta >= STREAMING_DELTA_THRESHOLD) ||
      (textDelta > 0 && textDelta >= STREAMING_DELTA_THRESHOLD);
    if (bigChunk) {
      setUseTypewriterForThinking(false);
      setUseTypewriterForText(false);
      return;
    }
    const timer = setTimeout(() => {
      setUseTypewriterForThinking(false);
      setUseTypewriterForText(false);
    }, STABLE_MS);
    return () => clearTimeout(timer);
  }, [isFromModelStream, streamingThinking, streamingDisplayText]);

  const formatToolArgs = (args: unknown): string => {
    const tryParse = (v: unknown): unknown => {
      if (typeof v !== 'string') return v;
      const s = v.trim();
      if (!s) return v;
      try {
        return JSON.parse(s);
      } catch {
        return v;
      }
    };

    let normalized = tryParse(args);
    // 有些工具会把 JSON 再包一层字符串，最多再解两次
    for (let i = 0; i < 2; i += 1) {
      const next = tryParse(normalized);
      if (next === normalized) break;
      normalized = next;
    }

    if (typeof normalized === 'object' && normalized !== null) {
      return `\`\`\`json\n${JSON.stringify(normalized, null, 2)}\n\`\`\``;
    }

    if (typeof normalized === 'string') {
      // 若是普通字符串，尽量把转义换行还原展示
      const unescaped = normalized.replace(/\\n/g, '\n');
      return `\`\`\`json\n${JSON.stringify(unescaped, null, 2)}\n\`\`\``;
    }

    return `\`\`\`json\n${JSON.stringify(normalized, null, 2)}\n\`\`\``;
  };

  const extractToolUse = (content: unknown): { label: string; detail: string } | null => {
    if (!Array.isArray(content)) return null;
    const b = content.find((x: { type?: string }) => x.type === 'tool_use' || x.type === 'toolCall');
    if (!b) return null;
    const name = (b as { name?: string }).name || 'tool';
    const args = (b as { input?: unknown }).input || (b as { arguments?: unknown }).arguments || {};
    return {
      label: name,
      detail: formatToolArgs(args),
    };
  };

  const fmtTime = (ts?: number) =>
    ts ? new Date(ts < 1e12 ? ts * 1000 : ts).toLocaleTimeString(i18n.language === 'zh' ? 'zh-CN' : i18n.language, { hour: '2-digit', minute: '2-digit' }) : '';

  return (
    <div className="chat-page h-full flex flex-col bg-[#0f172a]">
      {/* page-header - design_v2 */}
      <div className="page-header">
        <div className="header-actions flex-1">
          {/* 网关状态 + 心跳健康，下拉框左侧 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1e293b] border border-[#334155] text-xs">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
              title={gatewayStatus.state}
            />
            <span className="text-[#94a3b8]">
              {isConnected ? t('chatView.connected') : gatewayStatus.state}
            </span>
            {health && (
              <span className="text-[#64748b]">
                | {health.ok ? `✓ ${t('chatView.healthy')}` : `✗ ${health.error || t('chatView.error')}`}
                {health.uptime != null ? ` (${Math.round(health.uptime)}s)` : ''}
              </span>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="btn-outline flex items-center gap-2 min-w-[200px] justify-between"
            >
              <span>{getSessionDisplayName(currentSessionKey, sessions, sessionLabels) || t('chatView.selectChat')}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            {dropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 mt-1 w-72 max-h-80 overflow-y-auto bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl z-50"
              >
                {sessions.map((s) => (
                  <div
                    key={s.key}
                    onClick={() => {
                      switchSession(s.key);
                      setDropdownOpen(false);
                      loadHistory();
                    }}
                    className={`px-4 py-3 cursor-pointer text-sm border-b border-[#334155] last:border-0 flex items-center justify-between group ${
                      s.key === currentSessionKey ? 'bg-[#6366f1]/10 text-[#6366f1]' : 'text-[#e2e8f0] hover:bg-[#334155]'
                    }`}
                  >
                    <span>💬 {getSessionDisplayName(s.key, sessions, sessionLabels)}</span>
                    <button
                      type="button"
                      onClick={(e) => handleEditSessionLabel(e, s.key)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[#334155] transition-opacity"
                      title={t('chatView.setAlias')}
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#94a3b8]" />
                    </button>
                  </div>
                ))}
                <div
                  onClick={() => {
                    newSession();
                    setDropdownOpen(false);
                    void runWithSessionLoading(async () => {
                      await loadHistory();
                    }, { scanFromTop: true });
                  }}
                  className="px-4 py-3 cursor-pointer text-sm text-[#6366f1] hover:bg-[#334155]"
                >
                  ＋ {t('chatView.newChat')}
                </div>
              </motion.div>
            )}
          </div>
          <button
            onClick={() => {
              setDropdownOpen(false);
              handleRefresh();
            }}
            className="btn-outline flex items-center justify-center p-2"
            title={t('chatView.refreshSessions')}
            disabled={sessionLoadingAnim}
          >
            <RefreshCw className={`w-4 h-4 ${sessionLoadingAnim ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={toggleThinking}
            className={`btn-outline flex items-center justify-center p-2 ${showThinking ? 'border-[#6366f1] text-[#6366f1]' : ''}`}
            title={showThinking ? t('chatView.hideThinking') : t('chatView.showThinking')}
          >
            {showThinking ? <Lightbulb className="w-4 h-4" /> : <LightbulbOff className="w-4 h-4" />}
          </button>
          <div className="relative" ref={loadHistoryRef}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLoadHistoryOpen(!loadHistoryOpen);
              }}
              className="btn-outline flex items-center justify-center p-2"
              title={t('chatView.loadHistoryData')}
              disabled={loading}
            >
              <History className="w-4 h-4" />
            </button>
            {loadHistoryOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="absolute top-full right-0 mt-1 w-64 max-h-80 overflow-y-auto bg-[#1e293b] border border-[#334155] rounded-lg shadow-xl z-50 p-3"
              >
                <div className="text-xs text-[#94a3b8] mb-2">{t('chatView.loadHistory')}</div>
                <button
                  onClick={() => {
                    void runWithSessionLoading(async () => {
                      await loadHistoryWithOptions({ limit: 500 });
                    }, { scanFromTop: true });
                    setLoadHistoryOpen(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-[#e2e8f0] hover:bg-[#334155] rounded-lg transition-colors"
                >
                  {t('chatView.loadMore500')}
                </button>
                <div className="border-t border-[#334155] my-2" />
                <div className="text-xs text-[#94a3b8] mb-2">{t('chatView.loadToDate')}</div>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={loadHistoryDate}
                    onChange={(e) => setLoadHistoryDate(e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#0f172a] border border-[#334155] rounded-lg text-sm text-[#e2e8f0]"
                  />
                  <button
                    onClick={() => {
                      if (loadHistoryDate) {
                        const [y, m, d] = loadHistoryDate.split('-').map(Number);
                        const endOfDay = new Date(y, m - 1, d, 23, 59, 59, 999).getTime();
                        void runWithSessionLoading(async () => {
                          await loadHistoryWithOptions({ beforeTs: endOfDay, limit: 500 });
                        }, { scanFromTop: true });
                        setLoadHistoryOpen(false);
                        setLoadHistoryDate('');
                      }
                    }}
                    disabled={!loadHistoryDate}
                    className="px-3 py-2 bg-[#6366f1] text-white text-sm rounded-lg hover:bg-[#4f46e5] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('chatView.load')}
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
        {currentSessionKey && (
          <button
            onClick={() => openAliasEdit(currentSessionKey)}
            className="btn-outline flex items-center justify-center p-2"
            title={t('chatView.setCurrentAlias')}
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="flex-shrink-0 px-6 py-2 bg-red-500/20 border-b border-red-500/30 flex items-center justify-between">
          <span className="text-red-300 text-sm">{error}</span>
          <button onClick={clearError} className="text-red-300 hover:text-white text-xs px-2 py-1 rounded hover:bg-red-500/20">
            {t('chatView.close')}
          </button>
        </div>
      )}

      {/* 设置别名弹层 */}
      {aliasEditOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50"
          onClick={() => {
            setAliasEditOpen(false);
            setAliasEditSessionKey(null);
          }}
        >
          <div
            className="w-[360px] rounded-xl bg-[#1e293b] border border-[#334155] shadow-xl p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-sm font-medium text-[#e2e8f0] mb-3">{t('chatView.setSessionAlias')}</div>
            <input
              ref={aliasInputRef}
              type="text"
              value={aliasEditValue}
              onChange={(e) => setAliasEditValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmAliasEdit()}
              placeholder={t('chatView.enterAlias')}
              className="w-full px-3 py-2.5 bg-[#0f172a] border border-[#334155] rounded-lg text-[#e2e8f0] placeholder-[#64748b] focus:border-[#6366f1] focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setAliasEditOpen(false);
                  setAliasEditSessionKey(null);
                }}
                className="px-4 py-2 text-sm text-[#94a3b8] hover:text-[#e2e8f0]"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={confirmAliasEdit}
                className="px-4 py-2 text-sm bg-[#6366f1] text-white rounded-lg hover:bg-[#4f46e5]"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* chat-area - 与输入框同宽 */}
      <div
        ref={chatAreaRef}
        className="chat-area relative"
        onScroll={handleChatAreaScroll}
      >
        <div className="chat-area-inner relative">
          {sessionLoadingAnim && (
            <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
              <motion.div
                className="absolute left-0 right-0 h-10 bg-gradient-to-b from-[#60a5fa]/40 via-[#60a5fa]/15 to-transparent"
                initial={{ y: -40, opacity: 0.9 }}
                animate={{ y: ['0%', '100%'], opacity: [0.9, 0.5, 0] }}
                transition={{ duration: 1.05, repeat: Infinity, ease: 'linear' }}
              />
            </div>
          )}
          {/* 本地会话消息（loadHistory 等）：一律用 MarkdownContent 直接显示，无打字机 */}
          {messages.length > 0 ? (
            messages.map((msg, i) => {
              const rawContent = extractText(msg);
              const images = extractImages(msg);
              const attachedFiles = (msg as RawMessage)._attachedFiles || [];
              const thinking = extractThinking(msg);
              const toolUse = extractToolUse(msg.content);
              const ts = fmtTime(msg.timestamp);

              const textPaths = extractFilePathsFromText(rawContent || '');
              const existingPaths = new Set(attachedFiles.map((f) => f.filePath).filter(Boolean) as string[]);
              const inferredFiles: AttachedFileMeta[] = textPaths
                .filter((p) => !existingPaths.has(p))
                .map((p) => ({
                  fileName: p.split(/[\\/]/).pop() || 'file',
                  mimeType: 'application/octet-stream',
                  fileSize: 0,
                  preview: null,
                  filePath: p,
                }));
              const allFiles = [...attachedFiles, ...inferredFiles];
              const content = allFiles.length > 0 ? stripFilePathsFromText(rawContent || '') : rawContent;

              if (msg.role === 'system') {
                return (
                  <div key={msg.id || i} className="text-center text-[#64748b] text-xs py-2">
                    {content}
                  </div>
                );
              }

              const renderAttachments = (files: AttachedFileMeta[]) => (
                <div className="flex flex-wrap gap-2 mt-2">
                  {files.map((file, fi) => {
                    const isImage = file.mimeType.startsWith('image/');
                    if (isImage && images.length > 0) return null;
                    const canOpen = !!file.filePath;
                    const openFile = async () => {
                      if (!file.filePath) return;
                      try {
                        await invokeIpc('shell:openPath', file.filePath);
                      } catch (e) {
                        console.error(t('chatView.openFileFailed'), e);
                      }
                    };
                    if (isImage) {
                      const previewSrc = file.preview || (file.filePath?.startsWith('/assets/') ? file.filePath : null);
                      return previewSrc ? (
                        <button
                          type="button"
                          key={fi}
                          onClick={() => setLightboxSrc(previewSrc)}
                          className="rounded-lg overflow-hidden border border-[#334155]"
                          title={t('chatView.clickToZoom')}
                        >
                          <img
                            src={previewSrc}
                            alt={file.fileName}
                            className="max-w-[200px] max-h-[200px] object-cover"
                          />
                        </button>
                      ) : (
                        <button
                          type="button"
                          key={fi}
                          onClick={openFile}
                          className="w-24 h-24 rounded-lg border border-[#334155] bg-[#1e293b] flex items-center justify-center"
                        >
                          <File className="w-8 h-8 text-[#64748b]" />
                        </button>
                      );
                    }
                    return (
                      <button
                        type="button"
                        key={fi}
                        onClick={openFile}
                        disabled={!canOpen}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-[#334155] bg-[#1e293b] text-sm text-[#e2e8f0] ${canOpen ? 'cursor-pointer hover:bg-[#334155]' : 'opacity-80'}`}
                        title={file.filePath || file.fileName}
                      >
                        <File className="w-4 h-4 text-[#64748b]" />
                        <span className="truncate max-w-[220px] underline decoration-dotted underline-offset-2">{file.fileName}</span>
                      </button>
                    );
                  })}
                </div>
              );

              const renderImages = () =>
                images.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {images.map((img, ii) => {
                      const src = imageSrc(img);
                      if (!src) return null;
                      return (
                        <button
                          key={ii}
                          type="button"
                          onClick={() => setLightboxSrc(src)}
                          className="rounded-lg overflow-hidden border border-[#334155]"
                          title={t('chatView.clickToZoom')}
                        >
                          <img
                            src={src}
                            alt=""
                            className="max-w-[200px] max-h-[200px] object-cover"
                          />
                        </button>
                      );
                    })}
                  </div>
                ) : null;

              if (msg.role === 'user') {
                return (
                  <div
                    key={msg.id || i}
                    className="msg user"
                  >
                    <div className="msg-avatar user">T</div>
                    <div className="msg-body">
                      <div className="msg-meta">
                        <span className="msg-time">{ts}</span>
                        <span className="msg-name">{t('chatView.me')}</span>
                      </div>
                      {renderImages()}
                      {allFiles.length > 0 && renderAttachments(allFiles)}
                      {typeof content === 'string' && content.trim() && (
                        <div className="msg-bubble">{content}</div>
                      )}
                    </div>
                  </div>
                );
              }

              if (msg.role === 'assistant') {
                const hasVisibleContent = !!((typeof content === 'string' ? content.trim() : content) || images.length > 0 || allFiles.length > 0);
                const hasThinkingOrTool = !!(thinking || toolUse);
                const wouldShowSomething = hasVisibleContent || (showThinking && hasThinkingOrTool);
                if (!wouldShowSomething) return null;
                const isLastAssistantDuringSend = sending && i === messages.length - 1;

                return (
                  <div
                    key={msg.id || i}
                    className="msg ai"
                  >
                    <div className="msg-avatar ai">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="msg-body">
                      <div className="msg-meta">
                        <span className="msg-name">{t('chatView.assistantName')}</span>
                        <span className="msg-time">{ts}</span>
                      </div>
                      {/* Thinking 无气泡包裹，可开关，默认展开 */}
                      {showThinking && thinking && (
                        <div className="msg-block-thinking">
                          <CollapsibleBlock
                            icon={<Lightbulb className="w-3 h-3 text-blue-500" />}
                            label="Thinking"
                            defaultOpen
                          >
                            <MarkdownContent content={thinking} />
                          </CollapsibleBlock>
                        </div>
                      )}
                      {/* 执行命令无气泡包裹，隐藏思考时一并隐藏 */}
                      {showThinking && toolUse && (
                        <div className="msg-block-tool">
                          <CollapsibleBlock icon={<Wrench className="w-3 h-3 text-green-500" />} label={toolUse.label}>
                            <MarkdownContent content={toolUse.detail} />
                          </CollapsibleBlock>
                        </div>
                      )}
                      {allFiles.length > 0 && renderAttachments(allFiles)}
                      {(content || images.length > 0) && (
                        <div className="msg-bubble">
                          {content && (isLastAssistantDuringSend
                            ? <TypewriterMarkdown content={content} animate isStreaming={sending} />
                            : <MarkdownContent content={content} />)}
                          {renderImages()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
              return null;
            })
          ) : (
            <div className="text-center text-[#64748b] py-20">
              <div className="text-4xl mb-4">💬</div>
              <div>{t('chatView.startNewChat')}</div>
            </div>
          )}

          {/* 正在加载 - 三圆点 */}
          {sending && !streamingDisplayText && !streamingThinking && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="msg ai">
              <div className="msg-avatar ai">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="msg-body">
                <div className="msg-meta">
                  <span className="msg-name">{t('chatView.assistantName')}</span>
                  <span className="msg-time">{fmtTime(Date.now() / 1000)}</span>
                </div>
                <div className="msg-bubble">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* 模型实时流式返回：仅此处用 TypewriterMarkdown，来源 = 模型对话 */}
          {isFromModelStream && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="msg ai"
            >
              <div className="msg-avatar ai">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="msg-body">
                <div className="msg-meta">
                  <span className="msg-name">{t('chatView.assistantName')}</span>
                  <span className="msg-time">{fmtTime(Date.now() / 1000)}</span>
                </div>
                {showThinking && streamingThinking && (
                  <div className="msg-block-thinking">
                    <CollapsibleBlock icon={<Lightbulb className="w-3 h-3 text-blue-500" />} label="Thinking" defaultOpen>
                      {useTypewriterForThinking ? (
                        <TypewriterMarkdown
                          content={streamingThinking}
                          plainText
                          animate
                          isStreaming={sending}
                          onComplete={() => setThinkingAnimDone(true)}
                        />
                      ) : (
                        <MarkdownContent content={streamingThinking} />
                      )}
                    </CollapsibleBlock>
                  </div>
                )}
                {streamingDisplayText && thinkingAnimDone && (
                  <div className="msg-bubble">
                    {useTypewriterForText ? (
                      <TypewriterMarkdown content={streamingDisplayText} isStreaming={sending} animate />
                    ) : (
                      <MarkdownContent content={streamingDisplayText} />
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* {t('chatView.backToBottom')} / 新消息提示 */}
      {(showBackToBottom || showNewMessageHint) && (
        <div className="chat-back-to-bottom-wrap">
          {showNewMessageHint && (
            <button
              onClick={() => {
                setShowNewMessageHint(false);
                scrollToBottom();
              }}
              className="chat-back-to-bottom mb-2"
              title={t('chatView.newMessage')}
            >
              <span className="mr-1">🔔</span>
              {t('chatView.newMessage')}
            </button>
          )}
          {showBackToBottom && (
            <button
              onClick={scrollToBottom}
              className="chat-back-to-bottom"
              title={t('chatView.backToBottom')}
            >
              <ChevronsDown className="w-5 h-5" />
              {t('chatView.backToBottom')}
            </button>
          )}
        </div>
      )}

      {/* 附件预览 - 显示在输入框面板上方 */}
      {viewAttachments.length > 0 && (
        <div className="flex-shrink-0 px-[28px]">
          <div className="chat-input-bar-inner">
            <div className="flex gap-2 flex-wrap items-start py-2">
              {viewAttachments.map((att) => (
                <AttachmentPreview
                  key={att.id}
                  attachment={att}
                  onRemove={() => removeAttachmentRef.current(att.id)}
                  variant="chat-page"
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* chat-input-bar - 支持上传、粘贴图片和文件，缓存到临时目录后传路径给 OpenClaw */}
      <div className="chat-input-bar">
        <div className="chat-input-bar-inner">
          <ChatInput
            variant="chat-page"
            onAttachmentsChange={handleAttachmentsChange}
            onSend={(text, attachments, _targetAgentId) => {
              clearError();
              const att = attachments?.map((a) => ({
                fileName: a.fileName,
                mimeType: a.mimeType,
                fileSize: a.fileSize,
                stagedPath: a.stagedPath,
                preview: a.preview,
              }));
              void sendMessage(text, att);
            }}
            onStop={abortRun}
            disabled={!isConnected}
            sending={sending}
            isEmpty={messages.length === 0}
          />
        </div>
      </div>

      {/* status-bar - design_v2 */}
      <div className="status-bar">
        <div className={`status-dot ${isConnected ? 'connected' : 'disconnected'}`} />
        <span>
          gateway {isConnected ? t('chatView.connected') : t('chatView.disconnected')} | port: {gatewayStatus.port ?? 18789}
          {gatewayStatus.pid != null ? ` | pid: ${gatewayStatus.pid}` : ''}
        </span>
      </div>

      {/* 图片放大预览 */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-6"
          onClick={() => setLightboxSrc(null)}
        >
          <img
            src={lightboxSrc}
            alt="preview"
            className="max-w-[95vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default ChatView;
