/**
 * 聚合根技能 - Aggregate Root Skill
 * 
 * 功能:
 * 1. 聚合定义 - 定义 DDD 聚合根及其边界
 * 2. 实体管理 - 管理聚合内实体的生命周期
 * 3. 值对象 - 创建和验证不可变值对象
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/** 实体 ID 类型 */
export type EntityId = string | number;

/** 聚合根 ID 类型 */
export type AggregateId = string | number;

/** 基础实体接口 */
export interface Entity<TId extends EntityId = EntityId> {
  /** 实体 ID */
  id: TId;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后修改时间戳 */
  updatedAt: number;
  /** 版本号 (乐观锁) */
  version: number;
}

/** 聚合根接口 */
export interface AggregateRoot<TId extends AggregateId = AggregateId, TEntities extends Record<string, Entity<any>[]> = any> extends Entity<TId> {
  /** 聚合类型 */
  type: string;
  /** 聚合内实体集合 */
  entities: TEntities;
  /** 领域事件队列 */
  domainEvents: DomainEvent[];
  /** 标记为删除的实体 ID */
  markedForDeletion: Set<EntityId>;
}

/** 值对象接口 - 不可变 */
export interface ValueObject<TProps extends Record<string, any> = any> {
  /** 值对象属性 */
  readonly props: TProps;
  /** 比较另一个值对象是否相等 */
  equals(other: ValueObject<TProps>): boolean;
  /** 转换为普通对象 */
  toObject(): TProps;
  /** 转换为 JSON */
  toJSON(): any;
}

/** 领域事件接口 */
export interface DomainEvent {
  /** 事件 ID */
  eventId: string;
  /** 事件类型 */
  eventType: string;
  /** 聚合根 ID */
  aggregateId: AggregateId;
  /** 聚合根类型 */
  aggregateType: string;
  /** 事件发生时间戳 */
  timestamp: number;
  /** 事件版本 */
  version: number;
  /** 事件数据 */
  data: Record<string, any>;
  /** 元数据 */
  metadata?: Record<string, any>;
}

/** 实体配置 */
export interface EntityConfig {
  /** 是否自动设置时间戳 */
  autoTimestamp?: boolean;
  /** 是否启用版本控制 */
  versioning?: boolean;
  /** 自定义验证函数 */
  validate?: (entity: Entity) => void;
}

/** 聚合根配置 */
export interface AggregateRootConfig {
  /** 聚合类型 */
  type: string;
  /** 是否启用事件溯源 */
  eventSourcing?: boolean;
  /** 是否启用乐观锁 */
  optimisticLocking?: boolean;
  /** 自定义验证函数 */
  validate?: (aggregate: AggregateRoot) => void;
  /** 实体配置 */
  entityConfigs?: Record<string, EntityConfig>;
}

/** 值对象配置 */
export interface ValueObjectConfig<TProps extends Record<string, any> = any> {
  /** 属性验证函数 */
  validate?: (props: TProps) => void;
  /** 属性转换函数 */
  transform?: (props: TProps) => TProps;
  /** 自定义 equals 函数 */
  equals?: (a: TProps, b: TProps) => boolean;
}

/** 实体工厂函数 */
export type EntityFactory<T extends Entity = Entity> = (data: Partial<T>) => T;

/** 聚合根工厂函数 */
export type AggregateRootFactory<T extends AggregateRoot = AggregateRoot> = (data: Partial<T>) => T;

/** 值对象工厂函数 */
export type ValueObjectFactory<T extends ValueObject = ValueObject> = (props: any) => T;

// ============== 工具函数 ==============

/**
 * 生成唯一 ID
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * 深度比较两个对象
 */
export function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!keysB.includes(key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

/**
 * 冻结对象 (不可变)
 */
export function freezeObject<T extends object>(obj: T): Readonly<T> {
  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach((key) => {
    const value = (obj as any)[key];
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
      freezeObject(value);
    }
  });
  return obj as Readonly<T>;
}

// ============== 实体基类 ==============

/**
 * 实体基类 - 提供通用实体功能
 */
