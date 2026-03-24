/**
 * 钩子系统技能 - 使用示例 - KAEL
 * 
 * 运行方式：uv run ts-node src/skills/hook-system-skill.examples.ts
 */

import { createHookSystem, getGlobalHookSystem, HookSystem } from './hook-system-skill';

async function runExamples() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       钩子系统技能 - 使用示例 (Hook System Skill)      ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  // ========== 示例 1: 基础用法 ==========
  console.log('📌 示例 1: 基础钩子注册与触发\n');
  
  const hookSystem = createHookSystem();

  // 注册钩子
  hookSystem.register('user:beforeSave', (data: any) => {
    console.log('   ✅ 验证用户数据');
    data.validated = true;
    return data;
  }, { priority: 10, description: '验证用户数据' });

  hookSystem.register('user:beforeSave', (data: any) => {
    console.log('   🔐 加密密码');
    data.password = '***encrypted***';
    return data;
  }, { priority: 5, description: '加密密码' });

  // 触发钩子
  const userData = { username: 'Alice', password: '123456', email: 'alice@example.com' };
  console.log('   原始数据:', JSON.stringify(userData, null, 2));
  
  const result = await hookSystem.execute('user:beforeSave', userData);
  console.log('   处理后数据:', JSON.stringify(result.data, null, 2));
  console.log('   执行时间:', result.executionTime, 'ms');
  console.log('   执行状态:', result.success ? '✅ 成功' : '❌ 失败\n');

  // ========== 示例 2: 优先级控制 ==========
  console.log('\n📌 示例 2: 优先级控制 (数字越大越先执行)\n');
  
  const prioritySystem = createHookSystem();

  prioritySystem.register('order:process', () => {
    console.log('   [优先级 0]  🟢 普通处理');
    return { step: 'normal' };
  }, { priority: 0 });

  prioritySystem.register('order:process', () => {
    console.log('   [优先级 10] 🔴 高优先级处理');
    return { step: 'high' };
  }, { priority: 10 });

  prioritySystem.register('order:process', () => {
    console.log('   [优先级 5]  🟡 中优先级处理');
    return { step: 'medium' };
  }, { priority: 5 });

  await prioritySystem.execute('order:process', {});
  console.log('   💡 执行顺序：高优先级 → 中优先级 → 普通');

  // ========== 示例 3: 一次性钩子 ==========
  console.log('\n📌 示例 3: 一次性钩子 (once: true)\n');
  
  const onceSystem = createHookSystem();

  onceSystem.register('app:init', () => {
    console.log('   🚀 应用初始化 (只执行一次)');
    return { initialized: true };
  }, { once: true, description: '初始化钩子' });

  console.log('   第 1 次触发:');
  await onceSystem.execute('app:init', {});
  
  console.log('   第 2 次触发: (不会执行)');
  await onceSystem.execute('app:init', {});
  
  console.log('   第 3 次触发: (不会执行)');
  await onceSystem.execute('app:init', {});

  // ========== 示例 4: 中断执行 ==========
  console.log('\n📌 示例 4: 中断钩子执行 (canAbort: true)\n');
  
  const abortSystem = createHookSystem();

  abortSystem.register('request:validate', (data: any, context: any) => {
    console.log('   🔍 验证请求...');
    if (!data.valid) {
      console.log('   ⚠️  验证失败，中断后续钩子');
      abortSystem.abort(context);
    }
    return data;
  }, { priority: 10, canAbort: true, description: '验证请求' });

  abortSystem.register('request:process', (data: any) => {
    console.log('   ⚙️  处理请求...');
    return data;
  }, { priority: 5, description: '处理请求' });

  abortSystem.register('request:log', (data: any) => {
    console.log('   📝 记录日志...');
    return data;
  }, { priority: 0, description: '记录日志' });

  console.log('   测试无效请求:');
  await abortSystem.execute('request:validate', { valid: false, id: 123 });
  console.log('   💡 后续钩子被中断，未执行\n');

  // ========== 示例 5: 超时控制 ==========
  console.log('📌 示例 5: 钩子超时控制 (timeout: 毫秒)\n');
  
  const timeoutSystem = createHookSystem();

  timeoutSystem.register('slow:task', async (data: any) => {
    console.log('   🐌 开始慢任务...');
    await new Promise(resolve => setTimeout(resolve, 200));
    console.log('   ✅ 慢任务完成');
    return data;
  }, { timeout: 100, description: '慢任务 (200ms)' });

  const timeoutResult = await timeoutSystem.execute('slow:task', {});
  console.log('   执行结果:', timeoutResult.success ? '✅ 成功' : '❌ 失败');
  if (timeoutResult.error) {
    console.log('   错误信息:', timeoutResult.error);
  }
  console.log('   💡 钩子执行超时 (100ms)，被强制终止\n');

  // ========== 示例 6: 全局单例 ==========
  console.log('📌 示例 6: 全局单例钩子系统\n');
  
  const global1 = getGlobalHookSystem();
  const global2 = getGlobalHookSystem();
  
  console.log('   全局单例验证:', global1 === global2 ? '✅ 是同一个实例' : '❌ 不是同一个实例');

  global1.register('global:event', (data: any) => {
    console.log('   🌐 全局事件处理器:', data.message);
  }, { description: '全局事件' });

  console.log('   通过 global2 触发全局事件:');
  await global2.execute('global:event', { message: 'Hello from global!' });

  // ========== 示例 7: 统计信息 ==========
  console.log('\n📌 示例 7: 钩子统计信息\n');
  
  const statsSystem = createHookSystem();

  statsSystem.register('test:hook1', () => {}, { description: '测试钩子 1' });
  statsSystem.register('test:hook1', () => {}, { description: '测试钩子 2' });
  statsSystem.register('test:hook2', () => {}, { description: '测试钩子 3' });
  statsSystem.register('test:hook2', () => {}, { description: '测试钩子 4' });

  console.log('   所有钩子名称:', statsSystem.getHookNames());
  console.log('   钩子总数:', statsSystem.getHookCount());
  console.log('   test:hook1 钩子数:', statsSystem.getHookCount('test:hook1'));
  console.log('   test:hook2 钩子数:', statsSystem.getHookCount('test:hook2'));
  
  const stats = statsSystem.getStats();
  console.log('   详细统计:', JSON.stringify(stats, null, 2));

  // ========== 示例 8: 取消注册 ==========
  console.log('\n📌 示例 8: 取消注册钩子\n');
  
  const unregisterSystem = createHookSystem();

  const hookId = unregisterSystem.register('temp:hook', () => {
    console.log('   临时钩子执行');
  }, { description: '临时钩子' });

  console.log('   注册后钩子数:', unregisterSystem.getHookCount('temp:hook'));
  
  console.log('   取消指定钩子...');
  unregisterSystem.unregister('temp:hook', hookId);
  console.log('   取消后钩子数:', unregisterSystem.getHookCount('temp:hook'));

  // 重新注册多个
  unregisterSystem.register('temp:hook', () => {}, { description: '钩子 A' });
  unregisterSystem.register('temp:hook', () => {}, { description: '钩子 B' });
  unregisterSystem.register('temp:hook', () => {}, { description: '钩子 C' });
  console.log('   重新注册 3 个后钩子数:', unregisterSystem.getHookCount('temp:hook'));
  
  console.log('   取消所有钩子...');
  unregisterSystem.unregister('temp:hook'); // 不传 hookId 则取消所有
  console.log('   全部取消后钩子数:', unregisterSystem.getHookCount('temp:hook'));

  // ========== 示例 9: 获取钩子信息 ==========
  console.log('\n📌 示例 9: 获取钩子详细信息\n');
  
  const infoSystem = createHookSystem();

  infoSystem.register('data:process', (data: any) => data, { 
    priority: 10, 
    description: '数据验证',
    once: false 
  });
  infoSystem.register('data:process', (data: any) => data, { 
    priority: 5, 
    description: '数据转换',
    once: false 
  });

  const hooks = infoSystem.getHooks('data:process');
  console.log('   钩子列表:');
  hooks.forEach((hook, index) => {
    console.log(`   ${index + 1}. ${hook.description}`);
    console.log(`      ID: ${hook.id}`);
    console.log(`      优先级：${hook.priority}`);
    console.log(`      一次性：${hook.once}`);
    console.log(`      注册时问：${new Date(hook.registeredAt).toLocaleString()}`);
  });

  // ========== 示例 10: 实际应用场景 ==========
  console.log('\n📌 示例 10: 实际应用场景 - Web 请求中间件\n');
  
  const middlewareSystem = createHookSystem();

  // 认证中间件
  middlewareSystem.register('request:before', async (req: any, ctx: any) => {
    console.log('   🔐 认证中间件');
    const token = req.headers?.authorization;
    if (!token) {
      console.log('   ⚠️  缺少认证令牌');
      middlewareSystem.abort(ctx);
      throw new Error('Unauthorized');
    }
    req.user = { id: 1, name: 'Test User' };
    return req;
  }, { priority: 100, canAbort: true, description: '认证' });

  // 日志中间件
  middlewareSystem.register('request:before', (req: any) => {
    console.log(`   📝 日志中间件：${req.method} ${req.path}`);
    req.logger = { start: Date.now() };
    return req;
  }, { priority: 50, description: '日志' });

  // CORS 中间件
  middlewareSystem.register('request:before', (req: any) => {
    console.log('   🌐 CORS 中间件');
    req.headers['Access-Control-Allow-Origin'] = '*';
    return req;
  }, { priority: 10, description: 'CORS' });

  // 模拟请求
  const mockRequest = {
    method: 'GET',
    path: '/api/users',
    headers: { authorization: 'Bearer token123' },
  };

  console.log('   模拟请求:', mockRequest.method, mockRequest.path);
  const middlewareResult = await middlewareSystem.execute('request:before', mockRequest);
  console.log('   中间件处理完成:', middlewareResult.success ? '✅' : '❌');
  console.log('   最终请求对象:', JSON.stringify(middlewareResult.data, null, 2));

  // ========== 完成 ==========
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                  ✅ 所有示例执行完成                    ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
}

// 运行示例
runExamples().catch(console.error);
