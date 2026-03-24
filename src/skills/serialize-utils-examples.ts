/**
 * 序列化工具使用示例
 * 
 * 运行方式：uv run tsx serialize-utils-examples.ts
 */

import {
  serialize,
  deserialize,
  deepClone,
  deepEqual,
  getDepth,
  hasCircularReference,
  removeCircularReferences,
  type CustomTypeHandler,
} from './serialize-utils-skill';

// ==================== 示例 1: 基础序列化 ====================

console.log('=== 示例 1: 基础序列化 ===\n');

const basicObj = {
  name: 'Axon',
  level: 999,
  active: true,
  skills: ['planning', 'execution', 'optimization'],
  stats: {
    speed: 100,
    accuracy: 99.9,
  },
};

const basicJson = serialize(basicObj);
console.log('序列化结果:');
console.log(basicJson);
console.log();

const basicRestored = deserialize(basicJson);
console.log('反序列化结果:');
console.log(basicRestored);
console.log();

// ==================== 示例 2: 循环引用处理 ====================

console.log('=== 示例 2: 循环引用处理 ===\n');

const circularObj: any = {
  id: 1,
  name: 'root',
};
circularObj.self = circularObj; // 循环引用
circularObj.sibling = { name: 'sibling', parent: circularObj }; // 间接循环

console.log('是否存在循环引用:', hasCircularReference(circularObj));

const safeJson = serialize(circularObj);
console.log('\n安全序列化 (处理循环引用):');
console.log(safeJson);

const cleaned = removeCircularReferences(circularObj);
console.log('\n移除循环引用后的对象:');
console.log(JSON.stringify(cleaned, null, 2));
console.log();

// ==================== 示例 3: 内置类型序列化 ====================

console.log('=== 示例 3: 内置类型序列化 ===\n');

const complexObj = {
  timestamp: new Date('2026-03-13T18:37:00Z'),
  pattern: /^test\d+$/gi,
  cache: new Map([
    ['user:1', { name: 'Alice' }],
    ['user:2', { name: 'Bob' }],
  ]),
  tags: new Set(['important', 'urgent', 'high-priority']),
  error: new Error('Connection timeout'),
};

const complexJson = serialize(complexObj);
console.log('复杂对象序列化:');
console.log(complexJson);
console.log();

const complexRestored = deserialize(complexJson);
console.log('反序列化后类型检查:');
console.log('- Date:', complexRestored.timestamp instanceof Date);
console.log('- RegExp:', complexRestored.pattern instanceof RegExp);
console.log('- Map:', complexRestored.cache instanceof Map);
console.log('- Set:', complexRestored.tags instanceof Set);
console.log('- Error:', complexRestored.error instanceof Error);
console.log();

// ==================== 示例 4: 深拷贝 ====================

console.log('=== 示例 4: 深拷贝 ===\n');

const original = {
  level1: {
    level2: {
      level3: {
        value: 'deep',
      },
    },
  },
  array: [1, 2, { nested: true }],
};

const cloned = deepClone(original);
cloned.level1.level2.level3.value = 'modified';
cloned.array[2].nested = false;

console.log('原始对象:', JSON.stringify(original, null, 2));
console.log('\n克隆对象:', JSON.stringify(cloned, null, 2));
console.log('\n原始对象未被修改:', original.level1.level2.level3.value === 'deep');
console.log();

// ==================== 示例 5: 深度比较 ====================

console.log('=== 示例 5: 深度比较 ===\n');

const obj1 = {
  user: { id: 1, name: 'Axon' },
  settings: { theme: 'dark', lang: 'zh' },
};

const obj2 = {
  user: { id: 1, name: 'Axon' },
  settings: { theme: 'dark', lang: 'zh' },
};

const obj3 = {
  user: { id: 1, name: 'Axon' },
  settings: { theme: 'light', lang: 'zh' },
};

console.log('obj1 === obj2:', deepEqual(obj1, obj2)); // true
console.log('obj1 === obj3:', deepEqual(obj1, obj3)); // false
console.log();

// ==================== 示例 6: 深度计算 ====================

console.log('=== 示例 6: 深度计算 ===\n');

