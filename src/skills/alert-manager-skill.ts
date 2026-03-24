/**
 * 告警管理器技能 - Alert Manager Skill (KAEL)
 * 
 * 功能:
 * 1. 告警规则管理 (创建、更新、删除、查询)
 * 2. 告警通知 (多通道发送)
 * 3. 告警升级 (超时未处理自动升级)
 * 
 * @author Axon
 * @version 1.0.0
 * @module KAEL
 */

import { EventEmitter } from 'events';

// ============== 类型定义 ==============

/**
 * 告警级别
 */
export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical';

/**
 * 告警状态
 */
export type AlertStatus = 'pending' | 'acknowledged' | 'resolved' | 'escalated';

/**
 * 通知通道
 */
export type NotificationChannel = 'email' | 'sms' | 'webhook' | 'slack' | 'feishu';

/**
 * 告警规则配置
 */
export interface AlertRule {
  /** 规则 ID */
  id: string;
  /** 规则名称 */
  name: string;
  /** 规则描述 */
  description?: string;
  /** 告警级别 */
  severity: AlertSeverity;
  /** 触发条件表达式 */
  condition: string;
  /** 触发阈值 */
  threshold?: number;
  /** 持续时间 (秒)，超过此时间才触发 */
  duration?: number;
  /** 冷却时间 (秒)，触发后多久可以再次触发 */
  cooldown?: number;
  /** 是否启用 */
  enabled: boolean;
  /** 标签 */
  tags?: string[];
  /** 创建时间 */
  createdAt: number;
  /** 更新时间 */
  updatedAt: number;
}

/**
 * 告警实例
 */
export interface Alert {
  /** 告警 ID */
  id: string;
  /** 规则 ID */
  ruleId: string;
  /** 告警级别 */
  severity: AlertSeverity;
  /** 告警标题 */
  title: string;
  /** 告警内容 */
  message: string;
  /** 当前状态 */
  status: AlertStatus;
  /** 触发时间 */
  triggeredAt: number;
  /** 确认时间 */
  acknowledgedAt?: number;
  /** 确认人 */
  acknowledgedBy?: string;
  /** 解决时间 */
  resolvedAt?: number;
  /** 解决人 */
  resolvedBy?: string;
  /** 升级级别 */
  escalationLevel: number;
  /** 通知历史 */
  notificationHistory: NotificationRecord[];
  /** 上下文数据 */
  context?: Record<string, any>;
}

/**
 * 通知记录
 */
export interface NotificationRecord {
  /** 通知 ID */
  id: string;
  /** 通道类型 */
  channel: NotificationChannel;
  /** 接收者 */
  recipient: string;
  /** 发送时间 */
  sentAt: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 响应数据 */
  response?: any;
}

/**
 * 升级策略
 */
export interface EscalationPolicy {
  /** 策略 ID */
  id: string;
  /** 策略名称 */
  name: string;
  /** 升级级别配置 */
  levels: EscalationLevel[];
  /** 是否启用 */
  enabled: boolean;
}

/**
 * 升级级别
 */
export interface EscalationLevel {
  /** 级别 */
  level: number;
  /** 等待时间 (分钟) */
  waitMinutes: number;
  /** 通知通道 */
  channels: NotificationChannel[];
  /** 接收者列表 */
  recipients: string[];
  /** 通知模板 */
  template?: string;
}

/**
 * 告警评估上下文
 */
export interface AlertContext {
  /** 指标名称 */
  metric: string;
  /** 当前值 */
  value: number;
  /** 时间戳 */
  timestamp: number;
  /** 标签 */
  tags?: Record<string, string>;
  /** 额外数据 */
  [key: string]: any;
}

/**
 * 告警管理器配置
 */
export interface AlertManagerConfig {
  /** 告警规则存储路径 */
  rulesPath?: string;
  /** 告警历史存储路径 */
  historyPath?: string;
  /** 默认冷却时间 (秒) */
  defaultCooldown?: number;
  /** 默认升级策略 ID */
  defaultEscalationPolicyId?: string;
  /** 通知通道配置 */
  channelConfigs?: ChannelConfigs;
}

