/**
 * ACE 事件总线使用示例
 * 
 * 此文件展示 event-utils-skill.ts 的完整用法
 */

import { ACEEventBus, createEventBus, globalEventBus } from './event-utils-skill';

// ==================== 示例 1: 基础用法 ====================

function basicUsage() {
  console.log('\n=== 示例 1: 基础用法 ===\n');

  const eventBus = createEventBus('demo-app');

  // 订阅事件
  const listenerId = eventBus.on('user.login', (data) => {
    console.log('🎉 用户登录:', data);
  });

  // 触发事件
  eventBus.emit('user.login', { userId: 123, username: 'axon' });

  // 取消订阅
  eventBus.off('user.login', listenerId);

  // 再次触发 (不会被处理)
  eventBus.emit('user.login', { userId: 456, username: 'kael' });
}

// ==================== 示例 2: 一次性监听 ====================

async function onceUsage() {
  console.log('\n=== 示例 2: 一次性监听 ===\n');

  const eventBus = createEventBus();

  // 只监听一次
  eventBus.once('system.shutdown', () => {
    console.log('⚠️  系统正在关闭...');
  });

  // 第一次触发 (会执行)
  await eventBus.emit('system.shutdown');

  // 第二次触发 (不会执行)
  await eventBus.emit('system.shutdown');
}

// ==================== 示例 3: 优先级控制 ====================

async function priorityUsage() {
  console.log('\n=== 示例 3: 优先级控制 ===\n');

  const eventBus = createEventBus();

  // 低优先级
  eventBus.on('order.created', () => {
    console.log('1️⃣  [低优先级] 记录日志');
  }, { priority: 1 });

  // 中优先级
  eventBus.on('order.created', () => {
    console.log('2️⃣  [中优先级] 发送通知');
  }, { priority: 5 });

  // 高优先级
  eventBus.on('order.created', () => {
    console.log('3️⃣  [高优先级] 验证库存');
  }, { priority: 10 });

  await eventBus.emit('order.created', { orderId: 'ORD-001' });
}

// ==================== 示例 4: 通配符匹配 ====================

async function wildcardUsage() {
  console.log('\n=== 示例 4: 通配符匹配 ===\n');

  const eventBus = createEventBus();

  // 单层通配符
  eventBus.on('user.*', (data, eventName) => {
    console.log(`📍 用户事件：${eventName}`, data);
  });

  // 多层通配符
  eventBus.on('**', (data, eventName) => {
    console.log(`🌍 全局事件：${eventName}`);
  });

  // 触发事件
  await eventBus.emit('user.login', { userId: 1 });
  await eventBus.emit('user.logout', { userId: 1 });
  await eventBus.emit('system.error', { message: 'Test' });
}

// ==================== 示例 5: 异步回调 ====================

async function asyncCallbackUsage() {
  console.log('\n=== 示例 5: 异步回调 ===\n');

  const eventBus = createEventBus();

  // 异步回调
  eventBus.on('data.process', async (data) => {
    console.log(`⏳ 开始处理数据：${data.id}`);
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log(`✅ 数据处理完成：${data.id}`);
  });

  await eventBus.emit('data.process', { id: 'DATA-001', value: 42 });
  await eventBus.emit('data.process', { id: 'DATA-002', value: 100 });
}

// ==================== 示例 6: 事件历史 ====================

function historyUsage() {
  console.log('\n=== 示例 6: 事件历史 ===\n');

  const eventBus = createEventBus();

  // 触发多个事件
  eventBus.emit('app.start', { version: '1.0.0' });
  eventBus.emit('user.login', { userId: 123 });
  eventBus.emit('data.load', { count: 50 });
  eventBus.emit('user.logout', { userId: 123 });

  // 查看所有事件历史
  const allHistory = eventBus.getHistory();
  console.log('📜 所有事件历史:', allHistory.length);

  // 查看特定事件历史
  const userHistory = eventBus.getHistory('user.login', 5);
  console.log('📜 用户登录历史:', userHistory);
}

