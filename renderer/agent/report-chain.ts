/**
 * Report Chain System - 分层汇报链系统
 * 
 * Implements hierarchical reporting: Member → Commander → Axon
 * Supports text/JSON/file reports with template system
 * 
 * @module ReportChain
 * @author ACE (Axon Core Engineer)
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// Types & Interfaces
// ============================================================================

export type ReportStatus = 'completed' | 'in-progress' | 'failed';

export type ReportType = 'text' | 'json' | 'file' | 'mixed';

export type ReportPriority = 'P0' | 'P1' | 'P2' | 'P3';

export interface ReportContent {
  task: string;
  status: ReportStatus;
  duration: number; // minutes
  outputs: string[]; // file paths
  issues?: string[];
  nextSteps?: string[];
  metadata?: Record<string, any>;
}

export interface Report {
  id: string;
  role: string;
  agentId: string;
  divisionId: string;
  type: ReportType;
  priority: ReportPriority;
  content: ReportContent;
  rawText?: string;
  attachments?: string[];
  timestamp: string;
  createdAt: number;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];
}

export interface ReportCollectorConfig {
  basePath: string;
  autoCollect: boolean;
  collectionInterval: number; // ms
  maxReports: number;
}

export interface ReportFilter {
  divisionId?: string;
  role?: string;
  status?: ReportStatus;
  priority?: ReportPriority;
  startTime?: Date;
  endTime?: Date;
  limit?: number;
}

export interface DashboardMetrics {
  totalReports: number;
  byStatus: Record<ReportStatus, number>;
  byDivision: Record<string, number>;
  byRole: Record<string, number>;
  averageDuration: number;
  failureRate: number;
  recentReports: Report[];
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  divisionId?: string;
  role?: string;
  timestamp: string;
  resolved: boolean;
}

// ============================================================================
// Report Templates
// ============================================================================

export const DEFAULT_TEMPLATES: ReportTemplate[] = [
  {
    id: 'task-completion',
    name: '任务完成汇报',
    description: 'Standard task completion report',
    template: `## [{{role}}] 任务汇报

**任务:** {{task}}
**状态:** {{status}}
**耗时:** {{duration}} 分钟
**产出:** {{outputs}}
**问题:** {{issues}}
**下一步:** {{nextSteps}}
`,
    variables: ['role', 'task', 'status', 'duration', 'outputs', 'issues', 'nextSteps']
  },
  {
    id: 'progress-update',
    name: '进度汇报',
    description: 'Periodic progress update',
    template: `## [{{role}}] 进度汇报

**任务:** {{task}}
**当前进度:** {{progress}}%
**状态:** {{status}}
**已耗时:** {{duration}} 分钟
**阻塞项:** {{blockers}}
**需要支持:** {{needs}}
**预计完成:** {{eta}}
`,
    variables: ['role', 'task', 'progress', 'status', 'duration', 'blockers', 'needs', 'eta']
  },
  {
    id: 'blocker-alert',
    name: '阻塞预警',
    description: 'Blocker alert report',
    template: `## [{{role}}] 🚨 阻塞预警

**任务:** {{task}}
**阻塞原因:** {{reason}}
**影响范围:** {{impact}}
**需要帮助:** {{helpNeeded}}
**建议方案:** {{suggestions}}
**紧急程度:** {{priority}}
`,
    variables: ['role', 'task', 'reason', 'impact', 'helpNeeded', 'suggestions', 'priority']
  },
  {
    id: 'daily-summary',
    name: '每日汇总',
    description: 'Daily summary report from scribe',
    template: `## [{{role}}] 每日汇总

**日期:** {{date}}
**分队:** {{division}}
**完成的任务:** {{completedTasks}}
**进行中的任务:** {{inProgressTasks}}
**知识沉淀:** {{knowledge}}
**问题与解决:** {{issues}}
**明日计划:** {{plan}}
`,
    variables: ['role', 'date', 'division', 'completedTasks', 'inProgressTasks', 'knowledge', 'issues', 'plan']
  }
];

// ============================================================================
// Report Chain Core
// ============================================================================

export class ReportChain {
  private basePath: string;
  private templates: Map<string, ReportTemplate>;

  constructor(basePath?: string) {
    this.basePath = basePath || path.join(
      process.env.HOME || '~',
      '.openclaw',
      'memory',
      'divisions'
    );
    this.templates = new Map();
    
    // Initialize default templates
    DEFAULT_TEMPLATES.forEach(t => this.registerTemplate(t));
  }

  /**
   * Create a new report
   */
  createReport(
    role: string,
    agentId: string,
    divisionId: string,
    content: ReportContent,
    type: ReportType = 'text',
    priority: ReportPriority = 'P2',
    attachments?: string[]
  ): Report {
    const report: Report = {
      id: this.generateReportId(),
      role,
      agentId,
      divisionId,
      type,
      priority,
      content,
      attachments,
      timestamp: new Date().toISOString(),
      createdAt: Date.now()
    };

    return report;
  }

  /**
   * Render report using template
   */
  renderReport(report: Report, templateId?: string): string {
    const template = templateId 
      ? this.templates.get(templateId)
      : this.templates.get('task-completion');

    if (!template) {
      throw new Error(`Template '${templateId}' not found`);
    }

    let rendered = template.template;

    // Replace variables
    rendered = rendered.replace('{{role}}', report.role);
    rendered = rendered.replace('{{task}}', report.content.task);
    rendered = rendered.replace(
      '{{status}}',
      this.formatStatus(report.content.status)
    );
    rendered = rendered.replace('{{duration}}', report.content.duration.toString());
    rendered = rendered.replace(
      '{{outputs}}',
      report.content.outputs.length > 0 
        ? report.content.outputs.join(', ')
        : '无'
    );
    rendered = rendered.replace(
      '{{issues}}',
      report.content.issues && report.content.issues.length > 0
        ? report.content.issues.join('; ')
        : '无'
    );
    rendered = rendered.replace(
      '{{nextSteps}}',
      report.content.nextSteps && report.content.nextSteps.length > 0
        ? report.content.nextSteps.join('; ')
        : '无'
    );

    // Add metadata if present
    if (report.content.metadata) {
      rendered += '\n\n---\n';
      rendered += '```json\n';
      rendered += JSON.stringify(report.content.metadata, null, 2);
      rendered += '\n```';
    }

    return rendered;
  }

  /**
   * Save report to division folder
   */
  saveReport(report: Report, savePath?: string): string {
    const divisionPath = path.join(this.basePath, report.divisionId, 'shared', 'reports');
    
    // Ensure directory exists
    if (!fs.existsSync(divisionPath)) {
      fs.mkdirSync(divisionPath, { recursive: true });
    }

    // Create date-based subfolder
    const date = new Date(report.createdAt);
    const datePath = path.join(
      divisionPath,
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    );
    
    if (!fs.existsSync(datePath)) {
      fs.mkdirSync(datePath, { recursive: true });
    }

    // Determine save path
    const finalPath = savePath || path.join(
      datePath,
      `${report.id}.md`
    );

    // Render and save
    const rendered = this.renderReport(report);
    fs.writeFileSync(finalPath, rendered, 'utf8');

    // Save JSON version for programmatic access
    const jsonPath = finalPath.replace('.md', '.json');
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

    return finalPath;
  }

  /**
   * Load report from file
   */
  loadReport(reportPath: string): Report | null {
    try {
      if (!fs.existsSync(reportPath)) {
        return null;
      }

      const jsonPath = reportPath.replace('.md', '.json');
      
      if (fs.existsSync(jsonPath)) {
        const content = fs.readFileSync(jsonPath, 'utf8');
        return JSON.parse(content) as Report;
      }

      // Fallback: parse markdown (basic implementation)
      const mdContent = fs.readFileSync(reportPath, 'utf8');
      return this.parseMarkdownReport(mdContent);
    } catch (error) {
      console.error('[ReportChain] Error loading report:', error);
      return null;
    }
  }

  /**
   * Register a custom template
   */
  registerTemplate(template: ReportTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Get all registered templates
   */
  getTemplates(): ReportTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Generate unique report ID
   */
  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Format status with emoji
   */
  private formatStatus(status: ReportStatus): string {
    switch (status) {
      case 'completed': return '✅完成';
      case 'in-progress': return '🟡进行中';
      case 'failed': return '❌失败';
      default: return status;
    }
  }

  /**
   * Parse markdown report (basic implementation)
   */
  private parseMarkdownReport(md: string): Report | null {
    // Basic parsing - can be enhanced
    const lines = md.split('\n');
    const content: Partial<ReportContent> = {};
    
    for (const line of lines) {
      if (line.startsWith('**任务:**')) {
        content.task = line.replace('**任务:**', '').trim();
      } else if (line.startsWith('**状态:**')) {
        const statusText = line.replace('**状态:**', '').trim();
        if (statusText.includes('完成')) content.status = 'completed';
        else if (statusText.includes('进行中')) content.status = 'in-progress';
        else if (statusText.includes('失败')) content.status = 'failed';
      } else if (line.startsWith('**耗时:**')) {
        const match = line.match(/(\d+)/);
        if (match) content.duration = parseInt(match[1]);
      }
    }

    if (!content.task || !content.status) {
      return null;
    }

    return {
      id: 'parsed_' + Date.now(),
      role: 'Unknown',
      agentId: 'Unknown',
      divisionId: 'Unknown',
      type: 'text',
      priority: 'P2',
      content: content as ReportContent,
      timestamp: new Date().toISOString(),
      createdAt: Date.now()
    };
  }
}

