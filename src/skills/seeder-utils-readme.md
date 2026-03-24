# 🌱 Seeder Utils - 数据库种子数据填充工具

**版本:** 1.0.0  
**作者:** Axon (KAEL Engineering)  
**创建时间:** 2026-03-13

---

## 📋 功能概览

Seeder Utils 是一个强大的数据库种子数据填充工具，提供以下核心功能：

1. **批量插入** - 高效批量插入数据，支持事务
2. **关联数据生成** - 自动生成主外键关联数据
3. **回滚支持** - 完整的回滚机制，支持单步/全部回滚

---

## 🚀 快速开始

### 基础用法

```typescript
import { createSeeder, DEFAULT_AGENTS } from './seeder-utils-skill';

const seeder = createSeeder({ verbose: true });

// 插入数据
const result = await seeder.seed({
  name: 'Initial Data',
  records: DEFAULT_AGENTS.map(agent => ({
    table: 'agents',
    data: agent,
  })),
});

console.log(`插入了 ${result.totalInserted} 条记录`);
```

### 使用工厂函数

```typescript
import { seedFactory } from './seeder-utils-skill';

// 生成 100 个测试任务
const result = await seedFactory(
  'tasks',
  (index) => ({
    title: `Task ${index + 1}`,
    description: `Description for task ${index + 1}`,
    status: 'pending',
    priority: ['low', 'medium', 'high'][index % 3],
  }),
  100
);
```

### 生成关联数据

```typescript
import { createSeeder } from './seeder-utils-skill';

const seeder = createSeeder({ verbose: true });

// 生成 Agent 和他们的任务
const result = await seeder.seedWithRelations(
  'agents',
  (index) => ({
    name: `Agent ${index + 1}`,
    type: 'worker',
    status: 'active',
  }),
  [
    {
      mainTable: 'agents',
      relatedTable: 'tasks',
      foreignKey: 'agent_id',
      generate: (agent, taskIndex) => ({
        title: `${agent.name} - Task ${taskIndex + 1}`,
        status: 'pending',
        priority: 'medium',
      }),
    },
  ],
  10, // 生成 10 个 Agent
  {
    relatedCount: () => 5, // 每个 Agent 5 个任务
  }
);
```

---

## 📖 API 文档

### SeederUtils 类

#### 构造函数选项

```typescript
interface SeederOptions {
  useTransaction?: boolean;      // 是否启用事务 (默认：true)
  verbose?: boolean;             // 是否显示详细日志 (默认：false)
  batchSize?: number;            // 每批插入记录数 (默认：100)
  continueOnError?: boolean;     // 出错时是否继续 (默认：false)
  rollbackLogPath?: string;      // 回滚日志文件路径
}
```

#### 主要方法

##### 1. seed(batch)

执行种子数据填充

```typescript
const result = await seeder.seed({
  name: 'My Seed Batch',
  records: [
    { table: 'agents', data: { name: 'Axon', type: 'main' } },
    { table: 'agents', data: { name: 'KAEL', type: 'engineering' } },
  ],
});
```

**返回值:**

```typescript
interface SeederResult {
  success: boolean;              // 是否成功
  totalInserted: number;         // 插入总数
  failedCount: number;           // 失败数
  tableStats: Record<string, { inserted: number; failed: number }>;
  errors: Array<{ table: string; error: string }>;
  rollbackInfo?: RollbackInfo;   // 回滚信息
  duration: number;              // 执行时间 (ms)
}
```

##### 2. seedWithFactory(table, factory, count, options)

使用工厂函数批量生成数据

```typescript
const result = await seeder.seedWithFactory(
  'tasks',
  (index) => ({
    title: `Task ${index}`,
    status: 'pending',
  }),
  100,
  { name: 'Generated Tasks' }
);
```

##### 3. seedWithRelations(mainTable, mainFactory, relations, count, options)

生成关联数据

```typescript
const result = await seeder.seedWithRelations(
  'agents',
  (i) => ({ name: `Agent ${i}`, type: 'worker' }),
  [
    {
      mainTable: 'agents',
      relatedTable: 'tasks',
      foreignKey: 'agent_id',
      generate: (agent, idx) => ({
        title: `${agent.name} - Task ${idx}`,
        status: 'pending',
      }),
    },
  ],
  10,
  { relatedCount: 5 } // 每个主记录 5 个关联记录
);
```

##### 4. rollback()

回滚最近一次种子数据

```typescript
const success = await seeder.rollback();
```

##### 5. rollbackAll()

回滚所有种子数据

```typescript
const count = await seeder.rollbackAll();
console.log(`回滚了 ${count} 个批次`);
```

##### 6. truncate(tables, options)

清空指定表

```typescript
seeder.truncate(['tasks', 'agents']);
```

##### 7. getRollbackStack()

获取回滚栈信息

```typescript
const stack = seeder.getRollbackStack();
console.log(stack);
```

---

## 🎯 使用场景

### 场景 1: 开发环境初始化