const shallow = { a: 1 };
const medium = { a: { b: 2 } };
const deep = { a: { b: { c: { d: { e: 5 } } } } };

console.log('浅层对象深度:', getDepth(shallow)); // 1
console.log('中层对象深度:', getDepth(medium)); // 2
console.log('深层对象深度:', getDepth(deep)); // 5
console.log();

// ==================== 示例 7: 自定义类型处理器 ====================

console.log('=== 示例 7: 自定义类型处理器 ===\n');

// 自定义类
class Vector3 {
  constructor(
    public x: number,
    public y: number,
    public z: number
  ) {}
  
  magnitude(): number {
    return Math.sqrt(this.x ** 2 + this.y ** 2 + this.z ** 2);
  }
}

// 自定义处理器
const vector3Handler: CustomTypeHandler = {
  typeName: 'Vector3',
  test: (v: any) => v instanceof Vector3,
  serialize: (v: Vector3) => ({ x: v.x, y: v.y, z: v.z }),
  deserialize: (data: any) => new Vector3(data.x, data.y, data.z),
};

// 使用自定义处理器的对象
const physicsObj = {
  position: new Vector3(1, 2, 3),
  velocity: new Vector3(0.5, -0.3, 0.1),
  name: 'Particle',
};

const physicsJson = serialize(physicsObj, {
  customHandlers: [vector3Handler],
});

console.log('包含自定义类型的序列化:');
console.log(physicsJson);
console.log();

const physicsRestored = deserialize(physicsJson, {
  customHandlers: [vector3Handler],
});

console.log('反序列化后:');
console.log('- position 是 Vector3:', physicsRestored.position instanceof Vector3);
console.log('- position.magnitude():', physicsRestored.position.magnitude());
console.log('- velocity.x:', physicsRestored.velocity.x);
console.log();

// ==================== 示例 8: 序列化选项 ====================

console.log('=== 示例 8: 序列化选项 ===\n');

const testObj = { a: { b: { c: { d: { e: 'deep' } } } } };

// 不处理循环引用
const noCircular = serialize(testObj, { handleCircular: false });
console.log('不处理循环引用:', noCircular);

// 自定义缩进
const indented = serialize(testObj, { space: 4 });
console.log('\n4 空格缩进:');
console.log(indented);

// 限制深度
const limited = serialize(testObj, { maxDepth: 2 });
console.log('\n限制深度为 2:');
console.log(limited);
console.log();

// ==================== 示例 9: 实际应用场景 ====================

console.log('=== 示例 9: 实际应用场景 ===\n');

// 场景 1: 缓存存储
const cacheData = {
  userId: 'user_123',
  session: { token: 'abc123', expires: new Date('2026-12-31') },
  preferences: new Map([['theme', 'dark'], ['lang', 'zh']]),
};

const cached = serialize(cacheData);
console.log('缓存数据 (可存储到 localStorage/Redis):');
console.log(cached.substring(0, 100) + '...');

// 场景 2: 网络传输
const networkPayload = {
  type: 'AGENT_MESSAGE',
  payload: {
    agentId: 'axon-001',
    timestamp: new Date(),
    content: 'Task completed successfully',
    metadata: new Set(['priority', 'logged']),
  },
};

const transmitted = serialize(networkPayload, { space: 0 }); // 压缩传输
console.log('\n网络传输 payload (压缩):');
console.log(transmitted.substring(0, 100) + '...');

// 场景 3: 配置快照
const configSnapshot = {
  version: '2.0.0',
  settings: {
    maxAgents: 5,
    timeout: 30000,
    retryAttempts: 3,
  },
  features: new Set(['auto-save', 'real-time-sync', 'collaboration']),
  createdAt: new Date(),
};

const snapshot = serialize(configSnapshot);
console.log('\n配置快照 (可保存为文件):');
console.log(snapshot);
console.log();

// ==================== 完成 ====================

console.log('=== 所有示例执行完成 ===');
console.log('✅ 序列化工具技能已就绪');
console.log('📁 文件位置：src/skills/serialize-utils-skill.ts');
console.log('📖 示例文件：src/skills/serialize-utils-examples.ts');
