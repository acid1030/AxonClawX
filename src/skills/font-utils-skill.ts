/**
 * 字体工具技能 - Font Utilities Skill
 * 
 * 功能:
 * 1. 字体加载 - 从文件系统或 URL 加载字体文件
 * 2. 字体转换 - 在不同字体格式间转换 (TTF, OTF, WOFF, WOFF2)
 * 3. 字体子集 - 提取字体中的特定字符子集，减小文件大小
 * 
 * 依赖:
 * - fontkit: 字体解析和处理
 * - opentype.js: 字体解析和子集生成
 * - 安装：uv pip install fonttools brotli
 * 
 * 使用方式:
 * ```typescript
 * import { loadFont, convertFont, createSubset } from './font-utils-skill';
 * 
 * // 加载字体
 * const font = await loadFont('./fonts/myfont.ttf');
 * 
 * // 转换格式
 * await convertFont('./input.ttf', './output.woff2');
 * 
 * // 创建子集
 * await createSubset('./input.ttf', './subset.ttf', '你好世界 ABC');
 * ```
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// ==================== 类型定义 ====================

export interface FontInfo {
  family: string;
  subfamily: string;
  fullName: string;
  version: string;
  postscriptName: string;
  unitsPerEm: number;
  glyphCount: number;
  boundingBox: {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
  };
  hasColor: boolean;
  isFixedPitch: boolean;
}

export interface FontConversionOptions {
  quality?: 'low' | 'medium' | 'high';
  compress?: boolean;
  keepMetadata?: boolean;
}

export interface SubsetOptions {
  characters?: string;
  characterFile?: string;
  preserveKerning?: boolean;
  optimize?: boolean;
}

export interface FontLoadOptions {
  skipValidation?: boolean;
  loadGlyphs?: boolean;
}

// ==================== 字体加载 ====================

/**
 * 加载字体文件并返回字体信息
 * 
 * @param fontPath - 字体文件路径 (支持 TTF, OTF, WOFF, WOFF2)
 * @param options - 加载选项
 * @returns 字体信息对象
 * 
 * @example
 * ```typescript
 * const fontInfo = await loadFont('./fonts/Roboto-Regular.ttf');
 * console.log(`字体家族：${fontInfo.family}`);
 * console.log(`字形数量：${fontInfo.glyphCount}`);
 * ```
 */
export async function loadFont(
  fontPath: string,
  options: FontLoadOptions = {}
): Promise<FontInfo> {
  const absolutePath = path.resolve(fontPath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`字体文件不存在：${absolutePath}`);
  }
  
  const ext = path.extname(absolutePath).toLowerCase();
  const supportedFormats = ['.ttf', '.otf', '.woff', '.woff2'];
  
  if (!supportedFormats.includes(ext)) {
    throw new Error(`不支持的字体格式：${ext}。支持的格式：${supportedFormats.join(', ')}`);
  }
  
  try {
    // 使用 Python fonttools 获取字体信息
    const pythonScript = `
import sys
from fontTools.ttLib import TTFont

try:
    font = TTFont("${absolutePath.replace(/\\/g, '\\\\')}")
    name_table = font['name']
    
    def get_name(name_id):
        for record in name_table.names:
            if record.nameID == name_id:
                try:
                    return record.toUnicode()
                except:
                    return record.string.decode('utf-8', errors='ignore')
        return ""
    
    head = font['head']
    hhea = font.get('hhea', {})
    maxp = font.get('maxp', {})
    
    info = {
        "family": get_name(1),
        "subfamily": get_name(2),
        "fullName": get_name(4),
        "version": get_name(5),
        "postscriptName": get_name(6),
        "unitsPerEm": head.unitsPerEm,
        "glyphCount": maxp.numGlyphs if hasattr(maxp, 'numGlyphs') else 0,
        "boundingBox": {
            "xMin": head.xMin,
            "yMin": head.yMin,
            "xMax": head.xMax,
            "yMax": head.yMax
        },
        "hasColor": 'CBDT' in font or 'sbix' in font or 'COLR' in font,
        "isFixedPitch": head.isFixedPitch != 0
    }
    
    import json
    print(json.dumps(info, ensure_ascii=False))
    
    font.close()
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
    
    const result = execSync(`uv run python -c "${pythonScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const output = result.trim();
    
    if (output.startsWith('ERROR:')) {
      throw new Error(output.replace('ERROR: ', ''));
    }
    
    const fontInfo: FontInfo = JSON.parse(output);
    
    return fontInfo;
  } catch (error: any) {
    if (error.message.includes('fontTools')) {
      throw new Error(
        '缺少依赖：fonttools。请运行：uv pip install fonttools\n' +
        '然后重试。'
      );
    }
    throw error;
  }
}

