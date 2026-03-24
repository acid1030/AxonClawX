/**
 * System Health Check Middleware
 * 
 * 提供系统健康检查端点，包括:
 * 1. API 健康状态
 * 2. 数据库连接检查
 * 3. 磁盘空间检查
 * 4. 内存使用检查
 * 
 * @author Axon
 * @version 1.0.0
 */

import Database from 'better-sqlite3';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// 类型定义
// ============================================================================

export interface HealthStatus {
  /** 整体健康状态 */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** 检查时间戳 */
  timestamp: string;
  /** 运行时间 (秒) */
  uptime: number;
  /** 版本信息 */
  version: string;
  /** 详细检查结果 */
  checks: {
    /** API 状态 */
    api: CheckResult;
    /** 数据库状态 */
    database: CheckResult;
    /** 磁盘状态 */
    disk: CheckResult & {
      /** 总空间 (GB) */
      totalGB?: number;
      /** 可用空间 (GB) */
      freeGB?: number;
      /** 使用率 (%) */
      usagePercent?: number;
    };
    /** 内存状态 */
    memory: CheckResult & {
      /** 总内存 (GB) */
      totalGB?: number;
      /** 可用内存 (GB) */
      freeGB?: number;
      /** 使用率 (%) */
      usagePercent?: number;
    };
  };
}

export interface CheckResult {
  /** 检查是否通过 */
  healthy: boolean;
  /** 状态消息 */
  message: string;
  /** 响应时间 (毫秒) */
  responseTime?: number;
  /** 错误信息 (如果有) */
  error?: string;
}

export interface HealthCheckConfig {
  /** 数据库路径 */
  dbPath?: string;
  /** 磁盘空间警告阈值 (%) */
  diskWarningThreshold?: number;
  /** 磁盘空间严重阈值 (%) */
  diskCriticalThreshold?: number;
  /** 内存使用警告阈值 (%) */
  memoryWarningThreshold?: number;
  /** 内存使用严重阈值 (%) */
  memoryCriticalThreshold?: number;
  /** 版本信息 */
  version?: string;
}

// ============================================================================
// 健康检查类
// ============================================================================

export class HealthChecker {
  private config: Required<HealthCheckConfig>;
  private db?: Database.Database;

  constructor(config: HealthCheckConfig = {}) {
    this.config = {
      dbPath: config.dbPath || path.join(process.cwd(), 'axonclaw.db'),
      diskWarningThreshold: config.diskWarningThreshold || 80,
      diskCriticalThreshold: config.diskCriticalThreshold || 90,
      memoryWarningThreshold: config.memoryWarningThreshold || 80,
      memoryCriticalThreshold: config.memoryCriticalThreshold || 90,
      version: config.version || '1.0.0',
    };
  }

  /**
   * 执行完整健康检查
   */
  public async checkAll(): Promise<HealthStatus> {
    const startTime = Date.now();

    const [apiCheck, dbCheck, diskCheck, memoryCheck] = await Promise.all([
      this.checkAPI(),
      this.checkDatabase(),
      this.checkDisk(),
      this.checkMemory(),
    ]);

    // 确定整体状态
    const checks = [apiCheck, dbCheck, diskCheck, memoryCheck];
    const allHealthy = checks.every(c => c.healthy);
    const anyCritical = checks.some(c => !c.healthy);

    const status: HealthStatus = {
      status: allHealthy ? 'healthy' : anyCritical ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: this.config.version,
      checks: {
        api: apiCheck,
        database: dbCheck,
        disk: diskCheck,
        memory: memoryCheck,
      },
    };

    return status;
  }

