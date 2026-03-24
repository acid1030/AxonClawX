/**
 * KAEL 文件监听工具
 * 
 * 功能:
 * 1. 文件变化监听 (创建、修改、删除、重命名)
 * 2. 目录监听 (递归监控整个目录树)
 * 3. 事件触发 (回调函数、防抖、过滤)
 * 
 * @author KAEL
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export type FileEventType = 'create' | 'modify' | 'delete' | 'rename';

export interface FileEvent {
  type: FileEventType;
  filePath: string;
  oldPath?: string;
  timestamp: number;
  stats?: fs.Stats;
}

export interface WatchOptions {
  /** 是否递归监控子目录 (默认 false) */
  recursive?: boolean;
  /** 文件过滤正则表达式 (默认监控所有文件) */
  filter?: RegExp;
  /** 防抖延迟 (毫秒，默认 100ms) */
  debounceMs?: number;
  /** 是否忽略 node_modules 目录 (默认 true) */
  ignoreNodeModules?: boolean;
  /** 是否忽略 .git 目录 (默认 true) */
  ignoreGit?: boolean;
  /** 自定义忽略路径数组 */
  ignorePaths?: string[];
}

export interface WatchCallback {
  (event: FileEvent): void | Promise<void>;
}

export interface Watcher {
  /** 停止监听 */
  close: () => void;
  /** 获取监听路径 */
  getPath: () => string;
  /** 获取事件计数 */
  getEventCount: () => number;
  /** 重置事件计数 */
  resetEventCount: () => void;
}

export interface DirectorySnapshot {
  filePath: string;
  size: number;
  mtime: number;
  hash?: string;
}

// ==================== 工具函数 ====================

/**
 * 生成文件哈希 (简化版，用于快速比较)
 */
function getFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (err) {
        reject(err);
        return;
      }
      // 简化哈希：使用长度 + 最后修改时间 + 部分内容
      const hash = `${data.length}-${Date.now()}-${data.slice(0, 100).toString('hex')}`;
      resolve(hash);
    });
  });
}

/**
 * 检查路径是否应该被忽略
 */
function shouldIgnore(filePath: string, options: WatchOptions): boolean {
  const normalizedPath = path.normalize(filePath);
  
  // 检查自定义忽略路径
  if (options.ignorePaths) {
    for (const ignorePath of options.ignorePaths) {
      if (normalizedPath.includes(path.normalize(ignorePath))) {
        return true;
      }
    }
  }
  
  // 检查 node_modules
  if (options.ignoreNodeModules !== false && normalizedPath.includes('node_modules')) {
    return true;
  }
  
  // 检查 .git
  if (options.ignoreGit !== false && normalizedPath.includes('.git')) {
    return true;
  }
  
  // 检查文件过滤
  if (options.filter && !options.filter.test(path.basename(filePath))) {
    return true;
  }
  
  return false;
}

/**
 * 获取文件统计信息
 */
function getFileStats(filePath: string): Promise<fs.Stats | null> {
  return new Promise((resolve) => {
    fs.stat(filePath, (err, stats) => {
      if (err) {
        resolve(null);
        return;
      }
      resolve(stats);
    });
  });
}

/**
 * 防抖函数
 */
function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): { (...args: Parameters<T>): void; cancel: () => void } {
  let timeoutId: NodeJS.Timeout | null = null;
  
  const debounced = (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn(...args);
      timeoutId = null;
    }, delay);
  };
  
  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };
  
  return debounced;
}

// ==================== 主功能函数 ====================

/**
 * 1. 单文件监听
 * 
 * @param filePath 要监听的文件路径
 * @param callback 事件回调函数
 * @returns Watcher 对象
 */
export function watchFile(
  filePath: string,
  callback: WatchCallback
): Watcher {
  const absolutePath = path.resolve(filePath);
  let eventCount = 0;
  let isClosed = false;
  
  // 检查文件是否存在
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`文件不存在：${absolutePath}`);
  }
  
  const handler = (eventType: string, filename: string) => {
    if (isClosed) return;
    
    const fullPath = path.resolve(path.dirname(absolutePath), filename);
    if (fullPath !== absolutePath) return;
    
    eventCount++;
    
    let type: FileEventType = 'modify';
    if (eventType === 'rename') {
      // 检查文件是否还存在
      if (!fs.existsSync(absolutePath)) {
        type = 'delete';
      } else {
        type = 'rename';
      }
    }
    
    getFileStats(absolutePath).then(stats => {
      callback({
        type,
        filePath: absolutePath,
        timestamp: Date.now(),
        stats: stats || undefined,
      });
    });
  };
  
  const watcher = fs.watch(absolutePath, handler);
  
  return {
    close: () => {
      isClosed = true;
      watcher.close();
    },
    getPath: () => absolutePath,
    getEventCount: () => eventCount,
    resetEventCount: () => {
      eventCount = 0;
    },
  };
}

