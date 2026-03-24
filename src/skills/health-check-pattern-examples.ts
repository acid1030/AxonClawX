/**
 * Health Check Pattern Examples - ACE 健康监控使用示例
 * 
 * 运行方式：
 * cd /Users/nike/.openclaw/workspace
 * npx ts-node src/skills/health-check-pattern-examples.ts
 */

import {
  HealthChecker,
  runHealthCheck,
  getSystemMetrics,
  checkCPU,
  checkMemory,
  checkDisk,
  checkUptime,
  checkLoad,
  checkCommand,
  registerCheck,
  getCheckResults
} from './health-check-pattern-skill';

// ============================================================================
// 示例 1: 快速健康检查
// ============================================================================

async function example1_QuickHealthCheck() {
  console.log('\n=== 示例 1: 快速健康检查 ===\n');
  
  const report = await runHealthCheck();
  
  console.log('整体状态:', report.overall);
  console.log('检查耗时:', report.duration + 'ms');
  console.log('\n检查结果:');
  
  report.checks.forEach(check => {
    const icon = {
      healthy: '✅',
      warning: '⚠️',
      critical: '❌',
      unknown: '❓'
    }[check.status];
    
    console.log(`  ${icon} ${check.name}: ${check.message}`);
    if (check.duration) {
      console.log(`     耗时：${check.duration}ms`);
    }
  });
  
  console.log('\n汇总:');
  console.log(`  总计：${report.summary.total}`);
  console.log(`  健康：${report.summary.healthy}`);
  console.log(`  警告：${report.summary.warning}`);
  console.log(`  严重：${report.summary.critical}`);
  console.log(`  未知：${report.summary.unknown}`);
}

// ============================================================================
// 示例 2: 获取系统指标
// ============================================================================

