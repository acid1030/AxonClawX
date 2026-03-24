/**
 * Repository Pattern Skill - 使用示例
 * KAEL 数据仓储模式实战演示
 */

import {
  FilePersistenceProvider,
  UserRepository,
  TaskRepository,
  QueryBuilder,
  User,
  Task,
} from './repository-pattern-skill';

// ==================== 示例 1: 基础 CRUD 操作 ====================

async function example1_BasicCRUD() {
  console.log('=== 示例 1: 基础 CRUD 操作 ===\n');

  // 初始化存储提供者
  const provider = new FilePersistenceProvider('./data');

  // 创建用户仓储
  const userRepository = new UserRepository(provider);

  // 创建用户
  const user = await userRepository.create({
    name: '张三',
    email: 'zhangsan@example.com',
    age: 28,
    role: 'admin',
  });
  console.log('创建用户:', user);

  // 查询用户
  const foundUser = await userRepository.findById(user.id);
  console.log('查找用户:', foundUser);

  // 更新用户
  const updatedUser = await userRepository.update(user.id, { age: 29 });
  console.log('更新用户:', updatedUser);

  // 获取所有用户
  const allUsers = await userRepository.findAll();
  console.log('所有用户数量:', allUsers.length);

  // 统计管理员数量
  const adminCount = await userRepository.count({
    conditions: [{ field: 'role', operator: '=', value: 'admin' }],
  });
  console.log('管理员数量:', adminCount);

  // 删除用户
  const deleted = await userRepository.delete(user.id);
  console.log('删除成功:', deleted);
}

// ==================== 示例 2: 查询构建器 ====================

async function example2_QueryBuilder() {
  console.log('\n=== 示例 2: 查询构建器 ===\n');

  const provider = new FilePersistenceProvider('./data');
  const userRepository = new UserRepository(provider);

  // 创建测试数据
  await userRepository.create({ name: '用户 A', email: 'a@example.com', age: 25, role: 'user' });
  await userRepository.create({ name: '用户 B', email: 'b@example.com', age: 30, role: 'admin' });
  await userRepository.create({ name: '用户 C', email: 'c@example.com', age: 35, role: 'user' });
  await userRepository.create({ name: '用户 D', email: 'd@example.com', age: 40, role: 'admin' });

  // 使用查询构建器
  const query = new QueryBuilder<User>()
    .where('age', '>', 28)
    .where('role', '=', 'admin')
    .orderBy('age', 'desc')
    .limit(10)
    .build();

  const results = await userRepository.findAll(query);
  console.log('查询结果 (年龄>28 的管理员):', results);

  // 链式查询
  const youngUsers = await userRepository
    .query()
    .lessThan('age', 35)
    .orderBy('name', 'asc')
    .build()
    .then(q => userRepository.findAll(q));

  console.log('年轻用户 (年龄<35):', youngUsers);
}

// ==================== 示例 3: 任务管理 ====================

async function example3_TaskManagement() {
  console.log('\n=== 示例 3: 任务管理 ===\n');

  const provider = new FilePersistenceProvider('./data');
  const taskRepository = new TaskRepository(provider);

  // 创建任务
  const task1 = await taskRepository.create({
    title: '完成仓储模式实现',
    description: '实现 Repository Pattern 技能',
    status: 'in_progress',
    assigneeId: 'user-001',
    priority: 'high',
  });

  const task2 = await taskRepository.create({
    title: '编写单元测试',
    description: '为仓储层编写测试用例',
    status: 'pending',
    assigneeId: 'user-002',
    priority: 'medium',
  });

  const task3 = await taskRepository.create({
    title: '文档更新',
    description: '更新 API 文档',
    status: 'pending',
    assigneeId: 'user-001',
    priority: 'low',
  });

  console.log('创建任务:', task1.title);

  // 查询高优先级任务
  const highPriorityTasks = await taskRepository.findHighPriority();
  console.log('高优先级任务:', highPriorityTasks.map(t => t.title));

  // 查询待办任务
  const pendingTasks = await taskRepository.findByStatus('pending');
  console.log('待办任务数量:', pendingTasks.length);

  // 查询用户的任务
  const userTasks = await taskRepository.findByAssignee('user-001');
  console.log('用户 001 的任务:', userTasks.map(t => t.title));

  // 更新任务状态
  await taskRepository.update(task1.id, { status: 'completed' });
  console.log('任务 1 已完成');

  // 复杂查询：高优先级且待办的任务
  const urgentTasks = await taskRepository.findAll({
    conditions: [
      { field: 'priority', operator: '=', value: 'high' },
      { field: 'status', operator: '=', value: 'pending' },
    ],
    orderBy: { field: 'createdAt', direction: 'desc' },
  });
  console.log('紧急待办任务:', urgentTasks.length);
}

