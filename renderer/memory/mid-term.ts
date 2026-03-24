/**
 * L2 Mid-term File-based Memory
 * 
 * Implements file-system backed memory for medium-term retention.
 * Features:
 * - Retains file changes from last 7 days (configurable)
 * - Timestamp-based filtering and expiration
 * - Path and file type-based retrieval
 * - Integration with L1 short-term memory
 * - Automatic cleanup of expired entries
 * 
 * @see MEMORY_ARCHITECTURE_OPTIMIZATION.md
 */

import * as fs from 'fs';
import * as path from 'path';

export interface FileMemoryEntry {
  /** Unique identifier */
  id: string;
  /** File path */
  filePath: string;
  /** File content or excerpt */
  content: string;
  /** File type/extension */
  fileType: string;
  /** File size in bytes */
  fileSize: number;
  /** File modification timestamp */
  fileModifiedAt: number;
  /** Memory entry creation timestamp */
  createdAt: number;
  /** Memory entry last accessed timestamp */
  lastAccessedAt: number;
  /** Optional tags for categorization */
  tags?: string[];
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

export interface MidTermMemoryConfig {
  /** Retention period in days (default: 7) */
  retentionDays?: number;
  /** Storage directory path */
  storagePath?: string;
  /** Maximum file size to store in bytes (default: 1MB) */
  maxFileSize?: number;
  /** Enable automatic cleanup on access */
  autoCleanup?: boolean;
  /** File extensions to include (default: all) */
  includeExtensions?: string[];
  /** File extensions to exclude */
  excludeExtensions?: string[];
}

export interface FileMemoryQuery {
  /** Search by file path pattern */
  pathPattern?: string;
  /** Search by file extension/type */
  fileType?: string;
  /** Search by tags */
  tags?: string[];
  /** Filter by modification time range */
  modifiedAfter?: number;
  modifiedBefore?: number;
  /** Filter by creation time range */
  createdAfter?: number;
  createdBefore?: number;
  /** Maximum results to return */
  limit?: number;
  /** Keyword search in content */
  keyword?: string;
}

export interface MidTermMemoryStats {
  totalEntries: number;
  storageSize: number;
  oldestEntry: number;
  newestEntry: number;
  entriesByType: Record<string, number>;
}

export class MidTermMemory {
  private entries: Map<string, FileMemoryEntry> = new Map();
  private retentionDays: number;
  private storagePath: string;
  private maxFileSize: number;
  private autoCleanup: boolean;
  private includeExtensions?: string[];
  private excludeExtensions?: string[];
  private indexFile: string;

  constructor(config: MidTermMemoryConfig = {}) {
    this.retentionDays = config.retentionDays ?? 7;
    this.storagePath = config.storagePath ?? this.getDefaultStoragePath();
    this.maxFileSize = config.maxFileSize ?? 1024 * 1024; // 1MB default
    this.autoCleanup = config.autoCleanup ?? true;
    this.includeExtensions = config.includeExtensions;
    this.excludeExtensions = config.excludeExtensions;
    this.indexFile = path.join(this.storagePath, 'memory-index.json');

    // Initialize storage directory and load existing index
    this.initialize();
  }

  /**
   * Initialize storage directory and load existing memories
   */
  private initialize(): void {
    try {
      // Create storage directory if it doesn't exist
      if (!fs.existsSync(this.storagePath)) {
        fs.mkdirSync(this.storagePath, { recursive: true });
      }

      // Load existing index
      this.loadIndex();
    } catch (error) {
      console.error('[MidTermMemory] Initialization error:', error);
    }
  }

  /**
   * Get default storage path
   */
  private getDefaultStoragePath(): string {
    // Default to workspace memory storage
    const workspaceRoot = process.cwd();
    return path.join(workspaceRoot, '.memory', 'mid-term');
  }

  /**
   * Load memory index from disk
   */
  private loadIndex(): void {
    try {
      if (fs.existsSync(this.indexFile)) {
        const data = fs.readFileSync(this.indexFile, 'utf-8');
        const parsed = JSON.parse(data);
        
        // Restore entries from index
        this.entries = new Map(parsed.entries || []);
        
        // Cleanup expired entries on load
        if (this.autoCleanup) {
          this.cleanupExpired();
        }
      }
    } catch (error) {
      console.error('[MidTermMemory] Failed to load index:', error);
      this.entries = new Map();
    }
  }

