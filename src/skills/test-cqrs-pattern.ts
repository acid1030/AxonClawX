/**
 * CQRS Pattern Skill - 测试文件
 * 
 * 运行：uv run tsx src/skills/test-cqrs-pattern.ts
 */

import {
  CQRSManager,
  SimpleEventBus,
  InMemoryDatabase,
  CreateUserCommand,
  CreateUserHandler,
  GetUserQuery,
  GetUserQueryHandler,
  ListUsersQuery,
  ListUsersQueryHandler,
  UpdateUserCommand,
  DeleteUserCommand,
  UserData,
  CommandHandler,
  CommandResult,
  Command
} from './cqrs-pattern-skill';

// ============================================
// 扩展处理器：更新用户
// ============================================

class UpdateUserHandler implements CommandHandler<UpdateUserCommand, UserData> {
  commandType = 'UpdateUser';
  private database: InMemoryDatabase;

  constructor(database: InMemoryDatabase) {
    this.database = database;
  }

  validate(command: UpdateUserCommand): boolean {
    return !!(command.payload.userId && command.payload.data);
  }

  async execute(command: UpdateUserCommand): Promise<CommandResult<UserData>> {
    const { userId, data } = command.payload;

    const user = await this.database.queryOne<UserData>(
      'users',
      u => u.id === userId
    );

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        commandId: command.id
      };
    }

    const updatedUser: UserData = {
      ...user,
      ...data,
      updatedAt: Date.now()
    };

    await this.database.execute('users', 'update', updatedUser);

    return {
      success: true,
      data: updatedUser,
      commandId: command.id
    };
  }
}

// ============================================
// 扩展处理器：删除用户
// ============================================

class DeleteUserHandler implements CommandHandler<DeleteUserCommand, void> {
  commandType = 'DeleteUser';
  private database: InMemoryDatabase;

  constructor(database: InMemoryDatabase) {
    this.database = database;
  }

  validate(command: DeleteUserCommand): boolean {
    return !!command.payload.userId;
  }

  async execute(command: DeleteUserCommand): Promise<CommandResult<void>> {
    const { userId } = command.payload;

    const user = await this.database.queryOne<UserData>(
      'users',
      u => u.id === userId
    );

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        commandId: command.id
      };
    }

    await this.database.execute('users', 'delete', { id: userId });

    return {
      success: true,
      data: undefined,
      commandId: command.id
    };
  }
}

// ============================================
// 主测试函数
// ============================================

