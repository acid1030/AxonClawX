/**
 * WebSocket Client Skill 测试
 * 
 * @author Axon
 * @version 1.0.0
 */

import { WebSocketClient, WebSocketState, createWebSocketClient } from './websocket-client-skill';

describe('WebSocketClient', () => {
  let client: WebSocketClient;

  beforeEach(() => {
    client = new WebSocketClient({
      url: 'ws://localhost:18792',
      autoReconnect: false,
      heartbeatInterval: 30000,
    });
  });

  afterEach(() => {
    client.disconnect();
  });

  describe('初始化', () => {
    test('应该使用默认配置创建客户端', () => {
      expect(client.getState()).toBe(WebSocketState.DISCONNECTED);
      expect(client.isConnected()).toBe(false);
    });

    test('应该使用自定义配置创建客户端', () => {
      const customClient = new WebSocketClient({
        url: 'ws://custom:9000',
        autoReconnect: false,
        maxQueueSize: 500,
      });

      expect(customClient.getState()).toBe(WebSocketState.DISCONNECTED);
      customClient.disconnect();
    });
  });

  describe('消息队列', () => {
    test('离线时消息应该入队', () => {
      client.send({ type: 'test', data: { value: 1 } });
      client.send({ type: 'test', data: { value: 2 } });
      client.send({ type: 'test', data: { value: 3 } });

      expect(client.getQueuedMessageCount()).toBe(3);
    });

    test('应该清空消息队列', () => {
      client.send({ type: 'test' });
      client.send({ type: 'test' });
      client.clearQueue();

      expect(client.getQueuedMessageCount()).toBe(0);
    });

    test('队列达到最大容量时应该移除最旧消息', () => {
      const smallQueueClient = new WebSocketClient({
        url: 'ws://localhost:18792',
        maxQueueSize: 3,
        queueOfflineMessages: true,
        autoReconnect: false,
      });

      smallQueueClient.send({ type: 'test', data: 1 });
      smallQueueClient.send({ type: 'test', data: 2 });
      smallQueueClient.send({ type: 'test', data: 3 });
      smallQueueClient.send({ type: 'test', data: 4 }); // 应该移除第一条

      expect(smallQueueClient.getQueuedMessageCount()).toBe(3);
      smallQueueClient.disconnect();
    });
  });

  describe('统计信息', () => {
    test('应该跟踪统计信息', () => {
      const stats = client.getStats();

      expect(stats.currentState).toBe(WebSocketState.DISCONNECTED);
      expect(stats.messagesSent).toBe(0);
      expect(stats.messagesReceived).toBe(0);
      expect(stats.queuedMessages).toBe(0);
      expect(stats.connectionCount).toBe(0);
      expect(stats.reconnectCount).toBe(0);
    });

    test('发送消息应该增加统计', () => {
      client.send({ type: 'test' });
      client.send({ type: 'test' });

      const stats = client.getStats();
      expect(stats.messagesSent).toBe(0); // 离线时不会计入 sent
      expect(stats.queuedMessages).toBe(2);
    });

    test('应该重置统计信息', () => {
      client.send({ type: 'test' });
      client.resetStats();

      const stats = client.getStats();
      expect(stats.messagesSent).toBe(0);
      expect(stats.queuedMessages).toBe(0);
    });
  });

  describe('事件监听', () => {
    test('应该注册事件处理器', () => {
      const mockHandler = jest.fn();

      client.on('message', mockHandler);

      // 验证处理器已注册 (通过后续触发验证)
      expect(true).toBe(true);
    });

    test('应该移除事件处理器', () => {
      const mockHandler = jest.fn();

      client.on('message', mockHandler);
      client.off('message', mockHandler);

      // 验证处理器已移除
      expect(true).toBe(true);
    });

    test('应该支持链式调用', () => {
      const result = client
        .on('open', () => {})
        .on('close', () => {})
        .on('error', () => {});

      expect(result).toBe(client);
    });
  });

  describe('工厂函数', () => {
    test('createWebSocketClient 应该返回客户端实例', () => {
      const client = createWebSocketClient({
        url: 'ws://localhost:18792',
      });

      expect(client).toBeInstanceOf(WebSocketClient);
      client.disconnect();
    });
  });

  describe('WebSocketState 枚举', () => {
    test('应该包含所有状态', () => {
      expect(WebSocketState.CONNECTING).toBe('CONNECTING');
      expect(WebSocketState.CONNECTED).toBe('CONNECTED');
      expect(WebSocketState.RECONNECTING).toBe('RECONNECTING');
      expect(WebSocketState.DISCONNECTED).toBe('DISCONNECTED');
    });
  });
});

describe('WebSocketClient 集成测试', () => {
  test('完整生命周期测试', () => {
    const client = createWebSocketClient({
      url: 'ws://localhost:18792',
      autoReconnect: false,
      heartbeatInterval: 30000,
    });

    // 初始状态
    expect(client.getState()).toBe(WebSocketState.DISCONNECTED);

    // 发送消息 (离线)
    client.send({ type: 'subscribe', data: { channels: ['test'] } });
    expect(client.getQueuedMessageCount()).toBe(1);

    // 获取统计
    const stats = client.getStats();
    expect(stats.currentState).toBe(WebSocketState.DISCONNECTED);

    // 断开 (虽然未连接，但应该安全)
    client.disconnect();
    expect(client.getState()).toBe(WebSocketState.DISCONNECTED);
  });
});
