/**
 * Builder Pattern Skill - 使用示例
 * 
 * 展示如何使用 ACE (Advanced Constructor Engine) 进行复杂对象构建
 */

import {
  UserBuilder,
  ApiResponseBuilder,
  AppConfigBuilder,
  StepBuilder,
  User,
  ApiResponse,
  AppConfig,
} from './builder-pattern-skill';

// ============================================================================
// 示例 1: 基础链式构建
// ============================================================================

console.log('=== 示例 1: 基础链式构建 ===\n');

const user: User = new UserBuilder({ strict: true })
  .setName('张三')
  .setEmail('zhangsan@example.com')
  .setAge(28)
  .setRole('admin')
  .build();

console.log('构建的用户:', JSON.stringify(user, null, 2));
// 输出:
// {
//   "id": "user_1710334800000",
//   "name": "张三",
//   "email": "zhangsan@example.com",
//   "age": 28,
//   "role": "admin",
//   "createdAt": "2026-03-13T12:00:00.000Z",
//   "metadata": undefined
// }

// ============================================================================
// 示例 2: 批量设置字段
// ============================================================================

console.log('\n=== 示例 2: 批量设置字段 ===\n');

const user2: User = new UserBuilder()
  .setAll({
    name: '李四',
    email: 'lisi@example.com',
    age: 30,
    role: 'user',
    metadata: { department: '产品部' },
  })
  .build();

console.log('批量构建的用户:', JSON.stringify(user2, null, 2));

// ============================================================================
// 示例 3: API 响应构建
// ============================================================================

console.log('\n=== 示例 3: API 响应构建 ===\n');

interface UserData {
  id: string;
  name: string;
}

const successResponse: ApiResponse<UserData> = new ApiResponseBuilder<UserData>()
  .setSuccess(true)
  .setData({ id: 'user_123', name: '王五' })
  .setCode(200)
  .build();

console.log('成功响应:', JSON.stringify(successResponse, null, 2));

const errorResponse: ApiResponse<null> = new ApiResponseBuilder<null>()
  .setSuccess(false)
  .setError('用户不存在')
  .setCode(404)
  .build();

console.log('错误响应:', JSON.stringify(errorResponse, null, 2));

// ============================================================================
// 示例 4: 应用配置构建
// ============================================================================

console.log('\n=== 示例 4: 应用配置构建 ===\n');

const config: AppConfig = new AppConfigBuilder({ strict: true })
  .setName('MyApplication')
  .setVersion('2.0.0')
  .setPort(8080)
  .setHost('0.0.0.0')
  .setDebug(process.env.NODE_ENV !== 'production')
  .addFeature('authentication')
  .addFeature('authorization')
  .addFeature('rate-limiting')
  .addFeature('logging')
  .setDatabase({
    host: 'db.example.com',
    port: 5432,
    name: 'myapp_production',
  })
  .build();

console.log('应用配置:', JSON.stringify(config, null, 2));

// ============================================================================
// 示例 5: 分步构建 - 手动控制步骤
// ============================================================================

console.log('\n=== 示例 5: 分步构建 - 手动控制 ===\n');

async function exampleManualSteps() {
  const builder = new StepBuilder()
    .withData({ orderId: 'order_001' })
    .addStep('validate-order', async (data) => {
      console.log('  → 验证订单...');
      // 模拟验证逻辑
      return { validated: true };
    })
    .addStep('calculate-total', async (data) => {
      console.log('  → 计算总价...');
      // 模拟计算逻辑
      return { total: 299.99, currency: 'CNY' };
    })
    .addStep('apply-discount', async (data) => {
      console.log('  → 应用折扣...');
      // 模拟折扣逻辑
      return { discount: 30, finalTotal: 269.99 };
    })
    .addStep('create-payment', async (data) => {
      console.log('  → 创建支付...');
      // 模拟支付创建
      return { paymentId: 'pay_123', status: 'pending' };
    });

  // 逐步执行
  let result;
  do {
    result = await builder.next();
    console.log('  进度:', builder.getProgress());
  } while (!result.done);

  console.log('最终结果:', JSON.stringify(await builder.executeAll(), null, 2));
}

