/**
 * Skill Invoker - 技能调用器
 * 
 * 功能:
 * 1. 技能调用 - 调用已注册技能的命令
 * 2. 参数验证 - 验证调用参数
 * 3. 错误处理 - 统一的错误处理
 * 4. 调用日志 - 记录调用历史
 */

import { SkillRegistry, Skill, Command } from './skill-registry';

// ============ 类型定义 ============

export interface InvokeOptions {
  timeout?: number; // 超时时间 (ms)
  retries?: number; // 重试次数
  params?: Record<string, unknown>; // 调用参数
}

export interface InvokeResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  skillName: string;
  commandName: string;
  duration?: number; // 执行耗时 (ms)
}

export interface InvokeLog {
  timestamp: Date;
  skillName: string;
  commandName: string;
  params?: Record<string, unknown>;
  success: boolean;
  error?: string;
  duration?: number;
}

export interface SkillInvokerConfig {
  registry: SkillRegistry;
  enableLogging?: boolean;
  maxLogSize?: number;
  defaultTimeout?: number;
}

// ============ 技能调用器类 ============

export class SkillInvoker {
  private registry: SkillRegistry;
  private enableLogging: boolean;
  private maxLogSize: number;
  private defaultTimeout: number;
  private logs: InvokeLog[] = [];

  constructor(config: SkillInvokerConfig) {
    this.registry = config.registry;
    this.enableLogging = config.enableLogging ?? true;
    this.maxLogSize = config.maxLogSize ?? 100;
    this.defaultTimeout = config.defaultTimeout ?? 30000; // 30 秒
  }

