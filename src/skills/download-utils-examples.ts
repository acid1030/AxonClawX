/**
 * 文件下载工具使用示例
 * 
 * 演示 download-utils-skill.ts 的各种使用场景
 */

import {
  downloadFile,
  createDownloadManager,
  formatBytes,
  formatTime,
  DownloadStatus
} from './download-utils-skill';

// ==================== 示例 1: 基础下载 ====================

/**
 * 最简单的下载方式
 */
async function exampleBasicDownload(): Promise<void> {
  console.log('=== 示例 1: 基础下载 ===');
  
  try {
    await downloadFile(
      'https://example.com/large-file.zip',
      './downloads/file.zip'
    );
    console.log('✓ 下载完成');
  } catch (error) {
    console.error('✗ 下载失败:', error);
  }
}

// ==================== 示例 2: 带进度追踪的下载 ====================

/**
 * 显示详细的下载进度
 */
async function exampleDownloadWithProgress(): Promise<void> {
  console.log('=== 示例 2: 带进度追踪的下载 ===');
  
  try {
    await downloadFile(
      'https://example.com/large-file.zip',
      './downloads/file.zip',
      {
        onProgress: (progress) => {
          // 清空当前行
          process.stdout.write('\r\x1b[K');
          
          // 显示进度条
          const barLength = 40;
          const filledLength = Math.round((progress.percentage / 100) * barLength);
          const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
          
          process.stdout.write(
            `[${bar}] ${progress.percentage.toFixed(2)}% | ` +
            `${formatBytes(progress.downloadedBytes)} / ${formatBytes(progress.totalBytes)} | ` +
            `${formatBytes(progress.speedBytesPerSec)}/s | ` +
            `剩余：${formatTime(progress.etaSeconds)}`
          );
        },
        onComplete: () => {
          console.log('\n✓ 下载完成!');
        },
        onError: (error) => {
          console.error('\n✗ 下载失败:', error.message);
        }
      }
    );
  } catch (error) {
    console.error('下载异常:', error);
  }
}

// ==================== 示例 3: 多线程高速下载 ====================

/**
 * 使用多线程加速下载
 */
async function exampleMultiThreadDownload(): Promise<void> {
  console.log('=== 示例 3: 多线程高速下载 ===');
  
  try {
    await downloadFile(
      'https://example.com/large-file.zip',
      './downloads/file.zip',
      {
        threads: 16,  // 使用 16 个并发线程
        minChunkSize: 512 * 1024,  // 每个分片最小 512KB
        retries: 5,  // 失败重试 5 次
        timeout: 60000,  // 60 秒超时
        
        onProgress: (progress) => {
          console.log(
            `进度：${progress.percentage.toFixed(2)}% | ` +
            `速度：${formatBytes(progress.speedBytesPerSec)}/s`
          );
        }
      }
    );
  } catch (error) {
    console.error('下载失败:', error);
  }
}

// ==================== 示例 4: 可控制的下载 (暂停/恢复/取消) ====================

/**
 * 手动控制下载过程
 */
async function exampleControlledDownload(): Promise<void> {
  console.log('=== 示例 4: 可控制的下载 ===');
  
  const manager = createDownloadManager(
    'https://example.com/large-file.zip',
    './downloads/file.zip',
    {
      threads: 8,
      onProgress: (progress) => {
        console.log(`进度：${progress.percentage.toFixed(2)}%`);
        
        // 50% 时暂停
        if (progress.percentage >= 50 && progress.status === DownloadStatus.DOWNLOADING) {
          console.log('→ 达到 50%，暂停下载...');
          manager.pause();
          
          // 2 秒后恢复
          setTimeout(() => {
            console.log('→ 恢复下载...');
            manager.resume();
          }, 2000);
        }
      }
    }
  );
  
  try {
    // 启动下载
    const downloadPromise = manager.start();
    
    // 监控进度
    const progressInterval = setInterval(() => {
      const progress = manager.getProgress();
      console.log(
        `状态：${progress.status} | ` +
        `已下载：${formatBytes(progress.downloadedBytes)} | ` +
        `速度：${formatBytes(progress.speedBytesPerSec)}/s`
      );
    }, 1000);
    
    await downloadPromise;
    
    clearInterval(progressInterval);
    console.log('✓ 下载完成');
    
  } catch (error) {
    console.error('下载失败:', error);
  }
}

// ==================== 示例 5: 断点续传演示 ====================

/**
 * 演示断点续传功能
 */
async function exampleResumeDownload(): Promise<void> {
  console.log('=== 示例 5: 断点续传演示 ===');
  
  const url = 'https://example.com/large-file.zip';
  const destPath = './downloads/file.zip';
  
  try {
    // 第一次下载 (会被中断)
    console.log('开始第一次下载...');
    const manager1 = createDownloadManager(url, destPath, {
      threads: 4,
      onProgress: (progress) => {
        console.log(`第一次下载进度：${progress.percentage.toFixed(2)}%`);
        
        // 模拟在 30% 时中断
        if (progress.percentage >= 30) {
          console.log('→ 模拟网络中断...');
          manager1.cancel();
        }
      }
    });
    
    // 启动下载 (会被取消)
    manager1.start().catch(() => {
      console.log('第一次下载已中断');
    });
    
    // 等待 3 秒
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // 第二次下载 (会自动续传)
    console.log('\n开始第二次下载 (断点续传)...');
    await downloadFile(url, destPath, {
      threads: 4,
      onProgress: (progress) => {
        console.log(`续传进度：${progress.percentage.toFixed(2)}%`);
      },
      onComplete: () => {
        console.log('✓ 断点续传完成!');
      }
    });
    
  } catch (error) {
    console.error('下载失败:', error);
  }
}

