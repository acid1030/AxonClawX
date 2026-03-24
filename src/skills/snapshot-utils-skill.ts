/**
 * Snapshot Utils - 状态快照管理工具
 * 
 * 功能:
 * 1. 状态快照 - 捕获任意对象/状态的快照
 * 2. 快照恢复 - 从快照恢复状态
 * 3. 差异比较 - 比较两个快照之间的差异
 * 
 * @author Axon (NOVA Subagent)
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/** 快照元数据 */
export interface SnapshotMetadata {
  /** 快照 ID */
  id: string;
  /** 创建时间戳 */
  timestamp: number;
  /** 快照名称/标签 */
  label?: string;
  /** 状态哈希 (用于快速比较) */
  hash: string;
  /** 数据大小 (字节) */
  size: number;
}

/** 完整快照 */
export interface Snapshot<T = any> {
  /** 元数据 */
  metadata: SnapshotMetadata;
  /** 快照数据 */
  data: T;
  /** 深度克隆的数据副本 */
  clonedData: T;
}

/** 差异项 */
export interface DiffEntry {
  /** 差异路径 (如 'user.name') */
  path: string;
  /** 差异类型 */
  type: 'added' | 'removed' | 'changed';
  /** 旧值 */
  oldValue?: any;
  /** 新值 */
  newValue?: any;
}

/** 差异报告 */
export interface DiffReport {
  /** 是否完全相同 */
  identical: boolean;
  /** 差异总数 */
  totalDiffs: number;
  /** 新增项数 */
  added: number;
  /** 删除项数 */
  removed: number;
  /** 变更项数 */
  changed: number;
  /** 详细差异列表 */
  diffs: DiffEntry[];
  /** 快照 A 的哈希 */
  hashA: string;
  /** 快照 B 的哈希 */
  hashB: string;
}

/** 快照管理器选项 */
export interface SnapshotManagerOptions {
  /** 最大保留快照数，0 表示无限制 */
  maxSnapshots?: number;
  /** 是否自动计算哈希 */
  autoHash?: boolean;
  /** 是否深度克隆数据 */
  deepClone?: boolean;
}

/** 快照存储 */
interface SnapshotStore<T> {
  snapshots: Map<string, Snapshot<T>>;
  labels: Map<string, string>; // label -> snapshotId
}

// ============== 工具函数 ==============

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 深度克隆对象
 */
function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }
  
  if (obj instanceof RegExp) {
    return new RegExp(obj.source, obj.flags) as any;
  }
  
  const cloned: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  
  return cloned;
}

/**
 * 计算对象的哈希值
 */
function computeHash(obj: any): string {
  const str = JSON.stringify(obj, (key, value) => {
    if (value instanceof Date) return `__DATE__:${value.toISOString()}`;
    if (value instanceof RegExp) return `__REGEXP__:${value.toString()}`;
    return value;
  });
  
  // 简单的哈希算法
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return `hash_${Math.abs(hash).toString(16)}`;
}

/**
 * 获取对象的深度路径值
 */