/**
 * 通道配置
 */
export interface ChannelConfigs {
  /** 邮件配置 */
  email?: EmailChannelConfig;
  /** 短信配置 */
  sms?: SmsChannelConfig;
  /** Webhook 配置 */
  webhook?: WebhookChannelConfig;
  /** Slack 配置 */
  slack?: SlackChannelConfig;
  /** 飞书配置 */
  feishu?: FeishuChannelConfig;
}

export interface EmailChannelConfig {
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  from: string;
}

export interface SmsChannelConfig {
  provider: 'aliyun' | 'tencent' | 'twilio';
  accessKeyId: string;
  accessKeySecret: string;
  signName?: string;
}

export interface WebhookChannelConfig {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
}

export interface SlackChannelConfig {
  webhookUrl: string;
  defaultChannel?: string;
}

export interface FeishuChannelConfig {
  webhookUrl: string;
  secret?: string;
}

/**
 * 告警事件
 */
export interface AlertEvents {
  /** 告警触发 */
  'alert:triggered': (alert: Alert) => void;
  /** 告警确认 */
  'alert:acknowledged': (alert: Alert) => void;
  /** 告警解决 */
  'alert:resolved': (alert: Alert) => void;
  /** 告警升级 */
  'alert:escalated': (alert: Alert, level: number) => void;
  /** 通知发送 */
  'notification:sent': (alert: Alert, record: NotificationRecord) => void;
}

// ============== 告警管理器类 ==============

export class AlertManager extends EventEmitter {
  /** 告警规则映射表 */
  private rules: Map<string, AlertRule> = new Map();
  
  /** 活跃告警映射表 */
  private activeAlerts: Map<string, Alert> = new Map();
  
  /** 告警历史 */
  private alertHistory: Alert[] = [];
  
  /** 升级策略映射表 */
  private escalationPolicies: Map<string, EscalationPolicy> = new Map();
  
  /** 通道配置 */
  private channelConfigs: ChannelConfigs = {};
  
  /** 默认冷却时间 (秒) */
  private defaultCooldown: number = 300;
  
  /** 规则最后触发时间映射表 */
  private lastTriggered: Map<string, number> = new Map();
  
  /** 升级定时器映射表 */
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(config?: AlertManagerConfig) {
    super();
    
    if (config) {
      this.defaultCooldown = config.defaultCooldown ?? 300;
      this.channelConfigs = config.channelConfigs ?? {};
      
      if (config.defaultEscalationPolicyId) {
        // 加载默认升级策略
      }
    }
    
    // 启动升级检查定时器
    this.startEscalationChecker();
  }

  // ============== 告警规则管理 ==============

  /**
   * 创建告警规则
   */
  createRule(rule: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'>): AlertRule {
    const id = this.generateId('rule');
    const now = Date.now();
    
    const newRule: AlertRule = {
      ...rule,
      id,
      createdAt: now,
      updatedAt: now,
    };
    
    this.rules.set(id, newRule);
    return newRule;
  }

  /**
   * 更新告警规则
   */
  updateRule(ruleId: string, updates: Partial<Omit<AlertRule, 'id' | 'createdAt'>>): AlertRule | null {
    const rule = this.rules.get(ruleId);
    if (!rule) return null;
    
    const updatedRule: AlertRule = {
      ...rule,
      ...updates,
      updatedAt: Date.now(),
    };
    
    this.rules.set(ruleId, updatedRule);
    return updatedRule;
  }

  /**
   * 删除告警规则
   */
  deleteRule(ruleId: string): boolean {
    const result = this.rules.delete(ruleId);
    // 同时删除相关的活跃告警
    for (const [alertId, alert] of this.activeAlerts.entries()) {
      if (alert.ruleId === ruleId) {
        this.activeAlerts.delete(alertId);
      }
    }
    return result;
  }

