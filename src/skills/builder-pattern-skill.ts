/**
 * Builder Pattern Skill - ACE (Advanced Constructor Engine)
 * 
 * 构建者模式工具，用于复杂对象的链式构建和分步构建。
 * 
 * 功能:
 * 1. 链式构建 - Fluent API 支持方法链式调用
 * 2. 分步构建 - 支持分阶段构建复杂对象
 * 3. 构建验证 - 构建前/后自动验证数据完整性
 * 
 * @author Axon
 * @version 1.0.0
 */

/**
 * 构建器配置选项
 */
export interface BuilderOptions {
  /** 是否启用严格验证 */
  strict?: boolean;
  /** 是否启用自动验证 */
  autoValidate?: boolean;
  /** 验证回调函数 */
  onValidate?: (data: Record<string, any>) => boolean;
  /** 构建完成回调 */
  onComplete?: (result: Record<string, any>) => void;
}

/**
 * 验证规则
 */
export interface ValidationRule {
  field: string;
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean | string;
}

/**
 * 验证结果
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * 通用构建器基类
 * 
 * @template T - 最终构建的对象类型
 * @template O - 构建器配置选项类型
 */
export abstract class BaseBuilder<T, O extends BuilderOptions = BuilderOptions> {
  protected data: Record<string, any> = {};
  protected options: O;
  protected built: boolean = false;
  protected validationRules: ValidationRule[] = [];

  constructor(options?: O) {
    this.options = options || ({} as O);
  }

  /**
   * 设置字段值
   */
  set<K extends string>(field: K, value: any): this {
    this.data[field] = value;
    return this;
  }

  /**
   * 批量设置字段
   */
  setAll(fields: Record<string, any>): this {
    Object.assign(this.data, fields);
    return this;
  }

  /**
   * 添加验证规则
   */
  addRule(rule: ValidationRule): this {
    this.validationRules.push(rule);
    return this;
  }

  /**
   * 添加多个验证规则
   */
  addRules(rules: ValidationRule[]): this {
    this.validationRules.push(...rules);
    return this;
  }

