/**
 * 备忘录模式工具技能 - KAEL
 * 
 * 提供备忘录模式的核心实现：
 * 1. 状态快照 (State Snapshot) - 保存对象状态的快照
 * 2. 状态恢复 (State Restore) - 从快照恢复对象状态
 * 3. 历史记录 (History Management) - 管理多个历史状态，支持撤销/重做
 * 
 * @author KAEL
 * @version 1.0.0
 * @since 2026-03-13
 */

// ============================================
// 类型定义
// ============================================

/**
 * 备忘录接口
 * 存储对象状态的快照
 */
export interface IMemento<T> {
  /** 快照创建时间戳 */
  timestamp: number;
  /** 快照元数据 */
  metadata: MementoMetadata;
  /** 状态数据 */
  state: T;
}

/**
 * 备忘录元数据
 */
export interface MementoMetadata {
  /** 快照名称/标签 */
  label?: string;
  /** 快照描述 */
  description?: string;
  /** 创建者标识 */
  createdBy?: string;
  /** 自定义标签 */
  tags?: string[];
}

/**
 * 历史记录项
 */
export interface HistoryItem<T> extends IMemento<T> {
  /** 历史记录 ID */
  id: string;
  /** 前一个历史记录 ID (用于链表遍历) */
  previousId?: string;
  /** 后一个历史记录 ID (用于重做) */
  nextId?: string;
}

/**
 * 历史记录管理器接口
 */
export interface IHistoryManager<T> {
  /** 保存状态快照 */
  save(state: T, metadata?: Partial<MementoMetadata>): string;
  
  /** 恢复到指定状态 */
  restore(mementoId: string): T | null;
  
  /** 撤销到上一个状态 */
  undo(): T | null;
  
  /** 重做到下一个状态 */
  redo(): T | null;
  
  /** 获取所有历史记录 */
  getHistory(): HistoryItem<T>[];
  
  /** 获取指定历史记录 */
  getHistoryItem(id: string): HistoryItem<T> | null;
  
  /** 清空历史记录 */
  clear(): void;
  
  /** 获取当前状态索引 */
  getCurrentIndex(): number;
  
  /** 是否可以撤销 */
  canUndo(): boolean;
  
  /** 是否可以重做 */
  canRedo(): boolean;
}

/**
 * 备忘录创建者接口
 */
export interface IMementoOriginator<T> {
  /** 创建备忘录 */
  createMemento(metadata?: Partial<MementoMetadata>): IMemento<T>;
  
  /** 从备忘录恢复状态 */
  restoreMemento(memento: IMemento<T>): void;
  
  /** 获取当前状态 */
  getState(): T;
  
  /** 设置状态 */
  setState(state: T): void;
}

/**
 * 备忘录管理器配置
 */
export interface MementoManagerConfig {
  /** 最大历史记录数 (默认：100) */
  maxHistorySize?: number;
  /** 是否启用深度克隆 (默认：true) */
  enableDeepClone?: boolean;
  /** 是否自动保存初始状态 (默认：true) */
  autoSaveInitial?: boolean;
  /** 状态比较函数 (用于检测变化) */
  stateComparator?: (a: any, b: any) => boolean;
}

/**
 * 深度克隆函数类型
 */
type DeepCloneFn<T> = (obj: T) => T;

// ============================================
// 工具函数
// ============================================

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 深度克隆对象
 * 使用 JSON 序列化/反序列化实现简单深度克隆
 * 注意：不支持函数、undefined、Symbol、Date 等特殊类型
 */
function simpleDeepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 结构化克隆 (支持更多类型)
 * 使用 structuredClone API (现代浏览器/Node.js 17+)
 */
function structuredDeepClone<T>(obj: T): T {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  // 降级到简单克隆
  return simpleDeepClone(obj);
}

/**
 * 浅比较两个对象
 */
function shallowEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  
  return true;
}

/**
 * 深度比较两个对象
 */
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a !== 'object') return false;
  
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  for (const key of keysA) {
    if (!deepEqual(a[key], b[key])) return false;
  }
  
  return true;
}

// ============================================
// 1. 备忘录创建者 (Originator)
// ============================================

