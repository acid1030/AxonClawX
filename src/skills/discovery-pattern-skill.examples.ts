/**
 * 服务发现模式工具 - 使用示例
 * 
 * 演示如何使用 discovery-pattern-skill.ts 实现服务注册、发现和健康管理
 */

import {
  createServiceRegistry,
  buildServiceUrl,
  batchRegisterServices,
  type ServiceRegistrationConfig,
  type ServiceDiscoveryQuery
} from './discovery-pattern-skill';

// ============================================
// 示例 1: 基础服务注册与发现
// ============================================

async function example1_basic() {
  console.log('=== 示例 1: 基础服务注册与发现 ===\n');
  
  // 创建注册中心
  const registry = createServiceRegistry();
  
  // 注册服务
  const userService = await registry.register({
    name: 'user-service',
    host: 'localhost',
    port: 3000,
    version: '1.0.0',
    tags: ['api', 'user']
  });
  
  console.log('服务注册成功:', userService.id);
  
  // 发现服务
  const result = await registry.discover({
    name: 'user-service',
    healthyOnly: true,
    loadBalanceStrategy: 'random'
  });
  
  if (result.selectedInstance) {
    const url = buildServiceUrl(result.selectedInstance);
    console.log('服务发现成功:', url);
  }
  
  // 健康检查
  const health = await registry.healthCheck(userService.id);
  console.log('健康状态:', health.healthy ? '✅' : '❌');
}

// ============================================
// 示例 2: 多实例负载均衡
// ============================================

async function example2_loadbalancing() {
  console.log('\n=== 示例 2: 多实例负载均衡 ===\n');
  
  const registry = createServiceRegistry();
  
  // 注册多个支付服务实例
  await registry.register({
    name: 'payment-service',
    host: '192.168.1.10',
    port: 8080,
    weight: 10  // 高权重
  });
  
  await registry.register({
    name: 'payment-service',
    host: '192.168.1.11',
    port: 8080,
    weight: 5   // 低权重
  });
  
  // 权重负载均衡 - 高权重实例被选中概率更高
  for (let i = 0; i < 5; i++) {
    const result = await registry.discover({
      name: 'payment-service',
      loadBalanceStrategy: 'weighted'
    });
    console.log(`请求 ${i + 1}: ${result.selectedInstance?.host}`);
  }
}

// ============================================
// 示例 3: 批量服务注册
// ============================================

async function example3_batch() {
  console.log('\n=== 示例 3: 批量服务注册 ===\n');
  
  const registry = createServiceRegistry();
  
  const services: ServiceRegistrationConfig[] = [
    { name: 'api-gateway', host: '10.0.0.1', port: 80, tags: ['gateway'] },
    { name: 'auth-service', host: '10.0.0.2', port: 8001, tags: ['auth'] },
    { name: 'order-service', host: '10.0.0.3', port: 8002, tags: ['order'] },
    { name: 'inventory-service', host: '10.0.0.4', port: 8003, tags: ['inventory'] }
  ];
  
  const instances = await batchRegisterServices(registry, services);
  console.log(`批量注册 ${instances.length} 个服务`);
  
  // 按标签筛选
  const authServices = await registry.discover({
    name: 'auth-service',
    tags: ['auth']
  });
  
  console.log('认证服务:', authServices.instances.length, '个实例');
}

// ============================================
// 示例 4: 健康检查监控
// ============================================

async function example4_healthcheck() {
  console.log('\n=== 示例 4: 健康检查监控 ===\n');
  
  const registry = createServiceRegistry();
  
  // 注册服务
  await registry.register({
    name: 'monitor-service',
    host: 'localhost',
    port: 9000
  });
  
  // 启动自动健康检查 (每 30 秒)
  registry.startHealthMonitoring();
  console.log('健康检查监控已启动');
  
  // 模拟运行 5 秒
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 获取状态
  const status = registry.getStatus();
  console.log('注册中心状态:', {
    total: status.totalServices,
    healthy: status.healthyServices,
    unhealthy: status.unhealthyServices
  });
  
  // 停止监控
  registry.stopHealthMonitoring();
  console.log('健康检查监控已停止');
}

