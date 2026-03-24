/**
 * ACE - Advanced Command Engine 使用示例
 * 
 * 展示命令模式的核心用法：
 * 1. 基础命令定义与执行
 * 2. 撤销/重做操作
 * 3. 批量命令与事务
 * 4. 自定义命令实现
 */

import {
  CommandManager,
  BaseCommand,
  CommandResult,
  FileWriteCommand,
  StateUpdateCommand,
} from './command-pattern-pro-skill';

// ==================== 示例 1: 基础使用 ====================

async function example1_BasicUsage() {
  console.log('=== 示例 1: 基础使用 ===\n');
  
  // 创建命令管理器
  const manager = new CommandManager({
    maxUndoStackDepth: 100,
    enableHistory: true,
  });
  
  // 模拟文件系统
  const fileSystem = {
    files: new Map<string, string>(),
    readFile: async (path: string) => this.files.get(path) || '',
    writeFile: async (path: string, content: string) => {
      this.files.set(path, content);
    },
  };
  
  // 创建文件写入命令
  const writeCmd = new FileWriteCommand(
    '/tmp/test.txt',
    'Hello, ACE!',
    fileSystem
  );
  
  console.log(`命令 ID: ${writeCmd.id}`);
  console.log(`命令名称：${writeCmd.metadata.name}`);
  console.log(`命令描述：${writeCmd.getDescription()}`);
  console.log(`执行前状态：${writeCmd.status}`);
  
  // 执行命令
  const result = await manager.execute(writeCmd);
  console.log(`\n执行结果：${result.success ? '成功' : '失败'}`);
  console.log(`执行后状态：${writeCmd.status}`);
  console.log(`撤销栈大小：${manager.getUndoStackSize()}`);
  
  // 撤销命令
  const undoResult = await manager.undo();
  console.log(`\n撤销结果：${undoResult?.success ? '成功' : '失败'}`);
  console.log(`撤销后状态：${writeCmd.status}`);
  console.log(`重做栈大小：${manager.getRedoStackSize()}`);
  
  // 重做命令
  const redoResult = await manager.redo();
  console.log(`\n重做结果：${redoResult?.success ? '成功' : '失败'}`);
  console.log(`重做后状态：${writeCmd.status}`);
}

// ==================== 示例 2: 状态管理 ====================

async function example2_StateManagement() {
  console.log('\n=== 示例 2: 状态管理 ===\n');
  
  const manager = new CommandManager();
  
  // 模拟状态管理器
  const state = new Map<string, any>();
  const stateManager = {
    getState: (key: string) => state.get(key),
    setState: (key: string, value: any) => state.set(key, value),
  };
  
  // 创建状态更新命令
  const updateCmd1 = new StateUpdateCommand('username', 'Axon', stateManager);
  const updateCmd2 = new StateUpdateCommand('role', '至高意志', stateManager);
  const updateCmd3 = new StateUpdateCommand('level', 999, stateManager);
  
  // 批量执行
  const results = await manager.executeBatch([updateCmd1, updateCmd2, updateCmd3]);
  console.log(`批量执行结果：${results.filter(r => r.success).length}/${results.length} 成功`);
  console.log(`当前状态：`, Object.fromEntries(state));
  
  // 撤销所有
  await manager.undo();
  await manager.undo();
  await manager.undo();
  console.log(`撤销后状态：`, Object.fromEntries(state));
  
  // 重做所有
  await manager.redo();
  await manager.redo();
  await manager.redo();
  console.log(`重做后状态：`, Object.fromEntries(state));
}

// ==================== 示例 3: 事务模式 ====================

async function example3_TransactionMode() {
  console.log('\n=== 示例 3: 事务模式 ===\n');
  
  const manager = new CommandManager();
  
  const state = new Map<string, any>();
  const stateManager = {
    getState: (key: string) => state.get(key),
    setState: (key: string, value: any) => state.set(key, value),
  };
  
  // 创建一组相关命令
  const commands = [
    new StateUpdateCommand('transaction.id', 'TX001', stateManager),
    new StateUpdateCommand('transaction.amount', 1000, stateManager),
    new StateUpdateCommand('transaction.status', 'pending', stateManager),
  ];
  
  // 全部或 nothing 模式
  const results = await manager.executeBatch(commands, {
    allOrNothing: true,
    parallel: false,
  });
  
  console.log(`事务执行：${results.every(r => r.success) ? '全部成功' : '部分失败'}`);
  console.log(`事务状态：`, state.get('transaction.status'));
}

// ==================== 示例 4: 自定义命令 ====================

/**
 * 自定义命令示例：数据库记录更新
 */
class DatabaseUpdateCommand extends BaseCommand<
  { id: string; data: any },
  { id: string; originalData: any }
