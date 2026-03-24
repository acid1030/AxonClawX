/**
 * Chat Input Component
 * Textarea with send button and universal file upload support.
 * Enter to send, Shift+Enter for new line.
 * Supports: native file picker, clipboard paste, drag & drop.
 * Files are staged to disk via IPC — only lightweight path references
 * are sent with the message (no base64 over WebSocket).
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SendHorizontal, Square, X, Paperclip, FileText, Film, Music, FileArchive, File, Loader2, AtSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { hostApiFetch } from '@/lib/host-api';
import { invokeIpc } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useGatewayStore } from '@/stores/gateway';
import { useAgentsStore } from '@/stores/agents';
import { useChatStore } from '@/stores/chat';
import type { AgentSummary } from '@/types/agent';
import { useTranslation } from 'react-i18next';

// ── Types ────────────────────────────────────────────────────────

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
  onSend: (text: string, attachments?: FileAttachment[], targetAgentId?: string | null) => void;
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

export function ChatInput({ onSend, onStop, disabled = false, sending = false, isEmpty = false, variant = 'default', onAttachmentsChange }: ChatInputProps) {
  const { t } = useTranslation('chat');
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const [targetAgentId, setTargetAgentId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);
  const gatewayStatus = useGatewayStore((s) => s.status);
  const agents = useAgentsStore((s) => s.agents) ?? [];
  const currentAgentId = useChatStore((s) => s.currentAgentId);
  const currentAgentName = useMemo(
    () => agents.find((agent) => agent.id === currentAgentId)?.name ?? currentAgentId,
    [agents, currentAgentId],
  );
  const mentionableAgents = useMemo(
    () => agents.filter((agent) => agent.id !== currentAgentId),
    [agents, currentAgentId],
  );
  const selectedTarget = useMemo(
    () => agents.find((agent) => agent.id === targetAgentId) ?? null,
    [agents, targetAgentId],
  );
  const showAgentPicker = variant === 'default' && mentionableAgents.length > 0;
  const isChatPage = variant === 'chat-page';

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

  useEffect(() => {
    if (!targetAgentId) return;
    if (targetAgentId === currentAgentId) {
      setTargetAgentId(null);
      setPickerOpen(false);
      return;
    }
    if (!agents.some((agent) => agent.id === targetAgentId)) {
      setTargetAgentId(null);
      setPickerOpen(false);
    }
  }, [agents, currentAgentId, targetAgentId]);

  useEffect(() => {
    if (!pickerOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [pickerOpen]);

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
  const canSend = (input.trim() || attachments.length > 0) && allReady && !disabled && !sending;
  const canStop = sending && !disabled && !!onStop;

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
    onSend(textToSend, attachmentsToSend, targetAgentId);
    setTargetAgentId(null);
    setPickerOpen(false);
  }, [input, attachments, canSend, onSend, targetAgentId]);

  const handleStop = useCallback(() => {
    if (!canStop) return;
    onStop?.();
  }, [canStop, onStop]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !input && targetAgentId) {
        setTargetAgentId(null);
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey) {
        const nativeEvent = e.nativeEvent as KeyboardEvent;
        if (isComposingRef.current || nativeEvent.isComposing || nativeEvent.keyCode === 229) {
          return;
        }
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend, input, targetAgentId],
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
            "relative rounded-2xl border p-3 transition-all",
            isChatPage
              ? "bg-[#1e293b] border-[#334155] focus-within:border-[#6366f1]"
              : "bg-white dark:bg-card shadow-sm",
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
          {selectedTarget && (
            <div className="px-2.5 pt-2 pb-1">
              <button
                type="button"
                onClick={() => setTargetAgentId(null)}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[13px] font-medium text-foreground transition-colors hover:bg-primary/10"
                title={t('composer.clearTarget')}
              >
                <span>{t('composer.targetChip', { agent: selectedTarget.name })}</span>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>
          )}

          <div className="flex items-end gap-1.5">
            {/* Attach Button */}
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "shrink-0 h-10 w-10 rounded-full transition-colors",
                isChatPage
                  ? "text-[#94a3b8] hover:bg-[#6366f1]/10 hover:text-[#6366f1]"
                  : "text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground"
              )}
              onClick={pickFiles}
              disabled={disabled || sending}
              title={t('composer.attachFiles')}
            >
              <Paperclip className="h-4 w-4" />
            </Button>

            {showAgentPicker && (
              <div ref={pickerRef} className="relative shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-10 w-10 rounded-full text-muted-foreground hover:bg-black/5 dark:hover:bg-white/10 hover:text-foreground transition-colors',
                    (pickerOpen || selectedTarget) && 'bg-primary/10 text-primary hover:bg-primary/20'
                  )}
                  onClick={() => setPickerOpen((open) => !open)}
                  disabled={disabled || sending}
                  title={t('composer.pickAgent')}
                >
                  <AtSign className="h-4 w-4" />
                </Button>
                {pickerOpen && (
                  <div className="absolute left-0 bottom-full z-20 mb-2 w-72 overflow-hidden rounded-2xl border border-black/10 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-card">
                    <div className="px-3 py-2 text-[11px] font-medium text-muted-foreground/80">
                      {t('composer.agentPickerTitle', { currentAgent: currentAgentName })}
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {mentionableAgents.map((agent) => (
                        <AgentPickerItem
                          key={agent.id}
                          agent={agent}
                          selected={agent.id === targetAgentId}
                          onSelect={() => {
                            setTargetAgentId(agent.id);
                            setPickerOpen(false);
                            textareaRef.current?.focus();
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                    ? "min-h-[24px] max-h-[192px] text-[14px] text-[#f8fafc] placeholder:text-[#64748b]"
                    : "min-h-[40px] max-h-[200px] text-[15px] placeholder:text-muted-foreground/60"
                )}
                rows={1}
              />
            </div>

            {/* Send Button */}
            <Button
              onClick={sending ? handleStop : handleSend}
              disabled={sending ? !canStop : !canSend}
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
              title={sending ? t('composer.stop') : t('composer.send')}
            >
              {sending ? (
                <Square className="h-4 w-4" fill="currentColor" />
              ) : (
                <SendHorizontal className="h-[18px] w-[18px]" strokeWidth={2} />
              )}
            </Button>
          </div>
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

function AgentPickerItem({
  agent,
  selected,
  onSelect,
}: {
  agent: AgentSummary;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'flex w-full flex-col items-start rounded-xl px-3 py-2 text-left transition-colors',
        selected ? 'bg-primary/10 text-foreground' : 'hover:bg-black/5 dark:hover:bg-white/5'
      )}
    >
      <span className="text-[14px] font-medium text-foreground">{agent.name}</span>
      <span className="text-[11px] text-muted-foreground">
        {agent.modelDisplay}
      </span>
    </button>
  );
}
