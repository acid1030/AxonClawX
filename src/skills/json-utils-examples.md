# JSON Utils 使用示例

**文件:** `src/skills/json-utils-skill.ts`  
**作者:** Axon  
**创建时间:** 2026-03-13

---

## 1. JSON Schema 验证

### 基础验证

```typescript
import { JsonSchemaValidator } from './json-utils-skill';

// 定义 Schema
const userSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1, maxLength: 50 },
    age: { type: 'number', minimum: 0, maximum: 150 },
    email: { type: 'string', pattern: '^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$' },
    role: { type: 'string', enum: ['admin', 'user', 'guest'] }
  },
  required: ['name', 'email']
};

// 验证数据
const userData = {
  name: 'Axon',
  age: 25,
  email: 'axon@example.com',
  role: 'admin'
};

const result = JsonSchemaValidator.validate(userData, userSchema);

if (result.valid) {
  console.log('✅ 验证通过');
} else {
  console.log('❌ 验证失败:');
  result.errors.forEach(err => {
    console.log(`  - ${err.path}: ${err.message}`);
  });
}
```

### 数组验证

```typescript
const schema = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      id: { type: 'number' },
      name: { type: 'string' }
    },
    required: ['id', 'name']
  }
};

const data = [
  { id: 1, name: 'Axon' },
  { id: 2, name: 'Eve' },
  { id: 3, name: '' } // 错误：name 为空
];

const result = JsonSchemaValidator.validate(data, schema);
// result.valid = false
// errors: [{ path: '/2/name', message: '字符串长度小于最小值' }]
```

### 嵌套对象验证

```typescript
const schema = {
  type: 'object',
  properties: {
    user: {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          properties: {
            bio: { type: 'string', maxLength: 500 }
          }
        }
      }
    }
  }
};

const data = {
  user: {
    profile: {
      bio: 'A'.repeat(600) // 错误：超过最大长度
    }
  }
};

const result = JsonSchemaValidator.validate(data, schema);
// result.valid = false
// errors: [{ path: '/user/profile/bio', message: '字符串长度大于最大值' }]
```

---

## 2. JSON Patch (RFC 6902)

### 应用 Patch 操作

```typescript
import { JsonPatch } from './json-utils-skill';

const doc = {
  name: 'Axon',
  version: 1,
  settings: {
    theme: 'dark',
    notifications: true
  }
};

const patch = [
  { op: 'replace', path: '/version', value: 2 },
  { op: 'add', path: '/status', value: 'active' },
  { op: 'remove', path: '/settings/notifications' },
  { op: 'add', path: '/settings/-', value: 'new-item' } // 数组追加
];

const result = JsonPatch.apply(doc, patch);
console.log(result);
// {
//   name: 'Axon',
//   version: 2,
//   settings: { theme: 'dark' },
//   status: 'active'
// }
```

### 生成 Patch (Diff)

```typescript
import { JsonPatch } from './json-utils-skill';

const original = {
  name: 'Axon',
  version: 1,
  features: ['core', 'basic']
};

const modified = {
  name: 'Axon',
  version: 2,
  features: ['core', 'basic', 'advanced'],
  status: 'active'
};

const patch = JsonPatch.generate(original, modified);
console.log(JSON.stringify(patch, null, 2));
// [
//   { "op": "replace", "path": "/version", "value": 2 },
//   { "op": "add", "path": "/features/2", "value": "advanced" },
//   { "op": "add", "path": "/status", "value": "active" }
// ]
```

### Move 和 Copy 操作

```typescript
const doc = {
  user: {
    name: 'Axon',
    email: 'axon@example.com'
  },
  profile: {}
};

const patch = [
  { op: 'move', from: '/user/email', path: '/profile/email' },
  { op: 'copy', from: '/user/name', path: '/profile/name' }
];

const result = JsonPatch.apply(doc, patch);
console.log(result);
// {
//   user: { name: 'Axon' },
//   profile: { email: 'axon@example.com', name: 'Axon' }
// }
```

### Test 操作 (条件更新)

```typescript
const doc = { version: 1, data: 'old' };

try {
  const patch = [
    { op: 'test', path: '/version', value: 1 },
    { op: 'replace', path: '/data', value: 'new' },
    { op: 'replace', path: '/version', value: 2 }
  ];
  
  const result = JsonPatch.apply(doc, patch);
  console.log(result); // { version: 2, data: 'new' }
} catch (error) {
  console.error('Test 失败，版本不匹配');
}
```

---

## 3. JSON 流式解析

### 基础流解析

```typescript
import { JsonStreamParser } from './json-utils-skill';

const parser = new JsonStreamParser();

// 模拟接收数据块
parser.write('{"id": 1, "name": "Axon"}');
parser.write('{"id": 2, "name": "Eve"}');
parser.write('{"id": 3, "name": "Nova"}');

const results = parser.end();
console.log(results);
// [
//   { id: 1, name: 'Axon' },
//   { id: 2, name: 'Eve' },
//   { id: 3, name: 'Nova' }
// ]
```

