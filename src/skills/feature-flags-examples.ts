/**
 * Feature Flags Skill - 使用示例
 * 
 * 演示如何使用特性开关工具进行:
 * 1. 开关管理
 * 2. 灰度发布
 * 3. A/B 测试
 */

import {
  FeatureFlagManager,
  FileStorageAdapter,
  createFlag,
  evaluate,
  isEnabled,
  getValue,
  setRollout,
  createExperiment,
  startExperiment,
  type EvaluationContext,
  type ExperimentVariant,
  type MetricConfig
} from './feature-flags-skill';

// ============== 示例 1: 基础开关管理 ==============

async function example1_BasicFlagManagement() {
  console.log('\n=== 示例 1: 基础开关管理 ===\n');

  // 创建管理器
  const manager = new FeatureFlagManager(
    new FileStorageAdapter('./examples/feature-flags.json')
  );
  await manager.initialize();

  // 1. 创建开关
  const darkModeFlag = await manager.createFlag(
    'dark-mode',
    '深色模式',
    '控制是否启用深色模式界面',
    'boolean',
    false,
    'admin'
  );
  console.log('创建开关:', darkModeFlag);

  // 2. 启用开关
  await manager.toggleFlag('dark-mode', true);
  console.log('启用开关: dark-mode');

  // 3. 评估开关
  const result1 = manager.evaluate('dark-mode');
  console.log('评估结果:', result1); // { enabled: true, value: false, reason: 'default' }

  // 4. 使用便捷函数
  const enabled = isEnabled('dark-mode');
  console.log('是否启用:', enabled); // true

  // 5. 更新开关
  await manager.updateFlag('dark-mode', {
    description: '控制是否启用深色模式界面 (v2)',
    tags: ['ui', 'theme']
  });

  // 6. 获取所有开关
  const allFlags = manager.getAllFlags();
  console.log('所有开关:', allFlags.map(f => f.key));

  // 7. 删除开关
  // await manager.deleteFlag('dark-mode');
}

// ============== 示例 2: 灰度发布 ==============

async function example2_GrayRelease() {
  console.log('\n=== 示例 2: 灰度发布 ===\n');

  const manager = new FeatureFlagManager();
  await manager.initialize();

  // 创建新功能开关
  await manager.createFlag(
    'new-checkout-flow',
    '新结算流程',
    '全新的结算页面设计',
    'boolean',
    true
  );

  // 1. 百分比灰度 - 10% 用户
  await manager.setRollout('new-checkout-flow', 'percentage', {
    percentage: 10,
    seed: 'checkout-v1'
  });

  // 模拟不同用户评估
  const users = [
    { userId: 'user-001' },
    { userId: 'user-002' },
    { userId: 'user-003' },
    { userId: 'user-100' }
  ];

  console.log('百分比灰度 (10%):');
  for (const user of users) {
    const result = manager.evaluate('new-checkout-flow', user);
    console.log(
      `  ${user.userId}: ${result.enabled ? '✅ 启用' : '❌ 禁用'} (hash: ${result.metadata?.userHash})`
    );
  }

  // 2. 用户列表灰度 - 仅特定用户
  await manager.setRollout('new-checkout-flow', 'user-list', {
    userIds: ['vip-001', 'vip-002', 'beta-tester-001']
  });

  console.log('\n用户列表灰度:');
  const testUsers = [
    { userId: 'vip-001' },
    { userId: 'vip-002' },
    { userId: 'normal-user' }
  ];

  for (const user of testUsers) {
    const result = manager.evaluate('new-checkout-flow', user);
    console.log(
      `  ${user.userId}: ${result.enabled ? '✅ 启用' : '❌ 禁用'} (${result.reason})`
    );
  }

  // 3. 地域灰度 - 仅特定国家
  await manager.setRollout('new-checkout-flow', 'geo', {
    countries: ['CN', 'US', 'JP']
  });

  console.log('\n地域灰度:');
  const geoUsers = [
    { userId: 'user-cn', country: 'CN' },
    { userId: 'user-us', country: 'US' },
    { userId: 'user-uk', country: 'UK' }
  ];

  for (const user of geoUsers) {
    const result = manager.evaluate('new-checkout-flow', user);
    console.log(
      `  ${user.userId} (${user.country}): ${result.enabled ? '✅ 启用' : '❌ 禁用'}`
    );
  }

  // 4. 属性规则灰度 - 基于用户属性
  await manager.setRollout('new-checkout-flow', 'attribute', {
    attributeRules: [
      {
        attribute: 'membershipLevel',
        operator: 'greater-than',
        value: 3
      },
      {
        attribute: 'isPremium',
        operator: 'equals',
        value: true
      }
    ]
  });

  console.log('\n属性规则灰度:');
  const attributeUsers = [
    { userId: 'user-1', attributes: { membershipLevel: 5, isPremium: true } },
    { userId: 'user-2', attributes: { membershipLevel: 2, isPremium: false } },
    { userId: 'user-3', attributes: { membershipLevel: 4, isPremium: false } }
  ];

  for (const user of attributeUsers) {
    const result = manager.evaluate('new-checkout-flow', user);
    console.log(
      `  ${user.userId}: ${result.enabled ? '✅ 启用' : '❌ 禁用'} (${result.reason})`
    );
  }

  // 5. 逐步增加灰度比例
  console.log('\n逐步增加灰度比例:');
  for (const percentage of [10, 25, 50, 75, 100]) {
    await manager.setRollout('new-checkout-flow', 'percentage', {
      percentage,
      seed: 'checkout-v1'
    });

    let enabledCount = 0;
    for (let i = 0; i < 100; i++) {
      const result = manager.evaluate('new-checkout-flow', { userId: `user-${i}` });
      if (result.enabled) enabledCount++;
    }

    console.log(`  ${percentage}%: 实际启用 ${enabledCount}/100 用户`);
  }
}