  /**
   * API 健康检查
   */
  private async checkAPI(): Promise<CheckResult> {
    const startTime = Date.now();
    
    try {
      // 简单的 API 检查：进程正常运行
      const responseTime = Date.now() - startTime;
      
      return {
        healthy: true,
        message: 'API is running',
        responseTime,
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'API check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 数据库连接检查
   */
  private async checkDatabase(): Promise<CheckResult> {
    const startTime = Date.now();
    
    try {
      // 尝试连接数据库
      if (!this.db) {
        this.db = new Database(this.config.dbPath, { readonly: true });
      }

      // 执行简单查询验证连接
      const stmt = this.db.prepare('SELECT 1');
      stmt.get();

      const responseTime = Date.now() - startTime;

      return {
        healthy: true,
        message: 'Database connection OK',
        responseTime,
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * 磁盘空间检查
   */
  private async checkDisk(): Promise<CheckResult & { totalGB: number; freeGB: number; usagePercent: number }> {
    try {
      // 获取磁盘统计信息
      const stats = fs.statfsSync(this.config.dbPath ? path.dirname(this.config.dbPath) : '/');
      
      // 计算磁盘空间 (单位：字节)
      const blockSize = stats.bsize || 4096;
      const totalBytes = stats.blocks * blockSize;
      const freeBytes = stats.bfree * blockSize;
      const availableBytes = stats.bavail * blockSize;

      // 转换为 GB
      const totalGB = totalBytes / (1024 ** 3);
      const freeGB = availableBytes / (1024 ** 3);
      const usedGB = totalGB - freeGB;
      const usagePercent = (usedGB / totalGB) * 100;

      // 确定健康状态
      let healthy = true;
      let message = `Disk usage: ${usagePercent.toFixed(1)}%`;

      if (usagePercent >= this.config.diskCriticalThreshold) {
        healthy = false;
        message = `CRITICAL: Disk usage at ${usagePercent.toFixed(1)}%`;
      } else if (usagePercent >= this.config.diskWarningThreshold) {
        message = `WARNING: Disk usage at ${usagePercent.toFixed(1)}%`;
      }

      return {
        healthy,
        message,
        totalGB: Math.round(totalGB * 100) / 100,
        freeGB: Math.round(freeGB * 100) / 100,
        usagePercent: Math.round(usagePercent * 100) / 100,
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Disk check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        totalGB: 0,
        freeGB: 0,
        usagePercent: 0,
      };
    }
  }

  /**
   * 内存使用检查
   */
  private async checkMemory(): Promise<CheckResult & { totalGB: number; freeGB: number; usagePercent: number }> {
    try {
      const totalBytes = os.totalmem();
      const freeBytes = os.freemem();
      const usedBytes = totalBytes - freeBytes;

      // 转换为 GB
      const totalGB = totalBytes / (1024 ** 3);
      const freeGB = freeBytes / (1024 ** 3);
      const usagePercent = (usedBytes / totalBytes) * 100;

      // 确定健康状态
      let healthy = true;
      let message = `Memory usage: ${usagePercent.toFixed(1)}%`;

      if (usagePercent >= this.config.memoryCriticalThreshold) {
        healthy = false;
        message = `CRITICAL: Memory usage at ${usagePercent.toFixed(1)}%`;
      } else if (usagePercent >= this.config.memoryWarningThreshold) {
        message = `WARNING: Memory usage at ${usagePercent.toFixed(1)}%`;
      }

      return {
        healthy,
        message,
        totalGB: Math.round(totalGB * 100) / 100,
        freeGB: Math.round(freeGB * 100) / 100,
        usagePercent: Math.round(usagePercent * 100) / 100,
      };
    } catch (error) {
      return {
        healthy: false,
        message: 'Memory check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        totalGB: 0,
        freeGB: 0,
        usagePercent: 0,
      };
    }
  }

  /**
   * 关闭数据库连接
   */
  public destroy(): void {
    if (this.db) {
      this.db.close();
      this.db = undefined;
    }
  }
}

// ============================================================================
// Express/Koa 中间件
// ============================================================================

/**
 * 创建健康检查中间件
 * 
 * @param config 健康检查配置
 * @returns Express/Koa 风格的中间件函数
 */
export function createHealthChecker(config: HealthCheckConfig = {}) {
  const checker = new HealthChecker(config);

  // 优雅退出时清理资源
  process.on('SIGTERM', () => checker.destroy());
  process.on('SIGINT', () => checker.destroy());

  return async (
    req: any,
    res: any,
    next: () => void
  ): Promise<void> => {
    // 仅处理 /health 路径
    const url = req.url || '';
    const pathname = url.split('?')[0];

    if (pathname !== '/health' && pathname !== '/api/health') {
      next();
      return;
    }

    try {
      const health = await checker.checkAll();

      // 根据健康状态设置 HTTP 状态码
      let statusCode = 200;
      if (health.status === 'degraded') {
        statusCode = 200; // 降级但仍然可接受
      } else if (health.status === 'unhealthy') {
        statusCode = 503; // 服务不可用
      }

      res.setHeader('Content-Type', 'application/json');
      res.statusCode = statusCode;
      res.end(JSON.stringify(health, null, 2));
    } catch (error) {
      res.setHeader('Content-Type', 'application/json');
      res.statusCode = 500;
      res.end(JSON.stringify({
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      }));
    }
  };
}

// ============================================================================
// 独立的健康检查端点函数
// ============================================================================

/**
 * 独立的健康检查函数 (用于 HTTP 服务器)
 * 
 * @param config 健康检查配置
 * @returns 健康状态对象
 */
export async function getHealthStatus(config: HealthCheckConfig = {}): Promise<HealthStatus> {
  const checker = new HealthChecker(config);
  try {
    return await checker.checkAll();
  } finally {
    checker.destroy();
  }
}

// ============================================================================
// 预定义配置
// ============================================================================

export const presets = {
  /** 宽松配置：高阈值 */
  relaxed: {
    diskWarningThreshold: 85,
    diskCriticalThreshold: 95,
    memoryWarningThreshold: 85,
    memoryCriticalThreshold: 95,
  } as HealthCheckConfig,

  /** 标准配置：中等阈值 */
  standard: {
    diskWarningThreshold: 80,
    diskCriticalThreshold: 90,
    memoryWarningThreshold: 80,
    memoryCriticalThreshold: 90,
  } as HealthCheckConfig,

  /** 严格配置：低阈值 */
  strict: {
    diskWarningThreshold: 70,
    diskCriticalThreshold: 85,
    memoryWarningThreshold: 70,
    memoryCriticalThreshold: 85,
  } as HealthCheckConfig,
};

export default createHealthChecker;
