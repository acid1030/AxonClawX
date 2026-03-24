/**
 * L1 + L2 Memory Integration Examples
 * 
 * Demonstrates how to use the integrated memory system combining:
 * - L1: Short-term conversation memory
 * - L2: Mid-term file-based memory
 */

import {
  IntegratedMemoryManager,
  MidTermMemory,
  ShortTermMemory,
  type FileMemoryQuery,
} from '../index';

// ==================== Example 1: Basic Integration ====================

export function example1_BasicIntegration() {
  console.log('=== Example 1: Basic Integration ===\n');

  // Create integrated memory manager
  const memory = new IntegratedMemoryManager(
    // L1 config
    { maxMessages: 10, maxTokens: 1000 },
    // L2 config
    {
      retentionDays: 7,
      storagePath: './.memory/mid-term',
      autoCleanup: true,
    }
  );

  // Add conversation messages to L1
  memory.addMessage({
    role: 'user',
    content: 'I need to work on the authentication module',
    timestamp: Date.now(),
  });

  memory.addMessage({
    role: 'assistant',
    content: 'Sure! Which files are you working with?',
    timestamp: Date.now(),
  });

  // Capture relevant files to L2
  const filesToCapture = [
    './src/auth/login.ts',
    './src/auth/register.ts',
    './src/auth/utils.ts',
  ];

  for (const filePath of filesToCapture) {
    // In real usage, these files would exist on disk
    // memory.getL2().addFileFromDisk(filePath, ['auth', 'security']);
  }

  console.log('✓ Added messages to L1');
  console.log('✓ Captured files to L2');
  console.log('');
}

// ==================== Example 2: Unified Context Retrieval ====================

export function example2_UnifiedContext() {
  console.log('=== Example 2: Unified Context Retrieval ===\n');

  const memory = new IntegratedMemoryManager();

  // Simulate conversation
  memory.addMessage({
    role: 'user',
    content: 'Show me the recent changes to the API endpoints',
    timestamp: Date.now(),
  });

  // Get unified context from both L1 and L2
  const context = memory.getContext({
    l1Limit: 5, // Last 5 messages
    l2Query: {
      pathPattern: 'src/api/',
      fileType: 'ts',
      modifiedAfter: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
      limit: 10,
    },
  });

  console.log('Unified Context:');
  console.log(context);
  console.log('');
}

// ==================== Example 3: Cross-Layer Search ====================

export function example3_CrossLayerSearch() {
  console.log('=== Example 3: Cross-Layer Search ===\n');

  const memory = new IntegratedMemoryManager();

  // Add messages mentioning specific topics
  memory.addMessage({
    role: 'user',
    content: 'I\'m working on the database migration scripts',
    timestamp: Date.now(),
  });

  memory.addMessage({
    role: 'assistant',
    content: 'The migration files are in ./src/db/migrations/',
    timestamp: Date.now(),
  });

  // Search across both layers
  const keyword = 'database';
  const results = memory.search(keyword);

  console.log(`Search results for "${keyword}":`);
  console.log(`L1 (Messages): ${results.l1.length} matches`);
  console.log(`L2 (Files): ${results.l2.length} matches`);

  if (results.l1.length > 0) {
    console.log('\nMatching messages:');
    results.l1.forEach(msg => {
      console.log(`  - [${msg.role}] ${msg.content.slice(0, 50)}...`);
    });
  }

  if (results.l2.length > 0) {
    console.log('\nMatching files:');
    results.l2.forEach(file => {
      console.log(`  - ${file.filePath} (${file.fileType})`);
    });
  }

  console.log('');
}

// ==================== Example 4: File-Based Queries ====================

export function example4_FileQueries() {
  console.log('=== Example 4: File-Based Queries ===\n');

  const l2 = new MidTermMemory({
    retentionDays: 7,
    includeExtensions: ['.ts', '.tsx', '.js', '.jsx'],
    excludeExtensions: ['.test.ts', '.spec.ts'],
  });

  // Add various files
  const files = [
    { path: './src/components/Button.tsx', tags: ['ui', 'components'] },
    { path: './src/utils/helpers.ts', tags: ['utils'] },
    { path: './src/api/users.ts', tags: ['api', 'users'] },
    { path: './src/api/posts.ts', tags: ['api', 'posts'] },
  ];

  for (const file of files) {
    // l2.addFileFromDisk(file.path, file.tags);
  }

  // Query by type
  const tsFiles = l2.getByType('ts');
  console.log(`TypeScript files: ${tsFiles.length}`);

  // Query by path pattern
  const apiFiles = l2.getByPath('src/api/');
  console.log(`API files: ${apiFiles.length}`);

  // Query by tags
  const uiFiles = l2.query({ tags: ['ui'] });
  console.log(`UI files: ${uiFiles.length}`);

  // Query by time range
  const recentFiles = l2.getRecent(7);
  console.log(`Files modified in last 7 days: ${recentFiles.length}`);

  // Complex query
  const complexQuery: FileMemoryQuery = {
    pathPattern: 'src/',
    fileType: 'ts',
    tags: ['api'],
    modifiedAfter: Date.now() - 24 * 60 * 60 * 1000, // Last 24h
    limit: 5,
  };

  const complexResults = l2.query(complexQuery);
  console.log(`Complex query results: ${complexResults.length}`);

  console.log('');
}

