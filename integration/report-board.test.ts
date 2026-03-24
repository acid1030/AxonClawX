/**
 * Report Board Integration Tests
 * 
 * Tests for the汇报链与看板集成 module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  ReportBoardPublisher, 
  publishToBoard, 
  getBoardSummary 
} from '../../integration/report-board';

describe('ReportBoardPublisher', () => {
  let publisher: ReportBoardPublisher;

  beforeEach(async () => {
    publisher = new ReportBoardPublisher({
      apiPort: 18792, // Use different port for tests
      autoPublish: false
    });
    await publisher.initialize();
  });

  afterEach(async () => {
    await publisher.shutdown();
  });

  it('should initialize successfully', () => {
    expect(publisher).toBeDefined();
  });

  it('should publish a report', async () => {
    const reportChain = (publisher as any).reportChain;
    const report = reportChain.createReport(
      'TestRole',
      'test-agent',
      'test-division',
      {
        task: 'Test Task',
        status: 'completed',
        duration: 30,
        outputs: ['output.txt'],
        issues: []
      }
    );

    const published = await publisher.publishReport(report);
    
    expect(published).toBeDefined();
    expect(published.task).toBe('Test Task');
    expect(published.status).toBe('completed');
  });

  it('should get board summary', () => {
    const summary = publisher.getBoardSummary();
    
    expect(summary).toBeDefined();
    expect(typeof summary.totalReports).toBe('number');
    expect(typeof summary.todayReports).toBe('number');
    expect(Array.isArray(summary.recentReports)).toBe(true);
  });

  it('should get recent reports', async () => {
    // Publish a few reports first
    const reportChain = (publisher as any).reportChain;
    
    for (let i = 0; i < 3; i++) {
      const report = reportChain.createReport(
        `Role${i}`,
        `agent-${i}`,
        'test-division',
        {
          task: `Task ${i}`,
          status: i === 2 ? 'failed' : 'completed',
          duration: 10 + i * 10,
          outputs: [],
          issues: i === 2 ? ['Test issue'] : []
        }
      );
      await publisher.publishReport(report);
    }

    const reports = publisher.getRecentReports();
    
    expect(reports.length).toBe(3);
    expect(reports[0].publishedAt).toBeGreaterThan(reports[1].publishedAt);
  });

  it('should filter reports by division', async () => {
    const reportChain = (publisher as any).reportChain;
    
    // Publish reports for different divisions
    const report1 = reportChain.createReport(
      'Role1',
      'agent-1',
      'division-a',
      {
        task: 'Task A',
        status: 'completed',
        duration: 20,
        outputs: []
      }
    );
    
    const report2 = reportChain.createReport(
      'Role2',
      'agent-2',
      'division-b',
      {
        task: 'Task B',
        status: 'completed',
        duration: 30,
        outputs: []
      }
    );

    await publisher.publishReport(report1);
    await publisher.publishReport(report2);

    const divisionAReports = publisher.getReportsByDivision('division-a');
    const divisionBReports = publisher.getReportsByDivision('division-b');
    
    expect(divisionAReports.length).toBe(1);
    expect(divisionAReports[0].task).toBe('Task A');
    expect(divisionBReports.length).toBe(1);
    expect(divisionBReports[0].task).toBe('Task B');
  });

  it('should subscribe to report stream', async () => {
    const listener = vi.fn();
    const unsubscribe = publisher.subscribeToStream(listener);

    const reportChain = (publisher as any).reportChain;
    const report = reportChain.createReport(
      'TestRole',
      'test-agent',
      'test-division',
      {
        task: 'Stream Test',
        status: 'completed',
        duration: 15,
        outputs: []
      }
    );

    await publisher.publishReport(report);

    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'new-report',
        data: expect.objectContaining({
          id: report.id
        })
      })
    );

    // Test unsubscribe
    unsubscribe();
    listener.mockClear();
    
    const report2 = reportChain.createReport(
      'TestRole2',
      'test-agent-2',
      'test-division',
      {
        task: 'After Unsubscribe',
        status: 'completed',
        duration: 10,
        outputs: []
      }
    );
    
    await publisher.publishReport(report2);
    expect(listener).not.toHaveBeenCalled();
  });

  it('should trim old reports when exceeding max', async () => {
    const smallPublisher = new ReportBoardPublisher({
      apiPort: 18793,
      maxRecentReports: 3,
      autoPublish: false
    });
    
    await smallPublisher.initialize();

    const reportChain = (smallPublisher as any).reportChain;
    
    // Publish 5 reports
    for (let i = 0; i < 5; i++) {
      const report = reportChain.createReport(
        'Role',
        `agent-${i}`,
        'division',
        {
          task: `Task ${i}`,
          status: 'completed',
          duration: 10,
          outputs: []
        }
      );
      await smallPublisher.publishReport(report);
    }

    const reports = smallPublisher.getRecentReports();
    expect(reports.length).toBe(3); // Should be trimmed to maxRecentReports
    
    // Should have the latest 3
    expect(reports[0].task).toBe('Task 4');
    expect(reports[1].task).toBe('Task 3');
    expect(reports[2].task).toBe('Task 2');

    await smallPublisher.shutdown();
  });
});

describe('Helper Functions', () => {
  it('should export helper functions', () => {
    expect(typeof publishToBoard).toBe('function');
    expect(typeof getBoardSummary).toBe('function');
  });
});
