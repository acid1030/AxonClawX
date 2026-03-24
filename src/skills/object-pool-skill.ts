/**
 * Object Pool Skill for ACE
 * 
 * 对象池模式实现 - 高效对象复用机制
 * 
 * 功能:
 * 1. 对象池创建
 * 2. 对象获取/归还
 * 3. 池大小管理
 * 
 * @author Axon
 * @date 2026-03-13
 */

// ============ 类型定义 ============

/** 对象池配置 */
interface PoolConfig<T> {
  /** 池名称 */
  name: string;
  /** 初始池大小 */
  initialSize?: number;
  /** 最大池大小 */
  maxSize?: number;
  /** 最小池大小 */
  minSize?: number;
  /** 对象工厂函数 */
  factory: () => T;
  /** 对象重置函数 (可选) */
  reset?: (obj: T) => void;
  /** 对象销毁函数 (可选) */
  destroy?: (obj: T) => void;
  /** 获取对象超时时间 (ms) */
  acquireTimeout?: number;
}

/** 池化对象包装 */
interface PooledObject<T> {
  /** 实际对象 */
  value: T;
  /** 创建时间戳 */
  createdAt: number;
  /** 最后使用时间戳 */
  lastUsedAt: number;
  /** 使用次数 */
  useCount: number;
  /** 是否正在使用中 */
  inUse: boolean;
}

/** 池统计信息 */
interface PoolStats {
  /** 池名称 */
  name: string;
  /** 池中总对象数 */
  totalSize: number;
  /** 可用对象数 */
  availableSize: number;
  /** 使用中对象数 */
  inUseSize: number;
  /** 最大池大小 */
  maxSize: number;
  /** 最小池大小 */
  minSize: number;
  /** 累计获取次数 */
  totalAcquires: number;
  /** 累计归还次数 */
  totalReleases: number;
  /** 累计创建次数 */
  totalCreates: number;
  /** 累计销毁次数 */
  totalDestroys: number;
}

/** 对象池类 */
class ObjectPool<T> {
  private config: PoolConfig<T>;
  private pool: PooledObject<T>[] = [];
  private waitingQueue: Array<{
    resolve: (value: T) => void;
    reject: (reason: Error) => void;
    timeoutId?: NodeJS.Timeout;
  }> = [];
  
  // 统计信息
  private stats: PoolStats;

  constructor(config: PoolConfig<T>) {
    this.config = {
      initialSize: 10,
      maxSize: 100,
      minSize: 5,
      acquireTimeout: 5000,
      ...config,
    };

    this.stats = {
      name: this.config.name,
      totalSize: 0,
      availableSize: 0,
      inUseSize: 0,
      maxSize: this.config.maxSize!,
      minSize: this.config.minSize!,
      totalAcquires: 0,
      totalReleases: 0,
      totalCreates: 0,
      totalDestroys: 0,
    };

    // 初始化对象池
    this.initialize();
  }

  /** 初始化对象池 */
  private initialize(): void {
    const initialSize = this.config.initialSize!;
    for (let i = 0; i < initialSize; i++) {
      this.createObject();
    }
  }

  /** 创建新对象 */
  private createObject(): PooledObject<T> {
    const value = this.config.factory();
    const now = Date.now();
    
    const pooledObj: PooledObject<T> = {
      value,
      createdAt: now,
      lastUsedAt: now,
      useCount: 0,
      inUse: false,
    };

    this.stats.totalCreates++;
    return pooledObj;
  }

  /** 销毁对象 */
  private destroyObject(pooledObj: PooledObject<T>): void {
    if (this.config.destroy) {
      this.config.destroy(pooledObj.value);
    }
    this.stats.totalDestroys++;
  }

  /** 重置对象 */
  private resetObject(pooledObj: PooledObject<T>): void {
    pooledObj.inUse = false;
    pooledObj.lastUsedAt = Date.now();
    
    if (this.config.reset) {
      this.config.reset(pooledObj.value);
    }
  }

