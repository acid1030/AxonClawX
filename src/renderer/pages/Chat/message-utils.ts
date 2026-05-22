/**
 * Message content extraction helpers
 * Ported from OpenClaw's message-extract.ts to handle the various
 * message content formats returned by the Gateway.
 */
import type { RawMessage, ContentBlock } from '@/stores/chat';

/** OpenClaw transcript placeholder when a stream dies before assistant text (see compaction-successor-transcript). */
export const OPENCLAW_STREAM_ERROR_PLACEHOLDER = '[assistant turn failed before producing content]';

/**
 * Clean Gateway metadata from user message text for display.
 * Strips: [media attached: ... | ...], [message_id: ...],
 * and the timestamp prefix [Day Date Time Timezone].
 */
function cleanUserText(text: string): string {
  return text
    // Remove [media attached: path (mime) | path] references
    .replace(/\s*\[media attached:[^\]]*\]/g, '')
    // Remove [message_id: uuid]
    .replace(/\s*\[message_id:\s*[^\]]+\]/g, '')
    // Remove Gateway-injected "Conversation info (untrusted metadata): ```json...```" block
    .replace(/^Conversation info\s*\([^)]*\):\s*```[a-z]*\n[\s\S]*?```\s*/i, '')
    // Fallback: remove "Conversation info (...): {...}" without code block wrapper
    .replace(/^Conversation info\s*\([^)]*\):\s*\{[\s\S]*?\}\s*/i, '')
    // Remove Gateway timestamp prefix like [Fri 2026-02-13 22:39 GMT+8]
    .replace(/^\[(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}\s+[^\]]+\]\s*/i, '')
    .trim();
}

/**
 * Extract displayable text from a message's content field.
 * Handles both string content and array-of-blocks content.
 * For user messages, strips Gateway-injected metadata.
 */
export function extractText(message: RawMessage | unknown): string {
  if (!message || typeof message !== 'object') return '';
  const msg = message as Record<string, unknown>;
  const content = msg.content;
  const isUser = msg.role === 'user';

  let result = '';

  if (typeof content === 'string') {
    result = content.trim().length > 0 ? content : '';
  } else if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content as ContentBlock[]) {
      if (block.type === 'text' && block.text) {
        if (block.text.trim().length > 0) {
          parts.push(block.text);
        }
      }
    }
    const combined = parts.join('\n\n');
    result = combined.trim().length > 0 ? combined : '';
  } else if (typeof msg.text === 'string') {
    // Fallback: try .text field
    result = msg.text.trim().length > 0 ? msg.text : '';
  }

  // Strip Gateway metadata from user messages for clean display
  if (isUser && result) {
    result = cleanUserText(result);
  }

  // Assistant: OpenClaw may record a generic placeholder plus top-level errorMessage
  if (!isUser && msg.role === 'assistant') {
    const errRaw = msg.errorMessage ?? msg.error_message;
    const err = typeof errRaw === 'string' ? errRaw.trim() : '';
    const trimmed = result.trim();
    if (err) {
      if (!trimmed || trimmed === OPENCLAW_STREAM_ERROR_PLACEHOLDER) {
        return `本轮回复未生成正文。\n\n原因：${err}`;
      }
      if (trimmed.includes(OPENCLAW_STREAM_ERROR_PLACEHOLDER)) {
        return trimmed.replace(
          OPENCLAW_STREAM_ERROR_PLACEHOLDER,
          `本轮回复未生成正文（原因见下）。\n\n${err}`,
        );
      }
    } else if (trimmed === OPENCLAW_STREAM_ERROR_PLACEHOLDER) {
      return `${OPENCLAW_STREAM_ERROR_PLACEHOLDER}\n\n未收到详细错误信息，请查看网关日志、升级 OpenClaw，或新建会话后重试。`;
    }
  }

  return result;
}

/**
 * Extract thinking/reasoning content from a message.
 * Returns null if no thinking content found.
 * Supports: content blocks (type: 'thinking'), and top-level thinking/reasoning/thought fields.
 */
