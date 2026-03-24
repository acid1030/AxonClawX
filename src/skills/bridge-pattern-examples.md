# 桥接模式使用示例

## 快速开始

```typescript
import BridgePatternSkill from './bridge-pattern-skill';

// 运行所有示例
await BridgePatternSkill.runAllExamples();
```

---

## 示例 1: 文件系统 + 数据处理器

```typescript
import { FileSystemImpl, DataProcessor } from './bridge-pattern-skill';

const fsImpl = new FileSystemImpl('/data');
const processor = new DataProcessor(fsImpl);

await processor.process('user_data.json');
await processor.validate('schema.json');
console.log(await processor.status());
await processor.dispose();
```

**输出:**
```
[DataProcessor] Processing: user_data.json
[FileSystem] Executing: PROCESS:user_data.json at /data
[DataProcessor] Validating: schema.json
[FileSystem] Executing: VALIDATE:schema.json at /data
FileSystem Ready @ /data
[FileSystem] Cleanup complete
```

---

## 示例 2: 网络请求 + 任务执行器

```typescript
import { NetworkImpl, TaskExecutor } from './bridge-pattern-skill';

const networkImpl = new NetworkImpl('https://api.example.com', 3000);
const executor = new TaskExecutor(networkImpl);

await executor.executeTask('fetch_users', 3);
await executor.executeTask('sync_data', 1);
```

**输出:**
```
[TaskExecutor] Executing "fetch_users" (priority: 3)
[Network] fetch_users:P3 -> https://api.example.com (timeout: 3000ms)
[TaskExecutor] Executing "sync_data" (priority: 1)
[Network] sync_data:P1 -> https://api.example.com (timeout: 3000ms)
```

---

## 示例 3: 数据库 + 缓存管理器

```typescript
import { DatabaseImpl, CacheManager } from './bridge-pattern-skill';

const dbImpl = new DatabaseImpl('postgresql://localhost:5432/app');
const cache = new CacheManager(dbImpl);

await cache.set('user:1', '{"name":"Axon"}', 60000);
const data = await cache.get('user:1');
await cache.delete('user:1');
```

**输出:**
```
[CacheManager] Setting: user:1 = {"name":"Axon"} (ttl: 60000ms)
[Database] Executing: SET:user:1:60000
[CacheManager] Getting: user:1
[Database] Executing: GET:user:1
[CacheManager] Deleting: user:1
[Database] Executing: DELETE:user:1
```

---

## 示例 4: 动态切换实现 (核心优势)

```typescript
import { 
  FileSystemImpl, 
  NetworkImpl, 
  DatabaseImpl,
  DataProcessor 
} from './bridge-pattern-skill';

const implementations = [
  new FileSystemImpl('/tmp'),
  new NetworkImpl('https://api.test.com'),
  new DatabaseImpl('sqlite://local.db')
];

// 同一个抽象，可以无缝切换不同的实现
for (const impl of implementations) {
  const processor = new DataProcessor(impl);
  await processor.process('test_data');
  await processor.dispose();
}
```

**优势:**
- ✅ 抽象层 (DataProcessor) 无需修改
- ✅ 实现层可自由替换
- ✅ 运行时动态切换

---

## 示例 5: 组合多个抽象 (高级用法)

```typescript
import { 
  FileSystemImpl, 
  DataProcessor,
  TaskExecutor,
  CacheManager 
} from './bridge-pattern-skill';

const fsImpl = new FileSystemImpl('/workspace');

// 创建多个抽象，共享同一个实现
const processor = new DataProcessor(fsImpl);
const executor = new TaskExecutor(fsImpl);
const cache = new CacheManager(fsImpl);

// 并行执行
await Promise.all([
  processor.process('config.json'),
  executor.executeTask('build', 2),
  cache.set('build:status', 'running')
]);

await processor.dispose();
```

