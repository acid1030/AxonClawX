/**
 * ACE Rule Engine 使用示例
 * 
 * 实际业务场景演示
 */

import { 
  RuleEngine, 
  createRule, 
  condition, 
  and, 
  or, 
  not,
  action 
} from './rule-engine-skill';

// ==================== 场景 1: 电商订单处理 ====================

function ecommerceExample(): void {
  console.log('=== 场景 1: 电商订单处理 ===\n');

  const engine = new RuleEngine();

  // 规则 1: VIP 客户 9 折
  engine.addRule(createRule({
    id: 'vip-discount',
    name: 'VIP 折扣',
    priority: 10,
    conditions: [
      condition('customer.tier', 'eq', 'vip'),
    ],
    actions: [
      action('set', 'pricing.discountPercent', 10),
    ],
    tags: ['pricing'],
  }));

  // 规则 2: 满 1000 减 100
  engine.addRule(createRule({
    id: 'volume-discount',
    name: '满减优惠',
    priority: 20,
    conditions: [
      condition('order.subtotal', 'gte', 1000),
    ],
    actions: [
      action('set', 'pricing.flatDiscount', 100),
    ],
    tags: ['pricing'],
  }));

  // 规则 3: 偏远地区加收运费
  engine.addRule(createRule({
    id: 'remote-shipping',
    name: '偏远地区运费',
    priority: 30,
    conditions: [
      condition('shipping.province', 'in', ['新疆', '西藏', '内蒙古']),
    ],
    actions: [
      action('set', 'shipping.surcharge', 20),
    ],
    tags: ['shipping'],
  }));

  // 规则 4: 危险商品特殊处理
  engine.addRule(createRule({
    id: 'hazmat-handling',
    name: '危险品处理',
    priority: 5,
    conditions: [
      condition('items', 'exists', undefined),
      {
        field: 'items',
        operator: 'or',
        conditions: [
          { field: 'items.*.category', operator: 'eq', value: 'hazmat' },
        ],
      },
    ],
    actions: [
      action('set', 'handling.special', true),
      action('set', 'handling.fee', 50),
    ],
    tags: ['handling'],
  }));

  // 测试
  const order = {
    customer: { tier: 'vip', id: 'C001' },
    order: { subtotal: 1500, id: 'ORD-20260313-001' },
    shipping: { province: '新疆', city: '乌鲁木齐' },
    items: [{ name: '电池', category: 'hazmat', qty: 2 }],
  };

  const result = engine.execute(order);
  console.log('订单:', order.order.id);
  console.log('匹配规则:', result.matchedRules);
  console.log('最终结果:', JSON.stringify(result.context.result, null, 2));
  console.log();
}

// ==================== 场景 2: 用户权限控制 ====================

function permissionExample(): void {
  console.log('=== 场景 2: 用户权限控制 ===\n');

  const engine = new RuleEngine();

  // 规则 1: 管理员拥有所有权限
  engine.addRule(createRule({
    id: 'admin-access',
    name: '管理员权限',
    priority: 1,
    conditions: [
      condition('user.role', 'eq', 'admin'),
    ],
    actions: [
      action('set', 'permissions.all', true),
      action('set', 'permissions.adminPanel', true),
      action('set', 'permissions.userManagement', true),
    ],
    tags: ['permission'],
  }));

  // 规则 2: 编辑权限
  engine.addRule(createRule({
    id: 'editor-access',
    name: '编辑权限',
    priority: 10,
    conditions: [
      or(
        condition('user.role', 'eq', 'editor'),
        condition('user.role', 'eq', 'admin'),
      ),
    ],
    actions: [
      action('set', 'permissions.contentEdit', true),
      action('set', 'permissions.contentPublish', true),
    ],
    tags: ['permission'],
  }));

  // 规则 3: 查看权限 (默认)
  engine.addRule(createRule({
    id: 'viewer-access',
    name: '查看权限',
    priority: 100,
    conditions: [
      condition('user.status', 'eq', 'active'),
    ],
    actions: [
      action('set', 'permissions.contentView', true),
    ],
    tags: ['permission'],
  }));

  // 规则 4: 禁用用户无权限
  engine.addRule(createRule({
    id: 'disabled-user',
    name: '禁用用户',
    priority: 0,
    conditions: [
      condition('user.status', 'eq', 'disabled'),
    ],
    actions: [
      action('set', 'permissions.all', false),
      action('set', 'access.denied', true),
    ],
    tags: ['permission'],
  }));

  // 测试
  const users = [
    { user: { role: 'admin', status: 'active' } },
    { user: { role: 'editor', status: 'active' } },
    { user: { role: 'viewer', status: 'active' } },
    { user: { role: 'editor', status: 'disabled' } },
  ];

  users.forEach((userData, index) => {
    console.log(`用户 ${index + 1}:`, userData.user);
    const result = engine.execute(userData);
    console.log('权限:', JSON.stringify(result.context.result.permissions, null, 2));
    console.log();
  });
}

