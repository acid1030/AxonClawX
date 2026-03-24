/**
 * Sitemap Utils Skill - KAEL Engineering
 * 
 * 功能:
 * 1. Sitemap XML 生成
 * 2. Sitemap 索引
 * 3. 自动验证
 * 
 * @module sitemap-utils
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// ============== 类型定义 ==============

export interface SitemapUrlEntry {
  loc: string;
  lastmod?: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface SitemapIndexEntry {
  loc: string;
  lastmod?: string;
}

export interface SitemapConfig {
  baseUrl: string;
  outputDir: string;
  filename?: string;
  maxUrlsPerFile?: number; // 默认 50000 (sitemap 协议上限)
}

// ============== 工具函数 ==============

/**
 * 验证 URL 格式
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证 priority 值 (0.0 - 1.0)
 */
function isValidPriority(priority: number): boolean {
  return priority >= 0 && priority <= 1;
}

/**
 * 格式化日期为 ISO 8601
 */
function formatDate(date: Date | string): string {
  if (typeof date === 'string') {
    return date;
  }
  return date.toISOString().split('T')[0];
}

/**
 * 转义 XML 特殊字符
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ============== 核心功能 ==============

/**
 * 生成单个 Sitemap XML 文件
 * 
 * @param urls - URL 条目数组
 * @param config - 配置
 * @returns 生成的文件路径
 */
export function generateSitemap(
  urls: SitemapUrlEntry[],
  config: SitemapConfig
): string {
  // 验证配置
  if (!isValidUrl(config.baseUrl)) {
    throw new Error(`Invalid baseUrl: ${config.baseUrl}`);
  }

  const maxUrls = config.maxUrlsPerFile || 50000;
  if (urls.length > maxUrls) {
    throw new Error(
      `Too many URLs: ${urls.length} exceeds limit of ${maxUrls}. Use generateSitemapIndex instead.`
    );
  }

  // 构建 XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const url of urls) {
    // 验证 URL
    const fullUrl = url.loc.startsWith('http') ? url.loc : `${config.baseUrl}${url.loc}`;
    if (!isValidUrl(fullUrl)) {
      console.warn(`Skipping invalid URL: ${url.loc}`);
      continue;
    }

    xml += '  <url>\n';
    xml += `    <loc>${escapeXml(fullUrl)}</loc>\n`;

    if (url.lastmod) {
      xml += `    <lastmod>${formatDate(url.lastmod)}</lastmod>\n`;
    }

    if (url.changefreq) {
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
    }

    if (url.priority !== undefined) {
      if (!isValidPriority(url.priority)) {
        console.warn(`Invalid priority ${url.priority} for ${url.loc}, skipping`);
      } else {
        xml += `    <priority>${url.priority.toFixed(1)}</priority>\n`;
      }
    }

    xml += '  </url>\n';
  }

  xml += '</urlset>\n';

  // 确保输出目录存在
  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
  }

  // 写入文件
  const filename = config.filename || 'sitemap.xml';
  const filePath = join(config.outputDir, filename);
  writeFileSync(filePath, xml, 'utf-8');

  console.log(`✅ Sitemap generated: ${filePath} (${urls.length} URLs)`);
  return filePath;
}

/**
 * 生成 Sitemap 索引文件
 * 
 * 当 URL 数量超过 50000 时使用
 * 
 * @param sitemapUrls - 各个 sitemap 文件的 URL 列表
 * @param config - 配置
 * @returns 生成的索引文件路径
 */
export function generateSitemapIndex(
  sitemapUrls: string[],
  config: SitemapConfig
): string {
  if (sitemapUrls.length === 0) {
    throw new Error('No sitemap URLs provided');
  }

  // 构建 XML
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

  for (const sitemapUrl of sitemapUrls) {
    const fullUrl = sitemapUrl.startsWith('http') ? sitemapUrl : `${config.baseUrl}/${sitemapUrl}`;
    
    xml += '  <sitemap>\n';
    xml += `    <loc>${escapeXml(fullUrl)}</loc>\n`;
    xml += `    <lastmod>${formatDate(new Date())}</lastmod>\n`;
    xml += '  </sitemap>\n';
  }

  xml += '</sitemapindex>\n';

  // 确保输出目录存在
  if (!existsSync(config.outputDir)) {
    mkdirSync(config.outputDir, { recursive: true });
  }

  // 写入索引文件
  const filePath = join(config.outputDir, 'sitemap-index.xml');
  writeFileSync(filePath, xml, 'utf-8');

  console.log(`✅ Sitemap index generated: ${filePath} (${sitemapUrls.length} sitemaps)`);
  return filePath;
}

/**
 * 批量生成多个 Sitemap 文件 + 索引
 * 
 * @param allUrls - 所有 URL
 * @param config - 配置
 * @returns 生成的文件路径列表
 */
export function generateSitemapBatch(
  allUrls: SitemapUrlEntry[],
  config: SitemapConfig
): { indexFile: string; sitemapFiles: string[] } {
  const maxUrls = config.maxUrlsPerFile || 50000;
  const sitemapFiles: string[] = [];

  // 分割 URL 数组
  const chunks: SitemapUrlEntry[][] = [];
  for (let i = 0; i < allUrls.length; i += maxUrls) {
    chunks.push(allUrls.slice(i, i + maxUrls));
  }

  // 生成每个 sitemap 文件
  chunks.forEach((chunk, index) => {
    const filename = `sitemap-${index + 1}.xml`;
    const filePath = generateSitemap(chunk, { ...config, filename });
    sitemapFiles.push(filename);
  });

  // 生成索引文件
  const indexFile = generateSitemapIndex(sitemapFiles, config);

  return { indexFile, sitemapFiles };
}

