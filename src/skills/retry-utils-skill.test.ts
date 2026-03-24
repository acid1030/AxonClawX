/**
 * Retry Utils Skill - 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  retry,
  retryQuick,
  retryExponential,
  retryLinear,
  retryFixed,
  calculateDelay,
  sleep,
  isNetworkError,
  createNetworkErrorRetryCondition,
  createHttpStatusCodeRetryCondition,
  createCompositeRetryCondition,
  CircuitBreaker,
  retryWithCircuitBreaker,
  formatRetryResult,
  createRetryLogger,
  NETWORK_ERROR_CODES
} from './retry-utils-skill';

describe('Retry Utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  // ==================== calculateDelay ====================

  describe('calculateDelay', () => {
    const baseOptions = {
      maxRetries: 3,
      initialDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
      jitter: false,
      timeout: 0
    } as const;

    it('should calculate exponential delay', () => {
      const options = { ...baseOptions, strategy: 'exponential' as const };
      
      expect(calculateDelay(1, options)).toBe(1000);  // 1000 * 2^0
      expect(calculateDelay(2, options)).toBe(2000);  // 1000 * 2^1
      expect(calculateDelay(3, options)).toBe(4000);  // 1000 * 2^2
      expect(calculateDelay(4, options)).toBe(8000);  // 1000 * 2^3
    });

    it('should calculate linear delay', () => {
      const options = { ...baseOptions, strategy: 'linear' as const };
      
      expect(calculateDelay(1, options)).toBe(1000);  // 1000 * 1
      expect(calculateDelay(2, options)).toBe(2000);  // 1000 * 2
      expect(calculateDelay(3, options)).toBe(3000);  // 1000 * 3
    });

    it('should calculate fixed delay', () => {
      const options = { ...baseOptions, strategy: 'fixed' as const };
      
      expect(calculateDelay(1, options)).toBe(1000);
      expect(calculateDelay(2, options)).toBe(1000);
      expect(calculateDelay(3, options)).toBe(1000);
    });

    it('should respect maxDelay', () => {
      const options = { ...baseOptions, strategy: 'exponential' as const, maxDelay: 5000 };
      
      expect(calculateDelay(1, options)).toBe(1000);
      expect(calculateDelay(2, options)).toBe(2000);
      expect(calculateDelay(3, options)).toBe(4000);
      expect(calculateDelay(4, options)).toBe(5000);  // Capped at maxDelay
    });

    it('should apply jitter when enabled', () => {
      const options = { ...baseOptions, strategy: 'fixed' as const, jitter: true };
      
      const delay = calculateDelay(1, options);
      expect(delay).toBeGreaterThanOrEqual(500);   // 1000 * 0.5
      expect(delay).toBeLessThanOrEqual(1500);    // 1000 * 1.5
    });
  });

  // ==================== retry ====================

  describe('retry', () => {
    it('should succeed on first try', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      
      const result = await retry(fn, { maxRetries: 3, strategy: 'fixed', initialDelay: 10 });
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should retry on failure and succeed', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) throw new Error('Temporary error');
        return 'success';
      });
      
      const result = await retry(fn, {
        maxRetries: 3,
        strategy: 'fixed',
        initialDelay: 10
      });
      
      expect(result.success).toBe(true);
      expect(result.value).toBe('success');
      expect(result.attempts).toBe(3);
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it('should fail after max retries', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      const result = await retry(fn, {
        maxRetries: 3,
        strategy: 'fixed',
        initialDelay: 10
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.attempts).toBe(4); // 1 initial + 3 retries
      expect(fn).toHaveBeenCalledTimes(4);
    });

    it('should respect shouldRetry condition', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Permanent error'));
      
      const result = await retry(fn, {
        maxRetries: 3,
        strategy: 'fixed',
        initialDelay: 10,
        shouldRetry: (error) => error.message !== 'Permanent error'
      });
      
      expect(result.success).toBe(false);
      expect(result.attempts).toBe(1); // Should not retry
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should call onRetry callback', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) throw new Error('Error');
        return 'success';
      });
      
      const onRetry = vi.fn();
      
      await retry(fn, {
        maxRetries: 3,
        strategy: 'fixed',
        initialDelay: 10,
        onRetry
      });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1, expect.any(Number));
    });

    it('should call onSuccess callback', async () => {
      const fn = vi.fn().mockResolvedValue('success');
      const onSuccess = vi.fn();
      
      await retry(fn, {
        maxRetries: 3,
        strategy: 'fixed',
        initialDelay: 10,
        onSuccess
      });
      
      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledWith('success', 1);
    });

    it('should call onFailure callback', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Failed'));
      const onFailure = vi.fn();
      
      await retry(fn, {
        maxRetries: 3,
        strategy: 'fixed',
        initialDelay: 10,
        onFailure
      });
      
      expect(onFailure).toHaveBeenCalledTimes(1);
      expect(onFailure).toHaveBeenCalledWith(expect.any(Error), 4);
    });

    it('should respect timeout', async () => {
      const fn = vi.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => resolve('success'), 100);
        });
      });
      
      const result = await retry(fn, {
        maxRetries: 1,
        strategy: 'fixed',
        initialDelay: 10,
        timeout: 50
      });
      
      expect(result.success).toBe(false);
      expect(result.error.message).toContain('Timeout');
    });

    it('should track delays correctly', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 3) throw new Error('Error');
        return 'success';
      });
      
      const result = await retry(fn, {
        maxRetries: 3,
        strategy: 'fixed',
        initialDelay: 100,
        jitter: false
      });
      
      expect(result.delays).toHaveLength(2);
      expect(result.delays[0]).toBe(100);
      expect(result.delays[1]).toBe(200); // exponential by default
    });
  });

  // ==================== Convenience Functions ====================

  describe('retryQuick', () => {
    it('should use default maxRetries of 3', async () => {
      const fn = vi.fn().mockRejectedValue(new Error('Fail'));
      
      await retryQuick(fn, 3);
      
      expect(fn).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    });
  });

  describe('retryExponential', () => {
    it('should use exponential strategy', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) throw new Error('Error');
        return 'success';
      });
      
      const result = await retryExponential(fn, {
        initialDelay: 100,
        jitter: false
      });
      
      expect(result.success).toBe(true);
      expect(result.delays[0]).toBe(100); // 100 * 2^0
    });
  });

  describe('retryLinear', () => {
    it('should use linear strategy', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) throw new Error('Error');
        return 'success';
      });
      
      const result = await retryLinear(fn, {
        initialDelay: 100,
        jitter: false
      });
      
      expect(result.success).toBe(true);
      expect(result.delays[0]).toBe(100); // 100 * 1
    });
  });

  describe('retryFixed', () => {
    it('should use fixed strategy', async () => {
      let attempts = 0;
      const fn = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) throw new Error('Error');
        return 'success';
      });
      
      const result = await retryFixed(fn, {
        initialDelay: 100,
        jitter: false
      });
      
      expect(result.success).toBe(true);
      expect(result.delays[0]).toBe(100);
    });
  });

  // ==================== Network Error Detection ====================

  describe('isNetworkError', () => {
    it('should detect network error codes', () => {
      expect(isNetworkError({ code: 'ECONNRESET' })).toBe(true);
      expect(isNetworkError({ code: 'ETIMEDOUT' })).toBe(true);
      expect(isNetworkError({ code: 'ECONNREFUSED' })).toBe(true);
    });

    it('should detect network error messages', () => {
      expect(isNetworkError({ message: 'Network error' })).toBe(true);
      expect(isNetworkError({ message: 'Connection timeout' })).toBe(true);
      expect(isNetworkError({ message: 'Socket hang up' })).toBe(true);
    });

    it('should return false for non-network errors', () => {
      expect(isNetworkError({ message: 'Invalid parameter' })).toBe(false);
      expect(isNetworkError({ message: 'Not found' })).toBe(false);
      expect(isNetworkError(null)).toBe(false);
    });
  });

  // ==================== Retry Conditions ====================

  describe('createNetworkErrorRetryCondition', () => {
    it('should retry on network errors', () => {
      const condition = createNetworkErrorRetryCondition();
      
      expect(condition({ code: 'ECONNRESET' })).toBe(true);
      expect(condition({ message: 'Connection timeout' })).toBe(true);
    });

    it('should not retry on non-network errors', () => {
      const condition = createNetworkErrorRetryCondition();
      
      expect(condition({ message: 'Invalid input' })).toBe(false);
    });
  });

  describe('createHttpStatusCodeRetryCondition', () => {
    it('should retry on specified status codes', () => {
      const condition = createHttpStatusCodeRetryCondition([500, 502, 503]);
      
      expect(condition({ status: 500 })).toBe(true);
      expect(condition({ status: 502 })).toBe(true);
      expect(condition({ status: 503 })).toBe(true);
      expect(condition({ status: 404 })).toBe(false);
    });

    it('should handle Axios-style errors', () => {
      const condition = createHttpStatusCodeRetryCondition([500]);
      
      expect(condition({ response: { status: 500 } })).toBe(true);
      expect(condition({ response: { status: 404 } })).toBe(false);
    });

    it('should handle Node.js style errors', () => {
      const condition = createHttpStatusCodeRetryCondition([500]);
      
      expect(condition({ statusCode: 500 })).toBe(true);
      expect(condition({ statusCode: 404 })).toBe(false);
    });
  });

  describe('createCompositeRetryCondition', () => {
    it('should retry if any condition is true', async () => {
      const condition1 = vi.fn().mockReturnValue(false);
      const condition2 = vi.fn().mockReturnValue(true);
      
      const composite = createCompositeRetryCondition([condition1, condition2]);
      
      const result = await composite(new Error('test'), 1);
      
      expect(result).toBe(true);
      expect(condition1).toHaveBeenCalled();
      expect(condition2).toHaveBeenCalled();
    });

    it('should not retry if all conditions are false', async () => {
      const condition1 = vi.fn().mockReturnValue(false);
      const condition2 = vi.fn().mockReturnValue(false);
      
      const composite = createCompositeRetryCondition([condition1, condition2]);
      
      const result = await composite(new Error('test'), 1);
      
      expect(result).toBe(false);
    });
  });

  // ==================== Circuit Breaker ====================

  describe('CircuitBreaker', () => {
    it('should start in closed state', () => {
      const breaker = new CircuitBreaker();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.canExecute()).toBe(true);
    });

    it('should open after failure threshold', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      
      breaker.onFailure();
      expect(breaker.getState()).toBe('closed');
      
      breaker.onFailure();
      expect(breaker.getState()).toBe('closed');
      
      breaker.onFailure();
      expect(breaker.getState()).toBe('open');
      expect(breaker.canExecute()).toBe(false);
    });

    it('should transition to half-open after reset timeout', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1, resetTimeout: 1000 });
      
      breaker.onFailure();
      expect(breaker.getState()).toBe('open');
      
      vi.advanceTimersByTime(1000);
      
      expect(breaker.canExecute()).toBe(true);
      expect(breaker.getState()).toBe('half-open');
    });

    it('should close after success threshold in half-open state', () => {
      const breaker = new CircuitBreaker({ 
        failureThreshold: 1, 
        resetTimeout: 1000,
        successThreshold: 2 
      });
      
      breaker.onFailure();
      vi.advanceTimersByTime(1000);
      breaker.canExecute(); // Transition to half-open
      
      breaker.onSuccess();
      expect(breaker.getState()).toBe('half-open');
      
      breaker.onSuccess();
      expect(breaker.getState()).toBe('closed');
    });

    it('should reset on success in closed state', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      
      breaker.onFailure();
      breaker.onFailure();
      expect(breaker.getState()).toBe('closed');
      
      breaker.onSuccess();
      expect(breaker.failureCount).toBe(0);
    });

    it('should reset manually', () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      
      breaker.onFailure();
      expect(breaker.getState()).toBe('open');
      
      breaker.reset();
      expect(breaker.getState()).toBe('closed');
      expect(breaker.canExecute()).toBe(true);
    });
  });

  describe('retryWithCircuitBreaker', () => {
    it('should not execute when breaker is open', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = vi.fn();
      
      breaker.onFailure(); // Open the breaker
      
      const result = await retryWithCircuitBreaker(fn, breaker);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe('CIRCUIT_BREAKER_OPEN');
      expect(fn).not.toHaveBeenCalled();
    });

    it('should update breaker state on success', async () => {
      const breaker = new CircuitBreaker();
      const fn = vi.fn().mockResolvedValue('success');
      
      await retryWithCircuitBreaker(fn, breaker);
      
      expect(breaker.getState()).toBe('closed');
    });

    it('should update breaker state on failure', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 1 });
      const fn = vi.fn().mockRejectedValue(new Error('Fail'));
      
      await retryWithCircuitBreaker(fn, breaker, {
        maxRetries: 0,
        strategy: 'fixed',
        initialDelay: 10
      });
      
      expect(breaker.getState()).toBe('open');
    });
  });

  // ==================== Utility Functions ====================

  describe('formatRetryResult', () => {
    it('should format successful result', () => {
      const result = {
        success: true,
        value: 'data',
        attempts: 2,
        totalTime: 1500,
        delays: [100, 200]
      };
      
      const formatted = formatRetryResult(result);
      
      expect(formatted).toContain('✅ Success');
      expect(formatted).toContain('attempt 2');
      expect(formatted).toContain('1500ms');
    });

    it('should format failed result', () => {
      const result = {
        success: false,
        error: new Error('Failed'),
        attempts: 3,
        totalTime: 3000,
        delays: [100, 200, 400]
      };
      
      const formatted = formatRetryResult(result);
      
      expect(formatted).toContain('❌ Failed');
      expect(formatted).toContain('3 attempts');
      expect(formatted).toContain('Error: Failed');
    });
  });

  describe('createRetryLogger', () => {
    it('should create logger with callbacks', () => {
      const logger = vi.fn();
      const options = createRetryLogger(logger);
      
      expect(options.onRetry).toBeInstanceOf(Function);
      expect(options.onSuccess).toBeInstanceOf(Function);
      expect(options.onFailure).toBeInstanceOf(Function);
    });

    it('should call logger on retry', async () => {
      const logger = vi.fn();
      const options = createRetryLogger(logger);
      
      await options.onRetry?.(new Error('Test'), 1, 1000);
      
      expect(logger).toHaveBeenCalledWith(expect.stringContaining('Attempt 1 failed'));
    });
  });

  // ==================== NETWORK_ERROR_CODES ====================

  describe('NETWORK_ERROR_CODES', () => {
    it('should contain common network error codes', () => {
      expect(NETWORK_ERROR_CODES).toContain('ECONNRESET');
      expect(NETWORK_ERROR_CODES).toContain('ETIMEDOUT');
      expect(NETWORK_ERROR_CODES).toContain('ECONNREFUSED');
      expect(NETWORK_ERROR_CODES).toContain('ENOTFOUND');
    });
  });
});