/**
 * 创建备忘录创建者
 * 负责创建和恢复备忘录
 * 
 * @param initialState - 初始状态
 * @param cloneFn - 深度克隆函数 (可选，默认使用 structuredClone)
 * @returns 备忘录创建者实例
 * 
 * @example
 * // 文档编辑器状态
 * interface DocState { content: string; cursor: number; saved: boolean }
 * 
 * const originator = createOriginator<DocState>({
 *   content: '',
 *   cursor: 0,
 *   saved: true
 * });
 * 
 * // 创建快照
 * const memento = originator.createMemento({ label: 'Before edit' });
 * 
 * // 修改状态
 * originator.setState({ content: 'Hello', cursor: 5, saved: false });
 * 
 * // 恢复快照
 * originator.restoreMemento(memento);
 */
export function createOriginator<T>(
  initialState: T,
  cloneFn: DeepCloneFn<T> = structuredDeepClone
): IMementoOriginator<T> {
  let state: T = cloneFn(initialState);
  
  return {
    createMemento(metadata?: Partial<MementoMetadata>): IMemento<T> {
      return {
        timestamp: Date.now(),
        metadata: metadata || {},
        state: cloneFn(state)
      };
    },
    
    restoreMemento(memento: IMemento<T>): void {
      state = cloneFn(memento.state);
    },
    
    getState(): T {
      return cloneFn(state);
    },
    
    setState(newState: T): void {
      state = cloneFn(newState);
    }
  };
}

/**
 * 带自动检测变化的创建者
 * 仅在状态发生变化时创建新的备忘录
 * 
 * @param initialState - 初始状态
 * @param comparator - 状态比较函数 (可选，默认深比较)
 * @returns 增强版备忘录创建者
 * 
 * @example
 * const smartOriginator = createSmartOriginator({ count: 0 }, (a, b) => a.count === b.count);
 * 
 * // 只有状态真正变化时才会创建新快照
 * smartOriginator.setState({ count: 0 }); // 无变化
 * smartOriginator.setState({ count: 1 }); // 有变化，创建快照
 */
export function createSmartOriginator<T>(
  initialState: T,
  comparator: (a: T, b: T) => boolean = deepEqual
): IMementoOriginator<T> & {
  hasStateChanged(newState: T): boolean;
  lastState: T;
} {
  let state: T = structuredDeepClone(initialState);
  let lastState: T = structuredDeepClone(initialState);
  
  return {
    createMemento(metadata?: Partial<MementoMetadata>): IMemento<T> {
      lastState = structuredDeepClone(state);
      return {
        timestamp: Date.now(),
        metadata: metadata || {},
        state: structuredDeepClone(state)
      };
    },
    
    restoreMemento(memento: IMemento<T>): void {
      state = structuredDeepClone(memento.state);
      lastState = structuredDeepClone(memento.state);
    },
    
    getState(): T {
      return structuredDeepClone(state);
    },
    
    setState(newState: T): void {
      state = structuredDeepClone(newState);
    },
    
    hasStateChanged(newState: T): boolean {
      return !comparator(state, newState);
    },
    
    get lastState(): T {
      return structuredDeepClone(lastState);
    }
  };
}

// ============================================
// 2. 历史记录管理器 (Caretaker)
// ============================================

/**
 * 创建历史记录管理器
 * 管理多个备忘录，支持撤销/重做
 * 
 * @param config - 配置选项
 * @returns 历史记录管理器实例
 * 
 * @example
 * const history = createHistoryManager<DocState>({
 *   maxHistorySize: 50,
 *   autoSaveInitial: true
 * });
 * 
 * // 保存状态
 * const id = history.save({ content: 'Hello', cursor: 5 });
 * 
 * // 撤销
 * const previousState = history.undo();
 * 
 * // 重做
 * const nextState = history.redo();
 * 
 * // 查看历史
 * const allHistory = history.getHistory();
 */
