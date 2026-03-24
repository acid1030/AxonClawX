/**
 * 中介者模式使用示例 - Mediator Pattern Examples
 * 
 * 本文件展示如何使用 mediator-pattern-pro-skill.ts 中的组件
 * 
 * @author Axon
 * @version 1.0.0
 */

import {
  ConcreteMediator,
  BaseColleague,
  MessageType,
  MessagePriority,
  TopicFilter,
  PriorityFilter,
  LoggingHandler,
  createMessage,
  type Message,
  type Mediator
} from './mediator-pattern-pro-skill';

// ============== 示例 1: 基础聊天室 ==============

/**
 * 聊天室用户 - 具体同事类
 */
class ChatUser extends BaseColleague {
  private name: string;

  constructor(id: string, name: string) {
    super(id);
    this.name = name;
  }

  receive<T>(message: Message<T>): void {
    // 只处理聊天消息
    if (message.topic === 'chat') {
      console.log(`[${this.name}] 收到来自 ${message.senderId} 的消息:`, message.payload);
    }
  }

  sendMessage(content: string): void {
    this.broadcast('chat', {
      from: this.name,
      content,
      timestamp: Date.now()
    });
  }

  sendPrivateMessage(receiverId: string, content: string): void {
    this.sendTo(receiverId, {
      from: this.name,
      content,
      timestamp: Date.now()
    }, 'private');
  }
}

/**
 * 示例 1 运行函数
 */
export async function example1_chatRoom() {
  console.log('\n=== 示例 1: 基础聊天室 ===\n');

  // 创建中介者
  const mediator = new ConcreteMediator({
    enableLogging: true,
    enableHistory: true
  });

  // 创建用户
  const alice = new ChatUser('user_1', 'Alice');
  const bob = new ChatUser('user_2', 'Bob');
  const charlie = new ChatUser('user_3', 'Charlie');

  // 注册到中介者
  mediator.register(alice);
  mediator.register(bob);
  mediator.register(charlie);

  console.log(`已注册用户数：${mediator.getColleagueCount()}\n`);

  // Alice 发送广播消息
  alice.sendMessage('大家好！');

  // Bob 发送私聊给 Charlie
  bob.sendPrivateMessage('user_3', '嘿，Charlie，在吗？');

  // 查看消息历史
  const history = mediator.getMessageHistory(10);
  console.log(`\n消息历史 (${history.length} 条):`);
  history.forEach(msg => {
    console.log(`  - [${msg.type}] ${msg.topic}: ${JSON.stringify(msg.payload)}`);
  });

  // 清理
  mediator.clearHistory();
}

// ============== 示例 2: 请求 - 响应模式 ==============

/**
 * 客户端同事
 */
class ClientColleague extends BaseColleague {
  receive<T>(message: Message<T>): void {
    if (message.metadata?.isRequest) {
      // 处理收到的请求
      console.log(`[${this.id}] 收到请求:`, message.payload);
      
      // 发送响应
      this.sendResponse(message, {
        status: 'success',
        data: '处理完成',
        timestamp: Date.now()
      });
    }
  }

  async requestData(serverId: string, requestData: any): Promise<any> {
    console.log(`[${this.id}] 向 ${serverId} 发送请求...`);
    const response = await this.request(serverId, requestData);
    console.log(`[${this.id}] 收到响应:`, response);
    return response;
  }
}

/**
 * 服务器同事
 */
class ServerColleague extends BaseColleague {
  receive<T>(message: Message<T>): void {
    if (message.metadata?.isRequest) {
      // 处理请求
      console.log(`[${this.id}] 处理请求:`, message.payload);
      
      // 模拟处理延迟
      setTimeout(() => {
        this.sendResponse(message, {
          status: 'success',
          result: `已处理：${JSON.stringify(message.payload)}`,
          processedAt: Date.now()
        });
      }, 100);
    }
  }
}

/**
 * 示例 2 运行函数
 */
export async function example2_requestResponse() {
  console.log('\n=== 示例 2: 请求 - 响应模式 ===\n');

  const mediator = new ConcreteMediator({
    enableLogging: true,
    defaultRequestTimeout: 5000
  });

  const client = new ClientColleague('client_1');
  const server = new ServerColleague('server_1');

  mediator.register(client);
  mediator.register(server);

  // 客户端发送请求
  try {
    const response = await client.requestData('server_1', {
      action: 'query',
      params: { id: 123 }
    });
    console.log('最终响应:', response);
  } catch (error) {
    console.error('请求失败:', error);
  }
}

// ============== 示例 3: 消息过滤 ==============

/**
 * 示例 3 运行函数
 */
