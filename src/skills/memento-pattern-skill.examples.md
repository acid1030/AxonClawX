# 备忘录模式工具 - 使用示例

**作者:** KAEL  
**版本:** 1.0.0  
**创建时间:** 2026-03-13

---

## 📚 快速开始

### 安装

无需额外安装，文件位于 `src/skills/memento-pattern-skill.ts`

### 导入

```typescript
import {
  createMementoManager,
  createOriginator,
  createHistoryManager,
  createTextEditorMemento,
  createFormMemento,
  createCanvasMemento
} from './skills/memento-pattern-skill';
```

---

## 🎯 核心功能

### 1. 基础状态管理

```typescript
// 创建状态管理器
interface AppState {
  count: number;
  theme: 'light' | 'dark';
  user: string;
}

const manager = createMementoManager<AppState>({
  count: 0,
  theme: 'light',
  user: 'Guest'
});

// 保存状态
manager.save({ label: 'Initial state' });

// 修改状态
manager.setState({ count: 5, theme: 'dark', user: 'Alice' });
manager.save({ label: 'After login' });

// 撤销
manager.undo();
console.log(manager.getState()); 
// { count: 0, theme: 'light', user: 'Guest' }

// 重做
manager.redo();
console.log(manager.getState());
// { count: 5, theme: 'dark', user: 'Alice' }

// 查看历史
const history = manager.getHistory();
console.log(history.map(h => h.metadata.label));
// ['Initial state', 'After login']
```

---

### 2. 文本编辑器 (撤销/重做)

```typescript
// 创建文本编辑器管理器
const editor = createTextEditorMemento({
  content: 'Hello, World!',
  cursorPosition: 13
});

// 用户输入
editor.setState({
  content: 'Hello, World!\nThis is a test.',
  cursorPosition: 34
});
editor.save({ label: 'Typed paragraph' });

// 继续编辑
editor.setState({
  content: 'Hello, World!\nThis is a test.\nLine 3',
  cursorPosition: 45
});
editor.save({ label: 'Added line 3' });

// 撤销 (Ctrl+Z)
editor.undo();
console.log(editor.getState().content);
// 'Hello, World!\nThis is a test.'

// 重做 (Ctrl+Y)
editor.redo();
```

**完整示例:**

```typescript
class TextEditor {
  private memento = createTextEditorMemento();
  
  type(text: string) {
    const state = this.memento.getState();
    this.memento.setState({
      content: state.content + text,
      cursorPosition: state.cursorPosition + text.length
    });
    this.memento.save({ label: `Typed: "${text}"` });
  }
  
  undo() {
    if (this.memento.canUndo()) {
      this.memento.undo();
      this.render();
    }
  }
  
  redo() {
    if (this.memento.canRedo()) {
      this.memento.redo();
      this.render();
    }
  }
  
  private render() {
    const state = this.memento.getState();
    console.log(`Content: ${state.content}`);
    console.log(`Cursor: ${state.cursorPosition}`);
  }
}

// 使用
const editor = new TextEditor();
editor.type('Hello');
editor.type(' World');
editor.undo(); // 撤销 " World"
editor.redo();  // 重做 " World"
```

---

### 3. 表单数据版本管理

```typescript
interface UserForm {
  name: string;
  email: string;
  age: number;
  city: string;
}

const formManager = createFormMemento<UserForm>({
  name: '',
  email: '',
  age: 0,
  city: ''
});

// 用户填写表单的每个步骤都保存
formManager.setState({ name: 'Alice', email: '', age: 0, city: '' });
formManager.save({ label: 'Step 1: Name' });

formManager.setState({ name: 'Alice', email: 'alice@example.com', age: 0, city: '' });
formManager.save({ label: 'Step 2: Email' });

formManager.setState({ name: 'Alice', email: 'alice@example.com', age: 30, city: '' });
formManager.save({ label: 'Step 3: Age' });

formManager.setState({ name: 'Alice', email: 'alice@example.com', age: 30, city: 'Beijing' });
formManager.save({ label: 'Step 4: Complete' });

// 用户可以回溯到任何步骤
const history = formManager.getHistory();
const step2 = history.find(h => h.metadata.label === 'Step 2: Email');
if (step2) {
  formManager.restore(step2.id);
  console.log(formManager.getState());
  // { name: 'Alice', email: 'alice@example.com', age: 0, city: '' }
}
```

