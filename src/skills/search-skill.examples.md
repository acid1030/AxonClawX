# Search Skill - 使用示例

搜索技能提供强大的全文搜索功能，支持内存搜索、关键词高亮和智能排序。

## 快速开始

```typescript
import SearchSkill from './search-skill';

// 创建搜索实例
const search = new SearchSkill({
  caseSensitive: false,
  defaultSortBy: 'relevance',
  maxResults: 50,
});
```

---

## 功能 1: 内存搜索

### 基础文本搜索

```typescript
const text = "AxonClaw 是一个强大的多 Agent 协作系统，支持实时通信和任务分发。";

const results = search.search("Agent 协作", text);

console.log(results);
// 输出:
// [
//   {
//     item: "AxonClaw 是一个强大的多 Agent 协作系统...",
//     score: 1.0,
//     matchedKeywords: ["Agent", "协作"],
//     highlightedText: "AxonClaw 是一个强大的多 <mark>Agent</mark> <mark>协作</mark> 系统...",
//     matchPositions: [...]
//   }
// ]
```

### 对象数组搜索

```typescript
const documents = [
  {
    id: 1,
    title: "项目架构设计",
    content: "本项目采用微服务架构，包含 Gateway、Agent、Channel 三大核心模块。",
    createdAt: 1710316800000,
  },
  {
    id: 2,
    title: "多 Agent 协作机制",
    content: "Agent 之间通过消息队列进行通信，支持任务分发和结果聚合。",
    createdAt: 1710403200000,
  },
  {
    id: 3,
    title: "性能优化指南",
    content: "使用缓存技能可以显著提升系统响应速度，减少重复计算。",
    createdAt: 1710489600000,
  },
];

// 搜索包含 "Agent" 的文档
const results = search.search("Agent 通信", documents, {
  searchFields: ['title', 'content'],
  includeContext: true,
  contextLength: 30,
});

console.log(results);
// 输出:
// [
//   {
//     item: { id: 2, title: "多 Agent 协作机制", ... },
//     score: 0.85,
//     matchedKeywords: ["Agent"],
//     highlightedText: "多 <mark>Agent</mark> 协作机制...<mark>通信</mark>",
//     snippets: [
//       {
//         text: "...Agent 之间通过消息队列进行通信...",
//         start: 45,
//         end: 75,
//         hasPrefix: true,
//         hasSuffix: true
//       }
//     ],
//     id: 2,
//     timestamp: 1710403200000
//   }
// ]
```

### 索引搜索

```typescript
// 创建索引
search.createIndex(
  'docs',
  '文档索引',
  documents,
  ['title', 'content']
);

// 在索引中搜索
const results = search.searchInIndex('docs', '微服务架构', {
  limit: 10,
  sortBy: 'relevance',
});

// 更新索引
search.updateIndex('docs', newDocuments);

// 删除索引
search.deleteIndex('docs');

// 列出所有索引
const indices = search.listIndices();
```

---

## 功能 2: 关键词高亮

### 自定义高亮标签

```typescript
const text = "搜索技能支持内存搜索、关键词高亮和结果排序。";

const results = search.search("搜索", text, {
  highlightTag: 'em', // 使用 <em> 标签
});

console.log(results[0].highlightedText);
// 输出: "<em>搜索</em>技能支持内存<em>搜索</em>、关键词高亮和结果<em>排序</em>。"
```

### 高亮样式示例

