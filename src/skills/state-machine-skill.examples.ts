/**
 * 状态机技能使用示例 - State Machine Skill Examples
 * 
 * 本文件展示状态机技能的各种使用场景
 */

import { StateMachine, createState, createTransition, createEvent } from './state-machine-skill';

// ============== 示例 1: 简单的订单状态机 ==============

/**
 * 订单状态枚举
 */
type OrderState = 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

/**
 * 订单上下文
 */
interface OrderContext {
  orderId: string;
  amount: number;
  paidAt?: number;
  shippedAt?: number;
  deliveredAt?: number;
  cancelReason?: string;
}

/**
 * 创建订单状态机
 */
function createOrderStateMachine(orderId: string, amount: number) {
  const states = [
    createState<OrderContext>('pending', {
      name: '待支付',
      initial: true,
      description: '订单已创建，等待支付',
    }),
    createState<OrderContext>('paid', {
      name: '已支付',
      description: '订单已支付，等待发货',
    }),
    createState<OrderContext>('shipped', {
      name: '已发货',
      description: '订单已发货，等待签收',
    }),
    createState<OrderContext>('delivered', {
      name: '已送达',
      final: true,
      description: '订单已完成',
    }),
    createState<OrderContext>('cancelled', {
      name: '已取消',
      final: true,
      description: '订单已取消',
    }),
  ];

  const transitions = [
    // 支付
    createTransition<OrderContext>('pending', 'PAY', 'paid', {
      description: '用户支付订单',
      guard: (ctx) => ctx.amount > 0, // 守卫：金额必须大于 0
      action: (ctx, event) => {
        ctx.paidAt = Date.now();
        console.log(`订单 ${ctx.orderId} 已支付，金额：${ctx.amount}`);
      },
    }),

    // 取消 (从待支付状态)
    createTransition<OrderContext>('pending', 'CANCEL', 'cancelled', {
      description: '用户取消订单',
      action: (ctx, event) => {
        ctx.cancelReason = event.payload?.reason || '用户主动取消';
        console.log(`订单 ${ctx.orderId} 已取消：${ctx.cancelReason}`);
      },
    }),

    // 发货
    createTransition<OrderContext>('paid', 'SHIP', 'shipped', {
      description: '商家发货',
      action: (ctx) => {
        ctx.shippedAt = Date.now();
        console.log(`订单 ${ctx.orderId} 已发货`);
      },
    }),

    // 取消 (从已支付状态，需要退款)
    createTransition<OrderContext>('paid', 'CANCEL', 'cancelled', {
      description: '支付后取消 (需要退款)',
      guard: (ctx, event) => {
        // 守卫：只有在发货前才能取消
        return !ctx.shippedAt;
      },
      action: (ctx, event) => {
        ctx.cancelReason = event.payload?.reason || '支付后取消';
        console.log(`订单 ${ctx.orderId} 已取消，将安排退款`);
      },
    }),

    // 签收
    createTransition<OrderContext>('shipped', 'DELIVER', 'delivered', {
      description: '用户签收',
      action: (ctx) => {
        ctx.deliveredAt = Date.now();
        console.log(`订单 ${ctx.orderId} 已送达`);
      },
    }),
  ];

  const machine = new StateMachine<OrderContext>({
    id: `order-${orderId}`,
    states,
    transitions,
    initialContext: { orderId, amount },
    enableLogging: true,
    onStateChange: (from, to, event) => {
      console.log(`📊 状态变更：${from} → ${to} (事件：${event.id})`);
    },
    onError: (error, event) => {
      console.error(`❌ 状态机错误：${error.message} (事件：${event.id})`);
    },
  });

  return machine;
}

// ============== 示例 2: 用户登录状态机 ==============

/**
 * 用户认证上下文
 */
interface AuthContext {
  userId?: string;
  username?: string;
  loginAttempts: number;
  lockedUntil?: number;
  token?: string;
  lastLoginAt?: number;
}

/**
 * 创建认证状态机
 */
