/**
 * Deprecation Utils - 弃用警告工具
 * 
 * 功能:
 * 1. 弃用警告 - 在运行时发出弃用通知
 * 2. 迁移指南 - 提供替代方案文档
 * 3. 版本追踪 - 记录弃用时间线和移除计划
 * 
 * @author Axon
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============== 类型定义 ==============

/**
 * 弃用级别
 */
export type DeprecationLevel = 'warning' | 'error' | 'silent';

/**
 * 弃用元数据
 */
export interface DeprecationInfo {
  /** 被弃用的功能名称 */
  name: string;
  /** 弃用版本 */
  deprecatedSince: string;
  /** 计划移除版本 */
  removalVersion: string;
  /** 替代方案 */
  replacement: string;
  /** 迁移指南 URL 或描述 */
  migrationGuide?: string;
  /** 弃用级别 */
  level?: DeprecationLevel;
  /** 额外说明 */
  notes?: string;
}

/**
 * 版本追踪记录
 */
export interface VersionTrack {
  /** 版本号 */
  version: string;
  /** 发布日期 */
  releaseDate: string;
  /** 弃用功能列表 */
  deprecations: string[];
  /** 移除功能列表 */
  removals: string[];
  /** 重大变更 */
  breakingChanges: string[];
}

/**
 * 弃用警告配置
 */
export interface DeprecationConfig {
  /** 是否启用弃用警告 */
  enabled: boolean;
  /** 弃用级别 */
  defaultLevel: DeprecationLevel;
  /** 是否显示堆栈跟踪 */
  showStackTrace: boolean;
  /** 自定义日志函数 */
  logger?: (message: string) => void;
}

// ============== 全局状态 ==============

/**
 * 已注册的弃用记录
 */
const deprecationRegistry: Map<string, DeprecationInfo> = new Map();

/**
 * 已发出的弃用警告 (避免重复)
 */
const warnedSet: Set<string> = new Set();

/**
 * 版本追踪历史
 */
const versionHistory: VersionTrack[] = [];

/**
 * 默认配置
 */
const defaultConfig: Required<DeprecationConfig> = {
  enabled: true,
  defaultLevel: 'warning',
  showStackTrace: false,
  logger: console.warn,
};

let currentConfig: Required<DeprecationConfig> = { ...defaultConfig };

// ============== 核心功能 ==============

/**
 * 注册弃用功能
 * 
 * @param info - 弃用元数据
 * 
 * @example
 * ```typescript
 * registerDeprecation({
 *   name: 'oldApiClient',
 *   deprecatedSince: '2.0.0',
 *   removalVersion: '3.0.0',
 *   replacement: 'newApiClient',
 *   migrationGuide: 'https://docs.example.com/migration',
 *   notes: '旧客户端不支持重试机制'
 * });
 * ```
 */
export function registerDeprecation(info: DeprecationInfo): void {
  deprecationRegistry.set(info.name, {
    ...info,
    level: info.level ?? currentConfig.defaultLevel,
  });
}

/**
 * 发出弃用警告
 * 
 * @param name - 被弃用的功能名称
 * @param customMessage - 自定义消息 (可选)
 * 
 * @example
 * ```typescript
 * // 基本用法
 * warnDeprecated('oldApiClient');
 * 
 * // 带自定义消息
 * warnDeprecated('oldApiClient', '请在 Q2 前完成迁移');
 * 
 * // 在函数中使用
 * function legacyFunction() {
 *   warnDeprecated('legacyFunction');
 *   // ... 原有逻辑
 * }
 * ```
 */
export function warnDeprecated(name: string, customMessage?: string): void {
  if (!currentConfig.enabled) {
    return;
  }

  const info = deprecationRegistry.get(name);
  
  if (!info) {
    // 未注册的弃用，使用默认信息
    const message = `⚠️  DEPRECATION WARNING: "${name}" is deprecated and will be removed.`;
    logWarning(message, name);
    return;
  }

  // 避免重复警告
  if (warnedSet.has(name)) {
    return;
  }
  warnedSet.add(name);

  // 构建警告消息
  let message = `⚠️  DEPRECATION WARNING: "${info.name}"\n`;
  message += `   Deprecated since: v${info.deprecatedSince}\n`;
  message += `   Removal version: v${info.removalVersion}\n`;
  message += `   Replacement: ${info.replacement}`;

  if (info.migrationGuide) {
    message += `\n   Migration Guide: ${info.migrationGuide}`;
  }

  if (info.notes) {
    message += `\n   Notes: ${info.notes}`;
  }

  if (customMessage) {
    message += `\n   ${customMessage}`;
  }

  // 根据级别处理
  const level = info.level ?? currentConfig.defaultLevel;
  
  switch (level) {
    case 'error':
      throw new DeprecationError(message, info);
    case 'warning':
      logWarning(message, name);
      break;
    case 'silent':
      // 静默模式，仅记录
      break;
  }
}

