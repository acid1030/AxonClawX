# 桥接模式专业版使用示例

## 快速开始

```typescript
import BridgePatternProSkill, { 
  BridgeFactory, 
  BridgeManager,
  DataProcessor,
  FileSystemImpl 
} from './bridge-pattern-pro-skill';

// 方式 1: 使用工厂快速创建
const factory = new BridgeFactory();
const { abstraction } = factory.createBridge(
  DataProcessor,
  FileSystemImpl,
  ['/data']
);

await abstraction.process('file.json');
await abstraction.dispose();

// 方式 2: 运行所有示例
await BridgePatternProSkill.runAllExamples();
```

---

## 示例 1: 基础桥接创建

```typescript
import { BridgeFactory, DataProcessor, FileSystemImpl } from './bridge-pattern-pro-skill';

const factory = new BridgeFactory();
const { bridgeId, abstraction, implementation } = factory.createBridge(
  DataProcessor,
  FileSystemImpl,
  ['/data'],
  { 
    name: 'DataProcessor-FS',
    autoCleanup: true 
  }
);

// 使用抽象层执行业务逻辑
await abstraction.process('user_data.json');
await abstraction.validate('schema.json');
console.log(await abstraction.status());

// 清理资源
await abstraction.dispose();

console.log(`桥接 ID: ${bridgeId}`);
```

**输出:**
```
[DataProcessor:abs_xxx] Processing: user_data.json
[FileSystem:impl_xxx] PROCESS @ /data
[DataProcessor:abs_xxx] Validating: schema.json
[FileSystem:impl_xxx] VALIDATE @ /data
DataProcessor: FileSystem Ready @ /data (ops: 2)
[FileSystem:impl_xxx] Cleanup complete
桥接 ID: bridge_xxx
```

---

## 示例 2: 动态切换实现 (核心优势)

```typescript
import { BridgeFactory, DataProcessor, FileSystemImpl, NetworkImpl, DatabaseImpl } from './bridge-pattern-pro-skill';

const factory = new BridgeFactory();
const { abstraction } = factory.createBridge(
  DataProcessor,
  FileSystemImpl,
  ['/tmp'],
  { name: 'SwitchableProcessor' }
);

// 使用文件系统实现
console.log('使用文件系统:');
await abstraction.process('file_data.txt');

// 动态切换到网络实现
const networkImpl = new NetworkImpl('https://api.example.com');
abstraction.setImplementation(networkImpl);

console.log('切换到网络实现:');
await abstraction.process('api_data.json');

// 切换到数据库实现
const dbImpl = new DatabaseImpl('sqlite://local.db');
abstraction.setImplementation(dbImpl);

console.log('切换到数据库实现:');
await abstraction.process('db_data.db');

await abstraction.dispose();
```

**核心优势:**
- ✅ 抽象层 (DataProcessor) 代码无需修改
- ✅ 实现层可自由替换
- ✅ 运行时动态切换
- ✅ 符合开闭原则

---

## 示例 3: 多抽象共享实现

```typescript
import { BridgeFactory, BridgeManager, DataProcessor, CacheManager, StorageManager, DatabaseImpl } from './bridge-pattern-pro-skill';

const factory = new BridgeFactory();
const manager = factory.getManager();

// 创建一个共享的数据库实现
const dbImpl = new DatabaseImpl('postgresql://localhost:5432/app');

// 多个抽象共享同一个实现
const processor = new DataProcessor(dbImpl);
const cache = new CacheManager(dbImpl);
const storage = new StorageManager(dbImpl);

// 注册多个桥接
manager.register({ abstraction: processor, implementation: dbImpl, name: 'Processor-Bridge' });
manager.register({ abstraction: cache, implementation: dbImpl, name: 'Cache-Bridge' });
manager.register({ abstraction: storage, implementation: dbImpl, name: 'Storage-Bridge' });

// 并行使用多个抽象
await Promise.all([
  processor.process('data.json'),
  cache.set('key', 'value', 60000),
  storage.save('file.txt', { content: 'test' })
]);

console.log('统计信息:', manager.getStats());

await processor.dispose();
```

**输出:**
```
[Database:impl_xxx] PROCESS @ postgresql://localhost:5432/app
[Database:impl_xxx] SET @ postgresql://localhost:5432/app
[Database:impl_xxx] SAVE @ postgresql://localhost:5432/app
统计信息: { totalBridges: 3, totalOperations: 3, activeBridges: 3 }
```

