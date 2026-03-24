/**
 * 适配器模式工具技能 - KAEL
 * 
 * 提供适配器模式的核心实现：
 * 1. 接口转换 (Interface Adapter) - 将一个接口转换为另一个接口
 * 2. 双向适配 (Bidirectional Adapter) - 支持双向数据/接口转换
 * 3. 类适配器 (Class Adapter) - 通过继承实现类级别适配
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 通用适配器接口
 */
export interface IAdapter<TInput, TOutput> {
  /**
   * 适配输入到输出
   */
  adapt(input: TInput): TOutput;
  
  /**
   * 反向适配 (可选，用于双向适配)
   */
  reverse?(output: TOutput): TInput;
}

/**
 * 接口转换配置
 */
export interface InterfaceTransformConfig<TSource, TTarget> {
  /** 源接口对象 */
  source: TSource;
  /** 字段映射规则 */
  mapping: Record<keyof TTarget, keyof TSource | ((source: TSource) => any)>;
  /** 默认值配置 (可选) */
  defaults?: Partial<TTarget>;
}

/**
 * 双向适配配置
 */
export interface BidirectionalConfig<TForward, TReverse> {
  /** 正向转换函数 */
  forward: (input: TForward) => TReverse;
  /** 反向转换函数 */
  reverse: (output: TReverse) => TForward;
}

/**
 * 类适配器基类
 */
export abstract class ClassAdapterBase<TInput, TOutput> implements IAdapter<TInput, TOutput> {
  /**
   * 适配方法 - 必须由子类实现
   */
  abstract adapt(input: TInput): TOutput;
  
  /**
   * 反向适配方法 - 可选实现
   */
  reverse?(output: TOutput): TInput;
}

// ============================================
// 1. 接口转换 (Interface Adapter)
// ============================================

/**
 * 创建接口转换器
 * 将一个对象的接口转换为另一个接口格式
 * 
 * @param config - 转换配置，包含源对象和字段映射
 * @returns 转换后的目标对象
 * 
 * @example
 * // 简单字段映射
 * const user = { userId: 1, userName: 'Alice', userEmail: 'alice@example.com' };
 * const transformed = createInterfaceAdapter({
 *   source: user,
 *   mapping: {
 *     id: 'userId',
 *     name: 'userName',
 *     email: 'userEmail'
 *   }
 * });
 * // 结果：{ id: 1, name: 'Alice', email: 'alice@example.com' }
 * 
 * @example
 * // 使用转换函数
 * const product = { price: 100, quantity: 5 };
 * const transformed = createInterfaceAdapter({
 *   source: product,
 *   mapping: {
 *     total: (p) => p.price * p.quantity,
 *     formattedPrice: (p) => `$${p.price}`
 *   }
 * });
 * // 结果：{ total: 500, formattedPrice: '$100' }
 */
export function createInterfaceAdapter<TSource extends object, TTarget extends object>(
  config: InterfaceTransformConfig<TSource, TTarget>
): TTarget {
  const { source, mapping, defaults } = config;
  const result: any = {};
  
  // 应用默认值
  if (defaults) {
    Object.assign(result, defaults);
  }
  
  // 应用字段映射
  for (const [targetKey, sourceKeyOrFn] of Object.entries(mapping)) {
    if (typeof sourceKeyOrFn === 'function') {
      // 如果是函数，执行转换逻辑
      result[targetKey] = (sourceKeyOrFn as (s: TSource) => any)(source);
    } else {
      // 如果是字符串，直接复制字段值
      result[targetKey] = (source as any)[sourceKeyOrFn as keyof TSource];
    }
  }
  
  return result as TTarget;
}

/**
 * 批量接口转换
 * 将一组对象从源接口转换为目标接口
 * 
 * @param items - 源对象数组
 * @param mapping - 字段映射规则
 * @returns 转换后的目标对象数组
 * 
 * @example
 * const users = [
 *   { userId: 1, userName: 'Alice' },
 *   { userId: 2, userName: 'Bob' }
 * ];
 * const transformed = batchTransform(users, {
 *   id: 'userId',
 *   name: 'userName'
 * });
 * // 结果：[{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }]
 */
export function batchTransform<TSource extends object, TTarget extends object>(
  items: TSource[],
  mapping: Record<keyof TTarget, keyof TSource | ((source: TSource) => any)>
): TTarget[] {
  return items.map((item) =>
    createInterfaceAdapter({
      source: item,
      mapping
    })
  );
}

// ============================================
// 2. 双向适配 (Bidirectional Adapter)
// ============================================

