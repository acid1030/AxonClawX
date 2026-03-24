/**
 * Singleton Utils 使用示例
 * 
 * 演示如何使用单例模式工具
 */

import {
  createEagerSingleton,
  createLazySingleton,
  getSingleton,
  hasSingleton,
  Singleton,
  SingletonExamples,
  getSingletonStats,
} from './singleton-utils-skill';

// ============================================
// 示例 1: 饿汉式单例 (Eager Initialization)
// ============================================

console.log('=== 示例 1: 饿汉式单例 ===');

interface AppConfig {
  appName: string;
  version: string;
  debug: boolean;
}

const appConfig = createEagerSingleton<AppConfig>(
  'app-config',
  () => ({
    appName: 'MyApplication',
    version: '1.0.0',
    debug: process.env.NODE_ENV === 'development',
  }),
  { enableLog: true }
);

console.log('应用配置:', appConfig);

// 再次获取 - 会返回缓存实例
const appConfig2 = createEagerSingleton('app-config', () => ({
  appName: 'DifferentApp',
  version: '2.0.0',
  debug: false,
}));

console.log('是否为同一实例:', appConfig === appConfig2); // true

// ============================================
// 示例 2: 懒汉式单例 (Lazy Initialization)
// ============================================

console.log('\n=== 示例 2: 懒汉式单例 ===');

class DatabaseConnection {
  private connected = false;
  
  async connect(): Promise<void> {
    console.log('连接数据库...');
    await new Promise(resolve => setTimeout(resolve, 100));
    this.connected = true;
    console.log('数据库连接成功');
  }
  
  isConnected(): boolean {
    return this.connected;
  }
  
  query(sql: string): Promise<any[]> {
    if (!this.connected) {
      throw new Error('数据库未连接');
    }
    console.log(`执行查询：${sql}`);
    return Promise.resolve([{ id: 1, data: 'result' }]);
  }
}

async function lazySingletonDemo() {
  const db = await createLazySingleton(
    'database-connection',
    () => new DatabaseConnection(),
    { enableLog: true },
    true // 启用线程安全
  );
  
  await db.connect();
  const result = await db.query('SELECT * FROM users');
  console.log('查询结果:', result);
  
  return db;
}

// ============================================
// 示例 3: 装饰器方式
// ============================================

console.log('\n=== 示例 3: 装饰器方式 ===');

@Singleton({ name: 'CacheManager', enableLog: true })
class CacheManager {
  private cache = new Map<string, any>();
  private hitCount = 0;
  private missCount = 0;
  
  get(key: string): any {
    if (this.cache.has(key)) {
      this.hitCount++;
      return this.cache.get(key);
    }
    this.missCount++;
    return undefined;
  }
  
  set(key: string, value: any): void {
    this.cache.set(key, value);
  }
  
  getStats(): { hits: number; misses: number; size: number } {
    return {
      hits: this.hitCount,
      misses: this.missCount,
      size: this.cache.size,
    };
  }
}

async function decoratorDemo() {
  const cache1 = await CacheManager.getInstance();
  const cache2 = await CacheManager.getInstance();
  
  console.log('是否为同一实例:', cache1 === cache2); // true
  
  cache1.set('user:1', { name: 'Alice' });
  const user = cache2.get('user:1');
  console.log('缓存数据:', user);
  
  console.log('缓存统计:', cache1.getStats());
}

// ============================================
// 示例 4: 并发访问测试
// ============================================

console.log('\n=== 示例 4: 并发访问测试 ===');

async function concurrencyDemo() {
  const result = await SingletonExamples.concurrencyTest();
  console.log('并发测试结果:', {
    工厂调用次数：result.creationCount,
    所有实例相同：result.allSame,
  });
}

// ============================================
// 示例 5: 单例管理
// ============================================

console.log('\n=== 示例 5: 单例管理 ===');

function managementDemo() {
  console.log('当前单例统计:', getSingletonStats());
  
  console.log('是否存在 app-config:', hasSingleton('app-config'));
  
  console.log('所有单例键:', getSingletonStats().keys);
  
  // 删除特定单例
  deleteSingleton('app-config');
  console.log('删除后统计:', getSingletonStats());
}

// ============================================
// 主函数 - 运行所有示例
// ============================================

async function main() {
  try {
    // 示例 1
    console.log('应用配置:', appConfig);
    
    // 示例 2
    await lazySingletonDemo();
    
    // 示例 3
    await decoratorDemo();
    
    // 示例 4
    await concurrencyDemo();
    
    // 示例 5
    managementDemo();
    
    console.log('\n✅ 所有示例执行完成!');
  } catch (error) {
    console.error('❌ 执行出错:', error);
  }
}

// 运行示例
main();

export { main };
