/**
 * L1 Short-term Memory Unit Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ShortTermMemory, getShortTermMemory, resetShortTermMemory } from './short-term';

describe('ShortTermMemory', () => {
  let memory: ShortTermMemory;

  beforeEach(() => {
    resetShortTermMemory();
    memory = new ShortTermMemory({
      maxMessages: 10,
      maxTokens: 1000,
    });
  });

  describe('constructor', () => {
    it('should create with default config', () => {
      const defaultMemory = new ShortTermMemory();
      const stats = defaultMemory.getStats();
      
      expect(stats.messageCount).toBe(0);
      expect(stats.sessionId).toBeDefined();
    });

    it('should create with custom config', () => {
      const customMemory = new ShortTermMemory({
        maxMessages: 5,
        maxTokens: 500,
        sessionId: 'test-session-123',
      });
      
      const stats = customMemory.getStats();
      expect(stats.sessionId).toBe('test-session-123');
    });
  });

  describe('add', () => {
    it('should add a message to buffer', () => {
      const message = {
        role: 'user' as const,
        content: 'Hello, world!',
        timestamp: Date.now(),
      };

      const size = memory.add(message);
      expect(size).toBe(1);
      expect(memory.getStats().messageCount).toBe(1);
    });

    it('should estimate tokens if not provided', () => {
      const message = {
        role: 'assistant' as const,
        content: 'This is a test message with about 50 characters',
        timestamp: Date.now(),
      };

      memory.add(message);
      const recent = memory.getRecent(1);
      expect(recent[0].tokens).toBeDefined();
      expect(recent[0].tokens!).toBeGreaterThan(0);
    });

    it('should use provided token count', () => {
      const message = {
        role: 'user' as const,
        content: 'Test',
        timestamp: Date.now(),
        tokens: 100,
      };

      memory.add(message);
      expect(memory.getStats().totalTokens).toBe(100);
    });
  });

  describe('sliding window (FIFO)', () => {
    it('should maintain maxMessages limit', () => {
      const smallMemory = new ShortTermMemory({ maxMessages: 3, maxTokens: 10000 });

      for (let i = 0; i < 5; i++) {
        smallMemory.add({
          role: 'user' as const,
          content: `Message ${i}`,
          timestamp: Date.now(),
        });
      }

      expect(smallMemory.getStats().messageCount).toBe(3);
      const messages = smallMemory.getRecent();
      expect(messages[0].content).toBe('Message 2'); // Oldest kept
      expect(messages[2].content).toBe('Message 4'); // Newest
    });

    it('should maintain maxTokens limit', () => {
      const smallMemory = new ShortTermMemory({ maxMessages: 100, maxTokens: 100 });

      // Add messages with known token counts
      for (let i = 0; i < 5; i++) {
        smallMemory.add({
          role: 'user' as const,
          content: 'A'.repeat(40), // ~10 tokens each
          timestamp: Date.now(),
          tokens: 10,
        });
      }

      // Should trim to stay under 100 tokens
      expect(smallMemory.getStats().totalTokens).toBeLessThanOrEqual(100);
    });

    it('should remove oldest messages first', () => {
      const smallMemory = new ShortTermMemory({ maxMessages: 2, maxTokens: 10000 });

      smallMemory.add({
        role: 'user' as const,
        content: 'First',
        timestamp: 1000,
      });
      smallMemory.add({
        role: 'assistant' as const,
        content: 'Second',
        timestamp: 2000,
      });
      smallMemory.add({
        role: 'user' as const,
        content: 'Third',
        timestamp: 3000,
      });

      const messages = smallMemory.getRecent();
      expect(messages.length).toBe(2);
      expect(messages[0].content).toBe('Second');
      expect(messages[1].content).toBe('Third');
    });
  });

  describe('getRecent', () => {
    beforeEach(() => {
      for (let i = 0; i < 5; i++) {
        memory.add({
          role: i % 2 === 0 ? 'user' : 'assistant' as const,
          content: `Message ${i}`,
          timestamp: Date.now(),
        });
      }
    });

    it('should return all messages without limit', () => {
      const all = memory.getRecent();
      expect(all.length).toBe(5);
    });

    it('should return limited messages', () => {
      const limited = memory.getRecent(3);
      expect(limited.length).toBe(3);
      expect(limited[0].content).toBe('Message 2');
      expect(limited[2].content).toBe('Message 4');
    });

    it('should return messages in order', () => {
      const messages = memory.getRecent();
      for (let i = 0; i < messages.length - 1; i++) {
        expect(messages[i].timestamp).toBeLessThanOrEqual(
          messages[i + 1].timestamp
        );
      }
    });
  });

  describe('getContext', () => {
    it('should return formatted context string', () => {
      memory.add({
        role: 'user' as const,
        content: 'Hello',
        timestamp: Date.now(),
      });
      memory.add({
        role: 'assistant' as const,
        content: 'Hi there!',
        timestamp: Date.now(),
      });

      const context = memory.getContext();
      expect(context).toContain('user: Hello');
      expect(context).toContain('assistant: Hi there!');
    });

    it('should return empty string for empty buffer', () => {
      const emptyMemory = new ShortTermMemory();
      expect(emptyMemory.getContext()).toBe('');
    });
  });

  describe('search', () => {
    beforeEach(() => {
      memory.add({
        role: 'user' as const,
        content: 'How do I implement WebSocket?',
        timestamp: Date.now(),
      });
      memory.add({
        role: 'assistant' as const,
        content: 'WebSocket provides full-duplex communication',
        timestamp: Date.now(),
      });
      memory.add({
        role: 'user' as const,
        content: 'What about HTTP?',
        timestamp: Date.now(),
      });
    });

    it('should find messages containing keyword', () => {
      const results = memory.search('websocket');
      expect(results.length).toBe(1);
      expect(results[0].content).toContain('WebSocket');
    });

    it('should be case-insensitive', () => {
      const results1 = memory.search('WEBSOCKET');
      const results2 = memory.search('websocket');
      expect(results1.length).toBe(results2.length);
    });

    it('should return empty array for no matches', () => {
      const results = memory.search('nonexistent');
      expect(results.length).toBe(0);
    });
  });

  describe('removeOldest', () => {
    it('should remove and return oldest message', () => {
      memory.add({
        role: 'user' as const,
        content: 'First',
        timestamp: 1000,
        tokens: 5,
      });
      memory.add({
        role: 'assistant' as const,
        content: 'Second',
        timestamp: 2000,
        tokens: 5,
      });

      const removed = memory.removeOldest();
      expect(removed?.content).toBe('First');
      expect(memory.getStats().messageCount).toBe(1);
      expect(memory.getStats().totalTokens).toBe(5);
    });

    it('should return undefined for empty buffer', () => {
      const emptyMemory = new ShortTermMemory();
      const removed = emptyMemory.removeOldest();
      expect(removed).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('should reset all state', () => {
      memory.add({
        role: 'user' as const,
        content: 'Test',
        timestamp: Date.now(),
      });

      const oldSessionId = memory.getStats().sessionId;
      memory.clear();

      const stats = memory.getStats();
      expect(stats.messageCount).toBe(0);
      expect(stats.totalTokens).toBe(0);
      expect(stats.sessionId).not.toBe(oldSessionId);
    });
  });

  describe('getSessionData', () => {
    it('should return complete session snapshot', () => {
      memory.add({
        role: 'user' as const,
        content: 'Test message',
        timestamp: 1234567890,
        tokens: 10,
      });

      const data = memory.getSessionData();
      
      expect(data.sessionId).toBeDefined();
      expect(data.startTime).toBeDefined();
      expect(data.messages.length).toBe(1);
      expect(data.totalTokens).toBe(10);
      expect(data.lastUpdated).toBeDefined();
    });
  });

  describe('toJSON/fromJSON', () => {
    it('should serialize and deserialize correctly', () => {
      memory.add({
        role: 'user' as const,
        content: 'Persistent message',
        timestamp: 1234567890,
        tokens: 15,
      });

      const json = memory.toJSON();
      const restored = ShortTermMemory.fromJSON(json);

      expect(restored.getStats().messageCount).toBe(1);
      expect(restored.getRecent()[0].content).toBe('Persistent message');
      expect(restored.getStats().sessionId).toBe(json.sessionId);
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', () => {
      memory.add({
        role: 'user' as const,
        content: 'Message 1',
        timestamp: Date.now(),
        tokens: 10,
      });
      memory.add({
        role: 'assistant' as const,
        content: 'Message 2',
        timestamp: Date.now(),
        tokens: 20,
      });

      const stats = memory.getStats();
      
      expect(stats.messageCount).toBe(2);
      expect(stats.totalTokens).toBe(30);
      expect(stats.sessionId).toBeDefined();
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('performance', () => {
    it('should retrieve messages in <10ms', () => {
      // Fill buffer
      for (let i = 0; i < 10; i++) {
        memory.add({
          role: 'user' as const,
          content: `Message ${i} with some content to make it realistic`,
          timestamp: Date.now(),
        });
      }

      const start = performance.now();
      memory.getRecent();
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(10);
    });

    it('should handle 1000 additions efficiently', () => {
      const perfMemory = new ShortTermMemory({
        maxMessages: 10,
        maxTokens: 10000,
      });

      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        perfMemory.add({
          role: 'user' as const,
          content: `Stress test message ${i}`,
          timestamp: Date.now(),
        });
      }
      const elapsed = performance.now() - start;

      // Should complete in <100ms (generous for 1000 ops with trimming)
      expect(elapsed).toBeLessThan(100);
      expect(perfMemory.getStats().messageCount).toBe(10);
    });
  });
});

describe('Singleton functions', () => {
  beforeEach(() => {
    resetShortTermMemory();
  });

  it('should create global instance on first call', () => {
    const instance1 = getShortTermMemory();
    const instance2 = getShortTermMemory();
    
    expect(instance1).toBe(instance2); // Same instance
  });

  it('should use provided config on first call', () => {
    const instance = getShortTermMemory({
      maxMessages: 5,
      sessionId: 'custom-session',
    });

    expect(instance.getStats().sessionId).toBe('custom-session');
  });

  it('should reset on resetShortTermMemory', () => {
    const instance1 = getShortTermMemory();
    resetShortTermMemory();
    const instance2 = getShortTermMemory();

    expect(instance1).not.toBe(instance2);
  });
});
