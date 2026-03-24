/**
 * 配置管理工具技能 - ACE (Application Configuration Engine)
 * 
 * 功能:
 * 1. 配置加载 - 支持 YAML/JSON 格式，环境变量覆盖
 * 2. 配置验证 - 基于 Schema 的类型验证和自定义规则
 * 3. 配置热更新 - 监听文件变化，自动重载并通知监听器
 * 
 * @module skills/config-utils
 * @author Axon
 * @version 1.0.0
 */

import * as fs from 'fs';
import * as path from 'path';

// ============ 类型定义 ============

/** 配置值类型 */
export type ConfigValue = string | number | boolean | string[] | ConfigObject;

/** 配置对象 */
export interface ConfigObject {
  [key: string]: ConfigValue;
}

/** 验证规则类型 */
export type ValidationType = 'string' | 'number' | 'boolean' | 'array' | 'object';

/** 验证规则 */
export interface ValidationRule {
  /** 字段类型 */
  type: ValidationType;
  /** 是否必填 */
  required?: boolean;
  /** 最小值 (number/string length) */
  min?: number;
  /** 最大值 (number/string length) */
  max?: number;
  /** 正则匹配 (string) */
  pattern?: RegExp;
  /** 枚举值 */
  enum?: any[];
  /** 自定义验证函数 */
  validate?: (value: any) => boolean;
  /** 默认值 */
  default?: any;
}

/** 验证器 Schema */
export interface ConfigValidator {
  [key: string]: ValidationRule;
}

/** 配置选项 */
export interface ConfigUtilsOptions {
  /** 配置文件路径 */
  configPath?: string;
  /** 是否启用热重载 */
  enableHotReload?: boolean;
  /** 验证器 */
  validator?: ConfigValidator;
  /** 环境变量前缀 */
  envPrefix?: string;
  /** 是否合并默认值 */
  mergeDefaults?: boolean;
}

/** 配置变更事件 */
export interface ConfigChangeEvent {
  /** 变更的键路径 */
  key: string;
  /** 旧值 */
  oldValue: any;
  /** 新值 */
  newValue: any;
  /** 时间戳 */
  timestamp: number;
}

/** 配置变更监听器 */
export type ConfigChangeListener = (event: ConfigChangeEvent) => void;

/** 验证错误 */
export interface ValidationError {
  /** 字段路径 */
  path: string;
  /** 错误信息 */
  message: string;
  /** 实际值 */
  actual?: any;
  /** 期望类型 */
  expected?: string;
}

// ============ 核心工具函数 ============

/**
 * 加载配置文件 (YAML/JSON)
 * @param configPath - 配置文件路径
 * @returns 配置对象
 */
export function loadConfig(configPath: string): ConfigObject {
  const ext = path.extname(configPath).toLowerCase();
  
  if (!fs.existsSync(configPath)) {
    console.warn(`[ConfigUtils] 配置文件不存在：${configPath}`);
    return {};
  }

  const content = fs.readFileSync(configPath, 'utf-8');

  if (ext === '.yaml' || ext === '.yml') {
    // 简单 YAML 解析 (避免外部依赖)
    return parseYaml(content);
  } else if (ext === '.json') {
    return JSON.parse(content);
  } else {
    throw new Error(`[ConfigUtils] 不支持的配置文件格式：${ext}`);
  }
}

/**
 * 简单 YAML 解析器 (支持基础键值对)
 * @param content - YAML 内容
 * @returns 解析后的对象
 */
function parseYaml(content: string): ConfigObject {
  const result: ConfigObject = {};
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    
    const colonIndex = trimmed.indexOf(':');
    if (colonIndex === -1) continue;
    
    const key = trimmed.slice(0, colonIndex).trim();
    const value = trimmed.slice(colonIndex + 1).trim();
    
    result[key] = parseYamlValue(value);
  }
  
  return result;
}

/**
 * 解析 YAML 值
 */
