/**
 * 心跳检测模块
 * 
 * 功能:
 * - 监控节点心跳
 * - 故障检测 (超时、丢包)
 * - 故障状态机管理
 * - 主动探测
 */

import { EventEmitter } from 'events';
import { Logger } from './logger';

export enum FailureState {
  HEALTHY = 'healthy',
  SUSPECTED = 'suspected',
  UNREACHABLE = 'unreachable',
  FAILED = 'failed',
  RECOVERING = 'recovering'
}

export interface HeartbeatConfig {
  heartbeatIntervalMs: number;      // 心跳间隔 (默认 30s)
  heartbeatTimeoutMs: number;       // 心跳超时 (默认 90s)
  missedHeartbeatsThreshold: number; // 超时阈值 (默认 3 次)
  probeIntervalMs: number;          // 主动探测间隔 (默认 60s)
  probeTimeoutMs: number;           // 探测超时 (默认 10s)
  failureThreshold: number;         // 故障判定阈值
  recoveryThreshold: number;        // 恢复阈值
}

const DEFAULT_CONFIG: HeartbeatConfig = {
  heartbeatIntervalMs: 30000,
  heartbeatTimeoutMs: 90000,
  missedHeartbeatsThreshold: 3,
  probeIntervalMs: 60000,
  probeTimeoutMs: 10000,
  failureThreshold: 3,
  recoveryThreshold: 2
};

export interface HeartbeatData {
  nodeId: string;
  timestamp: number;
  sequence: number;
  status: {
    cpu: number;
    memory: number;
    disk: number;
    network: {
      latency: number;
      packetLoss: number;
    };
  };
  runtime: {
    activeTasks: number;
    queuedTasks: number;
    uptime: number;
    version: string;
  };
}

interface NodeState {
  state: FailureState;
  lastHeartbeat: number;
  lastSequence: number;
  missedCount: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  probeTimer?: NodeJS.Timeout;
}

export class HeartbeatDetector extends EventEmitter {
  private config: HeartbeatConfig;
  private logger: Logger;
  private nodeStates: Map<string, NodeState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();

  constructor(logger: Logger, config?: Partial<HeartbeatConfig>) {
    super();
    this.logger = logger;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.logger.info('心跳检测器已初始化', this.config);
  }

  /**
   * 接收心跳
   */
  onHeartbeat(nodeId: string, data: HeartbeatData) {
    const state = this.getOrCreateState(nodeId);
    
    // 检查序列号 (检测丢包)
    if (data.sequence <= state.lastSequence) {
      this.logger.warn('心跳序列号异常', { nodeId, sequence: data.sequence, lastSequence: state.lastSequence });
    }

    // 重置状态
    state.lastHeartbeat = data.timestamp;
    state.lastSequence = data.sequence;
    state.missedCount = 0;
    state.consecutiveSuccesses++;
    
    // 状态转换
    if (state.state === FailureState.SUSPECTED || state.state === FailureState.RECOVERING) {
      if (state.consecutiveSuccesses >= this.config.recoveryThreshold) {
        this.transitionState(nodeId, FailureState.HEALTHY);
      }
    } else if (state.state !== FailureState.HEALTHY) {
      this.transitionState(nodeId, FailureState.HEALTHY);
    }

    // 重置超时定时器
    this.resetTimeoutTimer(nodeId);

    this.emit('heartbeat', { nodeId, data, state: state.state });
  }

  /**
   * 节点注册 (开始监控)
   */
  registerNode(nodeId: string) {
    if (this.nodeStates.has(nodeId)) {
      this.logger.warn('节点已注册', { nodeId });
      return;
    }

    this.nodeStates.set(nodeId, {
      state: FailureState.HEALTHY,
      lastHeartbeat: Date.now(),
      lastSequence: 0,
      missedCount: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    });

    // 启动超时定时器
    this.startTimeoutTimer(nodeId);

    this.logger.info('节点已注册监控', { nodeId });
    this.emit('node:registered', { nodeId });
  }

  /**
   * 节点注销 (停止监控)
   */
  unregisterNode(nodeId: string) {
    const state = this.nodeStates.get(nodeId);
    if (!state) {
      return;
    }

    // 清除定时器
    const timer = this.timers.get(nodeId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(nodeId);
    }

    if (state.probeTimer) {
      clearTimeout(state.probeTimer);
    }

    this.nodeStates.delete(nodeId);
    this.logger.info('节点已注销监控', { nodeId });
    this.emit('node:unregistered', { nodeId });
  }