export function extractThinking(message: RawMessage | unknown): string | null {
  if (!message || typeof message !== 'object') return null;
  const msg = message as Record<string, unknown>;

  // Path 1: content array with thinking blocks
  const content = msg.content;
  if (Array.isArray(content)) {
    const parts: string[] = [];
    for (const block of content as ContentBlock[]) {
      if (block.type === 'thinking' && block.thinking) {
        const cleaned = block.thinking.trim();
        if (cleaned) parts.push(cleaned);
      }
    }
    const combined = parts.join('\n\n').trim();
    if (combined) return combined;
  }

  // Path 2: top-level thinking/reasoning/thought (some APIs use these)
  const topLevel = (msg.thinking ?? msg.reasoning ?? msg.thought) as string | undefined;
  if (typeof topLevel === 'string' && topLevel.trim()) return topLevel.trim();

  return null;
}

/**
 * Extract media file references from Gateway-formatted user message text.
 * Returns array of { filePath, mimeType } from [media attached: path (mime) | path] patterns.
 */
export function extractMediaRefs(message: RawMessage | unknown): Array<{ filePath: string; mimeType: string }> {
  if (!message || typeof message !== 'object') return [];
  const msg = message as Record<string, unknown>;
  if (msg.role !== 'user') return [];
  const content = msg.content;

  let text = '';
  if (typeof content === 'string') {
    text = content;
  } else if (Array.isArray(content)) {
    text = (content as ContentBlock[])
      .filter(b => b.type === 'text' && b.text)
      .map(b => b.text!)
      .join('\n');
  }

  const refs: Array<{ filePath: string; mimeType: string }> = [];
  const regex = /\[media attached:\s*([^\s(]+)\s*\(([^)]+)\)\s*\|[^\]]*\]/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    refs.push({ filePath: match[1], mimeType: match[2] });
  }
  return refs;
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

function isImageRef(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const raw = value.trim();
  if (!raw) return false;
  if (raw.startsWith('data:image/')) return true;
  if (/^https?:\/\/.+\.(png|jpe?g|webp|gif|svg|avif|bmp)([?#].*)?$/i.test(raw)) return true;
  if (/^(\/|~\/|[A-Za-z]:\\).+\.(png|jpe?g|webp|gif|svg|avif|bmp)$/i.test(raw)) return true;
  return false;
}

function pushImageRef(
  images: Array<{ mimeType: string; data?: string; url?: string }>,
  value: string,
  mimeHint?: string,
) {
  const raw = value.trim();
  if (!raw) return;
  const mimeType = mimeHint || mimeFromImageRef(raw);
  if (raw.startsWith('data:image/')) {
    const match = raw.match(/^data:([^;]+);base64,(.+)$/i);
    if (match?.[2]) {
      images.push({ mimeType: match[1] || mimeType, data: match[2] });
    } else {
      images.push({ mimeType, url: raw });
    }
    return;
  }
  images.push({ mimeType, url: raw });
}

function collectImagesFromValue(
  value: unknown,
  images: Array<{ mimeType: string; data?: string; url?: string }>,
  depth = 0,
) {
  if (depth > 6 || value == null) return;

  if (typeof value === 'string') {
    const markdownImage = /!\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = markdownImage.exec(value)) !== null) {
      if (isImageRef(match[1])) pushImageRef(images, match[1]);
    }
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) collectImagesFromValue(item, images, depth + 1);
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
      images.push({ mimeType: sourceMime || 'image/png', data: source.data });
    }
    if (typeof source?.url === 'string' && isImageRef(source.url)) {
      pushImageRef(images, source.url, sourceMime);
    }
    if (typeof source?.path === 'string' && isImageRef(source.path)) {
      pushImageRef(images, source.path, sourceMime);
    }
    const mimeType = typeof record.mimeType === 'string' ? record.mimeType : typeof record.mime_type === 'string' ? record.mime_type : 'image/png';
    if (typeof record.data === 'string') {
      if (isImageRef(record.data)) pushImageRef(images, record.data, mimeType);
      else images.push({ mimeType, data: record.data });
    }
  }

  for (const key of ['url', 'imageUrl', 'image_url', 'outputUrl', 'output_url', 'preview', 'src']) {
    const ref = record[key];
    if (isImageRef(ref)) pushImageRef(images, ref);
  }
  for (const key of ['filePath', 'file_path', 'path', 'outputPath', 'output_path', 'file']) {
    const ref = record[key];
    if (isImageRef(ref)) pushImageRef(images, ref);
  }

  for (const key of ['content', 'images', 'artifacts', 'files', 'outputs', 'result', 'results']) {
    if (key in record) collectImagesFromValue(record[key], images, depth + 1);
  }
}