function parseYamlValue(value: string): ConfigValue {
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null' || value === '~') return null as any;
  
  const num = Number(value);
  if (!isNaN(num) && value.trim() !== '') return num;
  
  if (value.startsWith('[') && value.endsWith(']')) {
    const items = value.slice(1, -1).split(',').map(s => s.trim());
    return items;
  }
  
  return value.replace(/^["']|["']$/g, '');
}

/**
 * 验证配置
 * @param config - 配置对象
 * @param validator - 验证器
 * @returns 验证错误列表
 */
export function validateConfig(config: ConfigObject, validator: ConfigValidator): ValidationError[] {
  const errors: ValidationError[] = [];

  for (const [key, rule] of Object.entries(validator)) {
    const value = getNestedValue(config, key);

    // 检查必填
    if (rule.required && (value === undefined || value === null)) {
      errors.push({
        path: key,
        message: `字段 "${key}" 是必填的`,
        expected: rule.type
      });
      continue;
    }

    // 如果非必填且值为空，跳过后续验证
    if (value === undefined || value === null) {
      continue;
    }

    // 类型检查
    if (!checkType(value, rule.type)) {
      errors.push({
        path: key,
        message: `字段 "${key}" 类型错误`,
        actual: typeof value,
        expected: rule.type
      });
      continue;
    }

    // 数值范围检查
    if (rule.type === 'number' && typeof value === 'number') {
      if (rule.min !== undefined && value < rule.min) {
        errors.push({
          path: key,
          message: `字段 "${key}" 值 ${value} 小于最小值 ${rule.min}`,
          actual: value
        });
      }
      if (rule.max !== undefined && value > rule.max) {
        errors.push({
          path: key,
          message: `字段 "${key}" 值 ${value} 大于最大值 ${rule.max}`,
          actual: value
        });
      }
    }

    // 字符串长度检查
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.min !== undefined && value.length < rule.min) {
        errors.push({
          path: key,
          message: `字段 "${key}" 长度 ${value.length} 小于最小值 ${rule.min}`,
          actual: value.length
        });
      }
      if (rule.max !== undefined && value.length > rule.max) {
        errors.push({
          path: key,
          message: `字段 "${key}" 长度 ${value.length} 大于最大值 ${rule.max}`,
          actual: value.length
        });
      }
    }

    // 正则匹配
    if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
      errors.push({
        path: key,
        message: `字段 "${key}" 值不匹配正则规则`,
        actual: value
      });
    }

    // 枚举检查
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push({
        path: key,
        message: `字段 "${key}" 值不在枚举范围内`,
        actual: value,
        expected: rule.enum.join(', ')
      });
    }

    // 自定义验证
    if (rule.validate && !rule.validate(value)) {
      errors.push({
        path: key,
        message: `字段 "${key}" 未通过自定义验证`,
        actual: value
      });
    }
  }

  return errors;
}

/**
 * 检查值类型
 */
function checkType(value: any, type: ValidationType): boolean {
  switch (type) {
    case 'string': return typeof value === 'string';
    case 'number': return typeof value === 'number' && !isNaN(value);
    case 'boolean': return typeof value === 'boolean';
    case 'array': return Array.isArray(value);
    case 'object': return typeof value === 'object' && value !== null && !Array.isArray(value);
    default: return false;
  }
}

/**
 * 获取嵌套对象中的值 (支持 "a.b.c" 路径)
 */
function getNestedValue(obj: ConfigObject, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && typeof current === 'object' ? current[key] : undefined;
  }, obj as any);
}

/**
 * 设置嵌套对象中的值
 */
function setNestedValue(obj: ConfigObject, path: string, value: ConfigValue): void {
  const keys = path.split('.');
  const lastKey = keys.pop()!;
  
  const target = keys.reduce((current, key) => {
    if (!(key in current)) {
      current[key] = {};
    }
    return current[key] as ConfigObject;
  }, obj as any);
  
  target[lastKey] = value;
}

/**
 * 应用环境变量覆盖
 * @param config - 基础配置
 * @param envPrefix - 环境变量前缀
 * @returns 合并后的配置
 */
export function applyEnvOverrides(config: ConfigObject, envPrefix: string = 'AXONCLAW_'): ConfigObject {
  const overrides: ConfigObject = {};
  
  const flattenConfig = flattenObject(config);
  
  for (const [key, value] of Object.entries(flattenConfig)) {
    const envKey = envPrefix + key.replace(/\./g, '_').toUpperCase();
    const envValue = process.env[envKey];
    
    if (envValue !== undefined) {
      overrides[key] = parseEnvValue(envValue, value);
    }
  }
  
  return mergeConfigs(config, overrides);
}

/**
 * 扁平化对象
 */
function flattenObject(obj: ConfigObject, prefix = ''): ConfigObject {
  const result: ConfigObject = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as ConfigObject, newKey));
    } else {
      result[newKey] = value;
    }
  }
  
  return result;
}

/**
 * 解析环境变量值
 */
function parseEnvValue(envValue: string, originalValue: any): ConfigValue {
  if (typeof originalValue === 'boolean') {
    return envValue.toLowerCase() === 'true' || envValue === '1';
  }
  
  if (typeof originalValue === 'number') {
    const num = Number(envValue);
    return isNaN(num) ? originalValue : num;
  }
  
  if (Array.isArray(originalValue)) {
    return envValue.split(',').map(s => s.trim());
  }
  
  return envValue;
}

/**
 * 合并配置 (深度合并)
 */
