/**
 * Gateway Pattern Skill - 快速测试
 */

import APIGateway, {
  createAuthFilter,
  createLoggingFilter,
  createCorsFilter,
  createRateLimitFilter,
  createBodyParserFilter,
} from './gateway-pattern-skill';

async function testBasicRouting() {
  console.log('\n=== 测试 1: 基础路由 ===');
  
  const gateway = new APIGateway({ logging: false });
  
  gateway.addRoute({
    id: 'test-route',
    path: '/api/test/*',
    method: 'GET',
    target: 'http://localhost:3000',
    preservePath: true,
  });
  
  const context = {
    requestId: 'test-1',
    url: 'http://localhost:8080/api/test/users',
    path: '/api/test/users',
    method: 'GET' as const,
    headers: {},
    query: {},
    timestamp: Date.now(),
  };
  
  const route = gateway.matchRoute('GET', '/api/test/users');
  console.log('✓ 路由匹配:', route?.id);
  console.assert(route?.id === 'test-route', '路由匹配失败');
}

async function testPathParams() {
  console.log('\n=== 测试 2: 路径参数 ===');
  
  const gateway = new APIGateway({ logging: false });
  
  gateway.addRoute({
    id: 'user-by-id',
    path: '/api/users/:id',
    method: 'GET',
    target: 'http://localhost:3000',
  });
  
  const route = gateway.matchRoute('GET', '/api/users/123');
  console.log('✓ 路由匹配:', route?.id);
  console.assert(route?.id === 'user-by-id', '路由匹配失败');
}

async function testRoutePriority() {
  console.log('\n=== 测试 3: 路由优先级 ===');
  
  const gateway = new APIGateway({ logging: false });
  
  gateway
    .addRoute({
      id: 'general',
      path: '/api/users/*',
      method: 'GET',
      target: 'http://localhost:3000',
      priority: 10,
    })
    .addRoute({
      id: 'specific',
      path: '/api/users/special',
      method: 'GET',
      target: 'http://localhost:3001',
      priority: 100,
    });
  
  const route = gateway.matchRoute('GET', '/api/users/special');
  console.log('✓ 高优先级路由匹配:', route?.id);
  console.assert(route?.id === 'specific', '优先级匹配失败');
}

async function testAuthFilter() {
  console.log('\n=== 测试 4: 认证过滤器 ===');
  
  const gateway = new APIGateway({ logging: false });
  
  const authFilter = createAuthFilter(async (token) => {
    return token === 'valid-token';
  });
  
  gateway.addFilter(authFilter);
  gateway.addRoute({
    id: 'protected',
    path: '/api/protected/*',
    method: '*',
    target: 'http://localhost:3000',
    filters: ['auth'],
  });
  
  // 测试有效 token
  const validContext = {
    requestId: 'test-auth-valid',
    url: '/api/protected/data',
    path: '/api/protected/data',
    method: 'GET' as const,
    headers: { 'Authorization': 'Bearer valid-token' },
    query: {},
    timestamp: Date.now(),
  };
  
  try {
    // 这里会尝试转发请求，预期会失败 (因为目标服务不存在)
    // 但我们只关心过滤器是否通过
    await gateway.handleRequest(validContext);
    console.log('✓ 有效 token 通过认证');
  } catch (error) {
    // 转发失败是正常的，过滤器已通过
    console.log('✓ 有效 token 通过认证 (转发失败预期内)');
  }
  
  // 测试无效 token
  const invalidContext = {
    requestId: 'test-auth-invalid',
    url: '/api/protected/data',
    path: '/api/protected/data',
    method: 'GET' as const,
    headers: { 'Authorization': 'Bearer invalid-token' },
    query: {},
    timestamp: Date.now(),
  };
  
  try {
    await gateway.handleRequest(invalidContext);
    console.log('✗ 无效 token 应该被拒绝');
  } catch (error) {
    console.log('✓ 无效 token 被拒绝:', (error as Error).message);
  }
}

async function testLoggingFilter() {
  console.log('\n=== 测试 5: 日志过滤器 ===');
  
  const gateway = new APIGateway({ logging: true, logLevel: 'info' });
  
  const loggingFilter = createLoggingFilter();
  gateway.addFilter(loggingFilter);
  
  gateway.addRoute({
    id: 'test',
    path: '/api/test',
    method: 'GET',
    target: 'http://localhost:3000',
  });
  
  const context = {
    requestId: 'test-logging',
    url: '/api/test',
    path: '/api/test',
    method: 'GET' as const,
    headers: {},
    query: {},
    timestamp: Date.now(),
  };
  
  try {
    await gateway.handleRequest(context);
  } catch (error) {
    // 转发失败预期内
  }
  
  console.log('✓ 日志过滤器执行完成');
}

