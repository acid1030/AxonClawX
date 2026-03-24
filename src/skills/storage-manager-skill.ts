/**
 * 存储管理工具技能
 * 
 * 功能:
 * 1. localStorage 封装 - 带类型安全的键值存储
 * 2. sessionStorage 封装 - 会话级键值存储
 * 3. IndexedDB 封装 - 大容量结构化存储
 * 
 * @module skills/storage-manager
 */

// ==================== 类型定义 ====================

/**
 * 存储键名类型
 */
export type StorageKey = string;

/**
 * 存储值类型
 */
export type StorageValue = string | number | boolean | object | null | undefined;

/**
 * 存储选项
 */
export interface StorageOptions {
  /** 过期时间 (毫秒)，仅对 localStorage/sessionStorage 有效 */
  expiry?: number;
  /** 序列化器，默认 JSON.stringify */
  serialize?: (value: any) => string;
  /** 反序列化器，默认 JSON.parse */
  deserialize?: (value: string) => any;
}

/**
 * IndexedDB 配置
 */
export interface IDBConfig {
  /** 数据库名称 */
  dbName: string;
  /** 数据库版本 */
  version?: number;
  /** 存储对象名称 */
  storeName: string;
  /** 键路径 */
  keyPath?: string;
  /** 索引定义 */
  indexes?: IDBIndexConfig[];
}

/**
 * IndexedDB 索引配置
 */
export interface IDBIndexConfig {
  /** 索引名称 */
  name: string;
  /** 索引键路径 */
  keyPath: string;
  /** 是否唯一 */
  unique?: boolean;
  /** 是否多值 */
  multiEntry?: boolean;
}

/**
 * IndexedDB 查询条件
 */
export interface IDBQuery {
  /** 索引名称 */
  indexName?: string;
  /** 查询范围 (IDBKeyRange) */
  range?: IDBKeyRange;
  /** 查询方向 */
  direction?: 'next' | 'prev' | 'nextunique' | 'prevunique';
  /** 限制数量 */
  limit?: number;
  /** 跳过数量 */
  offset?: number;
}

/**
 * 带过期时间的存储项
 */
interface ExpirableItem {
  value: any;
  expiry: number | null;
}

// ==================== localStorage 封装 ====================

/**
 * localStorage 管理器
 */
export class LocalStorageManager {
  private prefix: string;
  private serialize: (value: any) => string;
  private deserialize: (value: string) => any;

  /**
   * 创建 localStorage 管理器
   * @param prefix - 键名前缀，用于隔离不同模块的数据
   * @param options - 选项
   */
  constructor(prefix: string = '', options?: {
    serialize?: (value: any) => string;
    deserialize?: (value: string) => any;
  }) {
    this.prefix = prefix ? `${prefix}:` : '';
    this.serialize = options?.serialize || JSON.stringify;
    this.deserialize = options?.deserialize || JSON.parse;
  }