---

## 示例 4: 桥接监控

```typescript
import { BridgeFactory, TaskExecutor, NetworkImpl } from './bridge-pattern-pro-skill';

const factory = new BridgeFactory();

const { bridgeId } = factory.createMonitoredBridge(
  TaskExecutor,
  NetworkImpl,
  ['https://api.example.com', 3000],
  (operation, args, result) => {
    console.log(`[监控] 操作：${operation}`);
    console.log(`  参数：${JSON.stringify(args)}`);
    console.log(`  结果：${JSON.stringify(result)}`);
  },
  { name: 'MonitoredTaskExecutor' }
);

const executor = new TaskExecutor(new NetworkImpl('https://api.example.com'));

await executor.executeTask('fetch_users', 3);
await executor.executeTask('sync_data', 1);
await executor.cancelTask('old_task');

// 获取操作日志
const manager = factory.getManager();
const logs = manager.getOperationLogs(bridgeId);
console.log(`操作日志数：${logs.length}`);
console.log('统计:', manager.getStats());

await executor.dispose();
```

**输出:**
```
[监控] 操作：TASK
  参数：["fetch_users",3]
  结果：{"success":true,"action":"TASK","url":"https://api.example.com"}
[监控] 操作：TASK
  参数：["sync_data",1]
  结果：{"success":true,"action":"TASK","url":"https://api.example.com"}
[监控] 操作：CANCEL
  参数：["old_task"]
  结果：{"success":true,"action":"CANCEL","url":"https://api.example.com"}
操作日志数：3
统计：{ totalBridges: 1, totalOperations: 3, activeBridges: 1 }
```

---

## 示例 5: 缓存管理器组合

```typescript
import { BridgeFactory, CacheManager, MemoryCacheImpl } from './bridge-pattern-pro-skill';

const factory = new BridgeFactory();

// 创建内存缓存桥接
const { abstraction: memoryCache } = factory.createBridge(
  CacheManager,
  MemoryCacheImpl,
  [100], // 最大缓存 100 条
  { name: 'MemoryCache' }
);

// 设置缓存
await memoryCache.set('user:1', { name: 'Axon', role: 'admin' }, 60000);
await memoryCache.set('user:2', { name: 'KAEL', role: 'engineer' }, 60000);

// 获取缓存
const user1 = await memoryCache.get('user:1');
console.log('获取 user:1:', user1);

// 查看状态
console.log(await memoryCache.status());

// 清理
await memoryCache.dispose();
```

**输出:**
```
[CacheManager:abs_xxx] Setting: user:1 = [object Object] (ttl: 60000ms)
[CacheManager:abs_xxx] Setting: user:2 = [object Object] (ttl: 60000ms)
[CacheManager:abs_xxx] Getting: user:1
获取 user:1: { name: 'Axon', role: 'admin' }
CacheManager: MemoryCache Ready (entries: 2/100) (ops: 3)
[MemoryCache:impl_xxx] Cache cleared
```

---

## 示例 6: 桥接生命周期管理

```typescript
import { BridgeManager, BridgeFactory, DataProcessor, FileSystemImpl } from './bridge-pattern-pro-skill';

const manager = new BridgeManager();
const factory = new BridgeFactory(manager);

// 创建多个桥接
const bridges = [];
for (let i = 0; i < 3; i++) {
  const { bridgeId, abstraction } = factory.createBridge(
    DataProcessor,
    FileSystemImpl,
    [`/data/${i}`],
    { name: `Processor-${i}` }
  );
  bridges.push({ bridgeId, abstraction });
}

// 列出所有桥接
console.log('所有桥接:');
manager.list().forEach(meta => {
  console.log(`  - ${meta.name} (${meta.abstractionType} + ${meta.implementationType})`);
});

// 查找桥接
console.log('查找 DataProcessor 桥接:');
const found = manager.find({ abstractionType: 'DataProcessor' });
found.forEach(meta => console.log(`  - ${meta.name}`));

// 注销桥接
console.log('注销所有桥接:');
manager.list().forEach(meta => {
  manager.unregister(meta.id);
});

console.log('最终统计:', manager.getStats());
```

