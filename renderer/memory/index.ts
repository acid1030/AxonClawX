/**
 * Memory System - Unified Entry Point
 * 
 * Three-tier memory architecture:
 * - L1: Short-term working memory (recent 10 messages)
 * - L2: Mid-term project memory (recent 7 days, file-based)
 * - L3: Long-term knowledge base (LanceDB vector search)
 * 
 * @see MEMORY_ARCHITECTURE_OPTIMIZATION.md
 */

// ==================== L1: Short-term Memory ====================
export {
  ShortTermMemory,
  getShortTermMemory,
  resetShortTermMemory,
  type Message,
  type ShortTermMemoryConfig,
  type SessionData,
} from './short-term';

// ==================== L2: Mid-term Memory (File-based) ====================
export {
  MidTermMemory,
  IntegratedMemoryManager,
  getMidTermMemory,
  resetMidTermMemory,
  type FileMemoryEntry,
  type MidTermMemoryConfig,
  type FileMemoryQuery,
  type MidTermMemoryStats,
} from './mid-term';

// ==================== L3: Long-term Memory (LanceDB) ====================
// Types
export type {
  MemoryCategory,
  MemoryEntry,
  MemorySearchResult,
  LanceDBConfig,
  AddMemoryOptions,
  SearchMemoryOptions,
  BatchImportResult,
  MemoryExport,
} from './types';

// Alias for backward compatibility
export type { LanceDBConfig as ChromaDBConfig } from './types';

// Service
export {
  VectorMemoryService,
  getVectorMemory,
  resetVectorMemory,
} from './vector-memory';

// Default export (L3 for backward compatibility)
export { default } from './vector-memory';
