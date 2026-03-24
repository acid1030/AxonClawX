/**
 * Report Chain System - Usage Examples
 * 
 * Demonstrates how to use the hierarchical reporting system
 */

import {
  ReportChain,
  ReportCollector,
  AxonDashboard,
  submitReport,
  getDashboardSummary,
  type ReportContent,
  type ReportTemplate
} from '../report-chain';

// ============================================================================
// Example 1: Basic Report Submission
// ============================================================================

export async function example1_BasicReport() {
  console.log('=== Example 1: Basic Report Submission ===\n');

  const reportChain = new ReportChain();

  // Create a simple completion report
  const report = reportChain.createReport(
    'WORKER',           // Role
    'worker-001',       // Agent ID
    'miiow',            // Division ID
    {
      task: '实现用户认证模块',
      status: 'completed',
      duration: 45,
      outputs: [
        'src/auth/login.ts',
        'src/auth/register.ts',
        'src/auth/jwt.ts'
      ]
    }
  );

  // Save the report
  const savedPath = reportChain.saveReport(report);
  console.log(`Report saved to: ${savedPath}\n`);

  // Render the report
  const rendered = reportChain.renderReport(report);
  console.log('Rendered Report:');
  console.log(rendered);
  console.log('\n');
}

// ============================================================================
// Example 2: Report with Issues and Next Steps
// ============================================================================

export async function example2_ReportWithIssues() {
  console.log('=== Example 2: Report with Issues ===\n');

  const reportChain = new ReportChain();

  const report = reportChain.createReport(
    'WORKER',
    'worker-002',
    'bot01',
    {
      task: '数据库迁移',
      status: 'in-progress',
      duration: 120,
      outputs: ['migrations/001_initial.sql'],
      issues: [
        '旧数据格式不兼容',
        '需要手动清理重复记录'
      ],
      nextSteps: [
        '联系数据团队确认格式',
        '编写数据清洗脚本',
        '重新执行迁移'
      ]
    }
  );

  const savedPath = reportChain.saveReport(report);
  console.log(`Report saved to: ${savedPath}\n`);

  const rendered = reportChain.renderReport(report);
  console.log(rendered);
  console.log('\n');
}

// ============================================================================
// Example 3: Using Custom Templates
// ============================================================================

export async function example3_CustomTemplates() {
  console.log('=== Example 3: Custom Templates ===\n');

  const reportChain = new ReportChain();

  // Register a custom template for code review
  const codeReviewTemplate: ReportTemplate = {
    id: 'code-review',
    name: '代码审查汇报',
    description: 'Template for code review reports',
    template: `## 🔍 [{{role}}] 代码审查

**审查任务:** {{task}}
**审查人:** {{reviewer}}
**状态:** {{status}}
**问题数:** {{issueCount}}
**严重问题:** {{criticalIssues}}
**建议:** {{suggestions}}
**审查耗时:** {{duration}} 分钟
`,
    variables: ['role', 'task', 'reviewer', 'status', 'issueCount', 'criticalIssues', 'suggestions', 'duration']
  };

  reportChain.registerTemplate(codeReviewTemplate);

  const report = reportChain.createReport(
    'REVIEWER',
    'reviewer-001',
    'miiow',
    {
      task: '审查认证模块 PR #42',
      status: 'completed',
      duration: 30,
      outputs: ['review-report.md'],
      metadata: {
        reviewer: 'Kael',
        issueCount: 3,
        criticalIssues: 1,
        suggestions: '增加单元测试覆盖率'
      }
    }
  );

  // Render with custom template
  const rendered = reportChain.renderReport(report, 'code-review');
  console.log(rendered);
  console.log('\n');
}

// ============================================================================
// Example 4: Collecting Reports from Divisions
// ============================================================================

