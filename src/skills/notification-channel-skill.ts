/**
 * 多渠道通知技能 - Notification Channel Skill
 * 
 * 功能:
 * 1. 飞书通知 (Feishu/Lark Webhook)
 * 2. 邮件通知 (SMTP)
 * 3. WebSocket 推送
 * 4. 通知模板系统
 * 
 * @author Axon
 * @version 1.0.0
 */

import * as https from 'https';
import * as http from 'http';
import * as net from 'net';

// ============== 类型定义 ==============

/**
 * 通知渠道类型
 */
export type NotificationChannelType = 'feishu' | 'email' | 'websocket';

/**
 * 通知优先级
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 通知类型
 */
export type NotificationType = 
  | 'info'
  | 'success'
  | 'warning'
  | 'error'
  | 'custom';

/**
 * 通知内容
 */
export interface NotificationContent {
  /** 标题 */
  title: string;
  /** 内容 */
  content: string;
  /** 类型 */
  type?: NotificationType;
  /** 优先级 */
  priority?: NotificationPriority;
  /** 附加数据 */
  data?: Record<string, any>;
  /** 时间戳 */
  timestamp?: number;
}

/**
 * 飞书配置
 */
export interface FeishuConfig {
  /** Webhook URL */
  webhookUrl: string;
  /** 签名密钥 (可选) */
  secret?: string;
  /** 发送者名称 */
  senderName?: string;
}

/**
 * 邮件配置
 */
export interface EmailConfig {
  /** SMTP 服务器 */
  host: string;
  /** SMTP 端口 */
  port: number;
  /** 是否使用 TLS */
  secure: boolean;
  /** 发件人邮箱 */
  from: string;
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 默认收件人 */
  defaultTo?: string[];
}

/**
 * WebSocket 配置
 */
export interface WebSocketConfig {
  /** WebSocket 服务器 URL */
  url: string;
  /** 认证令牌 (可选) */
  token?: string;
  /** 重连间隔 (毫秒) */
  reconnectInterval?: number;
  /** 最大重连次数 */
  maxReconnects?: number;
}

/**
 * 通知配置
 */
export interface NotificationConfig {
  /** 飞书配置 */
  feishu?: FeishuConfig;
  /** 邮件配置 */
  email?: EmailConfig;
  /** WebSocket 配置 */
  websocket?: WebSocketConfig;
  /** 默认渠道 */
  defaultChannels?: NotificationChannelType[];
  /** 是否启用模板 */
  enableTemplates?: boolean;
}

/**
 * 通知模板
 */
export interface NotificationTemplate {
  /** 模板 ID */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板内容 (支持 {{variable}} 占位符) */
  titleTemplate: string;
  contentTemplate: string;
  /** 默认类型 */
  defaultType?: NotificationType;
  /** 默认优先级 */
  defaultPriority?: NotificationPriority;
}

/**
 * 发送结果
 */
export interface SendResult {
  /** 渠道 */
  channel: NotificationChannelType;
  /** 是否成功 */
  success: boolean;
  /** 消息 ID (如果有) */
  messageId?: string;
  /** 错误信息 (如果失败) */
  error?: string;
  /** 响应数据 */
  response?: any;
}

/**
 * 批量发送结果
 */
export interface BatchSendResult {
  /** 总请求数 */
  total: number;
  /** 成功数 */
  success: number;
  /** 失败数 */
  failed: number;
  /** 各渠道结果 */
  results: SendResult[];
}

// ============== 工具函数 ==============

/**
 * 生成时间戳
 */
function getTimestamp(): number {
  return Date.now();
}

/**
 * 格式化日期
 */
function formatDate(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * 计算飞书签名
 */
function calculateFeishuSignature(timestamp: string, secret: string): string {
  const stringToSign = `${timestamp}\n${secret}`;
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', stringToSign)
    .update(stringToSign)
    .digest('base64');
  return encodeURIComponent(signature);
}

/**
 * 渲染模板
 */
function renderTemplate(template: string, data: Record<string, any>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = data[key];
    return value !== undefined ? String(value) : match;
  });
}

/**
 * 获取优先级数值
 */
function getPriorityValue(priority: NotificationPriority): number {
  const map: Record<NotificationPriority, number> = {
    low: 1,
    normal: 2,
    high: 3,
    urgent: 4,
  };
  return map[priority] || 2;
}

// ============== 通知渠道类 ==============

/**
 * 飞书通知渠道
 */
class FeishuChannel {
  private config: FeishuConfig;

  constructor(config: FeishuConfig) {
    this.config = config;
  }

