/**
 * Agent Module Exports
 * 
 * 导出所有 Agent 相关的模块和类型
 */

export {
  TaskScheduler,
  scheduler,
  TaskPriority,
  TaskStatus,
  AgentType,
  AgentStatus,
  Task,
  Agent,
  SchedulerConfig,
  SchedulerStats,
  TaskAssignmentResult
} from './task-scheduler';

export {
  AgentStateMonitor,
  agentMonitor,
  MonitorAgentStatus,
  AlertLevel,
  AlertThresholds,
  PerformanceMetrics,
  TaskEfficiencyAnalysis,
  ModelRecommendation,
  AlertEvent,
  StatusChangeHistory,
  DashboardData,
  AgentMonitorData,
  MonitorConfig
} from './agent-monitor';

export type {
  Task as ITask,
  Agent as IAgent,
  SchedulerConfig as ISchedulerConfig,
  SchedulerStats as ISchedulerStats,
  TaskAssignmentResult as ITaskAssignmentResult
} from './task-scheduler';

// Report Chain System
export {
  ReportChain,
  ReportCollector,
  AxonDashboard,
  reportChain,
  reportCollector,
  axonDashboard,
  submitReport,
  getDashboardSummary,
  DEFAULT_TEMPLATES,
  ReportStatus,
  ReportType,
  ReportPriority,
  ReportContent,
  Report,
  ReportTemplate,
  ReportCollectorConfig,
  ReportFilter,
  DashboardMetrics,
  Alert
} from './report-chain';

export type {
  Report as IReport,
  ReportContent as IReportContent,
  ReportTemplate as IReportTemplate,
  DashboardMetrics as IDashboardMetrics,
  Alert as IAlert
} from './report-chain';