async function example2_SystemMetrics() {
  console.log('\n=== 示例 2: 获取系统指标 ===\n');
  
  const metrics = await getSystemMetrics();
  
  console.log('CPU:');
  console.log(`  使用率：${metrics.cpu.usage.toFixed(2)}%`);
  console.log(`  核心数：${metrics.cpu.cores}`);
  console.log(`  型号：${metrics.cpu.model}`);
  
  console.log('\n内存:');
  console.log(`  总计：${(metrics.memory.total / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`  已用：${(metrics.memory.used / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`  空闲：${(metrics.memory.free / 1024 / 1024 / 1024).toFixed(2)} GB`);
  console.log(`  使用率：${metrics.memory.usagePercent.toFixed(2)}%`);
  
  console.log('\n磁盘:');
  console.log(`  使用率：${metrics.disk.usagePercent.toFixed(2)}%`);
  
  console.log('\n系统信息:');
  console.log(`  运行时间：${(metrics.uptime / 3600).toFixed(2)} 小时`);
  console.log(`  平台：${metrics.platform}`);
  console.log(`  架构：${metrics.arch}`);
  console.log(`  Node 版本：${metrics.nodeVersion}`);
  console.log(`  负载平均：${metrics.loadAvg.map(l => l.toFixed(2)).join(', ')}`);
}

// ============================================================================
// 示例 3: 单项检查
// ============================================================================

async function example3_SingleChecks() {
  console.log('\n=== 示例 3: 单项检查 ===\n');
  
  const checks = [
    { name: 'CPU', fn: checkCPU },
    { name: '内存', fn: checkMemory },
    { name: '磁盘', fn: checkDisk },
    { name: '运行时间', fn: checkUptime },
    { name: '负载', fn: checkLoad }
  ];
  
  for (const check of checks) {
    const result = await check.fn();
    const icon = {
      healthy: '✅',
      warning: '⚠️',
      critical: '❌',
      unknown: '❓'
    }[result.status];
    
    console.log(`${icon} ${check.name}: ${result.message}`);
  }
}

// ============================================================================
// 示例 4: 自定义命令检查
// ============================================================================

async function example4_CustomCommandChecks() {
  console.log('\n=== 示例 4: 自定义命令检查 ===\n');
  
  // 检查 Node.js 版本
  const nodeVersion = await checkCommand(
    'node-version',
    'node --version',
    undefined,
    undefined
  );
  console.log(`Node 版本：${nodeVersion.message}`);
  
  // 检查当前目录文件数
  const fileCount = await checkCommand(
    'file-count',
    'ls -1 | wc -l',
    100,    // 警告阈值
    1000    // 严重阈值
  );
  console.log(`文件数：${fileCount.message}`);
  console.log(`  状态：${fileCount.status}`);
  console.log(`  警告阈值：${fileCount.threshold}`);
  
  // 检查内存使用 (MB)
  const memUsage = await checkCommand(
    'memory-usage',
    'node -e "console.log(Math.round((process.memoryUsage().heapUsed / 1024 / 1024) * 100) / 100)"',
    500,
    1000
  );
  console.log(`内存使用：${memUsage.value} MB`);
  console.log(`  状态：${memUsage.status}`);
}

// ============================================================================
// 示例 5: 使用 HealthChecker 类
// ============================================================================

async function example5_HealthCheckerClass() {
  console.log('\n=== 示例 5: 使用 HealthChecker 类 ===\n');
  
  const checker = new HealthChecker();
  
  // 注册自定义检查
  checker.register({
    name: 'disk-space',
    command: 'df -h / | tail -1 | awk \'{print $5}\' | tr -d "%"',
    threshold: 70,
    criticalThreshold: 90,
    timeout: 5000
  });
  
  checker.register({
    name: 'process-count',
    command: 'ps aux | wc -l',
    threshold: 200,
    criticalThreshold: 500,
    timeout: 3000
  });
  
  // 执行所有检查
  const report = await checker.executeAll();
  
  console.log('自定义检查结果:');
  report.checks.forEach(check => {
    const icon = {
      healthy: '✅',
      warning: '⚠️',
      critical: '❌',
      unknown: '❓'
    }[check.status];
    
    console.log(`  ${icon} ${check.name}: ${check.message}`);
    if (check.value !== undefined) {
      console.log(`     值：${check.value}`);
    }
  });
  
  // 获取系统指标
  const metrics = await checker.getSystemMetrics();
  console.log(`\n系统指标:`);
  console.log(`  CPU: ${metrics.cpu.usage.toFixed(1)}%`);
  console.log(`  内存：${metrics.memory.usagePercent.toFixed(1)}%`);
  console.log(`  磁盘：${metrics.disk.usagePercent.toFixed(1)}%`);
  
  // 获取最近的检查结果
  const results = checker.getResults();
  console.log(`\n缓存的检查结果：${results.size} 项`);
}

// ============================================================================
// 示例 6: 注册全局检查
// ============================================================================

async function example6_GlobalRegistration() {
  console.log('\n=== 示例 6: 注册全局检查 ===\n');
  
  // 注册到默认检查器
  registerCheck({
    name: 'uptime-seconds',
    command: 'node -e "console.log(Math.round(process.uptime()))"',
    threshold: 86400, // 1 天警告
    enabled: true
  });
  
  registerCheck({
    name: 'cpu-cores',
    command: 'node -e "console.log(require(\'os\').cpus().length)"',
    enabled: true
  });
  
  // 执行所有检查 (包括注册的)
  const report = await runHealthCheck();
  
  console.log('包含自定义检查的报告:');
  console.log(`  总检查数：${report.summary.total}`);
  console.log(`  整体状态：${report.overall}`);
  
  // 获取所有结果
  const results = getCheckResults();
  console.log(`  缓存结果：${results.size} 项`);
  
  results.forEach((result, name) => {
    console.log(`    - ${name}: ${result.status}`);
  });
}

// ============================================================================
// 示例 7: 模拟告警场景
// ============================================================================

async function example7_AlertSimulation() {
  console.log('\n=== 示例 7: 模拟告警场景 ===\n');
  
  const checker = new HealthChecker();
  
  // 注册一个会触发警告的检查
  checker.register({
    name: 'simulated-warning',
    command: 'echo 85', // 模拟 85% 的使用率
    threshold: 80,
    criticalThreshold: 95
  });
  
  // 注册一个会触发严重的检查
  checker.register({
    name: 'simulated-critical',
    command: 'echo 98', // 模拟 98% 的使用率
    threshold: 80,
    criticalThreshold: 95
  });
  
  const report = await checker.executeAll();
  
  console.log('告警模拟:');
  console.log(`  整体状态：${report.overall}`);
  
  report.checks.forEach(check => {
    const alertLevel = {
      healthy: '正常',
      warning: '⚠️  警告',
      critical: '🚨 严重',
      unknown: '未知'
    }[check.status];
    
    console.log(`  ${alertLevel} - ${check.name}: ${check.message}`);
  });
  
  // 生成告警消息
  if (report.overall === 'critical' || report.overall === 'warning') {
    console.log('\n📢 告警通知:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`级别：${report.overall.toUpperCase()}`);
    console.log(`时间：${new Date(report.timestamp).toLocaleString()}`);
    console.log(`\n问题检查:`);
    
    report.checks
      .filter(c => c.status === 'warning' || c.status === 'critical')
      .forEach(c => {
        console.log(`  • ${c.name}: ${c.message}`);
      });
    
    console.log(`\n汇总:`);
    console.log(`  健康：${report.summary.healthy}`);
    console.log(`  警告：${report.summary.warning}`);
    console.log(`  严重：${report.summary.critical}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }
}

// ============================================================================
// 示例 8: 性能测试
// ============================================================================

async function example8_PerformanceTest() {
  console.log('\n=== 示例 8: 性能测试 ===\n');
  
  const iterations = 10;
  const times: number[] = [];
  
  console.log(`执行 ${iterations} 次健康检查...`);
  
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    await runHealthCheck();
    const duration = Date.now() - start;
    times.push(duration);
    console.log(`  第 ${i + 1} 次：${duration}ms`);
  }
  
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const min = Math.min(...times);
  const max = Math.max(...times);
  
  console.log(`\n性能统计:`);
  console.log(`  平均：${avg.toFixed(2)}ms`);
  console.log(`  最小：${min}ms`);
  console.log(`  最大：${max}ms`);
  console.log(`  总计：${times.reduce((a, b) => a + b, 0)}ms`);
}

// ============================================================================
// 主函数
// ============================================================================

async function main() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║     Health Check Pattern Skill - 使用示例                 ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  
  try {
    await example1_QuickHealthCheck();
    await example2_SystemMetrics();
    await example3_SingleChecks();
    await example4_CustomCommandChecks();
    await example5_HealthCheckerClass();
    await example6_GlobalRegistration();
    await example7_AlertSimulation();
    await example8_PerformanceTest();
    
    console.log('\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                    所有示例执行完成 ✅                     ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n❌ 示例执行失败:', error);
    process.exit(1);
  }
}

// 运行示例
main();