// ============================================================================
// Report Collector
// ============================================================================

export class ReportCollector {
  private config: ReportCollectorConfig;
  private reportChain: ReportChain;
  private collectionTimer?: NodeJS.Timeout;

  constructor(config?: Partial<ReportCollectorConfig>) {
    this.config = {
      basePath: path.join(process.env.HOME || '~', '.openclaw', 'memory', 'divisions'),
      autoCollect: false,
      collectionInterval: 60000, // 1 minute
      maxReports: 1000,
      ...config
    };
    
    this.reportChain = new ReportChain(this.config.basePath);
  }

  /**
   * Start auto-collection
   */
  startAutoCollection(): void {
    if (this.collectionTimer) {
      this.stopAutoCollection();
    }

    this.config.autoCollect = true;
    this.collectionTimer = setInterval(() => {
      this.collectAllReports();
    }, this.config.collectionInterval);

    console.log('[ReportCollector] Auto-collection started');
  }

  /**
   * Stop auto-collection
   */
  stopAutoCollection(): void {
    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }
    this.config.autoCollect = false;
    console.log('[ReportCollector] Auto-collection stopped');
  }

  /**
   * Collect all reports from divisions
   */
  collectAllReports(): Report[] {
    const reports: Report[] = [];
    
    try {
      const divisions = fs.readdirSync(this.config.basePath);
      
      for (const divisionId of divisions) {
        const divisionReports = this.collectDivisionReports(divisionId);
        reports.push(...divisionReports);
      }

      console.log(`[ReportCollector] Collected ${reports.length} reports`);
      return reports;
    } catch (error) {
      console.error('[ReportCollector] Error collecting reports:', error);
      return [];
    }
  }

  /**
   * Collect reports from specific division
   */
  collectDivisionReports(divisionId: string): Report[] {
    const reports: Report[] = [];
    const reportsPath = path.join(this.config.basePath, divisionId, 'shared', 'reports');

    if (!fs.existsSync(reportsPath)) {
      return reports;
    }

    try {
      // Walk through date folders
      const dateFolders = fs.readdirSync(reportsPath);
      
      for (const dateFolder of dateFolders) {
        const datePath = path.join(reportsPath, dateFolder);
        
        if (!fs.statSync(datePath).isDirectory()) {
          continue;
        }

        const files = fs.readdirSync(datePath);
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const filePath = path.join(datePath, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const report = JSON.parse(content) as Report;
            
            if (report.divisionId === divisionId) {
              reports.push(report);
            }
          }
        }
      }

      return reports;
    } catch (error) {
      console.error(`[ReportCollector] Error collecting reports for ${divisionId}:`, error);
      return [];
    }
  }

  /**
   * Filter reports
   */
  filterReports(reports: Report[], filter: ReportFilter): Report[] {
    return reports.filter(report => {
      if (filter.divisionId && report.divisionId !== filter.divisionId) {
        return false;
      }
      if (filter.role && report.role !== filter.role) {
        return false;
      }
      if (filter.status && report.content.status !== filter.status) {
        return false;
      }
      if (filter.priority && report.priority !== filter.priority) {
        return false;
      }
      if (filter.startTime && report.createdAt < filter.startTime.getTime()) {
        return false;
      }
      if (filter.endTime && report.createdAt > filter.endTime.getTime()) {
        return false;
      }
      return true;
    }).slice(0, filter.limit || reports.length);
  }

  /**
   * Get reports by time range
   */
  getReportsByTimeRange(
    divisionId: string,
    startTime: Date,
    endTime: Date
  ): Report[] {
    const allReports = this.collectDivisionReports(divisionId);
    return this.filterReports(allReports, { startTime, endTime });
  }

  /**
   * Get reports by role
   */
  getReportsByRole(
    divisionId: string,
    role: string,
    limit: number = 50
  ): Report[] {
    const allReports = this.collectDivisionReports(divisionId);
    return this.filterReports(allReports, { role, limit });
  }
}

