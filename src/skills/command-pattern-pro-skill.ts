/**
 * ACE - Advanced Command Engine (专业命令模式工具)
 * 
 * 功能：
 * 1. 命令定义 - 灵活的命令接口与抽象基类
 * 2. 命令执行 - 命令队列、批量执行、事务支持
 * 3. 撤销重做 - 完整的 undo/redo 栈管理
 * 
 * @author Axon
 * @version 1.0.0
 */

// ==================== 类型定义 ====================

/** 命令状态枚举 */
export enum CommandStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  EXECUTED = 'executed',
  UNDOING = 'undoing',
  UNDONE = 'undone',
  REDOING = 'redoing',
  REDONE = 'redone',
  FAILED = 'failed',
}

/** 命令元数据 */
export interface CommandMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  executedAt?: number;
  undoneAt?: number;
  redoneAt?: number;
  group?: string;
  tags?: string[];
}

/** 命令执行结果 */
export interface CommandResult<T = any> {
  success: boolean;
  data?: T;
  error?: Error;
  metadata: CommandMetadata;
}

/** 命令接口 */
export interface ICommand<TExecute = any, TUndo = any> {
  /** 唯一标识符 */
  readonly id: string;
  
  /** 命令元数据 */
  readonly metadata: CommandMetadata;
  
  /** 命令状态 */
  status: CommandStatus;
  
  /** 执行命令 */
  execute(): Promise<CommandResult<TExecute>>;
  
  /** 撤销命令 */
  undo(): Promise<CommandResult<TUndo>>;
  
  /** 重做命令 (默认调用 execute) */
  redo?(): Promise<CommandResult<TExecute>>;
  
  /** 命令是否可撤销 */
  canUndo(): boolean;
  
  /** 命令是否可重做 */
  canRedo(): boolean;
  
  /** 获取命令描述 */
  getDescription(): string;
}

/** 命令管理器配置 */
export interface CommandManagerConfig {
  /** 最大撤销栈深度 (默认: 100) */
  maxUndoStackDepth?: number;
  
  /** 最大重做栈深度 (默认: 100) */
  maxRedoStackDepth?: number;
  
  /** 是否启用自动分组 (默认: false) */
  enableAutoGrouping?: boolean;
  
  /** 分组时间窗口 (ms, 默认: 500ms 内的命令自动分组) */
  groupTimeWindow?: number;
  
  /** 是否记录命令历史 (默认: true) */
  enableHistory?: boolean;
  
  /** 命令执行超时时间 (ms, 默认: 30000) */
  executionTimeout?: number;
}

/** 命令历史记录 */
export interface CommandHistoryEntry {
  commandId: string;
  commandName: string;
  action: 'execute' | 'undo' | 'redo';
  timestamp: number;
  success: boolean;
  error?: string;
}

// ==================== 抽象基类 ====================

/**
 * 命令抽象基类
 * 所有具体命令都应继承此类
 */
export abstract class BaseCommand<TExecute = any, TUndo = any> implements ICommand<TExecute, TUndo> {
  readonly id: string;
  readonly metadata: CommandMetadata;
  status: CommandStatus = CommandStatus.PENDING;
  
  protected _executeData?: TExecute;
  protected _undoData?: TUndo;
  
  constructor(name: string, description?: string, group?: string) {
    this.id = this.generateId();
    this.metadata = {
      id: this.id,
      name,
      description,
      createdAt: Date.now(),
      group,
      tags: [],
    };
  }
  