export async function example4_CollectReports() {
  console.log('=== Example 4: Collect Reports ===\n');

  const collector = new ReportCollector();

  // Collect all reports
  const allReports = collector.collectAllReports();
  console.log(`Total reports collected: ${allReports.length}\n`);

  // Filter by division
  const miiowReports = collector.filterReports(allReports, {
    divisionId: 'miiow',
    limit: 10
  });
  console.log(`Miiow division reports: ${miiowReports.length}\n`);

  // Filter by role
  const workerReports = collector.filterReports(allReports, {
    role: 'WORKER',
    status: 'completed'
  });
  console.log(`Completed worker reports: ${workerReports.length}\n`);

  // Get reports by role for specific division
  const commanderReports = collector.getReportsByRole('bot01', 'COMMANDER', 5);
  console.log(`Bot01 commander reports (last 5): ${commanderReports.length}\n`);
}

// ============================================================================
// Example 5: Axon Dashboard
// ============================================================================

export async function example5_AxonDashboard() {
  console.log('=== Example 5: Axon Dashboard ===\n');

  const dashboard = new AxonDashboard();

  // Get overall metrics
  const metrics = dashboard.getMetrics();
  
  console.log('📊 Dashboard Metrics');
  console.log('-------------------');
  console.log(`Total Reports: ${metrics.totalReports}`);
  console.log(`Completion Rate: ${100 - metrics.failureRate}%`);
  console.log(`Average Duration: ${metrics.averageDuration} minutes`);
  console.log('');
  
  console.log('Status Distribution:');
  console.log(`  ✅ Completed: ${metrics.byStatus.completed}`);
  console.log(`  🟡 In Progress: ${metrics.byStatus['in-progress']}`);
  console.log(`  ❌ Failed: ${metrics.byStatus.failed}`);
  console.log('');

  // Get division statuses
  console.log('Division Statuses:');
  console.log('------------------');
  const divisions = dashboard.getAllDivisionStatuses();
  for (const div of divisions.slice(0, 5)) {
    console.log(`${div.divisionId}:`);
    console.log(`  Total: ${div.totalReports}`);
    console.log(`  Active: ${div.activeTasks}`);
    console.log(`  Completed: ${div.completedTasks}`);
    console.log(`  Failed: ${div.failedTasks}`);
    console.log(`  Avg Duration: ${div.averageDuration} min`);
  }
  console.log('');

  // Check alerts
  if (metrics.alerts.length > 0) {
    console.log(`⚠️ Active Alerts (${metrics.alerts.length}):`);
    for (const alert of metrics.alerts.slice(0, 5)) {
      console.log(`  [${alert.type.toUpperCase()}] ${alert.message}`);
    }
  }
  console.log('');

  // Export dashboard data
  const exportedData = dashboard.exportDashboardData();
  console.log('Dashboard data exported as JSON');
  console.log(exportedData.slice(0, 500) + '...\n');
}

// ============================================================================
// Example 6: Quick Report Submission
// ============================================================================

export async function example6_QuickSubmit() {
  console.log('=== Example 6: Quick Submit ===\n');

  // Use the helper function for quick submission
  const savedPath = await submitReport(
    'SCRIBE',
    'scribe-001',
    'bot02',
    '整理本周知识库',
    'completed',
    60,
    ['knowledge/week12.md', 'knowledge/best-practices.md'],
    ['部分文档格式需要统一'],
    ['下周继续整理历史文档']
  );

  console.log(`Quick report saved to: ${savedPath}\n`);

  // Get dashboard summary
  const summary = getDashboardSummary();
  console.log('Dashboard Summary:');
  console.log(summary);
  console.log('\n');
}

// ============================================================================
// Example 7: Progress Report
// ============================================================================

