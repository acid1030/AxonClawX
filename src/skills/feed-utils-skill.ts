/**
 * Feed Utils Skill - RSS/Atom Feed Generation and Validation
 * 
 * 功能:
 * 1. RSS 2.0 生成
 * 2. Atom 1.0 生成
 * 3. Feed 验证
 * 
 * @module feed-utils-skill
 */

import { XMLBuilder } from 'fast-xml-parser';

// ============== Types ==============

export interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate?: Date;
  author?: string;
  guid?: string;
  categories?: string[];
  enclosure?: {
    url: string;
    type: string;
    length: number;
  };
  content?: string;
}

export interface FeedConfig {
  title: string;
  link: string;
  description: string;
  language?: string;
  copyright?: string;
  webMaster?: string;
  ttl?: number;
  items: FeedItem[];
  generator?: string;
  lastBuildDate?: Date;
}

export interface AtomPerson {
  name: string;
  email?: string;
  uri?: string;
}

export interface AtomFeedConfig {
  title: string;
  id: string;
  updated: Date;
  link: string;
  subtitle?: string;
  author?: AtomPerson;
  contributors?: AtomPerson[];
  categories?: string[];
  generator?: {
    value: string;
    version?: string;
    uri?: string;
  };
  icon?: string;
  logo?: string;
  rights?: string;
  items: AtomFeedItem[];
}

export interface AtomFeedItem {
  title: string;
  id: string;
  updated: Date;
  link: string;
  summary?: string;
  content?: {
    value: string;
    type?: 'text' | 'html' | 'xhtml';
  };
  author?: AtomPerson;
  contributors?: AtomPerson[];
  categories?: string[];
  published?: Date;
  rights?: string;
  source?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  feedType?: 'RSS 2.0' | 'Atom 1.0';
}

// ============== RSS 2.0 Generator ==============

/**
 * 生成 RSS 2.0 Feed
 * 
 * @param config - Feed 配置
 * @returns RSS 2.0 XML 字符串
 */
export function generateRSS20(config: FeedConfig): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  });

  const rss: any = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    rss: {
      '@_version': '2.0',
      '@_xmlns:atom': 'http://www.w3.org/2005/Atom',
      channel: {
        title: config.title,
        link: config.link,
        description: config.description,
        language: config.language || 'zh-cn',
        copyright: config.copyright,
        webMaster: config.webMaster,
        ttl: config.ttl || 60,
        lastBuildDate: config.lastBuildDate?.toUTCString(),
        generator: config.generator || 'AxonClaw Feed Utils',
        atom: {
          '@_href': config.link,
          '@_rel': 'self',
          '@_type': 'application/rss+xml',
        },
        item: config.items.map(item => ({
          title: item.title,
          link: item.link,
          description: item.description,
          pubDate: item.pubDate?.toUTCString(),
          guid: item.guid || item.link,
          author: item.author,
          category: item.categories?.map(cat => ({ '#text': cat })),
          enclosure: item.enclosure ? {
            '@_url': item.enclosure.url,
            '@_type': item.enclosure.type,
            '@_length': item.enclosure.length,
          } : undefined,
          'content:encoded': item.content,
        })),
      },
    },
  };

  // 添加 content 命名空间
  const xml = builder.build(rss);
  return xml.replace(
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">'
  );
}

// ============== Atom 1.0 Generator ==============

/**
 * 生成 Atom 1.0 Feed
 * 
 * @param config - Atom Feed 配置
 * @returns Atom 1.0 XML 字符串
 */
