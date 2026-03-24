/**
 * Agent Monitor - Agent 状态监控系统
 * 
 * 核心功能:
 * 1. 状态检测 - 活跃/空闲/超时/失败，每 30 秒检查一次
 * 2. 空闲阈值告警 - >1min 警告，>5min 严重，>15min 事故自动杀掉
 * 3. 性能指标 - Token 使用量、任务完成时间、成功率统计
 * 4. 自动优化 - 识别低效任务、建议任务拆分、推荐模型选择
 * 
 * @author Axon (via NOVA)
 * @version 1.0
 * @created 2026-03-13
 */

import { EventEmitter } from 'events';
import { Agent, AgentStatus, Task, TaskStatus } from './task-scheduler';

// ==================== 类型定义 ====================

/**
 * Agent 运行状态
 */
export enum MonitorAgentStatus {
  ACTIVE = 'active',      // 活跃 - 正在执行任务
  IDLE = 'idle',          // 空闲 - 无任务但在线
  TIMEOUT = 'timeout',    // 超时 - 超过阈值无响应
  FAILED = 'failed',      // 失败 - 任务执行失败
  TERMINATED = 'terminated' // 已终止 - 因事故被杀掉
}

/**
 * 告警级别
 */
export enum AlertLevel {
  INFO = 'info',          // 信息
  WARNING = 'warning',    // 🟡 警告 (>1min)
  CRITICAL = 'critical',  // 🟠 严重 (>5min)
  ACCIDENT = 'accident'   // 🔴 事故 (>15min)
}

/**
 * 告警配置
 */
export interface AlertThresholds {
  warningThreshold: number;      // 毫秒，默认 60000 (1min)
  criticalThreshold: number;     // 毫秒，默认 300000 (5min)
  accidentThreshold: number;     // 毫秒，默认 900000 (15min)
  checkInterval: number;         // 毫秒，默认 30000 (30s)
}

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  agentId: string;
  tokenUsage: number;            // Token 使用量
  taskCount: number;             // 完成任务数
  avgTaskDuration: number;       // 平均任务完成时间 (毫秒)
  successRate: number;           // 成功率 (0-1)
  efficiency: number;            // 效率分数 (0-100)
  lastTaskDuration: number;      // 上次任务耗时
  peakTokenUsage: number;        // 峰值 Token 使用
  avgTokensPerTask: number;      // 平均每任务 Token
}

/**
 * 任务效率分析
 */
export interface TaskEfficiencyAnalysis {
  taskId: string;
  estimatedDuration: number;
  actualDuration: number;
  efficiencyRatio: number;       // actual/estimated
  tokenUsage: number;
  isEfficient: boolean;          // 是否高效
  suggestions: string[];         // 优化建议
}

/**
 * 模型推荐
 */
export interface ModelRecommendation {
  taskId: string;
  taskType: string;
  recommendedModel: string;
  reason: string;
  expectedImprovement: number;   // 预期提升百分比
}

/**
 * 告警事件
 */
export interface AlertEvent {
  level: AlertLevel;
  agentId: string;
  agentName: string;
  message: string;
  idleTime: number;
  timestamp: number;
  action?: string;               // 采取的行动
}

/**
 * 状态变化历史
 */
export interface StatusChangeHistory {
  agentId: string;
  fromStatus: MonitorAgentStatus;
  toStatus: MonitorAgentStatus;
  timestamp: number;
  reason?: string;
}

/**
 * 监控仪表板数据
 */
export interface DashboardData {
  summary: {
    totalAgents: number;
    activeAgents: number;
    idleAgents: number;
    timeoutAgents: number;
    failedAgents: number;
    terminatedAgents: number;
  };
  alerts: {
    warnings: number;
    criticals: number;
    accidents: number;
    recent: AlertEvent[];
  };
  performance: {
    avgSuccessRate: number;
    avgEfficiency: number;
    totalTokensUsed: number;
    totalTasksCompleted: number;
  };
  agents: AgentMonitorData[];
}

/**
 * 单个 Agent 的监控数据
 */
export interface AgentMonitorData {
  id: string;
  name: string;
  status: MonitorAgentStatus;
  currentTaskId?: string;
  idleTime: number;              // 毫秒
  lastActiveAt: number;
  metrics: PerformanceMetrics;
  alerts: AlertEvent[];
  statusHistory: StatusChangeHistory[];
}

/**
 * 监控配置
 */
