/**
 * Builder Pattern Pro Skill - ACE (Advanced Construction Engine)
 * 
 * 专业构建者模式工具，提供链式调用和复杂对象构建能力
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============================================================================
// 核心类型定义
// ============================================================================

/**
 * 构建者接口 - 定义构建过程的标准方法
 */
interface Builder<T> {
  build(): T;
  reset(): void;
  clone(): Builder<T>;
}

/**
 * 可链式调用的构建者接口
 * 注意：索引签名已移除以避免类型冲突
 */
type ChainableBuilder<T> = Builder<T>;

/**
 * 构建选项配置
 */
interface BuilderOptions {
  strict?: boolean;        // 严格模式：必填字段验证
  immutable?: boolean;     // 不可变模式：构建后禁止修改
  validate?: boolean;      // 自动验证：构建前执行验证
  debug?: boolean;         // 调试模式：输出构建日志
}

// ============================================================================
// 基础构建者类
// ============================================================================

/**
 * 基础构建者抽象类
 * 
 * 提供通用的构建方法和链式调用支持
 */
abstract class BaseBuilder<T> implements Builder<T> {
  protected options: BuilderOptions;
  protected buildLog: string[] = [];

  constructor(options: BuilderOptions = {}) {
    this.options = {
      strict: false,
      immutable: false,
      validate: true,
      debug: false,
      ...options,
    };
  }

  /**
   * 构建最终对象
   */
  abstract build(): T;

  /**
   * 重置构建状态
   */
  abstract reset(): void;

  /**
   * 克隆当前构建者
   */
  abstract clone(): Builder<T>;

  /**
   * 链式调用支持 - 返回自身
   */
  protected chain(): this {
    if (this.options.debug) {
      this.log('Chain call');
    }
    return this;
  }

  /**
   * 记录构建日志
   */
  protected log(message: string): void {
    const timestamp = new Date().toISOString();
    this.buildLog.push(`[${timestamp}] ${message}`);
    if (this.options.debug) {
      console.log(`[Builder Debug] ${message}`);
    }
  }

  /**
   * 获取构建日志
   */
  getLogs(): string[] {
    return [...this.buildLog];
  }

  /**
   * 清空构建日志
   */
  clearLogs(): void {
    this.buildLog = [];
  }
}

// ============================================================================
// 高级构建者类 - 支持复杂对象构建
// ============================================================================

/**
 * 高级构建者 - 支持嵌套构建和复杂对象组装
 */
class AdvancedBuilder<T> extends BaseBuilder<T> {
  protected product: Partial<T>;
  protected validators: Array<(obj: Partial<T>) => boolean> = [];
  protected transformers: Array<(obj: Partial<T>) => Partial<T>> = [];

  constructor(
    protected readonly prototype: T,
    options: BuilderOptions = {}
  ) {
    super(options);
    this.product = { ...prototype };
    this.log(`AdvancedBuilder initialized for ${this.getProductName()}`);
  }

  /**
   * 设置字段值 - 支持链式调用
   */
  set<K extends keyof T>(key: K, value: T[K]): this {
    this.log(`Set ${String(key)} = ${this.formatValue(value)}`);
    (this.product as any)[key] = value;
    return this.chain();
  }

  /**
   * 批量设置字段
   */
  setMany(fields: Partial<T>): this {
    this.log(`Setting ${Object.keys(fields).length} fields`);
    Object.entries(fields).forEach(([key, value]) => {
      (this.product as any)[key] = value;
      this.log(`  → ${key} = ${this.formatValue(value)}`);
    });
    return this.chain();
  }

  /**
   * 添加验证器
   */
  addValidator(validator: (obj: Partial<T>) => boolean): this {
    this.validators.push(validator);
    this.log('Validator added');
    return this.chain();
  }

  /**
   * 添加转换器
   */
  addTransformer(transformer: (obj: Partial<T>) => Partial<T>): this {
    this.transformers.push(transformer);
    this.log('Transformer added');
    return this.chain();
  }

