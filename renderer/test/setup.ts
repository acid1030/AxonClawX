/**
 * Vitest Test Setup
 * 
 * Global test configuration and mocks.
 */

import { vi } from 'vitest';

// Mock console.error in tests to reduce noise
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out React act() warnings and other test noise
  if (args[0]?.includes?.('act(')) {
    return;
  }
  originalConsoleError(...args);
};

// Global mocks can be added here
vi.mock('chromadb', () => ({
  ChromaClient: vi.fn().mockImplementation(() => ({
    getOrCreateCollection: vi.fn(),
    query: vi.fn(),
    add: vi.fn(),
  })),
}));
