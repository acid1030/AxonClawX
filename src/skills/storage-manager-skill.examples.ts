/**
 * Storage Manager Skill 使用示例
 * 
 * 本文件展示如何使用 storage-manager-skill.ts 中的各种存储工具
 */

import {
  LocalStorageManager,
  SessionStorageManager,
  IndexedDBManager,
  StorageManager,
  createLocalStorage,
  createSessionStorage,
  createIndexedDB,
  type IDBConfig,
  type StorageOptions,
} from './storage-manager-skill';

// ==================== 1. LocalStorage 使用示例 ====================

/**
 * 示例 1: 基础使用
 */
function localStorageBasicExample() {
  console.log('=== LocalStorage 基础示例 ===\n');

  // 创建管理器 (带命名空间前缀)
  const storage = new LocalStorageManager('myapp');

  // 存储字符串
  storage.set('username', 'Axon');
  console.log('✓ 存储用户名：Axon');

  // 存储数字
  storage.set('age', 25);
  console.log('✓ 存储年龄：25');

  // 存储布尔值
  storage.set('isLoggedIn', true);
  console.log('✓ 存储登录状态：true');

  // 存储对象
  storage.set('user', {
    id: 1,
    name: 'Axon',
    email: 'axon@example.com',
  });
  console.log('✓ 存储用户对象');

  // 获取值
  const username = storage.get<string>('username');
  console.log(`✓ 获取用户名：${username}`);

  const user = storage.get<{ id: number; name: string; email: string }>('user');
  console.log('✓ 获取用户对象:', user);

  // 获取不存在的键 (返回 null)
  const notFound = storage.get('notExist');
  console.log(`✓ 获取不存在的键：${notFound}`);

  // 获取不存在的键 (返回默认值)
  const withDefault = storage.get('notExist', '默认值');
  console.log(`✓ 获取带默认值：${withDefault}`);

  // 检查键是否存在
  const hasUsername = storage.has('username');
  console.log(`✓ 检查 username 是否存在：${hasUsername}`);

  // 删除键
  storage.remove('age');
  console.log('✓ 删除 age');

  // 获取所有键
  const keys = storage.keys();
  console.log('✓ 所有键:', keys);

  // 获取所有值
  const values = storage.values();
  console.log('✓ 所有值:', values);

  // 获取所有键值对
  const entries = storage.entries();
  console.log('✓ 所有键值对:', entries);

  // 清空所有带前缀的键
  // storage.clear();
  // console.log('✓ 清空所有存储');
}

/**
 * 示例 2: 带过期时间的存储
 */
function localStorageWithExpiryExample() {
  console.log('\n=== LocalStorage 过期时间示例 ===\n');

  const storage = new LocalStorageManager('cache');

  // 存储 5 秒后过期的数据
  const FIVE_SECONDS = 5 * 1000;
  storage.set('tempData', { message: '5 秒后过期' }, { expiry: Date.now() + FIVE_SECONDS });
  console.log('✓ 存储 5 秒后过期的数据');

  // 立即获取 (应该存在)
  const data = storage.get('tempData');
  console.log('✓ 立即获取:', data);

  // 等待 6 秒后获取 (应该已过期)
  setTimeout(() => {
    const expiredData = storage.get('tempData');
    console.log('✓ 6 秒后获取 (已过期):', expiredData);
  }, 6000);
}

/**
 * 示例 3: 自定义序列化器
 */
function localStorageCustomSerializerExample() {
  console.log('\n=== LocalStorage 自定义序列化示例 ===\n');

  // 使用自定义序列化器 (例如处理 Date 对象)
  const storage = new LocalStorageManager('dates', {
    serialize: (value) => {
      return JSON.stringify(value, (key, val) => {
        if (val instanceof Date) {
          return { __type: 'Date', value: val.toISOString() };
        }
        return val;
      });
    },
    deserialize: (str) => {
      return JSON.parse(str, (key, val) => {
        if (val && val.__type === 'Date') {
          return new Date(val.value);
        }
        return val;
      });
    },
  });

  // 存储 Date 对象
  const now = new Date();
  storage.set('currentTime', now);
  console.log('✓ 存储 Date 对象:', now);

  // 获取 Date 对象 (会自动反序列化)
  const retrieved = storage.get<Date>('currentTime');
  console.log('✓ 获取 Date 对象:', retrieved);
  console.log('✓ 是否为 Date 实例:', retrieved instanceof Date);
}

