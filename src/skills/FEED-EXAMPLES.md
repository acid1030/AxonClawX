# Feed Utils 使用示例

本文档提供 `feed-utils-skill.ts` 的完整使用示例。

## 安装依赖

```bash
npm install fast-xml-parser
# 或
yarn add fast-xml-parser
# 或
pnpm add fast-xml-parser
```

## 基础使用

### 1. 生成 RSS 2.0 Feed

```typescript
import { generateRSS20, formatRFC822Date } from './feed-utils-skill';

const rssConfig = {
  title: 'AxonClaw 技术博客',
  link: 'https://axonclaw.dev/blog',
  description: 'AxonClaw 项目技术分享与更新',
  language: 'zh-cn',
  copyright: 'Copyright 2026 AxonClaw',
  webMaster: 'admin@axonclaw.dev (Axon)',
  ttl: 60, // 缓存时间 (分钟)
  generator: 'AxonClaw Feed Generator v1.0',
  lastBuildDate: new Date(),
  items: [
    {
      title: 'AxonClaw v2.0 发布',
      link: 'https://axonclaw.dev/blog/v2-release',
      description: 'AxonClaw v2.0 带来全新的多 Agent 协作功能，性能提升 300%...',
      pubDate: new Date('2026-03-13T10:00:00Z'),
      author: 'axon@axonclaw.dev (Axon)',
      guid: 'https://axonclaw.dev/blog/v2-release',
      categories: ['发布', '更新', 'v2.0'],
      enclosure: {
        url: 'https://axonclaw.dev/assets/v2-screenshot.png',
        type: 'image/png',
        length: 256000, // 字节
      },
      content: '<p>AxonClaw v2.0 正式发布，包含以下新特性：</p><ul><li>多 Agent 协作</li><li>性能优化</li></ul>',
    },
    {
      title: '多 Agent 协作架构设计',
      link: 'https://axonclaw.dev/blog/multi-agent-architecture',
      description: '深入探讨 AxonClaw 的多 Agent 协作架构设计思路...',
      pubDate: new Date('2026-03-12T15:30:00Z'),
      author: 'kael@axonclaw.dev (KAEL)',
      guid: 'https://axonclaw.dev/blog/multi-agent-architecture',
      categories: ['架构', '技术'],
    },
  ],
};

const rssXml = generateRSS20(rssConfig);
console.log(rssXml);
```

**输出示例:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>AxonClaw 技术博客</title>
    <link>https://axonclaw.dev/blog</link>
    <description>AxonClaw 项目技术分享与更新</description>
    <language>zh-cn</language>
    <copyright>Copyright 2026 AxonClaw</copyright>
    <webMaster>admin@axonclaw.dev (Axon)</webMaster>
    <ttl>60</ttl>
    <lastBuildDate>Fri, 13 Mar 2026 11:18:00 GMT</lastBuildDate>
    <generator>AxonClaw Feed Generator v1.0</generator>
    <atom:link href="https://axonclaw.dev/blog" rel="self" type="application/rss+xml"/>
    <item>
      <title>AxonClaw v2.0 发布</title>
      <link>https://axonclaw.dev/blog/v2-release</link>
      <description>AxonClaw v2.0 带来全新的多 Agent 协作功能，性能提升 300%...</description>
      <pubDate>Fri, 13 Mar 2026 10:00:00 GMT</pubDate>
      <guid>https://axonclaw.dev/blog/v2-release</guid>
      <author>axon@axonclaw.dev (Axon)</author>
      <category>发布</category>
      <category>更新</category>
      <category>v2.0</category>
      <enclosure url="https://axonclaw.dev/assets/v2-screenshot.png" type="image/png" length="256000"/>
      <content:encoded>&lt;p&gt;AxonClaw v2.0 正式发布，包含以下新特性：&lt;/p&gt;&lt;ul&gt;&lt;li&gt;多 Agent 协作&lt;/li&gt;&lt;li&gt;性能优化&lt;/li&gt;&lt;/ul&gt;</content:encoded>
    </item>
    <item>
      <title>多 Agent 协作架构设计</title>
      <link>https://axonclaw.dev/blog/multi-agent-architecture</link>
      <description>深入探讨 AxonClaw 的多 Agent 协作架构设计思路...</description>
      <pubDate>Thu, 12 Mar 2026 15:30:00 GMT</pubDate>
      <guid>https://axonclaw.dev/blog/multi-agent-architecture</guid>
      <author>kael@axonclaw.dev (KAEL)</author>
      <category>架构</category>
      <category>技术</category>
    </item>
  </channel>