> {
  constructor(
    private table: string,
    private recordId: string,
    private newData: any,
    private db: {
      find: (table: string, id: string) => Promise<any>;
      update: (table: string, id: string, data: any) => Promise<void>;
    }
  ) {
    super('DatabaseUpdate', `Update ${table}.${recordId}`, 'database');
  }
  
  async execute(): Promise<CommandResult<{ id: string; data: any }>> {
    try {
      // 保存原始数据
      const originalData = await this.db.find(this.table, this.recordId);
      this.setUndoData({ id: this.recordId, originalData });
      
      // 执行更新
      await this.db.update(this.table, this.recordId, this.newData);
      this.setExecuteData({ id: this.recordId, data: this.newData });
      
      return {
        success: true,
        data: { id: this.recordId, data: this.newData },
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
  
  async undo(): Promise<CommandResult<{ id: string; originalData: any }>> {
    const undoData = this.getUndoData();
    
    if (!undoData || !undoData.originalData) {
      return {
        success: false,
        error: new Error('No undo data available'),
        metadata: this.metadata,
      };
    }
    
    try {
      await this.db.update(this.table, undoData.id, undoData.originalData);
      
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

async function example4_CustomCommand() {
  console.log('\n=== 示例 4: 自定义命令 ===\n');
  
  const manager = new CommandManager();
  
  // 模拟数据库
  const db = {
    data: new Map<string, any>(),
    find: async (table: string, id: string) => {
      const key = `${table}.${id}`;
      return this.data.get(key);
    },
    update: async (table: string, id: string, data: any) => {
      const key = `${table}.${id}`;
      this.data.set(key, data);
    },
  };
  
  // 初始化数据
  await db.update('users', 'user1', { name: 'Old Name', email: 'old@example.com' });
  
  // 创建数据库更新命令
  const dbCmd = new DatabaseUpdateCommand(
    'users',
    'user1',
    { name: 'New Name', email: 'new@example.com' },
    db
  );
  
  // 执行
  const result = await manager.execute(dbCmd);
  console.log(`数据库更新：${result.success ? '成功' : '失败'}`);
  console.log(`更新后数据：`, await db.find('users', 'user1'));
  
  // 撤销
  await manager.undo();
  console.log(`撤销后数据：`, await db.find('users', 'user1'));
}

// ==================== 示例 5: 命令历史与状态导出 ====================

async function example5_HistoryAndExport() {
  console.log('\n=== 示例 5: 命令历史与状态导出 ===\n');
  
  const manager = new CommandManager({ enableHistory: true });
  
  const state = new Map<string, any>();
  const stateManager = {
    getState: (key: string) => state.get(key),
    setState: (key: string, value: any) => state.set(key, value),
  };
  
  // 执行多个命令
  for (let i = 0; i < 5; i++) {
    const cmd = new StateUpdateCommand(`key${i}`, `value${i}`, stateManager);
    await manager.execute(cmd);
  }
  
  // 查看历史
  const history = manager.getHistory(10);
  console.log(`命令历史 (最近 10 条):`);
  history.forEach((entry, idx) => {
    console.log(`  ${idx + 1}. ${entry.commandName} - ${entry.action} - ${entry.success ? '✓' : '✗'}`);
  });
  
  // 导出状态
  const exportedState = manager.exportState();
  console.log(`\n导出状态:`);
  console.log(`  撤销栈：${exportedState.undoStack.length} 个命令`);
  console.log(`  重做栈：${exportedState.redoStack.length} 个命令`);
  console.log(`  历史大小：${exportedState.historySize}`);
}

// ==================== 示例 6: 自动分组 ====================

async function example6_AutoGrouping() {
  console.log('\n=== 示例 6: 自动分组 ===\n');
  
  const manager = new CommandManager({
    enableAutoGrouping: true,
    groupTimeWindow: 1000, // 1 秒内的命令自动分组
  });
  
  const state = new Map<string, any>();
  const stateManager = {
    getState: (key: string) => state.get(key),
    setState: (key: string, value: any) => state.set(key, value),
  };
  
  // 快速执行多个命令 (在 1 秒内)
  const commands = [
    new StateUpdateCommand('group.key1', 'value1', stateManager),
    new StateUpdateCommand('group.key2', 'value2', stateManager),
    new StateUpdateCommand('group.key3', 'value3', stateManager),
  ];
  
  await manager.executeBatch(commands);
  
  // 查看分组信息
  commands.forEach(cmd => {
    console.log(`命令 ${cmd.metadata.name} 分组：${cmd.metadata.group}`);
  });
  
  // 撤销整个组
  console.log(`\n撤销前撤销栈大小：${manager.getUndoStackSize()}`);
  await manager.undo();
  await manager.undo();
  await manager.undo();
  console.log(`撤销后撤销栈大小：${manager.getUndoStackSize()}`);
}

// ==================== 运行所有示例 ====================

async function runAllExamples() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║     ACE - Advanced Command Engine 使用示例               ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');
  
  try {
    await example1_BasicUsage();
    await example2_StateManagement();
    await example3_TransactionMode();
    await example4_CustomCommand();
    await example5_HistoryAndExport();
    await example6_AutoGrouping();
    
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║     所有示例运行完成 ✓                                   ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
  } catch (error) {
    console.error('示例运行失败:', error);
  }
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}

export { runAllExamples };
