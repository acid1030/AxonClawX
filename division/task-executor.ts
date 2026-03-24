/**
 * 分队任务执行器 - AxonClaw 核心组件
 * 
 * 负责分队接收 Axon 指令、执行任务并自动发送汇报
 */

import { Task, TaskResult } from '../../demo/src/types';

/**
 * 分队汇报接口
 */
export interface TaskReport {
  division: string;
  task: Task;
  result: TaskResult;
  timestamp: number;
  executionTimeMs: number;
}

/**
 * 汇报发送接口 - 可对接不同汇报渠道
 */
export interface ReportChannel {
  submit(report: TaskReport): Promise<boolean>;
}

/**
 * 默认汇报渠道 - 输出到控制台 (可扩展为消息队列、HTTP 等)
 */
export class ConsoleReportChannel implements ReportChannel {
  async submit(report: TaskReport): Promise<boolean> {
    console.log('\n📬 分队汇报');
    console.log('━━━━━━━━━━━━━━━━━━━━━');
    console.log(`分队：${report.division}`);
    console.log(`任务：${report.task.description}`);
    console.log(`状态：${report.result.status}`);
    console.log(`耗时：${report.executionTimeMs}ms`);
    console.log(`消息：${report.result.message}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━\n');
    return true;
  }
}

/**
 * 任务执行器配置
 */
export interface ExecutorConfig {
  channel: ReportChannel;
  timeoutMs?: number;
  retryCount?: number;
}

/**
 * 分队任务执行器
 */
export class DivisionTaskExecutor {
  private channel: ReportChannel;
  private timeoutMs: number;
  private retryCount: number;

  constructor(config: ExecutorConfig) {
    this.channel = config.channel;
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.retryCount = config.retryCount ?? 3;
  }

  /**
   * 执行分队任务
   * 
   * @param division 分队标识
   * @param task 任务定义
   * @returns 执行结果
   */
  async executeDivisionTask(division: string, task: Task): Promise<TaskResult> {
    const startTime = Date.now();
    
    console.log(`\n🎯 分队接收指令`);
    console.log(`  分队：${division}`);
    console.log(`  任务：${task.description}`);
    console.log(`  优先级：${task.priority}`);

    let result: TaskResult;
    let attempts = 0;

    // 执行任务 (带重试机制)
    while (attempts < this.retryCount) {
      try {
        result = await this.run(task);
        break;
      } catch (error) {
        attempts++;
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (attempts >= this.retryCount) {
          result = {
            status: 'failed',
            message: `执行失败 (尝试${attempts}次): ${errorMessage}`,
            data: null
          };
        } else {
          console.log(`  ⚠️ 重试 ${attempts}/${this.retryCount}: ${errorMessage}`);
        }
      }
    }

    const executionTimeMs = Date.now() - startTime;

    // 自动发送汇报
    await this.submitReport(division, task, result!, executionTimeMs);

    return result!;
  }

  /**
   * 运行任务 (核心执行逻辑)
   */
  private async run(task: Task): Promise<TaskResult> {
    // 模拟任务执行 (实际实现根据任务类型调用对应 Agent)
    console.log(`  ⟡ 执行任务：${task.type}`);
    
    // 这里可以集成实际的 Agent 调用
    // 例如：import { AgentOrchestrator } from '../orchestrator';
    
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          status: 'success',
          message: '任务执行完成',
          data: { taskType: task.type }
        });
      }, 100);
    });
  }

  /**
   * 提交汇报
   */
  private async submitReport(
    division: string,
    task: Task,
    result: TaskResult,
    executionTimeMs: number
  ): Promise<void> {
    const report: TaskReport = {
      division,
      task,
      result,
      timestamp: Date.now(),
      executionTimeMs
    };

    const success = await this.channel.submit(report);
    
    if (!success) {
      console.error(`  ⚠️ 汇报发送失败`);
    }
  }
}

// ============================================================================
// 便捷函数 (函数式 API)
// ============================================================================

/**
 * 执行分队任务 (便捷函数)
 * 
 * @param division 分队标识
 * @param task 任务定义
 * @param channel 汇报渠道 (可选，默认控制台)
 * @returns 执行结果
 */
export async function executeDivisionTask(
  division: string,
  task: Task,
  channel: ReportChannel = new ConsoleReportChannel()
): Promise<TaskResult> {
  const executor = new DivisionTaskExecutor({ channel });
  return executor.executeDivisionTask(division, task);
}

/**
 * 提交汇报 (便捷函数)
 */
export async function submitReport(
  division: string,
  task: Task,
  result: TaskResult,
  executionTimeMs: number = 0,
  channel: ReportChannel = new ConsoleReportChannel()
): Promise<boolean> {
  const report: TaskReport = {
    division,
    task,
    result,
    timestamp: Date.now(),
    executionTimeMs
  };
  return channel.submit(report);
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例 1: 基础用法
 */
export async function exampleBasicUsage() {
  const task: Task = {
    type: 'code_generation',
    description: '生成用户认证模块',
    priority: 'high'
  };

  const result = await executeDivisionTask('alpha-division', task);
  console.log('执行结果:', result);
}

/**
 * 使用示例 2: 自定义汇报渠道
 */
export class HttpReportChannel implements ReportChannel {
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  async submit(report: TaskReport): Promise<boolean> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(report)
      });
      return response.ok;
    } catch (error) {
      console.error('HTTP 汇报失败:', error);
      return false;
    }
  }
}

export async function exampleCustomChannel() {
  const task: Task = {
    type: 'documentation',
    description: '编写 API 文档',
    priority: 'medium'
  };

  const httpChannel = new HttpReportChannel('https://api.example.com/reports');
  const result = await executeDivisionTask('beta-division', task, httpChannel);
  console.log('执行结果:', result);
}

/**
 * 使用示例 3: 批量执行任务
 */
export async function exampleBatchExecution() {
  const tasks: Task[] = [
    { type: 'code_generation', description: '实现登录功能', priority: 'high' },
    { type: 'test_generation', description: '编写单元测试', priority: 'medium' },
    { type: 'documentation', description: '更新 README', priority: 'low' }
  ];

  const executor = new DivisionTaskExecutor({ channel: new ConsoleReportChannel() });

  for (const task of tasks) {
    await executor.executeDivisionTask('gamma-division', task);
  }
}

/**
 * 使用示例 4: 带错误处理
 */
export async function exampleWithErrorHandling() {
  const task: Task = {
    type: 'deployment',
    description: '部署到生产环境',
    priority: 'critical'
  };

  try {
    const result = await executeDivisionTask('delta-division', task);
    
    if (result.status === 'success') {
      console.log('✅ 部署成功');
    } else if (result.status === 'partial') {
      console.log('⚠️ 部分成功');
    } else {
      console.error('❌ 部署失败:', result.message);
    }
  } catch (error) {
    console.error('执行异常:', error);
  }
}

// 导出所有类型和类
export { Task, TaskResult } from '../../demo/src/types';
