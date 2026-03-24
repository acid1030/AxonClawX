/**
 * 工作单元技能使用示例 - KAEL
 * 
 * 展示 Unit of Work 的各种使用场景
 */

import { 
  UnitOfWork, 
  createUnitOfWork, 
  withTransaction,
  ChangeType,
  UnitOfWorkState,
} from './unit-of-work-skill';

// ============================================
// 示例 1: 基本使用 - 用户注册流程
// ============================================

/**
 * 场景：用户注册时需要同时创建用户记录和用户配置
 * 使用工作单元确保两个操作要么都成功，要么都失败
 */
async function example1_UserRegistration() {
  console.log('=== 示例 1: 用户注册流程 ===\n');

  const uow = createUnitOfWork({
    name: 'UserRegistration',
    enableTracking: true,
  });

  try {
    // 1. 创建用户记录
    uow.registerNew('users', 'user_001', {
      id: 'user_001',
      username: 'alice',
      email: 'alice@example.com',
      passwordHash: 'hashed_password',
      createdAt: Date.now(),
    });

    // 2. 创建用户配置
    uow.registerNew('user_profiles', 'profile_001', {
      userId: 'user_001',
      displayName: 'Alice',
      avatar: 'default.png',
      bio: '',
    });

    // 3. 创建初始通知设置
    uow.registerNew('notification_settings', 'notif_001', {
      userId: 'user_001',
      emailEnabled: true,
      pushEnabled: true,
    });

    // 4. 提交事务
    await uow.commit();

    console.log('✅ 用户注册成功');
    console.log('统计:', uow.getStats());
    console.log('状态:', uow.state);
    console.log('');
  } catch (error) {
    console.log('❌ 注册失败:', error);
  }
}

// ============================================
// 示例 2: 订单处理 - 自动回滚
// ============================================

/**
 * 场景：处理订单时需要扣减库存、创建订单记录、更新用户积分
 * 任何一步失败都应该回滚所有操作
 */
async function example2_OrderProcessing() {
  console.log('=== 示例 2: 订单处理 (自动回滚) ===\n');

  const uow = createUnitOfWork({
    name: 'OrderProcessing',
    autoRollback: true,
    beforeCommit: async (changes) => {
      console.log(`📋 准备提交 ${changes.length} 项变更...`);
    },
    afterCommit: async (changes) => {
      console.log(`✅ 成功提交 ${changes.length} 项变更`);
    },
    afterRollback: async (changes) => {
      console.log(`🔄 已回滚 ${changes.length} 项变更`);
    },
  });

  try {
    // 1. 创建订单
    uow.registerNew('orders', 'order_20260313_001', {
      orderId: 'order_20260313_001',
      userId: 'user_001',
      items: [
        { productId: 'prod_001', quantity: 2, price: 50 },
        { productId: 'prod_002', quantity: 1, price: 30 },
      ],
      total: 130,
      status: 'pending',
      createdAt: Date.now(),
    });

    // 2. 扣减库存
    uow.registerUpdate('inventory', 'prod_001',
      { productId: 'prod_001', quantity: 100 },
      { productId: 'prod_001', quantity: 98 }
    );
    uow.registerUpdate('inventory', 'prod_002',
      { productId: 'prod_002', quantity: 50 },
      { productId: 'prod_002', quantity: 49 }
    );

    // 3. 更新用户积分
    uow.registerUpdate('user_points', 'user_001',
      { userId: 'user_001', points: 1000 },
      { userId: 'user_001', points: 1130 } // 消费 130 元获得 130 积分
    );

    // 4. 模拟业务验证失败
    const shouldFail = true; // 模拟库存不足或其他业务规则失败
    if (shouldFail) {
      throw new Error('库存不足：prod_001 仅剩 1 件，但需要 2 件');
    }

    // 5. 提交事务
    await uow.commit();

    console.log('✅ 订单处理成功');
  } catch (error) {
    console.log('❌ 订单处理失败:', (error as Error).message);
    console.log('当前状态:', uow.state);
  }
  console.log('');
}

// ============================================
// 示例 3: 转账操作 - 使用事务装饰器
// ============================================

/**
 * 场景：账户转账需要保证原子性
 * 使用事务装饰器自动管理事务生命周期
 */
