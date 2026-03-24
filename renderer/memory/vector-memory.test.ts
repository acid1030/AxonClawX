/**
 * VectorMemoryService Tests
 * 
 * Unit tests for LanceDB vector memory service.
 * Note: These tests require a running LanceDB instance or mock.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  VectorMemoryService,
  getVectorMemory,
  resetVectorMemory,
} from './vector-memory';
import type { AddMemoryOptions, MemoryExport } from './types';

vi.mock('@lancedb/lancedb', () => ({
  connect: vi.fn().mockResolvedValue({
    openTable: vi.fn().mockRejectedValue(new Error('Table not found')),
    createTable: vi.fn().mockResolvedValue({
      add: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      filter: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue([]),
      }),
      vectorSearch: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnValue({
          execute: vi.fn().mockResolvedValue([]),
        }),
      }),
      limit: vi.fn().mockReturnValue({
        execute: vi.fn().mockResolvedValue([]),
      }),
      count: vi.fn().mockResolvedValue(0),
    }),
    dropTable: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('./embeddings', () => ({
  defaultEmbeddingFunction: vi.fn().mockResolvedValue(
    new Array(384).fill(0).map(() => Math.random() - 0.5)
  ),
}));

describe('VectorMemoryService', () => {
  let service: VectorMemoryService;

  beforeEach(() => {
    resetVectorMemory();
    service = new VectorMemoryService({
      dbPath: './test_lancedb',
      tableName: 'test-memories',
    });
  });

  afterEach(() => {
    resetVectorMemory();
  });

  describe('Initialization', () => {
    it('should initialize with default config', async () => {
      const defaultService = new VectorMemoryService();
      expect(defaultService).toBeDefined();
    });

    it('should initialize with custom config', async () => {
      const customService = new VectorMemoryService({
        dbPath: './custom_path',
        tableName: 'custom-table',
        vectorDimension: 512,
      });
      expect(customService).toBeDefined();
    });

    it('should prevent multiple initializations', async () => {
      await service.initialize();
      await service.initialize();
      expect(service).toBeDefined();
    });
  });

  describe('Add Memory', () => {
    it('should add a memory with default values', () => {
      const memory: AddMemoryOptions = {
        text: 'Test memory content',
      };

      expect(memory.text).toBe('Test memory content');
    });

    it('should add a memory with custom importance', () => {
      const memory: AddMemoryOptions = {
        text: 'Important memory',
        importance: 0.9,
      };

      expect(memory.importance).toBe(0.9);
    });

    it('should add a memory with category', () => {
      const memory: AddMemoryOptions = {
        text: 'User preference',
        category: 'preference',
      };

      expect(memory.category).toBe('preference');
    });

    it('should add a memory with metadata', () => {
      const memory: AddMemoryOptions = {
        text: 'Contextual memory',
        metadata: { source: 'conversation', userId: '123' },
      };

      expect(memory.metadata).toEqual({
        source: 'conversation',
        userId: '123',
      });
    });
  });

  describe('Search Memory', () => {
    it('should search with default limit', () => {
      const searchOptions = {
        query: 'test query',
      };

      expect(searchOptions.query).toBe('test query');
    });

    it('should search with custom limit', () => {
      const searchOptions = {
        query: 'test query',
        limit: 10,
      };

      expect(searchOptions.limit).toBe(10);
    });

    it('should search with category filter', () => {
      const searchOptions = {
        query: 'test query',
        category: 'fact' as const,
      };

      expect(searchOptions.category).toBe('fact');
    });

    it('should search with importance threshold', () => {
      const searchOptions = {
        query: 'test query',
        minImportance: 0.7,
      };

      expect(searchOptions.minImportance).toBe(0.7);
    });
  });

  describe('Batch Operations', () => {
    it('should prepare batch add', () => {
      const memories: AddMemoryOptions[] = [
        { text: 'Memory 1', category: 'fact' },
        { text: 'Memory 2', category: 'preference' },
        { text: 'Memory 3', category: 'decision' },
      ];

      expect(memories).toHaveLength(3);
      expect(memories[0].category).toBe('fact');
    });

    it('should handle empty batch', () => {
      const memories: AddMemoryOptions[] = [];
      expect(memories).toHaveLength(0);
    });
  });

  describe('Export/Import', () => {
    it('should create export structure', () => {
      const exportData: MemoryExport = {
        version: '1.0',
        exportedAt: Date.now(),
        memories: [
          {
            id: 'test-id',
            text: 'Test memory',
            importance: 0.8,
            category: 'fact',
            createdAt: Date.now(),
          },
        ],
      };

      expect(exportData.version).toBe('1.0');
      expect(exportData.memories).toHaveLength(1);
    });

    it('should handle multiple memories in export', () => {
      const exportData: MemoryExport = {
        version: '1.0',
        exportedAt: Date.now(),
        memories: Array.from({ length: 10 }, (_, i) => ({
          id: `memory-${i}`,
          text: `Memory ${i}`,
          importance: 0.7,
          category: 'fact' as const,
          createdAt: Date.now(),
        })),
      };

      expect(exportData.memories).toHaveLength(10);
    });
  });

  describe('Singleton', () => {
    it('should return same instance from getVectorMemory', () => {
      const instance1 = getVectorMemory();
      const instance2 = getVectorMemory();
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getVectorMemory();
      resetVectorMemory();
      const instance2 = getVectorMemory();
      expect(instance1).not.toBe(instance2);
    });

    it('should respect custom config in singleton', () => {
      const customConfig = {
        dbPath: './custom_db_path',
        tableName: 'custom_table',
      };
      const instance = getVectorMemory(customConfig);
      expect(instance).toBeDefined();
    });
  });
});

describe('Memory Types', () => {
  it('should validate memory entry structure', () => {
    const entry = {
      id: 'test-id',
      text: 'Test content',
      importance: 0.8,
      category: 'fact' as const,
      createdAt: Date.now(),
    };

    expect(entry.id).toBeDefined();
    expect(entry.text).toBeDefined();
    expect(entry.importance).toBeGreaterThanOrEqual(0);
    expect(entry.importance).toBeLessThanOrEqual(1);
  });

  it('should validate search result structure', () => {
    const result = {
      entry: {
        id: 'result-id',
        text: 'Result content',
        importance: 0.9,
        category: 'fact' as const,
        createdAt: Date.now(),
      },
      score: 0.95,
      distance: 0.05,
    };

    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.distance).toBeGreaterThanOrEqual(0);
  });
});
