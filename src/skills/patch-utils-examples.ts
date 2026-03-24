/**
 * Patch Utils Skill 使用示例
 * 
 * 演示如何使用 ACE 补丁工具技能进行对象补丁操作
 */

import patchUtils, {
  generatePatch,
  applyPatch,
  applyPatchImmutable,
  applyPatchMutable,
  validatePatch,
  createAddOperation,
  createReplaceOperation,
  createRemoveOperation,
  JsonPatch
} from './patch-utils-skill';

// ============================================================================
// 示例 1: 生成两个对象之间的补丁
// ============================================================================

console.log('=== 示例 1: 生成补丁 ===');

const originalUser = {
  id: 1,
  name: '张三',
  age: 25,
  email: 'zhangsan@example.com',
  hobbies: ['reading', 'coding']
};

const updatedUser = {
  id: 1,
  name: '张三',
  age: 26,
  email: 'zhangsan@example.com',
  hobbies: ['reading', 'coding', 'gaming'],
  city: '北京'
};

const patch = generatePatch(originalUser, updatedUser);
console.log('生成的补丁:', JSON.stringify(patch, null, 2));
// 输出:
// [
//   { "op": "replace", "path": "/age", "value": 26 },
//   { "op": "add", "path": "/hobbies/2", "value": "gaming" },
//   { "op": "add", "path": "/city", "value": "北京" }
// ]

// ============================================================================
// 示例 2: 应用补丁到对象
// ============================================================================

console.log('\n=== 示例 2: 应用补丁 ===');

const user = { name: '李四', age: 30 };

const userPatch: JsonPatch = [
  { op: 'replace', path: '/age', value: 31 },
  { op: 'add', path: '/city', value: '上海' },
  { op: 'add', path: '/hobbies', value: ['music', 'travel'] }
];

const result = applyPatch(user, userPatch);

if (result.success) {
  console.log('应用成功:', result.result);
  console.log('应用的操作数:', result.operationsApplied);
  // 输出:
  // 应用成功: { name: '李四', age: 31, city: '上海', hobbies: ['music', 'travel'] }
  // 应用的操作数: 3
} else {
  console.error('应用失败:', result.error);
}

// ============================================================================
// 示例 3: 不可变 vs 可变应用
// ============================================================================

console.log('\n=== 示例 3: 不可变 vs 可变 ===');

const config = { debug: false, version: '1.0.0' };

// 不可变应用 (返回新对象，原对象不变)
const newConfig = applyPatchImmutable(config, [
  { op: 'replace', path: '/debug', value: true }
]);

console.log('原对象:', config);      // { debug: false, version: '1.0.0' }
console.log('新对象:', newConfig);   // { debug: true, version: '1.0.0' }

// 可变应用 (直接修改原对象)
const mutableConfig = { debug: false, version: '1.0.0' };
applyPatchMutable(mutableConfig, [
  { op: 'replace', path: '/debug', value: true }
]);

console.log('修改后:', mutableConfig); // { debug: true, version: '1.0.0' }

// ============================================================================
// 示例 4: 验证补丁
// ============================================================================

console.log('\n=== 示例 4: 验证补丁 ===');

const validPatch: JsonPatch = [
  { op: 'add', path: '/name', value: '王五' },
  { op: 'replace', path: '/age', value: 28 }
];

const invalidPatch: JsonPatch = [
  { op: 'invalid_op' as any, path: '/name' },
  { op: 'add', path: 'missing-slash' } // 路径必须以 / 开头
];

const validResult = validatePatch(validPatch);
console.log('有效补丁验证:', validResult.valid); // true
console.log('错误:', validResult.errors);        // []
console.log('警告:', validResult.warnings);      // []

const invalidResult = validatePatch(invalidPatch);
console.log('无效补丁验证:', invalidResult.valid); // false
console.log('错误:', invalidResult.errors);
// [
//   '[0] Invalid operation type: "invalid_op"',
//   '[1] Path must start with \'/\': "missing-slash"'
// ]

