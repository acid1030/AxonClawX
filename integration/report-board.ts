/**
 * Report Board Integration - 汇报链与看板集成模块
 * 
 * 功能:
 * 1. 汇报自动发送到看板 API
 * 2. 看板显示汇报摘要
 * 3. 实时汇报流
 * 
 * @module ReportBoardIntegration
 * @author KAEL
 * @version 1.0.0
 */

import { ReportChain, ReportCollector, AxonDashboard, Report, DashboardMetrics } from '../renderer/agent/report-chain';
import * as http from 'http';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface ReportBoardConfig {
  apiPort: number;
  apiHost: string;
  autoPublish: boolean;
  publishDelay: number; // ms
  maxRecentReports: number;
}

export interface ReportBoardAPI {
  endpoint: string;
  method: 'POST' | 'GET';
  path: string;
}

export interface PublishedReport {
  id: string;
  reportId: string;
  divisionId: string;
  role: string;
  task: string;
  status: string;
  priority: string;
  duration: number;
  timestamp: string;
  summary: string;
  publishedAt: number;
}

export interface ReportStreamEvent {
  type: 'new-report' | 'update' | 'alert';
  data: Report | DashboardMetrics | Alert;
  timestamp: string;
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

export interface BoardReportSummary {
  totalReports: number;
  todayReports: number;
  byStatus: Record<string, number>;
  byDivision: Record<string, number>;
  recentReports: PublishedReport[];
  activeAlerts: Alert[];
  lastUpdate: string;
}

// ============================================================================
// Report Board Publisher
// ============================================================================

export class ReportBoardPublisher {
  private config: ReportBoardConfig;
  private reportChain: ReportChain;
  private collector: ReportCollector;
  private dashboard: AxonDashboard;
  private publishedReports: Map<string, PublishedReport>;
  private eventListeners: Set<(event: ReportStreamEvent) => void>;
  private apiServer?: http.Server;

  constructor(config?: Partial<ReportBoardConfig>) {
    this.config = {
      apiPort: 18791,
      apiHost: 'localhost',
      autoPublish: true,
      publishDelay: 1000,
      maxRecentReports: 50,
      ...config
    };

    this.reportChain = new ReportChain();
    this.collector = new ReportCollector();
    this.dashboard = new AxonDashboard();
    this.publishedReports = new Map();
    this.eventListeners = new Set();
  }

  /**
   * Initialize and start the report board integration
   */
  async initialize(): Promise<void> {
    console.log('[ReportBoard] Initializing...');
    
    // Start API server
    await this.startAPIServer();
    
    // Load existing reports
    await this.loadExistingReports();
    
    console.log(`[ReportBoard] Initialized on port ${this.config.apiPort}`);
  }

