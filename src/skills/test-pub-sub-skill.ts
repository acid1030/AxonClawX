/**
 * 发布订阅技能测试 - Pub/Sub Skill Test
 */

import { createPubSub, PubSubManager, Message } from './pub-sub-skill';

async function runTests() {
  console.log('🧪 开始测试发布订阅技能...\n');
  
  const pubsub = createPubSub({ maxHistoryPerTopic: 10 });
  let passed = 0;
  let failed = 0;

  // Test 1: 主题管理
  console.log('Test 1: 主题管理');
  try {
    const topic = pubsub.createTopic('test.topic');
    if (topic.name === 'test.topic' && !topic.isSystem) {
      console.log('  ✅ 创建主题成功');
      passed++;
    } else {
      console.log('  ❌ 创建主题失败');
      failed++;
    }

    const topics = pubsub.listTopics();
    if (topics.length >= 1) {
      console.log('  ✅ 列出主题成功');
      passed++;
    } else {
      console.log('  ❌ 列出主题失败');
      failed++;
    }

    const topicInfo = pubsub.getTopic('test.topic');
    if (topicInfo && topicInfo.name === 'test.topic') {
      console.log('  ✅ 获取主题信息成功');
      passed++;
    } else {
      console.log('  ❌ 获取主题信息失败');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ 主题管理测试失败:', error);
    failed++;
  }

  // Test 2: 发布订阅
  console.log('\nTest 2: 发布订阅');
  try {
    let messageReceived = false;
    let receivedData: any = null;

    const subId = pubsub.subscribe('test.event', (message: Message) => {
      messageReceived = true;
      receivedData = message.data;
    });

    await pubsub.publish('test.event', { test: 'data' });

    if (messageReceived && receivedData?.test === 'data') {
      console.log('  ✅ 发布订阅成功');
      passed++;
    } else {
      console.log('  ❌ 发布订阅失败');
      failed++;
    }

    // 测试取消订阅
    let messageAfterUnsubscribe = false;
    const subId2 = pubsub.subscribe('test.event2', () => {
      messageAfterUnsubscribe = true;
    });
    pubsub.unsubscribe(subId2);
    await pubsub.publish('test.event2', {});

    if (!messageAfterUnsubscribe) {
      console.log('  ✅ 取消订阅成功');
      passed++;
    } else {
      console.log('  ❌ 取消订阅失败');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ 发布订阅测试失败:', error);
    failed++;
  }

  // Test 3: 通配符订阅
  console.log('\nTest 3: 通配符订阅');
  try {
    let wildcardMatches = 0;
    pubsub.subscribe('user.*', () => {
      wildcardMatches++;
    });

    await pubsub.publish('user.created', {});
    await pubsub.publish('user.updated', {});
    await pubsub.publish('user.deleted', {});
    await pubsub.publish('other.event', {}); // 不应该匹配

    if (wildcardMatches === 3) {
      console.log('  ✅ 通配符订阅成功');
      passed++;
    } else {
      console.log(`  ❌ 通配符订阅失败 (期望 3, 实际 ${wildcardMatches})`);
      failed++;
    }
  } catch (error) {
    console.log('  ❌ 通配符订阅测试失败:', error);
    failed++;
  }

  // Test 4: 消息过滤
  console.log('\nTest 4: 消息过滤');
  try {
    let filteredCount = 0;

    const filter = pubsub.createFilter({
      fields: { priority: 'high' }
    });

    pubsub.subscribe('filtered.events', () => {
      filteredCount++;
    }, { filter });

    await pubsub.publish('filtered.events', { priority: 'high' });
    await pubsub.publish('filtered.events', { priority: 'low' });
    await pubsub.publish('filtered.events', { priority: 'high' });

    if (filteredCount === 2) {
      console.log('  ✅ 消息过滤成功');
      passed++;
    } else {
      console.log(`  ❌ 消息过滤失败 (期望 2, 实际 ${filteredCount})`);
      failed++;
    }
  } catch (error) {
    console.log('  ❌ 消息过滤测试失败:', error);
    failed++;
  }

  // Test 5: 一次性订阅
  console.log('\nTest 5: 一次性订阅 (once)');
  try {
    let onceCount = 0;

    pubsub.subscribeOnce('once.event', () => {
      onceCount++;
    });

    await pubsub.publish('once.event', {});
    await pubsub.publish('once.event', {});
    await pubsub.publish('once.event', {});

    if (onceCount === 1) {
      console.log('  ✅ 一次性订阅成功');
      passed++;
    } else {
      console.log(`  ❌ 一次性订阅失败 (期望 1, 实际 ${onceCount})`);
      failed++;
    }
  } catch (error) {
    console.log('  ❌ 一次性订阅测试失败:', error);
    failed++;
  }

  // Test 6: 消息历史
  console.log('\nTest 6: 消息历史');
  try {
    for (let i = 0; i < 5; i++) {
      await pubsub.publish('history.test', { index: i });
    }

    const history = pubsub.getHistory('history.test', 10);
    if (history.length === 5 && history[0].data.index === 4) {
      console.log('  ✅ 消息历史成功');
      passed++;
    } else {
      console.log(`  ❌ 消息历史失败 (长度 ${history.length})`);
      failed++;
    }
  } catch (error) {
    console.log('  ❌ 消息历史测试失败:', error);
    failed++;
  }

  // Test 7: 统计信息
  console.log('\nTest 7: 统计信息');
  try {
    const stats = pubsub.getStats();
    if (stats.totalTopics > 0 && stats.totalMessages > 0) {
      console.log('  ✅ 统计信息成功');
      console.log(`     主题数：${stats.totalTopics}`);
      console.log(`     消息数：${stats.totalMessages}`);
      console.log(`     订阅数：${stats.totalSubscriptions}`);
      passed++;
    } else {
      console.log('  ❌ 统计信息失败');
      failed++;
    }
  } catch (error) {
    console.log('  ❌ 统计信息测试失败:', error);
    failed++;
  }

  // Test 8: 正则过滤
  console.log('\nTest 8: 正则过滤');
  try {
    let regexCount = 0;

    const filter = pubsub.createFilter({
      regex: /error|warning/i
    });

    pubsub.subscribe('logs', () => {
      regexCount++;
    }, { filter });

    await pubsub.publish('logs', 'System error occurred');
    await pubsub.publish('logs', 'Normal operation');
    await pubsub.publish('logs', 'Warning: low memory');

    if (regexCount === 2) {
      console.log('  ✅ 正则过滤成功');
      passed++;
    } else {
      console.log(`  ❌ 正则过滤失败 (期望 2, 实际 ${regexCount})`);
      failed++;
    }
  } catch (error) {
    console.log('  ❌ 正则过滤测试失败:', error);
    failed++;
  }

  // 总结
  console.log('\n' + '='.repeat(50));
  console.log(`测试完成：${passed} 通过，${failed} 失败`);
  console.log('='.repeat(50));

  if (failed === 0) {
    console.log('\n🎉 所有测试通过！');
  } else {
    console.log(`\n⚠️  有 ${failed} 个测试失败`);
    process.exit(1);
  }
}

// 运行测试
runTests().catch(console.error);
