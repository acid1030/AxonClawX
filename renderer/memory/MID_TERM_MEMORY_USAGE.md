# L2 Mid-term Memory - 使用文档

## 概述

L2 中期记忆系统提供基于文件系统的中等时长记忆存储，填补了 L1 短期工作记忆和 L3 长期向量记忆之间的空白。

### 核心特性

- ✅ **7 天保留期**：自动保留最近 7 天的文件变更（可配置）
- ✅ **时间戳过滤**：基于文件修改时间的智能过期机制
- ✅ **多条件检索**：支持按路径、文件类型、标签、关键词检索
- ✅ **L1/L2 集成**：通过 `IntegratedMemoryManager` 统一管理
- ✅ **持久化存储**：自动保存到磁盘，重启不丢失
- ✅ **自动清理**：定期清理过期条目，保持存储高效

---

## 快速开始

### 基础使用

```typescript
import { MidTermMemory } from '@/renderer/memory/mid-term';

// 创建实例
const memory = new MidTermMemory({
  storagePath: '/path/to/storage',  // 可选，默认：.memory/mid-term
  retentionDays: 7,                  // 保留天数
  maxFileSize: 1024 * 1024,         // 最大文件大小 (1MB)
  autoCleanup: true,                 // 自动清理过期条目
});

// 添加文件到记忆
const testPath = '/path/to/file.ts';
const content = fs.readFileSync(testPath, 'utf-8');

const id = memory.addFile(testPath, content, ['important', 'code']);
console.log('Memory ID:', id);

// 获取记忆条目
const entry = memory.getEntry(id);
console.log('File type:', entry?.fileType);
console.log('Modified at:', new Date(entry?.fileModifiedAt || 0));

// 查询记忆
const tsFiles = memory.query({
  fileType: 'ts',
  limit: 10,
});

// 搜索关键词
const results = memory.search('console.log', 5);

// 获取最近 7 天的文件
const recent = memory.getRecent(7);
```

### 从磁盘添加文件

```typescript
// 自动读取文件并添加到记忆
const id = memory.addFileFromDisk('/path/to/file.ts', ['project']);

// 仅存储前 10KB（摘要模式）
const excerptId = memory.addFileFromDisk('/large/file.md', ['doc'], true);
```

---

## 高级查询

### 按文件类型检索

```typescript
// 获取所有 TypeScript 文件
const tsFiles = memory.getByType('ts');

// 获取所有 CSS 文件
const cssFiles = memory.getByType('css');
```

### 按路径模式检索

```typescript
// 获取 src 目录下的所有文件
const srcFiles = memory.getByPath('src/');

// 获取包含 "components" 路径的文件
const componentFiles = memory.getByPath('components');
```

### 按标签检索

```typescript
// 获取带有特定标签的文件
const importantFiles = memory.query({
  tags: ['important'],
});

// 获取同时具有多个标签的文件
const criticalFiles = memory.query({
  tags: ['important', 'critical'],
});
```

### 按时间范围检索

```typescript
const now = Date.now();
const oneDayAgo = now - (24 * 60 * 60 * 1000);

// 获取最近 24 小时修改的文件
const todayFiles = memory.query({
  modifiedAfter: oneDayAgo,
});

// 获取特定时间范围的文件
const rangeFiles = memory.query({
  modifiedAfter: now - (7 * 24 * 60 * 60 * 1000),
  modifiedBefore: now - (2 * 24 * 60 * 60 * 1000),
});
```

### 组合查询

```typescript
// 获取 src 目录下最近修改的 TypeScript 文件
const results = memory.query({
  pathPattern: 'src/',
  fileType: 'ts',
  modifiedAfter: Date.now() - (3 * 24 * 60 * 60 * 1000),
  limit: 5,
});
```

---

## 与 L1 集成

### 使用 IntegratedMemoryManager