function createAuthStateMachine() {
  const states = [
    createState<AuthContext>('logged_out', {
      name: '未登录',
      initial: true,
      description: '用户未登录',
    }),
    createState<AuthContext>('logging_in', {
      name: '登录中',
      description: '正在进行身份验证',
    }),
    createState<AuthContext>('logged_in', {
      name: '已登录',
      description: '用户已登录',
    }),
    createState<AuthContext>('locked', {
      name: '已锁定',
      description: '账户因多次失败尝试被锁定',
    }),
  ];

  const transitions = [
    // 开始登录
    createTransition<AuthContext>('logged_out', 'LOGIN_START', 'logging_in', {
      description: '开始登录流程',
      action: (ctx) => {
        ctx.loginAttempts = 0;
        console.log('🔐 开始登录流程...');
      },
    }),

    // 登录成功
    createTransition<AuthContext>('logging_in', 'LOGIN_SUCCESS', 'logged_in', {
      description: '登录成功',
      action: (ctx, event) => {
        ctx.userId = event.payload?.userId;
        ctx.username = event.payload?.username;
        ctx.token = event.payload?.token;
        ctx.lastLoginAt = Date.now();
        ctx.loginAttempts = 0;
        console.log(`✅ 登录成功：${ctx.username}`);
      },
    }),

    // 登录失败
    createTransition<AuthContext>('logging_in', 'LOGIN_FAILURE', 'logged_out', {
      description: '登录失败',
      action: (ctx) => {
        ctx.loginAttempts++;
        console.log(`❌ 登录失败，尝试次数：${ctx.loginAttempts}`);

        // 检查是否应该锁定
        if (ctx.loginAttempts >= 5) {
          console.log('⚠️ 多次失败，账户将被锁定');
        }
      },
    }),

    // 锁定账户
    createTransition<AuthContext>('logged_out', 'LOCK', 'locked', {
      description: '锁定账户',
      guard: (ctx) => ctx.loginAttempts >= 5,
      action: (ctx) => {
        ctx.lockedUntil = Date.now() + 15 * 60 * 1000; // 锁定 15 分钟
        console.log(`🔒 账户已锁定，解锁时间：${new Date(ctx.lockedUntil!).toLocaleTimeString()}`);
      },
    }),

    // 解锁
    createTransition<AuthContext>('locked', 'UNLOCK', 'logged_out', {
      description: '解锁账户',
      guard: (ctx) => {
        if (!ctx.lockedUntil) return true;
        return Date.now() >= ctx.lockedUntil;
      },
      action: (ctx) => {
        ctx.loginAttempts = 0;
        ctx.lockedUntil = undefined;
        console.log('🔓 账户已解锁');
      },
    }),

    // 登出
    createTransition<AuthContext>('logged_in', 'LOGOUT', 'logged_out', {
      description: '用户登出',
      action: (ctx) => {
        ctx.token = undefined;
        console.log('👋 用户已登出');
      },
    }),

    // 令牌刷新
    createTransition<AuthContext>('logged_in', 'REFRESH_TOKEN', 'logged_in', {
      description: '刷新访问令牌',
      action: (ctx, event) => {
        ctx.token = event.payload?.newToken;
        console.log('🔄 令牌已刷新');
      },
    }),
  ];

  const machine = new StateMachine<AuthContext>({
    id: 'auth-machine',
    states,
    transitions,
    initialContext: { loginAttempts: 0 },
    enableLogging: true,
    strict: true, // 严格模式：未定义事件抛出错误
  });

  return machine;
}

// ============== 示例 3: 任务执行状态机 ==============

/**
 * 任务上下文
 */
interface TaskContext {
  taskId: string;
  progress: number;
  retries: number;
  error?: string;
  result?: any;
  startedAt?: number;
  completedAt?: number;
}

/**
 * 创建任务状态机
 */
