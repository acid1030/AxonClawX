# Sitemap Utils 使用示例

## 快速开始

### 1. 基础用法 - 生成单个 Sitemap

```typescript
import { generateSitemap, createUrlEntries } from './sitemap-utils-skill';

// 定义 URL 列表
const urls = createUrlEntries(
  ['/', '/about', '/products', '/contact', '/blog'],
  {
    changefreq: 'weekly',
    priority: 0.5,
    lastmod: new Date(),
  }
);

// 生成 sitemap
const config = {
  baseUrl: 'https://example.com',
  outputDir: './public',
};

generateSitemap(urls, config);
// 输出: ./public/sitemap.xml
```

### 2. 高级用法 - 自定义每个 URL

```typescript
import { generateSitemap } from './sitemap-utils-skill';

const urls = [
  {
    loc: '/',
    priority: 1.0,
    changefreq: 'daily',
    lastmod: '2026-03-13',
  },
  {
    loc: '/products',
    priority: 0.9,
    changefreq: 'weekly',
  },
  {
    loc: '/blog/post-1',
    priority: 0.7,
    changefreq: 'monthly',
    lastmod: new Date(),
  },
];

generateSitemap(urls, {
  baseUrl: 'https://example.com',
  outputDir: './public',
  filename: 'sitemap-custom.xml',
});
```

### 3. 批量生成 - 大量 URL (超过 50000)

```typescript
import { generateSitemapBatch } from './sitemap-utils-skill';

// 模拟 100000 个产品页面
const allUrls = [];
for (let i = 1; i <= 100000; i++) {
  allUrls.push({
    loc: `/product/${i}`,
    priority: 0.6,
    changefreq: 'weekly',
    lastmod: new Date(),
  });
}

const { indexFile, sitemapFiles } = generateSitemapBatch(allUrls, {
  baseUrl: 'https://shop.example.com',
  outputDir: './public/sitemaps',
  maxUrlsPerFile: 50000, // 默认值，可自定义
});

console.log(`生成了 ${sitemapFiles.length} 个 sitemap 文件`);
console.log(`索引文件：${indexFile}`);
// 输出:
// - ./public/sitemaps/sitemap-index.xml (索引)
// - ./public/sitemaps/sitemap-1.xml (50000 URLs)
// - ./public/sitemaps/sitemap-2.xml (50000 URLs)
```

### 4. 验证 Sitemap

```typescript
import { validateSitemap } from './sitemap-utils-skill';

const result = validateSitemap('./public/sitemap.xml');

if (result.valid) {
  console.log(`✅ 验证通过：${result.urlCount} 个 URLs`);
} else {
  console.error('❌ 验证失败:');
  result.errors.forEach(err => console.error(`  - ${err}`));
}

if (result.warnings.length > 0) {
  console.warn('⚠️ 警告:');
  result.warnings.forEach(warn => console.warn(`  - ${warn}`));
}
```

### 5. 实际场景 - 从数据库生成

```typescript
import { generateSitemap } from './sitemap-utils-skill';

// 假设从数据库获取数据
const products = await db.products.findMany({
  where: { status: 'published' },
  select: { slug, updatedAt },
});

const urls = products.map(product => ({
  loc: `/product/${product.slug}`,
  lastmod: product.updatedAt,
  priority: 0.7,
  changefreq: 'weekly',
}));

// 添加静态页面
urls.push(
  { loc: '/', priority: 1.0, changefreq: 'daily' },
  { loc: '/about', priority: 0.8, changefreq: 'monthly' },
  { loc: '/contact', priority: 0.7, changefreq: 'monthly' },
);

generateSitemap(urls, {
  baseUrl: 'https://example.com',
  outputDir: './public',
});
```

### 6. 实际场景 - Next.js 集成

```typescript
// app/sitemap.ts (Next.js App Router)
import { generateSitemap } from '@/skills/sitemap-utils-skill';
import { writeFileSync } from 'fs';

export default async function sitemap() {
  const urls = [
    {
      loc: 'https://example.com',
      lastmod: new Date(),
      priority: 1.0,
      changefreq: 'daily',
    },
    // ... 其他 URLs
  ];

  // 生成 XML 字符串 (修改 generateSitemap 返回字符串而非写入文件)
  const xml = generateSitemapToString(urls);
  
  // Next.js 会自动处理响应
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
    },
  });
}
```

