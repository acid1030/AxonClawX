/**
 * Feature Flags Server Skill - 特性开关中心服务端
 * 
 * 功能:
 * 1. 特性定义 - RESTful API 管理特性开关
 * 2. 灰度发布 - 基于用户/百分比/地域的渐进式发布 API
 * 3. A/B 测试 - 多变量实验与效果追踪 API
 * 
 * 交付物:
 * - src/skills/feature-flags-server-skill.ts
 * - 使用示例
 * 
 * @author KAEL
 * @version 1.0.0
 */

import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';

// ============== 类型定义 ==============

export type FlagType = 'boolean' | 'string' | 'number' | 'json';
export type RolloutStrategy = 'percentage' | 'user-list' | 'geo' | 'attribute';
export type ExperimentStatus = 'draft' | 'running' | 'paused' | 'completed';

export interface FeatureFlag {
  key: string;
  name: string;
  description: string;
  type: FlagType;
  defaultValue: any;
  enabled: boolean;
  rollout?: RolloutConfig;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
  tags: string[];
}

export interface RolloutConfig {
  strategy: RolloutStrategy;
  percentage?: number;
  userIds?: string[];
  countries?: string[];
  attributeRules?: AttributeRule[];
  seed?: string;
}

export interface AttributeRule {
  attribute: string;
  operator: 'equals' | 'not-equals' | 'contains' | 'greater-than' | 'less-than' | 'in' | 'not-in';
  value: any;
}

export interface Experiment {
  id: string;
  name: string;
  flagKey: string;
  description: string;
  status: ExperimentStatus;
  variants: ExperimentVariant[];
  targetMetrics: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  value: any;
  allocation: number;
}

export interface FlagEvaluationResult {
  flagKey: string;
  value: any;
  reason: 'default' | 'rollout' | 'experiment' | 'user-list' | 'geo' | 'attribute';
  variant?: string;
}

export interface ServerConfig {
  port: number;
  host: string;
  dataDir: string;
  apiKey?: string;
}

// ============== 数据存储 ==============

class FeatureFlagStore {
  private flags: Map<string, FeatureFlag> = new Map();
  private experiments: Map<string, Experiment> = new Map();
  private dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.ensureDataDir();
    this.load();
  }

  private ensureDataDir() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  private getFlagsPath() {
    return path.join(this.dataDir, 'flags.json');
  }

  private getExperimentsPath() {
    return path.join(this.dataDir, 'experiments.json');
  }

  load() {
    try {
      if (fs.existsSync(this.getFlagsPath())) {
        const flagsData = JSON.parse(fs.readFileSync(this.getFlagsPath(), 'utf-8'));
        this.flags = new Map(Object.entries(flagsData));
      }
      if (fs.existsSync(this.getExperimentsPath())) {
        const expData = JSON.parse(fs.readFileSync(this.getExperimentsPath(), 'utf-8'));
        this.experiments = new Map(Object.entries(expData));
      }
    } catch (error) {
      console.error('Failed to load feature flags data:', error);
    }
  }

  save() {
    try {
      fs.writeFileSync(this.getFlagsPath(), JSON.stringify(Object.fromEntries(this.flags), null, 2));
      fs.writeFileSync(this.getExperimentsPath(), JSON.stringify(Object.fromEntries(this.experiments), null, 2));
    } catch (error) {
      console.error('Failed to save feature flags data:', error);
    }
  }

  // Flag CRUD
  createFlag(flag: FeatureFlag) {
    if (this.flags.has(flag.key)) {
      throw new Error(`Flag with key '${flag.key}' already exists`);
    }
    this.flags.set(flag.key, flag);
    this.save();
    return flag;
  }

  updateFlag(key: string, updates: Partial<FeatureFlag>) {
    const flag = this.flags.get(key);
    if (!flag) {
      throw new Error(`Flag with key '${key}' not found`);
    }
    const updated = { ...flag, ...updates, updatedAt: Date.now() };
    this.flags.set(key, updated);
    this.save();
    return updated;
  }

  deleteFlag(key: string) {
    const deleted = this.flags.delete(key);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  getFlag(key: string): FeatureFlag | undefined {
    return this.flags.get(key);
  }

  listFlags(): FeatureFlag[] {
    return Array.from(this.flags.values());
  }

  // Experiment CRUD
  createExperiment(experiment: Experiment) {
    if (this.experiments.has(experiment.id)) {
      throw new Error(`Experiment with id '${experiment.id}' already exists`);
    }
    this.experiments.set(experiment.id, experiment);
    this.save();
    return experiment;
  }

  updateExperiment(id: string, updates: Partial<Experiment>) {
    const exp = this.experiments.get(id);
    if (!exp) {
      throw new Error(`Experiment with id '${id}' not found`);
    }
    const updated = { ...exp, ...updates, updatedAt: Date.now() };
    this.experiments.set(id, updated);
    this.save();
    return updated;
  }

  deleteExperiment(id: string) {
    const deleted = this.experiments.delete(id);
    if (deleted) {
      this.save();
    }
    return deleted;
  }

  getExperiment(id: string): Experiment | undefined {
    return this.experiments.get(id);
  }

  listExperiments(): Experiment[] {
    return Array.from(this.experiments.values());
  }
}