function createTaskStateMachine(taskId: string) {
  const states = [
    createState<TaskContext>('idle', {
      name: '空闲',
      initial: true,
      description: '任务等待执行',
    }),
    createState<TaskContext>('running', {
      name: '运行中',
      description: '任务正在执行',
      onEnter: (ctx) => {
        ctx.startedAt = Date.now();
        ctx.progress = 0;
        console.log(`▶️ 任务 ${taskId} 开始执行`);
      },
    }),
    createState<TaskContext>('paused', {
      name: '已暂停',
      description: '任务已暂停',
    }),
    createState<TaskContext>('completed', {
      name: '已完成',
      final: true,
      description: '任务执行成功',
      onEnter: (ctx) => {
        ctx.completedAt = Date.now();
        ctx.progress = 100;
        console.log(`✅ 任务 ${taskId} 执行完成`);
      },
    }),
    createState<TaskContext>('failed', {
      name: '已失败',
      final: true,
      description: '任务执行失败',
      onEnter: (ctx) => {
        ctx.completedAt = Date.now();
        console.log(`❌ 任务 ${taskId} 执行失败：${ctx.error}`);
      },
    }),
  ];

  const transitions = [
    // 开始任务
    createTransition<TaskContext>('idle', 'START', 'running', {
      description: '开始执行任务',
      action: (ctx) => {
        ctx.retries = 0;
        ctx.error = undefined;
      },
    }),

    // 更新进度
    createTransition<TaskContext>('running', 'PROGRESS', 'running', {
      description: '更新任务进度',
      action: (ctx, event) => {
        ctx.progress = event.payload?.progress ?? ctx.progress;
        console.log(`📊 任务进度：${ctx.progress}%`);
      },
    }),

    // 暂停
    createTransition<TaskContext>('running', 'PAUSE', 'paused', {
      description: '暂停任务',
      action: () => {
        console.log(`⏸️ 任务 ${taskId} 已暂停`);
      },
    }),

    // 恢复
    createTransition<TaskContext>('paused', 'RESUME', 'running', {
      description: '恢复任务',
      action: () => {
        console.log(`▶️ 任务 ${taskId} 已恢复`);
      },
    }),

    // 完成
    createTransition<TaskContext>('running', 'COMPLETE', 'completed', {
      description: '任务完成',
      action: (ctx, event) => {
        ctx.result = event.payload?.result;
      },
    }),

    // 失败 (可重试)
    createTransition<TaskContext>('running', 'FAIL', 'idle', {
      description: '任务失败，准备重试',
      guard: (ctx) => ctx.retries < 3,
      action: (ctx, event) => {
        ctx.retries++;
        ctx.error = event.payload?.error;
        console.log(`⚠️ 任务失败，第 ${ctx.retries} 次重试`);
      },
    }),

    // 失败 (超过重试次数)
    createTransition<TaskContext>('running', 'FAIL', 'failed', {
      description: '任务失败，超过重试次数',
      guard: (ctx) => ctx.retries >= 3,
      action: (ctx, event) => {
        ctx.error = event.payload?.error;
        console.log(`❌ 任务失败，已超过最大重试次数`);
      },
    }),

    // 取消
    createTransition<TaskContext>('running', 'CANCEL', 'failed', {
      description: '取消任务',
      action: (ctx) => {
        ctx.error = '任务被用户取消';
      },
    }),

    // 从空闲取消
    createTransition<TaskContext>('idle', 'CANCEL', 'failed', {
      description: '取消未开始的任务',
      action: (ctx) => {
        ctx.error = '任务被用户取消';
      },
    }),
  ];

  const machine = new StateMachine<TaskContext>({
    id: `task-${taskId}`,
    states,
    transitions,
    initialContext: { taskId, progress: 0, retries: 0 },
    enableLogging: true,
    onStateChange: (from, to, event) => {
      console.log(`🔄 任务状态：${from} → ${to}`);
    },
  });

  return machine;
}

// ============== 示例 4: 有限状态机模式匹配 ==============

/**
 * 演示：使用状态机处理 UI 组件状态
 */
interface UIComponentContext {
  componentId: string;
  data?: any;
  errorMessage?: string;
  isLoading: boolean;
}

