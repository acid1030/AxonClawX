/**
 * Path Utils Skill - 路径处理工具集
 * 
 * 功能:
 * 1. 路径解析 (parse)
 * 2. 路径拼接 (join)
 * 3. 路径规范化 (normalize)
 * 
 * @module path-utils-skill
 * @version 1.0.0
 */

import * as path from 'path';

// ============================================================================
// 类型定义
// ============================================================================

export interface ParsedPath {
  /** 根目录 (如: / 或 C:\) */
  root: string;
  /** 目录部分 */
  dir: string;
  /** 文件名 (含扩展名) */
  base: string;
  /** 扩展名 (含 .) */
  ext: string;
  /** 文件名 (不含扩展名) */
  name: string;
  /** 路径段数组 */
  segments: string[];
  /** 是否为绝对路径 */
  isAbsolute: boolean;
  /** 平台 (posix/win32) */
  platform: 'posix' | 'win32';
}

export interface JoinOptions {
  /** 是否自动规范化结果 */
  normalize?: boolean;
  /** 是否解析 ~ 为 home 目录 */
  expandHome?: boolean;
}

export interface NormalizeOptions {
  /** 是否解析相对路径 */
  resolveDot?: boolean;
  /** 是否统一路径分隔符 */
  unifySeparator?: boolean;
  /** 目标平台 (默认当前平台) */
  platform?: 'posix' | 'win32';
}

// ============================================================================
// 核心功能
// ============================================================================

/**
 * 解析路径为结构化对象
 * 
 * @param filePath - 要解析的路径
 * @returns 解析后的路径对象
 * 
 * @example
 * ```typescript
 * const parsed = parsePath('/home/user/docs/file.txt');
 * // {
 * //   root: '/',
 * //   dir: '/home/user/docs',
 * //   base: 'file.txt',
 * //   ext: '.txt',
 * //   name: 'file',
 * //   segments: ['home', 'user', 'docs', 'file.txt'],
 * //   isAbsolute: true,
 * //   platform: 'posix'
 * // }
 * ```
 */
export function parsePath(filePath: string): ParsedPath {
  const normalized = filePath.replace(/\\/g, '/');
  const isWin32 = /^[A-Za-z]:/.test(filePath) || filePath.includes('\\');
  const platform = isWin32 ? 'win32' : 'posix';
  
  const parsed = path.parse(filePath);
  const segments = normalized.split('/').filter(Boolean);
  
  return {
    root: parsed.root,
    dir: parsed.dir,
    base: parsed.base,
    ext: parsed.ext,
    name: parsed.name,
    segments,
    isAbsolute: path.isAbsolute(filePath),
    platform
  };
}

/**
 * 拼接多个路径段
 * 
 * @param segments - 路径段数组
 * @param options - 拼接选项
 * @returns 拼接后的路径
 * 
 * @example
 * ```typescript
 * // 基础用法
 * const result = joinPath('home', 'user', 'docs', 'file.txt');
 * // '/home/user/docs/file.txt' (Unix) 或 'home\user\docs\file.txt' (Windows)
 * 
 * // 带选项
 * const result = joinPath('~', 'projects', 'src', { expandHome: true, normalize: true });
 * // '/Users/nike/projects/src' (解析 ~ 为 home 目录)
 * ```
 */
export function joinPath(
  ...args: Array<string | JoinOptions>
): string {
  const segments = args.filter(arg => typeof arg === 'string') as string[];
  const options = args.find(arg => typeof arg === 'object') as JoinOptions | undefined;
  
  let result = path.join(...segments);
  
  // 展开 ~ 为 home 目录
  if (options?.expandHome && result.startsWith('~')) {
    const home = process.env.HOME || process.env.USERPROFILE || '~';
    result = result.replace('~', home);
  }
  
  // 自动规范化
  if (options?.normalize !== false) {
    result = normalizePath(result);
  }
  
  return result;
}

/**
 * 规范化路径
 * 
 * 功能:
 * - 移除冗余的 . 和 ..
 * - 统一路径分隔符
 * - 移除末尾斜杠 (除非是根目录)
 * 
 * @param filePath - 要规范化的路径
 * @param options - 规范化选项
 * @returns 规范化后的路径
 * 
 * @example
 * ```typescript
 * // 基础用法
 * normalizePath('/home/user/../user/./docs//file.txt');
 * // '/home/user/docs/file.txt'
 * 
 * // 统一分隔符
 * normalizePath('C:\\Users\\nike\\docs', { unifySeparator: true, platform: 'posix' });
 * // 'C:/Users/nike/docs'
 * 
 * // 解析相对路径
 * normalizePath('./src/../lib', { resolveDot: true });
 * // 'lib'
 * ```
 */
export function normalizePath(
  filePath: string,
  options: NormalizeOptions = {}
): string {
  let result = filePath;
  
  // 统一路径分隔符
  if (options.unifySeparator) {
    const targetSeparator = options.platform === 'win32' ? '\\' : '/';
    result = result.replace(/[\\/]/g, targetSeparator);
  }
  
  // 规范化路径 (移除 . 和 ..)
  result = path.normalize(result);
  
  // 解析相对路径
  if (options.resolveDot) {
    result = path.resolve(result);
  }
  
  // 移除末尾斜杠 (根目录除外)
  if (result.length > 1 && (result.endsWith('/') || result.endsWith('\\'))) {
    result = result.slice(0, -1);
  }
  
  return result;
}

// ============================================================================
// 辅助功能
// ============================================================================

/**
 * 获取相对路径
 * 
 * @param from - 起始路径
 * @param to - 目标路径
 * @returns 相对路径
 * 
 * @example
 * ```typescript
 * getRelativePath('/home/user/docs', '/home/user/projects/src');
 * // '../../projects/src'
 * ```
 */