// ============== 特性评估引擎 ==============

class EvaluationEngine {
  constructor(private store: FeatureFlagStore) {}

  evaluate(flagKey: string, context: EvaluationContext): FlagEvaluationResult {
    const flag = this.store.getFlag(flagKey);
    
    if (!flag) {
      throw new Error(`Flag '${flagKey}' not found`);
    }

    if (!flag.enabled) {
      return { flagKey, value: flag.defaultValue, reason: 'default' };
    }

    // 检查实验
    const experiment = this.findActiveExperiment(flagKey);
    if (experiment) {
      const variant = this.selectVariant(experiment, context);
      return {
        flagKey,
        value: variant.value,
        reason: 'experiment',
        variant: variant.id
      };
    }

    // 检查发布策略
    if (flag.rollout) {
      const rolloutResult = this.evaluateRollout(flag, context);
      if (rolloutResult !== null) {
        return rolloutResult;
      }
    }

    return { flagKey, value: flag.defaultValue, reason: 'default' };
  }

  private findActiveExperiment(flagKey: string): Experiment | undefined {
    const experiments = this.store.listExperiments();
    return experiments.find(exp => exp.flagKey === flagKey && exp.status === 'running');
  }

  private selectVariant(experiment: Experiment, context: EvaluationContext): ExperimentVariant {
    const hash = this.hash(`${experiment.id}:${context.userId || 'anonymous'}`);
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    
    let cumulative = 0;
    for (const variant of experiment.variants) {
      cumulative += variant.allocation;
      if (bucket < cumulative) {
        return variant;
      }
    }
    
    return experiment.variants[experiment.variants.length - 1];
  }

  private evaluateRollout(flag: FeatureFlag, context: EvaluationContext): FlagEvaluationResult | null {
    const rollout = flag.rollout!;

    switch (rollout.strategy) {
      case 'percentage':
        if (this.isInPercentage(flag.key, context.userId, rollout.percentage || 0, rollout.seed)) {
          return { flagKey: flag.key, value: flag.defaultValue, reason: 'rollout' };
        }
        return { flagKey: flag.key, value: flag.defaultValue, reason: 'default' };

      case 'user-list':
        if (rollout.userIds?.includes(context.userId || '')) {
          return { flagKey: flag.key, value: flag.defaultValue, reason: 'user-list' };
        }
        return null;

      case 'geo':
        if (context.country && rollout.countries?.includes(context.country)) {
          return { flagKey: flag.key, value: flag.defaultValue, reason: 'geo' };
        }
        return null;

      case 'attribute':
        if (this.matchAttributes(rollout.attributeRules || [], context.attributes)) {
          return { flagKey: flag.key, value: flag.defaultValue, reason: 'attribute' };
        }
        return null;

      default:
        return null;
    }
  }

  private isInPercentage(flagKey: string, userId: string | undefined, percentage: number, seed?: string): boolean {
    if (percentage >= 100) return true;
    if (percentage <= 0) return false;

    const hashInput = `${seed || flagKey}:${userId || 'anonymous'}`;
    const hash = this.hash(hashInput);
    const bucket = parseInt(hash.slice(0, 8), 16) % 100;
    
    return bucket < percentage;
  }

