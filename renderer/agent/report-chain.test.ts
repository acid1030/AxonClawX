/**
 * Report Chain System - Unit Tests
 * 
 * Tests for hierarchical reporting system
 */

import * as fs from 'fs';
import * as path from 'path';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

import {
  ReportChain,
  ReportCollector,
  AxonDashboard,
  DEFAULT_TEMPLATES,
  submitReport,
  getDashboardSummary,
  type ReportContent,
  type ReportStatus,
  type ReportTemplate
} from './report-chain';

// Test constants
const TEST_BASE_PATH = path.join(__dirname, '..', '..', '..', 'test-data', 'reports');
const TEST_DIVISION_ID = 'test-division';
const TEST_ROLE = 'TESTER';
const TEST_AGENT_ID = 'test-agent-001';

describe('ReportChain', () => {
  let reportChain: ReportChain;

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_BASE_PATH)) {
      fs.rmSync(TEST_BASE_PATH, { recursive: true });
    }
    
    reportChain = new ReportChain(TEST_BASE_PATH);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_BASE_PATH)) {
      fs.rmSync(TEST_BASE_PATH, { recursive: true });
    }
  });

  describe('createReport', () => {
    it('should create a basic report', () => {
      const content: ReportContent = {
        task: 'Test Task',
        status: 'completed',
        duration: 30,
        outputs: ['file1.txt', 'file2.txt']
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      expect(report.id).toBeDefined();
      expect(report.id).toMatch(/^rpt_\d+_[a-z0-9]+$/);
      expect(report.role).toBe(TEST_ROLE);
      expect(report.agentId).toBe(TEST_AGENT_ID);
      expect(report.divisionId).toBe(TEST_DIVISION_ID);
      expect(report.content.task).toBe('Test Task');
      expect(report.content.status).toBe('completed');
      expect(report.content.duration).toBe(30);
      expect(report.timestamp).toBeDefined();
      expect(report.createdAt).toBeDefined();
    });

    it('should create report with issues and next steps', () => {
      const content: ReportContent = {
        task: 'Complex Task',
        status: 'in-progress',
        duration: 60,
        outputs: [],
        issues: ['Issue 1', 'Issue 2'],
        nextSteps: ['Step 1', 'Step 2']
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      expect(report.content.issues).toHaveLength(2);
      expect(report.content.nextSteps).toHaveLength(2);
    });

    it('should create report with metadata', () => {
      const content: ReportContent = {
        task: 'Task with metadata',
        status: 'completed',
        duration: 15,
        outputs: [],
        metadata: {
          customField: 'value',
          numericField: 42
        }
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      expect(report.content.metadata).toBeDefined();
      expect(report.content.metadata?.customField).toBe('value');
    });
  });

  describe('renderReport', () => {
    it('should render report with default template', () => {
      const content: ReportContent = {
        task: 'Render Test Task',
        status: 'completed',
        duration: 45,
        outputs: ['output.txt']
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      const rendered = reportChain.renderReport(report);

      expect(rendered).toContain(`## [${TEST_ROLE}] 任务汇报`);
      expect(rendered).toContain('**任务:** Render Test Task');
      expect(rendered).toContain('**状态:** ✅完成');
      expect(rendered).toContain('**耗时:** 45 分钟');
      expect(rendered).toContain('**产出:** output.txt');
    });

    it('should render report with no outputs', () => {
      const content: ReportContent = {
        task: 'Task without outputs',
        status: 'completed',
        duration: 10,
        outputs: []
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      const rendered = reportChain.renderReport(report);
      expect(rendered).toContain('**产出:** 无');
    });

    it('should render report with issues', () => {
      const content: ReportContent = {
        task: 'Task with issues',
        status: 'in-progress',
        duration: 20,
        outputs: [],
        issues: ['Problem 1', 'Problem 2']
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      const rendered = reportChain.renderReport(report);
      expect(rendered).toContain('**问题:** Problem 1; Problem 2');
    });

    it('should render report with metadata as JSON', () => {
      const content: ReportContent = {
        task: 'Task with metadata',
        status: 'completed',
        duration: 30,
        outputs: [],
        metadata: { key: 'value' }
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      const rendered = reportChain.renderReport(report);
      expect(rendered).toContain('```json');
      expect(rendered).toContain('"key": "value"');
    });
  });

  describe('saveReport', () => {
    it('should save report to correct path', () => {
      const content: ReportContent = {
        task: 'Save Test',
        status: 'completed',
        duration: 25,
        outputs: []
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      const savedPath = reportChain.saveReport(report);

      expect(savedPath).toBeDefined();
      expect(fs.existsSync(savedPath)).toBe(true);
      
      // Check JSON file also exists
      const jsonPath = savedPath.replace('.md', '.json');
      expect(fs.existsSync(jsonPath)).toBe(true);
    });

    it('should create directory structure if not exists', () => {
      const content: ReportContent = {
        task: 'Directory Test',
        status: 'completed',
        duration: 10,
        outputs: []
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      const savedPath = reportChain.saveReport(report);
      
      // Verify directory was created
      const dirPath = path.dirname(savedPath);
      expect(fs.existsSync(dirPath)).toBe(true);
    });

    it('should save report with correct content', () => {
      const content: ReportContent = {
        task: 'Content Test',
        status: 'failed',
        duration: 5,
        outputs: [],
        issues: ['Test issue']
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      const savedPath = reportChain.saveReport(report);
      const fileContent = fs.readFileSync(savedPath, 'utf8');

      expect(fileContent).toContain('## [TESTER] 任务汇报');
      expect(fileContent).toContain('**任务:** Content Test');
      expect(fileContent).toContain('**状态:** ❌失败');
    });
  });

  describe('loadReport', () => {
    it('should load report from JSON file', () => {
      const content: ReportContent = {
        task: 'Load Test',
        status: 'completed',
        duration: 35,
        outputs: ['test.txt']
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      const savedPath = reportChain.saveReport(report);
      const loaded = reportChain.loadReport(savedPath);

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe(report.id);
      expect(loaded?.content.task).toBe('Load Test');
    });

    it('should return null for non-existent file', () => {
      const loaded = reportChain.loadReport('/non/existent/path.md');
      expect(loaded).toBeNull();
    });
  });

  describe('registerTemplate', () => {
    it('should register custom template', () => {
      const customTemplate: ReportTemplate = {
        id: 'custom-template',
        name: 'Custom Template',
        description: 'A custom template',
        template: 'Custom: {{task}} - {{status}}',
        variables: ['task', 'status']
      };

      reportChain.registerTemplate(customTemplate);
      const templates = reportChain.getTemplates();

      expect(templates.some(t => t.id === 'custom-template')).toBe(true);
    });

    it('should use custom template for rendering', () => {
      const customTemplate: ReportTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test',
        template: 'TASK: {{task}} | STATUS: {{status}}',
        variables: ['task', 'status']
      };

      reportChain.registerTemplate(customTemplate);

      const content: ReportContent = {
        task: 'Template Test',
        status: 'completed',
        duration: 10,
        outputs: []
      };

      const report = reportChain.createReport(
        TEST_ROLE,
        TEST_AGENT_ID,
        TEST_DIVISION_ID,
        content
      );

      const rendered = reportChain.renderReport(report, 'test-template');
      expect(rendered).toContain('TASK: Template Test');
      expect(rendered).toContain('STATUS: ✅完成');
    });
  });

  describe('DEFAULT_TEMPLATES', () => {
    it('should have task-completion template', () => {
      const template = DEFAULT_TEMPLATES.find(t => t.id === 'task-completion');
      expect(template).toBeDefined();
      expect(template?.variables).toContain('task');
      expect(template?.variables).toContain('status');
    });

    it('should have progress-update template', () => {
      const template = DEFAULT_TEMPLATES.find(t => t.id === 'progress-update');
      expect(template).toBeDefined();
      expect(template?.variables).toContain('progress');
    });

    it('should have blocker-alert template', () => {
      const template = DEFAULT_TEMPLATES.find(t => t.id === 'blocker-alert');
      expect(template).toBeDefined();
      expect(template?.variables).toContain('reason');
    });

    it('should have daily-summary template', () => {
      const template = DEFAULT_TEMPLATES.find(t => t.id === 'daily-summary');
      expect(template).toBeDefined();
      expect(template?.variables).toContain('date');
    });
  });
});

describe('ReportCollector', () => {
  let collector: ReportCollector;

  beforeEach(() => {
    if (fs.existsSync(TEST_BASE_PATH)) {
      fs.rmSync(TEST_BASE_PATH, { recursive: true });
    }
    
    collector = new ReportCollector({
      basePath: TEST_BASE_PATH,
      autoCollect: false
    });
  });

  afterEach(() => {
    collector.stopAutoCollection();
    if (fs.existsSync(TEST_BASE_PATH)) {
      fs.rmSync(TEST_BASE_PATH, { recursive: true });
    }
  });

  describe('collectDivisionReports', () => {
    it('should collect reports from division', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      // Create some test reports
      for (let i = 0; i < 3; i++) {
        const report = reportChain.createReport(
          TEST_ROLE,
          TEST_AGENT_ID,
          TEST_DIVISION_ID,
          {
            task: `Task ${i}`,
            status: 'completed',
            duration: 10 + i,
            outputs: []
          }
        );
        reportChain.saveReport(report);
      }

      const reports = collector.collectDivisionReports(TEST_DIVISION_ID);
      expect(reports).toHaveLength(3);
    });

    it('should return empty array for non-existent division', () => {
      const reports = collector.collectDivisionReports('non-existent');
      expect(reports).toHaveLength(0);
    });
  });

  describe('filterReports', () => {
    it('should filter by division', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      const report1 = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, 'div-1', {
        task: 'Task 1',
        status: 'completed',
        duration: 10,
        outputs: []
      });
      reportChain.saveReport(report1);

      const report2 = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, 'div-2', {
        task: 'Task 2',
        status: 'completed',
        duration: 20,
        outputs: []
      });
      reportChain.saveReport(report2);

      const allReports = collector.collectAllReports();
      const filtered = collector.filterReports(allReports, { divisionId: 'div-1' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].divisionId).toBe('div-1');
    });

    it('should filter by status', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      const report1 = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, TEST_DIVISION_ID, {
        task: 'Task 1',
        status: 'completed',
        duration: 10,
        outputs: []
      });
      reportChain.saveReport(report1);

      const report2 = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, TEST_DIVISION_ID, {
        task: 'Task 2',
        status: 'failed',
        duration: 20,
        outputs: []
      });
      reportChain.saveReport(report2);

      const allReports = collector.collectAllReports();
      const filtered = collector.filterReports(allReports, { status: 'completed' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].content.status).toBe('completed');
    });

    it('should filter by role', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      const report1 = reportChain.createReport('ROLE-1', TEST_AGENT_ID, TEST_DIVISION_ID, {
        task: 'Task 1',
        status: 'completed',
        duration: 10,
        outputs: []
      });
      reportChain.saveReport(report1);

      const report2 = reportChain.createReport('ROLE-2', TEST_AGENT_ID, TEST_DIVISION_ID, {
        task: 'Task 2',
        status: 'completed',
        duration: 20,
        outputs: []
      });
      reportChain.saveReport(report2);

      const allReports = collector.collectAllReports();
      const filtered = collector.filterReports(allReports, { role: 'ROLE-1' });

      expect(filtered).toHaveLength(1);
      expect(filtered[0].role).toBe('ROLE-1');
    });

    it('should limit results', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      for (let i = 0; i < 10; i++) {
        const report = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, TEST_DIVISION_ID, {
          task: `Task ${i}`,
          status: 'completed',
          duration: i,
          outputs: []
        });
        reportChain.saveReport(report);
      }

      const allReports = collector.collectAllReports();
      const filtered = collector.filterReports(allReports, { limit: 5 });

      expect(filtered).toHaveLength(5);
    });
  });

  describe('getReportsByRole', () => {
    it('should get reports by role', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      for (let i = 0; i < 5; i++) {
        const report = reportChain.createReport('COMMANDER', TEST_AGENT_ID, TEST_DIVISION_ID, {
          task: `Commander Task ${i}`,
          status: 'completed',
          duration: 10,
          outputs: []
        });
        reportChain.saveReport(report);
      }

      const reports = collector.getReportsByRole(TEST_DIVISION_ID, 'COMMANDER');
      expect(reports.length).toBeGreaterThan(0);
      expect(reports[0].role).toBe('COMMANDER');
    });
  });
});

