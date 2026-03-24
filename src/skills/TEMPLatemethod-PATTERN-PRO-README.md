# 模板方法模式 Pro - 使用指南

## 📋 目录

1. [概述](#概述)
2. [核心概念](#核心概念)
3. [快速开始](#快速开始)
4. [使用示例](#使用示例)
5. [高级用法](#高级用法)
6. [最佳实践](#最佳实践)

---

## 概述

**模板方法模式 (Template Method Pattern)** 是一种行为设计模式，它：

- ✅ **定义算法骨架** - 在抽象类中定义执行流程
- ✅ **延迟实现到子类** - 具体步骤由子类实现
- ✅ **代码复用** - 不变逻辑集中在模板
- ✅ **灵活扩展** - 子类只关注核心业务逻辑

### 核心优势

| 优势 | 说明 |
|------|------|
| 🔄 **代码复用** | 公共逻辑只需编写一次 |
| 🎯 **质量控制** | 统一的验证、错误处理、日志 |
| 🚀 **快速开发** | 只需实现核心方法即可创建新技能 |
| 📊 **可维护性** | 清晰的层次结构，易于理解和修改 |
| 🔧 **灵活性** | 通过钩子方法提供扩展点 |

---

## 核心概念

### 1. 抽象模板类 (SkillTemplatePro)

定义算法骨架的抽象类，包含：

```typescript
abstract class SkillTemplatePro<TInput, TOutput> {
  // 🎯 模板方法 - 定义执行流程 (final)
  public async execute(input: TInput): Promise<TOutput>
  
  // 🔍 验证输入 (钩子方法)
  protected async validateInput(input: TInput): Promise<void>
  
  // ⚙️ 前置钩子 (可选覆盖)
  protected async beforeExecute(input: TInput): Promise<void>
  
  // 🎨 核心处理 (抽象方法 - 必须实现)
  protected abstract coreProcess(input: TInput): Promise<any>
  
  // ✅ 后置钩子 (可选覆盖)
  protected async afterExecute(result: any): Promise<void>
  
  // 📦 格式化输出 (抽象方法 - 必须实现)
  protected abstract formatOutput(result: any): TOutput
  
  // ❌ 错误处理 (钩子方法)
  protected async onError(error: Error): Promise<void>
  
  // 🧹 清理资源 (钩子方法)
  protected async cleanup(): Promise<void>
}
```

### 2. 钩子方法 (Hook Methods)

钩子方法允许子类在不修改模板结构的情况下扩展行为：

| 钩子方法 | 调用时机 | 是否必须 |
|---------|---------|---------|
| `validateInput` | 核心处理前 | 可选 |
| `beforeExecute` | 验证后，核心处理前 | 可选 |
| `afterExecute` | 核心处理后 | 可选 |
| `onError` | 发生错误时 | 可选 |
| `cleanup` | 执行结束时 | 可选 |

### 3. 算法骨架

固定的执行流程：

```
1. 初始化上下文
   ↓
2. 验证输入 (validateInput)
   ↓
3. 前置钩子 (beforeExecute)
   ↓
4. 核心处理 (coreProcess) ← 子类实现
   ↓
5. 后置钩子 (afterExecute)
   ↓
6. 格式化输出 (formatOutput) ← 子类实现
   ↓
7. 清理资源 (cleanup)
```

---

## 快速开始

### 步骤 1: 继承抽象类

```typescript
import { SkillTemplatePro } from './templatemethod-pattern-pro-skill';

interface MyInput {
  data: string;
}

interface MyOutput {
  result: string;
}

class MyCustomSkill extends SkillTemplatePro<MyInput, MyOutput> {
  // 实现核心方法
  protected async coreProcess(input: MyInput): Promise<any> {
    // 你的业务逻辑
    return input.data.toUpperCase();
  }

  protected formatOutput(result: any): MyOutput {
    return { result };
  }
}
```

### 步骤 2: 使用技能

```typescript
const skill = new MyCustomSkill({ verbose: true });
const output = await skill.execute({ data: 'hello world' });
console.log(output); // { result: 'HELLO WORLD' }
```

---

## 使用示例

### 示例 1: 数据转换技能

```typescript
import { DataTransformSkill } from './templatemethod-pattern-pro-skill';

async function dataTransformExample() {
  const skill = new DataTransformSkill({ 
    verbose: true,
    trackPerformance: true 
  });

  // 数字翻倍
  const result1 = await skill.execute({
    data: [1, 2, 3, 4, 5],
    transformType: 'double'
  });
  console.log(result1);
  // {
  //   type: 'data_transform',
  //   success: true,
  //   originalCount: 5,
  //   transformedCount: 5,
  //   data: [2, 4, 6, 8, 10],
  //   transformType: 'double',
  //   executionTime: 12
  // }

  // 字符串转大写
  const result2 = await skill.execute({
    data: ['hello', 'world'],
    transformType: 'uppercase'
  });
  console.log(result2);
  // { data: ['HELLO', 'WORLD'], ... }

  // 查看统计信息
  console.log(skill.getMetrics());
  // {
  //   executionCount: 2,
  //   avgExecutionTime: 10,
  //   successCount: 2,
  //   failureCount: 0
  // }
}
```

### 示例 2: 文件处理技能

```typescript
import { FileProcessSkill } from './templatemethod-pattern-pro-skill';

async function fileProcessExample() {
  const skill = new FileProcessSkill({ 
    verbose: true,
    timeout: 10000 
  });

  try {
    // 读取文件
    const readResult = await skill.execute({
      filePath: './data.json',
      operation: 'read',
      encoding: 'utf-8'
    });
    console.log('文件内容:', readResult.content);

    // 写入文件
    await skill.execute({
      filePath: './output.txt',
      operation: 'write',
      content: 'Hello, Template Method Pattern!',
      encoding: 'utf-8'
    });

    // 追加内容
    await skill.execute({
      filePath: './output.txt',
      operation: 'append',
      content: '\nMore content...',
      encoding: 'utf-8'
    });

    // 删除文件
    await skill.execute({
      filePath: './temp.txt',
      operation: 'delete'
    });
  } catch (error) {
    console.error('文件操作失败:', error);
  }
}
```

### 示例 3: HTTP 请求技能

```typescript
import { HttpRequestSkill } from './templatemethod-pattern-pro-skill';

async function httpExample() {
  const skill = new HttpRequestSkill({ 
    verbose: true,
    timeout: 15000 
  });

  // GET 请求
  const getResult = await skill.execute({
    url: 'https://api.github.com/users/octocat',
    method: 'GET'
  });
  console.log('用户信息:', getResult.data);

  // POST 请求
  const postResult = await skill.execute({
    url: 'https://jsonplaceholder.typicode.com/posts',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer token123'
    },
    body: {
      title: 'foo',
      body: 'bar',
      userId: 1
    }
  });
  console.log('创建结果:', postResult.data);

  // 查看响应时间
  console.log('响应时间:', postResult.responseTime, 'ms');
}
```

### 示例 4: 数据库操作技能

```typescript
import { DatabaseOperationSkill } from './templatemethod-pattern-pro-skill';

async function databaseExample() {
  const skill = new DatabaseOperationSkill({ verbose: true });

  // 插入数据
  await skill.execute({
    operation: 'insert',
    table: 'users',
    data: { name: 'Alice', age: 25, email: 'alice@example.com' }
  });

  await skill.execute({
    operation: 'insert',
    table: 'users',
    data: { name: 'Bob', age: 30, email: 'bob@example.com' }
  });

  // 查询所有用户
  const allUsers = await skill.execute({
    operation: 'query',
    table: 'users'
  });
  console.log('所有用户:', allUsers.data);

  // 条件查询
  const youngUsers = await skill.execute({
    operation: 'query',
    table: 'users',
    where: { age: 25 }
  });
  console.log('25 岁用户:', youngUsers.data);

  // 更新数据
  await skill.execute({
    operation: 'update',
    table: 'users',
    data: { age: 26 },
    where: { name: 'Alice' }
  });

  // 删除数据
  await skill.execute({
    operation: 'delete',
    table: 'users',
    where: { name: 'Bob' }
  });
}
```

---

## 高级用法

### 1. 自定义技能

创建完全自定义的技能：

```typescript
interface EmailInput {
  to: string;
  subject: string;
  body: string;
  attachments?: string[];
}

interface EmailOutput {
  success: boolean;
  messageId: string;
  sentAt: number;
}

class EmailSendSkill extends SkillTemplatePro<EmailInput, EmailOutput> {
  private smtpClient: any;

  constructor(config: any) {
    super({ verbose: true, timeout: 30000 });
    // 初始化 SMTP 客户端
  }

  protected async validateInput(input: EmailInput): Promise<void> {
    await super.validateInput(input);
    
    if (!input.to || !input.to.includes('@')) {
      throw new Error('无效的收件人地址');
    }
    
    if (!input.subject || input.subject.length > 100) {
      throw new Error('邮件主题长度必须在 1-100 字符之间');
    }
  }

  protected async beforeExecute(input: EmailInput): Promise<void> {
    this.log(`准备发送邮件到：${input.to}`);
    await this.smtpClient.connect();
  }

  protected async coreProcess(input: EmailInput): Promise<any> {
    const message = {
      from: 'noreply@example.com',
      to: input.to,
      subject: input.subject,
      text: input.body,
      attachments: input.attachments
    };

    const result = await this.smtpClient.send(message);
    return { messageId: result.messageId, sent: true };
  }

  protected async afterExecute(result: any): Promise<void> {
    this.log(`邮件发送成功：${result.messageId}`);
  }

  protected formatOutput(result: any): EmailOutput {
    return {
      success: true,
      messageId: result.messageId,
      sentAt: Date.now()
    };
  }

  protected async onError(error: Error): Promise<void> {
    this.log(`邮件发送失败：${error.message}`);
    // 发送告警通知
  }

  protected async cleanup(): Promise<void> {
    await this.smtpClient.disconnect();
  }
}
```

### 2. 配置选项

```typescript
const skill = new MySkill({
  verbose: true,              // 启用详细日志
  trackPerformance: true,     // 追踪性能指标
  timeout: 30000,             // 超时时间 (ms)
  retries: 3,                 // 重试次数
  metadata: {                 // 自定义元数据
    projectId: 'proj-123',
    environment: 'production'
  }
});
```

### 3. 性能监控

```typescript
const skill = new DataTransformSkill({ trackPerformance: true });

await skill.execute({ data: [1, 2, 3], transformType: 'double' });
await skill.execute({ data: [4, 5, 6], transformType: 'double' });
await skill.execute({ data: [7, 8, 9], transformType: 'double' });

// 获取统计信息
const metrics = skill.getMetrics();
console.log(`执行次数：${metrics.executionCount}`);
console.log(`平均耗时：${metrics.avgExecutionTime}ms`);
console.log(`成功次数：${metrics.successCount}`);
console.log(`失败次数：${metrics.failureCount}`);

// 重置统计
skill.resetMetrics();
```

### 4. 错误处理

```typescript
class RobustSkill extends SkillTemplatePro<Input, Output> {
  protected async coreProcess(input: Input): Promise<any> {
    // 可能抛出错误的逻辑
  }

  protected async onError(error: Error): Promise<void> {
    // 记录错误日志
    console.error('[RobustSkill] 错误:', error);
    
    // 发送告警
    await this.sendAlert(error);
    
    // 保存错误上下文
    await this.saveErrorContext(this.context!, error);
  }

  private async sendAlert(error: Error) {
    // 实现告警逻辑
  }

  private async saveErrorContext(context: any, error: Error) {
    // 保存错误信息用于后续分析
  }
}
```

---

## 最佳实践

### ✅ 推荐做法

1. **保持模板方法不变**
   ```typescript
   // ✅ 正确：不要覆盖 execute 方法
   // ❌ 错误：不要修改执行流程
   ```

2. **使用钩子方法进行扩展**
   ```typescript
   // ✅ 正确：在钩子方法中添加额外逻辑
   protected async beforeExecute(input: Input): Promise<void> {
     await this.cacheInput(input);
   }
   ```

3. **提供有意义的验证**
   ```typescript
   // ✅ 正确：详细的错误信息
   protected async validateInput(input: Input): Promise<void> {
     if (!input.email?.includes('@')) {
       throw new Error('邮箱格式无效');
     }
   }
   ```

4. **实现资源清理**
   ```typescript
   // ✅ 正确：确保资源释放
   protected async cleanup(): Promise<void> {
     await this.dbConnection.close();
     await this.fileHandle.close();
   }
   ```

5. **使用配置控制行为**
   ```typescript
   // ✅ 正确：灵活的配置
   constructor(config: SkillConfig) {
     super({ verbose: config.debug, timeout: config.timeout });
   }
   ```

### ❌ 避免做法

1. **不要跳过验证**
   ```typescript
   // ❌ 错误：忽略输入验证
   protected async validateInput(input: Input): Promise<void> {
     // 空实现 - 可能导致后续错误
   }
   ```

2. **不要在核心方法中处理副作用**
   ```typescript
   // ❌ 错误：核心方法应该专注于业务逻辑
   protected async coreProcess(input: Input): Promise<any> {
     const result = this.transform(input);
     await this.sendEmail(); // 应该在 afterExecute 中
     await this.logToDatabase(); // 应该在 afterExecute 中
     return result;
   }
   ```

3. **不要忽略错误处理**
   ```typescript
   // ❌ 错误：吞掉错误
   protected async onError(error: Error): Promise<void> {
     // 空实现 - 错误会被静默忽略
   }
   ```

---

## 性能提示

### 1. 启用性能追踪

```typescript
const skill = new MySkill({ trackPerformance: true });
```

### 2. 设置合理的超时

```typescript
// 根据操作类型设置超时
const quickSkill = new MySkill({ timeout: 5000 });      // 快速操作
const slowSkill = new MySkill({ timeout: 60000 });      // 慢速操作
```

### 3. 监控统计信息

```typescript
setInterval(() => {
  const metrics = skill.getMetrics();
  if (metrics.avgExecutionTime > 1000) {
    console.warn('性能警告：平均执行时间超过 1 秒');
  }
}, 60000);
```

---

## 总结

模板方法模式 Pro 提供了：

- ✅ **统一的执行框架** - 所有技能遵循相同的流程
- ✅ **灵活的扩展机制** - 通过钩子方法自定义行为
- ✅ **内置的质量控制** - 验证、超时、错误处理
- ✅ **性能监控** - 自动追踪执行统计
- ✅ **易于维护** - 清晰的代码结构

通过继承 `SkillTemplatePro`，你可以快速创建高质量、可维护的技能实现！

---

**创建时间:** 2026-03-13  
**版本:** 1.0.0  
**作者:** KAEL (Template Method Pattern Pro)