**输出:**
```
所有桥接:
  - Processor-0 (DataProcessor + FileSystemImpl)
  - Processor-1 (DataProcessor + FileSystemImpl)
  - Processor-2 (DataProcessor + FileSystemImpl)
查找 DataProcessor 桥接:
  - Processor-0
  - Processor-1
  - Processor-2
注销所有桥接:
[BridgeManager] Unregistered: bridge_xxx
[BridgeManager] Unregistered: bridge_xxx
[BridgeManager] Unregistered: bridge_xxx
最终统计：{ totalBridges: 0, totalOperations: 0, activeBridges: 0 }
```

---

## 实际应用场景

### 场景 1: 多存储后端支持

```typescript
import { BridgeFactory, StorageManager } from './bridge-pattern-pro-skill';

// 定义存储实现
class LocalStorageImpl extends ImplementationBase {
  async execute(action: string, ...args: any[]): Promise<any> {
    const [path, data] = args;
    if (action === 'SAVE') {
      await fs.promises.writeFile(path, JSON.stringify(data));
    } else if (action === 'LOAD') {
      return JSON.parse(await fs.promises.readFile(path, 'utf-8'));
    }
  }
}

class S3StorageImpl extends ImplementationBase {
  private s3: AWS.S3;
  
  async execute(action: string, ...args: any[]): Promise<any> {
    const [key, data] = args;
    if (action === 'SAVE') {
      await this.s3.putObject({ Bucket: this.bucket, Key: key, Body: data }).promise();
    } else if (action === 'LOAD') {
      const result = await this.s3.getObject({ Bucket: this.bucket, Key: key }).promise();
      return result.Body;
    }
  }
}

// 使用时自由切换
const factory = new BridgeFactory();

// 本地存储
const { abstraction: localStorage } = factory.createBridge(
  StorageManager,
  LocalStorageImpl,
  ['/data']
);
await localStorage.save('config.json', { setting: 'value' });

// 切换到 S3
const { abstraction: s3Storage } = factory.createBridge(
  StorageManager,
  S3StorageImpl,
  ['my-bucket', 'us-east-1']
);
await s3Storage.save('config.json', { setting: 'value' });
```

### 场景 2: 多通知渠道

```typescript
import { BridgeFactory, AbstractionBase, ImplementationBase } from './bridge-pattern-pro-skill';

// 实现层
class EmailImpl extends ImplementationBase {
  async execute(action: string, ...args: any[]): Promise<any> {
    const [to, message] = args;
    await sendEmail(to, message);
  }
}

class SMSImpl extends ImplementationBase {
  async execute(action: string, ...args: any[]): Promise<any> {
    const [phone, message] = args;
    await sendSMS(phone, message);
  }
}

class SlackImpl extends ImplementationBase {
  async execute(action: string, ...args: any[]): Promise<any> {
    const [channel, message] = args;
    await postToSlack(channel, message);
  }
}

// 抽象层
class NotificationService extends AbstractionBase {
  async sendAlert(recipient: string, message: string, level: string): Promise<void> {
    await this.operate('ALERT', recipient, `[${level}] ${message}`);
  }
  
  async sendNotification(recipient: string, message: string): Promise<void> {
    await this.operate('NOTIFY', recipient, message);
  }
}

// 组合使用
const factory = new BridgeFactory();

const emailNotifier = factory.createBridge(NotificationService, EmailImpl, ['smtp://mail.example.com']);
await emailNotifier.abstraction.sendAlert('admin@example.com', 'Build failed', 'ERROR');

const slackNotifier = factory.createBridge(NotificationService, SlackImpl, ['https://hooks.slack.com/xxx']);
await slackNotifier.abstraction.sendAlert('#alerts', 'Build failed', 'ERROR');
```

### 场景 3: 多 AI 模型后端