// ============================================================================
// 示例 5: 使用操作创建函数
// ============================================================================

console.log('\n=== 示例 5: 创建操作 ===');

const operationsPatch: JsonPatch = [
  createAddOperation('/username', 'alex'),
  createAddOperation('/email', 'alex@example.com'),
  createReplaceOperation('/role', 'admin'),
  createRemoveOperation('/tempToken')
];

console.log('创建的补丁:', JSON.stringify(operationsPatch, null, 2));

// ============================================================================
// 示例 6: 嵌套对象补丁
// ============================================================================

console.log('\n=== 示例 6: 嵌套对象 ===');

const serverConfig = {
  server: {
    host: 'localhost',
    port: 3000,
    ssl: {
      enabled: false,
      cert: '/path/to/cert',
      key: '/path/to/key'
    }
  },
  database: {
    host: 'db.example.com',
    port: 5432
  }
};

const configPatch: JsonPatch = [
  { op: 'replace', path: '/server/port', value: 8080 },
  { op: 'replace', path: '/server/ssl/enabled', value: true },
  { op: 'add', path: '/server/ssl/ca', value: '/path/to/ca' },
  { op: 'replace', path: '/database/port', value: 5433 }
];

const updatedConfig = applyPatchImmutable(serverConfig, configPatch);
console.log('更新后的配置:', JSON.stringify(updatedConfig, null, 2));

// ============================================================================
// 示例 7: 数组操作
// ============================================================================

console.log('\n=== 示例 7: 数组操作 ===');

const todoList = {
  title: '待办事项',
  items: [
    { id: 1, text: '学习 TypeScript', done: true },
    { id: 2, text: '学习 React', done: false }
  ]
};

const todoPatch: JsonPatch = [
  // 添加新任务
  { op: 'add', path: '/items/2', value: { id: 3, text: '学习 Node.js', done: false } },
  // 标记任务完成
  { op: 'replace', path: '/items/1/done', value: true },
  // 添加元数据
  { op: 'add', path: '/lastUpdated', value: new Date().toISOString() }
];

const updatedTodos = applyPatchImmutable(todoList, todoPatch);
console.log('更新后的待办列表:', JSON.stringify(updatedTodos, null, 2));

// ============================================================================
// 示例 8: 补丁序列化与解析
// ============================================================================

console.log('\n=== 示例 8: 序列化与解析 ===');

const patchToSave: JsonPatch = [
  { op: 'add', path: '/name', value: '测试' },
  { op: 'replace', path: '/value', value: 123 }
];

// 序列化为 JSON 字符串
const jsonStr = patchUtils.serializePatch(patchToSave);
console.log('序列化:', jsonStr);

// 从 JSON 字符串解析
const parsedPatch = patchUtils.parsePatch(jsonStr);
console.log('解析结果:', parsedPatch);

// ============================================================================
// 示例 9: 合并多个补丁
// ============================================================================

console.log('\n=== 示例 9: 合并补丁 ===');

const patch1: JsonPatch = [
  { op: 'add', path: '/a', value: 1 }
];

const patch2: JsonPatch = [
  { op: 'add', path: '/b', value: 2 }
];

const patch3: JsonPatch = [
  { op: 'add', path: '/c', value: 3 }
];

const merged = patchUtils.mergePatches(patch1, patch2, patch3);
console.log('合并后的补丁:', merged);
// [
//   { op: 'add', path: '/a', value: 1 },
//   { op: 'add', path: '/b', value: 2 },
//   { op: 'add', path: '/c', value: 3 }
// ]

// ============================================================================
// 示例 10: 补丁反转 (撤销)
// ============================================================================

console.log('\n=== 示例 10: 补丁反转 ===');

const originalData = {
  name: '原始名称',
  value: 100,
  active: true
};

const changePatch: JsonPatch = [
  { op: 'replace', path: '/name', value: '新名称' },
  { op: 'replace', path: '/value', value: 200 },
  { op: 'remove', path: '/active' }
];