  /**
   * 调用技能命令
   * 
   * @param skillName 技能名称
   * @param commandName 命令名称
   * @param params 命令参数
   * @param options 调用选项
   * @returns InvokeResult 调用结果
   * 
   * @example
   * const result = await invokeSkill('git-ops', 'commit', {
   *   message: 'feat: add feature',
   *   files: ['*.ts']
   * });
   */
  async invoke<T = unknown>(
    skillName: string,
    commandName: string,
    params?: Record<string, unknown>,
    options?: InvokeOptions
  ): Promise<InvokeResult<T>> {
    const startTime = Date.now();
    
    // 1. 检查技能是否存在
    const skill = this.registry.getSkill(skillName);
    if (!skill) {
      const error = `技能 "${skillName}" 不存在`;
      console.error(`[SkillInvoker] ${error}`);
      return this.createErrorResult(skillName, commandName, error, startTime);
    }

    // 2. 检查技能是否启用
    if (skill.enabled === false) {
      const error = `技能 "${skillName}" 已禁用`;
      console.error(`[SkillInvoker] ${error}`);
      return this.createErrorResult(skillName, commandName, error, startTime);
    }

    // 3. 查找命令
    const command = skill.commands?.find(cmd => cmd.name === commandName);
    if (!command) {
      const error = `命令 "${commandName}" 在技能 "${skillName}" 中不存在`;
      console.error(`[SkillInvoker] ${error}`);
      return this.createErrorResult(skillName, commandName, error, startTime);
    }

    // 4. 执行命令
    try {
      const timeout = options?.timeout ?? this.defaultTimeout;
      const retries = options?.retries ?? 0;

      const result = await this.executeWithRetry<T>(command, params, retries, timeout);
      const duration = Date.now() - startTime;

      // 记录日志
      this.log({
        timestamp: new Date(),
        skillName,
        commandName,
        params,
        success: true,
        duration,
      });

      return {
        success: true,
        data: result as T,
        skillName,
        commandName,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      // 记录日志
      this.log({
        timestamp: new Date(),
        skillName,
        commandName,
        params,
        success: false,
        error: errorMessage,
        duration,
      });

      return this.createErrorResult(skillName, commandName, errorMessage, startTime);
    }
  }

  /**
   * 批量调用技能命令
   * 
   * @param calls 调用列表
   * @returns InvokeResult[] 调用结果列表
   * 
   * @example
   * const results = await batchInvoke([
   *   { skillName: 'git-ops', commandName: 'status' },
   *   { skillName: 'git-ops', commandName: 'commit', params: { message: 'update' } }
   * ]);
   */
  async batchInvoke(
    calls: Array<{
      skillName: string;
      commandName: string;
      params?: Record<string, unknown>;
      options?: InvokeOptions;
    }>
  ): Promise<InvokeResult[]> {
    const results: InvokeResult[] = [];

    for (const call of calls) {
      const result = await this.invoke(
        call.skillName,
        call.commandName,
        call.params,
        call.options
      );
      results.push(result);
    }

    return results;
  }

  /**
   * 并行调用技能命令
   * 
   * @param calls 调用列表
   * @returns InvokeResult[] 调用结果列表
   */
  async parallelInvoke(
    calls: Array<{
      skillName: string;
      commandName: string;
      params?: Record<string, unknown>;
      options?: InvokeOptions;
    }>
  ): Promise<InvokeResult[]> {
    return Promise.all(
      calls.map(call =>
        this.invoke(call.skillName, call.commandName, call.params, call.options)
      )
    );
  }

  /**
   * 获取调用日志
   * 
   * @param limit 返回日志数量
   * @returns InvokeLog[] 调用日志
   */
  getLogs(limit?: number): InvokeLog[] {
    const logs = [...this.logs].reverse(); // 最新的在前
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * 清空调用日志
   */
  clearLogs(): void {
    this.logs = [];
    console.log('[SkillInvoker] 已清空调用日志');
  }

  /**
   * 获取调用统计
   * 
   * @returns 统计信息
   */
  getStats(): {
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
    successRate: number;
    avgDuration: number;
  } {
    const totalCalls = this.logs.length;
    const successfulCalls = this.logs.filter(log => log.success).length;
    const failedCalls = totalCalls - successfulCalls;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;
    
    const durations = this.logs.filter(log => log.duration !== undefined).map(log => log.duration!);
    const avgDuration = durations.length > 0
      ? durations.reduce((sum, d) => sum + d, 0) / durations.length
      : 0;

    return {
      totalCalls,
      successfulCalls,
      failedCalls,
      successRate,
      avgDuration,
    };
  }

  /**
   * 执行带重试的命令
   */
  private async executeWithRetry<T>(
    command: Command,
    params?: Record<string, unknown>,
    retries: number = 0,
    timeout: number = 30000
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // 创建带超时的 Promise
        const result = await Promise.race<T>([
          command.handler(...(params ? [params] : [])) as Promise<T>,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`命令执行超时 (${timeout}ms)`)), timeout)
          ),
        ]);

        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt < retries) {
          console.warn(
            `[SkillInvoker] 命令 ${command.name} 执行失败，重试 ${attempt + 1}/${retries}`
          );
          // 指数退避
          await this.sleep(Math.pow(2, attempt) * 100);
        }
      }
    }

    throw lastError;
  }

  /**
   * 创建错误结果
   */
  private createErrorResult(
    skillName: string,
    commandName: string,
    error: string,
    startTime: number
  ): InvokeResult {
    return {
      success: false,
      error,
      skillName,
      commandName,
      duration: Date.now() - startTime,
    };
  }

  /**
   * 记录日志
   */
  private log(log: InvokeLog): void {
    if (!this.enableLogging) {
      return;
    }

    this.logs.push(log);

    // 限制日志大小
    if (this.logs.length > this.maxLogSize) {
      this.logs = this.logs.slice(-this.maxLogSize);
    }
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============ 便捷调用函数 ============

/**
 * 调用技能命令 (便捷函数)
 * 
 * @param skillName 技能名称
 * @param commandName 命令名称
 * @param params 命令参数
 * @returns InvokeResult 调用结果
 */
export async function invokeSkill<T = unknown>(
  skillName: string,
  commandName: string,
  params?: Record<string, unknown>
): Promise<InvokeResult<T>> {
  // 需要传入 registry，这里先返回一个错误
  return {
    success: false,
    error: '请先创建 SkillInvoker 实例并传入 SkillRegistry',
    skillName,
    commandName,
  };
}

// ============ 默认导出 ============

// 注意：默认导出需要传入 registry
// 使用示例:
// import { SkillInvoker, skillRegistry } from './skills';
// const invoker = new SkillInvoker({ registry: skillRegistry });
// const result = await invoker.invoke('git-ops', 'commit', { message: 'feat: add feature' });

export default SkillInvoker;
