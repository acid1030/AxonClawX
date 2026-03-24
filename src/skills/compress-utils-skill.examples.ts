/**
 * 数据压缩工具技能 - 使用示例
 * 
 * 本文件展示 compress-utils-skill 的所有功能用法
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  // Gzip
  gzipCompress,
  gzipDecompress,
  gzipCompressFile,
  gzipDecompressFile,
  gzipStreamCompress,
  gzipStreamDecompress,
  
  // Deflate
  deflateCompress,
  deflateDecompress,
  deflateCompressFile,
  deflateDecompressFile,
  deflateStreamCompress,
  deflateStreamDecompress,
  
  // Zip
  zipCreate,
  zipExtract,
  zipCreateFile,
  zipExtractFile,
  zipDirectory,
  
  // 流式文件
  compressFileStream,
  decompressFileStream,
  
  // 工具
  formatBytes,
  formatCompressionRatio
} from './compress-utils-skill';

// ============== 示例 1: Gzip 字符串压缩 ==============
async function example1_gzipString() {
  console.log('\n=== 示例 1: Gzip 字符串压缩 ===\n');
  
  const originalText = 'Hello, World! This is a test string for compression. 这是一个测试字符串。';
  
  // 压缩
  const compressResult = gzipCompress(originalText);
  
  if (compressResult.success) {
    console.log('✓ 压缩成功');
    console.log(`  原始大小：${formatBytes(compressResult.originalSize)}`);
    console.log(`  压缩后大小：${formatBytes(compressResult.compressedSize)}`);
    console.log(`  压缩率：${formatCompressionRatio(compressResult.ratio)}`);
    
    // 解压
    if (compressResult.data) {
      const decompressResult = gzipDecompress(compressResult.data as Buffer, { encoding: 'utf-8' });
      
      if (decompressResult.success) {
        console.log('✓ 解压成功');
        console.log(`  解压后内容：${decompressResult.data}`);
        console.log(`  验证：${decompressResult.data === originalText ? '✓ 内容一致' : '✗ 内容不匹配'}`);
      }
    }
  } else {
    console.log('✗ 压缩失败:', compressResult.error);
  }
}

// ============== 示例 2: Gzip 文件压缩 ==============
async function example2_gzipFile() {
  console.log('\n=== 示例 2: Gzip 文件压缩 ===\n');
  
  const testFile = 'test.txt';
  const compressedFile = 'test.txt.gz';
  const decompressedFile = 'test-restored.txt';
  
  // 创建测试文件
  const testContent = 'This is a test file for Gzip compression.\n'.repeat(100);
  fs.writeFileSync(testFile, testContent);
  console.log(`✓ 创建测试文件：${testFile} (${formatBytes(Buffer.byteLength(testContent))})`);
  
  try {
    // 压缩文件
    const compressResult = await gzipCompressFile(testFile, compressedFile, { level: 9 });
    
    if (compressResult.success) {
      console.log('✓ 文件压缩成功');
      console.log(`  原始大小：${formatBytes(compressResult.originalSize)}`);
      console.log(`  压缩后大小：${formatBytes(compressResult.compressedSize)}`);
      console.log(`  压缩率：${formatCompressionRatio(compressResult.ratio)}`);
      
      // 解压文件
      const decompressResult = await gzipDecompressFile(compressedFile, decompressedFile);
      
      if (decompressResult.success) {
        console.log('✓ 文件解压成功');
        console.log(`  解压后大小：${formatBytes(decompressResult.compressedSize)}`);
        
        // 验证内容
        const restoredContent = fs.readFileSync(decompressedFile, 'utf-8');
        console.log(`  验证：${restoredContent === testContent ? '✓ 内容一致' : '✗ 内容不匹配'}`);
        
        // 清理
        fs.unlinkSync(decompressedFile);
        fs.unlinkSync(compressedFile);
        fs.unlinkSync(testFile);
        console.log('✓ 已清理测试文件');
      }
    }
  } catch (error) {
    console.log('✗ 操作失败:', error instanceof Error ? error.message : error);
  }
}

// ============== 示例 3: Deflate 压缩 ==============
async function example3_deflate() {
  console.log('\n=== 示例 3: Deflate 压缩 ===\n');
  
  const data = 'Deflate compression test data. '.repeat(50);
  
  // 压缩
  const compressResult = deflateCompress(data);
  
  if (compressResult.success) {
    console.log('✓ Deflate 压缩成功');
    console.log(`  原始大小：${formatBytes(compressResult.originalSize)}`);
    console.log(`  压缩后大小：${formatBytes(compressResult.compressedSize)}`);
    console.log(`  压缩率：${formatCompressionRatio(compressResult.ratio)}`);
    
    // 解压
    if (compressResult.data) {
      const decompressResult = deflateDecompress(compressResult.data as Buffer, { encoding: 'utf-8' });
      
      if (decompressResult.success) {
        console.log('✓ Deflate 解压成功');
        console.log(`  验证：${decompressResult.data === data ? '✓ 内容一致' : '✗ 内容不匹配'}`);
      }
    }
  }
}

// ============== 示例 4: Deflate 文件压缩 ==============
async function example4_deflateFile() {
  console.log('\n=== 示例 4: Deflate 文件压缩 ===\n');
  
  const testFile = 'test-deflate.txt';
  const compressedFile = 'test-deflate.txt.deflate';
  const decompressedFile = 'test-deflate-restored.txt';
  
  // 创建测试文件
  const testContent = 'Deflate file compression test.\n'.repeat(200);
  fs.writeFileSync(testFile, testContent);
  console.log(`✓ 创建测试文件：${testFile} (${formatBytes(Buffer.byteLength(testContent))})`);
  
  try {
    // 压缩文件
    const compressResult = await deflateCompressFile(testFile, compressedFile, { level: 9 });
    
    if (compressResult.success) {
      console.log('✓ Deflate 文件压缩成功');
      console.log(`  原始大小：${formatBytes(compressResult.originalSize)}`);
      console.log(`  压缩后大小：${formatBytes(compressResult.compressedSize)}`);
      console.log(`  压缩率：${formatCompressionRatio(compressResult.ratio)}`);
      
      // 解压文件
      const decompressResult = await deflateDecompressFile(compressedFile, decompressedFile);
      
      if (decompressResult.success) {
        console.log('✓ Deflate 文件解压成功');
        
        // 验证内容
        const restoredContent = fs.readFileSync(decompressedFile, 'utf-8');
        console.log(`  验证：${restoredContent === testContent ? '✓ 内容一致' : '✗ 内容不匹配'}`);
        
        // 清理
        fs.unlinkSync(decompressedFile);
        fs.unlinkSync(compressedFile);
        fs.unlinkSync(testFile);
        console.log('✓ 已清理测试文件');
      }
    }
  } catch (error) {
    console.log('✗ 操作失败:', error instanceof Error ? error.message : error);
  }
}

// ============== 示例 5: 流式压缩 (大文件) ==============
async function example5_streamCompression() {
  console.log('\n=== 示例 5: 流式压缩 (大文件) ===\n');
  
  const largeFile = 'large-test.txt';
  const compressedFile = 'large-test.txt.gz';
  const decompressedFile = 'large-test-restored.txt';
  
  // 创建大测试文件 (10MB)
  console.log('✓ 创建大测试文件 (10MB)...');
  const writeStream = fs.createWriteStream(largeFile);
  const chunk = 'X'.repeat(1024 * 1024); // 1MB chunk
  
  for (let i = 0; i < 10; i++) {
    writeStream.write(chunk);
  }
  writeStream.end();
  
  // 等待写入完成
  await new Promise<void>((resolve) => {
    writeStream.on('finish', () => resolve());
  });
  
  const originalSize = fs.statSync(largeFile).size;
  console.log(`  文件大小：${formatBytes(originalSize)}`);
  
  try {
    // 流式压缩
    console.log('✓ 开始流式压缩...');
    await compressFileStream(largeFile, compressedFile, 'gzip', { level: 6 });
    
    const compressedSize = fs.statSync(compressedFile).size;
    console.log(`  压缩后大小：${formatBytes(compressedSize)}`);
    console.log(`  压缩率：${formatCompressionRatio(compressedSize / originalSize)}`);
    
    // 流式解压
    console.log('✓ 开始流式解压...');
    await decompressFileStream(compressedFile, decompressedFile, 'gzip');
    
    const restoredSize = fs.statSync(decompressedFile).size;
    console.log(`  解压后大小：${formatBytes(restoredSize)}`);
    console.log(`  验证：${restoredSize === originalSize ? '✓ 大小一致' : '✗ 大小不匹配'}`);
    
    // 清理
    fs.unlinkSync(decompressedFile);
    fs.unlinkSync(compressedFile);
    fs.unlinkSync(largeFile);
    console.log('✓ 已清理测试文件');
    
  } catch (error) {
    console.log('✗ 操作失败:', error instanceof Error ? error.message : error);
  }
}

// ============== 示例 6: 不同压缩级别对比 ==============
async function example6_compressionLevels() {
  console.log('\n=== 示例 6: 不同压缩级别对比 ===\n');
  
  const testData = 'This is test data for compression level comparison. '.repeat(100);
  
  console.log('测试不同压缩级别的效果:\n');
  console.log('级别\t大小\t\t压缩率');
  console.log('----\t----\t\t----');
  
  for (let level = 1; level <= 9; level++) {
    const result = gzipCompress(testData, { level });
    
    if (result.success) {
      console.log(`${level}\t${formatBytes(result.compressedSize)}\t${formatCompressionRatio(result.ratio)}`);
    }
  }
  
  console.log('\n提示：级别越高压缩率越好，但速度越慢');
}

// ============== 示例 7: Buffer 压缩 ==============
async function example7_bufferCompression() {
  console.log('\n=== 示例 7: Buffer 压缩 ===\n');
  
  // 创建二进制 Buffer
  const buffer = Buffer.alloc(1024 * 1024); // 1MB
  for (let i = 0; i < buffer.length; i++) {
    buffer[i] = i % 256;
  }
  
  console.log(`✓ 创建 Buffer: ${formatBytes(buffer.length)}`);
  
  // 压缩
  const compressResult = gzipCompress(buffer);
  
  if (compressResult.success) {
    console.log('✓ Buffer 压缩成功');
    console.log(`  原始大小：${formatBytes(compressResult.originalSize)}`);
    console.log(`  压缩后大小：${formatBytes(compressResult.compressedSize)}`);
    console.log(`  压缩率：${formatCompressionRatio(compressResult.ratio)}`);
    
    // 解压
    if (compressResult.data) {
      const decompressResult = gzipDecompress(compressResult.data as Buffer);
      
      if (decompressResult.success && decompressResult.data) {
        const restoredBuffer = decompressResult.data as Buffer;
        const isMatch = buffer.equals(restoredBuffer);
        console.log(`  验证：${isMatch ? '✓ Buffer 内容一致' : '✗ Buffer 内容不匹配'}`);
      }
    }
  }
}

// ============== 示例 8: Zip 单文件打包 ==============
async function example8_zipSingleFile() {
  console.log('\n=== 示例 8: Zip 单文件打包 ===\n');
  
  const testContent = 'This is a test file for Zip compression.\n'.repeat(50);
  
  // 创建 Zip
  const zipResult = zipCreate(testContent, 'test.txt', { level: 6 });
  
  if (zipResult.success && zipResult.data) {
    console.log('✓ Zip 创建成功');
    console.log(`  文件数：${zipResult.filesCount}`);
    console.log(`  原始大小：${formatBytes(zipResult.totalSize || 0)}`);
    console.log(`  压缩后大小：${formatBytes(zipResult.compressedSize || 0)}`);
    console.log(`  压缩率：${formatCompressionRatio((zipResult.compressedSize || 0) / (zipResult.totalSize || 1))}`);
    
    // 解压
    const extractResult = zipExtract(zipResult.data);
    
    if (extractResult.success && extractResult.files) {
      console.log('✓ Zip 解压成功');
      console.log(`  文件名：${extractResult.files[0].name}`);
      console.log(`  文件大小：${formatBytes(extractResult.files[0].size)}`);
      console.log(`  验证：${extractResult.files[0].data.toString() === testContent ? '✓ 内容一致' : '✗ 内容不匹配'}`);
    }
  } else {
    console.log('✗ Zip 创建失败:', zipResult.error);
  }
}

// ============== 示例 9: Zip 多文件打包 ==============
async function example9_zipMultipleFiles() {
  console.log('\n=== 示例 9: Zip 多文件打包 ===\n');
  
  const testDir = 'test-zip-dir';
  const zipFile = 'test-multiple.zip';
  const extractDir = 'test-zip-extracted';
  
  try {
    // 创建测试文件和目录
    await fs.promises.mkdir(testDir, { recursive: true });
    await fs.promises.mkdir(path.join(testDir, 'subdir'), { recursive: true });
    
    const files = [
      { path: 'file1.txt', content: 'File 1 content\n'.repeat(20) },
      { path: 'file2.txt', content: 'File 2 content\n'.repeat(30) },
      { path: 'subdir/file3.txt', content: 'File 3 in subdir\n'.repeat(25) }
    ];
    
    let totalSize = 0;
    for (const file of files) {
      const fullPath = path.join(testDir, file.path);
      await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.promises.writeFile(fullPath, file.content);
      totalSize += Buffer.byteLength(file.content);
    }
    
    console.log(`✓ 创建测试文件：${files.length} 个文件，总计 ${formatBytes(totalSize)}`);
    
    // 打包目录
    const zipResult = await zipDirectory(testDir, zipFile, { level: 6 });
    
    if (zipResult.success) {
      console.log('✓ 目录打包成功');
      console.log(`  文件数：${zipResult.filesCount}`);
      console.log(`  原始大小：${formatBytes(zipResult.totalSize || 0)}`);
      console.log(`  压缩后大小：${formatBytes(zipResult.compressedSize || 0)}`);
      console.log(`  压缩率：${formatCompressionRatio((zipResult.compressedSize || 0) / (zipResult.totalSize || 1))}`);
      
      // 解压
      const extractResult = await zipExtractFile(zipFile, extractDir);
      
      if (extractResult.success) {
        console.log('✓ Zip 解压成功');
        console.log(`  解压文件数：${extractResult.filesCount}`);
        
        // 验证文件
        let allMatch = true;
        for (const file of files) {
          const originalContent = await fs.promises.readFile(path.join(testDir, file.path), 'utf-8');
          const extractedContent = await fs.promises.readFile(path.join(extractDir, file.path), 'utf-8');
          if (originalContent !== extractedContent) {
            allMatch = false;
            break;
          }
        }
        console.log(`  验证：${allMatch ? '✓ 所有文件内容一致' : '✗ 文件内容不匹配'}`);
        
        // 清理
        await fs.promises.rm(testDir, { recursive: true, force: true });
        await fs.promises.rm(extractDir, { recursive: true, force: true });
        await fs.promises.unlink(zipFile);
        console.log('✓ 已清理测试文件');
      }
    }
  } catch (error) {
    console.log('✗ 操作失败:', error instanceof Error ? error.message : error);
  }
}

// ============== 示例 10: Zip 文件创建 ==============
async function example10_zipCreateFile() {
  console.log('\n=== 示例 10: Zip 文件创建 ===\n');
  
  const zipFile = 'test-create.zip';
  const extractDir = 'test-create-extracted';
  
  try {
    // 创建多个文件条目
    const entries = [
      { name: 'readme.txt', data: 'This is a readme file.\n'.repeat(10) },
      { name: 'data/config.json', data: JSON.stringify({ name: 'test', version: '1.0.0' }, null, 2) },
      { name: 'data/sample.txt', data: 'Sample data file.\n'.repeat(50) }
    ];
    
    console.log(`✓ 准备 ${entries.length} 个文件条目`);
    
    // 创建 Zip 文件
    const zipResult = await zipCreateFile(entries, zipFile, { level: 9 });
    
    if (zipResult.success) {
      console.log('✓ Zip 文件创建成功');
      console.log(`  文件数：${zipResult.filesCount}`);
      console.log(`  原始大小：${formatBytes(zipResult.totalSize || 0)}`);
      console.log(`  压缩后大小：${formatBytes(zipResult.compressedSize || 0)}`);
      console.log(`  压缩率：${formatCompressionRatio((zipResult.compressedSize || 0) / (zipResult.totalSize || 1))}`);
      
      // 解压验证
      const extractResult = await zipExtractFile(zipFile, extractDir);
      
      if (extractResult.success && extractResult.files) {
        console.log('✓ Zip 文件解压成功');
        console.log(`  解压文件数：${extractResult.filesCount}`);
        
        for (const file of extractResult.files) {
          console.log(`    - ${file.name} (${formatBytes(file.size)})`);
        }
        
        // 清理
        await fs.promises.rm(extractDir, { recursive: true, force: true });
        await fs.promises.unlink(zipFile);
        console.log('✓ 已清理测试文件');
      }
    }
  } catch (error) {
    console.log('✗ 操作失败:', error instanceof Error ? error.message : error);
  }
}

// ============== 运行所有示例 ==============
async function runAllExamples() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   数据压缩工具技能 - 使用示例              ║');
  console.log('║   功能：Gzip / Deflate / Zip               ║');
  console.log('╚════════════════════════════════════════════╝');
  
  try {
    await example1_gzipString();
    await example2_gzipFile();
    await example3_deflate();
    await example4_deflateFile();
    await example5_streamCompression();
    await example6_compressionLevels();
    await example7_bufferCompression();
    await example8_zipSingleFile();
    await example9_zipMultipleFiles();
    await example10_zipCreateFile();
    
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   所有示例运行完成 ✓                       ║');
    console.log('╚════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('\n✗ 示例运行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

// 导出示例函数供外部调用
export {
  example1_gzipString,
  example2_gzipFile,
  example3_deflate,
  example4_deflateFile,
  example5_streamCompression,
  example6_compressionLevels,
  example7_bufferCompression,
  example8_zipSingleFile,
  example9_zipMultipleFiles,
  example10_zipCreateFile,
  runAllExamples
};