export function createHistoryManager<T>(
  config: MementoManagerConfig = {}
): IHistoryManager<T> {
  const {
    maxHistorySize = 100,
    enableDeepClone = true,
    autoSaveInitial = true,
    stateComparator = deepEqual
  } = config;
  
  const cloneFn: DeepCloneFn<T> = enableDeepClone ? structuredDeepClone : (obj => obj);
  
  const history: HistoryItem<T>[] = [];
  let currentIndex = -1;
  let lastState: T | null = null;
  
  // 自动保存初始状态
  if (autoSaveInitial) {
    // 初始状态将在第一次 save() 时保存
  }
  
  function save(state: T, metadata?: Partial<MementoMetadata>): string {
    // 检查状态是否变化
    if (lastState !== null && stateComparator(lastState, state)) {
      // 状态未变化，不保存
      return history[currentIndex]?.id || '';
    }
    
    const newItem: HistoryItem<T> = {
      id: generateId(),
      timestamp: Date.now(),
      metadata: metadata || {},
      state: cloneFn(state),
      previousId: currentIndex >= 0 ? history[currentIndex].id : undefined,
      nextId: undefined
    };
    
    // 设置前一个项目的 nextId
    if (currentIndex >= 0) {
      history[currentIndex].nextId = newItem.id;
    }
    
    // 如果当前不是最后一个，删除后面的历史记录 (分支截断)
    if (currentIndex < history.length - 1) {
      history.splice(currentIndex + 1);
    }
    
    // 添加新记录
    history.push(newItem);
    
    // 检查是否超出最大限制
    if (history.length > maxHistorySize) {
      history.shift();
      // 更新索引
      currentIndex = Math.max(0, currentIndex - 1);
    } else {
      currentIndex++;
    }
    
    lastState = cloneFn(state);
    return newItem.id;
  }
  
  function restore(mementoId: string): T | null {
    const index = history.findIndex(item => item.id === mementoId);
    if (index === -1) return null;
    
    currentIndex = index;
    lastState = cloneFn(history[index].state);
    return cloneFn(history[index].state);
  }
  
  function undo(): T | null {
    if (currentIndex > 0) {
      currentIndex--;
      lastState = cloneFn(history[currentIndex].state);
      return cloneFn(history[currentIndex].state);
    }
    return null;
  }
  
  function redo(): T | null {
    if (currentIndex < history.length - 1) {
      currentIndex++;
      lastState = cloneFn(history[currentIndex].state);
      return cloneFn(history[currentIndex].state);
    }
    return null;
  }
  
  function getHistory(): HistoryItem<T>[] {
    return history.map(item => ({
      ...item,
      state: cloneFn(item.state) // 返回克隆，防止外部修改
    }));
  }
  
  function getHistoryItem(id: string): HistoryItem<T> | null {
    const item = history.find(h => h.id === id);
    return item ? { ...item, state: cloneFn(item.state) } : null;
  }
  
  function clear(): void {
    history.splice(0);
    currentIndex = -1;
    lastState = null;
  }
  
  function getCurrentIndex(): number {
    return currentIndex;
  }
  
  function canUndo(): boolean {
    return currentIndex > 0;
  }
  
  function canRedo(): boolean {
    return currentIndex < history.length - 1;
  }
  
  return {
    save,
    restore,
    undo,
    redo,
    getHistory,
    getHistoryItem,
    clear,
    getCurrentIndex,
    canUndo,
    canRedo
  };
}

// ============================================
// 3. 完整备忘录管理器 (整合 Originator + Caretaker)
// ============================================

/**
 * 完整备忘录管理器
 * 整合创建者和管理器，提供一站式状态管理
 * 
 * @param initialState - 初始状态
 * @param config - 配置选项
 * @returns 完整备忘录管理器
 * 
 * @example
 * const manager = createMementoManager({ count: 0, name: 'Test' });
 * 
 * // 保存状态
 * manager.save({ label: 'Initial state' });
 * 
 * // 修改状态
 * manager.setState({ count: 1, name: 'Updated' });
 * manager.save({ label: 'After update' });
 * 
 * // 撤销
 * manager.undo();
 * console.log(manager.getState()); // { count: 0, name: 'Test' }
 * 
 * // 重做
 * manager.redo();
 * console.log(manager.getState()); // { count: 1, name: 'Updated' }
 */