// ==================== 示例 7: 监听器管理 ====================

function listenerManagement() {
  console.log('\n=== 示例 7: 监听器管理 ===\n');

  const eventBus = createEventBus();

  // 添加多个监听器
  eventBus.on('test.event', () => console.log('Listener 1'));
  eventBus.on('test.event', () => console.log('Listener 2'));
  eventBus.on('test.event', () => console.log('Listener 3'));

  // 查看监听器数量
  console.log('📊 监听器数量:', eventBus.listenerCount('test.event'));

  // 查看所有事件
  console.log('📋 事件列表:', eventBus.eventNames());

  // 移除所有监听器
  const removed = eventBus.removeAllListeners('test.event');
  console.log(`❌ 移除了 ${removed} 个监听器`);
  console.log('📊 剩余监听器数量:', eventBus.listenerCount('test.event'));
}

// ==================== 示例 8: 全局事件总线 ====================

async function globalEventBusUsage() {
  console.log('\n=== 示例 8: 全局事件总线 ===\n');

  // 在不同模块中使用同一个全局事件总线
  globalEventBus.on('global.message', (data) => {
    console.log('🌐 模块 A 收到消息:', data);
  });

  globalEventBus.on('global.message', (data) => {
    console.log('🌐 模块 B 收到消息:', data);
  });

  // 从任何地方触发
  await globalEventBus.emit('global.message', { content: 'Hello, World!' });
}

// ==================== 示例 9: 错误处理 ====================

async function errorHandlingUsage() {
  console.log('\n=== 示例 9: 错误处理 ===\n');

  const eventBus = createEventBus();

  // 监听器中抛出错误
  eventBus.on('risky.operation', () => {
    throw new Error('模拟错误');
  });

  eventBus.on('risky.operation', () => {
    console.log('✅ 这个监听器仍然会执行');
  });

  // 错误不会阻止其他监听器执行
  await eventBus.emit('risky.operation');
}

// ==================== 示例 10: 实际应用场景 ====================

async function realWorldScenario() {
  console.log('\n=== 示例 10: 实际应用场景 - 电商订单系统 ===\n');

  const eventBus = createEventBus('order-system');

  // 订单创建后的多个处理步骤
  eventBus.on('order.created', async (order) => {
    console.log(`📦 [库存] 锁定商品：${order.items.join(', ')}`);
  }, { priority: 10 });

  eventBus.on('order.created', async (order) => {
    console.log(`💰 [支付] 创建支付单：${order.orderId}`);
  }, { priority: 8 });

  eventBus.on('order.created', async (order) => {
    console.log(`📧 [通知] 发送确认邮件：${order.email}`);
  }, { priority: 5 });

  eventBus.on('order.created', async (order) => {
    console.log(`📊 [分析] 记录订单数据：${order.orderId}`);
  }, { priority: 1 });

  // 支付成功事件
  eventBus.once('order.paid', async (order) => {
    console.log(`✅ [系统] 订单 ${order.orderId} 已支付，开始配货`);
  });

  // 模拟订单流程
  const order = {
    orderId: 'ORD-20260313-001',
    items: ['iPhone 16', 'AirPods Pro'],
    email: 'customer@example.com',
    amount: 9999,
  };

  await eventBus.emit('order.created', order);
  await eventBus.emit('order.paid', order);
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     ACE 事件总线使用示例               ║');
  console.log('╚════════════════════════════════════════╝');

  basicUsage();
  await onceUsage();
  await priorityUsage();
  await wildcardUsage();
  await asyncCallbackUsage();
  historyUsage();
  listenerManagement();
  await globalEventBusUsage();
  await errorHandlingUsage();
  await realWorldScenario();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║     所有示例执行完成 ✅                ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出示例函数供测试使用
export {
  basicUsage,
  onceUsage,
  priorityUsage,
  wildcardUsage,
  asyncCallbackUsage,
  historyUsage,
  listenerManagement,
  globalEventBusUsage,
  errorHandlingUsage,
  realWorldScenario,
};