  /**
   * 生成带前缀的键名
   */
  private makeKey(key: StorageKey): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 检查是否是浏览器环境
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
  }

  /**
   * 设置值
   * @param key - 键名
   * @param value - 值
   * @param options - 选项
   */
  set(key: StorageKey, value: StorageValue, options?: StorageOptions): void {
    if (!this.isBrowser()) {
      console.warn('LocalStorageManager: localStorage is not available');
      return;
    }

    try {
      const fullKey = this.makeKey(key);
      const item: ExpirableItem = {
        value,
        expiry: options?.expiry || null,
      };
      const serialized = this.serialize(item);
      window.localStorage.setItem(fullKey, serialized);
    } catch (error) {
      console.error('LocalStorageManager: Failed to set item', error);
      throw error;
    }
  }

  /**
   * 获取值
   * @param key - 键名
   * @param defaultValue - 默认值 (当键不存在或已过期时返回)
   * @returns 值
   */
  get<T = StorageValue>(key: StorageKey, defaultValue?: T): T | null {
    if (!this.isBrowser()) {
      console.warn('LocalStorageManager: localStorage is not available');
      return defaultValue ?? null;
    }

    try {
      const fullKey = this.makeKey(key);
      const itemStr = window.localStorage.getItem(fullKey);
      
      if (itemStr === null) {
        return defaultValue ?? null;
      }

      const item: ExpirableItem = this.deserialize(itemStr);
      
      // 检查是否过期
      if (item.expiry !== null && Date.now() > item.expiry) {
        this.remove(key);
        return defaultValue ?? null;
      }

      return item.value as T;
    } catch (error) {
      console.error('LocalStorageManager: Failed to get item', error);
      return defaultValue ?? null;
    }
  }

  /**
   * 删除值
   * @param key - 键名
   */
  remove(key: StorageKey): void {
    if (!this.isBrowser()) {
      return;
    }

    try {
      const fullKey = this.makeKey(key);
      window.localStorage.removeItem(fullKey);
    } catch (error) {
      console.error('LocalStorageManager: Failed to remove item', error);
    }
  }

  /**
   * 检查键是否存在
   * @param key - 键名
   * @returns 是否存在
   */
  has(key: StorageKey): boolean {
    if (!this.isBrowser()) {
      return false;
    }

    try {
      const fullKey = this.makeKey(key);
      const itemStr = window.localStorage.getItem(fullKey);
      
      if (itemStr === null) {
        return false;
      }

      const item: ExpirableItem = this.deserialize(itemStr);
      
      // 检查是否过期
      if (item.expiry !== null && Date.now() > item.expiry) {
        this.remove(key);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清空所有带前缀的键
   */
  clear(): void {
    if (!this.isBrowser()) {
      return;
    }

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => window.localStorage.removeItem(key));
    } catch (error) {
      console.error('LocalStorageManager: Failed to clear items', error);
    }
  }

  /**
   * 获取所有带前缀的键
   * @returns 键名数组
   */
  keys(): StorageKey[] {
    if (!this.isBrowser()) {
      return [];
    }

    try {
      const result: StorageKey[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          result.push(key.slice(this.prefix.length));
        }
      }
      return result;
    } catch (error) {
      console.error('LocalStorageManager: Failed to get keys', error);
      return [];
    }
  }

  /**
   * 获取存储项数量
   * @returns 数量
   */
  size(): number {
    return this.keys().length;
  }

  /**
   * 获取所有带前缀的值
   * @returns 值数组
   */
  values<T = StorageValue>(): T[] {
    return this.keys().map(key => this.get<T>(key)!).filter(v => v !== null);
  }

  /**
   * 获取所有带前缀的键值对
   * @returns 键值对数组
   */
  entries<T = StorageValue>(): [StorageKey, T][] {
    return this.keys().map(key => [key, this.get<T>(key)!]).filter(([_, v]) => v !== null);
  }
}

// ==================== sessionStorage 封装 ====================

/**
 * sessionStorage 管理器
 */
export class SessionStorageManager {
  private prefix: string;
  private serialize: (value: any) => string;
  private deserialize: (value: string) => any;

  /**
   * 创建 sessionStorage 管理器
   * @param prefix - 键名前缀，用于隔离不同模块的数据
   * @param options - 选项
   */
  constructor(prefix: string = '', options?: {
    serialize?: (value: any) => string;
    deserialize?: (value: string) => any;
  }) {
    this.prefix = prefix ? `${prefix}:` : '';
    this.serialize = options?.serialize || JSON.stringify;
    this.deserialize = options?.deserialize || JSON.parse;
  }