**输出:**
```
[DataProcessor] Processing: config.json
[TaskExecutor] Executing "build" (priority: 2)
[CacheManager] Setting: build:status = running (ttl: ∞ms)
所有操作完成
```

---

## 实际应用场景

### 场景 1: 多存储后端支持

```typescript
// 定义存储接口
interface IStorage extends IImplementation {
  save(key: string, data: any): Promise<void>;
  load(key: string): Promise<any>;
}

// 多种实现
class LocalStorageImpl implements IStorage { /* ... */ }
class S3StorageImpl implements IStorage { /* ... */ }
class IPFSStorageImpl implements IStorage { /* ... */ }

// 抽象层 (业务逻辑)
class DataManager extends Abstraction {
  async backup(data: any) {
    await this.operate(`BACKUP:${JSON.stringify(data)}`);
  }
}

// 使用时可自由切换
const storage = new S3StorageImpl(bucket, region);
const manager = new DataManager(storage);
await manager.backup(userData);
```

### 场景 2: 多通知渠道

```typescript
// 实现层
class EmailImpl implements IImplementation { /* ... */ }
class SMSImpl implements IImplementation { /* ... */ }
class SlackImpl implements IImplementation { /* ... */ }

// 抽象层
class NotificationService extends Abstraction {
  async sendAlert(message: string, level: string) {
    await this.operate(`ALERT:${level}:${message}`);
  }
}

// 组合使用
const email = new EmailImpl(smtpConfig);
const slack = new SlackImpl(webhookUrl);

const notifier = new NotificationService(email);
await notifier.sendAlert('Build failed', 'ERROR');

// 切换到 Slack
const slackNotifier = new NotificationService(slack);
await slackNotifier.sendAlert('Build failed', 'ERROR');
```

### 场景 3: 多 AI 模型后端

```typescript
// 实现层
class ClaudeImpl implements IImplementation { /* ... */ }
class GeminiImpl implements IImplementation { /* ... */ }
class QwenImpl implements IImplementation { /* ... */ }

// 抽象层
class AIAssistant extends Abstraction {
  async generate(prompt: string): Promise<string> {
    await this.operate(`GENERATE:${prompt}`);
    // ...
    return 'response';
  }
  
  async analyze(text: string): Promise<any> {
    await this.operate(`ANALYZE:${text}`);
    // ...
  }
}

// 运行时切换模型
const assistant = new AIAssistant(new ClaudeImpl(apiKey));
const response1 = await assistant.generate('Write code');

assistant.implementation = new QwenImpl(apiKey);
const response2 = await assistant.generate('Write code');
```

---

## 设计原则总结

### 1. 抽象/实现分离
```
抽象层 (Abstraction)     实现层 (Implementation)
     ↓                          ↓
  业务逻辑                  底层操作
  稳定不变                  频繁变化
  面向接口                  面向实现
```

### 2. 独立变化
- 抽象层扩展 → 不影响实现层
- 实现层替换 → 不影响抽象层
- 两者可独立演进

### 3. 组合使用
- 一个抽象 + 多个实现 → 动态切换
- 多个抽象 + 一个实现 → 资源共享
- 多个抽象 + 多个实现 → 灵活组合

---

## 性能对比

| 模式 | 耦合度 | 扩展性 | 维护成本 |
|------|--------|--------|----------|
| 传统继承 | 高 | 低 | 高 |
| 桥接模式 | 低 | 高 | 低 |

**桥接模式优势:**
- ✅ 避免类爆炸 (n×m → n+m)
- ✅ 支持运行时切换
- ✅ 符合开闭原则
- ✅ 便于单元测试

---

## 注意事项

### ⚠️ 何时使用
- 抽象和实现都有独立变化需求
- 需要运行时动态切换实现
- 避免继承层次过深

### ⚠️ 何时不用
- 简单场景 (过度设计)
- 抽象和实现强耦合
- 性能敏感场景 (增加间接层)

---

**创建时间:** 2026-03-13  
**作者:** KAEL  
**版本:** 1.0.0