```typescript
import { createSeeder, DEFAULT_AGENTS, DEFAULT_SKILLS } from './seeder-utils-skill';

async function initDevEnvironment() {
  const seeder = createSeeder({ verbose: true });
  
  // 插入默认 Agent
  await seeder.seed({
    name: 'Default Agents',
    records: DEFAULT_AGENTS.map(a => ({ table: 'agents', data: a })),
  });
  
  // 插入默认 Skills
  await seeder.seed({
    name: 'Default Skills',
    records: DEFAULT_SKILLS.map(s => ({ table: 'skills', data: s })),
  });
  
  // 生成测试任务
  await seeder.seedWithFactory('tasks', createDefaultTask, 50);
}
```

### 场景 2: 测试数据准备

```typescript
import { createSeeder } from './seeder-utils-skill';

async function prepareTestData() {
  const seeder = createSeeder({ useTransaction: true });
  
  try {
    // 生成测试数据
    await seeder.seedWithRelations(
      'agents',
      (i) => ({ name: `Test Agent ${i}`, type: 'test' }),
      [{
        mainTable: 'agents',
        relatedTable: 'tasks',
        foreignKey: 'agent_id',
        generate: (agent, idx) => ({
          title: `Test Task ${idx}`,
          status: 'pending',
        }),
      }],
      10,
      { relatedCount: 3 }
    );
    
    // 运行测试...
    await runTests();
    
  } finally {
    // 清理测试数据
    await seeder.rollbackAll();
  }
}
```

### 场景 3: 性能基准测试

```typescript
import { createSeeder } from './seeder-utils-skill';

async function benchmarkInsertPerformance() {
  const seeder = createSeeder({ verbose: false });
  
  const sizes = [100, 500, 1000, 5000];
  
  for (const size of sizes) {
    const start = performance.now();
    
    await seeder.seedWithFactory(
      'tasks',
      (i) => ({ title: `Task ${i}`, status: 'pending' }),
      size
    );
    
    const duration = performance.now() - start;
    console.log(`${size} 条记录：${duration.toFixed(2)}ms (${(size / duration * 1000).toFixed(0)} ops/sec)`);
    
    // 清理
    seeder.truncate(['tasks']);
  }
}
```

---

## ⚠️ 注意事项

### 1. 事务支持

- 默认启用事务 (`useTransaction: true`)
- 事务模式下支持回滚
- 禁用事务时性能更好，但无法回滚

### 2. 外键约束

生成关联数据时，注意外键约束：

```typescript
// ✅ 正确：先生成主记录，再生成关联记录
await seeder.seedWithRelations(
  'agents',
  (i) => ({ name: `Agent ${i}`, type: 'worker' }),
  [{
    mainTable: 'agents',
    relatedTable: 'tasks',
    foreignKey: 'agent_id', // 外键字段
    generate: (agent, idx) => ({
      title: `Task ${idx}`,
      // agent_id 会自动设置
    }),
  }],
  10
);
```

### 3. 错误处理

```typescript
const seeder = createSeeder({
  continueOnError: true, // 遇到错误继续执行
});

const result = await seeder.seed({
  name: 'Error Tolerant Seed',
  records: [
    // 即使部分记录失败，其他记录仍会插入
  ],
});

if (result.failedCount > 0) {
  console.log('失败的记录:', result.errors);
}
```

### 4. 回滚限制

- 回滚仅对事务模式下的操作有效
- 回滚栈在进程重启后丢失
- 建议在生产环境谨慎使用回滚功能

---

## 📊 性能优化建议

### 1. 调整批次大小

```typescript
const seeder = createSeeder({
  batchSize: 500, // 默认 100，可根据数据量调整
});
```

### 2. 禁用详细日志

```typescript
const seeder = createSeeder({
  verbose: false, // 生产环境建议关闭
});
```

### 3. 禁用事务 (仅当不需要回滚时)

```typescript
const seeder = createSeeder({
  useTransaction: false, // 性能提升约 30-50%
});
```

### 4. 批量插入 vs 单条插入

```typescript
// ✅ 推荐：批量插入
await seeder.seed({
  name: 'Batch Insert',
  records: largeDataSet.map(data => ({ table: 'tasks', data })),
});

// ❌ 不推荐：循环单条插入
for (const data of largeDataSet) {
  await seeder.seed({
    name: 'Single',
    records: [{ table: 'tasks', data }],
  });
}
```

---

## 🧪 运行示例

```bash
# 运行所有示例
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/seeder-utils-examples.ts
```

---

## 📝 更新日志

### v1.0.0 (2026-03-13)

- ✅ 初始版本发布
- ✅ 批量插入功能
- ✅ 工厂函数支持
- ✅ 关联数据生成
- ✅ 事务与回滚支持
- ✅ 完整文档和示例

---

## 🤝 贡献指南

如需扩展功能，请遵循以下规范：

1. 保持代码风格一致
2. 添加完整的类型定义
3. 提供使用示例
4. 更新本文档

---

**最后更新:** 2026-03-13  
**维护者:** Axon (KAEL Engineering)