  /**
   * 生成带前缀的键名
   */
  private makeKey(key: StorageKey): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 检查是否是浏览器环境
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
  }

  /**
   * 设置值
   * @param key - 键名
   * @param value - 值
   * @param options - 选项
   */
  set(key: StorageKey, value: StorageValue, options?: StorageOptions): void {
    if (!this.isBrowser()) {
      console.warn('SessionStorageManager: sessionStorage is not available');
      return;
    }

    try {
      const fullKey = this.makeKey(key);
      const item: ExpirableItem = {
        value,
        expiry: options?.expiry || null,
      };
      const serialized = this.serialize(item);
      window.sessionStorage.setItem(fullKey, serialized);
    } catch (error) {
      console.error('SessionStorageManager: Failed to set item', error);
      throw error;
    }
  }

  /**
   * 获取值
   * @param key - 键名
   * @param defaultValue - 默认值 (当键不存在或已过期时返回)
   * @returns 值
   */
  get<T = StorageValue>(key: StorageKey, defaultValue?: T): T | null {
    if (!this.isBrowser()) {
      console.warn('SessionStorageManager: sessionStorage is not available');
      return defaultValue ?? null;
    }

    try {
      const fullKey = this.makeKey(key);
      const itemStr = window.sessionStorage.getItem(fullKey);
      
      if (itemStr === null) {
        return defaultValue ?? null;
      }

      const item: ExpirableItem = this.deserialize(itemStr);
      
      // 检查是否过期
      if (item.expiry !== null && Date.now() > item.expiry) {
        this.remove(key);
        return defaultValue ?? null;
      }

      return item.value as T;
    } catch (error) {
      console.error('SessionStorageManager: Failed to get item', error);
      return defaultValue ?? null;
    }
  }

  /**
   * 删除值
   * @param key - 键名
   */
  remove(key: StorageKey): void {
    if (!this.isBrowser()) {
      return;
    }

    try {
      const fullKey = this.makeKey(key);
      window.sessionStorage.removeItem(fullKey);
    } catch (error) {
      console.error('SessionStorageManager: Failed to remove item', error);
    }
  }

  /**
   * 检查键是否存在
   * @param key - 键名
   * @returns 是否存在
   */
  has(key: StorageKey): boolean {
    if (!this.isBrowser()) {
      return false;
    }

    try {
      const fullKey = this.makeKey(key);
      const itemStr = window.sessionStorage.getItem(fullKey);
      
      if (itemStr === null) {
        return false;
      }

      const item: ExpirableItem = this.deserialize(itemStr);
      
      // 检查是否过期
      if (item.expiry !== null && Date.now() > item.expiry) {
        this.remove(key);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 清空所有带前缀的键
   */
  clear(): void {
    if (!this.isBrowser()) {
      return;
    }

    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => window.sessionStorage.removeItem(key));
    } catch (error) {
      console.error('SessionStorageManager: Failed to clear items', error);
    }
  }

  /**
   * 获取所有带前缀的键
   * @returns 键名数组
   */
  keys(): StorageKey[] {
    if (!this.isBrowser()) {
      return [];
    }

    try {
      const result: StorageKey[] = [];
      for (let i = 0; i < window.sessionStorage.length; i++) {
        const key = window.sessionStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          result.push(key.slice(this.prefix.length));
        }
      }
      return result;
    } catch (error) {
      console.error('SessionStorageManager: Failed to get keys', error);
      return [];
    }
  }

  /**
   * 获取存储项数量
   * @returns 数量
   */
  size(): number {
    return this.keys().length;
  }

  /**
   * 获取所有带前缀的值
   * @returns 值数组
   */
  values<T = StorageValue>(): T[] {
    return this.keys().map(key => this.get<T>(key)!).filter(v => v !== null);
  }

  /**
   * 获取所有带前缀的键值对
   * @returns 键值对数组
   */
  entries<T = StorageValue>(): [StorageKey, T][] {
    return this.keys().map(key => [key, this.get<T>(key)!]).filter(([_, v]) => v !== null);
  }
}

// ==================== IndexedDB 封装 ====================

/**
 * IndexedDB 管理器
 */
export class IndexedDBManager {
  private config: IDBConfig;
  private db: IDBDatabase | null = null;
  private openPromise: Promise<IDBDatabase> | null = null;

  /**
   * 创建 IndexedDB 管理器
   * @param config - 配置
   */
  constructor(config: IDBConfig) {
    this.config = {
      ...config,
      version: config.version || 1,
    };
  }

