/**
 * 备份管理工具 - 使用示例
 * 
 * 本文件展示 BackupManager 的各种使用场景
 */

import { createBackupManager, quickBackup, quickRestore } from './backup-manager-skill';
import * as path from 'path';

// ============================================
// 示例 1: 基础备份流程
// ============================================

function example1_basicBackup() {
  console.log('\n=== 示例 1: 基础备份流程 ===\n');
  
  // 创建备份管理器
  const manager = createBackupManager({
    sourcePath: path.join(process.cwd(), 'src'),
    backupDir: path.join(process.cwd(), '.backups/examples'),
    retainCount: 3,
    enableIncremental: true,
    excludePatterns: ['*.test.ts', '*.spec.ts', '__tests__'],
  });
  
  // 执行备份
  const backup = manager.backup('示例备份 1');
  console.log(`✅ 备份完成: ${backup.backupId}`);
  console.log(`   类型：${backup.type}`);
  console.log(`   文件数：${backup.fileCount}`);
  console.log(`   大小：${(backup.totalSize / 1024 / 1024).toFixed(2)} MB`);
  
  return manager;
}

// ============================================
// 示例 2: 增量备份演示
// ============================================

function example2_incrementalBackup(manager: any) {
  console.log('\n=== 示例 2: 增量备份演示 ===\n');
  
  // 第一次备份 (全量)
  console.log('📦 第一次备份 (全量)...');
  const backup1 = manager.backup('全量备份');
  console.log(`   类型：${backup1.type}`);
  console.log(`   文件数：${backup1.fileCount}`);
  
  // 第二次备份 (增量 - 无变更)
  console.log('\n📦 第二次备份 (增量 - 无变更)...');
  const backup2 = manager.backup('增量备份 - 无变更');
  console.log(`   结果：${backup2.note || '无变更'}`);
  
  // 第三次备份 (增量 - 有变更)
  console.log('\n📦 第三次备份 (增量 - 模拟变更)...');
  const backup3 = manager.backup('增量备份 - 有变更');
  console.log(`   类型：${backup3.type}`);
  console.log(`   备注：${backup3.note}`);
}

// ============================================
// 示例 3: 备份列表与统计
// ============================================

function example3_backupStats(manager: any) {
  console.log('\n=== 示例 3: 备份列表与统计 ===\n');
  
  // 列出所有备份
  console.log('📋 备份列表:');
  const backups = manager.listBackups();
  backups.forEach((b: any, index: number) => {
    console.log(`   ${index + 1}. ${b.backupId}`);
    console.log(`      类型：${b.type}`);
    console.log(`      时间：${new Date(b.timestamp).toLocaleString()}`);
    console.log(`      文件：${b.fileCount}`);
    console.log(`      大小：${(b.totalSize / 1024 / 1024).toFixed(2)} MB`);
    if (b.note) {
      console.log(`      备注：${b.note}`);
    }
    console.log();
  });
  
  // 获取统计信息
  console.log('📊 备份统计:');
  const stats = manager.getStats();
  console.log(`   总备份数：${stats.totalBackups}`);
  console.log(`   总大小：${(stats.totalSize / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   首次备份：${stats.firstBackup ? new Date(stats.firstBackup.timestamp).toLocaleString() : '无'}`);
  console.log(`   最后备份：${stats.lastBackup ? new Date(stats.lastBackup.timestamp).toLocaleString() : '无'}`);
}

// ============================================
// 示例 4: 备份恢复
// ============================================

function example4_restoreBackup(manager: any) {
  console.log('\n=== 示例 4: 备份恢复 ===\n');
  
  const backups = manager.listBackups();
  if (backups.length === 0) {
    console.log('⚠️  没有可用备份');
    return;
  }
  
  const latestBackup = backups[backups.length - 1];
  console.log(`🔄 准备恢复备份：${latestBackup.backupId}`);
  console.log(`   备份类型：${latestBackup.type}`);
  console.log(`   备份时间：${new Date(latestBackup.timestamp).toLocaleString()}`);
  
  // 注意：实际恢复会覆盖文件，这里仅展示代码
  console.log('\n📝 恢复代码示例:');
  console.log(`   manager.restore('${latestBackup.backupId}', {`);
  console.log('     overwrite: true,  // 覆盖现有文件');
  console.log('     verify: true,     // 验证文件完整性');
  console.log('     targetPath: undefined  // 恢复到原路径');
  console.log('   });');
  
  // 如果要实际恢复，取消下面的注释
  // manager.restore(latestBackup.backupId, {
  //   overwrite: true,
  //   verify: true,
  // });
}

