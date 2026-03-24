/**
 * 代理模式专业版 - 使用示例
 * 
 * 本文件展示各种实际场景下的代理模式应用
 */

import {
  createAccessProxy,
  createLazyProxy,
  createCacheProxy,
  createLoggingProxy,
  createSmartProxy,
  ProxyRegistry,
  type AccessControlPolicy,
  type CacheConfig,
  type LoggingConfig,
} from './proxy-pattern-pro-skill';

// ============================================
// 场景 1: API 网关访问控制
// ============================================

/**
 * 模拟 API 服务
 */
class APIGateway {
  async getUserProfile(userId: string): Promise<any> {
    console.log(`[API] Fetching profile for ${userId}`);
    return { id: userId, name: 'John', email: 'john@example.com' };
  }

  async deleteUser(userId: string): Promise<void> {
    console.log(`[API] Deleting user ${userId}`);
  }

  async getAnalytics(dateRange: { start: string; end: string }): Promise<any> {
    console.log(`[API] Fetching analytics for ${dateRange.start} to ${dateRange.end}`);
    return { views: 1000, clicks: 50 };
  }
}

/**
 * 示例 1.1: 基于角色的访问控制
 */
export async function exampleRoleBasedAccess() {
  const policies: AccessControlPolicy[] = [
    {
      name: 'admin-required',
      description: 'Only admins can delete users',
      allowedRoles: ['admin'],
    },
  ];

  const secureGateway = createAccessProxy(
    new APIGateway(),
    'api-gateway',
    policies
  );

  // 管理员访问 - 成功
  try {
    await secureGateway.getTarget({
      userId: 'admin-1',
      userRole: 'admin',
      accessTime: new Date(),
    });
    console.log('✓ Admin access granted');
  } catch (error) {
    console.log('✗ Admin access denied:', error.message);
  }

  // 普通用户访问 - 失败
  try {
    await secureGateway.getTarget({
      userId: 'user-1',
      userRole: 'user',
      accessTime: new Date(),
    });
    console.log('✓ User access granted');
  } catch (error) {
    console.log('✗ User access denied:', error.message);
  }
}

/**
 * 示例 1.2: 时间窗口访问控制
 */
export async function exampleTimeWindowAccess() {
  const policies: AccessControlPolicy[] = [
    {
      name: 'business-hours',
      description: 'Only during business hours (9AM-6PM)',
      timeWindowStart: '09:00:00',
      timeWindowEnd: '18:00:00',
    },
  ];

  const timeRestrictedAPI = createAccessProxy(
    new APIGateway(),
    'time-restricted-api',
    policies
  );

  // 工作时间访问
  const businessTime = new Date();
  businessTime.setHours(10, 0, 0);

  try {
    await timeRestrictedAPI.getTarget({
      userId: 'user-1',
      accessTime: businessTime,
    });
    console.log('✓ Business hours access granted');
  } catch (error) {
    console.log('✗ Business hours access denied:', error.message);
  }

  // 非工作时间访问
  const afterHoursTime = new Date();
  afterHoursTime.setHours(20, 0, 0);

  try {
    await timeRestrictedAPI.getTarget({
      userId: 'user-1',
      accessTime: afterHoursTime,
    });
    console.log('✓ After hours access granted');
  } catch (error) {
    console.log('✗ After hours access denied:', error.message);
  }
}

/**
 * 示例 1.3: 速率限制
 */
export async function exampleRateLimiting() {
  const policies: AccessControlPolicy[] = [
    {
      name: 'rate-limit',
      description: 'Max 5 requests per day',
      maxAccessCount: 5,
    },
  ];

  const rateLimitedAPI = createAccessProxy(
    new APIGateway(),
    'rate-limited-api',
    policies
  );

  // 模拟多次访问
  for (let i = 1; i <= 7; i++) {
    try {
      await rateLimitedAPI.getTarget({
        userId: 'user-1',
        accessTime: new Date(),
      });
      console.log(`✓ Request ${i} granted`);
    } catch (error) {
      console.log(`✗ Request ${i} denied:`, error.message);
    }
  }

  // 查看访问日志
  const logs = rateLimitedAPI.getAccessLog();
  console.log('Total access attempts:', logs.length);
}

// ============================================
// 场景 2: 重型资源延迟加载
// ============================================

/**
 * 模拟重型配置加载 (需要读取文件、解析 JSON、验证等)
 */