export async function example7_ProgressReport() {
  console.log('=== Example 7: Progress Report ===\n');

  const reportChain = new ReportChain();

  // Use progress update template
  const report = reportChain.createReport(
    'WORKER',
    'worker-003',
    'miiow',
    {
      task: '开发支付接口集成',
      status: 'in-progress',
      duration: 180,
      outputs: ['src/payment/stripe.ts'],
      metadata: {
        progress: 60,
        blockers: '等待 API 密钥审批',
        needs: '需要 DevOps 协助配置环境变量',
        eta: '2026-03-14 18:00'
      }
    }
  );

  // Render with progress template
  const rendered = reportChain.renderReport(report, 'progress-update');
  console.log(rendered);
  console.log('\n');
}

// ============================================================================
// Example 8: Blocker Alert
// ============================================================================

export async function example8_BlockerAlert() {
  console.log('=== Example 8: Blocker Alert ===\n');

  const reportChain = new ReportChain();

  const report = reportChain.createReport(
    'WORKER',
    'worker-004',
    'bot03',
    {
      task: '部署生产环境',
      status: 'failed',
      duration: 15,
      outputs: [],
      issues: ['服务器 SSH 连接失败'],
      metadata: {
        reason: '防火墙阻止 SSH 连接',
        impact: '无法部署，影响上线计划',
        helpNeeded: '需要网络团队开放 SSH 端口',
        suggestions: '临时使用 VPN 或添加 IP 白名单',
        priority: 'P0'
      }
    },
    'text',
    'P0'  // High priority
  );

  // Render with blocker template
  const rendered = reportChain.renderReport(report, 'blocker-alert');
  console.log(rendered);
  console.log('\n');
}

// ============================================================================
// Example 9: Daily Summary from Scribe
// ============================================================================

export async function example9_DailySummary() {
  console.log('=== Example 9: Daily Summary ===\n');

  const reportChain = new ReportChain();

  const report = reportChain.createReport(
    'SCRIBE',
    'scribe-002',
    'miiow',
    {
      task: '2026-03-13 每日汇总',
      status: 'completed',
      duration: 30,
      outputs: ['daily/2026-03-13.md'],
      metadata: {
        date: '2026-03-13',
        division: 'miiow',
        completedTasks: '5',
        inProgressTasks: '2',
        knowledge: '新增 3 篇技术文档',
        issues: 'CI/CD 流水线偶发失败',
        plan: '继续完善测试覆盖率'
      }
    }
  );

  // Render with daily summary template
  const rendered = reportChain.renderReport(report, 'daily-summary');
  console.log(rendered);
  console.log('\n');
}

// ============================================================================
// Example 10: Auto-Collection Mode
// ============================================================================

export async function example10_AutoCollection() {
  console.log('=== Example 10: Auto-Collection Mode ===\n');

  const collector = new ReportCollector({
    autoCollect: false,
    collectionInterval: 30000  // Collect every 30 seconds
  });

  console.log('Starting auto-collection...');
  collector.startAutoCollection();

  // Let it run for a bit
  await new Promise(resolve => setTimeout(resolve, 1000));

  console.log('Auto-collection is running in background');
  console.log('Collection interval: 30 seconds');
  console.log('');

  // Stop auto-collection
  collector.stopAutoCollection();
  console.log('Auto-collection stopped');
  console.log('');
}

// ============================================================================
// Run All Examples
// ============================================================================

export async function runAllExamples() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Report Chain System - Usage Examples                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  try {
    await example1_BasicReport();
    await example2_ReportWithIssues();
    await example3_CustomTemplates();
    await example4_CollectReports();
    await example5_AxonDashboard();
    await example6_QuickSubmit();
    await example7_ProgressReport();
    await example8_BlockerAlert();
    await example9_DailySummary();
    await example10_AutoCollection();

    console.log('✅ All examples completed!\n');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}

export default {
  runAllExamples,
  example1_BasicReport,
  example2_ReportWithIssues,
  example3_CustomTemplates,
  example4_CollectReports,
  example5_AxonDashboard,
  example6_QuickSubmit,
  example7_ProgressReport,
  example8_BlockerAlert,
  example9_DailySummary,
  example10_AutoCollection
};
