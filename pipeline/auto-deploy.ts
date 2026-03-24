/**
 * Auto-Deploy Pipeline
 * 
 * 自动部署流水线：代码提交 → 自动触发部署 → 选择目标节点 → 执行 deploy 技能 → 汇报部署结果
 * 
 * 核心功能:
 * 1. 监听代码提交事件
 * 2. 获取已连接的节点列表
 * 3. 调用 deploy 技能执行部署
 * 4. 收集并汇报部署结果
 * 
 * @module AutoDeployPipeline
 */

import { deploy, DeployConfig, DeployResult } from '../../skills/deploy/deployer.js';
import { nodeConnector, NodeConnection } from '../node/node-connector.js';
import * as fs from 'fs';
import * as path from 'path';

// ============== 类型定义 ==============

/**
 * 提交信息接口
 */
export interface Commit {
  /** 提交哈希 */
  hash: string;
  /** 提交作者 */
  author: string;
  /** 提交邮箱 */
  email: string;
  /** 提交时间 */
  timestamp: number;
  /** 提交信息 */
  message: string;
  /** 分支名 */
  branch: string;
  /** 变更文件列表 */
  files: string[];
}

/**
 * 部署配置接口
 */
export interface AutoDeployConfig extends DeployConfig {
  /** 环境名称 */
  environment: string;
  /** 是否启用自动部署 */
  enabled: boolean;
  /** 部署过滤器 (可选) */
  filters?: {
    /** 只部署特定分支 */
    branches?: string[];
    /** 只部署特定路径的变更 */
    paths?: string[];
    /** 忽略特定路径的变更 */
    ignorePaths?: string[];
  };
}

/**
 * 部署任务接口
 */
export interface DeployTask {
  /** 任务 ID */
  id: string;
  /** 提交信息 */
  commit: Commit;
  /** 目标节点 */
  node: NodeConnection;
  /** 部署配置 */
  config: AutoDeployConfig;
  /** 任务状态 */
  status: 'pending' | 'running' | 'success' | 'failed';
  /** 部署结果 */
  result?: DeployResult;
  /** 错误信息 */
  error?: string;
  /** 开始时间 */
  startedAt?: number;
  /** 完成时间 */
  completedAt?: number;
}

/**
 * 部署报告接口
 */
export interface DeployReport {
  /** 部署是否成功 */
  success: boolean;
  /** 提交信息 */
  commit: Commit;
  /** 部署的节点数量 */
  totalNodes: number;
  /** 成功的节点数量 */
  successfulNodes: number;
  /** 失败的节点数量 */
  failedNodes: number;
  /** 各节点部署结果 */
  results: Array<{
    nodeId: string;
    nodeName: string;
    success: boolean;
    result?: DeployResult;
    error?: string;
  }>;
  /** 部署总耗时 (ms) */
  duration: number;
  /** 报告生成时间 */
  timestamp: number;
}

// ============== 日志工具 ==============

class PipelineLogger {
  private logs: string[] = [];
  private verbose: boolean;

  constructor(verbose: boolean = true) {
    this.verbose = verbose;
  }

  private format(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const log = `[${level}] ${timestamp} - ${message}${data ? ' ' + JSON.stringify(data) : ''}`;
    return log;
  }

  info(message: string, data?: any) {
    const log = this.format('INFO', message, data);
    this.logs.push(log);
    if (this.verbose) console.log(log);
  }

  warn(message: string, data?: any) {
    const log = this.format('WARN', message, data);
    this.logs.push(log);
    if (this.verbose) console.warn(log);
  }

  error(message: string, data?: any) {
    const log = this.format('ERROR', message, data);
    this.logs.push(log);
    console.error(log);
  }

  success(message: string, data?: any) {
    const log = this.format('SUCCESS', message, data);
    this.logs.push(log);
    if (this.verbose) console.log(log);
  }

  getLogs(): string[] {
    return this.logs;
  }

  clear() {
    this.logs = [];
  }
}

// ============== 自动部署流水线 ==============

export class AutoDeployPipeline {
  private logger: PipelineLogger;
  private tasks: Map<string, DeployTask> = new Map();
  private config: AutoDeployConfig;

  constructor(config: AutoDeployConfig) {
    this.logger = new PipelineLogger();
    this.config = config;
    this.logger.info('AutoDeployPipeline 初始化完成', { 
      environment: config.environment,
      target: config.target,
      enabled: config.enabled 
    });
  }

