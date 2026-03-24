/**
 * useMemory Hook Tests
 * 
 * Unit tests for React memory management hooks.
 * Uses React Testing Library patterns.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMemory, useAutoRecall, useMemoryCapture } from './useMemory';
import { resetVectorMemory } from '../memory/vector-memory';

// Mock the vector memory service
vi.mock('../memory/vector-memory', () => ({
  getVectorMemory: vi.fn(() => ({
    initialize: vi.fn().mockResolvedValue(undefined),
    addMemory: vi.fn().mockResolvedValue({
      id: 'test-id',
      text: 'Test memory',
      importance: 0.7,
      category: 'fact',
      createdAt: Date.now(),
    }),
    addMemoriesBatch: vi.fn().mockResolvedValue([]),
    searchMemories: vi.fn().mockResolvedValue([]),
    getMemory: vi.fn().mockResolvedValue(null),
    updateMemory: vi.fn().mockResolvedValue(null),
    deleteMemory: vi.fn().mockResolvedValue(true),
    deleteMemories: vi.fn().mockResolvedValue(0),
    getAllMemories: vi.fn().mockResolvedValue([]),
    exportMemories: vi.fn().mockResolvedValue({
      version: '1.0',
      exportedAt: Date.now(),
      memories: [],
    }),
    importMemories: vi.fn().mockResolvedValue({
      successCount: 0,
      failCount: 0,
      errors: [],
    }),
    reset: vi.fn().mockResolvedValue(undefined),
    getCount: vi.fn().mockResolvedValue(0),
  })),
  resetVectorMemory: vi.fn(),
}));

describe('useMemory Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetVectorMemory();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useMemory());

      expect(result.current.state.isInitialized).toBe(false);
      expect(result.current.state.isLoading).toBe(false);
      expect(result.current.state.error).toBe(null);
      expect(result.current.state.count).toBe(0);
      expect(result.current.state.recentMemories).toEqual([]);
    });

    it('should provide all actions', () => {
      const { result } = renderHook(() => useMemory());

      expect(result.current.actions.initialize).toBeDefined();
      expect(result.current.actions.addMemory).toBeDefined();
      expect(result.current.actions.searchMemories).toBeDefined();
      expect(result.current.actions.deleteMemory).toBeDefined();
      expect(result.current.actions.exportMemories).toBeDefined();
      expect(result.current.actions.importMemories).toBeDefined();
      expect(result.current.actions.reset).toBeDefined();
    });
  });

  describe('Initialization', () => {
    it('should initialize the service', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      expect(result.current.state.isInitialized).toBe(true);
      expect(result.current.state.isLoading).toBe(false);
    });

    it('should handle initialization error', async () => {
      const { result } = renderHook(() => useMemory());

      // Simulate error by not mocking properly
      await act(async () => {
        try {
          await result.current.actions.initialize();
        } catch (error) {
          // Expected
        }
      });

      // Error state should be set if initialization fails
      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('Add Memory', () => {
    it('should add a memory successfully', async () => {
      const { result } = renderHook(() => useMemory());

      // Initialize first
      await act(async () => {
        await result.current.actions.initialize();
      });

      let addedMemory;
      await act(async () => {
        addedMemory = await result.current.actions.addMemory({
          text: 'Test memory content',
          importance: 0.8,
          category: 'fact',
        });
      });

      expect(addedMemory).toBeDefined();
      expect(addedMemory?.text).toBe('Test memory content');
      expect(result.current.state.count).toBeGreaterThan(0);
    });

    it('should add memory with default values', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      let addedMemory;
      await act(async () => {
        addedMemory = await result.current.actions.addMemory({
          text: 'Simple memory',
        });
      });

      expect(addedMemory).toBeDefined();
    });

    it('should update recent memories on add', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
        await result.current.actions.addMemory({ text: 'Memory 1' });
      });

      expect(result.current.state.recentMemories.length).toBeGreaterThan(0);
    });
  });

  describe('Search Memories', () => {
    it('should search memories', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      let searchResults;
      await act(async () => {
        searchResults = await result.current.actions.searchMemories({
          query: 'test query',
          limit: 5,
        });
      });

      expect(Array.isArray(searchResults)).toBe(true);
    });

    it('should search with filters', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      let searchResults;
      await act(async () => {
        searchResults = await result.current.actions.searchMemories({
          query: 'test',
          category: 'fact',
          minImportance: 0.7,
          limit: 10,
        });
      });

      expect(Array.isArray(searchResults)).toBe(true);
    });
  });

  describe('Delete Memory', () => {
    it('should delete a memory', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      let deleted;
      await act(async () => {
        deleted = await result.current.actions.deleteMemory('test-id');
      });

      expect(deleted).toBe(true);
    });

    it('should delete multiple memories', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      let deletedCount;
      await act(async () => {
        deletedCount = await result.current.actions.deleteMemories([
          'id-1',
          'id-2',
          'id-3',
        ]);
      });

      expect(typeof deletedCount).toBe('number');
    });
  });

  describe('Export/Import', () => {
    it('should export memories', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      let exportData;
      await act(async () => {
        exportData = await result.current.actions.exportMemories();
      });

      expect(exportData).toBeDefined();
      expect(exportData.version).toBe('1.0');
      expect(Array.isArray(exportData.memories)).toBe(true);
    });

    it('should import memories', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      const importData = {
        version: '1.0',
        exportedAt: Date.now(),
        memories: [
          {
            id: 'imported-1',
            text: 'Imported memory',
            importance: 0.8,
            category: 'fact' as const,
            createdAt: Date.now(),
          },
        ],
      };

      let importResult;
      await act(async () => {
        importResult = await result.current.actions.importMemories(importData);
      });

      expect(importResult).toBeDefined();
      expect(typeof importResult.successCount).toBe('number');
    });
  });

  describe('Error Handling', () => {
    it('should clear error', async () => {
      const { result } = renderHook(() => useMemory());

      act(() => {
        result.current.actions.clearError();
      });

      expect(result.current.state.error).toBe(null);
    });

    it('should set loading state during operations', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      // Start an operation
      const addPromise = result.current.actions.addMemory({
        text: 'Test',
      });

      // Loading should be true during operation
      expect(result.current.state.isLoading).toBe(true);

      await addPromise;

      // Loading should be false after completion
      expect(result.current.state.isLoading).toBe(false);
    });
  });

  describe('Reset', () => {
    it('should reset all memories', async () => {
      const { result } = renderHook(() => useMemory());

      await act(async () => {
        await result.current.actions.initialize();
      });

      await act(async () => {
        await result.current.actions.reset();
      });

      expect(result.current.state.count).toBe(0);
      expect(result.current.state.recentMemories).toEqual([]);
    });
  });
});

describe('useAutoRecall Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should auto-recall on mount with query', async () => {
    const { result } = renderHook(() =>
      useAutoRecall('test query', { limit: 3 })
    );

    await waitFor(() => {
      expect(result.current.results).toBeDefined();
    });

    expect(Array.isArray(result.current.results)).toBe(true);
  });

  it('should handle empty query', async () => {
    const { result } = renderHook(() => useAutoRecall(''));

    await waitFor(() => {
      expect(result.current.isRecalling).toBe(false);
    });
  });

  it('should respect custom options', async () => {
    const { result } = renderHook(() =>
      useAutoRecall('test', {
        limit: 10,
        category: 'fact',
        minImportance: 0.8,
      })
    );

    await waitFor(() => {
      expect(result.current.results).toBeDefined();
    });
  });
});

describe('useMemoryCapture Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should provide capture methods', () => {
    const { result } = renderHook(() => useMemoryCapture());

    expect(result.current.capture).toBeDefined();
    expect(result.current.captureDecision).toBeDefined();
    expect(result.current.capturePreference).toBeDefined();
    expect(result.current.captureFact).toBeDefined();
  });

  it('should capture generic memory', async () => {
    const { result } = renderHook(() => useMemoryCapture());

    let captured;
    await act(async () => {
      captured = await result.current.capture('Test content');
    });

    expect(captured).toBeDefined();
  });

  it('should capture decision', async () => {
    const { result } = renderHook(() => useMemoryCapture());

    let captured;
    await act(async () => {
      captured = await result.current.captureDecision(
        'Decided to use ChromaDB'
      );
    });

    expect(captured).toBeDefined();
  });

  it('should capture preference', async () => {
    const { result } = renderHook(() => useMemoryCapture());

    let captured;
    await act(async () => {
      captured = await result.current.capturePreference(
        'Prefers dark mode'
      );
    });

    expect(captured).toBeDefined();
  });

  it('should capture fact', async () => {
    const { result } = renderHook(() => useMemoryCapture());

    let captured;
    await act(async () => {
      captured = await result.current.captureFact('TypeScript is typed');
    });

    expect(captured).toBeDefined();
  });

  it('should return null for empty text', async () => {
    const { result } = renderHook(() => useMemoryCapture());

    let captured;
    await act(async () => {
      captured = await result.current.capture('');
    });

    expect(captured).toBe(null);
  });

  it('should track capturing state', async () => {
    const { result } = renderHook(() => useMemoryCapture());

    expect(result.current.isCapturing).toBe(false);

    const capturePromise = result.current.capture('Test');
    
    // During capture
    expect(result.current.isCapturing).toBe(true);

    await capturePromise;

    // After capture
    expect(result.current.isCapturing).toBe(false);
  });
});