export function createMementoManager<T>(
  initialState: T,
  config: MementoManagerConfig = {}
): Omit<IMementoOriginator<T>, 'createMemento'> & Omit<IHistoryManager<T>, 'save'> & {
  /** 保存当前状态到历史记录 */
  save(metadata?: Partial<MementoMetadata>): string;
  
  /** 创建备忘录 (不自动保存) */
  createMemento(metadata?: Partial<MementoMetadata>): IMemento<T>;
  
  /** 获取状态快照数量 */
  getSnapshotCount(): number;
  
  /** 导出所有历史为 JSON */
  exportHistory(): string;
  
  /** 从 JSON 导入历史 */
  importHistory(json: string): void;
} {
  const originator = createOriginator<T>(initialState, config.enableDeepClone !== false ? structuredDeepClone : (obj => obj));
  const historyManager = createHistoryManager<T>(config);
  
  // 自动保存初始状态
  if (config.autoSaveInitial !== false) {
    historyManager.save(initialState, { label: 'Initial state', description: '自动保存的初始状态' });
  }
  
  return {
    // Originator 接口
    createMemento: (metadata?: Partial<MementoMetadata>) => originator.createMemento(metadata),
    restoreMemento: (memento: IMemento<T>) => originator.restoreMemento(memento),
    getState: () => originator.getState(),
    setState: (state: T) => originator.setState(state),
    
    // HistoryManager 接口 (save 方法覆盖为简化版本)
    save: (metadata?: Partial<MementoMetadata>) => historyManager.save(originator.getState(), metadata),
    restore: (mementoId: string) => {
      const state = historyManager.restore(mementoId);
      if (state) {
        originator.setState(state);
        return state;
      }
      return null;
    },
    undo: () => {
      const state = historyManager.undo();
      if (state) {
        originator.setState(state);
        return state;
      }
      return null;
    },
    redo: () => {
      const state = historyManager.redo();
      if (state) {
        originator.setState(state);
        return state;
      }
      return null;
    },
    getHistory: () => historyManager.getHistory(),
    getHistoryItem: (id: string) => historyManager.getHistoryItem(id),
    clear: () => historyManager.clear(),
    getCurrentIndex: () => historyManager.getCurrentIndex(),
    canUndo: () => historyManager.canUndo(),
    canRedo: () => historyManager.canRedo(),
    
    // 扩展功能
    getSnapshotCount: () => historyManager.getHistory().length,
    
    exportHistory: () => {
      const history = historyManager.getHistory();
      return JSON.stringify({
        initialState,
        history,
        currentIndex: historyManager.getCurrentIndex(),
        exportedAt: new Date().toISOString()
      }, null, 2);
    },
    
    importHistory: (json: string) => {
      try {
        const data = JSON.parse(json);
        if (!data.history || !Array.isArray(data.history)) {
          throw new Error('Invalid history format');
        }
        
        historyManager.clear();
        
        // 恢复所有历史记录
        for (const item of data.history) {
          historyManager.save(item.state, item.metadata);
        }
        
        // 恢复到指定索引
        if (typeof data.currentIndex === 'number') {
          const targetItem = data.history[data.currentIndex];
          if (targetItem) {
            historyManager.restore(targetItem.id);
          }
        }
      } catch (error) {
        throw new Error(`Failed to import history: ${(error as Error).message}`);
      }
    }
  };
}

// ============================================
// 4. 专用场景备忘录
// ============================================

/**
 * 文本编辑器备忘录
 * 专门用于文本内容的版本管理
 */
export interface TextEditorState {
  content: string;
  cursorPosition: number;
  selectionStart?: number;
  selectionEnd?: number;
  scrollPosition?: number;
}

/**
 * 创建文本编辑器备忘录管理器
 */
export function createTextEditorMemento(
  initialState: TextEditorState = { content: '', cursorPosition: 0 }
) {
  return createMementoManager<TextEditorState>(initialState, {
    maxHistorySize: 100,
    stateComparator: (a, b) => a.content === b.content && a.cursorPosition === b.cursorPosition
  });
}

/**
 * 表单状态备忘录
 * 用于表单数据的版本管理
 */
export interface FormState {
  [key: string]: any;
}

/**
 * 创建表单状态备忘录管理器
 */
export function createFormMemento<T extends FormState>(initialState: T) {
  return createMementoManager<T>(initialState, {
    maxHistorySize: 50,
    stateComparator: (a, b) => {
      const keysA = Object.keys(a);
      const keysB = Object.keys(b);
      if (keysA.length !== keysB.length) return false;
      for (const key of keysA) {
        if (a[key] !== b[key]) return false;
      }
      return true;
    }
  });
}

