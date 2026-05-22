import { hostApiFetch } from '@/lib/host-api';
import { getMessageText, hasNonToolAssistantContent, isToolOnlyMessage, isToolResultRole } from './message-content';
import { toMs } from './time';
import type { AttachedFileMeta, ContentBlock, RawMessage } from './types';

const IMAGE_CACHE_KEY = 'clawx:image-cache';
const IMAGE_CACHE_MAX = 100;

function loadImageCache(): Map<string, AttachedFileMeta> {
  try {
    const raw = localStorage.getItem(IMAGE_CACHE_KEY);
    if (raw) {
      const entries = JSON.parse(raw) as Array<[string, AttachedFileMeta]>;
      return new Map(entries);
    }
  } catch {
    // ignore parse errors
  }
  return new Map();
}

function saveImageCache(cache: Map<string, AttachedFileMeta>): void {
  try {
    const entries = Array.from(cache.entries());
    const trimmed = entries.length > IMAGE_CACHE_MAX
      ? entries.slice(entries.length - IMAGE_CACHE_MAX)
      : entries;
    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(trimmed));
  } catch {
    // ignore quota errors
  }
}

const imageCache = loadImageCache();

export function extractMediaRefs(text: string): Array<{ filePath: string; mimeType: string }> {
  const refs: Array<{ filePath: string; mimeType: string }> = [];
  const regex = /\[media attached:\s*([^\s(]+)\s*\(([^)]+)\)\s*\|[^\]]*\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    refs.push({ filePath: match[1], mimeType: match[2] });
  }
  return refs;
}

function mimeFromExtension(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    avif: 'image/avif',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    txt: 'text/plain',
    csv: 'text/csv',
    md: 'text/markdown',
    rtf: 'application/rtf',
    epub: 'application/epub+zip',
    zip: 'application/zip',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    rar: 'application/vnd.rar',
    '7z': 'application/x-7z-compressed',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    aac: 'audio/aac',
    flac: 'audio/flac',
    m4a: 'audio/mp4',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    avi: 'video/x-msvideo',
    mkv: 'video/x-matroska',
    webm: 'video/webm',
    m4v: 'video/mp4',
  };
  return map[ext] || 'application/octet-stream';
}

export function extractRawFilePaths(text: string): Array<{ filePath: string; mimeType: string }> {
  const refs: Array<{ filePath: string; mimeType: string }> = [];
  const seen = new Set<string>();
  const exts = 'png|jpe?g|gif|webp|bmp|avif|svg|pdf|docx?|xlsx?|pptx?|txt|csv|md|rtf|epub|zip|tar|gz|rar|7z|mp3|wav|ogg|aac|flac|m4a|mp4|mov|avi|mkv|webm|m4v';
  const unixRegex = new RegExp(`(?<![\\w./:])((?:\\/|~\\/)[^\\s\\n"'()\\[\\],<>]*?\\.(?:${exts}))`, 'gi');
  const winRegex = new RegExp(`(?<![\\w])([A-Za-z]:\\\\[^\\s\\n"'()\\[\\],<>]*?\\.(?:${exts}))`, 'gi');
  for (const regex of [unixRegex, winRegex]) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const p = match[1];
      if (p && !seen.has(p)) {
        seen.add(p);
        refs.push({ filePath: p, mimeType: mimeFromExtension(p) });
      }
    }
  }
  return refs;
}

