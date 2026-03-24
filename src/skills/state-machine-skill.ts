/**
 * 状态机技能 - State Machine Skill
 * 
 * 功能:
 * 1. 状态定义 - 定义状态机的所有可能状态
 * 2. 状态转换 - 配置状态之间的转换规则和条件
 * 3. 事件触发 - 通过事件驱动状态转换
 * 
 * @author Axon
 * @version 1.0.0
 */

// ============== 类型定义 ==============

/** 状态标识符 */
export type StateId = string;

/** 事件标识符 */
export type EventId = string;

/** 状态机上下文数据 */
export type StateContext = Record<string, any>;

/** 状态进入/退出钩子函数 */
export type StateHook<T extends StateContext = StateContext> = (context: T) => void | Promise<void>;

/** 转换守卫函数 - 决定是否允许转换 */
export type TransitionGuard<T extends StateContext = StateContext> = (context: T, event: StateEvent<T>) => boolean | Promise<boolean>;

/** 转换动作函数 - 转换执行时的副作用 */
export type TransitionAction<T extends StateContext = StateContext> = (context: T, event: StateEvent<T>) => void | Promise<void>;

/** 状态事件 */
export interface StateEvent<T extends StateContext = StateContext> {
  /** 事件 ID */
  id: EventId;
  /** 事件载荷 */
  payload?: any;
  /** 事件时间戳 */
  timestamp: number;
  /** 源状态 */
  fromState?: StateId;
  /** 目标状态 */
  toState?: StateId;
  /** 附加上下文 */
  context?: Partial<T>;
}

/** 状态定义 */
export interface StateDefinition<T extends StateContext = StateContext> {
  /** 状态 ID */
  id: StateId;
  /** 状态名称 (可读) */
  name?: string;
  /** 状态描述 */
  description?: string;
  /** 是否为初始状态 */
  initial?: boolean;
  /** 是否为终止状态 */
  final?: boolean;
  /** 进入状态时的钩子 */
  onEnter?: StateHook<T>;
  /** 退出状态时的钩子 */
  onExit?: StateHook<T>;
  /** 状态内可处理的事件 */
  on?: { [eventId: string]: StateHook<T> };
  /** 元数据 */
  metadata?: Record<string, any>;
}

/** 转换定义 */
export interface TransitionDefinition<T extends StateContext = StateContext> {
  /** 源状态 ID */
  from: StateId;
  /** 触发事件 ID */
  event: EventId;
  /** 目标状态 ID */
  to: StateId;
  /** 转换守卫 (可选) */
  guard?: TransitionGuard<T>;
  /** 转换动作 (可选) */
  action?: TransitionAction<T>;
  /** 转换描述 */
  description?: string;
}

/** 状态机配置 */
export interface StateMachineConfig<T extends StateContext = StateContext> {
  /** 状态机 ID */
  id?: string;
  /** 状态定义列表 */
  states: StateDefinition<T>[];
  /** 转换定义列表 */
  transitions: TransitionDefinition<T>[];
  /** 初始上下文 */
  initialContext?: Partial<T>;
  /** 是否启用日志 */
  enableLogging?: boolean;
  /** 是否严格模式 (未定义事件抛出错误) */
  strict?: boolean;
  /** 状态变更监听器 */
  onStateChange?: (from: StateId, to: StateId, event: StateEvent<T>) => void;
  /** 事件监听器 */
  onEvent?: (event: StateEvent<T>) => void;
  /** 错误处理函数 */
  onError?: (error: Error, event: StateEvent<T>) => void;
}

/** 状态机历史快照 */
export interface StateHistoryEntry<T extends StateContext = StateContext> {
  /** 时间戳 */
  timestamp: number;
  /** 源状态 */
  from: StateId;
  /** 目标状态 */
  to: StateId;
  /** 触发事件 */
  event: StateEvent<T>;
  /** 转换是否成功 */
  success: boolean;
  /** 错误信息 (如果失败) */
  error?: string;
}

/** 状态机统计信息 */
export interface StateMachineStats {
  /** 总状态数 */
  totalStates: number;
  /** 总转换数 */
  totalTransitions: number;
  /** 总事件数 */
  totalEvents: number;
  /** 成功转换数 */
  successfulTransitions: number;
  /** 失败转换数 */
  failedTransitions: number;
  /** 当前状态 */
  currentState: StateId;
  /** 运行时间 (毫秒) */
  uptime: number;
  /** 启动时间 */
  startedAt?: number;
}