// ============================================
// 示例 5: 微服务架构实战
// ============================================

async function example5_microservices() {
  console.log('\n=== 示例 5: 微服务架构实战 ===\n');
  
  const registry = createServiceRegistry();
  
  // 注册电商系统微服务
  const services = [
    { name: 'user-service', host: 'ms-user', port: 8080, tags: ['core'] },
    { name: 'product-service', host: 'ms-product', port: 8081, tags: ['core'] },
    { name: 'order-service', host: 'ms-order', port: 8082, tags: ['core'] },
    { name: 'payment-service', host: 'ms-payment', port: 8083, tags: ['core', 'critical'] },
    { name: 'notification-service', host: 'ms-notify', port: 8084, tags: ['async'] },
    { name: 'analytics-service', host: 'ms-analytics', port: 8085, tags: ['async'] }
  ];
  
  for (const svc of services) {
    await registry.register(svc as any);
  }
  
  console.log('✅ 电商微服务集群注册完成\n');
  
  // 模拟订单服务调用支付服务
  console.log('📦 订单服务 → 调用支付服务...');
  const paymentResult = await registry.discover({
    name: 'payment-service',
    tags: ['critical'],
    healthyOnly: true,
    loadBalanceStrategy: 'round-robin'
  });
  
  if (paymentResult.selectedInstance) {
    const paymentUrl = buildServiceUrl(paymentResult.selectedInstance);
    console.log(`   支付服务地址：${paymentUrl}`);
    console.log(`   调用端点：${paymentUrl}/api/v1/payments`);
  }
  
  // 模拟用户服务调用通知服务
  console.log('\n👤 用户服务 → 调用通知服务...');
  const notifyResult = await registry.discover({
    name: 'notification-service',
    loadBalanceStrategy: 'random'
  });
  
  if (notifyResult.selectedInstance) {
    const notifyUrl = buildServiceUrl(notifyResult.selectedInstance);
    console.log(`   通知服务地址：${notifyUrl}`);
    console.log(`   调用端点：${notifyUrl}/api/v1/notifications/send`);
  }
  
  // 查看系统健康状态
  const status = registry.getStatus();
  console.log('\n📊 系统健康状态:');
  console.log(`   运行中服务：${status.healthyServices}/${status.totalServices}`);
  console.log(`   健康率：${((status.healthyServices / status.totalServices) * 100).toFixed(1)}%`);
}

// ============================================
// 示例 6: 服务优雅下线
// ============================================

async function example6_graceful_shutdown() {
  console.log('\n=== 示例 6: 服务优雅下线 ===\n');
  
  const registry = createServiceRegistry();
  
  // 注册临时服务
  const tempService = await registry.register({
    name: 'temp-worker',
    host: 'worker-1',
    port: 9000,
    tags: ['worker', 'temporary']
  });
  
  console.log('临时服务已注册:', tempService.id);
  
  // 模拟工作...
  console.log('临时服务正在处理任务...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 优雅下线
  console.log('临时服务完成任务，准备下线...');
  await registry.deregister(tempService.id);
  
  // 验证服务已移除
  const allServices = await registry.getAllServices();
  console.log('当前运行服务:', allServices.length);
  console.log('✅ 服务优雅下线完成');
}

// ============================================
// 运行所有示例
// ============================================

async function runAllExamples() {
  try {
    await example1_basic();
    await example2_loadbalancing();
    await example3_batch();
    await example4_healthcheck();
    await example5_microservices();
    await example6_graceful_shutdown();
    
    console.log('\n✅ 所有示例执行完成!\n');
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出示例函数供其他模块使用
export {
  example1_basic,
  example2_loadbalancing,
  example3_batch,
  example4_healthcheck,
  example5_microservices,
  example6_graceful_shutdown,
  runAllExamples
};
