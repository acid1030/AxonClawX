/**
 * LanceDB Vector Memory - Type Definitions
 * 
 * Type contracts for vector-based semantic memory storage and retrieval.
 */

/**
 * Memory category for organizing memories
 */
export type MemoryCategory = 
  | 'fact'
  | 'preference'
  | 'decision'
  | 'entity'
  | 'other';

/**
 * A single memory entry
 */
export interface MemoryEntry {
  /** Unique identifier */
  id: string;
  /** The text content of the memory */
  text: string;
  /** Importance score (0-1) */
  importance: number;
  /** Category classification */
  category: MemoryCategory;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Creation timestamp (Unix epoch ms) */
  createdAt: number;
  /** Last updated timestamp (Unix epoch ms) */
  updatedAt?: number;
}

/**
 * Search result with relevance score
 */
export interface MemorySearchResult {
  /** The matched memory entry */
  entry: MemoryEntry;
  /** Similarity score (higher = more relevant) */
  score: number;
  /** Distance metric value */
  distance: number;
}

/**
 * Configuration for LanceDB connection
 */
export interface LanceDBConfig {
  /** Local storage path for LanceDB database */
  dbPath?: string;
  /** Table name (default: 'memories') */
  tableName?: string;
  /** Vector dimension (default: 384 for default embedding) */
  vectorDimension?: number;
  /** Embedding provider to use */
  embedding?: 'ollama' | 'openai' | 'local' | string;
}

/**
 * Alias for backward compatibility
 * @deprecated Use LanceDBConfig instead
 */
export type ChromaDBConfig = LanceDBConfig;

/**
 * Options for adding memories
 */
export interface AddMemoryOptions {
  /** Memory text content */
  text: string;
  /** Importance score (0-1, default: 0.7) */
  importance?: number;
  /** Category (default: 'other') */
  category?: MemoryCategory;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
  /** Custom ID (auto-generated if not provided) */
  id?: string;
}

/**
 * Options for searching memories
 */
export interface SearchMemoryOptions {
  /** Query text for semantic search */
  query: string;
  /** Maximum results to return (default: 5) */
  limit?: number;
  /** Filter by category */
  category?: MemoryCategory;
  /** Minimum importance threshold */
  minImportance?: number;
  /** Filter by metadata */
  where?: Record<string, unknown>;
}

/**
 * Batch import result
 */
export interface BatchImportResult {
  /** Number of successfully imported memories */
  successCount: number;
  /** Number of failed imports */
  failCount: number;
  /** Error messages for failed imports */
  errors: Array<{ index: number; error: string }>;
}

/**
 * Export format for memories
 */
export interface MemoryExport {
  /** Export version */
  version: string;
  /** Export timestamp */
  exportedAt: number;
  /** All exported memories */
  memories: MemoryEntry[];
}
