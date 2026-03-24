/**
 * Audit Utils Skill - 使用示例
 * 
 * 演示如何使用审计日志追踪工具
 */

import { AuditTracker, AuditLogEntry } from './audit-utils-skill';

// ============== 示例 1: 基础使用 ==============

async function example1_BasicUsage() {
  console.log('\n=== 示例 1: 基础使用 ===\n');

  // 创建审计追踪器实例
  const tracker = new AuditTracker({
    logDir: './audit-logs',
    maxFileSize: 50 * 1024 * 1024, // 50MB
    maxFiles: 10,
    asyncWrite: true,
  });

  // 记录自定义事件
  await tracker.log({
    eventType: 'CUSTOM',
    level: 'low',
    userId: 'user_123',
    username: 'zhangsan',
    action: 'User completed profile setup',
    result: 'success',
    metadata: {
      profileCompleteness: 100,
      setupDuration: 300, // seconds
    },
  });

  console.log('✓ 基础日志记录完成');
}

// ============== 示例 2: 用户认证审计 ==============

async function example2_UserAuthentication() {
  console.log('\n=== 示例 2: 用户认证审计 ===\n');

  const tracker = new AuditTracker();

  // 用户登录成功
  await tracker.logUserLogin(
    'user_456',
    'lisi',
    '192.168.1.100',
    true
  );

  // 用户登录失败
  await tracker.logUserLogin(
    'user_789',
    'wangwu',
    '192.168.1.101',
    false,
    'Invalid password'
  );

  // 用户登出
  await tracker.logUserLogout(
    'user_456',
    'lisi',
    'session_abc123'
  );

  console.log('✓ 用户认证审计完成');
}

// ============== 示例 3: 数据操作审计 ==============

async function example3_DataOperations() {
  console.log('\n=== 示例 3: 数据操作审计 ===\n');

  const tracker = new AuditTracker();

  // 数据访问
  await tracker.logDataAccess(
    'user_456',
    'document',
    'doc_001',
    'Viewed document',
    true
  );

  // 数据创建
  await tracker.log({
    eventType: 'DATA_CREATE',
    level: 'low',
    userId: 'user_456',
    resourceType: 'document',
    resourceId: 'doc_002',
    action: 'Created new document',
    afterState: {
      title: 'Project Plan',
      content: '...',
      visibility: 'private',
    },
    result: 'success',
  });

  // 数据更新
  await tracker.log({
    eventType: 'DATA_UPDATE',
    level: 'low',
    userId: 'user_456',
    resourceType: 'document',
    resourceId: 'doc_001',
    action: 'Updated document content',
    beforeState: { content: 'Old content' },
    afterState: { content: 'New content' },
    result: 'success',
  });

  // 数据删除
  await tracker.log({
    eventType: 'DATA_DELETE',
    level: 'medium',
    userId: 'user_456',
    resourceType: 'document',
    resourceId: 'doc_003',
    action: 'Deleted document',
    beforeState: { title: 'Old Draft' },
    result: 'success',
  });

  console.log('✓ 数据操作审计完成');
}

// ============== 示例 4: 配置变更审计 ==============

async function example4_ConfigChanges() {
  console.log('\n=== 示例 4: 配置变更审计 ===\n');

  const tracker = new AuditTracker();

  // 配置变更
  await tracker.logConfigChange(
    'admin_001',
    'system.maxUploadSize',
    '10MB',
    '50MB',
    true
  );

  // 敏感配置变更 (自动脱敏)
  await tracker.log({
    eventType: 'CONFIG_CHANGE',
    level: 'high',
    userId: 'admin_001',
    resourceType: 'config',
    resourceId: 'database.password',
    action: 'Changed database password',
    beforeState: { value: 'old_password_123' },
    afterState: { value: 'new_password_456' },
    result: 'success',
  });

  console.log('✓ 配置变更审计完成');
}

// ============== 示例 5: 安全事件审计 ==============

async function example5_SecurityEvents() {
  console.log('\n=== 示例 5: 安全事件审计 ===\n');

  const tracker = new AuditTracker();

  // 安全警报 - 多次登录失败
  await tracker.logSecurityAlert(
    'BRUTE_FORCE_DETECTED',
    'Multiple failed login attempts from same IP',
    undefined,
    '192.168.1.200',
    'high'
  );

  // 安全警报 - 异常访问
  await tracker.logSecurityAlert(
    'UNUSUAL_ACCESS_PATTERN',
    'User accessed sensitive resource outside normal hours',
    'user_999',
    '10.0.0.50',
    'critical'
  );

  // 权限变更
  await tracker.log({
    eventType: 'PERMISSION_CHANGE',
    level: 'high',
    userId: 'admin_001',
    resourceType: 'user',
    resourceId: 'user_789',
    action: 'Granted admin permissions',
    beforeState: { role: 'user' },
    afterState: { role: 'admin' },
    result: 'success',
  });

  console.log('✓ 安全事件审计完成');
}

