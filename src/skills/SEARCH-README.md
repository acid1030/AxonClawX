# Search Skill - 搜索技能

> 全文搜索功能 | 内存搜索 | 关键词高亮 | 智能排序

---

## 📦 交付物

| 文件 | 描述 | 大小 |
|------|------|------|
| `search-skill.ts` | 搜索技能核心实现 | ~17KB |
| `search-skill.examples.md` | 详细使用示例 | ~9KB |
| `search-skill.test.ts` | 功能测试文件 | ~6KB |
| `SEARCH-README.md` | 本文档 | - |

---

## ✨ 核心功能

### 1. 内存搜索 🔍
- ✅ 全文搜索支持
- ✅ 对象数组搜索
- ✅ 索引管理 (创建/更新/删除)
- ✅ 短语搜索 (引号包裹)
- ✅ 模糊搜索 (容错匹配)
- ✅ 多条件搜索

### 2. 关键词高亮 🎯
- ✅ 自定义高亮标签
- ✅ 匹配位置追踪
- ✅ 重叠位置合并
- ✅ 片段上下文提取

### 3. 搜索结果排序 📊
- ✅ 按相关性排序
- ✅ 按时间排序
- ✅ 按字母顺序排序
- ✅ 按长度排序
- ✅ 升序/降序控制

---

## 🚀 快速开始

```typescript
import SearchSkill from './search-skill';

// 1. 创建实例
const search = new SearchSkill({
  caseSensitive: false,
  defaultSortBy: 'relevance',
  maxResults: 100,
});

// 2. 准备数据
const documents = [
  { id: 1, title: '项目架构', content: '微服务架构设计...' },
  { id: 2, title: 'Agent 协作', content: '多 Agent 通信机制...' },
];

// 3. 搜索
const results = search.search('Agent 通信', documents, {
  searchFields: ['title', 'content'],
  includeContext: true,
});

// 4. 处理结果
results.forEach(r => {
  console.log(`${r.item.title} - 分数：${r.score.toFixed(2)}`);
  console.log(r.highlightedText);
});
```

---

## 📖 API 参考

### 构造函数配置

```typescript
new SearchSkill(config?: {
  caseSensitive: boolean;      // 大小写敏感 (默认 false)
  enableRegex: boolean;        // 启用正则 (默认 false)
  defaultSortBy: SortBy;       // 默认排序方式
  defaultSortOrder: SortOrder; // 默认排序方向
  maxResults: number;          // 最大结果数 (默认 100)
  minScore: number;            // 最小匹配分数 (默认 0.1)
})
```

### 主要方法

| 方法 | 参数 | 返回 | 描述 |
|------|------|------|------|
| `search` | `(query, data, options?)` | `SearchResult[]` | 全文搜索 |
| `searchInIndex` | `(indexId, query, options?)` | `SearchResult[]` | 索引搜索 |
| `createIndex` | `(id, name, data, fields?)` | `SearchIndex` | 创建索引 |
| `updateIndex` | `(id, data)` | `boolean` | 更新索引 |
| `deleteIndex` | `(id)` | `boolean` | 删除索引 |
| `listIndices` | `()` | `SearchIndex[]` | 列出索引 |
| `fuzzySearch` | `(query, data, options?)` | `SearchResult[]` | 模糊搜索 |
| `multiSearch` | `(queries, data, options?)` | `SearchResult[]` | 多条件搜索 |

### 搜索选项

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

### 搜索结果

```typescript
interface SearchResult<T> {
  item: T;                    // 原始数据
  score: number;              // 匹配分数 (0-1)
  matchedKeywords: string[];  // 匹配的关键词
  highlightedText?: string;   // 高亮文本
  snippets?: SearchSnippet[]; // 匹配片段
  matchPositions?: MatchPosition[]; // 匹配位置
  id?: string | number;       // 数据 ID
  timestamp?: number;         // 时间戳
}
```

---

## 🎯 使用场景

### 场景 1: 文档搜索

```typescript
const search = new SearchSkill();
search.createIndex('docs', '文档库', documents, ['title', 'content']);

const results = search.searchInIndex('docs', '架构设计', {
  limit: 10,
  includeContext: true,
});
```

### 场景 2: 聊天记录搜索

```typescript
const results = search.search('任务分发', messages, {
  searchFields: ['sender', 'content'],
  sortBy: 'time',
  sortOrder: 'desc',
});
```

### 场景 3: 代码搜索

```typescript
const results = search.search('function init', codeFiles, {
  searchFields: ['filename', 'code'],
  highlightTag: 'span class="match"',
  contextLength: 100,
});
```

### 场景 4: 模糊匹配

```typescript
// 用户输入有拼写错误
const results = search.fuzzySearch('微服物架构', documents, {
  threshold: 0.6,
  searchFields: ['title', 'content'],
});
// 可以找到 "微服务架构"
```

---

## 🧪 运行测试

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/search-skill.test.ts
```

测试覆盖:
- ✅ 基础文本搜索
- ✅ 对象数组搜索
- ✅ 索引搜索
- ✅ 搜索结果排序
- ✅ 关键词高亮
- ✅ 模糊搜索
- ✅ 多条件搜索
- ✅ 自定义配置

---

## 📈 性能建议

1. **使用索引**: 大数据集先创建索引
2. **限制结果**: 设置合理的 `limit` 和 `minScore`
3. **指定字段**: 使用 `searchFields` 减少搜索范围
4. **缓存热门查询**: 对重复查询缓存结果

```typescript
// 缓存示例
const cache = new Map();

function cachedSearch(query: string) {
  if (cache.has(query)) return cache.get(query);
  const results = search.search(query, data, { limit: 20 });
  cache.set(query, results);
  return results;
}
```

---

## 🔧 扩展建议

- [ ] 添加正则表达式搜索支持
- [ ] 支持布尔逻辑 (AND/OR/NOT)
- [ ] 添加拼音搜索支持
- [ ] 支持外部存储 (Redis/Elasticsearch)
- [ ] 添加搜索结果分页
- [ ] 支持搜索结果聚合

---

## 📝 更新日志

### v1.0.0 (2026-03-13)
- ✅ 初始版本发布
- ✅ 内存搜索功能
- ✅ 关键词高亮
- ✅ 多维度排序
- ✅ 模糊搜索
- ✅ 索引管理

---

**作者**: Axon  
**项目**: AxonClaw  
**版本**: 1.0.0  
**完成时间**: 2026-03-13 16:37

---

## 📚 相关文档

- [使用示例](./search-skill.examples.md) - 详细使用示例
- [测试文件](./search-skill.test.ts) - 功能测试代码
- [源码](./search-skill.ts) - 完整实现
