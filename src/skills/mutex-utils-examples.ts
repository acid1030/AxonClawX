/**
 * 互斥锁工具技能 - 使用示例
 * 
 * 演示 Mutex、Semaphore、RWLock 的实际应用场景
 */

import {
  Mutex,
  Semaphore,
  RWLock,
  ReentrantMutex,
  acquireWithTimeout,
  acquireSemaphoreWithTimeout,
  runAllWithSemaphore,
} from './mutex-utils-skill';

// ==================== Mutex 使用示例 ====================

/**
 * 示例 1: 保护共享资源
 * 
 * 场景：多个任务同时更新一个计数器，需要保证原子性
 */
async function mutexExample1() {
  const mutex = new Mutex();
  let counter = 0;

  // 模拟 10 个并发任务
  const tasks = Array.from({ length: 10 }, async () => {
    await mutex.run(async () => {
      const current = counter;
      // 模拟异步操作
      await new Promise(resolve => setTimeout(resolve, 10));
      counter = current + 1;
      console.log(`Counter: ${counter}`);
    });
  });

  await Promise.all(tasks);
  console.log(`Final counter: ${counter}`); // 一定是 10
}

/**
 * 示例 2: 防止重复提交
 * 
 * 场景：用户快速点击按钮，只允许一个请求执行
 */
async function mutexExample2() {
  const submitMutex = new Mutex();
  let isSubmitting = false;

  async function submitForm(data: any) {
    if (!submitMutex.tryAcquire()) {
      console.log('已有提交在进行中，请等待...');
      return;
    }

    try {
      isSubmitting = true;
      // 模拟 API 请求
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('提交成功:', data);
    } finally {
      isSubmitting = false;
      submitMutex.release();
    }
  }

  // 模拟快速点击
  submitForm({ name: 'test1' });
  submitForm({ name: 'test2' }); // 会被阻止
}

/**
 * 示例 3: 带超时的锁获取
 * 
 * 场景：避免无限等待，设置超时时间
 */
async function mutexExample3() {
  const mutex = new Mutex();
  
  // 第一个任务持有锁
  mutex.acquire();
  
  // 第二个任务尝试获取锁 (带超时)
  const acquired = await acquireWithTimeout(mutex, 1000);
  
  if (acquired) {
    console.log('成功获取锁');
    mutex.release();
  } else {
    console.log('获取锁超时');
  }
  
  // 释放第一个任务持有的锁
  mutex.release();
}

// ==================== Semaphore 使用示例 ====================

/**
 * 示例 1: 限制并发请求数
 * 
 * 场景：API 有速率限制，最多同时 3 个请求
 */
async function semaphoreExample1() {
  const semaphore = new Semaphore(3); // 最多 3 个并发
  
  const tasks = Array.from({ length: 10 }, (_, i) => async () => {
    await semaphore.run(async () => {
      console.log(`请求 ${i + 1} 开始，当前可用：${semaphore.available()}`);
      // 模拟 API 请求
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`请求 ${i + 1} 完成`);
    });
  });

  await Promise.all(tasks.map(task => task()));
  console.log('所有请求完成');
}

/**
 * 示例 2: 数据库连接池
 * 
 * 场景：限制同时使用的数据库连接数
 */
async function semaphoreExample2() {
  const MAX_CONNECTIONS = 5;
  const connectionSemaphore = new Semaphore(MAX_CONNECTIONS);

  async function queryDatabase(sql: string) {
    await connectionSemaphore.acquire();
    try {
      console.log(`执行查询：${sql}`);
      // 模拟数据库查询
      await new Promise(resolve => setTimeout(resolve, 200));
      return { result: 'data' };
    } finally {
      connectionSemaphore.release();
    }
  }

  // 模拟多个并发查询
  const queries = Array.from({ length: 20 }, (_, i) => 
    queryDatabase(`SELECT * FROM table_${i}`)
  );

  await Promise.all(queries);
}

/**
 * 示例 3: 批量处理任务
 * 
 * 场景：使用 runAllWithSemaphore 批量执行
 */
