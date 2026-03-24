/**
 * 消息总线技能使用示例 - ACE
 * 
 * 展示消息总线的三大核心功能：
 * 1. 总线管理
 * 2. 消息路由
 * 3. 消息队列
 * 
 * @author ACE
 * @version 1.0.0
 * @since 2026-03-13
 */

import {
  MessageBus,
  MessageRouter,
  PriorityMessageQueue,
  MessagePriority,
  MessageType,
  MessageStatus,
  type Message,
  type MessageHandler,
  type MessageBusConfig
} from './message-bus-skill';

// ============================================
// 示例 1: 基础总线管理
// ============================================

/**
 * 演示如何创建和管理消息总线
 */
async function example1_BasicBusManagement(): Promise<void> {
  console.log('=== 示例 1: 基础总线管理 ===\n');

  // 1. 创建总线实例
  const config: MessageBusConfig = {
    id: 'main-bus',
    maxQueueSize: 500,
    messageTimeout: 30000,
    enableLogging: true,
    defaultPriority: MessagePriority.NORMAL
  };

  const bus = new MessageBus(config);

  // 2. 注册消息处理器
  const userHandler: MessageHandler = {
    id: 'user-processor',
    topic: 'user.*',
    active: true,
    handle: async (message) => {
      console.log(`[用户处理器] 处理消息: ${message.topic}`);
      console.log('  内容:', message.payload);
    }
  };

  const orderHandler: MessageHandler = {
    id: 'order-processor',
    topic: 'order.*',
    active: true,
    handle: async (message) => {
      console.log(`[订单处理器] 处理消息: ${message.topic}`);
      console.log('  内容:', message.payload);
    }
  };

  bus.registerHandler(userHandler);
  bus.registerHandler(orderHandler);

  // 3. 启动总线
  bus.start();
  console.log('✓ 总线已启动\n');

  // 4. 发布消息
  bus.publish({
    type: MessageType.EVENT,
    topic: 'user.created',
    payload: { userId: 'u123', name: '张三', email: 'zhangsan@example.com' },
    priority: MessagePriority.HIGH
  });

  bus.publish({
    type: MessageType.EVENT,
    topic: 'order.created',
    payload: { orderId: 'o456', amount: 299.99 },
    priority: MessagePriority.NORMAL
  });

  // 5. 广播消息
  bus.broadcast('system.announcement', {
    title: '系统维护通知',
    content: '系统将于今晚 23:00 进行维护',
    timestamp: Date.now()
  });

  // 6. 查看统计信息
  setTimeout(() => {
    const stats = bus.getStatistics();
    console.log('\n📊 总线统计:');
    console.log(`  总线 ID: ${stats.busId}`);
    console.log(`  总消息数：${stats.totalMessages}`);
    console.log(`  待处理：${stats.pendingMessages}`);
    console.log(`  处理中：${stats.processingMessages}`);
    console.log(`  已完成：${stats.completedMessages}`);
    console.log(`  失败：${stats.failedMessages}`);
    console.log(`  处理器数：${stats.handlerCount}`);
    if (stats.avgProcessingTime) {
      console.log(`  平均处理时间：${stats.avgProcessingTime.toFixed(2)}ms`);
    }

    // 7. 停止总线
    bus.stop();
    console.log('\n✓ 总线已停止\n');
  }, 100);
}

// ============================================
// 示例 2: 消息路由
// ============================================

/**
 * 演示如何使用消息路由器进行灵活的消息分发
 */