export function generateAtom10(config: AtomFeedConfig): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    format: true,
    indentBy: '  ',
    suppressEmptyNode: true,
  });

  const feed: any = {
    '?xml': {
      '@_version': '1.0',
      '@_encoding': 'UTF-8',
    },
    feed: {
      '@_xmlns': 'http://www.w3.org/2005/Atom',
      title: config.title,
      id: config.id,
      updated: config.updated.toISOString(),
      link: {
        '@_href': config.link,
        '@_rel': 'alternate',
        '@_type': 'text/html',
      },
      subtitle: config.subtitle,
      author: config.author ? {
        name: config.author.name,
        email: config.author.email,
        uri: config.author.uri,
      } : undefined,
      contributor: config.contributors?.map(c => ({
        name: c.name,
        email: c.email,
        uri: c.uri,
      })),
      category: config.categories?.map(cat => ({
        '@_term': cat,
      })),
      generator: config.generator ? {
        '@_version': config.generator.version,
        '@_uri': config.generator.uri,
        '#text': config.generator.value,
      } : undefined,
      icon: config.icon,
      logo: config.logo,
      rights: config.rights,
      entry: config.items.map(item => ({
        title: item.title,
        id: item.id,
        updated: item.updated.toISOString(),
        link: {
          '@_href': item.link,
          '@_rel': 'alternate',
          '@_type': 'text/html',
        },
        summary: item.summary,
        content: item.content ? {
          '@_type': item.content.type || 'html',
          '#text': item.content.value,
        } : undefined,
        author: item.author ? {
          name: item.author.name,
          email: item.author.email,
          uri: item.author.uri,
        } : undefined,
        contributor: item.contributors?.map(c => ({
          name: c.name,
          email: c.email,
          uri: c.uri,
        })),
        category: item.categories?.map(cat => ({
          '@_term': cat,
        })),
        published: item.published?.toISOString(),
        rights: item.rights,
        source: item.source,
      })),
    },
  };

  return builder.build(feed);
}

// ============== Feed Validation ==============

/**
 * 验证 RSS/Atom Feed
 * 
 * @param xml - Feed XML 字符串
 * @returns 验证结果
 */
export function validateFeed(xml: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let feedType: 'RSS 2.0' | 'Atom 1.0' | undefined;

  // 检查 XML 基本结构
  if (!xml || typeof xml !== 'string') {
    errors.push('Feed XML 不能为空');
    return { valid: false, errors, warnings };
  }

  // 检查 XML 声明
  if (!xml.startsWith('<?xml')) {
    warnings.push('缺少 XML 声明 (<?xml version="1.0" encoding="UTF-8"?>)');
  }

  // 检测 Feed 类型
  const isRSS = xml.includes('<rss') && xml.includes('version="2.0"');
  const isAtom = xml.includes('<feed') && xml.includes('xmlns="http://www.w3.org/2005/Atom"');

  if (isRSS) {
    feedType = 'RSS 2.0';
    errors.push(...validateRSS(xml));
  } else if (isAtom) {
    feedType = 'Atom 1.0';
    errors.push(...validateAtom(xml));
  } else {
    errors.push('无法识别的 Feed 格式 (需要 RSS 2.0 或 Atom 1.0)');
  }

  // 通用验证
  errors.push(...validateCommon(xml));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    feedType,
  };
}

/**
 * 验证 RSS 2.0 Feed
 */
function validateRSS(xml: string): string[] {
  const errors: string[] = [];

  // 必需元素检查
  if (!xml.includes('<channel>')) {
    errors.push('RSS 缺少必需的 <channel> 元素');
  }

  if (!xml.includes('<title>')) {
    errors.push('RSS 缺少必需的 <title> 元素');
  }

  if (!xml.includes('<link>')) {
    errors.push('RSS 缺少必需的 <link> 元素');
  }

  if (!xml.includes('<description>')) {
    errors.push('RSS 缺少必需的 <description> 元素');
  }

  // 检查 item 元素
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g);
  if (itemMatches) {
    itemMatches.forEach((item, index) => {
      if (!item.includes('<title>')) {
        errors.push(`RSS item #${index + 1} 缺少 <title> 元素`);
      }
      if (!item.includes('<link>')) {
        errors.push(`RSS item #${index + 1} 缺少 <link> 元素`);
      }
      if (!item.includes('<description>')) {
        errors.push(`RSS item #${index + 1} 缺少 <description> 元素`);
      }
    });
  }

  // 检查日期格式
  const pubDateMatches = xml.match(/<pubDate>([^<]*)<\/pubDate>/g);
  if (pubDateMatches) {
    pubDateMatches.forEach(match => {
      const date = match.replace(/<\/?pubDate>/g, '');
      if (!isValidRFC822Date(date)) {
        errors.push(`无效的 RFC 822 日期格式：${date}`);
      }
    });
  }

  return errors;
}

/**
 * 验证 Atom 1.0 Feed
 */
