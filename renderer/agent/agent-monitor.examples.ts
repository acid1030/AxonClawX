/**
 * Agent Monitor 使用示例
 * 
 * 演示如何集成 Agent Monitor 到实际项目中
 */

import { TaskScheduler, AgentType, AgentStatus } from './task-scheduler';
import { AgentStateMonitor, MonitorAgentStatus, AlertLevel } from './agent-monitor';

// ==================== 示例 1: 基础集成 ====================

function basicIntegration() {
  // 创建调度器和监控器
  const scheduler = new TaskScheduler({
    pollInterval: 5000,
    enableSkillMatching: true,
    enableLoadBalancing: true
  });

  const monitor = new AgentStateMonitor({
    thresholds: {
      warningThreshold: 60000,     // 1 分钟警告
      criticalThreshold: 300000,   // 5 分钟严重
      accidentThreshold: 900000,   // 15 分钟事故
      checkInterval: 30000         // 30 秒检查
    },
    enableAutoTerminate: true,
    enableMetrics: true,
    enableOptimization: true
  });

  // 启动
  scheduler.start();
  monitor.start();

  // 注册 Agent
  const agent = TaskScheduler.createAgent('aria-1', 'ARIA-1', AgentType.ARIA, ['typescript', 'react']);
  scheduler.registerAgent(agent);
  monitor.registerAgent(agent);

  // 同步状态
  scheduler.on('task:assigned', ({ task, agent }) => {
    monitor.updateAgentStatus(agent.id, AgentStatus.BUSY, task.id);
  });

  scheduler.on('task:completed', ({ taskId, agentId, result }) => {
    monitor.updateAgentStatus(agentId, AgentStatus.IDLE);
    monitor.onTaskCompleted(
      agentId,
      taskId,
      result.duration || 0,
      result.tokenUsage || 0,
      result.success !== false
    );
  });

  return { scheduler, monitor };
}

// ==================== 示例 2: 告警处理 ====================

function setupAlertHandlers(monitor: AgentStateMonitor) {
  // 警告处理
  monitor.on('alert:warning', ({ agentId, agentName, idleTime }) => {
    console.warn(`⚠️ 警告：${agentName} 已空闲 ${Math.floor(idleTime / 60000)} 分钟`);
    // 记录日志
    logWarning(agentId, idleTime);
  });

  // 严重处理
  monitor.on('alert:critical', ({ agentId, agentName, idleTime }) => {
    console.error(`🚨 严重：${agentName} 已空闲 ${Math.floor(idleTime / 60000)} 分钟`);
    
    // 通知 Axon
    notifyAxon({
      type: 'agent_critical',
      agentId,
      agentName,
      idleTime,
      timestamp: Date.now()
    });
  });

  // 事故处理
  monitor.on('alert:accident', ({ agentId, agentName, idleTime }) => {
    console.error(`💥 事故：${agentName} 已空闲 ${Math.floor(idleTime / 60000)} 分钟`);
    
    // 记录事故报告
    logAccident({
      agentId,
      agentName,
      idleTime,
      timestamp: Date.now(),
      action: '自动终止'
    });
  });

  // Agent 终止
  monitor.on('agent:terminated', ({ agentId, alert }) => {
    console.log(`Agent ${agentId} 已被终止`);
    // 清理资源
    cleanupAgent(agentId);
  });
}

// ==================== 示例 3: 性能监控 ====================

function setupPerformanceMonitoring(monitor: AgentStateMonitor) {
  // 每 5 分钟输出性能报告
  setInterval(() => {
    const dashboard = monitor.getDashboardData();
    
    console.log('\n=== Agent 性能报告 ===');
    console.log(`时间：${new Date().toLocaleString()}`);
    console.log(`活跃 Agent: ${dashboard.summary.activeAgents}/${dashboard.summary.totalAgents}`);
    console.log(`平均成功率：${(dashboard.performance.avgSuccessRate * 100).toFixed(2)}%`);
    console.log(`平均效率：${dashboard.performance.avgEfficiency.toFixed(2)}`);
    console.log(`总 Token 使用：${dashboard.performance.totalTokensUsed}`);
    console.log(`总完成任务：${dashboard.performance.totalTasksCompleted}`);
    
    // 输出每个 Agent 的状态
    dashboard.agents.forEach(agent => {
      console.log(`\n${agent.name}:`);
      console.log(`  状态：${agent.status}`);
      console.log(`  空闲时间：${(agent.idleTime / 1000).toFixed(0)}秒`);
      console.log(`  完成任务：${agent.metrics.taskCount}`);
      console.log(`  成功率：${(agent.metrics.successRate * 100).toFixed(1)}%`);
      console.log(`  效率：${agent.metrics.efficiency.toFixed(1)}`);
    });
  }, 300000);
}

