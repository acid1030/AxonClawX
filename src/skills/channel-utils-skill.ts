/**
 * Go-style Channels for TypeScript
 * 
 * 功能:
 * 1. Channel 创建 - 支持有缓冲和无缓冲通道
 * 2. 发送/接收 - 阻塞式 send/recv
 * 3. Select 多路复用 - 多通道选择
 */

// ============== 类型定义 ==============

type ChannelStatus = 'open' | 'closed';

interface Channel<T> {
  buffer: T[];
  capacity: number;
  status: ChannelStatus;
  sendQueue: Array<{ value: T; resolve: () => void }>;
  recvQueue: Array<{ resolve: (value: T) => void }>;
}

interface SelectCase<T> {
  channel: Channel<T>;
  direction: 'send' | 'recv';
  value?: T;
  callback: () => void;
}

// ============== Channel 核心实现 ==============

/**
 * 创建通道
 * @param capacity 缓冲容量 (0 = 无缓冲)
 */
export function makeChannel<T>(capacity: number = 0): Channel<T> {
  return {
    buffer: [],
    capacity,
    status: 'open',
    sendQueue: [],
    recvQueue: [],
  };
}

/**
 * 发送数据到通道 (阻塞)
 */
export async function send<T>(channel: Channel<T>, value: T): Promise<void> {
  if (channel.status === 'closed') {
    throw new Error('cannot send to closed channel');
  }

  // 有等待的接收者 → 直接传递
  if (channel.recvQueue.length > 0) {
    const recv = channel.recvQueue.shift()!;
    recv.resolve(value);
    return;
  }

  // 有缓冲空间 → 放入缓冲
  if (channel.buffer.length < channel.capacity) {
    channel.buffer.push(value);
    return;
  }

  // 无缓冲或缓冲满 → 阻塞等待
  return new Promise<void>((resolve) => {
    channel.sendQueue.push({ value, resolve });
  });
}

/**
 * 非阻塞发送
 */
export function trySend<T>(channel: Channel<T>, value: T): boolean {
  if (channel.status === 'closed') {
    return false;
  }

  if (channel.recvQueue.length > 0) {
    const recv = channel.recvQueue.shift()!;
    recv.resolve(value);
    return true;
  }

  if (channel.buffer.length < channel.capacity) {
    channel.buffer.push(value);
    return true;
  }

  return false;
}

/**
 * 从通道接收数据 (阻塞)
 */
export async function recv<T>(channel: Channel<T>): Promise<T> {
  // 有等待的发送者 → 直接接收
  if (channel.sendQueue.length > 0) {
    const send = channel.sendQueue.shift()!;
    send.resolve();
    return send.value;
  }

  // 有缓冲数据 → 取出
  if (channel.buffer.length > 0) {
    return channel.buffer.shift()!;
  }

  // 通道关闭且无数据
  if (channel.status === 'closed') {
    throw new Error('channel closed');
  }

  // 无数据 → 阻塞等待
  return new Promise<T>((resolve, reject) => {
    channel.recvQueue.push({
      resolve,
    });
  });
}

/**
 * 非阻塞接收
 */
export function tryRecv<T>(channel: Channel<T>): { ok: boolean; value?: T } {
  if (channel.sendQueue.length > 0) {
    const send = channel.sendQueue.shift()!;
    send.resolve();
    return { ok: true, value: send.value };
  }

  if (channel.buffer.length > 0) {
    return { ok: true, value: channel.buffer.shift() };
  }

  return { ok: false };
}

/**
 * 关闭通道
 */
export function close<T>(channel: Channel<T>): void {
  channel.status = 'closed';
  
  // 清空等待的接收者 (抛出错误)
  while (channel.recvQueue.length > 0) {
    const recv = channel.recvQueue.shift()!;
    recv.resolve(undefined as any);
  }
}

/**
 * 检查通道是否关闭
 */
export function isClosed<T>(channel: Channel<T>): boolean {
  return channel.status === 'closed' || (channel.buffer.length === 0 && channel.sendQueue.length === 0);
}

// ============== Select 多路复用 ==============

interface SelectResult<T> {
  channel: Channel<T>;
  direction: 'send' | 'recv';
  value?: T;
}

/**
 * Select 多路复用 (类似 Go 的 select)
 * 随机选择一个就绪的 case 执行
 */
