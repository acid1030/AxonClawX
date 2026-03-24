/**
 * 🜏 KAEL Reactive Streams Skill
 * 
 * 响应式流式处理工具
 * 功能：流创建 | 操作符链 | 背压处理
 * 
 * @author KAEL Engineering
 * @version 1.0.0
 */

// ============================================================================
// 类型定义
// ============================================================================

type StreamOperator<T, R> = (source: AsyncIterable<T>) => AsyncIterable<R>;

interface StreamConfig {
  bufferSize?: number;        // 缓冲区大小 (背压控制)
  timeoutMs?: number;         // 超时时间
  retryCount?: number;        // 重试次数
  concurrency?: number;       // 并发度
}

interface StreamState<T> {
  buffer: T[];
  isPaused: boolean;
  isCompleted: boolean;
  error?: Error;
  subscribers: Set<(value: T) => void>;
}

// ============================================================================
// 流创建
// ============================================================================

/**
 * 从数组创建流
 */
export function fromArray<T>(items: T[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const item of items) {
        yield item;
      }
    }
  };
}

/**
 * 从范围创建流
 */
export function fromRange(start: number, end: number, step = 1): AsyncIterable<number> {
  return {
    async *[Symbol.asyncIterator]() {
      for (let i = start; i < end; i += step) {
        yield i;
      }
    }
  };
}

/**
 * 从事件创建流
 */
export function fromEvent<T>(
  emitter: EventEmitterLike<T>,
  eventName: string
): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      const queue: T[] = [];
      let resolveNext: ((value: IteratorResult<T>) => void) | null = null;

      const handler = (data: T) => {
        if (resolveNext) {
          resolveNext({ value: data, done: false });
          resolveNext = null;
        } else {
          queue.push(data);
        }
      };

      emitter.on(eventName, handler);

      try {
        while (true) {
          if (queue.length > 0) {
            yield queue.shift()!;
          } else {
            await new Promise<T>((resolve) => {
              resolveNext = resolve;
            });
          }
        }
      } finally {
        emitter.off(eventName, handler);
      }
    }
  };
}

/**
 * 从 Promise 创建流
 */
export function fromPromise<T>(promise: Promise<T>): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      yield await promise;
    }
  };
}

/**
 * 创建空流
 */
export function empty<T>(): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      // 立即完成
    }
  };
}

/**
 * 创建无限流 (用于轮询/心跳)
 */
export function interval(ms: number): AsyncIterable<number> {
  return {
    async *[Symbol.asyncIterator]() {
      let count = 0;
      while (true) {
        yield count++;
        await sleep(ms);
      }
    }
  };
}

// ============================================================================
// 操作符链
// ============================================================================

/**
 * Map 操作符 - 转换流中的每个元素
 */
export function map<T, R>(fn: (value: T, index: number) => R): StreamOperator<T, R> {
  return async function* (source) {
    let index = 0;
    for await (const value of source) {
      yield fn(value, index++);
    }
  };
}

/**
 * Filter 操作符 - 过滤流中的元素
 */
export function filter<T>(predicate: (value: T, index: number) => boolean): StreamOperator<T, T> {
  return async function* (source) {
    let index = 0;
    for await (const value of source) {
      if (predicate(value, index++)) {
        yield value;
      }
    }
  };
}

/**
 * Take 操作符 - 取前 N 个元素
 */
export function take<T>(count: number): StreamOperator<T, T> {
  return async function* (source) {
    let taken = 0;
    for await (const value of source) {
      if (taken >= count) return;
      yield value;
      taken++;
    }
  };
}

/**
 * Skip 操作符 - 跳过前 N 个元素
 */
export function skip<T>(count: number): StreamOperator<T, T> {
  return async function* (source) {
    let skipped = 0;
    for await (const value of source) {
      if (skipped < count) {
        skipped++;
        continue;
      }
      yield value;
    }
  };
}

/**
 * Reduce 操作符 - 聚合流
 */
