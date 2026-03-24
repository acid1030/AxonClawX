# Test Generator - 单元测试生成器

🚀 自动生成 TypeScript/JavaScript 代码的单元测试

## 快速开始

### 1. 安装依赖

```bash
cd skills/test-gen
uv pip install typescript @types/node ts-node
```

### 2. 使用示例

```bash
# 生成测试文件
uv run ts-node test-generator.ts example/user.ts

# 查看生成的测试
cat example/user.test.ts
```

### 3. 运行测试

```bash
# 安装 Jest
uv pip install jest @types/jest

# 初始化 Jest 配置
npx jest --init

# 运行测试
npx jest example/user.test.ts
```

## 功能特性

✅ **代码分析**
- 解析 TypeScript/JavaScript AST
- 识别函数、类、方法
- 提取参数类型和返回值

✅ **测试生成**
- 正常情况测试
- 边界情况测试 (空值、0、边界值)
- 错误情况测试 (无效输入、异常)

✅ **Mock 数据**
- 根据类型自动生成 mock 值
- 支持基本类型、对象、数组
- 支持异步函数

## API 使用

```typescript
import { generateTests, analyzeCode } from './test-generator';

// 方式 1: 生成测试文件
const testContent = await generateTests('./src/user.ts', {
  includeEdgeCases: true,
  includeErrorCases: true,
  generateMocks: true
});

// 方式 2: 分析代码结构
const analysis = await analyzeCode('./src/user.ts');
console.log('Functions:', analysis.functions);
console.log('Classes:', analysis.classes);
```

## 配置选项

```typescript
interface TestGenerationOptions {
  // 是否包含边界情况测试
  includeEdgeCases: boolean;      // 默认：true
  
  // 是否包含错误情况测试
  includeErrorCases: boolean;     // 默认：true
  
  // 是否生成 Mock 数据
  generateMocks: boolean;         // 默认：true
  
  // 测试框架模板
  testTemplate: 'jest' | 'vitest' | 'mocha';  // 默认：'jest'
}
```

## 示例输出

### 输入 (user.ts)
```typescript
export async function addUser(
  name: string,
  email: string,
  age?: number
): Promise<User> {
  if (!name || !email) {
    throw new Error('Name and email are required');
  }
  return { id: Date.now(), name, email, age };
}
```

### 输出 (user.test.ts)
```typescript
import { addUser } from './user';

describe('addUser', () => {
  it('should execute successfully', async () => {
    const result = await addUser('test_name', 'test_email', 42);
    expect(result).toBeDefined();
  });

  it('should handle name being empty string', async () => {
    const result = await addUser('', 'test_email', 42);
    expect(result).toBeDefined();
  });

  it('should throw error when name is invalid', async () => {
    await expect(addUser('invalid_input', 'test_email', 42))
      .rejects.toThrow();
  });

  it('should throw error when name is undefined', async () => {
    await expect(addUser(undefined, 'test_email', 42))
      .rejects.toThrow();
  });
});
```

## 文件结构

```
skills/test-gen/
├── README.md              # 使用说明
├── SKILL.md              # 技能文档
├── test-generator.ts     # 核心实现
└── example/
    ├── user.ts          # 示例源文件
    └── user.test.ts     # 生成的测试
```

## 最佳实践

### 1. 代码规范
- 使用 TypeScript 类型注解
- 导出需要测试的函数和类
- 使用清晰的命名

### 2. 测试覆盖
- 正常流程测试
- 边界条件测试
- 错误处理测试
- Mock 外部依赖

### 3. 集成到工作流
```bash
# 在 CI/CD 中自动生成测试
find src -name "*.ts" ! -name "*.test.ts" | while read file; do
  uv run ts-node test-generator.ts "$file"
done

# 运行所有测试
npx jest
```

## 待开发功能

- [ ] Vitest 支持
- [ ] Mocha 支持
- [ ] React 组件测试 (React Testing Library)
- [ ] API 接口测试 (Supertest)
- [ ] 数据库测试 (TypeORM/Prisma)
- [ ] 智能 Mock 生成
- [ ] 测试覆盖率报告
- [ ] 增量测试生成

## 故障排除

### 问题：无法解析 TypeScript 文件
**解决：** 确保安装了 `typescript` 和 `ts-node`

### 问题：生成的测试运行失败
**解决：** 检查 Jest 配置，确保支持 TypeScript

### 问题：Mock 数据不符合预期
**解决：** 手动调整生成的测试，或提交 issue 请求改进

## 贡献

欢迎提交 PR 和 Issue！

## 许可证

MIT
