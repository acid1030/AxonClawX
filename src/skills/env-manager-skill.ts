/**
 * KAEL 环境变量管理技能
 * 
 * 功能:
 * 1. 环境检测 - 自动识别当前运行环境
 * 2. 配置切换 - 支持多环境配置快速切换
 * 3. 密钥管理 - 安全的密钥存储与访问
 * 
 * @author KAEL
 * @version 1.0.0
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// ============================================================================
// 类型定义
// ============================================================================

export type Environment = 'development' | 'staging' | 'production' | 'test';

export interface EnvConfig {
  name: string;
  apiEndpoint: string;
  databaseUrl: string;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  features: {
    enableDebug: boolean;
    enableMetrics: boolean;
    enableCache: boolean;
  };
}

export interface SecretKey {
  name: string;
  value: string;
  encrypted: boolean;
  createdAt: number;
  expiresAt?: number;
}

export interface EnvManagerState {
  currentEnv: Environment;
  configs: Record<Environment, EnvConfig>;
  secrets: Map<string, SecretKey>;
  envFilePath: string;
}

// ============================================================================
// 环境配置 (默认配置)
// ============================================================================

const DEFAULT_CONFIGS: Record<Environment, EnvConfig> = {
  development: {
    name: 'Development',
    apiEndpoint: 'http://localhost:3000/api',
    databaseUrl: 'postgresql://localhost:5432/dev_db',
    logLevel: 'debug',
    features: {
      enableDebug: true,
      enableMetrics: true,
      enableCache: false,
    },
  },
  staging: {
    name: 'Staging',
    apiEndpoint: 'https://staging-api.example.com/api',
    databaseUrl: 'postgresql://staging-db.example.com:5432/staging_db',
    logLevel: 'info',
    features: {
      enableDebug: false,
      enableMetrics: true,
      enableCache: true,
    },
  },
  production: {
    name: 'Production',
    apiEndpoint: 'https://api.example.com/api',
    databaseUrl: 'postgresql://prod-db.example.com:5432/prod_db',
    logLevel: 'warn',
    features: {
      enableDebug: false,
      enableMetrics: true,
      enableCache: true,
    },
  },
  test: {
    name: 'Test',
    apiEndpoint: 'http://localhost:3001/api',
    databaseUrl: 'postgresql://localhost:5432/test_db',
    logLevel: 'error',
    features: {
      enableDebug: true,
      enableMetrics: false,
      enableCache: false,
    },
  },
};

// ============================================================================
// 环境变量管理器类
// ============================================================================

export class EnvManager {
  private state: EnvManagerState;
  private encryptionKey: string;

  constructor(workspaceRoot: string = process.cwd()) {
    this.envFilePath = join(workspaceRoot, '.env.config.json');
    this.encryptionKey = this.generateEncryptionKey();
    
    this.state = {
      currentEnv: this.detectEnvironment(),
      configs: DEFAULT_CONFIGS,
      secrets: new Map(),
      envFilePath: this.envFilePath,
    };

    this.loadConfig();
  }

  // ============================================================================
  // 1. 环境检测
  // ============================================================================

  /**
   * 自动检测当前运行环境
   * 优先级: NODE_ENV > 命令行参数 > 配置文件 > 默认值
   */
  detectEnvironment(): Environment {
    // 1. 检查 NODE_ENV
    const nodeEnv = process.env.NODE_ENV?.toLowerCase();
    if (nodeEnv && ['development', 'staging', 'production', 'test'].includes(nodeEnv)) {
      return nodeEnv as Environment;
    }

    // 2. 检查命令行参数
    const args = process.argv;
    const envArg = args.find(arg => arg.startsWith('--env='));
    if (envArg) {
      const env = envArg.split('=')[1].toLowerCase();
      if (['development', 'staging', 'production', 'test'].includes(env)) {
        return env as Environment;
      }
    }

    // 3. 检查配置文件
    if (existsSync(this.envFilePath)) {
      try {
        const config = JSON.parse(readFileSync(this.envFilePath, 'utf-8'));
        if (config.currentEnv) {
          return config.currentEnv as Environment;
        }
      } catch (e) {
        console.warn('⚠️  配置文件读取失败，使用默认环境');
      }
    }

    // 4. 默认返回 development
    return 'development';
  }

  /**
   * 获取当前环境信息
   */
  getCurrentEnvInfo(): {
    environment: Environment;
    config: EnvConfig;
    isActive: boolean;
  } {
    const config = this.state.configs[this.state.currentEnv];
    return {
      environment: this.state.currentEnv,
      config,
      isActive: true,
    };
  }

  /**
   * 列出所有可用环境
   */
  listEnvironments(): Array<{
    name: Environment;
    config: EnvConfig;
    isCurrent: boolean;
  }> {
    return (Object.keys(this.state.configs) as Environment[]).map(env => ({
      name: env,
      config: this.state.configs[env],
      isCurrent: env === this.state.currentEnv,
    }));
  }

  // ============================================================================
  // 2. 配置切换
  // ============================================================================

  /**
   * 切换到指定环境
   */
  switchEnvironment(env: Environment): boolean {
    if (!this.state.configs[env]) {
      console.error(`❌ 未知环境: ${env}`);
      return false;
    }

    const previousEnv = this.state.currentEnv;
    this.state.currentEnv = env;
    
    console.log(`✅ 环境已切换：${previousEnv} → ${env}`);
    console.log(`   API: ${this.state.configs[env].apiEndpoint}`);
    console.log(`   日志级别：${this.state.configs[env].logLevel}`);
    
    this.saveConfig();
    return true;
  }

  /**
   * 更新环境配置
   */
  updateConfig(env: Environment, updates: Partial<EnvConfig>): boolean {
    if (!this.state.configs[env]) {
      console.error(`❌ 未知环境：${env}`);
      return false;
    }

    this.state.configs[env] = {
      ...this.state.configs[env],
      ...updates,
    };

    console.log(`✅ 配置已更新：${env}`);
    this.saveConfig();
    return true;
  }

  /**
   * 添加自定义环境
   */
  addCustomEnv(name: string, config: EnvConfig): boolean {
    const envKey = name.toLowerCase() as Environment;
    
    if (this.state.configs[envKey]) {
      console.error(`❌ 环境已存在：${name}`);
      return false;
    }

    this.state.configs[envKey] = config;
    console.log(`✅ 自定义环境已添加：${name}`);
    this.saveConfig();
    return true;
  }

  // ============================================================================
  // 3. 密钥管理
  // ============================================================================

  /**
   * 存储密钥 (自动加密)
   */
  setSecret(name: string, value: string, expiresHours?: number): boolean {
    const now = Date.now();
    const secret: SecretKey = {
      name,
      value: this.encrypt(value),
      encrypted: true,
      createdAt: now,
      expiresAt: expiresHours ? now + expiresHours * 60 * 60 * 1000 : undefined,
    };

    this.state.secrets.set(name, secret);
    console.log(`✅ 密钥已存储：${name}`);
    this.saveConfig();
    return true;
  }

  /**
   * 获取密钥 (自动解密)
   */
  getSecret(name: string): string | null {
    const secret = this.state.secrets.get(name);
    
    if (!secret) {
      console.warn(`⚠️  密钥不存在：${name}`);
      return null;
    }

    // 检查是否过期
    if (secret.expiresAt && Date.now() > secret.expiresAt) {
      console.warn(`⚠️  密钥已过期：${name}`);
      this.state.secrets.delete(name);
      return null;
    }

    return secret.encrypted ? this.decrypt(secret.value) : secret.value;
  }

  /**
   * 删除密钥
   */
  deleteSecret(name: string): boolean {
    if (!this.state.secrets.has(name)) {
      console.warn(`⚠️  密钥不存在：${name}`);
      return false;
    }

    this.state.secrets.delete(name);
    console.log(`✅ 密钥已删除：${name}`);
    this.saveConfig();
    return true;
  }

  /**
   * 列出所有密钥 (不显示值)
   */
  listSecrets(): Array<{
    name: string;
    encrypted: boolean;
    createdAt: string;
    expiresAt?: string;
  }> {
    return Array.from(this.state.secrets.values()).map(secret => ({
      name: secret.name,
      encrypted: secret.encrypted,
      createdAt: new Date(secret.createdAt).toISOString(),
      expiresAt: secret.expiresAt ? new Date(secret.expiresAt).toISOString() : undefined,
    }));
  }

  /**
   * 检查密钥是否存在
   */
  hasSecret(name: string): boolean {
    return this.state.secrets.has(name);
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 生成加密密钥 (基于机器特征)
   */
  private generateEncryptionKey(): string {
    const hostname = process.env.HOSTNAME || 'localhost';
    const username = process.env.USER || process.env.USERNAME || 'user';
    const seed = `${hostname}-${username}-${process.pid}`;
    return createHash('sha256').update(seed).digest('hex');
  }

  /**
   * 加密值
   */
  private encrypt(value: string): string {
    // 简单 Base64 编码 (生产环境应使用更强的加密)
    return Buffer.from(`${this.encryptionKey}:${value}`).toString('base64');
  }

  /**
   * 解密值
   */
  private decrypt(encryptedValue: string): string {
    try {
      const decoded = Buffer.from(encryptedValue, 'base64').toString('utf-8');
      const parts = decoded.split(':');
      return parts.slice(1).join(':');
    } catch (e) {
      console.error('❌ 解密失败');
      return '';
    }
  }

  /**
   * 保存配置到文件
   */
  private saveConfig(): void {
    try {
      const configDir = join(this.envFilePath, '..');
      if (!existsSync(configDir)) {
        mkdirSync(configDir, { recursive: true });
      }

      const serializableState = {
        currentEnv: this.state.currentEnv,
        configs: this.state.configs,
        secrets: Array.from(this.state.secrets.entries()),
        envFilePath: this.state.envFilePath,
      };

      writeFileSync(this.envFilePath, JSON.stringify(serializableState, null, 2), 'utf-8');
    } catch (e) {
      console.error('❌ 配置保存失败:', e);
    }
  }

  /**
   * 从文件加载配置
   */
  private loadConfig(): void {
    if (!existsSync(this.envFilePath)) {
      return;
    }

    try {
      const saved = JSON.parse(readFileSync(this.envFilePath, 'utf-8'));
      
      if (saved.currentEnv) {
        this.state.currentEnv = saved.currentEnv;
      }
      
      if (saved.configs) {
        this.state.configs = { ...this.state.configs, ...saved.configs };
      }
      
      if (saved.secrets && Array.isArray(saved.secrets)) {
        this.state.secrets = new Map(saved.secrets);
      }

      console.log(`✅ 配置已加载：${this.envFilePath}`);
    } catch (e) {
      console.warn('⚠️  配置加载失败，使用默认配置');
    }
  }
}

