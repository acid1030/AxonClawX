/**
 * 条形码工具技能 - 使用示例
 * 
 * 运行示例前请安装依赖:
 * ```bash
 * npm install bwip-js barcode-reader sharp node-zbar
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  BarcodeUtils,
  generateBarcode,
  generateBarcodeToFile,
  generateBarcodeSVG,
  batchGenerateBarcodes,
  parseBarcode,
  parseBarcodeSync,
  batchParseBarcodes,
  calculateEAN13Checksum,
  calculateUPCAChecksum,
  validateEAN13,
  validateUPCA,
  ean13ToUPCA,
  upcaToEAN13,
  getSupportedFormats,
  getFormatDescription,
  validateDataForFormat,
  type BarcodeFormat,
  type BarcodeGenerateOptions,
} from './barcode-utils-skill';

// ==================== 示例 1: 基础条形码生成 ====================

export function example1_basicGeneration() {
  console.log('\n=== 示例 1: 基础条形码生成 ===\n');

  // 生成 Code-128 条形码 (默认格式)
  const buffer1 = generateBarcode('Hello World');
  fs.writeFileSync('./examples/barcodes/basic-code128.png', buffer1);
  console.log('✓ 生成 Code-128 条形码: basic-code128.png');

  // 生成 EAN-13 商品条形码
  const buffer2 = generateBarcode('123456789012', { format: 'EAN-13' });
  fs.writeFileSync('./examples/barcodes/ean13-product.png', buffer2);
  console.log('✓ 生成 EAN-13 条形码: ean13-product.png');

  // 生成 QR 二维码
  const buffer3 = generateBarcode('https://example.com', { 
    format: 'QR',
    width: 10,
    height: 10,
  });
  fs.writeFileSync('./examples/barcodes/qr-code.png', buffer3);
  console.log('✓ 生成 QR 二维码: qr-code.png');
}

// ==================== 示例 2: 自定义样式 ====================

export function example2_customStyling() {
  console.log('\n=== 示例 2: 自定义样式 ===\n');

  const options: BarcodeGenerateOptions = {
    format: 'Code-128',
    width: 3,
    height: 80,
    showText: true,
    textLocation: 'bottom',
    fontSize: 14,
    foregroundColor: '0000ff', // 蓝色
    backgroundColor: 'ffff00', // 黄色
    outputFormat: 'png',
    margin: 15,
  };

  const buffer = generateBarcode('Custom Style', options);
  fs.writeFileSync('./examples/barcodes/custom-style.png', buffer);
  console.log('✓ 生成自定义样式条形码: custom-style.png');

  // 生成 SVG 格式
  const svg = generateBarcodeSVG('SVG Barcode', {
    format: 'Code-128',
    width: 2,
    height: 50,
    foregroundColor: '000000',
    backgroundColor: 'ffffff',
  });
  fs.writeFileSync('./examples/barcodes/svg-barcode.svg', svg);
  console.log('✓ 生成 SVG 条形码: svg-barcode.svg');
}

// ==================== 示例 3: 批量生成 ====================

export function example3_batchGeneration() {
  console.log('\n=== 示例 3: 批量生成 ===\n');

  const products = [
    { data: '123456789012', outputPath: './examples/barcodes/product-001.png' },
    { data: '234567890123', outputPath: './examples/barcodes/product-002.png' },
    { data: '345678901234', outputPath: './examples/barcodes/product-003.png' },
    { data: '456789012345', outputPath: './examples/barcodes/product-004.png' },
    { data: '567890123456', outputPath: './examples/barcodes/product-005.png' },
  ];

  const results = batchGenerateBarcodes(products, {
    format: 'EAN-13',
    width: 2,
    height: 60,
  });

  results.forEach((result, index) => {
    if (result.success) {
      console.log(`✓ 产品 ${index + 1} 生成成功: ${result.outputPath}`);
    } else {
      console.log(`✗ 产品 ${index + 1} 生成失败: ${result.error}`);
    }
  });
}

// ==================== 示例 4: 条形码解析 ====================

export function example4_parseBarcode() {
  console.log('\n=== 示例 4: 条形码解析 ===\n');

  // 解析单个条形码
  const result1 = parseBarcode('./examples/barcodes/ean13-product.png');
  if (result1.success) {
    console.log(`✓ 解析成功:`);
    console.log(`  数据：${result1.data}`);
    console.log(`  格式：${result1.format}`);
  } else {
    console.log(`✗ 解析失败: ${result1.error}`);
  }

  // 解析 QR 码
  const result2 = parseBarcode('./examples/barcodes/qr-code.png');
  if (result2.success) {
    console.log(`\n✓ QR 码解析成功:`);
    console.log(`  数据：${result2.data}`);
    console.log(`  格式：${result2.format}`);
  }

  // 批量解析
  const imagePaths = [
    './examples/barcodes/product-001.png',
    './examples/barcodes/product-002.png',
    './examples/barcodes/product-003.png',
  ];

  const results = batchParseBarcodes(imagePaths);
  console.log('\n批量解析结果:');
  results.forEach((result, index) => {
    if (result.success) {
      console.log(`  ${index + 1}. ${result.data} (${result.format})`);
    } else {
      console.log(`  ${index + 1}. 失败: ${result.error}`);
    }
  });
}

// ==================== 示例 5: 校验码计算 ====================

export function example5_checksumCalculation() {
  console.log('\n=== 示例 5: 校验码计算 ===\n');

  // EAN-13 校验码
  const ean13Base = '123456789012';
  const ean13Full = calculateEAN13Checksum(ean13Base);
  console.log(`EAN-13:`);
  console.log(`  基础码：${ean13Base}`);
  console.log(`  完整码：${ean13Full}`);
  console.log(`  验证：${validateEAN13(ean13Full) ? '✓ 有效' : '✗ 无效'}`);

  // UPC-A 校验码
  const upcaBase = '12345678901';
  const upcaFull = calculateUPCAChecksum(upcaBase);
  console.log(`\nUPC-A:`);
  console.log(`  基础码：${upcaBase}`);
  console.log(`  完整码：${upcaFull}`);
  console.log(`  验证：${validateUPCA(upcaFull) ? '✓ 有效' : '✗ 无效'}`);

  // 验证示例
  const testCodes = [
    '1234567890128', // 有效 EAN-13
    '1234567890123', // 无效 EAN-13
    '012345678905',  // 有效 UPC-A
    '012345678901',  // 无效 UPC-A
  ];

  console.log('\n校验码验证:');
  testCodes.forEach(code => {
    const isValidEAN13 = validateEAN13(code);
    const isValidUPCA = validateUPCA(code);
    console.log(`  ${code}: EAN-13=${isValidEAN13 ? '✓' : '✗'}, UPC-A=${isValidUPCA ? '✓' : '✗'}`);
  });
}

// ==================== 示例 6: 格式转换 ====================

export function example6_formatConversion() {
  console.log('\n=== 示例 6: 格式转换 ===\n');

  // EAN-13 转 UPC-A
  const ean13 = '0123456789012';
  const upca = ean13ToUPCA(ean13);
  console.log(`EAN-13 转 UPC-A:`);
  console.log(`  EAN-13: ${ean13}`);
  console.log(`  UPC-A:  ${upca || '无法转换 (EAN-13 不以 0 开头)'}`);

  // UPC-A 转 EAN-13
  const upcaCode = '123456789012';
  const ean13Code = upcaToEAN13(upcaCode);
  console.log(`\nUPC-A 转 EAN-13:`);
  console.log(`  UPC-A:  ${upcaCode}`);
  console.log(`  EAN-13: ${ean13Code}`);
}

// ==================== 示例 7: 格式信息 ====================

export function example7_formatInfo() {
  console.log('\n=== 示例 7: 格式信息 ===\n');

  const formats = getSupportedFormats();
  console.log('支持的条形码格式:');
  formats.forEach(format => {
    const desc = getFormatDescription(format);
    console.log(`  ${format.padEnd(12)} - ${desc}`);
  });

  // 数据验证
  console.log('\n数据格式验证:');
  const testData = [
    { data: '123456789012', format: 'EAN-13' as BarcodeFormat },
    { data: '12345678901', format: 'UPC-A' as BarcodeFormat },
    { data: 'Hello123', format: 'Code-128' as BarcodeFormat },
    { data: 'ABC-123', format: 'Code-39' as BarcodeFormat },
    { data: 'https://example.com', format: 'QR' as BarcodeFormat },
  ];

  testData.forEach(({ data, format }) => {
    const isValid = validateDataForFormat(data, format);
    console.log(`  ${data.padEnd(25)} (${format.padEnd(10)}): ${isValid ? '✓ 有效' : '✗ 无效'}`);
  });
}

// ==================== 示例 8: 实际应用场景 ====================

export function example8_realWorldScenarios() {
  console.log('\n=== 示例 8: 实际应用场景 ===\n');

  // 场景 1: 电商产品条形码
  console.log('场景 1: 电商产品条形码生成');
  const products = [
    { sku: 'PROD-001', ean: '123456789012' },
    { sku: 'PROD-002', ean: '234567890123' },
    { sku: 'PROD-003', ean: '345678901234' },
  ];

  products.forEach(product => {
    generateBarcodeToFile(product.ean, `./examples/barcodes/${product.sku}.png`, {
      format: 'EAN-13',
      showText: true,
    });
    console.log(`  ✓ ${product.sku}: ${product.ean}`);
  });

  // 场景 2: 仓库管理标签
  console.log('\n场景 2: 仓库管理标签 (Code-128)');
  const locations = ['A-01-01', 'A-01-02', 'B-02-01', 'C-03-01'];
  locations.forEach(loc => {
    generateBarcodeToFile(loc, `./examples/barcodes/location-${loc}.png`, {
      format: 'Code-128',
      height: 40,
      showText: true,
    });
    console.log(`  ✓ 库位：${loc}`);
  });

  // 场景 3: 活动门票二维码
  console.log('\n场景 3: 活动门票二维码');
  const ticketData = {
    event: 'Tech Conference 2026',
    date: '2026-06-15',
    seat: 'A-123',
    price: '¥999',
  };
  const ticketJSON = JSON.stringify(ticketData);
  generateBarcodeToFile(ticketJSON, './examples/barcodes/ticket-qr.png', {
    format: 'QR',
    width: 10,
    height: 10,
  });
  console.log(`  ✓ 门票二维码已生成`);

  // 场景 4: 快递单号
  console.log('\n场景 4: 快递单号条形码');
  const trackingNumbers = [
    'SF1234567890',
    'YT9876543210',
    'ZTO5678901234',
  ];
  trackingNumbers.forEach(num => {
    generateBarcodeToFile(num, `./examples/barcodes/tracking-${num}.png`, {
      format: 'Code-128',
      height: 50,
    });
    console.log(`  ✓ 快递：${num}`);
  });
}

// ==================== 运行所有示例 ====================

export async function runAllExamples() {
  console.log('╔════════════════════════════════════════════╗');
  console.log('║     条形码工具技能 - 使用示例              ║');
  console.log('╚════════════════════════════════════════════╝');

  // 确保示例目录存在
  const examplesDir = './examples/barcodes';
  if (!fs.existsSync(examplesDir)) {
    fs.mkdirSync(examplesDir, { recursive: true });
  }

  try {
    example1_basicGeneration();
    example2_customStyling();
    example3_batchGeneration();
    example5_checksumCalculation();
    example6_formatConversion();
    example7_formatInfo();
    example8_realWorldScenarios();
    
    // 解析示例需要等生成完成后执行
    console.log('\n等待条形码生成完成...');
    setTimeout(() => {
      example4_parseBarcode();
      
      console.log('\n╔════════════════════════════════════════════╗');
      console.log('║           所有示例执行完成！               ║');
      console.log('╚════════════════════════════════════════════╝\n');
    }, 1000);
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

// ==================== 独立运行 ====================

if (require.main === module) {
  runAllExamples();
}
