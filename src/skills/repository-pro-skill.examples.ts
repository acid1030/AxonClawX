/**
 * Repository Pro Skill - 使用示例
 * 
 * 演示仓储模式的完整用法
 */

import { 
  MemoryRepository, 
  FileSystemRepository, 
  BaseEntity 
} from './repository-pro-skill';

// ============== 示例 1: 基础 CRUD 操作 ==============

interface Product extends BaseEntity {
  name: string;
  price: number;
  category: string;
  stock: number;
}

async function example1_BasicCRUD() {
  console.log('=== 示例 1: 基础 CRUD 操作 ===\n');

  // 创建仓储
  const productRepo = new MemoryRepository<Product>();

  // 创建
  const product = await productRepo.create({
    name: 'MacBook Pro',
    price: 14999,
    category: 'electronics',
    stock: 50,
  });
  console.log('Created:', product);

  // 查找
  const found = await productRepo.findById(product.id);
  console.log('Found:', found);

  // 更新
  await productRepo.update(product.id, { stock: 45, price: 13999 });
  console.log('Updated: stock=45, price=13999');

  // 删除
  const deleted = await productRepo.delete(product.id);
  console.log('Deleted:', deleted);
}

// ============== 示例 2: 查询构建器 ==============

async function example2_QueryBuilder() {
  console.log('\n=== 示例 2: 查询构建器 ===\n');

  const productRepo = new MemoryRepository<Product>();

  // 准备测试数据
  await productRepo.create({ name: 'iPhone', price: 7999, category: 'electronics', stock: 100 });
  await productRepo.create({ name: 'iPad', price: 5999, category: 'electronics', stock: 80 });
  await productRepo.create({ name: 'Desk Chair', price: 1299, category: 'furniture', stock: 30 });
  await productRepo.create({ name: 'Standing Desk', price: 3999, category: 'furniture', stock: 20 });

  // 链式查询 - 查找所有电子产品
  const electronics = await productRepo.query()
    .where({ category: 'electronics' })
    .orderBy('price', 'desc')
    .execute();
  
  console.log('Electronics (sorted by price desc):');
  electronics.forEach(p => console.log(`  - ${p.name}: ¥${p.price}`));

  // 查找价格低于 5000 的商品
  const cheapProducts = await productRepo.query()
    .where({ category: 'furniture' })
    .where({ stock: 30 })
    .limit(5)
    .execute();
  
  console.log('\nFurniture with stock=30:');
  cheapProducts.forEach(p => console.log(`  - ${p.name}`));

  // 计数
  const count = await productRepo.query()
    .where({ category: 'electronics' })
    .count();
  
  console.log(`\nElectronics count: ${count}`);
}

// ============== 示例 3: 事件监听 ==============

async function example3_Events() {
  console.log('\n=== 示例 3: 事件监听 ===\n');

  const productRepo = new MemoryRepository<Product>();

  // 注册事件监听器
  productRepo.on('create', (product) => {
    console.log(`[CREATE] ${product.name} - Stock: ${product.stock}`);
  });

  productRepo.on('update', (product) => {
    console.log(`[UPDATE] ${product.name} - Updated at: ${new Date(product.updatedAt).toLocaleString()}`);
  });

  productRepo.on('delete', (product) => {
    console.log(`[DELETE] ${product.name} - Removed from inventory`);
  });

  // 触发事件
  const product = await productRepo.create({
    name: 'Monitor',
    price: 2999,
    category: 'electronics',
    stock: 25,
  });

  await productRepo.update(product.id, { stock: 20 });
  await productRepo.delete(product.id);
}

// ============== 示例 4: 文件系统持久化 ==============

async function example4_FileSystem() {
  console.log('\n=== 示例 4: 文件系统持久化 ===\n');

  interface Order extends BaseEntity {
    orderId: string;
    customerId: string;
    total: number;
    status: 'pending' | 'paid' | 'shipped' | 'delivered';
  }

  // 创建文件系统仓储 (数据保存到 ./data/orders.json)
  const orderRepo = new FileSystemRepository<Order>('orders', {
    backend: 'filesystem',
    dataPath: './data',
    enableLogging: true,
  });

  // 创建订单
  const order = await orderRepo.create({
    orderId: 'ORD-20260313-001',
    customerId: 'CUST-001',
    total: 15999,
    status: 'pending',
  });

  console.log('Order created:', order.orderId);

  // 更新订单状态
  await orderRepo.update(order.id, { status: 'paid' });
  console.log('Order status updated to: paid');

  // 查找订单
  const found = await orderRepo.findOne({ orderId: 'ORD-20260313-001' });
  console.log('Found order:', found?.orderId, 'Status:', found?.status);

  // 统计
  const count = await orderRepo.count();
  console.log('Total orders:', count);
}