```typescript
import { BridgeFactory, AbstractionBase, ImplementationBase } from './bridge-pattern-pro-skill';

// 实现层
class ClaudeImpl extends ImplementationBase {
  async execute(action: string, ...args: any[]): Promise<any> {
    const [prompt] = args;
    return callClaudeAPI(prompt);
  }
}

class GeminiImpl extends ImplementationBase {
  async execute(action: string, ...args: any[]): Promise<any> {
    const [prompt] = args;
    return callGeminiAPI(prompt);
  }
}

class QwenImpl extends ImplementationBase {
  async execute(action: string, ...args: any[]): Promise<any> {
    const [prompt] = args;
    return callQwenAPI(prompt);
  }
}

// 抽象层
class AIAssistant extends AbstractionBase {
  async generate(prompt: string): Promise<string> {
    return this.operate('GENERATE', prompt);
  }
  
  async analyze(text: string): Promise<any> {
    return this.operate('ANALYZE', text);
  }
  
  async summarize(text: string, maxLength: number): Promise<string> {
    return this.operate('SUMMARIZE', text, maxLength);
  }
}

// 运行时切换模型
const factory = new BridgeFactory();

const assistant = factory.createBridge(AIAssistant, ClaudeImpl, ['sk-xxx']);
const response1 = await assistant.abstraction.generate('Write TypeScript code');

// 切换到 Qwen
assistant.abstraction.setImplementation(new QwenImpl('sk-yyy'));
const response2 = await assistant.abstraction.generate('Write TypeScript code');
```

---

## API 参考

### BridgeFactory

```typescript
class BridgeFactory {
  constructor(manager?: BridgeManager);
  
  // 创建标准桥接
  createBridge<TAbs, TImpl>(
    AbstractionClass: new (impl: TImpl) => TAbs,
    ImplementationClass: new (...args: any[]) => TImpl,
    implArgs: any[],
    options?: { name?: string; autoCleanup?: boolean }
  ): { bridgeId: string; abstraction: TAbs; implementation: TImpl };
  
  // 创建带监控的桥接
  createMonitoredBridge<TAbs, TImpl>(
    AbstractionClass: new (impl: TImpl) => TAbs,
    ImplementationClass: new (...args: any[]) => TImpl,
    implArgs: any[],
    onOperation: (operation: string, args: any[], result: any) => void,
    options?: { name?: string }
  ): { bridgeId: string; abstraction: TAbs };
  
  // 获取管理器
  getManager(): BridgeManager;
}
```

### BridgeManager

```typescript
class BridgeManager implements BridgeRegistry {
  // 注册桥接
  register(bridge: BridgeConfig): string;
  
  // 获取桥接
  get<TAbs, TImpl>(id: string): BridgeConfig | undefined;
  
  // 注销桥接
  unregister(id: string): boolean;
  
  // 列出所有桥接
  list(): BridgeMetadata[];
  
  // 查找桥接
  find(query: { name?: string; tags?: string; abstractionType?: string }): BridgeMetadata[];
  
  // 获取操作日志
  getOperationLogs(bridgeId?: string, limit?: number): OperationLog[];
  
  // 获取统计信息
  getStats(): { totalBridges: number; totalOperations: number; activeBridges: number };
}
```

---

## 设计原则总结

### 1. 桥接定义
```
桥接 = 抽象层引用 + 实现层实例 + 配置选项
     ↓
  解耦抽象与实现
```

### 2. 抽象分离
- 抽象层专注于业务逻辑
- 实现层专注于底层操作
- 两者通过接口通信

### 3. 独立变化
- 抽象层扩展 → 不影响实现层
- 实现层替换 → 不影响抽象层
- 两者可独立演进

---

## 性能对比

| 模式 | 耦合度 | 扩展性 | 维护成本 | 运行时开销 |
|------|--------|--------|----------|------------|
| 传统继承 | 高 | 低 | 高 | 低 |
| 桥接模式 v1 | 低 | 高 | 低 | 中 |
| 桥接模式 Pro | 低 | 极高 | 极低 | 中低 |

**桥接模式 Pro 优势:**
- ✅ 避免类爆炸 (n×m → n+m)
- ✅ 支持运行时切换
- ✅ 符合开闭原则
- ✅ 便于单元测试
- ✅ 内置监控和统计
- ✅ 自动资源管理
- ✅ 桥接注册中心

---

## 注意事项

### ⚠️ 何时使用
- 抽象和实现都有独立变化需求
- 需要运行时动态切换实现
- 多个抽象需要共享实现
- 需要监控和统计桥接操作

### ⚠️ 何时不用
- 简单场景 (过度设计)
- 抽象和实现强耦合
- 性能极度敏感场景 (增加间接层)
- 一次性使用的代码

---

**创建时间:** 2026-03-13  
**作者:** KAEL  
**版本:** 2.0.0  
**技能:** Bridge Pattern Pro