  /**
   * 构建对象 - 执行验证和转换
   */
  build(): T {
    this.log('Building product...');

    // 执行转换器
    if (this.transformers.length > 0) {
      this.log(`Executing ${this.transformers.length} transformers`);
      this.product = this.transformers.reduce(
        (acc, transformer) => transformer(acc),
        this.product
      );
    }

    // 执行验证
    if (this.options.validate && this.validators.length > 0) {
      this.log('Running validators...');
      for (const validator of this.validators) {
        if (!validator(this.product)) {
          const error = new Error('Validation failed');
          this.log(`Validation error: ${error.message}`);
          if (this.options.strict) {
            throw error;
          }
        }
      }
    }

    const result = { ...this.product } as T;
    this.log(`Product built successfully: ${this.getProductName()}`);

    // 不可变模式：冻结对象
    if (this.options.immutable) {
      this.log('Freezing product (immutable mode)');
      return Object.freeze(result);
    }

    return result;
  }

  /**
   * 重置构建状态
   */
  reset(): void {
    this.log('Resetting builder');
    this.product = { ...this.prototype };
    this.clearLogs();
    this.log('Builder reset complete');
  }

  /**
   * 克隆构建者
   */
  clone(): AdvancedBuilder<T> {
    this.log('Cloning builder');
    const cloned = new AdvancedBuilder(this.prototype, { ...this.options });
    cloned.product = { ...this.product };
    cloned.validators = [...this.validators];
    cloned.transformers = [...this.transformers];
    return cloned;
  }

  /**
   * 获取产品名称
   */
  private getProductName(): string {
    return (this.prototype as any).constructor?.name || 'Unknown';
  }

  /**
   * 格式化值用于日志
   */
  private formatValue(value: any): string {
    if (typeof value === 'string') return `"${value}"`;
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    return String(value);
  }
}

// ============================================================================
// 专业构建者 - 针对特定场景优化
// ============================================================================

/**
 * API 响应构建者
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
  requestId: string;
}

class ApiResponseBuilder<T> extends BaseBuilder<ApiResponse<T>> {
  private success: boolean = true;
  private data?: T;
  private error?: string;
  private requestId: string = crypto.randomUUID();

  setData(data: T): this {
    this.data = data;
    this.log(`Data set (type: ${typeof data})`);
    return this.chain();
  }

  setError(error: string): this {
    this.success = false;
    this.error = error;
    this.log(`Error set: ${error}`);
    return this.chain();
  }

  setRequestId(id: string): this {
    this.requestId = id;
    this.log(`Request ID set: ${id}`);
    return this.chain();
  }

  build(): ApiResponse<T> {
    this.log('Building API response');
    return {
      success: this.success,
      data: this.data,
      error: this.error,
      timestamp: Date.now(),
      requestId: this.requestId,
    };
  }

  reset(): void {
    this.success = true;
    this.data = undefined;
    this.error = undefined;
    this.requestId = crypto.randomUUID();
    this.clearLogs();
  }

  clone(): ApiResponseBuilder<T> {
    const cloned = new ApiResponseBuilder<T>(this.options);
    cloned.success = this.success;
    cloned.data = this.data;
    cloned.error = this.error;
    cloned.requestId = this.requestId;
    return cloned;
  }
}

/**
 * 数据库查询构建者
 */
interface QueryBuilder {
  select(fields: string[]): this;
  from(table: string): this;
  where(condition: string): this;
  orderBy(field: string, direction?: 'ASC' | 'DESC'): this;
  limit(count: number): this;
  offset(count: number): this;
  build(): { sql: string; params: any[] };
}

class SqlQueryBuilder extends BaseBuilder<{ sql: string; params: any[] }> {
  private selects: string[] = ['*'];
  private table?: string;
  private wheres: string[] = [];
  private orders: Array<{ field: string; direction: 'ASC' | 'DESC' }> = [];
  private limitCount?: number;
  private offsetCount?: number;
  private params: any[] = [];

  select(fields: string[]): this {
    this.selects = fields;
    this.log(`SELECT ${fields.join(', ')}`);
    return this.chain();
  }

  from(table: string): this {
    this.table = table;
    this.log(`FROM ${table}`);
    return this.chain();
  }

