/**
 * Pipeline Utils Skill - 数据处理管道工具
 * 
 * @description 提供灵活的数据处理管道构建、转换链和并行处理能力
 * @author AxonClaw Engineering
 * @version 1.0.0
 * 
 * @features
 * - 管道构建：链式数据处理流程
 * - 数据转换：丰富的内置转换器
 * - 并行处理：并发执行多个管道分支
 * - 错误处理：优雅的错误恢复机制
 * - 类型安全：完整的 TypeScript 类型支持
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 管道阶段配置 */
interface PipelineStage<T = any, R = any> {
  /** 阶段名称 */
  name: string;
  /** 处理函数 */
  processor: (data: T, context: PipelineContext) => R | Promise<R>;
  /** 是否可选 (失败不中断管道) */
  optional?: boolean;
  /** 重试次数 */
  retries?: number;
  /** 超时时间 (ms) */
  timeout?: number;
}

/** 管道上下文 */
interface PipelineContext {
  /** 管道 ID */
  id: string;
  /** 执行开始时间 */
  startTime: number;
  /** 已执行的阶段 */
  executedStages: string[];
  /** 阶段执行结果缓存 */
  stageResults: Map<string, any>;
  /** 用户自定义数据 */
  metadata: Record<string, any>;
  /** 取消令牌 */
  abortSignal?: AbortSignal;
}

/** 管道执行结果 */
interface PipelineResult<T = any> {
  /** 是否成功 */
  success: boolean;
  /** 最终结果 */
  data?: T;
  /** 错误信息 */
  error?: Error;
  /** 执行统计 */
  stats: PipelineStats;
  /** 各阶段结果 */
  stageResults: Record<string, StageResult>;
}

/** 阶段执行结果 */
interface StageResult {
  /** 阶段名称 */
  name: string;
  /** 是否成功 */
  success: boolean;
  /** 执行时间 (ms) */
  duration: number;
  /** 输出数据 */
  output?: any;
  /** 错误信息 */
  error?: string;
}

/** 管道执行统计 */
interface PipelineStats {
  /** 总阶段数 */
  totalStages: number;
  /** 成功阶段数 */
  successfulStages: number;
  /** 失败阶段数 */
  failedStages: number;
  /** 跳过阶段数 */
  skippedStages: number;
  /** 总执行时间 (ms) */
  totalDuration: number;
  /** 平均阶段执行时间 (ms) */
  avgStageDuration: number;
}

/** 并行管道配置 */
interface ParallelPipelineConfig<T = any, R = any> {
  /** 管道名称 */
  name: string;
  /** 输入数据 */
  input: T;
  /** 分支管道 */
  branches: Array<{
    name: string;
    stages: PipelineStage[];
  }>;
  /** 合并函数 */
  mergeFn?: (results: Record<string, any>) => R | Promise<R>;
  /** 并发限制 */
  concurrencyLimit?: number;
}

/** 管道构建器 */
interface PipelineBuilder<T = any, R = any> {
  /** 添加处理阶段 */
  add: <O = any>(name: string, processor: (data: any, context: PipelineContext) => O | Promise<O>, options?: Partial<PipelineStage>) => any;
  /** 添加过滤阶段 */
  filter: (predicate: (data: any, context: PipelineContext) => boolean | Promise<boolean>, name?: string) => any;
  /** 添加映射阶段 */
  map: <O = any>(mapper: (data: any, context: PipelineContext) => O | Promise<O>, name?: string) => any;
  /** 添加批处理阶段 */
  batch: (batchSize: number, name?: string) => any;
  /** 添加并行分支 */
  parallel: <O = any>(branches: Array<{ name: string; stages: PipelineStage[] }>, mergeFn?: (results: Record<string, any>) => O | Promise<O>) => any;
  /** 添加错误处理 */
  catch: (handler: (error: Error, context: PipelineContext) => any) => any;
  /** 添加重试机制 */
  retry: (maxRetries: number, delayMs?: number) => any;
  /** 添加超时控制 */
  timeout: (ms: number) => any;
  /** 执行管道 */
  execute: (input: T, metadata?: Record<string, any>) => Promise<PipelineResult<R>>;
}

// ============================================================================
// 工具函数
// ============================================================================