  /** 生成唯一 ID */
  protected generateId(): string {
    return `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /** 执行命令 (抽象方法，子类必须实现) */
  abstract execute(): Promise<CommandResult<TExecute>>;
  
  /** 撤销命令 (抽象方法，子类必须实现) */
  abstract undo(): Promise<CommandResult<TUndo>>;
  
  /** 重做命令 (默认调用 execute) */
  async redo(): Promise<CommandResult<TExecute>> {
    this.status = CommandStatus.REDOING;
    const result = await this.execute();
    if (result.success) {
      this.status = CommandStatus.REDONE;
      this.metadata.redoneAt = Date.now();
    } else {
      this.status = CommandStatus.FAILED;
    }
    return result;
  }
  
  /** 默认实现：如果命令已执行则可撤销 */
  canUndo(): boolean {
    return this.status === CommandStatus.EXECUTED || this.status === CommandStatus.REDONE;
  }
  
  /** 默认实现：如果命令已撤销则可重做 */
  canRedo(): boolean {
    return this.status === CommandStatus.UNDONE;
  }
  
  /** 获取命令描述 */
  getDescription(): string {
    return this.metadata.description || this.metadata.name;
  }
  
  /** 设置执行数据 */
  protected setExecuteData(data: TExecute): void {
    this._executeData = data;
  }
  
  /** 设置撤销数据 */
  protected setUndoData(data: TUndo): void {
    this._undoData = data;
  }
  
  /** 获取执行数据 */
  getExecuteData(): TExecute | undefined {
    return this._executeData;
  }
  
  /** 获取撤销数据 */
  getUndoData(): TUndo | undefined {
    return this._undoData;
  }
}

// ==================== 命令管理器 ====================

/**
 * 命令管理器 (ACE 核心)
 * 负责命令的执行、撤销、重做管理
 */
export class CommandManager {
  private undoStack: ICommand[] = [];
  private redoStack: ICommand[] = [];
  private history: CommandHistoryEntry[] = [];
  private executingCommands: Map<string, Promise<CommandResult>> = new Map();
  
  private config: Required<CommandManagerConfig>;
  private currentGroup?: string;
  private groupStartTime?: number;
  
  constructor(config: CommandManagerConfig = {}) {
    this.config = {
      maxUndoStackDepth: config.maxUndoStackDepth ?? 100,
      maxRedoStackDepth: config.maxRedoStackDepth ?? 100,
      enableAutoGrouping: config.enableAutoGrouping ?? false,
      groupTimeWindow: config.groupTimeWindow ?? 500,
      enableHistory: config.enableHistory ?? true,
      executionTimeout: config.executionTimeout ?? 30000,
    };
  }
  
  /**
   * 执行单个命令
   */
  async execute<T>(command: ICommand<T>): Promise<CommandResult<T>> {
    // 检查命令是否可执行
    if (command.status === CommandStatus.EXECUTING) {
      return {
        success: false,
        error: new Error('Command is already executing'),
        metadata: command.metadata,
      };
    }
    
    // 执行新命令时清空重做栈
    if (command.status === CommandStatus.PENDING) {
      this.redoStack = [];
    }
    
    // 自动分组处理
    if (this.config.enableAutoGrouping) {
      this.handleAutoGrouping(command);
    }
    
    command.status = CommandStatus.EXECUTING;
    
    try {
      // 执行命令
      const executePromise = command.execute();
      this.executingCommands.set(command.id, executePromise);
      
      const result = await this.withTimeout(executePromise, this.config.executionTimeout);
      
      if (result.success) {
        command.status = CommandStatus.EXECUTED;
        command.metadata.executedAt = Date.now();
        
        // 添加到撤销栈
        this.undoStack.push(command);
        this.trimStack(this.undoStack, this.config.maxUndoStackDepth);
        
        // 记录历史
        this.recordHistory(command, 'execute', true);
      } else {
        command.status = CommandStatus.FAILED;
        this.recordHistory(command, 'execute', false, result.error?.message);
      }
      
      return result;
    } catch (error) {
      command.status = CommandStatus.FAILED;
      const result: CommandResult<T> = {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: command.metadata,
      };
      this.recordHistory(command, 'execute', false, result.error.message);
      return result;
    } finally {
      this.executingCommands.delete(command.id);
    }
  }
  
  /**
   * 批量执行命令 (事务模式)
   */
  async executeBatch<T>(
    commands: ICommand[],
    options: { allOrNothing?: boolean; parallel?: boolean } = {}
  ): Promise<CommandResult<T>[]> {
    const { allOrNothing = false, parallel = false } = options;
    const results: CommandResult<T>[] = [];
    
    if (parallel) {
      // 并行执行
      const promises = commands.map(cmd => this.execute(cmd) as Promise<CommandResult<T>>);
      const batchResults = await Promise.all(promises);
      
      if (allOrNothing && batchResults.some(r => !r.success)) {
        // 全部撤销
        await this.undoBatch(commands.filter((_, i) => batchResults[i].success));
        return batchResults.map(r => ({
          ...r,
          success: false,
          error: new Error('Batch transaction failed - rolled back'),
        }));
      }
      
      return batchResults;
    } else {
      // 串行执行
      for (const command of commands) {
        const result = await this.execute(command) as CommandResult<T>;
        results.push(result);
        
        if (allOrNothing && !result.success) {
          // 撤销之前成功执行的命令
          await this.undoBatch(commands.slice(0, commands.indexOf(command)));
          break;
        }
      }
      
      return results;
    }
  }
  
  /**
   * 撤销最近的命令
   */
  async undo<T>(): Promise<CommandResult<T> | null> {
    if (this.undoStack.length === 0) {
      return null;
    }
    
    const command = this.undoStack.pop()!;
    
    if (!command.canUndo()) {
      return {
        success: false,
        error: new Error('Command cannot be undone'),
        metadata: command.metadata,
      };
    }
    
    command.status = CommandStatus.UNDOING;
    
    try {
      const result = await command.undo();
      
      if (result.success) {
        command.status = CommandStatus.UNDONE;
        command.metadata.undoneAt = Date.now();
        
        // 添加到重做栈
        this.redoStack.push(command);
        this.trimStack(this.redoStack, this.config.maxRedoStackDepth);
        
        // 记录历史
        this.recordHistory(command, 'undo', true);
      } else {
        command.status = CommandStatus.FAILED;
        this.recordHistory(command, 'undo', false, result.error?.message);
      }
      
      return result;
    } catch (error) {
      command.status = CommandStatus.FAILED;
      const result: CommandResult<T> = {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: command.metadata,
      };
      this.recordHistory(command, 'undo', false, result.error.message);
      return result;
    }
  }
  
  /**
   * 批量撤销
   */
  async undoBatch<T>(commands: ICommand[]): Promise<CommandResult<T>[]> {
    const results: CommandResult<T>[] = [];
    
    // 从后往前撤销
    for (let i = commands.length - 1; i >= 0; i--) {
      const command = commands[i];
      if (this.undoStack.includes(command)) {
        const result = await this.undo<T>();
        if (result) {
          results.push(result);
        }
      }
    }
    
    return results;
  }
  
  /**
   * 撤销到指定命令
   */
  async undoUntil(commandId: string): Promise<CommandResult[]> {
    const results: CommandResult[] = [];
    
    while (this.undoStack.length > 0) {
      const topCommand = this.undoStack[this.undoStack.length - 1];
      const result = await this.undo();
      
      if (result) {
        results.push(result);
      }
      
      if (topCommand.id === commandId) {
        break;
      }
    }
    
    return results;
  }
  
  /**
   * 重做最近撤销的命令
   */
  async redo<T>(): Promise<CommandResult<T> | null> {
    if (this.redoStack.length === 0) {
      return null;
    }
    
    const command = this.redoStack.pop()!;
    
    if (!command.canRedo()) {
      return {
        success: false,
        error: new Error('Command cannot be redone'),
        metadata: command.metadata,
      };
    }
    
    command.status = CommandStatus.REDOING;
    
    try {
      const redoMethod = command.redo ?? command.execute;
      const result = await redoMethod.call(command);
      
      if (result.success) {
        command.status = CommandStatus.REDONE;
        command.metadata.redoneAt = Date.now();
        
        // 添加到撤销栈
        this.undoStack.push(command);
        this.trimStack(this.undoStack, this.config.maxUndoStackDepth);
        
        // 记录历史
        this.recordHistory(command, 'redo', true);
      } else {
        command.status = CommandStatus.FAILED;
        this.recordHistory(command, 'redo', false, result.error?.message);
      }
      
      return result;
    } catch (error) {
      command.status = CommandStatus.FAILED;
      const result: CommandResult<T> = {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: command.metadata,
      };
      this.recordHistory(command, 'redo', false, result.error.message);
      return result;
    }
  }
  
  /**
   * 批量重做
   */
  async redoBatch<T>(): Promise<CommandResult<T>[]> {
    const results: CommandResult<T>[] = [];
    
    while (this.redoStack.length > 0) {
      const result = await this.redo<T>();
      if (result) {
        results.push(result);
      }
    }
    
    return results;
  }
  
  /**
   * 清空所有栈
   */
  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
    this.history = [];
    this.currentGroup = undefined;
    this.groupStartTime = undefined;
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
   * 获取命令历史
   */
  getHistory(limit: number = 100): CommandHistoryEntry[] {
    return this.history.slice(-limit);
  }
  
  /**
   * 获取当前撤销栈顶的命令
   */
  peekUndoStack(): ICommand | undefined {
    return this.undoStack[this.undoStack.length - 1];
  }
  
  /**
   * 获取当前重做栈顶的命令
   */
  peekRedoStack(): ICommand | undefined {
    return this.redoStack[this.redoStack.length - 1];
  }
  
  /**
   * 开始命令分组
   */
  startGroup(groupName: string): void {
    this.currentGroup = groupName;
    this.groupStartTime = Date.now();
  }
  
  /**
   * 结束命令分组
   */
  endGroup(): void {
    this.currentGroup = undefined;
    this.groupStartTime = undefined;
  }
  
  /**
   * 导出状态 (用于持久化)
   */
  exportState(): any {
    return {
      undoStack: this.undoStack.map(cmd => ({
        id: cmd.id,
        name: cmd.metadata.name,
        status: cmd.status,
      })),
      redoStack: this.redoStack.map(cmd => ({
        id: cmd.id,
        name: cmd.metadata.name,
        status: cmd.status,
      })),
      historySize: this.history.length,
    };
  }
  
  /**
   * 导入状态 (从持久化恢复)
   */
  importState(state: any): void {
    // 注意：只能恢复元数据，实际命令对象需要重新创建
    this.clear();
    // 这里可以根据 state 重建命令栈 (需要额外的命令工厂)
  }
  
  // ==================== 私有方法 ====================
  
  /**
   * 处理自动分组
   */
  private handleAutoGrouping(command: ICommand): void {
    const now = Date.now();
    
    if (!this.currentGroup) {
      // 检查是否在新分组窗口内
      if (this.groupStartTime && (now - this.groupStartTime) < this.config.groupTimeWindow) {
        // 继续当前分组
        command.metadata.group = this.currentGroup;
      } else {
        // 开始新分组
        this.startGroup(`auto_${now}`);
        command.metadata.group = this.currentGroup;
      }
    } else {
      // 检查分组是否超时
      if (this.groupStartTime && (now - this.groupStartTime) >= this.config.groupTimeWindow) {
        this.endGroup();
      } else {
        command.metadata.group = this.currentGroup;
      }
    }
  }
  
  /**
   * 修剪栈大小
   */
  private trimStack(stack: ICommand[], maxSize: number): void {
    while (stack.length > maxSize) {
      stack.shift();
    }
  }
  
  /**
   * 记录命令历史
   */
  private recordHistory(
    command: ICommand,
    action: 'execute' | 'undo' | 'redo',
    success: boolean,
    error?: string
  ): void {
    if (!this.config.enableHistory) {
      return;
    }
    
    this.history.push({
      commandId: command.id,
      commandName: command.metadata.name,
      action,
      timestamp: Date.now(),
      success,
      error,
    });
    
    // 限制历史记录大小
    if (this.history.length > 1000) {
      this.history = this.history.slice(-1000);
    }
  }
  
  /**
   * 带超时的 Promise 执行
   */
  private withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`Command execution timeout (${timeoutMs}ms)`)), timeoutMs)
      ),
    ]);
  }
}

// ==================== 示例命令实现 ====================

/**
 * 示例：文件写入命令
 */
export class FileWriteCommand extends BaseCommand<{ path: string; content: string }, { path: string; originalContent: string }> {
  constructor(
    private filePath: string,
    private content: string,
    private fileSystem: {
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, content: string) => Promise<void>;
    }
  ) {
    super('FileWrite', `Write to ${filePath}`, 'file-operations');
  }
  
  async execute(): Promise<CommandResult<{ path: string; content: string }>> {
    try {
      // 保存原始内容用于撤销
      const originalContent = await this.fileSystem.readFile(this.filePath).catch(() => '');
      this.setUndoData({ path: this.filePath, originalContent });
      
      // 执行写入
      await this.fileSystem.writeFile(this.filePath, this.content);
      
      this.setExecuteData({ path: this.filePath, content: this.content });
      
      return {
        success: true,
        data: { path: this.filePath, content: this.content },
        metadata: this.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: this.metadata,
      };
    }
  }
  
  async undo(): Promise<CommandResult<{ path: string; originalContent: string }>> {
    const undoData = this.getUndoData();
    
    if (!undoData) {
      return {
        success: false,
        error: new Error('No undo data available'),
        metadata: this.metadata,
      };
    }
    
    try {
      // 恢复原始内容
      await this.fileSystem.writeFile(undoData.path, undoData.originalContent);
      
      return {
        success: true,
        data: undoData,
        metadata: this.metadata,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        metadata: this.metadata,
      };
    }
  }
}

/**
 * 示例：状态更新命令
 */
export class StateUpdateCommand<T> extends BaseCommand<{ key: string; value: T }, { key: string; previousValue: T }> {
  constructor(
    private key: string,
    private newValue: T,
    private stateManager: {
      getState: (key: string) => T | undefined;
      setState: (key: string, value: T) => void;
    }
  ) {
    super('StateUpdate', `Update state: ${key}`, 'state-operations');
  }
  
  async execute(): Promise<CommandResult<{ key: string; value: T }>> {
    const previousValue = this.stateManager.getState(this.key);
    this.setUndoData({ key: this.key, previousValue: previousValue as T });
    
    this.stateManager.setState(this.key, this.newValue);
    this.setExecuteData({ key: this.key, value: this.newValue });
    
    return {
      success: true,
      data: { key: this.key, value: this.newValue },
      metadata: this.metadata,
    };
  }
  
  async undo(): Promise<CommandResult<{ key: string; previousValue: T }>> {
    const undoData = this.getUndoData();
    
    if (!undoData) {
      return {
        success: false,
        error: new Error('No undo data available'),
        metadata: this.metadata,
      };
    }
    
    this.stateManager.setState(undoData.key, undoData.previousValue);
    
    return {
      success: true,
      data: undoData,
      metadata: this.metadata,
    };
  }
}

// ==================== 导出 ====================

export {
  CommandStatus,
  CommandMetadata,
  CommandResult,
  ICommand,
  CommandManagerConfig,
  CommandHistoryEntry,
  BaseCommand,
  CommandManager,
  FileWriteCommand,
  StateUpdateCommand,
};