  /** 获取对象 */
  async acquire(): Promise<T> {
    this.stats.totalAcquires++;

    // 尝试从池中获取可用对象
    for (const pooledObj of this.pool) {
      if (!pooledObj.inUse) {
        pooledObj.inUse = true;
        pooledObj.useCount++;
        pooledObj.lastUsedAt = Date.now();
        this.updateStats();
        return pooledObj.value;
      }
    }

    // 如果池未满，创建新对象
    if (this.pool.length < this.config.maxSize!) {
      const pooledObj = this.createObject();
      pooledObj.inUse = true;
      pooledObj.useCount = 1;
      this.pool.push(pooledObj);
      this.updateStats();
      return pooledObj.value;
    }

    // 池已满，等待可用对象
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const index = this.waitingQueue.findIndex(w => w.resolve === resolve);
        if (index !== -1) {
          this.waitingQueue.splice(index, 1);
          reject(new Error(`ObjectPool "${this.config.name}": Acquire timeout after ${this.config.acquireTimeout}ms`));
        }
      }, this.config.acquireTimeout!);

      this.waitingQueue.push({ resolve, reject, timeoutId });
    });
  }

  /** 归还对象 */
  release(obj: T): void {
    this.stats.totalReleases++;

    const pooledObj = this.pool.find(p => p.value === obj);
    
    if (!pooledObj) {
      console.warn(`ObjectPool "${this.config.name}": Attempted to release unknown object`);
      return;
    }

    // 如果有等待者，直接交给等待者
    if (this.waitingQueue.length > 0) {
      const waiter = this.waitingQueue.shift()!;
      clearTimeout(waiter.timeoutId);
      pooledObj.inUse = true;
      pooledObj.useCount++;
      pooledObj.lastUsedAt = Date.now();
      waiter.resolve(obj);
      this.updateStats();
      return;
    }

    // 重置对象并放回池中
    this.resetObject(pooledObj);
    
    // 如果池大小超过最大值且对象使用次数为 1，销毁它
    if (this.pool.length > this.config.maxSize! && pooledObj.useCount === 1) {
      this.destroyObject(pooledObj);
      const index = this.pool.indexOf(pooledObj);
      if (index !== -1) {
        this.pool.splice(index, 1);
      }
    }
    
    this.updateStats();
  }

  /** 更新统计信息 */
  private updateStats(): void {
    this.stats.totalSize = this.pool.length;
    this.stats.availableSize = this.pool.filter(p => !p.inUse).length;
    this.stats.inUseSize = this.pool.filter(p => p.inUse).length;
  }

  /** 获取池统计信息 */
  getStats(): PoolStats {
    this.updateStats();
    return { ...this.stats };
  }

  /** 调整池大小 */
  resize(newSize: number): void {
    const clampedSize = Math.max(
      this.config.minSize!,
      Math.min(newSize, this.config.maxSize!)
    );

    if (clampedSize > this.pool.length) {
      // 需要扩容
      const needCreate = clampedSize - this.pool.length;
      for (let i = 0; i < needCreate; i++) {
        this.createObject();
        this.pool.push(this.createObject());
      }
    } else if (clampedSize < this.pool.length) {
      // 需要缩容
      const needRemove = this.pool.length - clampedSize;
      const availableObjs = this.pool.filter(p => !p.inUse);
      
      for (let i = 0; i < Math.min(needRemove, availableObjs.length); i++) {
        const obj = availableObjs[i];
        this.destroyObject(obj);
        const index = this.pool.indexOf(obj);
        if (index !== -1) {
          this.pool.splice(index, 1);
        }
      }
    }

    this.updateStats();
  }

  /** 清空对象池 */
  clear(): void {
    for (const pooledObj of this.pool) {
      this.destroyObject(pooledObj);
    }
    this.pool = [];
    this.updateStats();
  }

  /** 预热对象池 */
  warmup(count: number): void {
    const targetSize = Math.min(count, this.config.maxSize!);
    const currentSize = this.pool.length;
    
    if (targetSize > currentSize) {
      for (let i = 0; i < targetSize - currentSize; i++) {
        this.pool.push(this.createObject());
      }
    }
    
    this.updateStats();
  }

  /** 回收空闲对象 (超过指定时间未使用的对象) */
  reclaimIdleObjects(idleTimeoutMs: number): number {
    const now = Date.now();
    let reclaimedCount = 0;

    const toRemove: PooledObject<T>[] = [];
    
    for (const pooledObj of this.pool) {
      if (
        !pooledObj.inUse &&
        now - pooledObj.lastUsedAt > idleTimeoutMs &&
        this.pool.length - toRemove.length > this.config.minSize!
      ) {
        this.destroyObject(pooledObj);
        toRemove.push(pooledObj);
        reclaimedCount++;
      }
    }

    for (const obj of toRemove) {
      const index = this.pool.indexOf(obj);
      if (index !== -1) {
        this.pool.splice(index, 1);
      }
    }

    this.updateStats();
    return reclaimedCount;
  }
}

