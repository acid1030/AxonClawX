/**
 * PDF 工具技能使用示例
 * 
 * 此文件展示如何使用 pdf-utils-skill.ts 中的各种功能
 */

import {
  // 生成
  generatePdfFromText,
  generatePdfFromHtml,
  
  // 合并/拆分
  mergePdfs,
  splitPdf,
  extractPages,
  
  // 转图片
  pdfToImages,
  pdfPageToImage,
  batchPdfToImages,
  
  // 批量操作
  batchMergePdfs,
  
  // 信息
  getPdfInfo,
  
  // 便捷导出
  PdfUtils,
} from './pdf-utils-skill';

// ==================== 示例 1: 从文本生成 PDF ====================

async function example1_generateFromText() {
  console.log('=== 示例 1: 从文本生成 PDF ===');
  
  const text = `
# 项目报告

## 概述
本项目旨在展示 PDF 生成功能的强大之处。

## 主要功能
1. PDF 生成
2. PDF 合并/拆分
3. PDF 转图片

## 总结
这是一个功能完整的 PDF 处理工具。

生成时间：${new Date().toLocaleString('zh-CN')}
  `;

  const outputPath = './output/report.pdf';
  
  try {
    const result = await generatePdfFromText(text, outputPath, {
      pageSize: 'A4',
      fontSize: 12,
      lineHeight: 1.5,
      addPageNumbers: true,
      pageNumberPosition: 'bottom-center',
    });
    
    console.log(`✓ PDF 生成成功：${result}`);
    
    // 获取 PDF 信息
    const info = await getPdfInfo(result);
    console.log(`  - 总页数：${info.pageCount}`);
    console.log(`  - 文件大小：${(info.fileSize / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('✗ 生成失败:', error);
  }
}

// ==================== 示例 2: 从 HTML 生成 PDF ====================

async function example2_generateFromHtml() {
  console.log('\n=== 示例 2: 从 HTML 生成 PDF ===');
  
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; }
    h1 { color: #6366f1; }
    .highlight { background: #f0f0f0; padding: 20px; border-left: 4px solid #6366f1; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background: #6366f1; color: white; }
  </style>
</head>
<body>
  <h1>HTML 转 PDF 示例</h1>
  
  <div class="highlight">
    <h2>重要信息</h2>
    <p>此 PDF 由 HTML 内容生成，支持完整的 CSS 样式。</p>
  </div>
  
  <h2>数据表格</h2>
  <table>
    <tr>
      <th>项目</th>
      <th>值</th>
      <th>状态</th>
    </tr>
    <tr>
      <td>任务 A</td>
      <td>100</td>
      <td>完成</td>
    </tr>
    <tr>
      <td>任务 B</td>
      <td>85</td>
      <td>进行中</td>
    </tr>
    <tr>
      <td>任务 C</td>
      <td>42</td>
      <td>待开始</td>
    </tr>
  </table>
  
  <p style="margin-top: 40px; color: #666;">
    生成时间：${new Date().toLocaleString('zh-CN')}
  </p>
</body>
</html>
  `;

  const outputPath = './output/html-report.pdf';
  
  try {
    const result = await generatePdfFromHtml(html, outputPath, {
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', bottom: '20mm', left: '20mm', right: '20mm' },
    });
    
    console.log(`✓ HTML PDF 生成成功：${result}`);
  } catch (error) {
    console.error('✗ 生成失败:', error);
  }
}

// ==================== 示例 3: 合并多个 PDF ====================

async function example3_mergePdfs() {
  console.log('\n=== 示例 3: 合并多个 PDF ===');
  
  // 假设有以下 PDF 文件
  const pdfFiles = [
    './output/report.pdf',
    './output/html-report.pdf',
  ];
  
  const outputPath = './output/merged-document.pdf';
  
  try {
    const result = await mergePdfs(pdfFiles, outputPath);
    
    console.log(`✓ PDF 合并成功：${result}`);
    
    const info = await getPdfInfo(result);
    console.log(`  - 合并后总页数：${info.pageCount}`);
  } catch (error) {
    console.error('✗ 合并失败:', error);
  }
}

// ==================== 示例 4: 拆分 PDF ====================

async function example4_splitPdf() {
  console.log('\n=== 示例 4: 拆分 PDF ===');
  
  const pdfPath = './output/merged-document.pdf';
  
  try {
    const pages = await splitPdf(pdfPath, {
      outputDir: './output/split-pages',
      filenamePrefix: 'page-',
      pageRange: '1-3', // 只拆分前 3 页
    });
    
    console.log(`✓ PDF 拆分成功，生成 ${pages.length} 个文件:`);
    pages.forEach((page, i) => {
      console.log(`  ${i + 1}. ${page}`);
    });
  } catch (error) {
    console.error('✗ 拆分失败:', error);
  }
}

// ==================== 示例 5: 提取指定页面 ====================

async function example5_extractPages() {
  console.log('\n=== 示例 5: 提取指定页面 ===');
  
  const pdfPath = './output/merged-document.pdf';
  const outputPath = './output/extracted-pages.pdf';
  
  try {
    const result = await extractPages(pdfPath, '1,3,5', outputPath);
    
    console.log(`✓ 页面提取成功：${result}`);
    
    const info = await getPdfInfo(result);
    console.log(`  - 提取后页数：${info.pageCount}`);
  } catch (error) {
    console.error('✗ 提取失败:', error);
  }
}

// ==================== 示例 6: PDF 转图片 ====================

async function example6_pdfToImages() {
  console.log('\n=== 示例 6: PDF 转图片 ===');
  
  const pdfPath = './output/merged-document.pdf';
  
  try {
    const images = await pdfToImages(pdfPath, {
      outputDir: './output/images',
      format: 'png',
      scale: 2, // 200% 缩放
      dpi: 144,
      pageRange: '1-2', // 只转换前 2 页
    });
    
    console.log(`✓ PDF 转图片成功，生成 ${images.length} 张图片:`);
    images.forEach((img, i) => {
      console.log(`  ${i + 1}. ${img}`);
    });
  } catch (error) {
    console.error('✗ 转换失败:', error);
  }
}

// ==================== 示例 7: 单页转图片 ====================

async function example7_singlePageToImage() {
  console.log('\n=== 示例 7: 单页转图片 ===');
  
  const pdfPath = './output/merged-document.pdf';
  const outputPath = './output/cover-page.jpeg';
  
  try {
    const result = await pdfPageToImage(pdfPath, 1, outputPath, {
      format: 'jpeg',
      quality: 95,
      scale: 3, // 300% 高质量
    });
    
    console.log(`✓ 单页转换成功：${result}`);
  } catch (error) {
    console.error('✗ 转换失败:', error);
  }
}

// ==================== 示例 8: 批量操作 ====================

async function example8_batchOperations() {
  console.log('\n=== 示例 8: 批量操作 ===');
  
  // 批量转换多个 PDF 为图片
  const pdfFiles = [
    './output/report.pdf',
    './output/html-report.pdf',
  ];
  
  try {
    const allImages = await batchPdfToImages(pdfFiles, {
      outputDir: './output/batch-images',
      format: 'png',
    });
    
    console.log('✓ 批量转换成功:');
    allImages.forEach((images, i) => {
      console.log(`  PDF ${i + 1}: ${images.length} 张图片`);
    });
  } catch (error) {
    console.error('✗ 批量转换失败:', error);
  }
}

// ==================== 示例 9: 使用便捷导出 ====================

async function example9_convenientApi() {
  console.log('\n=== 示例 9: 使用便捷 API ===');
  
  try {
    // 使用 PdfUtils 便捷对象
    const result = await PdfUtils.generateFromText(
      '使用便捷 API 生成的 PDF',
      './output/quick.pdf'
    );
    
    console.log(`✓ 快速生成：${result}`);
    
    const info = await PdfUtils.getInfo(result);
    console.log(`  - 页数：${info.pageCount}, 大小：${(info.fileSize / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('✗ 操作失败:', error);
  }
}

// ==================== 示例 10: 完整工作流 ====================

async function example10_fullWorkflow() {
  console.log('\n=== 示例 10: 完整工作流 ===');
  
  try {
    // 1. 生成报告
    console.log('  步骤 1: 生成报告...');
    const report = await PdfUtils.generateFromText(
      `项目周报\n\n本周完成：\n- 功能开发\n- Bug 修复\n- 文档更新`,
      './output/weekly-report.pdf'
    );
    
    // 2. 生成封面
    console.log('  步骤 2: 生成封面...');
    const cover = await PdfUtils.generateFromText(
      `项目周报\n${new Date().toLocaleDateString('zh-CN')}\n\n机密文件`,
      './output/cover.pdf'
    );
    
    // 3. 合并封面和报告
    console.log('  步骤 3: 合并文档...');
    const merged = await PdfUtils.merge([cover, report], './output/final-report.pdf');
    
    // 4. 生成预览图
    console.log('  步骤 4: 生成预览图...');
    const preview = await PdfUtils.pageToImage(merged, 1, './output/preview.png', {
      scale: 2,
    });
    
    // 5. 获取最终信息
    console.log('  步骤 5: 获取信息...');
    const info = await PdfUtils.getInfo(merged);
    
    console.log('\n✓ 完整工作流完成!');
    console.log(`  - 最终文档：${merged}`);
    console.log(`  - 预览图片：${preview}`);
    console.log(`  - 总页数：${info.pageCount}`);
    console.log(`  - 文件大小：${(info.fileSize / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('✗ 工作流失败:', error);
  }
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('📄 PDF 工具技能使用示例\n');
  console.log('开始运行所有示例...\n');
  
  // 注意：实际运行时，请确保已安装依赖：
  // npm install pdfkit pdf-lib pdf2pic puppeteer
  
  try {
    await example1_generateFromText();
    await example2_generateFromHtml();
    await example3_mergePdfs();
    await example4_splitPdf();
    await example5_extractPages();
    await example6_pdfToImages();
    await example7_singlePageToImage();
    await example8_batchOperations();
    await example9_convenientApi();
    await example10_fullWorkflow();
    
    console.log('\n✅ 所有示例运行完成!');
  } catch (error) {
    console.error('\n❌ 示例运行出错:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

export { runAllExamples };