</rss>
```

### 2. 生成 Atom 1.0 Feed

```typescript
import { generateAtom10, formatISO8601Date } from './feed-utils-skill';

const atomConfig = {
  title: 'AxonClaw 技术博客',
  id: 'urn:uuid:axonclaw-dev-blog', // 唯一的 Feed ID
  updated: new Date(),
  link: 'https://axonclaw.dev/blog',
  subtitle: 'AxonClaw 项目技术分享与更新',
  author: {
    name: 'AxonClaw Team',
    email: 'team@axonclaw.dev',
    uri: 'https://axonclaw.dev',
  },
  contributors: [
    {
      name: 'Axon',
      email: 'axon@axonclaw.dev',
    },
    {
      name: 'KAEL',
      email: 'kael@axonclaw.dev',
    },
  ],
  categories: ['技术', 'AI', '多 Agent'],
  generator: {
    value: 'AxonClaw Feed Generator',
    version: '1.0.0',
    uri: 'https://axonclaw.dev',
  },
  rights: 'Copyright 2026 AxonClaw',
  icon: 'https://axonclaw.dev/favicon.ico',
  logo: 'https://axonclaw.dev/logo.png',
  items: [
    {
      title: 'AxonClaw v2.0 发布',
      id: 'urn:uuid:axonclaw-v2-release', // 唯一的 Entry ID
      updated: new Date('2026-03-13T10:00:00Z'),
      link: 'https://axonclaw.dev/blog/v2-release',
      summary: 'AxonClaw v2.0 带来全新的多 Agent 协作功能...',
      content: {
        value: '<p>AxonClaw v2.0 正式发布，包含以下新特性：</p><ul><li>多 Agent 协作</li><li>性能优化</li></ul>',
        type: 'html', // 'text' | 'html' | 'xhtml'
      },
      author: {
        name: 'Axon',
        email: 'axon@axonclaw.dev',
      },
      categories: ['发布', '更新'],
      published: new Date('2026-03-13T10:00:00Z'),
      rights: 'Copyright 2026 AxonClaw',
    },
    {
      title: '多 Agent 协作架构设计',
      id: 'urn:uuid:axonclaw-multi-agent-arch',
      updated: new Date('2026-03-12T15:30:00Z'),
      link: 'https://axonclaw.dev/blog/multi-agent-architecture',
      summary: '深入探讨 AxonClaw 的多 Agent 协作架构设计思路...',
      content: {
        value: '<p>本文详细介绍多 Agent 协作的架构设计...</p>',
        type: 'html',
      },
      author: {
        name: 'KAEL',
        email: 'kael@axonclaw.dev',
      },
      categories: ['架构', '技术'],
      published: new Date('2026-03-12T15:30:00Z'),
    },
  ],
};

