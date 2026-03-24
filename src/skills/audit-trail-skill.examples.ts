/**
 * Audit Trail Skill - 快速使用示例
 * 
 * 5 分钟快速上手审计日志追踪
 * 
 * @author Axon (KAEL Engineering)
 * @version 1.0.0
 */

import { AuditTracker, AuditEventType } from './audit-utils-skill';

// ============== 示例 1: 基础使用 ==============
async function example1_basicUsage() {
  console.log('\n=== 示例 1: 基础使用 ===\n');

  // 1. 创建审计追踪器
  const tracker = new AuditTracker({
    logDir: './audit-logs',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    asyncWrite: true,
  });

  // 2. 记录简单事件
  await tracker.log({
    eventType: 'CUSTOM',
    level: 'low',
    userId: 'user_001',
    username: 'zhangsan',
    action: '用户执行了自定义操作',
    result: 'success',
    metadata: { customField: 'customValue' },
  });

  console.log('✓ 基础日志记录完成');
}

// ============== 示例 2: 用户认证审计 ==============
async function example2_userAuthentication() {
  console.log('\n=== 示例 2: 用户认证审计 ===\n');

  const tracker = new AuditTracker();

  // 记录登录成功
  await tracker.logUserLogin(
    'user_001',
    'zhangsan',
    '192.168.1.100',
    true, // 成功
  );

  // 记录登录失败
  await tracker.logUserLogin(
    'user_002',
    'lisi',
    '192.168.1.101',
    false, // 失败
    '密码错误',
  );

  // 记录登出
  await tracker.logUserLogout('user_001', 'zhangsan', 'session_abc123');

  console.log('✓ 用户认证审计完成');
}

// ============== 示例 3: 数据操作审计 ==============
async function example3_dataOperations() {
  console.log('\n=== 示例 3: 数据操作审计 ===\n');

  const tracker = new AuditTracker();

  // 记录数据访问
  await tracker.logDataAccess(
    'user_001',
    'document',
    'doc_001',
    '查看文档内容',
    true,
  );

  // 记录数据创建
  await tracker.logDataCreate(
    'user_001',
    'document',
    'doc_002',
    '创建新文档',
    true,
    { title: '新文档', content: '...' },
  );

  // 记录数据更新
  await tracker.logDataUpdate(
    'user_001',
    'document',
    'doc_001',
    '更新文档内容',
    true,
    { title: '旧标题' },
    { title: '新标题' },
  );

  // 记录数据删除
  await tracker.logDataDelete(
    'user_001',
    'document',
    'doc_003',
    '删除文档',
    true,
  );

  console.log('✓ 数据操作审计完成');
}

// ============== 示例 4: 配置变更审计 ==============
async function example4_configChanges() {
  console.log('\n=== 示例 4: 配置变更审计 ===\n');

  const tracker = new AuditTracker();

  // 记录配置变更
  await tracker.logConfigChange(
    'admin_001',
    'system.maxUploadSize',
    '10MB',
    '50MB',
    true,
  );

  console.log('✓ 配置变更审计完成');
}

// ============== 示例 5: 安全事件审计 ==============
async function example5_securityEvents() {
  console.log('\n=== 示例 5: 安全事件审计 ===\n');

  const tracker = new AuditTracker();

  // 记录暴力破解检测
  await tracker.logSecurityAlert(
    'BRUTE_FORCE_DETECTED',
    '检测到多次登录失败',
    'user_002',
    '192.168.1.101',
    'critical',
  );

  // 记录异常访问
  await tracker.logSecurityAlert(
    'UNUSUAL_ACCESS_PATTERN',
    '非工作时间访问敏感数据',
    'user_003',
    '10.0.0.50',
    'high',
  );

  console.log('✓ 安全事件审计完成');
}

// ============== 示例 6: API 调用审计 ==============
async function example6_apiCalls() {
  console.log('\n=== 示例 6: API 调用审计 ===\n');

  const tracker = new AuditTracker();

  // 记录 API 调用
  await tracker.logApiCall(
    'user_001',
    'GET',
    '/api/v1/users',
    200,
    45, // 耗时 45ms
    '192.168.1.100',
  );

  await tracker.logApiCall(
    'user_001',
    'POST',
    '/api/v1/documents',
    201,
    120,
    '192.168.1.100',
  );

  console.log('✓ API 调用审计完成');
}

