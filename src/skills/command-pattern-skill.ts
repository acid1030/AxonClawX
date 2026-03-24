/**
 * Command Pattern Skill - KAEL Engineering
 * 
 * 提供命令模式实现，支持：
 * 1. 命令接口定义
 * 2. 命令队列管理
 * 3. 撤销/重做功能
 * 
 * @author KAEL
 * @version 1.0.0
 */

// ==================== 命令接口 ====================

/**
 * 命令接口
 * 所有具体命令必须实现此接口
 */
export interface ICommand {
  /**
   * 执行命令
   */
  execute(): void;
  
  /**
   * 撤销命令
   */
  undo(): void;
  
  /**
   * 获取命令描述（用于日志/UI 显示）
   */
  getDescription(): string;
  
  /**
   * 获取命令时间戳
   */
  getTimestamp(): number;
}

// ==================== 命令基类 ====================

/**
 * 命令基类
 * 提供通用的时间戳和描述功能
 */
export abstract class Command implements ICommand {
  protected timestamp: number;
  protected description: string;
  
  constructor(description: string) {
    this.timestamp = Date.now();
    this.description = description;
  }
  
  abstract execute(): void;
  abstract undo(): void;
  
  getDescription(): string {
    return this.description;
  }
  
  getTimestamp(): number {
    return this.timestamp;
  }
}

// ==================== 命令队列 ====================

/**
 * 命令队列配置
 */
export interface CommandQueueConfig {
  /** 最大历史记录数（用于撤销/重做） */
  maxHistorySize: number;
  /** 是否启用自动执行 */
  autoExecute: boolean;
  /** 是否记录日志 */
  enableLogging: boolean;
}

/**
 * 命令执行结果
 */
export interface CommandResult {
  success: boolean;
  command: ICommand;
  error?: Error;
  timestamp: number;
}

/**
 * 命令队列
 * 管理命令的执行、撤销、重做
 */
export class CommandQueue {
  private executeStack: ICommand[] = [];
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private results: CommandResult[] = [];
  private config: CommandQueueConfig;
  private listeners: ((result: CommandResult) => void)[] = [];
  private isUndoing: boolean = false;
  private isRedoing: boolean = false;

  constructor(config?: Partial<CommandQueueConfig>) {
    this.config = {
      maxHistorySize: 100,
      autoExecute: true,
      enableLogging: true,
      ...config,
    };
  }

  /**
   * 添加并执行命令
   */
  push(command: ICommand): CommandResult {
    const result = this.executeCommand(command);
    
    if (result.success) {
      this.executeStack.push(command);
      this.undoStack.push(command);
      this.redoStack = []; // 清空重做栈
      
      // 限制历史记录大小
      if (this.undoStack.length > this.config.maxHistorySize) {
        this.undoStack.shift();
      }
      if (this.executeStack.length > this.config.maxHistorySize) {
        this.executeStack.shift();
      }
    }
    
    this.results.push(result);
    this.notifyListeners(result);
    
    return result;
  }

  /**
   * 执行单个命令
   */
  private executeCommand(command: ICommand): CommandResult {
    try {
      if (this.config.enableLogging && !this.isUndoing && !this.isRedoing) {
        console.log(`[CommandQueue] Executing: ${command.getDescription()}`);
      }
      
      command.execute();
      
      return {
        success: true,
        command,
        timestamp: Date.now(),
      };
    } catch (error) {
      const result: CommandResult = {
        success: false,
        command,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: Date.now(),
      };
      
      if (this.config.enableLogging) {
        console.error(`[CommandQueue] Failed: ${command.getDescription()}`, error);
      }
      
      return result;
    }
  }

  /**
   * 撤销上一个命令
   */
  undo(): CommandResult | null {
    if (this.undoStack.length === 0) {
      if (this.config.enableLogging) {
        console.log('[CommandQueue] Nothing to undo');
      }
      return null;
    }

    const command = this.undoStack.pop()!;
    this.isUndoing = true;
    
    try {
      if (this.config.enableLogging) {
        console.log(`[CommandQueue] Undoing: ${command.getDescription()}`);
      }
      
      command.undo();
      this.redoStack.push(command);
      
      const result: CommandResult = {
        success: true,
        command,
        timestamp: Date.now(),
      };
      
      this.results.push(result);
      this.notifyListeners(result);
      
      return result;
    } catch (error) {
      const result: CommandResult = {
        success: false,
        command,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: Date.now(),
      };
      
      if (this.config.enableLogging) {
        console.error(`[CommandQueue] Undo failed: ${command.getDescription()}`, error);
      }
      
      return result;
    } finally {
      this.isUndoing = false;
    }
  }