/**
 * 从 URL 加载字体文件
 * 
 * @param url - 字体文件 URL
 * @param outputPath - 本地保存路径 (可选)
 * @returns 本地字体文件路径
 * 
 * @example
 * ```typescript
 * const localPath = await loadFontFromUrl(
 *   'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5WZK.woff2',
 *   './downloads/roboto.woff2'
 * );
 * ```
 */
export async function loadFontFromUrl(
  url: string,
  outputPath?: string
): Promise<string> {
  const { execSync } = await import('child_process');
  
  if (!outputPath) {
    const urlParts = url.split('/');
    const filename = urlParts[urlParts.length - 1] || 'font';
    outputPath = path.join(process.cwd(), 'downloads', filename);
  }
  
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    execSync(`curl -L -o "${outputPath}" "${url}"`, {
      stdio: 'pipe'
    });
    
    if (!fs.existsSync(outputPath)) {
      throw new Error('下载失败：文件未创建');
    }
    
    const stats = fs.statSync(outputPath);
    if (stats.size === 0) {
      throw new Error('下载失败：文件大小为 0');
    }
    
    return outputPath;
  } catch (error: any) {
    throw new Error(`从 URL 加载字体失败：${error.message}`);
  }
}

// ==================== 字体转换 ====================

/**
 * 在不同字体格式间转换
 * 
 * @param inputPath - 输入字体文件路径
 * @param outputPath - 输出字体文件路径
 * @param options - 转换选项
 * 
 * @example
 * ```typescript
 * // TTF 转 WOFF2
 * await convertFont('./input.ttf', './output.woff2', { quality: 'high', compress: true });
 * 
 * // OTF 转 TTF
 * await convertFont('./input.otf', './output.ttf');
 * ```
 */
export async function convertFont(
  inputPath: string,
  outputPath: string,
  options: FontConversionOptions = {}
): Promise<void> {
  const absoluteInput = path.resolve(inputPath);
  const absoluteOutput = path.resolve(outputPath);
  
  if (!fs.existsSync(absoluteInput)) {
    throw new Error(`输入文件不存在：${absoluteInput}`);
  }
  
  const inputExt = path.extname(absoluteInput).toLowerCase();
  const outputExt = path.extname(absoluteOutput).toLowerCase();
  
  const outputDir = path.dirname(absoluteOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    // 使用 fonttools 进行转换
    const pythonScript = `
import sys
from fontTools.ttLib import TTFont
from fontTools import subset
import os

input_path = "${absoluteInput.replace(/\\/g, '\\\\')}"
output_path = "${absoluteOutput.replace(/\\/g, '\\\\')}"
output_ext = "${outputExt}"

try:
    # 加载字体
    font = TTFont(input_path)
    
    # 根据输出格式调整
    if output_ext == '.woff':
        font.flavor = 'woff'
    elif output_ext == '.woff2':
        try:
            font.flavor = 'woff2'
        except:
            # 如果 woff2 不支持，使用 brotli 压缩
            pass
    elif output_ext == '.ttf':
        font.flavor = None
    elif output_ext == '.otf':
        # OTF 需要特殊处理
        pass
    
    # 保存
    font.save(output_path)
    font.close()
    
    print(f"转换成功：{input_path} -> {output_path}")
    
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
    
    execSync(`uv run python -c "${pythonScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    
    if (!fs.existsSync(absoluteOutput)) {
      throw new Error('转换失败：输出文件未创建');
    }
    
    const inputSize = fs.statSync(absoluteInput).size;
    const outputSize = fs.statSync(absoluteOutput).size;
    const reduction = ((inputSize - outputSize) / inputSize * 100).toFixed(1);
    
    console.log(`✓ 字体转换完成`);
    console.log(`  输入：${inputSize.toLocaleString()} bytes`);
    console.log(`  输出：${outputSize.toLocaleString()} bytes`);
    console.log(`  压缩率：${reduction}%`);
    
  } catch (error: any) {
    if (error.message.includes('fontTools')) {
      throw new Error(
        '缺少依赖：fonttools。请运行：uv pip install fonttools\n' +
        '然后重试。'
      );
    }
    throw new Error(`字体转换失败：${error.message}`);
  }
}