// ============================================================================
// 使用示例
// ============================================================================

/**
 * 示例 1: 环境检测
 */
export function example1_EnvironmentDetection() {
  const manager = new EnvManager();
  
  console.log('\n=== 环境检测示例 ===\n');
  
  const currentInfo = manager.getCurrentEnvInfo();
  console.log('当前环境:', currentInfo.environment);
  console.log('API 端点:', currentInfo.config.apiEndpoint);
  console.log('日志级别:', currentInfo.config.logLevel);
  
  console.log('\n所有可用环境:');
  manager.listEnvironments().forEach(env => {
    console.log(`  ${env.isCurrent ? '●' : '○'} ${env.name}: ${env.config.apiEndpoint}`);
  });
}

/**
 * 示例 2: 配置切换
 */
export function example2_ConfigSwitch() {
  const manager = new EnvManager();
  
  console.log('\n=== 配置切换示例 ===\n');
  
  // 切换到生产环境
  manager.switchEnvironment('production');
  
  // 更新配置
  manager.updateConfig('production', {
    apiEndpoint: 'https://new-api.example.com/api',
    logLevel: 'error',
  });
  
  // 添加自定义环境
  manager.addCustomEnv('custom', {
    name: 'Custom Environment',
    apiEndpoint: 'https://custom-api.example.com/api',
    databaseUrl: 'postgresql://custom-db:5432/custom_db',
    logLevel: 'debug',
    features: {
      enableDebug: true,
      enableMetrics: true,
      enableCache: true,
    },
  });
}