  /**
   * 获取告警规则
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * 获取所有告警规则
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * 根据标签筛选规则
   */
  getRulesByTag(tag: string): AlertRule[] {
    return Array.from(this.rules.values()).filter(rule => 
      rule.tags?.includes(tag)
    );
  }

  // ============== 告警评估与触发 ==============

  /**
   * 评估指标并触发告警
   */
  evaluate(context: AlertContext): Alert[] {
    const triggeredAlerts: Alert[] = [];
    const now = Date.now();
    
    for (const rule of this.rules.values()) {
      if (!rule.enabled) continue;
      
      // 检查冷却时间
      const lastTrigger = this.lastTriggered.get(rule.id);
      if (lastTrigger && (now - lastTrigger) < (rule.cooldown ?? this.defaultCooldown) * 1000) {
        continue;
      }
      
      // 评估条件
      if (this.evaluateCondition(rule, context)) {
        const alert = this.triggerAlert(rule, context);
        triggeredAlerts.push(alert);
      }
    }
    
    return triggeredAlerts;
  }

  /**
   * 评估条件表达式
   */
  private evaluateCondition(rule: AlertRule, context: AlertContext): boolean {
    const { condition, threshold } = rule;
    const { value } = context;
    
    if (threshold === undefined) return false;
    
    // 支持的条件表达式: >, <, >=, <=, ==, !=
    switch (condition) {
      case '>':
        return value > threshold;
      case '<':
        return value < threshold;
      case '>=':
        return value >= threshold;
      case '<=':
        return value <= threshold;
      case '==':
        return value === threshold;
      case '!=':
        return value !== threshold;
      default:
        return false;
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(rule: AlertRule, context: AlertContext): Alert {
    const id = this.generateId('alert');
    const now = Date.now();
    
    const alert: Alert = {
      id,
      ruleId: rule.id,
      severity: rule.severity,
      title: `[${rule.severity.toUpperCase()}] ${rule.name}`,
      message: `告警规则 "${rule.name}" 已触发。${context.metric} = ${context.value} (阈值：${rule.threshold})`,
      status: 'pending',
      triggeredAt: now,
      escalationLevel: 0,
      notificationHistory: [],
      context: {
        metric: context.metric,
        value: context.value,
        timestamp: context.timestamp,
        tags: context.tags,
      },
    };
    
    this.activeAlerts.set(id, alert);
    this.lastTriggered.set(rule.id, now);
    
    // 发送初始通知
    this.sendInitialNotification(alert);
    
    // 启动升级定时器
    this.startEscalationTimer(alert);
    
    // 触发事件
    this.emit('alert:triggered', alert);
    
    return alert;
  }

  // ============== 告警处理 ==============

  /**
   * 确认告警
   */
  acknowledge(alertId: string, userId: string): Alert | null {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return null;
    
    alert.status = 'acknowledged';
    alert.acknowledgedAt = Date.now();
    alert.acknowledgedBy = userId;
    
    // 取消升级定时器
    this.cancelEscalationTimer(alertId);
    
    this.emit('alert:acknowledged', alert);
    return alert;
  }

  /**
   * 解决告警
   */
  resolve(alertId: string, userId: string): Alert | null {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return null;
    
    alert.status = 'resolved';
    alert.resolvedAt = Date.now();
    alert.resolvedBy = userId;
    
    // 从活跃告警移除，加入历史
    this.activeAlerts.delete(alertId);
    this.alertHistory.push(alert);
    
    // 取消升级定时器
    this.cancelEscalationTimer(alertId);
    
    this.emit('alert:resolved', alert);
    return alert;
  }

  /**
   * 获取活跃告警
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * 根据状态筛选告警
   */
  getAlertsByStatus(status: AlertStatus): Alert[] {
    return this.getActiveAlerts().filter(alert => alert.status === status);
  }

  /**
   * 获取告警历史
   */
  getHistory(limit: number = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  // ============== 升级策略管理 ==============

  /**
   * 创建升级策略
   */
  createEscalationPolicy(policy: Omit<EscalationPolicy, 'id'>): EscalationPolicy {
    const id = this.generateId('escalation');
    const newPolicy: EscalationPolicy = {
      ...policy,
      id,
    };
    
    this.escalationPolicies.set(id, newPolicy);
    return newPolicy;
  }

  /**
   * 获取升级策略
   */
  getEscalationPolicy(policyId: string): EscalationPolicy | undefined {
    return this.escalationPolicies.get(policyId);
  }

  /**
   * 手动升级告警
   */
  escalateAlert(alertId: string): Alert | null {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return null;
    
    const policy = this.escalationPolicies.get('default');
    if (!policy || !policy.enabled) return alert;
    
    const nextLevel = alert.escalationLevel + 1;
    const levelConfig = policy.levels.find(l => l.level === nextLevel);
    
    if (!levelConfig) return alert;
    
    alert.escalationLevel = nextLevel;
    alert.status = 'escalated';
    
    // 发送升级通知
    this.sendEscalationNotification(alert, levelConfig);
    
    this.emit('alert:escalated', alert, nextLevel);
    return alert;
  }

  // ============== 通知发送 ==============

  /**
   * 发送初始通知
   */
  private async sendInitialNotification(alert: Alert): Promise<void> {
    const policy = this.escalationPolicies.get('default');
    if (!policy || !policy.enabled) return;
    
    const levelConfig = policy.levels.find(l => l.level === 0);
    if (!levelConfig) return;
    
    for (const channel of levelConfig.channels) {
      for (const recipient of levelConfig.recipients) {
        await this.sendNotification(alert, channel, recipient);
      }
    }
  }

  /**
   * 发送升级通知
   */
  private async sendEscalationNotification(alert: Alert, level: EscalationLevel): Promise<void> {
    for (const channel of level.channels) {
      for (const recipient of level.recipients) {
        await this.sendNotification(alert, channel, recipient, level.template);
      }
    }
  }

  /**
   * 发送通知
   */
  private async sendNotification(
    alert: Alert,
    channel: NotificationChannel,
    recipient: string,
    template?: string
  ): Promise<NotificationRecord> {
    const record: NotificationRecord = {
      id: this.generateId('notify'),
      channel,
      recipient,
      sentAt: Date.now(),
      success: false,
    };
    
    try {
      let response: any;
      
      switch (channel) {
        case 'email':
          response = await this.sendEmailNotification(alert, recipient);
          break;
        case 'sms':
          response = await this.sendSmsNotification(alert, recipient);
          break;
        case 'webhook':
          response = await this.sendWebhookNotification(alert, recipient);
          break;
        case 'slack':
          response = await this.sendSlackNotification(alert, recipient);
          break;
        case 'feishu':
          response = await this.sendFeishuNotification(alert, recipient);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }
      
      record.success = true;
      record.response = response;
    } catch (error: any) {
      record.error = error.message;
    }
    
    alert.notificationHistory.push(record);
    this.emit('notification:sent', alert, record);
    
    return record;
  }

  /**
   * 发送邮件通知
   */
  private async sendEmailNotification(alert: Alert, recipient: string): Promise<any> {
    const config = this.channelConfigs.email;
    if (!config) throw new Error('Email channel not configured');
    
    // 实际实现需要 nodemailer
    console.log(`[Email] To: ${recipient}, Subject: ${alert.title}`);
    return { messageId: this.generateId('msg') };
  }

  /**
   * 发送短信通知
   */
  private async sendSmsNotification(alert: Alert, recipient: string): Promise<any> {
    const config = this.channelConfigs.sms;
    if (!config) throw new Error('SMS channel not configured');
    
    // 实际实现需要短信服务商 SDK
    console.log(`[SMS] To: ${recipient}, Message: ${alert.message}`);
    return { messageId: this.generateId('msg') };
  }

  /**
   * 发送 Webhook 通知
   */
  private async sendWebhookNotification(alert: Alert, url: string): Promise<any> {
    const config = this.channelConfigs.webhook;
    if (!config) throw new Error('Webhook channel not configured');
    
    // 实际实现需要 axios/fetch
    console.log(`[Webhook] URL: ${url}, Payload: ${JSON.stringify(alert)}`);
    return { status: 200 };
  }

  /**
   * 发送 Slack 通知
   */
  private async sendSlackNotification(alert: Alert, channel: string): Promise<any> {
    const config = this.channelConfigs.slack;
    if (!config) throw new Error('Slack channel not configured');
    
    const color = this.getSeverityColor(alert.severity);
    const payload = {
      channel: channel || config.defaultChannel,
      attachments: [{
        color,
        title: alert.title,
        text: alert.message,
        fields: [
          { title: 'Severity', value: alert.severity, short: true },
          { title: 'Status', value: alert.status, short: true },
          { title: 'Triggered', value: new Date(alert.triggeredAt).toISOString(), short: false },
        ],
      }],
    };
    
    console.log(`[Slack] Channel: ${channel}, Payload: ${JSON.stringify(payload)}`);
    return { status: 200 };
  }

  /**
   * 发送飞书通知
   */
  private async sendFeishuNotification(alert: Alert, webhookUrl: string): Promise<any> {
    const config = this.channelConfigs.feishu;
    if (!config) throw new Error('Feishu channel not configured');
    
    const color = this.getSeverityColor(alert.severity);
    const payload = {
      msg_type: 'interactive',
      card: {
        header: {
          title: {
            tag: 'plain_text',
            content: alert.title,
          },
          template: color,
        },
        elements: [
          {
            tag: 'div',
            text: {
              tag: 'lark_md',
              content: alert.message,
            },
          },
          {
            tag: 'action',
            actions: [
              {
                tag: 'button',
                text: { tag: 'plain_text', content: '确认告警' },
                type: 'primary',
              },
            ],
          },
        ],
      },
    };
    
    console.log(`[Feishu] Webhook: ${webhookUrl}, Payload: ${JSON.stringify(payload)}`);
    return { status: 200 };
  }

  /**
   * 获取告警级别颜色
   */
  private getSeverityColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      info: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      critical: '#7c3aed',
    };
    return colors[severity];
  }

  // ============== 内部管理 ==============

  /**
   * 启动升级检查器
   */
  private startEscalationChecker(): void {
    // 每分钟检查一次需要升级的告警
    setInterval(() => {
      this.checkEscalations();
    }, 60000);
  }

  /**
   * 检查告警升级
   */
  private checkEscalations(): void {
    const now = Date.now();
    
    for (const alert of this.activeAlerts.values()) {
      if (alert.status === 'acknowledged' || alert.status === 'resolved') {
        continue;
      }
      
      const policy = this.escalationPolicies.get('default');
      if (!policy || !policy.enabled) continue;
      
      const currentLevel = policy.levels.find(l => l.level === alert.escalationLevel);
      if (!currentLevel) continue;
      
      const nextLevel = policy.levels.find(l => l.level === alert.escalationLevel + 1);
      if (!nextLevel) continue;
      
      const elapsedMinutes = (now - alert.triggeredAt) / 1000 / 60;
      if (elapsedMinutes >= currentLevel.waitMinutes) {
        this.escalateAlert(alert.id);
      }
    }
  }

  /**
   * 启动升级定时器
   */
  private startEscalationTimer(alert: Alert): void {
    const policy = this.escalationPolicies.get('default');
    if (!policy || !policy.enabled) return;
    
    const levelConfig = policy.levels.find(l => l.level === alert.escalationLevel);
    if (!levelConfig) return;
    
    const timer = setTimeout(() => {
      this.escalateAlert(alert.id);
    }, levelConfig.waitMinutes * 60 * 1000);
    
    this.escalationTimers.set(alert.id, timer);
  }

  /**
   * 取消升级定时器
   */
  private cancelEscalationTimer(alertId: string): void {
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }
  }