// exampleManualSteps();

// ============================================================================
// 示例 6: 分步构建 - 自动执行所有步骤
// ============================================================================

console.log('\n=== 示例 6: 分步构建 - 自动执行 ===\n');

async function exampleAutoSteps() {
  const builder = new StepBuilder()
    .withData({ userId: 'user_456' })
    .addStep('load-profile', async (data) => {
      // 模拟从数据库加载
      return { profile: { name: '赵六', email: 'zhaoliu@example.com' } };
    })
    .addStep('load-preferences', async (data) => {
      // 模拟加载偏好设置
      return { preferences: { theme: 'dark', notifications: true } };
    })
    .addStep('load-permissions', async (data) => {
      // 模拟加载权限
      return { permissions: ['read', 'write'] };
    });

  const result = await builder.executeAll();
  console.log('完整用户数据:', JSON.stringify(result, null, 2));
  console.log('构建进度:', builder.getProgress());
}

// exampleAutoSteps();

// ============================================================================
// 示例 7: 带验证的构建
// ============================================================================

console.log('\n=== 示例 7: 带验证的构建 ===\n');

try {
  const validUser = new UserBuilder({ 
    strict: true,
    autoValidate: true,
  })
    .setName('钱七')
    .setEmail('qianqi@example.com')
    .setAge(35)
    .setRole('user')
    .build();

  console.log('✓ 验证通过，用户创建成功:', validUser.name);
} catch (error) {
  console.error('✗ 验证失败:', (error as Error).message);
}

// 测试验证失败
try {
  const invalidUser = new UserBuilder({ 
    strict: true,
    autoValidate: true,
  })
    .setName('') // 名字为空，违反 minLength 规则
    .setEmail('invalid-email') // 邮箱格式错误
    .setRole('user')
    .build();
} catch (error) {
  console.log('✓ 正确捕获验证错误:', (error as Error).message);
}

// ============================================================================
// 示例 8: 自定义验证回调
// ============================================================================

console.log('\n=== 示例 8: 自定义验证回调 ===\n');

try {
  const userWithCustomValidation = new UserBuilder({
    strict: true,
    onValidate: (data) => {
      // 自定义验证：年龄必须大于 18 岁
      if (data.age && data.age < 18) {
        console.log('  → 自定义验证：年龄必须大于 18 岁');
        return false;
      }
      // 自定义验证：管理员邮箱必须是公司邮箱
      if (data.role === 'admin' && !data.email.includes('@company.com')) {
        console.log('  → 自定义验证：管理员必须使用公司邮箱');
        return false;
      }
      return true;
    },
  })
    .setName('孙八')
    .setEmail('sunba@company.com')
    .setAge(25)
    .setRole('admin')
    .build();

  console.log('✓ 自定义验证通过');
} catch (error) {
  console.error('✗ 自定义验证失败:', (error as Error).message);
}

// ============================================================================
// 示例 9: 构建完成回调
// ============================================================================

console.log('\n=== 示例 9: 构建完成回调 ===\n');

const userWithCallback = new UserBuilder({
  onComplete: (result) => {
    console.log('  → [回调] 用户已创建:', result.id);
    console.log('  → [回调] 发送到数据库...');
    console.log('  → [回调] 发送欢迎邮件...');
  },
})
  .setName('周九')
  .setEmail('zhoujiu@example.com')
  .setRole('user')
  .build();

// ============================================================================
// 示例 10: 构建器克隆
// ============================================================================

console.log('\n=== 示例 10: 构建器克隆 ===\n');

// 创建基础构建器模板
const baseUserBuilder = new UserBuilder()
  .setRole('user')
  .setMetadata({ source: 'web', campaign: '2026-spring' });

// 基于模板克隆多个用户
const users = [
  baseUserBuilder.clone()
    .setName('用户 A')
    .setEmail('userA@example.com')
    .build(),
  baseUserBuilder.clone()
    .setName('用户 B')
    .setEmail('userB@example.com')
    .build(),
  baseUserBuilder.clone()
    .setName('用户 C')
    .setEmail('userC@example.com')
    .build(),
];