  /**
   * 重做上一个撤销的命令
   */
  redo(): CommandResult | null {
    if (this.redoStack.length === 0) {
      if (this.config.enableLogging) {
        console.log('[CommandQueue] Nothing to redo');
      }
      return null;
    }

    const command = this.redoStack.pop()!;
    this.isRedoing = true;
    
    try {
      if (this.config.enableLogging) {
        console.log(`[CommandQueue] Redoing: ${command.getDescription()}`);
      }
      
      command.execute();
      this.undoStack.push(command);
      
      const result: CommandResult = {
        success: true,
        command,
        timestamp: Date.now(),
      };
      
      this.results.push(result);
      this.notifyListeners(result);
      
      return result;
    } catch (error) {
      const result: CommandResult = {
        success: false,
        command,
        error: error instanceof Error ? error : new Error(String(error)),
        timestamp: Date.now(),
      };
      
      if (this.config.enableLogging) {
        console.error(`[CommandQueue] Redo failed: ${command.getDescription()}`, error);
      }
      
      return result;
    } finally {
      this.isRedoing = false;
    }
  }

  /**
   * 批量执行命令
   */
  executeBatch(commands: ICommand[]): CommandResult[] {
    return commands.map(cmd => this.push(cmd));
  }

  /**
   * 清空所有历史
   */
  clear(): void {
    this.executeStack = [];
    this.undoStack = [];
    this.redoStack = [];
    this.results = [];
    
    if (this.config.enableLogging) {
      console.log('[CommandQueue] History cleared');
    }
  }

  /**
   * 获取执行栈大小
   */
  getExecuteStackSize(): number {
    return this.executeStack.length;
  }

  /**
   * 获取撤销栈大小
   */
  getUndoStackSize(): number {
    return this.undoStack.length;
  }

  /**
   * 获取重做栈大小
   */
  getRedoStackSize(): number {
    return this.redoStack.length;
  }

  /**
   * 获取所有执行结果
   */
  getResults(): CommandResult[] {
    return [...this.results];
  }

  /**
   * 注册监听器
   */
  addListener(listener: (result: CommandResult) => void): void {
    this.listeners.push(listener);
  }

  /**
   * 移除监听器
   */
  removeListener(listener: (result: CommandResult) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 通知所有监听器
   */
  private notifyListeners(result: CommandResult): void {
    this.listeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.error('[CommandQueue] Listener error:', error);
      }
    });
  }
}

// ==================== 宏命令（组合命令） ====================

/**
 * 宏命令
 * 将多个命令组合成一个命令执行
 */
export class MacroCommand extends Command {
  private commands: ICommand[] = [];

  constructor(description: string) {
    super(description);
  }

  addCommand(command: ICommand): void {
    this.commands.push(command);
  }

  execute(): void {
    this.commands.forEach(cmd => cmd.execute());
  }

  undo(): void {
    // 反向撤销
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  getCommands(): ICommand[] {
    return [...this.commands];
  }
}

// ==================== 使用示例 ====================

/**
 * 示例：文本编辑器命令
 */
export class TextEditCommand extends Command {
  private target: { text: string };
  private oldText: string;
  private newText: string;

  constructor(target: { text: string }, newText: string, description: string) {
    super(description);
    this.target = target;
    this.newText = newText;
    this.oldText = target.text;
  }

  execute(): void {
    this.target.text = this.newText;
  }

  undo(): void {
    this.target.text = this.oldText;
  }
}

/**
 * 示例：添加/删除项目命令
 */
export class AddItemCommand extends Command {
  private list: string[];
  private item: string;
  private index: number = -1;

  constructor(list: string[], item: string, description: string) {
    super(description);
    this.list = list;
    this.item = item;
  }

  execute(): void {
    this.list.push(this.item);
    this.index = this.list.length - 1;
  }

  undo(): void {
    if (this.index >= 0) {
      this.list.splice(this.index, 1);
    }
  }
}

/**
 * 示例：删除项目命令
 */
export class RemoveItemCommand extends Command {
  private list: string[];
  private index: number;
  private removedItem: string | null = null;

  constructor(list: string[], index: number, description: string) {
    super(description);
    this.list = list;
    this.index = index;
  }

  execute(): void {
    if (index >= 0 && index < this.list.length) {
      this.removedItem = this.list.splice(this.index, 1)[0];
    }
  }