async function example2_MessageRouting(): Promise<void> {
  console.log('=== 示例 2: 消息路由 ===\n');

  const router = new MessageRouter();

  // 1. 添加路由规则
  router.addRule({
    id: 'rule-orders',
    topicPattern: 'order.*',
    handlerIds: ['order-processor', 'order-logger', 'inventory-service'],
    active: true,
    priority: 10
  });

  router.addRule({
    id: 'rule-payments',
    topicPattern: 'payment.*',
    handlerIds: ['payment-processor', 'accounting-service'],
    active: true,
    priority: 10
  });

  router.addRule({
    id: 'rule-notifications',
    topicPattern: 'notification.*',
    handlerIds: ['notification-sender'],
    active: true,
    priority: 5
  });

  // 2. 订阅特定主题
  router.subscribe('user.email.verification', 'email-service');
  router.subscribe('user.sms.verification', 'sms-service');
  router.subscribe('user.push.*', 'push-service');

  // 3. 路由消息
  console.log('路由测试结果:');
  
  const orderTargets = router.route('order.created');
  console.log(`  order.created → [${orderTargets.join(', ')}]`);

  const paymentTargets = router.route('payment.completed');
  console.log(`  payment.completed → [${paymentTargets.join(', ')}]`);

  const emailTargets = router.route('user.email.verification');
  console.log(`  user.email.verification → [${emailTargets.join(', ')}]`);

  const pushTargets = router.route('user.push.notification');
  console.log(`  user.push.notification → [${pushTargets.join(', ')}]`);

  // 4. 查看路由规则
  console.log('\n当前路由规则:');
  router.getRules().forEach(rule => {
    console.log(`  - ${rule.id}: ${rule.topicPattern} → [${rule.handlerIds.join(', ')}] (优先级：${rule.priority})`);
  });

  // 5. 取消订阅
  router.unsubscribe('user.sms.verification', 'sms-service');
  console.log('\n✓ 取消订阅 user.sms.verification → sms-service');

  const smsTargetsAfter = router.route('user.sms.verification');
  console.log(`  当前路由：user.sms.verification → [${smsTargetsAfter.join(', ')}]`);
  console.log('');
}

// ============================================
// 示例 3: 优先级消息队列
// ============================================

/**
 * 演示如何使用优先级队列管理消息处理顺序
 */
async function example3_PriorityQueue(): Promise<void> {
  console.log('=== 示例 3: 优先级消息队列 ===\n');

  const queue = new PriorityMessageQueue(100);

  // 1. 添加不同优先级的消息
  const messages = [
    {
      id: 'msg-1',
      type: MessageType.NORMAL,
      topic: 'task.backup',
      payload: { task: '数据库备份' },
      priority: MessagePriority.LOW,
      status: MessageStatus.PENDING,
      createdAt: Date.now()
    },
    {
      id: 'msg-2',
      type: MessageType.PRIORITY,
      topic: 'alert.critical',
      payload: { alert: '服务器宕机！' },
      priority: MessagePriority.URGENT,
      status: MessageStatus.PENDING,
      createdAt: Date.now() + 1
    },
    {
      id: 'msg-3',
      type: MessageType.NORMAL,
      topic: 'report.daily',
      payload: { report: '日报生成' },
      priority: MessagePriority.NORMAL,
      status: MessageStatus.PENDING,
      createdAt: Date.now() + 2
    },
    {
      id: 'msg-4',
      type: MessageType.EVENT,
      topic: 'user.login',
      payload: { userId: 'u789' },
      priority: MessagePriority.HIGH,
      status: MessageStatus.PENDING,
      createdAt: Date.now() + 3
    },
    {
      id: 'msg-5',
      type: MessageType.NORMAL,
      topic: 'cache.cleanup',
      payload: { cache: '临时文件清理' },
      priority: MessagePriority.LOW,
      status: MessageStatus.PENDING,
      createdAt: Date.now() + 4
    }
  ];

  console.log('入队消息:');
  messages.forEach(msg => {
    queue.enqueue(msg as Message);
    const priorityName = MessagePriority[msg.priority];
    console.log(`  + ${msg.id} [${priorityName}] ${msg.topic}`);
  });

  console.log(`\n队列长度：${queue.size()}\n`);

  // 2. 按优先级出队
  console.log('出队顺序 (按优先级):');
  let msg;
  let count = 0;
  while ((msg = queue.dequeueNow()) !== null) {
    count++;
    const priorityName = MessagePriority[msg.priority];
    console.log(`  ${count}. ${msg.id} [${priorityName}] ${msg.topic}`);
  }

  // 3. 演示阻塞式消费
  console.log('\n--- 演示阻塞式消费 ---');
  
  const queue2 = new PriorityMessageQueue(100);
  
  // 启动消费者
  const consumerPromise = queue2.dequeue(5000).then(msg => {
    if (msg) {
      console.log(`消费者收到：${msg.id}`);
    } else {
      console.log('消费者：超时未收到消息');
    }
  });

  // 延迟生产消息
  setTimeout(() => {
    queue2.enqueue({
      id: 'delayed-msg',
      type: MessageType.NORMAL,
      topic: 'test.delayed',
      payload: { test: true },
      priority: MessagePriority.NORMAL,
      status: MessageStatus.PENDING,
      createdAt: Date.now()
    });
    console.log('生产者：消息已入队');
  }, 1000);

  await consumerPromise;
  console.log('');
}

