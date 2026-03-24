/**
 * KAEL 文件监听工具 - 使用示例
 * 
 * 展示 watcher-utils-skill.ts 的各种使用场景
 */

import {
  watchFile,
  watchDirectory,
  watchMultiple,
  createDirectorySnapshot,
  compareSnapshots,
  waitForEvent,
  watchWithLogging,
  type FileEvent,
  type WatchOptions,
} from './watcher-utils-skill';
import * as path from 'path';

// ==================== 示例 1: 监听单个文件 ====================

async function example1_watchSingleFile() {
  console.log('📄 示例 1: 监听单个文件');
  
  const filePath = path.resolve(__dirname, '../config/settings.json');
  
  const watcher = watchFile(filePath, (event: FileEvent) => {
    console.log(`文件变化：${event.type}`);
    console.log(`路径：${event.filePath}`);
    console.log(`时间：${new Date(event.timestamp).toLocaleString()}`);
    if (event.stats) {
      console.log(`大小：${event.stats.size} bytes`);
    }
  });
  
  console.log(`✅ 开始监听：${watcher.getPath()}`);
  console.log('按 Ctrl+C 停止监听');
  
  // 保持监听运行
  return watcher;
}

// ==================== 示例 2: 监听整个目录 (递归) ====================

async function example2_watchDirectory() {
  console.log('📁 示例 2: 监听整个目录');
  
  const dirPath = path.resolve(__dirname, '../src');
  
  const options: WatchOptions = {
    recursive: true,              // 递归监控子目录
    debounceMs: 200,              // 200ms 防抖
    ignoreNodeModules: true,      // 忽略 node_modules
    ignoreGit: true,              // 忽略 .git
    filter: /\.ts$/,              // 只监听 .ts 文件
  };
  
  const watcher = watchDirectory(dirPath, (event: FileEvent) => {
    const icon = {
      create: '🟢',
      modify: '🔵',
      delete: '🔴',
      rename: '🟡',
    }[event.type];
    
    console.log(`${icon} [${event.type.toUpperCase()}] ${event.filePath}`);
  }, options);
  
  console.log(`✅ 开始监听目录：${watcher.getPath()}`);
  console.log('监听选项:', options);
  
  return watcher;
}

// ==================== 示例 3: 批量监听多个路径 ====================

async function example3_watchMultiple() {
  console.log('📚 示例 3: 批量监听多个路径');
  
  const paths = [
    path.resolve(__dirname, '../src/skills'),
    path.resolve(__dirname, '../src/services'),
    path.resolve(__dirname, '../config'),
  ];
  
  const options: WatchOptions = {
    recursive: true,
    ignoreNodeModules: true,
    filter: /\.(ts|json)$/,  // 监听 .ts 和 .json 文件
  };
  
  const watchers = watchMultiple(paths, (event: FileEvent) => {
    console.log(`[${new Date(event.timestamp).toLocaleTimeString()}] ${event.type}: ${event.filePath}`);
  }, options);
  
  console.log(`✅ 开始监听 ${watchers.length} 个路径`);
  watchers.forEach(w => console.log(`  - ${w.getPath()}`));
  
  return watchers;
}

// ==================== 示例 4: 目录快照对比 ====================