describe('AxonDashboard', () => {
  let dashboard: AxonDashboard;

  beforeEach(() => {
    if (fs.existsSync(TEST_BASE_PATH)) {
      fs.rmSync(TEST_BASE_PATH, { recursive: true });
    }
    
    dashboard = new AxonDashboard();
  });

  afterEach(() => {
    if (fs.existsSync(TEST_BASE_PATH)) {
      fs.rmSync(TEST_BASE_PATH, { recursive: true });
    }
  });

  describe('getMetrics', () => {
    it('should return metrics with zero reports', () => {
      const metrics = dashboard.getMetrics();
      
      expect(metrics.totalReports).toBe(0);
      expect(metrics.byStatus.completed).toBe(0);
      expect(metrics.byStatus['in-progress']).toBe(0);
      expect(metrics.byStatus.failed).toBe(0);
      expect(metrics.averageDuration).toBe(0);
      expect(metrics.failureRate).toBe(0);
    });

    it('should calculate metrics correctly', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      // Create 3 completed reports
      for (let i = 0; i < 3; i++) {
        const report = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, TEST_DIVISION_ID, {
          task: `Task ${i}`,
          status: 'completed',
          duration: 30,
          outputs: []
        });
        reportChain.saveReport(report);
      }

      // Create 1 failed report
      const failedReport = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, TEST_DIVISION_ID, {
        task: 'Failed Task',
        status: 'failed',
        duration: 10,
        outputs: [],
        issues: ['Something went wrong']
      });
      reportChain.saveReport(failedReport);

      const metrics = dashboard.getMetrics();

      expect(metrics.totalReports).toBe(4);
      expect(metrics.byStatus.completed).toBe(3);
      expect(metrics.byStatus.failed).toBe(1);
      expect(metrics.failureRate).toBe(25); // 1/4 = 25%
      expect(metrics.averageDuration).toBe(25); // (30*3 + 10) / 4 = 25
    });

    it('should generate alerts for failed reports', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      const report = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, TEST_DIVISION_ID, {
        task: 'Failed Task',
        status: 'failed',
        duration: 10,
        outputs: [],
        issues: ['Critical error']
      });
      reportChain.saveReport(report);

      const metrics = dashboard.getMetrics();
      expect(metrics.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('getDivisionStatus', () => {
    it('should return division status', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      const report = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, TEST_DIVISION_ID, {
        task: 'Task',
        status: 'completed',
        duration: 45,
        outputs: []
      });
      reportChain.saveReport(report);

      const status = dashboard.getDivisionStatus(TEST_DIVISION_ID);

      expect(status.divisionId).toBe(TEST_DIVISION_ID);
      expect(status.totalReports).toBe(1);
      expect(status.completedTasks).toBe(1);
      expect(status.averageDuration).toBe(45);
    });

    it('should return zero status for non-existent division', () => {
      const status = dashboard.getDivisionStatus('non-existent');

      expect(status.divisionId).toBe('non-existent');
      expect(status.totalReports).toBe(0);
    });
  });

  describe('getAllDivisionStatuses', () => {
    it('should return status for all divisions', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      // Create reports for multiple divisions
      for (const div of ['div-1', 'div-2', 'div-3']) {
        const report = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, div, {
          task: 'Task',
          status: 'completed',
          duration: 20,
          outputs: []
        });
        reportChain.saveReport(report);
      }

      const statuses = dashboard.getAllDivisionStatuses();
      expect(statuses.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an alert', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      const report = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, TEST_DIVISION_ID, {
        task: 'Failed Task',
        status: 'failed',
        duration: 10,
        outputs: []
      });
      reportChain.saveReport(report);

      // Get metrics to trigger alert creation
      dashboard.getMetrics();

      // Resolve the alert
      const alerts = dashboard.getMetrics().alerts;
      if (alerts.length > 0) {
        dashboard.resolveAlert(alerts[0].id);
        
        const updatedMetrics = dashboard.getMetrics();
        const resolvedAlert = updatedMetrics.alerts.find(a => a.id === alerts[0].id);
        expect(resolvedAlert).toBeUndefined(); // Should be filtered out
      }
    });
  });

  describe('exportDashboardData', () => {
    it('should export dashboard data as JSON', () => {
      const reportChain = new ReportChain(TEST_BASE_PATH);
      
      const report = reportChain.createReport(TEST_ROLE, TEST_AGENT_ID, TEST_DIVISION_ID, {
        task: 'Task',
        status: 'completed',
        duration: 30,
        outputs: []
      });
      reportChain.saveReport(report);

      const exported = dashboard.exportDashboardData();
      const data = JSON.parse(exported);

      expect(data.timestamp).toBeDefined();
      expect(data.metrics).toBeDefined();
      expect(data.divisions).toBeDefined();
    });
  });
});

describe('Helper Functions', () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_BASE_PATH)) {
      fs.rmSync(TEST_BASE_PATH, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_BASE_PATH)) {
      fs.rmSync(TEST_BASE_PATH, { recursive: true });
    }
  });

  describe('submitReport', () => {
    it('should create and save report', async () => {
      // Override base path for testing
      const originalPath = process.env.HOME;
      process.env.HOME = path.join(__dirname, '..', '..', '..', 'test-data');
      
      try {
        const savedPath = await submitReport(
          TEST_ROLE,
          TEST_AGENT_ID,
          TEST_DIVISION_ID,
          'Test Task',
          'completed',
          30,
          ['output.txt'],
          [],
          ['Next step']
        );

        expect(savedPath).toBeDefined();
        expect(fs.existsSync(savedPath)).toBe(true);
      } finally {
        process.env.HOME = originalPath;
      }
    });
  });

  describe('getDashboardSummary', () => {
    it('should return formatted summary string', () => {
      const summary = getDashboardSummary();
      
      expect(summary).toContain('🜏 Axon Dashboard Summary');
      expect(summary).toContain('总汇报数:');
      expect(summary).toContain('完成率:');
      expect(summary).toContain('状态分布');
    });
  });
});
