/**
 * 原型模式使用示例
 * 
 * 演示如何使用 prototype-pattern-skill.ts 中的功能
 */

import {
  clone,
  cloneDeep,
  cloneShallow,
  PrototypeRegistryImpl,
  UserPrototype,
  ConfigPrototype,
} from './prototype-pattern-skill';

// ============== 示例 1: 基础克隆 ==============

console.log('=== 示例 1: 基础克隆 ===\n');

const original = {
  name: 'Axon',
  level: 9999,
  skills: ['architecture', 'orchestration', 'strategy'],
  metadata: {
    created: '2026-01-01',
    status: 'active',
  },
};

// 浅拷贝
const shallow = cloneShallow(original);
shallow.metadata.status = 'modified';

console.log('浅拷贝后，嵌套对象共享引用:');
console.log('Original metadata.status:', original.metadata.status); // 'modified' ❌
console.log('Shallow metadata.status:', shallow.metadata.status); // 'modified'

// 深拷贝
const deep = cloneDeep(original);
deep.metadata.status = 'deep-modified';

console.log('\n深拷贝后，嵌套对象独立:');
console.log('Original metadata.status:', original.metadata.status); // 'modified' ✅
console.log('Deep metadata.status:', deep.metadata.status); // 'deep-modified' ✅

// ============== 示例 2: 带选项的克隆 ==============

console.log('\n=== 示例 2: 带选项的克隆 ===\n');

const user = {
  id: 'u_001',
  name: 'KAEL',
  password: 'secret123',
  email: 'kael@example.com',
  role: 'admin',
};

// 排除敏感字段
const safeUser = cloneShallow(user, {
  type: 'shallow',
  exclude: ['password'],
});

console.log('排除密码字段:');
console.log('Original:', user);
console.log('Safe:', safeUser); // password 已被排除

// 自定义转换
const transformed = cloneShallow(user, {
  type: 'shallow',
  transform: (key, value) => {
    if (key === 'name') {
      return value.toUpperCase();
    }
    return value;
  },
});

console.log('\n转换姓名为大写:');
console.log('Transformed name:', transformed.name); // 'KAEL'

// ============== 示例 3: 原型注册表 ==============

console.log('\n=== 示例 3: 原型注册表 ===\n');

const registry = new PrototypeRegistryImpl();

// 注册原型
const userProto = new UserPrototype('u_001', 'Axon', 'axon@system.com', {
  level: 9999,
});

const configProto = new ConfigPrototype('AxonClaw', '2.0.0', new Map([
  ['debug', true],
  ['maxAgents', 5],
]));

registry.register('user', userProto);
registry.register('config', configProto);

console.log('已注册的原型:', registry.keys()); // ['user', 'config']

// 克隆原型
const clonedUser = registry.clonePrototype<UserPrototype>('user', true);
console.log('\n克隆的用户原型:');
console.log('ID:', clonedUser?.id);
console.log('Name:', clonedUser?.name);

// 使用流式 API
const modifiedUser = userProto.withName('Axon Prime').withEmail('axon.prime@system.com');
console.log('\n修改后的用户:');
console.log('Name:', modifiedUser.name); // 'Axon Prime'
console.log('Email:', modifiedUser.email); // 'axon.prime@system.com'

// 配置版本升级
const newConfig = configProto.withVersion('3.0.0').withSetting('newFeature', true);
console.log('\n升级后的配置:');
console.log('Version:', newConfig.version); // '3.0.0'
console.log('New Feature:', newConfig.settings.get('newFeature')); // true

// ============== 示例 4: 复杂对象深拷贝 ==============

console.log('\n=== 示例 4: 复杂对象深拷贝 ===\n');

const complexObj = {
  date: new Date(),
  regex: /test/gi,
  map: new Map([['key', 'value']]),
  set: new Set([1, 2, 3]),
  nested: {
    array: [1, 2, { deep: 'value' }],
  },
};

// 创建循环引用
complexObj.nested.self = complexObj;

const clonedComplex = cloneDeep(complexObj);

console.log('Date 克隆:', clonedComplex.date instanceof Date); // true ✅
console.log('RegExp 克隆:', clonedComplex.regex instanceof RegExp); // true ✅
console.log('Map 克隆:', clonedComplex.map instanceof Map); // true ✅
console.log('Set 克隆:', clonedComplex.set instanceof Set); // true ✅
console.log('循环引用处理:', clonedComplex.nested.self === clonedComplex); // true ✅
console.log('不是原引用:', clonedComplex !== complexObj); // true ✅

// ============== 示例 5: 实际应用场景 ==============

console.log('\n=== 示例 5: 实际应用场景 ===\n');

// 场景 1: Agent 配置模板
class AgentConfig extends PrototypeBase<AgentConfig> {
  constructor(
    public name: string,
    public model: string,
    public maxTokens: number = 4096,
    public temperature: number = 0.7,
    public tools: string[] = []
  ) {
    super();
  }

  clone(): AgentConfig {
    return cloneShallow(this);
  }

  withModel(model: string): AgentConfig {
    return cloneDeep(this).withModel(model);
  }

  withTools(...tools: string[]): AgentConfig {
    const cloned = cloneDeep(this);
    cloned.tools = [...cloned.tools, ...tools];
    return cloned;
  }
}

// 创建基础 Agent 模板
const baseAgent = new AgentConfig('BaseAgent', 'qwen3.5-plus');

// 基于模板创建多个变体
const codingAgent = baseAgent.withTools('file-edit', 'exec', 'browser');
const analysisAgent = baseAgent.withTools('web_search', 'web_fetch');
const memoryAgent = baseAgent.withTools('chromadb', 'feishu_doc');

console.log('基础 Agent:', baseAgent.name, baseAgent.tools);
console.log('编码 Agent:', codingAgent.name, codingAgent.tools);
console.log('分析 Agent:', analysisAgent.name, analysisAgent.tools);
console.log('记忆 Agent:', memoryAgent.name, memoryAgent.tools);

// 场景 2: 任务快照
interface Task {
  id: string;
  title: string;
  status: 'pending' | 'running' | 'completed';
  progress: number;
  metadata: Record<string, any>;
}

const task: Task = {
  id: 't_001',
  title: '原型模式实现',
  status: 'running',
  progress: 50,
  metadata: {
    startTime: Date.now(),
    assignedTo: 'KAEL',
  },
};

// 创建任务快照 (深拷贝)
const taskSnapshot = cloneDeep(task);

// 更新原任务
task.progress = 100;
task.status = 'completed';

console.log('\n任务快照对比:');
console.log('当前进度:', task.progress); // 100
console.log('快照进度:', taskSnapshot.progress); // 50 ✅
console.log('当前状态:', task.status); // 'completed'
console.log('快照状态:', taskSnapshot.status); // 'running' ✅

console.log('\n=== 所有示例完成 ===');
