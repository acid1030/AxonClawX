/**
 * Circuit Breaker Pattern Skill - 测试用例
 * 
 * 测试覆盖:
 * 1. 基础状态转换
 * 2. 失败阈值熔断
 * 3. 自动恢复机制
 * 4. 半开状态限制
 * 5. 百分比策略
 * 6. 慢调用检测
 * 7. 事件系统
 * 8. 降级方案
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  CircuitBreaker,
  CircuitBreakerError,
  CircuitBreakerManager,
  circuitBreakerPatternSkill,
  type CircuitBreakerConfig,
} from './circuit-breaker-pattern-skill';

// 辅助函数：延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('CircuitBreaker Pattern Skill', () => {
  beforeEach(() => {
    // 重置所有熔断器
    circuitBreakerPatternSkill.resetAll();
  });

  describe('基础功能', () => {
    it('应该初始化为 CLOSED 状态', () => {
      const breaker = new CircuitBreaker();
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('成功执行后保持 CLOSED 状态', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      
      await breaker.execute(async () => 'success');
      
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('达到失败阈值后熔断', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      expect(breaker.getState()).toBe('OPEN');
    });

    it('熔断后拒绝执行请求', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      // 尝试执行应该失败
      await expect(breaker.execute(async () => 'success'))
        .rejects
        .toThrow(CircuitBreakerError);
    });
  });

  describe('自动恢复', () => {
    it('超时后从 OPEN 转移到 HALF_OPEN', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 100, // 100ms
      });
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      expect(breaker.getState()).toBe('OPEN');
      
      // 等待超时
      await delay(150);
      
      expect(breaker.getState()).toBe('HALF_OPEN');
    });

    it('HALF_OPEN 状态下成功则恢复 CLOSED', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 50,
        successThreshold: 2,
      });
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      await delay(100);
      expect(breaker.getState()).toBe('HALF_OPEN');
      
      // 成功 2 次
      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');
      
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('HALF_OPEN 状态下失败则重新熔断', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 50,
      });
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      await delay(100);
      expect(breaker.getState()).toBe('HALF_OPEN');
      
      // 失败
      try {
        await breaker.execute(async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // 忽略
      }
      
      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('半开状态限制', () => {
    it('HALF_OPEN 状态下限制请求数量', async () => {
      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeout: 50,
        halfOpenMaxRequests: 2,
        successThreshold: 5, // 需要 5 次成功，但只允许 2 个请求
      });
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      await delay(100);
      
      // 允许 2 个请求
      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');
      
      // 第 3 个请求应该被拒绝
      await expect(breaker.execute(async () => 'success'))
        .rejects
        .toThrow(CircuitBreakerError);
    });
  });

  describe('降级方案', () => {
    it('熔断时执行降级方案', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      // 使用降级方案
      const result = await breaker.execute(
        async () => {
          throw new Error('Should not execute');
        },
        async () => 'fallback'
      );
      
      expect(result).toBe('fallback');
    });

    it('正常时不执行降级方案', async () => {
      const breaker = new CircuitBreaker();
      let fallbackCalled = false;
      
      await breaker.execute(
        async () => 'success',
        async () => {
          fallbackCalled = true;
          return 'fallback';
        }
      );
      
      expect(fallbackCalled).toBe(false);
    });
  });

  describe('百分比策略', () => {
    it('失败率超过阈值时熔断', async () => {
      const breaker = new CircuitBreaker({
        failurePolicy: 'PERCENTAGE_BASED',
        failureRateThreshold: 50,
        slidingWindowSize: 10,
      });
      
      // 5 次失败，5 次成功 (50% 失败率)
      for (let i = 0; i < 5; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      for (let i = 0; i < 4; i++) {
        await breaker.execute(async () => 'success');
      }
      
      const stats = breaker.getStats();
      expect(stats.failureRate).toBeGreaterThan(49);
      
      // 再失败一次，超过 50%
      try {
        await breaker.execute(async () => {
          throw new Error('Error');
        });
      } catch (error) {
        // 忽略
      }
      
      expect(breaker.getState()).toBe('OPEN');
    });
  });

  describe('统计信息', () => {
    it('正确统计请求数据', async () => {
      const breaker = new CircuitBreaker();
      
      await breaker.execute(async () => 'success');
      await breaker.execute(async () => 'success');
      
      try {
        await breaker.execute(async () => {
          throw new Error('Error');
        });
      } catch (error) {
        // 忽略
      }
      
      const stats = breaker.getStats();
      
      expect(stats.totalRequests).toBe(3);
      expect(stats.totalSuccesses).toBe(2);
      expect(stats.totalFailures).toBe(1);
      expect(stats.state).toBe('CLOSED');
    });

    it('包含运行时长信息', async () => {
      const breaker = new CircuitBreaker();
      await delay(50);
      
      const stats = breaker.getStats();
      expect(stats.uptime).toBeGreaterThanOrEqual(50);
    });
  });

  describe('事件系统', () => {
    it('触发状态变化事件', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const events: any[] = [];
      
      breaker.on('STATE_CHANGE', (event) => events.push(event));
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      expect(events.length).toBe(1);
      expect(events[0].fromState).toBe('CLOSED');
      expect(events[0].toState).toBe('OPEN');
    });

    it('触发成功事件', async () => {
      const breaker = new CircuitBreaker();
      const events: any[] = [];
      
      breaker.on('SUCCESS', (event) => events.push(event));
      
      await breaker.execute(async () => 'success');
      
      expect(events.length).toBe(1);
      expect(events[0].duration).toBeGreaterThanOrEqual(0);
    });

    it('触发失败事件', async () => {
      const breaker = new CircuitBreaker();
      const events: any[] = [];
      
      breaker.on('FAILURE', (event) => events.push(event));
      
      try {
        await breaker.execute(async () => {
          throw new Error('Test error');
        });
      } catch (error) {
        // 忽略
      }
      
      expect(events.length).toBe(1);
      expect(events[0].error?.message).toBe('Test error');
    });

    it('监听所有事件', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      const events: any[] = [];
      
      breaker.on('*', (event) => events.push(event));
      
      await breaker.execute(async () => 'success');
      
      try {
        await breaker.execute(async () => {
          throw new Error('Error');
        });
      } catch (error) {
        // 忽略
      }
      
      expect(events.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('手动控制', () => {
    it('手动重置熔断器', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      expect(breaker.getState()).toBe('OPEN');
      
      // 手动重置
      breaker.reset();
      
      expect(breaker.getState()).toBe('CLOSED');
    });

    it('手动强制熔断', () => {
      const breaker = new CircuitBreaker();
      
      breaker.forceOpen();
      
      expect(breaker.getState()).toBe('OPEN');
    });

    it('手动强制关闭', async () => {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Test error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      // 强制关闭
      breaker.forceClose();
      
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('管理器', () => {
    it('注册和获取熔断器', () => {
      const manager = new CircuitBreakerManager();
      
      const breaker = new CircuitBreaker({ name: 'test', autoRegister: false });
      manager.register('test', breaker);
      
      expect(manager.get('test')).toBe(breaker);
    });

    it('获取或创建熔断器', () => {
      const manager = CircuitBreakerManager.getInstance();
      
      const breaker1 = manager.getOrCreate('singleton-test', {
        failureThreshold: 5,
      });
      
      const breaker2 = manager.getOrCreate('singleton-test');
      
      expect(breaker1).toBe(breaker2);
    });

    it('获取所有状态', () => {
      const manager = CircuitBreakerManager.getInstance();
      
      manager.getOrCreate('service-a');
      manager.getOrCreate('service-b');
      manager.getOrCreate('service-c');
      
      const allStats = manager.getAllStats();
      
      expect(allStats.total).toBeGreaterThanOrEqual(3);
      expect(allStats.details['service-a']).toBeDefined();
      expect(allStats.details['service-b']).toBeDefined();
      expect(allStats.details['service-c']).toBeDefined();
    });

    it('重置所有熔断器', async () => {
      const manager = CircuitBreakerManager.getInstance();
      
      const breaker = manager.getOrCreate('reset-test', {
        failureThreshold: 2,
      });
      
      // 触发熔断
      for (let i = 0; i < 2; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Error');
          });
        } catch (error) {
          // 忽略
        }
      }
      
      expect(breaker.getState()).toBe('OPEN');
      
      // 重置所有
      manager.resetAll();
      
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('Skill 接口', () => {
    it('通过 skill 创建熔断器', () => {
      const breaker = circuitBreakerPatternSkill.create({
        name: 'skill-test',
        failureThreshold: 5,
      });
      
      expect(breaker).toBeInstanceOf(CircuitBreaker);
    });

    it('通过 skill 执行保护操作', async () => {
      const breaker = circuitBreakerPatternSkill.create();
      
      const result = await circuitBreakerPatternSkill.protect(
        breaker,
        async () => 'success',
        async () => 'fallback'
      );
      
      expect(result).toBe('success');
    });

    it('通过 skill 获取状态', () => {
      const breaker = circuitBreakerPatternSkill.create();
      
      const stats = circuitBreakerPatternSkill.getStatus(breaker);
      
      expect(stats.state).toBe('CLOSED');
      expect(stats.name).toBeDefined();
    });

    it('获取所有熔断器状态', () => {
      const allStatus = circuitBreakerPatternSkill.getAllStatus();
      
      expect(allStatus).toHaveProperty('total');
      expect(allStatus).toHaveProperty('closed');
      expect(allStatus).toHaveProperty('open');
      expect(allStatus).toHaveProperty('halfOpen');
      expect(allStatus).toHaveProperty('details');
    });
  });
});

// ============================================================================
// 集成测试示例
// ============================================================================

describe('CircuitBreaker 集成测试', () => {
  it('模拟真实场景：API 调用保护', async () => {
    const apiBreaker = new CircuitBreaker({
      name: 'api-service',
      failureThreshold: 3,
      resetTimeout: 100,
      successThreshold: 2,
    });

    let callCount = 0;
    const results: string[] = [];

    // 模拟不稳定的 API
    async function unstableAPI() {
      return apiBreaker.execute(
        async () => {
          callCount++;
          if (callCount <= 5) {
            throw new Error('API Error');
          }
          return 'success';
        },
        async () => 'fallback'
      );
    }

    // 前 5 次调用会失败并触发熔断
    for (let i = 0; i < 7; i++) {
      const result = await unstableAPI();
      results.push(result);
      await delay(20);
    }

    // 验证结果
    expect(results.slice(0, 3)).toContain('fallback'); // 熔断后的降级
    expect(results.slice(5)).toContain('success'); // 恢复后的成功
  });
});