/**
 * 2. 目录监听 (支持递归)
 * 
 * @param dirPath 要监听的目录路径
 * @param callback 事件回调函数
 * @param options 监听选项
 * @returns Watcher 对象
 */
export function watchDirectory(
  dirPath: string,
  callback: WatchCallback,
  options: WatchOptions = {}
): Watcher {
  const absolutePath = path.resolve(dirPath);
  let eventCount = 0;
  let isClosed = false;
  const watchers: Map<string, fs.FSWatcher> = new Map();
  const debouncedCallbacks: Map<string, ReturnType<typeof debounce>> = new Map();
  
  // 检查目录是否存在
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`目录不存在：${absolutePath}`);
  }
  
  const stats = fs.statSync(absolutePath);
  if (!stats.isDirectory()) {
    throw new Error(`路径不是目录：${absolutePath}`);
  }
  
  const debounceMs = options.debounceMs ?? 100;
  
  /**
   * 处理文件事件
   */
  const handleEvent = (eventType: string, filename: string, watchPath: string) => {
    if (isClosed) return;
    
    const fullPath = path.resolve(watchPath, filename);
    
    // 检查是否应该忽略
    if (shouldIgnore(fullPath, options)) {
      return;
    }
    
    // 获取或创建防抖回调
    let debouncedCb = debouncedCallbacks.get(fullPath);
    if (!debouncedCb) {
      debouncedCb = debounce((event: FileEvent) => {
        eventCount++;
        callback(event);
      }, debounceMs);
      debouncedCallbacks.set(fullPath, debouncedCb);
    }
    
    // 确定事件类型
    let type: FileEventType = 'modify';
    if (eventType === 'rename') {
      if (!fs.existsSync(fullPath)) {
        type = 'delete';
      } else {
        type = 'rename';
      }
    } else if (eventType === 'change') {
      type = 'modify';
    }
    
    // 获取文件统计信息
    getFileStats(fullPath).then(stats => {
      debouncedCb!({
        type,
        filePath: fullPath,
        timestamp: Date.now(),
        stats: stats || undefined,
      });
    });
  };
  
  /**
   * 递归添加监听器
   */
  const addWatcher = (watchPath: string) => {
    if (isClosed) return;
    
    try {
      const watcher = fs.watch(watchPath, { recursive: options.recursive ?? false }, (eventType, filename) => {
        if (!filename) return;
        handleEvent(eventType, filename, watchPath);
      });
      
      watchers.set(watchPath, watcher);
      
      // 如果启用递归，扫描子目录
      if (options.recursive) {
        try {
          const entries = fs.readdirSync(watchPath, { withFileTypes: true });
          for (const entry of entries) {
            const entryPath = path.join(watchPath, entry.name);
            
            if (shouldIgnore(entryPath, options)) {
              continue;
            }
            
            if (entry.isDirectory()) {
              addWatcher(entryPath);
            }
          }
        } catch (err) {
          // 忽略读取错误
        }
      }
    } catch (err) {
      // 忽略监听错误
    }
  };
  
  // 添加主目录监听器
  addWatcher(absolutePath);
  
  return {
    close: () => {
      isClosed = true;
      watchers.forEach(watcher => watcher.close());
      watchers.clear();
      debouncedCallbacks.forEach(cb => cb.cancel());
      debouncedCallbacks.clear();
    },
    getPath: () => absolutePath,
    getEventCount: () => eventCount,
    resetEventCount: () => {
      eventCount = 0;
    },
  };
}

/**
 * 3. 批量监听多个路径
 * 
 * @param paths 路径数组 (可以是文件或目录)
 * @param callback 事件回调函数
 * @param options 监听选项
 * @returns Watcher 数组
 */
export function watchMultiple(
  paths: string[],
  callback: WatchCallback,
  options: WatchOptions = {}
): Watcher[] {
  const watchers: Watcher[] = [];
  
  for (const p of paths) {
    try {
      const absolutePath = path.resolve(p);
      
      if (!fs.existsSync(absolutePath)) {
        console.warn(`路径不存在，跳过：${absolutePath}`);
        continue;
      }
      
      const stats = fs.statSync(absolutePath);
      
      if (stats.isDirectory()) {
        watchers.push(watchDirectory(absolutePath, callback, options));
      } else {
        watchers.push(watchFile(absolutePath, callback));
      }
    } catch (err) {
      console.warn(`监听失败：${p}`, err);
    }
  }
  
  return watchers;
}