### 7. 实际场景 - 定时任务 (Cron)

```typescript
// scripts/generate-sitemap.ts
import { generateSitemapBatch, validateSitemap } from '../src/skills/sitemap-utils-skill';
import { cron } from 'node-cron';

// 每天凌晨 3 点生成
cron.schedule('0 3 * * *', async () => {
  console.log('🔄 开始生成 sitemap...');
  
  try {
    const urls = await fetchAllUrls(); // 你的 URL 获取逻辑
    
    const { indexFile } = generateSitemapBatch(urls, {
      baseUrl: 'https://example.com',
      outputDir: './public/sitemaps',
    });

    // 自动验证
    const result = validateSitemap(indexFile);
    
    if (result.valid) {
      console.log('✅ Sitemap 生成成功');
      
      // 提交到 Google Search Console
      await submitToGoogle(indexFile);
    } else {
      console.error('❌ Sitemap 验证失败:', result.errors);
      process.exit(1);
    }
  } catch (error) {
    console.error('💥 Sitemap 生成失败:', error);
    process.exit(1);
  }
});
```

## API 参考

### 类型定义

```typescript
interface SitemapUrlEntry {
  loc: string;                      // URL 路径或完整 URL
  lastmod?: string | Date;          // 最后修改日期
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;                // 0.0 - 1.0
}

interface SitemapConfig {
  baseUrl: string;                  // 网站基础 URL
  outputDir: string;                // 输出目录
  filename?: string;                // 文件名 (默认: sitemap.xml)
  maxUrlsPerFile?: number;          // 每个文件最大 URL 数 (默认: 50000)
}
```

### 核心函数

| 函数 | 描述 | 返回值 |
|------|------|--------|
| `generateSitemap(urls, config)` | 生成单个 sitemap 文件 | 文件路径 (string) |
| `generateSitemapIndex(sitemapUrls, config)` | 生成 sitemap 索引 | 索引文件路径 (string) |
| `generateSitemapBatch(allUrls, config)` | 批量生成多个 sitemap + 索引 | `{ indexFile, sitemapFiles }` |
| `validateSitemap(filePath)` | 验证 sitemap 文件 | `{ valid, errors, warnings, urlCount }` |
| `createUrlEntries(paths, options)` | 从路径数组创建 URL 条目 | `SitemapUrlEntry[]` |

### 工具函数

| 函数 | 描述 |
|------|------|
| `isValidUrl(url)` | 验证 URL 格式 |
| `isValidPriority(priority)` | 验证 priority 值 (0.0-1.0) |
| `formatDate(date)` | 格式化日期为 ISO 8601 |
| `escapeXml(text)` | 转义 XML 特殊字符 |

## 最佳实践

### ✅ 推荐

1. **首页优先级设为 1.0**
2. **重要页面 (产品/分类) 优先级 0.7-0.9**
3. **辅助页面 (关于/联系) 优先级 0.5-0.7**
4. **定期更新 sitemap (建议每周)**
5. **提交到 Google Search Console**
6. **在 robots.txt 中声明 sitemap 位置**

### ❌ 避免

1. **不要包含 noindex 页面**
2. **不要包含需要登录的页面**
3. **不要包含重复 URL**
4. **priority 不要全部设为 1.0 (失去意义)**
5. **单个 sitemap 不要超过 50000 个 URL**
6. **sitemap 文件大小不要超过 50MB (未压缩)**

## robots.txt 配置示例

```txt
# robots.txt
Sitemap: https://example.com/sitemap.xml
Sitemap: https://example.com/sitemaps/sitemap-index.xml

User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/
Disallow: /private/
```

## Google Search Console 提交

```typescript
async function submitToGoogle(sitemapUrl: string) {
  // 方法 1: 通过 Search Console API
  // https://developers.google.com/webmaster-tools/search-console-api
  
  // 方法 2: 手动提交
  // https://search.google.com/search-console
  
  // 方法 3: 自动 ping
  await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
  console.log('📢 已通知 Google');
}
```

---

**创建时间:** 2026-03-13  
**作者:** KAEL Engineering  
**版本:** 1.0.0