---

### 4. 图形编辑器 (画布状态)

```typescript
interface CanvasState {
  elements: Array<{
    id: string;
    type: 'rect' | 'circle' | 'line';
    x: number;
    y: number;
    width?: number;
    height?: number;
    radius?: number;
  }>;
  zoom: number;
  panX: number;
  panY: number;
  selectedElementId?: string;
}

const canvasManager = createCanvasMemento({
  elements: [],
  zoom: 1,
  panX: 0,
  panY: 0
});

// 添加矩形
canvasManager.setState({
  elements: [{
    id: '1',
    type: 'rect',
    x: 10,
    y: 10,
    width: 100,
    height: 50
  }],
  zoom: 1,
  panX: 0,
  panY: 0
});
canvasManager.save({ label: 'Added rectangle' });

// 缩放
canvasManager.setState({
  ...canvasManager.getState(),
  zoom: 1.5
});
canvasManager.save({ label: 'Zoomed to 150%' });

// 平移
canvasManager.setState({
  ...canvasManager.getState(),
  panX: 50,
  panY: 30
});
canvasManager.save({ label: 'Panned view' });

// 撤销所有操作
while (canvasManager.canUndo()) {
  canvasManager.undo();
}
```

---

### 5. 历史导出/导入 (持久化)

```typescript
// 导出历史记录
const jsonExport = manager.exportHistory();
console.log(jsonExport);
// {
//   "initialState": { ... },
//   "history": [ ... ],
//   "currentIndex": 2,
//   "exportedAt": "2026-03-13T12:00:00.000Z"
// }

// 保存到本地存储 (浏览器)
localStorage.setItem('app-history', jsonExport);

// 从本地存储恢复
const savedHistory = localStorage.getItem('app-history');
if (savedHistory) {
  const newManager = createMementoManager<AppState>({ count: 0, theme: 'light', user: 'Guest' });
  newManager.importHistory(savedHistory);
  console.log('恢复的状态:', newManager.getState());
}

// 保存到文件 (Node.js)
import * as fs from 'fs';
fs.writeFileSync('history.json', jsonExport);

// 从文件加载
const loadedHistory = fs.readFileSync('history.json', 'utf-8');
manager.importHistory(loadedHistory);
```

---

### 6. 自定义配置

```typescript
const manager = createMementoManager<MyState>(initialState, {
  // 最大历史记录数
  maxHistorySize: 50, // 默认 100
  
  // 是否启用深度克隆
  enableDeepClone: true, // 默认 true
  
  // 是否自动保存初始状态
  autoSaveInitial: true, // 默认 true
  
  // 自定义状态比较函数 (用于检测变化)
  stateComparator: (a, b) => {
    // 只比较特定字段
    return a.id === b.id && a.version === b.version;
  }
});
```

---

### 7. 智能创建者 (Smart Originator)

```typescript
// 创建智能创建者 (仅在状态真正变化时创建快照)
const smartOriginator = createSmartOriginator(
  { value: 0, timestamp: Date.now() },
  (a, b) => a.value === b.value // 只比较 value 字段
);

// 设置相同 value，不会创建新快照
smartOriginator.setState({ value: 0, timestamp: Date.now() + 1000 });
console.log(smartOriginator.hasStateChanged({ value: 0 })); // false

// 设置不同 value，会创建新快照
smartOriginator.setState({ value: 1, timestamp: Date.now() + 2000 });
console.log(smartOriginator.hasStateChanged({ value: 1 })); // true
```

---

## 🎨 实际应用场景

### 场景 1: 游戏存档系统

