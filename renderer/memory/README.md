# ChromaDB Vector Memory

Semantic memory storage and retrieval using ChromaDB vector database for the AxonClaw project.

## Overview

This module provides a complete vector memory solution with:

- **Automatic Embedding**: Uses `@chroma-core/default-embed` for local embedding generation
- **Semantic Search**: Find memories by meaning, not just keywords
- **CRUD Operations**: Full create, read, update, delete support
- **Batch Operations**: Efficient bulk import/export
- **React Integration**: Custom hooks for easy React integration

## Installation

```bash
# Install ChromaDB client and embedding functions
npm install chromadb @chroma-core/default-embed

# For development/testing
npm install -D vitest @testing-library/react @testing-library/hooks
```

## Quick Start

### Basic Usage

```typescript
import { useMemory } from '@/renderer/hooks/useMemory';

function MyComponent() {
  const { state, actions } = useMemory();

  useEffect(() => {
    actions.initialize();
  }, []);

  const handleAddMemory = async () => {
    await actions.addMemory({
      text: 'Remember this important thing',
      importance: 0.8,
      category: 'fact',
    });
  };

  const handleSearch = async () => {
    const results = await actions.searchMemories({
      query: 'important things',
      limit: 5,
    });
    console.log(results);
  };

  return (
    <div>
      <button onClick={handleAddMemory}>Add Memory</button>
      <button onClick={handleSearch}>Search</button>
      {state.isLoading && <span>Loading...</span>}
      {state.error && <span>Error: {state.error}</span>}
    </div>
  );
}
```

### Using Specialized Hooks

```typescript
import { useAutoRecall, useMemoryCapture } from '@/renderer/hooks/useMemory';

function ConversationView({ currentMessage }) {
  // Auto-recall relevant memories
  const { results: recalled } = useAutoRecall(currentMessage, {
    limit: 3,
    minImportance: 0.6,
  });

  // Capture new memories
  const { captureDecision, captureFact } = useMemoryCapture();

  const handleDecision = async () => {
    await captureDecision('We decided to use ChromaDB for vector storage');
  };

  return (
    <div>
      {recalled.map(memory => (
        <MemoryCard key={memory.entry.id} memory={memory.entry} />
      ))}
      <button onClick={handleDecision}>Save Decision</button>
    </div>
  );
}
```

## API Reference

### VectorMemoryService

The core service class for memory operations.

#### Configuration

```typescript
interface ChromaDBConfig {
  path?: string;           // ChromaDB server URL (default: 'http://localhost')
  port?: number;           // API port (default: 8000)
  collectionName?: string; // Collection name (default: 'memories')
  isEmbedded?: boolean;    // Use embedded mode
  localPath?: string;      // Local storage path for embedded mode
}
```

#### Methods

```typescript
// Initialize the service
await service.initialize();

// Add a memory
const memory = await service.addMemory({
  text: 'Memory content',
  importance: 0.8,
  category: 'fact',
  metadata: { source: 'conversation' },
});

// Search memories
const results = await service.searchMemories({
  query: 'search query',
  limit: 5,
  category: 'fact',
  minImportance: 0.7,
});

// Get a memory
const memory = await service.getMemory('memory-id');

// Update a memory
await service.updateMemory('memory-id', {
  text: 'Updated content',
  importance: 0.9,
});

// Delete a memory
await service.deleteMemory('memory-id');

// Export all memories
const exportData = await service.exportMemories();

// Import memories
await service.importMemories(exportData);

// Get count
const count = await service.getCount();

// Reset all memories
await service.reset();
```

### React Hooks

#### useMemory

Main hook for memory management.

```typescript
const { state, actions } = useMemory(config?: ChromaDBConfig);
```

**State:**
- `isInitialized`: Service initialized
- `isLoading`: Operation in progress
- `error`: Current error message
- `count`: Total memory count
- `recentMemories`: Recently added memories