// ==================== 示例 4: 自定义仓储 ====================

async function example4_CustomRepository() {
  console.log('\n=== 示例 4: 自定义仓储 ===\n');

  const provider = new FilePersistenceProvider('./data');

  // 定义产品实体
  interface Product extends import('./repository-pattern-skill').Entity {
    name: string;
    price: number;
    category: string;
    stock: number;
  }

  // 创建产品仓储
  class ProductRepository extends import('./repository-pattern-skill').BaseRepository<Product> {
    constructor(provider: import('./repository-pattern-skill').IPersistenceProvider) {
      super(provider, 'products');
    }

    async findByCategory(category: string): Promise<Product[]> {
      return await this.provider.query<Product>(this.collectionName, {
        conditions: [{ field: 'category', operator: '=', value: category }],
      });
    }

    async findLowStock(threshold: number = 10): Promise<Product[]> {
      return await this.provider.query<Product>(this.collectionName, {
        conditions: [{ field: 'stock', operator: '<=', value: threshold }],
        orderBy: { field: 'stock', direction: 'asc' },
      });
    }

    async findInRange(minPrice: number, maxPrice: number): Promise<Product[]> {
      return await this.provider.query<Product>(this.collectionName, {
        conditions: [
          { field: 'price', operator: '>=', value: minPrice },
          { field: 'price', operator: '<=', value: maxPrice },
        ],
        orderBy: { field: 'price', direction: 'asc' },
      });
    }
  }

  const productRepository = new ProductRepository(provider);

  // 创建产品
  await productRepository.create({
    name: '笔记本电脑',
    price: 8999,
    category: 'electronics',
    stock: 50,
  });

  await productRepository.create({
    name: '鼠标',
    price: 199,
    category: 'electronics',
    stock: 5,
  });

  await productRepository.create({
    name: '键盘',
    price: 599,
    category: 'electronics',
    stock: 8,
  });

  // 查询电子产品
  const electronics = await productRepository.findByCategory('electronics');
  console.log('电子产品:', electronics.map(p => p.name));

  // 查询低库存商品
  const lowStock = await productRepository.findLowStock(10);
  console.log('低库存商品:', lowStock.map(p => `${p.name} (库存:${p.stock})`));

  // 查询价格区间
  const inRange = await productRepository.findInRange(100, 1000);
  console.log('价格 100-1000 元:', inRange.map(p => `${p.name} (${p.price}元)`));
}

// ==================== 示例 5: 事务处理 ====================

async function example5_Transaction() {
  console.log('\n=== 示例 5: 事务处理 ===\n');

  const provider = new FilePersistenceProvider('./data');
  const userRepository = new UserRepository(provider);
  const taskRepository = new TaskRepository(provider);

  // 模拟事务：创建用户并分配任务
  try {
    // 创建用户
    const user = await userRepository.create({
      name: '李四',
      email: 'lisi@example.com',
      age: 30,
      role: 'user',
    });

    // 为用户创建任务
    const task = await taskRepository.create({
      title: '新用户任务',
      description: '欢迎加入团队',
      status: 'pending',
      assigneeId: user.id,
      priority: 'medium',
    });

    console.log('事务成功：用户和任务已创建');
    console.log('用户:', user.name);
    console.log('任务:', task.title);
  } catch (error) {
    console.error('事务失败:', error);
    // 在实际应用中，这里应该回滚操作
  }
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('🚀 Repository Pattern Skill - 使用示例\n');
  console.log('='.repeat(50));

  try {
    await example1_BasicCRUD();
    await example2_QueryBuilder();
    await example3_TaskManagement();
    await example4_CustomRepository();
    await example5_Transaction();

    console.log('\n' + '='.repeat(50));
    console.log('✅ 所有示例执行完成!');
  } catch (error) {
    console.error('❌ 执行错误:', error);
  }
}

// 导出示例函数供单独调用
export {
  example1_BasicCRUD,
  example2_QueryBuilder,
  example3_TaskManagement,
  example4_CustomRepository,
  example5_Transaction,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