```typescript
import { IntegratedMemoryManager } from '@/renderer/memory/mid-term';
import { ShortTermMemory } from '@/renderer/memory/short-term';

// 创建统一记忆管理器
const manager = new IntegratedMemoryManager(
  { maxMessages: 10 },  // L1 配置
  {                    // L2 配置
    storagePath: '.memory/mid-term',
    retentionDays: 7,
  }
);

// 添加消息到 L1，同时捕获文件引用到 L2
const filePath = '/path/to/mentioned/file.ts';
manager.addMessage(
  {
    role: 'user',
    content: 'Check this file for bugs',
    timestamp: Date.now(),
  },
  [filePath]  // 自动将文件添加到 L2
);

// 获取统一上下文
const context = manager.getContext({
  l1Limit: 5,
  l2Query: {
    fileType: 'ts',
    limit: 3,
  },
});

console.log(context);
// 输出:
// === Recent Conversation (L1) ===
// [最近对话内容]
//
// === Relevant Files (L2) ===
// 📄 /path/to/file.ts
//    Type: ts | Modified: 2026-03-13 12:00:00
```

### 跨层搜索

```typescript
// 同时在 L1 和 L2 中搜索
const results = manager.search('authentication');

console.log('L1 results:', results.l1.length);  // 对话中的提及
console.log('L2 results:', results.l2.length);  // 文件中的提及
```

---

## 文件过滤

### 包含/排除特定扩展名

```typescript
// 只包含特定类型
const codeOnly = new MidTermMemory({
  includeExtensions: ['.ts', '.tsx', '.js', '.jsx'],
});

// 排除特定类型
const noTemp = new MidTermMemory({
  excludeExtensions: ['.tmp', '.log', '.bak'],
});

// 组合使用
const filtered = new MidTermMemory({
  includeExtensions: ['.ts', '.tsx'],
  excludeExtensions: ['.test.ts', '.spec.ts'],
});
```

---

## 持久化与导入导出

### 自动持久化

```typescript
// 所有操作自动保存到磁盘
memory.addFile('/path/file.ts', 'content');

// 重启后自动恢复
const memory2 = new MidTermMemory({
  storagePath: '.memory/mid-term',
});
// memory2 包含之前的所有条目
```

### 手动导出

```typescript
// 导出为 JSON
const exported = memory.export();
fs.writeFileSync('backup.json', JSON.stringify(exported, null, 2));
```

### 导入数据

```typescript
// 从 JSON 导入
const data = JSON.parse(fs.readFileSync('backup.json', 'utf-8'));
memory.import(data);
```

---

## 清理与维护

### 手动清理过期条目

```typescript
// 清理超过保留期的条目
const removed = memory.cleanupExpired();
console.log(`Removed ${removed} expired entries`);
```

### 清空所有记忆

```typescript
memory.clear();
```

### 删除单个条目

```typescript
const success = memory.remove('file_abc123');
```

---

## 统计信息

```typescript
const stats = memory.getStats();

console.log('Total entries:', stats.totalEntries);
console.log('Storage size:', stats.storageSize, 'bytes');
console.log('Oldest entry:', new Date(stats.oldestEntry));
console.log('Newest entry:', new Date(stats.newestEntry));
console.log('By type:', stats.entriesByType);
// 输出示例：
// { ts: 15, md: 3, css: 2, json: 5 }
```

---

## 单例模式

```typescript
import { getMidTermMemory, resetMidTermMemory } from '@/renderer/memory/mid-term';

// 获取全局单例
const memory = getMidTermMemory({
  storagePath: '.memory/mid-term',
});

// 重置单例（测试时使用）
resetMidTermMemory();
```

---

## 配置选项

### MidTermMemoryConfig

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `storagePath` | `string` | `.memory/mid-term` | 存储目录路径 |
| `retentionDays` | `number` | `7` | 保留天数 |
| `maxFileSize` | `number` | `1048576` (1MB) | 最大文件大小（字节） |
| `autoCleanup` | `boolean` | `true` | 自动清理过期条目 |
| `includeExtensions` | `string[]` | `undefined` | 包含的扩展名列表 |
| `excludeExtensions` | `string[]` | `undefined` | 排除的扩展名列表 |

### FileMemoryQuery

