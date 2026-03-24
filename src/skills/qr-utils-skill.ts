/**
 * QR Utils Skill - KAEL
 * 
 * 二维码生成与解析工具
 * 
 * 功能:
 * 1. 二维码生成 - 支持文本、URL、JSON 等数据
 * 2. 二维码解析 - 从图像/文件解析二维码内容
 * 3. 自定义样式 - 颜色、尺寸、容错率、Logo 嵌入
 * 
 * @version 1.0.0
 * @author KAEL (via Axon)
 * @dependencies qrcode, jsqr (需通过 uv pip install 安装)
 */

import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const execAsync = promisify(exec);

// ============================================================================
// 类型定义
// ============================================================================

/**
 * 二维码容错率级别
 */
export type QRErrorCorrectionLevel = 'L' | 'M' | 'Q' | 'H';

/**
 * 二维码生成选项
 */
export interface QRGenerateOptions {
  /** 输出文件路径 (可选，默认生成到临时目录) */
  outputPath?: string;
  /** 二维码尺寸 (像素，默认 256) */
  size?: number;
  /** 容错率级别 (默认 'M') */
  errorCorrection?: QRErrorCorrectionLevel;
  /** 前景色 (默认 '#000000') */
  color?: {
    dark: string;
    light: string;
  };
  /** 边距 (模块数，默认 4) */
  margin?: number;
  /** 是否返回 base64 (默认 false) */
  returnBase64?: boolean;
}

/**
 * 二维码解析结果
 */
export interface QRParseResult {
  /** 解析成功标志 */
  success: boolean;
  /** 解析出的数据 */
  data?: string;
  /** 错误信息 (如果失败) */
  error?: string;
  /** 二维码格式类型 */
  format?: string;
}

// ============================================================================
// 二维码生成器
// ============================================================================

/**
 * 生成二维码 (使用 Python qrcode 库)
 * 
 * @param data 要编码的数据 (文本、URL、JSON 等)
 * @param options 生成选项
 * @returns 输出文件路径或 base64 字符串
 * 
 * @example
 * // 生成简单二维码
 * const path = await generateQR('https://example.com');
 * 
 * @example
 * // 自定义样式
 * const path = await generateQR('Hello World', {
 *   size: 512,
 *   color: { dark: '#6366f1', light: '#ffffff' },
 *   errorCorrection: 'H',
 *   outputPath: './my-qr.png'
 * });
 */
export async function generateQR(
  data: string,
  options: QRGenerateOptions = {}
): Promise<string> {
  const {
    outputPath,
    size = 256,
    errorCorrection = 'M',
    color = { dark: '#000000', light: '#ffffff' },
    margin = 4,
    returnBase64 = false
  } = options;

  // 确保 Python 环境准备就绪
  await ensurePythonDeps();

  // 生成临时文件路径 (如果需要)
  const tempDir = join('/tmp', 'qr-codes');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const finalOutputPath = outputPath || join(tempDir, `qr-${Date.now()}.png`);

  // 创建 Python 脚本
  const pythonScript = `
import qrcode
from qrcode.constants import ERROR_CORRECT_${errorCorrection}
import sys

# 创建二维码对象
qr = qrcode.QRCode(
    version=1,
    error_correction=ERROR_CORRECT_${errorCorrection},
    box_size=${Math.floor(size / 4)},
    border=${margin},
)

# 添加数据
qr.add_data('''${data.replace(/'/g, "\\'")}''')
qr.make(fit=True)

# 创建图像
img = qr.make_image(fill_color="${color.dark}", back_color="${color.light}")

# 保存图像
img.save('${finalOutputPath.replace(/'/g, "\\'")}')

print('SUCCESS')
`.trim();

  // 写入临时 Python 脚本
  const scriptPath = join(tempDir, `generate_${Date.now()}.py`);
  writeFileSync(scriptPath, pythonScript);

  try {
    // 执行 Python 脚本
    const { stdout, stderr } = await execAsync(`uv run python "${scriptPath}"`);
    
    if (stderr && !stderr.includes('WARNING')) {
      throw new Error(`Python script error: ${stderr}`);
    }

    // 如果需要返回 base64
    if (returnBase64) {
      const imageBuffer = readFileSync(finalOutputPath);
      const base64 = imageBuffer.toString('base64');
      return `data:image/png;base64,${base64}`;
    }

    return finalOutputPath;
  } catch (error: any) {
    throw new Error(`QR generation failed: ${error.message}`);
  } finally {
    // 清理临时脚本
    if (existsSync(scriptPath)) {
      try {
        // 不立即删除，便于调试
        // unlinkSync(scriptPath);
      } catch {}
    }
  }
}

