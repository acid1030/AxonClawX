/**
 * Event Sourcing Skill - KAEL
 * 
 * 事件溯源核心实现
 * 功能：事件记录、状态重建、事件回放
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface Event {
  id: string;
  type: string;
  aggregateId: string;
  aggregateType: string;
  timestamp: number;
  version: number;
  data: Record<string, any>;
  metadata?: {
    userId?: string;
    correlationId?: string;
    causationId?: string;
    [key: string]: any;
  };
}

export interface EventStore {
  events: Event[];
  aggregateVersions: Map<string, number>;
}

export interface ProjectionState {
  aggregateId: string;
  aggregateType: string;
  version: number;
  state: Record<string, any>;
}

export interface EventSourcingConfig {
  storePath?: string;
  autoSave?: boolean;
  snapshotInterval?: number;
}

// ============== 事件存储 ==============

export class EventStoreImpl {
  private events: Event[] = [];
  private aggregateVersions: Map<string, number> = new Map();
  private config: EventSourcingConfig;

  constructor(config: EventSourcingConfig = {}) {
    this.config = {
      storePath: './event-store.json',
      autoSave: true,
      snapshotInterval: 100,
      ...config
    };
  }

  /**
   * 记录事件
   */
  append(event: Omit<Event, 'id' | 'timestamp' | 'version'>): Event {
    const aggregateKey = `${event.aggregateType}:${event.aggregateId}`;
    const currentVersion = this.aggregateVersions.get(aggregateKey) || 0;
    
    const newEvent: Event = {
      ...event,
      id: this.generateId(),
      timestamp: Date.now(),
      version: currentVersion + 1
    };

    this.events.push(newEvent);
    this.aggregateVersions.set(aggregateKey, newEvent.version);

    if (this.config.autoSave) {
      this.save();
    }

    return newEvent;
  }

  /**
   * 获取聚合根的所有事件
   */
  getEvents(aggregateType: string, aggregateId: string): Event[] {
    return this.events.filter(
      e => e.aggregateType === aggregateType && e.aggregateId === aggregateId
    );
  }

  /**
   * 获取所有事件
   */
  getAllEvents(): Event[] {
    return [...this.events];
  }

  /**
   * 获取聚合根的当前版本
   */
  getVersion(aggregateType: string, aggregateId: string): number {
    const key = `${aggregateType}:${aggregateId}`;
    return this.aggregateVersions.get(key) || 0;
  }

  /**
   * 保存事件存储到文件
   */
  save(): void {
    const fs = require('fs');
    const data = {
      events: this.events,
      aggregateVersions: Array.from(this.aggregateVersions.entries())
    };
    fs.writeFileSync(this.config.storePath!, JSON.stringify(data, null, 2));
  }

  /**
   * 从文件加载事件存储
   */
  load(): void {
    const fs = require('fs');
    const path = require('path');
    
    if (!fs.existsSync(this.config.storePath!)) {
      return;
    }

    const data = JSON.parse(fs.readFileSync(this.config.storePath!, 'utf-8'));
    this.events = data.events || [];
    this.aggregateVersions = new Map(data.aggregateVersions || []);
  }

  /**
   * 清空事件存储
   */
  clear(): void {
    this.events = [];
    this.aggregateVersions.clear();
    this.save();
  }

  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============== 状态重建 ==============

export class StateRebuilder {
  private eventStore: EventStoreImpl;

  constructor(eventStore: EventStoreImpl) {
    this.eventStore = eventStore;
  }

  /**
   * 重建聚合根状态
   * @param aggregateType 聚合根类型
   * @param aggregateId 聚合根 ID
   * @param handlers 事件处理器映射
   */
  rebuild<T = any>(
    aggregateType: string,
    aggregateId: string,
    handlers: Record<string, (state: any, event: Event) => any>
  ): ProjectionState {
    const events = this.eventStore.getEvents(aggregateType, aggregateId);
    
    let state: any = {
      id: aggregateId,
      type: aggregateType
    };
    let version = 0;

    for (const event of events) {
      const handler = handlers[event.type];
      if (handler) {
        state = handler(state, event);
        version = event.version;
      }
    }

    return {
      aggregateId,
      aggregateType,
      version,
      state
    };
  }

  /**
   * 重建到指定时间点的状态
   */
  rebuildToTimestamp<T = any>(
    aggregateType: string,
    aggregateId: string,
    timestamp: number,
    handlers: Record<string, (state: any, event: Event) => any>
  ): ProjectionState {
    const events = this.eventStore
      .getEvents(aggregateType, aggregateId)
      .filter(e => e.timestamp <= timestamp);
    
    let state: any = {
      id: aggregateId,
      type: aggregateType
    };
    let version = 0;

    for (const event of events) {
      const handler = handlers[event.type];
      if (handler) {
        state = handler(state, event);
        version = event.version;
      }
    }

    return {
      aggregateId,
      aggregateType,
      version,
      state
    };
  }

  /**
   * 重建到指定版本的状态
   */
  rebuildToVersion<T = any>(
    aggregateType: string,
    aggregateId: string,
    version: number,
    handlers: Record<string, (state: any, event: Event) => any>
  ): ProjectionState {
    const events = this.eventStore
      .getEvents(aggregateType, aggregateId)
      .filter(e => e.version <= version);
    
    let state: any = {
      id: aggregateId,
      type: aggregateType
    };
    let currentVersion = 0;

    for (const event of events) {
      const handler = handlers[event.type];
      if (handler) {
        state = handler(state, event);
        currentVersion = event.version;
      }
    }

    return {
      aggregateId,
      aggregateType,
      version: currentVersion,
      state
    };
  }
}

// ============== 事件回放 ==============

export class EventPlayer {
  private eventStore: EventStoreImpl;

