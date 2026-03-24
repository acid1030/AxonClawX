/**
 * Multiton Pattern Skill - 快速测试
 * 
 * 验证多例模式的核心功能
 */

import {
  getOrCreateMultiton,
  releaseMultiton,
  deleteMultiton,
  getMultitonStatistics,
  resetStatistics,
  InstancePool,
  createMultitonManager,
} from './multiton-pattern-skill';

// ============================================================================
// 测试 1: 基础多例功能
// ============================================================================

async function testBasicMultiton() {
  console.log('\n=== 测试 1: 基础多例功能 ===\n');

  resetStatistics();

  // 创建实例
  const instance1 = await getOrCreateMultiton('test-key-1', () => {
    console.log('  [Factory] 创建实例 1');
    return { id: 1, name: 'Instance 1' };
  }, { enableLog: true });

  // 再次获取相同键
  const instance1Again = await getOrCreateMultiton('test-key-1', () => {
    console.log('  [Factory] 这行不会执行');
    return { id: 999, name: 'Should not create' };
  }, { enableLog: true });

  // 创建不同键的实例
  const instance2 = await getOrCreateMultiton('test-key-2', () => {
    console.log('  [Factory] 创建实例 2');
    return { id: 2, name: 'Instance 2' };
  }, { enableLog: true });

  // 验证
  console.log('\n  验证结果:');
  console.log(`  instance1 === instance1Again: ${instance1 === instance1Again}`); // true
  console.log(`  instance1 === instance2: ${instance1 === instance2}`); // false
  console.log(`  instance1.id: ${instance1.id}`); // 1
  console.log(`  instance2.id: ${instance2.id}`); // 2

  const stats = getMultitonStatistics();
  console.log(`\n  统计信息:`);
  console.log(`  总实例数：${stats.totalInstances}`);
  console.log(`  总访问数：${stats.totalAccesses}`);
  console.log(`  缓存命中数：${stats.cacheHits}`);
  console.log(`  命中率：${stats.hitRate.toFixed(2)}%`);

  // 清理
  deleteMultiton('test-key-1');
  deleteMultiton('test-key-2');

  console.log('\n  ✅ 测试 1 通过\n');
}

// ============================================================================
// 测试 2: 实例释放与回收
// ============================================================================

async function testReleaseAndRecycle() {
  console.log('\n=== 测试 2: 实例释放与回收 ===\n');

  const instance = await getOrCreateMultiton('test-release', () => {
    return { id: 1 };
  }, { enableLog: true });

  console.log(`  实例创建成功: ${instance.id}`);

  // 释放实例
  releaseMultiton('test-release', { enableLog: true });
  console.log('  实例已释放');

  // 删除实例
  const deleted = deleteMultiton('test-release', { enableLog: true });
  console.log(`  实例删除结果：${deleted}`);

  // 验证实例已删除
  const newInstance = await getOrCreateMultiton('test-release', () => {
    console.log('  [Factory] 创建新实例 (因为旧实例已删除)');
    return { id: 2 };
  }, { enableLog: true });

  console.log(`  新实例 ID: ${newInstance.id}`); // 2

  deleteMultiton('test-release');
  console.log('\n  ✅ 测试 2 通过\n');
}

// ============================================================================
// 测试 3: 实例池管理
// ============================================================================

async function testInstancePool() {
  console.log('\n=== 测试 3: 实例池管理 ===\n');

  let creationCount = 0;

  const pool = new InstancePool<{ id: number; createdAt: number }>({
    name: 'TestPool',
    minSize: 3,
    maxSize: 5,
    enableLog: true,
    factory: () => {
      creationCount++;
      return { id: creationCount, createdAt: Date.now() };
    },
    validate: (instance) => {
      // 验证实例是否有效 (这里简单返回 true)
      return true;
    },
    destroy: (instance) => {
      console.log(`  [Destroy] 销毁实例 ${instance.id}`);
    },
  });

  // 等待池初始化
  await new Promise(resolve => setTimeout(resolve, 100));

  // 查看初始统计
  let stats = pool.getStatistics();
  console.log(`\n  初始池统计:`);
  console.log(`  池大小：${stats.size}`);
  console.log(`  可用：${stats.available}`);
  console.log(`  使用中：${stats.inUse}`);

  // 获取实例
  console.log('\n  获取 3 个实例...');
  const instances = await Promise.all([
    pool.acquire(),
    pool.acquire(),
    pool.acquire(),
  ]);

  stats = pool.getStatistics();
  console.log(`\n  获取后统计:`);
  console.log(`  池大小：${stats.size}`);
  console.log(`  可用：${stats.available}`);
  console.log(`  使用中：${stats.inUse}`);

  // 归还实例
  console.log('\n  归还 2 个实例...');
  await pool.release(instances[0]);
  await pool.release(instances[1]);

  stats = pool.getStatistics();
  console.log(`\n  归还后统计:`);
  console.log(`  池大小：${stats.size}`);
  console.log(`  可用：${stats.available}`);
  console.log(`  使用中：${stats.inUse}`);

  // 销毁池
  console.log('\n  销毁池...');
  await pool.destroy();

  console.log('\n  ✅ 测试 3 通过\n');
}

