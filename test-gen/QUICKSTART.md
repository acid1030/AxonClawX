# 🚀 Test-Gen 快速上手指南

## 5 分钟快速开始

### 步骤 1: 安装依赖 (1 分钟)

```bash
cd skills/test-gen
uv pip install typescript @types/node ts-node jest @types/jest ts-jest
```

### 步骤 2: 准备你的代码 (1 分钟)

创建一个 TypeScript 文件，例如 `src/calculator.ts`:

```typescript
export function add(a: number, b: number): number {
  return a + b;
}

export function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
```

### 步骤 3: 生成测试 (1 分钟)

```bash
uv run ts-node test-generator.ts src/calculator.ts
```

自动生成 `src/calculator.test.ts`:

```typescript
import { add, divide } from './calculator';

describe('add', () => {
  it('should execute successfully', () => {
    const result = add(42, 42);
    expect(result).toBeDefined();
  });

  it('should handle a being 0', () => {
    const result = add(0, 42);
    expect(result).toBeDefined();
  });

  it('should throw error when a is negative', async () => {
    await expect(add(-1, 42)).rejects.toThrow();
  });
});

describe('divide', () => {
  it('should execute successfully', () => {
    const result = divide(42, 2);
    expect(result).toBeDefined();
  });

  it('should throw error when b is 0', () => {
    expect(() => divide(42, 0)).toThrow();
  });
});
```

### 步骤 4: 运行测试 (2 分钟)

```bash
# 初始化 Jest (首次需要)
npx jest --init

# 运行测试
npx jest src/calculator.test.ts
```

看到绿色的 ✅ 测试通过！

---

## 常用场景

### 场景 1: 测试整个项目

```bash
# 批量生成所有测试文件
find src -name "*.ts" ! -name "*.test.ts" | while read file; do
  echo "Generating tests for $file..."
  uv run ts-node test-generator.ts "$file"
done

# 运行所有测试
npx jest
```

### 场景 2: 只生成正常情况测试

修改 `test-generator.ts` 调用:

```typescript
const testContent = await generateTests('./src/user.ts', {
  includeEdgeCases: false,    // 不生成边界测试
  includeErrorCases: false,   // 不生成错误测试
  generateMocks: true
});
```

### 场景 3: 测试类

```typescript
// src/user-service.ts
export class UserService {
  async createUser(name: string, email: string): Promise<User> {
    // ...
  }
  
  getUserById(id: number): User | undefined {
    // ...
  }
}
```

自动生成完整的类测试，包括:
- 构造函数测试
- 每个方法的测试
- Mock 数据生成

---

## 输出示例

完整的测试文件包含:

✅ **正常情况测试**
```typescript
it('should execute successfully', async () => {
  const result = await addUser('John', 'john@example.com');
  expect(result).toBeDefined();
});
```

✅ **边界情况测试**
```typescript
it('should handle name being empty string', async () => {
  const result = await addUser('', 'john@example.com');
  expect(result).toBeDefined();
});

it('should handle age being 0', async () => {
  const result = await addUser('John', 'john@example.com', 0);
  expect(result).toBeDefined();
});
```

✅ **错误情况测试**
```typescript
it('should throw error when name is invalid', async () => {
  await expect(addUser('invalid', 'john@example.com')).rejects.toThrow();
});

it('should throw error when email is undefined', async () => {
  await expect(addUser('John', undefined)).rejects.toThrow();
});
```

---

## 故障排除

### ❌ 问题：找不到模块 'typescript'
**解决:** 
```bash
uv pip install typescript
```

### ❌ 问题：Jest 配置错误
**解决:** 使用项目中的 `jest.config.js`

### ❌ 问题：生成的测试有语法错误
**解决:** 检查源文件是否有 TypeScript 语法错误

---

## 下一步

- 📖 查看 [README.md](README.md) 了解完整功能
- 📚 查看 [SKILL.md](SKILL.md) 了解技能文档
- 🔧 查看 [example/user.test.ts](example/user.test.ts) 查看完整示例

---

**Happy Testing! 🎉**