// ==================== 场景 3: 风控规则 ====================

function riskControlExample(): void {
  console.log('=== 场景 3: 风控规则 ===\n');

  const engine = new RuleEngine();

  // 规则 1: 高频交易预警
  engine.addRule(createRule({
    id: 'high-frequency',
    name: '高频交易预警',
    priority: 10,
    conditions: [
      condition('transaction.count24h', 'gte', 10),
    ],
    actions: [
      action('set', 'risk.level', 'medium'),
      action('set', 'risk.reason', '24 小时内交易次数过多'),
      action('set', 'risk.requiresReview', true),
    ],
    tags: ['risk'],
  }));

  // 规则 2: 大额交易预警
  engine.addRule(createRule({
    id: 'large-amount',
    name: '大额交易预警',
    priority: 10,
    conditions: [
      condition('transaction.amount', 'gte', 50000),
    ],
    actions: [
      action('set', 'risk.level', 'high'),
      action('set', 'risk.reason', '单笔交易金额过大'),
      action('set', 'risk.requiresApproval', true),
    ],
    tags: ['risk'],
  }));

  // 规则 3: 异地登录预警
  engine.addRule(createRule({
    id: 'location-anomaly',
    name: '异地登录预警',
    priority: 5,
    conditions: [
      and(
        condition('user.lastLoginCity', 'exists', undefined),
        {
          field: 'user.lastLoginCity',
          operator: 'neq',
          value: undefined,
          conditions: [
            { field: 'transaction.currentCity', operator: 'neq', value: undefined }
          ]
        }
      ),
      condition('user.lastLoginCity', 'neq', undefined),
    ],
    actions: [
      action('set', 'security.alert', true),
      action('set', 'security.verifyRequired', true),
    ],
    tags: ['security'],
  }));

  // 规则 4: 黑名单用户
  engine.addRule(createRule({
    id: 'blacklist',
    name: '黑名单拦截',
    priority: 1,
    conditions: [
      condition('user.inBlacklist', 'eq', true),
    ],
    actions: [
      action('set', 'blocked', true),
      action('set', 'blockReason', '用户在黑名单中'),
    ],
    tags: ['block'],
  }));

  // 测试
  const transaction = {
    user: { 
      id: 'U001', 
      inBlacklist: false,
      lastLoginCity: '北京',
    },
    transaction: {
      amount: 60000,
      count24h: 15,
      currentCity: '上海',
    },
  };

  const result = engine.execute(transaction);
  console.log('交易风控结果:');
  console.log('匹配规则:', result.matchedRules);
  console.log('风险评估:', JSON.stringify(result.context.result, null, 2));
  console.log();
}

// ==================== 场景 4: 工作流自动化 ====================

function workflowExample(): void {
  console.log('=== 场景 4: 工作流自动化 ===\n');

  const engine = new RuleEngine();

  // 注册自定义处理器
  engine.registerHandler('sendSlack', (ctx, action) => {
    console.log(`[Slack 通知] ${action.value.message}`);
    ctx.result.notifications = ctx.result.notifications || [];
    ctx.result.notifications.push({ channel: 'slack', ...action.value });
  });

  engine.registerHandler('createTask', (ctx, action) => {
    console.log(`[创建任务] ${action.value.title}`);
    ctx.result.tasks = ctx.result.tasks || [];
    ctx.result.tasks.push({ ...action.value, status: 'pending' });
  });

  // 规则 1: Bug 自动创建任务
  engine.addRule(createRule({
    id: 'bug-workflow',
    name: 'Bug 处理流程',
    priority: 10,
    conditions: [
      condition('issue.type', 'eq', 'bug'),
      condition('issue.priority', 'in', ['critical', 'high']),
    ],
    actions: [
      {
        type: 'custom',
        handler: (ctx) => {
          console.log(`[紧急 Bug] ${ctx.data.issue.title}`);
          ctx.result.urgent = true;
        },
      },
      action('set', 'issue.status', 'triaged'),
      action('set', 'issue.autoAssigned', true),
    ],
    tags: ['workflow', 'bug'],
  }));

  // 规则 2: 功能请求流程
  engine.addRule(createRule({
    id: 'feature-workflow',
    name: '功能请求流程',
    priority: 20,
    conditions: [
      condition('issue.type', 'eq', 'feature'),
    ],
    actions: [
      action('set', 'issue.status', 'review'),
      {
        type: 'custom',
        handler: (ctx) => {
          console.log('[功能请求] 需要产品评审');
        },
      },
    ],
    tags: ['workflow', 'feature'],
  }));

  // 规则 3: PR 合并流程
  engine.addRule(createRule({
    id: 'pr-merge-workflow',
    name: 'PR 合并流程',
    priority: 15,
    conditions: [
      and(
        condition('pr.status', 'eq', 'approved'),
        condition('pr.ciPassed', 'eq', true),
      ),
    ],
    actions: [
      action('set', 'pr.readyToMerge', true),
      action('set', 'pr.mergeMethod', 'squash'),
    ],
    tags: ['workflow', 'pr'],
  }));

  // 测试
  const issues = [
    { issue: { type: 'bug', priority: 'critical', title: '系统崩溃' } },
    { issue: { type: 'feature', priority: 'low', title: '新增导出功能' } },
    { pr: { status: 'approved', ciPassed: true, title: '修复登录 bug' } },
  ];

  issues.forEach((data, index) => {
    console.log(`项目 ${index + 1}:`);
    const result = engine.execute(data);
    console.log('工作流结果:', JSON.stringify(result.context.result, null, 2));
    console.log();
  });
}