/**
 * 示例 4: 使用工厂函数
 */
function localStorageFactoryExample() {
  console.log('\n=== LocalStorage 工厂函数示例 ===\n');

  // 使用工厂函数创建 (更简洁)
  const storage = createLocalStorage('settings');

  storage.set('theme', 'dark');
  storage.set('language', 'zh-CN');
  storage.set('fontSize', 14);

  console.log('✓ 存储设置完成');
  console.log('✓ Theme:', storage.get('theme'));
  console.log('✓ Language:', storage.get('language'));
  console.log('✓ Font Size:', storage.get('fontSize'));
}

// ==================== 2. SessionStorage 使用示例 ====================

/**
 * 示例 5: SessionStorage 基础使用
 */
function sessionStorageBasicExample() {
  console.log('\n=== SessionStorage 基础示例 ===\n');

  const storage = new SessionStorageManager('session');

  // 存储会话数据
  storage.set('sessionId', 'abc123');
  storage.set('loginTime', Date.now());
  storage.set('tempForm', {
    name: 'Axon',
    email: 'axon@example.com',
    step: 2,
  });

  console.log('✓ 存储会话数据');

  // 获取会话数据
  const sessionId = storage.get<string>('sessionId');
  console.log('✓ Session ID:', sessionId);

  const tempForm = storage.get('tempForm');
  console.log('✓ 临时表单数据:', tempForm);

  // 检查是否存在
  console.log('✓ sessionId 存在:', storage.has('sessionId'));

  // 删除
  storage.remove('tempForm');
  console.log('✓ 删除临时表单数据');

  // 获取大小
  console.log('✓ 存储项数量:', storage.size());
}

/**
 * 示例 6: SessionStorage 带过期时间
 */
function sessionStorageWithExpiryExample() {
  console.log('\n=== SessionStorage 过期时间示例 ===\n');

  const storage = createSessionStorage('auth');

  // 存储 30 分钟后过期的 token
  const THIRTY_MINUTES = 30 * 60 * 1000;
  storage.set('token', 'jwt-token-12345', { expiry: Date.now() + THIRTY_MINUTES });
  console.log('✓ 存储 30 分钟后过期的 token');

  // 获取 token
  const token = storage.get('token');
  console.log('✓ Token:', token);

  // 检查是否存在
  console.log('✓ Token 存在:', storage.has('token'));
}

// ==================== 3. IndexedDB 使用示例 ====================

/**
 * 示例 7: IndexedDB 基础使用
 */
async function indexedDBBasicExample() {
  console.log('\n=== IndexedDB 基础示例 ===\n');

  // 配置数据库
  const config: IDBConfig = {
    dbName: 'MyAppDB',
    version: 1,
    storeName: 'users',
    keyPath: 'id', // 使用记录中的 id 字段作为键
    indexes: [
      { name: 'email', keyPath: 'email', unique: true },
      { name: 'age', keyPath: 'age' },
    ],
  };

  const db = createIndexedDB(config);

  try {
    // 打开数据库
    await db.open();
    console.log('✓ 数据库已打开');

    // 存储数据
    await db.set('1', { id: '1', name: 'Axon', email: 'axon@example.com', age: 25 });
    await db.set('2', { id: '2', name: 'Nexus', email: 'nexus@example.com', age: 30 });
    await db.set('3', { id: '3', name: 'KAEL', email: 'kael@example.com', age: 28 });
    console.log('✓ 存储 3 个用户');

    // 获取数据
    const user1 = await db.get('1');
    console.log('✓ 获取用户 1:', user1);

    // 检查是否存在
    const hasUser2 = await db.has('2');
    console.log('✓ 用户 2 存在:', hasUser2);

    // 获取所有用户
    const allUsers = await db.values();
    console.log('✓ 所有用户:', allUsers);

    // 获取数量
    const count = await db.count();
    console.log('✓ 用户总数:', count);

    // 更新数据
    await db.set('1', { id: '1', name: 'Axon Updated', email: 'axon.new@example.com', age: 26 });
    const updated = await db.get('1');
    console.log('✓ 更新后的用户 1:', updated);

    // 删除数据
    await db.remove('3');
    console.log('✓ 删除用户 3');

    // 获取所有键
    const keys = await db.keys();
    console.log('✓ 所有键:', keys);

    // 清空数据库
    // await db.clear();
    // console.log('✓ 清空数据库');

    // 关闭数据库
    db.close();
    console.log('✓ 数据库已关闭');
  } catch (error) {
    console.error('✗ IndexedDB 操作失败:', error);
  }
}