function createComponentStateMachine(componentId: string) {
  const states = [
    createState<UIComponentContext>('idle', {
      name: '空闲',
      initial: true,
    }),
    createState<UIComponentContext>('loading', {
      name: '加载中',
      onEnter: (ctx) => {
        ctx.isLoading = true;
      },
    }),
    createState<UIComponentContext>('success', {
      name: '成功',
      onEnter: (ctx) => {
        ctx.isLoading = false;
      },
    }),
    createState<UIComponentContext>('error', {
      name: '错误',
      onEnter: (ctx) => {
        ctx.isLoading = false;
      },
    }),
  ];

  const transitions = [
    createTransition<UIComponentContext>('idle', 'FETCH', 'loading', {
      description: '开始获取数据',
    }),
    createTransition<UIComponentContext>('loading', 'SUCCESS', 'success', {
      description: '数据获取成功',
      action: (ctx, event) => {
        ctx.data = event.payload?.data;
      },
    }),
    createTransition<UIComponentContext>('loading', 'ERROR', 'error', {
      description: '数据获取失败',
      action: (ctx, event) => {
        ctx.errorMessage = event.payload?.error;
      },
    }),
    createTransition<UIComponentContext>('success', 'REFETCH', 'loading', {
      description: '重新获取数据',
    }),
    createTransition<UIComponentContext>('error', 'RETRY', 'loading', {
      description: '重试',
    }),
    createTransition<UIComponentContext>('success', 'RESET', 'idle', {
      description: '重置组件',
    }),
    createTransition<UIComponentContext>('error', 'RESET', 'idle', {
      description: '重置组件',
    }),
  ];

  return new StateMachine<UIComponentContext>({
    id: `component-${componentId}`,
    states,
    transitions,
    initialContext: { componentId, isLoading: false },
  });
}

// ============== 使用演示 ==============

/**
 * 运行示例
 */
async function runExamples() {
  console.log('='.repeat(60));
  console.log('状态机技能使用示例');
  console.log('='.repeat(60));

  // 示例 1: 订单状态机
  console.log('\n📦 示例 1: 订单状态机\n');
  const orderMachine = createOrderStateMachine('ORD-001', 299.99);
  orderMachine.start();

  console.log('\n当前状态:', orderMachine.getCurrentState());
  console.log('可用事件:', orderMachine.getAvailableEvents());

  await orderMachine.send('PAY');
  await orderMachine.send('SHIP');
  await orderMachine.send('DELIVER');

  console.log('\n订单状态机信息:', orderMachine.getInfo());

  // 示例 2: 认证状态机
  console.log('\n\n🔐 示例 2: 认证状态机\n');
  const authMachine = createAuthStateMachine();
  authMachine.start();

  await authMachine.send('LOGIN_START');
  await authMachine.send('LOGIN_SUCCESS', {
    userId: 'user-123',
    username: 'axon',
    token: 'jwt-token-xyz',
  });

  console.log('\n认证状态机信息:', authMachine.getInfo());

  // 示例 3: 任务状态机
  console.log('\n\n⚙️ 示例 3: 任务状态机\n');
  const taskMachine = createTaskStateMachine('TASK-001');
  taskMachine.start();

  await taskMachine.send('START');
  await taskMachine.send('PROGRESS', { progress: 25 });
  await taskMachine.send('PROGRESS', { progress: 50 });
  await taskMachine.send('PROGRESS', { progress: 75 });
  await taskMachine.send('COMPLETE', { result: { success: true } });

  console.log('\n任务状态机历史:', taskMachine.getHistory(5));

  // 示例 4: UI 组件状态机
  console.log('\n\n🎨 示例 4: UI 组件状态机\n');
  const componentMachine = createComponentStateMachine('user-list');
  componentMachine.start();

  await componentMachine.send('FETCH');
  await componentMachine.send('SUCCESS', { data: [{ id: 1, name: 'User 1' }] });

  console.log('\n组件状态机当前状态:', componentMachine.getCurrentState());
  console.log('组件上下文:', componentMachine.getContext());

  console.log('\n' + '='.repeat(60));
  console.log('示例执行完成');
  console.log('='.repeat(60));
}

// 导出示例函数
export {
  createOrderStateMachine,
  createAuthStateMachine,
  createTaskStateMachine,
  createComponentStateMachine,
  runExamples,
};

// 如果直接运行此文件
if (require.main === module) {
  runExamples().catch(console.error);
}
