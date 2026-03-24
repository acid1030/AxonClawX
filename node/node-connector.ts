/**
 * AxonClaw Node Connector
 * 
 * 通过 SSH + 环境变量实现节点连接
 * 
 * 核心功能:
 * 1. SSH 登录远程主机
 * 2. 执行单命令：export VAR && openclaw node run &
 * 3. 验证连接状态
 */

import { Client, SFTPWrapper } from 'ssh2';
import * as fs from 'fs';
import * as path from 'path';

// ============ 配置 ============

const CONFIG = {
  SSH_PORT: 22,
  CONNECT_TIMEOUT: 10000,      // 10 秒连接超时
  READY_TIMEOUT: 5000,         // 5 秒就绪超时
  VERIFICATION_DELAY: 2000,    // 验证延迟 2 秒
  NODES_CONFIG_FILE: path.join(process.env.HOME || '', '.openclaw/data/node-connections.json'),
  LOG_FILE: path.join(process.env.HOME || '', '.openclaw/logs/node-connector.log')
};

// ============ 类型定义 ============

export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKey?: string;
  passphrase?: string;
  keepaliveInterval?: number;
  readyTimeout?: number;
}

export interface NodeConnection {
  id: string;
  name: string;
  host: string;
  status: 'connected' | 'disconnected' | 'error';
  connectedAt?: number;
  lastError?: string;
}

export interface ConnectionResult {
  success: boolean;
  nodeId?: string;
  message: string;
  error?: string;
}

