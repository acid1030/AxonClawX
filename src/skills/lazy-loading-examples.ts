/**
 * 懒加载技能使用示例 - KAEL
 * 
 * 本文件展示 lazy-loading-skill.ts 的各种实际应用场景
 */

import {
  LoadingState,
  LoadingStateManager,
  LazyProxy,
  VirtualProxy,
  LazyLoadFactory,
  ILazyProxy,
  IVirtualProxy,
  LoadingStatus,
  LazyLoadConfig
} from './lazy-loading-skill';

// ============================================
// 场景 1: 懒加载大型图片/资源
// ============================================

/**
 * 图片懒加载器
 * 只在图片进入视口时才加载
 */
class ImageLazyLoader {
  private proxy: LazyProxy<HTMLImageElement>;

  constructor(imageUrl: string) {
    this.proxy = new LazyProxy({
      loader: async () => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = imageUrl;
        });
      },
      timeout: 10000,
      retries: 2,
      onStateChange: (status) => {
        this.onStatusChange(status);
      }
    });
  }

  private onStatusChange(status: LoadingStatus) {
    switch (status.state) {
      case LoadingState.LOADING:
        console.log('🖼️  图片加载中...');
        break;
      case LoadingState.SUCCESS:
        console.log('✅ 图片加载成功');
        break;
      case LoadingState.ERROR:
        console.log('❌ 图片加载失败:', status.error);
        break;
    }
  }

  async getImage(): Promise<HTMLImageElement> {
    return this.proxy.getValue();
  }

  getStatus(): LoadingStatus {
    return this.proxy.getStatus();
  }
}

// 使用示例
async function exampleImageLoading() {
  const imageLoader = new ImageLazyLoader('https://example.com/heavy-image.jpg');
  
  // 只有在需要显示时才加载
  const img = await imageLoader.getImage();
  document.body.appendChild(img);
}

// ============================================
// 场景 2: 懒加载 API 数据
// ============================================

/**
 * API 数据懒加载器
 * 带缓存和重试机制
 */
class ApiDataLoader<T> {
  private proxy: LazyProxy<T>;
  private url: string;

  constructor(url: string, options?: Partial<LazyLoadConfig<T>>) {
    this.url = url;
    this.proxy = new LazyProxy({
      loader: async () => {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      },
      timeout: 8000,
      retries: 3,
      retryDelay: 1000,
      ...options
    });
  }

  async getData(): Promise<T> {
    return this.proxy.getValue();
  }

  refresh(): void {
    this.proxy.reset();
  }

  getStatus(): LoadingStatus {
    return this.proxy.getStatus();
  }
}

// 使用示例
async function exampleApiLoading() {
  interface UserData {
    id: number;
    name: string;
    email: string;
  }

  const userLoader = new ApiDataLoader<UserData>('https://api.example.com/users/1', {
    onStateChange: (status) => {
      if (status.state === LoadingState.LOADING) {
        console.log('⏳ 正在获取用户数据...');
      } else if (status.state === LoadingState.SUCCESS) {
        console.log('✅ 用户数据已加载');
      }
    }
  });

  const user = await userLoader.getData();
  console.log('用户:', user);

  // 刷新数据
  userLoader.refresh();
  const freshUser = await userLoader.getData();
  console.log('最新用户:', freshUser);
}

// ============================================
// 场景 3: 虚拟代理 - 延迟初始化重型对象
// ============================================

/**
 * 数据库连接虚拟代理
 * 只在真正需要查询时才建立连接
 */
class DatabaseConnection {
  constructor() {
    console.log('🔌 建立数据库连接 (耗时操作)');
    // 模拟重型初始化
    this.initialize();
  }

  private initialize() {
    // 模拟连接初始化
  }

  query(sql: string) {
    console.log('执行 SQL:', sql);
    return { rows: [] };
  }

  close() {
    console.log('关闭数据库连接');
  }

  destroy() {
    this.close();
  }
}

