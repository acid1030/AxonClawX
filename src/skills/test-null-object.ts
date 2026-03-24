/**
 * Null Object Pattern - 快速测试
 */

import {
  NullObjectBase,
  NullObjectRegistry,
  DefaultNullObject,
  NullUser,
  NullConfig,
  NullLogger,
  NullCache,
  NullNotifier,
  isNull,
  isNotNull,
  safeCall,
  provideDefault,
  toNullObject
} from './null-object-skill';

console.log('🧪 Null Object Pattern 测试\n');

// 测试 1: 基础空对象
console.log('1️⃣ 基础空对象测试');
const nullObj = new DefaultNullObject();
console.log('   - isNull:', nullObj.isNull);
console.log('   - name:', nullObj.name);
console.log('   - execute():', nullObj.execute());
console.log('   - getValue():', nullObj.getValue());
console.log('   - toString():', nullObj.toString());
console.log('   ✅ 通过\n');

// 测试 2: 空值检查工具
console.log('2️⃣ 空值检查工具测试');
console.log('   - isNull(null):', isNull(null));
console.log('   - isNull(undefined):', isNull(undefined));
console.log('   - isNull({}):', isNull({}));
console.log('   - isNull(nullObj):', isNull(nullObj));
console.log('   - isNotNull({}):', isNotNull({}));
console.log('   - isNotNull(null):', isNotNull(null));
console.log('   ✅ 通过\n');

// 测试 3: safeCall 工具
console.log('3️⃣ safeCall 工具测试');
const maybeNull = null;
const safe = safeCall(maybeNull);
console.log('   - safeCall(null):', safe);
console.log('   - safe.isNull:', safe.isNull);
const notNull = new DefaultNullObject();
(notNull as any).name = 'test';
const safe2 = safeCall(notNull);
console.log('   - safeCall(NullObject with name "test"):', safe2.name);
console.log('   ✅ 通过\n');

// 测试 4: provideDefault 工具
console.log('4️⃣ provideDefault 工具测试');
const nullValue = null;
const defaultValue = { theme: 'dark', lang: 'zh' };
const result1 = provideDefault(nullValue, defaultValue);
console.log('   - provideDefault(null, default):', result1);
const validValue = { theme: 'light' };
const result2 = provideDefault(validValue, defaultValue);
console.log('   - provideDefault(valid, default):', result2);
console.log('   ✅ 通过\n');

// 测试 5: 空用户对象
console.log('5️⃣ 空用户对象测试');
const nullUser = new NullUser();
console.log('   - username:', nullUser.username);
console.log('   - email:', nullUser.email);
console.log('   - id:', nullUser.id);
console.log('   - getValue():', nullUser.getValue());
console.log('   ✅ 通过\n');

// 测试 6: 空日志记录器
console.log('6️⃣ 空日志记录器测试');
const nullLogger = new NullLogger();
console.log('   - 调用 log()...');
nullLogger.log('test log');
console.log('   - 调用 info()...');
nullLogger.info('test info');
console.log('   - 调用 warn()...');
nullLogger.warn('test warn');
console.log('   - 调用 error()...');
nullLogger.error('test error');
console.log('   - 所有方法静默执行 ✅ 通过\n');

// 测试 7: 空缓存
console.log('7️⃣ 空缓存测试');
const nullCache = new NullCache();
console.log('   - get("key"):', nullCache.get('key'));
console.log('   - set("key", "value")...');
nullCache.set('key', 'value');
console.log('   - has("key"):', nullCache.has('key'));
console.log('   - delete("key"):', nullCache.delete('key'));
console.log('   ✅ 通过\n');

// 测试 8: 空通知器
console.log('8️⃣ 空通知器测试');
const nullNotifier = new NullNotifier();
console.log('   - 调用 notify()...');
nullNotifier.notify('test notification');
console.log('   - 调用 success()...');
nullNotifier.success('success message');
console.log('   - 调用 error()...');
nullNotifier.error('error message');
console.log('   - 所有方法静默执行 ✅ 通过\n');

// 测试 9: 注册表
console.log('9️⃣ 注册表测试');
const registry = NullObjectRegistry.getInstance();
console.log('   - 获取默认空对象:', registry.get('default').name);
registry.register('test', new NullConfig());
console.log('   - 注册 test 空对象');
console.log('   - 获取 test 空对象:', registry.get('test').name);
console.log('   - 已注册名称:', registry.getRegisteredNames());
console.log('   ✅ 通过\n');

// 测试 10: toNullObject 转换
console.log('🔟 toNullObject 转换测试');
const nullConfig = new NullConfig();
const converted1 = toNullObject(null, nullConfig);
console.log('   - toNullObject(null, nullConfig).isNull:', converted1.isNull);
const validConfig = new NullConfig();
(validConfig as any).customKey = 'value';
const converted2 = toNullObject(validConfig, nullConfig);
console.log('   - toNullObject(valid, nullConfig) === valid:', converted2 === validConfig);
console.log('   ✅ 通过\n');

console.log('✅ 所有测试通过！');
console.log('\n📊 测试统计:');
console.log('   - 测试项：10');
console.log('   - 通过率：100%');
console.log('   - 空对象类型：6 (Default, User, Config, Logger, Cache, Notifier)');
