/**
 * 本地存储工具技能
 * 
 * 功能:
 * 1. localStorage 封装
 * 2. sessionStorage 封装
 * 3. 过期时间支持
 * 
 * @module skills/storage-utils
 */

// ==================== 类型定义 ====================

/**
 * 存储项结构
 */
interface StorageItem<T> {
  value: T;
  expiry?: number; // 过期时间戳 (毫秒)
}

/**
 * 存储选项
 */
interface StorageOptions {
  /** 过期时间 (毫秒)，默认不过期 */
  expiry?: number;
  /** 过期时间 (人类可读)，如 '1h', '2d', '30m' */
  expiresIn?: string;
}

/**
 * 存储引擎类型
 */
type StorageEngine = 'local' | 'session';

// ==================== 工具函数 ====================

/**
 * 解析人类可读的时间字符串为毫秒数
 * @param timeStr - 时间字符串 (如 '1h', '2d', '30m', '1s')
 * @returns 毫秒数
 */
export function parseTimeStr(timeStr: string): number {
  const match = timeStr.match(/^(\d+)(s|m|h|d|w|y)$/);
  if (!match) {
    throw new Error(`Invalid time format: ${timeStr}. Use format like '1h', '2d', '30m'`);
  }
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const units: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
    y: 365 * 24 * 60 * 60 * 1000,
  };
  
  return value * units[unit];
}

/**
 * 获取存储引擎
 * @param type - 引擎类型
 * @returns Storage 对象
 */
function getStorage(type: StorageEngine): Storage {
  if (typeof window === 'undefined') {
    throw new Error('Storage is not available in server-side environment');
  }
  
  return type === 'local' ? window.localStorage : window.sessionStorage;
}

/**
 * 生成存储键名 (带命名空间)
 * @param key - 原始键名
 * @param namespace - 命名空间，可选
 * @returns 完整键名
 */
function generateKey(key: string, namespace?: string): string {
  return namespace ? `${namespace}:${key}` : key;
}

// ==================== 核心存储功能 ====================

/**
 * 存储数据
 * @param key - 存储键名
 * @param value - 存储值
 * @param options - 存储选项
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 */
export function setItem<T>(
  key: string,
  value: T,
  options?: StorageOptions,
  type: StorageEngine = 'local',
  namespace?: string
): void {
  const storage = getStorage(type);
  const fullKey = generateKey(key, namespace);
  
  const item: StorageItem<T> = {
    value,
  };
  
  // 处理过期时间
  if (options?.expiry) {
    item.expiry = Date.now() + options.expiry;
  } else if (options?.expiresIn) {
    item.expiry = Date.now() + parseTimeStr(options.expiresIn);
  }
  
  try {
    storage.setItem(fullKey, JSON.stringify(item));
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      throw new Error('Storage quota exceeded. Consider clearing old data.');
    }
    throw error;
  }
}

/**
 * 获取数据
 * @param key - 存储键名
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 * @returns 存储值，如果不存在或已过期返回 undefined
 */
export function getItem<T>(
  key: string,
  type: StorageEngine = 'local',
  namespace?: string
): T | undefined {
  const storage = getStorage(type);
  const fullKey = generateKey(key, namespace);
  
  const itemStr = storage.getItem(fullKey);
  if (!itemStr) {
    return undefined;
  }
  
  try {
    const item: StorageItem<T> = JSON.parse(itemStr);
    
    // 检查是否过期
    if (item.expiry && Date.now() > item.expiry) {
      storage.removeItem(fullKey);
      return undefined;
    }
    
    return item.value;
  } catch (error) {
    console.warn(`Failed to parse storage item: ${fullKey}`, error);
    return undefined;
  }
}

/**
 * 删除数据
 * @param key - 存储键名
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 */
export function removeItem(
  key: string,
  type: StorageEngine = 'local',
  namespace?: string
): void {
  const storage = getStorage(type);
  const fullKey = generateKey(key, namespace);
  storage.removeItem(fullKey);
}

/**
 * 检查数据是否存在且未过期
 * @param key - 存储键名
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 * @returns 是否存在
 */
export function hasItem(
  key: string,
  type: StorageEngine = 'local',
  namespace?: string
): boolean {
  const value = getItem(key, type, namespace);
  return value !== undefined;
}

/**
 * 获取数据的过期时间
 * @param key - 存储键名
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 * @returns 过期时间戳 (毫秒)，如果不存在或永不过期返回 undefined
 */
