# test-gen - 单元测试生成技能

自动生成 TypeScript/JavaScript 代码的单元测试，支持 Jest 框架。

## 功能

### 1. 代码分析
- 解析 TypeScript/JavaScript 文件
- 识别导出的函数和类
- 提取参数类型、返回值类型
- 检测异步函数

### 2. 测试生成
- 生成 Jest 测试用例
- 覆盖正常情况
- 覆盖边界情况 (空值、0、边界值)
- 覆盖错误情况 (无效输入、负数、undefined)
- 自动生成 Mock 数据

### 3. 输出格式
标准的 Jest 测试文件结构，包含 describe/it 块

## 使用方法

### 方式 1: 直接运行
```bash
cd skills/test-gen
uv run ts-node test-generator.ts path/to/your/file.ts
```

### 方式 2: 作为模块导入
```typescript
import { generateTests, analyzeCode } from './test-generator';

// 生成测试
const testContent = await generateTests('./user.ts', {
  includeEdgeCases: true,
  includeErrorCases: true,
  generateMocks: true,
  testTemplate: 'jest'
});

// 分析代码
const analysis = await analyzeCode('./user.ts');
console.log('Functions:', analysis.functions);
console.log('Classes:', analysis.classes);
```

### 方式 3: 使用 CLI 命令 (待添加)
```bash
openclaw test-gen ./src/user.ts
```

## 示例

### 输入文件 (user.ts)
```typescript
export interface User {
  id: number;
  name: string;
  email: string;
}

export async function addUser(name: string, email: string): Promise<User> {
  if (!name || !email) {
    throw new Error('Name and email are required');
  }
  
  return {
    id: Date.now(),
    name,
    email
  };
}

export class UserService {
  private users: User[] = [];

  async createUser(name: string, email: string): Promise<User> {
    const user = await addUser(name, email);
    this.users.push(user);
    return user;
  }

  getUserById(id: number): User | undefined {
    return this.users.find(u => u.id === id);
  }
}
```

### 生成的测试文件 (user.test.ts)
```typescript
import { addUser, UserService } from './user';

describe('addUser', () => {
  it('should execute successfully', async () => {
    const result = await addUser('test_name', 'test_email');
    expect(result).toBeDefined();
  });

  it('should handle name being empty string', async () => {
    const result = await addUser('', 'test_email');
    expect(result).toBeDefined();
  });

  it('should handle email being empty string', async () => {
    const result = await addUser('test_name', '');
    expect(result).toBeDefined();
  });

  it('should throw error when name is invalid', async () => {
    await expect(addUser('invalid_input', 'test_email')).rejects.toThrow();
  });

  it('should throw error when name is undefined', async () => {
    await expect(addUser(undefined, 'test_email')).rejects.toThrow();
  });

  it('should throw error when email is undefined', async () => {
    await expect(addUser('test_name', undefined)).rejects.toThrow();
  });
});

describe('UserService', () => {
  describe('constructor', () => {
    it('should create instance successfully', () => {
      const instance = new UserService();
      expect(instance).toBeDefined();
    });
  });

  describe('createUser', () => {
    it('should execute successfully', async () => {
      const instance = new UserService();
      const mockArgs = 'test_name', 'test_email';
      const result = await instance.createUser(mockArgs);
      expect(result).toBeDefined();
    });
  });

  describe('getUserById', () => {
    it('should execute successfully', async () => {
      const instance = new UserService();
      const mockArgs = 42;
      const result = instance.getUserById(mockArgs);
      expect(result).toBeDefined();
    });
  });
});
```

## 配置选项

```typescript
interface TestGenerationOptions {
  includeEdgeCases: boolean;    // 是否包含边界情况测试 (默认：true)
  includeErrorCases: boolean;   // 是否包含错误情况测试 (默认：true)
  generateMocks: boolean;       // 是否生成 Mock 数据 (默认：true)
  testTemplate: 'jest' | 'vitest' | 'mocha';  // 测试框架 (默认：'jest')
}
```

## 依赖

```bash
uv pip install typescript @types/node
```

## 文件结构

```
skills/test-gen/
├── SKILL.md              # 技能文档
├── test-generator.ts     # 核心实现
├── example/
│   ├── user.ts          # 示例源文件
│   └── user.test.ts     # 生成的测试文件
└── README.md            # 使用说明
```

## 待扩展功能

- [ ] 支持 Vitest 测试框架
- [ ] 支持 Mocha 测试框架
- [ ] 智能 Mock 生成 (基于类型推断)
- [ ] 测试覆盖率分析
- [ ] 支持 React 组件测试
- [ ] 支持 API 接口测试
- [ ] 支持数据库操作测试