export async function example3_messageFiltering() {
  console.log('\n=== 示例 3: 消息过滤 ===\n');

  const mediator = new ConcreteMediator({
    enableLogging: true,
    enableHistory: true
  });

  // 添加主题过滤器 - 只允许 'important' 和 'alert' 主题
  mediator.addFilter(new TopicFilter(['important', 'alert']));

  // 添加优先级过滤器 - 只允许高优先级及以上
  mediator.addFilter(new PriorityFilter(MessagePriority.HIGH));

  // 创建日志处理器
  const loggingHandler = new LoggingHandler('[过滤器测试]');
  mediator.addHandler('important', loggingHandler);
  mediator.addHandler('alert', loggingHandler);

  // 创建测试用户
  const user = new ChatUser('filter_user', 'FilterUser');
  mediator.register(user);

  console.log('\n发送普通消息 (应被过滤):');
  user.broadcast('chat', { content: '普通消息' });

  console.log('\n发送重要消息 (低优先级，应被过滤):');
  user.send({
    type: MessageType.BROADCAST,
    receiverId: null,
    topic: 'important',
    payload: { content: '重要但低优先级' },
    priority: MessagePriority.LOW
  });

  console.log('\n发送高优先级重要消息 (应通过):');
  user.send({
    type: MessageType.BROADCAST,
    receiverId: null,
    topic: 'important',
    payload: { content: '高优先级重要消息' },
    priority: MessagePriority.HIGH
  });

  console.log('\n发送紧急警报 (应通过):');
  user.send({
    type: MessageType.BROADCAST,
    receiverId: null,
    topic: 'alert',
    payload: { content: '紧急警报！' },
    priority: MessagePriority.URGENT
  });

  console.log(`\n通过过滤的消息数：${mediator.getMessageHistory().length}`);
}

// ============== 示例 4: 事件总线 ==============

/**
 * 事件订阅者
 */
class EventSubscriber extends BaseColleague {
  private subscriptions: string[] = [];

  receive<T>(message: Message<T>): void {
    if (message.type === MessageType.EVENT) {
      console.log(`[${this.id}] 收到事件 [${message.topic}]:`, message.payload);
    }
  }

  subscribe(topic: string): void {
    this.subscriptions.push(topic);
    console.log(`[${this.id}] 订阅主题：${topic}`);
  }

  publish(topic: string, data: any): void {
    this.send({
      type: MessageType.EVENT,
      receiverId: null,
      topic,
      payload: data,
      priority: MessagePriority.NORMAL
    });
  }
}

/**
 * 示例 4 运行函数
 */
export async function example4_eventBus() {
  console.log('\n=== 示例 4: 事件总线 ===\n');

  const mediator = new ConcreteMediator({
    enableLogging: true
  });

  // 创建事件处理器
  mediator.addHandler('user.login', new LoggingHandler('[登录事件]'));
  mediator.addHandler('user.logout', new LoggingHandler('[登出事件]'));
  mediator.addHandler('system.error', new LoggingHandler('[系统错误]'));

  // 创建订阅者
  const subscriber1 = new EventSubscriber('subscriber_1');
  const subscriber2 = new EventSubscriber('subscriber_2');

  mediator.register(subscriber1);
  mediator.register(subscriber2);

  // 订阅不同主题
  subscriber1.subscribe('user.login');
  subscriber1.subscribe('user.logout');
  subscriber2.subscribe('system.error');

  // 发布事件
  console.log('\n发布事件:\n');
  subscriber1.publish('user.login', { userId: 'user_123', ip: '192.168.1.1' });
  subscriber1.publish('user.logout', { userId: 'user_123', duration: 3600 });
  subscriber2.publish('system.error', { code: 'ERR_500', message: '数据库连接失败' });
}

// ============== 示例 5: 微服务通信 ==============

/**
 * 微服务基类
 */
class Microservice extends BaseColleague {
  protected serviceName: string;

  constructor(id: string, serviceName: string) {
    super(id);
    this.serviceName = serviceName;
  }

  receive<T>(message: Message<T>): void {
    console.log(`[${this.serviceName}] 收到消息 [${message.topic}]:`, message.payload);
  }

  callService(serviceId: string, action: string, params: any): Promise<any> {
    return this.request(serviceId, { action, params });
  }
}

/**
 * 订单服务
 */
class OrderService extends Microservice {
  constructor(id: string) {
    super(id, 'OrderService');
  }

  receive<T>(message: Message<T>): void {
    if (message.metadata?.isRequest) {
      const { action, params } = message.payload as any;
      console.log(`[OrderService] 处理动作：${action}`);

      switch (action) {
        case 'createOrder':
          this.sendResponse(message, {
            orderId: 'ORD_' + Date.now(),
            status: 'created'
          });
          break;
        case 'getOrder':
          this.sendResponse(message, {
            orderId: params.orderId,
            status: 'completed',
            items: ['item1', 'item2']
          });
          break;
        default:
          this.sendErrorResponse(message, `未知动作：${action}`);
      }
    }
  }
}

/**
 * 支付服务
 */
class PaymentService extends Microservice {
  constructor(id: string) {
    super(id, 'PaymentService');
  }

