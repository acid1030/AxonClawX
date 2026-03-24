/**
 * 状态模式技能 - 使用示例
 * 
 * 本文件展示了状态模式技能的各种使用场景
 */

import { 
  StateMachine, 
  BaseState, 
  StatePatternConfig,
  createOrderStateMachine 
} from '../state-pattern-skill';

// ============== 示例 1: 基础订单流程 ==============

async function example1_basicOrder() {
  console.log('\n=== 示例 1: 基础订单流程 ===\n');
  
  const orderMachine = createOrderStateMachine(true);
  await orderMachine.initialize();
  
  console.log('当前状态:', orderMachine.getCurrentStateId());
  
  const payResult = await orderMachine.trigger('pay');
  console.log('支付后状态:', orderMachine.getCurrentStateId(), '- 成功:', payResult.success);
  
  const shipResult = await orderMachine.trigger('ship');
  console.log('发货后状态:', orderMachine.getCurrentStateId(), '- 成功:', shipResult.success);
  
  const confirmResult = await orderMachine.trigger('confirm');
  console.log('确认后状态:', orderMachine.getCurrentStateId(), '- 成功:', confirmResult.success);
  
  // 查看历史
  const history = orderMachine.getHistory();
  console.log('\n状态历史:');
  history.forEach(h => console.log(`  - ${h.stateId} (${h.triggeredBy})`));
}

// ============== 示例 2: 用户认证流程 ==============

class LoggedOutState extends BaseState<any> {
  readonly id = 'loggedOut';
  readonly name = '未登录';
  
  async onEnter(context: any): Promise<void> {
    console.log('👋 用户已登出');
  }
  
  allowedEvents(): string[] {
    return ['login', 'register'];
  }
}

class LoggedInState extends BaseState<any> {
  readonly id = 'loggedIn';
  readonly name = '已登录';
  
  async onEnter(context: any): Promise<void> {
    console.log(`✅ 欢迎，${context.username || '用户'}`);
  }
  
  async handle(event: string, payload: any, context: any): Promise<void> {
    if (event === 'updateProfile') {
      context.username = payload.username;
      console.log(`📝 用户名已更新为：${payload.username}`);
    }
  }
  
  allowedEvents(): string[] {
    return ['logout', 'updateProfile'];
  }
}

class SuspendedState extends BaseState<any> {
  readonly id = 'suspended';
  readonly name = '已冻结';
  
  async onEnter(context: any): Promise<void> {
    console.log('⚠️  账户已被冻结');
  }
  
  allowedEvents(): string[] {
    return ['appeal'];
  }
}

async function example2_authFlow() {
  console.log('\n=== 示例 2: 用户认证流程 ===\n');
  
  const authMachine = new StateMachine<any>({
    id: 'auth-flow',
    initialState: 'loggedOut',
    initialContext: { username: null, loginCount: 0 },
    enableLogging: false
  });
  
  // 注册状态
  authMachine.registerState(new LoggedOutState());
  authMachine.registerState(new LoggedInState());
  authMachine.registerState(new SuspendedState());
  
  // 定义转换
  authMachine.defineTransition('loggedOut', 'login', 'loggedIn');
  authMachine.defineTransition('loggedOut', 'register', 'loggedIn');
  authMachine.defineTransition('loggedIn', 'logout', 'loggedOut');
  authMachine.defineTransition('loggedIn', 'violation', 'suspended');
  authMachine.defineTransition('suspended', 'appeal', 'loggedIn');
  
  await authMachine.initialize();
  
  // 登录
  await authMachine.trigger('login', { username: 'Alice' });
  
  // 更新资料
  await authMachine.trigger('updateProfile', { username: 'Alice_Updated' });
  
  // 登出
  await authMachine.trigger('logout');
  
  // 重新登录
  await authMachine.trigger('login', { username: 'Bob' });
  
  console.log('最终状态:', authMachine.getCurrentStateId());
  console.log('当前用户:', authMachine.getContext().username);
}

// ============== 示例 3: 转换监听器 ==============