async function example3_MoneyTransfer() {
  console.log('=== 示例 3: 转账操作 (事务装饰器) ===\n');

  // 定义带事务的转账函数
  const transferMoney = withTransaction(
    async (
      fromId: string, 
      toId: string, 
      amount: number, 
      uow: UnitOfWork
    ) => {
      console.log(`💰 准备转账：${fromId} -> ${toId}, 金额：${amount}`);

      // 1. 获取账户余额 (实际应从数据库读取)
      const fromAccount = { id: fromId, balance: 1000 };
      const toAccount = { id: toId, balance: 500 };

      // 2. 验证余额
      if (fromAccount.balance < amount) {
        throw new Error('余额不足');
      }

      // 3. 扣款
      uow.registerUpdate('accounts', fromId,
        fromAccount,
        { ...fromAccount, balance: fromAccount.balance - amount }
      );

      // 4. 收款
      uow.registerUpdate('accounts', toId,
        toAccount,
        { ...toAccount, balance: toAccount.balance + amount }
      );

      // 5. 记录交易日志
      uow.registerNew('transactions', `tx_${Date.now()}`, {
        id: `tx_${Date.now()}`,
        fromId,
        toId,
        amount,
        type: 'transfer',
        timestamp: Date.now(),
        status: 'pending',
      });

      console.log('✅ 转账变更已注册');
    },
    { 
      name: 'MoneyTransfer',
      autoRollback: true,
    }
  );

  try {
    // 执行转账
    await transferMoney('account_001', 'account_002', 100);
    console.log('✅ 转账成功');
  } catch (error) {
    console.log('❌ 转账失败:', (error as Error).message);
  }
  console.log('');
}

// ============================================
// 示例 4: 变更验证 - 业务规则检查
// ============================================

/**
 * 场景：实现自定义变更验证逻辑
 * 确保所有变更符合业务规则
 */
async function example4_ChangeValidation() {
  console.log('=== 示例 4: 变更验证 ===\n');

  const uow = createUnitOfWork({
    name: 'ValidatedTransaction',
    validateChange: (change) => {
      // 规则 1: 不允许删除关键数据表
      if (change.type === ChangeType.DELETE && change.entityType === 'audit_logs') {
        return '禁止删除审计日志';
      }

      // 规则 2: 更新操作必须提供原始数据
      if (change.type === ChangeType.UPDATE && !change.originalData) {
        return '更新操作必须提供原始数据';
      }

      // 规则 3: 创建操作必须包含必需字段
      if (change.type === ChangeType.CREATE) {
        if (change.entityType === 'users' && !change.newData?.email) {
          return '创建用户必须提供邮箱';
        }
      }

      // 规则 4: 金额变更不能超过限制
      if (change.entityType === 'accounts') {
        const amount = Math.abs(
          (change.newData as any)?.balance - (change.originalData as any)?.balance || 0
        );
        if (amount > 10000) {
          return '单笔交易金额不能超过 10000';
        }
      }

      return true;
    },
  });

  // 测试 1: 尝试删除审计日志 (应该失败)
  try {
    uow.registerDelete('audit_logs', 'log_001', { id: 'log_001' });
    console.log('❌ 验证失败：应该阻止删除审计日志');
  } catch (error) {
    console.log('✅ 正确阻止：', (error as Error).message);
  }

  // 测试 2: 创建用户缺少邮箱 (应该失败)
  try {
    uow.registerNew('users', 'user_002', {
      id: 'user_002',
      username: 'bob',
      // 缺少 email
    } as any);
    console.log('❌ 验证失败：应该阻止创建无邮箱用户');
  } catch (error) {
    console.log('✅ 正确阻止：', (error as Error).message);
  }

  // 测试 3: 合法操作 (应该成功)
  try {
    uow.registerNew('users', 'user_003', {
      id: 'user_003',
      username: 'charlie',
      email: 'charlie@example.com',
    });
    console.log('✅ 合法操作通过验证');
  } catch (error) {
    console.log('❌ 错误阻止了合法操作:', (error as Error).message);
  }

  console.log('');
}

// ============================================
// 示例 5: 嵌套事务 - 使用快照
// ============================================

/**
 * 场景：复杂业务流程中需要部分回滚
 * 使用快照实现嵌套事务效果
 */
