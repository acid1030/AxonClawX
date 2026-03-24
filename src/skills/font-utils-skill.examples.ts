/**
 * 字体工具技能 - 使用示例
 * 
 * 运行方式：uv run tsx src/skills/font-utils-skill.examples.ts
 * 
 * 前置依赖安装:
 * ```bash
 * uv pip install fonttools brotli
 * ```
 */

import {
  loadFont,
  loadFontFromUrl,
  convertFont,
  batchConvert,
  createSubset,
  createWebOptimizedSubset,
  analyzeFontRanges,
  getFontFileInfo,
  validateFont
} from './font-utils-skill';

async function runExamples() {
  console.log('\n🔤 字体工具技能 - 使用示例\n');
  console.log('=' .repeat(60));

  // ==================== 示例 1: 获取字体文件信息 ====================
  console.log('\n📋 示例 1: 获取字体文件信息\n');
  
  try {
    // 注意：需要先有一个字体文件
    const testFontPath = './test-font.ttf';
    
    console.log('字体文件信息:');
    const fileInfo = getFontFileInfo(testFontPath);
    console.log(`  路径：${fileInfo.path}`);
    console.log(`  大小：${(fileInfo.size / 1024).toFixed(2)} KB`);
    console.log(`  格式：${fileInfo.format}`);
    console.log(`  修改时间：${fileInfo.modified.toLocaleString('zh-CN')}`);
  } catch (error: any) {
    console.log(`  ⚠️  跳过 (文件不存在): ${error.message}`);
  }

  // ==================== 示例 2: 加载字体并获取详细信息 ====================
  console.log('\n📖 示例 2: 加载字体并获取详细信息\n');
  
  try {
    const fontInfo = await loadFont('./test-font.ttf');
    
    console.log('字体详细信息:');
    console.log(`  字体家族：${fontInfo.family}`);
    console.log(`  子家族：${fontInfo.subfamily}`);
    console.log(`  全名：${fontInfo.fullName}`);
    console.log(`  版本：${fontInfo.version}`);
    console.log(`  PostScript 名：${fontInfo.postscriptName}`);
    console.log(`  单位/EM: ${fontInfo.unitsPerEm}`);
    console.log(`  字形数量：${fontInfo.glyphCount}`);
    console.log(`  边界框：[${fontInfo.boundingBox.xMin}, ${fontInfo.boundingBox.yMin}, ${fontInfo.boundingBox.xMax}, ${fontInfo.boundingBox.yMax}]`);
    console.log(`  彩色字体：${fontInfo.hasColor ? '是' : '否'}`);
    console.log(`  等宽字体：${fontInfo.isFixedPitch ? '是' : '否'}`);
  } catch (error: any) {
    console.log(`  ⚠️  跳过 (文件不存在): ${error.message}`);
  }

  // ==================== 示例 3: 从 URL 加载字体 ====================
  console.log('\n🌐 示例 3: 从 URL 加载字体\n');
  
  try {
    console.log('正在从 Google Fonts 下载字体...');
    const localPath = await loadFontFromUrl(
      'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZK.woff2',
      './downloads/roboto.woff2'
    );
    console.log(`  ✓ 下载完成：${localPath}`);
    
    const fileInfo = getFontFileInfo(localPath);
    console.log(`  文件大小：${(fileInfo.size / 1024).toFixed(2)} KB`);
  } catch (error: any) {
    console.log(`  ⚠️  跳过 (网络错误): ${error.message}`);
  }

  // ==================== 示例 4: 字体格式转换 ====================
  console.log('\n🔄 示例 4: 字体格式转换\n');
  
  try {
    console.log('将 TTF 转换为 WOFF2...');
    await convertFont('./test-font.ttf', './output/font.woff2', {
      quality: 'high',
      compress: true
    });
    console.log('  ✓ 转换完成');
  } catch (error: any) {
    console.log(`  ⚠️  跳过：${error.message}`);
  }

  // ==================== 示例 5: 批量转换格式 ====================
  console.log('\n📦 示例 5: 批量转换格式\n');
  
  try {
    console.log('批量转换为多种格式...');
    const outputPaths = await batchConvert(
      './test-font.ttf',
      './output/webfonts',
      ['woff', 'woff2']
    );
    
    console.log('  ✓ 生成文件:');
    outputPaths.forEach(p => console.log(`    - ${p}`));
  } catch (error: any) {
    console.log(`  ⚠️  跳过：${error.message}`);
  }

  // ==================== 示例 6: 创建字体子集 (中文) ====================
  console.log('\n✂️  示例 6: 创建字体子集 (中文)\n');
  
  try {
    console.log('提取中文字符子集...');
    const result = await createSubset('./test-font.ttf', './output/chinese-subset.ttf', {
      characters: '你好世界欢迎使用字体工具',
      optimize: true,
      preserveKerning: true
    });
    
    console.log('  ✓ 子集创建完成:');
    console.log(`    原始大小：${(result.originalSize / 1024).toFixed(2)} KB`);
    console.log(`    子集大小：${(result.subsetSize / 1024).toFixed(2)} KB`);
    console.log(`    压缩率：${result.reduction}%`);
    console.log(`    字符数：${result.characterCount}`);
  } catch (error: any) {
    console.log(`  ⚠️  跳过：${error.message}`);
  }

  // ==================== 示例 7: 从文件读取字符列表 ====================
  console.log('\n📄 示例 7: 从文件读取字符列表\n');
  
  try {
    // 先创建字符文件
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    await import('fs').then(fs => {
      fs.writeFileSync('./chars.txt', chars, 'utf-8');
    });
    
    console.log('从字符文件创建子集...');
    const result = await createSubset('./test-font.ttf', './output/latin-subset.ttf', {
      characterFile: './chars.txt',
      optimize: true
    });
    
    console.log(`  ✓ 子集大小：${(result.subsetSize / 1024).toFixed(2)} KB`);
  } catch (error: any) {
    console.log(`  ⚠️  跳过：${error.message}`);
  }

  // ==================== 示例 8: 创建 Web 优化子集 ====================
  console.log('\n🌍 示例 8: 创建 Web 优化子集\n');
  
  try {
    console.log('为中文网页创建优化字体...');
    const outputPath = await createWebOptimizedSubset(
      './test-font.ttf',
      './output/web',
      'zh'
    );
    console.log(`  ✓ 输出：${outputPath}`);
  } catch (error: any) {
    console.log(`  ⚠️  跳过：${error.message}`);
  }

  // ==================== 示例 9: 分析字体字符范围 ====================
  console.log('\n🔍 示例 9: 分析字体字符范围\n');
  
  try {
    console.log('分析字体支持的 Unicode 范围...');
    const ranges = await analyzeFontRanges('./test-font.ttf');
    
    console.log('分析结果:');
    console.log(`  总字形数：${ranges.totalGlyphs}`);
    console.log(`  Unicode 范围:`);
    ranges.unicodeRanges.slice(0, 10).forEach(r => console.log(`    - ${r}`));
    if (ranges.unicodeRanges.length > 10) {
      console.log(`    ... 还有 ${ranges.unicodeRanges.length - 10} 个范围`);
    }
    console.log(`  支持中文：${ranges.hasChinese ? '✓' : '✗'}`);
    console.log(`  支持日文：${ranges.hasJapanese ? '✓' : '✗'}`);
    console.log(`  支持韩文：${ranges.hasKorean ? '✓' : '✗'}`);
    console.log(`  支持 Emoji: ${ranges.hasEmoji ? '✓' : '✗'}`);
  } catch (error: any) {
    console.log(`  ⚠️  跳过：${error.message}`);
  }

  // ==================== 示例 10: 验证字体完整性 ====================
  console.log('\n✅ 示例 10: 验证字体完整性\n');
  
  try {
    console.log('验证字体文件...');
    const validation = await validateFont('./test-font.ttf');
    
    console.log('验证结果:');
    console.log(`  状态：${validation.valid ? '✓ 有效' : '✗ 无效'}`);
    
    if (validation.errors.length > 0) {
      console.log('  错误:');
      validation.errors.forEach(e => console.log(`    - ${e}`));
    }
    
    if (validation.warnings.length > 0) {
      console.log('  警告:');
      validation.warnings.forEach(w => console.log(`    - ${w}`));
    }
    
    if (validation.valid && validation.warnings.length === 0) {
      console.log('  ✓ 字体文件完整无误');
    }
  } catch (error: any) {
    console.log(`  ⚠️  跳过：${error.message}`);
  }

  // ==================== 示例 11: 实际工作流 ====================
  console.log('\n🏭 示例 11: 实际工作流 - 网页字体优化\n');
  
  try {
    console.log('场景：为网站准备优化的中文字体\n');
    
    // 1. 从完整字体创建子集
    const commonChinese = '的是一不了人在有中到大这为主生国以会经要时到用后而然家么她他个们多中上国大';
    
    console.log('步骤 1: 创建常用汉字子集...');
    const subset1 = await createSubset('./test-font.ttf', './output/web/chinese-common.woff2', {
      characters: commonChinese,
      optimize: true
    });
    
    // 2. 创建标点符号子集
    const punctuation = '，。、；：？！…—·""''（）《》【】';
    
    console.log('步骤 2: 创建标点符号子集...');
    const subset2 = await createSubset('./test-font.ttf', './output/web/punctuation.woff2', {
      characters: punctuation,
      optimize: true
    });
    
    console.log('\n  ✓ 优化完成:');
    console.log(`    常用汉字：${(subset1.subsetSize / 1024).toFixed(2)} KB`);
    console.log(`    标点符号：${(subset2.subsetSize / 1024).toFixed(2)} KB`);
    console.log(`    总计节省：${((subset1.reduction + subset2.reduction) / 2).toFixed(1)}%`);
    
  } catch (error: any) {
    console.log(`  ⚠️  跳过：${error.message}`);
  }

  // ==================== 示例 12: 性能对比 ====================
  console.log('\n⚡ 示例 12: 字体大小对比\n');
  
  try {
    console.log('不同格式字体大小对比:\n');
    
    const formats = [
      { ext: 'ttf', name: 'TrueType' },
      { ext: 'otf', name: 'OpenType' },
      { ext: 'woff', name: 'WOFF' },
      { ext: 'woff2', name: 'WOFF2' }
    ];
    
    console.log('格式          大小 (KB)      相对比例');
    console.log('-'.repeat(50));
    
    let baseSize = 0;
    for (const format of formats) {
      try {
        const filePath = `./output/font.${format.ext}`;
        const size = getFontFileInfo(filePath).size;
        
        if (baseSize === 0) baseSize = size;
        const ratio = (size / baseSize * 100).toFixed(1);
        
        console.log(`${format.name.padEnd(12)} ${(size / 1024).toFixed(2).padStart(8)}    ${ratio}%`);
      } catch {
        console.log(`${format.name.padEnd(12)} ${'N/A'.padStart(8)}`);
      }
    }
    
    console.log('\n  💡 提示：WOFF2 通常比 TTF 小 30-50%');
    
  } catch (error: any) {
    console.log(`  ⚠️  跳过：${error.message}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ 示例执行完成\n');
}

// 运行示例
runExamples().catch(console.error);
