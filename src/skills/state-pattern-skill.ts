/**
 * 状态模式技能 - State Pattern Skill
 * 
 * 状态模式 (State Pattern) 是一种行为设计模式，允许对象在内部状态改变时改变其行为。
 * 状态模式将状态相关的逻辑封装到独立的状态类中，避免大量的条件判断语句。
 * 
 * 功能:
 * 1. 状态定义 - 定义所有可能的状态及其行为
 * 2. 状态转换 - 管理状态之间的转换逻辑
 * 3. 上下文管理 - 维护状态机的上下文和当前状态
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/** 状态标识符 */
export type StateId = string;

/** 状态机上下文数据 */
export type StateContext = Record<string, any>;

/** 状态接口 - 所有状态必须实现此接口 */
export interface IState<T extends StateContext = StateContext> {
  /** 状态 ID */
  readonly id: StateId;
  
  /** 状态名称 (可读) */
  readonly name: string;
  
  /** 进入状态时的钩子 */
  onEnter?(context: T): void | Promise<void>;
  
  /** 退出状态时的钩子 */
  onExit?(context: T): void | Promise<void>;
  
  /** 处理事件 */
  handle?(event: string, payload: any, context: T): Promise<void>;
  
  /** 获取允许的事件列表 */
  allowedEvents?(): string[];
}

/** 状态转换结果 */
export interface TransitionResult {
  /** 是否成功 */
  success: boolean;
  /** 源状态 */
  fromState: StateId;
  /** 目标状态 */
  toState: StateId;
  /** 触发事件 */
  event: string;
  /** 错误信息 (如果失败) */
  error?: string;
  /** 时间戳 */
  timestamp: number;
}

/** 状态转换监听器 */
export type TransitionListener<T extends StateContext = StateContext> = (
  fromState: StateId,
  toState: StateId,
  event: string,
  context: T
) => void;

/** 状态机配置 */
export interface StatePatternConfig<T extends StateContext = StateContext> {
  /** 状态机 ID */
  id?: string;
  /** 初始状态 ID */
  initialState: StateId;
  /** 初始上下文 */
  initialContext?: Partial<T>;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 状态转换监听器 */
  onTransition?: TransitionListener<T>;
}

/** 状态历史纪录 */
export interface StateHistory {
  /** 状态 ID */
  stateId: StateId;
  /** 进入时间 */
  enteredAt: number;
  /** 离开时间 */
  exitedAt?: number;
  /** 触发的事件 */
  triggeredBy?: string;
}

// ============== 基础状态抽象类 ==============

/**
 * 抽象状态基类
 * 
 * 所有具体状态类应继承此类并实现相应方法
 */
export abstract class BaseState<T extends StateContext = StateContext> implements IState<T> {
  abstract readonly id: StateId;
  abstract readonly name: string;
  
  /**
   * 进入状态
   * @param context 上下文
   */
  async onEnter(context: T): Promise<void> {
    // 默认实现为空，子类可重写
    this.log(`[State:${this.name}] Entered`);
  }
  
  /**
   * 退出状态
   * @param context 上下文
   */
  async onExit(context: T): Promise<void> {
    // 默认实现为空，子类可重写
    this.log(`[State:${this.name}] Exited`);
  }
  
  /**
   * 处理事件
   * @param event 事件名称
   * @param payload 事件载荷
   * @param context 上下文
   */
  async handle(event: string, payload: any, context: T): Promise<void> {
    this.log(`[State:${this.name}] Unhandled event: ${event}`);
  }
  
  /**
   * 获取允许的事件列表
   */
  allowedEvents(): string[] {
    return [];
  }
  
  /**
   * 日志输出
   */
  protected log(message: string): void {
    if (globalThis.__STATE_PATTERN_DEBUG__) {
      console.log(message);
    }
  }
}

// ============== 状态机上下文类 ==============

/**
 * 状态机上下文类
 * 
 * 维护当前状态和上下文数据，委托状态对象处理请求
 */
export class StateMachine<T extends StateContext = StateContext> {
  /** 状态机 ID */
  readonly id: string;
  
  /** 当前状态 */
  private currentState: IState<T> | null = null;
  
  /** 状态注册表 */
  private states: Map<StateId, IState<T>> = new Map();
  
  /** 状态转换规则 */
  private transitions: Map<string, Set<StateId>> = new Map();
  
  /** 上下文数据 */
  private context: T;
  
  /** 状态历史 */
  private history: StateHistory[] = [];
  
  /** 转换监听器 */
  private transitionListeners: TransitionListener<T>[] = [];
  
  /** 是否启用日志 */
  private enableLogging: boolean;
  