  /**
   * 生成唯一 ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============== 使用示例 ==============

/**
 * 使用示例 1: 创建告警规则
 */
export function exampleCreateRules() {
  const manager = new AlertManager({
    defaultCooldown: 300,
  });
  
  // 创建 CPU 使用率告警规则
  const cpuRule = manager.createRule({
    name: 'CPU 使用率过高',
    description: '当 CPU 使用率超过 80% 时触发',
    severity: 'warning',
    condition: '>',
    threshold: 80,
    duration: 60,
    cooldown: 300,
    enabled: true,
    tags: ['system', 'cpu'],
  });
  
  // 创建内存使用率告警规则
  const memoryRule = manager.createRule({
    name: '内存使用率过高',
    description: '当内存使用率超过 90% 时触发',
    severity: 'error',
    condition: '>=',
    threshold: 90,
    duration: 30,
    cooldown: 600,
    enabled: true,
    tags: ['system', 'memory'],
  });
  
  console.log('Created rules:', manager.getAllRules().map(r => r.name));
}

/**
 * 使用示例 2: 创建升级策略
 */
export function exampleEscalationPolicy() {
  const manager = new AlertManager();
  
  // 创建三级升级策略
  const policy = manager.createEscalationPolicy({
    name: '默认升级策略',
    enabled: true,
    levels: [
      {
        level: 0,
        waitMinutes: 0,
        channels: ['feishu'],
        recipients: ['dev-team'],
        template: '【告警通知】{title}',
      },
      {
        level: 1,
        waitMinutes: 15,
        channels: ['feishu', 'sms'],
        recipients: ['tech-lead', 'manager'],
        template: '【告警升级】{title} - 已等待 15 分钟未处理',
      },
      {
        level: 2,
        waitMinutes: 30,
        channels: ['feishu', 'sms', 'email'],
        recipients: ['cto', 'vp'],
        template: '【紧急告警】{title} - 已等待 30 分钟未处理',
      },
    ],
  });
  
  console.log('Created escalation policy:', policy.name);
}

/**
 * 使用示例 3: 评估指标并触发告警
 */
export async function exampleEvaluate() {
  const manager = new AlertManager({
    channelConfigs: {
      feishu: {
        webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
      },
    },
  });
  
  // 创建规则
  manager.createRule({
    name: 'API 响应时间过长',
    severity: 'warning',
    condition: '>',
    threshold: 1000,
    enabled: true,
    tags: ['api', 'performance'],
  });
  
  // 模拟指标数据
  const context: AlertContext = {
    metric: 'api_response_time',
    value: 1500,
    timestamp: Date.now(),
    tags: { endpoint: '/api/users', method: 'GET' },
  };
  
  // 评估并触发告警
  const triggered = manager.evaluate(context);
  console.log('Triggered alerts:', triggered.length);
  
  // 监听告警事件
  manager.on('alert:triggered', (alert) => {
    console.log('Alert triggered:', alert.title);
  });
  
  manager.on('notification:sent', (alert, record) => {
    console.log(`Notification sent via ${record.channel}: ${record.success}`);
  });
}

/**
 * 使用示例 4: 处理告警
 */
export function exampleHandleAlert() {
  const manager = new AlertManager();
  
  // 假设已有活跃告警
  const alerts = manager.getActiveAlerts();
  
  if (alerts.length > 0) {
    const alert = alerts[0];
    
    // 确认告警
    manager.acknowledge(alert.id, 'user_123');
    console.log('Alert acknowledged');
    
    // 解决告警
    manager.resolve(alert.id, 'user_123');
    console.log('Alert resolved');
  }
}

/**
 * 使用示例 5: 查询告警
 */
export function exampleQueryAlerts() {
  const manager = new AlertManager();
  
  // 获取所有活跃告警
  const activeAlerts = manager.getActiveAlerts();
  console.log('Active alerts:', activeAlerts.length);
  
  // 获取待处理告警
  const pendingAlerts = manager.getAlertsByStatus('pending');
  console.log('Pending alerts:', pendingAlerts.length);
  
  // 获取告警历史
  const history = manager.getHistory(50);
  console.log('Recent history:', history.length);
  
  // 根据标签筛选规则
  const cpuRules = manager.getRulesByTag('cpu');
  console.log('CPU rules:', cpuRules.length);
}

export default AlertManager;