async function example3_transitionListener() {
  console.log('\n=== 示例 3: 转换监听器 ===\n');
  
  const machine = createOrderStateMachine(false);
  
  // 添加监听器
  machine.addTransitionListener((fromState, toState, event, context) => {
    console.log(`🔄 [审计] 状态转换:`);
    console.log(`   从：${fromState}`);
    console.log(`   到：${toState}`);
    console.log(`   事件：${event}`);
    console.log(`   时间：${new Date().toLocaleTimeString()}`);
  });
  
  await machine.initialize();
  await machine.trigger('pay');
  await machine.trigger('ship');
  await machine.trigger('confirm');
}

// ============== 示例 4: 错误处理 ==============

async function example4_errorHandling() {
  console.log('\n=== 示例 4: 错误处理 ===\n');
  
  const machine = createOrderStateMachine(false);
  await machine.initialize();
  
  console.log('当前状态:', machine.getCurrentStateId());
  
  // 尝试无效的转换
  console.log('\n尝试直接发货 (应该失败):');
  const result = await machine.trigger('ship');
  
  if (!result.success) {
    console.log('❌ 转换失败');
    console.log(`   错误：${result.error}`);
    console.log(`   当前状态：${result.fromState}`);
  }
  
  // 正确的流程
  console.log('\n执行正确流程:');
  await machine.trigger('pay');
  const shipResult = await machine.trigger('ship');
  console.log('发货结果:', shipResult.success ? '✅ 成功' : '❌ 失败');
}

// ============== 示例 5: 游戏角色状态机 ==============

class IdleState extends BaseState<any> {
  readonly id = 'idle';
  readonly name = '待机';
  
  async onEnter(context: any): Promise<void> {
    console.log('🎮 角色进入待机状态');
  }
  
  allowedEvents(): string[] {
    return ['move', 'attack', 'defend', 'rest'];
  }
}

class MovingState extends BaseState<any> {
  readonly id = 'moving';
  readonly name = '移动中';
  
  async onEnter(context: any): Promise<void> {
    console.log('🏃 角色开始移动');
  }
  
  async onExit(context: any): Promise<void> {
    console.log('🛑 角色停止移动');
  }
  
  async handle(event: string, payload: any, context: any): Promise<void> {
    if (event === 'move') {
      context.position = payload.position;
      console.log(`📍 移动到：(${payload.position.x}, ${payload.position.y})`);
    }
  }
  
  allowedEvents(): string[] {
    return ['move', 'stop', 'attack'];
  }
}

class AttackingState extends BaseState<any> {
  readonly id = 'attacking';
  readonly name = '攻击中';
  
  async onEnter(context: any): Promise<void> {
    console.log('⚔️  角色发动攻击');
  }
  
  async handle(event: string, payload: any, context: any): Promise<void> {
    if (event === 'attack') {
      context.damage = (context.damage || 0) + payload.damage;
      console.log(`💥 造成伤害：${payload.damage} (累计：${context.damage})`);
    }
  }
  
  allowedEvents(): string[] {
    return ['complete', 'cancel'];
  }
}

class DefendingState extends BaseState<any> {
  readonly id = 'defending';
  readonly name = '防御中';
  
  async onEnter(context: any): Promise<void> {
    console.log('🛡️  角色进入防御姿态');
    context.defenseMultiplier = 0.5;
  }
  
  async onExit(context: any): Promise<void> {
    context.defenseMultiplier = 1;
    console.log('🔓 防御姿态解除');
  }
  
  allowedEvents(): string[] {
    return ['complete', 'cancel'];
  }
}

class RestingState extends BaseState<any> {
  readonly id = 'resting';
  readonly name = '休息中';
  
  async onEnter(context: any): Promise<void> {
    console.log('💤 角色开始休息');
  }
  
  async handle(event: string, payload: any, context: any): Promise<void> {
    if (event === 'rest') {
      context.health = Math.min(100, (context.health || 0) + payload.heal);
      console.log(`❤️  恢复生命：${payload.heal} (当前：${context.health})`);
    }
  }
  
  allowedEvents(): string[] {
    return ['wake', 'continue'];
  }
}