// ==================== 场景 5: 数据验证与转换 ====================

function dataValidationExample(): void {
  console.log('=== 场景 5: 数据验证与转换 ===\n');

  const engine = new RuleEngine();

  // 规则 1: 邮箱格式验证
  engine.addRule(createRule({
    id: 'validate-email',
    name: '邮箱格式验证',
    priority: 10,
    conditions: [
      and(
        condition('user.email', 'exists', undefined),
        not(condition('user.email', 'regex', '^[\\w-]+(\\.[\\w-]+)*@[\\w-]+(\\.[\\w-]+)+$')),
      ),
    ],
    actions: [
      action('set', 'validation.email.valid', false),
      action('set', 'validation.errors', ['邮箱格式不正确']),
    ],
    tags: ['validation'],
  }));

  // 规则 2: 手机号格式验证
  engine.addRule(createRule({
    id: 'validate-phone',
    name: '手机号格式验证',
    priority: 10,
    conditions: [
      and(
        condition('user.phone', 'exists', undefined),
        not(condition('user.phone', 'regex', '^1[3-9]\\d{9}$')),
      ),
    ],
    actions: [
      action('set', 'validation.phone.valid', false),
      action('append', 'validation.errors', '手机号格式不正确'),
    ],
    tags: ['validation'],
  }));

  // 规则 3: 年龄范围验证
  engine.addRule(createRule({
    id: 'validate-age',
    name: '年龄范围验证',
    priority: 10,
    conditions: [
      or(
        condition('user.age', 'lt', 18),
        condition('user.age', 'gt', 120),
      ),
    ],
    actions: [
      action('set', 'validation.age.valid', false),
      action('append', 'validation.errors', '年龄必须在 18-120 岁之间'),
    ],
    tags: ['validation'],
  }));

  // 规则 4: 数据标准化
  engine.addRule(createRule({
    id: 'normalize-data',
    name: '数据标准化',
    priority: 100,
    conditions: [
      condition('user.phone', 'exists', undefined),
    ],
    actions: [
      {
        type: 'transform',
        field: 'user.phone',
        value: (val: string) => val.replace(/\D/g, ''),
      },
      {
        type: 'transform',
        field: 'user.email',
        value: (val: string) => val?.toLowerCase().trim(),
      },
    ],
    tags: ['transform'],
  }));

  // 测试
  const userData = {
    user: {
      email: '  TEST@Example.COM ',
      phone: '138-1234-5678',
      age: 25,
    },
  };

  console.log('原始数据:', JSON.stringify(userData, null, 2));
  const result = engine.execute(userData);
  console.log('验证结果:', JSON.stringify(result.context.result, null, 2));
  console.log('标准化后:', JSON.stringify(userData, null, 2));
}

// ==================== 运行所有示例 ====================

function runAllExamples(): void {
  console.log('╔════════════════════════════════════════╗');
  console.log('║     ACE Rule Engine 使用示例合集      ║');
  console.log('╚════════════════════════════════════════╝\n');

  ecommerceExample();
  permissionExample();
  riskControlExample();
  workflowExample();
  dataValidationExample();

  console.log('╔════════════════════════════════════════╗');
  console.log('║           所有示例执行完成            ║');
  console.log('╚════════════════════════════════════════╝');
}

// 导出示例函数
export { 
  ecommerceExample, 
  permissionExample, 
  riskControlExample, 
  workflowExample, 
  dataValidationExample,
  runAllExamples 
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