  /**
   * Save memory index to disk
   */
  private saveIndex(): void {
    try {
      const data = {
        version: '1.0',
        updatedAt: Date.now(),
        entries: Array.from(this.entries.entries()),
      };
      
      fs.writeFileSync(this.indexFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('[MidTermMemory] Failed to save index:', error);
    }
  }

  /**
   * Add a file to mid-term memory
   * 
   * @param filePath - Path to the file
   * @param content - File content (or excerpt)
   * @param tags - Optional tags
   * @returns Memory entry ID
   */
  addFile(
    filePath: string,
    content: string,
    tags?: string[],
    metadata?: Record<string, unknown>
  ): string {
    try {
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();

      // Check file size limit
      if (stats.size > this.maxFileSize) {
        console.warn(`[MidTermMemory] File too large: ${filePath} (${stats.size} bytes)`);
        return '';
      }

      // Check extension filters
      if (this.shouldExcludeFile(ext)) {
        return '';
      }

      const now = Date.now();
      const id = this.generateId(filePath);

      const entry: FileMemoryEntry = {
        id,
        filePath: path.resolve(filePath),
        content,
        fileType: ext.slice(1) || 'unknown',
        fileSize: stats.size,
        fileModifiedAt: stats.mtimeMs,
        createdAt: now,
        lastAccessedAt: now,
        tags: tags || [],
        metadata,
      };

      this.entries.set(id, entry);
      this.saveIndex();

      return id;
    } catch (error) {
      console.error('[MidTermMemory] Failed to add file:', error);
      return '';
    }
  }

  /**
   * Add a file by reading it from disk
   * 
   * @param filePath - Path to the file
   * @param tags - Optional tags
   * @param excerpt - If true, store only first 10KB
   * @returns Memory entry ID
   */
  addFileFromDisk(
    filePath: string,
    tags?: string[],
    excerpt: boolean = false
  ): string {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      
      // Truncate if excerpt mode
      const storedContent = excerpt && content.length > 10240
        ? content.slice(0, 10240) + '\n... [truncated]'
        : content;

      return this.addFile(filePath, storedContent, tags);
    } catch (error) {
      console.error('[MidTermMemory] Failed to read file:', error);
      return '';
    }
  }

  /**
   * Get a memory entry by ID
   * 
   * @param id - Entry ID
   * @returns Memory entry or undefined
   */
  getEntry(id: string): FileMemoryEntry | undefined {
    const entry = this.entries.get(id);
    
    if (entry) {
      // Update last accessed time
      entry.lastAccessedAt = Date.now();
      this.entries.set(id, entry);
      this.saveIndex();
    }

    return entry;
  }