const atomXml = generateAtom10(atomConfig);
console.log(atomXml);
```

**输出示例:**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>AxonClaw 技术博客</title>
  <id>urn:uuid:axonclaw-dev-blog</id>
  <updated>2026-03-13T11:18:00.000Z</updated>
  <link href="https://axonclaw.dev/blog" rel="alternate" type="text/html"/>
  <subtitle>AxonClaw 项目技术分享与更新</subtitle>
  <author>
    <name>AxonClaw Team</name>
    <email>team@axonclaw.dev</email>
    <uri>https://axonclaw.dev</uri>
  </author>
  <contributor>
    <name>Axon</name>
    <email>axon@axonclaw.dev</email>
  </contributor>
  <contributor>
    <name>KAEL</name>
    <email>kael@axonclaw.dev</email>
  </contributor>
  <category term="技术"/>
  <category term="AI"/>
  <category term="多 Agent"/>
  <generator version="1.0.0" uri="https://axonclaw.dev">AxonClaw Feed Generator</generator>
  <icon>https://axonclaw.dev/favicon.ico</icon>
  <logo>https://axonclaw.dev/logo.png</logo>
  <rights>Copyright 2026 AxonClaw</rights>
  <entry>
    <title>AxonClaw v2.0 发布</title>
    <id>urn:uuid:axonclaw-v2-release</id>
    <updated>2026-03-13T10:00:00.000Z</updated>
    <link href="https://axonclaw.dev/blog/v2-release" rel="alternate" type="text/html"/>
    <summary>AxonClaw v2.0 带来全新的多 Agent 协作功能...</summary>
    <content type="html">&lt;p&gt;AxonClaw v2.0 正式发布，包含以下新特性：&lt;/p&gt;&lt;ul&gt;&lt;li&gt;多 Agent 协作&lt;/li&gt;&lt;li&gt;性能优化&lt;/li&gt;&lt;/ul&gt;</content>
    <author>
      <name>Axon</name>
      <email>axon@axonclaw.dev</email>
    </author>
    <category term="发布"/>
    <category term="更新"/>
    <published>2026-03-13T10:00:00.000Z</published>
    <rights>Copyright 2026 AxonClaw</rights>
  </entry>
  <entry>
    <title>多 Agent 协作架构设计</title>
    <id>urn:uuid:axonclaw-multi-agent-arch</id>
    <updated>2026-03-12T15:30:00.000Z</updated>
    <link href="https://axonclaw.dev/blog/multi-agent-architecture" rel="alternate" type="text/html"/>
    <summary>深入探讨 AxonClaw 的多 Agent 协作架构设计思路...</summary>
    <content type="html">&lt;p&gt;本文详细介绍多 Agent 协作的架构设计...&lt;/p&gt;</content>
    <author>
      <name>KAEL</name>
      <email>kael@axonclaw.dev</email>
    </author>
    <category term="架构"/>
    <category term="技术"/>
    <published>2026-03-12T15:30:00.000Z</published>
  </entry>
</feed>
```

### 3. Feed 验证

```typescript
import { validateFeed, generateRSS20 } from './feed-utils-skill';

// 验证 RSS Feed
const rssConfig = {
  title: '测试博客',
  link: 'https://example.com',
  description: '测试描述',
  items: [
    {
      title: '测试文章',
      link: 'https://example.com/post1',
      description: '测试描述',
      pubDate: new Date(),
    },
  ],
};

const rssXml = generateRSS20(rssConfig);
const validationResult = validateFeed(rssXml);

console.log('验证结果:', validationResult);
// 输出:
// {
//   valid: true,
//   errors: [],
//   warnings: [],
//   feedType: 'RSS 2.0'
// }

// 验证无效的 Feed
const invalidXml = `<?xml version="1.0"?>
<rss version="2.0">
  <channel>
    <title>缺少 link 和 description</title>
  </channel>
</rss>`;

const invalidResult = validateFeed(invalidXml);
console.log('无效 Feed 验证:', invalidResult);
// 输出:
// {
//   valid: false,
//   errors: [
//     'RSS 缺少必需的 <link> 元素',
//     'RSS 缺少必需的 <description> 元素'
//   ],
//   warnings: [],
//   feedType: 'RSS 2.0'
// }
```

### 4. 日期格式化