/**
 * 生成带 Logo 的二维码
 * 
 * @param data 要编码的数据
 * @param logoPath Logo 图片路径
 * @param options 生成选项
 * @returns 输出文件路径
 * 
 * @example
 * const path = await generateQRWithLogo(
 *   'https://example.com',
 *   './logo.png',
 *   { size: 512, errorCorrection: 'H' }
 * );
 */
export async function generateQRWithLogo(
  data: string,
  logoPath: string,
  options: QRGenerateOptions = {}
): Promise<string> {
  const {
    outputPath,
    size = 512,
    errorCorrection = 'H', // Logo 需要高容错率
    color = { dark: '#000000', light: '#ffffff' },
    margin = 4
  } = options;

  await ensurePythonDeps();

  const tempDir = join('/tmp', 'qr-codes');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const finalOutputPath = outputPath || join(tempDir, `qr-logo-${Date.now()}.png`);

  // 创建 Python 脚本 (带 Logo)
  const pythonScript = `
import qrcode
from qrcode.constants import ERROR_CORRECT_${errorCorrection}
from PIL import Image

# 创建二维码
qr = qrcode.QRCode(
    version=1,
    error_correction=ERROR_CORRECT_${errorCorrection},
    box_size=${Math.floor(size / 4)},
    border=${margin},
)
qr.add_data('''${data.replace(/'/g, "\\'")}''')
qr.make(fit=True)

# 生成二维码图像
qr_img = qr.make_image(fill_color="${color.dark}", back_color="${color.light}").convert('RGB')

# 加载 Logo
logo = Image.open('${logoPath.replace(/'/g, "\\'")}')

# 计算 Logo 尺寸 (二维码的 1/5)
qr_width, qr_height = qr_img.size
logo_size = qr_width // 5
logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

# 计算 Logo 位置 (居中)
logo_pos = ((qr_width - logo_size) // 2, (qr_height - logo_size) // 2)

# 粘贴 Logo
qr_img.paste(logo, logo_pos, logo if logo.mode == 'RGBA' else None)

# 保存
qr_img.save('${finalOutputPath.replace(/'/g, "\\'")}')
print('SUCCESS')
`.trim();

  const scriptPath = join(tempDir, `generate_logo_${Date.now()}.py`);
  writeFileSync(scriptPath, pythonScript);

  try {
    await execAsync(`uv run python "${scriptPath}"`);
    return finalOutputPath;
  } catch (error: any) {
    throw new Error(`QR with logo generation failed: ${error.message}`);
  }
}

/**
 * 批量生成二维码
 * 
 * @param items 数据项数组 [{data, outputPath?}]
 * @param options 通用生成选项
 * @returns 生成的文件路径数组
 * 
 * @example
 * const paths = await generateQRBulk([
 *   { data: 'https://site1.com', outputPath: './qr1.png' },
 *   { data: 'https://site2.com', outputPath: './qr2.png' }
 * ]);
 */
export async function generateQRBulk(
  items: Array<{ data: string; outputPath?: string }>,
  options: QRGenerateOptions = {}
): Promise<string[]> {
  const results: string[] = [];
  
  for (const item of items) {
    const path = await generateQR(item.data, {
      ...options,
      outputPath: item.outputPath
    });
    results.push(path);
  }
  
  return results;
}

// ============================================================================
// 二维码解析器
// ============================================================================

/**
 * 解析二维码图像
 * 
 * @param imagePath 二维码图片路径
 * @returns 解析结果
 * 
 * @example
 * const result = await parseQR('./qr-code.png');
 * if (result.success) {
 *   console.log('二维码内容:', result.data);
 * }
 */
export async function parseQR(imagePath: string): Promise<QRParseResult> {
  if (!existsSync(imagePath)) {
    return {
      success: false,
      error: `Image file not found: ${imagePath}`
    };
  }

  await ensurePythonDeps();

  const tempDir = join('/tmp', 'qr-codes');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  // 创建 Python 解析脚本
  const pythonScript = `
import cv2
import numpy as np
from pyzbar import pyzbar
import json

# 读取图像
img = cv2.imread('${imagePath.replace(/'/g, "\\'")}')
if img is None:
    print(json.dumps({
        'success': False,
        'error': 'Failed to read image'
    }))
    exit(1)

# 转换为灰度图
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# 解码二维码
codes = pyzbar.decode(gray)

if not codes:
    print(json.dumps({
        'success': False,
        'error': 'No QR code found in image'
    }))
    exit(0)

# 提取第一个二维码数据
code = codes[0]
result = {
    'success': True,
    'data': code.data.decode('utf-8'),
    'format': code.type,
    'rect': {
        'left': code.rect.left,
        'top': code.rect.top,
        'width': code.rect.width,
        'height': code.rect.height
    }
}

print(json.dumps(result))
`.trim();

  const scriptPath = join(tempDir, `parse_${Date.now()}.py`);
  writeFileSync(scriptPath, pythonScript);

  try {
    const { stdout } = await execAsync(`uv run python "${scriptPath}"`);
    
    try {
      const result: QRParseResult = JSON.parse(stdout.trim());
      return result;
    } catch {
      return {
        success: false,
        error: `Failed to parse Python output: ${stdout}`
      };
    }
  } catch (error: any) {
    return {
      success: false,
      error: `QR parsing failed: ${error.message}`
    };
  }
}

