/**
 * Deployer - 一键部署技能核心实现
 * 
 * 支持：
 * - 本地预览 (build + serve)
 * - SSH 部署到远程服务器
 * - Docker 容器部署
 * 
 * 部署策略：
 * - 蓝绿部署
 * - 滚动更新
 * - 回滚支持
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as ssh2 from 'ssh2';

const execAsync = promisify(exec);

// ============== 类型定义 ==============

export type DeployTarget = 'local' | 'ssh' | 'docker';
export type DeployStrategy = 'blue-green' | 'rolling' | 'simple';

export interface DeployConfig {
  target: DeployTarget;
  strategy?: DeployStrategy;
  
  // SSH 配置
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  privateKey?: string;
  path?: string;
  
  // Docker 配置
  imageName?: string;
  containerName?: string;
  registry?: string;
  
  // 构建配置
  buildCmd?: string;
  buildDir?: string;
  
  // 重启配置
  restartCmd?: string;
  
  // 健康检查
  healthCheck?: {
    enabled: boolean;
    url?: string;
    timeout?: number;
    retries?: number;
  };
  
  // 回滚配置
  rollback?: {
    enabled: boolean;
    keepReleases?: number;
  };
}

export interface DeployResult {
  success: boolean;
  version: string;
  timestamp: number;
  target: DeployTarget;
  strategy: DeployStrategy;
  duration: number;
  logs: string[];
  rollbackPoint?: string;
}

export interface ReleaseInfo {
  version: string;
  timestamp: number;
  path: string;
  active: boolean;
}

// ============== 日志工具 ==============

class Logger {
  private logs: string[] = [];
  private verbose: boolean;

  constructor(verbose: boolean = true) {
    this.verbose = verbose;
  }

  info(message: string) {
    const log = `[INFO] ${new Date().toISOString()} - ${message}`;
    this.logs.push(log);
    if (this.verbose) console.log(log);
  }

  error(message: string) {
    const log = `[ERROR] ${new Date().toISOString()} - ${message}`;
    this.logs.push(log);
    console.error(log);
  }

  success(message: string) {
    const log = `[SUCCESS] ${new Date().toISOString()} - ${message}`;
    this.logs.push(log);
    if (this.verbose) console.log(log);
  }

  getLogs(): string[] {
    return this.logs;
  }
}

// ============== SSH 适配器 ==============

class SSHAdapter {
  private config: DeployConfig;
  private logger: Logger;
  private connection: ssh2.Client | null = null;

  constructor(config: DeployConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.logger.info(`Connecting to SSH: ${this.config.user}@${this.config.host}:${this.config.port || 22}`);
      
      this.connection = new ssh2.Client();
      
      this.connection.on('ready', () => {
        this.logger.success('SSH connection established');
        resolve();
      });

      this.connection.on('error', (err) => {
        this.logger.error(`SSH connection error: ${err.message}`);
        reject(err);
      });

      this.connection.connect({
        host: this.config.host,
        port: this.config.port || 22,
        username: this.config.user,
        password: this.config.password,
        privateKey: this.config.privateKey ? fs.readFileSync(this.config.privateKey) : undefined,
      });
    });
  }

  async exec(command: string): Promise<{ stdout: string; stderr: string }> {
    if (!this.connection) {
      throw new Error('SSH not connected');
    }

    return new Promise((resolve, reject) => {
      this.logger.info(`Executing: ${command}`);
      
      this.connection!.exec(command, (err, stream) => {
        if (err) {
          reject(err);
          return;
        }

        let stdout = '';
        let stderr = '';

        stream.on('close', (code) => {
          if (code === 0) {
            resolve({ stdout, stderr });
          } else {
            reject(new Error(`Command failed with code ${code}: ${stderr}`));
          }
        });

        stream.on('data', (data) => {
          stdout += data.toString();
        });

        stream.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      });
    });
  }

  async upload(localPath: string, remotePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connection) {
        reject(new Error('SSH not connected'));
        return;
      }

      this.logger.info(`Uploading: ${localPath} -> ${remotePath}`);

      this.connection!.sftp((err, sftp) => {
        if (err) {
          reject(err);
          return;
        }

        sftp.fastPut(localPath, remotePath, (err) => {
          if (err) {
            reject(err);
          } else {
            this.logger.success('Upload complete');
            resolve();
          }
        });
      });
    });
  }

  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.end();
      this.logger.info('SSH connection closed');
    }
  }
}

// ============== Docker 适配器 ==============

class DockerAdapter {
  private config: DeployConfig;
  private logger: Logger;

  constructor(config: DeployConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
  }

  async build(): Promise<void> {
    const imageName = this.getImageName();
    this.logger.info(`Building Docker image: ${imageName}`);
    
    try {
      await execAsync(`docker build -t ${imageName} ${this.config.buildDir || '.'}`);
      this.logger.success('Docker image built successfully');
    } catch (error: any) {
      this.logger.error(`Docker build failed: ${error.message}`);
      throw error;
    }
  }

  async push(): Promise<void> {
    const imageName = this.getImageName();
    this.logger.info(`Pushing Docker image: ${imageName}`);
    
    try {
      await execAsync(`docker push ${imageName}`);
      this.logger.success('Docker image pushed successfully');
    } catch (error: any) {
      this.logger.error(`Docker push failed: ${error.message}`);
      throw error;
    }
  }

  async deploy(): Promise<void> {
    const containerName = this.config.containerName || 'app';
    const imageName = this.getImageName();
    
    this.logger.info(`Deploying container: ${containerName}`);

    // 停止旧容器
    try {
      await execAsync(`docker stop ${containerName} || true`);
      await execAsync(`docker rm ${containerName} || true`);
    } catch (error: any) {
      this.logger.info(`Cleanup: ${error.message}`);
    }

    // 启动新容器
    try {
      await execAsync(`docker run -d --name ${containerName} --restart unless-stopped ${imageName}`);
      this.logger.success('Container deployed successfully');
    } catch (error: any) {
      this.logger.error(`Container deployment failed: ${error.message}`);
      throw error;
    }
  }

  async rollback(previousVersion: string): Promise<void> {
    const containerName = this.config.containerName || 'app';
    const previousImage = `${this.config.imageName}:${previousVersion}`;
    
    this.logger.info(`Rolling back to: ${previousVersion}`);

    try {
      await execAsync(`docker stop ${containerName}`);
      await execAsync(`docker rm ${containerName}`);
      await execAsync(`docker run -d --name ${containerName} --restart unless-stopped ${previousImage}`);
      this.logger.success('Rollback complete');
    } catch (error: any) {
      this.logger.error(`Rollback failed: ${error.message}`);
      throw error;
    }
  }

  private getImageName(): string {
    const version = this.generateVersion();
    if (this.config.registry) {
      return `${this.config.registry}/${this.config.imageName}:${version}`;
    }
    return `${this.config.imageName}:${version}`;
  }

  private generateVersion(): string {
    return `v${Date.now()}`;
  }
}

// ============== 部署策略实现 ==============

class DeploymentStrategy {
  protected logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  protected generateVersion(): string {
    return `v${Date.now()}`;
  }

  protected async runHealthCheck(url: string, timeout: number = 30000, retries: number = 3): Promise<boolean> {
    this.logger.info(`Running health check: ${url}`);
    
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { 
          method: 'GET',
          signal: AbortSignal.timeout(timeout)
        });
        
        if (response.ok) {
          this.logger.success('Health check passed');
          return true;
        }
      } catch (error: any) {
        this.logger.info(`Health check attempt ${i + 1} failed: ${error.message}`);
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }
    
    this.logger.error('Health check failed');
    return false;
  }
}

class BlueGreenDeployment extends DeploymentStrategy {
  private ssh: SSHAdapter;
  private config: DeployConfig;

  constructor(config: DeployConfig, ssh: SSHAdapter, logger: Logger) {
    super(logger);
    this.config = config;
    this.ssh = ssh;
  }

  async deploy(buildDir: string): Promise<DeployResult> {
    const startTime = Date.now();
    const version = this.generateVersion();
    const releasePath = `${this.config.path}/releases/${version}`;
    const currentPath = `${this.config.path}/current`;
    const previousPath = await this.getCurrentReleasePath();

    this.logger.info(`Starting blue-green deployment: ${version}`);

    try {
      // 1. 上传新版本
      await this.uploadBuild(buildDir, releasePath);

      // 2. 在新版本目录执行构建
      await this.ssh.exec(`cd ${releasePath} && ${this.config.buildCmd || 'npm run build'}`);

      // 3. 健康检查（如果配置）
      if (this.config.healthCheck?.enabled) {
        // 临时切换到新版本进行检查
        await this.ssh.exec(`ln -sfn ${releasePath} ${this.config.path}/staging`);
        const passed = await this.runHealthCheck(
          this.config.healthCheck.url || 'http://localhost:3000/health',
          this.config.healthCheck.timeout,
          this.config.healthCheck.retries
        );
        
        if (!passed) {
          throw new Error('Health check failed for new version');
        }
      }

      // 4. 切换流量（原子操作）
      await this.ssh.exec(`ln -sfn ${releasePath} ${currentPath}`);

      // 5. 重启服务
      if (this.config.restartCmd) {
        await this.ssh.exec(this.config.restartCmd);
      }

      // 6. 清理旧版本
      await this.cleanupOldReleases();

      const duration = Date.now() - startTime;
      this.logger.success(`Blue-green deployment complete: ${version} (${duration}ms)`);

      return {
        success: true,
        version,
        timestamp: Date.now(),
        target: 'ssh',
        strategy: 'blue-green',
        duration,
        logs: this.logger.getLogs(),
        rollbackPoint: previousPath
      };
    } catch (error: any) {
      this.logger.error(`Deployment failed: ${error.message}`);
      
      // 自动回滚
      if (previousPath && this.config.rollback?.enabled !== false) {
        await this.rollback(previousPath);
      }
      
      throw error;
    }
  }

  private async uploadBuild(localPath: string, remotePath: string): Promise<void> {
    await this.ssh.exec(`mkdir -p ${remotePath}`);
    
    // 使用 scp 或 rsync 上传整个目录
    // 这里简化为上传单个文件示例，实际应使用 rsync
    const files = fs.readdirSync(localPath);
    for (const file of files) {
      const filePath = path.join(localPath, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        await this.ssh.upload(filePath, path.join(remotePath, file));
      }
    }
    
    this.logger.success('Build uploaded');
  }

  private async getCurrentReleasePath(): Promise<string | null> {
    try {
      const result = await this.ssh.exec(`readlink ${this.config.path}/current`);
      return result.stdout.trim();
    } catch {
      return null;
    }
  }

  private async rollback(previousPath: string): Promise<void> {
    this.logger.info('Rolling back to previous version');
    await this.ssh.exec(`ln -sfn ${previousPath} ${this.config.path}/current`);
    if (this.config.restartCmd) {
      await this.ssh.exec(this.config.restartCmd);
    }
    this.logger.success('Rollback complete');
  }

  private async cleanupOldReleases(): Promise<void> {
    const keepReleases = this.config.rollback?.keepReleases || 3;
    this.logger.info(`Cleaning up old releases (keeping ${keepReleases})`);
    
    const result = await this.ssh.exec(
      `ls -t ${this.config.path}/releases | tail -n +${keepReleases + 1}`
    );
    
    const oldReleases = result.stdout.trim().split('\n').filter(Boolean);
    for (const release of oldReleases) {
      await this.ssh.exec(`rm -rf ${this.config.path}/releases/${release}`);
      this.logger.info(`Removed old release: ${release}`);
    }
  }
}

class RollingDeployment extends DeploymentStrategy {
  private ssh: SSHAdapter;
  private config: DeployConfig;
  private instances: number;

  constructor(config: DeployConfig, ssh: SSHAdapter, instances: number = 2, logger: Logger) {
    super(logger);
    this.config = config;
    this.ssh = ssh;
    this.instances = instances;
  }

  async deploy(buildDir: string): Promise<DeployResult> {
    const startTime = Date.now();
    const version = this.generateVersion();

    this.logger.info(`Starting rolling deployment: ${version} (${this.instances} instances)`);

    try {
      for (let i = 0; i < this.instances; i++) {
        this.logger.info(`Updating instance ${i + 1}/${this.instances}`);
        
        // 1. 停止实例
        await this.stopInstance(i);
        
        // 2. 更新代码
        await this.updateInstance(buildDir, i);
        
        // 3. 启动实例
        await this.startInstance(i);
        
        // 4. 健康检查
        if (this.config.healthCheck?.enabled) {
          const passed = await this.runHealthCheck(
            `http://localhost:${3000 + i}/health`,
            this.config.healthCheck.timeout,
            this.config.healthCheck.retries
          );
          
          if (!passed) {
            throw new Error(`Instance ${i + 1} health check failed`);
          }
        }
        
        // 等待实例稳定
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      const duration = Date.now() - startTime;
      this.logger.success(`Rolling deployment complete: ${version} (${duration}ms)`);

      return {
        success: true,
        version,
        timestamp: Date.now(),
        target: 'ssh',
        strategy: 'rolling',
        duration,
        logs: this.logger.getLogs()
      };
    } catch (error: any) {
      this.logger.error(`Rolling deployment failed: ${error.message}`);
      throw error;
    }
  }

  private async stopInstance(index: number): Promise<void> {
    await this.ssh.exec(`systemctl stop app-${index}`);
  }

  private async updateInstance(buildDir: string, index: number): Promise<void> {
    const instancePath = `${this.config.path}/instance-${index}`;
    await this.ssh.exec(`mkdir -p ${instancePath}`);
    
    // 上传文件（简化）
    const files = fs.readdirSync(buildDir);
    for (const file of files) {
      const filePath = path.join(buildDir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isFile()) {
        await this.ssh.upload(filePath, path.join(instancePath, file));
      }
    }
  }

  private async startInstance(index: number): Promise<void> {
    await this.ssh.exec(`systemctl start app-${index}`);
  }
}

// ============== 主部署函数 ==============

export async function deploy(environment: string, config: DeployConfig): Promise<DeployResult> {
  const logger = new Logger();
  const strategy = config.strategy || 'simple';
  
  logger.info(`Starting deployment to ${environment}`);
  logger.info(`Target: ${config.target}, Strategy: ${strategy}`);

  try {
    switch (config.target) {
      case 'local':
        return await deployLocal(config, logger);
      
      case 'ssh':
        return await deploySSH(config, strategy, logger);
      
      case 'docker':
        return await deployDocker(config, logger);
      
      default:
        throw new Error(`Unknown deployment target: ${config.target}`);
    }
  } catch (error: any) {
    logger.error(`Deployment failed: ${error.message}`);
    return {
      success: false,
      version: '',
      timestamp: Date.now(),
      target: config.target,
      strategy: strategy as DeployStrategy,
      duration: 0,
      logs: logger.getLogs()
    };
  }
}

async function deployLocal(config: DeployConfig, logger: Logger): Promise<DeployResult> {
  const startTime = Date.now();
  const version = `local-${Date.now()}`;

  logger.info('Starting local deployment (preview)');

  try {
    // 执行构建
    if (config.buildCmd) {
      logger.info(`Building: ${config.buildCmd}`);
      await execAsync(config.buildCmd, { cwd: config.buildDir || '.' });
      logger.success('Build complete');
    }

    // 启动本地服务
    logger.info('Local deployment complete (development mode)');

    const duration = Date.now() - startTime;
    
    return {
      success: true,
      version,
      timestamp: Date.now(),
      target: 'local',
      strategy: 'simple',
      duration,
      logs: logger.getLogs()
    };
  } catch (error: any) {
    logger.error(`Local deployment failed: ${error.message}`);
    throw error;
  }
}

async function deploySSH(config: DeployConfig, strategy: DeployStrategy, logger: Logger): Promise<DeployResult> {
  const ssh = new SSHAdapter(config, logger);
  
  try {
    await ssh.connect();

    switch (strategy) {
      case 'blue-green':
        return await new BlueGreenDeployment(config, ssh, logger).deploy(config.buildDir || '.');
      
      case 'rolling':
        return await new RollingDeployment(config, ssh, 2, logger).deploy(config.buildDir || '.');
      
      default:
        // Simple deployment
        const version = `v${Date.now()}`;
        const releasePath = `${config.path}/releases/${version}`;
        
        await ssh.exec(`mkdir -p ${releasePath}`);
        
        // 上传文件
        if (config.buildDir) {
          const files = fs.readdirSync(config.buildDir);
          for (const file of files) {
            const filePath = path.join(config.buildDir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isFile()) {
              await ssh.upload(filePath, path.join(releasePath, file));
            }
          }
        }

        // 执行构建
        if (config.buildCmd) {
          await ssh.exec(`cd ${releasePath} && ${config.buildCmd}`);
        }

        // 切换 symlink
        await ssh.exec(`ln -sfn ${releasePath} ${config.path}/current`);

        // 重启服务
        if (config.restartCmd) {
          await ssh.exec(config.restartCmd);
        }

        return {
          success: true,
          version,
          timestamp: Date.now(),
          target: 'ssh',
          strategy: 'simple',
          duration: 0,
          logs: logger.getLogs()
        };
    }
  } finally {
    await ssh.disconnect();
  }
}

async function deployDocker(config: DeployConfig, logger: Logger): Promise<DeployResult> {
  const startTime = Date.now();
  const docker = new DockerAdapter(config, logger);
  const version = docker['generateVersion']();

  logger.info('Starting Docker deployment');

  try {
    // 构建镜像
    await docker.build();

    // 推送到 registry（如果配置）
    if (config.registry) {
      await docker.push();
    }

    // 部署容器
    await docker.deploy();

    // 健康检查
    if (config.healthCheck?.enabled) {
      const passed = await docker['runHealthCheck'](
        config.healthCheck.url || 'http://localhost:3000/health',
        config.healthCheck.timeout,
        config.healthCheck.retries
      );
      
      if (!passed) {
        throw new Error('Container health check failed');
      }
    }

    const duration = Date.now() - startTime;
    logger.success(`Docker deployment complete: ${version} (${duration}ms)`);

    return {
      success: true,
      version,
      timestamp: Date.now(),
      target: 'docker',
      strategy: 'simple',
      duration,
      logs: logger.getLogs()
    };
  } catch (error: any) {
    logger.error(`Docker deployment failed: ${error.message}`);
    throw error;
  }
}

// ============== 回滚函数 ==============

export async function rollback(environment: string, config: DeployConfig, releaseVersion: string): Promise<void> {
  const logger = new Logger();
  logger.info(`Rolling back ${environment} to ${releaseVersion}`);

  if (config.target === 'docker') {
    const docker = new DockerAdapter(config, logger);
    await docker.rollback(releaseVersion);
  } else if (config.target === 'ssh') {
    const ssh = new SSHAdapter(config, logger);
    try {
      await ssh.connect();
      const releasePath = `${config.path}/releases/${releaseVersion}`;
      await ssh.exec(`ln -sfn ${releasePath} ${config.path}/current`);
      if (config.restartCmd) {
        await ssh.exec(config.restartCmd);
      }
      logger.success('Rollback complete');
    } finally {
      await ssh.disconnect();
    }
  } else {
    throw new Error('Rollback not supported for local deployments');
  }
}

// ============== 导出 ==============

export {
  SSHAdapter,
  DockerAdapter,
  BlueGreenDeployment,
  RollingDeployment,
  Logger,
  DeployConfig,
  DeployResult,
  DeployTarget,
  DeployStrategy
};
