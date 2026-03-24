# ACE Patch Utils Skill

对象补丁操作工具集 - JSON Patch (RFC 6902) 完整实现

## 📦 功能

1. **JSON Patch 生成** - 自动比较对象差异生成补丁
2. **补丁应用** - 支持可变/不可变两种模式
3. **补丁验证** - 完整的语法和语义验证

## 🚀 快速开始

```typescript
import patchUtils, {
  generatePatch,
  applyPatch,
  validatePatch
} from './patch-utils-skill';

// 1. 生成补丁
const original = { name: 'Alice', age: 25 };
const modified = { name: 'Alice', age: 26, city: 'Beijing' };

const patch = generatePatch(original, modified);
// [{ op: 'replace', path: '/age', value: 26 },
//  { op: 'add', path: '/city', value: 'Beijing' }]

// 2. 应用补丁
const result = applyPatch(original, patch);
// { name: 'Alice', age: 26, city: 'Beijing' }

// 3. 验证补丁
const validation = validatePatch(patch);
if (validation.valid) {
  console.log('补丁有效');
}
```

## 📚 API 参考

### JSON Pointer 工具

- `parsePointer(pointer: string)` - 解析 JSON Pointer 为路径数组
- `toPointer(path: array)` - 路径数组转 JSON Pointer
- `getValueByPointer(obj, pointer)` - 通过 Pointer 获取值
- `setValueByPointer(obj, pointer, value)` - 通过 Pointer 设置值
- `deleteValueByPointer(obj, pointer)` - 通过 Pointer 删除值

### 补丁生成

- `generatePatch(original, modified)` - 生成两个对象的差异补丁
- `createAddOperation(path, value)` - 创建添加操作
- `createRemoveOperation(path)` - 创建删除操作
- `createReplaceOperation(path, value)` - 创建替换操作
- `createMoveOperation(from, path)` - 创建移动操作
- `createCopyOperation(from, path)` - 创建复制操作
- `createTestOperation(path, value)` - 创建测试操作

### 补丁应用

- `applyPatch(obj, patch, mutate?)` - 应用补丁 (可配置是否修改原对象)
- `applyPatchImmutable(obj, patch)` - 不可变应用 (返回新对象)
- `applyPatchMutable(obj, patch)` - 可变应用 (修改原对象)

### 补丁验证

- `validatePatch(patch, obj?)` - 验证补丁 (可传入对象验证路径存在性)
- `isValidPatch(patch)` - 快速验证

### 工具函数

- `serializePatch(patch)` - 序列化为 JSON 字符串
- `parsePatch(json)` - 从 JSON 字符串解析
- `mergePatches(...patches)` - 合并多个补丁
- `invertPatch(patch, obj)` - 生成反转补丁 (撤销)

## 📖 使用示例

详细示例请查看 `patch-utils-examples.ts`，包含 13 个完整示例：

1. 生成补丁
2. 应用补丁
3. 不可变 vs 可变
4. 验证补丁
5. 创建操作
6. 嵌套对象
7. 数组操作
8. 序列化与解析
9. 合并补丁
10. 补丁反转
11. JSON Pointer 工具
12. 配置热更新
13. 错误处理

## 🎯 应用场景

- **状态管理** - 增量更新应用状态
- **数据同步** - 传输对象变更而非完整对象
- **配置管理** - 热更新配置 without 重启
- **版本控制** - 记录和回放变更历史
- **协作编辑** - 操作转换 (OT) 基础

## ⚠️ 注意事项

1. JSON Pointer 必须以 `/` 开头
2. 特殊字符需要转义：`~` → `~0`, `/` → `~1`
3. 数组索引从 0 开始，`-` 表示追加
4. `applyPatchImmutable` 使用 `JSON.parse(JSON.stringify())` 深拷贝
5. 生产环境建议先 `validatePatch` 再 `applyPatch`

## 📄 标准参考

- [RFC 6902 - JSON Patch](https://datatracker.ietf.org/doc/html/rfc6902)
- [RFC 6901 - JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901)

## 🛠️ 开发信息

- **文件**: `src/skills/patch-utils-skill.ts`
- **示例**: `src/skills/patch-utils-examples.ts`
- **版本**: 1.0.0
- **标准**: RFC 6902 (JSON Patch), RFC 6901 (JSON Pointer)

---

**ACE** - Agent Core Extension  
**交付时间**: 2026-03-13