```typescript
import { formatRFC822Date, formatISO8601Date } from './feed-utils-skill';

// RSS 使用的 RFC 822 格式
const rfc822Date = formatRFC822Date(new Date());
console.log('RFC 822:', rfc822Date);
// 输出：Fri, 13 Mar 2026 11:18:00 GMT

// Atom 使用的 ISO 8601 格式
const iso8601Date = formatISO8601Date(new Date());
console.log('ISO 8601:', iso8601Date);
// 输出：2026-03-13T11:18:00.000Z

// 自定义日期
const customDate = new Date('2026-03-13T10:00:00Z');
console.log('自定义 RFC 822:', formatRFC822Date(customDate));
console.log('自定义 ISO 8601:', formatISO8601Date(customDate));
```

## 实际应用场景

### 场景 1: 博客自动生成 Feed

```typescript
import { generateRSS20, generateAtom10 } from './feed-utils-skill';
import { getBlogPosts } from './blog-service';

async function generateBlogFeeds() {
  const posts = await getBlogPosts({ limit: 20 });
  
  const feedConfig = {
    title: 'AxonClaw 博客',
    link: 'https://axonclaw.dev/blog',
    description: 'AxonClaw 项目官方博客',
    language: 'zh-cn',
    copyright: `Copyright ${new Date().getFullYear()} AxonClaw`,
    items: posts.map(post => ({
      title: post.title,
      link: `https://axonclaw.dev/blog/${post.slug}`,
      description: post.excerpt,
      pubDate: new Date(post.publishedAt),
      author: `${post.author.email} (${post.author.name})`,
      guid: `https://axonclaw.dev/blog/${post.slug}`,
      categories: post.tags,
      content: post.content, // HTML 内容
    })),
  };
  
  // 生成 RSS 2.0
  const rssXml = generateRSS20(feedConfig);
  await fs.writeFile('./public/rss.xml', rssXml);
  
  // 生成 Atom 1.0
  const atomConfig = {
    title: feedConfig.title,
    id: 'urn:uuid:axonclaw-blog',
    updated: new Date(),
    link: feedConfig.link,
    subtitle: feedConfig.description,
    items: posts.map(post => ({
      title: post.title,
      id: `urn:uuid:axonclaw-post-${post.slug}`,
      updated: new Date(post.updatedAt),
      link: `https://axonclaw.dev/blog/${post.slug}`,
      summary: post.excerpt,
      content: {
        value: post.content,
        type: 'html',
      },
      published: new Date(post.publishedAt),
    })),
  };
  
  const atomXml = generateAtom10(atomConfig);
  await fs.writeFile('./public/atom.xml', atomXml);
  
  console.log('Feed 生成完成!');
}
```

### 场景 2: 项目更新通知 Feed

```typescript
import { generateRSS20, validateFeed } from './feed-utils-skill';

function generateProjectUpdates(updates: ProjectUpdate[]) {
  const feedConfig = {
    title: 'AxonClaw 项目更新',
    link: 'https://github.com/axonclaw/axonclaw',
    description: 'AxonClaw 项目最新更新日志',
    language: 'en-us',
    webMaster: 'noreply@axonclaw.dev',
    items: updates.map(update => ({
      title: update.version,
      link: update.releaseUrl,
      description: update.summary,
      pubDate: new Date(update.releaseDate),
      guid: update.releaseUrl,
      categories: update.types, // ['Feature', 'Bugfix', 'Performance']
      content: update.changelog,
    })),
  };
  
  const rssXml = generateRSS20(feedConfig);
  
  // 验证生成的 Feed
  const validation = validateFeed(rssXml);
  if (!validation.valid) {
    console.error('Feed 验证失败:', validation.errors);
    throw new Error('Invalid feed generated');
  }
  
  return rssXml;
}
```

### 场景 3: 播客 Feed (带 Enclosure)

```typescript
import { generateRSS20 } from './feed-utils-skill';

