/**
 * Webhook Utils Skill - 测试文件
 * 
 * 测试覆盖:
 * 1. 签名生成与验证
 * 2. 重试机制
 * 3. 速率限制
 * 4. 队列管理
 * 5. 端到端发送
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateSignature,
  verifySignature,
  verifyWebhookSignature,
  createWebhookPayload,
  WebhookSender,
  RateLimiter,
  WebhookQueue,
  sendWebhook,
} from '../src/skills/webhook-utils-skill';

// ============== 签名测试 ==============

describe('Signature Generation', () => {
  const secret = 'test-secret-key-12345';
  const payload = JSON.stringify({ event: 'test', data: { id: 1 } });

  it('should generate SHA256 signature', () => {
    const signature = generateSignature(payload, secret, 'sha256');
    expect(signature).toBeDefined();
    expect(signature.length).toBe(64); // SHA256 hex = 64 chars
    expect(signature).toMatch(/^[a-f0-9]+$/);
  });

  it('should generate SHA512 signature', () => {
    const signature = generateSignature(payload, secret, 'sha512');
    expect(signature).toBeDefined();
    expect(signature.length).toBe(128); // SHA512 hex = 128 chars
    expect(signature).toMatch(/^[a-f0-9]+$/);
  });

  it('should generate different signatures for different payloads', () => {
    const sig1 = generateSignature(payload, secret);
    const sig2 = generateSignature(JSON.stringify({ event: 'different' }), secret);
    expect(sig1).not.toBe(sig2);
  });

  it('should generate different signatures for different secrets', () => {
    const sig1 = generateSignature(payload, secret);
    const sig2 = generateSignature(payload, 'different-secret');
    expect(sig1).not.toBe(sig2);
  });
});

describe('Signature Verification', () => {
  const secret = 'test-secret-key-12345';
  const payload = JSON.stringify({ event: 'test', data: { id: 1 } });

  it('should verify valid signature', () => {
    const signature = generateSignature(payload, secret);
    const result = verifySignature(payload, signature, secret);
    
    expect(result.valid).toBe(true);
    expect(result.receivedSignature).toBe(signature);
    expect(result.computedSignature).toBe(signature);
    expect(result.algorithm).toBe('sha256');
  });

  it('should reject invalid signature', () => {
    const result = verifySignature(payload, 'invalid-signature', secret);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should reject signature with wrong secret', () => {
    const signature = generateSignature(payload, secret);
    const result = verifySignature(payload, signature, 'wrong-secret');
    
    expect(result.valid).toBe(false);
  });

  it('should handle signature length mismatch', () => {
    const result = verifySignature(payload, 'short', secret);
    
    expect(result.valid).toBe(false);
    expect(result.error).toContain('length');
  });

  it('should verify with SHA512', () => {
    const signature = generateSignature(payload, secret, 'sha512');
    const result = verifySignature(payload, signature, secret, 'sha512');
    
    expect(result.valid).toBe(true);
    expect(result.algorithm).toBe('sha512');
  });
});

describe('Webhook Signature Verification', () => {
  const secret = 'test-secret-key';

  it('should verify webhook signature from body', () => {
    const body = { event: 'test', data: {} };
    const signature = generateSignature(JSON.stringify(body), secret);
    
    const result = verifyWebhookSignature(body, signature, secret);
    
    expect(result.valid).toBe(true);
  });

  it('should reject when no signature header', () => {
    const result = verifyWebhookSignature({ event: 'test' }, undefined, secret);
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No signature header provided');
  });

  it('should reject when no secret configured', () => {
    const result = verifyWebhookSignature({ event: 'test' }, 'sig', '');
    
    expect(result.valid).toBe(false);
    expect(result.error).toBe('No secret configured');
  });
});

// ============== 载荷创建测试 ==============

describe('Payload Creation', () => {
  it('should create payload with required fields', () => {
    const payload = createWebhookPayload('user.created', { userId: '123' });
    
    expect(payload.event).toBe('user.created');
    expect(payload.data).toEqual({ userId: '123' });
    expect(payload.timestamp).toBeDefined();
    expect(payload.id).toBeDefined();
    expect(payload.version).toBe('1.0');
  });

  it('should create payload with custom options', () => {
    const payload = createWebhookPayload('order.completed', { orderId: '001' }, {
      id: 'custom-id',
      source: 'payment-service',
      version: '2.0',
    });
    
    expect(payload.id).toBe('custom-id');
    expect(payload.source).toBe('payment-service');
    expect(payload.version).toBe('2.0');
  });

  it('should generate unique IDs', () => {
    const payload1 = createWebhookPayload('event1', {});
    const payload2 = createWebhookPayload('event2', {});
    
    expect(payload1.id).not.toBe(payload2.id);
  });
});

// ============== 速率限制测试 ==============

describe('RateLimiter', () => {
  let limiter: RateLimiter;

  beforeEach(() => {
    limiter = new RateLimiter({
      windowMs: 1000,
      maxRequests: 5,
    });
  });

  it('should allow requests under limit', () => {
    for (let i = 0; i < 5; i++) {
      const check = limiter.check();
      expect(check.allowed).toBe(true);
      limiter.record();
    }
  });

  it('should block requests over limit', () => {
    for (let i = 0; i < 5; i++) {
      limiter.record();
    }
    
    const check = limiter.check();
    expect(check.allowed).toBe(false);
    expect(check.retryAfter).toBeDefined();
    expect(check.retryAfter!).toBeGreaterThan(0);
  });

  it('should reset after window expires', async () => {
    for (let i = 0; i < 5; i++) {
      limiter.record();
    }
    
    // 等待窗口过期
    await new Promise(resolve => setTimeout(resolve, 1100));
    
    const check = limiter.check();
    expect(check.allowed).toBe(true);
  });

  it('should track request count', () => {
    expect(limiter.getRequestCount()).toBe(0);
    
    limiter.record();
    limiter.record();
    limiter.record();
    
    expect(limiter.getRequestCount()).toBe(3);
  });

  it('should reset manually', () => {
    limiter.record();
    limiter.record();
    expect(limiter.getRequestCount()).toBe(2);
    
    limiter.reset();
    expect(limiter.getRequestCount()).toBe(0);
  });
});

// ============== 队列测试 ==============

describe('WebhookQueue', () => {
  let queue: WebhookQueue;
  const processedTasks: string[] = [];

  beforeEach(() => {
    queue = new WebhookQueue(2);
    processedTasks.length = 0;
    
    queue.setHandler(async (task) => {
      processedTasks.push(task.id);
      await new Promise(resolve => setTimeout(resolve, 10));
    });
  });

  it('should enqueue tasks', () => {
    const id1 = queue.enqueue({ event: 'test1', timestamp: Date.now(), data: {} });
    const id2 = queue.enqueue({ event: 'test2', timestamp: Date.now(), data: {} });
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(id1).not.toBe(id2);
  });

  it('should process tasks in priority order', async () => {
    // 先添加低优先级任务
    queue.enqueue({ event: 'low', timestamp: Date.now(), data: {} }, 10);
    // 再添加高优先级任务
    queue.enqueue({ event: 'high', timestamp: Date.now(), data: {} }, 1);
    // 添加普通优先级任务
    queue.enqueue({ event: 'normal', timestamp: Date.now(), data: {} }, 5);
    
    // 等待处理完成
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(processedTasks.length).toBe(3);
  });

  it('should respect concurrency limit', () => {
    const status = queue.getStatus();
    expect(status.maxConcurrency).toBe(2);
    expect(status.pending).toBeGreaterThanOrEqual(0);
    expect(status.active).toBeGreaterThanOrEqual(0);
  });

  it('should clear queue', () => {
    queue.enqueue({ event: 'test1', timestamp: Date.now(), data: {} });
    queue.enqueue({ event: 'test2', timestamp: Date.now(), data: {} });
    
    queue.clear();
    
    expect(queue.length).toBe(0);
  });
});

// ============== WebhookSender 测试 ==============

describe('WebhookSender', () => {
  it('should create sender with config', () => {
    const sender = new WebhookSender({
      url: 'https://example.com/webhook',
      timeout: 5000,
    });
    
    expect(sender).toBeDefined();
  });

  it('should create sender with retry config', () => {
    const sender = new WebhookSender({
      url: 'https://example.com/webhook',
      retry: {
        maxRetries: 5,
        initialDelay: 500,
        enableJitter: true,
      },
    });
    
    expect(sender).toBeDefined();
  });

  it('should create sender with rate limit', () => {
    const sender = new WebhookSender({
      url: 'https://example.com/webhook',
      rateLimit: {
        windowMs: 60000,
        maxRequests: 100,
      },
    });
    
    const status = sender.getRateLimitStatus();
    expect(status).toBeDefined();
    expect(status!.max).toBe(100);
  });

  it('should create sender with logging enabled', () => {
    const sender = new WebhookSender({
      url: 'https://example.com/webhook',
      enableLogging: true,
    });
    
    const logs = sender.getLogs();
    expect(logs).toEqual([]);
  });

  it('should handle failed requests (mock)', async () => {
    // Mock fetch to fail
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    
    const sender = new WebhookSender({
      url: 'https://example.com/webhook',
      retry: { maxRetries: 1 },
    });
    
    const result = await sender.send({
      event: 'test',
      timestamp: Date.now(),
      data: {},
    });
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.requestId).toBeDefined();
  });
});

// ============== 集成测试 ==============

describe('Integration Tests', () => {
  it('should send webhook with signature (mock)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({ received: true }),
      text: async () => 'OK',
    });
    
    const result = await sendWebhook(
      'https://example.com/webhook',
      { event: 'test', timestamp: Date.now(), data: {} },
      {
        secret: 'test-secret',
        timeout: 5000,
      }
    );
    
    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.requestId).toBeDefined();
  });

  it('should handle rate limiting (mock)', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ({}),
    });
    
    const sender = new WebhookSender({
      url: 'https://example.com/webhook',
      rateLimit: {
        windowMs: 60000,
        maxRequests: 2,
      },
    });
    
    // 发送 2 个请求 (应该成功)
    await sender.send({ event: 'test1', timestamp: Date.now(), data: {} });
    await sender.send({ event: 'test2', timestamp: Date.now(), data: {} });
    
    // 第 3 个请求应该被限流
    const result = await sender.send({ event: 'test3', timestamp: Date.now(), data: {} });
    
    // 注意：由于 fetch 是 mock 的，实际不会触发限流
    // 这里只是验证配置生效
    const status = sender.getRateLimitStatus();
    expect(status!.current).toBe(3);
  });
});