function exampleDatabaseProxy() {
  // 创建虚拟代理
  const dbProxy = new VirtualProxy<DatabaseConnection>({
    factory: () => new DatabaseConnection(),
    accessCheck: () => {
      // 检查是否有数据库访问权限
      const hasPermission = true; // 实际应用中检查用户权限
      if (!hasPermission) {
        console.log('❌ 无数据库访问权限');
      }
      return hasPermission;
    },
    onAccess: (instance) => {
      console.log('📊 访问数据库实例');
    },
    cache: true
  });

  console.log('代理已创建，连接未建立');
  console.log('已初始化:', dbProxy.isInitialized()); // false

  // 第一次查询时才会建立连接
  const db = dbProxy.getInstance();
  console.log('已初始化:', dbProxy.isInitialized()); // true

  const result = db.query('SELECT * FROM users');
  console.log('查询结果:', result);

  // 使用完毕后销毁
  // dbProxy.destroy();
}

// ============================================
// 场景 4: 虚拟代理方法自动代理
// ============================================

function exampleMethodProxy() {
  class ExpensiveService {
    constructor() {
      console.log('⚡ 初始化昂贵服务');
    }

    processData(data: any) {
      console.log('处理数据:', data);
      return { processed: true };
    }

    getStatus() {
      return { status: 'ok', uptime: 1000 };
    }
  }

  // 创建方法代理 - 自动代理所有方法调用
  const serviceProxy = VirtualProxy.createMethodProxy(
    () => new ExpensiveService(),
    {
      onAccess: (instance) => {
        console.log('访问服务实例');
      }
    }
  );

  console.log('服务代理已创建');

  // 调用方法时自动初始化
  const result = serviceProxy.processData({ id: 1 });
  console.log('处理结果:', result);

  const status = serviceProxy.getStatus();
  console.log('服务状态:', status);
}

// ============================================
// 场景 5: 懒加载工厂 - 批量管理资源
// ============================================

async function exampleResourceFactory() {
  const factory = new LazyLoadFactory();

  // 注册多个资源
  factory.create('appConfig', {
    loader: async () => {
      const response = await fetch('/api/config');
      return response.json();
    },
    immediate: false // 不立即加载
  });

  factory.create('userProfile', {
    loader: async () => {
      const response = await fetch('/api/profile');
      return response.json();
    },
    timeout: 5000
  });

  factory.create('permissions', {
    loader: async () => {
      const response = await fetch('/api/permissions');
      return response.json();
    },
    retries: 3
  });

  // 检查加载状态
  console.log('配置已加载:', factory.isLoaded('appConfig'));

  // 预加载关键资源
  console.log('开始预加载...');
  await factory.preloadAll();
  console.log('所有资源已加载');

  // 获取所有状态
  const allStatuses = factory.getAllStatuses();
  console.log('资源状态:', allStatuses);

  // 按需获取资源
  const configProxy = factory.get('appConfig');
  const config = await configProxy!.getValue();
  console.log('应用配置:', config);

  // 重置特定资源
  factory.reset('userProfile');

  // 清理所有资源
  // factory.cleanup();
}

// ============================================
// 场景 6: 状态管理器独立使用
// ============================================

function exampleStateManager() {
  const stateManager = new LoadingStateManager();

  // 注册状态变化监听
  const unsubscribe = stateManager.onStateChange((status) => {
    console.log('状态变化:', status);
  });

  // 开始加载
  stateManager.setLoading(0);

  // 模拟进度更新
  setTimeout(() => stateManager.setLoading(30), 500);
  setTimeout(() => stateManager.setLoading(60), 1000);
  setTimeout(() => stateManager.setLoading(90), 1500);
  setTimeout(() => stateManager.setSuccess(), 2000);

  // 获取当前状态
  console.log('当前状态:', stateManager.getStatus());
  console.log('是否正在加载:', stateManager.isLoading());
  console.log('是否已加载:', stateManager.isLoaded());
  console.log('加载耗时:', stateManager.getLoadDuration());

  // 取消监听
  // unsubscribe();
}

// ============================================
// 场景 7: React 组件集成示例
// ============================================