/**
 * 示例 8: IndexedDB 查询示例
 */
async function indexedDBQueryExample() {
  console.log('\n=== IndexedDB 查询示例 ===\n');

  const config: IDBConfig = {
    dbName: 'ProductsDB',
    version: 1,
    storeName: 'products',
    keyPath: 'id',
    indexes: [
      { name: 'price', keyPath: 'price' },
      { name: 'category', keyPath: 'category' },
    ],
  };

  const db = createIndexedDB(config);

  try {
    await db.open();
    console.log('✓ 数据库已打开');

    // 存储产品数据
    const products = [
      { id: '1', name: 'Laptop', price: 999, category: 'Electronics' },
      { id: '2', name: 'Mouse', price: 29, category: 'Electronics' },
      { id: '3', name: 'Desk', price: 299, category: 'Furniture' },
      { id: '4', name: 'Chair', price: 199, category: 'Furniture' },
      { id: '5', name: 'Monitor', price: 399, category: 'Electronics' },
    ];

    await db.setMany(products.map(p => ({ key: p.id, value: p })));
    console.log('✓ 存储 5 个产品');

    // 查询所有
    const all = await db.query();
    console.log('✓ 所有产品:', all);

    // 使用索引查询 (按价格)
    const byPrice = await db.query({
      indexName: 'price',
      direction: 'next',
    });
    console.log('✓ 按价格排序:', byPrice);

    // 使用范围查询 (价格大于 100)
    const range = IDBKeyRange.lowerBound(100);
    const expensive = await db.query({
      indexName: 'price',
      range,
    });
    console.log('✓ 价格 > 100 的产品:', expensive);

    // 限制查询结果
    const limited = await db.query({
      limit: 2,
    });
    console.log('✓ 前 2 个产品:', limited);

    // 跳过前 2 个
    const offset = await db.query({
      offset: 2,
    });
    console.log('✓ 跳过前 2 个的产品:', offset);

    db.close();
    console.log('✓ 数据库已关闭');
  } catch (error) {
    console.error('✗ IndexedDB 查询失败:', error);
  }
}

// ==================== 4. 统一 StorageManager 使用示例 ====================

/**
 * 示例 9: 统一存储管理器
 */
async function unifiedStorageManagerExample() {
  console.log('\n=== 统一 StorageManager 示例 ===\n');

  // 创建统一管理器 (带 IndexedDB 支持)
  const storage = new StorageManager('myapp', {
    dbName: 'MyAppDB',
    storeName: 'data',
  });

  // 访问 localStorage
  storage.local.set('smallData', '这是小数据');
  console.log('✓ localStorage 存储完成');

  // 访问 sessionStorage
  storage.session.set('sessionData', '这是会话数据');
  console.log('✓ sessionStorage 存储完成');

  // 访问 IndexedDB
  if (storage.db) {
    await storage.db.set('largeData', { data: new Array(1000).fill('x') });
    console.log('✓ IndexedDB 存储完成');
  }

  // 智能存储 (自动选择最佳方式)
  await storage.smartSet('auto1', '小数据', { persistent: true });
  await storage.smartSet('auto2', { large: new Array(1000000).fill('x') }, { persistent: true });
  console.log('✓ 智能存储完成');

  // 智能获取
  const val1 = await storage.smartGet('auto1');
  console.log('✓ 智能获取 auto1:', typeof val1);

  // 智能删除
  await storage.smartRemove('auto1');
  console.log('✓ 智能删除 auto1');
}

// ==================== 5. 实际应用场景示例 ====================

/**
 * 示例 10: 用户偏好设置管理
 */
function userPreferencesExample() {
  console.log('\n=== 用户偏好设置示例 ===\n');

  const prefs = createLocalStorage('prefs');

  // 保存偏好设置
  prefs.set('theme', 'dark');
  prefs.set('language', 'zh-CN');
  prefs.set('notifications', true);
  prefs.set('fontSize', 16);
  prefs.set('sidebarCollapsed', false);

  console.log('✓ 保存偏好设置');

  // 获取偏好设置 (带默认值)
  const theme = prefs.get('theme', 'light');
  const language = prefs.get('language', 'en-US');
  const notifications = prefs.get('notifications', true);
  const fontSize = prefs.get('fontSize', 14);

  console.log('✓ 当前设置:');
  console.log(`  Theme: ${theme}`);
  console.log(`  Language: ${language}`);
  console.log(`  Notifications: ${notifications}`);
  console.log(`  Font Size: ${fontSize}`);

  // 更新单个设置
  prefs.set('theme', 'light');
  console.log('✓ 更新主题为 light');
}