export interface MonitorConfig {
  thresholds: AlertThresholds;
  enableAutoTerminate: boolean;  // 是否自动杀掉事故 Agent
  enableMetrics: boolean;        // 是否收集性能指标
  enableOptimization: boolean;   // 是否启用自动优化
  historyLimit: number;          // 历史记录保留条数
}

// ==================== 默认配置 ====================

const DEFAULT_CONFIG: MonitorConfig = {
  thresholds: {
    warningThreshold: 60000,     // 1min
    criticalThreshold: 300000,   // 5min
    accidentThreshold: 900000,   // 15min
    checkInterval: 30000         // 30s
  },
  enableAutoTerminate: true,
  enableMetrics: true,
  enableOptimization: true,
  historyLimit: 100
};

// ==================== Agent 状态监控器 ====================

class AgentStateMonitor {
  private agentStates: Map<string, AgentMonitorData> = new Map();
  private alertHistory: AlertEvent[] = [];
  private statusHistory: StatusChangeHistory[] = [];
  private checkTimer?: NodeJS.Timeout;
  private isRunning: boolean = false;
  private config: MonitorConfig;

  constructor(config?: Partial<MonitorConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      thresholds: {
        ...DEFAULT_CONFIG.thresholds,
        ...config?.thresholds
      }
    };
  }

  // ==================== 生命周期 ====================

  /**
   * 启动监控
   */
  start(): void {
    if (this.isRunning) {
      console.warn('[AgentMonitor] 监控已在运行中');
      return;
    }

    this.isRunning = true;
    this.startChecking();
    console.log('[AgentMonitor] 监控已启动，检查间隔:', this.config.thresholds.checkInterval / 1000, '秒');
  }

  /**
   * 停止监控
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = undefined;
    }
    console.log('[AgentMonitor] 监控已停止');
  }

  /**
   * 启动定期检查
   */
  private startChecking(): void {
    const check = () => {
      if (!this.isRunning) return;

      this.checkAllAgents();
      
      this.checkTimer = setTimeout(
        check,
        this.config.thresholds.checkInterval
      );
    };

    check();
  }

  // ==================== Agent 管理 ====================

  /**
   * 注册 Agent 进行监控
   */
  registerAgent(agent: Agent): void {
    const monitorData: AgentMonitorData = {
      id: agent.id,
      name: agent.name,
      status: this.mapAgentStatus(agent.status),
      currentTaskId: agent.currentTaskId,
      idleTime: 0,
      lastActiveAt: agent.lastActiveAt,
      metrics: {
        agentId: agent.id,
        tokenUsage: 0,
        taskCount: agent.completedTasks,
        avgTaskDuration: 0,
        successRate: 1.0,
        efficiency: 100,
        lastTaskDuration: 0,
        peakTokenUsage: 0,
        avgTokensPerTask: 0
      },
      alerts: [],
      statusHistory: []
    };

    this.agentStates.set(agent.id, monitorData);
    this.recordStatusChange(agent.id, MonitorAgentStatus.ACTIVE, this.mapAgentStatus(agent.status), 'Agent 注册');
    console.log(`[AgentMonitor] Agent 已注册：${agent.name}`);
  }

  /**
   * 注销 Agent
   */
  unregisterAgent(agentId: string): boolean {
    const success = this.agentStates.delete(agentId);
    if (success) {
      console.log(`[AgentMonitor] Agent 已注销：${agentId}`);
    }
    return success;
  }

  /**
   * 更新 Agent 状态
   */
  updateAgentStatus(agentId: string, newStatus: AgentStatus, taskId?: string): void {
    const monitorData = this.agentStates.get(agentId);
    if (!monitorData) return;

    const oldStatus = monitorData.status;
    const mappedStatus = this.mapAgentStatus(newStatus);

    if (oldStatus !== mappedStatus) {
      monitorData.status = mappedStatus;
      monitorData.lastActiveAt = Date.now();
      monitorData.currentTaskId = taskId;
      
      this.recordStatusChange(agentId, oldStatus, mappedStatus, '状态更新');
    }

    // 更新空闲时间
    monitorData.idleTime = taskId ? 0 : Date.now() - monitorData.lastActiveAt;
  }

  /**
   * 更新性能指标
   */
  updateMetrics(agentId: string, metrics: Partial<PerformanceMetrics>): void {
    const monitorData = this.agentStates.get(agentId);
    if (!monitorData) return;

    const oldMetrics = monitorData.metrics;
    monitorData.metrics = {
      ...oldMetrics,
      ...metrics
    };

    // 更新峰值
    if (metrics.tokenUsage !== undefined) {
      monitorData.metrics.peakTokenUsage = Math.max(
        monitorData.metrics.peakTokenUsage,
        metrics.tokenUsage
      );
    }

    // 重新计算效率
    monitorData.metrics.efficiency = this.calculateEfficiency(monitorData.metrics);
  }

  /**
   * 记录任务完成
   */
  onTaskCompleted(
    agentId: string,
    taskId: string,
    duration: number,
    tokenUsage: number,
    success: boolean
  ): void {
    const monitorData = this.agentStates.get(agentId);
    if (!monitorData) return;

    const metrics = monitorData.metrics;
    
    // 更新任务计数
    metrics.taskCount++;
    
    // 更新平均耗时 (滑动平均)
    metrics.avgTaskDuration = (
      (metrics.avgTaskDuration * (metrics.taskCount - 1) + duration) /
      metrics.taskCount
    );
    
    // 更新上次任务耗时
    metrics.lastTaskDuration = duration;
    
    // 更新 Token 使用
    metrics.tokenUsage += tokenUsage;
    metrics.avgTokensPerTask = metrics.tokenUsage / metrics.taskCount;
    
    // 更新成功率
    const totalTasks = metrics.taskCount;
    const successfulTasks = success ? 
      (metrics.successRate * (totalTasks - 1)) + 1 :
      (metrics.successRate * (totalTasks - 1));
    metrics.successRate = successfulTasks / totalTasks;

    // 重新计算效率
    metrics.efficiency = this.calculateEfficiency(metrics);

    console.log(
      `[AgentMonitor] 任务完成：${taskId} by ${agentId}, ` +
      `耗时：${duration}ms, Token: ${tokenUsage}, 成功：${success}`
    );
  }

  // ==================== 状态检测 ====================

  /**
   * 检查所有 Agent 状态
   */
  private checkAllAgents(): void {
    const now = Date.now();

    for (const [agentId, monitorData] of this.agentStates.entries()) {
      // 计算空闲时间
      const idleTime = now - monitorData.lastActiveAt;
      monitorData.idleTime = idleTime;

      // 检查阈值
      this.checkThresholds(agentId, monitorData, idleTime, now);
    }
  }

  /**
   * 检查空闲阈值
   */
  private checkThresholds(
    agentId: string,
    monitorData: AgentMonitorData,
    idleTime: number,
    now: number
  ): void {
    const { thresholds } = this.config;

    // 跳过已终止或忙碌的 Agent
    if (monitorData.status === MonitorAgentStatus.TERMINATED ||
        monitorData.status === MonitorAgentStatus.ACTIVE) {
      return;
    }

    // 事故级别 (>15min)
    if (idleTime > thresholds.accidentThreshold) {
      this.handleAccident(agentId, monitorData, idleTime, now);
      return;
    }

    // 严重级别 (>5min)
    if (idleTime > thresholds.criticalThreshold) {
      this.handleCritical(agentId, monitorData, idleTime, now);
      return;
    }

    // 警告级别 (>1min)
    if (idleTime > thresholds.warningThreshold) {
      this.handleWarning(agentId, monitorData, idleTime, now);
      return;
    }
  }

  /**
   * 处理警告
   */
  private handleWarning(
    agentId: string,
    monitorData: AgentMonitorData,
    idleTime: number,
    now: number
  ): void {
    // 避免重复告警
    const recentWarning = monitorData.alerts.find(
      a => a.level === AlertLevel.WARNING && now - a.timestamp < 60000
    );
    if (recentWarning) return;

    const alert: AlertEvent = {
      level: AlertLevel.WARNING,
      agentId,
      agentName: monitorData.name,
      message: `⚠️ Agent ${monitorData.name} 已空闲超过 1 分钟`,
      idleTime,
      timestamp: now,
      action: '记录日志'
    };

    this.emitAlert(alert);
    monitorData.alerts.push(alert);
    this.trimAlerts(monitorData);
    
    console.warn(`[AgentMonitor] ${alert.message}`);
  }

  /**
   * 处理严重告警
   */
  private handleCritical(
    agentId: string,
    monitorData: AgentMonitorData,
    idleTime: number,
    now: number
  ): void {
    // 避免重复告警
    const recentCritical = monitorData.alerts.find(
      a => a.level === AlertLevel.CRITICAL && now - a.timestamp < 120000
    );
    if (recentCritical) return;

    const alert: AlertEvent = {
      level: AlertLevel.CRITICAL,
      agentId,
      agentName: monitorData.name,
      message: `🚨 Agent ${monitorData.name} 已空闲超过 5 分钟 (严重)`,
      idleTime,
      timestamp: now,
      action: '通知 Axon'
    };

    this.emitAlert(alert);
    monitorData.alerts.push(alert);
    this.trimAlerts(monitorData);

    // 通知 Axon
    this.notifyAxon(alert);
    
    console.error(`[AgentMonitor] ${alert.message}`);
  }

  /**
   * 处理事故 (自动杀掉)
   */
  private handleAccident(
    agentId: string,
    monitorData: AgentMonitorData,
    idleTime: number,
    now: number
  ): void {
    // 避免重复告警
    const recentAccident = monitorData.alerts.find(
      a => a.level === AlertLevel.ACCIDENT && now - a.timestamp < 300000
    );
    if (recentAccident) return;

    const alert: AlertEvent = {
      level: AlertLevel.ACCIDENT,
      agentId,
      agentName: monitorData.name,
      message: `💥 Agent ${monitorData.name} 已空闲超过 15 分钟 (事故)`,
      idleTime,
      timestamp: now,
      action: '自动杀掉'
    };

    this.emitAlert(alert);
    monitorData.alerts.push(alert);
    this.trimAlerts(monitorData);

    // 自动杀掉
    if (this.config.enableAutoTerminate) {
      this.terminateAgent(agentId, alert);
    }

    console.error(`[AgentMonitor] ${alert.message}`);
  }

  /**
   * 终止 Agent
   */
  private terminateAgent(agentId: string, alert: AlertEvent): void {
    const monitorData = this.agentStates.get(agentId);
    if (!monitorData) return;

    const oldStatus = monitorData.status;
    monitorData.status = MonitorAgentStatus.TERMINATED;

    this.recordStatusChange(
      agentId,
      oldStatus,
      MonitorAgentStatus.TERMINATED,
      `事故处理：空闲 ${Math.floor(alert.idleTime / 60000)} 分钟`
    );

    console.error(`[AgentMonitor] Agent 已终止：${agentId}`);
    
    // 发出终止事件
    this.emit('agent:terminated', { agentId, alert });
  }

  // ==================== 性能分析 ====================

  /**
   * 计算效率分数
   */
  private calculateEfficiency(metrics: PerformanceMetrics): number {
    // 基于成功率、平均耗时、Token 使用效率计算
    const successWeight = 0.4;
    const durationWeight = 0.3;
    const tokenWeight = 0.3;

    const successScore = metrics.successRate * 100;
    
    // 假设平均任务耗时 5 分钟 (300000ms) 为基准
    const durationScore = Math.max(0, 100 - (metrics.avgTaskDuration / 3000));
    
    // 假设平均每任务 1000 token 为基准
    const tokenScore = Math.max(0, 100 - (metrics.avgTokensPerTask / 10));

    return (
      successScore * successWeight +
      durationScore * durationWeight +
      tokenScore * tokenWeight
    );
  }

  /**
   * 分析任务效率
   */
  analyzeTaskEfficiency(
    taskId: string,
    estimatedDuration: number,
    actualDuration: number,
    tokenUsage: number
  ): TaskEfficiencyAnalysis {
    const efficiencyRatio = actualDuration / estimatedDuration;
    const isEfficient = efficiencyRatio <= 1.2; // 20% 容差

    const suggestions: string[] = [];

    if (efficiencyRatio > 1.5) {
      suggestions.push('任务耗时远超预期，考虑拆分为更小的子任务');
    }

    if (tokenUsage > 5000) {
      suggestions.push('Token 使用量较高，检查是否有冗余的上下文或提示词');
    }

    if (efficiencyRatio > 2.0) {
      suggestions.push('效率极低，建议重新评估任务复杂度或更换模型');
    }

    if (!isEfficient && actualDuration < 60000) {
      suggestions.push('虽然效率低但总耗时短，可以接受');
    }

    return {
      taskId,
      estimatedDuration,
      actualDuration,
      efficiencyRatio,
      tokenUsage,
      isEfficient,
      suggestions
    };
  }

  /**
   * 推荐模型选择
   */
  recommendModel(taskType: string, complexity: 'low' | 'medium' | 'high'): ModelRecommendation {
    const recommendations: Record<string, Record<string, ModelRecommendation>> = {
      'coding': {
        low: {
          taskId: 'auto',
          taskType: 'coding',
          recommendedModel: 'qwen2.5-coder:7b',
          reason: '简单编码任务，轻量模型即可处理',
          expectedImprovement: 20
        },
        medium: {
          taskId: 'auto',
          taskType: 'coding',
          recommendedModel: 'qwen2.5-coder:32b',
          reason: '中等复杂度编码，需要更强的推理能力',
          expectedImprovement: 15
        },
        high: {
          taskId: 'auto',
          taskType: 'coding',
          recommendedModel: 'qwen2.5-coder:32b',
          reason: '复杂编码任务，需要顶级代码理解能力',
          expectedImprovement: 25
        }
      },
      'writing': {
        low: {
          taskId: 'auto',
          taskType: 'writing',
          recommendedModel: 'qwen2.5:7b',
          reason: '简单写作任务，轻量模型足够',
          expectedImprovement: 30
        },
        medium: {
          taskId: 'auto',
          taskType: 'writing',
          recommendedModel: 'qwen2.5:14b',
          reason: '中等写作任务，需要更好的语言组织',
          expectedImprovement: 20
        },
        high: {
          taskId: 'auto',
          taskType: 'writing',
          recommendedModel: 'qwen2.5:72b',
          reason: '复杂写作任务，需要深度理解和创造力',
          expectedImprovement: 35
        }
      },
      'analysis': {
        low: {
          taskId: 'auto',
          taskType: 'analysis',
          recommendedModel: 'qwen2.5:14b',
          reason: '简单分析任务',
          expectedImprovement: 15
        },
        medium: {
          taskId: 'auto',
          taskType: 'analysis',
          recommendedModel: 'qwen2.5:32b',
          reason: '中等分析任务，需要逻辑推理',
          expectedImprovement: 20
        },
        high: {
          taskId: 'auto',
          taskType: 'analysis',
          recommendedModel: 'qwen2.5:72b',
          reason: '复杂分析任务，需要深度推理能力',
          expectedImprovement: 30
        }
      }
    };

    return recommendations[taskType]?.[complexity] || {
      taskId: 'auto',
      taskType,
      recommendedModel: 'qwen2.5:14b',
      reason: '默认推荐',
      expectedImprovement: 10
    };
  }

  /**
   * 识别低效任务
   */
  identifyInefficientTasks(threshold: number = 1.5): TaskEfficiencyAnalysis[] {
    // 这里需要从历史记录中获取任务数据
    // 简化实现：返回效率低于阈值的分析
    const inefficientTasks: TaskEfficiencyAnalysis[] = [];

    for (const monitorData of this.agentStates.values()) {
      if (monitorData.metrics.avgTaskDuration > 600000) { // 10 分钟
        inefficientTasks.push({
          taskId: monitorData.currentTaskId || 'unknown',
          estimatedDuration: 300000,
          actualDuration: monitorData.metrics.avgTaskDuration,
          efficiencyRatio: monitorData.metrics.avgTaskDuration / 300000,
          tokenUsage: monitorData.metrics.avgTokensPerTask,
          isEfficient: false,
          suggestions: [
            '任务平均耗时过长，建议拆分',
            '考虑使用更强大的模型',
            '优化提示词减少迭代次数'
          ]
        });
      }
    }

    return inefficientTasks;
  }

  // ==================== 仪表板数据 ====================

  /**
   * 获取监控仪表板数据
   */
  getDashboardData(): DashboardData {
    const agents = Array.from(this.agentStates.values());
    
    const summary = {
      totalAgents: agents.length,
      activeAgents: agents.filter(a => a.status === MonitorAgentStatus.ACTIVE).length,
      idleAgents: agents.filter(a => a.status === MonitorAgentStatus.IDLE).length,
      timeoutAgents: agents.filter(a => a.status === MonitorAgentStatus.TIMEOUT).length,
      failedAgents: agents.filter(a => a.status === MonitorAgentStatus.FAILED).length,
      terminatedAgents: agents.filter(a => a.status === MonitorAgentStatus.TERMINATED).length
    };

    const recentAlerts = this.alertHistory.slice(-20);
    const alerts = {
      warnings: agents.reduce((sum, a) => sum + a.alerts.filter(al => al.level === AlertLevel.WARNING).length, 0),
      criticals: agents.reduce((sum, a) => sum + a.alerts.filter(al => al.level === AlertLevel.CRITICAL).length, 0),
      accidents: agents.reduce((sum, a) => sum + a.alerts.filter(al => al.level === AlertLevel.ACCIDENT).length, 0),
      recent: recentAlerts
    };

    const avgSuccessRate = agents.length > 0 ?
      agents.reduce((sum, a) => sum + a.metrics.successRate, 0) / agents.length : 0;
    
    const avgEfficiency = agents.length > 0 ?
      agents.reduce((sum, a) => sum + a.metrics.efficiency, 0) / agents.length : 0;

    const totalTokensUsed = agents.reduce((sum, a) => sum + a.metrics.tokenUsage, 0);
    const totalTasksCompleted = agents.reduce((sum, a) => sum + a.metrics.taskCount, 0);

    const performance = {
      avgSuccessRate,
      avgEfficiency,
      totalTokensUsed,
      totalTasksCompleted
    };

    return {
      summary,
      alerts,
      performance,
      agents
    };
  }

  /**
   * 获取单个 Agent 监控数据
   */
  getAgentMonitorData(agentId: string): AgentMonitorData | undefined {
    return this.agentStates.get(agentId);
  }

  /**
   * 获取所有告警
   */
  getAlerts(limit: number = 50): AlertEvent[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * 获取状态变化历史
   */
  getStatusHistory(agentId?: string, limit: number = 50): StatusChangeHistory[] {
    if (agentId) {
      return this.statusHistory
        .filter(h => h.agentId === agentId)
        .slice(-limit);
    }
    return this.statusHistory.slice(-limit);
  }

  // ==================== 工具方法 ====================

  /**
   * 映射 Agent 状态
   */
  private mapAgentStatus(status: AgentStatus): MonitorAgentStatus {
    switch (status) {
      case AgentStatus.BUSY:
        return MonitorAgentStatus.ACTIVE;
      case AgentStatus.IDLE:
      case AgentStatus.WARNING:
      case AgentStatus.CRITICAL:
        return MonitorAgentStatus.IDLE;
      case AgentStatus.OFFLINE:
        return MonitorAgentStatus.TIMEOUT;
      default:
        return MonitorAgentStatus.IDLE;
    }
  }

  /**
   * 记录状态变化
   */
  private recordStatusChange(
    agentId: string,
    fromStatus: MonitorAgentStatus,
    toStatus: MonitorAgentStatus,
    reason?: string
  ): void {
    const history: StatusChangeHistory = {
      agentId,
      fromStatus,
      toStatus,
      timestamp: Date.now(),
      reason
    };

    const monitorData = this.agentStates.get(agentId);
    if (monitorData) {
      monitorData.statusHistory.push(history);
      // 限制历史记录数量
      if (monitorData.statusHistory.length > this.config.historyLimit) {
        monitorData.statusHistory.shift();
      }
    }

    this.statusHistory.push(history);
    if (this.statusHistory.length > this.config.historyLimit * 10) {
      this.statusHistory.shift();
    }
  }

  /**
   * 限制告警数量
   */
  private trimAlerts(monitorData: AgentMonitorData): void {
    if (monitorData.alerts.length > this.config.historyLimit) {
      monitorData.alerts.shift();
    }
  }

  /**
   * 发出告警事件
   */
  private emitAlert(alert: AlertEvent): void {
    this.alertHistory.push(alert);
    if (this.alertHistory.length > this.config.historyLimit * 10) {
      this.alertHistory.shift();
    }

    this.emit('alert', alert);
    this.emit(`alert:${alert.level}`, alert);
  }

  /**
   * 通知 Axon
   */
  private notifyAxon(alert: AlertEvent): void {
    // 这里可以集成消息通知
    console.log(`[AgentMonitor] 通知 Axon: ${alert.message}`);
    this.emit('notify:axon', alert);
  }

  // ==================== EventEmitter 扩展 ====================
  
  private eventEmitter: EventEmitter = new EventEmitter();

  on(event: 'alert' | 'alert:warning' | 'alert:critical' | 'alert:accident' | 'agent:terminated' | 'notify:axon', listener: (data: any) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (data: any) => void): void {
    this.eventEmitter.off(event, listener);
  }

  emit(event: string, data: any): boolean {
    return this.eventEmitter.emit(event, data);
  }

  once(event: string, listener: (data: any) => void): void {
    this.eventEmitter.once(event, listener);
  }
}

// ==================== 导出默认实例 ====================

export const agentMonitor = new AgentStateMonitor();

export default AgentStateMonitor;