export function reduce<T, R>(
  fn: (accumulator: R, value: T, index: number) => R,
  initial: R
): StreamOperator<T, R> {
  return async function* (source) {
    let accumulator = initial;
    let index = 0;
    for await (const value of source) {
      accumulator = fn(accumulator, value, index++);
    }
    yield accumulator;
  };
}

/**
 * FlatMap 操作符 - 展平嵌套流
 */
export function flatMap<T, R>(
  fn: (value: T) => AsyncIterable<R> | Promise<AsyncIterable<R>>
): StreamOperator<T, R> {
  return async function* (source) {
    for await (const value of source) {
      const inner = await fn(value);
      for await (const innerValue of inner) {
        yield innerValue;
      }
    }
  };
}

/**
 * Merge 操作符 - 合并多个流
 */
export function merge<T>(...streams: AsyncIterable<T>[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      const iterators = streams.map(s => s[Symbol.asyncIterator]());
      const pending = new Map<Promise<IteratorResult<T>>, number>();

      const scheduleNext = (index: number) => {
        const promise = iterators[index].next();
        pending.set(promise, index);
      };

      iterators.forEach((_, i) => scheduleNext(i));

      while (pending.size > 0) {
        const { value: result, done } = await Promise.race(
          Array.from(pending.keys()).map(async (promise) => {
            const result = await promise;
            return { result, promise };
          })
        );

        const index = pending.get(done as any)!;
        pending.delete(done as any);

        if (!result.done) {
          yield result.value;
          scheduleNext(index);
        } else {
          iterators.splice(index, 1);
        }
      }
    }
  };
}

/**
 * Concat 操作符 - 顺序连接多个流
 */
export function concat<T>(...streams: AsyncIterable<T>[]): AsyncIterable<T> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const stream of streams) {
        for await (const value of stream) {
          yield value;
        }
      }
    }
  };
}

/**
 * Debounce 操作符 - 防抖
 */
export function debounce<T>(ms: number): StreamOperator<T, T> {
  return async function* (source) {
    let timeout: NodeJS.Timeout | null = null;
    let lastValue: T | null = null;
    let hasValue = false;

    const iterator = source[Symbol.asyncIterator]();

    while (true) {
      const { value, done } = await Promise.race([
        iterator.next(),
        timeout ? Promise.resolve({ value: null, done: true } as any) : Promise.race([])
      ]);

      if (done && !hasValue) break;

      if (timeout) clearTimeout(timeout);

      if (!done) {
        lastValue = value;
        hasValue = true;
        timeout = setTimeout(() => {
          if (hasValue) {
            hasValue = false;
          }
        }, ms);
      } else if (hasValue) {
        yield lastValue!;
        hasValue = false;
      }
    }
  };
}

/**
 * Throttle 操作符 - 节流
 */
export function throttle<T>(ms: number): StreamOperator<T, T> {
  return async function* (source) {
    let lastEmit = 0;

    for await (const value of source) {
      const now = Date.now();
      if (now - lastEmit >= ms) {
        yield value;
        lastEmit = now;
      }
    }
  };
}

/**
 * Retry 操作符 - 重试
 */
export function retry<T>(count: number): StreamOperator<T, T> {
  return async function* (source) {
    let attempts = 0;
    while (attempts <= count) {
      try {
        for await (const value of source) {
          yield value;
        }
        break;
      } catch (error) {
        attempts++;
        if (attempts > count) throw error;
        await sleep(Math.pow(2, attempts) * 100); // 指数退避
      }
    }
  };
}

/**
 * Catch 操作符 - 错误处理
 */
export function catchError<T>(
  handler: (error: Error) => AsyncIterable<T> | T
): StreamOperator<T, T> {
  return async function* (source) {
    try {
      for await (const value of source) {
        yield value;
      }
    } catch (error) {
      const result = handler(error as Error);
      if (isAsyncIterable(result)) {
        for await (const value of result) {
          yield value;
        }
      } else {
        yield result;
      }
    }
  };
}