  /**
   * Query memories with filters
   * 
   * @param query - Query parameters
   * @returns Matching memory entries
   */
  query(query: FileMemoryQuery): FileMemoryEntry[] {
    const results: FileMemoryEntry[] = [];
    const now = Date.now();

    for (const entry of this.entries.values()) {
      // Apply filters
      if (query.pathPattern && !entry.filePath.includes(query.pathPattern)) {
        continue;
      }

      if (query.fileType && entry.fileType !== query.fileType) {
        continue;
      }

      if (query.tags && query.tags.length > 0) {
        const hasAllTags = query.tags.every(tag => 
          entry.tags?.includes(tag)
        );
        if (!hasAllTags) {
          continue;
        }
      }

      if (query.modifiedAfter && entry.fileModifiedAt < query.modifiedAfter) {
        continue;
      }

      if (query.modifiedBefore && entry.fileModifiedAt > query.modifiedBefore) {
        continue;
      }

      if (query.createdAfter && entry.createdAt < query.createdAfter) {
        continue;
      }

      if (query.createdBefore && entry.createdAt > query.createdBefore) {
        continue;
      }

      if (query.keyword && !entry.content.toLowerCase().includes(query.keyword.toLowerCase())) {
        continue;
      }

      results.push(entry);
    }

    // Sort by recency (most recent first)
    results.sort((a, b) => b.fileModifiedAt - a.fileModifiedAt);

    // Apply limit
    if (query.limit) {
      return results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get memories modified in the last N days
   * 
   * @param days - Number of days (default: 7)
   * @returns Memory entries
   */
  getRecent(days: number = 7): FileMemoryEntry[] {
    const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    return this.query({
      modifiedAfter: cutoff,
      limit: 100,
    });
  }

  /**
   * Get memories by file type
   * 
   * @param fileType - File extension (without dot)
   * @returns Memory entries
   */
  getByType(fileType: string): FileMemoryEntry[] {
    return this.query({
      fileType: fileType.toLowerCase(),
    });
  }

  /**
   * Get memories by path pattern
   * 
   * @param pattern - Path substring to match
   * @returns Memory entries
   */
  getByPath(pattern: string): FileMemoryEntry[] {
    return this.query({
      pathPattern: pattern,
    });
  }

  /**
   * Search memories by keyword
   * 
   * @param keyword - Keyword to search
   * @param limit - Maximum results
   * @returns Matching entries
   */
  search(keyword: string, limit: number = 10): FileMemoryEntry[] {
    return this.query({
      keyword,
      limit,
    });
  }

  /**
   * Remove a memory entry
   * 
   * @param id - Entry ID to remove
   * @returns True if removed
   */
  remove(id: string): boolean {
    const removed = this.entries.delete(id);
    if (removed) {
      this.saveIndex();
    }
    return removed;
  }

  /**
   * Cleanup expired entries (older than retention period)
   * 
   * @returns Number of entries removed
   */
  cleanupExpired(): number {
    const cutoff = Date.now() - (this.retentionDays * 24 * 60 * 60 * 1000);
    let removed = 0;

    for (const [id, entry] of this.entries.entries()) {
      if (entry.fileModifiedAt < cutoff) {
        this.entries.delete(id);
        removed++;
      }
    }

    if (removed > 0) {
      this.saveIndex();
      console.log(`[MidTermMemory] Cleaned up ${removed} expired entries`);
    }

    return removed;
  }

  /**
   * Clear all memories
   */
  clear(): void {
    this.entries.clear();
    this.saveIndex();
  }

  /**
   * Get memory statistics
   */
  getStats(): MidTermMemoryStats {
    const entries = Array.from(this.entries.values());
    
    const stats: MidTermMemoryStats = {
      totalEntries: entries.length,
      storageSize: entries.reduce((sum, e) => sum + e.fileSize, 0),
      oldestEntry: entries.length > 0 
        ? Math.min(...entries.map(e => e.fileModifiedAt)) 
        : 0,
      newestEntry: entries.length > 0 
        ? Math.max(...entries.map(e => e.fileModifiedAt)) 
        : 0,
      entriesByType: {},
    };

    // Count by file type
    for (const entry of entries) {
      stats.entriesByType[entry.fileType] = 
        (stats.entriesByType[entry.fileType] || 0) + 1;
    }

    return stats;
  }

  /**
   * Export all memories to JSON
   */
  export(): FileMemoryEntry[] {
    return Array.from(this.entries.values());
  }

  /**
   * Import memories from JSON
   * 
   * @param entries - Memory entries to import
   */
  import(entries: FileMemoryEntry[]): void {
    for (const entry of entries) {
      this.entries.set(entry.id, entry);
    }
    this.saveIndex();
  }

  /**
   * Check if file should be excluded based on extension
   */
  private shouldExcludeFile(ext: string): boolean {
    // Check exclude list
    if (this.excludeExtensions?.includes(ext)) {
      return true;
    }

    // Check include list (if specified, only include these)
    if (this.includeExtensions && !this.includeExtensions.includes(ext)) {
      return true;
    }

    return false;
  }

  /**
   * Generate unique ID from file path
   */
  private generateId(filePath: string): string {
    const resolved = path.resolve(filePath);
    const hash = this.simpleHash(resolved);
    return `file_${hash}`;
  }

  /**
   * Simple hash function for strings
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}

// ==================== Integration with L1 ====================

import { ShortTermMemory, type Message } from './short-term';

/**
 * Integrated memory manager combining L1 and L2
 */
export class IntegratedMemoryManager {
  private l1: ShortTermMemory;
  private l2: MidTermMemory;

  constructor(
    l1Config?: ConstructorParameters<typeof ShortTermMemory>[0],
    l2Config?: MidTermMemoryConfig
  ) {
    this.l1 = new ShortTermMemory(l1Config);
    this.l2 = new MidTermMemory(l2Config);
  }

  /**
   * Add a message to L1 and optionally capture file references to L2
   */
  addMessage(message: Message, captureFiles?: string[]): void {
    // Add to L1
    this.l1.add(message);

    // Capture any mentioned files to L2
    if (captureFiles) {
      for (const filePath of captureFiles) {
        this.l2.addFileFromDisk(filePath, ['conversation-reference']);
      }
    }
  }

  /**
   * Get unified context from both L1 and L2
   * 
   * @param options - Query options for L2
   * @returns Combined context string
   */
  getContext(options?: {
    l1Limit?: number;
    l2Query?: FileMemoryQuery;
  }): string {
    const parts: string[] = [];

    // L1: Recent conversation
    const l1Context = this.l1.getContext();
    if (l1Context) {
      parts.push('=== Recent Conversation (L1) ===\n' + l1Context);
    }

    // L2: Relevant file memories
    if (options?.l2Query) {
      const l2Entries = this.l2.query(options.l2Query);
      if (l2Entries.length > 0) {
        const l2Context = l2Entries
          .map(e => `📄 ${e.filePath}\n   Type: ${e.fileType} | Modified: ${new Date(e.fileModifiedAt).toLocaleString()}`)
          .join('\n\n');
        parts.push('\n=== Relevant Files (L2) ===\n' + l2Context);
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Search across both memory layers
   */
  search(query: string): {
    l1: Message[];
    l2: FileMemoryEntry[];
  } {
    return {
      l1: this.l1.search(query),
      l2: this.l2.search(query),
    };
  }

  /**
   * Get L1 memory instance
   */
  getL1(): ShortTermMemory {
    return this.l1;
  }

  /**
   * Get L2 memory instance
   */
  getL2(): MidTermMemory {
    return this.l2;
  }
}

// ==================== Singleton Pattern ====================

let globalInstance: MidTermMemory | null = null;

/**
 * Get or create global mid-term memory instance
 */
export function getMidTermMemory(config?: MidTermMemoryConfig): MidTermMemory {
  if (!globalInstance) {
    globalInstance = new MidTermMemory(config);
  }
  return globalInstance;
}

/**
 * Reset global instance (for testing)
 */
export function resetMidTermMemory(): void {
  globalInstance = null;
}

export default MidTermMemory;