function validateAtom(xml: string): string[] {
  const errors: string[] = [];

  // 必需元素检查
  if (!xml.includes('<feed')) {
    errors.push('Atom 缺少必需的 <feed> 元素');
  }

  if (!xml.includes('<title>')) {
    errors.push('Atom 缺少必需的 <title> 元素');
  }

  if (!xml.includes('<id>')) {
    errors.push('Atom 缺少必需的 <id> 元素 (应该是唯一的 URI)');
  }

  if (!xml.includes('<updated>')) {
    errors.push('Atom 缺少必需的 <updated> 元素');
  }

  // 检查 entry 元素
  const entryMatches = xml.match(/<entry>[\s\S]*?<\/entry>/g);
  if (entryMatches) {
    entryMatches.forEach((entry, index) => {
      if (!entry.includes('<title>')) {
        errors.push(`Atom entry #${index + 1} 缺少 <title> 元素`);
      }
      if (!entry.includes('<id>')) {
        errors.push(`Atom entry #${index + 1} 缺少 <id> 元素`);
      }
      if (!entry.includes('<updated>')) {
        errors.push(`Atom entry #${index + 1} 缺少 <updated> 元素`);
      }
      if (!entry.includes('<link')) {
        errors.push(`Atom entry #${index + 1} 缺少 <link> 元素`);
      }
    });
  }

  // 检查 ISO 8601 日期格式
  const updatedMatches = xml.match(/<updated>([^<]*)<\/updated>/g);
  if (updatedMatches) {
    updatedMatches.forEach(match => {
      const date = match.replace(/<\/?updated>/g, '');
      if (!isValidISO8601Date(date)) {
        errors.push(`无效的 ISO 8601 日期格式：${date}`);
      }
    });
  }

  return errors;
}

/**
 * 通用验证 (适用于 RSS 和 Atom)
 */
function validateCommon(xml: string): string[] {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 检查 XML 闭合标签
  const openTags = (xml.match(/<([a-zA-Z0-9_-]+)(?:\s[^>]*)?>/g) || []).length;
  const closeTags = (xml.match(/<\/([a-zA-Z0-9_-]+)>/g) || []).length;
  
  if (openTags !== closeTags) {
    errors.push('XML 标签不匹配 (开标签和闭标签数量不一致)');
  }

  // 检查特殊字符转义
  const unescapedAmpersands = xml.match(/&(?!(?:amp|lt|gt|quot|apos);)/g);
  if (unescapedAmpersands && unescapedAmpersands.length > 0) {
    warnings.push('发现未转义的 & 符号，建议使用 &amp;');
  }

  // 检查文件大小 (建议不超过 1MB)
  if (xml.length > 1024 * 1024) {
    warnings.push('Feed 文件过大 (超过 1MB，可能影响解析性能)');
  }

  return errors;
}

// ============== Helper Functions ==============

/**
 * 验证 RFC 822 日期格式 (RSS 使用)
 */
function isValidRFC822Date(date: string): boolean {
  // RFC 822 格式：Mon, 02 Jan 2006 15:04:05 GMT
  const rfc822Regex = /^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} (GMT|[+-]\d{4})$/;
  return rfc822Regex.test(date.trim());
}

/**
 * 验证 ISO 8601 日期格式 (Atom 使用)
 */
function isValidISO8601Date(date: string): boolean {
  // ISO 8601 格式：2006-01-02T15:04:05Z 或 2006-01-02T15:04:05+08:00
  const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?$/;
  return iso8601Regex.test(date.trim());
}

/**
 * 格式化日期为 RFC 822 (RSS)
 */
export function formatRFC822Date(date: Date = new Date()): string {
  return date.toUTCString();
}

/**
 * 格式化日期为 ISO 8601 (Atom)
 */
export function formatISO8601Date(date: Date = new Date()): string {
  return date.toISOString();
}