  /**
   * 创建状态机
   * @param config 配置
   */
  constructor(private config: StatePatternConfig<T>) {
    this.id = config.id || `statemachine-${Date.now()}`;
    this.context = { ...config.initialContext } as T;
    this.enableLogging = config.enableLogging ?? false;
    
    if (config.onTransition) {
      this.transitionListeners.push(config.onTransition);
    }
    
    this.log(`[StateMachine] Created with ID: ${this.id}`);
  }
  
  /**
   * 注册状态
   * @param state 状态对象
   */
  registerState(state: IState<T>): void {
    this.states.set(state.id, state);
    this.log(`[StateMachine] Registered state: ${state.name} (${state.id})`);
  }
  
  /**
   * 定义状态转换规则
   * @param fromState 源状态
   * @param event 触发事件
   * @param toState 目标状态
   */
  defineTransition(fromState: StateId, event: string, toState: StateId): void {
    const key = `${fromState}:${event}`;
    
    if (!this.transitions.has(key)) {
      this.transitions.set(key, new Set());
    }
    
    this.transitions.get(key)!.add(toState);
    this.log(`[StateMachine] Defined transition: ${fromState} --[${event}]--> ${toState}`);
  }
  
  /**
   * 添加转换监听器
   * @param listener 监听器函数
   */
  addTransitionListener(listener: TransitionListener<T>): void {
    this.transitionListeners.push(listener);
  }
  
  /**
   * 移除转换监听器
   * @param listener 监听器函数
   */
  removeTransitionListener(listener: TransitionListener<T>): void {
    const index = this.transitionListeners.indexOf(listener);
    if (index > -1) {
      this.transitionListeners.splice(index, 1);
    }
  }
  
  /**
   * 初始化状态机
   */
  async initialize(): Promise<void> {
    const initialState = this.states.get(this.config.initialState);
    
    if (!initialState) {
      throw new Error(`Initial state not found: ${this.config.initialState}`);
    }
    
    this.currentState = initialState;
    this.recordHistory(this.config.initialState, 'INIT');
    
    if (initialState.onEnter) {
      await initialState.onEnter(this.context);
    }
    
    this.log(`[StateMachine] Initialized with state: ${initialState.name}`);
  }
  
  /**
   * 触发事件
   * @param event 事件名称
   * @param payload 事件载荷
   */
  async trigger(event: string, payload?: any): Promise<TransitionResult> {
    if (!this.currentState) {
      throw new Error('StateMachine not initialized. Call initialize() first.');
    }
    
    const fromState = this.currentState;
    const fromStateId = fromState.id;
    
    // 检查事件是否被当前状态允许
    const allowedEvents = fromState.allowedEvents?.() || [];
    if (allowedEvents.length > 0 && !allowedEvents.includes(event)) {
      const error = `Event '${event}' not allowed in state '${fromState.name}'`;
      this.log(`[StateMachine] ${error}`);
      return {
        success: false,
        fromState: fromStateId,
        toState: fromStateId,
        event,
        error,
        timestamp: Date.now()
      };
    }
    
    // 检查是否存在有效的转换
    const transitionKey = `${fromStateId}:${event}`;
    const possibleTargets = this.transitions.get(transitionKey);
    
    if (!possibleTargets || possibleTargets.size === 0) {
      const error = `No transition defined for '${event}' in state '${fromState.name}'`;
      this.log(`[StateMachine] ${error}`);
      
      if (this.config.enableLogging) {
        console.warn(error);
      }
      
      return {
        success: false,
        fromState: fromStateId,
        toState: fromStateId,
        event,
        error,
        timestamp: Date.now()
      };
    }
    
    // 处理当前状态的事件
    if (fromState.handle) {
      await fromState.handle(event, payload, this.context);
    }
    
    // 获取目标状态 (如果有多个可能的目标，取第一个)
    const toStateId = Array.from(possibleTargets)[0];
    const toState = this.states.get(toStateId);
    
    if (!toState) {
      throw new Error(`Target state not found: ${toStateId}`);
    }
    
    // 退出当前状态
    if (fromState.onExit) {
      await fromState.onExit(this.context);
    }
    
    // 更新历史
    this.updateHistory(fromStateId);
    
    // 转换到新状态
    this.currentState = toState;
    this.recordHistory(toStateId, event);
    
    // 进入新状态
    if (toState.onEnter) {
      await toState.onEnter(this.context);
    }
    
    // 通知监听器
    this.transitionListeners.forEach(listener => {
      try {
        listener(fromStateId, toStateId, event, this.context);
      } catch (error) {
        this.log(`[StateMachine] Transition listener error: ${error}`);
      }
    });
    
    this.log(`[StateMachine] Transitioned: ${fromState.name} --[${event}]--> ${toState.name}`);
    
    return {
      success: true,
      fromState: fromStateId,
      toState: toStateId,
      event,
      timestamp: Date.now()
    };
  }
  