function getPathValue(obj: any, path: string): any {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || typeof current !== 'object') {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * 设置对象的深度路径值
 */
function setPathValue(obj: any, path: string, value: any): void {
  const keys = path.split('.');
  let current = obj;
  
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== 'object') {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[keys[keys.length - 1]] = value;
}

/**
 * 递归比较两个对象
 */
function compareObjects(objA: any, objB: any, path: string = '', diffs: DiffEntry[] = []): DiffEntry[] {
  // 处理 null/undefined
  if (objA === null && objB === null) return diffs;
  if (objA === undefined && objB === undefined) return diffs;
  if (objA === null || objA === undefined) {
    diffs.push({
      path: path || '(root)',
      type: 'added',
      newValue: objB,
    });
    return diffs;
  }
  if (objB === null || objB === undefined) {
    diffs.push({
      path: path || '(root)',
      type: 'removed',
      oldValue: objA,
    });
    return diffs;
  }
  
  // 类型不同
  if (typeof objA !== typeof objB) {
    diffs.push({
      path: path || '(root)',
      type: 'changed',
      oldValue: objA,
      newValue: objB,
    });
    return diffs;
  }
  
  // 原始类型
  if (typeof objA !== 'object') {
    if (objA !== objB) {
      diffs.push({
        path: path || '(root)',
        type: 'changed',
        oldValue: objA,
        newValue: objB,
      });
    }
    return diffs;
  }
  
  // 数组
  if (Array.isArray(objA) && Array.isArray(objB)) {
    const maxLength = Math.max(objA.length, objB.length);
    for (let i = 0; i < maxLength; i++) {
      const itemPath = path ? `${path}[${i}]` : `[${i}]`;
      if (i >= objA.length) {
        diffs.push({
          path: itemPath,
          type: 'added',
          newValue: objB[i],
        });
      } else if (i >= objB.length) {
        diffs.push({
          path: itemPath,
          type: 'removed',
          oldValue: objA[i],
        });
      } else {
        compareObjects(objA[i], objB[i], itemPath, diffs);
      }
    }
    return diffs;
  }
  
  // 对象
  const allKeys = new Set([
    ...Object.keys(objA),
    ...Object.keys(objB),
  ]);
  
  for (const key of allKeys) {
    const keyPath = path ? `${path}.${key}` : key;
    const hasKeyA = key in objA;
    const hasKeyB = key in objB;
    
    if (hasKeyA && !hasKeyB) {
      diffs.push({
        path: keyPath,
        type: 'removed',
        oldValue: objA[key],
      });
    } else if (!hasKeyA && hasKeyB) {
      diffs.push({
        path: keyPath,
        type: 'added',
        newValue: objB[key],
      });
    } else {
      compareObjects(objA[key], objB[key], keyPath, diffs);
    }
  }
  
  return diffs;
}

// ============== SnapshotUtils 类 ==============

/**
 * 快照工具类 - 提供状态快照、恢复和差异比较功能
 * 
 * @example
 * ```typescript
 * // 创建快照工具实例
 * const snapshotUtils = new SnapshotUtils();
 * 
 * // 创建状态快照
 * const state = { user: { name: 'Alice', age: 25 }, settings: { theme: 'dark' } };
 * const snapshot = snapshotUtils.createSnapshot(state, 'initial-state');
 * 
 * // 修改状态
 * state.user.age = 26;
 * state.user.email = 'alice@example.com';
 * 
 * // 比较差异
 * const diff = snapshotUtils.compare(snapshot, state);
 * console.log(diff.diffs); // 显示变更
 * 
 * // 恢复状态
 * const restored = snapshotUtils.restore(snapshot);
 * ```
 */
export class SnapshotUtils {
  private store: SnapshotStore<any> = {
    snapshots: new Map(),
    labels: new Map(),
  };
  
  private options: Required<SnapshotManagerOptions>;

  constructor(options: SnapshotManagerOptions = {}) {
    this.options = {
      maxSnapshots: options.maxSnapshots ?? 0,
      autoHash: options.autoHash ?? true,
      deepClone: options.deepClone ?? true,
    };
  }

  /**
   * 创建状态快照
   * 
   * @param state - 要快照的状态对象
   * @param label - 可选的快照标签
   * @returns 完整的快照对象
   * 
   * @example
   * ```typescript
   * const state = { count: 0, items: [] };
   * const snapshot = snapshotUtils.createSnapshot(state, 'before-operation');
   * ```
   */
  createSnapshot<T extends object>(state: T, label?: string): Snapshot<T> {
    const id = generateId();
    const timestamp = Date.now();
    
    // 深度克隆数据
    const clonedData = this.options.deepClone ? deepClone(state) : state;
    
    // 计算哈希
    const hash = this.options.autoHash ? computeHash(clonedData) : 'none';
    
    // 计算大小
    const size = Buffer.byteLength(JSON.stringify(clonedData), 'utf8');
    
    const metadata: SnapshotMetadata = {
      id,
      timestamp,
      label,
      hash,
      size,
    };
    
    const snapshot: Snapshot<T> = {
      metadata,
      data: state,
      clonedData,
    };
    
    // 存储快照
    this.store.snapshots.set(id, snapshot);
    
    // 存储标签映射
    if (label) {
      this.store.labels.set(label, id);
    }
    
    // 清理旧快照
    this.cleanup();
    
    return snapshot;
  }

  /**
   * 从快照恢复状态
   * 
   * @param snapshot - 快照对象或快照 ID/标签
   * @returns 恢复的状态 (深度克隆副本)
   * 
   * @example
   * ```typescript
   * // 使用快照对象
   * const restored = snapshotUtils.restore(snapshot);
   * 
   * // 使用快照 ID
   * const restored = snapshotUtils.restore('snap_1234567890_abc');
   * 
   * // 使用标签
   * const restored = snapshotUtils.restore('initial-state');
   * ```
   */
  restore<T>(snapshot: Snapshot<T> | string): T {
    let snap: Snapshot<T> | undefined;
    
    if (typeof snapshot === 'string') {
      // 尝试作为 ID 查找
      snap = this.store.snapshots.get(snapshot) as Snapshot<T>;
      
      // 如果没找到，尝试作为标签查找
      if (!snap) {
        const snapshotId = this.store.labels.get(snapshot);
        if (snapshotId) {
          snap = this.store.snapshots.get(snapshotId) as Snapshot<T>;
        }
      }
      
      if (!snap) {
        throw new Error(`Snapshot not found: ${snapshot}`);
      }
    } else {
      snap = snapshot;
    }
    
    // 返回深度克隆的副本
    return this.options.deepClone ? deepClone(snap.clonedData) : snap.clonedData;
  }

  /**
   * 比较两个快照/状态之间的差异
   * 
   * @param snapshotA - 快照 A (对象、快照或 ID/标签)
   * @param snapshotB - 快照 B (对象、快照或 ID/标签)
   * @returns 差异报告
   * 
   * @example
   * ```typescript
   * // 比较两个快照
   * const diff = snapshotUtils.compare(snapshot1, snapshot2);
   * 
   * // 比较快照和当前状态
   * const diff = snapshotUtils.compare(snapshot, currentState);
   * 
   * // 使用标签比较
   * const diff = snapshotUtils.compare('before', 'after');
   * 
   * console.log(`发现 ${diff.totalDiffs} 处差异`);
   * diff.diffs.forEach(d => {
   *   console.log(`${d.path}: ${d.type}`, { old: d.oldValue, new: d.newValue });
   * });
   * ```
   */
  compare<T>(snapshotA: Snapshot<T> | T | string, snapshotB: Snapshot<T> | T | string): DiffReport {
    // 提取数据
    const dataA = this.extractData(snapshotA);
    const dataB = this.extractData(snapshotB);
    
    // 获取哈希
    const hashA = this.extractHash(snapshotA);
    const hashB = this.extractHash(snapshotB);
    
    // 快速比较：哈希相同则完全相同
    if (hashA === hashB && hashA !== 'none' && hashB !== 'none') {
      return {
        identical: true,
        totalDiffs: 0,
        added: 0,
        removed: 0,
        changed: 0,
        diffs: [],
        hashA,
        hashB,
      };
    }
    
    // 深度比较
    const diffs: DiffEntry[] = compareObjects(dataA, dataB);
    
    // 统计差异
    const added = diffs.filter(d => d.type === 'added').length;
    const removed = diffs.filter(d => d.type === 'removed').length;
    const changed = diffs.filter(d => d.type === 'changed').length;
    
    return {
      identical: diffs.length === 0,
      totalDiffs: diffs.length,
      added,
      removed,
      changed,
      diffs,
      hashA,
      hashB,
    };
  }

  /**
   * 获取存储的快照
   * 
   * @param idOrLabel - 快照 ID 或标签
   * @returns 快照对象，未找到返回 undefined
   * 
   * @example
   * ```typescript
   * const snapshot = snapshotUtils.get('initial-state');
   * if (snapshot) {
   *   console.log(`快照创建时间：${new Date(snapshot.metadata.timestamp)}`);
   * }
   * ```
   */
  get<T>(idOrLabel: string): Snapshot<T> | undefined {
    // 尝试作为 ID 查找
    let snapshot = this.store.snapshots.get(idOrLabel) as Snapshot<T> | undefined;
    
    // 如果没找到，尝试作为标签查找
    if (!snapshot) {
      const snapshotId = this.store.labels.get(idOrLabel);
      if (snapshotId) {
        snapshot = this.store.snapshots.get(snapshotId) as Snapshot<T> | undefined;
      }
    }
    
    return snapshot;
  }

  /**
   * 删除快照
   * 
   * @param idOrLabel - 快照 ID 或标签
   * @returns 是否删除成功
   * 
   * @example
   * ```typescript
   * snapshotUtils.delete('old-snapshot');
   * ```
   */
  delete(idOrLabel: string): boolean {
    const snapshotId = this.resolveId(idOrLabel);
    
    if (!snapshotId) {
      return false;
    }
    
    const snapshot = this.store.snapshots.get(snapshotId);
    if (!snapshot) {
      return false;
    }
    
    // 删除标签映射
    if (snapshot.metadata.label) {
      this.store.labels.delete(snapshot.metadata.label);
    }
    
    // 删除快照
    return this.store.snapshots.delete(snapshotId);
  }

  /**
   * 列出所有快照
   * 
   * @returns 快照元数据列表
   * 
   * @example
   * ```typescript
   * const snapshots = snapshotUtils.list();
   * snapshots.forEach(snap => {
   *   console.log(`${snap.label || snap.id}: ${new Date(snap.timestamp)}`);
   * });
   * ```
   */
  list(): SnapshotMetadata[] {
    return Array.from(this.store.snapshots.values()).map(snap => snap.metadata);
  }

  /**
   * 清除所有快照
   * 
   * @example
   * ```typescript
   * snapshotUtils.clear();
   * ```
   */
  clear(): void {
    this.store.snapshots.clear();
    this.store.labels.clear();
  }

  /**
   * 获取快照统计信息
   * 
   * @returns 统计信息
   * 
   * @example
   * ```typescript
   * const stats = snapshotUtils.getStats();
   * console.log(`总快照数：${stats.total}`);
   * console.log(`总大小：${stats.totalSize} bytes`);
   * ```
   */
  getStats(): {
    total: number;
    totalSize: number;
    oldest?: Date;
    newest?: Date;
  } {
    const snapshots = Array.from(this.store.snapshots.values());
    const total = snapshots.length;
    const totalSize = snapshots.reduce((sum, s) => sum + s.metadata.size, 0);
    
    let oldest: Date | undefined;
    let newest: Date | undefined;
    
    if (total > 0) {
      const timestamps = snapshots.map(s => s.metadata.timestamp);
      oldest = new Date(Math.min(...timestamps));
      newest = new Date(Math.max(...timestamps));
    }
    
    return { total, totalSize, oldest, newest };
  }

  // ============== 私有辅助方法 ==============

  /**
   * 从快照/对象/ID 中提取数据
   */
  private extractData<T>(source: Snapshot<T> | T | string): T {
    if (source && typeof source === 'object' && 'metadata' in source && 'clonedData' in source) {
      return (source as Snapshot<T>).clonedData;
    }
    
    if (typeof source === 'string') {
      const snapshot = this.get<T>(source);
      if (snapshot) {
        return snapshot.clonedData;
      }
      throw new Error(`Cannot extract data: snapshot not found: ${source}`);
    }
    
    return source as T;
  }

  /**
   * 从快照/对象/ID 中提取哈希
   */
  private extractHash(source: any): string {
    if (source && typeof source === 'object' && 'metadata' in source) {
      return (source as Snapshot<any>).metadata.hash;
    }
    
    if (typeof source === 'string') {
      const snapshot = this.get(source);
      if (snapshot) {
        return snapshot.metadata.hash;
      }
      return 'unknown';
    }
    
    return computeHash(source);
  }

  /**
   * 解析 ID 或标签为实际快照 ID
   */
  private resolveId(idOrLabel: string): string | null {
    // 尝试作为 ID 查找
    if (this.store.snapshots.has(idOrLabel)) {
      return idOrLabel;
    }
    
    // 尝试作为标签查找
    return this.store.labels.get(idOrLabel) || null;
  }

  /**
   * 清理旧快照 (超出最大数量限制)
   */
  private cleanup(): void {
    if (this.options.maxSnapshots <= 0) {
      return;
    }
    
    const snapshots = Array.from(this.store.snapshots.entries())
      .sort((a, b) => a[1].metadata.timestamp - b[1].metadata.timestamp);
    
    while (snapshots.length > this.options.maxSnapshots) {
      const [id, snapshot] = snapshots.shift()!;
      
      if (snapshot.metadata.label) {
        this.store.labels.delete(snapshot.metadata.label);
      }
      
      this.store.snapshots.delete(id);
    }
  }
}

// ============== 快捷函数 ==============

/**
 * 创建一次性快照 (不存储)
 * 
 * @param state - 状态对象
 * @returns 快照对象
 * 
 * @example
 * ```typescript
 * const snapshot = createSnapshot({ count: 0 });
 * ```
 */
export function createSnapshot<T extends object>(state: T, label?: string): Snapshot<T> {
  const utils = new SnapshotUtils();
  return utils.createSnapshot(state, label);
}

/**
 * 快速比较两个状态
 * 
 * @param stateA - 状态 A
 * @param stateB - 状态 B
 * @returns 差异报告
 * 
 * @example
 * ```typescript
 * const diff = compareStates(before, after);
 * ```
 */
export function compareStates<T extends object>(stateA: T, stateB: T): DiffReport {
  const utils = new SnapshotUtils();
  return utils.compare(stateA, stateB);
}

// ============== 导出 ==============

export default SnapshotUtils;