/**
 * 4. 创建目录快照 (用于比较变化)
 * 
 * @param dirPath 目录路径
 * @returns 目录快照对象
 */
export async function createDirectorySnapshot(
  dirPath: string,
  options: WatchOptions = {}
): Promise<DirectorySnapshot[]> {
  const absolutePath = path.resolve(dirPath);
  const snapshots: DirectorySnapshot[] = [];
  
  const scan = async (scanPath: string) => {
    try {
      const entries = fs.readdirSync(scanPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(scanPath, entry.name);
        
        if (shouldIgnore(entryPath, options)) {
          continue;
        }
        
        if (entry.isFile()) {
          const stats = fs.statSync(entryPath);
          snapshots.push({
            filePath: entryPath,
            size: stats.size,
            mtime: stats.mtimeMs,
          });
        } else if (entry.isDirectory() && options.recursive) {
          await scan(entryPath);
        }
      }
    } catch (err) {
      // 忽略错误
    }
  };
  
  await scan(absolutePath);
  return snapshots;
}

/**
 * 5. 比较两个快照的差异
 * 
 * @param oldSnapshot 旧快照
 * @param newSnapshot 新快照
 * @returns 差异事件列表
 */
export function compareSnapshots(
  oldSnapshot: DirectorySnapshot[],
  newSnapshot: DirectorySnapshot[]
): FileEvent[] {
  const events: FileEvent[] = [];
  const oldMap = new Map(oldSnapshot.map(s => [s.filePath, s]));
  const newMap = new Map(newSnapshot.map(s => [s.filePath, s]));
  
  // 检查删除和修改的文件
  oldSnapshot.forEach(oldStats => {
    const filePath = oldStats.filePath;
    const newStats = newMap.get(filePath);
    
    if (!newStats) {
      // 文件被删除
      events.push({
        type: 'delete',
        filePath,
        timestamp: Date.now(),
      });
    } else if (oldStats.mtime !== newStats.mtime || oldStats.size !== newStats.size) {
      // 文件被修改
      events.push({
        type: 'modify',
        filePath,
        timestamp: Date.now(),
        stats: {
          size: newStats.size,
          mtimeMs: newStats.mtime,
        } as fs.Stats,
      });
    }
  });
  
  // 检查新增的文件
  newSnapshot.forEach(newStats => {
    const filePath = newStats.filePath;
    if (!oldMap.has(filePath)) {
      // 文件被创建
      events.push({
        type: 'create',
        filePath,
        timestamp: Date.now(),
        stats: {
          size: newStats.size,
          mtimeMs: newStats.mtime,
        } as fs.Stats,
      });
    }
  });
  
  return events;
}

/**
 * 6. 等待特定文件事件 (Promise 版本)
 * 
 * @param filePath 文件路径
 * @param eventType 期望的事件类型
 * @param timeoutMs 超时时间 (毫秒，默认 30000)
 * @returns Promise<FileEvent>
 */
export function waitForEvent(
  filePath: string,
  eventType?: FileEventType,
  timeoutMs: number = 30000
): Promise<FileEvent> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      watcher.close();
      reject(new Error(`等待事件超时：${timeoutMs}ms`));
    }, timeoutMs);
    
    const watcher = watchFile(filePath, (event) => {
      if (!eventType || event.type === eventType) {
        clearTimeout(timeout);
        watcher.close();
        resolve(event);
      }
    });
  });
}

/**
 * 7. 监听并记录到日志文件
 * 
 * @param dirPath 目录路径
 * @param logFilePath 日志文件路径
 * @param options 监听选项
 * @returns Watcher 对象
 */
export function watchWithLogging(
  dirPath: string,
  logFilePath: string,
  options: WatchOptions = {}
): Watcher {
  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
  
  const watcher = watchDirectory(dirPath, (event) => {
    const logEntry = JSON.stringify({
      timestamp: new Date(event.timestamp).toISOString(),
      type: event.type,
      path: event.filePath,
      oldPath: event.oldPath,
      size: event.stats?.size,
      mtime: event.stats?.mtimeMs,
    }) + '\n';
    
    logStream.write(logEntry);
  }, options);
  
  // 包装 close 方法以关闭日志流
  const originalClose = watcher.close;
  return {
    ...watcher,
    close: () => {
      originalClose();
      logStream.end();
    },
  };
}

// ==================== 导出 ====================

export default {
  watchFile,
  watchDirectory,
  watchMultiple,
  createDirectorySnapshot,
  compareSnapshots,
  waitForEvent,
  watchWithLogging,
};