async function loadApplicationConfig(): Promise<Record<string, any>> {
  console.log('[Config] Starting heavy configuration load...');
  
  // 模拟文件读取
  await new Promise(resolve => setTimeout(resolve, 1000));
  console.log('[Config] Reading configuration files...');
  
  // 模拟解析
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('[Config] Parsing configuration...');
  
  // 模拟验证
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('[Config] Validating configuration...');
  
  return {
    database: {
      host: 'localhost',
      port: 5432,
      credentials: { username: 'admin', password: 'secret' },
    },
    cache: {
      redis: { host: 'localhost', port: 6379 },
      ttl: 300000,
    },
    features: {
      enableNewUI: true,
      enableBetaFeatures: false,
    },
    // ... 更多配置
  };
}

/**
 * 示例 2.1: 基本延迟加载
 */
export async function exampleBasicLazyLoading() {
  const lazyConfig = createLazyProxy(
    loadApplicationConfig,
    'app-config',
    {
      enabled: true,
      timeout: 5000,
      retries: 3,
      retryInterval: 1000,
    }
  );

  console.log('Config loaded?', lazyConfig.isLoaded()); // false

  // 首次访问触发加载
  const config1 = await lazyConfig.getTarget();
  console.log('Config loaded?', lazyConfig.isLoaded()); // true
  console.log('Config keys:', Object.keys(config1));

  // 后续访问立即返回
  const config2 = await lazyConfig.getTarget();
  console.log('Second access - instant return');
}

/**
 * 示例 2.2: 延迟加载失败处理
 */
export async function exampleLazyLoadingFailure() {
  const failingLoader = createLazyProxy(
    async () => {
      console.log('[Loader] Attempting to load...');
      throw new Error('Network error: Unable to fetch config');
    },
    'failing-config',
    {
      timeout: 2000,
      retries: 3,
      retryInterval: 500,
      onLoadError: (error) => {
        console.error('[Loader] Final failure:', error.message);
        // 可以触发告警、降级逻辑等
      },
    }
  );

  try {
    await failingLoader.getTarget();
  } catch (error) {
    console.log('Handled error:', error.message);
  }
}

/**
 * 示例 2.3: 条件延迟加载
 */
export async function exampleConditionalLazyLoading() {
  // 开发环境 - 不启用延迟加载
  const devConfig = createLazyProxy(
    loadApplicationConfig,
    'dev-config',
    { enabled: false }
  );

  // 生产环境 - 启用延迟加载
  const prodConfig = createLazyProxy(
    loadApplicationConfig,
    'prod-config',
    { enabled: true, timeout: 10000 }
  );

  console.log('Dev config will load immediately');
  await devConfig.getTarget();

  console.log('Prod config will load on demand');
  // 实际使用时才加载
  // await prodConfig.getTarget();
}

// ============================================
// 场景 3: API 响应缓存
// ============================================

/**
 * 模拟外部 API 服务
 */