  private matchAttributes(rules: AttributeRule[], attributes: Record<string, any>): boolean {
    return rules.every(rule => {
      const attrValue = attributes[rule.attribute];
      
      switch (rule.operator) {
        case 'equals':
          return attrValue === rule.value;
        case 'not-equals':
          return attrValue !== rule.value;
        case 'contains':
          return String(attrValue).includes(String(rule.value));
        case 'greater-than':
          return Number(attrValue) > Number(rule.value);
        case 'less-than':
          return Number(attrValue) < Number(rule.value);
        case 'in':
          return Array.isArray(rule.value) && rule.value.includes(attrValue);
        case 'not-in':
          return !Array.isArray(rule.value) || !rule.value.includes(attrValue);
        default:
          return false;
      }
    });
  }

  private hash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }
}

interface EvaluationContext {
  userId?: string;
  country?: string;
  attributes: Record<string, any>;
}

// ============== HTTP 服务器 ==============

class FeatureFlagsServer {
  private server: http.Server;
  private store: FeatureFlagStore;
  private engine: EvaluationEngine;
  private config: ServerConfig;

  constructor(config: ServerConfig) {
    this.config = config;
    this.store = new FeatureFlagStore(config.dataDir);
    this.engine = new EvaluationEngine(this.store);
    this.server = http.createServer(this.handleRequest.bind(this));
  }

  start() {
    return new Promise<void>((resolve) => {
      this.server.listen(this.config.port, this.config.host, () => {
        console.log(`🚀 Feature Flags Server running at http://${this.config.host}:${this.config.port}`);
        console.log(`📁 Data directory: ${this.config.dataDir}`);
        resolve();
      });
    });
  }