/**
 * React Hook 示例 (伪代码，展示集成思路)
 * 
 * import { useLazyLoad } from './hooks/useLazyLoad';
 * 
 * function ImageComponent({ src }) {
 *   const { data, loading, error, reload } = useLazyLoad(
 *     async () => {
 *       const response = await fetch(src);
 *       return response.blob();
 *     },
 *     { retries: 2 }
 *   );
 * 
 *   if (loading) return <div>加载中...</div>;
 *   if (error) return <div>加载失败：{error}</div>;
 *   return <img src={URL.createObjectURL(data)} />;
 * }
 */

// ============================================
// 场景 8: 错误处理和重试
// ============================================

async function exampleErrorHandling() {
  let attemptCount = 0;

  const loader = new LazyProxy({
    loader: async () => {
      attemptCount++;
      console.log(`尝试加载 (第 ${attemptCount} 次)`);

      // 模拟前两次失败，第三次成功
      if (attemptCount < 3) {
        throw new Error('网络错误');
      }

      return { success: true };
    },
    retries: 3,
    retryDelay: 1000,
    timeout: 10000,
    onStateChange: (status) => {
      if (status.state === LoadingState.ERROR) {
        console.log('加载失败:', status.error);
      }
    }
  });

  try {
    const result = await loader.getValue();
    console.log('最终成功:', result);
  } catch (error) {
    console.error('所有重试失败:', error);
  }
}

// ============================================
// 场景 9: 取消加载
// ============================================

async function exampleCancellation() {
  const loader = new LazyProxy({
    loader: async () => {
      console.log('开始长时间加载...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      return { data: 'complete' };
    },
    timeout: 10000
  });

  // 启动加载
  const loadPromise = loader.load();

  // 2 秒后取消
  setTimeout(() => {
    console.log('取消加载');
    loader.cancel();
  }, 2000);

  try {
    const result = await loadPromise;
    console.log('结果:', result);
  } catch (error) {
    console.log('加载已取消:', (error as Error).message);
  }
}

// ============================================
// 场景 10: 条件懒加载
// ============================================

async function exampleConditionalLoading() {
  const shouldLoad = true; // 根据条件决定是否加载

  const loader = new LazyProxy({
    loader: async () => {
      console.log('加载条件性资源');
      return { data: 'conditional' };
    },
    immediate: shouldLoad // 根据条件决定是否立即加载
  });

  if (shouldLoad) {
    const data = await loader.getValue();
    console.log('条件性数据:', data);
  } else {
    console.log('跳过加载');
  }
}

// ============================================
// 运行所有示例
// ============================================

export async function runAllExamples() {
  console.log('='.repeat(50));
  console.log('懒加载技能示例集合');
  console.log('='.repeat(50));

  console.log('\n📸 示例 1: 图片懒加载');
  // await exampleImageLoading();

  console.log('\n🌐 示例 2: API 数据加载');
  // await exampleApiLoading();

  console.log('\n💾 示例 3: 数据库虚拟代理');
  // exampleDatabaseProxy();

  console.log('\n🔧 示例 4: 方法自动代理');
  // exampleMethodProxy();

  console.log('\n🏭 示例 5: 懒加载工厂');
  // await exampleResourceFactory();

  console.log('\n📊 示例 6: 状态管理器');
  // exampleStateManager();

  console.log('\n⚠️  示例 7: 错误处理和重试');
  // await exampleErrorHandling();

  console.log('\n🚫 示例 8: 取消加载');
  // await exampleCancellation();

  console.log('\n✅ 所有示例演示完毕');
}

// 导出所有示例函数
export {
  exampleImageLoading,
  exampleApiLoading,
  exampleDatabaseProxy,
  exampleMethodProxy,
  exampleResourceFactory,
  exampleStateManager,
  exampleErrorHandling,
  exampleCancellation,
  exampleConditionalLoading
};

// 默认导出
export default {
  runAllExamples,
  exampleImageLoading,
  exampleApiLoading,
  exampleDatabaseProxy,
  exampleMethodProxy,
  exampleResourceFactory,
  exampleStateManager,
  exampleErrorHandling,
  exampleCancellation,
  exampleConditionalLoading
};