  async send(content: NotificationContent): Promise<SendResult> {
    try {
      const timestamp = getTimestamp().toString();
      const payload: any = {
        msg_type: 'interactive',
        card: {
          header: {
            title: {
              tag: 'plain_text',
              content: content.title,
            },
            template: this.getTemplateColor(content.type),
          },
          elements: [
            {
              tag: 'markdown',
              content: this.formatContent(content),
            },
          ],
        },
      };

      // 添加签名
      let url = this.config.webhookUrl;
      if (this.config.secret) {
        const signature = calculateFeishuSignature(timestamp, this.config.secret);
        url = `${url}&timestamp=${timestamp}&sign=${signature}`;
      }

      const response = await this.httpPost(url, payload);
      
      return {
        channel: 'feishu',
        success: response.statusCode === 200,
        messageId: timestamp,
        response,
      };
    } catch (error: any) {
      return {
        channel: 'feishu',
        success: false,
        error: error.message,
      };
    }
  }

  private getTemplateColor(type?: NotificationType): string {
    const colorMap: Record<NotificationType, string> = {
      info: 'blue',
      success: 'green',
      warning: 'orange',
      error: 'red',
      custom: 'grey',
    };
    return colorMap[type || 'info'];
  }

  private formatContent(content: NotificationContent): string {
    let text = content.content;
    
    if (content.data) {
      text += '\n\n';
      Object.entries(content.data).forEach(([key, value]) => {
        text += `**${key}**: ${value}\n`;
      });
    }

    if (content.priority) {
      const priorityEmoji: Record<NotificationPriority, string> = {
        low: '⚪',
        normal: '🔵',
        high: '🟠',
        urgent: '🔴',
      };
      text = `${priorityEmoji[content.priority]} ${text}`;
    }

    return text;
  }

  private httpPost(url: string, data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const postData = JSON.stringify(data);

      const options = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
      };

      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            resolve({
              statusCode: res.statusCode,
              data: JSON.parse(responseData),
            });
          } catch {
            resolve({
              statusCode: res.statusCode,
              data: responseData,
            });
          }
        });
      });

      req.on('error', reject);
      req.write(postData);
      req.end();
    });
  }
}

/**
 * 邮件通知渠道
 */
class EmailChannel {
  private config: EmailConfig;

  constructor(config: EmailConfig) {
    this.config = config;
  }

  async send(content: NotificationContent, to?: string[]): Promise<SendResult> {
    try {
      const recipients = to || this.config.defaultTo || [];
      if (recipients.length === 0) {
        throw new Error('No recipients specified');
      }

      const emailData = this.buildEmail(content, recipients);
      const response = await this.sendSMTP(emailData);

      return {
        channel: 'email',
        success: true,
        messageId: response.messageId,
        response,
      };
    } catch (error: any) {
      return {
        channel: 'email',
        success: false,
        error: error.message,
      };
    }
  }