  undo(): void {
    if (this.removedItem !== null) {
      this.list.splice(this.index, 0, this.removedItem);
    }
  }
}

// ==================== 使用示例代码 ====================

/**
 * 使用示例
 * 
 * @example
 * ```typescript
 * // 1. 创建命令队列
 * const queue = new CommandQueue({
 *   maxHistorySize: 50,
 *   autoExecute: true,
 *   enableLogging: true,
 * });
 * 
 * // 2. 添加监听器
 * queue.addListener((result) => {
 *   if (result.success) {
 *     console.log(`✓ ${result.command.getDescription()}`);
 *   } else {
 *     console.error(`✗ ${result.command.getDescription()}`, result.error);
 *   }
 * });
 * 
 * // 3. 创建并执行命令
 * const document = { text: 'Initial' };
 * 
 * queue.push(new TextEditCommand(document, 'Hello', 'Edit text to Hello'));
 * queue.push(new TextEditCommand(document, 'Hello World', 'Edit text to Hello World'));
 * 
 * // 4. 撤销
 * queue.undo(); // document.text = 'Hello'
 * 
 * // 5. 重做
 * queue.redo(); // document.text = 'Hello World'
 * 
 * // 6. 批量执行
 * const tasks = [
 *   new AddItemCommand(myList, 'Task 1', 'Add Task 1'),
 *   new AddItemCommand(myList, 'Task 2', 'Add Task 2'),
 * ];
 * queue.executeBatch(tasks);
 * 
 * // 7. 宏命令
 * const macro = new MacroCommand('Complete Setup');
 * macro.addCommand(new AddItemCommand(list, 'Item 1', 'Add Item 1'));
 * macro.addCommand(new AddItemCommand(list, 'Item 2', 'Add Item 2'));
 * queue.push(macro);
 * ```
 */
export function demonstrateCommandPattern(): void {
  console.log('=== Command Pattern Demo ===\n');
  
  // 创建队列
  const queue = new CommandQueue({
    maxHistorySize: 10,
    enableLogging: true,
  });
  
  // 创建共享状态
  const document = { text: 'Initial' };
  const taskList: string[] = [];
  
  // 添加监听器
  queue.addListener((result) => {
    console.log(`  → ${result.success ? '✓' : '✗'} ${result.command.getDescription()}`);
  });
  
  console.log('1. 执行文本编辑命令:');
  queue.push(new TextEditCommand(document, 'Hello', 'Edit to "Hello"'));
  console.log(`   Document: "${document.text}"\n`);
  
  console.log('2. 再次编辑:');
  queue.push(new TextEditCommand(document, 'Hello World', 'Edit to "Hello World"'));
  console.log(`   Document: "${document.text}"\n`);
  
  console.log('3. 撤销:');
  queue.undo();
  console.log(`   Document: "${document.text}"\n`);
  
  console.log('4. 重做:');
  queue.redo();
  console.log(`   Document: "${document.text}"\n`);
  
  console.log('5. 添加任务:');
  queue.push(new AddItemCommand(taskList, 'Task 1', 'Add Task 1'));
  queue.push(new AddItemCommand(taskList, 'Task 2', 'Add Task 2'));
  console.log(`   Tasks: [${taskList.join(', ')}]\n`);
  
  console.log('6. 删除任务:');
  queue.push(new RemoveItemCommand(taskList, 0, 'Remove Task 1'));
  console.log(`   Tasks: [${taskList.join(', ')}]\n`);
  
  console.log('7. 撤销删除:');
  queue.undo();
  console.log(`   Tasks: [${taskList.join(', ')}]\n`);
  
  console.log('8. 宏命令:');
  const macro = new MacroCommand('Batch Add Tasks');
  macro.addCommand(new AddItemCommand(taskList, 'Task 3', 'Add Task 3'));
  macro.addCommand(new AddItemCommand(taskList, 'Task 4', 'Add Task 4'));
  queue.push(macro);
  console.log(`   Tasks: [${taskList.join(', ')}]\n`);
  
  console.log('9. 撤销宏命令:');
  queue.undo();
  console.log(`   Tasks: [${taskList.join(', ')}]\n`);
  
  console.log('=== Stats ===');
  console.log(`Execute Stack: ${queue.getExecuteStackSize()}`);
  console.log(`Undo Stack: ${queue.getUndoStackSize()}`);
  console.log(`Redo Stack: ${queue.getRedoStackSize()}`);
  
  console.log('\n=== Demo Complete ===');
}

// 导出默认实例（可选）
export const defaultCommandQueue = new CommandQueue();
