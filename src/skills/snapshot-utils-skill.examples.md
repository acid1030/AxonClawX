# Snapshot Utils - 使用示例

状态快照管理工具，提供状态捕获、恢复和差异比较功能。

---

## 📦 快速开始

### 基础用法

```typescript
import { SnapshotUtils, createSnapshot, compareStates } from './snapshot-utils-skill';

// 方式 1: 使用类实例
const snapshotUtils = new SnapshotUtils();

// 方式 2: 使用快捷函数
const snapshot = createSnapshot({ count: 0 });
```

---

## 📸 状态快照

### 创建简单快照

```typescript
const snapshotUtils = new SnapshotUtils();

// 创建状态快照
const state = {
  user: { name: 'Alice', age: 25 },
  settings: { theme: 'dark', lang: 'zh-CN' },
  count: 0,
};

const snapshot = snapshotUtils.createSnapshot(state, 'initial-state');

console.log(snapshot.metadata);
// {
//   id: 'snap_1710334567890_abc123def',
//   timestamp: 1710334567890,
//   label: 'initial-state',
//   hash: 'hash_7f3a9b2c',
//   size: 156
// }
```

### 创建带选项的快照

```typescript
// 配置快照管理器
const snapshotUtils = new SnapshotUtils({
  maxSnapshots: 10,      // 最多保留 10 个快照
  autoHash: true,        // 自动计算哈希
  deepClone: true,       // 深度克隆数据
});

// 创建多个快照
snapshotUtils.createSnapshot(state, 'v1');
snapshotUtils.createSnapshot(state, 'v2');
snapshotUtils.createSnapshot(state, 'v3');

// 查看统计
const stats = snapshotUtils.getStats();
console.log(stats);
// { total: 3, totalSize: 468, oldest: Date, newest: Date }
```

### 快照自动清理

```typescript
// 限制最多 5 个快照
const snapshotUtils = new SnapshotUtils({ maxSnapshots: 5 });

// 创建 10 个快照
for (let i = 0; i < 10; i++) {
  snapshotUtils.createSnapshot({ version: i }, `v${i}`);
}

// 自动清理后只保留 5 个
const list = snapshotUtils.list();
console.log(list.length); // 5
```

---

## ⏪ 快照恢复

### 从快照对象恢复

```typescript
const snapshotUtils = new SnapshotUtils();

// 创建快照
const originalState = { count: 0, items: [1, 2, 3] };
const snapshot = snapshotUtils.createSnapshot(originalState);

// 修改原状态
originalState.count = 100;
originalState.items.push(4);

// 恢复快照
const restored = snapshotUtils.restore(snapshot);

console.log(restored);
// { count: 0, items: [1, 2, 3] }

// 验证是深度克隆
console.log(restored === originalState); // false
console.log(restored.items === originalState.items); // false
```

### 从快照 ID 恢复

```typescript
const snapshot = snapshotUtils.createSnapshot({ data: 'test' });
const snapshotId = snapshot.metadata.id;

// 使用 ID 恢复
const restored = snapshotUtils.restore(snapshotId);
console.log(restored); // { data: 'test' }
```

### 从标签恢复

```typescript
// 创建带标签的快照
snapshotUtils.createSnapshot({ version: 1 }, 'checkpoint-1');
snapshotUtils.createSnapshot({ version: 2 }, 'checkpoint-2');

// 使用标签恢复
const restored = snapshotUtils.restore('checkpoint-1');
console.log(restored.version); // 1
```

### 错误处理

```typescript
try {
  const restored = snapshotUtils.restore('non-existent-label');
} catch (error) {
  console.error(error.message);
  // "Snapshot not found: non-existent-label"
}
```

---

## 🔍 差异比较

### 比较两个状态对象

```typescript
const before = {
  user: { name: 'Alice', age: 25 },
  settings: { theme: 'dark' },
};

const after = {
  user: { name: 'Alice', age: 26, email: 'alice@example.com' },
  settings: { theme: 'light' },
};

const diff = compareStates(before, after);

console.log(`发现 ${diff.totalDiffs} 处差异`);
// 发现 3 处差异

diff.diffs.forEach(d => {
  console.log(`${d.path}: ${d.type}`);
  if (d.oldValue !== undefined) console.log(`  旧值：${d.oldValue}`);
  if (d.newValue !== undefined) console.log(`  新值：${d.newValue}`);
});

// 输出:
// user.age: changed
//   旧值：25
//   新值：26
// user.email: added
//   新值：alice@example.com
// settings.theme: changed
//   旧值：dark
//   新值：light
```