// ============== 示例 3: A/B 测试 ==============

async function example3_ABTesting() {
  console.log('\n=== 示例 3: A/B 测试 ===\n');

  const manager = new FeatureFlagManager();
  await manager.initialize();

  // 创建实验开关
  await manager.createFlag(
    'checkout-button-color',
    '结算按钮颜色',
    '测试不同按钮颜色对转化率的影响',
    'string',
    'blue'
  );

  // 1. 创建 A/B 测试实验
  const variants: ExperimentVariant[] = [
    {
      id: 'control',
      name: '对照组 - 蓝色',
      description: '原始蓝色按钮',
      trafficPercentage: 50,
      value: 'blue',
      isControl: true
    },
    {
      id: 'variant-a',
      name: '实验组 A - 红色',
      description: '红色按钮 (更醒目)',
      trafficPercentage: 25,
      value: 'red',
      isControl: false
    },
    {
      id: 'variant-b',
      name: '实验组 B - 绿色',
      description: '绿色按钮 (购买暗示)',
      trafficPercentage: 25,
      value: 'green',
      isControl: false
    }
  ];

  const metrics: MetricConfig[] = [
    {
      name: 'checkout-conversion-rate',
      type: 'conversion',
      target: 0.15 // 目标转化率 15%
    },
    {
      name: 'average-order-value',
      type: 'revenue',
      target: 100 // 目标客单价 $100
    }
  ];

  const experiment = await manager.createExperiment(
    'checkout-color-test-2026',
    '结算按钮颜色 A/B 测试',
    'checkout-button-color',
    '测试不同颜色按钮对转化率的影响',
    variants,
    metrics,
    'product-team'
  );

  console.log('创建实验:', experiment.name);
  console.log('变体分配:', experiment.variants.map(v => `${v.name} (${v.trafficPercentage}%)`));

  // 2. 启动实验
  await manager.startExperiment(experiment.id);
  console.log('\n实验已启动!');

  // 3. 模拟用户访问 - 分配变体
  console.log('\n用户变体分配:');
  const userDistribution: { [key: string]: number } = {};

  for (let i = 0; i < 1000; i++) {
    const result = manager.evaluate('checkout-button-color', {
      userId: `user-${i}`
    });

    const variantId = result.variantId || 'unknown';
    userDistribution[variantId] = (userDistribution[variantId] || 0) + 1;
  }

  for (const [variantId, count] of Object.entries(userDistribution)) {
    const percentage = ((count / 1000) * 100).toFixed(1);
    console.log(`  ${variantId}: ${count} 用户 (${percentage}%)`);
  }

  // 4. 在代码中使用实验
  console.log('\n代码中使用:');
  const currentUser: EvaluationContext = { userId: 'user-12345' };
  const buttonColor = getValue<string>('checkout-button-color', currentUser);
  console.log(`  当前用户看到的按钮颜色: ${buttonColor}`);

  // 5. 暂停实验
  await manager.pauseExperiment(experiment.id);
  console.log('\n实验已暂停');

  // 6. 完成实验
  await manager.completeExperiment(experiment.id);
  console.log('实验已完成');

  // 7. 根据结果选择获胜变体
  console.log('\n实验结果分析 (示例):');
  console.log('  对照组 (蓝色): 转化率 12.5%');
  console.log('  实验组 A (红色): 转化率 14.2% ⬆️ +13.6%');
  console.log('  实验组 B (绿色): 转化率 16.8% ⬆️ +34.4% 🏆');
  console.log('\n  获胜变体：绿色按钮!');
}