/**
 * 创建双向适配器
 * 支持正向和反向两个方向的接口转换
 * 
 * @param config - 双向配置，包含正向和反向转换函数
 * @returns 双向适配器对象
 * 
 * @example
 * // 温度转换器 (摄氏度 <-> 华氏度)
 * const tempAdapter = createBidirectionalAdapter({
 *   forward: (celsius) => ({ fahrenheit: celsius * 9/5 + 32 }),
 *   reverse: (fahrenheit) => ({ celsius: (fahrenheit.fahrenheit - 32) * 5/9 })
 * });
 * 
 * const f = tempAdapter.adapt({ celsius: 25 });
 * // 结果：{ fahrenheit: 77 }
 * 
 * const c = tempAdapter.reverse!({ fahrenheit: 77 });
 * // 结果：{ celsius: 25 }
 */
export function createBidirectionalAdapter<TForward, TReverse>(
  config: BidirectionalConfig<TForward, TReverse>
): IAdapter<TForward, TReverse> {
  return {
    adapt: config.forward,
    reverse: config.reverse
  };
}

/**
 * JSON 双向适配器
 * 专门用于对象与 JSON 字符串之间的双向转换
 * 
 * @returns JSON 双向适配器
 * 
 * @example
 * const jsonAdapter = createJsonAdapter();
 * 
 * const obj = { name: 'Alice', age: 30 };
 * const json = jsonAdapter.adapt(obj);
 * // 结果：'{"name":"Alice","age":30}'
 * 
 * const parsed = jsonAdapter.reverse(json);
 * // 结果：{ name: 'Alice', age: 30 }
 */
export function createJsonAdapter<T = any>(): IAdapter<T, string> {
  return {
    adapt: (obj: T) => JSON.stringify(obj),
    reverse: (json: string) => JSON.parse(json) as T
  };
}

/**
 * 数据格式双向适配器
 * 用于不同数据格式之间的转换 (如 CSV <-> JSON)
 * 
 * @param fromFormat - 源格式 ('json' | 'csv' | 'xml')
 * @param toFormat - 目标格式 ('json' | 'csv' | 'xml')
 * @returns 格式转换适配器
 * 
 * @example
 * const csvJsonAdapter = createFormatAdapter('csv', 'json');
 * 
 * const csv = 'name,age\nAlice,30\nBob,25';
 * const json = csvJsonAdapter.adapt(csv);
 * // 结果：[{ name: 'Alice', age: '30' }, { name: 'Bob', age: '25' }]
 */
export function createFormatAdapter(
  fromFormat: 'json' | 'csv' | 'xml',
  toFormat: 'json' | 'csv' | 'xml'
): IAdapter<any, any> {
  const adapters: Record<string, (data: any) => any> = {
    'csv-json': (csv: string) => {
      const lines = csv.trim().split('\n');
      const headers = lines[0].split(',');
      return lines.slice(1).map((line) => {
        const values = line.split(',');
        return headers.reduce((acc, header, i) => {
          acc[header.trim()] = values[i]?.trim();
          return acc;
        }, {} as Record<string, string>);
      });
    },
    'json-csv': (json: any[]) => {
      if (!Array.isArray(json) || json.length === 0) return '';
      const headers = Object.keys(json[0]);
      const rows = json.map((obj) =>
        headers.map((h) => obj[h]).join(',')
      );
      return [headers.join(','), ...rows].join('\n');
    },
    'json-xml': (json: any, rootName = 'root') => {
      const toXml = (obj: any, tag: string = 'root'): string => {
        if (typeof obj !== 'object' || obj === null) {
          return String(obj);
        }
        if (Array.isArray(obj)) {
          return obj.map((item) => toXml(item, 'item')).join('');
        }
        return Object.entries(obj)
          .map(([key, value]) => `<${key}>${toXml(value as any)}</${key}>`)
          .join('');
      };
      return `<${rootName}>${toXml(json)}</${rootName}>`;
    },
    'xml-json': (xml: string) => {
      // 简化的 XML 到 JSON 转换 (生产环境建议使用专业库)
      const result: any = {};
      const tagRegex = /<(\w+)>([^<]*)<\/\1>/g;
      let match;
      while ((match = tagRegex.exec(xml)) !== null) {
        result[match[1]] = match[2];
      }
      return result;
    }
  };
  
  const key = `${fromFormat}-${toFormat}`;
  const converter = adapters[key];
  
  if (!converter) {
    throw new Error(`Unsupported format conversion: ${fromFormat} -> ${toFormat}`);
  }
  
  return {
    adapt: converter,
    reverse: adapters[`${toFormat}-${fromFormat}`]
  };
}