```typescript
// CSS 样式
const styles = `
  mark {
    background-color: #fef08a;
    color: #854d0e;
    padding: 2px 4px;
    border-radius: 2px;
  }
  
  em.highlight {
    background-color: #bbf7d0;
    color: #166534;
    font-style: normal;
    padding: 2px 4px;
  }
  
  span.search-match {
    background: linear-gradient(120deg, #fbbf24 0%, #f59e0b 100%);
    color: white;
    padding: 2px 6px;
    border-radius: 3px;
    font-weight: bold;
  }
`;

// 使用自定义标签
const results = search.search("Agent", documents, {
  highlightTag: 'span class="search-match"',
});
```

### 获取匹配位置

```typescript
const results = search.search("协作", documents[0].content);

console.log(results[0].matchPositions);
// 输出:
// [
//   { start: 15, end: 17, keyword: "协作" }
// ]

// 可以用于自定义高亮渲染
const positions = results[0].matchPositions;
positions.forEach(pos => {
  console.log(`找到 "${pos.keyword}" 在位置 ${pos.start}-${pos.end}`);
});
```

---

## 功能 3: 搜索结果排序

### 按相关性排序 (默认)

```typescript
const results = search.search("架构 设计 模块", documents, {
  sortBy: 'relevance',
  sortOrder: 'desc', // 相关性从高到低
});

// 匹配关键词越多的文档排名越高
```

### 按时间排序

```typescript
const results = search.search("项目", documents, {
  sortBy: 'time',
  sortOrder: 'desc', // 最新的在前
});

// 自动识别 timestamp/createdAt 字段
```

### 按字母顺序排序

```typescript
const results = search.search("指南", documents, {
  sortBy: 'alphabetical',
  sortOrder: 'asc', // A-Z
});
```

### 按长度排序

```typescript
const results = search.search("优化", documents, {
  sortBy: 'length',
  sortOrder: 'desc', // 长的在前
});
```

---

## 高级功能

### 模糊搜索 (容错)

```typescript
// 即使拼写错误也能找到结果
const results = search.fuzzySearch("Agetn 协做", documents, {
  threshold: 0.6, // 匹配阈值 (0-1)
  minScore: 0.5,
});

// 可以匹配到 "Agent 协作"
```

### 多条件搜索

```typescript
const results = search.multiSearch(
  ["微服务", "Agent", "缓存"],
  documents,
  {
    limit: 20,
    sortBy: 'relevance',
  }
);

// 合并多个查询的结果，去重后排序
```

### 短语搜索

```typescript
// 使用引号搜索完整短语
const results = search.search('"多 Agent 协作"', documents);

// 只匹配包含完整短语 "多 Agent 协作" 的内容
```

### 大小写敏感搜索

```typescript
const results = search.search("AGENT", documents, {
  caseSensitive: true,
});

// 只匹配大写的 "AGENT"
```

### 正则表达式搜索

```typescript
const search = new SearchSkill({
  enableRegex: true,
});

const results = search.search("Agent\\d+", documents, {
  useRegex: true,
});

// 匹配 "Agent1", "Agent2" 等
```

### 带上下文的片段

```typescript
const results = search.search("消息队列", documents, {
  includeContext: true,
  contextLength: 50, // 前后各 50 字符
});

console.log(results[0].snippets);
// 输出:
// [
//   {
//     text: "...Agent 之间通过<mark>消息队列</mark>进行通信...",
//     start: 35,
//     end: 85,
//     hasPrefix: true,
//     hasSuffix: true
//   }
// ]
```

### 限制结果数

```typescript
const results = search.search("项目", documents, {
  limit: 5,      // 最多返回 5 条结果
  minScore: 0.3, // 最低匹配分数
});
```

### 指定搜索字段

```typescript
const results = search.search("架构", documents, {
  searchFields: ['title'], // 只在 title 字段搜索
});

// 或者搜索嵌套字段
const results = search.search("内容", complexData, {
  searchFields: ['meta.title', 'content.body'],
});
```

---

## 完整示例

```typescript
import SearchSkill from './search-skill';

// 1. 初始化
const search = new SearchSkill({
  caseSensitive: false,
  defaultSortBy: 'relevance',
  maxResults: 100,
  minScore: 0.1,
});

// 2. 准备数据
const knowledgeBase = [
  {
    id: 'kb-001',
    title: 'AxonClaw 架构文档',
    content: 'AxonClaw 是基于 OpenClaw 的多 Agent 协作框架...',
    tags: ['架构', '设计', 'Agent'],
    createdAt: '2026-03-13',
  },
  {
    id: 'kb-002',
    title: '搜索技能使用说明',
    content: '搜索技能支持全文搜索、高亮和排序...',
    tags: ['搜索', '技能', '文档'],
    createdAt: '2026-03-13',
  },
  // ... 更多文档
];

// 3. 创建索引
search.createIndex('knowledge', '知识库', knowledgeBase, [
  'title',
  'content',
  'tags',
]);

// 4. 执行搜索
function searchKnowledge(query: string) {
  const results = search.searchInIndex('knowledge', query, {
    limit: 10,
    includeContext: true,
    contextLength: 50,
    highlightTag: 'mark',
  });

  return results.map(r => ({
    id: r.id,
    title: (r.item as any).title,
    score: r.score,
    snippet: r.snippets?.[0]?.text || r.highlightedText,
    matchedKeywords: r.matchedKeywords,
  }));
}

// 5. 使用
const query = 'Agent 协作 搜索';
const results = searchKnowledge(query);

console.log(`找到 ${results.length} 条结果:`);
results.forEach((r, i) => {
  console.log(`${i + 1}. [${r.score.toFixed(2)}] ${r.title}`);
  console.log(`   匹配：${r.matchedKeywords.join(', ')}`);
  console.log(`   片段：${r.snippet}`);
  console.log('');
});
```

---

## 性能提示

1. **使用索引**: 对于大数据集，先创建索引再搜索
2. **限制结果**: 设置合理的 `limit` 和 `minScore`
3. **指定字段**: 使用 `searchFields` 减少搜索范围
4. **缓存结果**: 对热门查询缓存搜索结果

```typescript
// 缓存示例
const cache = new Map<string, any[]>();

function cachedSearch(query: string) {
  if (cache.has(query)) {
    return cache.get(query);
  }
  
  const results = search.search(query, largeDataset, { limit: 20 });
  cache.set(query, results);
  
  // 限制缓存大小
  if (cache.size > 100) {
    const firstKey = cache.keys().next().value;
    cache.delete(firstKey);
  }
  
  return results;
}
```

---

## API 参考

### SearchSkill 构造函数

```typescript
new SearchSkill(config?: {
  caseSensitive: boolean;      // 大小写敏感
  enableRegex: boolean;        // 启用正则
  defaultSortBy: SortBy;       // 默认排序方式
  defaultSortOrder: SortOrder; // 默认排序方向
  maxResults: number;          // 最大结果数
  minScore: number;            // 最小匹配分数
})
```

### 主要方法

| 方法 | 描述 |
|------|------|
| `search(query, data, options)` | 全文搜索 |
| `searchInIndex(indexId, query, options)` | 在索引中搜索 |
| `createIndex(id, name, data, fields)` | 创建索引 |
| `updateIndex(id, data)` | 更新索引 |
| `deleteIndex(id)` | 删除索引 |
| `listIndices()` | 列出所有索引 |
| `fuzzySearch(query, data, options)` | 模糊搜索 |
| `multiSearch(queries, data, options)` | 多条件搜索 |

### SearchOptions

```typescript
{
  caseSensitive?: boolean;   // 大小写敏感
  useRegex?: boolean;        // 使用正则
  sortBy?: SortBy;           // 排序方式
  sortOrder?: SortOrder;     // 排序方向
  limit?: number;            // 结果限制
  minScore?: number;         // 最小分数
  highlightTag?: string;     // 高亮标签
  searchFields?: string[];   // 搜索字段
  includeContext?: boolean;  // 包含上下文
  contextLength?: number;    // 上下文长度
  threshold?: number;        // 模糊匹配阈值
}
```

---

**作者**: Axon  
**版本**: 1.0.0  
**最后更新**: 2026-03-13