// ============== 示例 4: 实际应用场景 ==============

async function example4_RealWorldScenarios() {
  console.log('\n=== 示例 4: 实际应用场景 ===\n');

  const manager = new FeatureFlagManager();
  await manager.initialize();

  // 场景 1: 紧急功能回滚
  console.log('场景 1: 紧急功能回滚');
  await manager.createFlag('new-payment-gateway', '新支付网关', '切换到新的支付服务商', 'boolean', true);
  
  // 假设出现问题，立即禁用
  await manager.toggleFlag('new-payment-gateway', false);
  console.log('  ✅ 紧急禁用新支付网关 - 所有用户回滚到旧网关\n');

  // 场景 2: 内部测试功能
  console.log('场景 2: 内部测试功能');
  await manager.createFlag('internal-admin-v2', '新版管理后台', '仅内部员工可见', 'boolean', true);
  await manager.setRollout('internal-admin-v2', 'user-list', {
    userIds: ['employee-001', 'employee-002', 'tester-001']
  });
  console.log('  ✅ 仅内部员工可访问新版管理后台\n');

  // 场景 3: 节日活动功能
  console.log('场景 3: 节日活动功能');
  await manager.createFlag('christmas-theme', '圣诞主题', '圣诞节特别界面', 'boolean', true);
  await manager.setRollout('christmas-theme', 'geo', {
    countries: ['US', 'CA', 'UK', 'AU'] // 主要英语国家
  });
  console.log('  ✅ 圣诞主题仅在特定国家上线\n');

  // 场景 4: 性能优化渐进式发布
  console.log('场景 4: 性能优化渐进式发布');
  await manager.createFlag('image-lazy-loading', '图片懒加载', '优化页面加载性能', 'boolean', true);
  
  // 逐步增加灰度比例
  for (const percentage of [5, 10, 25, 50, 100]) {
    await manager.setRollout('image-lazy-loading', 'percentage', {
      percentage,
      seed: 'lazy-loading-v1'
    });
    console.log(`  灰度 ${percentage}%...`);
    // 实际项目中这里应该监控错误率和性能指标
  }
  console.log('  ✅ 性能优化功能全量发布\n');

  // 场景 5: 多变量测试
  console.log('场景 5: 多变量测试 (价格页面优化)');
  await manager.createFlag('pricing-page-layout', '价格页面布局', '测试不同布局对转化的影响', 'json', {});

  const pricingVariants: ExperimentVariant[] = [
    {
      id: 'control',
      name: '原始布局',
      description: '三列并排',
      trafficPercentage: 33,
      value: { layout: '3-columns', highlight: 'none' },
      isControl: true
    },
    {
      id: 'variant-a',
      name: '推荐标签',
      description: '中间方案添加推荐标签',
      trafficPercentage: 33,
      value: { layout: '3-columns', highlight: 'recommended' },
      isControl: false
    },
    {
      id: 'variant-b',
      name: '年度优先',
      description: '默认显示年度价格',
      trafficPercentage: 34,
      value: { layout: '2-rows', defaultPeriod: 'yearly' },
      isControl: false
    }
  ];

  await manager.createExperiment(
    'pricing-optimization-q1',
    'Q1 价格页面优化实验',
    'pricing-page-layout',
    '测试不同布局对订阅转化的影响',
    pricingVariants,
    [
      { name: 'subscription-rate', type: 'conversion' },
      { name: 'annual-plan-ratio', type: 'conversion' }
    ]
  );

  await manager.startExperiment('pricing-optimization-q1');
  console.log('  ✅ 多变量测试已启动\n');
}

// ============== 示例 5: React/Vue 集成 ==============

/**
 * React Hook 示例
 */