// ==================== 示例 4: 自动优化 ====================

function setupAutoOptimization(monitor: AgentStateMonitor) {
  // 每小时分析低效任务
  setInterval(() => {
    const inefficientTasks = monitor.identifyInefficientTasks(1.5);
    
    if (inefficientTasks.length > 0) {
      console.log(`\n发现 ${inefficientTasks.length} 个低效任务:`);
      
      inefficientTasks.forEach(task => {
        console.log(`\n任务 ${task.taskId}:`);
        console.log(`  效率比：${task.efficiencyRatio.toFixed(2)}`);
        
        // 推荐模型
        const rec = monitor.recommendModel('coding', 'medium');
        console.log(`  推荐模型：${rec.recommendedModel}`);
        console.log(`  预期提升：${rec.expectedImprovement}%`);
        
        // 建议拆分
        if (task.efficiencyRatio > 2.0) {
          console.log(`  ⚠️ 建议拆分为 ${Math.ceil(task.efficiencyRatio)} 个小任务`);
        }
        
        // 输出优化建议
        task.suggestions.forEach(s => {
          console.log(`  - ${s}`);
        });
      });
    }
  }, 3600000);
}

// ==================== 示例 5: 任务效率分析 ====================

function analyzeTaskEfficiency(
  monitor: AgentStateMonitor,
  taskId: string,
  estimatedDuration: number,
  actualDuration: number,
  tokenUsage: number
) {
  const analysis = monitor.analyzeTaskEfficiency(
    taskId,
    estimatedDuration,
    actualDuration,
    tokenUsage
  );

  console.log(`\n任务效率分析：${taskId}`);
  console.log(`预计耗时：${(estimatedDuration / 1000).toFixed(0)}秒`);
  console.log(`实际耗时：${(actualDuration / 1000).toFixed(0)}秒`);
  console.log(`效率比：${analysis.efficiencyRatio.toFixed(2)}`);
  console.log(`是否高效：${analysis.isEfficient ? '✅' : '❌'}`);
  console.log(`Token 使用：${tokenUsage}`);
  
  if (analysis.suggestions.length > 0) {
    console.log('\n优化建议:');
    analysis.suggestions.forEach(s => console.log(`  - ${s}`));
  }

  return analysis;
}

// ==================== 示例 6: 模型推荐 ====================

function getModelRecommendation(
  monitor: AgentStateMonitor,
  taskType: string,
  complexity: 'low' | 'medium' | 'high'
) {
  const rec = monitor.recommendModel(taskType, complexity);
  
  console.log(`\n模型推荐:`);
  console.log(`任务类型：${taskType}`);
  console.log(`复杂度：${complexity}`);
  console.log(`推荐模型：${rec.recommendedModel}`);
  console.log(`原因：${rec.reason}`);
  console.log(`预期提升：${rec.expectedImprovement}%`);
  
  return rec;
}

// ==================== 示例 7: 仪表板集成 ====================

function createDashboardData(monitor: AgentStateMonitor) {
  const dashboard = monitor.getDashboardData();
  
  // 转换为前端可用的格式
  return {
    timestamp: Date.now(),
    summary: dashboard.summary,
    alerts: {
      total: dashboard.alerts.warnings + dashboard.alerts.criticals + dashboard.alerts.accidents,
      warnings: dashboard.alerts.warnings,
      criticals: dashboard.alerts.criticals,
      accidents: dashboard.alerts.accidents,
      recent: dashboard.alerts.recent.map(a => ({
        level: a.level,
        message: a.message,
        timestamp: a.timestamp
      }))
    },
    performance: {
      successRate: (dashboard.performance.avgSuccessRate * 100).toFixed(2),
      efficiency: dashboard.performance.avgEfficiency.toFixed(2),
      totalTokens: dashboard.performance.totalTokensUsed,
      totalTasks: dashboard.performance.totalTasksCompleted
    },
    agents: dashboard.agents.map(a => ({
      id: a.id,
      name: a.name,
      status: a.status,
      idleTime: Math.floor(a.idleTime / 1000),
      taskCount: a.metrics.taskCount,
      successRate: (a.metrics.successRate * 100).toFixed(2),
      efficiency: a.metrics.efficiency.toFixed(2)
    }))
  };
}

