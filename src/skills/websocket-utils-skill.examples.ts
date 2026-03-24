/**
 * WebSocket 工具技能使用示例
 * 
 * 本文件展示如何使用 websocket-utils-skill.ts 中的功能
 * 
 * @example
 * ```bash
 * # 运行示例 (确保 WebSocket 服务器已启动)
 * npx ts-node src/skills/websocket-utils-skill.examples.ts
 * ```
 */

import {
  WebSocketClient,
  createWebSocket,
  buildWebSocket,
  type WSConfig,
  type WSMessage,
} from './websocket-utils-skill';

// ==================== 示例 1: 基础连接 ====================

async function example1_basicConnection() {
  console.log('\n=== 示例 1: 基础连接 ===\n');

  const client = new WebSocketClient({
    url: 'ws://localhost:18792',
    autoReconnect: true,
    reconnectDelay: 3000,
  });

  // 监听连接事件
  client.on('connected', () => {
    console.log('✓ 已连接到服务器');
  });

  client.on('disconnected', ({ code, reason }) => {
    console.log(`✗ 连接断开 (code: ${code}, reason: ${reason})`);
  });

  client.on('error', (error) => {
    console.error('✗ 发生错误:', error.message);
  });

  // 连接
  try {
    await client.connect();
    console.log('连接成功!');
  } catch (error) {
    console.error('连接失败:', error);
  }

  // 保持连接一段时间后断开
  setTimeout(() => {
    client.disconnect();
    console.log('已断开连接');
  }, 5000);
}

// ==================== 示例 2: 消息发送与接收 ====================

async function example2_messaging() {
  console.log('\n=== 示例 2: 消息发送与接收 ===\n');

  const client = await createWebSocket('ws://localhost:18792', {
    heartbeatInterval: 30000,
  });

  // 监听所有消息
  client.on('message', (message: WSMessage) => {
    console.log('收到消息:', JSON.stringify(message, null, 2));
  });

  // 订阅特定频道
  client.subscribe(['task.update', 'agent.status']);

  console.log('当前订阅的频道:', client.getSubscriptions());

  // 发送自定义消息
  client.send({
    type: 'custom.event',
    data: {
      action: 'test',
      payload: { foo: 'bar' },
    },
  });

  // 取消订阅
  setTimeout(() => {
    client.unsubscribe('task.update');
    console.log('已取消订阅 task.update');
  }, 3000);

  // 5 秒后断开
  setTimeout(() => {
    client.disconnect();
  }, 5000);
}

// ==================== 示例 3: 心跳保活 ====================

async function example3_heartbeat() {
  console.log('\n=== 示例 3: 心跳保活 ===\n');

  const client = await createWebSocket('ws://localhost:18792', {
    heartbeatInterval: 10000, // 10 秒心跳
  });

  // 监听心跳
  client.on('heartbeat', () => {
    console.log('♥ 心跳正常');
  });

  // 监听状态变化
  client.on('stateChange', ({ from, to }) => {
    console.log(`状态变化：${from} → ${to}`);
  });

  // 监听重连事件
  client.on('reconnect', ({ attempt, delay }) => {
    console.log(`🔄 重连中 (尝试 ${attempt}, 延迟 ${delay}ms)`);
  });

  console.log('心跳已启动，每 10 秒发送一次 Ping');

  // 运行 30 秒
  setTimeout(() => {
    client.disconnect();
    console.log('示例结束');
  }, 30000);
}

// ==================== 示例 4: 自动重连 ====================

async function example4_autoReconnect() {
  console.log('\n=== 示例 4: 自动重连 ===\n');

  const client = new WebSocketClient({
    url: 'ws://localhost:18792',
    autoReconnect: true,
    reconnectDelay: 2000,
    reconnectBackoffMultiplier: 2, // 指数退避
    maxReconnectDelay: 30000,
    maxReconnectAttempts: 5,
  });

  client.on('connected', () => {
    console.log('✓ 连接成功');
  });

  client.on('disconnected', () => {
    console.log('✗ 连接断开');
  });

  client.on('reconnect', ({ attempt, delay }) => {
    console.log(`🔄 计划重连：尝试 #${attempt}, 延迟 ${delay}ms`);
  });

  client.on('stateChange', ({ from, to }) => {
    console.log(`状态：${from} → ${to}`);
  });

  try {
    await client.connect();
  } catch (error) {
    console.error('初始连接失败:', error);
  }

  // 模拟：5 秒后手动断开，触发重连
  setTimeout(() => {
    console.log('\n模拟网络中断...');
    (client as any).ws?.close();
  }, 5000);

  // 15 秒后完全断开
  setTimeout(() => {
    client.disconnect();
    console.log('示例结束');
  }, 15000);
}

// ==================== 示例 5: 事件驱动模式 ====================