  /**
   * Publish a report to the board
   */
  async publishReport(report: Report): Promise<PublishedReport> {
    const published: PublishedReport = {
      id: `pub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reportId: report.id,
      divisionId: report.divisionId,
      role: report.role,
      task: report.content.task,
      status: report.content.status,
      priority: report.priority,
      duration: report.content.duration,
      timestamp: report.timestamp,
      summary: this.generateSummary(report),
      publishedAt: Date.now()
    };

    // Store published report
    this.publishedReports.set(published.id, published);
    
    // Trim old reports if needed
    if (this.publishedReports.size > this.config.maxRecentReports) {
      const oldestId = Array.from(this.publishedReports.keys())[0];
      this.publishedReports.delete(oldestId);
    }

    // Emit event for real-time stream
    this.emitEvent({
      type: 'new-report',
      data: report,
      timestamp: new Date().toISOString()
    });

    console.log(`[ReportBoard] Published report: ${published.id}`);
    return published;
  }

  /**
   * Get board summary
   */
  getBoardSummary(): BoardReportSummary {
    const metrics = this.dashboard.getMetrics();
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    const publishedReports = Array.from(this.publishedReports.values());
    const todayReports = publishedReports.filter(r => r.publishedAt >= todayStart).length;

    return {
      totalReports: this.publishedReports.size,
      todayReports,
      byStatus: metrics.byStatus,
      byDivision: metrics.byDivision,
      recentReports: publishedReports.slice(-20),
      activeAlerts: metrics.alerts,
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Get recent reports
   */
  getRecentReports(limit: number = 20): PublishedReport[] {
    return Array.from(this.publishedReports.values())
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .slice(0, limit);
  }

  /**
   * Get reports by division
   */
  getReportsByDivision(divisionId: string): PublishedReport[] {
    return Array.from(this.publishedReports.values())
      .filter(r => r.divisionId === divisionId)
      .sort((a, b) => b.publishedAt - a.publishedAt);
  }

  /**
   * Subscribe to report stream
   */
  subscribeToStream(listener: (event: ReportStreamEvent) => void): () => void {
    this.eventListeners.add(listener);
    
    return () => {
      this.eventListeners.delete(listener);
    };
  }

  /**
   * Start API server
   */
  private async startAPIServer(): Promise<void> {
    const server = http.createServer((req, res) => {
      const url = new URL(req.url || '', `http://${this.config.apiHost}:${this.config.apiPort}`);
      
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Content-Type', 'application/json');

      if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
      }

      // API routes
      if (url.pathname === '/api/reports' && req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify({
          reports: this.getRecentReports(),
          timestamp: Date.now()
        }));
      } else if (url.pathname === '/api/reports' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', async () => {
          try {
            const reportData = JSON.parse(body);
            const report = this.reportChain.createReport(
              reportData.role,
              reportData.agentId,
              reportData.divisionId,
              reportData.content
            );
            this.reportChain.saveReport(report);
            const published = await this.publishReport(report);
            res.writeHead(201);
            res.end(JSON.stringify(published));
          } catch (error) {
            res.writeHead(400);
            res.end(JSON.stringify({ error: 'Invalid report data' }));
          }
        });
      } else if (url.pathname === '/api/reports/summary') {
        res.writeHead(200);
        res.end(JSON.stringify(this.getBoardSummary()));
      } else if (url.pathname === '/api/reports/division' && req.method === 'GET') {
        const divisionId = url.searchParams.get('divisionId');
        if (divisionId) {
          res.writeHead(200);
          res.end(JSON.stringify({
            divisionId,
            reports: this.getReportsByDivision(divisionId),
            timestamp: Date.now()
          }));
        } else {
          res.writeHead(400);
          res.end(JSON.stringify({ error: 'divisionId required' }));
        }
      } else if (url.pathname === '/api/metrics') {
        res.writeHead(200);
        res.end(JSON.stringify(this.dashboard.getMetrics()));
      } else if (url.pathname === '/api/health') {
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'ok',
          uptime: process.uptime(),
          publishedReports: this.publishedReports.size
        }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    });

    return new Promise((resolve, reject) => {
      server.listen(this.config.apiPort, this.config.apiHost, (err) => {
        if (err) reject(err);
        else {
          this.apiServer = server;
          resolve();
        }
      });
    });
  }

  /**
   * Load existing reports from file system
   */
  private async loadExistingReports(): Promise<void> {
    try {
      const allReports = this.collector.collectAllReports();
      
      for (const report of allReports.slice(-this.config.maxRecentReports)) {
        const published: PublishedReport = {
          id: `pub_${report.id}`,
          reportId: report.id,
          divisionId: report.divisionId,
          role: report.role,
          task: report.content.task,
          status: report.content.status,
          priority: report.priority,
          duration: report.content.duration,
          timestamp: report.timestamp,
          summary: this.generateSummary(report),
          publishedAt: report.createdAt
        };
        
        this.publishedReports.set(published.id, published);
      }
      
      console.log(`[ReportBoard] Loaded ${this.publishedReports.size} existing reports`);
    } catch (error) {
      console.error('[ReportBoard] Error loading existing reports:', error);
    }
  }

  /**
   * Generate summary from report
   */
  private generateSummary(report: Report): string {
    const statusEmoji = {
      'completed': '✅',
      'in-progress': '🟡',
      'failed': '❌'
    };

    return `[${report.role}] ${statusEmoji[report.content.status] || '📋'} ${report.content.task} - ${report.content.duration}min`;
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: ReportStreamEvent): void {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('[ReportBoard] Error in event listener:', error);
      }
    });
  }

  /**
   * Stop the API server
   */
  async shutdown(): Promise<void> {
    if (this.apiServer) {
      await new Promise<void>(resolve => {
        this.apiServer?.close(() => resolve());
      });
      console.log('[ReportBoard] Shutdown complete');
    }
  }
}

// ============================================================================
// Dashboard Report Panel Component (React)
// ============================================================================