/**
 * 从 Base64 解析二维码
 * 
 * @param base64Data Base64 编码的图像数据
 * @returns 解析结果
 * 
 * @example
 * const result = await parseQRFromBase64('data:image/png;base64,iVBOR...');
 */
export async function parseQRFromBase64(base64Data: string): Promise<QRParseResult> {
  const tempDir = join('/tmp', 'qr-codes');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const tempPath = join(tempDir, `temp-${Date.now()}.png`);
  
  // 提取 base64 数据 (移除 data:image/png;base64, 前缀)
  const base64Image = base64Data.split(',')[1] || base64Data;
  
  try {
    // 写入临时文件
    const buffer = Buffer.from(base64Image, 'base64');
    writeFileSync(tempPath, buffer);
    
    // 解析
    const result = await parseQR(tempPath);
    
    // 清理临时文件
    try {
      // unlinkSync(tempPath);
    } catch {}
    
    return result;
  } catch (error: any) {
    return {
      success: false,
      error: `Base64 QR parsing failed: ${error.message}`
    };
  }
}

// ============================================================================
// 高级功能
// ============================================================================

/**
 * 生成彩色渐变二维码
 * 
 * @param data 要编码的数据
 * @param colors 渐变色数组 (至少 2 个颜色)
 * @param options 生成选项
 * @returns 输出文件路径
 * 
 * @example
 * const path = await generateGradientQR(
 *   'https://example.com',
 *   ['#6366f1', '#8b5cf6', '#ec4899'],
 *   { size: 512 }
 * );
 */
export async function generateGradientQR(
  data: string,
  colors: string[],
  options: QRGenerateOptions = {}
): Promise<string> {
  const {
    outputPath,
    size = 512,
    errorCorrection = 'H',
    margin = 4
  } = options;

  await ensurePythonDeps();

  const tempDir = join('/tmp', 'qr-codes');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const finalOutputPath = outputPath || join(tempDir, `qr-gradient-${Date.now()}.png`);

  // 创建 Python 渐变脚本
  const colorsStr = JSON.stringify(colors);
  const pythonScript = `
import qrcode
from qrcode.constants import ERROR_CORRECT_${errorCorrection}
from PIL import Image, ImageDraw
import numpy as np

# 创建二维码
qr = qrcode.QRCode(
    version=1,
    error_correction=ERROR_CORRECT_${errorCorrection},
    box_size=${Math.floor(size / 4)},
    border=${margin},
)
qr.add_data('''${data.replace(/'/g, "\\'")}''')
qr.make(fit=True)

# 生成基础图像
qr_img = qr.make_image().convert('RGB')
width, height = qr_img.size

# 创建渐变背景
gradient = Image.new('RGB', (width, height))
draw = ImageDraw.Draw(gradient)

colors = ${colorsStr}
num_colors = len(colors)

for y in range(height):
    # 计算当前行的颜色索引
    ratio = y / height
    color_idx = ratio * (num_colors - 1)
    idx1 = int(color_idx)
    idx2 = min(idx1 + 1, num_colors - 1)
    blend = color_idx - idx1
    
    # 解析颜色
    def hex_to_rgb(hex_color):
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    rgb1 = hex_to_rgb(colors[idx1])
    rgb2 = hex_to_rgb(colors[idx2])
    
    # 混合颜色
    r = int(rgb1[0] * (1 - blend) + rgb2[0] * blend)
    g = int(rgb1[1] * (1 - blend) + rgb2[1] * blend)
    b = int(rgb1[2] * (1 - blend) + rgb2[2] * blend)
    
    draw.line((0, y, width, y), fill=(r, g, b))

# 合并二维码和渐变
qr_pixels = qr_img.load()
gradient_pixels = gradient.load()

for x in range(width):
    for y in range(height):
        if qr_pixels[x, y] == (0, 0, 0):  # 黑色模块
            gradient_pixels[x, y] = gradient_pixels[x, y]
        # 白色模块保持渐变背景

gradient.save('${finalOutputPath.replace(/'/g, "\\'")}')
print('SUCCESS')
`.trim();

  const scriptPath = join(tempDir, `generate_gradient_${Date.now()}.py`);
  writeFileSync(scriptPath, pythonScript);

  try {
    await execAsync(`uv run python "${scriptPath}"`);
    return finalOutputPath;
  } catch (error: any) {
    throw new Error(`Gradient QR generation failed: ${error.message}`);
  }
}