```typescript
interface GameState {
  player: {
    name: string;
    level: number;
    hp: number;
    mp: number;
    position: { x: number; y: number };
  };
  inventory: Array<{ itemId: string; quantity: number }>;
  questProgress: Record<string, number>;
  gameTime: number;
}

const gameManager = createMementoManager<GameState>(initialGameState, {
  maxHistorySize: 10 // 最多 10 个存档位
});

// 自动存档 (每 5 分钟)
setInterval(() => {
  gameManager.save({
    label: 'Auto-save',
    description: `Level ${gameManager.getState().player.level}`
  });
}, 5 * 60 * 1000);

// 手动存档
function quickSave() {
  gameManager.save({
    label: 'Quick Save',
    createdBy: 'player'
  });
}

// 读档
function loadGame(saveId: string) {
  const state = gameManager.restore(saveId);
  if (state) {
    renderGame(state);
  }
}

// 查看存档列表
function getSaveList() {
  return gameManager.getHistory().map(h => ({
    id: h.id,
    label: h.metadata.label,
    level: (h.state as GameState).player.level,
    gameTime: h.state.gameTime,
    timestamp: h.timestamp
  }));
}
```

---

### 场景 2: IDE 代码编辑器

```typescript
interface EditorState {
  content: string;
  cursorPosition: number;
  selections: Array<{ start: number; end: number }>;
  scrollPosition: number;
  breakpoints: number[];
  activeTab: string;
}

class CodeEditor {
  private memento = createTextEditorMemento();
  private undoStack: string[] = [];
  
  constructor() {
    // 键盘快捷键
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        this.undo();
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        this.redo();
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        this.save();
      }
    });
  }
  
  type(text: string) {
    const state = this.memento.getState();
    const newContent = this.insertText(state.content, state.cursorPosition, text);
    
    this.memento.setState({
      ...state,
      content: newContent,
      cursorPosition: state.cursorPosition + text.length
    });
    
    // 每 10 次输入保存一次快照
    if (this.undoStack.length % 10 === 0) {
      this.memento.save({ label: 'Typing session' });
    }
  }
  
  undo() {
    if (this.memento.canUndo()) {
      this.memento.undo();
      this.render();
    }
  }
  
  redo() {
    if (this.memento.canRedo()) {
      this.memento.redo();
      this.render();
    }
  }
  
  save() {
    const state = this.memento.getState();
    this.memento.save({
      label: 'Manual save',
      description: `${state.content.length} characters`
    });
    console.log('Saved!');
  }
  
  private render() {
    const state = this.memento.getState();
    // 更新 UI
  }
  
  private insertText(content: string, position: number, text: string): string {
    return content.slice(0, position) + text + content.slice(position);
  }
}
```

---

### 场景 3: 设计工具 (Figma 风格)

```typescript
interface DesignState {
  layers: Array<{
    id: string;
    name: string;
    type: 'frame' | 'rect' | 'text' | 'image';
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    fill: string;
    children?: string[]; // 子图层 ID
  }>;
  selectedLayerIds: string[];
  artboardId: string;
  zoom: number;
  viewTransform: { x: number; y: number };
}

class DesignTool {
  private memento = createCanvasMemento();
  
  addLayer(layer: any) {
    const state = this.memento.getState();
    this.memento.setState({
      ...state,
      elements: [...state.elements, layer]
    });
    this.memento.save({ label: `Added ${layer.type}` });
  }
  
  moveLayer(layerId: string, x: number, y: number) {
    const state = this.memento.getState();
    const newElements = state.elements.map(el =>
      el.id === layerId ? { ...el, x, y } : el
    );
    this.memento.setState({ ...state, elements: newElements });
    this.memento.save({ label: `Moved layer ${layerId}` });
  }
  
  undo() {
    if (this.memento.canUndo()) {
      this.memento.undo();
      this.render();
    }
  }
  
  redo() {
    if (this.memento.canRedo()) {
      this.memento.redo();
      this.render();
    }
  }
  
  // 时间旅行调试
  goToHistory(index: number) {
    const history = this.memento.getHistory();
    if (index >= 0 && index < history.length) {
      this.memento.restore(history[index].id);
      this.render();
    }
  }
  
  private render() {
    const state = this.memento.getState();
    // 渲染画布
  }
}
```