/**
 * 示例 11: 购物车管理
 */
function shoppingCartExample() {
  console.log('\n=== 购物车管理示例 ===\n');

  const cart = createLocalStorage('cart');

  // 添加商品
  const cartItems = [
    { id: '1', name: '商品 A', price: 99, quantity: 2 },
    { id: '2', name: '商品 B', price: 199, quantity: 1 },
  ];
  cart.set('items', cartItems);
  cart.set('updatedAt', Date.now());

  console.log('✓ 添加商品到购物车');

  // 获取购物车
  const items = cart.get<typeof cartItems>('items');
  console.log('✓ 购物车商品:', items);

  // 计算总价
  const total = items?.reduce((sum, item) => sum + item.price * item.quantity, 0) || 0;
  console.log('✓ 总价:', total);

  // 清空购物车
  // cart.clear();
  // console.log('✓ 清空购物车');
}

/**
 * 示例 12: 表单草稿自动保存
 */
function formDraftExample() {
  console.log('\n=== 表单草稿示例 ===\n');

  const drafts = createSessionStorage('drafts');

  // 保存表单草稿 (带 1 小时过期时间)
  const ONE_HOUR = 60 * 60 * 1000;
  drafts.set(
    'article-form',
    {
      title: '我的文章标题',
      content: '文章内容...',
      tags: ['技术', '教程'],
    },
    { expiry: Date.now() + ONE_HOUR }
  );

  console.log('✓ 保存表单草稿 (1 小时后过期)');

  // 恢复草稿
  const draft = drafts.get('article-form');
  console.log('✓ 恢复草稿:', draft);

  // 提交后删除草稿
  // drafts.remove('article-form');
  // console.log('✓ 删除草稿');
}

/**
 * 示例 13: API 响应缓存
 */
async function apiCacheExample() {
  console.log('\n=== API 响应缓存示例 ===\n');

  const cache = createLocalStorage('api-cache');

  // 模拟 API 响应
  const apiResponse = {
    data: [{ id: 1, name: 'Item 1' }, { id: 2, name: 'Item 2' }],
    timestamp: Date.now(),
  };

  // 缓存 5 分钟
  const FIVE_MINUTES = 5 * 60 * 1000;
  cache.set('users-list', apiResponse, { expiry: Date.now() + FIVE_MINUTES });
  console.log('✓ 缓存 API 响应 (5 分钟)');

  // 从缓存获取
  const cached = cache.get('users-list');
  console.log('✓ 从缓存获取:', cached);

  // 检查是否过期
  const isCached = cache.has('users-list');
  console.log('✓ 缓存是否有效:', isCached);
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('╔═══════════════════════════════════════════╗');
  console.log('║   Storage Manager Skill 使用示例          ║');
  console.log('╚═══════════════════════════════════════════╝\n');

  // LocalStorage 示例
  localStorageBasicExample();
  localStorageFactoryExample();
  localStorageCustomSerializerExample();
  // localStorageWithExpiryExample(); // 需要等待，单独运行

  // SessionStorage 示例
  sessionStorageBasicExample();
  sessionStorageWithExpiryExample();

  // IndexedDB 示例 (异步)
  await indexedDBBasicExample();
  await indexedDBQueryExample();

  // 统一管理器示例
  await unifiedStorageManagerExample();

  // 实际应用场景
  userPreferencesExample();
  shoppingCartExample();
  formDraftExample();
  await apiCacheExample();

  console.log('\n╔═══════════════════════════════════════════╗');
  console.log('║   所有示例运行完成！✅                    ║');
  console.log('╚═══════════════════════════════════════════╝');
}

// 如果直接运行此文件
if (typeof window !== 'undefined') {
  runAllExamples().catch(console.error);
}

// 导出示例函数供参考
export {
  localStorageBasicExample,
  localStorageWithExpiryExample,
  localStorageCustomSerializerExample,
  localStorageFactoryExample,
  sessionStorageBasicExample,
  sessionStorageWithExpiryExample,
  indexedDBBasicExample,
  indexedDBQueryExample,
  unifiedStorageManagerExample,
  userPreferencesExample,
  shoppingCartExample,
  formDraftExample,
  apiCacheExample,
  runAllExamples,
};