// 应用补丁
const changedData = applyPatchImmutable(originalData, changePatch);
console.log('变更后的数据:', changedData);

// 生成反转补丁 (撤销变更)
const invertPatch = patchUtils.invertPatch(changePatch, originalData);
console.log('反转补丁:', invertPatch);

// 应用反转补丁恢复原状
const restoredData = applyPatchImmutable(changedData, invertPatch);
console.log('恢复的数据:', restoredData);
// { name: '原始名称', value: 100, active: true }

// ============================================================================
// 示例 11: JSON Pointer 工具
// ============================================================================

console.log('\n=== 示例 11: JSON Pointer 工具 ===');

// 解析 Pointer
const path1 = patchUtils.parsePointer('/foo/bar/0/baz');
console.log('解析路径:', path1); // ['foo', 'bar', '0', 'baz']

// 生成 Pointer
const pointer1 = patchUtils.toPointer(['users', 0, 'name']);
console.log('生成 Pointer:', pointer1); // '/users/0/name'

// 获取值
const obj = { user: { name: '张三', age: 25 } };
const name = patchUtils.getValueByPointer<string>(obj, '/user/name');
console.log('获取的值:', name); // '张三'

// 设置值
patchUtils.setValueByPointer(obj, '/user/city', '北京');
console.log('设置后的对象:', obj);
// { user: { name: '张三', age: 25, city: '北京' } }

// ============================================================================
// 示例 12: 实际应用场景 - 配置热更新
// ============================================================================

console.log('\n=== 示例 12: 配置热更新 ===');

interface AppConfig {
  version: string;
  features: {
    darkMode: boolean;
    notifications: boolean;
    analytics: boolean;
  };
  api: {
    baseUrl: string;
    timeout: number;
  };
}

const appConfig: AppConfig = {
  version: '1.0.0',
  features: {
    darkMode: false,
    notifications: true,
    analytics: true
  },
  api: {
    baseUrl: 'https://api.example.com',
    timeout: 5000
  }
};

// 用户关闭了通知功能
const userPreferencePatch: JsonPatch = [
  { op: 'replace', path: '/features/notifications', value: false }
];

// 管理员更新了 API 配置
const adminConfigPatch: JsonPatch = [
  { op: 'replace', path: '/api/timeout', value: 10000 },
  { op: 'add', path: '/api/retry', value: 3 }
];

// 应用所有补丁
const finalConfig = applyPatchImmutable(
  applyPatchImmutable(appConfig, userPreferencePatch),
  adminConfigPatch
);

console.log('最终配置:', JSON.stringify(finalConfig, null, 2));

// ============================================================================
// 示例 13: 错误处理
// ============================================================================

console.log('\n=== 示例 13: 错误处理 ===');

const testData = { name: 'test' };

try {
  // 尝试访问不存在的路径
  applyPatchImmutable(testData, [
    { op: 'replace', path: '/nonexistent', value: 'value' }
  ]);
} catch (error) {
  console.log('捕获错误:', (error as Error).message);
  // Property "nonexistent" does not exist
}

try {
  // 尝试无效的 Pointer
  patchUtils.getValueByPointer(testData, 'invalid-pointer');
} catch (error) {
  console.log('捕获错误:', (error as Error).message);
  // Invalid JSON Pointer: must start with '/'
}

// ============================================================================
// 性能提示
// ============================================================================

console.log('\n=== 性能提示 ===');
console.log(`
1. 对于大型对象，使用 applyPatchImmutable 会创建完整副本，可能影响性能
2. 如果可以接受修改原对象，使用 applyPatchMutable 更高效
3. 在生产环境中，始终先 validatePatch 再 applyPatch
4. 对于频繁更新的场景，考虑批量合并补丁后一次性应用
5. 使用 test 操作可以在应用前验证条件
`);

console.log('\n✅ 所有示例执行完成!');