---

## ⚠️ 注意事项

### 1. 深度克隆限制

默认使用 `structuredClone`，但某些类型可能无法克隆:

```typescript
// ❌ 不支持的类型
const state = {
  func: () => {},           // 函数
  promise: Promise.resolve(), // Promise
  map: new Map(),           // Map (部分支持)
  set: new Set(),           // Set (部分支持)
  element: document.body    // DOM 元素
};

// ✅ 解决方案：序列化
const safeState = {
  data: JSON.stringify(complexData),
  metadata: { type: 'complex', version: 1 }
};
```

### 2. 性能优化

对于大型状态，考虑以下优化:

```typescript
// 1. 限制历史记录数量
const manager = createMementoManager<LargeState>(initial, {
  maxHistorySize: 20 // 减少到 20
});

// 2. 使用浅比较 (如果状态不可变)
const manager = createMementoManager<State>(initial, {
  stateComparator: (a, b) => a === b // 引用比较
});

// 3. 手动控制保存时机
let changeCount = 0;
function onStateChange() {
  changeCount++;
  if (changeCount >= 10) {
    manager.save(); // 每 10 次变化保存一次
    changeCount = 0;
  }
}
```

### 3. 内存管理

```typescript
// 定期清理旧历史
function cleanupOldHistory() {
  const history = manager.getHistory();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  
  // 删除 1 小时前的历史 (保留最近 5 个)
  const oldHistory = history.filter(h => h.timestamp < oneHourAgo);
  if (oldHistory.length > 5) {
    manager.clear();
    // 重新保存最近的 5 个
    history.slice(-5).forEach(h => {
      manager.save(h.state, h.metadata);
    });
  }
}
```

---

## 📊 API 参考

### createMementoManager<T>(initialState, config)

创建完整的备忘录管理器

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| initialState | T | 必填 | 初始状态 |
| config.maxHistorySize | number | 100 | 最大历史记录数 |
| config.enableDeepClone | boolean | true | 是否启用深度克隆 |
| config.autoSaveInitial | boolean | true | 是否自动保存初始状态 |
| config.stateComparator | function | deepEqual | 状态比较函数 |

**返回方法:**

| 方法 | 参数 | 返回 | 说明 |
|------|------|------|------|
| getState | - | T | 获取当前状态 |
| setState | state: T | void | 设置当前状态 |
| save | metadata?: MementoMetadata | string | 保存快照，返回 ID |
| restore | mementoId: string | T\|null | 恢复到指定快照 |
| undo | - | T\|null | 撤销到上一个状态 |
| redo | - | T\|null | 重做到下一个状态 |
| canUndo | - | boolean | 是否可以撤销 |
| canRedo | - | boolean | 是否可以重做 |
| getHistory | - | HistoryItem[] | 获取所有历史 |
| getSnapshotCount | - | number | 获取快照数量 |
| clear | - | void | 清空历史 |
| exportHistory | - | string | 导出为 JSON |
| importHistory | json: string | void | 从 JSON 导入 |

---

## 🧪 测试

运行示例:

```bash
cd /Users/nike/.openclaw/workspace
npx ts-node src/skills/memento-pattern-skill.ts
```

---

## 📝 总结

备忘录模式适用于任何需要**状态版本管理**的场景:

✅ **适用场景:**
- 文本/代码编辑器 (撤销/重做)
- 图形设计工具 (操作历史)
- 表单数据 (版本回溯)
- 游戏存档 (保存/读取)
- 配置管理 (配置快照)
- 工作流引擎 (状态回滚)

❌ **不适用场景:**
- 超大型状态 (性能问题)
- 实时协作编辑 (需要 OT/CRDT)
- 需要精确二进制序列化 (使用专业库)

---

**最后更新:** 2026-03-13  
**维护者:** KAEL