export async function select<T>(
  ...cases: SelectCase<T>[]
): Promise<SelectResult<T>> {
  // 检查是否有立即可执行的 case
  const readyCases: SelectCase<T>[] = [];

  for (const c of cases) {
    if (c.direction === 'send') {
      if (trySend(c.channel, c.value!)) {
        readyCases.push(c);
      }
    } else {
      const result = tryRecv(c.channel);
      if (result.ok) {
        readyCases.push(c);
        // 保存接收的值
        (c as any)._receivedValue = result.value;
      }
    }
  }

  if (readyCases.length > 0) {
    // 随机选择一个就绪的 case
    const selected = readyCases[Math.floor(Math.random() * readyCases.length)];
    selected.callback();
    
    return {
      channel: selected.channel,
      direction: selected.direction,
      value: (selected as any)._receivedValue,
    };
  }

  // 无就绪 case → 等待任意一个
  return new Promise<SelectResult<T>>((resolve) => {
    const handlers: Array<() => void> = [];

    const cleanup = () => {
      handlers.forEach((h) => h());
    };

    for (const c of cases) {
      const handler = () => {
        cleanup();
        c.callback();
        resolve({
          channel: c.channel,
          direction: c.direction,
          value: (c as any)._receivedValue,
        });
      };
      handlers.push(handler);

      if (c.direction === 'send') {
        c.channel.sendQueue.push({
          value: c.value!,
          resolve: () => {},
        });
      } else {
        c.channel.recvQueue.push({
          resolve: () => {},
        });
      }
    }
  });
}

/**
 * Select with timeout
 */
export async function selectWithTimeout<T>(
  timeoutMs: number,
  ...cases: SelectCase<T>[]
): Promise<SelectResult<T> | null> {
  const timeoutPromise = new Promise<SelectResult<T> | null>((resolve) => {
    setTimeout(() => resolve(null), timeoutMs);
  });

  const selectPromise = select(...cases);

  return Promise.race([timeoutPromise, selectPromise]);
}

// ============== 辅助工具 ==============

/**
 * 迭代通道 (类似 range channel)
 */
export async function* range<T>(channel: Channel<T>): AsyncGenerator<T> {
  while (true) {
    try {
      const value = await recv(channel);
      yield value;
    } catch {
      break;
    }
  }
}

/**
 * 批量发送
 */
export async function sendAll<T>(channel: Channel<T>, values: T[]): Promise<void> {
  for (const value of values) {
    await send(channel, value);
  }
}

/**
 * 批量接收
 */
export async function recvAll<T>(channel: Channel<T>, count: number): Promise<T[]> {
  const results: T[] = [];
  for (let i = 0; i < count; i++) {
    try {
      const value = await recv(channel);
      results.push(value);
    } catch {
      break;
    }
  }
  return results;
}

// ============== 使用示例 ==============

/**
 * 示例 1: 基础通道使用
 */
export async function example1_basic() {
  const ch = makeChannel<number>(3); // 缓冲容量 3

  // 发送
  await send(ch, 1);
  await send(ch, 2);
  await send(ch, 3);

  // 接收
  console.log(await recv(ch)); // 1
  console.log(await recv(ch)); // 2
  console.log(await recv(ch)); // 3
}

/**
 * 示例 2: 生产者 - 消费者模式
 */
export async function example2_producerConsumer() {
  const ch = makeChannel<string>();

  // 生产者
  const producer = async () => {
    for (let i = 0; i < 5; i++) {
      await send(ch, `message-${i}`);
      console.log(`Sent: message-${i}`);
    }
    close(ch);
  };

  // 消费者
  const consumer = async () => {
    for await (const msg of range(ch)) {
      console.log(`Received: ${msg}`);
    }
    console.log('Channel closed, consumer done');
  };

  await Promise.all([producer(), consumer()]);
}

/**
 * 示例 3: Select 多路复用
 */
export async function example3_select() {
  const ch1 = makeChannel<number>();
  const ch2 = makeChannel<number>();

  // 同时等待两个通道
  const result = await select(
    {
      channel: ch1,
      direction: 'recv',
      callback: () => console.log('Received from ch1'),
    },
    {
      channel: ch2,
      direction: 'recv',
      callback: () => console.log('Received from ch2'),
    }
  );

  console.log(`Selected: ${result.direction} from channel`);
}

/**
 * 示例 4: 带超时的 Select
 */
export async function example4_selectTimeout() {
  const ch = makeChannel<number>();

  const result = await selectWithTimeout(
    1000, // 1 秒超时
    {
      channel: ch,
      direction: 'recv',
      callback: () => {},
    }
  );

  if (result === null) {
    console.log('Timeout!');
  }
}

/**
 * 示例 5: 工作池模式
 */
export async function example5_workerPool() {
  const jobs = makeChannel<number>(10);
  const results = makeChannel<number>(10);

  // 创建 3 个工作者
  const workers = Array.from({ length: 3 }, (_, i) =>
    (async () => {
      console.log(`Worker ${i} started`);
      for await (const job of range(jobs)) {
        const result = job * 2; // 处理任务
        await send(results, result);
      }
      console.log(`Worker ${i} done`);
    })()
  );

  // 发送任务
  sendAll(jobs, [1, 2, 3, 4, 5]);
  close(jobs);

  // 等待所有工作者完成
  await Promise.all(workers);
  close(results);

  // 收集结果
  const allResults = await recvAll(results, 5);
  console.log('Results:', allResults);
}

// 导出所有公共 API
export const Channel = {
  make: makeChannel,
  send,
  recv,
  trySend,
  tryRecv,
  close,
  isClosed,
  select,
  selectWithTimeout,
  range,
  sendAll,
  recvAll,
};

export type { Channel, SelectCase, SelectResult };