console.log('批量创建的用户:');
users.forEach((u, i) => {
  console.log(`  ${i + 1}. ${u.name} (${u.email})`);
});

// ============================================================================
// 示例 11: 构建器重置
// ============================================================================

console.log('\n=== 示例 11: 构建器重置 ===\n');

const reusableBuilder = new UserBuilder();

const user1 = reusableBuilder
  .setName('第一个用户')
  .setEmail('first@example.com')
  .setRole('user')
  .build();

console.log('第一个用户:', user1.name);

// 重置后重复使用
const user2 = reusableBuilder
  .reset()
  .setName('第二个用户')
  .setEmail('second@example.com')
  .setRole('admin')
  .build();

console.log('第二个用户:', user2.name);

// ============================================================================
// 示例 12: 非严格模式 - 带警告的构建
// ============================================================================

console.log('\n=== 示例 12: 非严格模式 ===\n');

const userNonStrict = new UserBuilder({
  strict: false, // 非严格模式
  autoValidate: true,
})
  .setName('吴十')
  .setEmail('wushi@example.com')
  .setAge(200) // 超出范围，但不会抛出错误
  .setRole('user')
  .build();

console.log('非严格模式下构建成功 (带警告):', userNonStrict.name);

// ============================================================================
// 示例 13: 实际业务场景 - 订单创建
// ============================================================================

console.log('\n=== 示例 13: 业务场景 - 订单创建 ===\n');

interface Order {
  orderId: string;
  customerId: string;
  items: Array<{ productId: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
  shippingAddress: {
    street: string;
    city: string;
    zipCode: string;
    country: string;
  };
  createdAt: Date;
}

class OrderBuilder extends UserBuilder as any {
  // 这里应该继承 BaseBuilder，为了示例简化直接写
  private orderData: Partial<Order> = {};

  setOrderId(id: string) {
    this.orderData.orderId = id;
    return this;
  }

  setCustomerId(id: string) {
    this.orderData.customerId = id;
    return this;
  }

  addItem(productId: string, quantity: number, price: number) {
    if (!this.orderData.items) {
      this.orderData.items = [];
    }
    this.orderData.items.push({ productId, quantity, price });
    return this;
  }

  setShippingAddress(address: Order['shippingAddress']) {
    this.orderData.shippingAddress = address;
    return this;
  }

  buildOrder(): Order {
    const items = this.orderData.items || [];
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = subtotal * 0.1; // 10% 税率

    return {
      orderId: this.orderData.orderId || `order_${Date.now()}`,
      customerId: this.orderData.customerId!,
      items,
      subtotal,
      tax,
      total: subtotal + tax,
      status: 'pending',
      shippingAddress: this.orderData.shippingAddress!,
      createdAt: new Date(),
    };
  }
}

// 使用订单构建器
const order = new OrderBuilder()
  .setCustomerId('customer_789')
  .addItem('product_001', 2, 99.99)
  .addItem('product_002', 1, 199.99)
  .setShippingAddress({
    street: '中关村大街 1 号',
    city: '北京市',
    zipCode: '100080',
    country: '中国',
  })
  .buildOrder();

console.log('订单详情:', JSON.stringify(order, null, 2));

// ============================================================================
// 总结
// ============================================================================

console.log('\n=== 构建者模式技能使用总结 ===\n');
console.log('✓ 链式构建 - Fluent API，代码简洁优雅');
console.log('✓ 分步构建 - 支持异步步骤，适合复杂流程');
console.log('✓ 构建验证 - 自动验证 + 自定义验证，确保数据质量');
console.log('✓ 构建器克隆 - 基于模板快速创建相似对象');
console.log('✓ 回调支持 - 构建完成自动触发后续操作');
console.log('✓ 灵活配置 - 严格/非严格模式，按需选择');
console.log('\n🎯 ACE (Advanced Constructor Engine) - 让复杂对象构建更简单!');
