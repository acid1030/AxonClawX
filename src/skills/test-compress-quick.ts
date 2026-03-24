/**
 * 压缩工具快速测试脚本
 * 
 * 运行：npx ts-node test-compress-quick.ts
 */

import {
  gzipCompress,
  gzipDecompress,
  deflateCompress,
  deflateDecompress,
  zipCreate,
  zipExtract,
  formatBytes,
  formatCompressionRatio
} from './compress-utils-skill';

async function runQuickTests() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   压缩工具 - 快速测试                      ║');
  console.log('╚════════════════════════════════════════════╝\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Gzip 字符串压缩
  console.log('Test 1: Gzip 字符串压缩');
  try {
    const text = 'Hello, Compression! This is a test.';
    const result = gzipCompress(text);
    
    if (result.success && result.data) {
      const decompressed = gzipDecompress(result.data, { encoding: 'utf-8' });
      if (decompressed.success && decompressed.data === text) {
        console.log('  ✓ PASS - 压缩率:', formatCompressionRatio(result.ratio));
        passed++;
      } else {
        console.log('  ✗ FAIL - 解压内容不匹配');
        failed++;
      }
    } else {
      console.log('  ✗ FAIL - 压缩失败:', result.error);
      failed++;
    }
  } catch (error) {
    console.log('  ✗ FAIL -', error instanceof Error ? error.message : error);
    failed++;
  }
  
  // Test 2: Deflate 压缩
  console.log('\nTest 2: Deflate 压缩');
  try {
    const text = 'Deflate compression test data. '.repeat(10);
    const result = deflateCompress(text);
    
    if (result.success && result.data) {
      const decompressed = deflateDecompress(result.data, { encoding: 'utf-8' });
      if (decompressed.success && decompressed.data === text) {
        console.log('  ✓ PASS - 压缩率:', formatCompressionRatio(result.ratio));
        passed++;
      } else {
        console.log('  ✗ FAIL - 解压内容不匹配');
        failed++;
      }
    } else {
      console.log('  ✗ FAIL - 压缩失败:', result.error);
      failed++;
    }
  } catch (error) {
    console.log('  ✗ FAIL -', error instanceof Error ? error.message : error);
    failed++;
  }
  
  // Test 3: Zip 单文件创建
  console.log('\nTest 3: Zip 单文件创建');
  try {
    const content = 'Zip test file content.\n'.repeat(20);
    const result = zipCreate(content, 'test.txt', { level: 6 });
    
    if (result.success && result.data) {
      console.log('  ✓ PASS - 文件大小:', formatBytes(result.compressedSize || 0));
      passed++;
      
      // Test 4: Zip 解压
      console.log('\nTest 4: Zip 解压');
      const extractResult = zipExtract(result.data);
      
      if (extractResult.success && extractResult.files && extractResult.files[0].data.toString() === content) {
        console.log('  ✓ PASS - 文件名:', extractResult.files[0].name);
        passed++;
      } else {
        console.log('  ✗ FAIL - 解压失败');
        failed++;
      }
    } else {
      console.log('  ✗ FAIL - Zip 创建失败:', result.error);
      failed++;
    }
  } catch (error) {
    console.log('  ✗ FAIL -', error instanceof Error ? error.message : error);
    failed++;
  }
  
  // Test 5: 不同压缩级别
  console.log('\nTest 5: 压缩级别对比');
  try {
    const text = 'Compression level test. '.repeat(50);
    const levels = [1, 6, 9];
    
    console.log('  级别\t大小\t压缩率');
    console.log('  ----\t----\t----');
    
    for (const level of levels) {
      const result = gzipCompress(text, { level });
      if (result.success) {
        console.log(`  ${level}\t${formatBytes(result.compressedSize)}\t${formatCompressionRatio(result.ratio)}`);
      }
    }
    console.log('  ✓ PASS');
    passed++;
  } catch (error) {
    console.log('  ✗ FAIL -', error instanceof Error ? error.message : error);
    failed++;
  }
  
  // Test 6: Buffer 压缩
  console.log('\nTest 6: Buffer 压缩');
  try {
    const buffer = Buffer.alloc(1024 * 10); // 10KB
    for (let i = 0; i < buffer.length; i++) {
      buffer[i] = i % 256;
    }
    
    const result = gzipCompress(buffer);
    if (result.success && result.data) {
      const decompressed = gzipDecompress(result.data);
      if (decompressed.success && decompressed.data && Buffer.isBuffer(decompressed.data)) {
        const isMatch = buffer.equals(decompressed.data);
        if (isMatch) {
          console.log('  ✓ PASS - Buffer 验证通过');
          passed++;
        } else {
          console.log('  ✗ FAIL - Buffer 内容不匹配');
          failed++;
        }
      } else {
        console.log('  ✗ FAIL - 解压失败');
        failed++;
      }
    } else {
      console.log('  ✗ FAIL - 压缩失败');
      failed++;
    }
  } catch (error) {
    console.log('  ✗ FAIL -', error instanceof Error ? error.message : error);
    failed++;
  }
  
  // 总结
  console.log('\n╔════════════════════════════════════════════╗');
  console.log(`║   测试结果：${passed} 通过，${failed} 失败${' '.repeat(Math.max(0, 16 - String(passed).length - String(failed).length))}║`);
  console.log('╚════════════════════════════════════════════╝\n');
  
  if (failed > 0) {
    process.exit(1);
  }
}

runQuickTests();
