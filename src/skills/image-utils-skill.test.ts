/**
 * Image Utils Skill - 快速测试
 */

import {
  ImageUtils,
  compressImage,
  convertImage,
  addTextWatermark,
  addImageWatermark,
  getImageInfo
} from './image-utils-skill';
import * as fs from 'fs';
import * as path from 'path';

const testDir = path.join(__dirname, '../../test-assets/images');
const outputDir = path.join(__dirname, '../../test-assets/output');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function runTests() {
  console.log('🚀 Image Utils Skill 测试开始\n');

  // 查找测试图片
  const testImages = fs.readdirSync(testDir)
    .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
    .slice(0, 2); // 只测试前 2 张

  if (testImages.length === 0) {
    console.log('⚠️  未找到测试图片，请在 test-assets/images 目录放置测试图片');
    return;
  }

  for (const imageName of testImages) {
    const inputPath = path.join(testDir, imageName);
    const baseName = path.basename(imageName, path.extname(imageName));

    console.log(`\n📷 测试图片：${imageName}`);
    console.log('=' .repeat(50));

    try {
      // 1. 获取图片信息
      console.log('\n1️⃣  获取图片信息...');
      const info = await getImageInfo(inputPath);
      console.log(`   格式：${info.format}`);
      console.log(`   尺寸：${info.width} x ${info.height}`);
      console.log(`   大小：${(info.size / 1024).toFixed(2)} KB`);

      // 2. 压缩测试
      console.log('\n2️⃣  压缩测试 (JPEG 80%)...');
      const compressOutput = path.join(outputDir, `${baseName}-compressed.jpg`);
      const compressResult = await compressImage(inputPath, compressOutput, {
        format: 'jpeg',
        quality: 80
      });
      console.log(`   原始大小：${(compressResult.originalSize / 1024).toFixed(2)} KB`);
      console.log(`   压缩后：${(compressResult.processedSize / 1024).toFixed(2)} KB`);
      console.log(`   压缩率：${compressResult.compressionRatio.toFixed(2)}%`);
      console.log(`   ✅ 输出：${compressOutput}`);

      // 3. 格式转换测试
      console.log('\n3️⃣  格式转换 (PNG)...');
      const convertOutput = path.join(outputDir, `${baseName}-converted.png`);
      const convertResult = await convertImage(inputPath, convertOutput, 'png');
      console.log(`   输出格式：${convertResult.format}`);
      console.log(`   ✅ 输出：${convertOutput}`);

      // 4. 文字水印测试
      console.log('\n4️⃣  添加文字水印...');
      const textWatermarkOutput = path.join(outputDir, `${baseName}-text-watermark.jpg`);
      const textResult = await addTextWatermark(
        inputPath,
        textWatermarkOutput,
        '© AxonClaw 2026',
        {
          fontSize: 24,
          color: '#ffffff',
          position: 'bottom-right',
          margin: 10,
          opacity: 0.7
        }
      );
      console.log(`   ✅ 输出：${textWatermarkOutput}`);

      // 5. 图片水印测试 (如果有 logo)
      const logoPath = path.join(testDir, 'logo.png');
      if (fs.existsSync(logoPath)) {
        console.log('\n5️⃣  添加图片水印...');
        const imageWatermarkOutput = path.join(outputDir, `${baseName}-image-watermark.jpg`);
        const imageResult = await addImageWatermark(
          inputPath,
          imageWatermarkOutput,
          logoPath,
          {
            width: 100,
            position: 'bottom-left',
            margin: 10,
            opacity: 0.8
          }
        );
        console.log(`   ✅ 输出：${imageWatermarkOutput}`);
      } else {
        console.log('\n5️⃣  跳过图片水印测试 (logo.png 不存在)');
      }

      console.log('\n✅ 测试完成');

    } catch (error) {
      console.error(`❌ 测试失败:`, error instanceof Error ? error.message : error);
    }
  }

  console.log('\n' + '=' .repeat(50));
  console.log('🎉 所有测试完成！输出文件在:', outputDir);
}

// 运行测试
runTests().catch(console.error);