// ============================================
// 示例 5: 快速备份函数
// ============================================

function example5_quickFunctions() {
  console.log('\n=== 示例 5: 快速备份函数 ===\n');
  
  // 快速备份
  console.log('📦 使用 quickBackup 函数:');
  try {
    const backup = quickBackup(process.cwd(), '快速备份示例');
    console.log(`   备份 ID: ${backup.backupId}`);
    console.log(`   文件数：${backup.fileCount}`);
    console.log(`   大小：${(backup.totalSize / 1024 / 1024).toFixed(2)} MB`);
  } catch (error) {
    console.log(`   备份失败：${error}`);
  }
  
  // 快速恢复 (示例代码)
  console.log('\n📝 quickRestore 使用示例:');
  console.log('   quickRestore(sourcePath, backupId, {');
  console.log('     overwrite: true,');
  console.log('     verify: true');
  console.log('   });');
}

// ============================================
// 示例 6: 定时备份 (伪代码)
// ============================================

function example6_scheduledBackup() {
  console.log('\n=== 示例 6: 定时备份 ===\n');
  
  console.log('🕐 定时备份配置示例 (使用 node-cron):');
  console.log(`
  import { createBackupManager } from './backup-manager-skill';
  import cron from 'node-cron';
  
  const manager = createBackupManager({
    sourcePath: '/path/to/project',
    backupDir: '/path/to/backups',
    retainCount: 7,
  });
  
  // 每天凌晨 2 点备份
  cron.schedule('0 2 * * *', () => {
    console.log('执行定时备份...');
    const backup = manager.backup('自动备份');
    console.log(\`备份完成：\${backup.backupId}\`);
  });
  
  // 每小时备份
  cron.schedule('0 * * * *', () => {
    console.log('执行小时备份...');
    const backup = manager.backup('小时备份');
  });
  
  // 每周一上午 9 点备份
  cron.schedule('0 9 * * 1', () => {
    console.log('执行周备份...');
    const backup = manager.backup('周备份');
  });
  `);
}

// ============================================
// 示例 7: 错误处理
// ============================================

function example7_errorHandling() {
  console.log('\n=== 示例 7: 错误处理 ===\n');
  
  console.log('🛡️ 健壮的备份代码示例:');
  console.log(`
  import { createBackupManager } from './backup-manager-skill';
  import * as fs from 'fs';
  
  function safeBackup(sourcePath: string, note: string) {
    try {
      // 1. 检查源目录
      if (!fs.existsSync(sourcePath)) {
        throw new Error(\`源目录不存在：\${sourcePath}\`);
      }
      
      // 2. 创建备份管理器
      const manager = createBackupManager({
        sourcePath,
        backupDir: '/path/to/backups',
        retainCount: 7,
      });
      
      // 3. 执行备份
      const backup = manager.backup(note);
      
      // 4. 验证备份
      if (backup.fileCount === 0) {
        console.warn('⚠️  备份文件数为 0');
      }
      
      console.log(\`✅ 备份成功：\${backup.backupId}\`);
      return backup;
      
    } catch (error) {
      console.error('❌ 备份失败:', error);
      
      // 5. 错误处理
      // - 记录日志
      // - 发送通知
      // - 重试逻辑
      
      throw error;
    }
  }
  
  // 使用示例
  try {
    safeBackup('/path/to/project', '发布前备份');
  } catch (error) {
    console.error('备份流程失败');
  }
  `);
}

// ============================================
// 示例 8: 项目实战场景
// ============================================