// ==================== 示例 8: 状态历史查询 ====================

function queryStatusHistory(monitor: AgentStateMonitor, agentId: string, limit: number = 20) {
  const history = monitor.getStatusHistory(agentId, limit);
  
  console.log(`\nAgent ${agentId} 状态历史:`);
  history.forEach(h => {
    console.log(`[${new Date(h.timestamp).toLocaleString()}]`);
    console.log(`  ${h.fromStatus} → ${h.toStatus}`);
    if (h.reason) {
      console.log(`  原因：${h.reason}`);
    }
  });
  
  return history;
}

// ==================== 示例 9: 告警查询 ====================

function queryAlerts(monitor: AgentStateMonitor, level?: AlertLevel, limit: number = 50) {
  const allAlerts = monitor.getAlerts(limit);
  
  const filtered = level ? 
    allAlerts.filter(a => a.level === level) : 
    allAlerts;
  
  console.log(`\n告警记录 (${filtered.length}条):`);
  filtered.forEach(a => {
    console.log(`[${a.level}] ${a.agentName}: ${a.message}`);
    console.log(`  时间：${new Date(a.timestamp).toLocaleString()}`);
    console.log(`  空闲时间：${Math.floor(a.idleTime / 60000)}分钟`);
    if (a.action) {
      console.log(`  行动：${a.action}`);
    }
  });
  
  return filtered;
}

// ==================== 辅助函数 ====================

function logWarning(agentId: string, idleTime: number) {
  // 实现日志记录
  console.log(`[WARNING] Agent ${agentId} idle for ${idleTime}ms`);
}

function notifyAxon(data: any) {
  // 实现 Axon 通知
  console.log('[NOTIFY AXON]', data);
}

function logAccident(data: any) {
  // 实现事故记录
  console.error('[ACCIDENT]', data);
}

function cleanupAgent(agentId: string) {
  // 实现 Agent 清理
  console.log(`[CLEANUP] Agent ${agentId}`);
}

// ==================== 完整示例 ====================

function fullExample() {
  console.log('=== Agent Monitor 完整示例 ===\n');
  
  // 创建系统
  const { scheduler, monitor } = basicIntegration();
  
  // 设置告警处理
  setupAlertHandlers(monitor);
  
  // 设置性能监控
  setupPerformanceMonitoring(monitor);
  
  // 设置自动优化
  setupAutoOptimization(monitor);
  
  // 注册多个 Agent
  const agents = [
    TaskScheduler.createAgent('aria-1', 'ARIA-1', AgentType.ARIA),
    TaskScheduler.createAgent('aria-2', 'ARIA-2', AgentType.ARIA),
    TaskScheduler.createAgent('ace-1', 'ACE-1', AgentType.ACE),
    TaskScheduler.createAgent('nova-1', 'NOVA-1', AgentType.NOVA)
  ];
  
  agents.forEach(agent => {
    scheduler.registerAgent(agent);
    monitor.registerAgent(agent);
  });
  
  // 模拟任务完成
  setTimeout(() => {
    monitor.onTaskCompleted('aria-1', 'task-1', 180000, 2500, true);
    monitor.onTaskCompleted('aria-2', 'task-2', 120000, 1800, true);
    monitor.onTaskCompleted('ace-1', 'task-3', 90000, 1200, false);
  }, 1000);
  
  // 分析任务效率
  setTimeout(() => {
    analyzeTaskEfficiency(monitor, 'task-1', 120000, 180000, 2500);
  }, 2000);
  
  // 获取模型推荐
  setTimeout(() => {
    getModelRecommendation(monitor, 'coding', 'high');
    getModelRecommendation(monitor, 'writing', 'medium');
  }, 3000);
  
  // 查询仪表板数据
  setInterval(() => {
    const dashboard = createDashboardData(monitor);
    console.log('\n=== 仪表板数据 ===');
    console.log(JSON.stringify(dashboard, null, 2));
  }, 5000);
  
  return { scheduler, monitor };
}

// 导出所有示例函数
export {
  basicIntegration,
  setupAlertHandlers,
  setupPerformanceMonitoring,
  setupAutoOptimization,
  analyzeTaskEfficiency,
  getModelRecommendation,
  createDashboardData,
  queryStatusHistory,
  queryAlerts,
  fullExample
};

// 如果直接运行此文件
if (require.main === module) {
  fullExample();
}
