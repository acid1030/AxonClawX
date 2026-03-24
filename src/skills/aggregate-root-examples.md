# 聚合根技能使用示例

## 快速开始

### 1. 基础实体使用

```typescript
import { BaseEntity, generateId } from './aggregate-root-skill';

// 创建用户实体
class UserEntity extends BaseEntity<string> {
  username: string;
  email: string;
  age: number;
  
  constructor(username: string, email: string, age: number) {
    super(generateId('user'));
    this.username = username;
    this.email = email;
    this.age = age;
  }
  
  updateEmail(newEmail: string): void {
    this.email = newEmail;
    this.touch(); // 更新时间戳和版本号
  }
}

const user = new UserEntity('john_doe', 'john@example.com', 25);
console.log(user.id); // user_lqx8z9_a1b2c3
console.log(user.version); // 1

user.updateEmail('newemail@example.com');
console.log(user.version); // 2
console.log(user.updatedAt > user.createdAt); // true
```

### 2. 值对象使用

```typescript
import { BaseValueObject } from './aggregate-root-skill';

// 创建货币值对象
class Money extends BaseValueObject<{
  amount: number;
  currency: string;
}> {
  constructor(amount: number, currency: string = 'CNY') {
    super({ amount, currency }, {
      validate: (props) => {
        if (props.amount < 0) {
          throw new Error('Amount cannot be negative');
        }
        if (!['CNY', 'USD', 'EUR'].includes(props.currency)) {
          throw new Error('Unsupported currency');
        }
      },
    });
  }
  
  add(other: Money): Money {
    if (this.props.currency !== other.props.currency) {
      throw new Error('Cannot add different currencies');
    }
    return new Money(this.props.amount + other.props.amount, this.props.currency);
  }
  
  toString(): string {
    return `${this.props.amount.toFixed(2)} ${this.props.currency}`;
  }
}

const price1 = new Money(100, 'CNY');
const price2 = new Money(50, 'CNY');
const total = price1.add(price2);

console.log(total.toString()); // 150.00 CNY
console.log(price1.equals(price2)); // false

// 值对象不可变
console.log(Object.isFrozen(price1.props)); // true
```

### 3. 聚合根完整示例 - 订单系统

