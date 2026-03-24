/**
 * Memory Management React Hook
 * 
 * Provides React hooks for interacting with the LanceDB vector memory service.
 * Includes state management, loading states, and error handling.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  VectorMemoryService,
  getVectorMemory,
  resetVectorMemory,
} from '../memory/vector-memory';
import type {
  MemoryEntry,
  MemorySearchResult,
  LanceDBConfig,
  AddMemoryOptions,
  SearchMemoryOptions,
  BatchImportResult,
  MemoryExport,
  MemoryCategory,
} from '../memory/types';

// ============================================================================
// Hook State Types
// ============================================================================

interface UseMemoryState {
  /** Whether the memory service is initialized */
  isInitialized: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Current error state */
  error: string | null;
  /** Total memory count */
  count: number;
  /** Recently added memories */
  recentMemories: MemoryEntry[];
}

interface UseMemoryActions {
  /** Initialize the memory service */
  initialize: () => Promise<void>;
  /** Add a new memory */
  addMemory: (options: AddMemoryOptions) => Promise<MemoryEntry>;
  /** Add multiple memories */
  addMemoriesBatch: (memories: AddMemoryOptions[]) => Promise<MemoryEntry[]>;
  /** Search memories */
  searchMemories: (options: SearchMemoryOptions) => Promise<MemorySearchResult[]>;
  /** Get a single memory */
  getMemory: (id: string) => Promise<MemoryEntry | null>;
  /** Update a memory */
  updateMemory: (
    id: string,
    updates: Partial<Pick<AddMemoryOptions, 'text' | 'importance' | 'category' | 'metadata'>>
  ) => Promise<MemoryEntry | null>;
  /** Delete a memory */
  deleteMemory: (id: string) => Promise<boolean>;
  /** Delete multiple memories */
  deleteMemories: (ids: string[]) => Promise<number>;
  /** Get all memories */
  getAllMemories: (limit?: number) => Promise<MemoryEntry[]>;
  /** Export memories */
  exportMemories: () => Promise<MemoryExport>;
  /** Import memories */
  importMemories: (data: MemoryExport) => Promise<BatchImportResult>;
  /** Reset all memories */
  reset: () => Promise<void>;
  /** Refresh memory count */
  refreshCount: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * React hook for managing vector memory operations
 * 
 * @param config - Optional ChromaDB configuration
 * @returns State and actions for memory management
 * 
 * @example
 * ```tsx
 * function MemoryComponent() {
 *   const {
 *     state,
 *     actions: { addMemory, searchMemories }
 *   } = useMemory();
 * 
 *   const handleAdd = async () => {
 *     await addMemory({ text: 'Remember this', importance: 0.8 });
 *   };
 * 
 *   return <button onClick={handleAdd}>Add Memory</button>;
 * }
 * ```
 */
export function useMemory(config?: LanceDBConfig) {
  const serviceRef = useRef<VectorMemoryService | null>(null);
  const [state, setState] = useState<UseMemoryState>({
    isInitialized: false,
    isLoading: false,
    error: null,
    count: 0,
    recentMemories: [],
  });

  // Initialize service on mount
  useEffect(() => {
    serviceRef.current = getVectorMemory(config);

    return () => {
      // Cleanup if needed
    };
  }, [config]);

  // Set error state
  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  // Set loading state
  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading }));
  }, []);

  // Initialize the memory service
  const initialize = useCallback(async () => {
    if (!serviceRef.current) {
      setError('Memory service not available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await serviceRef.current.initialize();
      const count = await serviceRef.current.getCount();
      
      setState(prev => ({
        ...prev,
        isInitialized: true,
        count,
      }));
    } catch (error) {
      setError(`Failed to initialize: ${String(error)}`);
      setState(prev => ({ ...prev, isInitialized: false }));
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading]);

  // Add a single memory
  const addMemory = useCallback(async (options: AddMemoryOptions): Promise<MemoryEntry> => {
    if (!serviceRef.current) {
      throw new Error('Memory service not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const entry = await serviceRef.current.addMemory(options);
      
      setState(prev => ({
        ...prev,
        count: prev.count + 1,
        recentMemories: [entry, ...prev.recentMemories].slice(0, 10),
      }));

      return entry;
    } catch (error) {
      setError(`Failed to add memory: ${String(error)}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading]);

  // Add multiple memories
  const addMemoriesBatch = useCallback(
    async (memories: AddMemoryOptions[]): Promise<MemoryEntry[]> => {
      if (!serviceRef.current) {
        throw new Error('Memory service not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        const entries = await serviceRef.current.addMemoriesBatch(memories);

        setState(prev => ({
          ...prev,
          count: prev.count + entries.length,
          recentMemories: [...entries, ...prev.recentMemories].slice(0, 10),
        }));

        return entries;
      } catch (error) {
        setError(`Failed to add memories: ${String(error)}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading]
  );

  // Search memories
  const searchMemories = useCallback(
    async (options: SearchMemoryOptions): Promise<MemorySearchResult[]> => {
      if (!serviceRef.current) {
        throw new Error('Memory service not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        const results = await serviceRef.current.searchMemories(options);
        return results;
      } catch (error) {
        setError(`Failed to search memories: ${String(error)}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading]
  );

  // Get a single memory
  const getMemory = useCallback(
    async (id: string): Promise<MemoryEntry | null> => {
      if (!serviceRef.current) {
        throw new Error('Memory service not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        const memory = await serviceRef.current.getMemory(id);
        return memory;
      } catch (error) {
        setError(`Failed to get memory: ${String(error)}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading]
  );

  // Update a memory
  const updateMemory = useCallback(
    async (
      id: string,
      updates: Partial<Pick<AddMemoryOptions, 'text' | 'importance' | 'category' | 'metadata'>>
    ): Promise<MemoryEntry | null> => {
      if (!serviceRef.current) {
        throw new Error('Memory service not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        const updated = await serviceRef.current.updateMemory(id, updates);
        return updated;
      } catch (error) {
        setError(`Failed to update memory: ${String(error)}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading]
  );

  // Delete a memory
  const deleteMemory = useCallback(
    async (id: string): Promise<boolean> => {
      if (!serviceRef.current) {
        throw new Error('Memory service not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        const success = await serviceRef.current.deleteMemory(id);

        if (success) {
          setState(prev => ({
            ...prev,
            count: Math.max(0, prev.count - 1),
            recentMemories: prev.recentMemories.filter(m => m.id !== id),
          }));
        }

        return success;
      } catch (error) {
        setError(`Failed to delete memory: ${String(error)}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading]
  );

  // Delete multiple memories
  const deleteMemories = useCallback(
    async (ids: string[]): Promise<number> => {
      if (!serviceRef.current) {
        throw new Error('Memory service not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        const deletedCount = await serviceRef.current.deleteMemories(ids);

        setState(prev => ({
          ...prev,
          count: Math.max(0, prev.count - deletedCount),
          recentMemories: prev.recentMemories.filter(m => !ids.includes(m.id)),
        }));

        return deletedCount;
      } catch (error) {
        setError(`Failed to delete memories: ${String(error)}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading]
  );

  // Get all memories
  const getAllMemories = useCallback(
    async (limit?: number): Promise<MemoryEntry[]> => {
      if (!serviceRef.current) {
        throw new Error('Memory service not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        const memories = await serviceRef.current.getAllMemories(limit);
        return memories;
      } catch (error) {
        setError(`Failed to get memories: ${String(error)}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading]
  );

  // Export memories
  const exportMemories = useCallback(async (): Promise<MemoryExport> => {
    if (!serviceRef.current) {
      throw new Error('Memory service not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const exportData = await serviceRef.current.exportMemories();
      return exportData;
    } catch (error) {
      setError(`Failed to export memories: ${String(error)}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading]);

  // Import memories
  const importMemories = useCallback(
    async (data: MemoryExport): Promise<BatchImportResult> => {
      if (!serviceRef.current) {
        throw new Error('Memory service not initialized');
      }

      setLoading(true);
      setError(null);

      try {
        const result = await serviceRef.current.importMemories(data);

        setState(prev => ({
          ...prev,
          count: prev.count + result.successCount,
        }));

        return result;
      } catch (error) {
        setError(`Failed to import memories: ${String(error)}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [setError, setLoading]
  );

  // Reset all memories
  const reset = useCallback(async () => {
    if (!serviceRef.current) {
      throw new Error('Memory service not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      await serviceRef.current.reset();
      
      setState({
        isInitialized: true,
        isLoading: false,
        error: null,
        count: 0,
        recentMemories: [],
      });
    } catch (error) {
      setError(`Failed to reset: ${String(error)}`);
      setState(prev => ({ ...prev, isInitialized: false }));
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading]);

  // Refresh memory count
  const refreshCount = useCallback(async () => {
    if (!serviceRef.current || !state.isInitialized) {
      return;
    }

    try {
      const count = await serviceRef.current.getCount();
      setState(prev => ({ ...prev, count }));
    } catch (error) {
      console.error('[useMemory] Failed to refresh count:', error);
    }
  }, [state.isInitialized]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  return {
    state,
    actions: {
      initialize,
      addMemory,
      addMemoriesBatch,
      searchMemories,
      getMemory,
      updateMemory,
      deleteMemory,
      deleteMemories,
      getAllMemories,
      exportMemories,
      importMemories,
      reset,
      refreshCount,
      clearError,
    },
  };
}

// ============================================================================
// Specialized Hooks
// ============================================================================

/**
 * Hook for auto-recall on component mount
 * Automatically searches for relevant memories when component mounts
 */
export function useAutoRecall(
  query: string,
  options?: Omit<SearchMemoryOptions, 'query'>
) {
  const { state, actions } = useMemory();
  const [results, setResults] = useState<MemorySearchResult[]>([]);
  const [isRecalling, setIsRecalling] = useState(false);

  useEffect(() => {
    if (!state.isInitialized || !query.trim()) {
      return;
    }

    const recall = async () => {
      setIsRecalling(true);
      try {
        const searchResults = await actions.searchMemories({
          query,
          limit: options?.limit ?? 3,
          category: options?.category,
          minImportance: options?.minImportance ?? 0.5,
        });
        setResults(searchResults);
      } catch (error) {
        console.error('[useAutoRecall] Failed:', error);
      } finally {
        setIsRecalling(false);
      }
    };

    recall();
  }, [query, state.isInitialized, actions, options]);

  return { results, isRecalling, error: state.error };
}

/**
 * Hook for capturing conversation memories
 * Provides easy API for saving conversation context
 */
export function useMemoryCapture() {
  const { actions } = useMemory();
  const [isCapturing, setIsCapturing] = useState(false);

  const capture = useCallback(
    async (
      text: string,
      options?: Partial<AddMemoryOptions>
    ): Promise<MemoryEntry | null> => {
      if (!text.trim()) {
        return null;
      }

      setIsCapturing(true);
      try {
        const entry = await actions.addMemory({
          text,
          importance: options?.importance ?? 0.7,
          category: options?.category ?? 'fact',
          metadata: options?.metadata,
        });
        return entry;
      } catch (error) {
        console.error('[useMemoryCapture] Failed:', error);
        return null;
      } finally {
        setIsCapturing(false);
      }
    },
    [actions]
  );

  const captureDecision = useCallback(
    async (text: string, metadata?: Record<string, unknown>) => {
      return capture(text, { category: 'decision', metadata });
    },
    [capture]
  );

  const capturePreference = useCallback(
    async (text: string, metadata?: Record<string, unknown>) => {
      return capture(text, { category: 'preference', metadata });
    },
    [capture]
  );

  const captureFact = useCallback(
    async (text: string, metadata?: Record<string, unknown>) => {
      return capture(text, { category: 'fact', metadata });
    },
    [capture]
  );

  return {
    capture,
    captureDecision,
    capturePreference,
    captureFact,
    isCapturing,
  };
}

export default useMemory;