### 比较两个快照

```typescript
const snapshotUtils = new SnapshotUtils();

// 创建两个状态的快照
const snap1 = snapshotUtils.createSnapshot({ count: 0, items: [] }, 'before');
const snap2 = snapshotUtils.createSnapshot({ count: 5, items: [1, 2] }, 'after');

// 比较快照
const diff = snapshotUtils.compare(snap1, snap2);

console.log(diff.identical); // false
console.log(diff.added);     // 2 (items[0], items[1])
console.log(diff.removed);   // 0
console.log(diff.changed);   // 1 (count)
```

### 使用标签比较

```typescript
snapshotUtils.createSnapshot({ version: 1, data: 'old' }, 'v1');
snapshotUtils.createSnapshot({ version: 2, data: 'new' }, 'v2');

const diff = snapshotUtils.compare('v1', 'v2');
console.log(diff.totalDiffs); // 2
```

### 比较快照和当前状态

```typescript
const snapshotUtils = new SnapshotUtils();

// 创建基准快照
const state = { count: 0, items: [1, 2, 3] };
const snapshot = snapshotUtils.createSnapshot(state, 'baseline');

// 修改状态
state.count = 10;
state.items.push(4);
delete state.items[0];

// 比较当前状态和基准快照
const diff = snapshotUtils.compare(snapshot, state);

diff.diffs.forEach(d => {
  console.log(`${d.path}: ${d.type}`, { old: d.oldValue, new: d.newValue });
});
```

### 快速哈希比较

```typescript
const snapshotUtils = new SnapshotUtils();

const state1 = { count: 0, items: [1, 2, 3] };
const state2 = { count: 0, items: [1, 2, 3] };
const state3 = { count: 1, items: [1, 2, 3] };

const snap1 = snapshotUtils.createSnapshot(state1);
const snap2 = snapshotUtils.createSnapshot(state2);
const snap3 = snapshotUtils.createSnapshot(state3);

// 相同状态
const diff1 = snapshotUtils.compare(snap1, snap2);
console.log(diff1.identical); // true
console.log(diff1.totalDiffs); // 0

// 不同状态
const diff2 = snapshotUtils.compare(snap1, snap3);
console.log(diff2.identical); // false
console.log(diff2.totalDiffs); // 1
```

---

## 📊 快照管理

### 列出所有快照

```typescript
const snapshotUtils = new SnapshotUtils();

snapshotUtils.createSnapshot({ v: 1 }, 'version-1');
snapshotUtils.createSnapshot({ v: 2 }, 'version-2');
snapshotUtils.createSnapshot({ v: 3 }, 'version-3');

const snapshots = snapshotUtils.list();

snapshots.forEach(snap => {
  console.log(`${snap.label || snap.id}:`);
  console.log(`  创建时间：${new Date(snap.timestamp)}`);
  console.log(`  哈希：${snap.hash}`);
  console.log(`  大小：${snap.size} bytes`);
});
```

### 获取特定快照

```typescript
const snapshot = snapshotUtils.get('version-1');

if (snapshot) {
  console.log(`找到快照：${snapshot.metadata.label}`);
  console.log(`数据：`, snapshot.clonedData);
} else {
  console.log('快照不存在');
}
```

### 删除快照

```typescript
// 删除单个快照
snapshotUtils.delete('version-1');

// 删除不存在的快照
const deleted = snapshotUtils.delete('non-existent');
console.log(deleted); // false
```

### 清除所有快照

```typescript
snapshotUtils.clear();
console.log(snapshotUtils.list().length); // 0
```

### 获取统计信息

```typescript
const snapshotUtils = new SnapshotUtils();

for (let i = 0; i < 5; i++) {
  snapshotUtils.createSnapshot({ version: i, data: 'x'.repeat(100) }, `v${i}`);
}

const stats = snapshotUtils.getStats();

console.log(`总快照数：${stats.total}`);      // 5
console.log(`总大小：${stats.totalSize}`);    // bytes
console.log(`最早快照：${stats.oldest}`);     // Date
console.log(`最新快照：${stats.newest}`);     // Date
```

---

## 🎯 实际应用场景

### 场景 1: 撤销/重做功能

