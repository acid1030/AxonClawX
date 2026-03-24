/**
 * KAEL 日志管理工具 - 使用示例
 * 
 * @author KAEL
 * @version 1.0.0
 */

import logManager, {
  collectFromFile,
  collectFromDirectory,
  queryLogs,
  searchLogs,
  analyzeLogs,
  formatLogEntry,
  exportToJSON,
  exportToCSV,
} from './log-manager-skill';

// ==================== 示例 1: 从单个文件收集日志 ====================

function example1_singleFile() {
  console.log('\n=== 示例 1: 从单个文件收集日志 ===\n');

  try {
    const entries = collectFromFile('/var/log/app.log');
    console.log(`收集到 ${entries.length} 条日志`);
    console.log('前 5 条日志:');
    entries.slice(0, 5).forEach(entry => {
      console.log(formatLogEntry(entry, true));
    });
  } catch (error) {
    console.error('收集失败:', error);
  }
}

// ==================== 示例 2: 从目录收集日志 ====================

function example2_directory() {
  console.log('\n=== 示例 2: 从目录收集日志 ===\n');

  try {
    const entries = collectFromDirectory('./logs', {
      recursive: true,
      extensions: ['.log', '.txt'],
      maxSizeMB: 50,
      excludePatterns: ['node_modules', '.git', 'archive'],
    });
    console.log(`收集到 ${entries.length} 条日志`);
  } catch (error) {
    console.error('收集失败:', error);
  }
}

// ==================== 示例 3: 按级别查询日志 ====================

function example3_queryByLevel() {
  console.log('\n=== 示例 3: 按级别查询日志 ===\n');

  const entries = collectFromDirectory('./logs');

  // 只查询 ERROR 和 FATAL 日志
  const errors = queryLogs(entries, {
    level: ['ERROR', 'FATAL'],
    limit: 20,
  });

  console.log(`找到 ${errors.length} 条错误日志:`);
  errors.forEach(entry => {
    console.log(formatLogEntry(entry, true));
  });
}

// ==================== 示例 4: 按时间范围查询 ====================

function example4_queryByTimeRange() {
  console.log('\n=== 示例 4: 按时间范围查询 ===\n');

  const entries = collectFromDirectory('./logs');

  // 查询最近 1 小时的日志
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const recentLogs = queryLogs(entries, {
    startTime: oneHourAgo.toISOString(),
    endTime: now.toISOString(),
  });

  console.log(`最近 1 小时日志：${recentLogs.length} 条`);
}

// ==================== 示例 5: 关键字搜索 ====================

function example5_keywordSearch() {
  console.log('\n=== 示例 5: 关键字搜索 ===\n');

  const entries = collectFromDirectory('./logs');

  // 搜索包含 "timeout" 的日志
  const timeoutLogs = queryLogs(entries, {
    keyword: 'timeout',
  });

  console.log(`包含 "timeout" 的日志：${timeoutLogs.length} 条`);
  timeoutLogs.slice(0, 10).forEach(entry => {
    console.log(formatLogEntry(entry));
  });
}

// ==================== 示例 6: 正则表达式搜索 ====================

function example6_regexSearch() {
  console.log('\n=== 示例 6: 正则表达式搜索 ===\n');

  const entries = collectFromDirectory('./logs');

  // 搜索 IP 地址
  const ipPattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
  const ipLogs = searchLogs(entries, ipPattern);

  console.log(`包含 IP 地址的日志：${ipLogs.length} 条`);
}

// ==================== 示例 7: 日志统计分析 ====================

function example7_statsAnalysis() {
  console.log('\n=== 示例 7: 日志统计分析 ===\n');

  const entries = collectFromDirectory('./logs');
  const analysis = analyzeLogs(entries);

  console.log('📊 日志统计报告');
  console.log('━━━━━━━━━━━━━━━━');
  console.log(`总日志数：${analysis.stats.total}`);
  console.log(`时间范围：${analysis.stats.timeRange.start} ~ ${analysis.stats.timeRange.end}`);
  console.log(`持续时间：${(analysis.stats.timeRange.durationMs / 1000 / 60).toFixed(2)} 分钟`);
  console.log('');
  console.log('按级别分布:');
  console.log(`  DEBUG: ${analysis.stats.byLevel.DEBUG}`);
  console.log(`  INFO:  ${analysis.stats.byLevel.INFO}`);
  console.log(`  WARN:  ${analysis.stats.byLevel.WARN}`);
  console.log(`  ERROR: ${analysis.stats.byLevel.ERROR}`);
  console.log(`  FATAL: ${analysis.stats.byLevel.FATAL}`);
  console.log('');
  console.log(`错误率：${analysis.stats.errorRate.toFixed(2)}%`);
  console.log(`平均消息速率：${analysis.stats.avgMessagesPerMinute.toFixed(2)} 条/分钟`);
}

// ==================== 示例 8: 日志模式识别 ====================