  /**
   * 检查是否是浏览器环境
   */
  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
  }

  /**
   * 打开数据库连接
   * @returns 数据库实例
   */
  async open(): Promise<IDBDatabase> {
    if (!this.isBrowser()) {
      throw new Error('IndexedDBManager: indexedDB is not available');
    }

    if (this.db) {
      return this.db;
    }

    if (this.openPromise) {
      return this.openPromise;
    }

    this.openPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        this.openPromise = null;
        reject(new Error(`IndexedDBManager: Failed to open database - ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
        
        this.db.onclose = () => {
          this.db = null;
          this.openPromise = null;
        };
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建存储对象
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(
            this.config.storeName,
            this.config.keyPath ? { keyPath: this.config.keyPath } : undefined
          );

          // 创建索引
          if (this.config.indexes) {
            this.config.indexes.forEach(indexConfig => {
              store.createIndex(indexConfig.name, indexConfig.keyPath, {
                unique: indexConfig.unique || false,
                multiEntry: indexConfig.multiEntry || false,
              });
            });
          }
        }
      };
    });

    return this.openPromise;
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.openPromise = null;
    }
  }

  /**
   * 执行事务
   */
  private async transaction<T>(
    mode: IDBTransactionMode,
    callback: (store: IDBObjectStore) => Promise<T>
  ): Promise<T> {
    const db = await this.open();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.config.storeName, mode);
      const store = transaction.objectStore(this.config.storeName);

      transaction.oncomplete = () => resolve(result);
      transaction.onerror = () => reject(new Error(`Transaction failed - ${transaction.error?.message}`));
      transaction.onabort = () => reject(new Error('Transaction aborted'));

      let result: T;
      
      Promise.resolve(callback(store))
        .then(res => {
          result = res;
        })
        .catch(reject);
    });
  }

  /**
   * 设置值
   * @param key - 键名 (如果配置了 keyPath，则使用记录中的字段)
   * @param value - 值
   * @returns 操作结果
   */
  async set(key: StorageKey, value: any): Promise<IDBValidKey> {
    return this.transaction('readwrite', async (store) => {
      return new Promise((resolve, reject) => {
        const item = this.config.keyPath 
          ? { ...value, [this.config.keyPath!]: key }
          : value;
        
        const request = store.put(item, this.config.keyPath ? undefined : key);
        
        request.onsuccess = () => resolve(request.result as IDBValidKey);
        request.onerror = () => reject(new Error(`Failed to set item - ${request.error?.message}`));
      });
    });
  }

  /**
   * 获取值
   * @param key - 键名
   * @param defaultValue - 默认值
   * @returns 值
   */
  async get<T = any>(key: StorageKey, defaultValue?: T): Promise<T | null> {
    try {
      return await this.transaction('readonly', async (store) => {
        return new Promise((resolve) => {
          const request = store.get(key);
          
          request.onsuccess = () => {
            resolve(request.result ?? defaultValue ?? null);
          };
          
          request.onerror = () => {
            resolve(defaultValue ?? null);
          };
        });
      });
    } catch (error) {
      return defaultValue ?? null;
    }
  }

  /**
   * 删除值
   * @param key - 键名
   */
  async remove(key: StorageKey): Promise<void> {
    return this.transaction('readwrite', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.delete(key);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to remove item - ${request.error?.message}`));
      });
    });
  }

  /**
   * 检查键是否存在
   * @param key - 键名
   * @returns 是否存在
   */
  async has(key: StorageKey): Promise<boolean> {
    try {
      return await this.transaction('readonly', async (store) => {
        return new Promise((resolve) => {
          const request = store.getKey(key);
          
          request.onsuccess = () => {
            resolve(request.result !== undefined);
          };
          
          request.onerror = () => {
            resolve(false);
          };
        });
      });
    } catch (error) {
      return false;
    }
  }

  /**
   * 清空存储对象
   */
  async clear(): Promise<void> {
    return this.transaction('readwrite', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.clear();
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(new Error(`Failed to clear - ${request.error?.message}`));
      });
    });
  }

  /**
   * 获取所有键
   * @returns 键数组
   */
  async keys(): Promise<IDBValidKey[]> {
    return this.transaction('readonly', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAllKeys();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to get keys - ${request.error?.message}`));
      });
    });
  }

  /**
   * 获取所有值
   * @returns 值数组
   */
  async values<T = any>(): Promise<T[]> {
    return this.transaction('readonly', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result as T[]);
        request.onerror = () => reject(new Error(`Failed to get values - ${request.error?.message}`));
      });
    });
  }

  /**
   * 获取所有键值对
   * @returns 键值对数组
   */
  async entries<T = any>(): Promise<[IDBValidKey, T][]> {
    return this.transaction('readonly', async (store) => {
      return new Promise((resolve, reject) => {
        const keysRequest = store.getAllKeys();
        const valuesRequest = store.getAll();
        
        keysRequest.onsuccess = () => {
          valuesRequest.onsuccess = () => {
            const keys = keysRequest.result;
            const values = valuesRequest.result as T[];
            const entries: [IDBValidKey, T][] = keys.map((key, index) => [key, values[index]]);
            resolve(entries);
          };
        };
        
        keysRequest.onerror = () => reject(new Error(`Failed to get entries - ${keysRequest.error?.message}`));
      });
    });
  }

  /**
   * 获取存储项数量
   * @returns 数量
   */
  async count(): Promise<number> {
    return this.transaction('readonly', async (store) => {
      return new Promise((resolve, reject) => {
        const request = store.count();
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error(`Failed to count - ${request.error?.message}`));
      });
    });
  }

  /**
   * 查询 (支持索引和范围)
   * @param query - 查询条件
   * @returns 查询结果
   */
  async query<T = any>(query: IDBQuery = {}): Promise<T[]> {
    return this.transaction('readonly', async (store) => {
      return new Promise((resolve, reject) => {
        let source: IDBObjectStore | IDBIndex = store;
        
        // 使用索引
        if (query.indexName) {
          const index = store.index(query.indexName);
          if (!index) {
            reject(new Error(`Index "${query.indexName}" not found`));
            return;
          }
          source = index;
        }

        // 打开游标
        const request = source.openCursor(
          query.range,
          query.direction as IDBCursorDirection
        );

        const results: T[] = [];
        let count = 0;
        let skipped = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          
          if (!cursor) {
            resolve(results);
            return;
          }

          // 跳过
          if (query.offset && skipped < query.offset) {
            skipped++;
            cursor.continue();
            return;
          }

          // 限制
          if (query.limit && count >= query.limit) {
            resolve(results);
            return;
          }

          results.push(cursor.value as T);
          count++;
          cursor.continue();
        };

        request.onerror = () => {
          reject(new Error(`Query failed - ${request.error?.message}`));
        };
      });
    });
  }

  /**
   * 批量设置
   * @param items - 键值对数组
   * @returns 操作结果
   */
  async setMany(items: Array<{ key: StorageKey; value: any }>): Promise<void> {
    return this.transaction('readwrite', async (store) => {
      return new Promise((resolve, reject) => {
        let completed = 0;
        let failed = false;

        items.forEach(({ key, value }) => {
          if (failed) return;

          const item = this.config.keyPath 
            ? { ...value, [this.config.keyPath!]: key }
            : value;
          
          const request = store.put(item, this.config.keyPath ? undefined : key);
          
          request.onsuccess = () => {
            completed++;
            if (completed === items.length) {
              resolve();
            }
          };
          
          request.onerror = () => {
            if (!failed) {
              failed = true;
              reject(new Error(`Failed to set item "${key}" - ${request.error?.message}`));
            }
          };
        });

        if (items.length === 0) {
          resolve();
        }
      });
    });
  }

  /**
   * 批量删除
   * @param keys - 键数组
   * @returns 操作结果
   */
  async removeMany(keys: StorageKey[]): Promise<void> {
    return this.transaction('readwrite', async (store) => {
      return new Promise((resolve, reject) => {
        let completed = 0;
        let failed = false;

        keys.forEach(key => {
          if (failed) return;

          const request = store.delete(key);
          
          request.onsuccess = () => {
            completed++;
            if (completed === keys.length) {
              resolve();
            }
          };
          
          request.onerror = () => {
            if (!failed) {
              failed = true;
              reject(new Error(`Failed to remove key "${key}" - ${request.error?.message}`));
            }
          };
        });

        if (keys.length === 0) {
          resolve();
        }
      });
    });
  }
}

// ==================== 快捷工厂函数 ====================

/**
 * 创建 localStorage 管理器
 * @param prefix - 键名前缀
 * @param options - 选项
 * @returns LocalStorageManager 实例
 */
export function createLocalStorage(prefix: string = '', options?: {
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}): LocalStorageManager {
  return new LocalStorageManager(prefix, options);
}

/**
 * 创建 sessionStorage 管理器
 * @param prefix - 键名前缀
 * @param options - 选项
 * @returns SessionStorageManager 实例
 */
export function createSessionStorage(prefix: string = '', options?: {
  serialize?: (value: any) => string;
  deserialize?: (value: string) => any;
}): SessionStorageManager {
  return new SessionStorageManager(prefix, options);
}

/**
 * 创建 IndexedDB 管理器
 * @param config - 配置
 * @returns IndexedDBManager 实例
 */
export function createIndexedDB(config: IDBConfig): IndexedDBManager {
  return new IndexedDBManager(config);
}

// ==================== 统一存储管理器 ====================

/**
 * 统一存储管理器 (自动选择最佳存储方式)
 */
export class StorageManager {
  private localStorage: LocalStorageManager;
  private sessionStorage: SessionStorageManager;
  private indexedDB: IndexedDBManager | null = null;

  /**
   * 创建统一存储管理器
   * @param prefix - 键名前缀
   * @param idbConfig - IndexedDB 配置 (可选)
   */
  constructor(prefix: string = '', idbConfig?: IDBConfig) {
    this.localStorage = new LocalStorageManager(prefix);
    this.sessionStorage = new SessionStorageManager(prefix);
    
    if (idbConfig) {
      this.indexedDB = new IndexedDBManager(idbConfig);
    }
  }

  /**
   * 获取 localStorage 管理器
   */
  get local(): LocalStorageManager {
    return this.localStorage;
  }

  /**
   * 获取 sessionStorage 管理器
   */
  get session(): SessionStorageManager {
    return this.sessionStorage;
  }

  /**
   * 获取 IndexedDB 管理器
   */
  get db(): IndexedDBManager | null {
    return this.indexedDB;
  }

  /**
   * 智能存储 (根据数据大小自动选择存储方式)
   * @param key - 键名
   * @param value - 值
   * @param options - 选项
   */
  async smartSet(key: StorageKey, value: StorageValue, options?: StorageOptions & { persistent?: boolean }): Promise<void> {
    const isPersistent = options?.persistent ?? true;
    const estimatedSize = JSON.stringify(value).length;

    // 大数据使用 IndexedDB
    if (this.indexedDB && estimatedSize > 1024 * 1024) { // 1MB
      await this.indexedDB.set(key, value);
      return;
    }

    // 持久化数据使用 localStorage
    if (isPersistent) {
      this.localStorage.set(key, value, options);
    } else {
      this.sessionStorage.set(key, value, options);
    }
  }

  /**
   * 智能获取
   * @param key - 键名
   * @param defaultValue - 默认值
   * @returns 值
   */
  async smartGet<T = StorageValue>(key: StorageKey, defaultValue?: T): Promise<T | null> {
    // 先尝试 localStorage
    const localValue = this.localStorage.get<T>(key);
    if (localValue !== null) {
      return localValue;
    }

    // 再尝试 sessionStorage
    const sessionValue = this.sessionStorage.get<T>(key);
    if (sessionValue !== null) {
      return sessionValue;
    }

    // 最后尝试 IndexedDB
    if (this.indexedDB) {
      const dbValue = await this.indexedDB.get<T>(key);
      if (dbValue !== null) {
        return dbValue;
      }
    }

    return defaultValue ?? null;
  }

  /**
   * 智能删除
   * @param key - 键名
   */
  async smartRemove(key: StorageKey): Promise<void> {
    this.localStorage.remove(key);
    this.sessionStorage.remove(key);
    
    if (this.indexedDB) {
      await this.indexedDB.remove(key);
    }
  }
}

// ==================== 导出 ====================

export const StorageManagerUtils = {
  // 类
  LocalStorageManager,
  SessionStorageManager,
  IndexedDBManager,
  StorageManager,
  
  // 工厂函数
  createLocalStorage,
  createSessionStorage,
  createIndexedDB,
};

export default StorageManagerUtils;