  /**
   * 获取已连接的节点列表
   */
  private async getConnectedNodes(): Promise<NodeConnection[]> {
    const connections = nodeConnector.getConnections();
    const connectedNodes = connections.filter(node => node.status === 'connected');
    
    this.logger.info('获取已连接节点', { 
      total: connections.length, 
      connected: connectedNodes.length 
    });
    
    return connectedNodes;
  }

  /**
   * 检查提交是否应该触发部署
   */
  private shouldDeploy(commit: Commit): boolean {
    if (!this.config.enabled) {
      this.logger.info('自动部署已禁用，跳过部署');
      return false;
    }

    const filters = this.config.filters;
    if (!filters) {
      return true;
    }

    // 检查分支过滤器
    if (filters.branches && filters.branches.length > 0) {
      if (!filters.branches.includes(commit.branch)) {
        this.logger.info('分支不在过滤器中，跳过部署', { 
          branch: commit.branch,
          allowed: filters.branches 
        });
        return false;
      }
    }

    // 检查路径过滤器
    if (filters.paths && filters.paths.length > 0) {
      const hasRelevantChanges = commit.files.some(file => 
        filters.paths!.some(pattern => file.includes(pattern))
      );
      
      if (!hasRelevantChanges) {
        this.logger.info('没有相关路径的变更，跳过部署', { 
          files: commit.files,
          patterns: filters.paths 
        });
        return false;
      }
    }

    // 检查忽略路径
    if (filters.ignorePaths && filters.ignorePaths.length > 0) {
      const hasIgnoredChanges = commit.files.some(file => 
        filters.ignorePaths!.some(pattern => file.includes(pattern))
      );
      
      if (hasIgnoredChanges) {
        this.logger.info('包含忽略路径的变更，跳过部署', { 
          files: commit.files,
          ignorePatterns: filters.ignorePaths 
        });
        return false;
      }
    }

    return true;
  }

  /**
   * 生成任务 ID
   */
  private generateTaskId(commit: Commit, nodeId: string): string {
    return `deploy-${commit.hash.slice(0, 7)}-${nodeId}-${Date.now()}`;
  }

  /**
   * 执行单个节点的部署
   */
  private async deployToNode(
    task: DeployTask,
    node: NodeConnection
  ): Promise<DeployResult> {
    const { commit, config } = task;
    
    this.logger.info(`开始部署到节点：${node.name}`, {
      nodeId: node.id,
      commit: commit.hash,
      branch: commit.branch
    });

    // 更新任务状态
    task.status = 'running';
    task.startedAt = Date.now();

    try {
      // 调用 deploy 技能执行部署
      const result = await deploy(config.environment, config);
      
      task.result = result;
      task.status = result.success ? 'success' : 'failed';
      task.completedAt = Date.now();

      if (result.success) {
        this.logger.success(`节点 ${node.name} 部署成功`, {
          version: result.version,
          duration: result.duration
        });
      } else {
        this.logger.error(`节点 ${node.name} 部署失败`, {
          logs: result.logs
        });
      }

      return result;
    } catch (error: any) {
      task.error = error.message;
      task.status = 'failed';
      task.completedAt = Date.now();
      
      this.logger.error(`节点 ${node.name} 部署异常`, {
        error: error.message,
        stack: error.stack
      });

      throw error;
    }
  }

