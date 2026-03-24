/**
 * Template Method Pattern Pro Skill - 专业模板方法模式工具
 * 
 * 功能:
 * 1. 模板定义 - 抽象类定义算法骨架
 * 2. 钩子方法 - 可选的生命周期钩子
 * 3. 算法骨架 - 固定的执行流程
 * 
 * 核心优势:
 * - 代码复用：不变逻辑集中在模板
 * - 灵活扩展：子类只关注核心逻辑
 * - 质量控制：统一的验证、错误处理、日志
 * - 可维护性：清晰的层次结构
 */

// ============== 类型定义 ==============

/**
 * 执行上下文接口
 */
interface ExecutionContext<T = any> {
  /** 输入数据 */
  input: T;
  /** 处理结果 */
  result?: any;
  /** 执行时间戳 */
  timestamp: number;
  /** 执行 ID */
  executionId: string;
  /** 元数据 */
  metadata: Record<string, any>;
}

/**
 * 技能配置接口
 */
interface SkillConfig {
  /** 是否启用详细日志 */
  verbose?: boolean;
  /** 是否启用性能追踪 */
  trackPerformance?: boolean;
  /** 超时时间 (ms) */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 自定义元数据 */
  metadata?: Record<string, any>;
}

/**
 * 技能统计信息
 */
interface SkillMetrics {
  /** 执行次数 */
  executionCount: number;
  /** 平均执行时间 (ms) */
  avgExecutionTime: number;
  /** 成功次数 */
  successCount: number;
  /** 失败次数 */
  failureCount: number;
  /** 最近执行时间 */
  lastExecutionTime?: number;
}

// ============== 抽象模板类 (专业版) ==============

abstract class SkillTemplatePro<TInput = any, TOutput = any> {
  /** 技能配置 */
  protected config: SkillConfig;
  
  /** 执行统计 */
  protected metrics: SkillMetrics = {
    executionCount: 0,
    avgExecutionTime: 0,
    successCount: 0,
    failureCount: 0
  };

  /** 当前执行上下文 */
  protected context?: ExecutionContext<TInput>;

  constructor(config: SkillConfig = {}) {
    this.config = {
      verbose: false,
      trackPerformance: true,
      timeout: 30000,
      retries: 0,
      ...config
    };
  }

  /**
   * 🎯 模板方法 - 定义算法骨架 (final 防止子类修改)
   * 
   * 执行流程:
   * 1. 初始化上下文
   * 2. 验证输入
   * 3. 前置钩子 (beforeExecute)
   * 4. 核心处理 (coreProcess - 抽象方法)
   * 5. 后置钩子 (afterExecute)
   * 6. 格式化输出
   * 7. 清理资源
   */
  public async execute(input: TInput): Promise<TOutput> {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();
    
    // 1. 初始化上下文
    this.context = {
      input,
      timestamp: startTime,
      executionId,
      metadata: { ...this.config.metadata }
    };

    this.log(`[Skill] 开始执行：${this.name} (ID: ${executionId})`);

    try {
      // 2. 验证输入
      this.log('[Skill] 步骤 1/6: 验证输入');
      await this.validateInput(input);

      // 3. 前置钩子
      this.log('[Skill] 步骤 2/6: 执行前置钩子');
      await this.beforeExecute(input);

      // 4. 核心处理 (带超时控制)
      this.log('[Skill] 步骤 3/6: 核心处理');
      const coreProcessPromise = this.coreProcess(input);
      const result = await this.withTimeout(
        coreProcessPromise,
        this.config.timeout,
        `核心处理超时 (${this.config.timeout}ms)`
      );
      this.context.result = result;

      // 5. 后置钩子
      this.log('[Skill] 步骤 4/6: 执行后置钩子');
      await this.afterExecute(result);

      // 6. 格式化输出
      this.log('[Skill] 步骤 5/6: 格式化输出');
      const output = this.formatOutput(result);

      // 7. 更新统计
      const executionTime = Date.now() - startTime;
      this.updateMetrics(executionTime, true);
      this.log(`[Skill] 执行完成：${this.name} (${executionTime}ms)`);

      // 8. 清理资源
      this.log('[Skill] 步骤 6/6: 清理资源');
      await this.cleanup();

      return output;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.updateMetrics(executionTime, false);
      this.log(`[Skill] 执行失败：${this.name} - ${error instanceof Error ? error.message : String(error)}`);
      
      // 错误处理钩子
      await this.onError(error as Error);
      
      // 清理资源
      await this.cleanup();
      
      throw error;
    }
  }

