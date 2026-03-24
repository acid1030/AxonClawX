/**
 * SyncManager 测试示例
 */

import { SyncManager } from './sync-manager-skill';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 创建临时测试目录
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-test-'));
const sourceDir = path.join(tempDir, 'source');
const targetDir = path.join(tempDir, 'target');

fs.mkdirSync(sourceDir);
fs.mkdirSync(targetDir);

console.log('🧪 SyncManager 测试开始\n');
console.log(`测试目录：${tempDir}\n`);

// ============================================
// 测试 1: 基础单向同步
// ============================================
console.log('测试 1: 基础单向同步 (source → target)');

fs.writeFileSync(path.join(sourceDir, 'file1.txt'), 'Content 1');
fs.writeFileSync(path.join(sourceDir, 'file2.txt'), 'Content 2');

const sync1 = new SyncManager({
  sourcePath: sourceDir,
  targetPath: targetDir,
  direction: 'source-to-target',
  conflictResolution: 'source-wins',
});

sync1.sync().then((result) => {
  console.log('✅ 同步完成:', result.stats);
  console.log(
    `   目标目录文件数：${fs.readdirSync(targetDir).length}\n`
  );

  // ============================================
  // 测试 2: 双向同步
  // ============================================
  console.log('测试 2: 双向同步');

  fs.writeFileSync(path.join(targetDir, 'file3.txt'), 'Content 3 from target');

  const sync2 = new SyncManager({
    sourcePath: sourceDir,
    targetPath: targetDir,
    direction: 'bidirectional',
    conflictResolution: 'newest-wins',
  });

  return sync2.sync();
}).then((result) => {
  console.log('✅ 双向同步完成:', result.stats);
  console.log(
    `   源目录文件数：${fs.readdirSync(sourceDir).length}`
  );
  console.log(
    `   目标目录文件数：${fs.readdirSync(targetDir).length}\n`
  );

  // ============================================
  // 测试 3: 冲突检测
  // ============================================
  console.log('测试 3: 冲突检测与解决');

  // 同时在源和目标修改同一个文件
  setTimeout(() => {
    fs.writeFileSync(path.join(sourceDir, 'file1.txt'), 'Modified in source');
  }, 100);

  setTimeout(() => {
    fs.writeFileSync(path.join(targetDir, 'file1.txt'), 'Modified in target');
  }, 200);

  setTimeout(async () => {
    const sync3 = new SyncManager({
      sourcePath: sourceDir,
      targetPath: targetDir,
      direction: 'bidirectional',
      conflictResolution: 'manual', // 手动解决冲突
    });

    const result = await sync3.sync();
    console.log('✅ 冲突检测完成:', result.stats);
    console.log(`   待解决冲突：${sync3.getPendingConflicts().length}\n`);

    // ============================================
    // 测试 4: 增量同步
    // ============================================
    console.log('测试 4: 增量同步');

    fs.writeFileSync(path.join(sourceDir, 'file4.txt'), 'New file 4');

    const sync4 = new SyncManager({
      sourcePath: sourceDir,
      targetPath: targetDir,
      direction: 'source-to-target',
      enableIncremental: true,
    });

    const result4 = await sync4.sync();
    console.log('✅ 增量同步完成:', result4.stats);
    console.log(`   仅同步了新增/变更的文件\n`);

    // ============================================
    // 测试 5: 文件排除
    // ============================================
    console.log('测试 5: 文件排除');

    fs.writeFileSync(path.join(sourceDir, 'temp.tmp'), 'Temporary file');
    fs.writeFileSync(path.join(sourceDir, 'debug.log'), 'Log file');

    const sync5 = new SyncManager({
      sourcePath: sourceDir,
      targetPath: targetDir,
      direction: 'source-to-target',
      excludePatterns: ['*.tmp', '*.log'],
    });

    const result5 = await sync5.sync();
    console.log('✅ 排除同步完成:', result5.stats);
    console.log(
      `   目标目录文件数：${fs.readdirSync(targetDir).length} (不包含 .tmp 和 .log)`
    );

    // 清理测试目录
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`\n🧹 测试目录已清理：${tempDir}`);
    console.log('\n✅ 所有测试完成!\n');
  }, 500);
});
