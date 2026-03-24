/**
 * 适配器模式专业版工具技能 - KAEL
 * 
 * 提供适配器模式的高级实现：
 * 1. 适配器定义 (Adapter Definition) - 灵活的适配器创建与注册
 * 2. 接口转换 (Interface Conversion) - 强大的接口映射与转换
 * 3. 双向适配 (Bidirectional Adaptation) - 支持双向数据流
 * 
 * 增强特性:
 * - 适配器注册中心 (Adapter Registry)
 * - 链式适配器 (Chained Adapters)
 * - 异步适配器 (Async Adapters)
 * - 验证适配器 (Validating Adapters)
 * - 缓存适配器 (Cached Adapters)
 * 
 * @author KAEL
 * @version 2.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 基础适配器接口
 */
export interface IAdapter<TInput = any, TOutput = any> {
  /** 适配器名称 */
  name: string;
  /** 适配器描述 */
  description?: string;
  /** 正向适配 */
  adapt(input: TInput): TOutput | Promise<TOutput>;
  /** 反向适配 (可选) */
  reverse?(output: TOutput): TInput | Promise<TInput>;
  /** 验证输入 (可选) */
  validate?(input: TInput): boolean;
}

/**
 * 异步适配器接口
 */
export interface IAsyncAdapter<TInput = any, TOutput = any> extends IAdapter<TInput, TOutput> {
  adapt(input: TInput): Promise<TOutput>;
  reverse?(output: TOutput): Promise<TInput>;
}

/**
 * 适配器元数据
 */
export interface AdapterMetadata {
  /** 适配器 ID */
  id: string;
  /** 适配器名称 */
  name: string;
  /** 输入类型描述 */
  inputType: string;
  /** 输出类型描述 */
  outputType: string;
  /** 是否支持反向适配 */
  supportsReverse: boolean;
  /** 创建时间 */
  createdAt: Date;
  /** 使用次数统计 */
  usageCount: number;
  /** 标签 */
  tags?: string[];
}

/**
 * 适配器注册表
 */
export interface AdapterRegistry {
  /** 注册适配器 */
  register<TIn, TOut>(adapter: IAdapter<TIn, TOut>): void;
  /** 获取适配器 */
  get<TIn, TOut>(id: string): IAdapter<TIn, TOut> | undefined;
  /** 注销适配器 */
  unregister(id: string): boolean;
  /** 列出所有适配器 */
  list(): AdapterMetadata[];
  /** 查找适配器 */
  find(query: { name?: string; tags?: string[]; inputType?: string }): AdapterMetadata[];
}

/**
 * 字段映射配置
 */
export type FieldMapping<TSource, TTarget> = {
  [K in keyof TTarget]: keyof TSource | ((source: TSource, context?: any) => TTarget[K]);
};

/**
 * 接口转换配置
 */
export interface InterfaceAdapterConfig<TSource, TTarget> {
  /** 源对象 */
  source: TSource;
  /** 字段映射 */
  mapping: FieldMapping<TSource, TTarget>;
  /** 默认值 */
  defaults?: Partial<TTarget>;
  /** 转换上下文 */
  context?: any;
  /** 是否严格模式 (未映射字段抛出错误) */
  strict?: boolean;
}

/**
 * 双向适配器配置
 */
export interface BidirectionalAdapterConfig<TForward, TReverse> {
  /** 正向转换 */
  forward: (input: TForward) => TReverse | Promise<TReverse>;
  /** 反向转换 */
  reverse: (output: TReverse) => TForward | Promise<TForward>;
  /** 适配器名称 */
  name?: string;
  /** 验证函数 (可选) */
  validate?: (data: TForward | TReverse) => boolean;
}

/**
 * 链式适配器配置
 */
export interface ChainedAdapterConfig<TInput, TOutput, TIntermediate = any> {
  /** 第一个适配器 */
  first: IAdapter<TInput, TIntermediate>;
  /** 第二个适配器 */
  second: IAdapter<TIntermediate, TOutput>;
  /** 链式适配器名称 */
  name?: string;
}

