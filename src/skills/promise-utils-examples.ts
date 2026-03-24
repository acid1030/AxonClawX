/**
 * Promise 工具使用示例
 * 
 * 本文件展示 promise-utils-skill.ts 的实际使用场景
 * 可以直接运行或复制到项目中使用
 */

import {
  mapWithConcurrency,
  promiseAllLimit,
  processInBatches,
  withRetry,
  withRetryJitter,
  retryable,
  withTimeout,
  TimeoutError,
  raceToFirstSuccess,
  cancellable,
  CancelledError,
  debounce,
  throttle,
  delayExecution,
  sleep,
} from './promise-utils-skill';

// ==================== 示例 1: 并发控制 ====================

/**
 * 示例 1.1: 基础并发控制
 * 场景：批量获取用户数据，限制同时请求数量
 */
async function exampleConcurrency() {
  console.log('\n=== 示例 1.1: 基础并发控制 ===');

  const userIds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  const tasks = userIds.map((id) => () =>
    fetch(`https://jsonplaceholder.typicode.com/users/${id}`).then((r) =>
      r.json()
    )
  );

  const results = await mapWithConcurrency(tasks, {
    limit: 3, // 最多 3 个并发
    stopOnError: false,
    interval: 200, // 每个请求间隔 200ms
  });

  console.log(`成功：${results.filter((r) => r.success).length}`);
  console.log(`失败：${results.filter((r) => !r.success).length}`);
}

/**
 * 示例 1.2: 简化版并发 (只返回成功结果)
 * 场景：批量下载图片，忽略失败的
 */
async function examplePromiseAllLimit() {
  console.log('\n=== 示例 1.2: 简化版并发 ===');

  const imageUrls = [
    'https://via.placeholder.com/150',
    'https://via.placeholder.com/200',
    'https://via.placeholder.com/250',
    'https://via.placeholder.com/300',
  ];

  const tasks = imageUrls.map((url) => () => fetch(url).then((r) => r.blob()));

  const successfulImages = await promiseAllLimit(tasks, 2);

  console.log(`成功下载：${successfulImages.length} 张图片`);
}

/**
 * 示例 1.3: 批处理执行
 * 场景：处理大量数据，每批完成后休息一会
 */
async function exampleBatchProcessing() {
  console.log('\n=== 示例 1.3: 批处理执行 ===');

  const tasks = Array.from({ length: 20 }, (_, i) => () =>
    Promise.resolve(`处理项目 ${i + 1}`)
  );

  const results = await processInBatches(
    tasks,
    5, // 每批 5 个
    1000 // 批次间延迟 1 秒
  );

  console.log(`完成：${results.length} 个项目`);
  console.log('结果:', results);
}

// ==================== 示例 2: 重试机制 ====================

/**
 * 示例 2.1: 基础重试
 * 场景：调用不稳定的 API，失败自动重试
 */
async function exampleBasicRetry() {
  console.log('\n=== 示例 2.1: 基础重试 ===');

  let attemptCount = 0;

  const unstableAPI = async () => {
    attemptCount++;
    console.log(`  第 ${attemptCount} 次调用`);

    if (attemptCount < 3) {
      throw new Error('临时错误');
    }

    return { data: '成功数据' };
  };

  try {
    const result = await withRetry(
      unstableAPI,
      {
        maxRetries: 3,
        delay: 500,
        onRetry: (attempt, error) => {
          console.log(`  重试 ${attempt}: ${error.message}`);
        },
      }
    );

    console.log('最终结果:', result);
  } catch (error) {
    console.error('所有重试失败:', error);
  }
}

/**
 * 示例 2.2: 指数退避重试
 * 场景：调用限流 API，每次重试延迟翻倍
 */
async function exampleExponentialBackoff() {
  console.log('\n=== 示例 2.2: 指数退避重试 ===');

  let attemptCount = 0;

  const rateLimitedAPI = async () => {
    attemptCount++;
    console.log(`  第 ${attemptCount} 次调用`);

    if (attemptCount < 4) {
      const error: any = new Error('Rate limited');
      error.status = 429;
      throw error;
    }

    return { data: '成功' };
  };

  try {
    const result = await withRetry(rateLimitedAPI, {
      maxRetries: 5,
      delay: 1000,
      exponentialBackoff: true, // 启用指数退避
      maxDelay: 10000,
      onRetry: (attempt, error) => {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.log(`  重试 ${attempt}, 等待 ${waitTime}ms`);
      },
    });

    console.log('最终结果:', result);
  } catch (error) {
    console.error('所有重试失败:', error);
  }
}

/**
 * 示例 2.3: 条件重试
 * 场景：只在特定错误时重试 (如网络错误、5xx)
 */