async function example5_gameCharacter() {
  console.log('\n=== 示例 5: 游戏角色状态机 ===\n');
  
  const characterMachine = new StateMachine<any>({
    id: 'character-state',
    initialState: 'idle',
    initialContext: {
      health: 100,
      position: { x: 0, y: 0 },
      damage: 0,
      defenseMultiplier: 1
    },
    enableLogging: false
  });
  
  // 注册状态
  characterMachine.registerState(new IdleState());
  characterMachine.registerState(new MovingState());
  characterMachine.registerState(new AttackingState());
  characterMachine.registerState(new DefendingState());
  characterMachine.registerState(new RestingState());
  
  // 定义转换
  characterMachine.defineTransition('idle', 'move', 'moving');
  characterMachine.defineTransition('idle', 'attack', 'attacking');
  characterMachine.defineTransition('idle', 'defend', 'defending');
  characterMachine.defineTransition('idle', 'rest', 'resting');
  
  characterMachine.defineTransition('moving', 'move', 'moving');
  characterMachine.defineTransition('moving', 'stop', 'idle');
  characterMachine.defineTransition('moving', 'attack', 'attacking');
  
  characterMachine.defineTransition('attacking', 'complete', 'idle');
  characterMachine.defineTransition('attacking', 'cancel', 'idle');
  
  characterMachine.defineTransition('defending', 'complete', 'idle');
  characterMachine.defineTransition('defending', 'cancel', 'idle');
  
  characterMachine.defineTransition('resting', 'wake', 'idle');
  characterMachine.defineTransition('resting', 'continue', 'resting');
  
  await characterMachine.initialize();
  
  // 游戏循环
  console.log('--- 游戏开始 ---\n');
  
  // 移动
  await characterMachine.trigger('move', { position: { x: 10, y: 20 } });
  await characterMachine.trigger('move', { position: { x: 15, y: 25 } });
  await characterMachine.trigger('stop');
  
  // 攻击
  await characterMachine.trigger('attack');
  await characterMachine.trigger('attack', { damage: 25 });
  await characterMachine.trigger('attack', { damage: 30 });
  await characterMachine.trigger('complete');
  
  // 防御
  await characterMachine.trigger('defend');
  await characterMachine.trigger('complete');
  
  // 休息
  await characterMachine.trigger('rest');
  await characterMachine.trigger('rest', { heal: 20 });
  await characterMachine.trigger('wake');
  
  console.log('\n--- 游戏结束 ---\n');
  console.log('最终状态:', characterMachine.getCurrentStateId());
  console.log('角色数据:', JSON.stringify(characterMachine.getContext(), null, 2));
}

// ============== 示例 6: 上下文更新 ==============

async function example6_contextUpdate() {
  console.log('\n=== 示例 6: 上下文更新 ===\n');
  
  const machine = new StateMachine<any>({
    id: 'context-demo',
    initialState: 'idle',
    initialContext: { counter: 0, data: null }
  });
  
  class IdleState extends BaseState<any> {
    readonly id = 'idle';
    readonly name = '空闲';
    allowedEvents() { return ['increment', 'setData', 'reset']; }
  }
  
  machine.registerState(new IdleState());
  machine.defineTransition('idle', 'increment', 'idle');
  machine.defineTransition('idle', 'setData', 'idle');
  machine.defineTransition('idle', 'reset', 'idle');
  
  await machine.initialize();
  
  // 多次更新上下文
  machine.updateContext({ counter: 1 });
  console.log('Counter:', machine.getContext().counter);
  
  machine.updateContext({ counter: machine.getContext().counter + 1 });
  console.log('Counter:', machine.getContext().counter);
  
  machine.updateContext({ data: { name: 'Test', value: 42 } });
  console.log('Data:', JSON.stringify(machine.getContext().data));
  
  machine.updateContext({ counter: 0, data: null });
  console.log('Reset:', JSON.stringify(machine.getContext()));
}

// ============== 主函数 ==============

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   状态模式技能 - 使用示例              ║');
  console.log('╚════════════════════════════════════════╝');
  
  try {
    await example1_basicOrder();
    await example2_authFlow();
    await example3_transitionListener();
    await example4_errorHandling();
    await example5_gameCharacter();
    await example6_contextUpdate();
    
    console.log('\n╔════════════════════════════════════════╗');
    console.log('║   所有示例执行完成 ✅                  ║');
    console.log('╚════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('❌ 执行错误:', error);
  }
}

// 运行示例
main();
