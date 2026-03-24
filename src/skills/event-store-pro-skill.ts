/**
 * Event Store Pro Skill - KAEL
 * 
 * 专业事件存储工具
 * 功能：事件追加、事件查询、事件回放
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

export interface EventRecord {
  id: string;
  type: string;
  payload: Record<string, any>;
  timestamp: number;
  metadata?: {
    source?: string;
    correlationId?: string;
    causationId?: string;
    version?: number;
  };
}

export interface EventQuery {
  type?: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
  offset?: number;
  filter?: (event: EventRecord) => boolean;
}

export interface EventStoreConfig {
  storagePath: string;
  maxEvents?: number;
  enableCompression?: boolean;
}

export interface ReplayOptions {
  startTime?: number;
  endTime?: number;
  types?: string[];
  onEvent?: (event: EventRecord) => void | Promise<void>;
  batchSize?: number;
  delayMs?: number;
}

// ==================== 事件存储类 ====================

export class EventStorePro {
  private events: EventRecord[] = [];
  private config: EventStoreConfig;
  private indexes: Map<string, number[]> = new Map();

  constructor(config: EventStoreConfig) {
    this.config = config;
    this.events = [];
    this.indexes = new Map();
  }

  // ==================== 1. 事件追加 ====================
  
  async append(
    type: string,
    payload: Record<string, any>,
    metadata?: EventRecord['metadata']
  ): Promise<EventRecord> {
    const event: EventRecord = {
      id: this.generateId(),
      type,
      payload,
      timestamp: Date.now(),
      metadata: {
        version: 1,
        ...metadata,
      },
    };

    this.events.push(event);
    this.updateIndexes(event);

    // 检查是否需要清理旧事件
    if (this.config.maxEvents && this.events.length > this.config.maxEvents) {
      await this.cleanup();
    }

    return event;
  }

  async appendBatch(events: Array<{
    type: string;
    payload: Record<string, any>;
    metadata?: EventRecord['metadata'];
  }>): Promise<EventRecord[]> {
    const results = await Promise.all(
      events.map(e => this.append(e.type, e.payload, e.metadata))
    );
    return results;
  }

  // ==================== 2. 事件查询 ====================

  query(query: EventQuery): EventRecord[] {
    let results = [...this.events];

    // 按类型过滤
    if (query.type) {
      results = results.filter(e => e.type === query.type);
    }

    // 按时间范围过滤
    if (query.startTime) {
      results = results.filter(e => e.timestamp >= query.startTime);
    }
    if (query.endTime) {
      results = results.filter(e => e.timestamp <= query.endTime);
    }

    // 自定义过滤器
    if (query.filter) {
      results = results.filter(query.filter);
    }

    // 排序 (按时间倒序)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // 分页
    const offset = query.offset || 0;
    const limit = query.limit || 100;
    results = results.slice(offset, offset + limit);

    return results;
  }

  queryById(id: string): EventRecord | null {
    return this.events.find(e => e.id === id) || null;
  }

  queryByType(type: string, limit: number = 100): EventRecord[] {
    return this.query({ type, limit });
  }

  queryByTimeRange(start: number, end: number, limit: number = 100): EventRecord[] {
    return this.query({ startTime: start, endTime: end, limit });
  }

  // ==================== 3. 事件回放 ====================

  async replay(options: ReplayOptions): Promise<EventRecord[]> {
    const { startTime, endTime, types, onEvent, batchSize = 100, delayMs = 0 } = options;

    let events = this.events.filter(e => {
      if (startTime && e.timestamp < startTime) return false;
      if (endTime && e.timestamp > endTime) return false;
      if (types && types.length > 0 && !types.includes(e.type)) return false;
      return true;
    });

    // 按时间正序排序
    events.sort((a, b) => a.timestamp - b.timestamp);

    const replayed: EventRecord[] = [];

    // 批量回放
    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize);
      
      for (const event of batch) {
        if (onEvent) {
          await onEvent(event);
        }
        replayed.push(event);
      }

      // 控制回放速度
      if (delayMs > 0 && i + batchSize < events.length) {
        await this.sleep(delayMs);
      }
    }

    return replayed;
  }

  async replayToSnapshot(
    snapshotTime: number,
    reducer: (state: any, event: EventRecord) => any,
    initialState: any = {}
  ): Promise<any> {
    let state = initialState;

    const events = this.events
      .filter(e => e.timestamp <= snapshotTime)
      .sort((a, b) => a.timestamp - b.timestamp);

    for (const event of events) {
      state = reducer(state, event);
    }

    return state;
  }

  // ==================== 工具方法 ====================

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateIndexes(event: EventRecord): void {
    // 按类型索引
    if (!this.indexes.has(event.type)) {
      this.indexes.set(event.type, []);
    }
    this.indexes.get(event.type)!.push(this.events.length - 1);
  }

  private async cleanup(): Promise<void> {
    if (!this.config.maxEvents) return;

    const toRemove = this.events.length - this.config.maxEvents;
    if (toRemove > 0) {
      this.events = this.events.slice(toRemove);
      this.rebuildIndexes();
    }
  }

  private rebuildIndexes(): void {
    this.indexes.clear();
    this.events.forEach((event, index) => {
      if (!this.indexes.has(event.type)) {
        this.indexes.set(event.type, []);
      }
      this.indexes.get(event.type)!.push(index);
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== 统计信息 ====================

  getStats(): {
    totalEvents: number;
    eventTypes: Map<string, number>;
    oldestEvent: EventRecord | null;
    newestEvent: EventRecord | null;
  } {
    const eventTypes = new Map<string, number>();
    
    this.events.forEach(event => {
      eventTypes.set(event.type, (eventTypes.get(event.type) || 0) + 1);
    });

    return {
      totalEvents: this.events.length,
      eventTypes,
      oldestEvent: this.events[0] || null,
      newestEvent: this.events[this.events.length - 1] || null,
    };
  }

  clear(): void {
    this.events = [];
    this.indexes.clear();
  }
}

// ==================== 使用示例 ====================

/**
 * 使用示例 1: 基础事件追加
 */
