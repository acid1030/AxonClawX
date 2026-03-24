/**
 * Mutex Utils 技能测试
 */

import {
  Mutex,
  Semaphore,
  RWLock,
  ReentrantMutex,
  acquireWithTimeout,
} from './mutex-utils-skill';

async function testMutex() {
  console.log('测试 Mutex...');
  const mutex = new Mutex();
  let count = 0;

  await Promise.all(
    Array.from({ length: 100 }, () =>
      mutex.run(async () => {
        const current = count;
        await new Promise(resolve => setTimeout(resolve, 1));
        count = current + 1;
      })
    )
  );

  if (count === 100) {
    console.log('✓ Mutex 测试通过');
  } else {
    console.error(`✗ Mutex 测试失败：期望 100, 实际 ${count}`);
  }
}

async function testSemaphore() {
  console.log('测试 Semaphore...');
  const semaphore = new Semaphore(3);
  let maxConcurrent = 0;
  let current = 0;

  await Promise.all(
    Array.from({ length: 20 }, () =>
      semaphore.run(async () => {
        current++;
        maxConcurrent = Math.max(maxConcurrent, current);
        await new Promise(resolve => setTimeout(resolve, 10));
        current--;
      })
    )
  );

  if (maxConcurrent <= 3) {
    console.log(`✓ Semaphore 测试通过 (最大并发：${maxConcurrent})`);
  } else {
    console.error(`✗ Semaphore 测试失败：最大并发 ${maxConcurrent} > 3`);
  }
}

async function testRWLock() {
  console.log('测试 RWLock...');
  const rwlock = new RWLock();
  let maxReaders = 0;
  let currentReaders = 0;
  let writeLocked = false;

  const readers = Array.from({ length: 5 }, () =>
    rwlock.read(async () => {
      currentReaders++;
      maxReaders = Math.max(maxReaders, currentReaders);
      
      if (writeLocked) {
        throw new Error('读锁与写锁冲突');
      }
      
      await new Promise(resolve => setTimeout(resolve, 10));
      currentReaders--;
    })
  );

  const writer = rwlock.write(async () => {
    writeLocked = true;
    if (currentReaders > 0) {
      throw new Error('写锁时有读者');
    }
    await new Promise(resolve => setTimeout(resolve, 10));
    writeLocked = false;
  });

  await Promise.all([...readers, writer]);

  if (maxReaders > 1) {
    console.log(`✓ RWLock 测试通过 (最大并发读者：${maxReaders})`);
  } else {
    console.error(`✗ RWLock 测试失败：最大并发读者 ${maxReaders}`);
  }
}

async function testReentrantMutex() {
  console.log('测试 ReentrantMutex...');
  const mutex = new ReentrantMutex();
  let depth = 0;
  let maxDepth = 0;

  async function recursive(n: number) {
    await mutex.run(async () => {
      depth = mutex.holdCount();
      maxDepth = Math.max(maxDepth, depth);
      
      if (n > 0) {
        await recursive(n - 1);
      }
    });
  }

  await recursive(5);

  if (maxDepth > 1) {
    console.log(`✓ ReentrantMutex 测试通过 (最大重入深度：${maxDepth})`);
  } else {
    console.error(`✗ ReentrantMutex 测试失败`);
  }
}

async function testTimeout() {
  console.log('测试超时功能...');
  const mutex = new Mutex();
  
  // 持有锁
  await mutex.acquire();
  
  // 尝试获取 (应该超时)
  const start = Date.now();
  const acquired = await acquireWithTimeout(mutex, 100);
  const elapsed = Date.now() - start;
  
  // 释放锁
  mutex.release();
  
  if (!acquired && elapsed >= 100 && elapsed < 200) {
    console.log(`✓ 超时测试通过 (耗时：${elapsed}ms)`);
  } else {
    console.error(`✗ 超时测试失败：acquired=${acquired}, elapsed=${elapsed}ms`);
  }
}

async function runTests() {
  console.log('=== Mutex Utils 测试套件 ===\n');
  
  await testMutex();
  await testSemaphore();
  await testRWLock();
  await testReentrantMutex();
  await testTimeout();
  
  console.log('\n=== 测试完成 ===');
}

runTests().catch(console.error);