/**
 * 批量转换字体格式
 * 
 * @param inputPath - 输入字体文件路径
 * @param outputDir - 输出目录
 * @param formats - 目标格式数组 (例如：['woff', 'woff2'])
 * 
 * @example
 * ```typescript
 * await batchConvert('./fonts/myfont.ttf', './output', ['woff', 'woff2']);
 * // 输出：
 * // - ./output/myfont.woff
 * // - ./output/myfont.woff2
 * ```
 */
export async function batchConvert(
  inputPath: string,
  outputDir: string,
  formats: string[] = ['woff', 'woff2']
): Promise<string[]> {
  const outputPaths: string[] = [];
  const baseName = path.basename(inputPath, path.extname(inputPath));
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  for (const format of formats) {
    const ext = format.startsWith('.') ? format : `.${format}`;
    const outputPath = path.join(outputDir, `${baseName}${ext}`);
    
    await convertFont(inputPath, outputPath);
    outputPaths.push(outputPath);
  }
  
  return outputPaths;
}

// ==================== 字体子集 ====================

/**
 * 创建字体子集 (提取特定字符)
 * 
 * @param inputPath - 输入字体文件路径
 * @param outputPath - 输出字体文件路径
 * @param options - 子集选项
 * @returns 子集信息
 * 
 * @example
 * ```typescript
 * // 提取中文字符
 * await createSubset('./fonts/full.ttf', './fonts/chinese-subset.ttf', {
 *   characters: '你好世界欢迎使用',
 *   optimize: true
 * });
 * 
 * // 从文件读取字符列表
 * await createSubset('./fonts/full.ttf', './fonts/subset.ttf', {
 *   characterFile: './chars.txt',
 *   preserveKerning: true
 * });
 * ```
 */