/**
 * 示例 3: 密钥管理
 */
export function example3_SecretManagement() {
  const manager = new EnvManager();
  
  console.log('\n=== 密钥管理示例 ===\n');
  
  // 存储密钥
  manager.setSecret('API_KEY', 'sk-1234567890abcdef');
  manager.setSecret('DB_PASSWORD', 'super_secret_password', 24); // 24 小时后过期
  
  // 获取密钥
  const apiKey = manager.getSecret('API_KEY');
  console.log('API Key:', apiKey);
  
  // 列出密钥
  console.log('\n所有密钥:');
  manager.listSecrets().forEach(secret => {
    console.log(`  - ${secret.name} (加密：${secret.encrypted}, 创建：${secret.createdAt})`);
    if (secret.expiresAt) {
      console.log(`    过期时间：${secret.expiresAt}`);
    }
  });
  
  // 删除密钥
  manager.deleteSecret('DB_PASSWORD');
}

/**
 * 完整示例 - 所有功能演示
 */
export function runFullExample() {
  console.log('\n' + '='.repeat(60));
  console.log('KAEL 环境变量管理技能 - 完整示例');
  console.log('='.repeat(60) + '\n');
  
  example1_EnvironmentDetection();
  example2_ConfigSwitch();
  example3_SecretManagement();
  
  console.log('\n' + '='.repeat(60));
  console.log('示例执行完成 ✅');
  console.log('='.repeat(60) + '\n');
}

// ============================================================================
// 导出默认实例
// ============================================================================

export const envManager = new EnvManager();

export default EnvManager;