  /**
   * 获取当前状态
   */
  getCurrentState(): IState<T> | null {
    return this.currentState;
  }
  
  /**
   * 获取当前状态 ID
   */
  getCurrentStateId(): StateId | null {
    return this.currentState?.id || null;
  }
  
  /**
   * 获取上下文
   */
  getContext(): T {
    return { ...this.context };
  }
  
  /**
   * 更新上下文
   * @param updates 更新数据
   */
  updateContext(updates: Partial<T>): void {
    Object.assign(this.context, updates);
    this.log(`[StateMachine] Context updated`);
  }
  
  /**
   * 获取状态历史
   */
  getHistory(): StateHistory[] {
    return [...this.history];
  }
  
  /**
   * 检查是否在指定状态
   * @param stateId 状态 ID
   */
  isInState(stateId: StateId): boolean {
    return this.currentState?.id === stateId;
  }
  
  /**
   * 获取所有已注册的状态
   */
  getRegisteredStates(): IState<T>[] {
    return Array.from(this.states.values());
  }
  
  /**
   * 重置状态机
   */
  async reset(): Promise<void> {
    if (this.currentState && this.currentState.onExit) {
      await this.currentState.onExit(this.context);
    }
    
    this.updateHistory(this.currentState?.id || 'unknown');
    this.currentState = null;
    this.context = { ...this.config.initialContext } as T;
    this.history = [];
    
    this.log(`[StateMachine] Reset`);
  }
  
  /**
   * 记录历史
   */
  private recordHistory(stateId: StateId, triggeredBy: string): void {
    this.history.push({
      stateId,
      enteredAt: Date.now(),
      triggeredBy
    });
  }
  
  /**
   * 更新历史记录
   */
  private updateHistory(stateId: StateId): void {
    const lastEntry = this.history[this.history.length - 1];
    if (lastEntry && lastEntry.stateId === stateId && !lastEntry.exitedAt) {
      lastEntry.exitedAt = Date.now();
    }
  }
  
  /**
   * 日志输出
   */
  private log(message: string): void {
    if (this.enableLogging) {
      console.log(message);
    }
  }
}

// ============== 示例状态实现 ==============

/**
 * 示例：订单状态
 */
export class OrderCreatedState extends BaseState<any> {
  readonly id = 'created';
  readonly name = '已创建';
  
  async onEnter(context: any): Promise<void> {
    super.onEnter(context);
    console.log('订单已创建，等待支付');
  }
  
  allowedEvents(): string[] {
    return ['pay', 'cancel'];
  }
}

export class OrderPaidState extends BaseState<any> {
  readonly id = 'paid';
  readonly name = '已支付';
  
  async onEnter(context: any): Promise<void> {
    super.onEnter(context);
    console.log('订单已支付，准备发货');
  }
  
  allowedEvents(): string[] {
    return ['ship', 'refund'];
  }
}

export class OrderShippedState extends BaseState<any> {
  readonly id = 'shipped';
  readonly name = '已发货';
  
  async onEnter(context: any): Promise<void> {
    super.onEnter(context);
    console.log('订单已发货，等待确认收货');
  }
  
  allowedEvents(): string[] {
    return ['confirm', 'return'];
  }
}

export class OrderCompletedState extends BaseState<any> {
  readonly id = 'completed';
  readonly name = '已完成';
  
  async onEnter(context: any): Promise<void> {
    super.onEnter(context);
    console.log('订单已完成');
  }
  
  allowedEvents(): string[] {
    return []; // 终止状态
  }
}

export class OrderCancelledState extends BaseState<any> {
  readonly id = 'cancelled';
  readonly name = '已取消';
  
  async onEnter(context: any): Promise<void> {
    super.onEnter(context);
    console.log('订单已取消');
  }
  
  allowedEvents(): string[] {
    return []; // 终止状态
  }
}

// ============== 工厂函数 ==============

/**
 * 创建订单状态机
 */
export function createOrderStateMachine(enableLogging = false): StateMachine<any> {
  const machine = new StateMachine({
    id: 'order-workflow',
    initialState: 'created',
    enableLogging
  });
  
  // 注册状态
  machine.registerState(new OrderCreatedState());
  machine.registerState(new OrderPaidState());
  machine.registerState(new OrderShippedState());
  machine.registerState(new OrderCompletedState());
  machine.registerState(new OrderCancelledState());
  
  // 定义转换规则
  machine.defineTransition('created', 'pay', 'paid');
  machine.defineTransition('created', 'cancel', 'cancelled');
  machine.defineTransition('paid', 'ship', 'shipped');
  machine.defineTransition('paid', 'refund', 'cancelled');
  machine.defineTransition('shipped', 'confirm', 'completed');
  machine.defineTransition('shipped', 'return', 'cancelled');
  
  return machine;
}

// ============== 导出 ==============

export default StateMachine;