export const ReportPanelComponent = `
/**
 * Report Board Panel - React Component
 * 
 * Usage:
 * import { ReportBoardPanel } from './integration/report-board';
 * 
 * <ReportBoardPanel apiEndpoint="http://localhost:18791" />
 */

import React, { useState, useEffect } from 'react';

interface PublishedReport {
  id: string;
  role: string;
  task: string;
  status: string;
  priority: string;
  duration: number;
  timestamp: string;
  summary: string;
}

interface BoardReportSummary {
  totalReports: number;
  todayReports: number;
  byStatus: Record<string, number>;
  recentReports: PublishedReport[];
  activeAlerts: any[];
  lastUpdate: string;
}

export const ReportBoardPanel: React.FC<{ apiEndpoint?: string }> = ({ 
  apiEndpoint = 'http://localhost:18791' 
}) => {
  const [summary, setSummary] = useState<BoardReportSummary | null>(null);
  const [reports, setReports] = useState<PublishedReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSummary();
    const interval = setInterval(fetchSummary, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  const fetchSummary = async () => {
    try {
      const [summaryRes, reportsRes] = await Promise.all([
        fetch(\`\${apiEndpoint}/api/reports/summary\`),
        fetch(\`\${apiEndpoint}/api/reports\`)
      ]);
      
      const summaryData = await summaryRes.json();
      const reportsData = await reportsRes.json();
      
      setSummary(summaryData);
      setReports(reportsData.reports || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch report data:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e';
      case 'in-progress': return '#eab308';
      case 'failed': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'P0': 'bg-red-500',
      'P1': 'bg-orange-500',
      'P2': 'bg-blue-500',
      'P3': 'bg-gray-500'
    };
    return colors[priority] || 'bg-gray-500';
  };

  if (loading) {
    return <div className="p-4 text-center">Loading reports...</div>;
  }

  return (
    <div className="p-4 space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold">{summary?.totalReports || 0}</div>
          <div className="text-sm text-gray-500">Total Reports</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold">{summary?.todayReports || 0}</div>
          <div className="text-sm text-gray-500">Today</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-green-500">
            {summary?.byStatus?.completed || 0}
          </div>
          <div className="text-sm text-gray-500">Completed</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-2xl font-bold text-yellow-500">
            {summary?.byStatus?.['in-progress'] || 0}
          </div>
          <div className="text-sm text-gray-500">In Progress</div>
        </div>
      </div>

      {/* Alerts */}
      {summary?.activeAlerts && summary.activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-semibold text-red-800 mb-2">⚠️ Active Alerts</h3>
          {summary.activeAlerts.slice(0, 5).map(alert => (
            <div key={alert.id} className="text-sm text-red-700">
              [{alert.type.toUpperCase()}] {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Recent Reports</h3>
        </div>
        <div className="divide-y">
          {reports.map(report => (
            <div key={report.id} className="p-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      [{report.role}]
                    </span>
                    <span className={\`px-2 py-0.5 rounded text-xs text-white \${getPriorityBadge(report.priority)}\`}>
                      {report.priority}
                    </span>
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: getStatusColor(report.status) }}
                    />
                  </div>
                  <div className="text-sm text-gray-600">{report.task}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {report.duration} min • {new Date(report.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportBoardPanel;
`;

// ============================================================================
// Singleton Instance
// ============================================================================

export const reportBoardPublisher = new ReportBoardPublisher();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Quick publish a report to the board
 */
export async function publishToBoard(
  role: string,
  agentId: string,
  divisionId: string,
  task: string,
  status: 'completed' | 'in-progress' | 'failed',
  duration: number,
  outputs: string[] = [],
  issues: string[] = []
): Promise<PublishedReport> {
  const report = reportBoardPublisher['reportChain'].createReport(
    role,
    agentId,
    divisionId,
    {
      task,
      status,
      duration,
      outputs,
      issues
    }
  );

  reportBoardPublisher['reportChain'].saveReport(report);
  return await reportBoardPublisher.publishReport(report);
}

/**
 * Get current board summary
 */
export function getBoardSummary(): BoardReportSummary {
  return reportBoardPublisher.getBoardSummary();
}

// ============================================================================
// Exports
// ============================================================================

export default {
  ReportBoardPublisher,
  reportBoardPublisher,
  publishToBoard,
  getBoardSummary,
  ReportPanelComponent
};
