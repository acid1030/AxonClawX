/**
 * KAEL 分布式链路追踪 - 使用示例
 * 
 * 展示如何在实际项目中使用 tracing-pattern-skill
 */

import {
  SpanBuilder,
  TraceContextManager,
  TraceCollector,
  Traced,
  createTracingMiddleware,
} from './tracing-pattern-skill';

// ============ 示例 1: 基础 Span 追踪 ============

function basicSpanExample() {
  // 创建 Span
  const span = new SpanBuilder('processPayment');
  
  // 添加标签
  span.setService('payment-service');
  span.tag('payment.amount', '99.99');
  span.tag('payment.currency', 'USD');
  span.tag('user.id', 'user_123');
  
  // 添加日志
  span.log('validation_started', { method: 'credit_card' });
  span.log('fraud_check_passed');
  
  // 业务逻辑
  console.log('Processing payment...');
  
  // 结束 Span
  span.end();
  
  console.log('Span completed:', span.getSpan());
}

// ============ 示例 2: 分布式链路传播 (HTTP) ============

// 服务端 A (API Gateway)
function serviceA_handleRequest() {
  // 创建根 Span
  const rootSpan = new SpanBuilder('POST /api/orders');
  rootSpan.setService('api-gateway');
  rootSpan.setHttpInfo('POST', '/api/orders');
  
  // 生成 traceparent 传递给下游服务
  const ctx = TraceContextManager.getContext()!;
  const traceparent = TraceContextManager.toTraceParent(ctx);
  
  // 调用下游服务
  callServiceB(traceparent);
  
  rootSpan.end();
}

// 服务端 B (Order Service)
function callServiceB(traceparent: string) {
  // 从请求头解析追踪上下文
  const parentCtx = TraceContextManager.parseTraceParent(traceparent);
  
  // 创建子 Span (自动关联父链路)
  const childSpan = new SpanBuilder('createOrder', parentCtx);
  childSpan.setService('order-service');
  childSpan.tag('order.items', '5');
  
  // 继续调用下游
  const newTraceparent = TraceContextManager.toTraceParent(
    TraceContextManager.getContext()!
  );
  callServiceC(newTraceparent);
  
  childSpan.end();
}

// 服务端 C (Inventory Service)
function callServiceC(traceparent: string) {
  const ctx = TraceContextManager.parseTraceParent(traceparent);
  const span = new SpanBuilder('checkInventory', ctx);
  span.setService('inventory-service');
  
  console.log('Checking inventory...');
  
  span.end();
}

// ============ 示例 3: 装饰器自动追踪 ============

class UserService {
  @Traced('getUserById')
  async getUserById(userId: string) {
    // 自动创建 Span，异常时自动标记错误
    console.log(`Fetching user ${userId}...`);
    
    // 模拟数据库查询
    await new Promise((resolve) => setTimeout(resolve, 100));
    
    return { id: userId, name: 'John Doe' };
  }
  
  @Traced('updateUser')
  async updateUser(userId: string, data: any) {
    console.log(`Updating user ${userId}...`);
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { success: true };
  }
  
  @Traced('deleteUser')
  async deleteUser(userId: string) {
    console.log(`Deleting user ${userId}...`);
    
    // 模拟错误
    throw new Error('User not found');
  }
}

// ============ 示例 4: Express 中间件集成 ============

import express from 'express';

function createExpressApp() {
  const app = express();
  
  // 添加追踪中间件
  app.use(createTracingMiddleware('web-api'));
  
  app.get('/api/users/:id', (req, res) => {
    // 当前 Span 已自动创建
    const ctx = TraceContextManager.getContext();
    console.log('Trace ID:', ctx?.traceId);
    
    res.json({ id: req.params.id, name: 'John' });
  });
  
  app.post('/api/orders', (req, res) => {
    // 自动记录 HTTP 信息
    res.json({ orderId: '12345' });
  });
  
  return app;
}

// ============ 示例 5: 追踪收集与分析 ============

function collectorExample() {
  const collector = new TraceCollector();
  
  // 模拟多个 Span
  const span1 = new SpanBuilder('request-received');
  span1.setService('gateway');
  span1.end();
  collector.addSpan(span1.getSpan());
  
  const span2 = new SpanBuilder('process-data', {
    traceId: span1.getSpan().traceId,
    spanId: 'abc123',
    flags: 1,
  });
  span2.setService('processor');
  span2.end();
  collector.addSpan(span2.getSpan());
  
  // 获取追踪数据
  const recentTraces = collector.getRecentTraces(10);
  console.log('Recent traces:', recentTraces.length);
  
  // 导出为 Jaeger 格式
  const jaegerData = collector.exportToJaeger();
  console.log('Jaeger export:', JSON.stringify(jaegerData, null, 2));
  
  // 发送到追踪后端
  // await fetch('http://jaeger:14268/api/traces', {
  //   method: 'POST',
  //   body: JSON.stringify(jaegerData),
  //   headers: { 'Content-Type': 'application/json' },
  // });
}

// ============ 示例 6: 错误处理与重试追踪 ============

