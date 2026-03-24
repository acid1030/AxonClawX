/**
 * Feature Flags Skill - 特性开关管理工具
 * 
 * 功能:
 * 1. 开关管理 - 创建/更新/删除/查询特性开关
 * 2. 灰度发布 - 基于用户/百分比/地域的渐进式发布
 * 3. A/B 测试 - 多变量实验与效果追踪
 * 
 * 使用场景:
 * - 新功能渐进式上线
 * - 紧急功能回滚
 * - A/B 测试实验
 * - 用户分群功能控制
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// ============== 类型定义 ==============

export type FlagType = 'boolean' | 'string' | 'number' | 'json';
export type RolloutStrategy = 'percentage' | 'user-list' | 'geo' | 'attribute';
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

/**
 * 特性开关定义
 */
export interface FeatureFlag {
  /** 开关唯一标识 */
  key: string;
  /** 开关名称 */
  name: string;
  /** 开关描述 */
  description: string;
  /** 开关类型 */
  type: FlagType;
  /** 默认值 */
  defaultValue: any;
  /** 是否启用 */
  enabled: boolean;
  /** 发布策略 */
  rollout?: RolloutConfig;
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
  /** 创建者 */
  createdBy: string;
  /** 标签 */
  tags: string[];
}

/**
 * 发布配置
 */
export interface RolloutConfig {
  /** 发布策略类型 */
  strategy: RolloutStrategy;
  /** 灰度百分比 (0-100) */
  percentage?: number;
  /** 目标用户列表 */
  userIds?: string[];
  /** 目标地域列表 */
  countries?: string[];
  /** 用户属性匹配规则 */
  attributeRules?: AttributeRule[];
  /** 种子值 (用于一致性哈希) */
  seed?: string;
}

/**
 * 属性匹配规则
 */
export interface AttributeRule {
  /** 属性名 */
  attribute: string;
  /** 操作符 */
  operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than' | 'in' | 'not-in';
  /** 匹配值 */
  value: any;
}

/**
 * A/B 测试实验
 */
export interface Experiment {
  /** 实验唯一标识 */
  id: string;
  /** 实验名称 */
  name: string;
  /** 关联的开关 key */
  flagKey: string;
  /** 实验描述 */
  description: string;
  /** 实验状态 */
  status: ExperimentStatus;
  /** 实验变体 */
  variants: ExperimentVariant[];
  /** 目标指标 */
  metrics: MetricConfig[];
  /** 开始时间 */
  startedAt?: number;
  /** 结束时间 */
  endedAt?: number;
  /** 创建时间 */
  createdAt: number;
  /** 创建者 */
  createdBy: string;
}

/**
 * 实验变体
 */
export interface ExperimentVariant {
  /** 变体标识 */
  id: string;
  /** 变体名称 */
  name: string;
  /** 变体描述 */
  description: string;
  /** 流量分配比例 (0-100) */
  trafficPercentage: number;
  /** 变体值 */
  value: any;
  /** 是否为对照组 */
  isControl: boolean;
}

/**
 * 指标配置
 */
export interface MetricConfig {
  /** 指标名称 */
  name: string;
  /** 指标类型 */
  type: 'conversion' | 'retention' | 'engagement' | 'revenue';
  /** 目标值 */
  target?: number;
  /** 当前值 */
  currentValue?: number;
}

/**
 * 实验结果
 */
export interface ExperimentResult {
  experimentId: string;
  variantId: string;
  variantName: string;
  sampleSize: number;
  metrics: {
    [metricName: string]: {
      value: number;
      improvement?: number;
      confidence?: number;
      significant: boolean;
    };
  };
  winner?: string;
  analyzedAt: number;
}

/**
 * 开关评估上下文
 */
export interface EvaluationContext {
  /** 用户 ID */
  userId?: string;
  /** 用户属性 */
  attributes?: { [key: string]: any };
  /** 用户地域 */
  country?: string;
  /** 当前时间 */
  timestamp?: number;
}

/**
 * 开关评估结果
 */
