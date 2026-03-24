/**
 * LanceDB Vector Memory Service
 * 
 * Provides semantic memory storage and retrieval using LanceDB vector database.
 * Supports local embedded mode for persistent storage.
 * 
 * Features:
 * - Automatic embedding generation
 * - Semantic search
 * - Memory CRUD operations
 * - Batch import/export
 * - Persistent local storage
 */

import { randomUUID } from 'crypto';
import type {
  MemoryEntry,
  MemorySearchResult,
  LanceDBConfig,
  AddMemoryOptions,
  SearchMemoryOptions,
  BatchImportResult,
  MemoryExport,
} from './types';

interface MemoryRecord {
  id: string;
  text: string;
  vector: number[];
  importance: number;
  category: string;
  createdAt: number;
  updatedAt?: number;
  metadata: Record<string, unknown>;
}

const DEFAULT_TABLE_NAME = 'memories';
const DEFAULT_VECTOR_DIMENSION = 768;
const EXPORT_VERSION = '1.0';

export class VectorMemoryService {
  private db: any = null;
  private lancedb: any = null;
  private table: any = null;
  private embeddingCache: Map<string, number[]> = new Map();
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  constructor(private readonly config: LanceDBConfig = {}) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.doInitialize();
    return this.initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      const lancedb = await import('@lancedb/lancedb');
      
      const dbPath = this.config.dbPath || './lancedb_memory';
      this.db = await lancedb.connect(dbPath);
      this.lancedb = lancedb;

      const tableName = this.config.tableName || DEFAULT_TABLE_NAME;
      const vectorDimension = this.config.vectorDimension || DEFAULT_VECTOR_DIMENSION;

      try {
        this.table = await this.db.openTable(tableName);
      } catch {
        const sampleData = [
          {
            id: 'sample',
            text: 'sample',
            vector: Array(vectorDimension).fill(0),
            importance: 0,
            category: 'sample',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            metadata: '{}'
          }
        ];
        const arrowTable = await this.lancedb.makeArrowTable(sampleData);
        this.table = await this.db.createTable(tableName, arrowTable);
      }