// ==================== 示例 6: 批量下载 ====================

/**
 * 批量下载多个文件
 */
async function exampleBatchDownload(): Promise<void> {
  console.log('=== 示例 6: 批量下载 ===');
  
  const files = [
    { url: 'https://example.com/file1.zip', path: './downloads/file1.zip' },
    { url: 'https://example.com/file2.zip', path: './downloads/file2.zip' },
    { url: 'https://example.com/file3.zip', path: './downloads/file3.zip' },
  ];
  
  const downloadPromises = files.map(async (file, index) => {
    console.log(`\n开始下载文件 ${index + 1}/${files.length}: ${file.path}`);
    
    try {
      await downloadFile(file.url, file.path, {
        threads: 4,
        onProgress: (progress) => {
          process.stdout.write(`\r文件 ${index + 1}: ${progress.percentage.toFixed(2)}%`);
        }
      });
      console.log(`\n✓ 文件 ${index + 1} 下载完成`);
      return { success: true, path: file.path };
    } catch (error) {
      console.error(`\n✗ 文件 ${index + 1} 下载失败:`, error);
      return { success: false, path: file.path, error };
    }
  });
  
  const results = await Promise.all(downloadPromises);
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n批量下载完成：${successCount}/${files.length} 成功`);
}

// ==================== 示例 7: 下载大文件 (带详细日志) ====================

/**
 * 下载超大文件，带详细日志
 */
async function exampleLargeFileDownload(): Promise<void> {
  console.log('=== 示例 7: 大文件下载 ===');
  
  const startTime = Date.now();
  
  try {
    await downloadFile(
      'https://example.com/huge-file.iso',
      './downloads/huge-file.iso',
      {
        threads: 32,  // 多线程加速
        minChunkSize: 2 * 1024 * 1024,  // 2MB 分片
        retries: 10,  // 多次重试
        timeout: 120000,  // 2 分钟超时
        
        onProgress: (progress) => {
          const elapsed = (Date.now() - startTime) / 1000;
          const avgSpeed = progress.downloadedBytes / elapsed;
          
          console.log(
            `[${new Date().toLocaleTimeString()}] ` +
            `进度：${progress.percentage.toFixed(2)}% | ` +
            `瞬时速度：${formatBytes(progress.speedBytesPerSec)}/s | ` +
            `平均速度：${formatBytes(avgSpeed)}/s | ` +
            `剩余：${formatTime(progress.etaSeconds)}`
          );
        },
        
        onComplete: () => {
          const elapsed = (Date.now() - startTime) / 1000;
          console.log(`\n✓ 下载完成！总耗时：${formatTime(elapsed)}`);
        },
        
        onError: (error) => {
          const elapsed = (Date.now() - startTime) / 1000;
          console.error(`\n✗ 下载失败！已用时：${formatTime(elapsed)}`);
          console.error('错误信息:', error.message);
        }
      }
    );
  } catch (error) {
    console.error('下载异常:', error);
  }
}

// ==================== 示例 8: 工具函数演示 ====================

/**
 * 演示格式化工具函数
 */
function exampleUtilityFunctions(): void {
  console.log('=== 示例 8: 工具函数演示 ===');
  
  // 字节格式化
  console.log('\n字节格式化:');
  console.log(`  500 B = ${formatBytes(500)}`);
  console.log(`  1.5 KB = ${formatBytes(1536)}`);
  console.log(`  2.5 MB = ${formatBytes(2621440)}`);
  console.log(`  1.2 GB = ${formatBytes(1288490188)}`);
  
  // 时间格式化
  console.log('\n时间格式化:');
  console.log(`  30 秒 = ${formatTime(30)}`);
  console.log(`  90 秒 = ${formatTime(90)}`);
  console.log(`  3665 秒 = ${formatTime(3665)}`);
}

// ==================== 运行示例 ====================

/**
 * 主函数 - 运行所有示例
 */
async function main(): Promise<void> {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  文件下载工具使用示例                  ║');
  console.log('║  Download Utils Examples               ║');
  console.log('╚════════════════════════════════════════╝\n');
  
  // 运行工具函数示例 (同步)
  exampleUtilityFunctions();
  
  console.log('\n' + '─'.repeat(50) + '\n');
  
  // 运行异步示例
  await exampleBasicDownload();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await exampleDownloadWithProgress();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await exampleMultiThreadDownload();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await exampleControlledDownload();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await exampleResumeDownload();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await exampleBatchDownload();
  console.log('\n' + '─'.repeat(50) + '\n');
  
  await exampleLargeFileDownload();
}

// 如果直接运行此文件
if (require.main === module) {
  main().catch(console.error);
}

export {
  exampleBasicDownload,
  exampleDownloadWithProgress,
  exampleMultiThreadDownload,
  exampleControlledDownload,
  exampleResumeDownload,
  exampleBatchDownload,
  exampleLargeFileDownload,
  exampleUtilityFunctions,
  main
};