export abstract class BaseEntity<TId extends EntityId = EntityId> implements Entity<TId> {
  id: TId;
  createdAt: number;
  updatedAt: number;
  version: number;
  
  constructor(id: TId, config: EntityConfig = {}) {
    this.id = id;
    this.createdAt = config.autoTimestamp !== false ? Date.now() : 0;
    this.updatedAt = config.autoTimestamp !== false ? Date.now() : 0;
    this.version = config.versioning !== false ? 1 : 0;
    
    if (config.validate) {
      config.validate(this);
    }
  }
  
  /**
   * 更新实体时间戳和版本号
   */
  touch(): void {
    this.updatedAt = Date.now();
    this.version += 1;
  }
  
  /**
   * 检查实体是否为新实体
   */
  isNew(): boolean {
    return this.version <= 1;
  }
  
  /**
   * 转换为普通对象
   */
  toObject(): Entity<TId> {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
    };
  }
}

// ============== 值对象基类 ==============

/**
 * 值对象基类 - 提供不可变值对象功能
 */
export abstract class BaseValueObject<TProps extends Record<string, any> = any> implements ValueObject<TProps> {
  readonly props: TProps;
  
  constructor(props: TProps, config: ValueObjectConfig<TProps> = {}) {
    // 验证
    if (config.validate) {
      config.validate(props);
    }
    
    // 转换
    if (config.transform) {
      props = config.transform(props);
    }
    
    // 冻结
    this.props = freezeObject({ ...props });
  }
  
  /**
   * 比较另一个值对象是否相等
   */
  equals(other: ValueObject<TProps>): boolean {
    if (!other) return false;
    return deepEqual(this.props, other.props);
  }
  
  /**
   * 转换为普通对象
   */
  toObject(): TProps {
    return { ...this.props };
  }
  
  /**
   * 转换为 JSON
   */
  toJSON(): any {
    return this.toObject();
  }
  
  /**
   * 获取属性值
   */
  get<K extends keyof TProps>(key: K): TProps[K] {
    return this.props[key];
  }
}

// ============== 聚合根基类 ==============

/**
 * 聚合根基类 - 提供 DDD 聚合根核心功能
 */
export abstract class BaseAggregateRoot<
  TId extends AggregateId = AggregateId,
  TEntities extends Record<string, Entity<any>[]> = any
