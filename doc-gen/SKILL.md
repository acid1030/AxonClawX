# doc-gen 技能

API 文档自动生成技能。用于从 TypeScript 代码中提取 API 签名和 JSDoc 注释，生成结构化的 Markdown 文档。

## 使用方式

### 作为 CLI 工具

```bash
# 解析整个目录
npx ts-node skills/doc-gen/doc-generator.ts ./src

# 指定输出文件
npx ts-node skills/doc-gen/doc-generator.ts ./src -o docs/api.md

# 自定义标题
npx ts-node skills/doc-gen/doc-generator.ts ./src -t "我的 API 文档"

# 排除某些目录
npx ts-node skills/doc-gen/doc-generator.ts ./src --exclude node_modules,dist,test

# 不生成目录索引
npx ts-node skills/doc-gen/doc-generator.ts ./src --no-index
```

### 作为模块导入

```typescript
import { DocGenerator } from './skills/doc-gen/doc-generator';

const generator = new DocGenerator();

// 解析单个文件
generator.parseFile('./src/utils/user.ts');

// 或解析整个目录
generator.parseDirectory('./src', ['node_modules', 'dist', 'test']);

// 生成 Markdown
const markdown = generator.generateMarkdown({
  title: 'API 文档',
  includeIndex: true,
});

// 保存到文件
generator.saveToFile('./docs/api.md', {
  title: '我的项目 API',
  includeIndex: true,
});

// 获取原始文档数据
const docs = generator.getDocs();
```

## 功能

### 1. 代码分析

- ✅ 解析 TypeScript 文件 (.ts, .tsx)
- ✅ 提取函数声明和签名
- ✅ 提取类声明和方法
- ✅ 提取接口定义
- ✅ 提取变量声明 (箭头函数)
- ✅ 提取 JSDoc 注释

### 2. 文档生成

- ✅ 生成 Markdown 格式文档
- ✅ 自动创建目录索引
- ✅ 包含参数说明和类型
- ✅ 包含返回值说明
- ✅ 包含代码示例

### 3. 输出格式

```markdown
# API 文档

## 目录

- [addUser](#adduser)
- [UserService](#userservice)

---

## addUser(user: User): Promise<User>

添加新用户到系统

**参数**:
- `user` - User - 用户对象

**返回**:
- `Promise<User>` - 新创建的用户

**示例**:

```typescript
const user = await addUser({ name: 'John' });
```

---
```

## 支持的 JSDoc 标签

- `@description` - 函数/类描述
- `@param` - 参数说明
- `@returns` / `@return` - 返回值说明
- `@example` - 代码示例

## 示例代码

### 输入 TypeScript 文件

```typescript
/**
 * 添加新用户到系统
 * 
 * @param user - 用户对象，包含 name 和 email
 * @returns 新创建的用户
 * 
 * @example
 * ```typescript
 * const user = await addUser({ name: 'John', email: 'john@example.com' });
 * ```
 */
export async function addUser(user: User): Promise<User> {
  // 实现...
}

/**
 * 用户服务类
 * 提供用户相关的 CRUD 操作
 */
export class UserService {
  /**
   * 根据 ID 查找用户
   * @param id - 用户 ID
   * @returns 用户对象或 undefined
   */
  findById(id: string): User | undefined {
    // 实现...
  }
}
```

### 生成的文档

```markdown
# API 文档

## addUser(user: User): Promise<User>

添加新用户到系统

**参数**:
- `user` - User - 用户对象，包含 name 和 email

**返回**:
- `Promise<User>` - 新创建的用户

**示例**:

```typescript
const user = await addUser({ name: 'John', email: 'john@example.com' });
```

---

## UserService

用户服务类 提供用户相关的 CRUD 操作

---

## UserService.findById(id: string): User | undefined

根据 ID 查找用户

**参数**:
- `id` - string - 用户 ID

**返回**:
- `User | undefined` - 用户对象或 undefined

---
```

## 依赖

需要安装 TypeScript:

```bash
npm install -D typescript ts-node
# 或
uv pip install typescript ts-node
```

## 注意事项

- 自动跳过测试文件 (.test.ts, .spec.ts)
- 自动跳过类型声明文件 (.d.ts)
- 默认排除 node_modules, dist, test 目录
- 需要有效的 JSDoc 注释才能生成完整文档

## 文件结构

```
skills/doc-gen/
├── doc-generator.ts    # 核心实现
├── SKILL.md           # 技能说明 (本文件)
└── examples/          # 示例 (可选)
```