  /**
   * 技能名称 (钩子方法 - 可覆盖)
   */
  protected get name(): string {
    return this.constructor.name;
  }

  /**
   * 验证输入 (钩子方法 - 默认实现)
   */
  protected async validateInput(input: TInput): Promise<void> {
    if (input === null || input === undefined) {
      throw new Error('输入不能为空');
    }
    // 子类可覆盖添加更详细的验证
  }

  /**
   * 前置钩子 (钩子方法 - 可选覆盖)
   * 在核心处理之前执行
   */
  protected async beforeExecute(input: TInput): Promise<void> {
    // 默认空实现，子类可选择性覆盖
  }

  /**
   * 核心处理 (抽象方法 - 必须实现)
   * 子类必须实现具体的业务逻辑
   */
  protected abstract coreProcess(input: TInput): Promise<any>;

  /**
   * 后置钩子 (钩子方法 - 可选覆盖)
   * 在核心处理之后执行
   */
  protected async afterExecute(result: any): Promise<void> {
    // 默认空实现，子类可选择性覆盖
  }

  /**
   * 格式化输出 (抽象方法 - 必须实现)
   * 将处理结果转换为标准输出格式
   */
  protected abstract formatOutput(result: any): TOutput;

  /**
   * 错误处理钩子 (钩子方法 - 可选覆盖)
   */
  protected async onError(error: Error): Promise<void> {
    // 默认空实现，子类可选择性覆盖
    // 可用于日志记录、告警等
  }

  /**
   * 清理资源钩子 (钩子方法 - 可选覆盖)
   */
  protected async cleanup(): Promise<void> {
    // 默认空实现，子类可选择性覆盖
    // 可用于关闭连接、释放内存等
  }

  /**
   * 获取技能统计信息
   */
  public getMetrics(): SkillMetrics {
    return { ...this.metrics };
  }

  /**
   * 重置统计信息
   */
  public resetMetrics(): void {
    this.metrics = {
      executionCount: 0,
      avgExecutionTime: 0,
      successCount: 0,
      failureCount: 0
    };
  }

  // ============== 辅助方法 ==============