function example8_realWorldScenario() {
  console.log('\n=== 示例 8: 项目实战场景 ===\n');
  
  console.log('🎯 场景：项目发布前备份流程');
  console.log(`
  import { createBackupManager } from './backup-manager-skill';
  
  class ReleaseBackupService {
    private manager: any;
    
    constructor(projectPath: string) {
      this.manager = createBackupManager({
        sourcePath: projectPath,
        backupDir: '/Volumes/Backup/releases',
        retainCount: 10,
        excludePatterns: [
          'node_modules',
          '.git',
          'dist',
          'build',
          '*.log',
          '.env',
        ],
      });
    }
    
    async preReleaseBackup(version: string) {
      console.log(\`📦 准备发布备份：\${version}\`);
      
      // 1. 获取当前统计
      const stats = this.manager.getStats();
      console.log(\`   当前备份数：\${stats.totalBackups}\`);
      
      // 2. 执行备份
      const backup = this.manager.backup(\`Release \${version}\`);
      
      // 3. 验证备份
      if (backup.fileCount === 0) {
        throw new Error('备份文件数为 0，发布中止');
      }
      
      // 4. 记录备份信息
      console.log(\`✅ 备份完成:\`);
      console.log(\`   ID: \${backup.backupId}\`);
      console.log(\`   文件：\${backup.fileCount}\`);
      console.log(\`   大小：\${(backup.totalSize / 1024 / 1024).toFixed(2)} MB\`);
      
      // 5. 保存备份信息到发布日志
      this.saveReleaseLog(version, backup);
      
      return backup;
    }
    
    async rollbackToRelease(version: string) {
      console.log(\`🔄 回滚到版本：\${version}\`);
      
      // 1. 查找对应备份
      const backups = this.manager.listBackups();
      const targetBackup = backups.find(
        (b: any) => b.note?.includes(\`Release \${version}\`)
      );
      
      if (!targetBackup) {
        throw new Error(\`未找到版本 \${version} 的备份\`);
      }
      
      // 2. 执行恢复
      this.manager.restore(targetBackup.backupId, {
        overwrite: true,
        verify: true,
      });
      
      console.log(\`✅ 回滚完成\`);
    }
    
    private saveReleaseLog(version: string, backup: any) {
      // 保存备份信息到发布日志
      const logEntry = {
        version,
        backupId: backup.backupId,
        timestamp: backup.timestamp,
        fileCount: backup.fileCount,
        totalSize: backup.totalSize,
      };
      
      // 写入日志文件...
      console.log('📝 已保存发布日志');
    }
  }
  
  // 使用示例
  const releaseService = new ReleaseBackupService('/path/to/project');
  
  // 发布前备份
  await releaseService.preReleaseBackup('v2.0.0');
  
  // 如需回滚
  // await releaseService.rollbackToRelease('v1.9.0');
  `);
}

// ============================================
// 主函数 - 运行所有示例
// ============================================

async function runAllExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   备份管理工具 - 使用示例              ║');
  console.log('║   ACE Backup Manager - Examples        ║');
  console.log('╚════════════════════════════════════════╝');
  
  // 示例 1: 基础备份
  const manager = example1_basicBackup();
  
  // 示例 2: 增量备份
  example2_incrementalBackup(manager);
  
  // 示例 3: 备份统计
  example3_backupStats(manager);
  
  // 示例 4: 备份恢复
  example4_restoreBackup(manager);
  
  // 示例 5: 快速函数
  example5_quickFunctions();
  
  // 示例 6: 定时备份
  example6_scheduledBackup();
  
  // 示例 7: 错误处理
  example7_errorHandling();
  
  // 示例 8: 实战场景
  example8_realWorldScenario();
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║   ✅ 所有示例完成！                    ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// 运行示例
if (require.main === module) {
  runAllExamples().catch(console.error);
}

export {
  example1_basicBackup,
  example2_incrementalBackup,
  example3_backupStats,
  example4_restoreBackup,
  example5_quickFunctions,
  example6_scheduledBackup,
  example7_errorHandling,
  example8_realWorldScenario,
};