> extends BaseEntity<TId> implements AggregateRoot<TId, TEntities> {
  type: string;
  entities: TEntities;
  domainEvents: DomainEvent[];
  markedForDeletion: Set<EntityId>;
  
  constructor(id: TId, config: AggregateRootConfig) {
    super(id, { autoTimestamp: true, versioning: config.optimisticLocking !== false });
    
    this.type = config.type;
    this.entities = {} as TEntities;
    this.domainEvents = [];
    this.markedForDeletion = new Set();
    
    if (config.validate) {
      config.validate(this);
    }
  }
  
  /**
   * 添加领域事件
   */
  protected addDomainEvent(eventType: string, data: Record<string, any>, metadata?: Record<string, any>): void {
    const event: DomainEvent = {
      eventId: generateId('evt'),
      eventType,
      aggregateId: this.id,
      aggregateType: this.type,
      timestamp: Date.now(),
      version: this.version,
      data,
      metadata,
    };
    this.domainEvents.push(event);
  }
  
  /**
   * 获取并清除领域事件
   */
  getDomainEvents(): DomainEvent[] {
    const events = [...this.domainEvents];
    this.domainEvents = [];
    return events;
  }
  
  /**
   * 清除领域事件
   */
  clearDomainEvents(): void {
    this.domainEvents = [];
  }
  
  /**
   * 添加实体到聚合
   */
  addEntity<TKey extends keyof TEntities>(key: TKey, entity: Entity): void {
    if (!this.entities[key]) {
      this.entities[key] = [] as any;
    }
    (this.entities[key] as Entity[]).push(entity);
    this.touch();
    
    this.addDomainEvent('EntityAdded', {
      entityType: entity.constructor.name,
      entityId: entity.id,
      collectionKey: key as string,
    });
  }
  
  /**
   * 从聚合移除实体
   */
  removeEntity<TKey extends keyof TEntities>(key: TKey, entityId: EntityId): void {
    const collection = this.entities[key] as Entity[] | undefined;
    if (!collection) return;
    
    const index = collection.findIndex(e => e.id === entityId);
    if (index !== -1) {
      collection.splice(index, 1);
      this.touch();
      
      this.addDomainEvent('EntityRemoved', {
        entityId,
        collectionKey: key as string,
      });
    }
  }
  
  /**
   * 标记实体为删除 (延迟删除)
   */
  markEntityForDeletion(entityId: EntityId): void {
    this.markedForDeletion.add(entityId);
  }
  
  /**
   * 执行延迟删除
   */
  commitDeletions(): void {
    for (const key of Object.keys(this.entities)) {
      const collection = this.entities[key as keyof TEntities] as Entity[];
      if (collection) {
        const filtered = collection.filter(e => !this.markedForDeletion.has(e.id));
        const removedCount = collection.length - filtered.length;
        if (removedCount > 0) {
          (this.entities as any)[key] = filtered;
          this.addDomainEvent('EntitiesDeleted', {
            collectionKey: key,
            removedCount,
          });
        }
      }
    }
    this.markedForDeletion.clear();
    this.touch();
  }
  
  /**
   * 获取聚合内实体
   */
  getEntity<TKey extends keyof TEntities>(key: TKey, entityId: EntityId): Entity | undefined {
    const collection = this.entities[key] as Entity[] | undefined;
    return collection?.find(e => e.id === entityId);
  }
  
  /**
   * 获取聚合内所有实体
   */
  getEntities<TKey extends keyof TEntities>(key: TKey): Entity[] {
    return (this.entities[key] as Entity[]) || [];
  }
  
  /**
   * 验证聚合一致性
   */
  validate(): void {
    // 子类实现具体验证逻辑
  }
  
  /**
   * 转换为普通对象
   */
  toObject(): AggregateRoot<TId, TEntities> {
    return {
      id: this.id,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      version: this.version,
      type: this.type,
      entities: this.entities,
      domainEvents: this.domainEvents,
      markedForDeletion: this.markedForDeletion,
    };
  }
}

// ============== 聚合根工厂 ==============

/**
 * 聚合根工厂 - 创建和管理聚合根实例
 */
export class AggregateFactory {
  private static instance: AggregateFactory;
  private factories: Map<string, AggregateRootFactory> = new Map();
  
  private constructor() {}
  
  static getInstance(): AggregateFactory {
    if (!AggregateFactory.instance) {
      AggregateFactory.instance = new AggregateFactory();
    }
    return AggregateFactory.instance;
  }
  
  /**
   * 注册聚合根工厂
   */
  register<T extends AggregateRoot>(type: string, factory: AggregateRootFactory<T>): void {
    this.factories.set(type, factory as AggregateRootFactory);
  }
  
