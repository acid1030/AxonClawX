/**
 * KAEL 配置中心技能
 * 
 * 功能:
 * 1. 配置存储 - 支持多层级配置 (全局/项目/用户)
 * 2. 配置刷新 - 热重载配置无需重启
 * 3. 版本管理 - 配置版本控制与回滚
 * 
 * @author KAEL Engineering
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ==================== 类型定义 ====================

export interface ConfigValue {
  value: any;
  version: number;
  updatedAt: string;
  updatedBy?: string;
}

export interface ConfigSnapshot {
  version: number;
  timestamp: string;
  config: Record<string, ConfigValue>;
  description?: string;
}

export interface ConfigStore {
  current: Record<string, ConfigValue>;
  history: ConfigSnapshot[];
  maxHistory: number;
}

// ==================== 配置存储类 ====================

export class ConfigServer {
  private storePath: string;
  private store: ConfigStore;
  private listeners: Set<(key: string, newValue: any, oldValue: any) => void>;
  private versionCounter: number;

  constructor(storePath: string = './config-store.json') {
    this.storePath = path.resolve(storePath);
    this.listeners = new Set();
    this.versionCounter = 0;
    this.store = {
      current: {},
      history: [],
      maxHistory: 50, // 保留最近 50 个版本
    };
    this.load();
  }

  // ==================== 1. 配置存储 ====================

  /**
   * 设置配置项
   */
  set(key: string, value: any, updatedBy?: string): void {
    const oldValue = this.get(key);
    this.versionCounter++;
    
    this.store.current[key] = {
      value,
      version: this.versionCounter,
      updatedAt: new Date().toISOString(),
      updatedBy,
    };

    this.save();
    this.notifyListeners(key, value, oldValue);
  }

  /**
   * 批量设置配置项
   */
  setMany(configs: Record<string, any>, updatedBy?: string): void {
    Object.entries(configs).forEach(([key, value]) => {
      this.set(key, value, updatedBy);
    });
  }

  /**
   * 获取配置项
   */
  get<T = any>(key: string, defaultValue?: T): T | undefined {
    const item = this.store.current[key];
    if (!item) return defaultValue;
    return item.value as T;
  }

  /**
   * 获取所有配置
   */
  getAll(): Record<string, any> {
    const result: Record<string, any> = {};
    Object.entries(this.store.current).forEach(([key, item]) => {
      result[key] = item.value;
    });
    return result;
  }

  /**
   * 删除配置项
   */
  delete(key: string): boolean {
    if (!this.store.current[key]) return false;
    delete this.store.current[key];
    this.save();
    return true;
  }

  /**
   * 检查配置项是否存在
   */
  has(key: string): boolean {
    return key in this.store.current;
  }

  // ==================== 2. 配置刷新 ====================

  /**
   * 注册配置变更监听器
   */
  onChange(callback: (key: string, newValue: any, oldValue: any) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * 热重载配置 (从文件重新加载)
   */
  reload(): void {
    const oldConfig = { ...this.store.current };
    this.load();
    
    // 通知所有变更的键
    Object.keys(this.store.current).forEach(key => {
      const newValue = this.store.current[key].value;
      const oldValue = oldConfig[key]?.value;
      if (newValue !== oldValue) {
        this.notifyListeners(key, newValue, oldValue);
      }
    });
  }

  /**
   * 强制刷新特定配置项
   */
  refresh(key: string): void {
    const item = this.store.current[key];
    if (item) {
      this.notifyListeners(key, item.value, item.value);
    }
  }

  // ==================== 3. 版本管理 ====================

  /**
   * 创建配置快照
   */
  createSnapshot(description?: string): ConfigSnapshot {
    const snapshot: ConfigSnapshot = {
      version: this.versionCounter,
      timestamp: new Date().toISOString(),
      config: { ...this.store.current },
      description,
    };

    this.store.history.push(snapshot);
    
    // 清理旧版本
    if (this.store.history.length > this.store.maxHistory) {
      this.store.history = this.store.history.slice(-this.store.maxHistory);
    }

    this.save();
    return snapshot;
  }

  /**
   * 获取历史版本列表
   */
  getHistory(limit: number = 10): ConfigSnapshot[] {
    return this.store.history.slice(-limit).reverse();
  }

  /**
   * 回滚到指定版本
   */
  rollback(version: number): boolean {
    const snapshot = this.store.history.find(s => s.version === version);
    if (!snapshot) {
      throw new Error(`版本 ${version} 不存在`);
    }

    // 保存当前状态作为回滚点
    this.createSnapshot(`Auto-backup before rollback to v${version}`);

    // 恢复配置
    this.store.current = { ...snapshot.config };
    this.versionCounter = version;
    this.save();

    // 通知所有配置变更
    Object.keys(snapshot.config).forEach(key => {
      this.notifyListeners(key, snapshot.config[key].value, undefined);
    });

    return true;
  }

  /**
   * 比较两个版本的差异
   */
  diffVersions(version1: number, version2: number): Record<string, { old: any; new: any }> {
    const snap1 = this.store.history.find(s => s.version === version1);
    const snap2 = this.store.history.find(s => s.version === version2);

    if (!snap1 || !snap2) {
      throw new Error('版本不存在');
    }

    const diff: Record<string, { old: any; new: any }> = {};
    const allKeys = new Set([...Object.keys(snap1.config), ...Object.keys(snap2.config)]);

    allKeys.forEach(key => {
      const oldVal = snap1.config[key]?.value;
      const newVal = snap2.config[key]?.value;
      if (oldVal !== newVal) {
        diff[key] = { old: oldVal, new: newVal };
      }
    });

    return diff;
  }

  /**
   * 导出配置到文件
   */
  exportToFile(filePath: string): void {
    const content = JSON.stringify(this.store.current, null, 2);
    fs.writeFileSync(path.resolve(filePath), content, 'utf-8');
  }

  /**
   * 从文件导入配置
   */
  importFromFile(filePath: string, updatedBy?: string): void {
    const content = fs.readFileSync(path.resolve(filePath), 'utf-8');
    const configs = JSON.parse(content);
    this.setMany(configs, updatedBy);
  }

  // ==================== 私有方法 ====================

  private load(): void {
    try {
      if (fs.existsSync(this.storePath)) {
        const content = fs.readFileSync(this.storePath, 'utf-8');
        this.store = JSON.parse(content);
        this.versionCounter = Math.max(
          ...Object.values(this.store.current).map((v: any) => v.version || 0),
          ...this.store.history.map(h => h.version || 0),
          0
        );
      }
    } catch (error) {
      console.warn('[ConfigServer] 加载配置失败:', error);
      this.store = { current: {}, history: [], maxHistory: 50 };
    }
  }

  private save(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (error) {
      console.error('[ConfigServer] 保存配置失败:', error);
      throw error;
    }
  }

  private notifyListeners(key: string, newValue: any, oldValue: any): void {
    this.listeners.forEach(listener => {
      try {
        listener(key, newValue, oldValue);
      } catch (error) {
        console.error('[ConfigServer] 监听器执行失败:', error);
      }
    });
  }
}

