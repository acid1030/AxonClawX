/**
 * Event Sourcing Lite Skill - KAEL
 * 
 * 轻量级事件溯源工具
 * 功能：事件追加、事件回放、快照管理
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ============== 类型定义 ==============

export interface LiteEvent {
  id: string;
  type: string;
  aggregateId: string;
  timestamp: number;
  data: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface Snapshot {
  aggregateId: string;
  version: number;
  state: Record<string, any>;
  timestamp: number;
}

export interface EventStoreLite {
  events: LiteEvent[];
  snapshots: Map<string, Snapshot>;
}

// ============== 事件存储实现 ==============

export class EventStoreLiteImpl {
  private events: LiteEvent[] = [];
  private snapshots: Map<string, Snapshot> = new Map();

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 1. 事件追加 - Append Event
   * 
   * @param type 事件类型
   * @param aggregateId 聚合根 ID
   * @param data 事件数据
   * @param metadata 可选元数据
   * @returns 创建的事件
   */
  append(
    type: string,
    aggregateId: string,
    data: Record<string, any>,
    metadata?: Record<string, any>
  ): LiteEvent {
    const event: LiteEvent = {
      id: this.generateId(),
      type,
      aggregateId,
      timestamp: Date.now(),
      data,
      metadata
    };

    this.events.push(event);
    return event;
  }

  /**
   * 2. 事件回放 - Replay Events
   * 
   * @param aggregateId 聚合根 ID
   * @param fromVersion 起始版本 (可选，从快照开始)
   * @returns 事件列表
   */
  replay(aggregateId: string, fromVersion: number = 0): LiteEvent[] {
    const snapshot = this.snapshots.get(aggregateId);
    const startVersion = snapshot?.version || fromVersion;

    return this.events
      .filter(e => e.aggregateId === aggregateId)
      .filter((e, index) => index >= startVersion);
  }

  /**
   * 获取所有事件 (可选)
   */
  getAllEvents(): LiteEvent[] {
    return [...this.events];
  }

  /**
   * 3. 快照管理 - Create Snapshot
   * 
   * @param aggregateId 聚合根 ID
   * @param state 当前状态
   * @param version 版本号
   * @returns 创建的快照
   */
  createSnapshot(
    aggregateId: string,
    state: Record<string, any>,
    version: number
  ): Snapshot {
    const snapshot: Snapshot = {
      aggregateId,
      version,
      state,
      timestamp: Date.now()
    };

    this.snapshots.set(aggregateId, snapshot);
    return snapshot;
  }

  /**
   * 获取快照
   */
  getSnapshot(aggregateId: string): Snapshot | undefined {
    return this.snapshots.get(aggregateId);
  }

  /**
   * 删除快照
   */
  deleteSnapshot(aggregateId: string): boolean {
    return this.snapshots.delete(aggregateId);
  }

  /**
   * 重建状态 (快照 + 事件回放)
   * 
   * @param aggregateId 聚合根 ID
   * @param reducer 状态归约函数
   * @param initialState 初始状态
   * @returns 重建后的状态
   */
  rebuildState<T extends Record<string, any>>(
    aggregateId: string,
    reducer: (state: T, event: LiteEvent) => T,
    initialState: T
  ): T {
    const snapshot = this.snapshots.get(aggregateId);
    let state = snapshot ? { ...snapshot.state } as T : initialState;

    const events = this.replay(aggregateId);
    return events.reduce(reducer, state);
  }

  /**
   * 导出存储数据
   */
  export(): EventStoreLite {
    return {
      events: [...this.events],
      snapshots: new Map(this.snapshots)
    };
  }

  /**
   * 导入存储数据
   */
  import(data: EventStoreLite): void {
    this.events = [...data.events];
    this.snapshots = new Map(data.snapshots);
  }

  /**
   * 清空存储
   */
  clear(): void {
    this.events = [];
    this.snapshots.clear();
  }

  /**
   * 获取事件数量
   */
  getEventCount(): number {
    return this.events.length;
  }

  /**
   * 获取快照数量
   */
  getSnapshotCount(): number {
    return this.snapshots.size;
  }
}

// ============== 便捷工厂函数 ==============

/**
 * 创建事件存储实例
 */
export function createEventStore(): EventStoreLiteImpl {
  return new EventStoreLiteImpl();
}

// ============== 使用示例 ==============

/*
// 示例 1: 基本事件追加
const store = createEventStore();

store.append('UserCreated', 'user-123', {
  username: 'john',
  email: 'john@example.com'
});

store.append('UserEmailUpdated', 'user-123', {
  newEmail: 'john.new@example.com'
});

// 示例 2: 事件回放
const events = store.replay('user-123');
console.log(`回放 ${events.length} 个事件`);

// 示例 3: 创建快照
store.createSnapshot('user-123', {
  id: 'user-123',
  username: 'john',
  email: 'john.new@example.com',
  version: 2
}, 2);

// 示例 4: 状态重建
const userReducer = (state: any, event: LiteEvent) => {
  switch (event.type) {
    case 'UserCreated':
      return { ...state, ...event.data };
    case 'UserEmailUpdated':
      return { ...state, email: event.data.newEmail };
    default:
      return state;
  }
};

const currentState = store.rebuildState(
  'user-123',
  userReducer,
  { id: 'user-123' }
);

console.log('当前状态:', currentState);

// 示例 5: 导出/导入
const exported = store.export();
const newStore = createEventStore();
newStore.import(exported);
*/

export default EventStoreLiteImpl;
