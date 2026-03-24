/**
 * 图片处理技能测试
 */

import { ImageProcessor, compressImage, resizeImage, convertImage, processImage, getImageInfo } from './image-processor-skill';
import * as fs from 'fs';
import * as path from 'path';

// 测试用图片路径
const TEST_IMAGE = path.join(__dirname, '../../test-assets/test-image.jpg');
const OUTPUT_DIR = path.join(__dirname, '../../test-assets/output');

// 确保测试资源存在
async function ensureTestImage() {
  if (!fs.existsSync(TEST_IMAGE)) {
    // 创建测试目录
    const dir = path.dirname(TEST_IMAGE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // 创建一个简单的测试图片 (使用 sharp)
    const sharp = require('sharp');
    await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 3,
        background: { r: 255, g: 100, b: 50 }
      }
    })
      .jpeg({ quality: 90 })
      .toFile(TEST_IMAGE);
    
    console.log('✅ 创建测试图片');
  }
  
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

// 运行测试
(async () => {
  console.log('🚀 开始测试图片处理技能...\n');
  
  await ensureTestImage();
  
  try {
    // 测试获取信息
    console.log('📊 测试 1: 获取图片信息');
    const info = await getImageInfo(TEST_IMAGE);
    console.log(`   ✓ ${info.format.toUpperCase()} ${info.width}x${info.height} ${(info.size / 1024).toFixed(2)} KB\n`);
    
    // 测试压缩
    console.log('🗜️  测试 2: 压缩图片');
    const compressResult = await compressImage(TEST_IMAGE, path.join(OUTPUT_DIR, 'test-compressed.jpg'), {
      quality: 70
    });
    console.log(`   ✓ 压缩率：${compressResult.compressionRatio.toFixed(2)}%\n`);
    
    // 测试格式转换
    console.log('🔄 测试 3: 格式转换');
    const convertResult = await convertImage(TEST_IMAGE, path.join(OUTPUT_DIR, 'test-converted.webp'), 'webp');
    console.log(`   ✓ 转换为 ${convertResult.format.toUpperCase()}\n`);
    
    // 测试调整尺寸
    console.log('📐 测试 4: 调整尺寸');
    const resizeResult = await resizeImage(TEST_IMAGE, path.join(OUTPUT_DIR, 'test-resized.jpg'), {
      width: 800,
      height: 600
    });
    console.log(`   ✓ 新尺寸：${resizeResult.width}x${resizeResult.height}\n`);
    
    // 测试链式处理
    console.log('⚡ 测试 5: 链式处理');
    const processResult = await processImage(
      TEST_IMAGE,
      path.join(OUTPUT_DIR, 'test-processed.webp'),
      { width: 1200, height: 800 },
      { format: 'webp', quality: 75 }
    );
    console.log(`   ✓ 最终大小：${(processResult.processedSize / 1024).toFixed(2)} KB (${processResult.compressionRatio.toFixed(2)}% 压缩)\n`);
    
    // 测试 ImageProcessor 类
    console.log('🔧 测试 6: ImageProcessor 类');
    const processor = new ImageProcessor(TEST_IMAGE);
    const classInfo = await processor.getInfo();
    console.log(`   ✓ 类实例创建成功，图片信息：${classInfo.width}x${classInfo.height}\n`);
    
    console.log('✅ 所有测试通过！图片处理技能工作正常。\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  }
})();
