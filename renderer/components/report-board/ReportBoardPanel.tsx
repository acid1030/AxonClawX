/**
 * Report Board Panel Component
 * 
 * Displays real-time report stream from the汇报 chain system
 * Features:
 * - Summary metrics (total, today, by status)
 * - Active alerts
 * - Recent reports feed
 * - Auto-refresh every 30 seconds
 * 
 * @component
 * @author KAEL
 */

import React, { useState, useEffect } from 'react';

// ============================================================================
// Types
// ============================================================================

interface PublishedReport {
  id: string;
  divisionId: string;
  role: string;
  task: string;
  status: 'completed' | 'in-progress' | 'failed';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  duration: number;
  timestamp: string;
  summary: string;
}

interface Alert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  message: string;
  divisionId?: string;
  role?: string;
  timestamp: string;
  resolved: boolean;
}

interface BoardReportSummary {
  totalReports: number;
  todayReports: number;
  byStatus: Record<string, number>;
  byDivision: Record<string, number>;
  recentReports: PublishedReport[];
  activeAlerts: Alert[];
  lastUpdate: string;
}

interface ReportBoardPanelProps {
  apiEndpoint?: string;
  title?: string;
  showMetrics?: boolean;
  showAlerts?: boolean;
  maxReports?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

// ============================================================================
// Component
// ============================================================================

export const ReportBoardPanel: React.FC<ReportBoardPanelProps> = ({
  apiEndpoint = 'http://localhost:18790',
  title = '🜏 汇报链看板',
  showMetrics = true,
  showAlerts = true,
  maxReports = 20,
  autoRefresh = true,
  refreshInterval = 30000
}) => {
  const [summary, setSummary] = useState<BoardReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSummary();
    
    if (autoRefresh) {
      const interval = setInterval(fetchSummary, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [apiEndpoint, autoRefresh, refreshInterval]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${apiEndpoint}/api/reports/summary`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setSummary(data);
    } catch (err) {
      console.error('Failed to fetch report summary:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#22c55e'; // green-500
      case 'in-progress': return '#eab308'; // yellow-500
      case 'failed': return '#ef4444'; // red-500
      default: return '#6b7280'; // gray-500
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return '完成';
      case 'in-progress': return '进行中';
      case 'failed': return '失败';
      default: return status;
    }
  };

  const getPriorityBadge = (priority: string) => {
    const colors: Record<string, string> = {
      'P0': 'bg-red-500 text-white',
      'P1': 'bg-orange-500 text-white',
      'P2': 'bg-blue-500 text-white',
      'P3': 'bg-gray-500 text-white'
    };
    return colors[priority] || 'bg-gray-500 text-white';
  };

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'critical': return 'bg-red-50 border-red-200 text-red-800';
      case 'error': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleDateString('zh-CN');
  };

  // Loading state
  if (loading && !summary) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">加载汇报数据中...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="font-semibold text-red-800 mb-2">❌ 加载失败</h3>
        <p className="text-sm text-red-700">{error}</p>
        <button
          onClick={fetchSummary}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <button
          onClick={fetchSummary}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          title="刷新数据"
        >
          🔄 刷新
        </button>
      </div>

      {/* Summary Metrics */}
      {showMetrics && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
            <div className="text-2xl font-bold text-gray-900">
              {summary.totalReports}
            </div>
            <div className="text-sm text-gray-500">总汇报数</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-gray-900">
              {summary.todayReports}
            </div>
            <div className="text-sm text-gray-500">今日汇报</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
            <div className="text-2xl font-bold text-green-600">
              {summary.byStatus?.completed || 0}
            </div>
            <div className="text-sm text-gray-500">✅ 完成</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
            <div className="text-2xl font-bold text-yellow-600">
              {summary.byStatus?.['in-progress'] || 0}
            </div>
            <div className="text-sm text-gray-500">🟡 进行中</div>
          </div>
        </div>
      )}

      {/* Active Alerts */}
      {showAlerts && summary && summary.activeAlerts && summary.activeAlerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold text-gray-700">⚠️ 活跃告警 ({summary.activeAlerts.length})</h3>
          {summary.activeAlerts.slice(0, 5).map(alert => (
            <div
              key={alert.id}
              className={`border rounded-lg p-3 ${getAlertColor(alert.type)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium mb-1">
                    [{alert.type.toUpperCase()}] {alert.message}
                  </div>
                  {alert.divisionId && (
                    <div className="text-sm opacity-75">
                      分队：{alert.divisionId} • {alert.role && `角色：${alert.role}`}
                    </div>
                  )}
                </div>
                <div className="text-xs opacity-75">
                  {formatTime(alert.timestamp)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Reports */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">📋 最近汇报</h3>
        </div>
        
        <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {summary && summary.recentReports && summary.recentReports.length > 0 ? (
            summary.recentReports.slice(0, maxReports).map(report => (
              <div
                key={report.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Status Indicator */}
                  <div
                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: getStatusColor(report.status) }}
                    title={getStatusLabel(report.status)}
                  />
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        [{report.role}]
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityBadge(report.priority)}`}
                      >
                        {report.priority}
                      </span>
                      <span className="text-xs text-gray-500">
                        {report.duration} 分钟
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-700 truncate">
                      {report.task}
                    </div>
                    
                    <div className="text-xs text-gray-400 mt-1">
                      {formatTime(report.timestamp)}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">
              暂无汇报数据
            </div>
          )}
        </div>
      </div>

      {/* Last Update */}
      {summary && (
        <div className="text-xs text-gray-400 text-right">
          最后更新：{formatTime(summary.lastUpdate)}
        </div>
      )}
    </div>
  );
};

export default ReportBoardPanel;