// ============================================================================
// Axon Dashboard
// ============================================================================

export class AxonDashboard {
  private reportChain: ReportChain;
  private collector: ReportCollector;
  private alerts: Map<string, Alert>;

  constructor() {
    this.reportChain = new ReportChain();
    this.collector = new ReportCollector();
    this.alerts = new Map();
  }

  /**
   * Get dashboard metrics
   */
  getMetrics(): DashboardMetrics {
    const allReports = this.collector.collectAllReports();
    
    const metrics: DashboardMetrics = {
      totalReports: allReports.length,
      byStatus: {
        completed: 0,
        'in-progress': 0,
        failed: 0
      },
      byDivision: {},
      byRole: {},
      averageDuration: 0,
      failureRate: 0,
      recentReports: [],
      alerts: []
    };

    // Calculate metrics
    let totalDuration = 0;
    
    for (const report of allReports) {
      // By status
      metrics.byStatus[report.content.status]++;
      
      // By division
      metrics.byDivision[report.divisionId] = 
        (metrics.byDivision[report.divisionId] || 0) + 1;
      
      // By role
      metrics.byRole[report.role] = 
        (metrics.byRole[report.role] || 0) + 1;
      
      // Duration
      totalDuration += report.content.duration;

      // Check for alerts
      this.checkForAlerts(report);
    }

    // Average duration
    metrics.averageDuration = allReports.length > 0 
      ? Math.round(totalDuration / allReports.length) 
      : 0;

    // Failure rate
    metrics.failureRate = allReports.length > 0
      ? Math.round((metrics.byStatus.failed / allReports.length) * 100)
      : 0;

    // Recent reports (last 20)
    metrics.recentReports = allReports
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 20);