### 回调模式

```typescript
import { JsonStreamParser } from './json-utils-skill';

const parser = new JsonStreamParser({
  onObject: (obj) => {
    console.log('收到对象:', obj);
    // 实时处理每个对象
  },
  onError: (error) => {
    console.error('解析错误:', error.message);
  }
});

// 分块接收数据
const chunks = [
  '{"task": "build", "status": "running"}',
  '{"task": "test", "status": "pending"}',
  '{"task": "deploy", "status": "queued"}'
];

chunks.forEach(chunk => parser.write(chunk));
parser.end();
```

### 处理不完整的数据块

```typescript
import { JsonStreamParser } from './json-utils-skill';

const parser = new JsonStreamParser();

// 数据被分割成不完整的块
parser.write('{"name": "Ax');  // 不完整的 JSON
parser.write('on", "version": '); // 还是不完整
parser.write('1}');  // 现在完整了

const results = parser.end();
console.log(results); // [{ name: 'Axon', version: 1 }]
```

### JSONL (JSON Lines) 解析

```typescript
import { JsonStreamParser } from './json-utils-skill';

const jsonlData = `
{"timestamp": 1234567890, "event": "start"}
{"timestamp": 1234567891, "event": "process"}
{"timestamp": 1234567892, "event": "end"}
`.trim();

const objects = JsonStreamParser.parseJsonl(jsonlData);
console.log(objects);
// [
//   { timestamp: 1234567890, event: 'start' },
//   { timestamp: 1234567891, event: 'process' },
//   { timestamp: 1234567892, event: 'end' }
// ]
```

### 静态快速解析

```typescript
import { JsonStreamParser } from './json-utils-skill';

// 快速解析连续的 JSON 流
const streamData = '{"id":1}{"id":2}{"id":3}';
const objects = JsonStreamParser.parseStream(streamData);
console.log(objects); // [{id: 1}, {id: 2}, {id: 3}]
```

---

## 4. 便捷函数

```typescript
import { validateJson, patchJson, generatePatch, parseJsonStream } from './json-utils-skill';

// Schema 验证
const valid = validateJson(data, schema).valid;

// 应用 Patch
const updated = patchJson(originalDoc, patchOperations);

// 生成 Patch
const diff = generatePatch(oldVersion, newVersion);

// 流解析
const objects = parseJsonStream(chunkData);
```

---

## 5. 实际应用场景

### 场景 1: API 响应验证

```typescript
// 验证 API 响应格式
const apiResponseSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean' },
    data: { type: 'object' },
    error: { type: 'string' },
    timestamp: { type: 'number' }
  },
  required: ['success', 'timestamp']
};

async function fetchWithValidation(url: string) {
  const response = await fetch(url);
  const data = await response.json();
  
  const result = validateJson(data, apiResponseSchema);
  if (!result.valid) {
    throw new Error(`API 响应格式错误：${result.errors.map(e => e.message).join(', ')}`);
  }
  
  return data;
}
```

### 场景 2: 配置热更新

```typescript
// 使用 Patch 实现配置增量更新
function updateConfig(current: any, updates: any) {
  const patch = generatePatch(current, updates);
  return patchJson(current, patch);
}

// 只发送变更部分，减少网络传输
const configPatch = [
  { op: 'replace', path: '/theme', value: 'light' },
  { op: 'add', path: '/features/beta', value: true }
];

// 服务端应用 Patch
const newConfig = patchJson(oldConfig, configPatch);
```

### 场景 3: 日志流处理

```typescript
// 实时处理日志流
const logParser = new JsonStreamParser({
  onObject: (log) => {
    if (log.level === 'error') {
      console.error(`[ERROR] ${log.message}`);
      // 触发告警
    } else if (log.level === 'warn') {
      console.warn(`[WARN] ${log.message}`);
    }
  },
  onError: (error) => {
    console.error('日志解析失败:', error);
  }
});

// 从 WebSocket 或 Stream 接收日志
socket.on('data', (chunk) => {
  logParser.write(chunk.toString());
});
```

### 场景 4: 批量数据导入

```typescript
// 流式导入大型 JSON 文件
import * as fs from 'fs';
import { JsonStreamParser } from './json-utils-skill';

async function importLargeJsonFile(filePath: string) {
  const parser = new JsonStreamParser({
    onObject: async (obj) => {
      // 逐条插入数据库，避免内存溢出
      await database.insert(obj);
    }
  });

  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  
  for await (const chunk of stream) {
    parser.write(chunk);
  }
  
  parser.end();
}
```

---

## 性能提示

1. **Schema 验证**: 复杂 Schema 会递归验证，嵌套过深可能影响性能
2. **Patch 生成**: 大对象 diff 会比较耗时，建议在必要时使用
3. **流解析**: 适合处理大型文件，避免一次性加载到内存
4. **错误处理**: 始终包裹 try-catch，特别是处理不可信数据时

---

**完成时间:** 5 分钟内  
**状态:** ✅ 交付完成