export interface EvaluationResult {
  /** 是否命中开关 */
  enabled: boolean;
  /** 开关值 */
  value: any;
  /** 命中的变体 ID (如果是实验) */
  variantId?: string;
  /** 评估原因 */
  reason: 'default' | 'rollout' | 'experiment' | 'rule' | 'user-list';
  /** 评估详情 */
  metadata?: {
    percentage?: number;
    userHash?: number;
    matchedRule?: AttributeRule;
  };
}

// ============== 存储适配器 ==============

export interface StorageAdapter {
  read(): Promise<StorageData>;
  write(data: StorageData): Promise<void>;
}

export interface StorageData {
  flags: FeatureFlag[];
  experiments: Experiment[];
  results: ExperimentResult[];
}

/**
 * 文件系统存储适配器
 */
class FileStorageAdapter implements StorageAdapter {
  private filePath: string;

  constructor(filePath: string = './feature-flags.json') {
    this.filePath = filePath;
  }

  async read(): Promise<StorageData> {
    try {
      if (!fs.existsSync(this.filePath)) {
        return { flags: [], experiments: [], results: [] };
      }
      const content = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      console.error('Failed to read feature flags storage:', error.message);
      return { flags: [], experiments: [], results: [] };
    }
  }

  async write(data: StorageData): Promise<void> {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

/**
 * 内存存储适配器 (用于测试)
 */
class MemoryStorageAdapter implements StorageAdapter {
  private data: StorageData = { flags: [], experiments: [], results: [] };

  async read(): Promise<StorageData> {
    return { ...this.data };
  }

  async write(data: StorageData): Promise<void> {
    this.data = { ...data };
  }
}

// ============== 特性开关管理器 ==============

export class FeatureFlagManager {
  private storage: StorageAdapter;
  private cache: Map<string, FeatureFlag> = new Map();
  private experimentCache: Map<string, Experiment> = new Map();

  constructor(storage?: StorageAdapter) {
    this.storage = storage || new FileStorageAdapter();
  }

  /**
   * 初始化 - 加载数据到缓存
   */
  async initialize(): Promise<void> {
    const data = await this.storage.read();
    this.cache.clear();
    this.experimentCache.clear();
    
    data.flags.forEach(flag => this.cache.set(flag.key, flag));
    data.experiments.forEach(exp => this.experimentCache.set(exp.id, exp));
  }

  /**
   * 持久化数据
   */
  async persist(): Promise<void> {
    const data: StorageData = {
      flags: Array.from(this.cache.values()),
      experiments: Array.from(this.experimentCache.values()),
      results: []
    };
    await this.storage.write(data);
  }

  // ============== 开关管理 ==============

  /**
   * 创建特性开关
   */
  async createFlag(
    key: string,
    name: string,
    description: string,
    type: FlagType = 'boolean',
    defaultValue: any = false,
    createdBy: string = 'system'
  ): Promise<FeatureFlag> {
    if (this.cache.has(key)) {
      throw new Error(`Feature flag with key '${key}' already exists`);
    }

    const now = Date.now();
    const flag: FeatureFlag = {
      key,
      name,
      description,
      type,
      defaultValue,
      enabled: false,
      createdAt: now,
      updatedAt: now,
      createdBy,
      tags: []
    };

    this.cache.set(key, flag);
    await this.persist();
    
    console.log(`[FeatureFlag] Created: ${key}`);
    return flag;
  }

  /**
   * 获取特性开关
   */
  getFlag(key: string): FeatureFlag | undefined {
    return this.cache.get(key);
  }

  /**
   * 获取所有特性开关
   */
  getAllFlags(): FeatureFlag[] {
    return Array.from(this.cache.values());
  }

  /**
   * 更新特性开关
   */
  async updateFlag(key: string, updates: Partial<FeatureFlag>): Promise<FeatureFlag> {
    const flag = this.cache.get(key);
    if (!flag) {
      throw new Error(`Feature flag with key '${key}' not found`);
    }

    const updated: FeatureFlag = {
      ...flag,
      ...updates,
      key, // 不允许修改 key
      updatedAt: Date.now()
    };

    this.cache.set(key, updated);
    await this.persist();
    
    console.log(`[FeatureFlag] Updated: ${key}`);
    return updated;
  }

  /**
   * 删除特性开关
   */
  async deleteFlag(key: string): Promise<void> {
    if (!this.cache.has(key)) {
      throw new Error(`Feature flag with key '${key}' not found`);
    }

    this.cache.delete(key);
    await this.persist();
    
    console.log(`[FeatureFlag] Deleted: ${key}`);
  }

  /**
   * 启用/禁用开关
   */
  async toggleFlag(key: string, enabled: boolean): Promise<FeatureFlag> {
    return this.updateFlag(key, { enabled });
  }

  /**
   * 设置灰度发布配置
   */
  async setRollout(
    key: string,
    strategy: RolloutStrategy,
    config: Partial<RolloutConfig>
  ): Promise<FeatureFlag> {
    const flag = this.cache.get(key);
    if (!flag) {
      throw new Error(`Feature flag with key '${key}' not found`);
    }

    const rollout: RolloutConfig = {
      strategy,
      percentage: config.percentage,
      userIds: config.userIds,
      countries: config.countries,
      attributeRules: config.attributeRules,
      seed: config.seed || key
    };

    return this.updateFlag(key, { rollout });
  }

  // ============== 开关评估 ==============

  /**
   * 评估开关状态
   */
  evaluate(key: string, context: EvaluationContext = {}): EvaluationResult {
    const flag = this.cache.get(key);
    
    if (!flag) {
      console.warn(`[FeatureFlag] Flag not found: ${key}`);
      return {
        enabled: false,
        value: undefined,
        reason: 'default'
      };
    }

    if (!flag.enabled) {
      return {
        enabled: false,
        value: flag.defaultValue,
        reason: 'default'
      };
    }

    // 检查实验
    const experiment = this.getActiveExperimentForFlag(key);
    if (experiment) {
      return this.evaluateExperiment(experiment, context);
    }

    // 检查灰度发布
    if (flag.rollout) {
      const rolloutResult = this.evaluateRollout(flag, context);
      if (rolloutResult) {
        return rolloutResult;
      }
    }

    // 默认启用
    return {
      enabled: true,
      value: flag.defaultValue,
      reason: 'default'
    };
  }

  /**
   * 评估灰度发布规则
   */
  private evaluateRollout(flag: FeatureFlag, context: EvaluationContext): EvaluationResult | null {
    const rollout = flag.rollout;
    if (!rollout) return null;

    switch (rollout.strategy) {
      case 'percentage':
        return this.evaluatePercentageRollout(flag, rollout, context);
      
      case 'user-list':
        return this.evaluateUserListRollout(flag, rollout, context);
      
      case 'geo':
        return this.evaluateGeoRollout(flag, rollout, context);
      
      case 'attribute':
        return this.evaluateAttributeRollout(flag, rollout, context);
      
      default:
        return null;
    }
  }

  /**
   * 百分比灰度评估
   */
  private evaluatePercentageRollout(
    flag: FeatureFlag,
    rollout: RolloutConfig,
    context: EvaluationContext
  ): EvaluationResult {
    const percentage = rollout.percentage || 0;
    
    if (percentage >= 100) {
      return {
        enabled: true,
        value: flag.defaultValue,
        reason: 'rollout',
        metadata: { percentage: 100 }
      };
    }

    if (percentage <= 0) {
      return {
        enabled: false,
        value: flag.defaultValue,
        reason: 'rollout',
        metadata: { percentage: 0 }
      };
    }

    // 使用用户 ID 或随机值进行哈希
    const hashInput = context.userId || `${rollout.seed}-${Date.now()}`;
    const userHash = this.hashUser(hashInput, rollout.seed || flag.key);
    const userPercentage = (userHash % 10000) / 100;

    const enabled = userPercentage < percentage;

    return {
      enabled,
      value: enabled ? flag.defaultValue : flag.defaultValue,
      reason: 'rollout',
      metadata: {
        percentage,
        userHash,
        userPercentage
      }
    };
  }

  /**
   * 用户列表灰度评估
   */
  private evaluateUserListRollout(
    flag: FeatureFlag,
    rollout: RolloutConfig,
    context: EvaluationContext
  ): EvaluationResult {
    const userIds = rollout.userIds || [];
    const enabled = context.userId ? userIds.includes(context.userId) : false;

    return {
      enabled,
      value: enabled ? flag.defaultValue : flag.defaultValue,
      reason: 'user-list'
    };
  }

  /**
   * 地域灰度评估
   */
  private evaluateGeoRollout(
    flag: FeatureFlag,
    rollout: RolloutConfig,
    context: EvaluationContext
  ): EvaluationResult {
    const countries = rollout.countries || [];
    const enabled = context.country ? countries.includes(context.country) : false;

    return {
      enabled,
      value: enabled ? flag.defaultValue : flag.defaultValue,
      reason: 'rollout'
    };
  }

  /**
   * 属性规则灰度评估
   */
  private evaluateAttributeRollout(
    flag: FeatureFlag,
    rollout: RolloutConfig,
    context: EvaluationContext
  ): EvaluationResult {
    const rules = rollout.attributeRules || [];
    if (rules.length === 0) return null;

    const attributes = context.attributes || {};

    for (const rule of rules) {
      const attrValue = attributes[rule.attribute];
      
      if (this.matchRule(attrValue, rule)) {
        return {
          enabled: true,
          value: flag.defaultValue,
          reason: 'rule',
          metadata: { matchedRule: rule }
        };
      }
    }

    return {
      enabled: false,
      value: flag.defaultValue,
      reason: 'rule'
    };
  }

  /**
   * 匹配规则
   */
  private matchRule(value: any, rule: AttributeRule): boolean {
    switch (rule.operator) {
      case 'equals':
        return value === rule.value;
      case 'not-equals':
        return value !== rule.value;
      case 'contains':
        return String(value).includes(String(rule.value));
      case 'greater-than':
        return Number(value) > Number(rule.value);
      case 'less-than':
        return Number(value) < Number(rule.value);
      case 'in':
        return Array.isArray(rule.value) && rule.value.includes(value);
      case 'not-in':
        return Array.isArray(rule.value) && !rule.value.includes(value);
      default:
        return false;
    }
  }

  /**
   * 用户哈希 (一致性哈希)
   */
  private hashUser(userId: string, seed: string): number {
    const hash = createHash('sha256');
    hash.update(`${seed}:${userId}`);
    const hashHex = hash.digest('hex');
    return parseInt(hashHex.substring(0, 8), 16);
  }

  // ============== A/B 测试 ==============

  /**
   * 创建实验
   */
  async createExperiment(
    id: string,
    name: string,
    flagKey: string,
    description: string,
    variants: ExperimentVariant[],
    metrics: MetricConfig[],
    createdBy: string = 'system'
  ): Promise<Experiment> {
    if (this.experimentCache.has(id)) {
      throw new Error(`Experiment with id '${id}' already exists`);
    }

    // 验证变体流量分配
    const totalTraffic = variants.reduce((sum, v) => sum + v.trafficPercentage, 0);
    if (totalTraffic !== 100) {
      throw new Error(`Variant traffic percentages must sum to 100 (got ${totalTraffic})`);
    }

    // 验证对照组
    const controlVariants = variants.filter(v => v.isControl);
    if (controlVariants.length === 0) {
      throw new Error('At least one variant must be marked as control');
    }

    const now = Date.now();
    const experiment: Experiment = {
      id,
      name,
      flagKey,
      description,
      status: 'draft',
      variants,
      metrics,
      createdAt: now,
      createdBy
    };

    this.experimentCache.set(id, experiment);
    await this.persist();
    
    console.log(`[Experiment] Created: ${id}`);
    return experiment;
  }

  /**
   * 获取实验
   */
  getExperiment(id: string): Experiment | undefined {
    return this.experimentCache.get(id);
  }

  /**
   * 获取所有实验
   */
  getAllExperiments(): Experiment[] {
    return Array.from(this.experimentCache.values());
  }

  /**
   * 启动实验
   */
  async startExperiment(id: string): Promise<Experiment> {
    const experiment = this.experimentCache.get(id);
    if (!experiment) {
      throw new Error(`Experiment with id '${id}' not found`);
    }

    const updated: Experiment = {
      ...experiment,
      status: 'running',
      startedAt: Date.now()
    };

    this.experimentCache.set(id, updated);
    await this.persist();
    
    console.log(`[Experiment] Started: ${id}`);
    return updated;
  }

  /**
   * 暂停实验
   */
  async pauseExperiment(id: string): Promise<Experiment> {
    return this.updateExperimentStatus(id, 'paused');
  }

  /**
   * 完成实验
   */
  async completeExperiment(id: string): Promise<Experiment> {
    return this.updateExperimentStatus(id, 'completed', Date.now());
  }

  private async updateExperimentStatus(
    id: string,
    status: ExperimentStatus,
    endedAt?: number
  ): Promise<Experiment> {
    const experiment = this.experimentCache.get(id);
    if (!experiment) {
      throw new Error(`Experiment with id '${id}' not found`);
    }

    const updated: Experiment = {
      ...experiment,
      status,
      endedAt: endedAt || experiment.endedAt
    };

    this.experimentCache.set(id, updated);
    await this.persist();
    
    console.log(`[Experiment] ${status}: ${id}`);
    return updated;
  }

  /**
   * 获取激活的实验
   */
  getActiveExperimentForFlag(flagKey: string): Experiment | undefined {
    for (const experiment of this.experimentCache.values()) {
      if (experiment.flagKey === flagKey && experiment.status === 'running') {
        return experiment;
      }
    }
    return undefined;
  }

  /**
   * 评估实验
   */
  private evaluateExperiment(
    experiment: Experiment,
    context: EvaluationContext
  ): EvaluationResult {
    const variant = this.selectVariant(experiment, context);
    
    return {
      enabled: true,
      value: variant.value,
      variantId: variant.id,
      reason: 'experiment'
    };
  }

  /**
   * 选择实验变体
   */
  private selectVariant(experiment: Experiment, context: EvaluationContext): ExperimentVariant {
    const userId = context.userId || `${experiment.id}-${Date.now()}`;
    const userHash = this.hashUser(userId, experiment.id);
    const bucket = userHash % 100;

    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.trafficPercentage;
      if (bucket < cumulative) {
        return variant;
      }
    }

    // 默认返回对照组
    return experiment.variants.find(v => v.isControl) || experiment.variants[0];
  }

  /**
   * 记录实验结果
   */
  async recordResult(result: ExperimentResult): Promise<void> {
    const data = await this.storage.read();
    data.results.push(result);
    await this.storage.write(data);
    
    console.log(`[Experiment] Result recorded: ${result.experimentId}`);
  }

  /**
   * 分析实验结果
   */
  analyzeExperiment(experimentId: string): ExperimentResult[] {
    // 实际项目中应该从数据库查询结果
    // 这里简化为返回空数组
    return [];
  }
}

// ============== 便捷函数 ==============

let defaultManager: FeatureFlagManager | null = null;

/**
 * 获取默认管理器实例
 */
export function getManager(): FeatureFlagManager {
  if (!defaultManager) {
    defaultManager = new FeatureFlagManager();
    defaultManager.initialize();
  }
  return defaultManager;
}

/**
 * 创建特性开关
 */
export async function createFlag(
  key: string,
  name: string,
  description: string,
  type?: FlagType,
  defaultValue?: any
): Promise<FeatureFlag> {
  return getManager().createFlag(key, name, description, type, defaultValue);
}

/**
 * 评估开关
 */
export function evaluate(key: string, context?: EvaluationContext): EvaluationResult {
  return getManager().evaluate(key, context);
}

/**
 * 检查开关是否启用
 */
export function isEnabled(key: string, context?: EvaluationContext): boolean {
  return evaluate(key, context).enabled;
}

/**
 * 获取开关值
 */
export function getValue<T = any>(key: string, context?: EvaluationContext): T {
  return evaluate(key, context).value as T;
}

/**
 * 设置灰度发布
 */
export async function setRollout(
  key: string,
  percentage: number,
  seed?: string
): Promise<FeatureFlag> {
  return getManager().setRollout(key, 'percentage', { percentage, seed });
}

/**
 * 创建 A/B 测试实验
 */
export async function createExperiment(
  id: string,
  name: string,
  flagKey: string,
  variants: ExperimentVariant[],
  metrics: MetricConfig[]
): Promise<Experiment> {
  return getManager().createExperiment(id, name, flagKey, '', variants, metrics);
}

/**
 * 启动实验
 */
export async function startExperiment(id: string): Promise<Experiment> {
  return getManager().startExperiment(id);
}

// ============== 导出 ==============

export {
  FeatureFlagManager,
  FileStorageAdapter,
  MemoryStorageAdapter
};