| 选项 | 类型 | 说明 |
|------|------|------|
| `pathPattern` | `string` | 路径模式匹配 |
| `fileType` | `string` | 文件扩展名（不含点） |
| `tags` | `string[]` | 标签过滤 |
| `modifiedAfter` | `number` | 修改时间起始（时间戳） |
| `modifiedBefore` | `number` | 修改时间结束（时间戳） |
| `createdAfter` | `number` | 创建时间起始（时间戳） |
| `createdBefore` | `number` | 创建时间结束（时间戳） |
| `keyword` | `string` | 内容关键词搜索 |
| `limit` | `number` | 最大结果数 |

---

## 最佳实践

### 1. 合理设置保留期

```typescript
// 开发环境：保留 7 天
const devMemory = new MidTermMemory({ retentionDays: 7 });

// 生产环境：保留 30 天
const prodMemory = new MidTermMemory({ retentionDays: 30 });
```

### 2. 使用标签分类

```typescript
// 添加时标记重要文件
memory.addFile('/src/core/auth.ts', content, ['core', 'security', 'critical']);

// 快速检索关键文件
const critical = memory.query({ tags: ['critical'] });
```

### 3. 限制文件大小

```typescript
// 避免存储过大的文件
const memory = new MidTermMemory({
  maxFileSize: 512 * 1024, // 512KB
});

// 大文件使用摘要模式
memory.addFileFromDisk('/large/log.txt', ['log'], true);
```

### 4. 定期清理

```typescript
// 在应用启动时清理过期条目
const memory = new MidTermMemory({
  autoCleanup: true,  // 自动清理
});

// 或手动定期清理
setInterval(() => {
  memory.cleanupExpired();
}, 24 * 60 * 60 * 1000); // 每天清理一次
```

### 5. 与 L1 配合使用

```typescript
// 对话中提到的重要文件自动保存到 L2
manager.addMessage(message, [mentionedFilePath]);

// 检索时同时获取对话上下文和相关文件
const context = manager.getContext({
  l2Query: { tags: ['conversation-reference'] },
});
```

---

## 测试

运行单元测试：

```bash
npm test -- mid-term
```

测试覆盖：
- ✅ 初始化和配置
- ✅ 文件添加和元数据存储
- ✅ 文件大小和扩展名过滤
- ✅ 条目检索和更新
- ✅ 多条件查询
- ✅ 时间范围过滤
- ✅ 清理和过期处理
- ✅ 持久化和导入导出
- ✅ 统计信息
- ✅ L1/L2 集成
- ✅ 单例模式

---

## 架构位置

```
src/renderer/
├── memory/
│   ├── types.ts              # 类型定义 (L3)
│   ├── short-term.ts         # L1: 短期记忆
│   ├── mid-term.ts           # L2: 中期记忆 ⭐
│   ├── vector-memory.ts      # L3: 长期记忆
│   ├── index.ts              # 统一导出
│   ├── mid-term.test.ts      # L2 测试
│   └── README.md             # 本文档
```

---

## 故障排除

### 问题：文件未保存到记忆

**检查：**
1. 文件大小是否超过 `maxFileSize`
2. 扩展名是否在 `excludeExtensions` 列表中
3. 扩展名是否在 `includeExtensions` 列表中（如果指定）

### 问题：查询结果为空

**检查：**
1. 时间戳是否正确（使用毫秒时间戳）
2. 文件类型是否匹配（不含点，如 `ts` 而非 `.ts`）
3. 标签是否完全匹配（区分大小写）

### 问题：持久化不生效

**检查：**
1. `storagePath` 是否有写入权限
2. 检查控制台错误日志
3. 确认 `saveIndex()` 成功执行

---

## 性能考虑

- **添加文件**: O(1) + 磁盘 I/O
- **检索条目**: O(1)
- **查询**: O(n)，n 为条目总数
- **清理**: O(n)
- **持久化**: O(n)，序列化所有条目

对于大量文件（>1000 条），建议：
1. 使用更精确的查询过滤
2. 定期清理过期条目
3. 限制 `maxFileSize` 减少存储占用

---

## 相关文档

- [短期记忆实现](./SHORT_TERM_MEMORY_IMPLEMENTATION.md)
- [ChromaDB 向量记忆](./README.md)
- [记忆架构优化](../../../MEMORY_ARCHITECTURE_OPTIMIZATION.md)

---

**最后更新**: 2026-03-13
**版本**: 1.0