/**
 * 缓存适配器配置
 */
export interface CachedAdapterConfig<TInput, TOutput> {
  /** 被缓存的适配器 */
  adapter: IAdapter<TInput, TOutput>;
  /** 缓存 TTL (毫秒) */
  ttlMs?: number;
  /** 最大缓存条目数 */
  maxEntries?: number;
  /** 缓存键生成函数 */
  cacheKeyFn?: (input: TInput) => string;
}

/**
 * 验证规则
 */
export interface ValidationRule<T> {
  /** 规则名称 */
  name: string;
  /** 验证函数 */
  test: (value: T) => boolean;
  /** 错误消息 */
  message: string;
}

// ============================================
// 1. 适配器定义 (Adapter Definition)
// ============================================

/**
 * 适配器注册中心 (单例)
 * 全局适配器管理和发现
 */
export class AdapterRegistryImpl implements AdapterRegistry {
  private static instance: AdapterRegistryImpl;
  private adapters: Map<string, { adapter: IAdapter; metadata: AdapterMetadata }> = new Map();

  private constructor() {}

  /** 获取单例实例 */
  static getInstance(): AdapterRegistryImpl {
    if (!AdapterRegistryImpl.instance) {
      AdapterRegistryImpl.instance = new AdapterRegistryImpl();
    }
    return AdapterRegistryImpl.instance;
  }