/** 状态机信息 */
export interface StateMachineInfo {
  /** 状态机 ID */
  id: string;
  /** 当前状态 */
  currentState: StateId;
  /** 上下文 */
  context: StateContext;
  /** 可用事件 */
  availableEvents: EventId[];
  /** 状态历史长度 */
  historyLength: number;
  /** 统计信息 */
  stats: StateMachineStats;
}

// ============== 状态机实现 ==============

/**
 * 有限状态机类
 */
export class StateMachine<T extends StateContext = StateContext> {
  private config: Required<Omit<StateMachineConfig<T>, 'id' | 'initialContext' | 'onStateChange' | 'onEvent' | 'onError'>> & {
    id: string;
    initialContext: Partial<T>;
    onStateChange?: StateMachineConfig<T>['onStateChange'];
    onEvent?: StateMachineConfig<T>['onEvent'];
    onError?: StateMachineConfig<T>['onError'];
  };

  private states: Map<StateId, StateDefinition<T>> = new Map();
  private transitions: Map<StateId, Map<EventId, TransitionDefinition<T>[]>> = new Map();
  private currentStateId: StateId | null = null;
  private context: T;
  private history: StateHistoryEntry<T>[] = [];
  private stats: StateMachineStats = {
    totalStates: 0,
    totalTransitions: 0,
    totalEvents: 0,
    successfulTransitions: 0,
    failedTransitions: 0,
    currentState: 'idle',
    uptime: 0,
  };
  private startedAt?: number;
  private running: boolean = false;

  constructor(config: StateMachineConfig<T>) {
    this.config = {
      id: config.id ?? `sm-${Date.now()}`,
      states: config.states,
      transitions: config.transitions,
      initialContext: config.initialContext ?? {},
      enableLogging: config.enableLogging ?? true,
      strict: config.strict ?? false,
      onStateChange: config.onStateChange,
      onEvent: config.onEvent,
      onError: config.onError,
    };

    // 初始化上下文
    this.context = { ...this.config.initialContext } as T;

    // 注册状态和转换
    this.initialize();
  }

  // ============== 核心功能 ==============

  /**
   * 启动状态机
   */
  start(): void {
    if (this.running) {
      this.log('状态机已在运行', 'warn');
      return;
    }

    this.running = true;
    this.startedAt = Date.now();

    // 查找初始状态
    const initialState = this.config.states.find(s => s.initial);
    if (initialState) {
      this.currentStateId = initialState.id;
      this.log(`状态机启动，初始状态：${initialState.id}`);

      // 执行进入钩子
      if (initialState.onEnter) {
        this.executeHook(initialState.onEnter, '进入初始状态');
      }
    } else if (this.config.states.length > 0) {
      this.currentStateId = this.config.states[0].id;
      this.log(`状态机启动，默认状态：${this.currentStateId}`);
    } else {
      this.log('状态机启动，无初始状态', 'warn');
    }

    this.updateStats();
  }

  /**
   * 停止状态机
   */
  stop(): void {
    if (!this.running) return;

    this.running = false;

    // 执行当前状态的退出钩子
    if (this.currentStateId) {
      const currentState = this.states.get(this.currentStateId);
      if (currentState?.onExit) {
        this.executeHook(currentState.onExit, '退出状态');
      }
    }

    this.log('状态机停止');
    this.updateStats();
  }

