/**
 * L1 Short-term Working Memory
 * 
 * Implements a sliding window buffer for recent conversation messages.
 * Features:
 * - Retains last 10 messages (configurable)
 * - Automatic token-based trimming
 * - FIFO expiration mechanism
 * - O(1) add/get operations (<10ms retrieval)
 * 
 * @see MEMORY_ARCHITECTURE_OPTIMIZATION.md
 */

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  tokens?: number;
}

export interface ShortTermMemoryConfig {
  maxMessages?: number;
  maxTokens?: number;
  sessionId?: string;
}

export interface SessionData {
  sessionId: string;
  startTime: number;
  messages: Message[];
  totalTokens: number;
  lastUpdated: number;
}

export class ShortTermMemory {
  private buffer: Message[] = [];
  private maxMessages: number;
  private maxTokens: number;
  private sessionId: string;
  private startTime: number;
  private totalTokens: number = 0;

  constructor(config: ShortTermMemoryConfig = {}) {
    this.maxMessages = config.maxMessages ?? 10;
    this.maxTokens = config.maxTokens ?? 1000;
    this.sessionId = config.sessionId ?? this.generateSessionId();
    this.startTime = Date.now();
  }

  /**
   * Add a message to the short-term memory buffer
   * Automatically trims if limits are exceeded
   * 
   * @param message - Message to add
   * @returns Current buffer size
   */
  add(message: Message): number {
    // Estimate tokens if not provided (~4 chars per token)
    const tokenCount = message.tokens ?? this.estimateTokens(message.content);
    
    const enrichedMessage: Message = {
      ...message,
      tokens: tokenCount,
    };

    this.buffer.push(enrichedMessage);
    this.totalTokens += tokenCount;

    // Trim to maintain limits
    this.trim();

    return this.buffer.length;
  }

  /**
   * Get recent messages for context
   * 
   * @param limit - Optional limit (default: all buffered messages)
   * @returns Array of recent messages
   */
  getRecent(limit?: number): Message[] {
    if (limit === undefined) {
      return [...this.buffer];
    }
    return this.buffer.slice(-limit);
  }

  /**
   * Get formatted context string for agent injection
   * 
   * @returns Formatted conversation context
   */
  getContext(): string {
    if (this.buffer.length === 0) {
      return '';
    }

    return this.buffer
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');
  }

  /**
   * Get session metadata
   */
  getSessionData(): SessionData {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      messages: [...this.buffer],
      totalTokens: this.totalTokens,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Clear all messages (session reset)
   */
  clear(): void {
    this.buffer = [];
    this.totalTokens = 0;
    this.startTime = Date.now();
    this.sessionId = this.generateSessionId();
  }

  /**
   * Get current buffer statistics
   */
  getStats(): {
    messageCount: number;
    totalTokens: number;
    sessionId: string;
    uptime: number;
  } {
    return {
      messageCount: this.buffer.length,
      totalTokens: this.totalTokens,
      sessionId: this.sessionId,
      uptime: Date.now() - this.startTime,
    };
  }

  /**
   * Search messages by keyword (simple text match)
   * 
   * @param keyword - Keyword to search for
   * @returns Matching messages
   */
  search(keyword: string): Message[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.buffer.filter((m) =>
      m.content.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Remove oldest message manually
   * 
   * @returns Removed message or undefined if empty
   */
  removeOldest(): Message | undefined {
    const removed = this.buffer.shift();
    if (removed && removed.tokens) {
      this.totalTokens -= removed.tokens;
    }
    return removed;
  }

  /**
   * Trim buffer to maintain limits (FIFO)
   */
  private trim(): void {
    // Trim by message count first
    while (this.buffer.length > this.maxMessages) {
      this.removeOldest();
    }

    // Trim by token count
    while (this.totalTokens > this.maxTokens && this.buffer.length > 1) {
      this.removeOldest();
    }
  }

  /**
   * Estimate token count for text
   * Simple heuristic: ~4 characters per token
   * 
   * @param text - Text to estimate
   * @returns Estimated token count
   */
  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
    const random = Math.random().toString(36).slice(2, 6);
    return `${dateStr}-${timeStr}-${random}`;
  }

  /**
   * Export buffer to JSON (for persistence)
   */
  toJSON(): SessionData {
    return this.getSessionData();
  }

  /**
   * Import buffer from JSON (for session restoration)
   */
  static fromJSON(data: SessionData): ShortTermMemory {
    const memory = new ShortTermMemory({
      sessionId: data.sessionId,
      maxMessages: data.messages.length,
    });
    
    memory.buffer = data.messages;
    memory.totalTokens = data.totalTokens;
    memory.startTime = data.startTime;

    return memory;
  }
}

// Singleton instance for global access
let globalInstance: ShortTermMemory | null = null;

/**
 * Get or create global short-term memory instance
 */
export function getShortTermMemory(config?: ShortTermMemoryConfig): ShortTermMemory {
  if (!globalInstance) {
    globalInstance = new ShortTermMemory(config);
  }
  return globalInstance;
}

/**
 * Reset global instance (for testing or session reset)
 */
export function resetShortTermMemory(): void {
  globalInstance = null;
}

export default ShortTermMemory;