// ============== 示例 7: 日志查询 ==============
async function example7_logQuery() {
  console.log('\n=== 示例 7: 日志查询 ===\n');

  const tracker = new AuditTracker();

  // 查询特定用户的日志
  const userLogs = await tracker.query({
    userId: 'user_001',
    limit: 10,
  });
  console.log(`用户 user_001 的日志数：${userLogs.length}`);

  // 查询特定事件类型
  const loginLogs = await tracker.query({
    eventType: 'USER_LOGIN',
    limit: 10,
  });
  console.log(`登录事件数：${loginLogs.length}`);

  // 查询高级别事件
  const highLevelLogs = await tracker.query({
    level: ['high', 'critical'],
    limit: 10,
  });
  console.log(`高级别事件数：${highLevelLogs.length}`);

  // 按时间范围查询
  const recentLogs = await tracker.query({
    startTime: new Date(Date.now() - 3600000).toISOString(), // 最近 1 小时
    limit: 100,
  });
  console.log(`最近 1 小时的日志数：${recentLogs.length}`);

  console.log('✓ 日志查询完成');
}

// ============== 示例 8: 统计信息 ==============
async function example8_statistics() {
  console.log('\n=== 示例 8: 统计信息 ===\n');

  const tracker = new AuditTracker();

  // 获取统计信息
  const stats = await tracker.getStats();

  console.log('审计统计:');
  console.log(`  总日志数：${stats.totalEntries}`);
  console.log(`  按事件类型:`, stats.byEventType);
  console.log(`  按级别:`, stats.byLevel);
  console.log(`  按用户:`, stats.byUser);
  console.log(`  按结果:`, stats.byResult);

  console.log('✓ 统计信息获取完成');
}

// ============== 示例 9: 生成审计报告 ==============
async function example9_generateReport() {
  console.log('\n=== 示例 9: 生成审计报告 ===\n');

  const tracker = new AuditTracker();

  // 生成 Markdown 报告
  const report = await tracker.generateReport({
    title: '每日审计报告',
    format: 'markdown',
    outputPath: './audit-reports/daily-audit.md',
    includeStats: true,
    includeTimeAnalysis: true,
    includeUserAnalysis: true,
    includeSecuritySummary: true,
  });

  console.log(`✓ 审计报告生成完成: ${report.outputPath}`);
  console.log(`  报告大小：${report.size} 字节`);
}

// ============== 示例 10: 数据导出 ==============
async function example10_dataExport() {
  console.log('\n=== 示例 10: 数据导出 ===\n');

  const tracker = new AuditTracker();

  // 导出为 JSON
  const jsonData = await tracker.exportToJson({
    startTime: new Date(Date.now() - 86400000).toISOString(), // 最近 24 小时
    limit: 1000,
  });
  console.log(`✓ JSON 导出完成：${jsonData.length} 条记录`);

  // 导出为 CSV
  const csvData = await tracker.exportToCsv({
    eventType: 'USER_LOGIN',
    startTime: new Date(Date.now() - 86400000).toISOString(),
  });
  console.log(`✓ CSV 导出完成：${csvData.split('\n').length} 行`);
}

// ============== 示例 11: 敏感数据保护 ==============
async function example11_sensitiveDataProtection() {
  console.log('\n=== 示例 11: 敏感数据保护 ===\n');

  const tracker = new AuditTracker();

  // 记录包含敏感数据的事件
  await tracker.log({
    eventType: 'USER_CREATE',
    level: 'medium',
    userId: 'admin_001',
    action: '创建新用户',
    result: 'success',
    afterState: {
      username: 'newuser',
      password: 'secret123', // 会自动脱敏
      apiKey: 'sk-xxx-yyy-zzz', // 会自动脱敏
      email: 'newuser@example.com',
    },
  });

  console.log('✓ 敏感数据自动脱敏完成');
  console.log('  注意：password 和 apiKey 字段会被自动替换为 [REDACTED]');
}

// ============== 示例 12: 会话追踪 ==============
async function example12_sessionTracking() {
  console.log('\n=== 示例 12: 会话追踪 ===\n');

  const tracker = new AuditTracker();
  const sessionId = `session_${Date.now()}`;

  // 会话开始
  await tracker.log({
    eventType: 'USER_LOGIN',
    sessionId,
    userId: 'user_001',
    username: 'zhangsan',
    action: '用户登录',
    result: 'success',
  });

  // 会话中的操作
  await tracker.log({
    sessionId,
    userId: 'user_001',
    action: '查看文档',
    resourceType: 'document',
    resourceId: 'doc_001',
    result: 'success',
  });

  await tracker.log({
    sessionId,
    userId: 'user_001',
    action: '下载文件',
    resourceType: 'file',
    resourceId: 'file_001',
    result: 'success',
  });

  // 会话结束
  await tracker.log({
    eventType: 'USER_LOGOUT',
    sessionId,
    userId: 'user_001',
    action: '用户登出',
    result: 'success',
  });

  // 查询整个会话
  const sessionLogs = await tracker.query({ sessionId });
  console.log(`✓ 会话追踪完成，会话包含 ${sessionLogs.length} 条日志`);
}