async function exampleAppend() {
  const store = new EventStorePro({
    storagePath: './events',
    maxEvents: 10000,
  });

  // 追加单个事件
  const event = await store.append('user.created', {
    userId: 'u_123',
    email: 'user@example.com',
    name: 'John Doe',
  });

  console.log('Event appended:', event.id);

  // 批量追加
  const events = await store.appendBatch([
    { type: 'user.updated', payload: { userId: 'u_123', name: 'John Updated' } },
    { type: 'user.logged_in', payload: { userId: 'u_123', ip: '192.168.1.1' } },
  ]);

  console.log('Batch appended:', events.length);
}

/**
 * 使用示例 2: 事件查询
 */
async function exampleQuery() {
  const store = new EventStorePro({ storagePath: './events' });

  // 按类型查询
  const userEvents = store.queryByType('user.created', 50);
  console.log('User created events:', userEvents.length);

  // 按时间范围查询
  const now = Date.now();
  const lastHour = now - 3600000;
  const recentEvents = store.queryByTimeRange(lastHour, now, 100);
  console.log('Recent events:', recentEvents.length);

  // 自定义查询
  const customEvents = store.query({
    type: 'user.updated',
    startTime: lastHour,
    limit: 20,
    filter: (event) => event.payload.name?.includes('Updated'),
  });
  console.log('Custom query results:', customEvents.length);

  // 按 ID 查询
  const event = store.queryById('some-event-id');
  if (event) {
    console.log('Found event:', event);
  }
}

/**
 * 使用示例 3: 事件回放
 */
async function exampleReplay() {
  const store = new EventStorePro({ storagePath: './events' });

  // 基础回放
  const allEvents = await store.replay({
    onEvent: (event) => {
      console.log('Replaying:', event.type, event.payload);
    },
  });
  console.log('Total replayed:', allEvents.length);

  // 按类型回放
  const userEvents = await store.replay({
    types: ['user.created', 'user.updated'],
    onEvent: (event) => {
      console.log('User event:', event);
    },
  });

  // 按时间范围回放
  const now = Date.now();
  const lastHour = now - 3600000;
  const recentEvents = await store.replay({
    startTime: lastHour,
    endTime: now,
    batchSize: 50,
    delayMs: 10, // 控制回放速度
    onEvent: (event) => {
      console.log('Recent event:', event.type);
    },
  });

  // 回放到快照 (Event Sourcing 模式)
  const snapshot = await store.replayToSnapshot(
    now,
    (state, event) => {
      switch (event.type) {
        case 'user.created':
          state.users[event.payload.userId] = event.payload;
          break;
        case 'user.updated':
          if (state.users[event.payload.userId]) {
            state.users[event.payload.userId] = {
              ...state.users[event.payload.userId],
              ...event.payload,
            };
          }
          break;
        case 'user.deleted':
          delete state.users[event.payload.userId];
          break;
      }
      return state;
    },
    { users: {} } // 初始状态
  );

  console.log('Snapshot state:', snapshot);
}

/**
 * 使用示例 4: 完整工作流
 */
async function exampleWorkflow() {
  const store = new EventStorePro({
    storagePath: './events',
    maxEvents: 50000,
    enableCompression: true,
  });

  // 1. 追加事件
  await store.append('order.created', {
    orderId: 'o_001',
    userId: 'u_123',
    items: [{ productId: 'p_1', quantity: 2 }],
    total: 99.99,
  });

  await store.append('order.payment_received', {
    orderId: 'o_001',
    amount: 99.99,
    method: 'credit_card',
  });

  await store.append('order.shipped', {
    orderId: 'o_001',
    trackingNumber: 'TRACK123',
    carrier: 'FedEx',
  });

  // 2. 查询订单事件
  const orderEvents = store.query({
    filter: (e) => e.payload.orderId === 'o_001',
  });
  console.log('Order events:', orderEvents.length);

  // 3. 回放订单状态
  const orderState = await store.replayToSnapshot(
    Date.now(),
    (state, event) => {
      if (event.payload.orderId !== 'o_001') return state;

      switch (event.type) {
        case 'order.created':
          return { ...state, status: 'created', ...event.payload };
        case 'order.payment_received':
          return { ...state, status: 'paid', payment: event.payload };
        case 'order.shipped':
          return { ...state, status: 'shipped', shipping: event.payload };
        case 'order.cancelled':
          return { ...state, status: 'cancelled' };
      }
      return state;
    },
    {}
  );

  console.log('Order state:', orderState);

  // 4. 获取统计信息
  const stats = store.getStats();
  console.log('Stats:', {
    total: stats.totalEvents,
    types: Array.from(stats.eventTypes.entries()),
  });
}

// ==================== 导出 ====================

export {
  EventStorePro,
  EventRecord,
  EventQuery,
  EventStoreConfig,
  ReplayOptions,
  exampleAppend,
  exampleQuery,
  exampleReplay,
  exampleWorkflow,
};
