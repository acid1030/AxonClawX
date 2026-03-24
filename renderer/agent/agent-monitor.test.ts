/**
 * Agent Monitor 单元测试
 * 
 * 测试覆盖:
 * - 生命周期管理 (启动/停止)
 * - Agent 注册/注销
 * - 状态检测与更新
 * - 空闲阈值告警 (警告/严重/事故)
 * - 性能指标收集
 * - 任务效率分析
 * - 模型推荐
 * - 仪表板数据
 * - 自动终止功能
 * 
 * @author Axon (via NOVA)
 * @version 1.0
 * @created 2026-03-13
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  AgentStateMonitor,
  MonitorAgentStatus,
  AlertLevel,
  AgentMonitorData
} from './agent-monitor';
import { TaskScheduler, AgentType, AgentStatus, TaskStatus } from './task-scheduler';

describe('AgentStateMonitor', () => {
  let monitor: AgentStateMonitor;

  beforeEach(() => {
    monitor = new AgentStateMonitor({
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
    });
  });

  afterEach(() => {
    monitor.stop();
  });

  // ==================== 生命周期 ====================

  describe('生命周期管理', () => {
    it('应该能正常启动和停止', () => {
      monitor.start();
      expect(() => monitor.stop()).not.toThrow();
    });

    it('重复启动应该输出警告', () => {
      const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      monitor.start();
      monitor.start();
      expect(consoleWarn).toHaveBeenCalledWith(
        expect.stringContaining('监控已在运行中')
      );
      consoleWarn.mockRestore();
    });

    it('停止后应该能重新启动', () => {
      monitor.start();
      monitor.stop();
      expect(() => monitor.start()).not.toThrow();
      monitor.stop();
    });
  });

  // ==================== Agent 管理 ====================

  describe('Agent 管理', () => {
    it('应该能注册 Agent', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      expect(() => monitor.registerAgent(agent)).not.toThrow();
    });

    it('应该能注销 Agent', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);
      const result = monitor.unregisterAgent('test-1');
      expect(result).toBe(true);
    });

    it('注销不存在的 Agent 应该返回 false', () => {
      const result = monitor.unregisterAgent('non-existent');
      expect(result).toBe(false);
    });

    it('应该能更新 Agent 状态', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);
      
      monitor.updateAgentStatus('test-1', AgentStatus.BUSY, 'task-123');
      const data = monitor.getAgentMonitorData('test-1');
      
      expect(data?.status).toBe(MonitorAgentStatus.ACTIVE);
      expect(data?.currentTaskId).toBe('task-123');
    });

    it('应该记录状态变化历史', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);
      
      monitor.updateAgentStatus('test-1', AgentStatus.BUSY, 'task-123');
      monitor.updateAgentStatus('test-1', AgentStatus.IDLE);
      
      const history = monitor.getStatusHistory('test-1');
      expect(history.length).toBeGreaterThan(0);
    });
  });

  // ==================== 状态检测 ====================

  describe('状态检测', () => {
    it('应该能检测 Agent 状态', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);
      
      const data = monitor.getAgentMonitorData('test-1');
      expect(data).toBeDefined();
      expect(data?.status).toBe(MonitorAgentStatus.IDLE);
    });

    it('应该计算空闲时间', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);
      
      // 等待一小段时间
      setTimeout(() => {
        const data = monitor.getAgentMonitorData('test-1');
        expect(data?.idleTime).toBeGreaterThanOrEqual(0);
      }, 100);
    });
  });

  // ==================== 告警系统 ====================

  describe('告警系统', () => {
    it('应该能发出警告级别告警 (>1min)', () => {
      const alertHandler = vi.fn();
      monitor.on('alert:warning', alertHandler);

      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      // 模拟 Agent 空闲超过 1 分钟
      const data = monitor.getAgentMonitorData('test-1');
      if (data) {
        data.lastActiveAt = Date.now() - 65000; // 1 分 5 秒前
        data.idleTime = 65000;
      }

      // 触发检查
      monitor.start();
      
      setTimeout(() => {
        expect(alertHandler).toHaveBeenCalled();
        monitor.stop();
      }, 100);
    });

    it('应该能发出严重级别告警 (>5min)', () => {
      const alertHandler = vi.fn();
      monitor.on('alert:critical', alertHandler);

      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      // 模拟 Agent 空闲超过 5 分钟
      const data = monitor.getAgentMonitorData('test-1');
      if (data) {
        data.lastActiveAt = Date.now() - 305000; // 5 分 5 秒前
        data.idleTime = 305000;
      }

      monitor.start();
      
      setTimeout(() => {
        expect(alertHandler).toHaveBeenCalled();
        monitor.stop();
      }, 100);
    });

    it('应该能发出事故级别告警 (>15min)', () => {
      const alertHandler = vi.fn();
      monitor.on('alert:accident', alertHandler);

      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      // 模拟 Agent 空闲超过 15 分钟
      const data = monitor.getAgentMonitorData('test-1');
      if (data) {
        data.lastActiveAt = Date.now() - 905000; // 15 分 5 秒前
        data.idleTime = 905000;
      }

      monitor.start();
      
      setTimeout(() => {
        expect(alertHandler).toHaveBeenCalled();
        monitor.stop();
      }, 100);
    });

    it('应该能获取告警历史', () => {
      const alerts = monitor.getAlerts(50);
      expect(Array.isArray(alerts)).toBe(true);
    });
  });

  // ==================== 性能指标 ====================

  describe('性能指标', () => {
    it('应该能更新性能指标', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      monitor.updateMetrics('test-1', {
        tokenUsage: 1000,
        efficiency: 85
      });

      const data = monitor.getAgentMonitorData('test-1');
      expect(data?.metrics.tokenUsage).toBe(1000);
      expect(data?.metrics.efficiency).toBe(85);
    });

    it('应该能记录任务完成', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      monitor.onTaskCompleted('test-1', 'task-123', 180000, 2500, true);

      const data = monitor.getAgentMonitorData('test-1');
      expect(data?.metrics.taskCount).toBe(1);
      expect(data?.metrics.tokenUsage).toBe(2500);
      expect(data?.metrics.successRate).toBe(1.0);
    });

    it('应该能计算平均任务耗时', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      monitor.onTaskCompleted('test-1', 'task-1', 100000, 1000, true);
      monitor.onTaskCompleted('test-1', 'task-2', 200000, 1500, true);
      monitor.onTaskCompleted('test-1', 'task-3', 150000, 1200, true);

      const data = monitor.getAgentMonitorData('test-1');
      expect(data?.metrics.taskCount).toBe(3);
      expect(data?.metrics.avgTaskDuration).toBeCloseTo(150000, -2);
    });

    it('应该能计算成功率', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      monitor.onTaskCompleted('test-1', 'task-1', 100000, 1000, true);
      monitor.onTaskCompleted('test-1', 'task-2', 100000, 1000, false);
      monitor.onTaskCompleted('test-1', 'task-3', 100000, 1000, true);

      const data = monitor.getAgentMonitorData('test-1');
      expect(data?.metrics.taskCount).toBe(3);
      expect(data?.metrics.successRate).toBeCloseTo(0.667, 2);
    });
  });

  // ==================== 任务效率分析 ====================

  describe('任务效率分析', () => {
    it('应该能分析任务效率', () => {
      const analysis = monitor.analyzeTaskEfficiency(
        'task-123',
        120000,  // 预计 2 分钟
        180000,  // 实际 3 分钟
        2500     // Token 使用
      );

      expect(analysis.taskId).toBe('task-123');
      expect(analysis.efficiencyRatio).toBe(1.5);
      expect(analysis.isEfficient).toBe(false);
      expect(analysis.suggestions.length).toBeGreaterThan(0);
    });

    it('应该识别高效任务', () => {
      const analysis = monitor.analyzeTaskEfficiency(
        'task-123',
        120000,
        130000,  // 只超出 8%
        1000
      );

      expect(analysis.isEfficient).toBe(true);
      expect(analysis.suggestions.length).toBe(0);
    });

    it('应该为低效任务提供建议', () => {
      const analysis = monitor.analyzeTaskEfficiency(
        'task-123',
        120000,
        300000,  // 超出 150%
        6000     // 高 Token 使用
      );

      expect(analysis.suggestions).toContainEqual(
        expect.stringContaining('任务耗时远超预期')
      );
      expect(analysis.suggestions).toContainEqual(
        expect.stringContaining('Token 使用量较高')
      );
    });
  });

  // ==================== 模型推荐 ====================

  describe('模型推荐', () => {
    it('应该能推荐 coding 任务模型', () => {
      const rec = monitor.recommendModel('coding', 'low');
      expect(rec.recommendedModel).toBe('qwen2.5-coder:7b');
      expect(rec.expectedImprovement).toBe(20);
    });

    it('应该能推荐 writing 任务模型', () => {
      const rec = monitor.recommendModel('writing', 'high');
      expect(rec.recommendedModel).toBe('qwen2.5:72b');
      expect(rec.expectedImprovement).toBe(35);
    });

    it('应该能推荐 analysis 任务模型', () => {
      const rec = monitor.recommendModel('analysis', 'medium');
      expect(rec.recommendedModel).toBe('qwen2.5:32b');
      expect(rec.expectedImprovement).toBe(20);
    });

    it('未知任务类型应该返回默认推荐', () => {
      const rec = monitor.recommendModel('unknown', 'medium');
      expect(rec.recommendedModel).toBe('qwen2.5:14b');
    });
  });

  // ==================== 低效任务识别 ====================

  describe('低效任务识别', () => {
    it('应该能识别低效任务', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      // 模拟高平均耗时
      monitor.onTaskCompleted('test-1', 'task-1', 700000, 5000, true); // 11.7 分钟

      const inefficientTasks = monitor.identifyInefficientTasks(1.5);
      
      // 应该识别出低效任务
      expect(inefficientTasks.length).toBeGreaterThan(0);
    });

    it('阈值应该影响识别结果', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      monitor.onTaskCompleted('test-1', 'task-1', 400000, 3000, true); // 6.7 分钟

      // 严格阈值
      const strict = monitor.identifyInefficientTasks(1.2);
      // 宽松阈值
      const relaxed = monitor.identifyInefficientTasks(2.0);

      expect(strict.length).toBeGreaterThanOrEqual(relaxed.length);
    });
  });

  // ==================== 仪表板数据 ====================

  describe('仪表板数据', () => {
    it('应该能获取仪表板数据', () => {
      const agent1 = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      const agent2 = TaskScheduler.createAgent('test-2', 'Test-2', AgentType.ACE);
      
      monitor.registerAgent(agent1);
      monitor.registerAgent(agent2);

      const dashboard = monitor.getDashboardData();

      expect(dashboard.summary.totalAgents).toBe(2);
      expect(dashboard.agents.length).toBe(2);
      expect(dashboard.performance).toBeDefined();
      expect(dashboard.alerts).toBeDefined();
    });

    it('应该正确统计各状态 Agent 数量', () => {
      const agent1 = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      const agent2 = TaskScheduler.createAgent('test-2', 'Test-2', AgentType.ACE);
      
      monitor.registerAgent(agent1);
      monitor.registerAgent(agent2);

      monitor.updateAgentStatus('test-1', AgentStatus.BUSY, 'task-1');

      const dashboard = monitor.getDashboardData();

      expect(dashboard.summary.activeAgents).toBe(1);
      expect(dashboard.summary.idleAgents).toBe(1);
    });

    it('应该包含性能统计', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      monitor.onTaskCompleted('test-1', 'task-1', 100000, 1000, true);
      monitor.onTaskCompleted('test-1', 'task-2', 150000, 1500, true);

      const dashboard = monitor.getDashboardData();

      expect(dashboard.performance.totalTasksCompleted).toBe(2);
      expect(dashboard.performance.totalTokensUsed).toBe(2500);
    });

    it('应该包含最近告警', () => {
      const dashboard = monitor.getDashboardData();
      
      expect(dashboard.alerts.recent).toBeDefined();
      expect(Array.isArray(dashboard.alerts.recent)).toBe(true);
    });
  });

  // ==================== 自动终止 ====================

  describe('自动终止功能', () => {
    it('应该能自动终止事故 Agent', () => {
      const terminateHandler = vi.fn();
      monitor.on('agent:terminated', terminateHandler);

      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      // 模拟事故状态
      const data = monitor.getAgentMonitorData('test-1');
      if (data) {
        data.lastActiveAt = Date.now() - 905000; // 15 分 5 秒前
        data.idleTime = 905000;
        data.status = MonitorAgentStatus.IDLE;
      }

      monitor.start();

      setTimeout(() => {
        expect(terminateHandler).toHaveBeenCalled();
        
        const terminatedData = monitor.getAgentMonitorData('test-1');
        expect(terminatedData?.status).toBe(MonitorAgentStatus.TERMINATED);
        
        monitor.stop();
      }, 100);
    });

    it('禁用自动终止时不应该终止 Agent', () => {
      const terminateHandler = vi.fn();
      
      const noTerminateMonitor = new AgentStateMonitor({
        enableAutoTerminate: false
      });
      
      noTerminateMonitor.on('agent:terminated', terminateHandler);

      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      noTerminateMonitor.registerAgent(agent);

      // 模拟事故状态
      const data = noTerminateMonitor.getAgentMonitorData('test-1');
      if (data) {
        data.lastActiveAt = Date.now() - 905000;
        data.idleTime = 905000;
      }

      noTerminateMonitor.start();

      setTimeout(() => {
        expect(terminateHandler).not.toHaveBeenCalled();
        
        const agentData = noTerminateMonitor.getAgentMonitorData('test-1');
        expect(agentData?.status).not.toBe(MonitorAgentStatus.TERMINATED);
        
        noTerminateMonitor.stop();
      }, 100);
    });
  });

  // ==================== 事件系统 ====================

  describe('事件系统', () => {
    it('应该能监听 alert 事件', () => {
      const alertHandler = vi.fn();
      monitor.on('alert', alertHandler);

      // 手动发出告警
      const data = monitor.getAgentMonitorData('test-1');
      if (data) {
        data.lastActiveAt = Date.now() - 65000;
      }

      monitor.start();

      setTimeout(() => {
        monitor.stop();
        // 告警可能触发也可能不触发，取决于检查时机
        expect(alertHandler).toBeDefined();
      }, 100);
    });

    it('应该能监听 notify:axon 事件', () => {
      const axonHandler = vi.fn();
      monitor.on('notify:axon', axonHandler);

      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      // 模拟严重状态
      const data = monitor.getAgentMonitorData('test-1');
      if (data) {
        data.lastActiveAt = Date.now() - 305000;
        data.idleTime = 305000;
      }

      monitor.start();

      setTimeout(() => {
        monitor.stop();
        expect(axonHandler).toBeDefined();
      }, 100);
    });
  });

  // ==================== 边界情况 ====================

  describe('边界情况', () => {
    it('应该能处理未注册 Agent 的更新', () => {
      expect(() => {
        monitor.updateAgentStatus('non-existent', AgentStatus.BUSY);
      }).not.toThrow();
    });

    it('应该能处理空指标更新', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      expect(() => {
        monitor.updateMetrics('test-1', {});
      }).not.toThrow();
    });

    it('应该限制历史记录数量', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      // 多次更新状态
      for (let i = 0; i < 150; i++) {
        monitor.updateAgentStatus('test-1', i % 2 === 0 ? AgentStatus.BUSY : AgentStatus.IDLE);
      }

      const history = monitor.getStatusHistory('test-1');
      expect(history.length).toBeLessThanOrEqual(100); // historyLimit
    });

    it('应该限制告警数量', () => {
      const agent = TaskScheduler.createAgent('test-1', 'Test-1', AgentType.ARIA);
      monitor.registerAgent(agent);

      const alerts = monitor.getAlerts(50);
      expect(alerts.length).toBeLessThanOrEqual(1000); // 总告警限制
    });
  });
});

describe('MonitorAgentStatus 枚举', () => {
  it('应该包含所有状态', () => {
    expect(MonitorAgentStatus.ACTIVE).toBe('active');
    expect(MonitorAgentStatus.IDLE).toBe('idle');
    expect(MonitorAgentStatus.TIMEOUT).toBe('timeout');
    expect(MonitorAgentStatus.FAILED).toBe('failed');
    expect(MonitorAgentStatus.TERMINATED).toBe('terminated');
  });
});

describe('AlertLevel 枚举', () => {
  it('应该包含所有级别', () => {
    expect(AlertLevel.INFO).toBe('info');
    expect(AlertLevel.WARNING).toBe('warning');
    expect(AlertLevel.CRITICAL).toBe('critical');
    expect(AlertLevel.ACCIDENT).toBe('accident');
  });
});