export async function createSubset(
  inputPath: string,
  outputPath: string,
  options: SubsetOptions = {}
): Promise<{
  originalSize: number;
  subsetSize: number;
  reduction: number;
  characterCount: number;
}> {
  const absoluteInput = path.resolve(inputPath);
  const absoluteOutput = path.resolve(outputPath);
  
  if (!fs.existsSync(absoluteInput)) {
    throw new Error(`输入文件不存在：${absoluteInput}`);
  }
  
  let characters = options.characters || '';
  
  if (options.characterFile) {
    const charFile = path.resolve(options.characterFile);
    if (!fs.existsSync(charFile)) {
      throw new Error(`字符文件不存在：${charFile}`);
    }
    characters = fs.readFileSync(charFile, 'utf-8');
  }
  
  if (!characters) {
    throw new Error('必须提供 characters 或 characterFile 参数');
  }
  
  const outputDir = path.dirname(absoluteOutput);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  try {
    const originalSize = fs.statSync(absoluteInput).size;
    
    // 使用 fonttools subset 创建子集
    const charsHex = Array.from(characters)
      .map(c => c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0'))
      .join(',');
    
    const subsetArgs = [
      `pyftsubset "${absoluteInput}"`,
      `--output-file="${absoluteOutput}"`,
      `--unicodes=${charsHex}`,
      '--layout-features=*',
      options.preserveKerning ? '--kerning' : '--no-kerning',
      options.optimize ? '--optimize' : '',
      '--name-IDs=*',
      '--name-legacy'
    ].filter(Boolean).join(' ');
    
    execSync(`uv run ${subsetArgs}`, {
      encoding: 'utf-8',
      stdio: 'inherit'
    });
    
    if (!fs.existsSync(absoluteOutput)) {
      throw new Error('子集创建失败：输出文件未创建');
    }
    
    const subsetSize = fs.statSync(absoluteOutput).size;
    const reduction = ((originalSize - subsetSize) / originalSize * 100).toFixed(1);
    
    console.log(`✓ 字体子集创建完成`);
    console.log(`  原始大小：${originalSize.toLocaleString()} bytes`);
    console.log(`  子集大小：${subsetSize.toLocaleString()} bytes`);
    console.log(`  压缩率：${reduction}%`);
    console.log(`  字符数量：${characters.length}`);
    
    return {
      originalSize,
      subsetSize,
      reduction: parseFloat(reduction),
      characterCount: characters.length
    };
    
  } catch (error: any) {
    if (error.message.includes('pyftsubset') || error.message.includes('fontTools')) {
      throw new Error(
        '缺少依赖：fonttools。请运行：uv pip install fonttools\n' +
        '然后重试。'
      );
    }
    throw new Error(`字体子集创建失败：${error.message}`);
  }
}

/**
 * 为网页创建优化的字体子集
 * 
 * 自动提取常用字符并生成 WOFF2 格式
 * 
 * @param inputPath - 输入字体文件路径
 * @param outputDir - 输出目录
 * @param language - 目标语言 ('zh' | 'en' | 'ja' | 'ko')
 * 
 * @example
 * ```typescript
 * // 为中文字符创建优化子集
 * await createWebOptimizedSubset('./fonts/full.ttf', './web/fonts', 'zh');
 * ```
 */
export async function createWebOptimizedSubset(
  inputPath: string,
  outputDir: string,
  language: 'zh' | 'en' | 'ja' | 'ko' = 'en'
): Promise<string> {
  // 常用字符集
  const charSets: Record<string, string> = {
    en: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ,.!?;:\'"()-',
    zh: '的是一不了人在有中到大这为主生国以会经要时到用后而然家么她他个们多中上国大',
    ja: '一丁七万丈三上下不与丐丑专且世丘丙业丛东丝丢两严丧个中丰串临丸丹为主丽举',
    ko: '가각간갈감갑값갓갔강갖같갚갗개객갠갤갬갭갯갰갱갸걀걍걔거걱건걸검겁것겄겅겉게'
  };
  
  const baseName = path.basename(inputPath, path.extname(inputPath));
  const outputPath = path.join(outputDir, `${baseName}.${language}.woff2`);
  
  await createSubset(inputPath, outputPath, {
    characters: charSets[language],
    optimize: true
  });
  
  return outputPath;
}

/**
 * 分析字体支持的字符范围
 * 
 * @param fontPath - 字体文件路径
 * @returns 字符范围信息
 * 
 * @example
 * ```typescript
 * const ranges = await analyzeFontRanges('./fonts/myfont.ttf');
 * console.log('支持的 Unicode 范围:', ranges);
 * ```
 */
export async function analyzeFontRanges(fontPath: string): Promise<{
  totalGlyphs: number;
  unicodeRanges: string[];
  scripts: string[];
  hasChinese: boolean;
  hasJapanese: boolean;
  hasKorean: boolean;
  hasEmoji: boolean;
}> {
  const absolutePath = path.resolve(fontPath);
  
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`字体文件不存在：${absolutePath}`);
  }
  
  try {
    const pythonScript = `
import sys
from fontTools.ttLib import TTFont
from fontTools.unicode import Unicode

font_path = "${absolutePath.replace(/\\/g, '\\\\')}"

try:
    font = TTFont(font_path)
    cmap = font.get('cmap')
    
    if not cmap:
        print("ERROR: 无 cmap 表")
        sys.exit(1)
    
    unicode_points = set()
    for table in cmap.tables:
        if table.format in [2, 4, 6, 12]:
            unicode_points.update(table.cmap.keys())
    
    # 分析字符范围
    ranges = set()
    scripts = set()
    has_cjk = False
    has_emoji = False
    
    for code in unicode_points:
        # Unicode 范围
        if 0x4E00 <= code <= 0x9FFF:
            ranges.add('CJK Unified Ideographs')
            has_cjk = True
        elif 0x3040 <= code <= 0x309F:
            ranges.add('Hiragana')
        elif 0x30A0 <= code <= 0x30FF:
            ranges.add('Katakana')
        elif 0xAC00 <= code <= 0xD7AF:
            ranges.add('Hangul Syllables')
        elif 0x1F600 <= code <= 0x1F64F:
            ranges.add('Emoticons')
            has_emoji = True
        elif 0x1F300 <= code <= 0x1F5FF:
            ranges.add('Misc Symbols and Pictographs')
            has_emoji = True
        elif 0x0000 <= code <= 0x007F:
            ranges.add('Basic Latin')
        elif 0x0080 <= code <= 0x00FF:
            ranges.add('Latin-1 Supplement')
        elif 0x0100 <= code <= 0x017F:
            ranges.add('Latin Extended-A')
        elif 0x0180 <= code <= 0x024F:
            ranges.add('Latin Extended-B')
        elif 0x0370 <= code <= 0x03FF:
            ranges.add('Greek and Coptic')
        elif 0x0400 <= code <= 0x04FF:
            ranges.add('Cyrillic')
        elif 0x0600 <= code <= 0x06FF:
            ranges.add('Arabic')
        elif 0x3000 <= code <= 0x303F:
            ranges.add('CJK Symbols and Punctuation')
        else:
            ranges.add(f'Other (U+{code:04X})')
    
    result = {
        "totalGlyphs": len(unicode_points),
        "unicodeRanges": sorted(list(ranges)),
        "hasChinese": has_cjk,
        "hasJapanese": has_cjk,  # 简化判断
        "hasKorean": has_cjk,    # 简化判断
        "hasEmoji": has_emoji
    }
    
    import json
    print(json.dumps(result, ensure_ascii=False))
    
    font.close()
except Exception as e:
    print(f"ERROR: {str(e)}", file=sys.stderr)
    sys.exit(1)
`;
    
    const result = execSync(`uv run python -c "${pythonScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8'
    });
    
    const output = result.trim();
    
    if (output.startsWith('ERROR:')) {
      throw new Error(output.replace('ERROR: ', ''));
    }
    
    return JSON.parse(output);
  } catch (error: any) {
    if (error.message.includes('fontTools')) {
      throw new Error(
        '缺少依赖：fonttools。请运行：uv pip install fonttools\n' +
        '然后重试。'
      );
    }
    throw error;
  }
}

// ==================== 工具函数 ====================

/**
 * 获取字体文件信息 (快速)
 * 
 * @param fontPath - 字体文件路径
 * @returns 基本文件信息
 */
export function getFontFileInfo(fontPath: string): {
  path: string;
  size: number;
  format: string;
  modified: Date;
} {
  const absolutePath = path.resolve(fontPath);
  const stats = fs.statSync(absolutePath);
  const ext = path.extname(absolutePath).toLowerCase();
  
  const formatMap: Record<string, string> = {
    '.ttf': 'TrueType',
    '.otf': 'OpenType',
    '.woff': 'WOFF',
    '.woff2': 'WOFF2'
  };
  
  return {
    path: absolutePath,
    size: stats.size,
    format: formatMap[ext] || 'Unknown',
    modified: stats.mtime
  };
}

/**
 * 验证字体文件完整性
 * 
 * @param fontPath - 字体文件路径
 * @returns 验证结果
 */
export async function validateFont(fontPath: string): Promise<{
  valid: boolean;
  errors: string[];
  warnings: string[];
}> {
  const absolutePath = path.resolve(fontPath);
  
  if (!fs.existsSync(absolutePath)) {
    return {
      valid: false,
      errors: ['文件不存在'],
      warnings: []
    };
  }
  
  try {
    const pythonScript = `
import sys
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

font_path = "${absolutePath.replace(/\\/g, '\\\\')}"
errors = []
warnings = []

try:
    font = TTFont(font_path)
    
    # 检查必要表
    required_tables = ['cmap', 'head', 'hhea', 'maxp', 'name', 'OS/2', 'post']
    for table in required_tables:
        if table not in font:
            errors.append(f"缺少必要表：{table}")
    
    # 检查 cmap
    if 'cmap' in font:
        cmap = font['cmap']
        has_unicode = False
        for table in cmap.tables:
            if table.platformID == 3 and table.platEncID == 1:
                has_unicode = True
                break
        if not has_unicode:
            warnings.append("缺少 Unicode cmap")
    
    # 检查字形数量
    if 'maxp' in font:
        num_glyphs = font['maxp'].numGlyphs
        if num_glyphs == 0:
            errors.append("字形数量为 0")
        elif num_glyphs < 10:
            warnings.append(f"字形数量过少：{num_glyphs}")
    
    # 检查名称表
    if 'name' in font:
        name_table = font['name']
        if len(name_table.names) == 0:
            warnings.append("名称表为空")
    
    font.close()
    
    result = {
        "valid": len(errors) == 0,
        "errors": errors,
        "warnings": warnings
    }
    
    import json
    print(json.dumps(result, ensure_ascii=False))
    
except Exception as e:
    result = {
        "valid": False,
        "errors": [str(e)],
        "warnings": []
    }
    import json
    print(json.dumps(result, ensure_ascii=False))
`;
    
    const result = execSync(`uv run python -c "${pythonScript.replace(/"/g, '\\"')}"`, {
      encoding: 'utf-8'
    });
    
    return JSON.parse(result.trim());
  } catch (error: any) {
    return {
      valid: false,
      errors: [error.message],
      warnings: []
    };
  }
}

// ==================== 导出 ====================

export default {
  loadFont,
  loadFontFromUrl,
  convertFont,
  batchConvert,
  createSubset,
  createWebOptimizedSubset,
  analyzeFontRanges,
  getFontFileInfo,
  validateFont
};