    // Alerts
    metrics.alerts = Array.from(this.alerts.values())
      .filter(a => !a.resolved);

    return metrics;
  }

  /**
   * Get division status summary
   */
  getDivisionStatus(divisionId: string): {
    divisionId: string;
    totalReports: number;
    activeTasks: number;
    completedTasks: number;
    failedTasks: number;
    averageDuration: number;
    lastReportTime?: string;
  } {
    const reports = this.collector.collectDivisionReports(divisionId);
    
    const status = {
      divisionId,
      totalReports: reports.length,
      activeTasks: reports.filter(r => r.content.status === 'in-progress').length,
      completedTasks: reports.filter(r => r.content.status === 'completed').length,
      failedTasks: reports.filter(r => r.content.status === 'failed').length,
      averageDuration: 0,
      lastReportTime: undefined
    };

    if (reports.length > 0) {
      const totalDuration = reports.reduce((sum, r) => sum + r.content.duration, 0);
      status.averageDuration = Math.round(totalDuration / reports.length);
      
      const sorted = reports.sort((a, b) => b.createdAt - a.createdAt);
      status.lastReportTime = sorted[0].timestamp;
    }

    return status;
  }

  /**
   * Get all division statuses
   */
  getAllDivisionStatuses(): Array<ReturnType<AxonDashboard['getDivisionStatus']>> {
    const divisions = fs.readdirSync(
      path.join(process.env.HOME || '~', '.openclaw', 'memory', 'divisions')
    );

    return divisions.map(d => this.getDivisionStatus(d));
  }

  /**
   * Check for alerts in report
   */
  private checkForAlerts(report: Report): void {
    // Failed task alert
    if (report.content.status === 'failed') {
      const alertId = `failed_${report.id}`;
      this.alerts.set(alertId, {
        id: alertId,
        type: 'error',
        message: `任务失败: ${report.content.task}`,
        divisionId: report.divisionId,
        role: report.role,
        timestamp: report.timestamp,
        resolved: false
      });
    }

    // Issues alert
    if (report.content.issues && report.content.issues.length > 0) {
      const alertId = `issues_${report.id}`;
      this.alerts.set(alertId, {
        id: alertId,
        type: 'warning',
        message: `任务问题: ${report.content.issues.join('; ')}`,
        divisionId: report.divisionId,
        role: report.role,
        timestamp: report.timestamp,
        resolved: false
      });
    }

    // P0 priority alert
    if (report.priority === 'P0') {
      const alertId = `p0_${report.id}`;
      this.alerts.set(alertId, {
        id: alertId,
        type: 'critical',
        message: `P0 紧急任务: ${report.content.task}`,
        divisionId: report.divisionId,
        role: report.role,
        timestamp: report.timestamp,
        resolved: false
      });
    }
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolved = true;
      this.alerts.set(alertId, alert);
    }
  }

  /**
   * Clear resolved alerts
   */
  clearResolvedAlerts(): void {
    const alertsToRemove: string[] = [];
    
    this.alerts.forEach((alert, id) => {
      if (alert.resolved) {
        alertsToRemove.push(id);
      }
    });
    
    alertsToRemove.forEach(id => this.alerts.delete(id));
  }

  /**
   * Export dashboard data as JSON
   */
  exportDashboardData(): string {
    const metrics = this.getMetrics();
    const divisions = this.getAllDivisionStatuses();
    
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics,
      divisions
    }, null, 2);
  }
}