// ==================== Example 5: Memory Statistics ====================

export function example5_Statistics() {
  console.log('=== Example 5: Memory Statistics ===\n');

  const memory = new IntegratedMemoryManager();

  // Add some data
  for (let i = 0; i < 5; i++) {
    memory.addMessage({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i}`,
      timestamp: Date.now(),
    });
  }

  // Get L1 stats
  const l1Stats = memory.getL1().getStats();
  console.log('L1 Statistics:');
  console.log(`  Messages: ${l1Stats.messageCount}`);
  console.log(`  Tokens: ${l1Stats.totalTokens}`);
  console.log(`  Session ID: ${l1Stats.sessionId}`);
  console.log(`  Uptime: ${Math.round(l1Stats.uptime / 1000)}s`);

  // Get L2 stats
  const l2Stats = memory.getL2().getStats();
  console.log('\nL2 Statistics:');
  console.log(`  Total entries: ${l2Stats.totalEntries}`);
  console.log(`  Storage size: ${Math.round(l2Stats.storageSize / 1024)}KB`);
  console.log(`  File types:`, l2Stats.entriesByType);

  if (l2Stats.totalEntries > 0) {
    const oldest = new Date(l2Stats.oldestEntry);
    const newest = new Date(l2Stats.newestEntry);
    console.log(`  Oldest entry: ${oldest.toLocaleString()}`);
    console.log(`  Newest entry: ${newest.toLocaleString()}`);
  }

  console.log('');
}

// ==================== Example 6: Persistence ====================

export function example6_Persistence() {
  console.log('=== Example 6: Persistence ===\n');

  const l2 = new MidTermMemory({
    storagePath: './.memory/mid-term',
  });

  // Export all memories
  const exported = l2.export();
  console.log(`Exported ${exported.length} entries`);

  // Create new instance
  const l2Copy = new MidTermMemory({
    storagePath: './.memory/mid-term-copy',
  });

  // Import into new instance
  l2Copy.import(exported);
  console.log(`Imported ${l2Copy.getStats().totalEntries} entries`);

  console.log('');
}

// ==================== Example 7: Automatic Cleanup ====================

export function example7_AutoCleanup() {
  console.log('=== Example 7: Automatic Cleanup ===\n');

  // Memory with 7-day retention
  const memory = new MidTermMemory({
    retentionDays: 7,
    autoCleanup: true,
  });

  // Manually create an old entry
  const oldEntries = [
    {
      id: 'file_old',
      filePath: '/old/file.txt',
      content: 'old content',
      fileType: 'txt',
      fileSize: 100,
      fileModifiedAt: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      createdAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
      lastAccessedAt: Date.now() - 10 * 24 * 60 * 60 * 1000,
    },
  ];

  memory.import(oldEntries as any);
  console.log(`Before cleanup: ${memory.getStats().totalEntries} entries`);

  // Trigger cleanup
  const removed = memory.cleanupExpired();
  console.log(`Removed ${removed} expired entries`);
  console.log(`After cleanup: ${memory.getStats().totalEntries} entries`);

  console.log('');
}

// ==================== Example 8: Real-World Workflow ====================

export function example8_RealWorldWorkflow() {
  console.log('=== Example 8: Real-World Workflow ===\n');

  // Initialize memory system
  const memory = new IntegratedMemoryManager(
    { maxMessages: 20 },
    {
      retentionDays: 7,
      includeExtensions: ['.ts', '.tsx', '.md', '.json'],
    }
  );

  // 1. User starts a conversation
  memory.addMessage({
    role: 'user',
    content: 'I want to add a new feature to the user profile page',
    timestamp: Date.now(),
  });

  // 2. Assistant responds and captures relevant files
  memory.addMessage(
    {
      role: 'assistant',
      content: 'Great! Let me load the relevant files for you.',
      timestamp: Date.now(),
    },
    [
      './src/pages/Profile.tsx',
      './src/components/ProfileForm.tsx',
      './src/types/user.ts',
    ]
  );

  // 3. User makes changes
  memory.addMessage({
    role: 'user',
    content: 'I need to add a phone number field to the form',
    timestamp: Date.now(),
  });

  // 4. Get context for next agent turn
  const context = memory.getContext({
    l2Query: {
      pathPattern: 'Profile',
      limit: 5,
    },
  });

  console.log('Context for next agent turn:');
  console.log(context);
  console.log('');

  // 5. Search for related work
  const relatedWork = memory.search('profile');
  console.log(`Found ${relatedWork.l1.length} messages and ${relatedWork.l2.length} files related to "profile"`);

  console.log('');
}

// ==================== Run All Examples ====================

export function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  L1 + L2 Memory Integration Examples            ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  example1_BasicIntegration();
  example2_UnifiedContext();
  example3_CrossLayerSearch();
  example4_FileQueries();
  example5_Statistics();
  example6_Persistence();
  example7_AutoCleanup();
  example8_RealWorldWorkflow();

  console.log('✅ All examples completed!\n');
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