class WeatherAPI {
  async getCurrentWeather(city: string): Promise<any> {
    console.log(`[WeatherAPI] Fetching current weather for ${city}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    return {
      city,
      temperature: 25 + Math.random() * 10,
      humidity: 60,
      timestamp: Date.now(),
    };
  }

  async getForecast(city: string, days: number): Promise<any[]> {
    console.log(`[WeatherAPI] Fetching ${days}-day forecast for ${city}`);
    await new Promise(resolve => setTimeout(resolve, 1200));
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
      temperature: 20 + Math.random() * 15,
      condition: ['sunny', 'cloudy', 'rainy'][Math.floor(Math.random() * 3)],
    }));
  }
}

/**
 * 示例 3.1: 基本缓存
 */
export async function exampleBasicCaching() {
  const cachedWeather = createCacheProxy(
    new WeatherAPI(),
    'weather-api',
    {
      ttl: 60000, // 1 分钟缓存
      strategy: 'lru',
    }
  );

  // 首次调用 - 实际请求
  console.log('=== First call ===');
  const weather1 = await cachedWeather.execute('getCurrentWeather', 'Beijing');
  console.log('Weather:', weather1);

  // 第二次调用 - 缓存命中
  console.log('\n=== Second call (cached) ===');
  const weather2 = await cachedWeather.execute('getCurrentWeather', 'Beijing');
  console.log('Weather:', weather2);

  // 查看缓存统计
  const stats = cachedWeather.getStats();
  console.log('\nCache stats:', stats);
}

/**
 * 示例 3.2: 自定义缓存键
 */
export async function exampleCustomCacheKey() {
  const cachedWeather = createCacheProxy(
    new WeatherAPI(),
    'weather-api-custom',
    {
      ttl: 300000,
      keyGenerator: (method, ...args) => {
        // 自定义键生成逻辑
        return `${method}:${args.join('-')}`;
      },
    }
  );

  await cachedWeather.execute('getCurrentWeather', 'Shanghai');
  await cachedWeather.execute('getCurrentWeather', 'Shanghai'); // 缓存命中

  const stats = cachedWeather.getStats();
  console.log('Cache stats:', stats);
}

/**
 * 示例 3.3: 缓存失效策略
 */
export async function exampleCacheEviction() {
  const cachedWeather = createCacheProxy(
    new WeatherAPI(),
    'weather-api-limited',
    {
      ttl: 60000,
      maxEntries: 3, // 最多缓存 3 个城市
      strategy: 'lru',
    }
  );

  // 访问 4 个不同城市
  const cities = ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen'];
  
  for (const city of cities) {
    console.log(`\n=== Fetching ${city} ===`);
    await cachedWeather.execute('getCurrentWeather', city);
    const stats = cachedWeather.getStats();
    console.log('Cache size:', stats.size);
  }

  // 缓存大小应该保持在 3
  const finalStats = cachedWeather.getStats();
  console.log('\nFinal cache size:', finalStats.size); // 应该是 3
}

/**
 * 示例 3.4: 手动缓存控制
 */
export async function exampleManualCacheControl() {
  const cachedWeather = createCacheProxy(
    new WeatherAPI(),
    'weather-api-manual',
    { ttl: 3600000 }
  );

  // 获取数据
  await cachedWeather.execute('getCurrentWeather', 'Beijing');
  
  // 查看缓存
  console.log('Cache size:', cachedWeather.getStats().size);

  // 手动失效特定缓存
  cachedWeather.invalidate('getCurrentWeather:["Beijing"]');
  console.log('After invalidation:', cachedWeather.getStats().size);

  // 清空所有缓存
  await cachedWeather.execute('getCurrentWeather', 'Beijing');
  cachedWeather.clearCache();
  console.log('After clear:', cachedWeather.getStats().size);
}

// ============================================
// 场景 4: 操作审计日志
// ============================================

/**
 * 模拟金融服务
 */
class BankingService {
  async transfer(from: string, to: string, amount: number): Promise<boolean> {
    console.log(`[Bank] Transferring ${amount} from ${from} to ${to}`);
    if (amount <= 0) throw new Error('Invalid amount');
    return true;
  }

  async getBalance(account: string): Promise<number> {
    console.log(`[Bank] Getting balance for ${account}`);
    return 10000;
  }

  async closeAccount(account: string): Promise<void> {
    console.log(`[Bank] Closing account ${account}`);
  }
}

/**
 * 示例 4.1: 完整审计日志
 */
export async function exampleFullAuditLog() {
  const loggedBanking = createLoggingProxy(
    new BankingService(),
    'banking-audit',
    {
      logMethodCalls: true,
      logParameters: true,
      logReturnValues: true,
      logErrors: true,
      level: 'debug',
    }
  );

  // 执行操作
  await loggedBanking.execute('getBalance', 'ACC001');
  await loggedBanking.execute('transfer', 'ACC001', 'ACC002', 500);
  
  try {
    await loggedBanking.execute('transfer', 'ACC001', 'ACC002', -100);
  } catch (error) {
    console.log('Error caught:', error.message);
  }

  // 查看审计日志
  const logs = loggedBanking.getLogs();
  console.log('\n=== Audit Logs ===');
  logs.forEach(log => {
    console.log(`[${log.timestamp.toISOString()}] ${log.method}`);
    console.log(`  Duration: ${log.duration}ms`);
    if (log.args) console.log(`  Args:`, log.args);
    if (log.result !== undefined) console.log(`  Result:`, log.result);
    if (log.error) console.log(`  Error:`, log.error.message);
  });
}

/**
 * 示例 4.2: 自定义日志处理器
 */
export async function exampleCustomLogger() {
  const auditLogs: any[] = [];

  const loggedBanking = createLoggingProxy(
    new BankingService(),
    'banking-custom-log',
    {
      logMethodCalls: true,
      logErrors: true,
      logger: (message, level, metadata) => {
        // 自定义日志处理 - 例如发送到日志服务
        auditLogs.push({
          timestamp: new Date(),
          level,
          message,
          metadata,
        });
      },
    }
  );

  await loggedBanking.execute('getBalance', 'ACC001');
  await loggedBanking.execute('transfer', 'ACC001', 'ACC002', 1000);

  console.log('Custom audit logs:', auditLogs);
}

// ============================================
// 场景 5: 智能代理组合
// ============================================

/**
 * 模拟用户管理服务
 */
class UserManagementService {
  async getUser(userId: string): Promise<any> {
    console.log(`[UserService] Fetching user ${userId}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { id: userId, name: 'User', email: 'user@example.com' };
  }

  async updateUser(userId: string, data: any): Promise<void> {
    console.log(`[UserService] Updating user ${userId}`, data);
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  async deleteUser(userId: string): Promise<void> {
    console.log(`[UserService] Deleting user ${userId}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  async listUsers(page: number, limit: number): Promise<any[]> {
    console.log(`[UserService] Listing users page ${page}, limit ${limit}`);
    await new Promise(resolve => setTimeout(resolve, 400));
    return Array.from({ length: limit }, (_, i) => ({
      id: `user-${page * limit + i}`,
      name: `User ${i}`,
    }));
  }
}

/**
 * 示例 5.1: 完整的智能代理
 */
export async function exampleFullSmartProxy() {
  const smartUserService = createSmartProxy(
    () => new UserManagementService(),
    'user-service-smart'
  )
    .withAccessControl([
      {
        name: 'auth-required',
        allowedRoles: ['user', 'admin'],
      },
      {
        name: 'admin-only-delete',
        description: 'Only admins can delete users',
        allowedRoles: ['admin'],
        customValidator: async (context) => {
          // 删除操作需要 admin
          if (context.operation === 'deleteUser') {
            return context.userRole === 'admin';
          }
          return true;
        },
      },
    ])
    .withCache({
      ttl: 300000, // 5 分钟
      strategy: 'lru',
    })
    .withLogging({
      logMethodCalls: true,
      logErrors: true,
      level: 'info',
    });

  // 用户查询 (带缓存)
  console.log('=== Get User (First call) ===');
  const user1 = await smartUserService.execute('getUser', 'user-123');
  console.log('User:', user1);

  console.log('\n=== Get User (Cached) ===');
  const user2 = await smartUserService.execute('getUser', 'user-123');
  console.log('User:', user2);

  // 用户更新 (会失效缓存)
  console.log('\n=== Update User ===');
  await smartUserService.execute('updateUser', 'user-123', { name: 'New Name' });

  // 查看日志
  // const logs = smartUserService.getLogs();
  // console.log('Operation logs:', logs);
}

/**
 * 示例 5.2: 代理注册与管理
 */
export async function exampleProxyRegistry() {
  const registry = ProxyRegistry.getInstance();

  // 注册多个服务代理
  const userService = createSmartProxy(
    () => new UserManagementService(),
    'user-service'
  ).withCache({ ttl: 300000 });

  const weatherService = createCacheProxy(
    new WeatherAPI(),
    'weather-service',
    { ttl: 60000 }
  );

  registry.register(userService, {
    id: 'svc-user',
    type: 'smart',
    tags: ['user', 'core'],
  });

  registry.register(weatherService, {
    id: 'svc-weather',
    type: 'cache',
    tags: ['weather', 'external'],
  });

  // 查找服务
  const coreServices = registry.find({ tags: ['core'] });
  console.log('Core services:', coreServices.map(s => s.name));

  // 获取服务
  const retrievedUserSvc = registry.get<UserManagementService>('svc-user');
  console.log('Retrieved service:', retrievedUserSvc?.name);

  // 列出所有服务
  const allServices = registry.list();
  console.log('All services:', allServices.map(s => s.name));

  // 清理
  registry.clear();
}

// ============================================
// 运行示例
// ============================================

/**
 * 运行所有示例
 */
export async function runAllExamples() {
  console.log('=== 代理模式专业版 - 使用示例 ===\n');

  console.log('--- 场景 1: API 网关访问控制 ---');
  await exampleRoleBasedAccess();
  await exampleTimeWindowAccess();
  await exampleRateLimiting();

  console.log('\n--- 场景 2: 重型资源延迟加载 ---');
  await exampleBasicLazyLoading();
  await exampleLazyLoadingFailure();
  await exampleConditionalLazyLoading();

  console.log('\n--- 场景 3: API 响应缓存 ---');
  await exampleBasicCaching();
  await exampleCustomCacheKey();
  await exampleCacheEviction();
  await exampleManualCacheControl();

  console.log('\n--- 场景 4: 操作审计日志 ---');
  await exampleFullAuditLog();
  await exampleCustomLogger();

  console.log('\n--- 场景 5: 智能代理组合 ---');
  await exampleFullSmartProxy();
  await exampleProxyRegistry();

  console.log('\n=== 所有示例完成 ===');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples().catch(console.error);
}