function example5_ReactIntegration() {
  console.log('\n=== 示例 5: React 集成示例 ===\n');

  const reactCode = `
// hooks/useFeatureFlag.ts
import { useEffect, useState } from 'react';
import { evaluate, type EvaluationContext } from '../skills/feature-flags-skill';

export function useFeatureFlag(
  flagKey: string,
  context?: EvaluationContext
) {
  const [result, setResult] = useState(() => evaluate(flagKey, context));

  useEffect(() => {
    // 可以添加实时更新逻辑
    const interval = setInterval(() => {
      setResult(evaluate(flagKey, context));
    }, 30000); // 每 30 秒刷新

    return () => clearInterval(interval);
  }, [flagKey, context]);

  return {
    enabled: result.enabled,
    value: result.value,
    variantId: result.variantId,
    reason: result.reason
  };
}

// 使用示例
function CheckoutButton() {
  const { value: buttonColor } = useFeatureFlag('checkout-button-color', {
    userId: currentUser.id
  });

  return (
    <button style={{ backgroundColor: buttonColor }}>
      立即结算
    </button>
  );
}

// 条件渲染示例
function NewFeature() {
  const { enabled } = useFeatureFlag('new-checkout-flow');

  if (!enabled) {
    return <OldCheckoutFlow />;
  }

  return <NewCheckoutFlow />;
}
`;

  console.log(reactCode);

  const vueCode = `
// Vue 3 Composable
// composables/useFeatureFlag.ts
import { ref, onMounted, onUnmounted } from 'vue';
import { evaluate } from '../skills/feature-flags-skill';

export function useFeatureFlag(flagKey: string, context?: any) {
  const enabled = ref(false);
  const value = ref(null);
  const variantId = ref<string | undefined>();

  const update = () => {
    const result = evaluate(flagKey, context);
    enabled.value = result.enabled;
    value.value = result.value;
    variantId.value = result.variantId;
  };

  onMounted(() => {
    update();
    const interval = setInterval(update, 30000);
    onUnmounted(() => clearInterval(interval));
  });

  return { enabled, value, variantId };
}

// 使用示例
// <script setup>
const { enabled, value } = useFeatureFlag('dark-mode');
// </script>
//
// <template>
//   <div :class="{ 'dark': enabled }">
//     <slot />
//   </div>
// </template>
`;

  console.log(vueCode);
}

// ============== 示例 6: 最佳实践 ==============

async function example6_BestPractices() {
  console.log('\n=== 示例 6: 最佳实践 ===\n');

  console.log(`
1. 命名规范
   ✅ 使用短横线命名：'new-checkout-flow'
   ❌ 避免驼峰命名：'newCheckoutFlow'
   
   ✅ 语义化命名：'dark-mode-enabled'
   ❌ 避免技术细节：'use-dark-mode-hook-v2'

2. 灰度策略
   ✅ 小步快跑：5% → 10% → 25% → 50% → 100%
   ❌ 一次性全量发布
   
   ✅ 设置 seed 保证一致性：seed: 'checkout-v1'
   ❌ 每次评估结果不一致

3. 实验设计
   ✅ 单一变量原则：只测试一个因素
   ❌ 同时改变多个因素
   
   ✅ 足够的样本量：每组至少 1000 用户
   ❌ 过早下结论

4. 监控告警
   ✅ 实时监控错误率、性能指标
   ✅ 设置自动回滚阈值：错误率 > 1% 自动禁用
   
5. 文档记录
   ✅ 清晰的描述和标签
   ✅ 记录创建者和创建时间
   ✅ 关联的需求/任务 ID

6. 生命周期管理
   ✅ 定期清理已完成的实验
   ✅ 全量发布的开关及时移除
   ✅ 避免开关债务积累
`);
}

// ============== 运行所有示例 ==============

async function runAllExamples() {
  console.log('🚀 Feature Flags Skill - 使用示例\n');
  console.log('=' .repeat(50));

  try {
    await example1_BasicFlagManagement();
    await example2_GrayRelease();
    await example3_ABTesting();
    await example4_RealWorldScenarios();
    example5_ReactIntegration();
    await example6_BestPractices();

    console.log('\n' + '='.repeat(50));
    console.log('✅ 所有示例运行完成!\n');
  } catch (error: any) {
    console.error('❌ 示例运行出错:', error.message);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

export { runAllExamples };