  where(condition: string, ...params: any[]): this {
    this.wheres.push(condition);
    this.params.push(...params);
    this.log(`WHERE ${condition}`);
    return this.chain();
  }

  orderBy(field: string, direction: 'ASC' | 'DESC' = 'ASC'): this {
    this.orders.push({ field, direction });
    this.log(`ORDER BY ${field} ${direction}`);
    return this.chain();
  }

  limit(count: number): this {
    this.limitCount = count;
    this.log(`LIMIT ${count}`);
    return this.chain();
  }

  offset(count: number): this {
    this.offsetCount = count;
    this.log(`OFFSET ${count}`);
    return this.chain();
  }

  build(): { sql: string; params: any[] } {
    this.log('Building SQL query');
    
    if (!this.table) {
      throw new Error('Table not specified');
    }

    const parts: string[] = [];
    
    // SELECT
    parts.push(`SELECT ${this.selects.join(', ')}`);
    
    // FROM
    parts.push(`FROM ${this.table}`);
    
    // WHERE
    if (this.wheres.length > 0) {
      parts.push(`WHERE ${this.wheres.join(' AND ')}`);
    }
    
    // ORDER BY
    if (this.orders.length > 0) {
      const orderStr = this.orders
        .map(o => `${o.field} ${o.direction}`)
        .join(', ');
      parts.push(`ORDER BY ${orderStr}`);
    }
    
    // LIMIT
    if (this.limitCount !== undefined) {
      parts.push(`LIMIT ${this.limitCount}`);
    }
    
    // OFFSET
    if (this.offsetCount !== undefined) {
      parts.push(`OFFSET ${this.offsetCount}`);
    }

    const sql = parts.join(' ');
    this.log(`SQL: ${sql}`);
    
    return { sql, params: this.params };
  }

  reset(): void {
    this.selects = ['*'];
    this.table = undefined;
    this.wheres = [];
    this.orders = [];
    this.limitCount = undefined;
    this.offsetCount = undefined;
    this.params = [];
    this.clearLogs();
  }