// ============================================================================
// 背压处理
// ============================================================================

/**
 * 带背压控制的流
 */
export function withBackpressure<T>(
  source: AsyncIterable<T>,
  config: StreamConfig = {}
): AsyncIterable<T> {
  const { bufferSize = 100 } = config;

  return {
    async *[Symbol.asyncIterator]() {
      const buffer: T[] = [];
      let isDone = false;
      let error: Error | undefined;

      // 生产者
      const producer = (async () => {
        try {
          for await (const value of source) {
            if (buffer.length >= bufferSize) {
              // 缓冲区满，等待
              await waitForSpace(buffer, bufferSize);
            }
            buffer.push(value);
          }
        } catch (e) {
          error = e as Error;
        } finally {
          isDone = true;
        }
      })();

      // 消费者
      while (!isDone || buffer.length > 0) {
        if (buffer.length > 0) {
          yield buffer.shift()!;
        } else if (!isDone) {
          await sleep(10); // 短暂等待
        }
      }

      if (error) throw error;
    }
  };
}

/**
 * 批量处理 (背压优化)
 */
export function buffer<T>(count: number): StreamOperator<T, T[]> {
  return async function* (source) {
    let buffer: T[] = [];

    for await (const value of source) {
      buffer.push(value);
      if (buffer.length >= count) {
        yield buffer;
        buffer = [];
      }
    }

    if (buffer.length > 0) {
      yield buffer;
    }
  };
}

/**
 * 窗口化 (滑动窗口)
 */
export function window<T>(size: number, step = 1): StreamOperator<T, T[]> {
  return async function* (source) {
    let buffer: T[] = [];

    for await (const value of source) {
      buffer.push(value);
      if (buffer.length >= size) {
        yield buffer.slice(0, size);
        buffer = buffer.slice(step);
      }
    }
  };
}

/**
 * 并发控制
 */
export function concatMap<T, R>(
  fn: (value: T) => AsyncIterable<R> | Promise<R>,
  concurrency = 1
): StreamOperator<T, R> {
  return async function* (source) {
    const queue: Array<() => Promise<R>> = [];
    const running = new Set<Promise<R>>();

    for await (const value of source) {
      queue.push(() => Promise.resolve(fn(value)));

      while (running.size < concurrency && queue.length > 0) {
        const task = queue.shift()!;
        const promise = task();
        running.add(promise);
        promise.then(() => running.delete(promise));
        yield await promise;
      }
    }

    await Promise.all(running);
  };
}