// ============ 日志工具 ============

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

  debug(message: string, data?: any) {
    this.write('DEBUG', message, data);
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

// ============ SSH 配置管理 ============

class SSHConfigManager {
  private configFile: string;
  private logger: Logger;
  private connections: Map<string, NodeConnection> = new Map();

  constructor(configFile: string, logger: Logger) {
    this.configFile = configFile;
    this.logger = logger;
    this.load();
  }

  private load() {
    try {
      if (fs.existsSync(this.configFile)) {
        const data = JSON.parse(fs.readFileSync(this.configFile, 'utf-8'));
        Object.values(data.connections || {}).forEach((conn: any) => {
          this.connections.set(conn.id, conn);
        });
        this.logger.info('SSH 配置已加载', { count: this.connections.size });
      }
    } catch (error) {
      this.logger.error('加载 SSH 配置失败', { error });
    }
  }

  private save() {
    try {
      const data = {
        connections: Object.fromEntries(this.connections),
        version: 1,
        updatedAt: Date.now()
      };
      const dir = path.dirname(this.configFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configFile, JSON.stringify(data, null, 2));
      this.logger.info('SSH 配置已保存');
    } catch (error) {
      this.logger.error('保存 SSH 配置失败', { error });
    }
  }

  addConnection(connection: NodeConnection): void {
    this.connections.set(connection.id, connection);
    this.save();
    this.logger.info('连接配置已添加', { id: connection.id, name: connection.name });
  }

  updateConnection(id: string, updates: Partial<NodeConnection>): boolean {
    const conn = this.connections.get(id);
    if (!conn) {
      this.logger.warn('连接配置不存在', { id });
      return false;
    }

    Object.assign(conn, updates);
    this.save();
    return true;
  }

  getConnection(id: string): NodeConnection | undefined {
    return this.connections.get(id);
  }

  getAllConnections(): NodeConnection[] {
    return Array.from(this.connections.values());
  }

  removeConnection(id: string): boolean {
    const deleted = this.connections.delete(id);
    if (deleted) {
      this.save();
      this.logger.info('连接配置已移除', { id });
    }
    return deleted;
  }
}

// ============ 节点连接器 ============

export class NodeConnector {
  private logger: Logger;
  private configManager: SSHConfigManager;

  constructor() {
    this.logger = new Logger(CONFIG.LOG_FILE);
    this.configManager = new SSHConfigManager(CONFIG.NODES_CONFIG_FILE, this.logger);
    this.logger.info('NodeConnector 已初始化');
  }

  /**
   * 连接到远程节点
   * 
   * @param host SSH 主机地址
   * @param name 节点名称
   * @param sshConfig SSH 配置（可选，提供则使用，否则从配置管理器获取）
   * @returns 连接结果
   */
  async connectNode(host: string, name: string, sshConfig?: SSHConfig): Promise<ConnectionResult> {
    const connectionId = `${name}-${host.replace(/\./g, '-')}`;
    
    this.logger.info('开始连接节点', { host, name, connectionId });

    return new Promise<ConnectionResult>((resolve) => {
      const conn = new Client();
      let connectionTimeout: NodeJS.Timeout;

      // 设置连接超时
      connectionTimeout = setTimeout(() => {
        conn.end();
        const errorMsg = '连接超时';
        this.logger.error(errorMsg, { host, name });
        this.updateConnectionStatus(connectionId, 'error', errorMsg);
        resolve({ success: false, message: '连接失败', error: errorMsg });
      }, CONFIG.CONNECT_TIMEOUT);

      conn.on('ready', async () => {
        clearTimeout(connectionTimeout);
        this.logger.info('SSH 连接成功', { host, name });

        try {
          // 执行连接命令
          const result = await this.executeConnectionCommand(conn, name);
          
          if (result.success) {
            // 验证连接
            const verified = await this.verifyConnection(conn, name);
            
            if (verified) {
              this.updateConnectionStatus(connectionId, 'connected');
              resolve({
                success: true,
                nodeId: connectionId,
                message: '节点连接成功'
              });
            } else {
              resolve({
                success: false,
                message: '连接验证失败',
                error: '节点未正确启动'
              });
            }
          } else {
            resolve(result);
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : '未知错误';
          this.logger.error('连接命令执行失败', { host, name, error: errorMsg });
          this.updateConnectionStatus(connectionId, 'error', errorMsg);
          resolve({ success: false, message: '连接失败', error: errorMsg });
        } finally {
          conn.end();
        }
      });

      conn.on('error', (err) => {
        clearTimeout(connectionTimeout);
        const errorMsg = `SSH 错误：${err.message}`;
        this.logger.error(errorMsg, { host, name, error: err });
        this.updateConnectionStatus(connectionId, 'error', errorMsg);
        resolve({ success: false, message: '连接失败', error: errorMsg });
      });

      // 使用提供的配置或默认配置
      const config = sshConfig || this.getDefaultSSHConfig(host);
      
      conn.connect({
        host: config.host,
        port: config.port || CONFIG.SSH_PORT,
        username: config.username,
        password: config.password,
        privateKey: config.privateKey ? fs.readFileSync(config.privateKey) : undefined,
        passphrase: config.passphrase,
        readyTimeout: config.readyTimeout || CONFIG.READY_TIMEOUT,
        keepaliveInterval: config.keepaliveInterval || 30000
      });
    });
  }

  /**
   * 执行连接命令
   * export OPENCLAW_NODE_NAME=<name> && openclaw node run &
   */
  private executeConnectionCommand(conn: Client, nodeName: string): Promise<ConnectionResult> {
    return new Promise((resolve) => {
      const command = `export OPENCLAW_NODE_NAME="${nodeName}" && openclaw node run &`;
      
      this.logger.info('执行连接命令', { command, nodeName });

      conn.exec(command, (err, stream) => {
        if (err) {
          const errorMsg = `命令执行失败：${err.message}`;
          this.logger.error(errorMsg, { error: err });
          resolve({ success: false, message: '命令执行失败', error: errorMsg });
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code: number | null, signal: string | undefined) => {
          this.logger.info('命令执行完成', { code, signal, stdout, stderr });
          
          if (code === 0 || code === null) {
            resolve({ success: true, message: '命令执行成功', nodeId: nodeName });
          } else {
            resolve({
              success: false,
              message: '命令执行失败',
              error: `退出码：${code}, ${stderr}`
            });
          }
        });

        stream.on('data', (data: Buffer) => {
          stdout += data.toString();
          this.logger.debug('stdout', { data: data.toString() });
        });

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
          this.logger.debug('stderr', { data: data.toString() });
        });
      });
    });
  }

  /**
   * 验证连接
   * 检查节点是否正确启动
   */
  private async verifyConnection(conn: Client, nodeName: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.logger.info('验证连接', { nodeName });

      // 等待片刻让节点启动
      setTimeout(() => {
        conn.exec('pgrep -f "openclaw node"', (err, stream) => {
          if (err) {
            this.logger.warn('验证命令执行失败', { error: err });
            resolve(false);
            return;
          }

          let output = '';

          stream.on('close', (code: number | null) => {
            const verified = code === 0 && output.trim().length > 0;
            this.logger.info('连接验证结果', { nodeName, verified, output });
            resolve(verified);
          });

          stream.on('data', (data: Buffer) => {
            output += data.toString();
          });
        });
      }, CONFIG.VERIFICATION_DELAY);
    });
  }

  /**
   * 获取默认 SSH 配置
   */
  private getDefaultSSHConfig(host: string): SSHConfig {
    // 从环境变量或配置文件读取默认配置
    return {
      host,
      port: CONFIG.SSH_PORT,
      username: process.env.SSH_USERNAME || 'root',
      privateKey: process.env.SSH_KEY_PATH,
      keepaliveInterval: 30000
    };
  }

  /**
   * 更新连接状态
   */
  private updateConnectionStatus(id: string, status: NodeConnection['status'], error?: string) {
    const existing = this.configManager.getConnection(id);
    
    if (existing) {
      this.configManager.updateConnection(id, {
        status,
        connectedAt: status === 'connected' ? Date.now() : undefined,
        lastError: error
      });
    } else {
      this.configManager.addConnection({
        id,
        name: id,
        host: id.split('-').slice(1).join('.') || id,
        status,
        connectedAt: status === 'connected' ? Date.now() : undefined,
        lastError: error
      });
    }
  }

  /**
   * 断开节点连接
   */
  async disconnectNode(nodeId: string): Promise<boolean> {
    this.logger.info('断开节点连接', { nodeId });
    
    const connection = this.configManager.getConnection(nodeId);
    if (!connection) {
      this.logger.warn('节点连接不存在', { nodeId });
      return false;
    }

    // 通过 SSH 执行停止命令
    return new Promise((resolve) => {
      const conn = new Client();
      
      conn.on('ready', () => {
        conn.exec('pkill -f "openclaw node"', (err) => {
          if (err) {
            this.logger.warn('停止命令执行失败', { nodeId, error: err });
          }
          
          this.updateConnectionStatus(nodeId, 'disconnected');
          conn.end();
          resolve(true);
        });
      });

      conn.on('error', (err) => {
        this.logger.error('断开连接失败', { nodeId, error: err });
        resolve(false);
      });

      // 使用存储的配置连接
      const host = connection.host;
      const config = this.getDefaultSSHConfig(host);
      
      conn.connect({
        host: config.host,
        port: config.port,
        username: config.username,
        privateKey: config.privateKey ? fs.readFileSync(config.privateKey) : undefined,
        passphrase: config.passphrase
      });
    });
  }

  /**
   * 获取所有连接
   */
  getConnections(): NodeConnection[] {
    return this.configManager.getAllConnections();
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(nodeId: string): NodeConnection | undefined {
    return this.configManager.getConnection(nodeId);
  }

  /**
   * 保存 SSH 配置
   */
  saveSSHConfig(name: string, config: SSHConfig): boolean {
    const connection: NodeConnection = {
      id: name,
      name,
      host: config.host,
      status: 'disconnected'
    };
    
    this.configManager.addConnection(connection);
    this.logger.info('SSH 配置已保存', { name, host: config.host });
    return true;
  }
}

// ============ 导出单例 ============

export const nodeConnector = new NodeConnector();

// ============ CLI 使用示例 ============

if (require.main === module) {
  const connector = new NodeConnector();
  
  const host = process.argv[2];
  const name = process.argv[3] || 'node';
  
  if (!host) {
    console.log('用法：ts-node node-connector.ts <host> [name]');
    console.log('示例：ts-node node-connector.ts 192.168.1.100 worker-1');
    process.exit(1);
  }
  
  console.log(`正在连接节点：${name} @ ${host}`);
  
  connector.connectNode(host, name)
    .then(result => {
      if (result.success) {
        console.log('✅ 连接成功');
        console.log(`节点 ID: ${result.nodeId}`);
      } else {
        console.log('❌ 连接失败');
        console.log(`错误：${result.error}`);
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('异常:', err);
      process.exit(1);
    });
}