// ============================================
// 3. 类适配器 (Class Adapter)
// ============================================

/**
 * 日志服务接口 (旧系统)
 */
export interface ILegacyLogger {
  logMessage(message: string): void;
  logErrorLegacy(error: string): void;
  logWarningLegacy(warning: string): void;
}

/**
 * 日志服务接口 (新系统)
 */
export interface INewLogger {
  info(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  debug?(message: string): void;
}

/**
 * 日志类适配器
 * 将旧版日志接口适配为新版接口
 * 
 * @example
 * // 假设有一个旧版日志服务
 * const legacyLogger: ILegacyLogger = {
 *   logMessage: (msg) => console.log(`[LOG] ${msg}`),
 *   logErrorLegacy: (err) => console.error(`[ERROR] ${err}`),
 *   logWarningLegacy: (warn) => console.warn(`[WARN] ${warn}`)
 * };
 * 
 * // 使用类适配器
 * const adapter = new LoggerClassAdapter(legacyLogger);
 * adapter.info('System started');      // 内部调用 logMessage
 * adapter.error('Database failed');     // 内部调用 logErrorLegacy
 * adapter.warn('Low memory');           // 内部调用 logWarningLegacy
 */
export class LoggerClassAdapter extends ClassAdapterBase<ILegacyLogger, INewLogger> {
  public instance: INewLogger;
  
  constructor(private legacyLogger: ILegacyLogger) {
    super();
    this.instance = this.adapt(legacyLogger);
  }
  
  adapt(input: ILegacyLogger): INewLogger {
    return {
      info: (message: string) => input.logMessage(message),
      error: (message: string) => input.logErrorLegacy(message),
      warn: (message: string) => input.logWarningLegacy(message)
    };
  }
  