  /**
   * 执行自动部署
   * 
   * 核心函数：代码提交 → 获取节点 → 并行部署 → 生成报告
   * 
   * @param commit 提交信息
   * @returns 部署报告
   */
  async execute(commit: Commit): Promise<DeployReport> {
    const startTime = Date.now();
    
    this.logger.info('========== 自动部署流水线启动 ==========');
    this.logger.info('接收提交事件', {
      hash: commit.hash,
      branch: commit.branch,
      author: commit.author,
      message: commit.message
    });

    // 1. 检查是否应该部署
    if (!this.shouldDeploy(commit)) {
      return {
        success: false,
        commit,
        totalNodes: 0,
        successfulNodes: 0,
        failedNodes: 0,
        results: [],
        duration: 0,
        timestamp: Date.now()
      };
    }

    // 2. 获取已连接的节点
    const nodes = await this.getConnectedNodes();
    
    if (nodes.length === 0) {
      this.logger.warn('没有已连接的节点，跳过部署');
      return {
        success: true,
        commit,
        totalNodes: 0,
        successfulNodes: 0,
        failedNodes: 0,
        results: [],
        duration: Date.now() - startTime,
        timestamp: Date.now()
      };
    }

    this.logger.info(`找到 ${nodes.length} 个已连接节点`, {
      nodes: nodes.map(n => ({ id: n.id, name: n.name }))
    });

    // 3. 创建部署任务
    const tasks: DeployTask[] = nodes.map(node => ({
      id: this.generateTaskId(commit, node.id),
      commit,
      node,
      config: this.config,
      status: 'pending'
    }));

    // 4. 并行执行部署
    const deployPromises = tasks.map(task => 
      this.deployToNode(task, task.node).catch(error => {
        task.error = error.message;
        task.status = 'failed';
        task.completedAt = Date.now();
        return null;
      })
    );

    const results = await Promise.all(deployPromises);

    // 5. 生成部署报告
    const successfulNodes = results.filter(r => r !== null && r.success).length;
    const failedNodes = results.filter(r => r === null || !r.success).length;
    const duration = Date.now() - startTime;

    const report: DeployReport = {
      success: failedNodes === 0,
      commit,
      totalNodes: nodes.length,
      successfulNodes,
      failedNodes,
      results: tasks.map((task, index) => ({
        nodeId: task.node.id,
        nodeName: task.node.name,
        success: task.status === 'success',
        result: task.result || undefined,
        error: task.error
      })),
      duration,
      timestamp: Date.now()
    };

    // 6. 汇报部署结果
    this.reportDeployment(report);

    this.logger.info('========== 自动部署流水线完成 ==========');
    this.logger.info('部署报告', {
      success: report.success,
      totalNodes: report.totalNodes,
      successfulNodes: report.successfulNodes,
      failedNodes: report.failedNodes,
      duration: `${duration}ms`
    });

    return report;
  }

  /**
   * 汇报部署结果
   * 
   * 可以通过多种方式汇报：
   * - 写入日志文件
   * - 发送到消息通道
   * - 调用 Webhook
   * - 更新数据库
   */
  private reportDeployment(report: DeployReport) {
    const reportPath = path.join(
      process.env.HOME || '',
      '.openclaw/logs/deploy-reports',
      `${report.commit.hash}-${Date.now()}.json`
    );

    const reportDir = path.dirname(reportPath);
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    this.logger.success('部署报告已保存', { path: reportPath });

    // TODO: 集成消息通知
    // - 发送 Discord/Slack 通知
    // - 调用 Webhook
    // - 发送邮件通知
  }

  /**
   * 获取任务状态
   */
  getTaskStatus(taskId: string): DeployTask | undefined {
    return this.tasks.get(taskId);
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): DeployTask[] {
    return Array.from(this.tasks.values());
  }

  /**
   * 清理旧任务
   */
  cleanupTasks(maxAge: number = 3600000) {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, task] of this.tasks.entries()) {
      if (task.completedAt && (now - task.completedAt) > maxAge) {
        this.tasks.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.info('清理旧任务', { cleaned });
    }
  }
}

// ============== 便捷函数 ==============

/**
 * 自动部署便捷函数
 * 
 * 核心代码实现：
 * ```typescript
 * async function autoDeploy(commit: Commit) {
 *   const nodes = await getConnectedNodes();
 *   for (const node of nodes) {
 *     await deploySkill.deploy(node, commit);
 *   }
 * }
 * ```
 * 
 * @param commit 提交信息
 * @param config 部署配置
 * @returns 部署报告
 */
export async function autoDeploy(
  commit: Commit,
  config: AutoDeployConfig
): Promise<DeployReport> {
  const pipeline = new AutoDeployPipeline(config);
  return pipeline.execute(commit);
}

/**
 * 获取已连接的节点
 */
export async function getConnectedNodes(): Promise<NodeConnection[]> {
  return nodeConnector.getConnections().filter(
    node => node.status === 'connected'
  );
}

// ============== Git Hook 集成 ==============

/**
 * 从 Git 提交对象创建 Commit
 */
export function createCommitFromGit(
  hash: string,
  author: string,
  email: string,
  timestamp: number,
  message: string,
  branch: string,
  files: string[]
): Commit {
  return {
    hash,
    author,
    email,
    timestamp,
    message,
    branch,
    files
  };
}

/**
 * 解析 Git post-receive hook 数据
 */
export function parseGitHookData(input: string): Array<{
  oldHash: string;
  newHash: string;
  branch: string;
}> {
  return input
    .trim()
    .split('\n')
    .map(line => {
      const [oldHash, newHash, ref] = line.split(/\s+/);
      const branch = ref.replace('refs/heads/', '');
      return { oldHash, newHash, branch };
    });
}

// ============== 导出 ==============

export {
  AutoDeployPipeline,
  PipelineLogger,
  Commit,
  AutoDeployConfig,
  DeployTask,
  DeployReport
};