```typescript
import { 
  BaseAggregateRoot, 
  BaseEntity, 
  BaseValueObject,
  generateId 
} from './aggregate-root-skill';

// 订单项实体
class OrderItem extends BaseEntity<string> {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  
  constructor(id: string, data: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }) {
    super(id);
    this.productId = data.productId;
    this.productName = data.productName;
    this.quantity = data.quantity;
    this.unitPrice = data.unitPrice;
  }
  
  getTotalPrice(): number {
    return this.quantity * this.unitPrice;
  }
  
  updateQuantity(quantity: number): void {
    if (quantity <= 0) {
      throw new Error('Quantity must be positive');
    }
    this.quantity = quantity;
    this.touch();
  }
}

// 地址值对象
class Address extends BaseValueObject<{
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}> {
  constructor(props: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  }) {
    super(props, {
      validate: (props) => {
        if (!props.street.trim()) throw new Error('Street required');
        if (!props.city.trim()) throw new Error('City required');
        if (!props.zipCode.trim()) throw new Error('Zip code required');
      },
    });
  }
  
  getFullAddress(): string {
    return `${this.props.street}, ${this.props.city}, ${this.props.state} ${this.props.zipCode}, ${this.props.country}`;
  }
}

// 订单聚合根
class OrderAggregate extends BaseAggregateRoot<string, { items: OrderItem[] }> {
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
          throw new Error('Shipping address required');
        }
      },
    });
    
    this.customerId = data.customerId;
    this.shippingAddress = data.shippingAddress;
    this.status = 'pending';
    this.totalAmount = 0;
    
    // 触发领域事件
    this.addDomainEvent('OrderCreated', {
      customerId: this.customerId,
      timestamp: new Date().toISOString(),
    });
  }
  
  addItem(productId: string, productName: string, quantity: number, unitPrice: number): void {
    if (this.status !== 'pending') {
      throw new Error('Can only add items to pending order');
    }
    
    const item = new OrderItem(generateId('item'), {
      productId,
      productName,
      quantity,
      unitPrice,
    });
    
    this.addEntity('items', item);
    this.recalculateTotal();
  }
  
  updateItemQuantity(itemId: string, quantity: number): void {
    const item = this.getEntity('items', itemId) as OrderItem | undefined;
    if (!item) {
      throw new Error('Item not found');
    }
    
    item.updateQuantity(quantity);
    this.recalculateTotal();
  }
  
  removeItem(itemId: string): void {
    if (this.status !== 'pending') {
      throw new Error('Can only remove items from pending order');
    }
    
    this.removeEntity('items', itemId);
    this.recalculateTotal();
  }
  
  confirmOrder(): void {
    if (this.status !== 'pending') {
      throw new Error('Order can only be confirmed from pending status');
    }
    
    const items = this.getEntities('items');
    if (items.length === 0) {
      throw new Error('Cannot confirm empty order');
    }
    
    this.status = 'confirmed';
    this.touch();
    
    this.addDomainEvent('OrderConfirmed', {
      orderId: this.id,
      totalAmount: this.totalAmount,
      itemCount: items.length,
    });
  }
  
  shipOrder(): void {
    if (this.status !== 'confirmed') {
      throw new Error('Order must be confirmed before shipping');
    }
    
    this.status = 'shipped';
    this.touch();
    
    this.addDomainEvent('OrderShipped', {
      orderId: this.id,
      shippedAt: new Date().toISOString(),
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
    const items = this.getEntities('items') as OrderItem[];
    this.totalAmount = items.reduce((sum, item) => sum + item.getTotalPrice(), 0);
  }
}

// ============== 使用示例 ==============

// 1. 创建订单
const address = new Address({
  street: '123 Main St',
  city: 'Shanghai',
  state: 'SH',
  zipCode: '200000',
  country: 'China',
});

const order = new OrderAggregate(generateId('order'), {
  customerId: 'customer_123',
  shippingAddress: address,
});

console.log(order.status); // pending
console.log(order.totalAmount); // 0

// 2. 添加商品
order.addItem('prod_001', 'iPhone 15', 1, 7999);
order.addItem('prod_002', 'AirPods Pro', 2, 1899);

console.log(order.totalAmount); // 11797
console.log(order.getEntities('items').length); // 2

// 3. 更新商品数量
const items = order.getEntities('items');
order.updateItemQuantity(items[0].id, 2);
console.log(order.totalAmount); // 19796

// 4. 移除商品
order.removeItem(items[1].id);
console.log(order.totalAmount); // 15998

// 5. 确认订单
order.confirmOrder();
console.log(order.status); // confirmed

// 6. 发货
order.shipOrder();
console.log(order.status); // shipped

// 7. 获取领域事件
const events = order.getDomainEvents();
console.log(events.length); // 5
console.log(events.map(e => e.eventType));
// ['OrderCreated', 'EntityAdded', 'EntityAdded', 'OrderConfirmed', 'OrderShipped']

// 8. 尝试非法操作
try {
  order.addItem('prod_003', 'Case', 1, 99); // 已发货，不能添加
} catch (error) {
  console.error(error.message); // Can only add items to pending order
}
```

### 4. 聚合根工厂使用

```typescript
import { AggregateFactory, BaseAggregateRoot, generateId } from './aggregate-root-skill';

// 定义产品聚合根
class ProductAggregate extends BaseAggregateRoot<string, {}> {
  name: string;
  price: number;
  stock: number;
  
  constructor(id: string, data: { name: string; price: number; stock: number }) {
    super(id, { type: 'Product' });
    this.name = data.name;
    this.price = data.price;
    this.stock = data.stock;
  }
  
  updatePrice(price: number): void {
    if (price < 0) throw new Error('Price cannot be negative');
    this.price = price;
    this.touch();
  }
  
  updateStock(stock: number): void {
    if (stock < 0) throw new Error('Stock cannot be negative');
    this.stock = stock;
    this.touch();
  }
}

// 注册工厂
const factory = AggregateFactory.getInstance();

factory.register<ProductAggregate>('Product', (data) => {
  return new ProductAggregate(generateId('product'), data as any);
});

factory.register<OrderAggregate>('Order', (data) => {
  return new OrderAggregate(generateId('order'), data as any);
});

// 使用工厂创建聚合根
const product = factory.create<ProductAggregate>('Product', {
  name: 'MacBook Pro',
  price: 14999,
  stock: 100,
});

const order = factory.create<OrderAggregate>('Order', {
  customerId: 'cust_456',
  shippingAddress: address,
});

console.log(product.type); // Product
console.log(order.type); // Order

// 获取所有注册类型
console.log(factory.getRegisteredTypes()); // ['Product', 'Order']
```

