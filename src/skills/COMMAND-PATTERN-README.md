# ACE - Advanced Command Engine (专业命令模式工具)

**版本:** 1.0.0  
**作者:** Axon  
**完成时间:** 2026-03-13  

---

## 📦 功能概述

ACE 是一个完整的命令模式实现，提供：

1. **命令定义** - 灵活的命令接口与抽象基类
2. **命令执行** - 命令队列、批量执行、事务支持
3. **撤销重做** - 完整的 undo/redo 栈管理

---

## 🚀 快速开始

### 安装

```typescript
import { CommandManager, BaseCommand } from './command-pattern-pro-skill';
```

### 基础用法

```typescript
// 1. 创建命令管理器
const manager = new CommandManager({
  maxUndoStackDepth: 100,
  enableHistory: true,
});

// 2. 创建命令
const command = new StateUpdateCommand('key', 'value', stateManager);

// 3. 执行命令
const result = await manager.execute(command);

// 4. 撤销
await manager.undo();

// 5. 重做
await manager.redo();
```

---

## 📚 API 参考

### CommandManager

命令管理器核心类。

#### 构造函数

```typescript
new CommandManager(config?: CommandManagerConfig)
```

**配置选项:**

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `maxUndoStackDepth` | number | 100 | 最大撤销栈深度 |
| `maxRedoStackDepth` | number | 100 | 最大重做栈深度 |
| `enableAutoGrouping` | boolean | false | 是否启用自动分组 |
| `groupTimeWindow` | number | 500 | 分组时间窗口 (ms) |
| `enableHistory` | boolean | true | 是否记录命令历史 |
| `executionTimeout` | number | 30000 | 命令执行超时 (ms) |

#### 核心方法

| 方法 | 说明 | 返回值 |
|------|------|--------|
| `execute(command)` | 执行单个命令 | `Promise<CommandResult>` |
| `executeBatch(commands, options)` | 批量执行命令 | `Promise<CommandResult[]>` |
| `undo()` | 撤销最近的命令 | `Promise<CommandResult \| null>` |
| `undoBatch(commands)` | 批量撤销 | `Promise<CommandResult[]>` |
| `undoUntil(commandId)` | 撤销到指定命令 | `Promise<CommandResult[]>` |
| `redo()` | 重做最近撤销的命令 | `Promise<CommandResult \| null>` |
| `redoBatch()` | 批量重做 | `Promise<CommandResult[]>` |
| `clear()` | 清空所有栈 | `void` |
| `getUndoStackSize()` | 获取撤销栈大小 | `number` |
| `getRedoStackSize()` | 获取重做栈大小 | `number` |
| `getHistory(limit)` | 获取命令历史 | `CommandHistoryEntry[]` |
| `exportState()` | 导出状态 | `any` |
| `importState(state)` | 导入状态 | `void` |

### BaseCommand

命令抽象基类，所有自定义命令应继承此类。

```typescript
abstract class BaseCommand<TExecute, TUndo> implements ICommand {
  abstract execute(): Promise<CommandResult<TExecute>>;
  abstract undo(): Promise<CommandResult<TUndo>>;
  
  // 可选：自定义重做逻辑
  redo?(): Promise<CommandResult<TExecute>>;
  
  // 可选：自定义撤销/重做判断
  canUndo(): boolean;
  canRedo(): boolean;
}
```

### CommandResult

命令执行结果类型。

```typescript
interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata: CommandMetadata;
}
```

---

## 💡 使用场景

### 1. 文本编辑器

```typescript
class TextInsertCommand extends BaseCommand {
  constructor(private editor: Editor, private position: number, private text: string) {
    super('TextInsert', `Insert text at ${position}`);
  }
  
  async execute() {
    const originalText = this.editor.getText();
    this.setUndoData({ originalText });
    this.editor.insert(this.position, this.text);
    return { success: true, data: { position: this.position, text: this.text } };
  }
  
  async undo() {
    const { originalText } = this.getUndoData();
    this.editor.setText(originalText);
    return { success: true };
  }
}
```

### 2. 图形编辑器

```typescript
class ShapeMoveCommand extends BaseCommand {
  constructor(private shape: Shape, private dx: number, private dy: number) {
    super('ShapeMove', `Move shape`);
  }
  
  async execute() {
    const originalPos = { x: this.shape.x, y: this.shape.y };
    this.setUndoData(originalPos);
    this.shape.move(this.dx, this.dy);
    return { success: true };
  }
  
  async undo() {
    const { x, y } = this.getUndoData();
    this.shape.setPosition(x, y);
    return { success: true };
  }
}
```

### 3. 数据库操作

```typescript
class RecordDeleteCommand extends BaseCommand {
  constructor(private table: string, private id: string, private db: Database) {
    super('RecordDelete', `Delete ${table}.${id}`);
  }
  
  async execute() {
    const record = await this.db.find(this.table, this.id);
    this.setUndoData({ record });
    await this.db.delete(this.table, this.id);
    return { success: true };
  }
  
  async undo() {
    const { record } = this.getUndoData();
    await this.db.insert(this.table, record);
    return { success: true };
  }
}
```

---

## 🔧 高级特性

### 事务模式

```typescript
// 全部成功或全部回滚
const results = await manager.executeBatch(commands, {
  allOrNothing: true,
  parallel: false,
});
```

### 自动分组

```typescript
const manager = new CommandManager({
  enableAutoGrouping: true,
  groupTimeWindow: 1000, // 1 秒内的命令自动分组
});

// 快速执行的命令会被自动分组
await manager.execute(cmd1);
await manager.execute(cmd2);
await manager.execute(cmd3);

// 撤销时会按组撤销
```

### 手动分组

```typescript
manager.startGroup('user-profile-update');

await manager.execute(cmd1);
await manager.execute(cmd2);
await manager.execute(cmd3);

manager.endGroup();
```

### 命令历史

```typescript
const history = manager.getHistory(50);
history.forEach(entry => {
  console.log(`${entry.commandName} - ${entry.action} - ${entry.timestamp}`);
});
```

### 状态持久化

```typescript
// 导出
const state = manager.exportState();
localStorage.setItem('command-state', JSON.stringify(state));

// 导入
const savedState = JSON.parse(localStorage.getItem('command-state'));
manager.importState(savedState);
```

---

## ⚠️ 注意事项

1. **命令必须是幂等的** - 多次执行应产生相同结果
2. **撤销数据必须完整** - 确保 `undo()` 能完全恢复状态
3. **避免副作用** - 命令不应产生无法撤销的副作用
4. **超时处理** - 长时间运行的命令应实现超时逻辑
5. **内存管理** - 大量命令时注意栈深度限制

---

## 📝 完整示例

查看 `command-pattern-pro-skill.examples.ts` 获取完整使用示例：

- ✅ 基础使用
- ✅ 状态管理
- ✅ 事务模式
- ✅ 自定义命令
- ✅ 命令历史
- ✅ 自动分组

---

## 🎯 最佳实践

1. **命令命名** - 使用动词 + 名词格式 (如 `FileWrite`, `UserUpdate`)
2. **错误处理** - 始终返回 `CommandResult`, 不抛出异常
3. **元数据** - 提供详细的命令描述便于调试
4. **分组** - 相关操作使用分组便于批量撤销
5. **测试** - 为每个命令编写单元测试验证 execute/undo

---

**ACE - 让每一个操作都可追溯、可撤销、可重做**