  /**
   * 获取节点状态
   */
  getNodeState(nodeId: string): FailureState | undefined {
    return this.nodeStates.get(nodeId)?.state;
  }

  /**
   * 获取所有节点状态
   */
  getAllStates(): Map<string, FailureState> {
    const states = new Map<string, FailureState>();
    this.nodeStates.forEach((state, nodeId) => {
      states.set(nodeId, state.state);
    });
    return states;
  }

  /**
   * 主动探测节点
   */
  async probeNode(nodeId: string): Promise<boolean> {
    this.logger.debug('主动探测节点', { nodeId });
    
    // TODO: 实现主动探测 (ping 或健康检查 API)
    // 这里返回 true 作为占位
    const isHealthy = true;

    const state = this.nodeStates.get(nodeId);
    if (!state) {
      return false;
    }

    if (isHealthy) {
      state.consecutiveSuccesses++;
      state.consecutiveFailures = 0;
      
      if (state.state === FailureState.UNREACHABLE && 
          state.consecutiveSuccesses >= this.config.recoveryThreshold) {
        this.transitionState(nodeId, FailureState.RECOVERING);
      }
    } else {
      state.consecutiveFailures++;
      
      if (state.consecutiveFailures >= this.config.failureThreshold) {
        this.transitionState(nodeId, FailureState.FAILED);
      }
    }

    return isHealthy;
  }

  private getOrCreateState(nodeId: string): NodeState {
    if (!this.nodeStates.has(nodeId)) {
      this.nodeStates.set(nodeId, {
        state: FailureState.HEALTHY,
        lastHeartbeat: Date.now(),
        lastSequence: 0,
        missedCount: 0,
        consecutiveFailures: 0,
        consecutiveSuccesses: 0
      });
      this.startTimeoutTimer(nodeId);
    }
    return this.nodeStates.get(nodeId)!;
  }

  private startTimeoutTimer(nodeId: string) {
    const timer = setTimeout(() => {
      this.onHeartbeatTimeout(nodeId);
    }, this.config.heartbeatTimeoutMs);

    this.timers.set(nodeId, timer);
  }

  private resetTimeoutTimer(nodeId: string) {
    const existing = this.timers.get(nodeId);
    if (existing) {
      clearTimeout(existing);
    }

    this.startTimeoutTimer(nodeId);
  }

  private onHeartbeatTimeout(nodeId: string) {
    const state = this.nodeStates.get(nodeId);
    if (!state) {
      return;
    }

    state.missedCount++;
    this.logger.warn('心跳超时', { nodeId, missedCount: state.missedCount });

    // 状态转换
    if (state.missedCount === 1) {
      this.transitionState(nodeId, FailureState.SUSPECTED);
    } else if (state.missedCount >= this.config.missedHeartbeatsThreshold) {
      if (state.state !== FailureState.FAILED) {
        this.transitionState(nodeId, FailureState.UNREACHABLE);
        this.emit('node:unreachable', { nodeId, missedCount: state.missedCount });
        
        // 启动主动探测
        this.startProbing(nodeId);
      }
    }

    // 重启超时定时器
    this.startTimeoutTimer(nodeId);
  }

  private transitionState(nodeId: string, newState: FailureState) {
    const state = this.nodeStates.get(nodeId);
    if (!state) {
      return;
    }

    const oldState = state.state;
    if (oldState === newState) {
      return;
    }

    state.state = newState;
    this.logger.info('节点状态变更', { nodeId, from: oldState, to: newState });
    this.emit('state:change', { nodeId, from: oldState, to: newState });

    // 触发故障事件
    if (newState === FailureState.FAILED || newState === FailureState.UNREACHABLE) {
      this.emit('node:failed', { nodeId, state: newState });
    }
  }

  private startProbing(nodeId: string) {
    const state = this.nodeStates.get(nodeId);
    if (!state || state.probeTimer) {
      return;
    }

    const probe = async () => {
      const healthy = await this.probeNode(nodeId);
      
      if (!healthy && state.state === FailureState.UNREACHABLE) {
        // 继续探测
        state.probeTimer = setTimeout(probe, this.config.probeIntervalMs);
      }
    };

    state.probeTimer = setTimeout(probe, this.config.probeIntervalMs);
  }

  /**
   * 关闭检测器
   */
  shutdown() {
    // 清除所有定时器
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();

    this.nodeStates.forEach(state => {
      if (state.probeTimer) {
        clearTimeout(state.probeTimer);
      }
    });

    this.nodeStates.clear();
    this.logger.info('心跳检测器已关闭');
  }
}

export default HeartbeatDetector;