/**
 * Extract image attachments from a message.
 * Supports base64, URL, local path, markdown image links and nested tool result artifacts.
 */
export function extractImages(message: RawMessage | unknown): Array<{ mimeType: string; data?: string; url?: string }> {
  if (!message || typeof message !== 'object') return [];
  const msg = message as Record<string, unknown>;
  const images: Array<{ mimeType: string; data?: string; url?: string }> = [];
  collectImagesFromValue(msg.content, images);
  collectImagesFromValue(msg.images, images);
  collectImagesFromValue(msg.artifacts, images);

  const seen = new Set<string>();
  return images.filter((img) => {
    const key = img.url || `${img.mimeType}:${img.data?.slice(0, 80) || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Extract tool use blocks from a message.
 * Handles both Anthropic format (tool_use in content array) and
 * OpenAI format (tool_calls array on the message object).
 */
export function extractToolUse(message: RawMessage | unknown): Array<{ id: string; name: string; input: unknown }> {
  if (!message || typeof message !== 'object') return [];
  const msg = message as Record<string, unknown>;
  const tools: Array<{ id: string; name: string; input: unknown }> = [];

  // Path 1: Anthropic/normalized format — tool_use / toolCall blocks inside content array
  const content = msg.content;
  if (Array.isArray(content)) {
    for (const block of content as ContentBlock[]) {
      if ((block.type === 'tool_use' || block.type === 'toolCall') && block.name) {
        tools.push({
          id: block.id || '',
          name: block.name,
          input: block.input ?? block.arguments,
        });
      }
    }
  }

  // Path 2: OpenAI format — tool_calls array on the message itself
  // Real-time streaming events from OpenAI-compatible models (DeepSeek, etc.)
  // use this format; the Gateway normalizes to Path 1 when storing history.
  if (tools.length === 0) {
    const toolCalls = msg.tool_calls ?? msg.toolCalls;
    if (Array.isArray(toolCalls)) {
      for (const tc of toolCalls as Array<Record<string, unknown>>) {
        const fn = (tc.function ?? tc) as Record<string, unknown>;
        const name = typeof fn.name === 'string' ? fn.name : '';
        if (!name) continue;
        let input: unknown;
        try {
          input = typeof fn.arguments === 'string' ? JSON.parse(fn.arguments) : fn.arguments ?? fn.input;
        } catch {
          input = fn.arguments;
        }
        tools.push({
          id: typeof tc.id === 'string' ? tc.id : '',
          name,
          input,
        });
      }
    }
  }

  return tools;
}

/**
 * Extract raw file paths from message text.
 * Same logic as chat store — used for stripping paths from bubble display.
 */
export function extractFilePathsFromText(text: string): string[] {
  const paths: string[] = [];
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
        paths.push(p);
      }
    }
  }
  return paths;
}

/**
 * Strip file paths from text so they don't appear inside the bubble.
 * Paths are shown as separate FileCards outside the bubble instead.
 */
export function stripFilePathsFromText(text: string): string {
  const paths = extractFilePathsFromText(text);
  if (paths.length === 0) return text;
  let result = text;
  for (const p of paths.sort((a, b) => b.length - a.length)) {
    const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(escaped, 'g'), '');
  }
  return result.replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Format a Unix timestamp (seconds) to relative time string.
 */
export function formatTimestamp(timestamp: unknown): string {
  if (!timestamp) return '';
  const ts = typeof timestamp === 'number' ? timestamp : Number(timestamp);
  if (!ts || isNaN(ts)) return '';

  // OpenClaw timestamps can be in seconds or milliseconds
  const ms = ts > 1e12 ? ts : ts * 1000;
  const date = new Date(ms);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();

  if (diffMs < 60000) return 'just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