### 5. 复杂值对象示例

```typescript
import { BaseValueObject } from './aggregate-root-skill';

// 邮箱值对象
class Email extends BaseValueObject<{
  address: string;
  domain: string;
  localPart: string;
}> {
  constructor(address: string) {
    const [localPart, domain] = address.split('@');
    
    super({ address: address.toLowerCase(), domain, localPart }, {
      validate: (props) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(props.address)) {
          throw new Error('Invalid email format');
        }
      },
      transform: (props) => ({
        ...props,
        address: props.address.toLowerCase(),
      }),
    });
  }
  
  getDomain(): string {
    return this.props.domain;
  }
  
  isCorporateEmail(domain: string): boolean {
    return this.props.domain.toLowerCase() === domain.toLowerCase();
  }
}

// 手机号值对象
class PhoneNumber extends BaseValueObject<{
  countryCode: string;
  number: string;
  formatted: string;
}> {
  constructor(number: string, countryCode: string = '+86') {
    const digits = number.replace(/\D/g, '');
    
    super({ countryCode, number: digits, formatted: `${countryCode} ${digits}` }, {
      validate: (props) => {
        if (props.number.length < 6 || props.number.length > 15) {
          throw new Error('Invalid phone number length');
        }
      },
    });
  }
  
  getInternationalFormat(): string {
    return `${this.props.countryCode}${this.props.number}`;
  }
  
  getNationalFormat(): string {
    const num = this.props.number;
    if (num.length === 11) {
      return `${num.slice(0, 3)} ${num.slice(3, 7)} ${num.slice(7)}`;
    }
    return num;
  }
}

// 使用示例
const email = new Email('John.Doe@Example.COM');
console.log(email.props.address); // john.doe@example.com
console.log(email.getDomain()); // example.com
console.log(email.isCorporateEmail('example.com')); // true

const phone = new PhoneNumber('13800138000');
console.log(phone.getInternationalFormat()); // +8613800138000
console.log(phone.getNationalFormat()); // 138 0013 8000
```

### 6. 领域事件处理

```typescript
import { BaseAggregateRoot, DomainEvent } from './aggregate-root-skill';

// 事件处理器
class DomainEventHandler {
  private handlers: Map<string, Array<(event: DomainEvent) => void>> = new Map();
  
  subscribe(eventType: string, handler: (event: DomainEvent) => void): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler);
  }
  
  handle(event: DomainEvent): void {
    const handlers = this.handlers.get(event.eventType) || [];
    handlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error(`Error handling event ${event.eventType}:`, error);
      }
    });
  }
  
  handleAll(events: DomainEvent[]): void {
    events.forEach(event => this.handle(event));
  }
}

// 创建事件处理器
const eventHandler = new DomainEventHandler();

// 订阅事件
eventHandler.subscribe('OrderCreated', (event) => {
  console.log(`Order created: ${event.aggregateId}`);
  console.log(`Customer: ${event.data.customerId}`);
});

eventHandler.subscribe('OrderConfirmed', (event) => {
  console.log(`Order confirmed: ${event.aggregateId}`);
  console.log(`Total: ${event.data.totalAmount}`);
  
  // 发送确认邮件
  this.sendConfirmationEmail(event.data.customerId, event.aggregateId);
});

eventHandler.subscribe('OrderShipped', (event) => {
  console.log(`Order shipped: ${event.aggregateId}`);
  
  // 更新库存
  this.updateInventory(event.aggregateId);
});

// 在聚合根使用
const order = new OrderAggregate(generateId('order'), {
  customerId: 'cust_789',
  shippingAddress: address,
});

order.addItem('prod_001', 'Product', 1, 100);
order.confirmOrder();

// 获取并处理事件
const events = order.getDomainEvents();
eventHandler.handleAll(events);
```

### 7. 聚合根持久化示例