async function example5_NestedTransaction() {
  console.log('=== 示例 5: 嵌套事务 (快照) ===\n');

  const uow = createUnitOfWork({ name: 'NestedTransaction' });

  // 外层事务：创建项目
  uow.registerNew('projects', 'proj_001', {
    id: 'proj_001',
    name: '主项目',
    status: 'active',
  });

  console.log('📁 创建项目: proj_001');

  // 创建快照
  const snapshotId = uow.createSnapshot();
  console.log('📸 创建快照:', snapshotId);

  // 内层事务 1: 添加任务组
  try {
    uow.registerNew('task_groups', 'group_001', {
      id: 'group_001',
      projectId: 'proj_001',
      name: '任务组 1',
    });
    uow.registerNew('tasks', 'task_001', {
      id: 'task_001',
      groupId: 'group_001',
      title: '任务 1',
    });
    console.log('✅ 任务组 1 创建成功');

    // 模拟失败
    throw new Error('任务组 1 验证失败');
  } catch (error) {
    console.log('❌ 任务组 1 失败，回滚到快照:', (error as Error).message);
    uow.restoreSnapshot(snapshotId);
  }

  // 内层事务 2: 添加另一个任务组
  try {
    uow.registerNew('task_groups', 'group_002', {
      id: 'group_002',
      projectId: 'proj_001',
      name: '任务组 2',
    });
    uow.registerNew('tasks', 'task_002', {
      id: 'task_002',
      groupId: 'group_002',
      title: '任务 2',
    });
    console.log('✅ 任务组 2 创建成功');
  } catch (error) {
    console.log('❌ 任务组 2 失败:', (error as Error).message);
  }

  // 提交外层事务
  await uow.commit();

  console.log('✅ 项目创建完成');
  console.log('最终统计:', uow.getStats());
  console.log('');
}

// ============================================
// 示例 6: 批量操作 - 数据导入
// ============================================

/**
 * 场景：批量导入数据时需要保证一致性
 */
async function example6_BatchImport() {
  console.log('=== 示例 6: 批量数据导入 ===\n');

  const uow = createUnitOfWork({
    name: 'BatchImport',
    autoRollback: true,
  });

  const products = [
    { id: 'prod_001', name: '产品 A', price: 100, stock: 50 },
    { id: 'prod_002', name: '产品 B', price: 200, stock: 30 },
    { id: 'prod_003', name: '产品 C', price: 150, stock: 40 },
  ];

  try {
    // 批量注册产品
    products.forEach((product, index) => {
      uow.registerNew('products', product.id, {
        ...product,
        createdAt: Date.now(),
        category: 'default',
      });

      // 同时创建库存记录
      uow.registerNew('inventory', product.id, {
        productId: product.id,
        quantity: product.stock,
        warehouse: 'main',
      });

      console.log(`📦 注册产品 ${index + 1}/${products.length}: ${product.name}`);
    });

    // 提交所有变更
    await uow.commit();

    console.log('✅ 批量导入成功');
    console.log('统计:', uow.getStats());
  } catch (error) {
    console.log('❌ 批量导入失败:', (error as Error).message);
    console.log('所有变更已回滚');
  }
  console.log('');
}

// ============================================
// 示例 7: 状态查询与监控
// ============================================

/**
 * 场景：监控工作单元状态和变更历史
 */
async function example7_StateMonitoring() {
  console.log('=== 示例 7: 状态监控 ===\n');

  const uow = createUnitOfWork({ name: 'MonitoredTransaction' });

  console.log('初始状态:', uow.state);
  console.log('初始统计:', uow.getStats());
  console.log('');

  // 执行一些操作
  uow.registerNew('entity1', 'e1', { name: 'Entity 1' });
  console.log('操作后状态:', uow.state);
  console.log('操作后统计:', uow.getStats());
  console.log('');

  uow.registerUpdate('entity2', 'e2', { val: 1 }, { val: 2 });
  uow.registerDelete('entity3', 'e3', { val: 3 });
  console.log('更多操作后统计:', uow.getStats());
  console.log('');

  // 查看所有变更
  const changes = uow.getChanges();
  console.log('变更历史:');
  changes.forEach((change, i) => {
    console.log(`  ${i + 1}. [${change.type}] ${change.entityType}:${change.entityId}`);
  });
  console.log('');

  // 提交
  await uow.commit();
  console.log('提交后状态:', uow.state);
  console.log('');
}

// ============================================
// 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   工作单元技能使用示例 - KAEL          ║');
  console.log('╚════════════════════════════════════════╝\n');

  await example1_UserRegistration();
  await example2_OrderProcessing();
  await example3_MoneyTransfer();
  await example4_ChangeValidation();
  await example5_NestedTransaction();
  await example6_BatchImport();
  await example7_StateMonitoring();

  console.log('╔════════════════════════════════════════╗');
  console.log('║   所有示例运行完成                     ║');
  console.log('╚════════════════════════════════════════╝');
}

// 如果直接运行此文件
if (typeof require !== 'undefined' && require.main === module) {
  runAllExamples();
}

// 导出所有示例函数
export {
  example1_UserRegistration,
  example2_OrderProcessing,
  example3_MoneyTransfer,
  example4_ChangeValidation,
  example5_NestedTransaction,
  example6_BatchImport,
  example7_StateMonitoring,
  runAllExamples,
};