  reverse(output: INewLogger): ILegacyLogger {
    return {
      logMessage: (message: string) => output.info(message),
      logErrorLegacy: (error: string) => output.error(error),
      logWarningLegacy: (warning: string) => output.warn(warning)
    };
  }
}

/**
 * 通用类适配器工厂
 * 创建一个类适配器实例
 * 
 * @param legacyInstance - 旧版类实例
 * @param adaptFn - 适配函数
 * @param reverseFn - 反向适配函数 (可选)
 * @returns 适配器实例
 * 
 * @example
 * const legacyService = new LegacyPaymentService();
 * 
 * const adapter = createClassAdapter(
 *   legacyService,
 *   (legacy) => ({
 *     pay: (amount) => legacy.processPayment(amount),
 *     refund: (id) => legacy.returnPayment(id)
 *   }),
 *   (modern) => ({
 *     processPayment: (amount) => modern.pay(amount),
 *     returnPayment: (id) => modern.refund(id)
 *   })
 * );
 */
export function createClassAdapter<TLegacy, TModern>(
  legacyInstance: TLegacy,
  adaptFn: (legacy: TLegacy) => TModern,
  reverseFn?: (modern: TModern) => TLegacy
): IAdapter<TLegacy, TModern> & { instance: TModern } {
  const adapter: IAdapter<TLegacy, TModern> & { instance: TModern } = {
    adapt: adaptFn,
    instance: adaptFn(legacyInstance)
  };
  
  if (reverseFn) {
    adapter.reverse = reverseFn;
  }
  
  return adapter;
}

// ============================================
// 使用示例 (命令行执行)
// ============================================

if (require.main === module) {
  console.log('=== 适配器模式工具 - 使用示例 ===\n');
  
  // ============================================
  // 示例 1: 接口转换
  // ============================================
  console.log('1️⃣ 接口转换 (Interface Adapter)');
  console.log('─'.repeat(50));
  
  // 场景：将旧版用户 API 响应转换为新版格式
  const legacyUserResponse = {
    user_id: 123,
    user_name: 'Alice Zhang',
    user_email: 'alice@example.com',
    created_at: '2026-03-13T10:00:00Z'
  };
  
  const newUserFormat = createInterfaceAdapter({
    source: legacyUserResponse,
    mapping: {
      id: 'user_id',
      name: 'user_name',
      email: 'user_email',
      createdAt: 'created_at',
      displayName: (src) => src.user_name.toUpperCase()
    }
  });
  
  console.log('旧版格式:', JSON.stringify(legacyUserResponse, null, 2));
  console.log('新版格式:', JSON.stringify(newUserFormat, null, 2));
  console.log();
  
  // 批量转换示例
  const legacyUsers = [
    { user_id: 1, user_name: 'Bob', user_email: 'bob@example.com' },
    { user_id: 2, user_name: 'Carol', user_email: 'carol@example.com' }
  ];
  
  const newUsers = batchTransform(legacyUsers, {
    id: 'user_id',
    name: 'user_name',
    email: 'user_email'
  });
  
  console.log('批量转换:', JSON.stringify(newUsers, null, 2));
  console.log();
  
  // ============================================
  // 示例 2: 双向适配
  // ============================================
  console.log('2️⃣ 双向适配 (Bidirectional Adapter)');
  console.log('─'.repeat(50));
  
  // 温度转换器
  const tempAdapter = createBidirectionalAdapter({
    forward: (celsius: { celsius: number }) => ({
      fahrenheit: celsius.celsius * 9/5 + 32
    }),
    reverse: (fahrenheit: { fahrenheit: number }) => ({
      celsius: (fahrenheit.fahrenheit - 32) * 5/9
    })
  });
  
  const celsius = { celsius: 25 };
  const fahrenheit = tempAdapter.adapt(celsius);
  const backToCelsius = tempAdapter.reverse!(fahrenheit);
  
  console.log(`摄氏度 ${celsius.celsius}°C → 华氏度 ${fahrenheit.fahrenheit.toFixed(1)}°F`);
  console.log(`华氏度 ${fahrenheit.fahrenheit.toFixed(1)}°F → 摄氏度 ${backToCelsius.celsius.toFixed(1)}°C`);
  console.log();
  
  // JSON 双向适配器
  const jsonAdapter = createJsonAdapter();
  const obj = { name: 'Axon', version: '1.0', active: true };
  const jsonStr = jsonAdapter.adapt(obj);
  const parsedObj = jsonAdapter.reverse!(jsonStr);
  
  console.log('JSON 适配器:');
  console.log('  对象 → JSON:', jsonStr);
  console.log('  JSON → 对象:', JSON.stringify(parsedObj));
  console.log();
  
  // CSV <-> JSON 适配器
  const csvData = 'name,age,city\nAlice,30,Beijing\nBob,25,Shanghai';
  const csvJsonAdapter = createFormatAdapter('csv', 'json');
  const jsonFromCsv = csvJsonAdapter.adapt(csvData);
  
  console.log('CSV → JSON:');
  console.log('  CSV 输入:', csvData.split('\n')[0]);
  console.log('  JSON 输出:', JSON.stringify(jsonFromCsv, null, 2));
  console.log();
  
  // ============================================
  // 示例 3: 类适配器
  // ============================================
  console.log('3️⃣ 类适配器 (Class Adapter)');
  console.log('─'.repeat(50));
  
  // 模拟旧版日志服务
  const legacyLogger: ILegacyLogger = {
    logMessage: (msg) => console.log(`  [LEGACY-LOG] ${msg}`),
    logErrorLegacy: (err) => console.error(`  [LEGACY-ERROR] ${err}`),
    logWarningLegacy: (warn) => console.warn(`  [LEGACY-WARN] ${warn}`)
  };
  
  // 创建适配器
  const loggerAdapter = new LoggerClassAdapter(legacyLogger);
  const newLogger = loggerAdapter.instance;
  
  console.log('使用新版接口调用旧版服务:');
  newLogger.info('System initialized');
  newLogger.warn('Memory usage at 80%');
  newLogger.error('Database connection failed');
  console.log();
  
  // 通用类适配器工厂示例
  const legacyPayment = {
    processPayment: (amount: number) => `Processed payment: $${amount}`,
    returnPayment: (id: string) => `Returned payment: ${id}`
  };
  
  const paymentAdapter = createClassAdapter(
    legacyPayment,
    (legacy) => ({
      pay: (amount: number) => legacy.processPayment(amount),
      refund: (id: string) => legacy.returnPayment(id)
    }),
    (modern) => ({
      processPayment: (amount: number) => modern.pay(amount),
      returnPayment: (id: string) => modern.refund(id)
    })
  );
  
  console.log('支付服务适配:');
  console.log('  新版调用:', paymentAdapter.instance.pay(100));
  console.log('  反向适配:', paymentAdapter.reverse!(paymentAdapter.instance).processPayment(200));
  console.log();
  
  // ============================================
  // 总结
  // ============================================
  console.log('✅ 所有示例执行完成!');
  console.log();
  console.log('📋 功能总结:');
  console.log('  • 接口转换：createInterfaceAdapter, batchTransform');
  console.log('  • 双向适配：createBidirectionalAdapter, createJsonAdapter, createFormatAdapter');
  console.log('  • 类适配器：LoggerClassAdapter, createClassAdapter');
}