function generatePodcastFeed(episodes: PodcastEpisode[]) {
  const feedConfig = {
    title: 'AxonClaw 播客',
    link: 'https://axonclaw.dev/podcast',
    description: 'AxonClaw 项目技术讨论播客',
    language: 'zh-cn',
    copyright: 'Copyright 2026 AxonClaw',
    webMaster: 'podcast@axonclaw.dev',
    items: episodes.map(episode => ({
      title: episode.title,
      link: episode.showNotesUrl,
      description: episode.description,
      pubDate: new Date(episode.publishDate),
      author: episode.host,
      guid: episode.audioUrl,
      categories: episode.topics,
      enclosure: {
        url: episode.audioUrl,
        type: 'audio/mpeg', // MP3
        length: episode.fileSize, // 字节
      },
      content: episode.showNotes,
    })),
  };
  
  return generateRSS20(feedConfig);
}
```

## 最佳实践

### 1. 日期处理

```typescript
// ✅ 推荐：使用提供的工具函数
import { formatRFC822Date, formatISO8601Date } from './feed-utils-skill';

const pubDate = formatRFC822Date(new Date());

// ❌ 不推荐：手动格式化
const pubDate = new Date().toUTCString(); // 可能不一致
```

### 2. GUID/ID 唯一性

```typescript
// ✅ 推荐：使用稳定的唯一标识
guid: `https://axonclaw.dev/blog/${post.slug}`
id: `urn:uuid:axonclaw-post-${post.slug}`

// ❌ 不推荐：使用可能变化的值
guid: post.title // 标题可能会改
id: new Date().toString() // 不唯一
```

### 3. 内容转义

```typescript
// ✅ 推荐：让库处理转义
content: '<p>HTML 内容 & 特殊字符</p>'

// ❌ 不推荐：手动转义 (容易出错)
content: '&lt;p&gt;HTML 内容 &amp; 特殊字符&lt;/p&gt;'
```

### 4. Feed 大小优化

```typescript
// ✅ 推荐：限制条目数量
items: posts.slice(0, 20) // 只保留最近 20 条

// ✅ 推荐：使用 summary 而非完整内容
summary: post.excerpt // 简短摘要
content: post.content // 完整内容 (可选)

// ❌ 不推荐：包含所有历史条目
items: allPosts // 可能导致 Feed 过大
```

## 常见问题

### Q: RSS 和 Atom 应该选择哪个？

**A:** 
- **RSS 2.0**: 更广泛支持，适合博客、新闻网站
- **Atom 1.0**: 更现代化，支持更丰富的元数据，适合技术文档、项目更新

建议同时提供两种格式，让用户选择。

### Q: 如何处理大量条目？

**A:** 
```typescript
// 分页处理
const recentItems = items.slice(0, 50); // 最近 50 条
const archiveItems = items.slice(50, 100); // 归档 50 条

// 生成主 Feed 和归档 Feed
const mainFeed = generateRSS20({ ...config, items: recentItems });
const archiveFeed = generateRSS20({ ...config, items: archiveItems });
```

### Q: 如何添加自定义命名空间？

**A:** 
```typescript
// RSS 2.0 已自动包含 content 命名空间
// 如需添加其他命名空间，可修改 generateRSS20 函数

const rss = {
  '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
  rss: {
    '@_version': '2.0',
    '@_xmlns:custom': 'http://example.com/custom',
    // ...
  },
};
```

## 参考资料

- [RSS 2.0 规范](https://validator.w3.org/feed/docs/rss2.html)
- [Atom 1.0 规范](https://validator.w3.org/feed/docs/atom.html)
- [W3C Feed Validation Service](https://validator.w3.org/feed/)
- [fast-xml-parser 文档](https://github.com/NaturalIntelligence/fast-xml-parser)

---

**最后更新:** 2026-03-13  
**版本:** 1.0.0