async function example5_eventDriven() {
  console.log('\n=== 示例 5: 事件驱动模式 ===\n');

  const client = buildWebSocket('ws://localhost:18792', {
    heartbeatInterval: 30000,
  });

  // 使用 once 监听一次性事件
  client.once('connected', () => {
    console.log('✓ 首次连接成功');
  });

  // 使用 on 监听持续事件
  const messageUnsubscribe = client.on('message', (msg: WSMessage) => {
    console.log('消息:', msg.type);

    // 收到特定消息后取消监听
    if (msg.type === 'system.welcome') {
      messageUnsubscribe();
      console.log('已取消消息监听');
    }
  });

  // 连接
  await client.connect();

  // 订阅频道
  client.subscribe('system.notify');

  // 5 秒后清理所有监听器
  setTimeout(() => {
    client.off('message');
    client.disconnect();
    console.log('示例结束');
  }, 5000);
}

// ==================== 示例 6: 消息队列 ====================

async function example6_messageQueue() {
  console.log('\n=== 示例 6: 消息队列 ===\n');

  const client = new WebSocketClient({
    url: 'ws://localhost:18792',
    autoReconnect: true,
  });

  // 在连接前发送消息 (会被加入队列)
  console.log('发送消息 (连接前，将加入队列)...');
  client.send({ type: 'queued.message.1', data: { order: 1 } });
  client.send({ type: 'queued.message.2', data: { order: 2 } });
  client.send({ type: 'queued.message.3', data: { order: 3 } });

  client.on('connected', () => {
    console.log('✓ 连接成功，自动发送队列中的消息');
  });

  client.on('message', (msg: WSMessage) => {
    console.log('收到:', msg.type);
  });

  try {
    await client.connect();
  } catch (error) {
    console.error('连接失败:', error);
  }

  // 5 秒后断开
  setTimeout(() => {
    client.disconnect();
    console.log('示例结束');
  }, 5000);
}

// ==================== 示例 7: 完整工作流程 ====================

async function example7_fullWorkflow() {
  console.log('\n=== 示例 7: 完整工作流程 ===\n');

  const config: WSConfig = {
    url: 'ws://localhost:18792',
    autoReconnect: true,
    reconnectDelay: 3000,
    heartbeatInterval: 30000,
    connectionTimeout: 10000,
    maxReconnectAttempts: Infinity,
  };

  const client = await createWebSocket(config.url, config);

  // 设置完整的事件处理
  client.on('connected', () => {
    console.log('✅ 工作流程：已连接');
    // 连接后自动订阅
    client.subscribe([
      'task.update',
      'task.status',
      'agent.status',
      'agent.heartbeat',
      'system.notify',
    ]);
  });

  client.on('message', (msg: WSMessage) => {
    switch (msg.type) {
      case 'task.update':
        console.log(`📋 任务更新：${msg.data?.taskId}`);
        break;
      case 'agent.status':
        console.log(`🤖 Agent 状态：${msg.data?.agentId} = ${msg.data?.status}`);
        break;
      case 'system.notify':
        console.log(`📢 系统通知：${msg.data?.level} - ${msg.data?.message}`);
        break;
      default:
        console.log(`📨 消息：${msg.type}`);
    }
  });

  client.on('disconnected', () => {
    console.log('❌ 工作流程：连接断开');
  });

  client.on('error', (error) => {
    console.error('💥 错误:', error.message);
  });

  console.log('🚀 工作流程已启动，监听所有事件...');
  console.log('按 Ctrl+C 退出');

  // 优雅退出
  process.on('SIGINT', () => {
    console.log('\n👋 正在关闭...');
    client.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n👋 正在关闭...');
    client.disconnect();
    process.exit(0);
  });
}

// ==================== 运行示例 ====================

async function runExamples() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   WebSocket 工具技能使用示例               ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('\n请确保 WebSocket 服务器已启动：');
  console.log('  node dist/websocket/realtime-server.js\n');

  // 选择要运行的示例
  const exampleNumber = process.argv[2] || '7';

  const examples: Record<string, () => Promise<void>> = {
    '1': example1_basicConnection,
    '2': example2_messaging,
    '3': example3_heartbeat,
    '4': example4_autoReconnect,
    '5': example5_eventDriven,
    '6': example6_messageQueue,
    '7': example7_fullWorkflow,
  };

  const example = examples[exampleNumber];
  if (!example) {
    console.error(`无效的示例编号：${exampleNumber}`);
    console.log('可用示例：1-7');
    process.exit(1);
  }

  try {
    await example();
  } catch (error) {
    console.error('示例运行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runExamples().catch(console.error);
}

// 导出所有示例函数供测试使用
export {
  example1_basicConnection,
  example2_messaging,
  example3_heartbeat,
  example4_autoReconnect,
  example5_eventDriven,
  example6_messageQueue,
  example7_fullWorkflow,
};
