/**
 * HTTP 工具使用示例
 * 
 * 展示 http-utils-skill.ts 的各种使用场景
 */

import { http, HttpClient, createLoggingInterceptor, createAuthInterceptor, createErrorHandlingInterceptor, createCacheInterceptor } from './http-utils-skill';

// ==================== 示例 1: 基础 GET 请求 ====================
async function example1_basicGet() {
  const response = await http.get('https://jsonplaceholder.typicode.com/posts/1');
  console.log('基础 GET:', response.data);
  console.log('状态:', response.status);
  console.log('耗时:', response.time, 'ms');
}

// ==================== 示例 2: POST 请求 ====================
async function example2_post() {
  const response = await http.post(
    'https://jsonplaceholder.typicode.com/posts',
    {
      title: 'Axon HTTP Client',
      body: 'Powerful HTTP utility with interceptors',
      userId: 1,
    }
  );
  console.log('POST 响应:', response.data);
}

// ==================== 示例 3: 添加日志拦截器 ====================
async function example3_logging() {
  const { request: logRequest, response: logResponse } = createLoggingInterceptor();
  
  http.useRequestInterceptor(logRequest);
  http.useResponseInterceptor(logResponse);
  
  await http.get('https://jsonplaceholder.typicode.com/users/1');
}

// ==================== 示例 4: 认证拦截器 ====================
async function example4_auth() {
  const apiClient = new HttpClient('https://api.example.com');
  
  // 添加 Bearer Token 认证
  apiClient.useRequestInterceptor(
    createAuthInterceptor(() => 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
  );
  
  // 所有请求都会自动带上 Authorization 头
  try {
    await apiClient.get('/protected/resource');
  } catch (error) {
    console.log('认证请求示例 (会失败，因为是示例 URL)');
  }
}

// ==================== 示例 5: 错误处理 ====================
async function example5_errorHandling() {
  const client = new HttpClient('https://jsonplaceholder.typicode.com');
  
  client.useResponseInterceptor(
    createErrorHandlingInterceptor((error, response) => {
      console.error('❌ 请求错误:', error.message);
      if (response) {
        console.error('响应状态:', response.status);
      }
    })
  );
  
  // 故意请求不存在的资源
  try {
    await client.get('/not-found-resource-12345');
  } catch (error) {
    console.log('捕获到错误:', (error as Error).message);
  }
}

// ==================== 示例 6: 缓存拦截器 ====================
async function example6_caching() {
  const client = new HttpClient('https://jsonplaceholder.typicode.com');
  
  const { request: cacheRequest, response: cacheResponse } = createCacheInterceptor(60000); // 60 秒缓存
  
  client.useRequestInterceptor(cacheRequest);
  client.useResponseInterceptor(cacheResponse);
  
  console.log('第一次请求 (实际网络请求):');
  const r1 = await client.get('/posts/1');
  console.log('耗时:', r1.time, 'ms');
  
  console.log('\n第二次请求 (从缓存):');
  const r2 = await client.get('/posts/1');
  console.log('耗时:', r2.time, 'ms');
}

// ==================== 示例 7: 重试机制 ====================
async function example7_retry() {
  const response = await http.get('https://jsonplaceholder.typicode.com/posts/1', {
    retry: 3,        // 失败后重试 3 次
    retryDelay: 1000, // 每次重试间隔 1 秒
    timeout: 5000,    // 超时 5 秒
  });
  console.log('带重试的请求:', response.data);
}

// ==================== 示例 8: 自定义请求头 ====================
async function example8_headers() {
  const client = new HttpClient('https://api.example.com', {
    'X-API-Key': 'your-api-key',
    'X-Client-Version': '1.0.0',
  });
  
  // 也可以单独设置
  client.setDefaultHeaders({
    'X-Custom-Header': 'Axon-Client',
  });
  
  console.log('自定义请求头客户端已配置');
}

// ==================== 示例 9: 完整拦截器链 ====================
async function example9_interceptorChain() {
  const client = new HttpClient('https://jsonplaceholder.typicode.com');
  
  // 1. 缓存 (优先级最高)
  const { request: cacheReq, response: cacheRes } = createCacheInterceptor(30000);
  client.useRequestInterceptor(cacheReq);
  client.useResponseInterceptor(cacheRes);
  
  // 2. 日志
  const { request: logReq, response: logRes } = createLoggingInterceptor();
  client.useRequestInterceptor(logReq);
  client.useResponseInterceptor(logRes);
  
  // 3. 错误处理 (优先级最低)
  client.useResponseInterceptor(
    createErrorHandlingInterceptor((error) => {
      console.error('全局错误处理:', error.message);
    })
  );
  
  // 执行请求 - 会依次经过所有拦截器
  const response = await client.get('/posts/1');
  console.log('完整拦截器链响应:', response.status);
}

// ==================== 示例 10: 并发请求 ====================
async function example10_concurrent() {
  const [users, posts, comments] = await Promise.all([
    http.get('https://jsonplaceholder.typicode.com/users'),
    http.get('https://jsonplaceholder.typicode.com/posts'),
    http.get('https://jsonplaceholder.typicode.com/comments'),
  ]);
  
  console.log('并发请求完成:');
  console.log('- Users:', users.data.length);
  console.log('- Posts:', posts.data.length);
  console.log('- Comments:', comments.data.length);
}

// ==================== 运行示例 ====================
async function runExamples() {
  console.log('🚀 HTTP Utils 使用示例\n');
  console.log('=' .repeat(50));
  
  try {
    await example1_basicGet();
    console.log('\n');
    
    await example2_post();
    console.log('\n');
    
    await example3_logging();
    console.log('\n');
    
    await example7_retry();
    console.log('\n');
    
    await example10_concurrent();
    console.log('\n');
    
    console.log('✅ 示例执行完成');
  } catch (error) {
    console.error('❌ 示例执行失败:', error);
  }
}

// 导出所有示例函数
export {
  example1_basicGet,
  example2_post,
  example3_logging,
  example4_auth,
  example5_errorHandling,
  example6_caching,
  example7_retry,
  example8_headers,
  example9_interceptorChain,
  example10_concurrent,
  runExamples,
};

// 如果直接运行此文件
if (import.meta.url === `file://${process.argv[1]}`) {
  runExamples();
}