// ============ 对象池管理器 ============

/** 对象池管理器 - 管理多个对象池 */
class PoolManager {
  private pools: Map<string, ObjectPool<any>> = new Map();

  /** 创建对象池 */
  createPool<T>(config: PoolConfig<T>): ObjectPool<T> {
    if (this.pools.has(config.name)) {
      throw new Error(`Pool "${config.name}" already exists`);
    }

    const pool = new ObjectPool<T>(config);
    this.pools.set(config.name, pool);
    return pool;
  }

  /** 获取对象池 */
  getPool<T>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name) as ObjectPool<T> | undefined;
  }

  /** 删除对象池 */
  deletePool(name: string): boolean {
    const pool = this.pools.get(name);
    if (pool) {
      pool.clear();
      return this.pools.delete(name);
    }
    return false;
  }

  /** 获取所有池的统计信息 */
  getAllStats(): PoolStats[] {
    return Array.from(this.pools.values()).map(pool => pool.getStats());
  }

  /** 清空所有对象池 */
  clearAll(): void {
    for (const pool of this.pools.values()) {
      pool.clear();
    }
    this.pools.clear();
  }
}

// ============ 导出单例 ============

const poolManager = new PoolManager();

// ============ 导出函数 ============

/**
 * 创建对象池
 * @param config 池配置
 * @returns 对象池实例
 */
export function createPool<T>(config: PoolConfig<T>): ObjectPool<T> {
  return poolManager.createPool(config);
}

/**
 * 获取对象池
 * @param name 池名称
 * @returns 对象池实例
 */
export function getPool<T>(name: string): ObjectPool<T> | undefined {
  return poolManager.getPool<T>(name);
}

/**
 * 删除对象池
 * @param name 池名称
 * @returns 是否成功删除
 */
export function deletePool(name: string): boolean {
  return poolManager.deletePool(name);
}

/**
 * 获取所有池统计
 * @returns 统计信息数组
 */
export function getAllPoolStats(): PoolStats[] {
  return poolManager.getAllStats();
}

/**
 * 清空所有池
 */
export function clearAllPools(): void {
  poolManager.clearAll();
}

// ============ 使用示例 ============

/**
 * 使用示例 1: 数据库连接池
 */
export function exampleDatabasePool() {
  interface DBConnection {
    query(sql: string): Promise<any>;
    close(): void;
  }

  const dbPool = createPool<DBConnection>({
    name: 'database',
    initialSize: 5,
    maxSize: 20,
    minSize: 2,
    factory: () => {
      // 模拟创建数据库连接
      console.log('Creating new DB connection');
      return {
        query: async (sql: string) => {
          console.log(`Executing: ${sql}`);
          return { rows: [] };
        },
        close: () => console.log('Connection closed'),
      };
    },
    reset: (conn) => {
      console.log('Resetting connection');
    },
    destroy: (conn) => {
      console.log('Destroying connection');
      conn.close();
    },
    acquireTimeout: 10000,
  });

  // 使用示例
  return {
    async executeQuery(sql: string) {
      const conn = await dbPool.acquire();
      try {
        return await conn.query(sql);
      } finally {
        dbPool.release(conn);
      }
    },
    getStats: () => dbPool.getStats(),
    resize: (size: number) => dbPool.resize(size),
  };
}