      this.isInitialized = true;
      console.log('[VectorMemory] Initialized successfully with LanceDB');
    } catch (error) {
      console.error('[VectorMemory] Initialization failed:', error);
      throw new Error(`Failed to initialize LanceDB: ${String(error)}`);
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    try {
      const { defaultEmbeddingFunction } = await import('./embeddings');
      const embedding = await defaultEmbeddingFunction(text);
      this.embeddingCache.set(text, embedding);
      return embedding;
    } catch {
      const { Ollama } = await import('ollama');
      const ollama = new Ollama();
      const response = await ollama.embeddings({ model: 'nomic-embed-text', prompt: text });
      const embedding = response.embedding;
      this.embeddingCache.set(text, embedding);
      return embedding;
    }
  }

  async addMemory(options: AddMemoryOptions): Promise<MemoryEntry> {
    await this.ensureInitialized();

    const id = options.id || randomUUID();
    const importance = options.importance ?? 0.7;
    const category = options.category || 'other';
    const createdAt = Date.now();

    const vector = await this.getEmbedding(options.text);

    const record: MemoryRecord = {
      id,
      text: options.text,
      vector,
      importance,
      category,
      createdAt,
      metadata: JSON.stringify(options.metadata || {}),
    };

    const arrowTable = await this.lancedb.makeArrowTable([record]);
    await this.table.add(arrowTable);

    return {
      id,
      text: options.text,
      importance,
      category,
      metadata: JSON.stringify(options.metadata),
      createdAt,
    };
  }

  async addMemoriesBatch(memories: AddMemoryOptions[]): Promise<MemoryEntry[]> {
    await this.ensureInitialized();

    const entries: MemoryEntry[] = [];
    const now = Date.now();

    const records: MemoryRecord[] = [];

    for (const memory of memories) {
      const id = memory.id || randomUUID();
      const importance = memory.importance ?? 0.7;
      const category = memory.category || 'other';

      const vector = await this.getEmbedding(memory.text);

      records.push({
        id,
        text: memory.text,
        vector,
        importance,
        category,
        createdAt: now,
        metadata: memory.metadata || {},
      });

      entries.push({
        id,
        text: memory.text,
        importance,
        category,
        metadata: memory.metadata,
        createdAt: now,
      });
    }

    const recordsArrowTable = await this.lancedb.makeArrowTable(records);
    await this.table.add(recordsArrowTable);

    return entries;
  }

  async searchMemories(options: SearchMemoryOptions): Promise<MemorySearchResult[]> {
    await this.ensureInitialized();

    const limit = options.limit ?? 5;
    const queryVector = await this.getEmbedding(options.query);

    let query = this.table.vectorSearch(queryVector);

    if (options.category) {
      query = query.where(`category = '${options.category}'`);
    }

    if (options.minImportance !== undefined) {
      query = query.where(`importance >= ${options.minImportance}`);
    }

    if (options.where) {
      const whereClause = Object.entries(options.where)
        .map(([key, value]) => {
          if (typeof value === 'string') {
            return `${key} = '${value}'`;
          }
          return `${key} = ${value}`;
        })
        .join(' AND ');
      query = query.where(whereClause);
    }

    const results = await query.limit(limit).execute();

    const searchResults: MemorySearchResult[] = [];

    for (const row of results) {
      const vector = row.vector;
      const dotProduct = queryVector.reduce((sum, val, i) => sum + val * (vector[i] || 0), 0);
      const queryMag = Math.sqrt(queryVector.reduce((sum, val) => sum + val * val, 0));
      const rowMag = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
      const distance = 1 - (dotProduct / (queryMag * rowMag));
      const score = 1 - distance;

      searchResults.push({
        entry: {
          id: row.id,
          text: row.text,
          importance: row.importance,
          category: row.category as any,
          metadata: row.metadata,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
        score,
        distance,
      });
    }

    return searchResults;
  }

  async getMemory(id: string): Promise<MemoryEntry | null> {
    await this.ensureInitialized();

    const results = await this.table.filter(`id = '${id}'`).execute();

    if (results.length === 0) {
      return null;
    }

    const row = results[0];
    return {
      id: row.id,
      text: row.text,
      importance: row.importance,
      category: row.category as any,
      metadata: row.metadata,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async deleteMemory(id: string): Promise<boolean> {
    await this.ensureInitialized();

    try {
      await this.table.delete(`id = '${id}'`);
      return true;
    } catch (error) {
      console.error('[VectorMemory] Delete failed:', error);
      return false;
    }
  }

  async deleteMemories(ids: string[]): Promise<number> {
    await this.ensureInitialized();

    try {
      const idsString = ids.map(id => `'${id}'`).join(', ');
      await this.table.delete(`id IN (${idsString})`);
      return ids.length;
    } catch (error) {
      console.error('[VectorMemory] Batch delete failed:', error);
      return 0;
    }
  }

  async updateMemory(
    id: string,
    updates: Partial<Pick<AddMemoryOptions, 'text' | 'importance' | 'category' | 'metadata'>>
  ): Promise<MemoryEntry | null> {
    await this.ensureInitialized();

    const existing = await this.getMemory(id);
    if (!existing) {
      return null;
    }

    const updatedText = updates.text ?? existing.text;
    const updatedImportance = updates.importance ?? existing.importance;
    const updatedCategory = updates.category ?? existing.category;
    const updatedMetadata = { ...existing.metadata, ...updates.metadata };
    const updatedAt = Date.now();

    const vector = await this.getEmbedding(updatedText);

    await this.table.update({
      where: `id = '${id}'`,
      values: {
        text: updatedText,
        vector,
        importance: updatedImportance,
        category: updatedCategory,
        metadata: JSON.stringify(updatedMetadata),
        updatedAt,
      },
    });

    return {
      ...existing,
      text: updatedText,
      importance: updatedImportance,
      category: updatedCategory,
      metadata: updatedMetadata,
      updatedAt,
    };
  }

  async getAllMemories(limit?: number): Promise<MemoryEntry[]> {
    await this.ensureInitialized();

    const results = await this.table.limit(limit ?? 1000).execute();

    const memories: MemoryEntry[] = [];

    for (const row of results) {
      memories.push({
        id: row.id,
        text: row.text,
        importance: row.importance,
        category: row.category as any,
        metadata: row.metadata,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
      });
    }

    return memories;
  }

  async exportMemories(): Promise<MemoryExport> {
    const memories = await this.getAllMemories();

    return {
      version: EXPORT_VERSION,
      exportedAt: Date.now(),
      memories,
    };
  }

  async importMemories(exportData: MemoryExport): Promise<BatchImportResult> {
    await this.ensureInitialized();

    const errors: Array<{ index: number; error: string }> = [];
    let successCount = 0;

    const validMemories: AddMemoryOptions[] = [];

    for (let i = 0; i < exportData.memories.length; i++) {
      try {
        const memory = exportData.memories[i];
        
        if (!memory.text || !memory.id) {
          throw new Error('Invalid memory format: missing required fields');
        }

        validMemories.push({
          id: memory.id,
          text: memory.text,
          importance: memory.importance,
          category: memory.category,
          metadata: memory.metadata,
        });

        successCount++;
      } catch (error) {
        errors.push({
          index: i,
          error: String(error),
        });
      }
    }

    if (validMemories.length > 0) {
      try {
        await this.addMemoriesBatch(validMemories);
      } catch (error) {
        validMemories.forEach((_, idx) => {
          errors.push({
            index: idx,
            error: `Batch import failed: ${String(error)}`,
          });
        });
        successCount = 0;
      }
    }

    return {
      successCount,
      failCount: errors.length,
      errors,
    };
  }

  async getCount(): Promise<number> {
    await this.ensureInitialized();

    const results = await this.table.count();
    return results;
  }

  async reset(): Promise<void> {
    await this.ensureInitialized();

    const tableName = this.config.tableName || DEFAULT_TABLE_NAME;
    
    try {
      await this.db.dropTable(tableName);
    } catch (error) {
      console.error('[VectorMemory] Reset failed:', error);
    }

    this.table = null;
    this.isInitialized = false;
    this.initPromise = null;
    
    await this.initialize();
  }

  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}

let instance: VectorMemoryService | null = null;

export function getVectorMemory(config?: LanceDBConfig): VectorMemoryService {
  if (!instance) {
    instance = new VectorMemoryService(config);
  }
  return instance;
}

export function resetVectorMemory(): void {
  instance = null;
}

export default VectorMemoryService;