// ============================================
// 示例 4: 请求 - 响应模式
// ============================================

/**
 * 演示如何使用请求 - 响应模式进行同步通信
 */
async function example4_RequestResponse(): Promise<void> {
  console.log('=== 示例 4: 请求 - 响应模式 ===\n');

  const bus = new MessageBus({
    id: 'request-bus',
    enableLogging: false
  });

  // 注册计算器服务
  bus.registerHandler({
    id: 'calculator-service',
    topic: 'calc.*',
    active: true,
    handle: async (message) => {
      const { operation, a, b } = message.payload;
      let result: number;

      switch (operation) {
        case 'add':
          result = a + b;
          break;
        case 'subtract':
          result = a - b;
          break;
        case 'multiply':
          result = a * b;
          break;
        case 'divide':
          result = a / b;
          break;
        default:
          throw new Error(`未知操作：${operation}`);
      }

      console.log(`[计算器] ${a} ${operation} ${b} = ${result}`);
      
      // 更新消息状态和结果
      message.payload = result;
      message.status = MessageStatus.COMPLETED;
    }
  });

  bus.start();

  // 发送计算请求
  console.log('发送计算请求:');
  
  try {
    const result1 = await bus.requestResponse<{ operation: string; a: number; b: number }, number>(
      'calc.add',
      { operation: 'add', a: 10, b: 5 },
      5000
    );
    console.log(`  10 + 5 = ${result1}`);

    const result2 = await bus.requestResponse<{ operation: string; a: number; b: number }, number>(
      'calc.multiply',
      { operation: 'multiply', a: 7, b: 8 },
      5000
    );
    console.log(`  7 × 8 = ${result2}`);

    const result3 = await bus.requestResponse<{ operation: string; a: number; b: number }, number>(
      'calc.divide',
      { operation: 'divide', a: 100, b: 4 },
      5000
    );
    console.log(`  100 ÷ 4 = ${result3}`);
  } catch (error) {
    console.log('请求失败:', error);
  }

  bus.stop();
  console.log('');
}

// ============================================
// 示例 5: 实际应用场景 - 电商订单处理
// ============================================

/**
 * 演示完整的电商订单处理流程
 */