/**
 * 生成 SVG 格式二维码 (矢量图)
 * 
 * @param data 要编码的数据
 * @param options 生成选项
 * @returns SVG 字符串
 * 
 * @example
 * const svg = await generateQRSVG('https://example.com', { size: 512 });
 * writeFileSync('./qr.svg', svg);
 */
export async function generateQRSVG(
  data: string,
  options: QRGenerateOptions = {}
): Promise<string> {
  const {
    size = 512,
    errorCorrection = 'M',
    color = { dark: '#000000', light: '#ffffff' },
    margin = 4
  } = options;

  await ensurePythonDeps();

  const tempDir = join('/tmp', 'qr-codes');
  if (!existsSync(tempDir)) {
    mkdirSync(tempDir, { recursive: true });
  }

  const outputPath = join(tempDir, `qr-${Date.now()}.svg`);

  // 创建 Python SVG 脚本
  const pythonScript = `
import qrcode
from qrcode.constants import ERROR_CORRECT_${errorCorrection}

# 创建二维码
qr = qrcode.QRCode(
    version=1,
    error_correction=ERROR_CORRECT_${errorCorrection},
    box_size=${Math.floor(size / 4)},
    border=${margin},
)
qr.add_data('''${data.replace(/'/g, "\\'")}''')
qr.make(fit=True)

# 生成 SVG
img = qr.make_image(fill_color="${color.dark}", back_color="${color.light}")
img.save('${outputPath.replace(/'/g, "\\'")}')

print('SUCCESS')
`.trim();

  const scriptPath = join(tempDir, `generate_svg_${Date.now()}.py`);
  writeFileSync(scriptPath, pythonScript);

  try {
    await execAsync(`uv run python "${scriptPath}"`);
    return readFileSync(outputPath, 'utf-8');
  } catch (error: any) {
    throw new Error(`SVG QR generation failed: ${error.message}`);
  }
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 确保 Python 依赖已安装
 */
async function ensurePythonDeps(): Promise<void> {
  try {
    // 检查 qrcode 库
    await execAsync('uv run python -c "import qrcode"');
  } catch {
    console.log('Installing qrcode library...');
    await execAsync('uv pip install qrcode[pil]');
  }

  try {
    // 检查 pyzbar 和 opencv
    await execAsync('uv run python -c "import cv2; from pyzbar import pyzbar"');
  } catch {
    console.log('Installing QR parsing libraries...');
    await execAsync('uv pip install opencv-python pyzbar');
  }
}

/**
 * 验证二维码内容 (生成后立即解析验证)
 * 
 * @param data 原始数据
 * @param qrPath 二维码文件路径
 * @returns 验证结果
 */
export async function verifyQR(data: string, qrPath: string): Promise<{ valid: boolean; match: boolean }> {
  const result = await parseQR(qrPath);
  
  return {
    valid: result.success,
    match: result.success && result.data === data
  };
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例代码 (仅供参考，不要直接执行)
 * 
 * @example
 * ```typescript
 * import { 
 *   generateQR, 
 *   generateQRWithLogo, 
 *   parseQR,
 *   generateGradientQR,
 *   generateQRSVG
 * } from './qr-utils-skill';
 * 
 * // 1. 基础生成
 * const qrPath = await generateQR('https://example.com', {
 *   size: 512,
 *   color: { dark: '#6366f1', light: '#ffffff' },
 *   errorCorrection: 'H'
 * });
 * 
 * // 2. 带 Logo
 * const logoQrPath = await generateQRWithLogo(
 *   'https://example.com',
 *   './assets/logo.png',
 *   { size: 512 }
 * );
 * 
 * // 3. 解析二维码
 * const result = await parseQR(qrPath);
 * if (result.success) {
 *   console.log('内容:', result.data);
 * }
 * 
 * // 4. 渐变二维码
 * const gradientPath = await generateGradientQR(
 *   'Hello World',
 *   ['#6366f1', '#8b5cf6', '#ec4899']
 * );
 * 
 * // 5. SVG 矢量图
 * const svg = await generateQRSVG('https://example.com');
 * 
 * // 6. 批量生成
 * const paths = await generateQRBulk([
 *   { data: 'https://site1.com' },
 *   { data: 'https://site2.com' }
 * ]);
 * ```
 */

// ============================================================================
// 导出
// ============================================================================

export default {
  generateQR,
  generateQRWithLogo,
  generateQRBulk,
  parseQR,
  parseQRFromBase64,
  generateGradientQR,
  generateQRSVG,
  verifyQR
};