async function exampleConditionalRetry() {
  console.log('\n=== 示例 2.3: 条件重试 ===');

  const apiCall = async () => {
    const error: any = new Error('Not Found');
    error.status = 404;
    throw error;
  };

  try {
    const result = await withRetry(apiCall, {
      maxRetries: 3,
      shouldRetry: (error: any) => {
        // 只重试 5xx 错误和网络错误，4xx 不重试
        return error.status >= 500 || error.code === 'NETWORK_ERROR';
      },
    });

    console.log('结果:', result);
  } catch (error: any) {
    console.log(`不重试的错误：${error.message} (状态码：${error.status})`);
  }
}

/**
 * 示例 2.4: 安全重试 (不抛异常)
 * 场景：优雅处理失败，不中断流程
 */
async function exampleSafeRetry() {
  console.log('\n=== 示例 2.4: 安全重试 ===');

  const unreliableAPI = async () => {
    throw new Error('服务不可用');
  };

  const result = await retryable(unreliableAPI, {
    maxRetries: 3,
    delay: 500,
  });

  if (result.success) {
    console.log('成功:', result.data);
  } else {
    console.log('失败 (但程序继续):', result.error.message);
  }
}

/**
 * 示例 2.5: 带抖动的重试
 * 场景：避免多个客户端同时重试造成雪崩
 */
async function exampleRetryWithJitter() {
  console.log('\n=== 示例 2.5: 带抖动的重试 ===');

  let attemptCount = 0;

  const apiCall = async () => {
    attemptCount++;
    console.log(`  第 ${attemptCount} 次调用`);

    if (attemptCount < 2) {
      throw new Error('临时错误');
    }

    return { data: '成功' };
  };

  try {
    const result = await withRetryJitter(apiCall, {
      maxRetries: 3,
      delay: 1000,
    });

    console.log('最终结果:', result);
  } catch (error) {
    console.error('所有重试失败:', error);
  }
}

// ==================== 示例 3: 超时处理 ====================

/**
 * 示例 3.1: 基础超时
 * 场景：防止慢请求拖垮程序
 */
async function exampleBasicTimeout() {
  console.log('\n=== 示例 3.1: 基础超时 ===');

  const slowAPI = async () => {
    await sleep(3000); // 模拟慢请求
    return { data: '完成' };
  };

  try {
    const result = await withTimeout(
      slowAPI(),
      1000, // 1 秒超时
      'API 响应超时'
    );

    console.log('结果:', result);
  } catch (error) {
    if (error instanceof TimeoutError) {
      console.log('捕获超时:', error.message);
    }
  }
}

/**
 * 示例 3.2: 多源竞态
 * 场景：多个数据源，哪个快用哪个
 */
async function exampleRaceToSuccess() {
  console.log('\n=== 示例 3.2: 多源竞态 ===');

  const fastSource = async () => {
    await sleep(500);
    console.log('  快速源完成');
    return { source: 'fast', data: '快速数据' };
  };

  const slowSource = async () => {
    await sleep(2000);
    console.log('  慢速源完成');
    return { source: 'slow', data: '慢速数据' };
  };

  const result = await Promise.race([fastSource(), slowSource()]);

  console.log('获胜者:', result);
}

/**
 * 示例 3.3: 智能数据加载 (多任务竞态)
 * 场景：缓存 -> CDN -> 源站，哪个成功用哪个
 */
async function exampleSmartLoading() {
  console.log('\n=== 示例 3.3: 智能数据加载 ===');

  const fetchFromCache = async () => {
    await sleep(100);
    throw new Error('Cache miss'); // 缓存未命中
  };

  const fetchFromCDN = async () => {
    await sleep(500);
    return { source: 'CDN', data: 'CDN 数据' };
  };

  const fetchFromOrigin = async () => {
    await sleep(2000);
    return { source: 'Origin', data: '源站数据' };
  };

  try {
    const result = await raceToFirstSuccess(
      [fetchFromCache, fetchFromCDN, fetchFromOrigin],
      5000 // 总超时 5 秒
    );

    console.log('加载成功:', result);
  } catch (error) {
    console.error('所有源都失败:', error);
  }
}

/**
 * 示例 3.4: 可取消的 Promise
 * 场景：用户取消长时间运行的任务
 */
async function exampleCancellable() {
  console.log('\n=== 示例 3.4: 可取消的 Promise ===');

  const { promise, cancel } = cancellable<number>(async (cancelToken) => {
    let result = 0;

    for (let i = 0; i < 10 && !cancelToken.cancelled; i++) {
      await sleep(500);
      result += i;
      console.log(`  进度：${i + 1}/10, 当前结果：${result}`);
    }

    if (cancelToken.cancelled) {
      throw new CancelledError('用户取消');
    }

    return result;
  });

  // 3 秒后取消
  setTimeout(() => {
    console.log('  取消任务...');
    cancel();
  }, 1500);

  try {
    const finalResult = await promise;
    console.log('最终结果:', finalResult);
  } catch (error) {
    if (error instanceof CancelledError) {
      console.log('任务已取消:', error.message);
    }
  }
}