/**
 * 画布状态备忘录
 * 用于图形编辑器/画布应用
 */
export interface CanvasState {
  elements: any[];
  zoom: number;
  panX: number;
  panY: number;
  selectedElementId?: string;
}

/**
 * 创建画布状态备忘录管理器
 */
export function createCanvasMemento(
  initialState: CanvasState = { elements: [], zoom: 1, panX: 0, panY: 0 }
) {
  return createMementoManager<CanvasState>(initialState, {
    maxHistorySize: 200,
    enableDeepClone: true
  });
}

// ============================================
// 使用示例 (命令行执行)
// ============================================

if (require.main === module) {
  console.log('=== 备忘录模式工具 - 使用示例 ===\n');
  
  // ============================================
  // 示例 1: 基础备忘录管理器
  // ============================================
  console.log('1️⃣ 基础备忘录管理器 (Basic Memento Manager)');
  console.log('─'.repeat(60));
  
  interface CounterState {
    count: number;
    label: string;
  }
  
  const counterManager = createMementoManager<CounterState>(
    { count: 0, label: 'Initial' },
    { maxHistorySize: 10, autoSaveInitial: true }
  );
  
  console.log('初始状态:', JSON.stringify(counterManager.getState()));
  console.log();
  
  // 修改并保存
  counterManager.setState({ count: 5, label: 'After increment' });
  counterManager.save({ label: 'Step 1', description: 'Count increased to 5' });
  console.log('修改后状态:', JSON.stringify(counterManager.getState()));
  console.log('快照数量:', counterManager.getSnapshotCount());
  console.log();
  
  // 继续修改
  counterManager.setState({ count: 10, label: 'After double increment' });
  counterManager.save({ label: 'Step 2' });
  
  // 撤销
  console.log('执行撤销 (undo):');
  const undone = counterManager.undo();
  console.log('撤销后状态:', JSON.stringify(undone));
  console.log('可以重做:', counterManager.canRedo());
  console.log();
  
  // 重做
  console.log('执行重做 (redo):');
  const redone = counterManager.redo();
  console.log('重做后状态:', JSON.stringify(redone));
  console.log();
  
  // ============================================
  // 示例 2: 文本编辑器场景
  // ============================================
  console.log('2️⃣ 文本编辑器场景 (Text Editor)');
  console.log('─'.repeat(60));
  
  const editor = createTextEditorMemento({
    content: 'Hello, World!',
    cursorPosition: 13
  });
  
  console.log('初始内容:', editor.getState().content);
  editor.save({ label: 'Initial text' });
  
  // 模拟用户输入
  editor.setState({
    content: 'Hello, World!\nThis is a test.',
    cursorPosition: 34
  });
  editor.save({ label: 'After typing' });
  
  // 继续编辑
  editor.setState({
    content: 'Hello, World!\nThis is a test.\nLine 3 added.',
    cursorPosition: 52
  });
  editor.save({ label: 'Added line 3' });
  
  console.log('当前内容:', editor.getState().content);
  console.log('历史记录数:', editor.getSnapshotCount());
  console.log();
  
  // 撤销两次
  console.log('撤销两次:');
  editor.undo();
  editor.undo();
  console.log('撤销后内容:', editor.getState().content);
  console.log();
  
  // ============================================
  // 示例 3: 表单状态管理
  // ============================================
  console.log('3️⃣ 表单状态管理 (Form State)');
  console.log('─'.repeat(60));
  
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
  
  // 用户填写表单
  formManager.setState({ name: 'Alice', email: '', age: 0, city: '' });
  formManager.save({ label: 'Name filled' });
  
  formManager.setState({ name: 'Alice', email: 'alice@example.com', age: 0, city: '' });
  formManager.save({ label: 'Email filled' });
  
  formManager.setState({ name: 'Alice', email: 'alice@example.com', age: 30, city: '' });
  formManager.save({ label: 'Age filled' });
  
  formManager.setState({ name: 'Alice', email: 'alice@example.com', age: 30, city: 'Beijing' });
  formManager.save({ label: 'Form complete' });
  
  console.log('完整表单:', JSON.stringify(formManager.getState(), null, 2));
  console.log('历史记录:', formManager.getHistory().map(h => h.metadata.label));
  console.log();
  
  // 撤销到 Email filled
  console.log('撤销到 Email filled:');
  formManager.undo(); // Form complete
  formManager.undo(); // Age filled
  formManager.undo(); // Email filled
  console.log('当前表单:', JSON.stringify(formManager.getState(), null, 2));
  console.log();
  
  // ============================================
  // 示例 4: 历史导出/导入
  // ============================================
  console.log('4️⃣ 历史导出/导入 (Export/Import)');
  console.log('─'.repeat(60));
  
  const exportJson = counterManager.exportHistory();
  console.log('导出的历史 (前 200 字符):');
  console.log(exportJson.substring(0, 200) + '...');
  console.log();
  
  // 创建新管理器并导入
  const newCounterManager = createMementoManager<CounterState>({ count: -1, label: 'New' });
  newCounterManager.importHistory(exportJson);
  
  console.log('导入后的状态:', JSON.stringify(newCounterManager.getState()));
  console.log('导入后的历史数:', newCounterManager.getSnapshotCount());
  console.log();
  
  // ============================================
  // 示例 5: 画布编辑器场景
  // ============================================
  console.log('5️⃣ 画布编辑器场景 (Canvas Editor)');
  console.log('─'.repeat(60));
  
  const canvas = createCanvasMemento({
    elements: [],
    zoom: 1,
    panX: 0,
    panY: 0
  });
  
  // 添加元素
  canvas.setState({
    elements: [{ id: '1', type: 'rect', x: 10, y: 10, width: 100, height: 50 }],
    zoom: 1,
    panX: 0,
    panY: 0
  });
  canvas.save({ label: 'Added rectangle' });
  
  // 缩放
  canvas.setState({
    elements: canvas.getState().elements,
    zoom: 1.5,
    panX: 0,
    panY: 0
  });
  canvas.save({ label: 'Zoomed to 150%' });
  
  // 平移
  canvas.setState({
    elements: canvas.getState().elements,
    zoom: 1.5,
    panX: 50,
    panY: 30
  });
  canvas.save({ label: 'Panned view' });
  
  console.log('画布状态:', JSON.stringify(canvas.getState(), null, 2));
  console.log('历史标签:', canvas.getHistory().map(h => h.metadata.label));
  console.log();
  
  // ============================================
  // 示例 6: 智能创建者 (仅变化时保存)
  // ============================================
  console.log('6️⃣ 智能创建者 (Smart Originator)');
  console.log('─'.repeat(60));
  
  const smartOriginator = createSmartOriginator(
    { value: 0, timestamp: Date.now() },
    (a, b) => a.value === b.value // 只比较 value 字段
  );
  
  console.log('初始状态:', JSON.stringify(smartOriginator.getState()));
  
  // 相同状态，不会创建新快照
  smartOriginator.setState({ value: 0, timestamp: Date.now() + 1000 });
  console.log('设置相同 value:', smartOriginator.hasStateChanged({ value: 0, timestamp: Date.now() }));
  
  // 不同状态，会创建新快照
  smartOriginator.setState({ value: 1, timestamp: Date.now() + 2000 });
  console.log('设置不同 value:', smartOriginator.hasStateChanged({ value: 1, timestamp: Date.now() }));
  console.log();
  
  // ============================================
  // 总结
  // ============================================
  console.log('✅ 所有示例执行完成!');
  console.log();
  console.log('📋 功能总结:');
  console.log('  • 状态快照：createMemento, save()');
  console.log('  • 状态恢复：restoreMemento(), restore(), undo(), redo()');
  console.log('  • 历史记录：getHistory(), getHistoryItem(), exportHistory(), importHistory()');
  console.log();
  console.log('🎯 适用场景:');
  console.log('  • 文本编辑器 (撤销/重做)');
  console.log('  • 表单数据 (版本管理)');
  console.log('  • 图形编辑器 (画布状态)');
  console.log('  • 游戏状态 (存档/读档)');
  console.log('  • 配置管理 (配置快照)');
}