  /**
   * 发送事件，触发状态转换
   */
  async send(eventId: EventId, payload?: any): Promise<boolean> {
    if (!this.running) {
      this.log('状态机未运行，无法处理事件', 'warn');
      return false;
    }

    if (!this.currentStateId) {
      this.log('状态机未初始化，无法处理事件', 'warn');
      return false;
    }

    const event: StateEvent<T> = {
      id: eventId,
      payload,
      timestamp: Date.now(),
      fromState: this.currentStateId,
    };

    this.stats.totalEvents++;
    this.config.onEvent?.(event);

    this.log(`收到事件：${eventId} (当前状态：${this.currentStateId})`);

    // 查找匹配的转换
    const transition = this.findTransition(this.currentStateId, eventId, event);

    if (!transition) {
      const message = `未找到转换：${this.currentStateId} --[${eventId}]--> ?`;
      if (this.config.strict) {
        const error = new Error(message);
        this.config.onError?.(error, event);
        throw error;
      }
      this.log(message, 'warn');
      this.recordHistory(this.currentStateId, this.currentStateId, event, false, message);
      this.stats.failedTransitions++;
      return false;
    }

    // 执行守卫检查
    if (transition.guard) {
      try {
        const allowed = await Promise.resolve(transition.guard(this.context, event));
        if (!allowed) {
          this.log(`转换被守卫阻止：${transition.from} --[${eventId}]--> ${transition.to}`);
          this.recordHistory(this.currentStateId, this.currentStateId, event, false, 'Guard rejected');
          this.stats.failedTransitions++;
          return false;
        }
      } catch (error) {
        const message = `守卫执行错误：${error instanceof Error ? error.message : error}`;
        this.config.onError?.(error instanceof Error ? error : new Error(message), event);
        this.log(message, 'error');
        this.recordHistory(this.currentStateId, this.currentStateId, event, false, message);
        this.stats.failedTransitions++;
        return false;
      }
    }

    const fromState = this.currentStateId;
    const toState = transition.to;

    this.log(`执行转换：${fromState} --[${eventId}]--> ${toState}`);

    try {
      // 执行退出钩子
      const fromStateDef = this.states.get(fromState);
      if (fromStateDef?.onExit) {
        await this.executeHook(fromStateDef.onExit, '退出状态');
      }

      // 执行转换动作
      if (transition.action) {
        await Promise.resolve(transition.action(this.context, event));
      }

      // 更新状态
      this.currentStateId = toState;
      event.toState = toState;

      // 执行进入钩子
      const toStateDef = this.states.get(toState);
      if (toStateDef?.onEnter) {
        await this.executeHook(toStateDef.onEnter, '进入状态');
      }

      // 执行状态内事件处理
      if (toStateDef?.on?.[eventId]) {
        await Promise.resolve(toStateDef.on[eventId](this.context));
      }

      // 更新上下文
      if (event.context) {
        Object.assign(this.context, event.context);
      }

      this.log(`转换完成：${toState}`);
      this.recordHistory(fromState, toState, event, true);
      this.stats.successfulTransitions++;
      this.updateStats();

      // 通知状态变更
      this.config.onStateChange?.(fromState, toState, event);

      return true;
    } catch (error) {
      const message = `转换执行错误：${error instanceof Error ? error.message : error}`;
      this.config.onError?.(error instanceof Error ? error : new Error(message), event);
      this.log(message, 'error');
      this.recordHistory(fromState, toState, event, false, message);
      this.stats.failedTransitions++;
      this.updateStats();
      return false;
    }
  }

  /**
   * 获取当前状态
   */
  getCurrentState(): StateId | null {
    return this.currentStateId;
  }

  /**
   * 获取当前状态定义
   */
  getCurrentStateDefinition(): StateDefinition<T> | null {
    if (!this.currentStateId) return null;
    return this.states.get(this.currentStateId) || null;
  }

  /**
   * 获取上下文
   */
  getContext(): T {
    return { ...this.context };
  }

  /**
   * 更新上下文
   */
  updateContext(updates: Partial<T>): void {
    Object.assign(this.context, updates);
    this.log(`上下文更新：${Object.keys(updates).join(', ')}`);
  }

  /**
   * 获取可用事件列表
   */
  getAvailableEvents(): EventId[] {
    if (!this.currentStateId) return [];

    const stateTransitions = this.transitions.get(this.currentStateId);
    if (!stateTransitions) return [];

    return Array.from(stateTransitions.keys());
  }

  /**
   * 获取状态历史
   */
  getHistory(limit: number = 50): StateHistoryEntry<T>[] {
    return this.history.slice(-limit);
  }

  /**
   * 获取状态机信息
   */
  getInfo(): StateMachineInfo {
    return {
      id: this.config.id,
      currentState: this.currentStateId || 'idle',
      context: { ...this.context },
      availableEvents: this.getAvailableEvents(),
      historyLength: this.history.length,
      stats: this.getStats(),
    };
  }

  /**
   * 获取统计信息
   */
  getStats(): StateMachineStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 检查是否在指定状态
   */
  isInState(stateId: StateId): boolean {
    return this.currentStateId === stateId;
  }

  /**
   * 检查是否可以触发指定事件
   */
  canSend(eventId: EventId): boolean {
    if (!this.currentStateId) return false;
    const stateTransitions = this.transitions.get(this.currentStateId);
    if (!stateTransitions) return false;
    return stateTransitions.has(eventId);
  }

