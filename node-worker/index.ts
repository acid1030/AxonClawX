/**
 * AxonClaw Node Worker (工作节点代理)
 * 
 * 负责:
 * - 连接到主节点
 * - 执行任务
 * - 发送心跳
 * - 报告状态
 */

import WebSocket from 'ws';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// 配置
const CONFIG = {
  CONTROLLER_URL: process.env.CONTROLLER_URL || 'ws://localhost:18789',
  HEARTBEAT_INTERVAL: 30000,  // 30 秒
  GATEWAY_TOKEN_FILE: path.join(process.env.HOME || '', '.openclaw/data/gateway-token.txt'),
  NODE_ID_FILE: path.join(process.env.HOME || '', '.openclaw/data/node-id.txt'),
  LOG_FILE: path.join(process.env.HOME || '', '.openclaw/logs/node-worker.log')
};

// 类型定义
interface Task {
  id: string;
  type: string;
  priority: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  payload?: any;
  timeoutMs?: number;
  maxRetries?: number;
  createdAt: number;
}

interface Heartbeat {
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

// 工作节点代理
export class NodeWorker extends EventEmitter {
  private ws: WebSocket | null = null;
  private nodeId: string;
  private gatewayToken: string;
  private logger: Logger;
  private heartbeatInterval?: NodeJS.Timeout;
  private sequence: number = 0;
  private activeTasks: Map<string, any> = new Map();
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  constructor() {
    super();
    this.logger = new Logger(CONFIG.LOG_FILE);
    this.nodeId = this.loadOrCreateNodeId();
    this.gatewayToken = this.loadGatewayToken();
    
    this.logger.info('NodeWorker 已初始化', { nodeId: this.nodeId });
  }

  private loadOrCreateNodeId(): string {
    try {
      if (fs.existsSync(CONFIG.NODE_ID_FILE)) {
        const id = fs.readFileSync(CONFIG.NODE_ID_FILE, 'utf-8').trim();
        this.logger.info('已加载节点 ID', { nodeId: id });
        return id;
      }
    } catch (error) {
      this.logger.warn('加载节点 ID 失败', { error });
    }

    // 生成新的节点 ID
    const id = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    try {
      const dir = path.dirname(CONFIG.NODE_ID_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(CONFIG.NODE_ID_FILE, id);
      this.logger.info('已创建节点 ID', { nodeId: id });
    } catch (error) {
      this.logger.error('保存节点 ID 失败', { error });
    }
    return id;
  }

  private loadGatewayToken(): string {
    try {
      if (fs.existsSync(CONFIG.GATEWAY_TOKEN_FILE)) {
        const token = fs.readFileSync(CONFIG.GATEWAY_TOKEN_FILE, 'utf-8').trim();
        this.logger.info('已加载 Gateway Token');
        return token;
      }
    } catch (error) {
      this.logger.warn('加载 Gateway Token 失败', { error });
    }

    // 使用默认 token (从 nodes.json 读取)
    try {
      const nodesFile = path.join(process.env.HOME || '', '.openclaw/data/nodes.json');
      if (fs.existsSync(nodesFile)) {
        const data = JSON.parse(fs.readFileSync(nodesFile, 'utf-8'));
        const token = data.gatewayToken || '';
        // 保存 token
        const dir = path.dirname(CONFIG.GATEWAY_TOKEN_FILE);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(CONFIG.GATEWAY_TOKEN_FILE, token);
        this.logger.info('已从 nodes.json 加载 Gateway Token');
        return token;
      }
    } catch (error) {
      this.logger.error('从 nodes.json 加载 Gateway Token 失败', { error });
    }

    return '';
  }

  async connect() {
    return new Promise<void>((resolve, reject) => {
      this.logger.info('正在连接控制器', { url: CONFIG.CONTROLLER_URL });

      this.ws = new WebSocket(CONFIG.CONTROLLER_URL);

      this.ws.on('open', () => {
        this.logger.info('已连接到控制器');
        this.reconnectAttempts = 0;
        this.register();
        resolve();
      });

      this.ws.on('error', (error) => {
        this.logger.error('WebSocket 错误', { error });
        reject(error);
      });

      this.ws.on('close', () => {
        this.logger.warn('连接已关闭');
        this.heartbeatInterval && clearInterval(this.heartbeatInterval);
        this.reconnect();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          this.logger.error('消息解析失败', { error, data: data.toString() });
        }
      });
    });
  }

  private register() {
    const nodeInfo = {
      nodeId: this.nodeId,
      name: os.hostname(),
      type: 'worker',
      ip: this.getLocalIP(),
      port: 18790,
      gatewayToken: this.gatewayToken,
      publicKey: '',
      capabilities: ['exec', 'browser', 'file', 'memory'],
      metadata: {
        hostname: os.hostname(),
        os: `${os.type()} ${os.release()}`,
        arch: os.arch(),
        cpuCores: os.cpus().length,
        memoryGB: Math.round(os.totalmem() / 1024 / 1024 / 1024)
      }
    };

    this.send({
      jsonrpc: '2.0',
      method: 'nodes.register',
      params: nodeInfo,
      id: 1
    });
  }

