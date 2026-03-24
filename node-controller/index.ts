/**
 * AxonClaw Node Controller (主节点控制器)
 * 
 * 负责:
 * - 节点注册与管理
 * - WebSocket 通信服务器
 * - 心跳检测
 * - 任务调度
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// 配置
const CONFIG = {
  WS_PORT: 18789,
  HEARTBEAT_INTERVAL: 30000,  // 30 秒
  HEARTBEAT_TIMEOUT: 90000,   // 90 秒超时
  NODES_FILE: path.join(process.env.HOME || '', '.openclaw/data/nodes.json'),
  LOG_FILE: path.join(process.env.HOME || '', '.openclaw/logs/node-controller.log')
};

// 类型定义
export enum NodeType {
  CONTROLLER = 'controller',
  WORKER = 'worker',
  BACKUP = 'backup',
  OBSERVER = 'observer'
}

export enum NodeStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  DEGRADED = 'degraded',
  MAINTENANCE = 'maintenance'
}

export interface NodeConfig {
  id: string;
  name: string;
  type: NodeType;
  ip: string;
  port: number;
  gatewayToken: string;
  capabilities: string[];
  metadata: {
    hostname: string;
    os: string;
    arch: string;
    cpuCores: number;
    memoryGB: number;
  };
  status: NodeStatus;
  registeredAt: number;
  lastHeartbeat: number;
  publicKey?: string;
}

export interface Heartbeat {
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

// 日志工具
class Logger {
  private logFile: string;

  constructor(logFile: string) {
    this.logFile = logFile;
    const logDir = path.dirname(logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  private timestamp() {
    return new Date().toISOString();
  }

  info(message: string, data?: any) {
    this.write('INFO', message, data);
  }

  warn(message: string, data?: any) {
    this.write('WARN', message, data);
  }

  error(message: string, data?: any) {
    this.write('ERROR', message, data);
  }

  private write(level: string, message: string, data?: any) {
    const log = {
      timestamp: this.timestamp(),
      level,
      message,
      ...(data && { data })
    };
    const line = JSON.stringify(log) + '\n';
    fs.appendFileSync(this.logFile, line);
    console.log(`[${level}] ${message}`, data || '');
  }
}

// 节点注册表
class NodeRegistry {
  private nodes: Map<string, NodeConfig> = new Map();
  private nodesFile: string;
  private logger: Logger;

  constructor(nodesFile: string, logger: Logger) {
    this.nodesFile = nodesFile;
    this.logger = logger;
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.nodesFile)) {
        const data = JSON.parse(fs.readFileSync(this.nodesFile, 'utf-8'));
        Object.values(data.nodes || {}).forEach((node: any) => {
          this.nodes.set(node.id, node);
        });
        this.logger.info('节点注册表已加载', { count: this.nodes.size });
      }
    } catch (error) {
      this.logger.error('加载节点注册表失败', { error });
    }
  }

  private save() {
    try {
      const data = {
        nodes: Object.fromEntries(this.nodes),
        version: 1,
        updatedAt: Date.now()
      };
      const dir = path.dirname(this.nodesFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.nodesFile, JSON.stringify(data, null, 2));
      this.logger.info('节点注册表已保存');
    } catch (error) {
      this.logger.error('保存节点注册表失败', { error });
    }
  }

  register(node: NodeConfig): boolean {
    if (this.nodes.has(node.id)) {
      this.logger.warn('节点已存在', { nodeId: node.id });
      return false;
    }

    this.nodes.set(node.id, node);
    this.save();
    this.logger.info('节点已注册', { nodeId: node.id, name: node.name });
    return true;
  }

  update(nodeId: string, updates: Partial<NodeConfig>): boolean {
    const node = this.nodes.get(nodeId);
    if (!node) {
      this.logger.warn('节点不存在', { nodeId });
      return false;
    }

    Object.assign(node, updates);
    this.save();
    return true;
  }

  updateStatus(nodeId: string, status: NodeStatus): boolean {
    return this.update(nodeId, { status, lastHeartbeat: Date.now() });
  }

  get(nodeId: string): NodeConfig | undefined {
    return this.nodes.get(nodeId);
  }

  getAll(): NodeConfig[] {
    return Array.from(this.nodes.values());
  }

  getOnlineNodes(): NodeConfig[] {
    return this.getAll().filter(n => n.status === NodeStatus.ONLINE);
  }

  remove(nodeId: string): boolean {
    const deleted = this.nodes.delete(nodeId);
    if (deleted) {
      this.save();
      this.logger.info('节点已移除', { nodeId });
    }
    return deleted;
  }

  getGatewayToken(): string | undefined {
    try {
      const data = JSON.parse(fs.readFileSync(this.nodesFile, 'utf-8'));
      return data.gatewayToken;
    } catch {
      return undefined;
    }
  }
}

// WebSocket 服务器
class NodeWebSocketServer extends EventEmitter {
  private wss: WebSocket.Server;
  private registry: NodeRegistry;
  private logger: Logger;
  private heartbeats: Map<string, NodeJS.Timeout> = new Map();
  private sequences: Map<string, number> = new Map();

  constructor(port: number, registry: NodeRegistry, logger: Logger) {
    super();
    this.registry = registry;
    this.logger = logger;
    
    this.wss = new WebSocket.Server({
      port,
      clientTracking: true
    });

    this.setupHandlers();
    this.logger.info(`WebSocket 服务器已启动`, { port });
  }

  private setupHandlers() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const ip = req.socket.remoteAddress || 'unknown';
      this.logger.info('新连接', { ip });

      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(ws, message);
        } catch (error) {
          this.logger.error('消息解析失败', { error, data: data.toString() });
        }
      });

      ws.on('close', () => {
        this.logger.info('连接关闭');
      });

      ws.on('error', (error) => {
        this.logger.error('WebSocket 错误', { error });
      });
    });
  }

  private handleMessage(ws: WebSocket, message: any) {
    const { method, params, id } = message;

    this.logger.info('收到消息', { method, params });

    switch (method) {
      case 'nodes.register':
        this.handleRegister(ws, params, id);
        break;

      case 'nodes.heartbeat':
        this.handleHeartbeat(ws, params, id);
        break;

      case 'tasks.ack':
      case 'tasks.progress':
      case 'tasks.complete':
        this.emit('task:update', { method, params });
        break;

      default:
        this.sendError(ws, '未知方法', id);
    }
  }

  private handleRegister(ws: WebSocket, params: any, id: number) {
    const { nodeId, name, type, ip, port, gatewayToken, publicKey, capabilities, metadata } = params;

    // 验证 Gateway Token
    const expectedToken = this.registry.getGatewayToken();
    if (gatewayToken !== expectedToken) {
      this.sendError(ws, '无效的 Gateway Token', id);
      return;
    }

    const node: NodeConfig = {
      id: nodeId,
      name,
      type: type as NodeType,
      ip,
      port,
      gatewayToken,
      capabilities: capabilities || [],
      metadata,
      status: NodeStatus.ONLINE,
      registeredAt: Date.now(),
      lastHeartbeat: Date.now(),
      publicKey
    };

    if (this.registry.register(node)) {
      this.setupHeartbeat(ws, nodeId);
      this.sendSuccess(ws, {
        status: 'accepted',
        nodeId,
        assignedRoles: ['worker'],
        config: {
          heartbeatInterval: CONFIG.HEARTBEAT_INTERVAL,
          taskPollInterval: 5000,
          memorySyncInterval: 3600000
        },
        controllerInfo: {
          nodeId: 'controller-local',
          publicKey: ''
        }
      }, id);
      this.logger.info('节点注册成功', { nodeId, name });
    } else {
      this.sendError(ws, '节点注册失败', id);
    }
  }

  private handleHeartbeat(ws: WebSocket, params: Heartbeat, id: number) {
    const { nodeId, timestamp, sequence, status, runtime } = params;

    const node = this.registry.get(nodeId);
    if (!node) {
      this.sendError(ws, '节点未注册', id);
      return;
    }

    // 检查序列号 (检测丢包)
    const lastSeq = this.sequences.get(nodeId) || 0;
    if (sequence <= lastSeq) {
      this.logger.warn('心跳序列号异常', { nodeId, sequence, lastSeq });
    }
    this.sequences.set(nodeId, sequence);

    // 更新节点状态
    this.registry.updateStatus(nodeId, NodeStatus.ONLINE);
    this.resetHeartbeatTimer(nodeId);

    this.sendSuccess(ws, { status: 'ok' }, id);
    this.emit('heartbeat', { nodeId, status, runtime });
  }

  private setupHeartbeat(ws: WebSocket, nodeId: string) {
    const timeout = setTimeout(() => {
      this.logger.warn('心跳超时', { nodeId });
      this.registry.updateStatus(nodeId, NodeStatus.OFFLINE);
      this.emit('node:offline', { nodeId });
    }, CONFIG.HEARTBEAT_TIMEOUT);

    this.heartbeats.set(nodeId, timeout);
  }

  private resetHeartbeatTimer(nodeId: string) {
    const existing = this.heartbeats.get(nodeId);
    if (existing) {
      clearTimeout(existing);
    }

    const timeout = setTimeout(() => {
      this.logger.warn('心跳超时', { nodeId });
      this.registry.updateStatus(nodeId, NodeStatus.OFFLINE);
      this.emit('node:offline', { nodeId });
    }, CONFIG.HEARTBEAT_TIMEOUT);

    this.heartbeats.set(nodeId, timeout);
  }

  private sendSuccess(ws: WebSocket, result: any, id: number) {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      result,
      id
    }));
  }

  private sendError(ws: WebSocket, message: string, id: number) {
    ws.send(JSON.stringify({
      jsonrpc: '2.0',
      error: { code: -32000, message },
      id
    }));
  }

  broadcast(message: any) {
    const data = JSON.stringify(message);
    this.wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  close() {
    this.wss.close();
    this.heartbeats.forEach(timeout => clearTimeout(timeout));
    this.logger.info('WebSocket 服务器已关闭');
  }
}

// 主控制器
export class NodeController {
  private registry: NodeRegistry;
  private wsServer: NodeWebSocketServer;
  private logger: Logger;

  constructor() {
    this.logger = new Logger(CONFIG.LOG_FILE);
    this.registry = new NodeRegistry(CONFIG.NODES_FILE, this.logger);
    this.wsServer = new NodeWebSocketServer(CONFIG.WS_PORT, this.registry, this.logger);

    this.setupEventHandlers();
    this.logger.info('NodeController 已初始化');
  }

  private setupEventHandlers() {
    this.wsServer.on('heartbeat', (data) => {
      this.logger.debug('心跳更新', data);
    });

    this.wsServer.on('node:offline', (data) => {
      this.logger.warn('节点离线', data);
      // 触发故障转移逻辑
      this.handleNodeFailure(data.nodeId);
    });

    this.wsServer.on('task:update', (data) => {
      this.logger.info('任务更新', data);
    });
  }

  private handleNodeFailure(nodeId: string) {
    // TODO: 实现故障转移逻辑
    this.logger.warn('故障转移待实现', { nodeId });
  }

  // 公开 API
  getNodes() {
    return this.registry.getAll();
  }

  getOnlineNodes() {
    return this.registry.getOnlineNodes();
  }

  getNode(nodeId: string) {
    return this.registry.get(nodeId);
  }

  broadcast(message: any) {
    this.wsServer.broadcast(message);
  }

  shutdown() {
    this.wsServer.close();
    this.logger.info('NodeController 已关闭');
  }
}

// 启动控制器
if (require.main === module) {
  const controller = new NodeController();
  
  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n正在关闭...');
    controller.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    controller.shutdown();
    process.exit(0);
  });

  console.log('✅ NodeController 已启动');
  console.log(`📡 WebSocket: ws://localhost:${CONFIG.WS_PORT}`);
  console.log(`📁 节点注册表：${CONFIG.NODES_FILE}`);
  console.log(`📝 日志：${CONFIG.LOG_FILE}`);
}