```typescript
class UndoRedoManager<T> {
  private snapshotUtils = new SnapshotUtils({ maxSnapshots: 50 });
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private currentState: T;

  constructor(initialState: T) {
    this.currentState = initialState;
    this.saveState('initial');
  }

  saveState(label?: string): void {
    const snapshotId = `state_${Date.now()}`;
    this.snapshotUtils.createSnapshot(this.currentState, snapshotId);
    this.undoStack.push(snapshotId);
    this.redoStack = [];
  }

  undo(): T | null {
    if (this.undoStack.length < 2) return null;
    
    const current = this.undoStack.pop()!;
    this.redoStack.push(current);
    const previousId = this.undoStack[this.undoStack.length - 1];
    
    this.currentState = this.snapshotUtils.restore(previousId);
    return this.currentState;
  }

  redo(): T | null {
    if (this.redoStack.length === 0) return null;
    
    const nextId = this.redoStack.pop()!;
    this.undoStack.push(nextId);
    
    this.currentState = this.snapshotUtils.restore(nextId);
    return this.currentState;
  }

  getCurrentState(): T {
    return this.currentState;
  }
}

// 使用示例
const manager = new UndoRedoManager({ count: 0, items: [] });

manager.saveState();
manager.getCurrentState().count = 1;

manager.saveState();
manager.getCurrentState().count = 2;

manager.undo(); // 回到 count = 1
manager.redo(); // 回到 count = 2
```

### 场景 2: 游戏存档系统

```typescript
interface GameState {
  player: { name: string; level: number; hp: number };
  inventory: string[];
  position: { x: number; y: number };
}

class GameSaveSystem {
  private snapshotUtils = new SnapshotUtils();

  save(gameState: GameState, slotName: string): void {
    this.snapshotUtils.createSnapshot(gameState, `save-${slotName}`);
    console.log(`游戏已保存到插槽：${slotName}`);
  }

  load(slotName: string): GameState | null {
    try {
      return this.snapshotUtils.restore(`save-${slotName}`);
    } catch {
      console.log(`插槽 ${slotName} 没有存档`);
      return null;
    }
  }

  quickSave(gameState: GameState): void {
    this.save(gameState, 'quicksave');
  }

  quickLoad(): GameState | null {
    return this.load('quicksave');
  }

  compareSaves(slot1: string, slot2: string): void {
    const diff = this.snapshotUtils.compare(`save-${slot1}`, `save-${slot2}`);
    
    console.log(`=== 存档比较：${slot1} vs ${slot2} ===`);
    console.log(`差异数：${diff.totalDiffs}`);
    
    if (diff.totalDiffs > 0) {
      diff.diffs.forEach(d => {
        console.log(`  ${d.path}: ${d.type}`);
      });
    }
  }
}

// 使用示例
const game = new GameSaveSystem();
const state: GameState = {
  player: { name: 'Hero', level: 10, hp: 100 },
  inventory: ['sword', 'shield'],
  position: { x: 0, y: 0 },
};

game.save(state, 'slot1');
state.player.level = 11;
state.inventory.push('potion');
game.save(state, 'slot2');

game.compareSaves('slot1', 'slot2');
```

### 场景 3: 表单状态管理

```typescript
class FormStateManager {
  private snapshotUtils = new SnapshotUtils({ maxSnapshots: 20 });
  private formId: string;

  constructor(formId: string) {
    this.formId = formId;
  }

  snapshot(formData: any, action: string): void {
    this.snapshotUtils.createSnapshot(formData, `${this.formId}-${action}`);
  }

  hasChanges(formData: any, baselineLabel: string): boolean {
    const diff = this.snapshotUtils.compare(baselineLabel, formData);
    return !diff.identical;
  }

  getChanges(formData: any, baselineLabel: string): DiffReport {
    return this.snapshotUtils.compare(baselineLabel, formData);
  }

  resetToBaseline(formData: any, baselineLabel: string): any {
    return this.snapshotUtils.restore(baselineLabel);
  }
}

// 使用示例
const form = new FormStateManager('user-profile');

// 初始状态
const initialData = { name: '', email: '', bio: '' };
form.snapshot(initialData, 'baseline');

// 用户编辑
const editedData = { name: 'Alice', email: 'alice@example.com', bio: 'Hello' };

// 检查是否有变更
if (form.hasChanges(editedData, 'baseline')) {
  console.log('表单有未保存的变更');
  
  // 获取具体变更
  const changes = form.getChanges(editedData, 'baseline');
  console.log(`变更了 ${changes.changed} 个字段`);
}

// 重置表单
const resetData = form.resetToBaseline(editedData, 'baseline');
console.log(resetData); // 回到初始状态
```

### 场景 4: 测试快照对比