/** 生成唯一管道 ID */
function generatePipelineId(): string {
  return `pipe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** 带超时的 Promise 执行 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  stageName: string
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Stage "${stageName}" timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  return Promise.race([promise, timeout]);
}

/** 带重试的执行 */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number,
  delayMs: number = 100,
  stageName: string
): Promise<T> {
  let lastError: Error;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw new Error(`Stage "${stageName}" failed after ${maxRetries + 1} attempts: ${lastError!.message}`);
}

// ============================================================================
// 管道构建器实现
// ============================================================================

class PipelineBuilderImpl<T = any, R = any> implements PipelineBuilder<T, R> {
  private stages: PipelineStage[] = [];
  private errorHandler?: (error: Error, context: PipelineContext) => any;
  private defaultRetries = 0;
  private defaultDelay = 100;
  private defaultTimeout?: number;

  add<O = any>(
    name: string,
    processor: (data: any, context: PipelineContext) => O | Promise<O>,
    options?: Partial<PipelineStage>
  ): any {
    this.stages.push({
      name,
      processor: processor as any,
      optional: options?.optional ?? false,
      retries: options?.retries ?? this.defaultRetries,
      timeout: options?.timeout ?? this.defaultTimeout,
    });
    return this;
  }

  filter(
    predicate: (data: any, context: PipelineContext) => boolean | Promise<boolean>,
    name: string = 'filter'
  ): any {
    this.add(name, async (data, context) => {
      const shouldPass = await predicate(data, context);
      if (!shouldPass) {
        throw new Error('Filter predicate returned false');
      }
      return data;
    });
    return this;
  }

  map<O = any>(
    mapper: (data: any, context: PipelineContext) => O | Promise<O>,
    name: string = 'map'
  ): any {
    return this.add(name, mapper);
  }

  batch(batchSize: number, name: string = 'batch'): any {
    return this.add(name, async (data: any[], context) => {
      const batches: any[][] = [];
      for (let i = 0; i < data.length; i += batchSize) {
        batches.push(data.slice(i, i + batchSize));
      }
      return batches;
    });
  }

  parallel<O = any>(
    branches: Array<{ name: string; stages: PipelineStage[] }>,
    mergeFn?: (results: Record<string, any>) => O | Promise<O>
  ): any {
    return this.add('parallel', async (data, context) => {
      const results: Record<string, any> = {};
      const concurrencyLimit = context.metadata.concurrencyLimit ?? 5;
      
      // 并发执行分支
      const executeBranch = async (branch: typeof branches[0]) => {
        const branchPipeline = new PipelineBuilderImpl<any, any>();
        branch.stages.forEach(stage => {
          branchPipeline.add(stage.name, stage.processor, {
            optional: stage.optional,
            retries: stage.retries,
            timeout: stage.timeout,
          });
        });
        const result = await branchPipeline.execute(data, { ...context, branchName: branch.name });
        return { name: branch.name, result };
      };

      // 限制并发数
      const limitedBranches = branches.slice(0, concurrencyLimit);
      const branchResults = await Promise.all(limitedBranches.map(executeBranch));
      
      branchResults.forEach(({ name, result }) => {
        results[name] = result.data;
      });

      if (mergeFn) {
        return await mergeFn(results);
      }
      return results as O;
    });
  }

  catch(handler: (error: Error, context: PipelineContext) => any): any {
    this.errorHandler = handler;
    return this;
  }

  retry(maxRetries: number, delayMs: number = 100): any {
    this.defaultRetries = maxRetries;
    this.defaultDelay = delayMs;
    return this;
  }

  timeout(ms: number): any {
    this.defaultTimeout = ms;
    return this;
  }

  async execute(input: T, metadata?: Record<string, any>): Promise<PipelineResult<R>> {
    const context: PipelineContext = {
      id: generatePipelineId(),
      startTime: Date.now(),
      executedStages: [],
      stageResults: new Map(),
      metadata: metadata ?? {},
      abortSignal: metadata?.abortSignal,
    };

    const stageResults: Record<string, StageResult> = {};
    let currentData: any = input;
    let failedStages = 0;
    let skippedStages = 0;
    let successfulStages = 0;

    try {
      for (const stage of this.stages) {
        // 检查取消信号
        if (context.abortSignal?.aborted) {
          throw new Error('Pipeline execution was aborted');
        }

        const stageStart = Date.now();
        const stageResult: StageResult = {
          name: stage.name,
          success: false,
          duration: 0,
        };

        try {
          // 执行阶段
          const executeStage = async () => {
            return await stage.processor(currentData, context);
          };

          let output: any;
          if (stage.timeout) {
            output = await withTimeout(executeStage(), stage.timeout, stage.name);
          } else if (stage.retries) {
            output = await withRetry(executeStage, stage.retries, this.defaultDelay, stage.name);
          } else {
            output = await executeStage();
          }

          currentData = output;
          stageResult.success = true;
          stageResult.output = output;
          successfulStages++;
        } catch (error) {
          const err = error as Error;
          stageResult.error = err.message;
          
          if (stage.optional) {
            skippedStages++;
            stageResult.success = true; // 可选阶段失败视为跳过
          } else {
            failedStages++;
            
            // 调用错误处理器
            if (this.errorHandler) {
              currentData = await this.errorHandler(err, context);
              stageResult.success = true;
              successfulStages++;
            } else {
              throw err;
            }
          }
        }

        stageResult.duration = Date.now() - stageStart;
        stageResults[stage.name] = stageResult;
        context.executedStages.push(stage.name);
        context.stageResults.set(stage.name, stageResult);
      }

      const totalDuration = Date.now() - context.startTime;
      
      return {
        success: true,
        data: currentData as R,
        stats: {
          totalStages: this.stages.length,
          successfulStages,
          failedStages,
          skippedStages,
          totalDuration,
          avgStageDuration: totalDuration / this.stages.length,
        },
        stageResults,
      };
    } catch (error) {
      const totalDuration = Date.now() - context.startTime;
      const err = error as Error;
      
      return {
        success: false,
        error: err,
        stats: {
          totalStages: this.stages.length,
          successfulStages,
          failedStages: failedStages + 1,
          skippedStages,
          totalDuration,
          avgStageDuration: totalDuration / Math.max(1, this.stages.length),
        },
        stageResults,
      };
    }
  }
}

// ============================================================================
// 管道工厂
// ============================================================================

/** 创建管道构建器 */
function createPipeline<T = any>(): PipelineBuilder<T, any> {
  return new PipelineBuilderImpl<T, any>();
}

/** 创建并行管道 */
async function createParallelPipeline<T = any, R = any>(
  config: ParallelPipelineConfig<T, R>
): Promise<PipelineResult<R>> {
  const pipeline = createPipeline<T>()
    .parallel(config.branches, config.mergeFn as any);
  
  return await pipeline.execute(config.input, {
    concurrencyLimit: config.concurrencyLimit,
  });
}

// ============================================================================
// 内置转换器
// ============================================================================

const Transformers = {
  /** JSON 解析 */
  parseJson: <T = any>() => (data: string, context: PipelineContext): T => {
    return JSON.parse(data) as T;
  },

  /** JSON 序列化 */
  stringifyJson: () => (data: any, context: PipelineContext): string => {
    return JSON.stringify(data);
  },

  /** 对象转 Map */
  toMap: <K extends string | number, V>() => (data: Record<K, V>, context: PipelineContext): Map<K, V> => {
    return new Map(Object.entries(data) as [K, V][]);
  },

  /** Map 转对象 */
  toObject: <K extends string | number, V>() => (data: Map<K, V>, context: PipelineContext): Record<K, V> => {
    return Object.fromEntries(data) as Record<K, V>;
  },

  /** 数组去重 */
  deduplicate: <T>() => (data: T[], context: PipelineContext): T[] => {
    return Array.from(new Set(data));
  },

  /** 数组扁平化 */
  flatten: <T>(depth: number = 1) => (data: any[], context: PipelineContext): T[] => {
    return data.flat(depth);
  },

  /** 对象键转换 */
  transformKeys: (transformFn: (key: string) => string) => (data: Record<string, any>, context: PipelineContext): Record<string, any> => {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      result[transformFn(key)] = value;
    }
    return result;
  },

  /** 过滤空值 */
  compact: <T>() => (data: (T | null | undefined)[], context: PipelineContext): T[] => {
    return data.filter((item): item is T => item != null);
  },

  /** 分组 */
  groupBy: <T, K extends string | number>(keyFn: (item: T) => K) => (data: T[], context: PipelineContext): Record<K, T[]> => {
    return data.reduce((acc, item) => {
      const key = keyFn(item);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<K, T[]>);
  },

  /** 排序 */
  sort: <T>(compareFn: (a: T, b: T) => number) => (data: T[], context: PipelineContext): T[] => {
    return [...data].sort(compareFn);
  },

  /** 限制数量 */
  limit: <T>(maxCount: number) => (data: T[], context: PipelineContext): T[] => {
    return data.slice(0, maxCount);
  },

  /** 分页 */
  paginate: <T>(page: number, pageSize: number) => (data: T[], context: PipelineContext): { items: T[]; total: number; page: number; pageSize: number; totalPages: number } => {
    const total = data.length;
    const totalPages = Math.ceil(total / pageSize);
    const start = (page - 1) * pageSize;
    const items = data.slice(start, start + pageSize);
    return { items, total, page, pageSize, totalPages };
  },
};

// ============================================================================
// 内置验证器
// ============================================================================

const Validators = {
  /** 非空验证 */
  required: <T>() => (data: T, context: PipelineContext): boolean => {
    return data != null;
  },

  /** 数组验证 */
  isArray: () => (data: any, context: PipelineContext): boolean => {
    return Array.isArray(data);
  },

  /** 对象验证 */
  isObject: () => (data: any, context: PipelineContext): boolean => {
    return typeof data === 'object' && data !== null && !Array.isArray(data);
  },

  /** 字符串验证 */
  isString: () => (data: any, context: PipelineContext): boolean => {
    return typeof data === 'string';
  },

  /** 数字验证 */
  isNumber: () => (data: any, context: PipelineContext): boolean => {
    return typeof data === 'number' && !isNaN(data);
  },

  /** 最小长度验证 */
  minLength: (min: number) => (data: string | any[], context: PipelineContext): boolean => {
    return data.length >= min;
  },

  /** 最大长度验证 */
  maxLength: (max: number) => (data: string | any[], context: PipelineContext): boolean => {
    return data.length <= max;
  },

  /** 范围验证 */
  inRange: (min: number, max: number) => (data: number, context: PipelineContext): boolean => {
    return data >= min && data <= max;
  },

  /** 正则匹配 */
  matches: (pattern: RegExp) => (data: string, context: PipelineContext): boolean => {
    return pattern.test(data);
  },

  /** 自定义验证 */
  custom: <T>(predicate: (data: T, context: PipelineContext) => boolean) => predicate,
};

// ============================================================================
// 导出
// ============================================================================

export {
  // 核心类
  PipelineBuilderImpl,
  
  // 工厂函数
  createPipeline,
  createParallelPipeline,
  
  // 类型
  PipelineStage,
  PipelineContext,
  PipelineResult,
  StageResult,
  PipelineStats,
  ParallelPipelineConfig,
  PipelineBuilder,
  
  // 内置转换器
  Transformers,
  
  // 内置验证器
  Validators,
};

// ============================================================================
// 使用示例
// ============================================================================

/**
 * @example 基础管道
 * ```typescript
 * const pipeline = createPipeline<string>()
 *   .add('parse', Transformers.parseJson<User>())
 *   .add('validate', (data, ctx) => {
 *     if (!data.name) throw new Error('Name required');
 *     return data;
 *   })
 *   .add('transform', (data, ctx) => ({
 *     ...data,
 *     createdAt: new Date().toISOString()
 *   }))
 *   .retry(3, 100)
 *   .timeout(5000);
 * 
 * const result = await pipeline.execute('{"name": "Axon"}');
 * console.log(result.data); // { name: "Axon", createdAt: "..." }
 * ```
 */

/**
 * @example 并行管道
 * ```typescript
 * const result = await createParallelPipeline({
 *   name: 'multi-branch',
 *   input: { userId: 123 },
 *   branches: [
 *     {
 *       name: 'fetchUser',
 *       stages: [
 *         { name: 'fetch', processor: async (data) => await fetchUser(data.userId) }
 *       ]
 *     },
 *     {
 *       name: 'fetchOrders',
 *       stages: [
 *         { name: 'fetch', processor: async (data) => await fetchOrders(data.userId) }
 *       ]
 *     }
 *   ],
 *   mergeFn: (results) => ({
 *     user: results.fetchUser,
 *     orders: results.fetchOrders
 *   })
 * });
 * ```
 */

/**
 * @example 数据转换链
 * ```typescript
 * const pipeline = createPipeline<any[]>()
 *   .add('compact', Transformers.compact())
 *   .add('dedup', Transformers.deduplicate())
 *   .add('sort', Transformers.sort((a, b) => a.priority - b.priority))
 *   .add('limit', Transformers.limit(10))
 *   .add('paginate', Transformers.paginate(1, 5));
 * 
 * const result = await pipeline.execute(rawData);
 * ```
 */

/**
 * @example 错误处理
 * ```typescript
 * const pipeline = createPipeline<string>()
 *   .add('parse', Transformers.parseJson())
 *   .catch((error, ctx) => {
 *     console.error('Parse failed:', error.message);
 *     return { error: error.message, fallback: true };
 *   });
 * 
 * const result = await pipeline.execute('invalid json');
 * // result.success === true (因为错误被捕获)
 * // result.data === { error: "...", fallback: true }
 * ```
 */