function example8_patternRecognition() {
  console.log('\n=== 示例 8: 日志模式识别 ===\n');

  const entries = collectFromDirectory('./logs');
  const analysis = analyzeLogs(entries);

  console.log('🔍 Top 10 日志模式:');
  analysis.patterns.forEach((pattern, index) => {
    console.log(`\n${index + 1}. 出现 ${pattern.count} 次 (${pattern.percentage.toFixed(1)}%)`);
    console.log(`   模式：${pattern.pattern}`);
    console.log(`   示例:`);
    pattern.examples.forEach(ex => {
      console.log(`     - ${ex}`);
    });
  });
}

// ==================== 示例 9: 异常检测 ====================

function example9_anomalyDetection() {
  console.log('\n=== 示例 9: 异常检测 ===\n');

  const entries = collectFromDirectory('./logs');
  const analysis = analyzeLogs(entries);

  if (analysis.anomalies.length === 0) {
    console.log('✅ 未检测到异常');
  } else {
    console.log(`⚠️ 检测到 ${analysis.anomalies.length} 个异常:`);
    analysis.anomalies.forEach(anomaly => {
      console.log(`\n[${anomaly.timestamp}] ${anomaly.level}`);
      console.log(`原因：${anomaly.reason}`);
      console.log(`消息：${anomaly.message}`);
    });
  }
}

// ==================== 示例 10: 完整分析报告 ====================

function example10_fullReport() {
  console.log('\n=== 示例 10: 完整分析报告 ===\n');

  const entries = collectFromDirectory('./logs');
  const analysis = analyzeLogs(entries);

  console.log('╔════════════════════════════════════╗');
  console.log('║       日志分析报告                 ║');
  console.log('╚════════════════════════════════════╝');
  console.log('');

  // 统计信息
  console.log('【统计概览】');
  console.log(`  总日志数：${analysis.stats.total}`);
  console.log(`  错误率：${analysis.stats.errorRate.toFixed(2)}%`);
  console.log('');

  // 异常信息
  if (analysis.anomalies.length > 0) {
    console.log('【异常警告】');
    analysis.anomalies.forEach(a => {
      console.log(`  ⚠️ ${a.reason}: ${a.message}`);
    });
    console.log('');
  }

  // 建议
  console.log('【优化建议】');
  analysis.recommendations.forEach(rec => {
    console.log(`  ${rec}`);
  });
}

// ==================== 示例 11: 导出日志 ====================

function example11_export() {
  console.log('\n=== 示例 11: 导出日志 ===\n');

  const entries = collectFromDirectory('./logs');

  // 导出为 JSON
  exportToJSON(entries, './exported-logs.json');

  // 只导出错误日志为 CSV
  const errors = queryLogs(entries, { level: ['ERROR', 'FATAL'] });
  exportToCSV(errors, './error-logs.csv');
}

// ==================== 示例 12: 实时监控 (轮询) ====================

async function example12_realtime() {
  console.log('\n=== 示例 12: 实时监控 ===\n');

  const logFile = './logs/app.log';
  let lastSize = 0;

  console.log(`开始监控：${logFile}`);
  console.log('按 Ctrl+C 停止\n');

  // 简单轮询 (实际使用中建议使用 fs.watch)
  const interval = setInterval(() => {
    try {
      const stats = fs.statSync(logFile);
      if (stats.size > lastSize) {
        const entries = collectFromFile(logFile);
        const newEntries = entries.slice(-10); // 最近 10 条
        
        if (newEntries.length > 0) {
          console.log(`\n[${new Date().toISOString()}] 新增 ${newEntries.length} 条日志:`);
          newEntries.forEach(entry => {
            console.log(formatLogEntry(entry, true));
          });
        }
        
        lastSize = stats.size;
      }
    } catch (error) {
      console.error('监控失败:', error);
    }
  }, 2000);

  // 10 秒后停止 (示例)
  setTimeout(() => {
    clearInterval(interval);
    console.log('\n监控停止');
  }, 10000);
}

// ==================== 综合示例 ====================

function runAllExamples() {
  console.log('╔═══════════════════════════════════════╗');
  console.log('║    KAEL 日志管理工具 - 使用示例       ║');
  console.log('╚═══════════════════════════════════════╝');

  try {
    example1_singleFile();
    example2_directory();
    example3_queryByLevel();
    example4_queryByTimeRange();
    example5_keywordSearch();
    example6_regexSearch();
    example7_statsAnalysis();
    example8_patternRecognition();
    example9_anomalyDetection();
    example10_fullReport();
    example11_export();
    // example12_realtime(); // 需要 fs 模块，单独运行
  } catch (error) {
    console.error('示例运行失败:', error);
  }
}

// ==================== 导出示例函数 ====================

export {
  example1_singleFile,
  example2_directory,
  example3_queryByLevel,
  example4_queryByTimeRange,
  example5_keywordSearch,
  example6_regexSearch,
  example7_statsAnalysis,
  example8_patternRecognition,
  example9_anomalyDetection,
  example10_fullReport,
  example11_export,
  example12_realtime,
  runAllExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