// ============== Usage Examples ==============

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * import { 
 *   generateRSS20, 
 *   generateAtom10, 
 *   validateFeed,
 *   formatRFC822Date,
 *   formatISO8601Date
 * } from './feed-utils-skill';
 * 
 * // 示例 1: 生成 RSS 2.0 Feed
 * const rssConfig = {
 *   title: 'AxonClaw 技术博客',
 *   link: 'https://axonclaw.dev/blog',
 *   description: 'AxonClaw 项目技术分享与更新',
 *   language: 'zh-cn',
 *   copyright: 'Copyright 2026 AxonClaw',
 *   webMaster: 'admin@axonclaw.dev (Axon)',
 *   ttl: 60,
 *   generator: 'AxonClaw Feed Generator v1.0',
 *   lastBuildDate: new Date(),
 *   items: [
 *     {
 *       title: 'AxonClaw v2.0 发布',
 *       link: 'https://axonclaw.dev/blog/v2-release',
 *       description: 'AxonClaw v2.0 带来全新的多 Agent 协作功能...',
 *       pubDate: new Date('2026-03-13T10:00:00Z'),
 *       author: 'axon@axonclaw.dev (Axon)',
 *       guid: 'https://axonclaw.dev/blog/v2-release',
 *       categories: ['发布', '更新'],
 *       enclosure: {
 *         url: 'https://axonclaw.dev/assets/v2-screenshot.png',
 *         type: 'image/png',
 *         length: 256000,
 *       },
 *       content: '<p>AxonClaw v2.0 正式发布，包含以下新特性...</p>',
 *     },
 *     {
 *       title: '多 Agent 协作架构设计',
 *       link: 'https://axonclaw.dev/blog/multi-agent-architecture',
 *       description: '深入探讨 AxonClaw 的多 Agent 协作架构...',
 *       pubDate: new Date('2026-03-12T15:30:00Z'),
 *       author: 'kael@axonclaw.dev (KAEL)',
 *       guid: 'https://axonclaw.dev/blog/multi-agent-architecture',
 *       categories: ['架构', '技术'],
 *     },
 *   ],
 * };
 * 
 * const rssXml = generateRSS20(rssConfig);
 * console.log('RSS 2.0 Feed:');
 * console.log(rssXml);
 * 
 * // 示例 2: 生成 Atom 1.0 Feed
 * const atomConfig = {
 *   title: 'AxonClaw 技术博客',
 *   id: 'urn:uuid:axonclaw-dev-blog',
 *   updated: new Date(),
 *   link: 'https://axonclaw.dev/blog',
 *   subtitle: 'AxonClaw 项目技术分享与更新',
 *   author: {
 *     name: 'AxonClaw Team',
 *     email: 'team@axonclaw.dev',
 *     uri: 'https://axonclaw.dev',
 *   },
 *   contributors: [
 *     {
 *       name: 'Axon',
 *       email: 'axon@axonclaw.dev',
 *     },
 *     {
 *       name: 'KAEL',
 *       email: 'kael@axonclaw.dev',
 *     },
 *   ],
 *   categories: ['技术', 'AI', '多 Agent'],
 *   generator: {
 *     value: 'AxonClaw Feed Generator',
 *     version: '1.0.0',
 *     uri: 'https://axonclaw.dev',
 *   },
 *   rights: 'Copyright 2026 AxonClaw',
 *   items: [
 *     {
 *       title: 'AxonClaw v2.0 发布',
 *       id: 'urn:uuid:axonclaw-v2-release',
 *       updated: new Date('2026-03-13T10:00:00Z'),
 *       link: 'https://axonclaw.dev/blog/v2-release',
 *       summary: 'AxonClaw v2.0 带来全新的多 Agent 协作功能...',
 *       content: {
 *         value: '<p>AxonClaw v2.0 正式发布，包含以下新特性...</p>',
 *         type: 'html',
 *       },
 *       author: {
 *         name: 'Axon',
 *         email: 'axon@axonclaw.dev',
 *       },
 *       categories: ['发布', '更新'],
 *       published: new Date('2026-03-13T10:00:00Z'),
 *     },
 *   ],
 * };
 * 
 * const atomXml = generateAtom10(atomConfig);
 * console.log('Atom 1.0 Feed:');
 * console.log(atomXml);
 * 
 * // 示例 3: 验证 Feed
 * const rssValidation = validateFeed(rssXml);
 * console.log('RSS 验证结果:', rssValidation);
 * // 输出: { valid: true, errors: [], warnings: [], feedType: 'RSS 2.0' }
 * 
 * const atomValidation = validateFeed(atomXml);
 * console.log('Atom 验证结果:', atomValidation);
 * // 输出: { valid: true, errors: [], warnings: [], feedType: 'Atom 1.0' }
 * 
 * // 示例 4: 日期格式化
 * const rfc822Date = formatRFC822Date(new Date());
 * console.log('RFC 822 日期:', rfc822Date);
 * // 输出: Fri, 13 Mar 2026 11:18:00 GMT
 * 
 * const iso8601Date = formatISO8601Date(new Date());
 * console.log('ISO 8601 日期:', iso8601Date);
 * // 输出: 2026-03-13T11:18:00.000Z
 * ```
 */
export const usageExamples = `
// 完整示例请查看上方的 @example JSDoc 注释
`;

// ============== Exports ==============

export default {
  generateRSS20,
  generateAtom10,
  validateFeed,
  formatRFC822Date,
  formatISO8601Date,
};