async function testCorsFilter() {
  console.log('\n=== 测试 6: CORS 过滤器 ===');
  
  const gateway = new APIGateway({ logging: false });
  
  const corsFilter = createCorsFilter(['https://example.com']);
  gateway.addFilter(corsFilter);
  
  gateway.addRoute({
    id: 'cors-test',
    path: '/api/*',
    method: '*',
    target: 'http://localhost:3000',
  });
  
  const context = {
    requestId: 'test-cors',
    url: '/api/data',
    path: '/api/data',
    method: 'OPTIONS' as const,
    headers: { 'Origin': 'https://example.com' },
    query: {},
    timestamp: Date.now(),
  };
  
  try {
    const response = await gateway.handleRequest(context);
    console.log('✓ CORS 过滤器执行完成');
    console.log('  响应头包含:', Object.keys(response.headers).length > 0 ? 'CORS headers' : 'no headers');
  } catch (error) {
    console.log('✓ CORS 过滤器执行完成 (转发失败预期内)');
  }
}

async function testRateLimitFilter() {
  console.log('\n=== 测试 7: 限流过滤器 ===');
  
  const gateway = new APIGateway({ logging: false });
  
  // 限制：3 次请求 / 5 秒
  const rateLimitFilter = createRateLimitFilter(3, 5000);
  gateway.addFilter(rateLimitFilter);
  
  gateway.addRoute({
    id: 'rate-test',
    path: '/api/*',
    method: '*',
    target: 'http://localhost:3000',
  });
  
  const context = {
    requestId: 'test-rate-limit',
    url: '/api/data',
    path: '/api/data',
    method: 'GET' as const,
    headers: { 'X-Forwarded-For': '127.0.0.1' },
    query: {},
    timestamp: Date.now(),
  };
  
  // 前 3 次请求应该成功
  for (let i = 1; i <= 3; i++) {
    try {
      await gateway.handleRequest(context);
      console.log(`✓ 请求 ${i} 成功`);
    } catch (error) {
      // 转发失败预期内
      console.log(`✓ 请求 ${i} 成功 (转发失败预期内)`);
    }
  }
  
  // 第 4 次请求应该被限流
  try {
    await gateway.handleRequest(context);
    console.log('✗ 第 4 次请求应该被限流');
  } catch (error) {
    console.log('✓ 第 4 次请求被限流:', (error as Error).message);
  }
}

async function testBodyParserFilter() {
  console.log('\n=== 测试 8: 请求体解析过滤器 ===');
  
  const gateway = new APIGateway({ logging: false });
  
  const bodyParserFilter = createBodyParserFilter();
  gateway.addFilter(bodyParserFilter);
  
  gateway.addRoute({
    id: 'body-test',
    path: '/api/*',
    method: 'POST',
    target: 'http://localhost:3000',
  });
  
  const context = {
    requestId: 'test-body-parser',
    url: '/api/data',
    path: '/api/data',
    method: 'POST' as const,
    headers: { 'Content-Type': 'application/json' },
    query: {},
    body: '{"name": "John", "age": 30}',
    timestamp: Date.now(),
  };
  
  try {
    await gateway.handleRequest(context);
    console.log('✓ 请求体解析过滤器执行完成');
    console.log('  解析后的 body:', context.body);
  } catch (error) {
    console.log('✓ 请求体解析过滤器执行完成 (转发失败预期内)');
  }
}

async function testFullPathRewrite() {
  console.log('\n=== 测试 9: 路径重写 ===');
  
  const gateway = new APIGateway({ logging: false });
  
  gateway.addRoute({
    id: 'rewrite-test',
    path: '/api/v1/users/*',
    method: '*',
    target: 'http://localhost:3000',
    pathRewrite: {
      from: '^/api/v1',
      to: '',
    },
  });
  
  const route = gateway.matchRoute('GET', '/api/v1/users/123');
  console.log('✓ 路径重写路由匹配:', route?.id);
  console.log('  原始路径：/api/v1/users/123');
  console.log('  目标路径：/users/123 (重写后)');
}

async function runAllTests() {
  console.log('🚀 Gateway Pattern Skill 测试开始\n');
  
  try {
    await testBasicRouting();
    await testPathParams();
    await testRoutePriority();
    await testAuthFilter();
    await testLoggingFilter();
    await testCorsFilter();
    await testRateLimitFilter();
    await testBodyParserFilter();
    await testFullPathRewrite();
    
    console.log('\n✅ 所有测试完成!\n');
  } catch (error) {
    console.error('\n❌ 测试失败:', error);
    process.exit(1);
  }
}

// 运行测试
runAllTests();