export function getExpiry(
  key: string,
  type: StorageEngine = 'local',
  namespace?: string
): number | undefined {
  const storage = getStorage(type);
  const fullKey = generateKey(key, namespace);
  
  const itemStr = storage.getItem(fullKey);
  if (!itemStr) {
    return undefined;
  }
  
  try {
    const item: StorageItem<unknown> = JSON.parse(itemStr);
    return item.expiry;
  } catch (error) {
    return undefined;
  }
}

/**
 * 更新数据的过期时间
 * @param key - 存储键名
 * @param expiry - 新的过期时间 (毫秒)，或 null 表示永不过期
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 */
export function updateExpiry(
  key: string,
  expiry: number | null,
  type: StorageEngine = 'local',
  namespace?: string
): void {
  const storage = getStorage(type);
  const fullKey = generateKey(key, namespace);
  
  const itemStr = storage.getItem(fullKey);
  if (!itemStr) {
    return;
  }
  
  try {
    const item: StorageItem<unknown> = JSON.parse(itemStr);
    item.expiry = expiry ?? undefined;
    storage.setItem(fullKey, JSON.stringify(item));
  } catch (error) {
    console.warn(`Failed to update expiry: ${fullKey}`, error);
  }
}

/**
 * 延长数据的过期时间
 * @param key - 存储键名
 * @param extension - 延长时间 (毫秒) 或时间字符串 (如 '1h')
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 */
export function extendExpiry(
  key: string,
  extension: number | string,
  type: StorageEngine = 'local',
  namespace?: string
): void {
  const storage = getStorage(type);
  const fullKey = generateKey(key, namespace);
  
  const itemStr = storage.getItem(fullKey);
  if (!itemStr) {
    return;
  }
  
  try {
    const item: StorageItem<unknown> = JSON.parse(itemStr);
    
    const extensionMs = typeof extension === 'string' 
      ? parseTimeStr(extension) 
      : extension;
    
    const currentExpiry = item.expiry ?? Date.now();
    item.expiry = currentExpiry + extensionMs;
    
    storage.setItem(fullKey, JSON.stringify(item));
  } catch (error) {
    console.warn(`Failed to extend expiry: ${fullKey}`, error);
  }
}

// ==================== 批量操作 ====================

/**
 * 批量获取数据
 * @param keys - 键名数组
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 * @returns 键值对对象
 */
export function getItems<T = any>(
  keys: string[],
  type: StorageEngine = 'local',
  namespace?: string
): Record<string, T | undefined> {
  const result: Record<string, T | undefined> = {};
  keys.forEach(key => {
    result[key] = getItem<T>(key, type, namespace);
  });
  return result;
}

/**
 * 批量设置数据
 * @param items - 键值对对象
 * @param options - 存储选项
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 */
export function setItems<T>(
  items: Record<string, T>,
  options?: StorageOptions,
  type: StorageEngine = 'local',
  namespace?: string
): void {
  Object.entries(items).forEach(([key, value]) => {
    setItem(key, value, options, type, namespace);
  });
}

/**
 * 批量删除数据
 * @param keys - 键名数组
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 */
export function removeItems(
  keys: string[],
  type: StorageEngine = 'local',
  namespace?: string
): void {
  keys.forEach(key => {
    removeItem(key, type, namespace);
  });
}

/**
 * 清空所有数据 (可选按命名空间)
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，如果提供则只清空该命名空间
 */
export function clear(
  type: StorageEngine = 'local',
  namespace?: string
): void {
  const storage = getStorage(type);
  
  if (!namespace) {
    storage.clear();
    return;
  }
  
  // 只清空指定命名空间的数据
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(`${namespace}:`)) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => storage.removeItem(key));
}

// ==================== 清理功能 ====================

/**
 * 清理所有过期数据
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 * @returns 清理的项目数量
 */
export function cleanupExpired(
  type: StorageEngine = 'local',
  namespace?: string
): number {
  const storage = getStorage(type);
  let count = 0;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    
    // 如果指定了命名空间，只检查该命名空间的数据
    if (namespace && !key.startsWith(`${namespace}:`)) {
      continue;
    }
    
    try {
      const itemStr = storage.getItem(key);
      if (!itemStr) continue;
      
      const item: StorageItem<unknown> = JSON.parse(itemStr);
      if (item.expiry && Date.now() > item.expiry) {
        keysToRemove.push(key);
      }
    } catch (error) {
      // 忽略解析错误的数据
    }
  }
  
  keysToRemove.forEach(key => {
    storage.removeItem(key);
    count++;
  });
  
  return count;
}

