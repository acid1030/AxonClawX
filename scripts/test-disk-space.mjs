#!/usr/bin/env node
/**
 * 测试磁盘空间获取逻辑（模拟主进程 host-info）
 */
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const pathsToTry = [
  os.homedir(),
  process.cwd(),
  process.env.HOME || process.env.USERPROFILE || (process.platform === 'win32' ? 'C:\\' : '/'),
  process.platform === 'win32' ? 'C:\\' : '/',
].filter(Boolean);

console.log('=== 测试磁盘空间获取 ===');
console.log('pathsToTry:', pathsToTry);
console.log('platform:', process.platform);

// 1. 测试 check-disk-space
console.log('\n--- check-disk-space ---');
try {
  const mod = await import('check-disk-space');
  const checkDiskSpace = mod.default ?? mod;
  for (const dirPath of pathsToTry) {
    try {
      const disk = await checkDiskSpace(dirPath);
      console.log('OK', dirPath, '->', disk);
      break;
    } catch (err) {
      console.log('FAIL', dirPath, err.message);
    }
  }
} catch (err) {
  console.log('模块加载失败:', err.message);
}

// 2. 测试 df 备用
console.log('\n--- df 备用 ---');
if (process.platform !== 'win32') {
  for (const dirPath of pathsToTry) {
    try {
      const cmd = `df -Pk ${JSON.stringify(dirPath)}`;
      console.log('执行:', cmd);
      const { stdout, stderr } = await execAsync(cmd);
      if (stderr) console.log('stderr:', stderr);
      const lines = stdout.trim().split('\n').filter((l) => l.trim());
      console.log('行数:', lines.length);
      lines.forEach((l, i) => console.log(`  [${i}]`, l));
      if (lines.length >= 2) {
        const parts = lines[1].trim().split(/\s+/);
        console.log('parts:', parts);
        const sizeK = parseInt(parts[1], 10);
        const freeK = parseInt(parts[3], 10);
        const mountPoint = parts.length > 5 ? parts.slice(5).join(' ') : (parts[5] ?? dirPath);
        console.log('sizeK:', sizeK, 'freeK:', freeK, 'mountPoint:', mountPoint);
        if (!isNaN(sizeK) && !isNaN(freeK) && sizeK > 0) {
          const size = sizeK * 1024;
          const free = freeK * 1024;
          const used = size - free;
          const usedPct = Math.round((used / size) * 1000) / 10;
          console.log('解析成功: total=', size, 'free=', free, 'usedPct=', usedPct + '%');
          break;
        }
      }
    } catch (err) {
      console.log('FAIL', dirPath, err.message);
    }
  }
}

console.log('\n=== 测试完成 ===');
