# Skill Discovery System - 技能发现系统

🜏 自动发现、注册、搜索和管理技能的完整解决方案

---

## 📋 功能概览

### 1. 技能扫描 🔍
- 递归扫描 `skills/` 目录
- 自动识别包含 `SKILL.md` 的技能包
- 解析技能元数据 (名称、描述、标签、分类)
- 支持自定义扫描深度

### 2. 技能注册 📝
- 自动注册技能到系统
- 生成技能索引 (JSON 格式)
- 支持启用/禁用技能
- 持久化索引到文件

### 3. 技能搜索 🔎
- **按名称搜索** - 查找技能名称包含关键词
- **按标签搜索** - 根据技能标签筛选
- **按功能搜索** - 搜索描述中的功能说明
- **综合搜索** - 同时搜索名称、标签和描述

### 4. 技能文档 📄
- 自动生成技能列表文档 (Markdown)
- 包含使用说明和示例代码
- 按分类组织技能
- 支持自定义文档模板

---

## 🚀 快速开始

### 基础使用

```typescript
import { SkillDiscovery } from './skill-discovery';

// 1. 创建发现器
const discovery = new SkillDiscovery({
  skillsRootDir: '/path/to/skills',
});

// 2. 扫描技能
const packages = await discovery.scanSkills();
console.log(`发现 ${packages.length} 个技能包`);

// 3. 生成索引
const index = await discovery.generateIndex();
console.log(`索引包含 ${index.totalSkills} 个技能`);

// 4. 搜索技能
const results = discovery.search('API', 'all');
console.log(`找到 ${results.total} 个结果`);

// 5. 生成文档
await discovery.generateDocumentation();
```

### 便捷函数

```typescript
import { quickScan, quickSearch } from './skill-discovery';

// 快速扫描
const index = await quickScan('/path/to/skills');

// 快速搜索
const results = await quickSearch('/path/to/skills', 'Agent', 'all');
```

---

## 📖 API 参考

### SkillDiscovery 类

#### 构造函数

```typescript
new SkillDiscovery(config: SkillDiscoveryConfig)
```

**配置参数:**

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `skillsRootDir` | string | ✅ | - | 技能根目录 |
| `indexPath` | string | ❌ | `skill-index.json` | 索引文件路径 |
| `scanSubDirs` | boolean | ❌ | `true` | 是否扫描子目录 |
| `maxDepth` | number | ❌ | `5` | 最大扫描深度 |
| `generateDocs` | boolean | ❌ | `true` | 是否生成文档 |
| `docsOutputPath` | string | ❌ | `SKILLS-LIST.md` | 文档输出路径 |

#### 核心方法

##### scanSkills()

扫描技能目录，识别所有技能包。

```typescript
const packages = await discovery.scanSkills();
// 可选：扫描自定义目录
const customPackages = await discovery.scanSkills('/custom/path');
```

**返回:** `Promise<SkillPackage[]>`

##### generateIndex()

生成技能索引，包含名称、标签、分类等索引。

```typescript
const index = await discovery.generateIndex();
console.log(`总技能数：${index.totalSkills}`);
console.log(`标签数：${Object.keys(index.byTag).length}`);
console.log(`分类数：${Object.keys(index.byCategory).length}`);
```

**返回:** `Promise<SkillIndex>`

##### saveIndex() / loadIndex()

保存和加载索引文件。

```typescript
// 保存
await discovery.saveIndex();

// 加载
const loadedIndex = await discovery.loadIndex();
if (loadedIndex) {
  console.log(`加载了 ${loadedIndex.totalSkills} 个技能`);
}
```

##### search()

搜索技能，支持多种搜索类型。

```typescript
// 按名称搜索
const byName = discovery.searchByName('api');

// 按标签搜索
const byTag = discovery.searchByTag('API');

// 按功能搜索
const byFunc = discovery.searchByFunction('设计');

// 综合搜索
const all = discovery.search('Agent', 'all');
```

**返回:** `SearchResults` 或 `SkillIndexItem[]`