  /**
   * 生成执行 ID
   */
  private generateExecutionId(): string {
    return `${this.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 更新统计信息
   */
  private updateMetrics(executionTime: number, success: boolean): void {
    this.metrics.executionCount++;
    this.metrics.lastExecutionTime = executionTime;
    
    if (success) {
      this.metrics.successCount++;
    } else {
      this.metrics.failureCount++;
    }

    // 计算平均执行时间
    const totalExecutions = this.metrics.successCount + this.metrics.failureCount;
    this.metrics.avgExecutionTime = Math.round(
      (this.metrics.avgExecutionTime * (totalExecutions - 1) + executionTime) / totalExecutions
    );
  }

  /**
   * 带超时的 Promise 执行
   */
  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string
  ): Promise<T> {
    if (!timeoutMs || timeoutMs <= 0) {
      return promise;
    }

    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  }

  /**
   * 日志输出 (根据配置决定是否输出)
   */
  protected log(message: string): void {
    if (this.config.verbose) {
      console.log(message);
    }
  }
}

// ============== 具体技能实现 1: 数据转换技能 ==============

interface DataTransformInput {
  data: any[];
  transformType: 'double' | 'uppercase' | 'lowercase' | 'reverse';
}

interface DataTransformOutput {
  type: 'data_transform';
  success: boolean;
  originalCount: number;
  transformedCount: number;
  data: any[];
  transformType: string;
  executionTime: number;
}

class DataTransformSkill extends SkillTemplatePro<DataTransformInput, DataTransformOutput> {
  protected override async validateInput(input: DataTransformInput): Promise<void> {
    await super.validateInput(input);
    
    if (!Array.isArray(input.data)) {
      throw new Error('data 必须是数组');
    }
    
    if (!['double', 'uppercase', 'lowercase', 'reverse'].includes(input.transformType)) {
      throw new Error('无效的转换类型');
    }
  }

  protected override async beforeExecute(input: DataTransformInput): Promise<void> {
    this.log(`[DataTransform] 准备转换：${input.transformType}, 数据量：${input.data.length}`);
  }

  protected async coreProcess(input: DataTransformInput): Promise<any> {
    const { data, transformType } = input;
    
    return data.map((item, index) => {
      switch (transformType) {
        case 'double':
          return typeof item === 'number' ? item * 2 : item;
        case 'uppercase':
          return typeof item === 'string' ? item.toUpperCase() : item;
        case 'lowercase':
          return typeof item === 'string' ? item.toLowerCase() : item;
        case 'reverse':
          return typeof item === 'string' ? item.split('').reverse().join('') : item;
        default:
          return item;
      }
    });
  }

  protected override async afterExecute(result: any): Promise<void> {
    this.log(`[DataTransform] 转换完成：处理了 ${result.length} 条数据`);
  }

  protected formatOutput(result: any): DataTransformOutput {
    return {
      type: 'data_transform',
      success: true,
      originalCount: this.context!.input.data.length,
      transformedCount: result.length,
      data: result,
      transformType: this.context!.input.transformType,
      executionTime: this.metrics.lastExecutionTime || 0
    };
  }
}

// ============== 具体技能实现 2: 文件处理技能 ==============

interface FileProcessInput {
  filePath: string;
  operation: 'read' | 'write' | 'append' | 'delete';
  content?: string;
  encoding?: string;
}

interface FileProcessOutput {
  type: 'file_process';
  success: boolean;
  operation: string;
  filePath: string;
  fileSize?: number;
  content?: string;
  timestamp: number;
}

class FileProcessSkill extends SkillTemplatePro<FileProcessInput, FileProcessOutput> {
  protected override async validateInput(input: FileProcessInput): Promise<void> {
    await super.validateInput(input);
    
    if (!input.filePath || typeof input.filePath !== 'string') {
      throw new Error('有效的文件路径是必需的');
    }
    
    if (!['read', 'write', 'append', 'delete'].includes(input.operation)) {
      throw new Error('无效的操作类型');
    }
    
    if (['write', 'append'].includes(input.operation) && !input.content) {
      throw new Error('写入操作需要提供内容');
    }
  }

  protected async coreProcess(input: FileProcessInput): Promise<any> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const fullPath = path.resolve(input.filePath);
    
    switch (input.operation) {
      case 'read':
        const content = await fs.readFile(fullPath, {
          encoding: (input.encoding as BufferEncoding) || 'utf-8'
        });
        return { content, size: content.length };
      
      case 'write':
        await fs.writeFile(fullPath, input.content!, {
          encoding: (input.encoding as BufferEncoding) || 'utf-8'
        });
        return { written: true, size: input.content!.length };
      
      case 'append':
        await fs.appendFile(fullPath, input.content!, {
          encoding: (input.encoding as BufferEncoding) || 'utf-8'
        });
        return { appended: true };
      
      case 'delete':
        await fs.unlink(fullPath);
        return { deleted: true };
      
      default:
        throw new Error('不支持的操作');
    }
  }

  protected formatOutput(result: any): FileProcessOutput {
    const input = this.context!.input;
    return {
      type: 'file_process',
      success: true,
      operation: input.operation,
      filePath: input.filePath,
      fileSize: result.size,
      content: result.content,
      timestamp: Date.now()
    };
  }

  protected override async onError(error: Error): Promise<void> {
    this.log(`[FileProcess] 文件操作错误：${error.message}`);
    // 这里可以添加错误日志记录、告警等逻辑
  }
}

// ============== 具体技能实现 3: HTTP 请求技能 ==============

interface HttpRequestInput {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
}

interface HttpRequestOutput {
  type: 'http_request';
  success: boolean;
  status: number;
  statusText: string;
  data: any;
  headers: Record<string, string>;
  responseTime: number;
}

class HttpRequestSkill extends SkillTemplatePro<HttpRequestInput, HttpRequestOutput> {
  protected override async validateInput(input: HttpRequestInput): Promise<void> {
    await super.validateInput(input);
    
    if (!input.url || typeof input.url !== 'string') {
      throw new Error('有效的 URL 是必需的');
    }
    
    try {
      new URL(input.url);
    } catch {
      throw new Error('URL 格式无效');
    }
  }

  protected override async beforeExecute(input: HttpRequestInput): Promise<void> {
    this.log(`[HttpRequest] 准备请求：${input.method || 'GET'} ${input.url}`);
  }

  protected async coreProcess(input: HttpRequestInput): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), input.timeout || 30000);
    
    try {
      const response = await fetch(input.url, {
        method: input.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...input.headers
        },
        body: input.body ? JSON.stringify(input.body) : undefined,
        signal: controller.signal
      });
      
      const data = await response.json().catch(() => null);
      
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      
      return {
        status: response.status,
        statusText: response.statusText,
        data,
        headers
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  protected formatOutput(result: any): HttpRequestOutput {
    return {
      type: 'http_request',
      success: result.status >= 200 && result.status < 300,
      status: result.status,
      statusText: result.statusText,
      data: result.data,
      headers: result.headers,
      responseTime: this.metrics.lastExecutionTime || 0
    };
  }

  protected override async onError(error: Error): Promise<void> {
    if (error.name === 'AbortError') {
      this.log('[HttpRequest] 请求超时');
    } else {
      this.log(`[HttpRequest] 请求失败：${error.message}`);
    }
  }
}

// ============== 具体技能实现 4: 数据库操作技能 ==============

interface DatabaseOperationInput {
  operation: 'query' | 'insert' | 'update' | 'delete';
  table: string;
  data?: Record<string, any>;
  where?: Record<string, any>;
}

interface DatabaseOperationOutput {
  type: 'database_operation';
  success: boolean;
  operation: string;
  table: string;
  affectedRows?: number;
  data?: any[];
  timestamp: number;
}

class DatabaseOperationSkill extends SkillTemplatePro<DatabaseOperationInput, DatabaseOperationOutput> {
  // 模拟数据库连接
  private mockDb = new Map<string, any[]>();

  protected override async validateInput(input: DatabaseOperationInput): Promise<void> {
    await super.validateInput(input);
    
    if (!input.table || typeof input.table !== 'string') {
      throw new Error('表名是必需的');
    }
    
    if (!['query', 'insert', 'update', 'delete'].includes(input.operation)) {
      throw new Error('无效的操作类型');
    }
  }

  protected async coreProcess(input: DatabaseOperationInput): Promise<any> {
    // 模拟数据库操作 (实际使用时替换为真实数据库连接)
    await new Promise(resolve => setTimeout(resolve, 50));
    
    if (!this.mockDb.has(input.table)) {
      this.mockDb.set(input.table, []);
    }
    
    const table = this.mockDb.get(input.table)!;
    
    switch (input.operation) {
      case 'query':
        if (input.where) {
          return table.filter(row =>
            Object.entries(input.where!).every(([key, value]) => row[key] === value)
          );
        }
        return [...table];
      
      case 'insert':
        if (!input.data) throw new Error('插入数据不能为空');
        const newRow = { id: Date.now(), ...input.data };
        table.push(newRow);
        return { affectedRows: 1, insertedId: newRow.id };
      
      case 'update':
        if (!input.data || !input.where) {
          throw new Error('更新操作需要 data 和 where 条件');
        }
        let updated = 0;
        table.forEach(row => {
          const matches = Object.entries(input.where!).every(([key, value]) => row[key] === value);
          if (matches) {
            Object.assign(row, input.data);
            updated++;
          }
        });
        return { affectedRows: updated };
      
      case 'delete':
        if (!input.where) {
          throw new Error('删除操作需要 where 条件');
        }
        const initialLength = table.length;
        const filtered = table.filter(row =>
          !Object.entries(input.where!).every(([key, value]) => row[key] === value)
        );
        this.mockDb.set(input.table, filtered);
        return { affectedRows: initialLength - filtered.length };
      
      default:
        throw new Error('不支持的操作');
    }
  }

  protected formatOutput(result: any): DatabaseOperationOutput {
    const input = this.context!.input;
    return {
      type: 'database_operation',
      success: true,
      operation: input.operation,
      table: input.table,
      affectedRows: result.affectedRows,
      data: Array.isArray(result) ? result : undefined,
      timestamp: Date.now()
    };
  }

  protected override async cleanup(): Promise<void> {
    this.log('[DatabaseOperation] 清理数据库连接');
    // 实际使用时关闭数据库连接
  }
}

// ============== 使用示例 ==============

async function demonstrateUsage() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     模板方法模式 Pro - 使用示例                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // 示例 1: 数据转换技能
  console.log('━━━ 示例 1: 数据转换技能 ━━━');
  const transformSkill = new DataTransformSkill({ verbose: true });
  const transformResult = await transformSkill.execute({
    data: [1, 2, 3, 4, 5],
    transformType: 'double'
  });
  console.log('转换结果:', JSON.stringify(transformResult, null, 2));
  console.log('统计信息:', transformSkill.getMetrics());
  console.log();

  // 示例 2: 文件处理技能
  console.log('━━━ 示例 2: 文件处理技能 ━━━');
  const fileSkill = new FileProcessSkill({ verbose: true, timeout: 5000 });
  try {
    const fileResult = await fileSkill.execute({
      filePath: './test.txt',
      operation: 'read',
      encoding: 'utf-8'
    });
    console.log('文件读取结果:', JSON.stringify(fileResult, null, 2));
  } catch (error) {
    console.log('文件操作示例 (预期会失败，因为文件不存在):', (error as Error).message);
  }
  console.log();

  // 示例 3: HTTP 请求技能
  console.log('━━━ 示例 3: HTTP 请求技能 ━━━');
  const httpSkill = new HttpRequestSkill({ verbose: true, timeout: 10000 });
  try {
    const httpResult = await httpSkill.execute({
      url: 'https://jsonplaceholder.typicode.com/posts/1',
      method: 'GET'
    });
    console.log('HTTP 请求结果:', JSON.stringify(httpResult, null, 2));
    console.log('统计信息:', httpSkill.getMetrics());
  } catch (error) {
    console.log('HTTP 请求失败:', (error as Error).message);
  }
  console.log();

  // 示例 4: 数据库操作技能
  console.log('━━━ 示例 4: 数据库操作技能 ━━━');
  const dbSkill = new DatabaseOperationSkill({ verbose: true });
  
  // 插入数据
  await dbSkill.execute({
    operation: 'insert',
    table: 'users',
    data: { name: 'Alice', age: 25 }
  });
  
  await dbSkill.execute({
    operation: 'insert',
    table: 'users',
    data: { name: 'Bob', age: 30 }
  });
  
  // 查询数据
  const queryResult = await dbSkill.execute({
    operation: 'query',
    table: 'users',
    where: { age: 25 }
  });
  console.log('查询结果:', JSON.stringify(queryResult, null, 2));
  console.log('统计信息:', dbSkill.getMetrics());
  console.log();

  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║     演示完成 ✅                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');
}

// ============== 导出 ==============

export {
  // 类型
  type ExecutionContext,
  type SkillConfig,
  type SkillMetrics,
  type DataTransformInput,
  type DataTransformOutput,
  type FileProcessInput,
  type FileProcessOutput,
  type HttpRequestInput,
  type HttpRequestOutput,
  type DatabaseOperationInput,
  type DatabaseOperationOutput,
  
  // 类
  SkillTemplatePro,
  DataTransformSkill,
  FileProcessSkill,
  HttpRequestSkill,
  DatabaseOperationSkill,
  
  // 演示函数
  demonstrateUsage
};

// 如果直接运行此文件，执行演示
if (typeof require !== 'undefined' && require.main === module) {
  demonstrateUsage().catch(console.error);
}