async function semaphoreExample3() {
  const semaphore = new Semaphore(2); // 同时处理 2 个任务
  
  const tasks = Array.from({ length: 5 }, (_, i) => async () => {
    console.log(`处理任务 ${i + 1}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    return `结果 ${i + 1}`;
  });

  const results = await runAllWithSemaphore(semaphore, tasks);
  console.log('所有任务完成:', results);
}

// ==================== RWLock 使用示例 ====================

/**
 * 示例 1: 缓存读写
 * 
 * 场景：多个读者可以同时读取缓存，写者独占更新
 */
async function rwlockExample1() {
  const rwlock = new RWLock();
  const cache = new Map<string, string>();

  // 读者：可以并发读取
  async function readCache(key: string) {
    return await rwlock.read(async () => {
      console.log(`读取缓存：${key}`);
      await new Promise(resolve => setTimeout(resolve, 50));
      return cache.get(key);
    });
  }

  // 写者：独占写入
  async function writeCache(key: string, value: string) {
    return await rwlock.write(async () => {
      console.log(`写入缓存：${key} = ${value}`);
      await new Promise(resolve => setTimeout(resolve, 100));
      cache.set(key, value);
    });
  }

  // 模拟并发读写
  await Promise.all([
    readCache('key1'),
    readCache('key2'),
    readCache('key3'),
    writeCache('key4', 'value4'), // 写者会等待读者完成
  ]);
}

/**
 * 示例 2: 配置文件管理
 * 
 * 场景：多个进程读取配置，单个进程更新配置
 */
async function rwlockExample2() {
  const rwlock = new RWLock();
  let config = { version: 1, data: {} };

  async function getConfig() {
    return await rwlock.read(async () => {
      console.log('读取配置');
      return { ...config };
    });
  }

  async function updateConfig(newData: any) {
    return await rwlock.write(async () => {
      console.log('更新配置');
      config = { version: config.version + 1, data: newData };
      return config;
    });
  }

  // 多个读者
  const readers = Array.from({ length: 5 }, () => getConfig());
  
  // 一个写者
  const writer = updateConfig({ setting: 'value' });

  await Promise.all([...readers, writer]);
}

/**
 * 示例 3: 尝试获取锁
 * 
 * 场景：非阻塞尝试，失败时立即返回
 */
async function rwlockExample3() {
  const rwlock = new RWLock();

  // 获取读锁
  if (rwlock.tryAcquireRead()) {
    console.log('成功获取读锁');
    // 执行读操作...
    rwlock.releaseRead();
  } else {
    console.log('无法获取读锁 (有写者在等待)');
  }

  // 获取写锁
  if (rwlock.tryAcquireWrite()) {
    console.log('成功获取写锁');
    // 执行写操作...
    rwlock.releaseWrite();
  } else {
    console.log('无法获取写锁 (有读者或写者)');
  }
}

// ==================== ReentrantMutex 使用示例 ====================

/**
 * 示例：递归调用需要重入锁
 * 
 * 场景：函数内部调用自身，需要多次获取同一把锁
 */
async function reentrantMutexExample() {
  const mutex = new ReentrantMutex();

  async function recursiveFunction(depth: number): Promise<void> {
    await mutex.run(async () => {
      console.log(`深度 ${depth}, 持有层数：${mutex.holdCount()}`);
      
      if (depth > 0) {
        await recursiveFunction(depth - 1);
      }
    });
  }

  await recursiveFunction(3);
  console.log('递归完成');
}

// ==================== 综合示例 ====================

/**
 * 综合示例：线程安全的任务队列
 */
async function comprehensiveExample() {
  const queueMutex = new Mutex();
  const workerSemaphore = new Semaphore(3);
  const queue: Array<() => Promise<void>> = [];

  // 添加任务到队列
  async function enqueue(task: () => Promise<void>) {
    await queueMutex.run(async () => {
      queue.push(task);
      console.log(`任务入队，队列长度：${queue.length}`);
    });
  }

  // 从队列取出任务
  async function dequeue(): Promise<(() => Promise<void>) | null> {
    return await queueMutex.run(async () => {
      if (queue.length > 0) {
        return queue.shift() || null;
      }
      return null;
    });
  }

  // 工作线程
  async function worker(id: number) {
    console.log(`工作线程 ${id} 启动`);
    
    while (true) {
      const task = await dequeue();
      if (!task) break;
      
      await workerSemaphore.run(async () => {
        console.log(`工作线程 ${id} 执行任务`);
        await task();
      });
    }
    
    console.log(`工作线程 ${id} 完成`);
  }

  // 添加任务
  for (let i = 0; i < 10; i++) {
    await enqueue(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log(`任务 ${i} 完成`);
    });
  }

  // 启动工作线程
  await Promise.all([
    worker(1),
    worker(2),
    worker(3),
  ]);
}

// ==================== 运行示例 ====================

async function runAllExamples() {
  console.log('=== Mutex 示例 1: 保护共享资源 ===');
  await mutexExample1();
  
  console.log('\n=== Mutex 示例 2: 防止重复提交 ===');
  await mutexExample2();
  
  console.log('\n=== Mutex 示例 3: 带超时的锁获取 ===');
  await mutexExample3();
  
  console.log('\n=== Semaphore 示例 1: 限制并发请求数 ===');
  await semaphoreExample1();
  
  console.log('\n=== Semaphore 示例 2: 数据库连接池 ===');
  await semaphoreExample2();
  
  console.log('\n=== Semaphore 示例 3: 批量处理任务 ===');
  await semaphoreExample3();
  
  console.log('\n=== RWLock 示例 1: 缓存读写 ===');
  await rwlockExample1();
  
  console.log('\n=== RWLock 示例 2: 配置文件管理 ===');
  await rwlockExample2();
  
  console.log('\n=== RWLock 示例 3: 尝试获取锁 ===');
  await rwlockExample3();
  
  console.log('\n=== ReentrantMutex 示例 ===');
  await reentrantMutexExample();
  
  console.log('\n=== 综合示例：线程安全的任务队列 ===');
  await comprehensiveExample();
}

// 运行所有示例
// runAllExamples();

export {
  mutexExample1,
  mutexExample2,
  mutexExample3,
  semaphoreExample1,
  semaphoreExample2,
  semaphoreExample3,
  rwlockExample1,
  rwlockExample2,
  rwlockExample3,
  reentrantMutexExample,
  comprehensiveExample,
};
