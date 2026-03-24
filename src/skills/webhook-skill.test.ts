/**
 * Webhook 技能测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  WebhookSender,
  sendWebhook,
  createWebhookPayload,
  verifySignature,
  verifyWebhookSignature,
  generateSignature,
} from './webhook-skill';

// Mock fetch globally
global.fetch = vi.fn();

describe('Webhook Skill', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSignature', () => {
    it('should generate HMAC-SHA256 signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const signature = generateSignature(payload, secret);

      expect(signature).toBeDefined();
      expect(signature.length).toBe(64); // SHA256 hex length
    });

    it('should generate consistent signatures', () => {
      const payload = JSON.stringify({ event: 'test' });
      const secret = 'my-secret';

      const sig1 = generateSignature(payload, secret);
      const sig2 = generateSignature(payload, secret);

      expect(sig1).toBe(sig2);
    });

    it('should generate different signatures for different payloads', () => {
      const secret = 'secret';
      const sig1 = generateSignature(JSON.stringify({ a: 1 }), secret);
      const sig2 = generateSignature(JSON.stringify({ a: 2 }), secret);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('verifySignature', () => {
    it('should verify correct signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';
      const signature = generateSignature(payload, secret);

      const result = verifySignature(payload, signature, secret);

      expect(result.valid).toBe(true);
      expect(result.receivedSignature).toBe(signature);
      expect(result.computedSignature).toBe(signature);
    });

    it('should reject incorrect signature', () => {
      const payload = JSON.stringify({ test: 'data' });
      const secret = 'test-secret';

      const result = verifySignature(payload, 'wrong-signature', secret);

      expect(result.valid).toBe(false);
    });

    it('should reject when secret does not match', () => {
      const payload = JSON.stringify({ test: 'data' });
      const signature = generateSignature(payload, 'secret1');

      const result = verifySignature(payload, signature, 'secret2');

      expect(result.valid).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('should verify webhook signature from body', () => {
      const body = { event: 'test', data: {} };
      const secret = 'webhook-secret';
      const signature = generateSignature(JSON.stringify(body), secret);

      const result = verifyWebhookSignature(body, signature, secret);

      expect(result.valid).toBe(true);
    });

    it('should fail when no signature provided', () => {
      const result = verifyWebhookSignature({ test: 'data' }, undefined, 'secret');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No signature header provided');
    });

    it('should fail when no secret configured', () => {
      const result = verifyWebhookSignature({ test: 'data' }, 'signature', '');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('No secret configured');
    });
  });

  describe('createWebhookPayload', () => {
    it('should create payload with required fields', () => {
      const payload = createWebhookPayload('user.created', { userId: '123' });

      expect(payload.event).toBe('user.created');
      expect(payload.data).toEqual({ userId: '123' });
      expect(payload.timestamp).toBeDefined();
      expect(payload.id).toBeDefined();
    });

    it('should use custom id if provided', () => {
      const payload = createWebhookPayload(
        'order.completed',
        { orderId: '1' },
        'custom-id-123'
      );

      expect(payload.id).toBe('custom-id-123');
    });

    it('should generate unique ids', () => {
      const payload1 = createWebhookPayload('event1', {});
      const payload2 = createWebhookPayload('event2', {});

      expect(payload1.id).not.toBe(payload2.id);
    });
  });

  describe('WebhookSender', () => {
    it('should send webhook successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ success: true }),
        text: async () => 'OK',
        headers: new Map([['content-type', 'application/json']]),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const sender = new WebhookSender({
        url: 'https://example.com/webhook',
      });

      const result = await sender.send({
        event: 'test.event',
        timestamp: Date.now(),
        data: { test: true },
      });

      expect(result.success).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should add signature when secret is provided', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ success: true }),
        text: async () => 'OK',
        headers: new Map(),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const sender = new WebhookSender({
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        signatureHeader: 'X-Signature',
      });

      await sender.send({
        event: 'test.event',
        timestamp: Date.now(),
        data: {},
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Signature': expect.any(String),
          }),
        })
      );
    });

    it('should retry on failure', async () => {
      const mockFailure = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      const mockSuccess = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ success: true }),
        text: async () => 'OK',
        headers: new Map(),
      };

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockFailure as any)
        .mockResolvedValueOnce(mockFailure as any)
        .mockResolvedValueOnce(mockSuccess as any);

      const sender = new WebhookSender({
        url: 'https://example.com/webhook',
        retry: {
          maxRetries: 3,
          initialDelay: 10,
          maxDelay: 100,
        },
      });

      const result = await sender.send({
        event: 'test.event',
        timestamp: Date.now(),
        data: {},
      });

      expect(result.success).toBe(true);
      expect(result.retries).toBe(2);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const mockFailure = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      };

      vi.mocked(fetch).mockResolvedValue(mockFailure as any);

      const sender = new WebhookSender({
        url: 'https://example.com/webhook',
        retry: {
          maxRetries: 2,
          initialDelay: 10,
        },
      });

      const result = await sender.send({
        event: 'test.event',
        timestamp: Date.now(),
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.retries).toBe(2);
      expect(fetch).toHaveBeenCalledTimes(3); // 1 initial + 2 retries
    });

    it('should not retry on non-retryable status codes', async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const sender = new WebhookSender({
        url: 'https://example.com/webhook',
        retry: {
          maxRetries: 3,
        },
      });

      const result = await sender.send({
        event: 'test.event',
        timestamp: Date.now(),
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(400);
      expect(fetch).toHaveBeenCalledTimes(1); // No retries
    });

    it('should respect timeout', async () => {
      vi.mocked(fetch).mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 50);
        });
      });

      const sender = new WebhookSender({
        url: 'https://example.com/webhook',
        timeout: 100,
        retry: {
          maxRetries: 0,
        },
      });

      const result = await sender.send({
        event: 'test.event',
        timestamp: Date.now(),
        data: {},
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    }, 10000);
  });

  describe('sendWebhook', () => {
    it('should send webhook with minimal config', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ received: true }),
        text: async () => 'OK',
        headers: new Map(),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await sendWebhook(
        'https://example.com/webhook',
        {
          event: 'test',
          timestamp: Date.now(),
          data: {},
        }
      );

      expect(result.success).toBe(true);
    });

    it('should accept optional config', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        json: async () => ({ received: true }),
        text: async () => 'OK',
        headers: new Map(),
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await sendWebhook(
        'https://example.com/webhook',
        {
          event: 'test',
          timestamp: Date.now(),
          data: {},
        },
        {
          method: 'POST',
          headers: { 'X-Custom': 'value' },
          secret: 'secret',
          timeout: 5000,
        }
      );

      expect(result.success).toBe(true);
    });
  });
});
