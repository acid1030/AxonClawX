/**
 * Command Pattern Skill - 使用示例
 * 
 * 展示如何在实际项目中使用命令模式
 * 
 * @author KAEL
 * @version 1.0.0
 */

import {
  CommandQueue,
  Command,
  MacroCommand,
  TextEditCommand,
  AddItemCommand,
  RemoveItemCommand,
  type ICommand,
  type CommandResult,
} from './command-pattern-skill';

// ==================== 示例 1: 任务管理器 ====================

/**
 * 任务数据结构
 */
interface Task {
  id: number;
  title: string;
  completed: boolean;
}

/**
 * 创建任务命令
 */
class CreateTaskCommand extends Command {
  private taskList: Task[];
  private task: Task;
  private createdIndex: number = -1;

  constructor(taskList: Task[], task: Task) {
    super(`创建任务：${task.title}`);
    this.taskList = taskList;
    this.task = task;
  }

  execute(): void {
    this.taskList.push(this.task);
    this.createdIndex = this.taskList.length - 1;
  }

  undo(): void {
    if (this.createdIndex >= 0) {
      this.taskList.splice(this.createdIndex, 1);
    }
  }
}

/**
 * 完成任务命令
 */
class CompleteTaskCommand extends Command {
  private taskList: Task[];
  private taskId: number;
  private previousState: boolean = false;

  constructor(taskList: Task[], taskId: number) {
    super(`完成任务 #${taskId}`);
    this.taskList = taskList;
    this.taskId = taskId;
  }

  execute(): void {
    const task = this.taskList.find(t => t.id === this.taskId);
    if (task) {
      this.previousState = task.completed;
      task.completed = true;
    }
  }

  undo(): void {
    const task = this.taskList.find(t => t.id === this.taskId);
    if (task) {
      task.completed = this.previousState;
    }
  }
}

/**
 * 示例：任务管理器
 */
function taskManagerExample(): void {
  console.log('\n=== 任务管理器示例 ===\n');
  
  const queue = new CommandQueue({ maxHistorySize: 20 });
  const tasks: Task[] = [];
  
  // 监听命令执行
  queue.addListener((result) => {
    if (!result.success) {
      console.error(`命令失败：${result.error?.message}`);
    }
  });
  
  // 创建任务
  queue.push(new CreateTaskCommand(tasks, { id: 1, title: '学习命令模式', completed: false }));
  queue.push(new CreateTaskCommand(tasks, { id: 2, title: '实现撤销功能', completed: false }));
  queue.push(new CreateTaskCommand(tasks, { id: 3, title: '编写测试', completed: false }));
  
  console.log('当前任务列表:');
  tasks.forEach(t => console.log(`  ${t.completed ? '✓' : '○'} ${t.title}`));
  
  // 完成任务
  queue.push(new CompleteTaskCommand(tasks, 1));
  
  console.log('\n完成任务 #1 后:');
  tasks.forEach(t => console.log(`  ${t.completed ? '✓' : '○'} ${t.title}`));
  
  // 撤销
  console.log('\n撤销操作...');
  queue.undo();
  
  console.log('撤销后:');
  tasks.forEach(t => console.log(`  ${t.completed ? '✓' : '○'} ${t.title}`));
  
  // 重做
  console.log('\n重做操作...');
  queue.redo();
  
  console.log('重做后:');
  tasks.forEach(t => console.log(`  ${t.completed ? '✓' : '○'} ${t.title}`));
}

// ==================== 示例 2: 图形编辑器 ====================

/**
 * 图形对象
 */
interface Shape {
  id: string;
  type: 'circle' | 'rectangle' | 'line';
  x: number;
  y: number;
  color: string;
}

/**
 * 移动图形命令
 */
class MoveShapeCommand extends Command {
  private shapes: Map<string, Shape>;
  private shapeId: string;
  private deltaX: number;
  private deltaY: number;
  private oldX: number = 0;
  private oldY: number = 0;

  constructor(shapes: Map<string, Shape>, shapeId: string, deltaX: number, deltaY: number) {
    super(`移动图形 ${shapeId} (${deltaX}, ${deltaY})`);
    this.shapes = shapes;
    this.shapeId = shapeId;
    this.deltaX = deltaX;
    this.deltaY = deltaY;
  }

  execute(): void {
    const shape = this.shapes.get(this.shapeId);
    if (shape) {
      this.oldX = shape.x;
      this.oldY = shape.y;
      shape.x += this.deltaX;
      shape.y += this.deltaY;
    }
  }

  undo(): void {
    const shape = this.shapes.get(this.shapeId);
    if (shape) {
      shape.x = this.oldX;
      shape.y = this.oldY;
    }
  }
}

/**
 * 改变颜色命令
 */
class ChangeColorCommand extends Command {
  private shapes: Map<string, Shape>;
  private shapeId: string;
  private newColor: string;
  private oldColor: string = '';

  constructor(shapes: Map<string, Shape>, shapeId: string, newColor: string) {
    super(`改变图形 ${shapeId} 颜色为 ${newColor}`);
    this.shapes = shapes;
    this.shapeId = shapeId;
    this.newColor = newColor;
  }