/**
 * 使用示例 2: HTTP 客户端池
 */
export function exampleHttpClientPool() {
  interface HttpClient {
    get(url: string): Promise<any>;
    post(url: string, data: any): Promise<any>;
  }

  const httpPool = createPool<HttpClient>({
    name: 'http-client',
    initialSize: 10,
    maxSize: 50,
    minSize: 5,
    factory: () => {
      console.log('Creating new HTTP client');
      return {
        get: async (url: string) => {
          console.log(`GET ${url}`);
          return { status: 200, data: {} };
        },
        post: async (url: string, data: any) => {
          console.log(`POST ${url}`, data);
          return { status: 200, data: {} };
        },
      };
    },
  });

  return {
    async get(url: string) {
      const client = await httpPool.acquire();
      try {
        return await client.get(url);
      } finally {
        httpPool.release(client);
      }
    },
    async post(url: string, data: any) {
      const client = await httpPool.acquire();
      try {
        return await client.post(url, data);
      } finally {
        httpPool.release(client);
      }
    },
    getStats: () => httpPool.getStats(),
  };
}

/**
 * 使用示例 3: 游戏对象池 (子弹、敌人等)
 */
export function exampleGameObjectPool() {
  interface GameObject {
    id: number;
    x: number;
    y: number;
    active: boolean;
    update(deltaTime: number): void;
    render(): void;
  }

  let objectIdCounter = 0;

  const bulletPool = createPool<GameObject>({
    name: 'bullets',
    initialSize: 100,
    maxSize: 500,
    minSize: 50,
    factory: () => {
      return {
        id: objectIdCounter++,
        x: 0,
        y: 0,
        active: false,
        update: (deltaTime: number) => {
          // 更新子弹位置
        },
        render: () => {
          // 渲染子弹
        },
      };
    },
    reset: (bullet) => {
      bullet.x = 0;
      bullet.y = 0;
      bullet.active = false;
    },
  });

  return {
    spawnBullet(x: number, y: number): GameObject {
      const bullet = bulletPool.acquire();
      bullet.then(b => {
        b.x = x;
        b.y = y;
        b.active = true;
      });
      return bullet as any;
    },
    returnBullet(bullet: GameObject) {
      bulletPool.release(bullet);
    },
    getStats: () => bulletPool.getStats(),
    warmup: (count: number) => bulletPool.warmup(count),
  };
}

/**
 * 使用示例 4: 并发控制场景
 */
export async function exampleConcurrencyControl() {
  const workerPool = createPool<number>({
    name: 'workers',
    initialSize: 5,
    maxSize: 5,
    minSize: 5,
    factory: () => {
      const workerId = Math.random();
      console.log(`Worker ${workerId} created`);
      return workerId;
    },
  });

  // 模拟 20 个任务，但只有 5 个并发
  const tasks = Array.from({ length: 20 }, (_, i) => i);
  
  const results = await Promise.all(
    tasks.map(async (task) => {
      const worker = await workerPool.acquire();
      try {
        console.log(`Task ${task} using worker ${worker}`);
        await new Promise(resolve => setTimeout(resolve, 100));
        return { task, worker };
      } finally {
        workerPool.release(worker);
      }
    })
  );

  return {
    results,
    stats: workerPool.getStats(),
  };
}

// ============ 导出类型 ============

export type { PoolConfig, PoolStats, PooledObject };
export { ObjectPool, PoolManager };
