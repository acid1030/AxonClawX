/**
 * KAEL Power Dashboard - 单元测试
 */

import { createPowerDashboard, SystemMonitor } from './power-dashboard';

describe('PowerDashboard', () => {
  describe('SystemMonitor', () => {
    let monitor: SystemMonitor;

    beforeEach(() => {
      monitor = new SystemMonitor({
        sampleInterval: 1000,
        historySize: 10
      });
    });

    afterEach(() => {
      monitor.stop();
    });

    test('should create monitor instance', () => {
      expect(monitor).toBeInstanceOf(SystemMonitor);
    });

    test('should start and stop monitoring', () => {
      monitor.start();
      // Give it time to collect one sample
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const metrics = monitor.getCurrentMetrics();
          expect(metrics).toHaveProperty('cpu');
          expect(metrics).toHaveProperty('memory');
          expect(metrics).toHaveProperty('requests');
          expect(metrics).toHaveProperty('health');
          monitor.stop();
          resolve();
        }, 1500);
      });
    });

    test('should collect CPU metrics', () => {
      const metrics = monitor.getCurrentMetrics();
      expect(metrics.cpu.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.cpu.cores).toBeGreaterThanOrEqual(1);
      expect(metrics.cpu.load).toHaveLength(3);
    });

    test('should collect memory metrics', () => {
      const metrics = monitor.getCurrentMetrics();
      expect(metrics.memory.total).toBeGreaterThan(0);
      expect(metrics.memory.used).toBeGreaterThan(0);
      expect(metrics.memory.usage).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.usage).toBeLessThanOrEqual(100);
    });

    test('should record requests', () => {
      monitor.recordRequest({
        path: '/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 50,
        timestamp: Date.now()
      });

      const metrics = monitor.getCurrentMetrics();
      expect(metrics.requests.total).toBeGreaterThanOrEqual(1);
    });

    test('should track active requests', () => {
      expect(monitor.getCurrentMetrics().requests.active).toBe(0);
      
      monitor.incrementActiveRequests();
      expect(monitor.getCurrentMetrics().requests.active).toBe(1);
      
      monitor.incrementActiveRequests();
      expect(monitor.getCurrentMetrics().requests.active).toBe(2);
      
      monitor.decrementActiveRequests();
      expect(monitor.getCurrentMetrics().requests.active).toBe(1);
    });

    test('should determine health status correctly', () => {
      // This is tested indirectly through metrics
      const metrics = monitor.getCurrentMetrics();
      expect(['healthy', 'warning', 'critical']).toContain(metrics.health.status);
      expect(metrics.health.uptime).toBeGreaterThanOrEqual(0);
      expect(metrics.health.pid).toBeGreaterThan(0);
    });

    test('should maintain history', () => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const history = monitor.getHistory();
          expect(history.length).toBeGreaterThan(0);
          expect(history.length).toBeLessThanOrEqual(10); // historySize
          resolve();
        }, 2500);
      });
    });

    test('should emit metrics event', () => {
      return new Promise<void>((resolve) => {
        monitor.on('metrics', (metrics) => {
          expect(metrics).toHaveProperty('timestamp');
          expect(metrics.timestamp).toBeGreaterThan(0);
          resolve();
        });
        monitor.start();
      });
    });
  });

  describe('createPowerDashboard', () => {
    test('should create dashboard with middleware', () => {
      const dashboard = createPowerDashboard();
      
      expect(dashboard).toHaveProperty('middleware');
      expect(dashboard).toHaveProperty('monitor');
      expect(dashboard).toHaveProperty('getMetrics');
      expect(dashboard).toHaveProperty('getHistory');
      expect(typeof dashboard.middleware).toBe('function');
      expect(typeof dashboard.getMetrics).toBe('function');
      expect(typeof dashboard.getHistory).toBe('function');
    });

    test('should get current metrics', () => {
      const dashboard = createPowerDashboard();
      const metrics = dashboard.getMetrics();
      
      expect(metrics).toHaveProperty('cpu');
      expect(metrics).toHaveProperty('memory');
      expect(metrics).toHaveProperty('requests');
      expect(metrics).toHaveProperty('health');
    });

    test('should get history', () => {
      const dashboard = createPowerDashboard();
      const history = dashboard.getHistory();
      
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    test('should accept custom config', () => {
      const dashboard = createPowerDashboard({
        sampleInterval: 10000,
        historySize: 50
      });
      
      expect(dashboard).toBeDefined();
    });
  });

  describe('Health Status', () => {
    test('should be healthy with normal usage', () => {
      const monitor = new SystemMonitor();
      const metrics = monitor.getCurrentMetrics();
      
      // Under normal conditions, should be healthy
      if (metrics.cpu.usage < 70 && metrics.memory.usage < 70) {
        expect(metrics.health.status).toBe('healthy');
      }
      monitor.stop();
    });
  });
});