// ============== 示例 13: 批量操作审计 ==============
async function example13_batchOperations() {
  console.log('\n=== 示例 13: 批量操作审计 ===\n');

  const tracker = new AuditTracker();

  // 批量记录日志
  const batchLogs = Array.from({ length: 10 }, (_, i) => ({
    eventType: 'DATA_ACCESS' as AuditEventType,
    level: 'low' as const,
    userId: `user_${i}`,
    action: `批量操作 ${i}`,
    result: 'success' as const,
    metadata: { batchId: 'batch_001', index: i },
  }));

  await tracker.logBatch(batchLogs);
  console.log(`✓ 批量记录完成：${batchLogs.length} 条日志`);
}

// ============== 示例 14: 合规性检查 ==============
async function example14_complianceCheck() {
  console.log('\n=== 示例 14: 合规性检查 ===\n');

  const tracker = new AuditTracker();

  // 检查是否有未授权访问
  const unauthorizedAccess = await tracker.query({
    eventType: 'DATA_ACCESS',
    result: 'failure',
    level: ['high', 'critical'],
    startTime: new Date(Date.now() - 86400000).toISOString(),
  });

  if (unauthorizedAccess.length > 0) {
    console.log(`⚠️  检测到 ${unauthorizedAccess.length} 次未授权访问尝试`);
    
    // 生成安全警报
    await tracker.logSecurityAlert(
      'UNAUTHORIZED_ACCESS_DETECTED',
      `检测到 ${unauthorizedAccess.length} 次未授权访问`,
      undefined,
      undefined,
      'critical',
    );
  } else {
    console.log('✓ 未检测到未授权访问');
  }
}

// ============== 示例 15: 性能监控 ==============
async function example15_performanceMonitoring() {
  console.log('\n=== 示例 15: 性能监控 ===\n');

  const tracker = new AuditTracker();

  // 模拟记录多个 API 调用
  const apiCalls = [
    { endpoint: '/api/users', duration: 45 },
    { endpoint: '/api/documents', duration: 120 },
    { endpoint: '/api/reports', duration: 250 },
    { endpoint: '/api/analytics', duration: 500 }, // 慢速 API
  ];

  for (const call of apiCalls) {
    await tracker.logApiCall(
      'user_001',
      'GET',
      call.endpoint,
      200,
      call.duration,
      '192.168.1.100',
    );
  }

  // 分析慢速 API
  const allApiCalls = await tracker.query({
    eventType: 'API_CALL',
    limit: 100,
  });

  const slowApis = allApiCalls.filter(
    (log) => (log.metadata?.durationMs || 0) > 200,
  );

  console.log(`✓ 性能监控完成`);
  console.log(`  总 API 调用数：${allApiCalls.length}`);
  console.log(`  慢速 API 数 (>200ms): ${slowApis.length}`);
  
  if (slowApis.length > 0) {
    console.log('  慢速 API 列表:');
    slowApis.forEach((log) => {
      console.log(`    - ${log.action}: ${log.metadata?.durationMs}ms`);
    });
  }
}

// ============== 主函数 ==============
async function main() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║       Audit Trail Skill - 快速使用示例                 ║');
  console.log('║       作者：Axon (KAEL Engineering)                    ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  try {
    // 运行所有示例
    await example1_basicUsage();
    await example2_userAuthentication();
    await example3_dataOperations();
    await example4_configChanges();
    await example5_securityEvents();
    await example6_apiCalls();
    await example7_logQuery();
    await example8_statistics();
    await example9_generateReport();
    await example10_dataExport();
    await example11_sensitiveDataProtection();
    await example12_sessionTracking();
    await example13_batchOperations();
    await example14_complianceCheck();
    await example15_performanceMonitoring();

    console.log('\n╔════════════════════════════════════════════════════════╗');
    console.log('║                 所有示例运行完成！                     ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ 示例运行失败:', error);
    process.exit(1);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  main();
}

// 导出所有示例函数供外部调用
export {
  example1_basicUsage,
  example2_userAuthentication,
  example3_dataOperations,
  example4_configChanges,
  example5_securityEvents,
  example6_apiCalls,
  example7_logQuery,
  example8_statistics,
  example9_generateReport,
  example10_dataExport,
  example11_sensitiveDataProtection,
  example12_sessionTracking,
  example13_batchOperations,
  example14_complianceCheck,
  example15_performanceMonitoring,
};
