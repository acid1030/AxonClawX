# 📸 Snapshot Utils - 状态快照管理工具

> 优雅的状态快照、恢复和差异比较解决方案

---

## ⚡ 快速开始

```typescript
import { SnapshotUtils, createSnapshot, compareStates } from './snapshot-utils-skill';

// 创建快照工具
const snapshotUtils = new SnapshotUtils();

// 1️⃣ 创建快照
const state = { count: 0, items: [1, 2, 3] };
const snapshot = snapshotUtils.createSnapshot(state, 'baseline');

// 2️⃣ 修改状态
state.count = 100;
state.items.push(4);

// 3️⃣ 恢复快照
const restored = snapshotUtils.restore(snapshot);
console.log(restored); // { count: 0, items: [1, 2, 3] }

// 4️⃣ 比较差异
const diff = snapshotUtils.compare(snapshot, state);
console.log(`发现 ${diff.totalDiffs} 处差异`);
```

---

## 🎯 核心功能

### 📸 状态快照

```typescript
// 创建带标签的快照
const snapshot = snapshotUtils.createSnapshot(state, 'before-operation');

// 创建带选项的快照管理器
const utils = new SnapshotUtils({
  maxSnapshots: 10,   // 最多保留 10 个快照
  autoHash: true,     // 自动计算哈希
  deepClone: true,    // 深度克隆数据
});
```

### ⏪ 快照恢复

```typescript
// 从快照对象恢复
const restored = snapshotUtils.restore(snapshot);

// 从快照 ID 恢复
const restored = snapshotUtils.restore('snap_1234567890_abc');

// 从标签恢复
const restored = snapshotUtils.restore('baseline');
```

### 🔍 差异比较

```typescript
// 比较两个快照
const diff = snapshotUtils.compare(snapshot1, snapshot2);

// 比较快照和当前状态
const diff = snapshotUtils.compare(snapshot, currentState);

// 使用标签比较
const diff = snapshotUtils.compare('before', 'after');

// 查看差异详情
diff.diffs.forEach(d => {
  console.log(`${d.path}: ${d.type}`, { old: d.oldValue, new: d.newValue });
});
```

---

## 📊 差异报告结构

```typescript
interface DiffReport {
  identical: boolean;      // 是否完全相同
  totalDiffs: number;      // 差异总数
  added: number;          // 新增项数
  removed: number;        // 删除项数
  changed: number;        // 变更项数
  diffs: DiffEntry[];     // 详细差异列表
  hashA: string;          // 快照 A 的哈希
  hashB: string;          // 快照 B 的哈希
}

interface DiffEntry {
  path: string;           // 差异路径 (如 'user.name')
  type: 'added' | 'removed' | 'changed';
  oldValue?: any;
  newValue?: any;
}
```

---

## 🛠️ 实际应用场景

### 撤销/重做功能

```typescript
class UndoRedoManager<T> {
  private utils = new SnapshotUtils({ maxSnapshots: 50 });
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private state: T;

  constructor(initialState: T) {
    this.state = initialState;
    this.save();
  }

  save(): void {
    const id = `state_${Date.now()}`;
    this.utils.createSnapshot(this.state, id);
    this.undoStack.push(id);
    this.redoStack = [];
  }

  undo(): T | null {
    if (this.undoStack.length < 2) return null;
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    return this.state = this.utils.restore(this.undoStack[this.undoStack.length - 1]);
  }

  redo(): T | null {
    if (this.redoStack.length === 0) return null;
    const next = this.redoStack.pop()!;
    this.undoStack.push(next);
    return this.state = this.utils.restore(next);
  }
}
```

### 游戏存档系统

```typescript
class GameSaveSystem {
  private utils = new SnapshotUtils();

  save(gameState: any, slotName: string): void {
    this.utils.createSnapshot(gameState, `save-${slotName}`);
  }

  load(slotName: string): any {
    return this.utils.restore(`save-${slotName}`);
  }

  quickSave(gameState: any): void {
    this.save(gameState, 'quicksave');
  }

  quickLoad(): any {
    return this.load('quicksave');
  }
}
```

### 表单状态管理

```typescript
class FormStateManager {
  private utils = new SnapshotUtils();

  snapshot(formData: any, label: string): void {
    this.utils.createSnapshot(formData, label);
  }

  hasChanges(formData: any, baseline: string): boolean {
    return !this.utils.compare(baseline, formData).identical;
  }

  reset(formData: any, baseline: string): any {
    return this.utils.restore(baseline);
  }
}
```

---

## 📦 API 参考

### SnapshotUtils 类

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `createSnapshot(state, label?)` | 创建状态快照 | `Snapshot<T>` |
| `restore(snapshot)` | 从快照恢复状态 | `T` |
| `compare(snapshotA, snapshotB)` | 比较两个快照/状态 | `DiffReport` |
| `get(idOrLabel)` | 获取存储的快照 | `Snapshot \| undefined` |
| `delete(idOrLabel)` | 删除快照 | `boolean` |
| `list()` | 列出所有快照 | `SnapshotMetadata[]` |
| `clear()` | 清除所有快照 | `void` |
| `getStats()` | 获取统计信息 | `Stats` |

### 快捷函数

- `createSnapshot<T>(state: T, label?: string): Snapshot<T>`
- `compareStates<T>(stateA: T, stateB: T): DiffReport`

---

## ⚙️ 配置选项

```typescript
interface SnapshotManagerOptions {
  maxSnapshots?: number;   // 最大保留快照数 (默认：0，无限制)
  autoHash?: boolean;      // 是否自动计算哈希 (默认：true)
  deepClone?: boolean;     // 是否深度克隆数据 (默认：true)
}
```

---

## 📝 注意事项

1. **内存使用**: 快照会存储完整数据副本，大量快照可能占用较多内存
2. **深度克隆**: 循环引用的对象无法正确克隆
3. **特殊类型**: Date、RegExp 等对象会被特殊处理，但函数无法序列化
4. **性能**: 大型对象的哈希计算和比较可能较慢

---

## 📚 更多示例

详细使用示例请查看：[`snapshot-utils-skill.examples.md`](./snapshot-utils-skill.examples.md)

---

**版本:** 1.0.0  
**作者:** Axon (NOVA Subagent)  
**创建时间:** 2026-03-13  
**交付时间:** < 5 分钟 ✅