// ============================================================================
// Singleton Instances
// ============================================================================

export const reportChain = new ReportChain();
export const reportCollector = new ReportCollector();
export const axonDashboard = new AxonDashboard();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick create and submit a report
 */
export async function submitReport(
  role: string,
  agentId: string,
  divisionId: string,
  task: string,
  status: ReportStatus,
  duration: number,
  outputs: string[] = [],
  issues: string[] = [],
  nextSteps: string[] = []
): Promise<string> {
  const report = reportChain.createReport(role, agentId, divisionId, {
    task,
    status,
    duration,
    outputs,
    issues,
    nextSteps
  });

  const savedPath = reportChain.saveReport(report);
  console.log(`[ReportChain] Report submitted: ${savedPath}`);
  
  return savedPath;
}

/**
 * Get quick dashboard summary
 */
export function getDashboardSummary(): string {
  const metrics = axonDashboard.getMetrics();
  
  let summary = `## 🜏 Axon Dashboard Summary\n\n`;
  summary += `**总汇报数:** ${metrics.totalReports}\n`;
  summary += `**完成率:** ${100 - metrics.failureRate}%\n`;
  summary += `**平均耗时:** ${metrics.averageDuration} 分钟\n\n`;
  
  summary += `### 状态分布\n`;
  summary += `- ✅ 完成: ${metrics.byStatus.completed}\n`;
  summary += `- 🟡 进行中: ${metrics.byStatus['in-progress']}\n`;
  summary += `- ❌ 失败: ${metrics.byStatus.failed}\n\n`;
  
  if (metrics.alerts.length > 0) {
    summary += `### ⚠️ 活跃告警 (${metrics.alerts.length})\n`;
    for (const alert of metrics.alerts.slice(0, 5)) {
      summary += `- [${alert.type.toUpperCase()}] ${alert.message}\n`;
    }
  }

  return summary;
}

export default {
  ReportChain,
  ReportCollector,
  AxonDashboard,
  reportChain,
  reportCollector,
  axonDashboard,
  submitReport,
  getDashboardSummary,
  DEFAULT_TEMPLATES
};
