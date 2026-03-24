/**
 * 热重载 - 超简版 (Hot Reload Ultra Lite)
 * 使用 Node.js 原生 fs.watch API，无需任何依赖
 */

import { watch } from 'fs';
import { resolve, join } from 'path';

const SKILLS_DIR = resolve(__dirname, '../../skills');

console.log(`🜏 Axon: 热重载监控启动 - ${SKILLS_DIR}`);

// 监控 skills 目录变化
watch(SKILLS_DIR, { recursive: true }, (eventType, filename) => {
  if (!filename) return;
  
  // 只处理 .ts 和 .js 文件
  if (!/\.(ts|js)$/.test(filename)) return;
  
  console.log(`♻️  检测到变化 [${eventType}]: ${filename}`);
  
  // 删除 require 缓存，实现热重载
  const filePath = join(SKILLS_DIR, filename);
  Object.keys(require.cache).forEach(key => {
    if (key.includes(filename)) {
      delete require.cache[key];
      console.log(`🗑️  缓存已清除：${filename}`);
    }
  });
});

console.log('✅ 监控中... (Ctrl+C 停止)');