/**
 * 获取弃用信息
 * 
 * @param name - 功能名称
 * @returns 弃用元数据，如果未找到则返回 undefined
 * 
 * @example
 * ```typescript
 * const info = getDeprecationInfo('oldApiClient');
 * if (info) {
 *   console.log(`迁移到：${info.replacement}`);
 * }
 * ```
 */
export function getDeprecationInfo(name: string): DeprecationInfo | undefined {
  return deprecationRegistry.get(name);
}

/**
 * 获取所有弃用记录
 * 
 * @returns 所有弃用信息数组
 * 
 * @example
 * ```typescript
 * const allDeprecations = getAllDeprecations();
 * allDeprecations.forEach(dep => {
 *   console.log(`${dep.name} → ${dep.replacement}`);
 * });
 * ```
 */
export function getAllDeprecations(): DeprecationInfo[] {
  return Array.from(deprecationRegistry.values());
}

/**
 * 添加版本追踪记录
 * 
 * @param track - 版本追踪信息
 * 
 * @example
 * ```typescript
 * addVersionTrack({
 *   version: '2.0.0',
 *   releaseDate: '2026-03-01',
 *   deprecations: ['oldApiClient', 'legacyAuth'],
 *   removals: ['v1Api'],
 *   breakingChanges: ['认证机制变更']
 * });
 * ```
 */
export function addVersionTrack(track: VersionTrack): void {
  versionHistory.push(track);
  versionHistory.sort((a, b) => {
    return compareVersions(b.version, a.version); // 降序排列
  });
}

/**
 * 获取版本历史
 * 
 * @returns 版本追踪记录数组
 * 
 * @example
 * ```typescript
 * const history = getVersionHistory();
 * history.forEach(track => {
 *   console.log(`v${track.version}: ${track.deprecations.length} 弃用`);
 * });
 * ```
 */
export function getVersionHistory(): VersionTrack[] {
  return [...versionHistory];
}

/**
 * 配置弃用工具
 * 
 * @param config - 配置选项
 * 
 * @example
 * ```typescript
 * // 禁用弃用警告
 * configureDeprecation({ enabled: false });
 * 
 * // 设置为错误级别
 * configureDeprecation({ defaultLevel: 'error' });
 * 
 * // 自定义日志
 * configureDeprecation({
 *   logger: (msg) => myLogger.warn(msg)
 * });
 * ```
 */
export function configureDeprecation(config: Partial<DeprecationConfig>): void {
  currentConfig = {
    ...currentConfig,
    ...config,
  } as Required<DeprecationConfig>;
}

/**
 * 重置配置为默认值
 * 
 * @example
 * ```typescript
 * resetDeprecationConfig();
 * ```
 */
export function resetDeprecationConfig(): void {
  currentConfig = { ...defaultConfig };
}

/**
 * 清除警告记录 (用于测试)
 * 
 * @example
 * ```typescript
 * clearWarningCache();
 * ```
 */
export function clearWarningCache(): void {
  warnedSet.clear();
}

/**
 * 清除所有注册信息 (用于测试)
 * 
 * @example
 * ```typescript
 * clearAllDeprecations();
 * ```
 */
export function clearAllDeprecations(): void {
  deprecationRegistry.clear();
  warnedSet.clear();
  versionHistory.length = 0;
}

// ============== 迁移指南工具 ==============

/**
 * 生成迁移报告
 * 
 * @returns 格式化的迁移报告字符串
 * 
 * @example
 * ```typescript
 * const report = generateMigrationReport();
 * console.log(report);
 * ```
 */
export function generateMigrationReport(): string {
  if (deprecationRegistry.size === 0) {
    return '✅ 当前没有弃用的功能。';
  }

  let report = '📋 DEPRECATION MIGRATION REPORT\n';
  report += '='.repeat(50) + '\n\n';
  report += `Total Deprecated Items: ${deprecationRegistry.size}\n\n`;

  // 按移除版本分组
  const byVersion = new Map<string, DeprecationInfo[]>();
  deprecationRegistry.forEach((info) => {
    const group = byVersion.get(info.removalVersion) || [];
    group.push(info);
    byVersion.set(info.removalVersion, group);
  });

  // 排序输出版本
  const sortedVersions = Array.from(byVersion.keys()).sort(compareVersions);

  for (const version of sortedVersions) {
    const items = byVersion.get(version)!;
    report += `\n🚨 REMOVAL VERSION: v${version}\n`;
    report += '-'.repeat(40) + '\n';

    for (const item of items) {
      report += `\n  • ${item.name}\n`;
      report += `    Deprecated: v${item.deprecatedSince}\n`;
      report += `    Replace with: ${item.replacement}\n`;
      
      if (item.migrationGuide) {
        report += `    Guide: ${item.migrationGuide}\n`;
      }
      
      if (item.notes) {
        report += `    Notes: ${item.notes}\n`;
      }
    }
  }

  report += '\n' + '='.repeat(50);
  return report;
}

/**
 * 检查是否需要迁移
 * 
 * @param targetVersion - 目标版本号
 * @returns 需要迁移的功能列表
 * 
 * @example
 * ```typescript
 * const needsMigration = checkMigrationRequired('3.0.0');
 * needsMigration.forEach(item => {
 *   console.log(`需要迁移：${item.name}`);
 * });
 * ```
 */