async function runTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║         CQRS Pattern Skill - Test Suite               ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  const startTime = Date.now();
  const results: { test: string; passed: boolean; error?: string }[] = [];

  // 创建基础设施
  const database = new InMemoryDatabase();
  const eventBus = new SimpleEventBus();

  // 订阅所有事件
  eventBus.subscribe('*', (event) => {
    console.log(`  📬 Event: ${event.type} (Aggregate: ${event.aggregateId})`);
  });

  // 创建 CQRS 管理器
  const cqrs = new CQRSManager({
    enableLogging: true,
    enableEventSourcing: true,
    enablePerformanceMonitoring: true,
    commandHandlers: [
      new CreateUserHandler(database),
      new UpdateUserHandler(database),
      new DeleteUserHandler(database)
    ],
    queryHandlers: [
      new GetUserQueryHandler(database),
      new ListUsersQueryHandler(database)
    ],
    eventBus: eventBus
  });

  // ========== Test 1: 创建用户 ==========
  console.log('📝 Test 1: 创建用户');
  try {
    const createCommand: CreateUserCommand = {
      id: 'cmd-create-1',
      type: 'CreateUser',
      payload: {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'secure123'
      },
      timestamp: Date.now(),
      correlationId: 'corr-1'
    };

    const createResult = await cqrs.sendCommand(createCommand);

    if (createResult.success && createResult.data?.id) {
      console.log(`  ✅ 用户创建成功: ${createResult.data.username}`);
      console.log(`  ⏱️  执行时间：${createResult.executionTime}ms`);
      results.push({ test: '创建用户', passed: true });

      // 保存用户 ID 供后续测试使用
      const userId = createResult.data.id;

      // ========== Test 2: 查询用户 ==========
      console.log('\n📝 Test 2: 查询用户');
      try {
        const getQuery: GetUserQuery = {
          id: 'query-get-1',
          type: 'GetUser',
          params: { userId },
          timestamp: Date.now()
        };

        const getResult = await cqrs.executeQuery(getQuery);

        if (getResult.success && getResult.data?.id === userId) {
          console.log(`  ✅ 用户查询成功: ${getResult.data.username}`);
          console.log(`  ⏱️  执行时间：${getResult.executionTime}ms`);
          results.push({ test: '查询用户', passed: true });

          // ========== Test 3: 更新用户 ==========
          console.log('\n📝 Test 3: 更新用户');
          try {
            const updateCommand: UpdateUserCommand = {
              id: 'cmd-update-1',
              type: 'UpdateUser',
              payload: {
                userId,
                data: {
                  email: 'john.new@example.com'
                }
              },
              timestamp: Date.now()
            };

            const updateResult = await cqrs.sendCommand(updateCommand);

            if (updateResult.success && updateResult.data?.email === 'john.new@example.com') {
              console.log(`  ✅ 用户更新成功: ${updateResult.data.email}`);
              console.log(`  ⏱️  执行时间：${updateResult.executionTime}ms`);
              results.push({ test: '更新用户', passed: true });

              // ========== Test 4: 列出用户 ==========
              console.log('\n📝 Test 4: 列出用户');
              try {
                // 先创建几个测试用户
                for (let i = 2; i <= 4; i++) {
                  await cqrs.sendCommand<CreateUserCommand>({
                    id: `cmd-create-${i}`,
                    type: 'CreateUser',
                    payload: {
                      username: `user_${i}`,
                      email: `user${i}@example.com`,
                      password: 'password123'
                    },
                    timestamp: Date.now()
                  });
                }

                const listQuery: ListUsersQuery = {
                  id: 'query-list-1',
                  type: 'ListUsers',
                  params: {
                    status: 'active'
                  },
                  pagination: {
                    page: 1,
                    pageSize: 10
                  },
                  sorting: {
                    field: 'createdAt',
                    order: 'desc'
                  },
                  timestamp: Date.now()
                };

                const listResult = await cqrs.executeQuery(listQuery);

                if (listResult.success && listResult.data.length >= 4) {
                  console.log(`  ✅ 用户列表查询成功: ${listResult.data.length} 个用户`);
                  console.log(`  ⏱️  执行时间：${listResult.executionTime}ms`);
                  console.log(`  📊 总记录数：${listResult.totalCount}`);
                  results.push({ test: '列出用户', passed: true });
                } else {
                  throw new Error('用户列表数量不正确');
                }
              } catch (error) {
                console.log(`  ❌ 列出用户失败: ${error instanceof Error ? error.message : error}`);
                results.push({ test: '列出用户', passed: false, error: error instanceof Error ? error.message : String(error) });
              }
            } else {
              throw new Error('用户更新失败');
            }
          } catch (error) {
            console.log(`  ❌ 更新用户失败: ${error instanceof Error ? error.message : error}`);
            results.push({ test: '更新用户', passed: false, error: error instanceof Error ? error.message : String(error) });
          }
        } else {
          throw new Error('用户查询失败');
        }
      } catch (error) {
        console.log(`  ❌ 查询用户失败: ${error instanceof Error ? error.message : error}`);
        results.push({ test: '查询用户', passed: false, error: error instanceof Error ? error.message : String(error) });
      }
    } else {
      throw new Error('用户创建失败');
    }
  } catch (error) {
    console.log(`  ❌ 创建用户失败: ${error instanceof Error ? error.message : error}`);
    results.push({ test: '创建用户', passed: false, error: error instanceof Error ? error.message : String(error) });
  }

  // ========== Test 5: 删除用户 ==========
  console.log('\n📝 Test 5: 删除用户');
  try {
    // 先创建一个用于删除的用户
    const createForDelete = await cqrs.sendCommand<CreateUserCommand>({
      id: 'cmd-create-delete',
      type: 'CreateUser',
      payload: {
        username: 'to_delete',
        email: 'delete@example.com',
        password: 'password123'
      },
      timestamp: Date.now()
    });

    if (!createForDelete.data?.id) {
      throw new Error('创建测试用户失败');
    }

    const deleteCommand: DeleteUserCommand = {
      id: 'cmd-delete-1',
      type: 'DeleteUser',
      payload: {
        userId: createForDelete.data.id
      },
      timestamp: Date.now()
    };

    const deleteResult = await cqrs.sendCommand(deleteCommand);

    if (deleteResult.success) {
      console.log(`  ✅ 用户删除成功`);
      console.log(`  ⏱️  执行时间：${deleteResult.executionTime}ms`);
      results.push({ test: '删除用户', passed: true });

      // 验证用户已被删除
      const verifyQuery: GetUserQuery = {
        id: 'query-verify-1',
        type: 'GetUser',
        params: { userId: createForDelete.data.id },
        timestamp: Date.now()
      };

      const verifyResult = await cqrs.executeQuery(verifyQuery);

      if (!verifyResult.data) {
        console.log(`  ✅ 验证成功：用户已不存在`);
      } else {
        throw new Error('用户仍然存在，删除失败');
      }
    } else {
      throw new Error('用户删除失败');
    }
  } catch (error) {
    console.log(`  ❌ 删除用户失败: ${error instanceof Error ? error.message : error}`);
    results.push({ test: '删除用户', passed: false, error: error instanceof Error ? error.message : String(error) });
  }

  // ========== Test 6: 命令验证失败 ==========
  console.log('\n📝 Test 6: 命令验证失败');
  try {
    const invalidCommand: CreateUserCommand = {
      id: 'cmd-invalid-1',
      type: 'CreateUser',
      payload: {
        username: 'ab',  // 太短
        email: 'invalid-email',
        password: '123'  // 太短
      },
      timestamp: Date.now()
    };

    const invalidResult = await cqrs.sendCommand(invalidCommand);

    if (!invalidResult.success) {
      console.log(`  ✅ 命令验证正确拒绝无效输入`);
      console.log(`  📝 错误信息：${invalidResult.error}`);
      results.push({ test: '命令验证', passed: true });
    } else {
      throw new Error('无效命令应该被拒绝');
    }
  } catch (error) {
    console.log(`  ❌ 命令验证测试失败: ${error instanceof Error ? error.message : error}`);
    results.push({ test: '命令验证', passed: false, error: error instanceof Error ? error.message : String(error) });
  }

  // ========== Test 7: 查询不存在的数据 ==========
  console.log('\n📝 Test 7: 查询不存在的数据');
  try {
    const notFoundQuery: GetUserQuery = {
      id: 'query-notfound-1',
      type: 'GetUser',
      params: { userId: 'non-existent-id' },
      timestamp: Date.now()
    };

    const notFoundResult = await cqrs.executeQuery(notFoundQuery);

    if (notFoundResult.success && !notFoundResult.data) {
      console.log(`  ✅ 正确返回空结果`);
      results.push({ test: '查询不存在数据', passed: true });
    } else {
      throw new Error('查询不存在数据应该返回空结果');
    }
  } catch (error) {
    console.log(`  ❌ 查询不存在数据测试失败: ${error instanceof Error ? error.message : error}`);
    results.push({ test: '查询不存在数据', passed: false, error: error instanceof Error ? error.message : String(error) });
  }

  // ========== 测试总结 ==========
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                    测试结果总结                        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  results.forEach((result, index) => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`  ${icon} Test ${index + 1}: ${result.test}`);
    if (!result.passed && result.error) {
      console.log(`     错误：${result.error}`);
    }
  });

  console.log('\n─────────────────────────────────────────────────────────');
  console.log(`  总计：${results.length} 个测试`);
  console.log(`  通过：${passed} 个 ✅`);
  console.log(`  失败：${failed} 个 ❌`);
  console.log(`  耗时：${totalTime}ms`);
  console.log(`  成功率：${((passed / results.length) * 100).toFixed(1)}%`);
  console.log('─────────────────────────────────────────────────────────\n');

  if (failed === 0) {
    console.log('🎉 所有测试通过！CQRS Pattern Skill 运行正常。\n');
  } else {
    console.log('⚠️  部分测试失败，请检查错误信息。\n');
  }
}

// 运行测试
runTests().catch(console.error);