/**
 * 获取所有存储键名
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 * @returns 键名数组
 */
export function keys(
  type: StorageEngine = 'local',
  namespace?: string
): string[] {
  const storage = getStorage(type);
  const result: string[] = [];
  
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    
    // 如果指定了命名空间，只返回该命名空间的键
    if (namespace) {
      if (key.startsWith(`${namespace}:`)) {
        result.push(key.replace(`${namespace}:`, ''));
      }
    } else {
      result.push(key);
    }
  }
  
  return result;
}

/**
 * 获取存储使用量估算 (字节数)
 * @param type - 存储类型，默认 localStorage
 * @returns 估算的字节数
 */
export function getStorageUsage(
  type: StorageEngine = 'local'
): number {
  const storage = getStorage(type);
  let totalSize = 0;
  
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key) continue;
    
    const value = storage.getItem(key);
    if (!value) continue;
    
    // 估算大小：键名 + 值 (UTF-8 编码)
    totalSize += key.length + value.length;
  }
  
  return totalSize * 2; // 近似字节数 (假设每个字符 2 字节)
}

/**
 * 获取存储信息
 * @param type - 存储类型，默认 localStorage
 * @param namespace - 命名空间，可选
 * @returns 存储信息对象
 */
export function getInfo(
  type: StorageEngine = 'local',
  namespace?: string
): {
  count: number;
  usageBytes: number;
  keys: string[];
} {
  const storageKeys = keys(type, namespace);
  return {
    count: storageKeys.length,
    usageBytes: getStorageUsage(type),
    keys: storageKeys,
  };
}

// ==================== localStorage 快捷方法 ====================

/**
 * localStorage 快捷设置
 */
export const local = {
  set: <T>(key: string, value: T, options?: StorageOptions, namespace?: string) =>
    setItem(key, value, options, 'local', namespace),
  
  get: <T>(key: string, namespace?: string) =>
    getItem<T>(key, 'local', namespace),
  
  remove: (key: string, namespace?: string) =>
    removeItem(key, 'local', namespace),
  
  has: (key: string, namespace?: string) =>
    hasItem(key, 'local', namespace),
  
  getExpiry: (key: string, namespace?: string) =>
    getExpiry(key, 'local', namespace),
  
  updateExpiry: (key: string, expiry: number | null, namespace?: string) =>
    updateExpiry(key, expiry, 'local', namespace),
  
  extendExpiry: (key: string, extension: number | string, namespace?: string) =>
    extendExpiry(key, extension, 'local', namespace),
  
  clear: (namespace?: string) => clear('local', namespace),
  
  keys: (namespace?: string) => keys('local', namespace),
  
  cleanup: (namespace?: string) => cleanupExpired('local', namespace),
  
  info: (namespace?: string) => getInfo('local', namespace),
};

// ==================== sessionStorage 快捷方法 ====================

/**
 * sessionStorage 快捷设置
 */
export const session = {
  set: <T>(key: string, value: T, options?: StorageOptions, namespace?: string) =>
    setItem(key, value, options, 'session', namespace),
  
  get: <T>(key: string, namespace?: string) =>
    getItem<T>(key, 'session', namespace),
  
  remove: (key: string, namespace?: string) =>
    removeItem(key, 'session', namespace),
  
  has: (key: string, namespace?: string) =>
    hasItem(key, 'session', namespace),
  
  getExpiry: (key: string, namespace?: string) =>
    getExpiry(key, 'session', namespace),
  
  updateExpiry: (key: string, expiry: number | null, namespace?: string) =>
    updateExpiry(key, expiry, 'session', namespace),
  
  extendExpiry: (key: string, extension: number | string, namespace?: string) =>
    extendExpiry(key, extension, 'session', namespace),
  
  clear: (namespace?: string) => clear('session', namespace),
  
  keys: (namespace?: string) => keys('session', namespace),
  
  cleanup: (namespace?: string) => cleanupExpired('session', namespace),
  
  info: (namespace?: string) => getInfo('session', namespace),
};

// ==================== 导出 ====================

export const StorageUtils = {
  // 核心方法
  setItem,
  getItem,
  removeItem,
  hasItem,
  
  // 过期时间管理
  getExpiry,
  updateExpiry,
  extendExpiry,
  
  // 批量操作
  getItems,
  setItems,
  removeItems,
  clear,
  
  // 清理功能
  cleanupExpired,
  keys,
  getStorageUsage,
  getInfo,
  
  // 工具函数
  parseTimeStr,
  
  // 快捷方法
  local,
  session,
};

export default StorageUtils;