```typescript
import { BaseAggregateRoot, AggregateRoot } from './aggregate-root-skill';

// 仓储接口
interface Repository<T extends AggregateRoot> {
  save(aggregate: T): Promise<void>;
  findById(id: string): Promise<T | null>;
  delete(id: string): Promise<void>;
}

// 内存仓储实现
class InMemoryRepository<T extends AggregateRoot> implements Repository<T> {
  private storage: Map<string, any> = new Map();
  
  async save(aggregate: T): Promise<void> {
    const key = `${aggregate.type}_${aggregate.id}`;
    
    // 检查版本冲突 (乐观锁)
    const existing = this.storage.get(key);
    if (existing && existing.version !== aggregate.version - 1) {
      throw new Error('Concurrency conflict: aggregate was modified by another transaction');
    }
    
    // 序列化并存储
    this.storage.set(key, {
      ...aggregate.toObject(),
      serializedAt: Date.now(),
    });
  }
  
  async findById(id: string): Promise<T | null> {
    // 实际实现需要根据类型反序列化
    const entries = Array.from(this.storage.entries());
    const entry = entries.find(([key]) => key.endsWith(`_${id}`));
    return entry ? entry[1] as T : null;
  }
  
  async delete(id: string): Promise<void> {
    const entries = Array.from(this.storage.entries());
    for (const [key] of entries) {
      if (key.endsWith(`_${id}`)) {
        this.storage.delete(key);
      }
    }
  }
}

// 使用示例
async function example() {
  const repo = new InMemoryRepository<OrderAggregate>();
  
  // 创建并保存
  const order = new OrderAggregate(generateId('order'), {
    customerId: 'cust_999',
    shippingAddress: address,
  });
  
  await repo.save(order);
  console.log('Order saved');
  
  // 加载
  const loaded = await repo.findById(order.id);
  if (loaded) {
    console.log('Order loaded:', loaded.id);
  }
  
  // 修改并保存
  order.addItem('prod_001', 'Product', 1, 100);
  await repo.save(order);
  console.log('Order updated');
}
```

## 最佳实践

### 1. 聚合设计原则

```typescript
// ✅ 好的设计：小聚合，高内聚
class OrderAggregate extends BaseAggregateRoot<string, { items: OrderItem[] }> {
  // 订单只包含订单项，不包含产品信息
  // 产品信息通过 ID 引用
}

// ❌ 坏的设计：大聚合，低内聚
class MegaOrderAggregate extends BaseAggregateRoot<string, {
  items: OrderItem[];
  products: Product[];
  customers: Customer[];
  payments: Payment[];
  shipments: Shipment[];
}> {
  // 包含太多实体，性能差，并发冲突多
}
```

### 2. 值对象不可变性

```typescript
// ✅ 正确的值对象使用
class Money extends BaseValueObject<{ amount: number; currency: string }> {
  add(other: Money): Money {
    // 返回新实例，不修改自身
    return new Money(this.props.amount + other.props.amount, this.props.currency);
  }
}

const m1 = new Money(100, 'CNY');
const m2 = new Money(50, 'CNY');
const m3 = m1.add(m2);

console.log(m1.props.amount); // 100 (未变)
console.log(m3.props.amount); // 150 (新值)

// ❌ 错误的做法
class BadMoney {
  amount: number;
  
  add(other: BadMoney): void {
    this.amount += other.amount; // 修改自身，破坏不可变性
  }
}
```

### 3. 领域事件使用

```typescript
// ✅ 在状态变更时触发事件
class OrderAggregate extends BaseAggregateRoot<string, { items: OrderItem[] }> {
  confirmOrder(): void {
    this.status = 'confirmed';
    this.touch();
    
    // 触发事件，通知其他系统
    this.addDomainEvent('OrderConfirmed', {
      orderId: this.id,
      confirmedAt: new Date().toISOString(),
    });
  }
}

// 事件处理器
eventHandler.subscribe('OrderConfirmed', (event) => {
  // 发送通知
  // 更新库存
  // 触发物流
});
```

### 4. 实体一致性边界

```typescript
// ✅ 在聚合内维护一致性
class OrderAggregate extends BaseAggregateRoot<string, { items: OrderItem[] }> {
  addItem(productId: string, quantity: number): void {
    // 检查库存
    if (!this.checkStock(productId, quantity)) {
      throw new Error('Insufficient stock');
    }
    
    // 添加商品
    const item = new OrderItem(generateId('item'), { productId, quantity });
    this.addEntity('items', item);
    
    // 重新计算总额
    this.recalculateTotal();
  }
  
  private checkStock(productId: string, quantity: number): boolean {
    // 通过外部服务检查库存
    return true;
  }
  
  private recalculateTotal(): void {
    // 确保数据一致性
    const items = this.getEntities('items');
    this.totalAmount = items.reduce((sum, item) => sum + item.getTotalPrice(), 0);
  }
}
```