  /**
   * 创建聚合根实例
   */
  create<T extends AggregateRoot>(type: string, data: Partial<T>): T {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for aggregate type: ${type}`);
    }
    return factory(data) as T;
  }
  
  /**
   * 注销聚合根工厂
   */
  unregister(type: string): void {
    this.factories.delete(type);
  }
  
  /**
   * 获取所有注册的聚合类型
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }
}

// ============== 值对象工厂 ==============

/**
 * 值对象工厂 - 创建和管理值对象实例
 */
export class ValueObjectFactory {
  private static instance: ValueObjectFactory;
  private factories: Map<string, ValueObjectFactory> = new Map();
  
  private constructor() {}
  
  static getInstance(): ValueObjectFactory {
    if (!ValueObjectFactory.instance) {
      ValueObjectFactory.instance = new ValueObjectFactory();
    }
    return ValueObjectFactory.instance;
  }
  
  /**
   * 注册值对象工厂
   */
  register<T extends ValueObject>(type: string, factory: ValueObjectFactory<T>): void {
    this.factories.set(type, factory as ValueObjectFactory);
  }
  
  /**
   * 创建值对象实例
   */
  create<T extends ValueObject>(type: string, props: any): T {
    const factory = this.factories.get(type);
    if (!factory) {
      throw new Error(`No factory registered for value object type: ${type}`);
    }
    return factory(props) as T;
  }
  
  /**
   * 注销值对象工厂
   */
  unregister(type: string): void {
    this.factories.delete(type);
  }
}

// ============== 示例：订单聚合根 ==============

/**
 * 订单项实体示例
 */
export class OrderItem extends BaseEntity<string> {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  
  constructor(id: string, data: { productId: string; productName: string; quantity: number; unitPrice: number }) {
    super(id);
    this.productId = data.productId;
    this.productName = data.productName;
    this.quantity = data.quantity;
    this.unitPrice = data.unitPrice;
  }
  
  getTotalPrice(): number {
    return this.quantity * this.unitPrice;
  }
}

/**
 * 地址值对象示例
 */
export class Address extends BaseValueObject<{
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}> {
  constructor(props: { street: string; city: string; state: string; zipCode: string; country: string }) {
    super(props, {
      validate: (props) => {
        if (!props.street.trim()) throw new Error('Street is required');
        if (!props.city.trim()) throw new Error('City is required');
        if (!props.zipCode.trim()) throw new Error('Zip code is required');
        if (!props.country.trim()) throw new Error('Country is required');
      },
    });
  }
  
  getFullAddress(): string {
    return `${this.props.street}, ${this.props.city}, ${this.props.state} ${this.props.zipCode}, ${this.props.country}`;
  }
}

/**
 * 订单聚合根示例
 */
export class OrderAggregate extends BaseAggregateRoot<string, { items: OrderItem[] }> {
  customerId: string;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: Address;
  totalAmount: number;
  
  constructor(id: string, data: { customerId: string; shippingAddress: Address }) {
    super(id, {
      type: 'Order',
      optimisticLocking: true,
      validate: (aggregate) => {
        if (!(aggregate as OrderAggregate).shippingAddress) {
          throw new Error('Shipping address is required');
        }
      },
    });
    
    this.customerId = data.customerId;
    this.shippingAddress = data.shippingAddress;
    this.status = 'pending';
    this.totalAmount = 0;
    
    this.addDomainEvent('OrderCreated', {
      customerId: this.customerId,
      status: this.status,
    });
  }
  
  addItem(productId: string, productName: string, quantity: number, unitPrice: number): void {
    const item = new OrderItem(generateId('item'), {
      productId,
      productName,
      quantity,
      unitPrice,
    });
    
    this.addEntity('items', item);
    this.recalculateTotal();
  }
  
  removeItem(itemId: string): void {
    this.removeEntity('items', itemId);
    this.recalculateTotal();
  }
  
  confirmOrder(): void {
    if (this.status !== 'pending') {
      throw new Error('Order can only be confirmed from pending status');
    }
    if (this.getEntities('items').length === 0) {
      throw new Error('Cannot confirm empty order');
    }
    
    this.status = 'confirmed';
    this.touch();
    
    this.addDomainEvent('OrderConfirmed', {
      orderId: this.id,
      totalAmount: this.totalAmount,
    });
  }
  
  cancelOrder(reason: string): void {
    if (['shipped', 'delivered'].includes(this.status)) {
      throw new Error('Cannot cancel order that has been shipped');
    }
    
    this.status = 'cancelled';
    this.touch();
    
    this.addDomainEvent('OrderCancelled', {
      orderId: this.id,
      reason,
    });
  }
  
  private recalculateTotal(): void {
    const items = this.getEntities('items');
    this.totalAmount = items.reduce((sum, item) => sum + (item as OrderItem).getTotalPrice(), 0);
  }
}

// ============== 导出 ==============

export {
  Entity,
  AggregateRoot,
  ValueObject,
  DomainEvent,
  EntityConfig,
  AggregateRootConfig,
  ValueObjectConfig,
  EntityFactory,
  AggregateRootFactory,
  ValueObjectFactory as VOFactory,
  StateMachineStats,
};