##### generateDocumentation()

生成技能列表文档 (Markdown 格式)。

```typescript
const doc = await discovery.generateDocumentation();
console.log(doc); // Markdown 文档内容
```

**返回:** `Promise<string>`

##### 技能管理

```typescript
// 获取所有技能
const allSkills = discovery.getAllSkills();

// 获取启用的技能
const enabledSkills = discovery.getEnabledSkills();

// 获取技能详情
const detail = discovery.getSkillDetail('api-design');

// 启用/禁用技能
discovery.setSkillEnabled('api-design', false);
discovery.setSkillEnabled('api-design', true);
```

---

## 📦 数据结构

### SkillPackage

```typescript
interface SkillPackage {
  path: string;              // 技能目录路径
  skillMdPath: string;       // SKILL.md 文件路径
  metadata: SkillMetadata | null;  // 解析后的元数据
  parsed: boolean;           // 是否已解析
  error?: string;            // 解析错误信息
}
```

### SkillMetadata

```typescript
interface SkillMetadata {
  name: string;              // 技能名称
  description: string;       // 技能描述
  metadata?: {
    openclaw?: {
      emoji?: string;        // Emoji 图标
      project?: string;      // 项目路径
    };
  };
  tags?: string[];           // 技能标签 (自动提取)
  category?: string;         // 技能分类 (自动提取)
  trigger?: string;          // 触发条件 (自动提取)
}
```

### SkillIndex

```typescript
interface SkillIndex {
  version: string;           // 索引版本
  generatedAt: number;       // 生成时间
  totalSkills: number;       // 技能总数
  enabledCount: number;      // 启用的技能数
  skills: SkillIndexItem[];  // 技能列表
  byName: Record<string, SkillIndexItem>;      // 按名称索引
  byTag: Record<string, SkillIndexItem[]>;     // 按标签索引
  byCategory: Record<string, SkillIndexItem[]>; // 按分类索引
}
```

### SearchResults

```typescript
interface SearchResults {
  query: string;             // 搜索关键词
  searchType: 'name' | 'tag' | 'description' | 'all';  // 搜索类型
  matches: SkillIndexItem[]; // 匹配结果
  total: number;             // 结果总数
}
```

---

## 🎯 使用场景

### 场景 1: 启动时自动加载技能

```typescript
// 应用启动时
async function initializeSkills() {
  const discovery = new SkillDiscovery({
    skillsRootDir: '/path/to/skills',
    indexPath: '/path/to/skill-index.json',
  });

  // 尝试加载已保存的索引
  let index = await discovery.loadIndex();
  
  if (!index) {
    // 首次运行，扫描并生成索引
    await discovery.scanSkills();
    index = await discovery.generateIndex();
    await discovery.saveIndex();
  }

  return discovery;
}
```

### 场景 2: 技能市场/商店

```typescript
// 显示所有可用技能
function renderSkillMarket() {
  const skills = discovery.getAllSkills();
  
  // 按分类组织
  const categories = Object.entries(discovery.getIndex().byCategory);
  
  categories.forEach(([category, categorySkills]) => {
    console.log(`## ${category}`);
    categorySkills.forEach(skill => {
      console.log(`- ${skill.emoji} ${skill.name}: ${skill.description}`);
    });
  });
}
```

### 场景 3: 智能技能推荐

```typescript
// 根据用户行为推荐技能
function recommendSkills(userQuery: string) {
  // 搜索相关技能
  const results = discovery.search(userQuery, 'all');
  
  // 按相关性排序
  const recommendations = results.matches
    .filter(skill => skill.enabled)
    .sort((a, b) => {
      // 优先推荐名称匹配的
      if (a.name.includes(userQuery)) return -1;
      if (b.name.includes(userQuery)) return 1;
      return 0;
    });
  
  return recommendations.slice(0, 5); // 返回前 5 个
}
```

### 场景 4: 技能启用/禁用管理

```typescript
// 用户设置界面
function toggleSkill(skillName: string, enabled: boolean) {
  const success = discovery.setSkillEnabled(skillName, enabled);
  
  if (success) {
    console.log(`技能 ${skillName} 已${enabled ? '启用' : '禁用'}`);
    
    // 重新生成索引
    discovery.saveIndex();
  }
}
```

---

## 🧪 测试

运行测试:

```bash
# 运行简单测试
node src/renderer/skills/test-discovery.js