## 性能优化

### 1. 延迟加载

```typescript
class OrderAggregate extends BaseAggregateRoot<string, { items: OrderItem[] }> {
  private itemsLoaded = false;
  
  async loadItems(): Promise<void> {
    if (this.itemsLoaded) return;
    
    // 从数据库加载
    const items = await db.orderItems.findByOrderId(this.id);
    items.forEach(item => this.addEntity('items', item));
    
    this.itemsLoaded = true;
  }
  
  getItems(): OrderItem[] {
    if (!this.itemsLoaded) {
      throw new Error('Items not loaded. Call loadItems() first.');
    }
    return this.getEntities('items') as OrderItem[];
  }
}
```

### 2. 批量操作

```typescript
class OrderAggregate extends BaseAggregateRoot<string, { items: OrderItem[] }> {
  addItems(items: Array<{ productId: string; quantity: number }>): void {
    // 批量添加，只触发一次事件
    items.forEach(itemData => {
      const item = new OrderItem(generateId('item'), itemData);
      (this.entities.items as OrderItem[]).push(item);
    });
    
    this.recalculateTotal();
    this.touch();
    
    this.addDomainEvent('ItemsAddedInBatch', {
      count: items.length,
    });
  }
}
```

## 测试示例

```typescript
import { describe, it, expect } from 'vitest';
import { OrderAggregate, Address, generateId } from './aggregate-root-skill';

describe('OrderAggregate', () => {
  const createAddress = () => new Address({
    street: '123 Main St',
    city: 'Shanghai',
    state: 'SH',
    zipCode: '200000',
    country: 'China',
  });
  
  it('should create order with pending status', () => {
    const order = new OrderAggregate(generateId('order'), {
      customerId: 'cust_123',
      shippingAddress: createAddress(),
    });
    
    expect(order.status).toBe('pending');
    expect(order.version).toBe(1);
  });
  
  it('should add items and calculate total', () => {
    const order = new OrderAggregate(generateId('order'), {
      customerId: 'cust_123',
      shippingAddress: createAddress(),
    });
    
    order.addItem('prod_001', 'Product 1', 2, 100);
    order.addItem('prod_002', 'Product 2', 1, 200);
    
    expect(order.totalAmount).toBe(400);
    expect(order.getEntities('items').length).toBe(2);
  });
  
  it('should confirm order', () => {
    const order = new OrderAggregate(generateId('order'), {
      customerId: 'cust_123',
      shippingAddress: createAddress(),
    });
    
    order.addItem('prod_001', 'Product 1', 1, 100);
    order.confirmOrder();
    
    expect(order.status).toBe('confirmed');
    expect(order.version).toBeGreaterThan(1);
  });
  
  it('should not confirm empty order', () => {
    const order = new OrderAggregate(generateId('order'), {
      customerId: 'cust_123',
      shippingAddress: createAddress(),
    });
    
    expect(() => order.confirmOrder()).toThrow('Cannot confirm empty order');
  });
  
  it('should track domain events', () => {
    const order = new OrderAggregate(generateId('order'), {
      customerId: 'cust_123',
      shippingAddress: createAddress(),
    });
    
    order.addItem('prod_001', 'Product 1', 1, 100);
    order.confirmOrder();
    
    const events = order.getDomainEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(events.some(e => e.eventType === 'OrderCreated')).toBe(true);
    expect(events.some(e => e.eventType === 'OrderConfirmed')).toBe(true);
  });
});
```

## 总结

聚合根技能提供了完整的 DDD 实现基础：

✅ **实体管理**: 自动时间戳、版本控制、生命周期管理  
✅ **值对象**: 不可变性、自动验证、相等比较  
✅ **聚合根**: 一致性边界、领域事件、业务规则封装  
✅ **工厂模式**: 灵活的实例创建和管理  
✅ **扩展性**: 易于继承和定制  

使用建议：
1. 保持聚合小巧，只包含强相关的实体
2. 使用值对象表示不可变概念
3. 通过领域事件解耦聚合间通信
4. 在聚合边界内维护数据一致性
5. 使用乐观锁处理并发冲突