  /** 注册适配器 */
  register<TIn, TOut>(adapter: IAdapter<TIn, TOut>): void {
    const id = adapter.name || `adapter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const metadata: AdapterMetadata = {
      id,
      name: adapter.name || 'Unnamed',
      inputType: this.inferType(adapter.adapt),
      outputType: this.inferOutputType(adapter),
      supportsReverse: !!adapter.reverse,
      createdAt: new Date(),
      usageCount: 0,
      tags: []
    };

    this.adapters.set(id, { adapter: adapter as IAdapter, metadata });
  }

  /** 获取适配器 */
  get<TIn, TOut>(id: string): IAdapter<TIn, TOut> | undefined {
    const entry = this.adapters.get(id);
    if (entry) {
      entry.metadata.usageCount++;
      return entry.adapter as IAdapter<TIn, TOut>;
    }
    return undefined;
  }

  /** 注销适配器 */
  unregister(id: string): boolean {
    return this.adapters.delete(id);
  }

  /** 列出所有适配器 */
  list(): AdapterMetadata[] {
    return Array.from(this.adapters.values()).map(({ metadata }) => metadata);
  }

  /** 查找适配器 */
  find(query: { name?: string; tags?: string[]; inputType?: string }): AdapterMetadata[] {
    return Array.from(this.adapters.values())
      .filter(({ metadata }) => {
        if (query.name && !metadata.name.toLowerCase().includes(query.name.toLowerCase())) {
          return false;
        }
        if (query.tags && query.tags.length > 0) {
          const hasTag = query.tags.some(tag => metadata.tags?.includes(tag));
          if (!hasTag) return false;
        }
        if (query.inputType && !metadata.inputType.includes(query.inputType)) {
          return false;
        }
        return true;
      })
      .map(({ metadata }) => metadata);
  }

  /** 推断输入类型 */
  private inferType(fn: any): string {
    const str = fn.toString();
    const match = str.match(/\(([^)]*)\)/);
    return match ? match[1] : 'any';
  }

  /** 推断输出类型 */
  private inferOutputType(adapter: IAdapter): string {
    return 'any';
  }
}

/**
 * 创建基础适配器
 * 
 * @param name - 适配器名称
 * @param adaptFn - 正向适配函数
 * @param reverseFn - 反向适配函数 (可选)
 * @returns 适配器实例
 * 
 * @example
 * const upperCaseAdapter = createAdapter(
 *   'UpperCaseAdapter',
 *   (str: string) => str.toUpperCase(),
 *   (str: string) => str.toLowerCase()
 * );
 */
export function createAdapter<TIn, TOut>(
  name: string,
  adaptFn: (input: TIn) => TOut | Promise<TOut>,
  reverseFn?: (output: TOut) => TIn | Promise<TIn>
): IAdapter<TIn, TOut> {
  return {
    name,
    adapt: adaptFn,
    reverse: reverseFn
  };
}

/**
 * 创建异步适配器
 * 
 * @param name - 适配器名称
 * @param adaptFn - 异步正向适配函数
 * @param reverseFn - 异步反向适配函数 (可选)
 * @returns 异步适配器实例
 * 
 * @example
 * const fetchAdapter = createAsyncAdapter(
 *   'FetchAdapter',
 *   async (url: string) => {
 *     const res = await fetch(url);
 *     return res.json();
 *   }
 * );
 */
export function createAsyncAdapter<TIn, TOut>(
  name: string,
  adaptFn: (input: TIn) => Promise<TOut>,
  reverseFn?: (output: TOut) => Promise<TIn>
): IAsyncAdapter<TIn, TOut> {
  return {
    name,
    adapt: adaptFn,
    reverse: reverseFn
  };
}

// ============================================
// 2. 接口转换 (Interface Conversion)
// ============================================

/**
 * 创建接口适配器
 * 强大的字段映射和转换功能
 * 
 * @param config - 接口转换配置
 * @returns 转换后的对象
 * 
 * @example
 * const user = { user_id: 1, user_name: 'Alice', created_at: '2026-01-01' };
 * const adapted = createInterfaceAdapter({
 *   source: user,
 *   mapping: {
 *     id: 'user_id',
 *     name: 'user_name',
 *     createdAt: (src) => new Date(src.created_at),
 *     displayName: (src) => src.user_name.toUpperCase()
 *   }
 * });
 */
export function createInterfaceAdapter<TSource extends object, TTarget extends object>(
  config: InterfaceAdapterConfig<TSource, TTarget>
): TTarget {
  const { source, mapping, defaults, context, strict } = config;
  const result: any = {};

  // 应用默认值
  if (defaults) {
    Object.assign(result, defaults);
  }

  // 应用字段映射
  for (const [targetKey, sourceKeyOrFn] of Object.entries(mapping)) {
    if (typeof sourceKeyOrFn === 'function') {
      result[targetKey] = (sourceKeyOrFn as Function)(source, context);
    } else {
      const sourceKey = sourceKeyOrFn as keyof TSource;
      if (strict && !(sourceKey in source)) {
        throw new Error(`Source field "${String(sourceKey)}" not found in strict mode`);
      }
      result[targetKey] = source[sourceKey];
    }
  }

  return result as TTarget;
}

/**
 * 批量接口转换
 * 
 * @param items - 源对象数组
 * @param mapping - 字段映射
 * @param context - 转换上下文 (可选)
 * @returns 转换后的对象数组
 */
export function batchTransform<TSource extends object, TTarget extends object>(
  items: TSource[],
  mapping: FieldMapping<TSource, TTarget>,
  context?: any
): TTarget[] {
  return items.map((item) =>
    createInterfaceAdapter({
      source: item,
      mapping,
      context
    })
  );
}

/**
 * 深度字段映射适配器
 * 支持嵌套对象的字段映射
 * 
 * @param source - 源对象
 * @param mapping - 深度映射配置
 * @returns 转换后的对象
 * 
 * @example
 * const deepSource = { user: { profile: { name: 'Alice' } } };
 * const adapted = createDeepAdapter(deepSource, {
 *   userName: 'user.profile.name'
 * });
 * // 结果：{ userName: 'Alice' }
 */
export function createDeepAdapter<TSource extends object, TTarget extends object>(
  source: TSource,
  mapping: Record<keyof TTarget, string | ((source: TSource) => any)>
): TTarget {
  const result: any = {};

  const getDeepValue = (obj: any, path: string): any => {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  };

  for (const [targetKey, sourcePathOrFn] of Object.entries(mapping)) {
    if (typeof sourcePathOrFn === 'function') {
      result[targetKey] = sourcePathOrFn(source);
    } else {
      result[targetKey] = getDeepValue(source, sourcePathOrFn);
    }
  }

  return result as TTarget;
}

// ============================================
// 3. 双向适配 (Bidirectional Adaptation)
// ============================================

/**
 * 创建双向适配器
 * 
 * @param config - 双向适配器配置
 * @returns 双向适配器实例
 * 
 * @example
 * const tempAdapter = createBidirectionalAdapter({
 *   name: 'TemperatureConverter',
 *   forward: (celsius) => ({ fahrenheit: celsius * 9/5 + 32 }),
 *   reverse: (fahrenheit) => ({ celsius: (fahrenheit.fahrenheit - 32) * 5/9 })
 * });
 */
export function createBidirectionalAdapter<TForward, TReverse>(
  config: BidirectionalAdapterConfig<TForward, TReverse>
): IAdapter<TForward, TReverse> {
  return {
    name: config.name || 'BidirectionalAdapter',
    adapt: config.forward,
    reverse: config.reverse,
    validate: config.validate
  };
}

/**
 * JSON 双向适配器
 * 支持序列化和反序列化
 * 
 * @param options - JSON 选项 (replacer, space)
 * @returns JSON 适配器
 */
export function createJsonAdapter<T = any>(options?: {
  replacer?: ((key: string, value: any) => any) | (string | number)[] | null;
  space?: string | number;
}): IAdapter<T, string> {
  return {
    name: 'JsonAdapter',
    adapt: (obj: T) => JSON.stringify(obj, options?.replacer as any, options?.space),
    reverse: (json: string) => JSON.parse(json) as T
  };
}

/**
 * 格式转换双向适配器
 * 支持 CSV、JSON、XML 之间的转换
 */
export function createFormatAdapter(
  fromFormat: 'json' | 'csv' | 'xml',
  toFormat: 'json' | 'csv' | 'xml'
): IAdapter<any, any> {
  const converters: Record<string, (data: any) => any> = {
    'csv-json': (csv: string) => {
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      return lines.slice(1).map((line) => {
        const values = line.split(',').map(v => v.trim());
        return headers.reduce((acc, header, i) => {
          acc[header] = values[i] ?? '';
          return acc;
        }, {} as Record<string, string>);
      });
    },
    'json-csv': (json: any[]) => {
      if (!Array.isArray(json) || json.length === 0) return '';
      const headers = Object.keys(json[0]);
      const rows = json.map(obj =>
        headers.map(h => {
          const val = obj[h];
          return typeof val === 'string' && val.includes(',') ? `"${val}"` : val;
        }).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    },
    'json-xml': (json: any, rootName = 'root') => {
      const toXml = (obj: any, tagName: string): string => {
        if (obj === null || obj === undefined) return `<${tagName}/>`;
        if (typeof obj !== 'object') return `<${tagName}>${obj}</${tagName}>`;
        if (Array.isArray(obj)) {
          return obj.map(item => toXml(item, tagName)).join('');
        }
        return Object.entries(obj)
          .map(([key, value]) => toXml(value as any, key))
          .join('');
      };
      return `<${rootName}>${toXml(json, 'item')}</${rootName}>`;
    },
    'xml-json': (xml: string) => {
      const result: any = {};
      const tagRegex = /<(\w+)(?:[^>]*)>([\s\S]*?)<\/\1>/g;
      let match;
      while ((match = tagRegex.exec(xml)) !== null) {
        const [, tagName, content] = match;
        const childMatch = /<\w+/.test(content);
        result[tagName] = childMatch ? {} : content.trim();
      }
      return result;
    }
  };

  const key = `${fromFormat}-${toFormat}`;
  const converter = converters[key];

  if (!converter) {
    throw new Error(`Unsupported format conversion: ${fromFormat} -> ${toFormat}`);
  }

  return {
    name: `FormatAdapter_${fromFormat}_to_${toFormat}`,
    adapt: converter,
    reverse: converters[`${toFormat}-${fromFormat}`]
  };
}

// ============================================
// 高级适配器
// ============================================

/**
 * 链式适配器
 * 将两个适配器串联执行
 * 
 * @param config - 链式配置
 * @returns 链式适配器
 * 
 * @example
 * const chained = createChainedAdapter({
 *   first: jsonAdapter,
 *   second: validateAdapter
 * });
 */
export function createChainedAdapter<TInput, TOutput, TIntermediate>(
  config: ChainedAdapterConfig<TInput, TOutput, TIntermediate>
): IAdapter<TInput, TOutput> {
  return {
    name: config.name || `ChainedAdapter_${config.first.name}_${config.second.name}`,
    adapt: async (input: TInput): Promise<TOutput> => {
      const intermediate = await Promise.resolve(config.first.adapt(input));
      return await Promise.resolve(config.second.adapt(intermediate as TIntermediate));
    },
    reverse: config.second.reverse && config.first.reverse
      ? async (output: TOutput): Promise<TInput> => {
          const intermediate = await Promise.resolve(config.second.reverse!(output));
          return await Promise.resolve(config.first.reverse!(intermediate as TIntermediate));
        }
      : undefined
  };
}

/**
 * 缓存适配器
 * 为适配器添加缓存功能
 */
export function createCachedAdapter<TInput, TOutput>(
  config: CachedAdapterConfig<TInput, TOutput>
): IAdapter<TInput, TOutput> {
  const cache = new Map<string, { value: TOutput; expiry: number }>();
  const { adapter, ttlMs = 5 * 60 * 1000, maxEntries = 100, cacheKeyFn } = config;

  return {
    name: `CachedAdapter_${adapter.name}`,
    adapt: async (input: TInput): Promise<TOutput> => {
      const key = cacheKeyFn ? cacheKeyFn(input) : JSON.stringify(input);
      const cached = cache.get(key);
      
      if (cached && cached.expiry > Date.now()) {
        return cached.value;
      }

      const result = await adapter.adapt(input);
      
      // 清理过期缓存
      const now = Date.now();
      for (const [k, v] of cache.entries()) {
        if (v.expiry <= now) cache.delete(k);
      }

      // 添加新缓存
      if (cache.size >= maxEntries) {
        const firstKey = cache.keys().next().value;
        if (firstKey) cache.delete(firstKey);
      }
      cache.set(key, { value: result, expiry: now + ttlMs });

      return result;
    },
    reverse: adapter.reverse
      ? async (output: TOutput): Promise<TInput> => {
          return await adapter.reverse!(output);
        }
      : undefined
  };
}

/**
 * 验证适配器
 * 为适配器添加输入验证功能
 */
export function createValidatingAdapter<TInput, TOutput>(
  adapter: IAdapter<TInput, TOutput>,
  rules: ValidationRule<TInput>[]
): IAdapter<TInput, TOutput> {
  return {
    name: `ValidatingAdapter_${adapter.name}`,
    adapt: (input: TInput): TOutput => {
      for (const rule of rules) {
        if (!rule.test(input)) {
          throw new Error(`Validation failed: ${rule.message}`);
        }
      }
      return adapter.adapt(input);
    },
    reverse: adapter.reverse,
    validate: (input: TInput): boolean => {
      return rules.every(rule => rule.test(input));
    }
  };
}

// ============================================
// 预定义适配器
// ============================================

/**
 * 字符串大小写适配器
 */
export const stringCaseAdapter = createBidirectionalAdapter({
  name: 'StringCaseAdapter',
  forward: (str: string) => str.toUpperCase(),
  reverse: (str: string) => str.toLowerCase()
});

/**
 * 数字字符串适配器
 */
export const numberStringAdapter = createBidirectionalAdapter({
  name: 'NumberStringAdapter',
  forward: (num: number) => num.toString(),
  reverse: (str: string) => parseFloat(str)
});

/**
 * 时间戳日期适配器
 */
export const timestampDateAdapter = createBidirectionalAdapter({
  name: 'TimestampDateAdapter',
  forward: (date: Date) => date.getTime(),
  reverse: (timestamp: number) => new Date(timestamp)
});

/**
 * Base64 适配器
 */
export const base64Adapter = createBidirectionalAdapter({
  name: 'Base64Adapter',
  forward: (str: string) => Buffer.from(str, 'utf-8').toString('base64'),
  reverse: (base64: string) => Buffer.from(base64, 'base64').toString('utf-8')
});

// ============================================
// 使用示例
// ============================================

if (require.main === module) {
  console.log('=== 适配器模式专业版 - 使用示例 ===\n');

  // ============================================
  // 示例 1: 适配器注册中心
  // ============================================
  console.log('1️⃣ 适配器注册中心 (Adapter Registry)');
  console.log('─'.repeat(60));

  const registry = AdapterRegistryImpl.getInstance();

  // 注册适配器
  registry.register(stringCaseAdapter);
  registry.register(numberStringAdapter);
  registry.register(timestampDateAdapter);

  console.log('已注册适配器:');
  registry.list().forEach(meta => {
    console.log(`  • ${meta.name} (${meta.id})`);
    console.log(`    输入：${meta.inputType} → 输出：${meta.outputType}`);
    console.log(`    反向支持：${meta.supportsReverse ? '✅' : '❌'}`);
  });
  console.log();

  // ============================================
  // 示例 2: 接口转换
  // ============================================
  console.log('2️⃣ 接口转换 (Interface Conversion)');
  console.log('─'.repeat(60));

  const legacyApi = {
    user_id: 123,
    user_name: 'Alice Zhang',
    user_email: 'alice@example.com',
    created_at: '2026-03-13T10:00:00Z',
    profile: {
      age: 30,
      city: 'Beijing'
    }
  };

  // 简单映射
  const modernUser = createInterfaceAdapter({
    source: legacyApi,
    mapping: {
      id: 'user_id',
      name: 'user_name',
      email: 'user_email',
      createdAt: (src: any) => new Date(src.created_at),
      age: (src: any) => src.profile.age,
      location: (src: any) => src.profile.city
    }
  });

  console.log('旧版 API 响应:', JSON.stringify(legacyApi, null, 2));
  console.log('现代格式:', JSON.stringify(modernUser, null, 2));
  console.log();

  // 深度映射
  const deepMapped = createDeepAdapter(legacyApi, {
    userId: 'user_id',
    userName: 'user_name',
    userAge: 'profile.age',
    userCity: 'profile.city'
  });

  console.log('深度映射:', JSON.stringify(deepMapped, null, 2));
  console.log();

  // ============================================
  // 示例 3: 双向适配
  // ============================================
  console.log('3️⃣ 双向适配 (Bidirectional Adaptation)');
  console.log('─'.repeat(60));

  // 温度转换
  const tempAdapter = createBidirectionalAdapter({
    name: 'TemperatureConverter',
    forward: (celsius: { c: number }) => ({ f: celsius.c * 9/5 + 32 }),
    reverse: (fahrenheit: { f: number }) => ({ c: (fahrenheit.f - 32) * 5/9 })
  });

  const celsius = { c: 25 };
  const fahrenheit: any = tempAdapter.adapt(celsius);
  const backToCelsius: any = tempAdapter.reverse!(fahrenheit);

  console.log(`温度转换: ${celsius.c}°C → ${fahrenheit.f.toFixed(1)}°F → ${backToCelsius.c.toFixed(1)}°C`);

  // Base64 编码
  const original = 'Hello, AxonClaw!';
  const encoded: any = base64Adapter.adapt(original);
  const decoded: any = base64Adapter.reverse!(encoded);

  console.log(`Base64: "${original}" → "${encoded}" → "${decoded}"`);
  console.log();

  // ============================================
  // 示例 4: 高级适配器
  // ============================================
  console.log('4️⃣ 高级适配器 (Advanced Adapters)');
  console.log('─'.repeat(60));

  // 链式适配器
  const jsonAdapter = createJsonAdapter({ space: 2 });
  const chained = createChainedAdapter({
    name: 'ObjectToJsonString',
    first: jsonAdapter,
    second: stringCaseAdapter
  });

  const obj = { name: 'Axon', version: '2.0' };
  const chainedResult = chained.adapt(obj);
  console.log('链式适配 (对象 → JSON → 大写):');
  console.log(`  输入：${JSON.stringify(obj)}`);
  console.log(`  输出：${chainedResult}`);
  console.log();

  // 缓存适配器
  const slowAdapter = createAsyncAdapter(
    'SlowAdapter',
    async (n: number) => {
      await new Promise(r => setTimeout(r, 100));
      return n * 2;
    }
  );

  const cached = createCachedAdapter({
    adapter: slowAdapter,
    ttlMs: 10000,
    maxEntries: 50
  });

  console.log('缓存适配器性能测试:');
  const start1 = Date.now();
  await cached.adapt(42);
  const time1 = Date.now() - start1;

  const start2 = Date.now();
  await cached.adapt(42); // 命中缓存
  const time2 = Date.now() - start2;

  console.log(`  首次调用：${time1}ms`);
  console.log(`  缓存命中：${time2}ms (快 ${((time1 - time2) / time1 * 100).toFixed(1)}%)`);
  console.log();

  // 验证适配器
  const validatingAdapter = createValidatingAdapter(
    numberStringAdapter,
    [
      {
        name: 'isPositive',
        test: (n) => n > 0,
        message: 'Number must be positive'
      },
      {
        name: 'isInteger',
        test: (n) => Number.isInteger(n),
        message: 'Number must be an integer'
      }
    ]
  );

  console.log('验证适配器:');
  try {
    console.log(`  42 → "${validatingAdapter.adapt(42)}" ✅`);
    validatingAdapter.adapt(-5);
  } catch (e: any) {
    console.log(`  -5 → 验证失败：${e.message} ❌`);
  }
  console.log();

  // ============================================
  // 示例 5: 格式转换
  // ============================================
  console.log('5️⃣ 格式转换 (Format Conversion)');
  console.log('─'.repeat(60));

  const csvData = 'name,age,city\nAlice,30,Beijing\nBob,25,Shanghai';
  const csvJsonAdapter = createFormatAdapter('csv', 'json');
  const jsonFromCsv = csvJsonAdapter.adapt(csvData);

  console.log('CSV → JSON:');
  console.log('  CSV 输入:', csvData.split('\n')[0]);
  console.log('  JSON 输出:', JSON.stringify(jsonFromCsv, null, 2));

  const jsonToCsv = csvJsonAdapter.reverse!(jsonFromCsv);
  console.log('  JSON → CSV:', jsonToCsv.split('\n')[0]);
  console.log();

  // ============================================
  // 总结
  // ============================================
  console.log('✅ 所有示例执行完成!');
  console.log();
  console.log('📋 功能清单:');
  console.log('  适配器定义:');
  console.log('    • createAdapter - 基础适配器创建');
  console.log('    • createAsyncAdapter - 异步适配器创建');
  console.log('    • AdapterRegistry - 全局注册中心');
  console.log();
  console.log('  接口转换:');
  console.log('    • createInterfaceAdapter - 接口映射');
  console.log('    • batchTransform - 批量转换');
  console.log('    • createDeepAdapter - 深度映射');
  console.log();
  console.log('  双向适配:');
  console.log('    • createBidirectionalAdapter - 双向转换');
  console.log('    • createJsonAdapter - JSON 序列化');
  console.log('    • createFormatAdapter - 格式转换 (CSV/JSON/XML)');
  console.log();
  console.log('  高级适配器:');
  console.log('    • createChainedAdapter - 链式组合');
  console.log('    • createCachedAdapter - 缓存增强');
  console.log('    • createValidatingAdapter - 验证增强');
  console.log();
  console.log('  预定义适配器:');
  console.log('    • stringCaseAdapter - 大小写转换');
  console.log('    • numberStringAdapter - 数字字符串转换');
  console.log('    • timestampDateAdapter - 时间戳日期转换');
  console.log('    • base64Adapter - Base64 编码');
}