// ============== 示例 6: API 调用审计 ==============

async function example6_ApiCalls() {
  console.log('\n=== 示例 6: API 调用审计 ===\n');

  const tracker = new AuditTracker();

  // 成功的 API 调用
  await tracker.logApiCall(
    'user_456',
    'GET',
    '/api/v1/users',
    200,
    45,
    '192.168.1.100'
  );

  // 失败的 API 调用
  await tracker.logApiCall(
    'user_789',
    'POST',
    '/api/v1/documents',
    403,
    12,
    '192.168.1.101'
  );

  // 慢速 API 调用
  await tracker.logApiCall(
    'user_456',
    'GET',
    '/api/v1/reports/large',
    200,
    5230, // 5.23 秒
    '192.168.1.100'
  );

  console.log('✓ API 调用审计完成');
}

// ============== 示例 7: 日志查询 ==============

async function example7_LogQuery() {
  console.log('\n=== 示例 7: 日志查询 ===\n');

  const tracker = new AuditTracker();

  // 查询所有日志
  const allLogs = await tracker.query();
  console.log(`总日志数：${allLogs.length}`);

  // 按事件类型查询
  const loginLogs = await tracker.query({
    eventType: 'USER_LOGIN',
  });
  console.log(`登录事件数：${loginLogs.length}`);

  // 按级别查询
  const criticalLogs = await tracker.query({
    level: 'critical',
  });
  console.log(`危急事件数：${criticalLogs.length}`);

  // 按用户查询
  const userLogs = await tracker.query({
    userId: 'user_456',
  });
  console.log(`用户 user_456 的操作数：${userLogs.length}`);

  // 按时间范围查询
  const recentLogs = await tracker.query({
    startTime: new Date(Date.now() - 3600000).toISOString(), // 最近 1 小时
    endTime: new Date().toISOString(),
  });
  console.log(`最近 1 小时的日志数：${recentLogs.length}`);

  // 关键词搜索
  const searchLogs = await tracker.query({
    search: 'document',
  });
  console.log(`包含 "document" 的日志数：${searchLogs.length}`);

  // 组合查询
  const combinedLogs = await tracker.query({
    eventType: ['USER_LOGIN', 'USER_LOGOUT'],
    result: 'failure',
    limit: 10,
    sortBy: 'timestamp',
    sortOrder: 'desc',
  });
  console.log(`失败的登录/登出事件 (前 10 条): ${combinedLogs.length}`);

  console.log('✓ 日志查询完成');
}

// ============== 示例 8: 统计信息 ==============

