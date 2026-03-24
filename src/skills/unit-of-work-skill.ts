/**
 * 工作单元技能 - Unit of Work Skill - KAEL
 * 
 * 功能:
 * 1. 工作单元 - 跟踪业务事务中的所有变更
 * 2. 事务提交 - 原子性提交所有变更
 * 3. 事务回滚 - 失败时回滚到初始状态
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/** 实体 ID 类型 */
export type EntityId = string | number;

/** 变更类型枚举 */
export enum ChangeType {
  /** 新增 */
  CREATE = 'CREATE',
  /** 更新 */
  UPDATE = 'UPDATE',
  /** 删除 */
  DELETE = 'DELETE',
}

/** 变更追踪记录 */
export interface ChangeRecord<T extends object = any> {
  /** 变更类型 */
  type: ChangeType;
  /** 实体类型/表名 */
  entityType: string;
  /** 实体 ID */
  entityId: EntityId;
  /** 原始数据 (UPDATE/DELETE 时) */
  originalData?: T;
  /** 新数据 (CREATE/UPDATE 时) */
  newData?: T;
  /** 变更时间戳 */
  timestamp: number;
  /** 变更描述 (可选) */
  description?: string;
}

/** 工作单元状态 */
export enum UnitOfWorkState {
  /** 空闲 */
  IDLE = 'IDLE',
  /** 进行中 */
  IN_PROGRESS = 'IN_PROGRESS',
  /** 已提交 */
  COMMITTED = 'COMMITTED',
  /** 已回滚 */
  ROLLED_BACK = 'ROLLED_BACK',
}

/** 工作单元配置 */
export interface UnitOfWorkConfig {
  /** 工作单元名称 */
  name?: string;
  /** 是否启用变更追踪 */
  enableTracking?: boolean;
  /** 是否启用自动回滚 */
  autoRollback?: boolean;
  /** 提交前钩子 */
  beforeCommit?: (changes: ChangeRecord[]) => Promise<void> | void;
  /** 提交后钩子 */
  afterCommit?: (changes: ChangeRecord[]) => Promise<void> | void;
  /** 回滚前钩子 */
  beforeRollback?: (changes: ChangeRecord[]) => Promise<void> | void;
  /** 回滚后钩子 */
  afterRollback?: (changes: ChangeRecord[]) => Promise<void> | void;
  /** 变更验证函数 */
  validateChange?: (change: ChangeRecord) => boolean | string;
}

/** 工作单元统计信息 */
export interface UnitOfWorkStats {
  /** 新增数量 */
  createCount: number;
  /** 更新数量 */
  updateCount: number;
  /** 删除数量 */
  deleteCount: number;
  /** 总变更数 */
  totalCount: number;
}

/** 工作单元接口 */
export interface IUnitOfWork {
  /** 工作单元 ID */
  readonly id: string;
  /** 工作单元状态 */
  readonly state: UnitOfWorkState;
  /** 获取所有变更 */
  getChanges(): ChangeRecord[];
  /** 获取统计信息 */
  getStats(): UnitOfWorkStats;
  /** 注册新增 */
  registerNew<T extends object>(entityType: string, entityId: EntityId, data: T): void;
  /** 注册更新 */
  registerUpdate<T extends object>(entityType: string, entityId: EntityId, originalData: T, newData: T): void;
  /** 注册删除 */
  registerDelete<T extends object>(entityType: string, entityId: EntityId, originalData: T): void;
  /** 提交事务 */
  commit(): Promise<void>;
  /** 回滚事务 */
  rollback(): Promise<void>;
  /** 清除所有变更 */
  clear(): void;
}

// ============================================
// 工作单元实现类
// ============================================

/**
 * 工作单元类 - Unit of Work
 * 
 * 跟踪业务事务中的所有变更，支持原子性提交和回滚
 */
export class UnitOfWork implements IUnitOfWork {
  /** 工作单元 ID */
  readonly id: string;
  /** 工作单元状态 */
  private _state: UnitOfWorkState = UnitOfWorkState.IDLE;
  /** 变更追踪列表 */
  private changes: ChangeRecord[] = [];
  /** 变更快照 (用于回滚) */
  private snapshots: Map<string, ChangeRecord[]> = new Map();
  /** 配置 */
  private config: Required<UnitOfWorkConfig>;

