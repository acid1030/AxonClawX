/**
 * Object Pool Skill - 使用示例
 * 
 * 演示如何使用对象池工具进行对象复用
 */

import {
  createPool,
  getPool,
  deletePool,
  getAllPoolStats,
  clearAllPools,
  exampleDatabasePool,
  exampleHttpClientPool,
  exampleGameObjectPool,
  exampleConcurrencyControl,
} from './object-pool-skill';

// ============ 示例 1: 基础用法 ============

function basicExample() {
  console.log('=== 基础用法示例 ===\n');

  // 创建简单的字符串对象池
  const stringPool = createPool<string>({
    name: 'string-pool',
    initialSize: 5,
    maxSize: 10,
    minSize: 2,
    factory: () => {
      return 'default-string';
    },
    reset: (str) => {
      // 重置对象状态
    },
  });

  // 获取对象
  const obj1 = stringPool.acquire();
  const obj2 = stringPool.acquire();

  console.log('获取了两个对象:', obj1, obj2);

  // 查看统计信息
  const stats = stringPool.getStats();
  console.log('池统计:', stats);

  // 归还对象
  stringPool.release(obj1);
  stringPool.release(obj2);

  // 调整池大小
  stringPool.resize(8);

  // 预热池
  stringPool.warmup(10);

  // 回收空闲对象 (超过 5 秒未使用)
  const reclaimed = stringPool.reclaimIdleObjects(5000);
  console.log('回收了', reclaimed, '个空闲对象');
}

// ============ 示例 2: 数据库连接池 ============

async function databaseExample() {
  console.log('\n=== 数据库连接池示例 ===\n');

  const dbPool = exampleDatabasePool();

  // 执行查询
  const result1 = await dbPool.executeQuery('SELECT * FROM users');
  console.log('查询结果 1:', result1);

  const result2 = await dbPool.executeQuery('SELECT * FROM posts');
  console.log('查询结果 2:', result2);

  // 查看统计
  const stats = dbPool.getStats();
  console.log('数据库池统计:', stats);

  // 调整连接数
  dbPool.resize(15);
}

// ============ 示例 3: HTTP 客户端池 ============

async function httpExample() {
  console.log('\n=== HTTP 客户端池示例 ===\n');

  const httpPool = exampleHttpClientPool();

  // 并发请求
  const [get1, get2, post1] = await Promise.all([
    httpPool.get('https://api.example.com/users'),
    httpPool.get('https://api.example.com/posts'),
    httpPool.post('https://api.example.com/users', { name: 'test' }),
  ]);

  console.log('GET 结果 1:', get1);
  console.log('GET 结果 2:', get2);
  console.log('POST 结果 1:', post1);

  // 查看统计
  const stats = httpPool.getStats();
  console.log('HTTP 池统计:', stats);
}

// ============ 示例 4: 游戏对象池 ============

function gameExample() {
  console.log('\n=== 游戏对象池示例 ===\n');

  const bulletPool = exampleGameObjectPool();

  // 生成子弹
  const bullets: any[] = [];
  for (let i = 0; i < 10; i++) {
    const bullet = bulletPool.spawnBullet(i * 10, i * 10);
    bullets.push(bullet);
  }

  console.log('生成了 10 发子弹');

  // 查看统计
  const stats = bulletPool.getStats();
  console.log('子弹池统计:', stats);

  // 归还子弹
  bullets.forEach(bullet => {
    bulletPool.returnBullet(bullet);
  });

  console.log('归还了所有子弹');

  // 预热池 (预创建 100 个子弹对象)
  bulletPool.warmup(100);
}

// ============ 示例 5: 并发控制 ============

async function concurrencyExample() {
  console.log('\n=== 并发控制示例 ===\n');

  const result = await exampleConcurrencyControl();
  
  console.log('任务执行完成');
  console.log('统计信息:', result.stats);
}

// ============ 示例 6: 多池管理 ============

function multiPoolExample() {
  console.log('\n=== 多池管理示例 ===\n');

  // 创建多个池
  const pool1 = createPool<number>({
    name: 'number-pool',
    initialSize: 5,
    factory: () => Math.random(),
  });

  const pool2 = createPool<object>({
    name: 'object-pool',
    initialSize: 3,
    factory: () => ({ id: Date.now() }),
  });

  // 获取特定池
  const retrievedPool = getPool<number>('number-pool');
  if (retrievedPool) {
    console.log('成功获取 number-pool');
  }

  // 查看所有池统计
  const allStats = getAllPoolStats();
  console.log('所有池统计:', allStats);

  // 删除特定池
  deletePool('object-pool');
  console.log('已删除 object-pool');

  // 清空所有池
  clearAllPools();
  console.log('已清空所有池');
}

// ============ 示例 7: 高级配置 ============

async function advancedExample() {
  console.log('\n=== 高级配置示例 ===\n');

  interface ExpensiveResource {
    id: number;
    data: any;
    connect(): Promise<void>;
    disconnect(): void;
  }

  let resourceIdCounter = 0;

  const expensivePool = createPool<ExpensiveResource>({
    name: 'expensive-resource',
    initialSize: 3,
    maxSize: 10,
    minSize: 2,
    acquireTimeout: 5000, // 5 秒超时
    factory: () => {
      const id = resourceIdCounter++;
      console.log(`创建昂贵资源 #${id}`);
      return {
        id,
        data: null,
        connect: async () => {
          console.log(`资源 #${id} 连接中...`);
          await new Promise(resolve => setTimeout(resolve, 100));
          console.log(`资源 #${id} 已连接`);
        },
        disconnect: () => {
          console.log(`资源 #${id} 已断开`);
        },
      };
    },
    reset: (resource) => {
      console.log(`重置资源 #${resource.id}`);
      resource.data = null;
    },
    destroy: (resource) => {
      console.log(`销毁资源 #${resource.id}`);
      resource.disconnect();
    },
  });

  // 使用资源
  const resource = await expensivePool.acquire();
  await resource.connect();
  resource.data = { some: 'data' };
  
  console.log('使用资源:', resource);

  // 归还资源
  expensivePool.release(resource);

  // 回收空闲资源 (超过 10 秒未使用)
  const reclaimed = expensivePool.reclaimIdleObjects(10000);
  console.log('回收了', reclaimed, '个空闲资源');

  // 查看统计
  const stats = expensivePool.getStats();
  console.log('昂贵资源池统计:', stats);
}

// ============ 运行所有示例 ============

async function runAllExamples() {
  try {
    basicExample();
    await databaseExample();
    await httpExample();
    gameExample();
    await concurrencyExample();
    multiPoolExample();
    await advancedExample();

    console.log('\n✅ 所有示例运行完成!\n');
  } catch (error) {
    console.error('❌ 示例运行出错:', error);
  }
}

// 导出示例函数供外部调用
export {
  basicExample,
  databaseExample,
  httpExample,
  gameExample,
  concurrencyExample,
  multiPoolExample,
  advancedExample,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