// ==================== 使用示例 ====================

/**
 * 示例 1: 基础配置操作
 */
export function example1_basicUsage() {
  const config = new ConfigServer('./example-config.json');

  // 设置配置
  config.set('database.host', 'localhost', 'admin');
  config.set('database.port', 5432, 'admin');
  config.set('app.debug', true, 'developer');

  // 获取配置
  const dbHost = config.get<string>('database.host');
  const debugMode = config.get<boolean>('app.debug', false);

  // 批量设置
  config.setMany({
    'app.name': 'MyApp',
    'app.version': '1.0.0',
    'app.env': 'development',
  }, 'admin');

  console.log('当前配置:', config.getAll());
}

/**
 * 示例 2: 配置变更监听
 */
export function example2_configListener() {
  const config = new ConfigServer('./example-config.json');

  // 注册监听器
  const unsubscribe = config.onChange((key, newValue, oldValue) => {
    console.log(`配置变更: ${key}`);
    console.log(`  旧值:`, oldValue);
    console.log(`  新值:`, newValue);
  });

  // 触发变更
  config.set('app.debug', false, 'admin');

  // 取消监听
  unsubscribe();
}

/**
 * 示例 3: 版本管理
 */
export function example3_versionManagement() {
  const config = new ConfigServer('./example-config.json');

  // 创建初始快照
  config.createSnapshot('Initial configuration');

  // 修改配置
  config.set('app.version', '1.0.1', 'developer');
  config.set('app.feature.newUI', true, 'developer');

  // 创建新版本快照
  config.createSnapshot('Added new UI feature');

  // 查看历史版本
  const history = config.getHistory(5);
  console.log('历史版本:', history.map(h => ({
    version: h.version,
    timestamp: h.timestamp,
    description: h.description,
  })));

  // 回滚到版本 1
  config.rollback(1);
  console.log('回滚后配置:', config.getAll());
}

/**
 * 示例 4: 配置导入导出
 */
export function example4_importExport() {
  const config = new ConfigServer('./example-config.json');

  // 导出配置
  config.exportToFile('./backup/config-export.json');

  // 导入配置
  config.importFromFile('./backup/config-import.json', 'migration-script');
}

/**
 * 示例 5: 配置热重载
 */
export function example5_hotReload() {
  const config = new ConfigServer('./example-config.json');

  // 注册监听器
  config.onChange((key, newValue) => {
    console.log(`[热重载] ${key} = ${newValue}`);
    // 在这里执行应用级别的热重载逻辑
    // 例如：重新初始化数据库连接、更新日志级别等
  });

  // 外部修改配置文件后，调用 reload
  config.reload();
}

// ==================== 导出 ====================

export default ConfigServer;