  /**
   * 重置状态机到初始状态
   */
  reset(): void {
    this.log('状态机重置');

    // 执行当前状态的退出钩子
    if (this.currentStateId) {
      const currentState = this.states.get(this.currentStateId);
      if (currentState?.onExit) {
        this.executeHook(currentState.onExit, '退出状态');
      }
    }

    // 重置上下文
    this.context = { ...this.config.initialContext } as T;

    // 重置状态
    const initialState = this.config.states.find(s => s.initial);
    this.currentStateId = initialState?.id || this.config.states[0]?.id || null;

    // 执行进入钩子
    if (this.currentStateId && initialState?.onEnter) {
      this.executeHook(initialState.onEnter, '进入初始状态');
    }

    // 清空历史
    this.history = [];

    this.updateStats();
    this.log('状态机重置完成');
  }

  // ============== 私有方法 ==============

  private initialize(): void {
    // 注册所有状态
    for (const state of this.config.states) {
      this.states.set(state.id, state);
    }

    // 注册所有转换
    for (const transition of this.config.transitions) {
      if (!this.transitions.has(transition.from)) {
        this.transitions.set(transition.from, new Map());
      }

      const fromTransitions = this.transitions.get(transition.from)!;
      if (!fromTransitions.has(transition.event)) {
        fromTransitions.set(transition.event, []);
      }

      fromTransitions.get(transition.event)!.push(transition);
    }

    this.stats.totalStates = this.states.size;
    this.stats.totalTransitions = this.config.transitions.length;

    this.log(`状态机初始化完成：${this.states.size} 个状态，${this.config.transitions.length} 个转换`);
  }

  private findTransition(
    fromState: StateId,
    eventId: EventId,
    event: StateEvent<T>
  ): TransitionDefinition<T> | null {
    const stateTransitions = this.transitions.get(fromState);
    if (!stateTransitions) return null;

    const candidates = stateTransitions.get(eventId);
    if (!candidates || candidates.length === 0) return null;

    // 如果有多个候选，按顺序检查守卫
    for (const transition of candidates) {
      if (!transition.guard) {
        return transition;
      }
    }

    // 所有转换都有守卫，返回第一个 (实际应用中可能需要更复杂的策略)
    return candidates[0];
  }

  private async executeHook(hook: StateHook<T>, description: string): Promise<void> {
    try {
      await Promise.resolve(hook(this.context));
    } catch (error) {
      this.log(`${description}钩子执行错误：${error instanceof Error ? error.message : error}`, 'error');
      throw error;
    }
  }

  private recordHistory(
    from: StateId,
    to: StateId,
    event: StateEvent<T>,
    success: boolean,
    error?: string
  ): void {
    const entry: StateHistoryEntry<T> = {
      timestamp: Date.now(),
      from,
      to,
      event: { ...event },
      success,
      error,
    };

    this.history.push(entry);

    // 限制历史长度
    const MAX_HISTORY = 1000;
    if (this.history.length > MAX_HISTORY) {
      this.history = this.history.slice(-MAX_HISTORY);
    }
  }

  private updateStats(): void {
    this.stats.currentState = this.currentStateId || 'idle';
    this.stats.uptime = this.startedAt ? Date.now() - this.startedAt : 0;
    this.stats.startedAt = this.startedAt;
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.enableLogging) return;

    const prefix = `[StateMachine:${this.config.id}]`;
    switch (level) {
      case 'error':
        console.error(`${prefix} [ERROR] ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} [WARN] ${message}`);
        break;
      default:
        console.log(`${prefix} [INFO] ${message}`);
    }
  }
}

// ============== 辅助函数 ==============

/**
 * 创建状态定义
 */
export function createState<T extends StateContext = StateContext>(
  id: StateId,
  options: Partial<StateDefinition<T>> = {}
): StateDefinition<T> {
  return {
    id,
    name: options.name ?? id,
    description: options.description,
    initial: options.initial ?? false,
    final: options.final ?? false,
    onEnter: options.onEnter,
    onExit: options.onExit,
    on: options.on,
    metadata: options.metadata,
  };
}

/**
 * 创建转换定义
 */
export function createTransition<T extends StateContext = StateContext>(
  from: StateId,
  event: EventId,
  to: StateId,
  options: Partial<TransitionDefinition<T>> = {}
): TransitionDefinition<T> {
  return {
    from,
    event,
    to,
    guard: options.guard,
    action: options.action,
    description: options.description,
  };
}

/**
 * 创建事件
 */
export function createEvent<T extends StateContext = StateContext>(
  id: EventId,
  payload?: any,
  context?: Partial<T>
): StateEvent<T> {
  return {
    id,
    payload,
    timestamp: Date.now(),
    context,
  };
}

// ============== 导出 ==============

export default StateMachine;