async function resilientOperation() {
  const span = new SpanBuilder('external-api-call');
  span.setService('integration-service');
  span.tag('api.endpoint', 'https://api.example.com/data');
  
  let attempts = 0;
  const maxAttempts = 3;
  
  while (attempts < maxAttempts) {
    attempts++;
    span.log('retry_attempt', { attempt: attempts.toString() });
    
    try {
      // 模拟 API 调用
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          if (attempts < 2) {
            reject(new Error('Network timeout'));
          } else {
            resolve('success');
          }
        }, 100);
      });
      
      span.tag('retry.count', attempts.toString());
      span.end();
      break;
    } catch (error: any) {
      if (attempts === maxAttempts) {
        span.setError(error.message);
        span.tag('retry.exhausted', 'true');
        span.end();
        throw error;
      }
    }
  }
}

// ============ 示例 7: 数据库查询追踪 ============

class DatabaseService {
  @Traced('db.query')
  async query(sql: string, params?: any[]) {
    const span = new SpanBuilder('db.query');
    span.setService('database');
    span.tag('db.type', 'postgresql');
    span.tag('db.statement', sql.substring(0, 100)); // 截断避免过长
    
    const startTime = Date.now();
    
    try {
      // 模拟查询
      await new Promise((resolve) => setTimeout(resolve, 50));
      const result = { rows: [] };
      
      const duration = Date.now() - startTime;
      span.tag('db.duration_ms', duration.toString());
      span.end();
      
      return result;
    } catch (error: any) {
      span.setError(error.message);
      span.tag('db.duration_ms', (Date.now() - startTime).toString());
      span.end();
      throw error;
    }
  }
}

// ============ 示例 8: 消息队列追踪 ============

// 生产者
function publishMessage(queue: string, message: any) {
  const span = new SpanBuilder('message.publish');
  span.setService('message-producer');
  span.tag('queue.name', queue);
  span.tag('message.type', message.type);
  
  // 将追踪上下文注入消息头
  const ctx = TraceContextManager.getContext()!;
  const headers = {
    traceparent: TraceContextManager.toTraceParent(ctx),
  };
  
  // 发送消息 (伪代码)
  // messageQueue.send(queue, { ...message, headers });
  
  span.log('message_published', { messageId: 'msg_123' });
  span.end();
}

// 消费者
function consumeMessage(message: any) {
  // 从消息头提取追踪上下文
  const parentCtx = TraceContextManager.parseTraceParent(
    message.headers.traceparent
  );
  
  const span = new SpanBuilder('message.consume', parentCtx);
  span.setService('message-consumer');
  span.tag('queue.name', message.queue);
  
  try {
    // 处理消息
    console.log('Processing message:', message.id);
    span.log('message_processed');
    span.end();
  } catch (error: any) {
    span.setError(error.message);
    span.end();
    throw error;
  }
}

// ============ 示例 9: 批量操作追踪 ============

async function batchProcess(items: string[]) {
  const batchSpan = new SpanBuilder('batch.process');
  batchSpan.setService('batch-service');
  batchSpan.tag('batch.size', items.length.toString());
  
  const results = [];
  
  for (let i = 0; i < items.length; i++) {
    const itemSpan = new SpanBuilder('batch.item.process', {
      traceId: batchSpan.getSpan().traceId,
      spanId: batchSpan.getSpan().spanId,
      flags: 1,
    });
    
    itemSpan.tag('item.index', i.toString());
    itemSpan.tag('item.id', items[i]);
    
    try {
      // 处理单个项目
      await new Promise((resolve) => setTimeout(resolve, 10));
      results.push({ id: items[i], success: true });
      itemSpan.end();
    } catch (error: any) {
      itemSpan.setError(error.message);
      itemSpan.end();
      results.push({ id: items[i], success: false, error: error.message });
    }
  }
  
  batchSpan.end();
  return results;
}

// ============ 示例 10: GraphQL 追踪 ============

class GraphQLResolver {
  @Traced('graphql.resolve')
  async resolveQuery(parent: any, args: any, context: any, info: any) {
    const span = new SpanBuilder(`graphql.${info.fieldName}`);
    span.setService('graphql-server');
    span.tag('graphql.operation', info.operation?.operation || 'query');
    span.tag('graphql.field', info.fieldName);
    span.tag('graphql.parentType', info.parentType?.name);
    
    try {
      const result = await this.executeResolver(info.fieldName, args);
      span.end();
      return result;
    } catch (error: any) {
      span.setError(error.message);
      span.end();
      throw error;
    }
  }
  
  private async executeResolver(fieldName: string, args: any) {
    // 实际解析逻辑
    return { data: 'mock' };
  }
}

// ============ 运行示例 ============

async function runAllExamples() {
  console.log('=== KAEL 链路追踪示例 ===\n');
  
  console.log('1. 基础 Span 追踪');
  basicSpanExample();
  
  console.log('\n2. 分布式链路传播');
  serviceA_handleRequest();
  
  console.log('\n3. 装饰器自动追踪');
  const userService = new UserService();
  await userService.getUserById('user_123');
  
  console.log('\n4. 追踪收集');
  collectorExample();
  
  console.log('\n5. 错误处理与重试');
  try {
    await resilientOperation();
  } catch (error) {
    console.log('Caught error (expected)');
  }
  
  console.log('\n6. 批量操作追踪');
  await batchProcess(['item1', 'item2', 'item3']);
  
  console.log('\n=== 所有示例完成 ===');
}

// 导出示例函数供测试使用
export {
  basicSpanExample,
  serviceA_handleRequest,
  collectorExample,
  resilientOperation,
  batchProcess,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