/**
 * 验证 Sitemap 文件
 * 
 * @param filePath - sitemap 文件路径
 * @returns 验证结果
 */
export function validateSitemap(filePath: string): {
  valid: boolean;
  errors: string[];
  warnings: string[];
  urlCount: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  let urlCount = 0;

  try {
    const { readFileSync } = require('fs');
    const content = readFileSync(filePath, 'utf-8');

    // 检查 XML 声明
    if (!content.startsWith('<?xml')) {
      errors.push('Missing XML declaration');
    }

    // 检查命名空间
    if (!content.includes('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')) {
      errors.push('Missing or incorrect sitemap namespace');
    }

    // 检查是否包含 urlset 或 sitemapindex
    const isIndex = content.includes('<sitemapindex');
    const isUrlset = content.includes('<urlset');

    if (!isIndex && !isUrlset) {
      errors.push('Missing urlset or sitemapindex root element');
    }

    // 统计 URL 数量
    const urlMatches = content.match(/<loc>/g);
    urlCount = urlMatches ? urlMatches.length : 0;

    if (isUrlset && urlCount > 50000) {
      errors.push(`Too many URLs: ${urlCount} (max 50000)`);
    }

    // 检查 URL 格式
    const locMatches = content.match(/<loc>([^<]+)<\/loc>/g) || [];
    locMatches.forEach((match, idx) => {
      const url = match.replace(/<\/?loc>/g, '');
      if (!isValidUrl(url)) {
        warnings.push(`Invalid URL at position ${idx + 1}: ${url}`);
      }
    });

    // 检查 priority 值
    const priorityMatches = content.match(/<priority>([^<]+)<\/priority>/g) || [];
    priorityMatches.forEach((match) => {
      const priority = parseFloat(match.replace(/<\/?priority>/g, ''));
      if (!isValidPriority(priority)) {
        errors.push(`Invalid priority value: ${priority}`);
      }
    });

    const valid = errors.length === 0;

    if (valid) {
      console.log(`✅ Sitemap validation passed: ${urlCount} URLs`);
    } else {
      console.error(`❌ Sitemap validation failed: ${errors.join('; ')}`);
    }

    return { valid, errors, warnings, urlCount };
  } catch (error: any) {
    errors.push(`File read error: ${error.message}`);
    return { valid: false, errors, warnings: [], urlCount: 0 };
  }
}

/**
 * 从网站路径生成 URL 列表 (辅助函数)
 */
export function createUrlEntries(
  paths: string[],
  options: {
    changefreq?: SitemapUrlEntry['changefreq'];
    priority?: number;
    lastmod?: Date | string;
  } = {}
): SitemapUrlEntry[] {
  return paths.map((path) => ({
    loc: path,
    changefreq: options.changefreq || 'weekly',
    priority: options.priority ?? 0.5,
    lastmod: options.lastmod ? formatDate(options.lastmod) : undefined,
  }));
}

// ============== 使用示例 ==============

/**
 * 使用示例 1: 基础用法
 */
export function exampleBasic() {
  const urls: SitemapUrlEntry[] = [
    { loc: '/', priority: 1.0, changefreq: 'daily' },
    { loc: '/about', priority: 0.8, changefreq: 'monthly' },
    { loc: '/products', priority: 0.9, changefreq: 'weekly' },
    { loc: '/contact', priority: 0.7, changefreq: 'monthly' },
  ];

  const config: SitemapConfig = {
    baseUrl: 'https://example.com',
    outputDir: './public',
  };

  generateSitemap(urls, config);
}

/**
 * 使用示例 2: 批量生成 (大量 URL)
 */
export function exampleBatch() {
  const allUrls: SitemapUrlEntry[] = [];
  
  // 模拟 100000 个产品页面
  for (let i = 1; i <= 100000; i++) {
    allUrls.push({
      loc: `/product/${i}`,
      priority: 0.6,
      changefreq: 'weekly',
      lastmod: new Date(),
    });
  }

  const config: SitemapConfig = {
    baseUrl: 'https://shop.example.com',
    outputDir: './public/sitemaps',
    maxUrlsPerFile: 50000,
  };

  const { indexFile, sitemapFiles } = generateSitemapBatch(allUrls, config);
  console.log(`Generated ${sitemapFiles.length} sitemap files`);
  console.log(`Index file: ${indexFile}`);
}

/**
 * 使用示例 3: 验证 sitemap
 */
export function exampleValidate() {
  const result = validateSitemap('./public/sitemap.xml');
  
  if (result.valid) {
    console.log(`✅ Valid sitemap with ${result.urlCount} URLs`);
  } else {
    console.error('❌ Validation errors:', result.errors);
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️ Warnings:', result.warnings);
  }
}

// ============== 导出 ==============

export default {
  generateSitemap,
  generateSitemapIndex,
  generateSitemapBatch,
  validateSitemap,
  createUrlEntries,
  // 工具函数
  isValidUrl,
  isValidPriority,
  formatDate,
  escapeXml,
};