  receive<T>(message: Message<T>): void {
    if (message.metadata?.isRequest) {
      const { action, params } = message.payload as any;
      console.log(`[PaymentService] 处理动作：${action}`);

      switch (action) {
        case 'processPayment':
          this.sendResponse(message, {
            transactionId: 'TXN_' + Date.now(),
            status: 'success',
            amount: params.amount
          });
          break;
        case 'refund':
          this.sendResponse(message, {
            refundId: 'REF_' + Date.now(),
            status: 'processed'
          });
          break;
        default:
          this.sendErrorResponse(message, `未知动作：${action}`);
      }
    }
  }
}

/**
 * 示例 5 运行函数
 */
export async function example5_microservices() {
  console.log('\n=== 示例 5: 微服务通信 ===\n');

  const mediator = new ConcreteMediator({
    enableLogging: true,
    defaultRequestTimeout: 10000
  });

  const orderService = new OrderService('svc_order');
  const paymentService = new PaymentService('svc_payment');

  mediator.register(orderService);
  mediator.register(paymentService);

  // 网关服务调用订单服务
  console.log('\n创建订单:');
  try {
    const orderResult = await orderService.callService('svc_order', 'createOrder', {
      userId: 'user_123',
      items: ['product_1', 'product_2']
    });
    console.log('订单结果:', orderResult);
  } catch (error) {
    console.error('订单失败:', error);
  }

  // 订单服务调用支付服务
  console.log('\n处理支付:');
  try {
    const paymentResult = await orderService.callService('svc_payment', 'processPayment', {
      orderId: 'ORD_123',
      amount: 99.99,
      currency: 'CNY'
    });
    console.log('支付结果:', paymentResult);
  } catch (error) {
    console.error('支付失败:', error);
  }
}

// ============== 示例 6: 自定义消息处理器 ==============

/**
 * 自定义处理器 - 消息统计
 */
class StatisticsHandler implements MessageHandler {
  private stats = {
    totalMessages: 0,
    messagesByTopic: new Map<string, number>(),
    messagesByType: new Map<string, number>(),
    messagesByPriority: new Map<string, number>()
  };

  handle(message: Message): void {
    this.stats.totalMessages++;
    
    // 按主题统计
    const topicCount = this.stats.messagesByTopic.get(message.topic) || 0;
    this.stats.messagesByTopic.set(message.topic, topicCount + 1);
    
    // 按类型统计
    const typeCount = this.stats.messagesByType.get(message.type) || 0;
    this.stats.messagesByType.set(message.type, typeCount + 1);
    
    // 按优先级统计
    const priorityCount = this.stats.messagesByPriority.get(MessagePriority[message.priority]) || 0;
    this.stats.messagesByPriority.set(MessagePriority[message.priority], priorityCount + 1);
  }

  getStatistics() {
    return {
      total: this.stats.totalMessages,
      byTopic: Object.fromEntries(this.stats.messagesByTopic),
      byType: Object.fromEntries(this.stats.messagesByType),
      byPriority: Object.fromEntries(this.stats.messagesByPriority)
    };
  }

  reset() {
    this.stats = {
      totalMessages: 0,
      messagesByTopic: new Map(),
      messagesByType: new Map(),
      messagesByPriority: new Map()
    };
  }
}

/**
 * 示例 6 运行函数
 */
export async function example6_customHandler() {
  console.log('\n=== 示例 6: 自定义消息处理器 ===\n');

  const mediator = new ConcreteMediator({
    enableLogging: false
  });

  // 添加统计处理器
  const statsHandler = new StatisticsHandler();
  mediator.addHandler('*', statsHandler);

  // 创建测试用户
  const user = new ChatUser('stats_user', 'StatsUser');
  mediator.register(user);

  // 发送各种消息
  user.broadcast('chat', { content: '消息 1' });
  user.broadcast('chat', { content: '消息 2' });
  user.broadcast('alert', { content: '警报' });
  user.send({
    type: MessageType.COMMAND,
    receiverId: null,
    topic: 'admin',
    payload: { cmd: 'restart' },
    priority: MessagePriority.URGENT
  });

  // 查看统计
  const stats = statsHandler.getStatistics();
  console.log('消息统计:', JSON.stringify(stats, null, 2));
}

// ============== 运行所有示例 ==============

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   中介者模式使用示例 - Axon            ║');
  console.log('╚════════════════════════════════════════╝\n');

  await example1_chatRoom();
  await example2_requestResponse();
  await example3_messageFiltering();
  await example4_eventBus();
  await example5_microservices();
  await example6_customHandler();

  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   所有示例运行完成！                   ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}

// 导出所有示例
export {
  example1_chatRoom,
  example2_requestResponse,
  example3_messageFiltering,
  example4_eventBus,
  example5_microservices,
  example6_customHandler,
  runAllExamples
};
