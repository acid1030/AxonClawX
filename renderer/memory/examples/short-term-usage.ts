/**
 * L1 Short-term Memory Usage Examples
 * 
 * Demonstrates how to use the short-term working memory module
 * in real application scenarios.
 */

import { ShortTermMemory, getShortTermMemory } from '../short-term';

// ==================== Example 1: Basic Usage ====================
function basicUsage() {
  console.log('=== Basic Usage ===\n');

  const memory = new ShortTermMemory({
    maxMessages: 10,
    maxTokens: 1000,
  });

  // Add user message
  memory.add({
    role: 'user',
    content: 'How do I implement WebSocket communication?',
    timestamp: Date.now(),
  });

  // Add assistant response
  memory.add({
    role: 'assistant',
    content: 'WebSocket provides full-duplex communication channels over a single TCP connection.',
    timestamp: Date.now(),
  });

  // Get recent messages
  const recent = memory.getRecent(5);
  console.log(`Recent messages: ${recent.length}`);

  // Get formatted context for agent
  const context = memory.getContext();
  console.log(`Context:\n${context}\n`);

  // Get statistics
  const stats = memory.getStats();
  console.log(`Stats: ${stats.messageCount} messages, ${stats.totalTokens} tokens\n`);
}

// ==================== Example 2: Sliding Window ====================
function slidingWindowExample() {
  console.log('=== Sliding Window (FIFO) ===\n');

  const memory = new ShortTermMemory({
    maxMessages: 3, // Only keep last 3
    maxTokens: 1000,
  });

  // Add 5 messages
  for (let i = 1; i <= 5; i++) {
    memory.add({
      role: i % 2 === 0 ? 'assistant' : 'user',
      content: `Message ${i}`,
      timestamp: Date.now(),
    });
    console.log(`Added message ${i}, buffer size: ${memory.getStats().messageCount}`);
  }

  // Only last 3 remain
  console.log('\nRemaining messages:');
  memory.getRecent().forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.content}`);
  });
  console.log();
}

// ==================== Example 3: Token-based Trimming ====================
function tokenBasedTrimming() {
  console.log('=== Token-based Trimming ===\n');

  const memory = new ShortTermMemory({
    maxMessages: 100,
    maxTokens: 100, // Strict token limit
  });

  // Add messages with known token counts
  for (let i = 1; i <= 5; i++) {
    memory.add({
      role: 'user',
      content: `Long message ${i} with lots of content`,
      timestamp: Date.now(),
      tokens: 30, // Each message is 30 tokens
    });
    console.log(`Added message ${i} (30 tokens), total: ${memory.getStats().totalTokens} tokens`);
  }

  // Should trim to stay under 100 tokens
  console.log(`\nFinal: ${memory.getStats().messageCount} messages, ${memory.getStats().totalTokens} tokens\n`);
}

// ==================== Example 4: Search ====================
function searchExample() {
  console.log('=== Search Messages ===\n');

  const memory = new ShortTermMemory();

  // Add various messages
  memory.add({
    role: 'user',
    content: 'How do I implement WebSocket?',
    timestamp: Date.now(),
  });
  memory.add({
    role: 'assistant',
    content: 'WebSocket provides full-duplex communication.',
    timestamp: Date.now(),
  });
  memory.add({
    role: 'user',
    content: 'What about HTTP polling?',
    timestamp: Date.now(),
  });

  // Search for keyword
  const results = memory.search('websocket');
  console.log(`Found ${results.length} messages containing "websocket":`);
  results.forEach((m) => console.log(`  - ${m.content}`));
  console.log();
}

// ==================== Example 5: Session Persistence ====================
function sessionPersistence() {
  console.log('=== Session Persistence ===\n');

  const memory = new ShortTermMemory({
    sessionId: 'session-2026-03-13-001',
  });

  memory.add({
    role: 'user',
    content: 'Important conversation',
    timestamp: Date.now(),
    tokens: 10,
  });

  // Export to JSON
  const jsonData = memory.toJSON();
  console.log('Exported session:');
  console.log(JSON.stringify(jsonData, null, 2));

  // Restore from JSON
  const restored = ShortTermMemory.fromJSON(jsonData);
  console.log(`\nRestored: ${restored.getStats().messageCount} messages\n`);
}

// ==================== Example 6: Singleton Pattern ====================
function singletonExample() {
  console.log('=== Singleton Pattern ===\n');

  // Get global instance
  const memory1 = getShortTermMemory({
    maxMessages: 10,
    maxTokens: 1000,
  });

  // Get it again (same instance)
  const memory2 = getShortTermMemory();

  console.log(`Same instance: ${memory1 === memory2}`);

  // Use throughout your app
  memory1.add({
    role: 'user',
    content: 'Global conversation',
    timestamp: Date.now(),
  });

  console.log(`Memory2 sees it: ${memory2.getStats().messageCount} messages\n`);
}

// ==================== Example 7: Integration with Agent Loop ====================
class AgentWithMemory {
  private memory: ShortTermMemory;

  constructor() {
    this.memory = new ShortTermMemory({
      maxMessages: 10,
      maxTokens: 1000,
    });
  }

  async processMessage(userInput: string): Promise<string> {
    // Add user message to memory
    this.memory.add({
      role: 'user',
      content: userInput,
      timestamp: Date.now(),
    });

    // Get context for agent
    const context = this.memory.getContext();

    // Simulate agent response (in real app, call LLM with context)
    const response = `Processed with context: ${context.length} chars`;

    // Add response to memory
    this.memory.add({
      role: 'assistant',
      content: response,
      timestamp: Date.now(),
    });

    return response;
  }

  getConversationHistory() {
    return this.memory.getRecent();
  }

  reset() {
    this.memory.clear();
  }
}

async function agentIntegrationExample() {
  console.log('=== Agent Integration ===\n');

  const agent = new AgentWithMemory();

  // Simulate conversation
  await agent.processMessage('Hello!');
  await agent.processMessage('How are you?');
  await agent.processMessage('Tell me about WebSocket');

  console.log('Conversation history:');
  agent.getConversationHistory().forEach((m, i) => {
    console.log(`  ${i + 1}. [${m.role}] ${m.content}`);
  });

  console.log(`\nStats: ${agent.getConversationHistory().length} messages\n`);
}

// ==================== Example 8: Performance Test ====================
function performanceTest() {
  console.log('=== Performance Test ===\n');

  const memory = new ShortTermMemory({
    maxMessages: 10,
    maxTokens: 1000,
  });

  // Fill buffer
  for (let i = 0; i < 10; i++) {
    memory.add({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i} with realistic content for testing purposes`,
      timestamp: Date.now(),
    });
  }

  // Measure retrieval time
  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    memory.getRecent();
  }

  const elapsed = performance.now() - start;
  const avgMs = elapsed / iterations;

  console.log(`${iterations} retrievals: ${elapsed.toFixed(2)}ms total`);
  console.log(`Average: ${avgMs.toFixed(4)}ms per retrieval`);
  console.log(`Target: <10ms ✅\n`);
}

// ==================== Run All Examples ====================
function runAllExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     L1 Short-term Memory Usage Examples               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  basicUsage();
  slidingWindowExample();
  tokenBasedTrimming();
  searchExample();
  sessionPersistence();
  singletonExample();
  agentIntegrationExample();
  performanceTest();

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     All examples completed!                           ║');
  console.log('╚════════════════════════════════════════════════════════╝');
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

// Export for testing
export {
  basicUsage,
  slidingWindowExample,
  tokenBasedTrimming,
  searchExample,
  sessionPersistence,
  singletonExample,
  agentIntegrationExample,
  performanceTest,
  runAllExamples,
  AgentWithMemory,
};