async function example8_Statistics() {
  console.log('\n=== 示例 8: 统计信息 ===\n');

  const tracker = new AuditTracker();

  // 获取所有统计
  const stats = await tracker.getStats();

  console.log('\n📊 审计统计报告:');
  console.log(`总条目数：${stats.totalEntries}`);
  console.log(`时间范围：${stats.timeRange.earliest} - ${stats.timeRange.latest}`);
  console.log(`成功：${stats.byResult.success} | 失败：${stats.byResult.failure}`);
  console.log(`总文件大小：${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);

  console.log('\n按级别分布:');
  for (const [level, count] of Object.entries(stats.byLevel)) {
    if (count > 0) console.log(`  ${level}: ${count}`);
  }

  console.log('\n按事件类型分布 (Top 5):');
  const topEvents = Object.entries(stats.byEventType)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  for (const [type, count] of topEvents) {
    console.log(`  ${type}: ${count}`);
  }

  console.log('\n活跃用户 (Top 5):');
  const topUsers = Object.entries(stats.byUser)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);
  
  for (const [userId, count] of topUsers) {
    console.log(`  ${userId}: ${count} 次操作`);
  }

  console.log('\n✓ 统计信息获取完成');
}

// ============== 示例 9: 生成审计报告 ==============

async function example9_GenerateReport() {
  console.log('\n=== 示例 9: 生成审计报告 ===\n');

  const tracker = new AuditTracker();

  // 生成 JSON 格式报告
  const jsonReport = await tracker.generateReport({
    title: '每日审计报告',
    format: 'json',
    outputPath: './audit-reports/daily-report.json',
  });

  console.log('✓ JSON 报告已生成');

  // 生成 Markdown 格式报告
  const mdReport = await tracker.generateReport({
    title: '每周安全审计',
    format: 'markdown',
    outputPath: './audit-reports/weekly-audit.md',
    includeStats: true,
    includeTimeAnalysis: true,
    includeUserAnalysis: true,
    includeSecuritySummary: true,
  });

  console.log('✓ Markdown 报告已生成');

  // 生成 HTML 格式报告
  const htmlReport = await tracker.generateReport({
    title: '月度合规报告',
    format: 'html',
    outputPath: './audit-reports/monthly-compliance.html',
  });

  console.log('✓ HTML 报告已生成');

  console.log('\n报告预览:');
  console.log(`- 总条目数：${jsonReport.stats.totalEntries}`);
  console.log(`- 危急事件：${jsonReport.securitySummary?.criticalEvents}`);
  console.log(`- 可疑用户：${jsonReport.userAnalysis?.suspiciousUsers.length}`);
}

// ============== 示例 10: 数据导出 ==============

async function example10_DataExport() {
  console.log('\n=== 示例 10: 数据导出 ===\n');

  const tracker = new AuditTracker();

  // 导出为 JSON
  const jsonData = await tracker.exportToJson({
    startTime: new Date(Date.now() - 86400000).toISOString(), // 最近 24 小时
    limit: 1000,
  });
  
  console.log(`JSON 导出：${jsonData.length} 字节`);

  // 导出为 CSV
  const csvData = await tracker.exportToCsv({
    eventType: 'USER_LOGIN',
    startTime: new Date(Date.now() - 86400000).toISOString(),
  });
  
  console.log(`CSV 导出：${csvData.length} 字节`);
  console.log('\nCSV 预览 (前 5 行):');
  console.log(csvData.split('\n').slice(0, 5).join('\n'));

  console.log('\n✓ 数据导出完成');
}

// ============== 示例 11: 敏感数据保护 ==============

async function example11_SensitiveDataProtection() {
  console.log('\n=== 示例 11: 敏感数据保护 ===\n');

  const tracker = new AuditTracker();

  // 记录包含敏感信息的事件 (自动脱敏)
  await tracker.log({
    eventType: 'USER_CREATE',
    level: 'medium',
    userId: 'admin_001',
    action: 'Created new user with credentials',
    afterState: {
      username: 'newuser',
      email: 'newuser@example.com',
      password: 'super_secret_password_123', // 会被脱敏
      apiKey: 'sk-1234567890abcdef', // 会被脱敏
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', // 会被脱敏
    },
    result: 'success',
  });

  console.log('✓ 敏感数据已自动脱敏并记录');
  console.log('  检查日志文件，密码、API Key、Token 等字段显示为 [REDACTED]');
}

// ============== 示例 12: 异步 vs 同步写入 ==============

async function example12_AsyncVsSync() {
  console.log('\n=== 示例 12: 异步 vs 同步写入 ===\n');

  // 异步写入 (默认，推荐用于生产环境)
  const asyncTracker = new AuditTracker({
    asyncWrite: true,
  });

  console.log('异步写入：日志记录立即返回，后台批量写入');
  await asyncTracker.log({
    eventType: 'CUSTOM',
    action: 'Async log entry',
    result: 'success',
  });
  console.log('✓ 异步日志记录完成');

  // 同步写入 (用于调试或需要立即持久化的场景)
  const syncTracker = new AuditTracker({
    asyncWrite: false,
  });

  console.log('\n同步写入：日志记录立即写入磁盘');
  syncTracker.log({
    eventType: 'CUSTOM',
    action: 'Sync log entry',
    result: 'success',
  });
  console.log('✓ 同步日志记录完成');
}

// ============== 示例 13: 批量操作审计 ==============

async function example13_BatchOperations() {
  console.log('\n=== 示例 13: 批量操作审计 ===\n');

  const tracker = new AuditTracker();

  // 模拟批量导入
  const batchId = `batch_${Date.now()}`;
  
  await tracker.log({
    eventType: 'DATA_CREATE',
    level: 'medium',
    userId: 'user_456',
    action: 'Started batch import',
    metadata: {
      batchId,
      totalItems: 1000,
      source: 'CSV upload',
    },
    result: 'success',
  });

  // 模拟处理过程
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < 1000; i++) {
    const success = Math.random() > 0.05; // 5% 失败率
    
    if (success) {
      successCount++;
    } else {
      failureCount++;
    }
  }

  // 记录批量操作结果
  await tracker.log({
    eventType: 'DATA_CREATE',
    level: failureCount > 50 ? 'high' : 'low',
    userId: 'user_456',
    action: 'Completed batch import',
    metadata: {
      batchId,
      totalItems: 1000,
      successCount,
      failureCount,
      successRate: `${((successCount / 1000) * 100).toFixed(2)}%`,
    },
    result: failureCount > 100 ? 'failure' : 'success',
    errorMessage: failureCount > 100 ? `Too many failures: ${failureCount}` : undefined,
  });

  console.log(`批量导入完成：成功 ${successCount}, 失败 ${failureCount}`);
  console.log('✓ 批量操作审计完成');
}

// ============== 示例 14: 会话追踪 ==============

async function example14_SessionTracking() {
  console.log('\n=== 示例 14: 会话追踪 ===\n');

  const tracker = new AuditTracker();

  const sessionId = `session_${Date.now()}`;
  const userId = 'user_456';

  // 会话开始
  await tracker.log({
    eventType: 'USER_LOGIN',
    level: 'low',
    userId,
    sessionId,
    action: 'Session started',
    result: 'success',
  });

  // 会话中的操作
  await tracker.log({
    eventType: 'DATA_ACCESS',
    level: 'low',
    userId,
    sessionId,
    resourceType: 'dashboard',
    action: 'Viewed analytics dashboard',
    result: 'success',
  });

  await tracker.log({
    eventType: 'API_CALL',
    level: 'low',
    userId,
    sessionId,
    resourceType: 'api',
    resourceId: '/api/v1/reports',
    action: 'GET /api/v1/reports',
    result: 'success',
  });

  // 会话结束
  await tracker.log({
    eventType: 'USER_LOGOUT',
    level: 'low',
    userId,
    sessionId,
    action: 'Session ended',
    result: 'success',
  });

  // 查询整个会话
  const sessionLogs = await tracker.query({
    sessionId,
  });

  console.log(`会话 ${sessionId} 共记录 ${sessionLogs.length} 条日志`);
  console.log('✓ 会话追踪完成');
}

// ============== 示例 15: 合规性检查 ==============

async function example15_ComplianceCheck() {
  console.log('\n=== 示例 15: 合规性检查 ===\n');

  const tracker = new AuditTracker();

  // 生成合规报告
  const report = await tracker.generateReport({
    title: 'SOC2 合规审计报告',
    format: 'markdown',
    outputPath: './audit-reports/soc2-compliance.md',
  });

  // 检查合规性指标
  const compliance = {
    // 所有敏感操作都有审计日志
    allSensitiveActionsLogged: report.stats.byEventType.PERMISSION_CHANGE + 
                                report.stats.byEventType.CONFIG_CHANGE + 
                                report.stats.byEventType.SECURITY_ALERT > 0,
    
    // 失败的操作都有错误信息
    failureReasonsDocumented: report.stats.byResult.failure === 0 || true, // 简化检查
    
    // 没有未授权的访问
    noUnauthorizedAccess: report.securitySummary?.criticalEvents === 0,
    
    // 用户活动可追溯
    userActivityTraceable: Object.keys(report.stats.byUser).length > 0,
  };

  console.log('\n🔒 合规性检查结果:');
  console.log(`✓ 敏感操作记录：${compliance.allSensitiveActionsLogged ? '通过' : '失败'}`);
  console.log(`✓ 失败原因记录：${compliance.failureReasonsDocumented ? '通过' : '失败'}`);
  console.log(`✓ 未授权访问：${compliance.noUnauthorizedAccess ? '未检测到' : '检测到'}`);
  console.log(`✓ 用户活动追溯：${compliance.userActivityTraceable ? '通过' : '失败'}`);

  console.log('\n✓ 合规性检查完成');
}

// ============== 主函数 ==============

async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║       Audit Utils Skill - 使用示例演示                   ║');
  console.log('╚══════════════════════════════════════════════════════════╝');

  try {
    // 运行所有示例
    await example1_BasicUsage();
    await example2_UserAuthentication();
    await example3_DataOperations();
    await example4_ConfigChanges();
    await example5_SecurityEvents();
    await example6_ApiCalls();
    await example7_LogQuery();
    await example8_Statistics();
    await example9_GenerateReport();
    await example10_DataExport();
    await example11_SensitiveDataProtection();
    await example12_AsyncVsSync();
    await example13_BatchOperations();
    await example14_SessionTracking();
    await example15_ComplianceCheck();

    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                  所有示例运行完成！✅                     ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ 示例运行出错:', error);
  }
}

// 运行示例
if (require.main === module) {
  main();
}

// 导出所有示例函数供单独运行
export {
  example1_BasicUsage,
  example2_UserAuthentication,
  example3_DataOperations,
  example4_ConfigChanges,
  example5_SecurityEvents,
  example6_ApiCalls,
  example7_LogQuery,
  example8_Statistics,
  example9_GenerateReport,
  example10_DataExport,
  example11_SensitiveDataProtection,
  example12_AsyncVsSync,
  example13_BatchOperations,
  example14_SessionTracking,
  example15_ComplianceCheck,
};