export function checkMigrationRequired(targetVersion: string): DeprecationInfo[] {
  const result: DeprecationInfo[] = [];
  
  deprecationRegistry.forEach((info) => {
    if (compareVersions(targetVersion, info.removalVersion) >= 0) {
      result.push(info);
    }
  });

  return result;
}

// ============== 辅助函数 ==============

/**
 * 记录警告消息
 */
function logWarning(message: string, name: string): void {
  if (currentConfig.showStackTrace) {
    const error = new Error();
    const stack = error.stack?.split('\n').slice(2).join('\n') || '';
    currentConfig.logger(`${message}\n\nStack trace:\n${stack}`);
  } else {
    currentConfig.logger(message);
  }
}

/**
 * 版本号比较 (语义化版本)
 * 
 * @param a - 版本号 A
 * @param b - 版本号 B
 * @returns -1 (a<b), 0 (a===b), 1 (a>b)
 */
function compareVersions(a: string, b: string): number {
  const partsA = a.replace(/^v/, '').split('.').map(Number);
  const partsB = b.replace(/^v/, '').split('.').map(Number);

  for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;

    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }

  return 0;
}

// ============== 自定义错误类 ==============

/**
 * 弃用错误
 */
export class DeprecationError extends Error {
  public readonly deprecationInfo: DeprecationInfo;

  constructor(message: string, info: DeprecationInfo) {
    super(message);
    this.name = 'DeprecationError';
    this.deprecationInfo = info;
  }
}

// ============== 使用示例 ==============

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * // ============================================
 * // 示例 1: 基本弃用警告
 * // ============================================
 * 
 * import { registerDeprecation, warnDeprecated } from './deprecation-utils-skill';
 * 
 * // 注册弃用
 * registerDeprecation({
 *   name: 'legacyApiClient',
 *   deprecatedSince: '2.0.0',
 *   removalVersion: '3.0.0',
 *   replacement: 'modernApiClient',
 *   migrationGuide: 'https://docs.example.com/migrate-to-v3',
 *   notes: '旧客户端不支持 HTTP/2 和自动重试'
 * });
 * 
 * // 在代码中使用
 * function createClient() {
 *   warnDeprecated('legacyApiClient');
 *   return new LegacyApiClient();
 * }
 * 
 * // ============================================
 * // 示例 2: 版本追踪
 * // ============================================
 * 
 * import { addVersionTrack, generateMigrationReport } from './deprecation-utils-skill';
 * 
 * // 添加版本记录
 * addVersionTrack({
 *   version: '2.0.0',
 *   releaseDate: '2026-03-01',
 *   deprecations: ['legacyApiClient', 'oldAuthMethod'],
 *   removals: ['v1Endpoint'],
 *   breakingChanges: ['认证机制从 Basic 改为 Bearer']
 * });
 * 
 * // 生成迁移报告
 * const report = generateMigrationReport();
 * console.log(report);
 * 
 * // ============================================
 * // 示例 3: 配置管理
 * // ============================================
 * 
 * import { configureDeprecation, checkMigrationRequired } from './deprecation-utils-skill';
 * 
 * // 生产环境禁用警告
 * if (process.env.NODE_ENV === 'production') {
 *   configureDeprecation({ enabled: false });
 * }
 * 
 * // 检查迁移需求
 * const needsMigration = checkMigrationRequired('3.0.0');
 * if (needsMigration.length > 0) {
 *   console.warn(`需要迁移 ${needsMigration.length} 个功能`);
 * }
 * 
 * // ============================================
 * // 示例 4: 装饰器模式 (TypeScript)
 * // ============================================
 * 
 * function Deprecated(info: DeprecationInfo) {
 *   registerDeprecation(info);
 *   
 *   return function (
 *     target: any,
 *     propertyKey: string,
 *     descriptor: PropertyDescriptor
 *   ) {
 *     const originalMethod = descriptor.value;
 *     
 *     descriptor.value = function (...args: any[]) {
 *       warnDeprecated(info.name);
 *       return originalMethod.apply(this, args);
 *     };
 *     
 *     return descriptor;
 *   };
 * }
 * 
 * class LegacyService {
 *   @Deprecated({
 *     name: 'LegacyService.fetchData',
 *     deprecatedSince: '2.0.0',
 *     removalVersion: '3.0.0',
 *     replacement: 'DataService.query'
 *   })
 *   fetchData() {
 *     // ... 旧实现
 *   }
 * }
 * ```
 */
export const EXAMPLES = `
// 完整示例请查看上方的 JSDoc 注释
`;

// 导出默认配置
export default {
  registerDeprecation,
  warnDeprecated,
  getDeprecationInfo,
  getAllDeprecations,
  addVersionTrack,
  getVersionHistory,
  configureDeprecation,
  resetDeprecationConfig,
  clearWarningCache,
  clearAllDeprecations,
  generateMigrationReport,
  checkMigrationRequired,
  DeprecationError,
};