async function example4_snapshotComparison() {
  console.log('📸 示例 4: 目录快照对比');
  
  const dirPath = path.resolve(__dirname, '../src');
  
  // 创建初始快照
  console.log('创建初始快照...');
  const snapshot1 = await createDirectorySnapshot(dirPath, {
    recursive: true,
    ignoreNodeModules: true,
  });
  console.log(`快照 1: ${snapshot1.length} 个文件`);
  
  // 模拟等待文件变化
  console.log('等待 5 秒...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // 创建新快照
  console.log('创建新快照...');
  const snapshot2 = await createDirectorySnapshot(dirPath, {
    recursive: true,
    ignoreNodeModules: true,
  });
  console.log(`快照 2: ${snapshot2.length} 个文件`);
  
  // 比较差异
  const changes = compareSnapshots(snapshot1, snapshot2);
  
  if (changes.length === 0) {
    console.log('✅ 没有变化');
  } else {
    console.log(`发现 ${changes.length} 个变化:`);
    changes.forEach(change => {
      console.log(`  ${change.type}: ${change.filePath}`);
    });
  }
  
  return changes;
}

// ==================== 示例 5: 等待特定事件 (Promise) ====================

async function example5_waitForEvent() {
  console.log('⏳ 示例 5: 等待特定事件');
  
  const filePath = path.resolve(__dirname, '../config/settings.json');
  
  console.log(`等待文件修改事件：${filePath}`);
  console.log('超时时间：30 秒');
  
  try {
    const event = await waitForEvent(filePath, 'modify', 30000);
    console.log('✅ 检测到文件修改!');
    console.log(`时间：${new Date(event.timestamp).toLocaleString()}`);
    console.log(`大小：${event.stats?.size} bytes`);
  } catch (error) {
    console.error('❌ 错误:', (error as Error).message);
  }
}

// ==================== 示例 6: 带日志记录的监听 ====================

async function example6_watchWithLogging() {
  console.log('📝 示例 6: 带日志记录的监听');
  
  const dirPath = path.resolve(__dirname, '../src');
  const logFilePath = path.resolve(__dirname, '../../logs/file-watcher.log');
  
  const options: WatchOptions = {
    recursive: true,
    ignoreNodeModules: true,
    filter: /\.ts$/,
  };
  
  const watcher = watchWithLogging(dirPath, logFilePath, options);
  
  console.log(`✅ 开始监听并记录日志`);
  console.log(`监听目录：${watcher.getPath()}`);
  console.log(`日志文件：${logFilePath}`);
  
  return watcher;
}

// ==================== 示例 7: 实时监控 + 防抖 ====================

async function example7_debouncedWatch() {
  console.log('⚡ 示例 7: 防抖监听 (避免频繁触发)');
  
  const dirPath = path.resolve(__dirname, '../src');
  
  const options: WatchOptions = {
    recursive: true,
    debounceMs: 500,  // 500ms 防抖，适合 IDE 自动保存场景
    ignoreNodeModules: true,
  };
  
  let eventBuffer: FileEvent[] = [];
  
  const watcher = watchDirectory(dirPath, (event: FileEvent) => {
    eventBuffer.push(event);
    
    // 每 1 秒处理一次批量事件
    setTimeout(() => {
      if (eventBuffer.length > 0) {
        console.log(`\n📦 批量处理 ${eventBuffer.length} 个事件:`);
        eventBuffer.forEach(e => {
          console.log(`  ${e.type}: ${path.basename(e.filePath)}`);
        });
        eventBuffer = [];
      }
    }, 1000);
  }, options);
  
  console.log('✅ 防抖监听已启动 (500ms)');
  console.log('尝试快速修改多个文件，观察批量处理效果');
  
  return watcher;
}

// ==================== 示例 8: 条件触发监听 ====================

async function example8_conditionalWatch() {
  console.log('🎯 示例 8: 条件触发监听');
  
  const dirPath = path.resolve(__dirname, '../src/skills');
  
  const options: WatchOptions = {
    recursive: false,
    filter: /\.ts$/,
  };
  
  const watcher = watchDirectory(dirPath, async (event: FileEvent) => {
    // 只在创建或修改 .ts 文件时触发
    if (event.type === 'create' || event.type === 'modify') {
      const fileName = path.basename(event.filePath);
      
      // 检查文件名是否包含特定模式
      if (fileName.includes('skill')) {
        console.log(`🔔 触发条件：检测到 Skill 文件变化`);
        console.log(`文件：${fileName}`);
        console.log(`类型：${event.type}`);
        
        // 这里可以触发其他操作，比如：
        // - 自动编译
        // - 运行测试
        // - 发送通知
        // - 更新文档
      }
    }
    
    // 文件删除时告警
    if (event.type === 'delete') {
      console.warn(`⚠️ 警告：文件被删除 - ${event.filePath}`);
    }
  }, options);
  
  console.log('✅ 条件监听已启动');
  console.log('只响应包含 "skill" 的 .ts 文件变化');
  
  return watcher;
}

// ==================== 示例 9: 监听统计信息 ====================

async function example9_watchWithStats() {
  console.log('📊 示例 9: 监听统计信息');
  
  const dirPath = path.resolve(__dirname, '../src');
  
  const watcher = watchDirectory(dirPath, (event: FileEvent) => {
    console.log(`[${new Date(event.timestamp).toLocaleTimeString()}] ${event.type}`);
  }, {
    recursive: true,
    ignoreNodeModules: true,
  });
  
  // 定期输出统计
  const statsInterval = setInterval(() => {
    const count = watcher.getEventCount();
    console.log(`\n📈 监听统计:`);
    console.log(`  总事件数：${count}`);
    console.log(`  监听路径：${watcher.getPath()}`);
    console.log(`  运行时间：${Math.floor((Date.now() - startTime) / 1000)}秒`);
  }, 10000);
  
  const startTime = Date.now();
  
  console.log('✅ 监听已启动，每 10 秒输出统计');
  console.log('按 Ctrl+C 停止');
  
  // 返回清理函数
  return {
    watcher,
    stop: () => {
      clearInterval(statsInterval);
      watcher.close();
    },
  };
}

// ==================== 示例 10: 完整工作流 ====================

async function example10_fullWorkflow() {
  console.log('🚀 示例 10: 完整工作流演示');
  
  const dirPath = path.resolve(__dirname, '../src');
  const logFilePath = path.resolve(__dirname, '../../logs/workflow-demo.log');
  
  console.log('步骤 1: 创建初始快照');
  const initialSnapshot = await createDirectorySnapshot(dirPath, {
    recursive: true,
    ignoreNodeModules: true,
  });
  console.log(`初始文件数：${initialSnapshot.length}`);
  
  console.log('\n步骤 2: 启动带日志的监听');
  const watcher = watchWithLogging(dirPath, logFilePath, {
    recursive: true,
    debounceMs: 300,
    ignoreNodeModules: true,
    filter: /\.ts$/,
  });
  
  console.log('\n步骤 3: 等待事件 (最多 60 秒)');
  try {
    const event = await Promise.race([
      waitForEvent(path.resolve(dirPath, 'types.ts'), 'modify', 60000),
      new Promise<FileEvent>((resolve) => {
        // 监听任意事件
        const tempWatcher = watchDirectory(dirPath, (e) => {
          if (e.type === 'create' || e.type === 'modify') {
            tempWatcher.close();
            resolve(e);
          }
        }, { recursive: true, ignoreNodeModules: true });
      }),
    ]);
    
    console.log('\n✅ 检测到变化!');
    console.log(`类型：${event.type}`);
    console.log(`文件：${event.filePath}`);
    console.log(`时间：${new Date(event.timestamp).toLocaleString()}`);
    
    console.log('\n步骤 4: 创建变化后快照');
    const finalSnapshot = await createDirectorySnapshot(dirPath, {
      recursive: true,
      ignoreNodeModules: true,
    });
    
    console.log('\n步骤 5: 比较快照差异');
    const changes = compareSnapshots(initialSnapshot, finalSnapshot);
    console.log(`变化数量：${changes.length}`);
    changes.forEach(c => {
      console.log(`  ${c.type}: ${path.basename(c.filePath)}`);
    });
    
  } catch (error) {
    console.error('❌ 错误:', (error as Error).message);
  } finally {
    console.log('\n步骤 6: 清理资源');
    watcher.close();
    console.log('✅ 监听已停止');
  }
}

// ==================== 运行示例 ====================

async function runExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   KAEL 文件监听工具 - 使用示例        ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  const examples = [
    { name: '监听单个文件', fn: example1_watchSingleFile },
    { name: '监听整个目录', fn: example2_watchDirectory },
    { name: '批量监听多个路径', fn: example3_watchMultiple },
    { name: '目录快照对比', fn: example4_snapshotComparison },
    { name: '等待特定事件', fn: example5_waitForEvent },
    { name: '带日志记录的监听', fn: example6_watchWithLogging },
    { name: '防抖监听', fn: example7_debouncedWatch },
    { name: '条件触发监听', fn: example8_conditionalWatch },
    { name: '监听统计信息', fn: example9_watchWithStats },
    { name: '完整工作流', fn: example10_fullWorkflow },
  ];
  
  console.log('可用示例:');
  examples.forEach((ex, i) => {
    console.log(`  ${i + 1}. ${ex.name}`);
  });
  console.log('\n选择示例编号运行 (或输入 q 退出):');
  
  // 这里可以添加交互式选择逻辑
  // 为简化示例，直接运行第一个
  console.log('\n自动运行示例 1...\n');
  const watcher = await example1_watchSingleFile();
  
  // 保持进程运行
  process.on('SIGINT', () => {
    console.log('\n停止监听...');
    watcher.close();
    process.exit(0);
  });
}

// 如果直接运行此文件
if (require.main === module) {
  runExamples().catch(console.error);
}

// ==================== 导出所有示例函数 ====================

export {
  example1_watchSingleFile,
  example2_watchDirectory,
  example3_watchMultiple,
  example4_snapshotComparison,
  example5_waitForEvent,
  example6_watchWithLogging,
  example7_debouncedWatch,
  example8_conditionalWatch,
  example9_watchWithStats,
  example10_fullWorkflow,
};