  private getLocalIP(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, CONFIG.HEARTBEAT_INTERVAL);

    this.logger.info('心跳已启动', { interval: CONFIG.HEARTBEAT_INTERVAL });
  }

  private sendHeartbeat() {
    this.sequence++;

    const heartbeat: Heartbeat = {
      nodeId: this.nodeId,
      timestamp: Date.now(),
      sequence: this.sequence,
      status: {
        cpu: os.loadavg()[0] / os.cpus().length,
        memory: 1 - os.freemem() / os.totalmem(),
        disk: this.getDiskUsage(),
        network: {
          latency: 0,
          packetLoss: 0
        }
      },
      runtime: {
        activeTasks: this.activeTasks.size,
        queuedTasks: 0,
        uptime: process.uptime() * 1000,
        version: '1.0.0'
      }
    };

    this.send({
      jsonrpc: '2.0',
      method: 'nodes.heartbeat',
      params: heartbeat,
      id: this.sequence
    });
  }

  private getDiskUsage(): number {
    try {
      // 简化的磁盘使用率计算
      return 0.5; // TODO: 实现真实的磁盘使用率计算
    } catch {
      return 0;
    }
  }

  private handleMessage(message: any) {
    const { method, params, id, result, error } = message;

    if (method) {
      // 请求
      switch (method) {
        case 'tasks.dispatch':
          this.handleTaskDispatch(params, id);
          break;
        default:
          this.logger.warn('未知方法', { method });
      }
    } else if (id !== undefined) {
      // 响应
      if (error) {
        this.logger.error('请求失败', { id, error });
      } else {
        this.logger.debug('请求成功', { id, result });
      }
    }
  }

  private async handleTaskDispatch(params: any, id: number) {
    const { task } = params as { task: Task };
    
    this.logger.info('收到任务', { taskId: task.id, type: task.type });

    // 确认接收
    this.send({
      jsonrpc: '2.0',
      method: 'tasks.ack',
      params: {
        taskId: task.id,
        status: 'accepted',
        estimatedDuration: 60000
      },
      id
    });

    // 执行任务
    this.activeTasks.set(task.id, task);
    this.executeTask(task);
  }

  private async executeTask(task: Task) {
    try {
      if (task.type === 'exec:command' && task.command) {
        this.logger.info('执行命令', { command: task.command });
        
        const { stdout, stderr } = await execAsync(task.command, {
          env: task.env,
          timeout: task.timeoutMs
        });

        // 发送结果
        this.send({
          jsonrpc: '2.0',
          method: 'tasks.complete',
          params: {
            taskId: task.id,
            status: 'completed',
            result: {
              exitCode: 0,
              stdout,
              stderr,
              duration: Date.now() - task.createdAt
            },
            completedAt: Date.now()
          }
        });

        this.logger.info('任务完成', { taskId: task.id });
      } else {
        // 其他任务类型
        this.logger.warn('未实现的任务类型', { type: task.type });
      }
    } catch (error: any) {
      this.logger.error('任务执行失败', { taskId: task.id, error });
      
      this.send({
        jsonrpc: '2.0',
        method: 'tasks.complete',
        params: {
          taskId: task.id,
          status: 'failed',
          error: {
            code: 'EXEC_ERROR',
            message: error.message,
            details: { error }
          },
          completedAt: Date.now()
        }
      });
    } finally {
      this.activeTasks.delete(task.id);
    }
  }

  private send(message: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      this.logger.warn('无法发送消息 (连接未打开)', { message });
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('达到最大重连次数', { attempts: this.reconnectAttempts });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    
    this.logger.info('准备重连', { attempt: this.reconnectAttempts, delay });

    setTimeout(() => {
      this.connect().catch(err => {
        this.logger.error('重连失败', { err });
      });
    }, delay);
  }

  disconnect() {
    this.heartbeatInterval && clearInterval(this.heartbeatInterval);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.logger.info('NodeWorker 已断开连接');
  }

  // 公开 API
  getNodeInfo() {
    return {
      nodeId: this.nodeId,
      hostname: os.hostname(),
      activeTasks: this.activeTasks.size,
      sequence: this.sequence
    };
  }
}

// 启动 Worker
if (require.main === module) {
  const worker = new NodeWorker();
  
  worker.connect()
    .then(() => {
      console.log('✅ NodeWorker 已连接');
      worker.startHeartbeat();
    })
    .catch(err => {
      console.error('❌ 连接失败:', err);
      process.exit(1);
    });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n正在关闭...');
    worker.disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    worker.disconnect();
    process.exit(0);
  });
}