function isImageRef(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const raw = value.trim();
  if (!raw) return false;
  if (raw.startsWith('data:image/')) return true;
  if (/^https?:\/\/.+\.(png|jpe?g|webp|gif|svg|avif|bmp)([?#].*)?$/i.test(raw)) return true;
  if (/^(\/|~\/|[A-Za-z]:\\).+\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(raw)) return true;
  return false;
}

function mimeFromImageRef(value: string, fallback = 'image/png'): string {
  const clean = value.split(/[?#]/)[0].toLowerCase();
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  if (clean.endsWith('.svg')) return 'image/svg+xml';
  if (clean.endsWith('.avif')) return 'image/avif';
  if (clean.endsWith('.bmp')) return 'image/bmp';
  if (clean.endsWith('.png')) return 'image/png';
  return fallback;
}

function makeImageFile(ref: string, mimeHint?: string): AttachedFileMeta | null {
  const raw = ref.trim();
  if (!raw) return null;
  const mimeType = mimeHint || mimeFromImageRef(raw);
  if (raw.startsWith('data:image/')) {
    const match = raw.match(/^data:([^;]+);base64,/i);
    return { fileName: 'image', mimeType: match?.[1] || mimeType, fileSize: 0, preview: raw };
  }
  if (/^https?:\/\//i.test(raw)) {
    return {
      fileName: raw.split(/[/?#]/).filter(Boolean).pop() || 'image',
      mimeType,
      fileSize: 0,
      preview: raw,
    };
  }
  return {
    fileName: raw.split(/[\\/]/).pop() || 'image',
    mimeType,
    fileSize: 0,
    preview: null,
    filePath: raw,
  };
}

function collectImagesAsAttachedFiles(value: unknown, files: AttachedFileMeta[], depth = 0): void {
  if (depth > 6 || value == null) return;
  if (typeof value === 'string') {
    const markdownImage = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = markdownImage.exec(value)) !== null) {
      if (isImageRef(match[1])) {
        const file = makeImageFile(match[1]);
        if (file) files.push(file);
      }
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectImagesAsAttachedFiles(item, files, depth + 1);
    return;
  }
  if (typeof value !== 'object') return;

  const record = value as Record<string, unknown>;
  const type = String(record.type || '').toLowerCase();
  if (type === 'image') {
    const source = record.source && typeof record.source === 'object'
      ? record.source as Record<string, unknown>
      : null;
    const sourceType = String(source?.type || '').toLowerCase();
    const sourceMime = typeof source?.media_type === 'string' ? source.media_type : undefined;
    if (sourceType === 'base64' && typeof source?.data === 'string') {
      files.push({
        fileName: 'image',
        mimeType: sourceMime || 'image/png',
        fileSize: 0,
        preview: `data:${sourceMime || 'image/png'};base64,${source.data}`,
      });
    }
    for (const key of ['url', 'path', 'filePath', 'file_path']) {
      const ref = source?.[key];
      if (isImageRef(ref)) {
        const file = makeImageFile(ref, sourceMime);
        if (file) files.push(file);
      }
    }
    const mimeType = typeof record.mimeType === 'string' ? record.mimeType : typeof record.mime_type === 'string' ? record.mime_type : 'image/png';
    if (typeof record.data === 'string') {
      if (isImageRef(record.data)) {
        const file = makeImageFile(record.data, mimeType);
        if (file) files.push(file);
      } else {
        files.push({
          fileName: 'image',
          mimeType,
          fileSize: 0,
          preview: `data:${mimeType};base64,${record.data}`,
        });
      }
    }
  }

  for (const key of ['url', 'imageUrl', 'image_url', 'outputUrl', 'output_url', 'preview', 'src']) {
    const ref = record[key];
    if (isImageRef(ref)) {
      const file = makeImageFile(ref);
      if (file) files.push(file);
    }
  }
  for (const key of ['filePath', 'file_path', 'path', 'outputPath', 'output_path', 'file']) {
    const ref = record[key];
    if (isImageRef(ref)) {
      const file = makeImageFile(ref);
      if (file) files.push(file);
    }
  }
  for (const key of ['content', 'images', 'artifacts', 'files', 'outputs', 'result', 'results']) {
    if (key in record) collectImagesAsAttachedFiles(record[key], files, depth + 1);
  }
}

export function extractImagesAsAttachedFiles(content: unknown): AttachedFileMeta[] {
  const files: AttachedFileMeta[] = [];
  collectImagesAsAttachedFiles(content, files);
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = file.filePath || file.preview || `${file.fileName}:${file.mimeType}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function makeAttachedFile(ref: { filePath: string; mimeType: string }): AttachedFileMeta {
  const cached = imageCache.get(ref.filePath);
  if (cached) return { ...cached, filePath: ref.filePath };
  const fileName = ref.filePath.split(/[\\/]/).pop() || 'file';
  return { fileName, mimeType: ref.mimeType, fileSize: 0, preview: null, filePath: ref.filePath };
}

export function getToolCallFilePath(msg: RawMessage, toolCallId: string): string | undefined {
  if (!toolCallId) return undefined;

  const content = msg.content;
  if (Array.isArray(content)) {
    for (const block of content as ContentBlock[]) {
      if ((block.type === 'tool_use' || block.type === 'toolCall') && block.id === toolCallId) {
        const args = (block.input ?? block.arguments) as Record<string, unknown> | undefined;
        if (args) {
          const fp = args.file_path ?? args.filePath ?? args.path ?? args.file;
          if (typeof fp === 'string') return fp;
        }
      }
    }
  }

  const msgAny = msg as unknown as Record<string, unknown>;
  const toolCalls = msgAny.tool_calls ?? msgAny.toolCalls;
  if (Array.isArray(toolCalls)) {
    for (const tc of toolCalls as Array<Record<string, unknown>>) {
      if (tc.id !== toolCallId) continue;
      const fn = (tc.function ?? tc) as Record<string, unknown>;
      let args: Record<string, unknown> | undefined;
      try {
        args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : (fn.arguments ?? fn.input) as Record<string, unknown>;
      } catch {
        // ignore malformed tool arguments
      }
      if (args) {
        const fp = args.file_path ?? args.filePath ?? args.path ?? args.file;
        if (typeof fp === 'string') return fp;
      }
    }
  }

  return undefined;
}

function collectToolCallPaths(msg: RawMessage, paths: Map<string, string>): void {
  const content = msg.content;
  if (Array.isArray(content)) {
    for (const block of content as ContentBlock[]) {
      if ((block.type === 'tool_use' || block.type === 'toolCall') && block.id) {
        const args = (block.input ?? block.arguments) as Record<string, unknown> | undefined;
        if (args) {
          const fp = args.file_path ?? args.filePath ?? args.path ?? args.file;
          if (typeof fp === 'string') paths.set(block.id, fp);
        }
      }
    }
  }
  const msgAny = msg as unknown as Record<string, unknown>;
  const toolCalls = msgAny.tool_calls ?? msgAny.toolCalls;
  if (Array.isArray(toolCalls)) {
    for (const tc of toolCalls as Array<Record<string, unknown>>) {
      const id = typeof tc.id === 'string' ? tc.id : '';
      if (!id) continue;
      const fn = (tc.function ?? tc) as Record<string, unknown>;
      let args: Record<string, unknown> | undefined;
      try {
        args = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : (fn.arguments ?? fn.input) as Record<string, unknown>;
      } catch {
        // ignore malformed tool arguments
      }
      if (args) {
        const fp = args.file_path ?? args.filePath ?? args.path ?? args.file;
        if (typeof fp === 'string') paths.set(id, fp);
      }
    }
  }
}

export function enrichWithToolResultFiles(messages: RawMessage[]): RawMessage[] {
  const pending: AttachedFileMeta[] = [];
  const toolCallPaths = new Map<string, string>();

  return messages.map((msg) => {
    if (msg.role === 'assistant') {
      collectToolCallPaths(msg, toolCallPaths);
    }

    if (isToolResultRole(msg.role)) {
      const matchedPath = msg.toolCallId ? toolCallPaths.get(msg.toolCallId) : undefined;
      const imageFiles = extractImagesAsAttachedFiles(msg.content);
      if (matchedPath) {
        for (const file of imageFiles) {
          if (!file.filePath) {
            file.filePath = matchedPath;
            file.fileName = matchedPath.split(/[\\/]/).pop() || 'image';
          }
        }
      }
      pending.push(...imageFiles);

      const text = getMessageText(msg.content);
      if (text) {
        const mediaRefs = extractMediaRefs(text);
        const mediaRefPaths = new Set(mediaRefs.map((ref) => ref.filePath));
        for (const ref of mediaRefs) pending.push(makeAttachedFile(ref));
        for (const ref of extractRawFilePaths(text)) {
          if (!mediaRefPaths.has(ref.filePath)) pending.push(makeAttachedFile(ref));
        }
      }

      return msg;
    }

    if (msg.role === 'assistant' && pending.length > 0) {
      const toAttach = pending.splice(0);
      const existingPaths = new Set((msg._attachedFiles || []).map((file) => file.filePath).filter(Boolean));
      const newFiles = toAttach.filter((file) => !file.filePath || !existingPaths.has(file.filePath));
      if (newFiles.length === 0) return msg;
      return { ...msg, _attachedFiles: [...(msg._attachedFiles || []), ...newFiles] };
    }

    return msg;
  });
}

export function enrichWithCachedImages(messages: RawMessage[]): RawMessage[] {
  return messages.map((msg, idx) => {
    if (msg.role !== 'user' && msg.role !== 'assistant') return msg;
    const text = getMessageText(msg.content);

    if (msg.role === 'user' && msg._attachedFiles) return msg;

    const mediaRefs = extractMediaRefs(text);
    const mediaRefPaths = new Set(mediaRefs.map((ref) => ref.filePath));

    let rawRefs: Array<{ filePath: string; mimeType: string }> = [];
    if (msg.role === 'assistant' && !isToolOnlyMessage(msg)) {
      rawRefs = extractRawFilePaths(text).filter((ref) => !mediaRefPaths.has(ref.filePath));
      const seenPaths = new Set(rawRefs.map((ref) => ref.filePath));
      for (let i = idx - 1; i >= Math.max(0, idx - 5); i--) {
        const prev = messages[i];
        if (!prev) break;
        if (prev.role === 'user') {
          const prevText = getMessageText(prev.content);
          for (const ref of extractRawFilePaths(prevText)) {
            if (!mediaRefPaths.has(ref.filePath) && !seenPaths.has(ref.filePath)) {
              seenPaths.add(ref.filePath);
              rawRefs.push(ref);
            }
          }
          break;
        }
      }
    }

    const allRefs = [...mediaRefs, ...rawRefs];
    const existingPaths = new Set((msg._attachedFiles || []).map((file) => file.filePath).filter(Boolean));
    const newRefs = allRefs.filter((ref) => !existingPaths.has(ref.filePath));
    if (newRefs.length === 0 && !msg._attachedFiles) return msg;

    const newFiles: AttachedFileMeta[] = newRefs.map((ref) => makeAttachedFile(ref));
    const files = [...(msg._attachedFiles || []), ...newFiles];
    return { ...msg, _attachedFiles: files };
  });
}

export async function loadMissingPreviews(messages: RawMessage[]): Promise<boolean> {
  const needPreview: Array<{ filePath: string; mimeType: string }> = [];
  const seenPaths = new Set<string>();

  for (const msg of messages) {
    if (!msg._attachedFiles) continue;

    for (const file of msg._attachedFiles) {
      const filePath = file.filePath;
      if (!filePath || seenPaths.has(filePath)) continue;
      const needsLoad = file.mimeType.startsWith('image/')
        ? !file.preview
        : file.fileSize === 0;
      if (needsLoad) {
        seenPaths.add(filePath);
        needPreview.push({ filePath, mimeType: file.mimeType });
      }
    }

    if (msg.role === 'user') {
      const text = getMessageText(msg.content);
      const refs = extractMediaRefs(text);
      for (let i = 0; i < refs.length; i++) {
        const file = msg._attachedFiles[i];
        const ref = refs[i];
        if (!file || !ref || seenPaths.has(ref.filePath)) continue;
        const needsLoad = ref.mimeType.startsWith('image/') ? !file.preview : file.fileSize === 0;
        if (needsLoad) {
          seenPaths.add(ref.filePath);
          needPreview.push(ref);
        }
      }
    }
  }

  if (needPreview.length === 0) return false;

  try {
    const thumbnails = await hostApiFetch<Record<string, { preview: string | null; fileSize: number }>>(
      '/api/files/thumbnails',
      {
        method: 'POST',
        body: JSON.stringify({ paths: needPreview }),
      },
    );

    let updated = false;
    for (const msg of messages) {
      if (!msg._attachedFiles) continue;

      for (const file of msg._attachedFiles) {
        const filePath = file.filePath;
        if (!filePath) continue;
        const thumb = thumbnails[filePath];
        if (thumb && (thumb.preview || thumb.fileSize)) {
          if (thumb.preview) file.preview = thumb.preview;
          if (thumb.fileSize) file.fileSize = thumb.fileSize;
          imageCache.set(filePath, { ...file });
          updated = true;
        }
      }

      if (msg.role === 'user') {
        const text = getMessageText(msg.content);
        const refs = extractMediaRefs(text);
        for (let i = 0; i < refs.length; i++) {
          const file = msg._attachedFiles[i];
          const ref = refs[i];
          if (!file || !ref || file.filePath) continue;
          const thumb = thumbnails[ref.filePath];
          if (thumb && (thumb.preview || thumb.fileSize)) {
            if (thumb.preview) file.preview = thumb.preview;
            if (thumb.fileSize) file.fileSize = thumb.fileSize;
            imageCache.set(ref.filePath, { ...file });
            updated = true;
          }
        }
      }
    }
    if (updated) saveImageCache(imageCache);
    return updated;
  } catch (err) {
    console.warn('[loadMissingPreviews] Failed:', err);
    return false;
  }
}

export function cacheOutgoingAttachments(
  attachments: Array<{ fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }> | undefined,
): void {
  if (!attachments?.length) return;
  for (const attachment of attachments) {
    imageCache.set(attachment.stagedPath, {
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
      preview: attachment.preview,
    });
  }
  saveImageCache(imageCache);
}

export function hasAssistantMessageAfter(messages: RawMessage[], timestampMs: number | null | undefined): boolean {
  if (!timestampMs) return false;
  return messages.some((message) => {
    if (message.role !== 'assistant') return false;
    if (!hasNonToolAssistantContent(message)) return false;
    const msgTime = typeof message.timestamp === 'number' ? toMs(message.timestamp) : 0;
    return msgTime >= timestampMs - 1000;
  });
}
