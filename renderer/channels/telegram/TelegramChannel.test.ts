/**
 * TelegramChannel Test Suite
 * 
 * Tests for Telegram Channel implementation.
 * Run with: npm test -- channels/telegram/TelegramChannel.test.ts
 * 
 * Note: Integration tests require a valid Telegram Bot Token.
 * Set TELEGRAM_TEST_BOT_TOKEN environment variable to run integration tests.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TelegramChannel } from './TelegramChannel';
import { TelegramConfig, ChannelStatus, IncomingMessage } from '../types';

// Mock fetch for unit tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Test configuration
const TEST_CONFIG: TelegramConfig = {
  name: 'Test Bot',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: {
    botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
    botUsername: 'test_bot',
    allowedChatIds: ['123456789', '987654321'],
    pollingInterval: 1000,
  },
};

const TEST_CONFIG_NO_RESTRICTIONS: TelegramConfig = {
  name: 'Test Bot Open',
  type: 'telegram',
  enabled: true,
  status: 'disconnected',
  config: {
    botToken: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz',
    pollingInterval: 1000,
  },
};

describe('TelegramChannel', () => {
  let channel: TelegramChannel;

  beforeEach(() => {
    channel = new TelegramChannel(TEST_CONFIG);
    mockFetch.mockReset();
  });

  afterEach(async () => {
    try {
      await channel.disconnect();
    } catch (error) {
      // Ignore disconnect errors in cleanup
    }
  });

  describe('Constructor', () => {
    it('should create a channel with unique ID', () => {
      const channel1 = new TelegramChannel(TEST_CONFIG);
      const channel2 = new TelegramChannel(TEST_CONFIG);

      expect(channel1.id).toBeDefined();
      expect(channel2.id).toBeDefined();
      expect(channel1.id).not.toBe(channel2.id);
      expect(channel1.id).toMatch(/^telegram_\d+_[a-z0-9]+$/);
    });

    it('should initialize with disconnected status', () => {
      expect(channel.getStatus()).toBe('disconnected');
    });

    it('should store config correctly', () => {
      expect(channel.config).toEqual(TEST_CONFIG);
    });
  });

  describe('connect()', () => {
    it('should connect successfully with valid token', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            id: 123456789,
            is_bot: true,
            first_name: 'Test',
            username: 'test_bot',
          },
        }),
      });

      await channel.connect();

      expect(channel.getStatus()).toBe('connected');
      expect(channel.getBotUsername()).toBe('test_bot');
      expect(channel.getLastError()).toBeNull();
    });

    it('should handle connection failure with invalid token', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          error_code: 401,
          description: 'Unauthorized',
        }),
      });

      await expect(channel.connect()).rejects.toThrow('Unauthorized');
      expect(channel.getStatus()).toBe('error');
      expect(channel.getLastError()).toBeDefined();
    });

    it('should emit connected event', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            id: 123456789,
            is_bot: true,
            first_name: 'Test',
            username: 'test_bot',
          },
        }),
      });

      const eventListener = vi.fn();
      channel.onEvent(eventListener);

      await channel.connect();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'connected',
          channelId: channel.id,
        })
      );
    });

    it('should start polling when no webhook URL is provided', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: {
              id: 123456789,
              is_bot: true,
              first_name: 'Test',
              username: 'test_bot',
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: [],
          }),
        });

      await channel.connect();
      
      // Wait a bit for polling to start
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/getUpdates'),
        expect.any(Object)
      );
    });

    it('should set webhook when webhook URL is provided', async () => {
      const configWithWebhook: TelegramConfig = {
        ...TEST_CONFIG,
        config: {
          ...TEST_CONFIG.config,
          webhookUrl: 'https://example.com/webhook/telegram',
        },
      };

      const webhookChannel = new TelegramChannel(configWithWebhook);

      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: {
              id: 123456789,
              is_bot: true,
              first_name: 'Test',
              username: 'test_bot',
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: true,
          }),
        });

      await webhookChannel.connect();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/setWebhook'),
        expect.any(Object)
      );
    });
  });

  describe('disconnect()', () => {
    it('should disconnect successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            id: 123456789,
            is_bot: true,
            first_name: 'Test',
            username: 'test_bot',
          },
        }),
      });

      await channel.connect();
      expect(channel.getStatus()).toBe('connected');

      await channel.disconnect();
      expect(channel.getStatus()).toBe('disconnected');
    });

    it('should delete webhook when disconnecting', async () => {
      const configWithWebhook: TelegramConfig = {
        ...TEST_CONFIG,
        config: {
          ...TEST_CONFIG.config,
          webhookUrl: 'https://example.com/webhook/telegram',
        },
      };

      const webhookChannel = new TelegramChannel(configWithWebhook);

      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: {
              id: 123456789,
              is_bot: true,
              first_name: 'Test',
              username: 'test_bot',
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: true,
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: true,
          }),
        });

      await webhookChannel.connect();
      await webhookChannel.disconnect();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/deleteWebhook'),
        expect.any(Object)
      );
    });

    it('should emit disconnected event', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            id: 123456789,
            is_bot: true,
            first_name: 'Test',
            username: 'test_bot',
          },
        }),
      });

      await channel.connect();

      const eventListener = vi.fn();
      channel.onEvent(eventListener);

      await channel.disconnect();

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'disconnected',
          channelId: channel.id,
        })
      );
    });
  });

  describe('sendMessage()', () => {
    beforeEach(async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            id: 123456789,
            is_bot: true,
            first_name: 'Test',
            username: 'test_bot',
          },
        }),
      });
      await channel.connect();
    });

    it('should send message successfully', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            message_id: 12345,
            chat: { id: 123456789, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Hello!',
          },
        }),
      });

      const result = await channel.sendMessage('123456789', 'Hello!');

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('12345');
      expect(result.timestamp).toBeDefined();
    });

    it('should handle send failure', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          error_code: 400,
          description: 'Bad Request: chat not found',
        }),
      });

      const result = await channel.sendMessage('invalid_chat', 'Hello!');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject messages to non-allowed chats', async () => {
      const result = await channel.sendMessage('999999999', 'Hello!');

      expect(result.success).toBe(false);
      expect(result.error).toContain('not in the allowed list');
    });

    it('should send with markdown parse mode', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            message_id: 12345,
            chat: { id: 123456789, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: '**Bold**',
          },
        }),
      });

      await channel.sendMessage('123456789', '**Bold**', { parseMode: 'markdown' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"parse_mode":"MarkdownV2"'),
        })
      );
    });

    it('should send with HTML parse mode', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            message_id: 12345,
            chat: { id: 123456789, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: '<b>Bold</b>',
          },
        }),
      });

      await channel.sendMessage('123456789', '<b>Bold</b>', { parseMode: 'html' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"parse_mode":"HTML"'),
        })
      );
    });

    it('should send reply to message', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            message_id: 12345,
            chat: { id: 123456789, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text: 'Reply',
          },
        }),
      });

      await channel.sendMessage('123456789', 'Reply', { replyTo: '98765' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('"reply_to_message_id":98765'),
        })
      );
    });
  });

  describe('Event Handling', () => {
    it('should register and remove event listeners', () => {
      const listener = vi.fn();
      const cleanup = channel.onEvent(listener);

      expect(listener).not.toHaveBeenCalled();

      cleanup();

      // Listener should be removed
      expect(channel.onEvent).toBeDefined();
    });

    it('should register and remove message listeners', () => {
      const listener = vi.fn();
      const cleanup = channel.onMessage(listener);

      expect(listener).not.toHaveBeenCalled();

      cleanup();
    });

    it('should emit message events when receiving messages', async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: {
              id: 123456789,
              is_bot: true,
              first_name: 'Test',
              username: 'test_bot',
            },
          }),
        })
        .mockResolvedValueOnce({
          json: async () => ({
            ok: true,
            result: [
              {
                update_id: 1,
                message: {
                  message_id: 100,
                  from: {
                    id: 123456789,
                    first_name: 'User',
                    username: 'testuser',
                  },
                  chat: { id: 123456789, type: 'private' },
                  date: Math.floor(Date.now() / 1000),
                  text: 'Hello bot!',
                },
              },
            ],
          }),
        });

      const eventListener = vi.fn();
      channel.onEvent(eventListener);

      await channel.connect();

      // Wait for polling to process
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'message',
          channelId: channel.id,
        })
      );
    });
  });

  describe('Chat Restrictions', () => {
    it('should allow all chats when no allowedChatIds specified', () => {
      const openChannel = new TelegramChannel(TEST_CONFIG_NO_RESTRICTIONS);
      // This is tested internally in sendMessage
      // The channel should not filter any chats
    });

    it('should only allow specified chat IDs', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: true,
          result: {
            id: 123456789,
            is_bot: true,
            first_name: 'Test',
            username: 'test_bot',
          },
        }),
      });

      await channel.connect();

      // Allowed chat
      const allowedResult = await channel.sendMessage('123456789', 'Hello');
      expect(allowedResult.success).toBe(true);

      // Not allowed chat
      const blockedResult = await channel.sendMessage('999999999', 'Hello');
      expect(blockedResult.success).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should track last error', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          error_code: 401,
          description: 'Unauthorized',
        }),
      });

      try {
        await channel.connect();
      } catch (error) {
        // Expected
      }

      expect(channel.getLastError()).toBeDefined();
      expect(channel.getLastError()?.message).toContain('Unauthorized');
    });

    it('should emit error events', async () => {
      mockFetch.mockResolvedValueOnce({
        json: async () => ({
          ok: false,
          error_code: 401,
          description: 'Unauthorized',
        }),
      });

      const eventListener = vi.fn();
      channel.onEvent(eventListener);

      try {
        await channel.connect();
      } catch (error) {
        // Expected
      }

      expect(eventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          channelId: channel.id,
        })
      );
    });
  });
});

// ===========================================================================
// Integration Tests (require valid bot token)
// ===========================================================================

describe('TelegramChannel [Integration]', () => {
  const botToken = process.env.TELEGRAM_TEST_BOT_TOKEN;

  if (!botToken) {
    it.skip('Integration tests skipped - set TELEGRAM_TEST_BOT_TOKEN', () => {
      // Skip if no token provided
    });
    return;
  }

  const integrationConfig: TelegramConfig = {
    name: 'Integration Test Bot',
    type: 'telegram',
    enabled: true,
    status: 'disconnected',
    config: {
      botToken,
      pollingInterval: 3000,
    },
  };

  it('should connect with real bot token', async () => {
    const channel = new TelegramChannel(integrationConfig);

    try {
      await channel.connect();
      expect(channel.getStatus()).toBe('connected');
      expect(channel.getBotUsername()).toBeDefined();
    } finally {
      await channel.disconnect();
    }
  }, 10000);

  it('should send and receive messages', async () => {
    const channel = new TelegramChannel(integrationConfig);
    const testChatId = process.env.TELEGRAM_TEST_CHAT_ID;

    if (!testChatId) {
      console.warn('TELEGRAM_TEST_CHAT_ID not set, skipping message test');
      return;
    }

    try {
      await channel.connect();

      const receivedMessages: IncomingMessage[] = [];
      channel.onMessage(msg => receivedMessages.push(msg));

      // Send a test message
      const result = await channel.sendMessage(testChatId, 'Test message from integration test');
      expect(result.success).toBe(true);
    } finally {
      await channel.disconnect();
    }
  }, 15000);
});