  execute(): void {
    const shape = this.shapes.get(this.shapeId);
    if (shape) {
      this.oldColor = shape.color;
      shape.color = this.newColor;
    }
  }

  undo(): void {
    const shape = this.shapes.get(this.shapeId);
    if (shape) {
      shape.color = this.oldColor;
    }
  }
}

/**
 * 示例：图形编辑器
 */
function graphicEditorExample(): void {
  console.log('\n=== 图形编辑器示例 ===\n');
  
  const queue = new CommandQueue();
  const shapes = new Map<string, Shape>();
  
  // 初始化图形
  shapes.set('shape1', { id: 'shape1', type: 'circle', x: 0, y: 0, color: 'red' });
  shapes.set('shape2', { id: 'shape2', type: 'rectangle', x: 100, y: 100, color: 'blue' });
  
  console.log('初始状态:');
  shapes.forEach(s => console.log(`  ${s.id}: (${s.x}, ${s.y}) - ${s.color}`));
  
  // 移动图形
  queue.push(new MoveShapeCommand(shapes, 'shape1', 50, 30));
  
  console.log('\n移动 shape1 后:');
  shapes.forEach(s => console.log(`  ${s.id}: (${s.x}, ${s.y}) - ${s.color}`));
  
  // 改变颜色
  queue.push(new ChangeColorCommand(shapes, 'shape1', 'green'));
  
  console.log('\n改变颜色后:');
  shapes.forEach(s => console.log(`  ${s.id}: (${s.x}, ${s.y}) - ${s.color}`));
  
  // 撤销两次
  console.log('\n撤销两次...');
  queue.undo();
  queue.undo();
  
  console.log('撤销后:');
  shapes.forEach(s => console.log(`  ${s.id}: (${s.x}, ${s.y}) - ${s.color}`));
}

// ==================== 示例 3: 批量操作 ====================

/**
 * 示例：批量操作（宏命令）
 */
function batchOperationExample(): void {
  console.log('\n=== 批量操作示例 ===\n');
  
  const queue = new CommandQueue();
  const data: string[] = [];
  
  // 创建宏命令
  const batchImport = new MacroCommand('批量导入数据');
  
  for (let i = 1; i <= 5; i++) {
    batchImport.addCommand(new AddItemCommand(data, `Item ${i}`, `添加 Item ${i}`));
  }
  
  console.log('执行批量导入...');
  queue.push(batchImport);
  console.log(`数据：[${data.join(', ')}]`);
  
  console.log('\n撤销批量操作...');
  queue.undo();
  console.log(`数据：[${data.join(', ')}]`);
  
  console.log('\n重做批量操作...');
  queue.redo();
  console.log(`数据：[${data.join(', ')}]`);
}

// ==================== 示例 4: 命令历史管理 ====================

/**
 * 示例：命令历史管理
 */
function historyManagementExample(): void {
  console.log('\n=== 命令历史管理示例 ===\n');
  
  const queue = new CommandQueue({ maxHistorySize: 5 });
  const doc = { text: '' };
  
  // 执行多个命令
  for (let i = 1; i <= 10; i++) {
    queue.push(new TextEditCommand(doc, `Version ${i}`, `编辑到版本 ${i}`));
  }
  
  console.log(`执行栈大小：${queue.getExecuteStackSize()} (限制：5)`);
  console.log(`撤销栈大小：${queue.getUndoStackSize()}`);
  console.log(`当前文本：${doc.text}`);
  
  // 清空历史
  console.log('\n清空历史...');
  queue.clear();
  console.log(`撤销栈大小：${queue.getUndoStackSize()}`);
}

// ==================== 示例 5: 错误处理 ====================

/**
 * 可能失败的命令示例
 */
class FailingCommand extends Command {
  private shouldFail: boolean;

  constructor(shouldFail: boolean) {
    super(shouldFail ? '会失败的命令' : '会成功的命令');
    this.shouldFail = shouldFail;
  }

  execute(): void {
    if (this.shouldFail) {
      throw new Error('故意失败用于测试');
    }
  }

  undo(): void {
    // 无需操作
  }
}

/**
 * 示例：错误处理
 */
function errorHandlingExample(): void {
  console.log('\n=== 错误处理示例 ===\n');
  
  const queue = new CommandQueue();
  
  // 注册详细监听器
  queue.addListener((result) => {
    console.log(`命令：${result.command.getDescription()}`);
    console.log(`状态：${result.success ? '成功 ✓' : '失败 ✗'}`);
    if (!result.success) {
      console.log(`错误：${result.error?.message}`);
    }
    console.log('---');
  });
  
  console.log('执行成功命令:');
  queue.push(new FailingCommand(false));
  
  console.log('\n执行失败命令:');
  queue.push(new FailingCommand(true));
}

// ==================== 主函数 ====================

/**
 * 运行所有示例
 */
export function runAllExamples(): void {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   Command Pattern Skill - 使用示例     ║');
  console.log('╚════════════════════════════════════════╝');
  
  taskManagerExample();
  graphicEditorExample();
  batchOperationExample();
  historyManagementExample();
  errorHandlingExample();
  
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║          所有示例执行完成              ║');
  console.log('╚════════════════════════════════════════╝\n');
}

// 如果直接运行此文件
if (require.main === module) {
  runAllExamples();
}