async function example5_EcommerceOrderProcessing(): Promise<void> {
  console.log('=== 示例 5: 电商订单处理 ===\n');

  // 创建订单处理总线
  const orderBus = new MessageBus({
    id: 'order-processing-bus',
    maxQueueSize: 1000,
    messageTimeout: 60000,
    enableLogging: true,
    defaultPriority: MessagePriority.NORMAL
  });

  // 注册各个服务处理器
  const services = [
    {
      id: 'order-validator',
      topic: 'order.*',
      handle: async (message: Message) => {
        console.log(`[订单验证] 验证订单: ${message.payload.orderId}`);
        // 验证逻辑...
      }
    },
    {
      id: 'inventory-checker',
      topic: 'order.created',
      handle: async (message: Message) => {
        console.log(`[库存检查] 检查商品库存: ${message.payload.items?.length || 0} 件商品`);
        // 库存检查逻辑...
      }
    },
    {
      id: 'payment-processor',
      topic: 'order.payment',
      handle: async (message: Message) => {
        console.log(`[支付处理] 处理支付：¥${message.payload.amount}`);
        // 支付逻辑...
      }
    },
    {
      id: 'notification-sender',
      topic: 'order.*',
      handle: async (message: Message) => {
        console.log(`[通知发送] 发送订单通知：${message.topic}`);
        // 通知逻辑...
      }
    },
    {
      id: 'analytics-tracker',
      topic: 'order.*',
      handle: async (message: Message) => {
        console.log(`[数据分析] 记录订单事件：${message.topic}`);
        // 分析逻辑...
      }
    }
  ];

  services.forEach(service => {
    orderBus.registerHandler({
      ...service,
      active: true
    });
  });

  // 添加路由规则
  orderBus.addRoutingRule({
    id: 'rule-order-created',
    topicPattern: 'order.created',
    handlerIds: ['order-validator', 'inventory-checker', 'notification-sender', 'analytics-tracker'],
    active: true,
    priority: 10
  });

  orderBus.addRoutingRule({
    id: 'rule-order-payment',
    topicPattern: 'order.payment',
    handlerIds: ['payment-processor', 'notification-sender', 'analytics-tracker'],
    active: true,
    priority: 10
  });

  orderBus.start();
  console.log('✓ 订单处理总线已启动\n');

  // 模拟订单流程
  console.log('📦 模拟订单流程:\n');

  // 1. 创建订单
  orderBus.publish({
    type: MessageType.EVENT,
    topic: 'order.created',
    payload: {
      orderId: 'ORD-20260313-001',
      userId: 'U123456',
      items: [
        { productId: 'P001', name: 'iPhone 15', quantity: 1, price: 7999 },
        { productId: 'P002', name: 'AirPods Pro', quantity: 1, price: 1899 }
      ],
      total: 9898,
      createdAt: Date.now()
    },
    priority: MessagePriority.HIGH
  });

  // 2. 处理支付
  setTimeout(() => {
    orderBus.publish({
      type: MessageType.EVENT,
      topic: 'order.payment',
      payload: {
        orderId: 'ORD-20260313-001',
        amount: 9898,
        paymentMethod: 'alipay',
        transactionId: 'TXN-20260313-001'
      },
      priority: MessagePriority.URGENT
    });
  }, 200);

  // 3. 查看统计
  setTimeout(() => {
    const stats = orderBus.getStatistics();
    console.log('\n📊 订单处理统计:');
    console.log(`  总消息数：${stats.totalMessages}`);
    console.log(`  已完成：${stats.completedMessages}`);
    console.log(`  处理器数：${stats.handlerCount}`);

    orderBus.stop();
    console.log('\n✓ 订单处理完成\n');
  }, 500);
}

// ============================================
// 主函数 - 运行所有示例
// ============================================

/**
 * 运行所有示例
 */
async function runAllExamples(): Promise<void> {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   消息总线技能 - 完整使用示例          ║');
  console.log('╚════════════════════════════════════════╝\n');

  await example1_BasicBusManagement();
  await new Promise(resolve => setTimeout(resolve, 200));

  await example2_MessageRouting();
  await new Promise(resolve => setTimeout(resolve, 200));

  await example3_PriorityQueue();
  await new Promise(resolve => setTimeout(resolve, 200));

  await example4_RequestResponse();
  await new Promise(resolve => setTimeout(resolve, 200));

  await example5_EcommerceOrderProcessing();

  console.log('╔════════════════════════════════════════╗');
  console.log('║   所有示例执行完成！                   ║');
  console.log('╚════════════════════════════════════════╝');
}

// ============================================
// 导出
// ============================================

export {
  runAllExamples,
  example1_BasicBusManagement,
  example2_MessageRouting,
  example3_PriorityQueue,
  example4_RequestResponse,
  example5_EcommerceOrderProcessing
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
