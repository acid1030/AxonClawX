/**
 * CQRS Pattern Skill - 快速测试
 * 
 * 运行：npx tsx src/skills/test-cqrs-quick.ts
 */

import {
  CQRSManager,
  SimpleEventBus,
  InMemoryDatabase,
  CreateUserCommand,
  CreateUserHandler,
  GetUserQuery,
  GetUserQueryHandler,
  UserData
} from './cqrs-pattern-skill';

async function quickTest() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     CQRS Pattern - Quick Test             ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // 创建基础设施
  const database = new InMemoryDatabase();
  const eventBus = new SimpleEventBus();

  // 创建 CQRS 管理器
  const cqrs = new CQRSManager({
    enableLogging: false,
    enableEventSourcing: true,
    commandHandlers: [new CreateUserHandler(database)],
    queryHandlers: [new GetUserQueryHandler(database)],
    eventBus: eventBus
  });

  // 测试 1: 创建用户
  console.log('📝 Test 1: 创建用户');
  const createCommand: CreateUserCommand = {
    id: 'cmd-1',
    type: 'CreateUser',
    payload: {
      username: 'test_user',
      email: 'test@example.com',
      password: 'password123'
    },
    timestamp: Date.now(),
    correlationId: 'test-1'
  };

  const createResult = await cqrs.sendCommand(createCommand);
  
  if (createResult.success) {
    console.log(`  ✅ 成功: ${(createResult.data as UserData).username}`);
    console.log(`  ⏱️  耗时：${createResult.executionTime}ms\n`);
  } else {
    console.log(`  ❌ 失败：${createResult.error}\n`);
    return;
  }

  // 测试 2: 查询用户
  console.log('📝 Test 2: 查询用户');
  const userId = (createResult.data as UserData).id;
  const getQuery: GetUserQuery = {
    id: 'query-1',
    type: 'GetUser',
    params: { userId },
    timestamp: Date.now()
  };

  const getResult = await cqrs.executeQuery(getQuery);
  
  if (getResult.success && getResult.data) {
    console.log(`  ✅ 成功：${(getResult.data as UserData).username}`);
    console.log(`  ⏱️  耗时：${getResult.executionTime}ms\n`);
  } else {
    console.log(`  ❌ 失败：${getResult.error}\n`);
    return;
  }

  // 测试 3: 命令验证
  console.log('📝 Test 3: 命令验证 (无效输入)');
  const invalidCommand: CreateUserCommand = {
    id: 'cmd-invalid',
    type: 'CreateUser',
    payload: {
      username: 'ab',  // 太短
      email: 'invalid',
      password: '123'  // 太短
    },
    timestamp: Date.now()
  };

  const invalidResult = await cqrs.sendCommand(invalidCommand);
  
  if (!invalidResult.success) {
    console.log(`  ✅ 正确拒绝无效命令`);
    console.log(`  📝 原因：${invalidResult.error}\n`);
  } else {
    console.log(`  ❌ 应该拒绝无效命令\n`);
    return;
  }

  console.log('╔════════════════════════════════════════════╗');
  console.log('║         ✅ 所有测试通过！                 ║');
  console.log('╚════════════════════════════════════════════╝\n');
}

quickTest().catch(console.error);
