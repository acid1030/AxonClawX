/**
 * 连接池工具使用示例
 * 
 * 本文件展示 pool-utils-skill.ts 的实际使用场景
 */

import { ConnectionPool, createPool, createPoolWithValidation } from './pool-utils-skill';

// ==================== 示例 1: 数据库连接池 ====================

interface DBConnection {
  query(sql: string, params?: any[]): Promise<any[]>;
  ping(): Promise<boolean>;
  close(): Promise<void>;
}

async function createDatabaseConnection(): Promise<DBConnection> {
  // 模拟数据库连接创建
  return {
    query: async (sql) => {
      console.log(`Executing: ${sql}`);
      return [{ id: 1, name: 'Mock User' }];
    },
    ping: async () => true,
    close: async () => console.log('Connection closed')
  };
}

const dbPool = createPoolWithValidation<DBConnection>(
  createDatabaseConnection,
  async (conn) => await conn.ping(),
  {
    min: 2,
    max: 10,
    idleTimeout: 300000,    // 5 分钟
    maxLifetime: 1800000,   // 30 分钟
    acquireTimeout: 10000   // 10 秒
  }
);

async function exampleDatabaseUsage() {
  console.log('=== 数据库连接池示例 ===\n');

  // 方式 A: 手动管理连接
  console.log('方式 A: 手动管理');
  const conn = await dbPool.acquire();
  try {
    console.log(`获取连接：${conn.id}`);
    console.log(`使用次数：${conn.useCount}`);
    const results = await conn.resource.query('SELECT * FROM users');
    console.log('查询结果:', results);
  } finally {
    await dbPool.release(conn);
    console.log('连接已释放\n');
  }

  // 方式 B: 自动管理 (推荐)
  console.log('方式 B: 自动管理');
  const results = await dbPool.use(async (conn) => {
    console.log(`获取连接：${conn.id}`);
    return await conn.resource.query('SELECT * FROM products');
  });
  console.log('查询结果:', results);

  // 查看池状态
  console.log('\n池统计信息:', dbPool.getStats());
}

// ==================== 示例 2: HTTP 客户端连接池 ====================

interface HttpClient {
  get(url: string): Promise<any>;
  post(url: string, data: any): Promise<any>;
}

async function exampleHTTPPool() {
  console.log('\n=== HTTP 客户端池示例 ===\n');

  const httpPool = createPool<HttpClient>(
    async () => {
      console.log('创建新的 HTTP 客户端');
      return {
        get: async (url) => {
          console.log(`GET ${url}`);
          return { status: 200, data: {} };
        },
        post: async (url, data) => {
          console.log(`POST ${url}`, data);
          return { status: 201, data: {} };
        }
      };
    },
    {
      min: 1,
      max: 5,
      eagerCreate: true,
      idleTimeout: 60000
    }
  );

  // 并发请求
  const requests = [
    httpPool.use(conn => conn.resource.get('/users')),
    httpPool.use(conn => conn.resource.get('/posts')),
    httpPool.use(conn => conn.resource.post('/comments', { text: 'Hello' }))
  ];

  const responses = await Promise.all(requests);
  console.log('完成所有请求:', responses.length);

  console.log('池统计信息:', httpPool.getStats());

  await httpPool.close();
}

// ==================== 示例 3: WebSocket 连接池 ====================

interface WSConnection {
  readyState: number;
  send(data: string): void;
  close(): void;
}

async function exampleWebSocketPool() {
  console.log('\n=== WebSocket 连接池示例 ===\n');

  const wsPool = new ConnectionPool<WSConnection>(
    {
      create: async () => {
        console.log('创建 WebSocket 连接');
        return {
          readyState: 1, // OPEN
          send: (data) => console.log('发送:', data),
          close: () => console.log('WebSocket 关闭')
        };
      },
      validate: async (ws) => {
        return ws.readyState === 1;
      },
      destroy: async (ws) => {
        console.log('销毁 WebSocket');
        ws.close();
      }
    },
    {
      min: 1,
      max: 3,
      idleTimeout: 120000
    }
  );

  // 发送消息
  await wsPool.use(async (conn) => {
    console.log(`使用连接：${conn.id}`);
    conn.resource.send(JSON.stringify({
      type: 'subscribe',
      channel: 'updates'
    }));
  });

  console.log('池统计信息:', wsPool.getStats());

  await wsPool.close();
}

// ==================== 示例 4: 并发控制演示 ====================

async function exampleConcurrencyControl() {
  console.log('\n=== 并发控制示例 ===\n');

  const pool = createPool(
    async () => {
      const id = Math.random().toString(36).substr(2, 5);
      console.log(`创建连接 ${id}`);
      return { id, name: `Worker-${id}` };
    },
    {
      min: 0,
      max: 3,  // 最多 3 个并发连接
      acquireTimeout: 5000
    }
  );

  // 启动 10 个并发任务
  const tasks = Array.from({ length: 10 }, async (_, i) => {
    console.log(`任务 ${i} 等待连接...`);
    
    await pool.use(async (conn) => {
      console.log(`任务 ${i} 获得连接 ${conn.id}`);
      // 模拟工作
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log(`任务 ${i} 完成`);
      return conn.id;
    });
  });

  await Promise.all(tasks);

  console.log('\n最终统计:', pool.getStats());

  await pool.close();
}

// ==================== 示例 5: 错误处理 ====================

async function exampleErrorHandling() {
  console.log('\n=== 错误处理示例 ===\n');

  let createCount = 0;
  const pool = createPoolWithValidation(
    async () => {
      createCount++;
      if (createCount <= 2) {
        throw new Error('模拟连接创建失败');
      }
      return { name: 'Stable Connection' };
    },
    async () => true,
    {
      min: 0,
      max: 5,
      acquireTimeout: 3000
    }
  );

  try {
    // 前两次会失败
    await pool.use(async (conn) => {
      console.log('成功获得连接');
    });
  } catch (err) {
    console.log('捕获错误:', (err as Error).message);
  }

  // 第三次应该成功
  await pool.use(async (conn) => {
    console.log('第三次尝试成功');
  });

  await pool.close();
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  try {
    await exampleDatabaseUsage();
    await exampleHTTPPool();
    await exampleWebSocketPool();
    await exampleConcurrencyControl();
    await exampleErrorHandling();

    console.log('\n✅ 所有示例执行完成!\n');
  } catch (err) {
    console.error('❌ 示例执行失败:', err);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

export { runAllExamples };