export function getRelativePath(from: string, to: string): string {
  return path.relative(from, to);
}

/**
 * 判断路径是否为绝对路径
 * 
 * @param filePath - 要判断的路径
 * @returns 是否为绝对路径
 * 
 * @example
 * ```typescript
 * isAbsolute('/home/user'); // true
 * isAbsolute('./src');      // false
 * isAbsolute('C:\\Users');  // true (Windows)
 * ```
 */
export function isAbsolute(filePath: string): boolean {
  return path.isAbsolute(filePath);
}

/**
 * 获取路径的扩展名
 * 
 * @param filePath - 文件路径
 * @returns 扩展名 (含 .)
 * 
 * @example
 * ```typescript
 * getExtension('/home/user/file.txt'); // '.txt'
 * getExtension('archive.tar.gz');      // '.gz'
 * ```
 */
export function getExtension(filePath: string): string {
  return path.extname(filePath);
}

/**
 * 获取不带扩展名的文件名
 * 
 * @param filePath - 文件路径
 * @returns 文件名 (不含扩展名)
 * 
 * @example
 * ```typescript
 * getBasename('/home/user/file.txt'); // 'file'
 * ```
 */
export function getBasename(filePath: string): string {
  return path.basename(filePath, path.extname(filePath));
}

/**
 * 获取目录路径
 * 
 * @param filePath - 文件路径
 * @returns 目录路径
 * 
 * @example
 * ```typescript
 * getDirname('/home/user/docs/file.txt'); // '/home/user/docs'
 * ```
 */
export function getDirname(filePath: string): string {
  return path.dirname(filePath);
}

/**
 * 确保路径以分隔符结尾
 * 
 * @param dirPath - 目录路径
 * @param separator - 路径分隔符 (默认当前平台)
 * @returns 以确保分隔符结尾的路径
 * 
 * @example
 * ```typescript
 * ensureTrailingSeparator('/home/user/docs'); // '/home/user/docs/'
 * ```
 */
export function ensureTrailingSeparator(dirPath: string, separator?: string): string {
  const sep = separator || path.sep;
  if (dirPath.endsWith(sep)) {
    return dirPath;
  }
  return dirPath + sep;
}

/**
 * 移除路径末尾的分隔符
 * 
 * @param filePath - 文件路径
 * @returns 移除末尾分隔符后的路径
 * 
 * @example
 * ```typescript
 * removeTrailingSeparator('/home/user/docs/'); // '/home/user/docs'
 * ```
 */
export function removeTrailingSeparator(filePath: string): string {
  const sep = path.sep;
  const altSep = sep === '/' ? '\\' : '/';
  
  while (
    filePath.length > 1 &&
    (filePath.endsWith(sep) || filePath.endsWith(altSep))
  ) {
    filePath = filePath.slice(0, -1);
  }
  
  return filePath;
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 使用示例集合
 * 
 * 运行此函数查看示例输出
 */
export function runExamples(): void {
  console.log('='.repeat(60));
  console.log('Path Utils Skill - 使用示例');
  console.log('='.repeat(60));
  
  // 示例 1: 路径解析
  console.log('\n【示例 1】路径解析');
  const testPath = '/home/user/projects/src/index.ts';
  const parsed = parsePath(testPath);
  console.log(`原始路径：${testPath}`);
  console.log(`根目录：${parsed.root}`);
  console.log(`目录：${parsed.dir}`);
  console.log(`文件名：${parsed.base}`);
  console.log(`扩展名：${parsed.ext}`);
  console.log(`名称：${parsed.name}`);
  console.log(`路径段：${parsed.segments.join(' / ')}`);
  console.log(`绝对路径：${parsed.isAbsolute}`);
  console.log(`平台：${parsed.platform}`);
  
  // 示例 2: 路径拼接
  console.log('\n【示例 2】路径拼接');
  const joined = joinPath('home', 'user', 'projects', 'src');
  console.log(`joinPath('home', 'user', 'projects', 'src')`);
  console.log(`结果：${joined}`);
  
  // 示例 3: 路径规范化
  console.log('\n【示例 3】路径规范化');
  const messyPath = '/home/user/../user/./docs//file.txt';
  const normalized = normalizePath(messyPath);
  console.log(`原始路径：${messyPath}`);
  console.log(`规范化后：${normalized}`);
  
  // 示例 4: 相对路径
  console.log('\n【示例 4】相对路径');
  const from = '/home/user/docs';
  const to = '/home/user/projects/src';
  const relative = getRelativePath(from, to);
  console.log(`从 ${from} 到 ${to}`);
  console.log(`相对路径：${relative}`);
  
  // 示例 5: 辅助功能
  console.log('\n【示例 5】辅助功能');
  console.log(`getExtension('file.txt'): ${getExtension('file.txt')}`);
  console.log(`getBasename('file.txt'): ${getBasename('file.txt')}`);
  console.log(`getDirname('/home/user/file.txt'): ${getDirname('/home/user/file.txt')}`);
  console.log(`isAbsolute('/home/user'): ${isAbsolute('/home/user')}`);
  console.log(`isAbsolute('./src'): ${isAbsolute('./src')}`);
  
  console.log('\n' + '='.repeat(60));
  console.log('示例执行完成');
  console.log('='.repeat(60));
}

// ============================================================================
// 导出
// ============================================================================

export default {
  parsePath,
  joinPath,
  normalizePath,
  getRelativePath,
  isAbsolute,
  getExtension,
  getBasename,
  getDirname,
  ensureTrailingSeparator,
  removeTrailingSeparator,
  runExamples
};