// ==================== 示例 4: 执行控制 ====================

/**
 * 示例 4.1: 延迟执行
 * 场景：延迟执行某个任务
 */
async function exampleDelayExecution() {
  console.log('\n=== 示例 4.1: 延迟执行 ===');

  console.log('开始等待...');

  const result = await delayExecution(
    () => {
      console.log('任务执行!');
      return Promise.resolve('完成');
    },
    2000 // 延迟 2 秒
  );

  console.log('结果:', result);
}

/**
 * 示例 4.2: 防抖 (Debounce)
 * 场景：搜索框输入，避免频繁请求
 */
async function exampleDebounce() {
  console.log('\n=== 示例 4.2: 防抖 ===');

  const searchAPI = async (query: string) => {
    console.log(`  搜索：${query}`);
    await sleep(500);
    return [`结果 1 for ${query}`, `结果 2 for ${query}`];
  };

  const debouncedSearch = debounce(searchAPI, 1000);

  // 模拟快速输入
  console.log('输入：a');
  debouncedSearch('a');

  console.log('输入：ab');
  debouncedSearch('ab');

  console.log('输入：abc (只有这个会执行)');
  const results = await debouncedSearch('abc');

  console.log('最终搜索结果:', results);
}

/**
 * 示例 4.3: 节流 (Throttle)
 * 场景：滚动加载，限制请求频率
 */
async function exampleThrottle() {
  console.log('\n=== 示例 4.3: 节流 ===');

  let scrollCount = 0;

  const loadMoreData = async () => {
    scrollCount++;
    console.log(`  加载第 ${scrollCount} 页数据...`);
    await sleep(300);
    return [`数据项 ${scrollCount}`];
  };

  const throttledLoad = throttle(loadMoreData, 1000);

  // 模拟快速滚动
  console.log('滚动事件 x 5 次');
  throttledLoad();
  throttledLoad();
  throttledLoad();
  throttledLoad();
  throttledLoad();

  await sleep(2000);
  console.log('实际只执行了', scrollCount, '次');
}

// ==================== 示例 5: 综合应用 ====================

/**
 * 示例 5.1: 批量 API 调用 (并发 + 重试 + 超时)
 * 场景：生产环境中的批量数据获取
 */
async function exampleProductionBatch() {
  console.log('\n=== 示例 5.1: 生产环境批量调用 ===');

  const userIds = [1, 2, 3, 4, 5];

  const fetchUser = (id: number) =>
    withRetry(
      async () => {
        const response = await fetch(
          `https://jsonplaceholder.typicode.com/users/${id}`
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        return response.json();
      },
      {
        maxRetries: 2,
        delay: 500,
        shouldRetry: (error: any) => error.message.includes('5'),
      }
    );

  const tasks = userIds.map((id) => () =>
    withTimeout(fetchUser(id), 5000, `用户 ${id} 获取超时`)
  );

  const results = await mapWithConcurrency(tasks, {
    limit: 3,
    stopOnError: false,
  });

  const successful = results.filter((r) => r.success).map((r) => r.value);
  const failed = results
    .filter((r) => !r.success)
    .map((r) => ({
      userId: userIds[r.index],
      error: r.error,
    }));

  console.log(`成功：${successful.length}`);
  console.log(`失败：${failed.length}`);

  if (failed.length > 0) {
    console.log('失败详情:', failed);
  }
}

// ==================== 主函数 ====================

async function main() {
  console.log('🚀 Promise 工具使用示例\n');

  // 并发控制示例
  await exampleConcurrency();
  await examplePromiseAllLimit();
  await exampleBatchProcessing();

  // 重试机制示例
  await exampleBasicRetry();
  await exampleExponentialBackoff();
  await exampleConditionalRetry();
  await exampleSafeRetry();
  await exampleRetryWithJitter();

  // 超时处理示例
  await exampleBasicTimeout();
  await exampleRaceToSuccess();
  await exampleSmartLoading();
  await exampleCancellable();

  // 执行控制示例
  await exampleDelayExecution();
  await exampleDebounce();
  await exampleThrottle();

  // 综合应用示例
  await exampleProductionBatch();

  console.log('\n✅ 所有示例完成!\n');
}

// 运行示例
main().catch(console.error);

/**
 * 运行方式:
 * 
 * 1. 直接运行 (需要 TypeScript 环境):
 *    npx ts-node promise-utils-examples.ts
 * 
 * 2. 编译后运行:
 *    npx tsc promise-utils-examples.ts
 *    node promise-utils-examples.js
 * 
 * 3. 在浏览器中使用 (需要打包工具):
 *    导入到项目中，按需使用各个函数
 * 
 * 4. 单独测试某个示例:
 *    注释掉 main() 中的其他示例，只保留想测试的
 */