# 运行完整测试 (需要 tsx)
npx tsx src/renderer/skills/demo-skill-discovery.ts
```

测试覆盖:
- ✅ 技能扫描
- ✅ 元数据解析
- ✅ 索引生成
- ✅ 搜索功能
- ✅ 文档生成
- ✅ 技能管理

---

## 📝 示例输出

### 扫描结果

```
📦 步骤 1: 扫描技能目录...
✅ 发现 24 个 SKILL.md 文件

📋 步骤 2: 解析技能元数据...
✅ 成功解析 24 个技能

📂 步骤 3: 技能分类:
  开发：8 个技能
  产品：2 个技能
  AI: 6 个技能
  增长：2 个技能
  战略：1 个技能
  工程：1 个技能
  内容：1 个技能
  技术设计：1 个技能
  其他：2 个技能
```

### 搜索结果

```
🔍 搜索 "API":
  找到 2 个结果
  - api-design
  - chromadb-memory

🔍 搜索 "Agent":
  找到 6 个结果
  - axon-orchestrator
  - axon-proactive
  - axon-supreme
  - axonclaw
  - proactive-agent
  - self-evolving
```

---

## 🔧 高级配置

### 自定义扫描深度

```typescript
const discovery = new SkillDiscovery({
  skillsRootDir: '/path/to/skills',
  maxDepth: 10,  // 增加扫描深度
});
```

### 禁用自动文档生成

```typescript
const discovery = new SkillDiscovery({
  skillsRootDir: '/path/to/skills',
  generateDocs: false,  // 不生成文档
});
```

### 自定义索引和文档路径

```typescript
const discovery = new SkillDiscovery({
  skillsRootDir: '/path/to/skills',
  indexPath: '/custom/path/skill-index.json',
  docsOutputPath: '/custom/path/SKILLS.md',
});
```

---

## 🎨 最佳实践

### 1. 索引缓存

```typescript
// 优先使用缓存的索引
async function getDiscovery() {
  const discovery = new SkillDiscovery({
    skillsRootDir: SKILLS_DIR,
  });

  const cachedIndex = await discovery.loadIndex();
  
  if (cachedIndex) {
    return discovery;  // 使用缓存
  }

  // 首次运行，生成新索引
  await discovery.scanSkills();
  await discovery.generateIndex();
  await discovery.saveIndex();
  
  return discovery;
}
```

### 2. 增量更新

```typescript
// 定期检查技能变化
async function refreshSkillsIfNeeded() {
  const discovery = await getDiscovery();
  const index = discovery.getIndex();
  
  // 检查索引是否过期 (例如 24 小时)
  const isExpired = Date.now() - index.generatedAt > 24 * 60 * 60 * 1000;
  
  if (isExpired) {
    await discovery.scanSkills();
    await discovery.generateIndex();
    await discovery.saveIndex();
  }
}
```

### 3. 错误处理

```typescript
try {
  const discovery = new SkillDiscovery({
    skillsRootDir: '/path/to/skills',
  });

  await discovery.scanSkills();
  await discovery.generateIndex();
} catch (error) {
  console.error('技能发现失败:', error);
  // 使用默认技能列表或降级方案
}
```

---

## 📚 相关文件

- `skill-discovery.ts` - 核心实现
- `skill-discovery.test.ts` - 单元测试
- `demo-skill-discovery.ts` - 演示脚本
- `test-discovery.js` - 简单测试
- `SKILLS-LIST.md` - 生成的技能列表文档
- `skill-index.json` - 生成的索引文件 (运行时生成)

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request!

---

**版本**: 1.0.0  
**作者**: AxonClaw Team  
**许可证**: MIT
