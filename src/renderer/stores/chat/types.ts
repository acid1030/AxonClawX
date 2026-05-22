/** Metadata for locally-attached files (not from Gateway) */
export interface AttachedFileMeta {
  fileName: string;
  mimeType: string;
  fileSize: number;
  preview: string | null;
  filePath?: string;
}

/** Raw message from OpenClaw chat.history */
export interface RawMessage {
  role: 'user' | 'assistant' | 'system' | 'toolresult';
  content: unknown; // string | ContentBlock[]
  timestamp?: number;
  id?: string;
  toolCallId?: string;
  toolName?: string;
  details?: unknown;
  isError?: boolean;
  /** Local-only: file metadata for user-uploaded attachments (not sent to/from Gateway) */
  _attachedFiles?: AttachedFileMeta[];
  /** Local-only: owning session guard used to prevent cross-session UI/cache merges */
  _sessionKey?: string;
  reasoning_content?: unknown;
  /** Gateway/OpenClaw: human-readable error when stopReason is error (e.g. stream failed before content) */
  errorMessage?: string;
  stopReason?: string;
  stop_reason?: string;
}

/** Content block inside a message */
export interface ContentBlock {
  type: 'text' | 'image' | 'thinking' | 'tool_use' | 'tool_result' | 'toolCall' | 'toolResult';
  text?: string;
  thinking?: string;
  source?: { type: string; media_type?: string; data?: string; url?: string };
  /** Flat image format from Gateway tool results (no source wrapper) */
  data?: string;
  mimeType?: string;
  id?: string;
  name?: string;
  input?: unknown;
  arguments?: unknown;
  content?: unknown;
}

/** Session from sessions.list */
export interface ChatSession {
  key: string;
  sessionId?: string;
  label?: string;
  displayName?: string;
  thinkingLevel?: string;
  model?: string;
  modelProvider?: string;
  updatedAt?: number;
  kind?: string;
  spawnedBy?: string;
  parentSessionKey?: string;
  parentRunId?: string;
  parentId?: string;
}

export interface ToolStatus {
  id?: string;
  toolCallId?: string;
  name: string;
  status: 'running' | 'completed' | 'error';
  durationMs?: number;
  summary?: string;
  updatedAt: number;
}

export interface QueuedChatMessage {
  id: string;
  sessionKey: string;
  text: string;
  attachments?: Array<{ fileName: string; mimeType: string; fileSize: number; stagedPath: string; preview: string | null }>;
  targetAgentId?: string | null;
  createdAt: number;
}
