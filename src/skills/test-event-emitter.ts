/**
 * 事件发射器技能 - 快速测试
 * 
 * 验证核心功能:
 * 1. 事件注册 (on)
 * 2. 事件触发 (emit)
 * 3. 事件监听 (once, off)
 */

import { createEventEmitter, getGlobalEmitter } from './event-emitter-skill';

async function runTests() {
  console.log('🚀 开始测试事件发射器...\n');

  const emitter = createEventEmitter();
  let testCount = 0;
  let passCount = 0;

  // 测试 1: 基础订阅与发射
  console.log('✅ 测试 1: 基础订阅与发射');
  testCount++;
  let received = false;
  emitter.on('test:basic', () => { received = true; });
  await emitter.emit('test:basic', {});
  if (received) {
    passCount++;
    console.log('   ✓ 通过\n');
  } else {
    console.log('   ✗ 失败\n');
  }

  // 测试 2: 取消订阅
  console.log('✅ 测试 2: 取消订阅');
  testCount++;
  let callCount = 0;
  const unsubscribe = emitter.on('test:unsubscribe', () => { callCount++; });
  await emitter.emit('test:unsubscribe', {});
  unsubscribe();
  await emitter.emit('test:unsubscribe', {});
  if (callCount === 1) {
    passCount++;
    console.log('   ✓ 通过\n');
  } else {
    console.log('   ✗ 失败\n');
  }

  // 测试 3: 一次性监听
  console.log('✅ 测试 3: 一次性监听 (once)');
  testCount++;
  let onceCount = 0;
  emitter.once('test:once', () => { onceCount++; });
  await emitter.emit('test:once', {});
  await emitter.emit('test:once', {});
  if (onceCount === 1) {
    passCount++;
    console.log('   ✓ 通过\n');
  } else {
    console.log('   ✗ 失败\n');
  }

  // 测试 4: 通配符匹配
  console.log('✅ 测试 4: 通配符匹配');
  testCount++;
  const wildcardEvents: string[] = [];
  emitter.on('user:*', (data, eventName) => { wildcardEvents.push(eventName); });
  await emitter.emit('user:login', {});
  await emitter.emit('user:logout', {});
  await emitter.emit('user:update', {});
  if (wildcardEvents.length === 3 && wildcardEvents[0] === 'user:login') {
    passCount++;
    console.log('   ✓ 通过\n');
  } else {
    console.log('   ✗ 失败\n');
  }

  // 测试 5: 优先级
  console.log('✅ 测试 5: 优先级控制');
  testCount++;
  const executionOrder: string[] = [];
  emitter.on('test:priority', () => { executionOrder.push('low'); }, 0);
  emitter.on('test:priority', () => { executionOrder.push('high'); }, 10);
  emitter.on('test:priority', () => { executionOrder.push('mid'); }, 5);
  await emitter.emit('test:priority', {});
  if (executionOrder[0] === 'high' && executionOrder[1] === 'mid' && executionOrder[2] === 'low') {
    passCount++;
    console.log('   ✓ 通过\n');
  } else {
    console.log('   ✗ 失败 (顺序:', executionOrder, ')\n');
  }

  // 测试 6: 异步处理
  console.log('✅ 测试 6: 异步处理');
  testCount++;
  let asyncDone = false;
  emitter.on('test:async', async () => {
    await new Promise(resolve => setTimeout(resolve, 100));
    asyncDone = true;
  });
  await emitter.emit('test:async', {}, { timeout: 1000 });
  if (asyncDone) {
    passCount++;
    console.log('   ✓ 通过\n');
  } else {
    console.log('   ✗ 失败\n');
  }

  // 测试 7: 统计信息
  console.log('✅ 测试 7: 统计信息');
  testCount++;
  const statsEmitter = createEventEmitter();
  statsEmitter.on('event1', () => {});
  statsEmitter.on('event2', () => {});
  statsEmitter.on('event2', () => {});
  await statsEmitter.emit('event1', {});
  await statsEmitter.emit('event2', {});
  const stats = statsEmitter.getStats();
  if (stats.totalEvents === 2 && stats.totalListeners === 3 && stats.emittedCount === 2) {
    passCount++;
    console.log('   ✓ 通过\n');
  } else {
    console.log('   ✗ 失败 (stats:', stats, ')\n');
  }

  // 测试 8: 全局单例
  console.log('✅ 测试 8: 全局单例');
  testCount++;
  const global1 = getGlobalEmitter();
  const global2 = getGlobalEmitter();
  let globalReceived = false;
  global1.on('global:test', () => { globalReceived = true; });
  await global2.emit('global:test', {});
  if (globalReceived && global1 === global2) {
    passCount++;
    console.log('   ✓ 通过\n');
  } else {
    console.log('   ✗ 失败\n');
  }

  // 总结
  console.log('='.repeat(50));
  console.log(`📊 测试结果：${passCount}/${testCount} 通过`);
  console.log(`📈 通过率：${((passCount / testCount) * 100).toFixed(1)}%`);
  console.log('='.repeat(50));

  if (passCount === testCount) {
    console.log('🎉 所有测试通过！事件发射器功能正常！');
  } else {
    console.log('⚠️  部分测试失败，请检查实现。');
  }
}

// 运行测试
runTests().catch(console.error);