  constructor(eventStore: EventStoreImpl) {
    this.eventStore = eventStore;
  }

  /**
   * 回放事件并执行回调
   */
  play(
    aggregateType: string,
    aggregateId: string,
    callback: (event: Event, index: number) => void
  ): void {
    const events = this.eventStore.getEvents(aggregateType, aggregateId);
    events.forEach(callback);
  }

  /**
   * 回放所有事件
   */
  playAll(callback: (event: Event) => void): void {
    const events = this.eventStore.getAllEvents();
    events.forEach(callback);
  }

  /**
   * 回放指定类型的事件
   */
  playByType(eventType: string, callback: (event: Event) => void): void {
    const events = this.eventStore.getAllEvents().filter(e => e.type === eventType);
    events.forEach(callback);
  }

  /**
   * 回放指定时间范围的事件
   */
  playByTimeRange(
    startTime: number,
    endTime: number,
    callback: (event: Event) => void
  ): void {
    const events = this.eventStore
      .getAllEvents()
      .filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
    events.forEach(callback);
  }

  /**
   * 流式回放事件
   */
  async playStream(
    aggregateType: string,
    aggregateId: string,
    handler: (event: Event) => Promise<void>,
    delayMs: number = 0
  ): Promise<void> {
    const events = this.eventStore.getEvents(aggregateType, aggregateId);
    
    for (const event of events) {
      await handler(event);
      if (delayMs > 0) {
        await this.sleep(delayMs);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============== 事件溯源管理器 ==============

export class EventSourcingManager {
  private store: EventStoreImpl;
  private rebuilder: StateRebuilder;
  private player: EventPlayer;

  constructor(config: EventSourcingConfig = {}) {
    this.store = new EventStoreImpl(config);
    this.rebuilder = new StateRebuilder(this.store);
    this.player = new EventPlayer(this.store);
  }

  /**
   * 初始化（加载已有事件）
   */
  init(): void {
    this.store.load();
  }

  /**
   * 记录事件
   */
  record(
    type: string,
    aggregateId: string,
    aggregateType: string,
    data: Record<string, any>,
    metadata?: Event['metadata']
  ): Event {
    return this.store.append({
      type,
      aggregateId,
      aggregateType,
      data,
      metadata
    });
  }

  /**
   * 重建状态
   */
  rebuildState<T = any>(
    aggregateType: string,
    aggregateId: string,
    handlers: Record<string, (state: any, event: Event) => any>
  ): ProjectionState {
    return this.rebuilder.rebuild(aggregateType, aggregateId, handlers);
  }

  /**
   * 回放事件
   */
  replay(
    aggregateType: string,
    aggregateId: string,
    callback: (event: Event, index: number) => void
  ): void {
    this.player.play(aggregateType, aggregateId, callback);
  }

  /**
   * 获取事件存储
   */
  getStore(): EventStoreImpl {
    return this.store;
  }

  /**
   * 获取状态重建器
   */
  getRebuilder(): StateRebuilder {
    return this.rebuilder;
  }

  /**
   * 获取事件回放器
   */
  getPlayer(): EventPlayer {
    return this.player;
  }
}

// ============== 使用示例 ==============

/**
 * 示例：任务管理系统的事件溯源
 */
export function example() {
  console.log('=== 事件溯源示例 ===\n');

  // 1. 创建事件溯源管理器
  const manager = new EventSourcingManager({
    storePath: './task-events.json',
    autoSave: true
  });
  manager.init();

  // 2. 定义事件处理器
  const taskHandlers = {
    'TaskCreated': (state: any, event: Event) => ({
      ...state,
      title: event.data.title,
      description: event.data.description,
      status: 'pending',
      createdAt: event.timestamp
    }),
    'TaskAssigned': (state: any, event: Event) => ({
      ...state,
      assignee: event.data.assignee,
      assignedAt: event.timestamp
    }),
    'TaskStarted': (state: any, event: Event) => ({
      ...state,
      status: 'in-progress',
      startedAt: event.timestamp
    }),
    'TaskCompleted': (state: any, event: Event) => ({
      ...state,
      status: 'completed',
      completedAt: event.timestamp
    }),
    'TaskUpdated': (state: any, event: Event) => ({
      ...state,
      ...event.data.changes
    })
  };

  // 3. 记录事件
  console.log('📝 记录事件...');
  
  manager.record(
    'TaskCreated',
    'task-001',
    'Task',
    { title: '实现事件溯源', description: '完成事件溯源工具开发' }
  );

  manager.record(
    'TaskAssigned',
    'task-001',
    'Task',
    { assignee: 'KAEL' }
  );

  manager.record(
    'TaskStarted',
    'task-001',
    'Task',
    {}
  );

  manager.record(
    'TaskCompleted',
    'task-001',
    'Task',
    {}
  );

  // 4. 重建状态
  console.log('\n🔄 重建状态...');
  const result = manager.rebuildState('Task', 'task-001', taskHandlers);
  console.log('当前状态:', JSON.stringify(result.state, null, 2));
  console.log('版本:', result.version);

  // 5. 回放事件
  console.log('\n▶️  回放事件...');
  manager.replay('Task', 'task-001', (event, index) => {
    console.log(`[${index + 1}] ${event.type} @ ${new Date(event.timestamp).toISOString()}`);
  });

  // 6. 重建到历史版本
  console.log('\n⏪ 重建到版本 2...');
  const historical = manager.getRebuilder().rebuildToVersion('Task', 'task-001', 2, taskHandlers);
  console.log('历史状态:', JSON.stringify(historical.state, null, 2));

  console.log('\n=== 示例完成 ===');
}

// 导出默认实例
export const eventSourcing = new EventSourcingManager();

// 如果直接运行此文件，执行示例
if (require.main === module) {
  example();
}