// ============== 示例 5: 复杂查询场景 ==============

interface Article extends BaseEntity {
  title: string;
  author: string;
  tags: string[];
  views: number;
  published: boolean;
}

async function example5_AdvancedQueries() {
  console.log('\n=== 示例 5: 复杂查询场景 ===\n');

  const articleRepo = new MemoryRepository<Article>();

  // 准备数据
  const articles = [
    { title: 'TypeScript Best Practices', author: 'Alice', tags: ['typescript', 'programming'], views: 1500, published: true },
    { title: 'React Hooks Guide', author: 'Bob', tags: ['react', 'frontend'], views: 2300, published: true },
    { title: 'Node.js Performance', author: 'Alice', tags: ['nodejs', 'backend'], views: 1800, published: true },
    { title: 'CSS Grid Tutorial', author: 'Charlie', tags: ['css', 'frontend'], views: 900, published: false },
    { title: 'Database Design', author: 'Bob', tags: ['database', 'backend'], views: 1200, published: true },
  ];

  for (const article of articles) {
    await articleRepo.create(article);
  }

  // 查询 Alice 发布的所有文章
  const aliceArticles = await articleRepo.query()
    .where({ author: 'Alice', published: true })
    .orderBy('views', 'desc')
    .execute();
  
  console.log("Alice's published articles:");
  aliceArticles.forEach(a => console.log(`  - ${a.title} (${a.views} views)`));

  // 查询最热门的前 3 篇文章
  const topArticles = await articleRepo.query()
    .where({ published: true })
    .orderBy('views', 'desc')
    .limit(3)
    .execute();
  
  console.log('\nTop 3 articles:');
  topArticles.forEach((a, i) => console.log(`  ${i + 1}. ${a.title} - ${a.views} views`));

  // 统计未发布的文章
  const draftCount = await articleRepo.query()
    .where({ published: false })
    .count();
  
  console.log(`\nDraft articles: ${draftCount}`);
}

// ============== 示例 6: 仓储模式最佳实践 ==============

async function example6_BestPractices() {
  console.log('\n=== 示例 6: 最佳实践 ===\n');

  // 1. 为特定实体创建专用仓储
  class UserRepository extends MemoryRepository<User> {
    async findByEmail(email: string) {
      return this.findOne({ email } as any);
    }

    async findActiveUsers() {
      return this.query()
        .where({ isActive: true } as any)
        .execute();
    }

    async deactivateUser(id: string) {
      return this.update(id, { isActive: false } as any);
    }
  }

  interface User extends BaseEntity {
    username: string;
    email: string;
    isActive: boolean;
  }

  const userRepo = new UserRepository();

  // 创建用户
  await userRepo.create({ username: 'john', email: 'john@example.com', isActive: true });
  await userRepo.create({ username: 'jane', email: 'jane@example.com', isActive: true });

  // 使用专用方法
  const john = await userRepo.findByEmail('john@example.com');
  console.log('Found by email:', john?.username);

  const activeUsers = await userRepo.findActiveUsers();
  console.log('Active users:', activeUsers.map(u => u.username).join(', '));

  // 2. 事务性操作 (手动实现)
  async function transferStock(fromId: string, toId: string, amount: number) {
    const fromProduct = await productRepo.findById(fromId);
    const toProduct = await productRepo.findById(toId);

    if (!fromProduct || !toProduct || fromProduct.stock < amount) {
      throw new Error('Invalid transfer');
    }

    await productRepo.update(fromId, { stock: fromProduct.stock - amount });
    await productRepo.update(toId, { stock: toProduct.stock + amount });
    
    console.log(`Transferred ${amount} from ${fromId} to ${toId}`);
  }

  interface Product extends BaseEntity {
    name: string;
    stock: number;
  }

  const productRepo = new MemoryRepository<Product>();
  const p1 = await productRepo.create({ name: 'Product A', stock: 100 });
  const p2 = await productRepo.create({ name: 'Product B', stock: 50 });

  await transferStock(p1.id, p2.id, 10);
}

// ============== 运行所有示例 ==============

async function runAllExamples() {
  try {
    await example1_BasicCRUD();
    await example2_QueryBuilder();
    await example3_Events();
    await example4_FileSystem();
    await example5_AdvancedQueries();
    await example6_BestPractices();
    
    console.log('\n✅ All examples completed!\n');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// 导出示例函数
export {
  example1_BasicCRUD,
  example2_QueryBuilder,
  example3_Events,
  example4_FileSystem,
  example5_AdvancedQueries,
  example6_BestPractices,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