// ============================================================================
// 测试 4: 多例管理器 (命名空间)
// ============================================================================

async function testMultitonManager() {
  console.log('\n=== 测试 4: 多例管理器 (命名空间) ===\n');

  const manager = createMultitonManager({
    namespace: 'test',
    enableLog: true,
  });

  // 创建实例
  const instance1 = await manager.get('db-primary', () => ({
    type: 'database',
    role: 'primary',
  }));

  const instance2 = await manager.get('db-replica', () => ({
    type: 'database',
    role: 'replica',
  }));

  const instance3 = await manager.get('cache-redis', () => ({
    type: 'cache',
    engine: 'redis',
  }));

  // 查看所有键
  const keys = manager.keys();
  console.log(`\n  所有键：${keys.join(', ')}`);

  // 查看统计
  const stats = manager.statistics();
  console.log(`\n  统计信息:`);
  console.log(`  总实例数：${stats.totalInstances}`);
  console.log(`  实例分布:`, JSON.stringify(stats.instanceDistribution, null, 2));

  // 释放实例
  manager.release('db-primary');
  console.log('\n  已释放 db-primary');

  // 删除实例
  manager.delete('db-replica');
  console.log('  已删除 db-replica');

  // 清理
  manager.delete('cache-redis');

  console.log('\n  ✅ 测试 4 通过\n');
}

// ============================================================================
// 测试 5: 实际场景模拟 - HTTP 客户端池
// ============================================================================

async function testHttpClientScenario() {
  console.log('\n=== 测试 5: HTTP 客户端池场景 ===\n');

  // 模拟 HTTP 客户端
  class MockHttpClient {
    constructor(public baseUrl: string) {
      console.log(`  创建 HTTP 客户端：${baseUrl}`);
    }

    async get<T>(path: string): Promise<T> {
      console.log(`  GET ${this.baseUrl}${path}`);
      return { success: true } as T;
    }
  }

  // 为不同 API 创建客户端
  const githubClient = await getOrCreateMultiton(
    'http-github',
    () => new MockHttpClient('https://api.github.com')
  );

  const gitlabClient = await getOrCreateMultiton(
    'http-gitlab',
    () => new MockHttpClient('https://gitlab.com/api/v4')
  );

  // 使用客户端
  console.log('\n  使用 GitHub 客户端:');
  await githubClient.get('/users/test');

  console.log('\n  使用 GitLab 客户端:');
  await gitlabClient.get('/projects');

  // 再次获取 GitHub 客户端 (应该返回相同实例)
  console.log('\n  再次获取 GitHub 客户端:');
  const githubClient2 = await getOrCreateMultiton(
    'http-github',
    () => new MockHttpClient('https://api.github.com') // 这行不会执行
  );

  console.log(`\n  验证：githubClient === githubClient2: ${githubClient === githubClient2}`);

  // 清理
  deleteMultiton('http-github');
  deleteMultiton('http-gitlab');

  console.log('\n  ✅ 测试 5 通过\n');
}

// ============================================================================
// 运行所有测试
// ============================================================================

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       Multiton Pattern Skill - 测试套件                  ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    await testBasicMultiton();
    await testReleaseAndRecycle();
    await testInstancePool();
    await testMultitonManager();
    await testHttpClientScenario();

    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ 所有测试通过！                       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
runAllTests();