**Actions:**
- `initialize()`: Initialize service
- `addMemory(options)`: Add single memory
- `addMemoriesBatch(memories)`: Add multiple memories
- `searchMemories(options)`: Search memories
- `getMemory(id)`: Get memory by ID
- `updateMemory(id, updates)`: Update memory
- `deleteMemory(id)`: Delete memory
- `deleteMemories(ids)`: Delete multiple memories
- `getAllMemories(limit?)`: Get all memories
- `exportMemories()`: Export to JSON
- `importMemories(data)`: Import from JSON
- `reset()`: Clear all memories
- `refreshCount()`: Refresh count
- `clearError()`: Clear error state

#### useAutoRecall

Auto-recall relevant memories on mount.

```typescript
const { results, isRecalling, error } = useAutoRecall(query, options);
```

#### useMemoryCapture

Simplified memory capture API.

```typescript
const {
  capture,
  captureDecision,
  capturePreference,
  captureFact,
  isCapturing,
} = useMemoryCapture();
```

## Memory Categories

- **fact**: Factual information
- **preference**: User preferences
- **decision**: Decisions made
- **entity**: Entity information
- **other**: Default category

## Best Practices

### 1. Initialize Early

Initialize the memory service early in your app lifecycle:

```typescript
// In App.tsx or root component
useEffect(() => {
  actions.initialize();
}, []);
```

### 2. Use Appropriate Importance Scores

- `0.9-1.0`: Critical information
- `0.7-0.9`: Important context
- `0.5-0.7`: General information
- `<0.5`: Low priority

### 3. Batch Operations

For multiple memories, use batch operations:

```typescript
await actions.addMemoriesBatch([
  { text: 'Memory 1', category: 'fact' },
  { text: 'Memory 2', category: 'preference' },
]);
```

### 4. Error Handling

Always handle errors gracefully:

```typescript
try {
  await actions.addMemory({ text: 'Important' });
} catch (error) {
  console.error('Failed to add memory:', error);
  // Show user-friendly error message
}
```

### 5. Export Regularly

Backup memories periodically:

```typescript
const backup = async () => {
  const data = await actions.exportMemories();
  localStorage.setItem('memory-backup', JSON.stringify(data));
};
```

## Testing

Run tests with Vitest:

```bash
npm test -- memory
```

Example test:

```typescript
import { renderHook, act } from '@testing-library/react';
import { useMemory } from './useMemory';

test('adds memory', async () => {
  const { result } = renderHook(() => useMemory());
  
  await act(async () => {
    await result.current.actions.initialize();
    await result.current.actions.addMemory({ text: 'Test' });
  });
  
  expect(result.current.state.count).toBe(1);
});
```

## Architecture

```
src/renderer/
├── memory/
│   ├── types.ts              # Type definitions
│   ├── vector-memory.ts      # ChromaDB service
│   ├── vector-memory.test.ts # Service tests
│   └── README.md             # This file
└── hooks/
    ├── useMemory.ts          # Main memory hook
    └── useMemory.test.ts     # Hook tests
```

## ChromaDB Setup

### Local Development

1. Install ChromaDB:

```bash
pip install chromadb
```

2. Start ChromaDB server:

```bash
chroma run --path ./chroma-data --port 8000
```

### Production

For production, consider:

- Running ChromaDB as a separate service
- Using a managed vector database (Pinecone, Weaviate, etc.)
- Implementing proper authentication
- Setting up backup/restore procedures

## Troubleshooting

### Connection Issues

```typescript
// Check if ChromaDB is running
const checkConnection = async () => {
  try {
    await service.initialize();
    console.log('Connected!');
  } catch (error) {
    console.error('Connection failed:', error);
  }
};
```

### Embedding Errors

Ensure `@chroma-core/default-embed` is properly installed and has access to download models on first run.

### Memory Limits

For large datasets:
- Use pagination with `limit` parameter
- Implement lazy loading
- Consider server-side filtering

## License

MIT License - See project root for details.

## Contributing

1. Follow TypeScript strict mode
2. Write tests for new features
3. Update this documentation
4. Ensure ESLint passes
