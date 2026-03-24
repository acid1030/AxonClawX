/**
 * Cache Manager Pro Skill - 单元测试
 */

import { CacheManager, CacheStrategy } from './cache-manager-pro-skill';

describe('CacheManager', () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager({
      maxEntries: 100,
      defaultTTL: 3600,
      strategy: CacheStrategy.LRU,
      enableStats: true,
    });
  });

  afterEach(() => {
    cache.destroy();
  });

  describe('基础操作', () => {
    test('设置和获取缓存', () => {
      cache.set('key1', 'value1');
      const value = cache.get('key1');
      expect(value).toBe('value1');
    });

    test('获取不存在的键返回 undefined', () => {
      const value = cache.get('nonexistent');
      expect(value).toBeUndefined();
    });

    test('has 方法检查键存在', () => {
      cache.set('key1', 'value1');
      expect(cache.has('key1')).toBe(true);
      expect(cache.has('key2')).toBe(false);
    });

    test('删除缓存', () => {
      cache.set('key1', 'value1');
      const deleted = cache.delete('key1');
      expect(deleted).toBe(true);
      expect(cache.get('key1')).toBeUndefined();
    });

    test('删除不存在的键返回 false', () => {
      const deleted = cache.delete('nonexistent');
      expect(deleted).toBe(false);
    });
  });

  describe('TTL 过期', () => {
    test('TTL 过期后无法获取', async () => {
      cache.set('expiring', 'value', { ttl: 1 }); // 1 秒过期
      
      expect(cache.get('expiring')).toBe('value');
      
      // 等待 1.1 秒
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      expect(cache.get('expiring')).toBeUndefined();
    });

    test('永不过期的缓存', () => {
      cache.set('permanent', 'value', { ttl: 0 });
      expect(cache.has('permanent')).toBe(true);
    });
  });

  describe('批量操作', () => {
    test('批量设置缓存', () => {
      const count = cache.setBatch([
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' },
        { key: 'key3', value: 'value3' },
      ]);
      
      expect(count).toBe(3);
      expect(cache.get('key1')).toBe('value1');
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });

    test('批量获取缓存', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const results = cache.getBatch(['key1', 'key2', 'key3']);
      
      expect(results.get('key1')).toBe('value1');
      expect(results.get('key2')).toBe('value2');
      expect(results.get('key3')).toBeUndefined();
    });
  });

  describe('缓存失效', () => {
    test('通配符失效', () => {
      cache.set('user:1', 'value1');
      cache.set('user:2', 'value2');
      cache.set('user:3', 'value3');
      cache.set('product:1', 'value4');
      
      const deleted = cache.invalidate('user:*');
      
      expect(deleted).toBe(3);
      expect(cache.get('user:1')).toBeUndefined();
      expect(cache.get('product:1')).toBe('value4');
    });

    test('清空缓存', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      cache.clear();
      
      expect(cache.get('key1')).toBeUndefined();
      expect(cache.get('key2')).toBeUndefined();
      expect(cache.keys().length).toBe(0);
    });
  });

  describe('缓存统计', () => {
    test('统计命中和未命中', () => {
      cache.set('key1', 'value1');
      
      cache.get('key1'); // hit
      cache.get('key1'); // hit
      cache.get('key2'); // miss
      
      const stats = cache.getStats();
      
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3);
    });

    test('统计缓存大小', () => {
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3');
      
      const stats = cache.getStats();
      
      expect(stats.size).toBe(3);
      expect(stats.maxSize).toBe(100);
    });
  });

  describe('驱逐策略', () => {
    test('LRU 驱逐', () => {
      const smallCache = new CacheManager({
        maxEntries: 3,
        strategy: CacheStrategy.LRU,
      });

      smallCache.set('key1', 'value1');
      smallCache.set('key2', 'value2');
      smallCache.set('key3', 'value3');
      
      // 访问 key1，使其不是最近最少使用
      smallCache.get('key1');
      
      // 添加新条目，应该驱逐 key2
      smallCache.set('key4', 'value4');
      
      expect(smallCache.get('key1')).toBe('value1');
      expect(smallCache.get('key2')).toBeUndefined(); // 被驱逐
      expect(smallCache.get('key3')).toBe('value3');
      expect(smallCache.get('key4')).toBe('value4');
      
      smallCache.destroy();
    });
  });

  describe('事件监听', () => {
    test('监听缓存命中事件', () => {
      const hitListener = jest.fn();
      cache.on('hit', hitListener);
      
      cache.set('key1', 'value1');
      cache.get('key1');
      
      expect(hitListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'hit',
          key: 'key1',
        })
      );
    });

    test('监听缓存未命中事件', () => {
      const missListener = jest.fn();
      cache.on('miss', missListener);
      
      cache.get('nonexistent');
      
      expect(missListener).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'miss',
          key: 'nonexistent',
        })
      );
    });

    test('移除事件监听器', () => {
      const listener = jest.fn();
      cache.on('hit', listener);
      
      cache.set('key1', 'value1');
      cache.get('key1');
      
      expect(listener).toHaveBeenCalledTimes(1);
      
      cache.off('hit', listener);
      
      cache.get('key1');
      expect(listener).toHaveBeenCalledTimes(1); // 不再调用
    });
  });

  describe('导出和导入', () => {
    test('导出缓存到文件', () => {
      const testPath = '/tmp/test-cache-export.json';
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      
      const success = cache.export(testPath);
      
      expect(success).toBe(true);
      
      // 清理测试文件
      try {
        require('fs').unlinkSync(testPath);
      } catch (e) {
        // 忽略
      }
    });
  });
});

describe('CacheStrategy', () => {
  test('LFU 策略', () => {
    const cache = new CacheManager({
      maxEntries: 3,
      strategy: CacheStrategy.LFU,
    });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // 多次访问 key1 和 key3
    cache.get('key1');
    cache.get('key1');
    cache.get('key3');
    
    // 添加新条目，应该驱逐访问次数最少的 key2
    cache.set('key4', 'value4');
    
    expect(cache.get('key1')).toBe('value1');
    expect(cache.get('key2')).toBeUndefined(); // 被驱逐
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
    
    cache.destroy();
  });

  test('FIFO 策略', () => {
    const cache = new CacheManager({
      maxEntries: 3,
      strategy: CacheStrategy.FIFO,
    });

    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    
    // 添加新条目，应该驱逐最早进入的 key1
    cache.set('key4', 'value4');
    
    expect(cache.get('key1')).toBeUndefined(); // 被驱逐
    expect(cache.get('key2')).toBe('value2');
    expect(cache.get('key3')).toBe('value3');
    expect(cache.get('key4')).toBe('value4');
    
    cache.destroy();
  });
});