  private buildEmail(content: NotificationContent, to: string[]): string {
    const boundaries = '----=_NextPart_' + Math.random().toString(16);
    
    let htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2 style="color: ${this.getTypeColor(content.type)}">${content.title}</h2>
          <div>${content.content.replace(/\n/g, '<br>')}</div>
    `;

    if (content.data) {
      htmlContent += `
        <div style="margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
          <h3>详细信息:</h3>
          <table style="width: 100%;">
      `;
      Object.entries(content.data).forEach(([key, value]) => {
        htmlContent += `
          <tr>
            <td style="padding: 5px; font-weight: bold;">${key}:</td>
            <td style="padding: 5px;">${value}</td>
          </tr>
        `;
      });
      htmlContent += `</table></div>`;
    }

    htmlContent += `
          <div style="margin-top: 20px; color: #999; font-size: 12px;">
            发送时间: ${formatDate()}<br>
            优先级: ${content.priority || 'normal'}
          </div>
        </body>
      </html>
    `;

    const plainText = `${content.title}\n\n${content.content}\n\n发送时间：${formatDate()}`;

    return `
From: ${this.config.from}
To: ${to.join(', ')}
Subject: ${content.title}
MIME-Version: 1.0
Content-Type: multipart/alternative; boundary="${boundaries}"

--${boundaries}
Content-Type: text/plain; charset=utf-8

${plainText}

--${boundaries}
Content-Type: text/html; charset=utf-8
Content-Transfer-Encoding: quoted-printable

${htmlContent}

--${boundaries}--
    `.trim();
  }

  private getTypeColor(type?: NotificationType): string {
    const colorMap: Record<NotificationType, string> = {
      info: '#6366f1',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
      custom: '#6b7280',
    };
    return colorMap[type || 'info'];
  }

  private sendSMTP(emailData: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const socket = this.config.secure
        ? require('tls').connect(this.config.host, this.config.port)
        : new net.Socket();

      if (!this.config.secure) {
        socket.connect(this.config.port, this.config.host);
      }

      let response = '';
      const sendCommand = (cmd: string) => {
        socket.write(cmd + '\r\n');
      };

      socket.on('data', (data) => {
        response += data.toString();
        
        if (response.includes('250 ') || response.includes('235 ') || response.includes('334 ')) {
          response = '';
        }
      });

      socket.on('connect', () => {
        // EHLO
        setTimeout(() => sendCommand(`EHLO ${this.config.host}`), 100);
        
        // AUTH LOGIN
        setTimeout(() => {
          sendCommand('AUTH LOGIN');
        }, 500);

        // Username
        setTimeout(() => {
          sendCommand(Buffer.from(this.config.username).toString('base64'));
        }, 1000);

        // Password
        setTimeout(() => {
          sendCommand(Buffer.from(this.config.password).toString('base64'));
        }, 1500);

        // MAIL FROM
        setTimeout(() => {
          sendCommand(`MAIL FROM: <${this.config.from}>`);
        }, 2000);

        // RCPT TO
        setTimeout(() => {
          const recipients = emailData.match(/To: (.+)/)?.[1].split(', ') || [];
          recipients.forEach((rcpt: string) => {
            sendCommand(`RCPT TO: <${rcpt.trim()}>`);
          });
        }, 2500);

        // DATA
        setTimeout(() => {
          sendCommand('DATA');
        }, 3000);

        // Email content
        setTimeout(() => {
          sendCommand(emailData);
          sendCommand('.');
        }, 3500);

        // QUIT
        setTimeout(() => {
          sendCommand('QUIT');
          socket.end();
          resolve({ messageId: getTimestamp().toString() });
        }, 4000);
      });

      socket.on('error', reject);
    });
  }
}

/**
 * WebSocket 通知渠道
 */
class WebSocketChannel {
  private config: WebSocketConfig;
  private connected: boolean = false;
  private reconnectCount: number = 0;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  async send(content: NotificationContent): Promise<SendResult> {
    try {
      const message = {
        type: 'notification',
        data: {
          title: content.title,
          content: content.content,
          type: content.type,
          priority: content.priority,
          data: content.data,
          timestamp: content.timestamp || getTimestamp(),
        },
      };

      if (this.config.token) {
        (message as any).token = this.config.token;
      }

      const response = await this.sendMessage(message);

      return {
        channel: 'websocket',
        success: true,
        messageId: response.messageId,
        response,
      };
    } catch (error: any) {
      return {
        channel: 'websocket',
        success: false,
        error: error.message,
      };
    }
  }

  private sendMessage(message: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(this.config.url);
      const isSecure = urlObj.protocol === 'wss:';
      const port = urlObj.port || (isSecure ? 443 : 80);

      const client = isSecure
        ? require('tls').connect(port, urlObj.hostname)
        : new net.Socket();

      if (!isSecure) {
        client.connect(port, urlObj.hostname);
      }

      const key = Buffer.from(Math.random().toString(36)).toString('base64');

      client.on('connect', () => {
        // WebSocket handshake
        client.write(`GET ${urlObj.pathname} HTTP/1.1\r\n`);
        client.write(`Host: ${urlObj.host}\r\n`);
        client.write('Upgrade: websocket\r\n');
        client.write('Connection: Upgrade\r\n');
        client.write(`Sec-WebSocket-Key: ${key}\r\n`);
        client.write('Sec-WebSocket-Version: 13\r\n');
        client.write('\r\n');
      });

      let handshakeComplete = false;
      client.on('data', (data) => {
        const text = data.toString();
        
        if (!handshakeComplete) {
          if (text.includes('101 Switching Protocols')) {
            handshakeComplete = true;
            // Send message as WebSocket frame
            const msg = JSON.stringify(message);
            const frame = this.createWebSocketFrame(msg);
            client.write(frame);
            this.connected = true;
          }
        } else {
          // Parse response
          const response = this.parseWebSocketFrame(data);
          client.end();
          resolve({ messageId: getTimestamp().toString(), data: response });
        }
      });

      client.on('error', (err) => {
        this.connected = false;
        reject(err);
      });

      client.on('close', () => {
        this.connected = false;
      });

      // Timeout
      setTimeout(() => {
        if (!handshakeComplete) {
          client.end();
          reject(new Error('Connection timeout'));
        }
      }, 10000);
    });
  }

  private createWebSocketFrame(data: string): Buffer {
    const payload = Buffer.from(data);
    const frame = Buffer.alloc(2 + payload.length);
    
    frame[0] = 0x81; // Text frame, FIN bit set
    frame[1] = payload.length; // Payload length (for < 126 bytes)
    payload.copy(frame, 2);
    
    return frame;
  }

  private parseWebSocketFrame(data: Buffer): any {
    if (data.length < 2) return null;
    
    const opcode = data[0] & 0x0f;
    const payloadLen = data[1] & 0x7f;
    
    let payloadStart = 2;
    if (payloadLen === 126) {
      payloadStart = 4;
    } else if (payloadLen === 127) {
      payloadStart = 10;
    }

    try {
      const payload = data.slice(payloadStart);
      return JSON.parse(payload.toString());
    } catch {
      return null;
    }
  }
}

// ============== 主通知服务 ==============

/**
 * 通知服务类
 */
export class NotificationService {
  private config: NotificationConfig;
  private channels: Map<NotificationChannelType, any> = new Map();
  private templates: Map<string, NotificationTemplate> = new Map();

  constructor(config: NotificationConfig) {
    this.config = config;
    this.initializeChannels();
  }

  /**
   * 初始化渠道
   */
  private initializeChannels(): void {
    if (this.config.feishu) {
      this.channels.set('feishu', new FeishuChannel(this.config.feishu));
    }

    if (this.config.email) {
      this.channels.set('email', new EmailChannel(this.config.email));
    }

    if (this.config.websocket) {
      this.channels.set('websocket', new WebSocketChannel(this.config.websocket));
    }
  }

  /**
   * 注册模板
   */
  registerTemplate(template: NotificationTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * 移除模板
   */
  unregisterTemplate(templateId: string): void {
    this.templates.delete(templateId);
  }

  /**
   * 发送通知
   */
  async send(
    content: NotificationContent,
    channels?: NotificationChannelType[],
    templateId?: string
  ): Promise<BatchSendResult> {
    // 应用模板
    let finalContent = content;
    if (templateId) {
      const template = this.templates.get(templateId);
      if (template) {
        finalContent = this.applyTemplate(content, template);
      }
    }

    // 确定发送渠道
    const targetChannels = channels || this.config.defaultChannels || ['feishu'];

    const results: SendResult[] = [];
    let successCount = 0;
    let failedCount = 0;

    // 并发发送
    const promises = targetChannels.map(async (channelType) => {
      const channel = this.channels.get(channelType);
      if (!channel) {
        const result: SendResult = {
          channel: channelType,
          success: false,
          error: `Channel ${channelType} not configured`,
        };
        results.push(result);
        failedCount++;
        return result;
      }

      const result = await channel.send(finalContent);
      results.push(result);
      
      if (result.success) {
        successCount++;
      } else {
        failedCount++;
      }
      
      return result;
    });

    await Promise.all(promises);

    return {
      total: targetChannels.length,
      success: successCount,
      failed: failedCount,
      results,
    };
  }

  /**
   * 应用模板
   */
  private applyTemplate(
    content: NotificationContent,
    template: NotificationTemplate
  ): NotificationContent {
    const data = {
      ...content.data,
      title: content.title,
      content: content.content,
    };

    return {
      title: renderTemplate(template.titleTemplate, data),
      content: renderTemplate(template.contentTemplate, data),
      type: content.type || template.defaultType || 'info',
      priority: content.priority || template.defaultPriority || 'normal',
      data: content.data,
      timestamp: content.timestamp || getTimestamp(),
    };
  }

  /**
   * 发送快捷通知
   */
  async sendQuick(
    title: string,
    content: string,
    type?: NotificationType,
    priority?: NotificationPriority
  ): Promise<BatchSendResult> {
    return this.send({
      title,
      content,
      type,
      priority,
      timestamp: getTimestamp(),
    });
  }

  /**
   * 获取渠道状态
   */
  getChannelStatus(): Record<NotificationChannelType, boolean> {
    const status: any = {};
    for (const [type, channel] of this.channels.entries()) {
      status[type] = channel.connected !== undefined ? channel.connected : true;
    }
    return status as Record<NotificationChannelType, boolean>;
  }
}

// ============== 预定义模板 ==============

/**
 * 内置模板集合
 */
export const BuiltinTemplates = {
  /** 系统告警模板 */
  systemAlert: {
    id: 'system-alert',
    name: '系统告警',
    titleTemplate: '🚨 [{{priority}}] {{title}}',
    contentTemplate: '{{content}}\n\n时间：{{timestamp}}\n详情：{{data}}',
    defaultType: 'error' as NotificationType,
    defaultPriority: 'urgent' as NotificationPriority,
  },

  /** 任务完成模板 */
  taskComplete: {
    id: 'task-complete',
    name: '任务完成',
    titleTemplate: '✅ {{title}}',
    contentTemplate: '{{content}}\n\n完成时间：{{timestamp}}',
    defaultType: 'success' as NotificationType,
    defaultPriority: 'normal' as NotificationPriority,
  },

  /** 错误报告模板 */
  errorReport: {
    id: 'error-report',
    name: '错误报告',
    titleTemplate: '❌ {{title}}',
    contentTemplate: '{{content}}\n\n错误详情：{{data}}\n时间：{{timestamp}}',
    defaultType: 'error' as NotificationType,
    defaultPriority: 'high' as NotificationPriority,
  },

  /** 日常报告模板 */
  dailyReport: {
    id: 'daily-report',
    name: '日常报告',
    titleTemplate: '📊 {{title}}',
    contentTemplate: '{{content}}',
    defaultType: 'info' as NotificationType,
    defaultPriority: 'low' as NotificationPriority,
  },
};

// ============== 工厂函数 ==============

/**
 * 创建通知服务实例
 */
export function createNotificationService(config: NotificationConfig): NotificationService {
  const service = new NotificationService(config);
  
  // 自动注册内置模板
  if (config.enableTemplates !== false) {
    Object.values(BuiltinTemplates).forEach((template) => {
      service.registerTemplate(template);
    });
  }
  
  return service;
}

// ============== 使用示例 ==============

/**
 * 使用示例代码
 * 
 * @example
 * ```typescript
 * import { createNotificationService, NotificationChannelType } from './notification-channel-skill';
 * 
 * // 1. 创建服务实例
 * const service = createNotificationService({
 *   feishu: {
 *     webhookUrl: 'https://open.feishu.cn/open-apis/bot/v2/hook/xxx',
 *     secret: 'your-secret',
 *   },
 *   email: {
 *     host: 'smtp.example.com',
 *     port: 587,
 *     secure: false,
 *     from: 'noreply@example.com',
 *     username: 'your-username',
 *     password: 'your-password',
 *     defaultTo: ['admin@example.com'],
 *   },
 *   websocket: {
 *     url: 'ws://localhost:8080/notifications',
 *     token: 'your-token',
 *   },
 *   defaultChannels: ['feishu', 'websocket'],
 * });
 * 
 * // 2. 发送简单通知
 * await service.sendQuick(
 *   '系统告警',
 *   'CPU 使用率超过 90%',
 *   'error',
 *   'urgent'
 * );
 * 
 * // 3. 发送带数据的通知
 * await service.send({
 *   title: '任务完成',
 *   content: '数据同步任务已完成',
 *   type: 'success',
 *   priority: 'normal',
 *   data: {
 *     '处理记录': 1234,
 *     '耗时': '2m 30s',
 *     '状态': '成功',
 *   },
 * });
 * 
 * // 4. 使用模板发送
 * await service.send(
 *   {
 *     title: '数据库异常',
 *     content: '连接池耗尽',
 *     data: { error: 'ECONNREFUSED', retry: 3 },
 *   },
 *   ['feishu', 'email'],
 *   'system-alert' // 使用内置模板
 * );
 * 
 * // 5. 注册自定义模板
 * service.registerTemplate({
 *   id: 'custom-template',
 *   name: '自定义模板',
 *   titleTemplate: '[{{type}}] {{title}}',
 *   contentTemplate: '{{content}}\n\n详细信息：{{data}}',
 *   defaultType: 'info',
 * });
 * 
 * // 6. 多渠道批量发送
 * const result = await service.send(
 *   { title: '重要通知', content: '系统即将维护', priority: 'high' },
 *   ['feishu', 'email', 'websocket'] // 所有渠道
 * );
 * 
 * console.log(`发送结果：成功 ${result.success}/${result.total}`);
 * ```
 */

// ============== 导出 ==============

export {
  NotificationService,
  NotificationChannelType,
  NotificationPriority,
  NotificationType,
  NotificationContent,
  NotificationConfig,
  NotificationTemplate,
  SendResult,
  BatchSendResult,
  FeishuConfig,
  EmailConfig,
  WebSocketConfig,
  BuiltinTemplates,
  createNotificationService,
};