  /**
   * 验证当前数据
   */
  validate(): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const rule of this.validationRules) {
      const value = this.data[rule.field];

      // 检查必填字段
      if (rule.required && (value === undefined || value === null)) {
        errors.push(`Field "${rule.field}" is required`);
        continue;
      }

      // 如果字段为空且非必填，跳过后续验证
      if (value === undefined || value === null) {
        continue;
      }

      // 检查类型
      if (rule.type) {
        const actualType = Array.isArray(value) ? 'array' : typeof value;
        if (actualType !== rule.type) {
          errors.push(`Field "${rule.field}" must be of type ${rule.type}, got ${actualType}`);
        }
      }

      // 检查字符串长度
      if (typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          errors.push(`Field "${rule.field}" must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          errors.push(`Field "${rule.field}" must be at most ${rule.maxLength} characters`);
        }
        if (rule.pattern && !rule.pattern.test(value)) {
          errors.push(`Field "${rule.field}" does not match pattern`);
        }
      }

      // 检查数字范围
      if (typeof value === 'number') {
        if (rule.min !== undefined && value < rule.min) {
          errors.push(`Field "${rule.field}" must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && value > rule.max) {
          errors.push(`Field "${rule.field}" must be at most ${rule.max}`);
        }
      }

      // 自定义验证
      if (rule.custom) {
        const result = rule.custom(value);
        if (result === false) {
          errors.push(`Field "${rule.field}" failed custom validation`);
        } else if (typeof result === 'string' && result) {
          errors.push(result);
        }
      }
    }

    // 调用配置的验证回调
    if (this.options.onValidate && !this.options.onValidate(this.data)) {
      errors.push('Custom validation failed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * 构建最终对象
   */
  build(): T {
    if (this.built) {
      throw new Error('Builder can only be used once. Create a new instance for another build.');
    }

    // 自动验证
    if (this.options.autoValidate !== false) {
      const result = this.validate();
      if (!result.valid) {
        if (this.options.strict) {
          throw new Error(`Validation failed: ${result.errors.join('; ')}`);
        }
        // 非严格模式下，记录警告但仍继续构建
        console.warn('Build validation warnings:', result.errors);
      }
    }

    const result = this.doBuild();
    this.built = true;

    // 调用完成回调
    if (this.options.onComplete) {
      this.options.onComplete(result as any);
    }

    return result;
  }

  /**
   * 子类实现具体的构建逻辑
   */
  protected abstract doBuild(): T;

  /**
   * 重置构建器状态
   */
  reset(): this {
    this.data = {};
    this.built = false;
    return this;
  }

  /**
   * 克隆当前构建器
   */
  clone(): this {
    const cloned = new (this.constructor as new (options?: O) => this)(this.options);
    cloned.data = { ...this.data };
    cloned.validationRules = [...this.validationRules];
    return cloned;
  }
}

/**
 * 用户对象构建器示例
 */
export interface User {
  id: string;
  name: string;
  email: string;
  age?: number;
  role: 'admin' | 'user' | 'guest';
  createdAt: Date;
  metadata?: Record<string, any>;
}

export class UserBuilder extends BaseBuilder<User> {
  constructor(options?: BuilderOptions) {
    super(options);
    
    // 添加默认验证规则
    this.addRules([
      { field: 'name', required: true, type: 'string', minLength: 1, maxLength: 100 },
      { field: 'email', required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      { field: 'age', type: 'number', min: 0, max: 150 },
      { field: 'role', required: true, type: 'string' },
    ]);
  }

  setId(id: string): this {
    return this.set('id', id);
  }

  setName(name: string): this {
    return this.set('name', name);
  }

  setEmail(email: string): this {
    return this.set('email', email);
  }

  setAge(age: number): this {
    return this.set('age', age);
  }

  setRole(role: 'admin' | 'user' | 'guest'): this {
    return this.set('role', role);
  }

  setMetadata(metadata: Record<string, any>): this {
    return this.set('metadata', metadata);
  }

  protected doBuild(): User {
    return {
      id: this.data.id || `user_${Date.now()}`,
      name: this.data.name,
      email: this.data.email,
      age: this.data.age,
      role: this.data.role,
      createdAt: new Date(),
      metadata: this.data.metadata,
    };
  }
}

/**
 * API 响应构建器示例
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code: number;
  timestamp: number;
  requestId: string;
}

export class ApiResponseBuilder<T> extends BaseBuilder<ApiResponse<T>> {
  constructor(options?: BuilderOptions) {
    super(options);
    
    this.addRules([
      { field: 'code', required: true, type: 'number', min: 100, max: 599 },
    ]);
  }

  setSuccess(success: boolean): this {
    return this.set('success', success);
  }

  setData(data: T): this {
    return this.set('data', data);
  }

  setError(error: string): this {
    return this.set('error', error);
  }

  setCode(code: number): this {
    return this.set('code', code);
  }

  setRequestId(requestId: string): this {
    return this.set('requestId', requestId);
  }

  protected doBuild(): ApiResponse<T> {
    return {
      success: this.data.success ?? false,
      data: this.data.data,
      error: this.data.error,
      code: this.data.code || 200,
      timestamp: Date.now(),
      requestId: this.data.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
  }
}

/**
 * 配置对象构建器示例
 */
export interface AppConfig {
  name: string;
  version: string;
  port: number;
  host: string;
  debug: boolean;
  features: string[];
  database?: {
    host: string;
    port: number;
    name: string;
  };
}

export class AppConfigBuilder extends BaseBuilder<AppConfig> {
  constructor(options?: BuilderOptions) {
    super(options);
    
    this.addRules([
      { field: 'name', required: true, type: 'string', minLength: 1 },
      { field: 'version', required: true, type: 'string', pattern: /^\d+\.\d+\.\d+$/ },
      { field: 'port', required: true, type: 'number', min: 1, max: 65535 },
      { field: 'host', required: true, type: 'string' },
      { field: 'debug', type: 'boolean' },
      { field: 'features', type: 'array' },
    ]);
  }

  setName(name: string): this {
    return this.set('name', name);
  }

  setVersion(version: string): this {
    return this.set('version', version);
  }

  setPort(port: number): this {
    return this.set('port', port);
  }

  setHost(host: string): this {
    return this.set('host', host);
  }

  setDebug(debug: boolean): this {
    return this.set('debug', debug);
  }

  addFeature(feature: string): this {
    const features = this.data.features || [];
    features.push(feature);
    return this.set('features', features);
  }

  setDatabase(config: { host: string; port: number; name: string }): this {
    return this.set('database', config);
  }

  protected doBuild(): AppConfig {
    return {
      name: this.data.name,
      version: this.data.version,
      port: this.data.port,
      host: this.data.host || 'localhost',
      debug: this.data.debug ?? false,
      features: this.data.features || [],
      database: this.data.database,
    };
  }
}

/**
 * 分步构建器 - 支持分阶段构建
 */
export interface BuildStep {
  name: string;
  execute: (data: Record<string, any>) => Record<string, any> | Promise<Record<string, any>>;
  validate?: (data: Record<string, any>) => boolean;
}

export class StepBuilder<T> {
  private steps: BuildStep[] = [];
  private data: Record<string, any> = {};
  private currentStep: number = 0;
  private options: BuilderOptions;

  constructor(options?: BuilderOptions) {
    this.options = options || {};
  }

  /**
   * 添加构建步骤
   */
  addStep(name: string, execute: BuildStep['execute'], validate?: BuildStep['validate']): this {
    this.steps.push({ name, execute, validate });
    return this;
  }

  /**
   * 设置初始数据
   */
  withData(data: Record<string, any>): this {
    this.data = { ...data };
    return this;
  }

  /**
   * 执行下一步
   */
  async next(): Promise<{ done: boolean; step?: string; data?: any }> {
    if (this.currentStep >= this.steps.length) {
      return { done: true };
    }

    const step = this.steps[this.currentStep];
    
    // 执行步骤前验证
    if (step.validate && !step.validate(this.data)) {
      throw new Error(`Step "${step.name}" validation failed`);
    }

    // 执行步骤
    const result = await step.execute(this.data);
    this.data = { ...this.data, ...result };
    this.currentStep++;

    return {
      done: false,
      step: step.name,
      data: this.data,
    };
  }

  /**
   * 执行所有步骤
   */
  async executeAll(): Promise<Record<string, any>> {
    while (this.currentStep < this.steps.length) {
      await this.next();
    }
    return this.data;
  }

  /**
   * 获取当前进度
   */
  getProgress(): { current: number; total: number; percentage: number } {
    return {
      current: this.currentStep,
      total: this.steps.length,
      percentage: Math.round((this.currentStep / this.steps.length) * 100),
    };
  }

  /**
   * 重置构建器
   */
  reset(): this {
    this.currentStep = 0;
    this.data = {};
    return this;
  }
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例 1: 链式构建用户对象
 */
export function exampleUserBuilder() {
  const user = new UserBuilder({ strict: true, autoValidate: true })
    .setName('张三')
    .setEmail('zhangsan@example.com')
    .setAge(28)
    .setRole('admin')
    .setMetadata({ department: '技术部', level: 'P7' })
    .build();

  console.log('构建的用户:', user);
  return user;
}

/**
 * 示例 2: API 响应构建
 */
export function exampleApiResponseBuilder() {
  const response = new ApiResponseBuilder<{ message: string }>({ strict: false })
    .setSuccess(true)
    .setData({ message: '操作成功' })
    .setCode(200)
    .setRequestId('custom-request-id')
    .build();

  console.log('API 响应:', response);
  return response;
}

/**
 * 示例 3: 应用配置构建
 */
export function exampleAppConfigBuilder() {
  const config = new AppConfigBuilder({ strict: true })
    .setName('MyApp')
    .setVersion('1.0.0')
    .setPort(3000)
    .setHost('0.0.0.0')
    .setDebug(true)
    .addFeature('auth')
    .addFeature('logging')
    .addFeature('monitoring')
    .setDatabase({
      host: 'localhost',
      port: 5432,
      name: 'myapp_db',
    })
    .build();

  console.log('应用配置:', config);
  return config;
}

/**
 * 示例 4: 分步构建复杂对象
 */
export async function exampleStepBuilder() {
  const stepBuilder = new StepBuilder({ strict: true })
    .withData({ userId: 'user_123' })
    .addStep('fetch-profile', async (data) => {
      // 模拟获取用户资料
      return { profile: { name: '张三', avatar: '/avatar.png' } };
    })
    .addStep('fetch-preferences', async (data) => {
      // 模拟获取用户偏好
      return { preferences: { theme: 'dark', language: 'zh-CN' } };
    })
    .addStep('fetch-permissions', async (data) => {
      // 模拟获取权限
      return { permissions: ['read', 'write', 'delete'] };
    });

  // 逐步执行
  console.log('步骤 1:', await stepBuilder.next());
  console.log('步骤 2:', await stepBuilder.next());
  console.log('步骤 3:', await stepBuilder.next());

  // 或者一次性执行所有步骤
  // const result = await stepBuilder.executeAll();
  
  console.log('最终数据:', await stepBuilder.executeAll());
  console.log('进度:', stepBuilder.getProgress());
  
  return stepBuilder;
}

/**
 * 示例 5: 带验证的构建
 */
export function exampleValidationBuilder() {
  try {
    const user = new UserBuilder({ 
      strict: true,
      autoValidate: true,
      onValidate: (data) => {
        // 自定义验证逻辑
        if (data.email && !data.email.includes('@')) {
          return false;
        }
        return true;
      },
      onComplete: (result) => {
        console.log('用户构建完成:', result);
      },
    })
      .setName('李四')
      .setEmail('lisi@example.com')
      .setRole('user')
      .build();

    return user;
  } catch (error) {
    console.error('构建失败:', error);
    throw error;
  }
}

/**
 * 示例 6: 构建器克隆
 */
export function exampleCloneBuilder() {
  const baseBuilder = new UserBuilder()
    .setRole('user')
    .setMetadata({ source: 'web' });

  // 克隆基础构建器
  const user1 = baseBuilder.clone()
    .setName('用户 A')
    .setEmail('userA@example.com')
    .build();

  const user2 = baseBuilder.clone()
    .setName('用户 B')
    .setEmail('userB@example.com')
    .build();

  console.log('用户 A:', user1);
  console.log('用户 B:', user2);

  return { user1, user2 };
}

// 类型已在前面的 export interface/class 语句中导出，无需重复导出