// ============================================================================
// 工具函数
// ============================================================================

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function waitForSpace<T>(buffer: T[], maxSize: number): Promise<void> {
  return new Promise(resolve => {
    const check = () => {
      if (buffer.length < maxSize) {
        resolve();
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

function isAsyncIterable<T>(value: any): value is AsyncIterable<T> {
  return value && typeof value[Symbol.asyncIterator] === 'function';
}

// EventEmitter 类型
interface EventEmitterLike<T> {
  on(event: string, handler: (data: T) => void): void;
  off(event: string, handler: (data: T) => void): void;
}

// ============================================================================
// 流构建器 (Fluent API)
// ============================================================================

export class Stream<T> {
  private source: AsyncIterable<T>;

  constructor(source: AsyncIterable<T>) {
    this.source = source;
  }

  static from<T>(items: T[]): Stream<T> {
    return new Stream(fromArray(items));
  }

  static range(start: number, end: number, step = 1): Stream<number> {
    return new Stream(fromRange(start, end, step));
  }

  static interval(ms: number): Stream<number> {
    return new Stream(interval(ms));
  }

  map<R>(fn: (value: T, index: number) => R): Stream<R> {
    return new Stream(map(fn)(this.source));
  }

  filter(predicate: (value: T, index: number) => boolean): Stream<T> {
    return new Stream(filter(predicate)(this.source));
  }

  take(count: number): Stream<T> {
    return new Stream(take(count)(this.source));
  }

  skip(count: number): Stream<T> {
    return new Stream(skip(count)(this.source));
  }

  reduce<R>(fn: (acc: R, value: T, index: number) => R, initial: R): Stream<R> {
    return new Stream(reduce(fn, initial)(this.source));
  }

  flatMap<R>(fn: (value: T) => AsyncIterable<R>): Stream<R> {
    return new Stream(flatMap(fn)(this.source));
  }

  debounce(ms: number): Stream<T> {
    return new Stream(debounce(ms)(this.source));
  }

  throttle(ms: number): Stream<T> {
    return new Stream(throttle(ms)(this.source));
  }

  retry(count: number): Stream<T> {
    return new Stream(retry(count)(this.source));
  }

  withBackpressure(config?: StreamConfig): Stream<T> {
    return new Stream(withBackpressure(this.source, config));
  }

  buffer(count: number): Stream<T[]> {
    return new Stream(buffer(count)(this.source));
  }

  async forEach(fn: (value: T) => void | Promise<void>): Promise<void> {
    for await (const value of this.source) {
      await fn(value);
    }
  }

  async toArray(): Promise<T[]> {
    const result: T[] = [];
    for await (const value of this.source) {
      result.push(value);
    }
    return result;
  }

  async first(): Promise<T | undefined> {
    for await (const value of this.source) {
      return value;
    }
    return undefined;
  }

  async collect(): Promise<T[]> {
    return this.toArray();
  }
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例 1: 基础流操作
 */
export async function example1() {
  const result = await Stream.from([1, 2, 3, 4, 5])
    .filter(x => x % 2 === 0)
    .map(x => x * 10)
    .take(2)
    .toArray();

  console.log('Example 1:', result); // [20, 40]
}

/**
 * 示例 2: 背压处理
 */
export async function example2() {
  const fastProducer = Stream.interval(10); // 每 10ms 产生一个值

  await fastProducer
    .withBackpressure({ bufferSize: 50 })
    .take(100)
    .forEach(async (value) => {
      await sleep(50); // 慢速消费 (每 50ms 处理一个)
      console.log(`Processed: ${value}`);
    });
}

/**
 * 示例 3: 操作符链
 */
export async function example3() {
  const result = await Stream.range(1, 100)
    .filter(x => x % 3 === 0)
    .map(x => x * x)
    .take(5)
    .reduce((acc, x) => acc + x, 0)
    .first();

  console.log('Example 3:', result); // 9 + 36 + 81 + 144 + 225 = 495
}

/**
 * 示例 4: 并发控制
 */
export async function example4() {
  const urls = ['url1', 'url2', 'url3', 'url4', 'url5'];

  await Stream.from(urls)
    .concatMap(async (url) => {
      console.log(`Fetching ${url}...`);
      await sleep(1000); // 模拟网络请求
      return { url, data: 'mock data' };
    }, 3) // 最多 3 个并发
    .forEach(result => console.log('Result:', result));
}

/**
 * 示例 5: 错误重试
 */
export async function example5() {
  let attempts = 0;

  const result = await Stream.from([1])
    .flatMap(async () => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary failure');
      return 'Success!';
    })
    .retry(3)
    .first();

  console.log('Example 5:', result); // Success!
}

// ============================================================================
// 导出
// ============================================================================

export {
  // 流创建
  fromArray,
  fromRange,
  fromEvent,
  fromPromise,
  empty,
  interval,

  // 操作符
  map,
  filter,
  take,
  skip,
  reduce,
  flatMap,
  merge,
  concat,
  debounce,
  throttle,
  retry,
  catchError,

  // 背压
  withBackpressure,
  buffer,
  window,
  concatMap,

  // 流构建器
  Stream,
};

// ============================================================================
// KAEL Engineering Standard
// 类型安全 | 性能优化 | 背压控制
// ============================================================================