  clone(): SqlQueryBuilder {
    const cloned = new SqlQueryBuilder(this.options);
    cloned.selects = [...this.selects];
    cloned.table = this.table;
    cloned.wheres = [...this.wheres];
    cloned.orders = [...this.orders];
    cloned.limitCount = this.limitCount;
    cloned.offsetCount = this.offsetCount;
    cloned.params = [...this.params];
    return cloned;
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 创建高级构建者实例
 */
function createBuilder<T>(prototype: T, options?: BuilderOptions): AdvancedBuilder<T> {
  return new AdvancedBuilder(prototype, options);
}

/**
 * 创建 API 响应构建者
 */
function createApiResponseBuilder<T>(options?: BuilderOptions): ApiResponseBuilder<T> {
  return new ApiResponseBuilder<T>(options);
}

/**
 * 创建 SQL 查询构建者
 */
function createQueryBuilder(options?: BuilderOptions): SqlQueryBuilder {
  return new SqlQueryBuilder(options);
}

// ============================================================================
// 导出
// ============================================================================

export {
  // 类型
  Builder,
  ChainableBuilder,
  BuilderOptions,
  ApiResponse,
  
  // 基础类
  BaseBuilder,
  AdvancedBuilder,
  
  // 专业构建者
  ApiResponseBuilder,
  SqlQueryBuilder,
  
  // 工厂函数
  createBuilder,
  createApiResponseBuilder,
  createQueryBuilder,
};

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例 1: 基础对象构建
 */
function example1_BasicBuilder() {
  interface User {
    id: number;
    name: string;
    email: string;
    age: number;
    role: string;
  }

  const userPrototype: User = {
    id: 0,
    name: '',
    email: '',
    age: 0,
    role: 'user',
  };

  const builder = createBuilder(userPrototype, { debug: true });

  const user = builder
    .set('id', 1)
    .set('name', '张三')
    .set('email', 'zhangsan@example.com')
    .set('age', 25)
    .set('role', 'admin')
    .build();

  console.log('User:', user);
  return user;
}

/**
 * 示例 2: API 响应构建
 */
function example2_ApiResponse() {
  interface UserData {
    id: number;
    name: string;
  }

  const response = createApiResponseBuilder<UserData>()
    .setData({ id: 1, name: '李四' })
    .setRequestId('req-123456')
    .build();

  console.log('API Response:', response);
  return response;
}

/**
 * 示例 3: SQL 查询构建
 */
function example3_SqlQuery() {
  const query = createQueryBuilder()
    .select(['id', 'name', 'email'])
    .from('users')
    .where('age > ?', 18)
    .where('status = ?', 'active')
    .orderBy('created_at', 'DESC')
    .limit(10)
    .offset(0)
    .build();

  console.log('SQL Query:', query);
  return query;
}

/**
 * 示例 4: 复杂对象构建 (嵌套结构)
 */
function example4_ComplexObject() {
  interface Address {
    street: string;
    city: string;
    zipCode: string;
  }

  interface Profile {
    bio: string;
    avatar: string;
    socialLinks: string[];
  }

  interface CompleteUser {
    id: number;
    name: string;
    email: string;
    address: Address;
    profile: Profile;
    createdAt: Date;
  }

  const addressPrototype: Address = {
    street: '',
    city: '',
    zipCode: '',
  };

  const profilePrototype: Profile = {
    bio: '',
    avatar: '',
    socialLinks: [],
  };

  const userPrototype: CompleteUser = {
    id: 0,
    name: '',
    email: '',
    address: addressPrototype,
    profile: profilePrototype,
    createdAt: new Date(),
  };

  const addressBuilder = createBuilder(addressPrototype);
  const profileBuilder = createBuilder(profilePrototype);

  const address = addressBuilder
    .set('street', '中关村大街 1 号')
    .set('city', '北京市')
    .set('zipCode', '100080')
    .build();

  const profile = profileBuilder
    .set('bio', '全栈工程师')
    .set('avatar', 'https://example.com/avatar.jpg')
    .set('socialLinks', ['github', 'twitter'])
    .build();

  const user = createBuilder(userPrototype)
    .set('id', 1)
    .set('name', '王五')
    .set('email', 'wangwu@example.com')
    .set('address', address)
    .set('profile', profile)
    .set('createdAt', new Date())
    .build();

  console.log('Complete User:', user);
  return user;
}

/**
 * 示例 5: 带验证的构建
 */
function example5_Validation() {
  interface Product {
    name: string;
    price: number;
    quantity: number;
    category: string;
  }

  const productPrototype: Product = {
    name: '',
    price: 0,
    quantity: 0,
    category: '',
  };

  const product = createBuilder(productPrototype, { 
    strict: true, 
    validate: true,
    debug: true 
  })
    .set('name', 'MacBook Pro')
    .set('price', 14999)
    .set('quantity', 10)
    .set('category', 'Electronics')
    .addValidator((obj) => {
      if (!obj.name || obj.name.length < 2) {
        throw new Error('产品名称至少 2 个字符');
      }
      return true;
    })
    .addValidator((obj) => {
      if (obj.price === undefined || obj.price <= 0) {
        throw new Error('价格必须大于 0');
      }
      return true;
    })
    .addTransformer((obj) => {
      // 自动添加税费
      if (obj.price !== undefined && obj.price > 0) {
        obj.price = obj.price * 1.13; // 13% 税
      }
      return obj;
    })
    .build();

  console.log('Product (with tax):', product);
  return product;
}

// 运行示例
if (require.main === module) {
  console.log('='.repeat(60));
  console.log('Builder Pattern Pro - 使用示例');
  console.log('='.repeat(60));
  
  console.log('\n【示例 1: 基础对象构建】');
  example1_BasicBuilder();
  
  console.log('\n【示例 2: API 响应构建】');
  example2_ApiResponse();
  
  console.log('\n【示例 3: SQL 查询构建】');
  example3_SqlQuery();
  
  console.log('\n【示例 4: 复杂对象构建】');
  example4_ComplexObject();
  
  console.log('\n【示例 5: 带验证的构建】');
  example5_Validation();
  
  console.log('\n' + '='.repeat(60));
  console.log('所有示例执行完成 ✓');
  console.log('='.repeat(60));
}