```typescript
describe('API Response Testing', () => {
  const snapshotUtils = new SnapshotUtils();

  it('should match baseline response', () => {
    // 创建基线快照 (首次运行)
    const baselineResponse = {
      status: 200,
      data: { users: [{ id: 1, name: 'Alice' }] },
      timestamp: '2024-01-01',
    };
    
    snapshotUtils.createSnapshot(baselineResponse, 'api-baseline');

    // 后续测试
    const currentResponse = {
      status: 200,
      data: { users: [{ id: 1, name: 'Alice' }] },
      timestamp: '2024-01-02',
    };

    const diff = snapshotUtils.compare('api-baseline', currentResponse);
    
    // 忽略时间戳差异
    const meaningfulDiffs = diff.diffs.filter(d => d.path !== 'timestamp');
    
    expect(meaningfulDiffs.length).toBe(0);
  });
});
```

---

## ⚙️ API 参考

### SnapshotUtils 类

#### 构造函数

```typescript
new SnapshotUtils(options?: SnapshotManagerOptions)
```

**选项:**
- `maxSnapshots?: number` - 最大保留快照数 (默认：0，无限制)
- `autoHash?: boolean` - 是否自动计算哈希 (默认：true)
- `deepClone?: boolean` - 是否深度克隆数据 (默认：true)

#### 方法

| 方法 | 描述 | 返回值 |
|------|------|--------|
| `createSnapshot(state, label?)` | 创建状态快照 | `Snapshot<T>` |
| `restore(snapshot)` | 从快照恢复状态 | `T` |
| `compare(snapshotA, snapshotB)` | 比较两个快照/状态 | `DiffReport` |
| `get(idOrLabel)` | 获取存储的快照 | `Snapshot<T> \| undefined` |
| `delete(idOrLabel)` | 删除快照 | `boolean` |
| `list()` | 列出所有快照 | `SnapshotMetadata[]` |
| `clear()` | 清除所有快照 | `void` |
| `getStats()` | 获取统计信息 | `Stats` |

### 快捷函数

```typescript
createSnapshot<T>(state: T, label?: string): Snapshot<T>
compareStates<T>(stateA: T, stateB: T): DiffReport
```

### 类型定义

```typescript
interface SnapshotMetadata {
  id: string;
  timestamp: number;
  label?: string;
  hash: string;
  size: number;
}

interface Snapshot<T> {
  metadata: SnapshotMetadata;
  data: T;
  clonedData: T;
}

interface DiffEntry {
  path: string;
  type: 'added' | 'removed' | 'changed';
  oldValue?: any;
  newValue?: any;
}

interface DiffReport {
  identical: boolean;
  totalDiffs: number;
  added: number;
  removed: number;
  changed: number;
  diffs: DiffEntry[];
  hashA: string;
  hashB: string;
}
```

---

## 🎯 最佳实践

### 1. 合理使用标签

```typescript
// ✅ 好的做法
snapshotUtils.createSnapshot(state, 'before-migration');
snapshotUtils.createSnapshot(state, 'after-migration');

// ❌ 避免使用模糊标签
snapshotUtils.createSnapshot(state, 'temp');
snapshotUtils.createSnapshot(state, 'test');
```

### 2. 设置合理的快照上限

```typescript
// 长时间运行的应用
const snapshotUtils = new SnapshotUtils({ maxSnapshots: 100 });

// 临时操作
const tempUtils = new SnapshotUtils({ maxSnapshots: 10 });
```

### 3. 及时清理不需要的快照

```typescript
// 操作完成后清理
try {
  const snapshot = snapshotUtils.createSnapshot(state);
  // ... 执行操作
} finally {
  snapshotUtils.delete(snapshot.metadata.id);
}
```

### 4. 使用哈希快速比较

```typescript
// 比较前先检查哈希
const snap1 = snapshotUtils.createSnapshot(state1);
const snap2 = snapshotUtils.createSnapshot(state2);

if (snap1.metadata.hash === snap2.metadata.hash) {
  console.log('状态完全相同，跳过详细比较');
} else {
  const diff = snapshotUtils.compare(snap1, snap2);
  // ... 处理差异
}
```

---

## 📝 注意事项

1. **内存使用**: 快照会存储完整数据副本，大量快照可能占用较多内存
2. **深度克隆**: 循环引用的对象无法正确克隆
3. **特殊类型**: Date、RegExp 等对象会被特殊处理，但函数无法序列化
4. **性能**: 大型对象的哈希计算和比较可能较慢

---

**版本:** 1.0.0  
**作者:** Axon (NOVA Subagent)  
**创建时间:** 2026-03-13