  stop() {
    return new Promise<void>((resolve) => {
      this.server.close(() => {
        console.log('Feature Flags Server stopped');
        resolve();
      });
    });
  }

  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse) {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const pathname = url.pathname;
    const method = req.method;

    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key');
    res.setHeader('Content-Type', 'application/json');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // API Key validation (if configured)
    if (this.config.apiKey && req.headers['x-api-key'] !== this.config.apiKey) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    try {
      // Route handling
      if (pathname === '/api/flags' && method === 'GET') {
        this.handleListFlags(res);
      } else if (pathname === '/api/flags' && method === 'POST') {
        this.handleCreateFlag(req, res);
      } else if (pathname.startsWith('/api/flags/') && method === 'GET') {
        this.handleGetFlag(res, pathname.split('/')[3]);
      } else if (pathname.startsWith('/api/flags/') && method === 'PUT') {
        this.handleUpdateFlag(req, res, pathname.split('/')[3]);
      } else if (pathname.startsWith('/api/flags/') && method === 'DELETE') {
        this.handleDeleteFlag(res, pathname.split('/')[3]);
      } else if (pathname === '/api/evaluate' && method === 'POST') {
        this.handleEvaluate(req, res);
      } else if (pathname === '/api/experiments' && method === 'GET') {
        this.handleListExperiments(res);
      } else if (pathname === '/api/experiments' && method === 'POST') {
        this.handleCreateExperiment(req, res);
      } else if (pathname.startsWith('/api/experiments/') && method === 'GET') {
        this.handleGetExperiment(res, pathname.split('/')[3]);
      } else if (pathname.startsWith('/api/experiments/') && method === 'PUT') {
        this.handleUpdateExperiment(req, res, pathname.split('/')[3]);
      } else if (pathname.startsWith('/api/experiments/') && method === 'DELETE') {
        this.handleDeleteExperiment(res, pathname.split('/')[3]);
      } else if (pathname === '/api/health' && method === 'GET') {
        this.handleHealth(res);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
      }
    } catch (error: any) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  private async readBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          resolve(body ? JSON.parse(body) : {});
        } catch {
          resolve({});
        }
      });
    });
  }

  private handleListFlags(res: http.ServerResponse) {
    const flags = this.store.listFlags();
    res.writeHead(200);
    res.end(JSON.stringify({ data: flags, total: flags.length }));
  }

  private async handleCreateFlag(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.readBody(req);
    const flag: FeatureFlag = {
      ...body,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      createdBy: body.createdBy || 'system'
    };
    
    const created = this.store.createFlag(flag);
    res.writeHead(201);
    res.end(JSON.stringify({ data: created }));
  }

  private handleGetFlag(res: http.ServerResponse, key: string) {
    const flag = this.store.getFlag(decodeURIComponent(key));
    if (!flag) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Flag not found' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ data: flag }));
  }

  private async handleUpdateFlag(req: http.IncomingMessage, res: http.ServerResponse, key: string) {
    const body = await this.readBody(req);
    const updated = this.store.updateFlag(decodeURIComponent(key), body);
    res.writeHead(200);
    res.end(JSON.stringify({ data: updated }));
  }

  private handleDeleteFlag(res: http.ServerResponse, key: string) {
    const deleted = this.store.deleteFlag(decodeURIComponent(key));
    if (!deleted) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Flag not found' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  }

  private async handleEvaluate(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.readBody(req);
    const { flagKey, userId, country, attributes } = body;
    
    if (!flagKey) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'flagKey is required' }));
      return;
    }

    const result = this.engine.evaluate(flagKey, {
      userId,
      country,
      attributes: attributes || {}
    });

    res.writeHead(200);
    res.end(JSON.stringify({ data: result }));
  }

  private handleListExperiments(res: http.ServerResponse) {
    const experiments = this.store.listExperiments();
    res.writeHead(200);
    res.end(JSON.stringify({ data: experiments, total: experiments.length }));
  }

  private async handleCreateExperiment(req: http.IncomingMessage, res: http.ServerResponse) {
    const body = await this.readBody(req);
    const experiment: Experiment = {
      ...body,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    
    const created = this.store.createExperiment(experiment);
    res.writeHead(201);
    res.end(JSON.stringify({ data: created }));
  }

  private handleGetExperiment(res: http.ServerResponse, id: string) {
    const experiment = this.store.getExperiment(decodeURIComponent(id));
    if (!experiment) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Experiment not found' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ data: experiment }));
  }

  private async handleUpdateExperiment(req: http.IncomingMessage, res: http.ServerResponse, id: string) {
    const body = await this.readBody(req);
    const updated = this.store.updateExperiment(decodeURIComponent(id), body);
    res.writeHead(200);
    res.end(JSON.stringify({ data: updated }));
  }

  private handleDeleteExperiment(res: http.ServerResponse, id: string) {
    const deleted = this.store.deleteExperiment(decodeURIComponent(id));
    if (!deleted) {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Experiment not found' }));
      return;
    }
    res.writeHead(200);
    res.end(JSON.stringify({ success: true }));
  }

  private handleHealth(res: http.ServerResponse) {
    res.writeHead(200);
    res.end(JSON.stringify({
      status: 'healthy',
      timestamp: Date.now(),
      flags: this.store.listFlags().length,
      experiments: this.store.listExperiments().length
    }));
  }
}

// ============== 导出工厂函数 ==============

export function createFeatureFlagsServer(config: Partial<ServerConfig> = {}) {
  const defaultConfig: ServerConfig = {
    port: 3000,
    host: 'localhost',
    dataDir: path.join(process.cwd(), '.feature-flags'),
    apiKey: undefined
  };

  return new FeatureFlagsServer({ ...defaultConfig, ...config });
}

// ============== CLI 入口 ==============

if (require.main === module) {
  const args = process.argv.slice(2);
  const port = parseInt(args.find(a => a.startsWith('--port='))?.split('=')[1] || '3000');
  const host = args.find(a => a.startsWith('--host='))?.split('=')[1] || 'localhost';
  const dataDir = args.find(a => a.startsWith('--data-dir='))?.split('=')[1];
  const apiKey = args.find(a => a.startsWith('--api-key='))?.split('=')[1];

  const server = createFeatureFlagsServer({
    port,
    host,
    dataDir,
    apiKey
  });

  server.start().catch(console.error);

  process.on('SIGINT', async () => {
    await server.stop();
    process.exit(0);
  });
}