export function mergeConfigs(base: ConfigObject, override: ConfigObject): ConfigObject {
  const result: ConfigObject = { ...base };
  
  for (const [key, value] of Object.entries(override)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = mergeConfigs(
        (base[key] as ConfigObject) || {},
        value as ConfigObject
      );
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// ============ 配置管理器类 ============

/**
 * 配置管理器 - 支持热重载
 */
export class ConfigManager {
  private config: ConfigObject = {};
  private configPath: string;
  private enableHotReload: boolean;
  private validator?: ConfigValidator;
  private envPrefix: string;
  private listeners: ConfigChangeListener[] = [];
  private fsWatcher?: fs.FSWatcher;
  private lastModified: number = 0;

  constructor(options: ConfigUtilsOptions = {}) {
    const workspaceRoot = process.env.WORKSPACE_ROOT || path.join(__dirname, '../../');
    this.configPath = options.configPath || path.join(workspaceRoot, 'config', 'default.yaml');
    this.enableHotReload = options.enableHotReload ?? true;
    this.validator = options.validator;
    this.envPrefix = options.envPrefix || 'AXONCLAW_';
  }

  /**
   * 加载配置
   */
  async load(): Promise<ConfigObject> {
    const rawConfig = loadConfig(this.configPath);
    const withEnv = applyEnvOverrides(rawConfig, this.envPrefix);
    this.config = withEnv;

    if (this.validator) {
      const errors = validateConfig(this.config, this.validator);
      if (errors.length > 0) {
        throw new Error(`[ConfigManager] 配置验证失败:\n${errors.map(e => `  - ${e.path}: ${e.message}`).join('\n')}`);
      }
    }

    if (this.enableHotReload) {
      this.setupHotReload();
    }

    console.log(`[ConfigManager] 配置已加载：${this.configPath}`);
    return this.config;
  }

  /**
   * 获取配置值
   */
  get<T = any>(key: string, defaultValue?: T): T {
    const value = getNestedValue(this.config, key);
    return (value !== undefined ? value : defaultValue) as T;
  }

  /**
   * 获取完整配置
   */
  getAll(): ConfigObject {
    return { ...this.config };
  }

  /**
   * 更新配置值
   */
  set(key: string, value: ConfigValue): void {
    const oldValue = getNestedValue(this.config, key);
    setNestedValue(this.config, key, value);
    
    this.notifyListeners({
      key,
      oldValue,
      newValue: value,
      timestamp: Date.now()
    });
  }

  /**
   * 监听配置变更
   */
  onChange(listener: ConfigChangeListener): void {
    this.listeners.push(listener);
  }

  /**
   * 移除监听器
   */
  offChange(listener: ConfigChangeListener): void {
    this.listeners = this.listeners.filter(l => l !== listener);
  }

  /**
   * 设置热重载
   */
  private setupHotReload(): void {
    if (!fs.existsSync(this.configPath)) {
      console.warn(`[ConfigManager] 配置文件不存在，跳过热重载设置`);
      return;
    }

    this.lastModified = fs.statSync(this.configPath).mtimeMs;

    this.fsWatcher = fs.watch(this.configPath, (eventType) => {
      if (eventType === 'change') {
        const stats = fs.statSync(this.configPath);
        if (stats.mtimeMs > this.lastModified) {
          this.lastModified = stats.mtimeMs;
          this.reload();
        }
      }
    });

    console.log(`[ConfigManager] 热重载已启用：${this.configPath}`);
  }

  /**
   * 重新加载配置
   */
  private async reload(): Promise<void> {
    console.log(`[ConfigManager] 检测到配置变更，重新加载...`);
    
    try {
      const oldConfig = { ...this.config };
      const rawConfig = loadConfig(this.configPath);
      const withEnv = applyEnvOverrides(rawConfig, this.envPrefix);
      
      if (this.validator) {
        const errors = validateConfig(withEnv, this.validator);
        if (errors.length > 0) {
          console.error(`[ConfigManager] 配置验证失败，跳过更新`);
          return;
        }
      }

      this.config = withEnv;

      // 通知所有变更的键
      this.notifyConfigDiff(oldConfig, withEnv);

      console.log(`[ConfigManager] 配置已热更新`);
    } catch (error) {
      console.error(`[ConfigManager] 配置重载失败:`, error);
    }
  }

  /**
   * 通知配置差异
   */
  private notifyConfigDiff(oldConfig: ConfigObject, newConfig: ConfigObject): void {
    const oldFlat = flattenObject(oldConfig);
    const newFlat = flattenObject(newConfig);
    
    for (const [key, newValue] of Object.entries(newFlat)) {
      const oldValue = oldFlat[key];
      if (oldValue !== newValue) {
        this.notifyListeners({
          key,
          oldValue,
          newValue,
          timestamp: Date.now()
        });
      }
    }
  }

  /**
   * 通知监听器
   */
  private notifyListeners(event: ConfigChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error(`[ConfigManager] 监听器执行失败:`, error);
      }
    }
  }

  /**
   * 关闭监听
   */
  close(): void {
    if (this.fsWatcher) {
      this.fsWatcher.close();
      this.fsWatcher = undefined;
    }
    this.listeners = [];
  }
}

// ============ 便捷函数 ============

/**
 * 快速加载配置 (一次性)
 */
export async function loadConfigOnce(
  configPath: string,
  validator?: ConfigValidator,
  envPrefix?: string
): Promise<ConfigObject> {
  const manager = new ConfigManager({ configPath, validator, envPrefix, enableHotReload: false });
  return await manager.load();
}

/**
 * 创建带验证器的配置管理器
 */
export function createConfigManager<T extends ConfigValidator>(
  configPath: string,
  validator: T,
  options?: Omit<ConfigUtilsOptions, 'configPath' | 'validator'>
): ConfigManager {
  return new ConfigManager({
    configPath,
    validator,
    ...options
  });
}
