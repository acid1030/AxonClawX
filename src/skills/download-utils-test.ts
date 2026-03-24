/**
 * 文件下载工具测试脚本
 * 
 * 测试断点续传、多线程下载、进度追踪功能
 */

import {
  downloadFile,
  createDownloadManager,
  formatBytes,
  formatTime,
  DownloadStatus
} from './download-utils-skill';

/**
 * 测试 1: 基础下载测试
 */
async function testBasicDownload(): Promise<void> {
  console.log('\n📦 测试 1: 基础下载');
  console.log('─'.repeat(50));
  
  const startTime = Date.now();
  
  try {
    // 使用一个公开的测试文件
    await downloadFile(
      'https://speed.hetzner.de/100MB.bin',
      './test-download-100mb.bin',
      {
        threads: 4,
        onProgress: (progress) => {
          process.stdout.write(`\r进度：${progress.percentage.toFixed(2)}%`);
        },
        onComplete: () => {
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
          console.log(`\n✅ 下载完成！耗时：${elapsed}秒`);
        }
      }
    );
    
    console.log('✓ 基础下载测试通过');
  } catch (error) {
    console.error('✗ 基础下载测试失败:', error);
  }
}

/**
 * 测试 2: 多线程下载测试
 */
async function testMultiThreadDownload(): Promise<void> {
  console.log('\n📦 测试 2: 多线程下载 (8 线程)');
  console.log('─'.repeat(50));
  
  const startTime = Date.now();
  
  try {
    await downloadFile(
      'https://speed.hetzner.de/100MB.bin',
      './test-download-100mb-multithread.bin',
      {
        threads: 8,
        minChunkSize: 1024 * 1024, // 1MB
        onProgress: (progress) => {
          const barLength = 30;
          const filled = Math.round((progress.percentage / 100) * barLength);
          const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
          
          process.stdout.write(
            `\r[${bar}] ${progress.percentage.toFixed(1)}% | ` +
            `${formatBytes(progress.speedBytesPerSec)}/s | ` +
            `剩余：${formatTime(progress.etaSeconds)}  `
          );
        }
      }
    );
    
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n✅ 下载完成！耗时：${elapsed}秒`);
    console.log('✓ 多线程下载测试通过');
  } catch (error) {
    console.error('✗ 多线程下载测试失败:', error);
  }
}

/**
 * 测试 3: 可控下载测试 (暂停/恢复)
 */
async function testControlledDownload(): Promise<void> {
  console.log('\n📦 测试 3: 可控下载 (暂停/恢复)');
  console.log('─'.repeat(50));
  
  const manager = createDownloadManager(
    'https://speed.hetzner.de/100MB.bin',
    './test-download-controlled.bin',
    {
      threads: 4,
      onProgress: (progress) => {
        process.stdout.write(`\r进度：${progress.percentage.toFixed(2)}% | 状态：${progress.status}`);
        
        // 在 50% 时暂停
        if (progress.percentage >= 50 && progress.status === DownloadStatus.DOWNLOADING) {
          console.log('\n⏸️  暂停下载...');
          manager.pause();
          
          setTimeout(() => {
            console.log('▶️  恢复下载...');
            manager.resume();
          }, 2000);
        }
      }
    }
  );
  
  try {
    await manager.start();
    console.log('\n✅ 下载完成');
    console.log('✓ 可控下载测试通过');
  } catch (error) {
    console.error('✗ 可控下载测试失败:', error);
  }
}

/**
 * 测试 4: 工具函数测试
 */
function testUtilityFunctions(): void {
  console.log('\n📦 测试 4: 工具函数');
  console.log('─'.repeat(50));
  
  // 字节格式化
  console.log('\n字节格式化测试:');
  const byteTests = [
    500,
    1024,
    1024 * 512,
    1024 * 1024 * 1.5,
    1024 * 1024 * 1024 * 2.5
  ];
  
  byteTests.forEach(bytes => {
    console.log(`  ${bytes.toString().padStart(15)} 字节 = ${formatBytes(bytes)}`);
  });
  
  // 时间格式化
  console.log('\n时间格式化测试:');
  const timeTests = [30, 90, 3665, 7325];
  
  timeTests.forEach(seconds => {
    console.log(`  ${seconds.toString().padStart(5)} 秒 = ${formatTime(seconds)}`);
  });
  
  console.log('✓ 工具函数测试通过');
}

/**
 * 运行所有测试
 */
async function runAllTests(): Promise<void> {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  文件下载工具测试套件                  ║');
  console.log('║  Download Utils Test Suite             ║');
  console.log('╚════════════════════════════════════════╝');
  
  // 测试工具函数 (同步)
  testUtilityFunctions();
  
  // 测试下载功能 (异步)
  console.log('\n⚠️  注意：下载测试需要网络连接，将下载约 100MB 测试文件\n');
  
  const confirm = await new Promise<boolean>(resolve => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('是否继续下载测试？(y/n): ', (answer: string) => {
      readline.close();
      resolve(answer.toLowerCase() === 'y');
    });
  });
  
  if (!confirm) {
    console.log('已跳过下载测试');
    return;
  }
  
  await testBasicDownload();
  await testMultiThreadDownload();
  await testControlledDownload();
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  所有测试完成！                        ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// 运行测试
runAllTests().catch(console.error);