  constructor(config: UnitOfWorkConfig = {}) {
    this.id = this.generateId();
    this.config = {
      name: config.name || `UnitOfWork_${this.id}`,
      enableTracking: config.enableTracking ?? true,
      autoRollback: config.autoRollback ?? true,
      beforeCommit: config.beforeCommit || (() => {}),
      afterCommit: config.afterCommit || (() => {}),
      beforeRollback: config.beforeRollback || (() => {}),
      afterRollback: config.afterRollback || (() => {}),
      validateChange: config.validateChange || (() => true),
    };
  }

  /** 生成唯一 ID */
  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}_${random}`;
  }

  /** 获取工作单元状态 */
  get state(): UnitOfWorkState {
    return this._state;
  }

  /** 获取所有变更 */
  getChanges(): ChangeRecord[] {
    return [...this.changes];
  }

  /** 获取统计信息 */
  getStats(): UnitOfWorkStats {
    const createCount = this.changes.filter(c => c.type === ChangeType.CREATE).length;
    const updateCount = this.changes.filter(c => c.type === ChangeType.UPDATE).length;
    const deleteCount = this.changes.filter(c => c.type === ChangeType.DELETE).length;
    
    return {
      createCount,
      updateCount,
      deleteCount,
      totalCount: this.changes.length,
    };
  }

  /**
   * 注册新增实体
   * 
   * @param entityType - 实体类型/表名
   * @param entityId - 实体 ID
   * @param data - 新数据
   */
  registerNew<T extends object>(entityType: string, entityId: EntityId, data: T): void {
    this.validateState('register');
    
    const change: ChangeRecord<T> = {
      type: ChangeType.CREATE,
      entityType,
      entityId,
      newData: data,
      timestamp: Date.now(),
    };

    const validation = this.config.validateChange(change);
    if (validation !== true) {
      throw new Error(`变更验证失败：${validation}`);
    }

    this.changes.push(change);
    this._state = UnitOfWorkState.IN_PROGRESS;
  }

  /**
   * 注册更新实体
   * 
   * @param entityType - 实体类型/表名
   * @param entityId - 实体 ID
   * @param originalData - 原始数据
   * @param newData - 新数据
   */
  registerUpdate<T extends object>(entityType: string, entityId: EntityId, originalData: T, newData: T): void {
    this.validateState('register');
    
    const change: ChangeRecord<T> = {
      type: ChangeType.UPDATE,
      entityType,
      entityId,
      originalData,
      newData,
      timestamp: Date.now(),
    };

    const validation = this.config.validateChange(change);
    if (validation !== true) {
      throw new Error(`变更验证失败：${validation}`);
    }

    this.changes.push(change);
    this._state = UnitOfWorkState.IN_PROGRESS;
  }

  /**
   * 注册删除实体
   * 
   * @param entityType - 实体类型/表名
   * @param entityId - 实体 ID
   * @param originalData - 原始数据
   */
  registerDelete<T extends object>(entityType: string, entityId: EntityId, originalData: T): void {
    this.validateState('register');
    
    const change: ChangeRecord<T> = {
      type: ChangeType.DELETE,
      entityType,
      entityId,
      originalData,
      timestamp: Date.now(),
    };

    const validation = this.config.validateChange(change);
    if (validation !== true) {
      throw new Error(`变更验证失败：${validation}`);
    }

    this.changes.push(change);
    this._state = UnitOfWorkState.IN_PROGRESS;
  }

  /**
   * 创建快照 (用于嵌套事务)
   */
  createSnapshot(): string {
    const snapshotId = this.generateId();
    this.snapshots.set(snapshotId, [...this.changes]);
    return snapshotId;
  }

  /**
   * 恢复到快照
   */
  restoreSnapshot(snapshotId: string): void {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`快照不存在：${snapshotId}`);
    }
    this.changes = [...snapshot];
  }

  /**
   * 提交事务
   * 
   * 原子性提交所有变更，如果任何变更失败则自动回滚
   */
  async commit(): Promise<void> {
    if (this._state !== UnitOfWorkState.IN_PROGRESS && this.changes.length === 0) {
      throw new Error('没有需要提交的变更');
    }

    try {
      // 执行提交前钩子
      await this.config.beforeCommit(this.changes);

      // 模拟提交过程 (实际使用时需要替换为真实的数据库操作)
      await this.executeCommit();

      // 执行提交后钩子
      await this.config.afterCommit(this.changes);

      this._state = UnitOfWorkState.COMMITTED;
    } catch (error) {
      // 自动回滚
      if (this.config.autoRollback) {
        await this.rollback();
      }
      throw error;
    }
  }

  /**
   * 执行提交 (子类可重写)
   */
  protected async executeCommit(): Promise<void> {
    // 默认实现：模拟提交延迟
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // 实际使用时，这里应该：
    // 1. 开启数据库事务
    // 2. 按顺序执行所有变更
    // 3. 提交数据库事务
    // 示例：
    // await database.transaction(async (tx) => {
    //   for (const change of this.changes) {
    //     await this.applyChange(tx, change);
    //   }
    // });
  }

  /**
   * 回滚事务
   * 
   * 撤销所有未提交的变更
   */
  async rollback(): Promise<void> {
    if (this._state === UnitOfWorkState.COMMITTED) {
      throw new Error('已提交的事务无法回滚');
    }

    try {
      // 执行回滚前钩子
      await this.config.beforeRollback(this.changes);

      // 模拟回滚过程
      await this.executeRollback();

      // 执行回滚后钩子
      await this.config.afterRollback(this.changes);

      this._state = UnitOfWorkState.ROLLED_BACK;
      this.changes = [];
    } catch (error) {
      // 回滚失败，强制清空
      this._state = UnitOfWorkState.ROLLED_BACK;
      this.changes = [];
      throw error;
    }
  }

  /**
   * 执行回滚 (子类可重写)
   */
  protected async executeRollback(): Promise<void> {
    // 默认实现：模拟回滚延迟
    await new Promise(resolve => setTimeout(resolve, 0));
    
    // 实际使用时，这里应该：
    // 1. 回滚数据库事务
    // 2. 清理缓存
    // 示例：
    // await database.rollback();
  }

  /**
   * 清除所有变更
   */
  clear(): void {
    this.changes = [];
    this.snapshots.clear();
    this._state = UnitOfWorkState.IDLE;
  }

  /** 验证状态 */
  private validateState(operation: string): void {
    if (this._state === UnitOfWorkState.COMMITTED) {
      throw new Error(`事务已提交，无法${operation}`);
    }
    if (this._state === UnitOfWorkState.ROLLED_BACK) {
      throw new Error(`事务已回滚，无法${operation}`);
    }
  }
}

// ============================================
// 工厂函数
// ============================================

/**
 * 创建工作单元实例
 * 
 * @param config - 配置选项
 * @returns 工作单元实例
 * 
 * @example
 * const uow = createUnitOfWork({
 *   name: 'UserUpdate',
 *   autoRollback: true
 * });
 */
export function createUnitOfWork(config: UnitOfWorkConfig = {}): UnitOfWork {
  return new UnitOfWork(config);
}

/**
 * 创建带事务装饰器的工作单元
 * 
 * 使用装饰器模式自动管理事务生命周期
 * 自动向被装饰函数注入 UnitOfWork 实例作为最后一个参数
 */
export function withTransaction<TArgs extends any[], TResult>(
  fn: (...args: [...TArgs, uow: UnitOfWork]) => Promise<TResult>,
  config: UnitOfWorkConfig = {}
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const uow = createUnitOfWork(config);
    
    try {
      // 调用原函数，注入 uow 作为额外参数
      const result = await fn(...args, uow);
      await uow.commit();
      return result;
    } catch (error) {
      await uow.rollback();
      throw error;
    }
  };
}

// ============================================
// 使用示例
// ============================================

/**
 * 示例 1: 基本使用
 */
export async function example1_BasicUsage() {
  const uow = createUnitOfWork({
    name: 'UserRegistration',
    enableTracking: true,
  });

  // 注册新用户
  uow.registerNew('users', 'user_001', {
    username: 'alice',
    email: 'alice@example.com',
    createdAt: Date.now(),
  });

  // 注册用户配置
  uow.registerNew('user_profiles', 'profile_001', {
    userId: 'user_001',
    displayName: 'Alice',
    avatar: 'default.png',
  });

  // 提交事务
  await uow.commit();

  console.log('事务提交成功:', uow.getStats());
}

/**
 * 示例 2: 自动回滚
 */
export async function example2_AutoRollback() {
  const uow = createUnitOfWork({
    name: 'OrderProcessing',
    autoRollback: true,
    beforeCommit: async (changes) => {
      console.log('准备提交变更:', changes.length);
    },
    afterCommit: async (changes) => {
      console.log('变更已提交:', changes.length);
    },
  });

  try {
    // 创建订单
    uow.registerNew('orders', 'order_001', {
      orderId: 'order_001',
      total: 100,
      status: 'pending',
    });

    // 扣减库存
    uow.registerUpdate('inventory', 'item_001', 
      { quantity: 10 }, 
      { quantity: 9 }
    );

    // 模拟失败
    throw new Error('库存不足');

    await uow.commit();
  } catch (error) {
    console.log('事务已自动回滚:', error);
    console.log('状态:', uow.state); // ROLLED_BACK
  }
}

/**
 * 示例 3: 使用事务装饰器
 */
export async function example3_TransactionDecorator() {
  // 定义业务函数
  const transferMoney = withTransaction(
    async (fromId: string, toId: string, amount: number, uow: UnitOfWork) => {
      // 扣款
      uow.registerUpdate('accounts', fromId,
        { balance: 1000 },
        { balance: 1000 - amount }
      );

      // 收款
      uow.registerUpdate('accounts', toId,
        { balance: 500 },
        { balance: 500 + amount }
      );

      // 记录交易日志
      uow.registerNew('transactions', `tx_${Date.now()}`, {
        fromId,
        toId,
        amount,
        timestamp: Date.now(),
      });
    },
    { name: 'MoneyTransfer' }
  );

  // 执行转账
  await transferMoney('account_001', 'account_002', 100);
}

/**
 * 示例 4: 变更验证
 */
export async function example4_ChangeValidation() {
  const uow = createUnitOfWork({
    name: 'ValidatedTransaction',
    validateChange: (change) => {
      // 验证规则：不允许删除重要数据
      if (change.type === ChangeType.DELETE && change.entityType === 'critical_data') {
        return '不允许删除关键数据';
      }
      
      // 验证规则：更新必须包含原始数据
      if (change.type === ChangeType.UPDATE && !change.originalData) {
        return '更新操作必须提供原始数据';
      }

      return true;
    },
  });

  try {
    uow.registerDelete('critical_data', 'data_001', { id: 'data_001' });
    await uow.commit();
  } catch (error) {
    console.log('验证失败:', error);
  }
}

/**
 * 示例 5: 嵌套事务 (使用快照)
 */
export async function example5_NestedTransaction() {
  const uow = createUnitOfWork({ name: 'NestedTransaction' });

  // 外层事务
  uow.registerNew('parent', 'p1', { name: 'Parent' });

  // 创建快照
  const snapshotId = uow.createSnapshot();

  try {
    // 内层事务
    uow.registerNew('child', 'c1', { name: 'Child', parentId: 'p1' });
    
    // 模拟内层失败
    throw new Error('子事务失败');
  } catch (error) {
    // 回滚到快照
    uow.restoreSnapshot(snapshotId);
    console.log('已回滚到快照，外层事务继续');
  }

  // 外层事务继续
  uow.registerNew('sibling', 's1', { name: 'Sibling', parentId: 'p1' });

  await uow.commit();
}

// ============================================
// 导出
// ============================================

export default UnitOfWork;
